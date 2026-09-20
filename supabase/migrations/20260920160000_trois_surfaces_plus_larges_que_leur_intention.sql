-- Trois surfaces d'écriture plus larges que leur intention (relecture du 20/09/2026)
--
-- Ce dépôt s'est donné une règle et l'a appliquée avec rigueur à `plan_actions` et
-- `engagement_checkins` : **la RLS filtre des LIGNES, jamais des COLONNES**, donc une policy
-- d'écriture owner-scoped ouvre *toutes* les colonnes de la table. Une relecture du schéma
-- entier a trouvé trois tables voisines où la règle n'avait pas été appliquée. Aucune n'est une
-- fuite entre utilisateurs — tout est borné au propriétaire — et aucune n'est atteinte par un
-- chemin du produit : ce sont des écarts entre ce que le schéma garantit et ce que trois
-- documents affirment qu'il garantit.
--
-- ── 1. `feedback` : un DELETE que personne n'utilise, et qui désarme le garde-fou de volume ──
--
-- `enforce_feedback_rate_limit` compte les lignes **vivantes** des 24 dernières heures. La policy
-- DELETE owner-scoped laissait donc remettre ce compteur à zéro : dix retours, on efface, on
-- recommence, indéfiniment — sur la seule table où un client écrit du texte libre, avec une
-- session anonyme obtenue à la simple ouverture de l'app. C'est exactement l'abus que le
-- paragraphe « Un point de sécurité qui n'est pas théorique ici » de `20260905150000_feedback.sql`
-- décrit, et que son garde-fou existe pour empêcher.
--
-- **Le DELETE part plutôt qu'on ne compte autre chose**, et c'est le relevé qui l'a décidé :
--   - aucun écran ne l'emprunte (`src/lib/feedback.ts` ne fait qu'un `insert`, et c'est le seul
--     usage de la table dans `src/` comme dans `api/`) ;
--   - la policy n'a **aucun commentaire** dans la migration qui la crée, là où chaque autre
--     décision de ce fichier porte le sien — elle n'a jamais servi une intention écrite ;
--   - et `src/app/confidentialite.tsx` documente déjà la table comme « insert-only côté client ».
--     Le schéma contredisait la page qui l'explique aux gens.
-- L'effacement reste garanti là où il est promis : la suppression de compte efface `auth.users`
-- et la cascade emporte les retours, et la purge des sessions anonymes fait de même à 90 jours —
-- les deux sont décrits par `/confidentialite`, et testés en `15_suppression_et_export`.

drop policy if exists "feedback delete own" on public.feedback;
revoke delete on public.feedback from authenticated;

-- ── 2. `assessments` : le privilège par COLONNE, l'outil que la RLS ne remplace pas ────────────
--
-- `authenticated` portait `update` sur **les cinq colonnes** de la table — `id`, `user_id`,
-- `status`, `created_at` et `submitted_at` —, la policy ne bornant que la ligne. Or le client
-- n'en écrit **qu'une seule** : `src/app/bilan/index.tsx` fait `.update({ status })` à la
-- soumission, et c'est son unique écriture sur cette table.
--
-- Ce que la largeur coûtait, et que deux documents affirmaient pourtant garanti :
-- `assessments.submitted_at` est annoncé comme **une date serveur** (trigger
-- `stamp_assessment_submitted_at`, CLAUDE.md), et la garde d'idempotence de
-- `generate_plan_cycle_for_user` dit **comparer deux horodatages serveur**. C'était faux : le
-- trigger ne pose la date qu'à la **transition** vers `completed` (`old.status is distinct from
-- 'completed' or new.submitted_at is null`), donc un `update` qui ne touche que `submitted_at`
-- sur un bilan déjà complété passait au travers. Poussée dans le futur, la date faisait
-- reconstruire le plan par le cron **chaque nuit** : rangs d'affichage perdus, reprise
-- d'engagement rejouée pour rien, et `plan_actions.id` changé à chaque passage — donc un écran
-- resté ouvert dont le `commit_plan_action` échoue en `no_data_found`. Elle est aussi l'âge du
-- bilan, lu par le régime de re-bilan, par le suivi et par le moment anniversaire.
--
-- **Le correctif est un privilège de colonne et non un trigger**, pour trois raisons : c'est
-- l'outil que Postgres donne exactement pour ce que la RLS ne sait pas faire ; il resserre les
-- quatre autres colonnes du même geste, plutôt que la seule qu'on avait remarquée ; et il laisse
-- les fixtures pgTAP intactes — trois d'entre elles reculent `submitted_at` par un `update`
-- délibéré (`02`, `08`, `21`), technique documentée en tête de `21_engagement_qui_survit`, et
-- elles tournent en propriétaire, que les privilèges ne concernent pas. Un trigger qui figerait
-- la colonne les aurait toutes cassées et aurait obligé à le désarmer dans chacune.
--
-- `revoke` puis `grant` et non l'inverse : un `grant` de colonne ne retire pas le privilège de
-- table, il s'y ajoute — la révocation doit précéder, sans quoi ce bloc ne changerait rien.

revoke update on public.assessments from authenticated;
grant update (status) on public.assessments to authenticated;

-- ── 3. `assessment_answers` : l'UPDATE n'avait aucun prédicat de statut ───────────────────────
--
-- La policy autorisait le propriétaire à réécrire les réponses d'un bilan **déjà `completed`**,
-- en direct, sans RPC et sans recalcul. `assessment_results` restant figé (c'est son rôle), le
-- bilan affichait alors un chiffre calculé sur des réponses qui ne sont plus celles de la base —
-- puis le premier recalcul serveur (ouverture de `/contexte`, re-bilan, reprise en masse après
-- une correction de facteur) faisait bondir le total **sans qu'aucune ligne ne soit ajoutée à
-- `assessments`** : le suivi montrait un saut attribué à un bilan soumis des mois plus tôt.
--
-- C'est l'invariant central du produit — « `assessment_results` fige le résultat calculé au
-- moment du bilan » — cassé sans qu'aucune écriture interdite ait eu lieu. Et C6.4 justifie son
-- RPC `mettre_a_jour_le_contexte` par « l'atomicité **et** le bornage des colonnes », en ajoutant
-- « Le dire évite qu'un prochain passage retire le RPC en simplifiant » : le RPC ne bornait rien
-- tant que la policy qu'il est censé remplacer restait ouverte à côté de lui.
--
-- **Le prédicat ne casse rien**, et c'est mesuré plutôt que supposé :
--   - la soumission `upsert` les réponses **avant** de basculer le bilan en `completed`
--     (`src/app/bilan/index.tsx` : les réponses, puis `.update({ status })`) — c'est la séquence
--     que `20260911120000_soumission_bilan.sql` a imposée contre le bilan fantôme ;
--   - `mettre_a_jour_le_contexte` est `security definer` détenue par `postgres`, et la table ne
--     porte pas `force row level security` (`pg_class.relforcerowsecurity = false`, relevé) :
--     le propriétaire n'est donc pas soumis à la RLS, et le seul chemin qui corrige légitimement
--     un bilan complété continue de passer. C'est d'ailleurs le sens du chantier : ces quatre
--     colonnes-là se corrigent **par lui**, parce que lui recalcule et régénère ;
--   - les tests qui mettent à jour cette table le font en propriétaire (`27`), ou pour éprouver
--     le refus opposé à un **tiers** (`03`), jamais le droit du propriétaire sur un bilan clos.
--
-- Le `with check` est écrit explicitement bien que Postgres réutilise le `using` en son absence :
-- les deux moitiés d'une policy d'UPDATE ne disent pas la même chose — l'une choisit les lignes
-- modifiables, l'autre ce qu'elles ont le droit de devenir — et les laisser implicitement égales
-- est le genre de raccourci qui devient faux le jour où l'une des deux bouge.

drop policy if exists "assessment_answers update own" on public.assessment_answers;

create policy "assessment_answers update own"
  on public.assessment_answers for update
  to authenticated
  using (
    exists (
      select 1 from public.assessments a
       where a.id = assessment_answers.assessment_id
         and a.user_id = (select auth.uid())
         and a.status = 'in_progress'
    )
  )
  with check (
    exists (
      select 1 from public.assessments a
       where a.id = assessment_answers.assessment_id
         and a.user_id = (select auth.uid())
         and a.status = 'in_progress'
    )
  );

-- ── Contrôles de la migration ────────────────────────────────────────────────────────────────
--
-- Ils ne remplacent pas les assertions pgTAP (qui, elles, éprouvent le refus sous une vraie
-- session) : ils garantissent que **ce fichier-ci** a bien produit l'état qu'il décrit, y compris
-- quand il est rejoué sur une base qui l'a déjà reçu.

do $$
begin
  if exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'feedback' and cmd = 'DELETE'
  ) then
    raise exception 'La policy DELETE de `feedback` est toujours là : le garde-fou de volume reste désarmé.';
  end if;

  if has_table_privilege('authenticated', 'public.feedback', 'delete') then
    raise exception 'Le privilège DELETE sur `feedback` est toujours accordé à `authenticated`.';
  end if;

  -- Le privilège de colonne : `status` accordé, les quatre autres retirés. On nomme `submitted_at`
  -- parce que c'est celle dont deux documents affirment qu'elle vient du serveur.
  if not has_column_privilege('authenticated', 'public.assessments', 'status', 'update') then
    raise exception 'La soumission ne peut plus écrire `assessments.status` : le questionnaire est cassé.';
  end if;

  if has_column_privilege('authenticated', 'public.assessments', 'submitted_at', 'update') then
    raise exception '`assessments.submitted_at` est toujours écrivable par le client.';
  end if;

  if has_column_privilege('authenticated', 'public.assessments', 'user_id', 'update') then
    raise exception '`assessments.user_id` est toujours écrivable par le client.';
  end if;

  -- Le prédicat de statut, lu sur la policy installée plutôt que sur ce fichier : c'est la base
  -- qui fait foi, et une policy remplacée par une main humaine se verrait ici.
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'assessment_answers' and cmd = 'UPDATE'
       and qual like '%in_progress%' and with_check like '%in_progress%'
  ) then
    raise exception 'La policy UPDATE d’`assessment_answers` ne borne pas le statut dans ses deux moitiés.';
  end if;
end $$;
