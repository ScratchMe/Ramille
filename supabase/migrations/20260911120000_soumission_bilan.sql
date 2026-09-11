-- v1-13, chantier C1.1 — la soumission d'un bilan ne laisse plus de bilan fantôme.
-- Constats A2-2, A8-3, A2-19, A2-15, A12-17, A3-5.
--
-- ## Le défaut, et pourquoi il était invisible
--
-- `submit()` insérait `assessments` en `completed` avec son `submitted_at`, **puis** les
-- réponses, **puis** appelait `compute_assessment_results`. Trois écritures, aucune atomicité.
-- Ce qui s'arrête entre les deux premières laisse un bilan complété sans réponses ni résultat, et
-- ce n'est pas un état inerte :
--
--   * la racine de l'app route sur `status = 'completed'` — elle envoie donc au plan ;
--   * `/plan` ne trouve aucun cycle et affiche « Ton plan est en cours de préparation », sans
--     bouton, indéfiniment : le cron nocturne `generate_plan_cycles()` boucle lui aussi sur les
--     bilans `completed`, mais `generate_plan_cycle_for_user` a besoin des réponses ;
--   * le préremplissage du re-bilan lit le dernier bilan complété et n'y trouve rien, ce qui
--     annule la seule mécanique qui rend le suivi dans la durée praticable ;
--   * et l'entonnoir compte un « bilan soumis » là où il y a eu une panne.
--
-- La séquence côté client devient : insert en `in_progress` → réponses → passage en `completed`
-- avec `submitted_at` → RPC. L'ordre n'est pas négociable : `generate_plan_cycle_for_user`
-- sélectionne `status = 'completed'`, donc le passage doit précéder le calcul. Et la reprise se
-- fait en **réutilisant** le bilan `in_progress` qui traîne plutôt qu'en le supprimant — le
-- chantier offrait les deux, et la reprise est strictement meilleure : elle couvre le cas où
-- l'app est tuée entre deux écritures, où aucun code de nettoyage ne tournerait jamais, et elle
-- n'impose pas d'accorder un privilège `delete` sur `assessments` que le lot 0 vient de refuser
-- à tout le monde. Un bilan `in_progress` oublié ne coûte rien : rien ne le lit — ni la racine,
-- ni le plan, ni le cron, ni l'historique.
--
-- Ce fichier ne porte donc **aucune policy ni aucun privilège nouveau** : `grant select, insert,
-- update on public.assessments to authenticated` et la policy « assessments update own »
-- existent déjà et suffisent exactement à cette séquence.

-- ── 1. Le plan ne peut plus emporter le bilan (A8-3) ────────────────────────────────────
-- `recompute_assessment_results` se termine par `perform public.generate_plan_cycle_for_user(…)`,
-- sans garde. Les deux fonctions tournent dans la **même** transaction que le RPC client : une
-- exception dans la génération du plan annule donc aussi l'écriture d'`assessment_results`, que
-- le calcul venait de réussir. Le bilan est perdu pour une panne qui ne le concerne pas — et il
-- suffit d'un mode sans facteur d'émission pour que `estimate_action_savings` lève (la fonction
-- `emission_factor` lève explicitement plutôt que de rendre un `NULL` qui contaminerait le
-- total, cf. 20260904140000).
--
-- Le bloc `begin … exception … end` de plpgsql ouvre une sous-transaction : son annulation laisse
-- intact tout ce qui précède. Le bilan est donc rendu, et le plan manquant est rattrapé par le
-- cron nocturne — c'est précisément pour cela qu'il existe en double (CLAUDE.md : les deux
-- mécanismes de génération sont à garder synchronisés, pas à fusionner).
--
-- **`raise warning` et non `raise notice`** : c'est le niveau que Supabase conserve dans les
-- journaux Postgres, donc le seul qui laisse une trace lisible après coup. L'échec reste visible
-- là, sans remonter au client, pour qui le bilan a bel et bien abouti.
--
-- ## Pourquoi une substitution vérifiée plutôt qu'un corps recopié
--
-- Le corps fait 10 Ko et la modification porte sur une ligne. Le retranscrire ici serait la
-- meilleure façon d'y introduire une faute étrangère au sujet, et une faute **silencieuse** : le
-- calcul rendrait un nombre dans tous les cas. On part donc du corps réellement installé, et la
-- substitution est vérifiée — si l'appel a changé de forme, la migration échoue au lieu de ne
-- rien faire. Même idiome que 20260905200000_cylindree_deux_roues.sql, qui l'a introduit pour la
-- même raison ; la migration reste rejouable à froid, puisque les migrations précédentes posent
-- exactement ce corps-là.

do $garde$
declare
  cible oid;
  src text;
  -- Dollar-quoting, et pas une suite de littéraux à apostrophes : dans une continuation de
  -- littéraux, le préfixe `E` ne vaut que pour le sien — les `\n` des suivants resteraient des
  -- barres obliques suivies d'un « n » et produiraient un corps qui ne compile pas. Ici, les
  -- retours à la ligne sont réels et `''` est bien une paire d'apostrophes, ce que le corps
  -- généré attend dans sa propre chaîne.
  attendu text := $att$
  perform public.generate_plan_cycle_for_user(v_owner_id);
end;$att$;
  remplacement text := $corps$
  -- Le plan ne doit pas pouvoir emporter le bilan (C1.1, A8-3). Les deux fonctions partagent la
  -- transaction du RPC client : sans cette sous-transaction, une exception ici annulerait aussi
  -- l’écriture d’assessment_results que le calcul vient de réussir, et il suffit d’un mode sans
  -- facteur d’émission pour faire lever estimate_action_savings.
  --
  -- Le plan manquant est rattrapé par le cron nocturne generate_plan_cycles(), qui existe
  -- précisément pour cela. `raise warning` est le niveau que Supabase conserve dans les journaux
  -- Postgres : l’échec reste lisible après coup sans remonter au client, pour qui le bilan a
  -- bel et bien abouti.
  begin
    perform public.generate_plan_cycle_for_user(v_owner_id);
  exception when others then
    raise warning 'recompute_assessment_results: le plan de % n''a pas pu être généré (% %). Le bilan est enregistré, le cron nocturne réessaiera.',
      v_owner_id, sqlstate, sqlerrm;
  end;
end;$corps$;
  occurrences int;
begin
  select p.oid into cible
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname = 'recompute_assessment_results';

  if cible is null then
    raise exception 'recompute_assessment_results est introuvable : cette migration suppose 20260905130000 appliquée.';
  end if;

  src := pg_get_functiondef(cible);

  -- Une seule occurrence attendue, et c'est la dernière instruction du corps. On compte avant de
  -- substituer : `replace` sur deux occurrences passerait inaperçu et envelopperait un appel qui
  -- n'est pas celui qu'on vise.
  occurrences := (length(src) - length(replace(src, attendu, ''))) / length(attendu);

  if occurrences <> 1 then
    raise exception
      'L''appel final à generate_plan_cycle_for_user a été trouvé % fois (une seule attendue) dans recompute_assessment_results : la garde doit être posée à la main.',
      occurrences;
  end if;

  execute replace(src, attendu, remplacement);
end
$garde$;

-- Contrôle : la garde est bien en place, et l'appel nu a disparu.
do $controle$
declare
  src text;
begin
  select prosrc into src from pg_proc
  where pronamespace = 'public'::regnamespace and proname = 'recompute_assessment_results';

  if position('exception when others then' in src) = 0 then
    raise exception 'La garde autour de generate_plan_cycle_for_user n''a pas été posée.';
  end if;
end
$controle$;

-- ── 2. L'événement qui mesure l'échec (A2-15) ───────────────────────────────────────────
-- Le seul événement du produit qui mesure un échec, et il ne double aucun fait du schéma
-- (règle de v1-08 §2) : `assessments.submitted_at` n'est écrit **que** quand la soumission
-- aboutit, et un bilan resté `in_progress` ne dit ni pourquoi il s'est arrêté ni à quel pas.
-- C'est le complément du fait, pas sa copie — et le test qui interdit de réintroduire
-- `bilan_submit` reste juste, puisqu'il nomme les événements un par un.
--
-- **Deux dimensions, et jamais le message d'erreur.** `etape` vient du code appelant, qui sait
-- où il en est ; `genre` se dérive du code de l'erreur (`src/types/soumission.ts`), jamais de son
-- texte — une violation de contrainte cite la valeur refusée, c'est-à-dire une réponse de la
-- personne, et cette table ne porte pas de texte libre. `check_usage_event_props` ne valide que
-- des clés et des longueurs, jamais des valeurs : les valeurs attendues n'ont donc qu'un seul
-- endroit où être écrites côté base, cette description.
--
-- Le pendant côté client est `src/types/analytics.ts` (`USAGE_EVENT_NAMES` et
-- `UsageEventPropsByName`), livré dans le même lot : sans lui, rien n'émet l'événement et cette
-- ligne se lirait **zéro** plutôt que « pas encore instrumenté ». La troisième copie de la liste
-- vit dans `supabase/tests/database/12_usage_events.test.sql` (`bag_eq`).

insert into public.usage_event_types (name, description) values
  (
    'bilan_submit_error',
    'La soumission d''un bilan a échoué. props.etape : le pas atteint (session, creation, reponses, finalisation, calcul) ; props.genre : la nature de la panne, dérivée du code de l''erreur et jamais de son message (reseau, contrainte, permission, introuvable, autre). Ne double pas submitted_at, qui n''est écrit que si la soumission aboutit.'
  )
on conflict (name) do nothing;

-- ── 3. Une quatrième porte pour `retrouver_view` ────────────────────────────────────────
-- `src/app/_layout.tsx` ouvre `/connexion/retrouver` avec `source: 'lien'` quand l'URL entrante
-- porte un échec de lien au lieu de jetons : une porte neuve, émise sans être déclarée, que
-- `sourceMesuree` repliait donc sur `onboarding` — en gonflant exactement la porte à laquelle on
-- voulait la comparer. La base ne valide pas les valeurs de `props`, donc rien ne l'aurait
-- signalé ; cette description est le seul endroit où elles sont écrites côté base.
update public.usage_event_types
set description = 'Affichage de /connexion/retrouver. props.source : « onboarding » (« J''ai déjà un compte »), « email » (renvoi après un email_exists), « google » (collision d''identité), « lien » (le layout racine y amène après un lien de connexion expiré ou refusé). props.collision : l''appareil portait déjà un bilan anonyme — c''est ce chiffre qui décide si la collision Google mérite un écran dédié.'
where name = 'retrouver_view';
