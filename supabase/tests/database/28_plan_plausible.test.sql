-- Tests pgTAP de C3.8 — ce qui rend le plan plausible : les deux filtres de contexte, la clé
-- naturelle du référentiel, les échéances des voyages, et la vue qui rend l'effet lisible.
--
-- **Les assertions de chiffrage vivent dans le fichier `10`**, avec le reste de
-- `estimate_action_savings` : c'est là qu'on éprouve ce que le filtre écarte pour un profil donné.
-- Ici on éprouve ce que le **référentiel** garantit, indépendamment de tout profil — et c'est une
-- distinction qui compte, parce que rien dans le schéma ne valide le contenu des deux tableaux
-- qu'ajoute ce chantier : une valeur mal orthographiée y désactiverait un gabarit pour **tout le
-- monde**, en silence, sans qu'aucun test de profil ne s'en aperçoive (il verrait simplement une
-- action de moins, ce qui est aussi le comportement attendu du filtre).
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

-- ── Les deux tableaux ne portent que des valeurs que le schéma connaît ───────────────────
-- Balayages de la table entière, sans nommer aucun gabarit : un treizième ajouté demain les
-- traverse. C'est la forme que le dépôt a retenue après que quatre modes ajoutés au référentiel
-- des facteurs ont fait tomber la CI sans être nommés nulle part.

select is_empty(
  $$ select action_text from public.action_templates t, unnest(t.zones_admissibles) z
     where z not in ('urbain_dense', 'periurbain', 'rural') $$,
  'zones_admissibles : que des valeurs de zone_type — une faute de frappe désactiverait le gabarit partout'
);

select is_empty(
  $$ select action_text from public.action_templates t, unnest(t.teletravail_admissible) r
     where r not in ('oui', 'parfois', 'non') $$,
  'teletravail_admissible : que des réponses de B4.4'
);

-- Et le tableau vide n'est pas une condition vide : `= any('{}')` est faux pour toute valeur, donc
-- un tableau vide écarte le gabarit pour tout le monde là où `null` ne l'écarte pour personne. Les
-- deux se lisent « pas de condition » et n'en sont pas.
select is_empty(
  $$ select action_text from public.action_templates
     where zones_admissibles = '{}' or teletravail_admissible = '{}' $$,
  'aucune condition vide : elle n’écarterait pas « personne » mais « tout le monde »'
);

-- ── La clé naturelle du référentiel ─────────────────────────────────────────────────────
-- `action_templates.id` vaut `gen_random_uuid()`, donc les gabarits portent des identifiants
-- différents sur chaque base. Tout ce dépôt les apparie par `action_text` — les deux migrations de
-- C2.1 et C4.6, les fichiers de test, et l'`on conflict` qui rend l'insert de C3.8 rejouable. Rien
-- ne le garantissait avant que cet index n'existe.

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'action_templates'
      and indexdef like '%UNIQUE%' and indexdef like '%(action_text)%'
  ),
  'action_text est unique : c’est par lui que tout le dépôt apparie les gabarits'
);

-- ── Les échéances des voyages ───────────────────────────────────────────────────────────
-- Elles s'ajoutent, elles ne remplacent pas : les trois échéances des sorties restent, et c'est
-- l'écran qui décide lesquelles proposer selon le poste.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('c3800000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-c38@test.local', 'x', now(), now());

insert into public.plan_cycles (id, user_id, period_start, period_end, period_label, trip_label,
                                cadence_type, target_reduction_pct)
values ('c3800000-0000-0000-0000-000000000011', 'c3800000-0000-0000-0000-000000000001',
        date_trunc('month', current_date)::date, (date_trunc('month', current_date) + interval '3 months - 1 day')::date,
        'Période de test', 'Voyages longue distance (Avion long-courrier)', 'season', 20);

insert into public.plan_actions (id, plan_cycle_id, action_template_id, rank)
select 'c3800000-0000-0000-0000-000000000021', 'c3800000-0000-0000-0000-000000000011', id, 1
from public.action_templates where action_text = 'Renoncer à un vol long-courrier cette année';

select lives_ok(
  $stmt$ update public.plan_actions set committed_at = now(), intention_timing = 'au_prochain_voyage'
           where id = 'c3800000-0000-0000-0000-000000000021' $stmt$,
  'l’échéance d’un voyage est acceptée : « Ce mois-ci » n’en est pas une pour un vol'
);

select lives_ok(
  $stmt$ update public.plan_actions set intention_timing = 'ce_mois'
           where id = 'c3800000-0000-0000-0000-000000000021' $stmt$,
  'les trois échéances des sorties restent acceptées : les nouvelles s’ajoutent, elles ne remplacent pas'
);

select throws_ok(
  $stmt$ update public.plan_actions set intention_timing = 'un_de_ces_jours'
           where id = 'c3800000-0000-0000-0000-000000000021' $stmt$,
  '23514',
  'new row for relation "plan_actions" violates check constraint "plan_actions_intention_timing_check"',
  'une échéance inconnue est refusée : la contrainte s’est élargie, elle ne s’est pas ouverte'
);

-- ── La vue d'analyse ────────────────────────────────────────────────────────────────────
-- Elle croise des segments et des choix personnels, et **aucune policy ne s'applique à une vue** :
-- ce qui la protège est la révocation, et rien d'autre. Même garde que les autres vues d'analyse.

select ok(
  not has_table_privilege('anon', 'analytics.engagement_action_by_segment', 'select')
    and not has_table_privilege('authenticated', 'analytics.engagement_action_by_segment', 'select'),
  'analytics.engagement_action_by_segment : révoquée des deux rôles clients'
);

select * from finish();
rollback;
