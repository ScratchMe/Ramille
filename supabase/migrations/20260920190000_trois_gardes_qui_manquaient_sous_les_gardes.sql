-- Trois gardes qui manquaient SOUS les gardes (revue de sécurité du 20/09/2026)
--
-- Les trois corrigent la même forme de défaut, et c'est elle qu'il faut retenir : **une garde
-- était bien là, elle tenait sur le chemin qu'on avait regardé, et un second chemin la
-- contournait sans rien lever.** Aucune n'est une fuite entre utilisateurs — le modèle
-- owner-scoped a été rejoué depuis la session d'un tiers contre un compte complet, et il rend
-- zéro ligne sur les onze tables de données personnelles.
--
-- ── 1. Les privilèges par défaut : la règle écrite dans `CLAUDE.md` était FAUSSE ──────────────
--
-- `CLAUDE.md` affirme depuis le 10/09/2026 qu'« ajouter une table impose un `grant` ou un
-- `revoke` explicite, sinon elle est invisible pour l'app, en silence », et l'en-tête de
-- `20260910110000_grants_explicites.sql` tient le même raisonnement. **Mesuré le 20/09/2026, en
-- local comme sur le distant, c'est l'inverse** : `pg_default_acl` accorde toujours
-- `arwdDxtm` — select, insert, update, delete, truncate, references, trigger — à `anon` ET à
-- `authenticated` sur toute table créée dans `public`, et la RLS y est inactive par défaut.
--
-- Éprouvé plutôt qu'affirmé, en transaction annulée : une table neuve, une ligne dedans, puis
-- `set local role anon` sans aucune session — `anon` l'a lue, puis l'a **supprimée**.
--
-- Aucune des vingt tables actuelles n'est concernée : toutes portent la RLS et des grants
-- explicites, vérifié des deux côtés. Le danger porte entièrement sur **la prochaine migration
-- qui crée une table**, écrite par quelqu'un qui croit la règle ci-dessus — donc qui ne
-- vérifiera pas. Et rien ne l'attraperait : ni la CI, ni pgTAP, puisque le local se comporte
-- exactement comme le distant.
--
-- **Ce que ce bloc ferme, et ce qu'il ne ferme pas.** `alter default privileges` ne porte que
-- sur les objets créés par **un rôle donné**. Il y a deux entrées dans `pg_default_acl` :
-- `postgres` et `supabase_admin`. Les migrations tournent en `postgres`, donc c'est celle-ci
-- qui décide du sort de nos tables, et c'est celle-ci qu'on ferme. `postgres` **ne peut pas**
-- toucher celle de `supabase_admin` (`permission denied to change default privileges`,
-- constaté) : elle concerne les objets créés par la plateforme, et elle se désactive au tableau
-- de bord (« Default privileges for new entities »). C'est consigné en
-- `docs/exploitation/README.md` plutôt que supposé fermé.

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- ── 2. `feedback` : le plafond de volume comptait une date que le client posait ───────────────
--
-- `enforce_feedback_rate_limit` compte les lignes dont `created_at > now() - interval '24
-- hours'`. Or `grant insert on table public.feedback` porte sur **toutes** les colonnes,
-- `created_at` comprise : il suffit de l'antidater à chaque insert pour que le compteur ne
-- trouve jamais rien.
--
-- **Mesuré le 20/09/2026** : depuis une session neuve, le chemin honnête est bien refusé au
-- onzième retour (`RM002`) ; avec `created_at` à J-25 h, **cinq cents lignes de deux mille
-- caractères passent sans un refus** — 977 ko de texte libre pour une seule session anonyme,
-- obtenue à la simple ouverture de l'app. C'est la seule table où un client écrit du texte
-- libre, et ce plafond en était l'unique garde-fou — la policy DELETE ayant justement été
-- retirée ce matin (`20260920160000`) pour qu'il ne puisse plus être remis à zéro.
--
-- Deuxième conséquence, plus discrète : `purge_stale_anonymous_accounts` prend
-- `max(f.created_at)` dans son `greatest(...)` de signes de vie, donc un retour daté dans le
-- futur rendait un compte anonyme **immortel**.
--
-- **Un trigger d'estampille plutôt qu'un privilège de colonne**, à l'inverse du choix fait ce
-- matin pour `assessments` : la date n'est pas seulement interdite au client, elle doit valoir
-- `now()` **pour tout le monde**, y compris pour un appel en propriétaire. C'est la forme
-- qu'ont déjà ses deux jumelles — `stamp_usage_event_time` et `stamp_assessment_submitted_at` —
-- et `feedback.created_at` était la seule des trois dates à ne pas l'avoir.

create or replace function public.stamp_feedback_created_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_at := now();
  return new;
end;
$$;

revoke execute on function public.stamp_feedback_created_at() from public, anon, authenticated;

drop trigger if exists stamp_feedback_created_at on public.feedback;
create trigger stamp_feedback_created_at
  before insert on public.feedback
  for each row execute function public.stamp_feedback_created_at();

-- ── 3. `assessments` : le bornage de C6.4 se franchissait en trois ordres ─────────────────────
--
-- `20260920160000` a borné la policy UPDATE d'`assessment_answers` à `status = 'in_progress'`,
-- pour qu'on ne réécrive plus les réponses d'un bilan complété sans recalcul. **Cette borne
-- tient en direct** (mesuré : zéro ligne affectée) — et elle se franchit en repassant le bilan
-- en `in_progress`, en réécrivant, puis en le remettant en `completed`. Trois ordres, tous
-- autorisés : `status` est précisément la colonne que la soumission doit pouvoir écrire, donc
-- la seule que le privilège de colonne laisse au client.
--
-- Mesuré le 20/09/2026 sur un bilan complété, soumis soixante jours plus tôt : l'attaque
-- directe rend `UPDATE 0`, l'aller-retour rend `UPDATE 1` trois fois, la distance passe de 30 à
-- 1 km, et `assessment_results` reste figé sur l'ancien total — l'invariant central du produit
-- cassé sans qu'aucune écriture interdite ait eu lieu.
--
-- **Et `submitted_at` bouge avec, alors que le privilège de colonne a bien été retiré** : c'est
-- le trigger `stamp_assessment_submitted_at` qui la repose à la transition retour vers
-- `completed`. Or cette date est la clé d'idempotence de `generate_plan_cycle_for_user` : la
-- déplacer fait reconstruire le cycle, donc **libère l'action engagée** — exactement ce que C2.2
-- existe pour empêcher — et ment sur l'âge du bilan, que lisent le régime de re-bilan, le suivi
-- et le moment anniversaire.
--
-- **La correction est le refus de la transition arrière, et rien d'autre.** Aucun chemin du
-- produit ne la prend, vérifié : la reprise du questionnaire **réutilise** le bilan
-- `in_progress` qui traîne (`src/app/bilan/index.tsx`, règle de
-- `20260911120000_soumission_bilan.sql`), un re-bilan crée une **nouvelle** ligne, et
-- `mettre_a_jour_le_contexte` ne fait que lire `status`. Le refus vaut donc pour tout le monde,
-- propriétaire compris — un bilan complété est un fait daté, pas un brouillon qu'on rouvre.
--
-- `RM005`, dans la classe réservée aux conditions du produit (`RM001` le refus de remplacement,
-- `RM002` le plafond de retours, `RM003` les préconditions du contexte, `RM004` la cause
-- inconnue). Reconnu au **code** et jamais au message, comme les quatre autres.

create or replace function public.refuser_le_retour_en_arriere_du_bilan()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'completed' and new.status <> 'completed' then
    raise exception 'Un bilan complété ne se rouvre pas : refaire un bilan crée une nouvelle ligne.'
      using errcode = 'RM005';
  end if;
  return new;
end;
$$;

revoke execute on function public.refuser_le_retour_en_arriere_du_bilan() from public, anon, authenticated;

drop trigger if exists refuser_le_retour_en_arriere_du_bilan on public.assessments;
create trigger refuser_le_retour_en_arriere_du_bilan
  before update of status on public.assessments
  for each row execute function public.refuser_le_retour_en_arriere_du_bilan();

-- ── Contrôles de la migration ────────────────────────────────────────────────────────────────
--
-- Ils ne remplacent pas les assertions pgTAP, qui éprouvent les trois refus sous une vraie
-- session : ils garantissent que **ce fichier-ci** a produit l'état qu'il décrit, y compris
-- rejoué sur une base qui l'a déjà reçu.

do $$
declare
  v_acl text;
begin
  select defaclacl::text into v_acl
    from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
   where n.nspname = 'public' and d.defaclobjtype = 'r'
     and pg_get_userbyid(d.defaclrole) = 'postgres';

  -- `null` est le bon état : Postgres retire la ligne quand il ne reste rien à dire d'autre
  -- que le défaut. Ce qui doit être faux, c'est qu'`anon` ou `authenticated` y figure encore.
  if v_acl is not null and (position('anon=' in v_acl) > 0 or position('authenticated=' in v_acl) > 0) then
    raise exception 'Les privilèges par défaut de `public` accordent encore quelque chose à anon/authenticated : %', v_acl;
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'stamp_feedback_created_at' and not tgisinternal
  ) then
    raise exception 'Le trigger d''estampille de `feedback.created_at` n''est pas posé.';
  end if;

  if not exists (
    select 1 from pg_trigger where tgname = 'refuser_le_retour_en_arriere_du_bilan' and not tgisinternal
  ) then
    raise exception 'Le trigger de refus du retour en arrière du bilan n''est pas posé.';
  end if;

  -- `20260920160000` avait besoin d'être réarmé après le backfill de C2.4 ; ici on vérifie que
  -- le trigger d'estampille de `submitted_at` est toujours là, puisque le bloc 3 raisonne
  -- dessus — un contrôle qui coûte une requête et garde une prémisse.
  if not exists (
    select 1 from pg_trigger where tgname = 'stamp_assessment_submitted_at' and not tgisinternal
  ) then
    raise exception 'Le trigger `stamp_assessment_submitted_at` a disparu : le bloc 3 raisonne sur son existence.';
  end if;
end $$;
