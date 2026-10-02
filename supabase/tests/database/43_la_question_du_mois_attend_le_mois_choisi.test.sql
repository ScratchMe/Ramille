-- Tests pgTAP : la question du mois attend le mois choisi (`v1-33` D14, migration
-- `20261002210553_la_question_du_mois_attend_le_mois_choisi.sql`).
--
-- **Le défaut** : une action de sorties choisie en octobre pour « Le mois prochain » était
-- interrogée le 1er novembre sur octobre — « En octobre, as-tu fait… ? », dont la seule réponse
-- honnête est « Non ». Tant que le mois interrogé n'est pas postérieur au mois du choix, le point
-- pose la question générique et ne retient pas l'action.
--
-- **Cinq profils aux réponses identiques** (sorties chaque semaine en voiture, rien d'autre), la même
-- action engagée sur leurs sorties ; seuls changent l'échéance et le moment du choix, lus par
-- rapport au mois que le point interroge (« le mois écoulé ») :
--   - **A** — « Le mois prochain », choisie au milieu du mois écoulé : la question générique, sans
--     l'action. C'est le cas du défaut ;
--   - **B** — « Le mois prochain », choisie le mois d'avant : le mois écoulé est celui qu'elle visait,
--     donc l'action est interrogée. Sans B, la règle pourrait ne jamais rendre la main à l'action ;
--   - **C** — « Ce mois-ci », choisie au milieu du mois écoulé : l'action est interrogée. Le témoin
--     de l'échéance — la règle ne vise que « Le mois prochain » ;
--   - **D** — « Le mois prochain », choisie le 1er du mois écoulé à 0 h 30, **heure de Paris** : en
--     UTC, c'est encore le mois d'avant. La question générique, parce que la personne l'a choisie
--     ce mois-là. C'est le profil qui garde le fuseau ;
--   - **E** — « Le mois prochain », choisie le 1er du mois suivant à 0 h 30, après le mois écoulé —
--     le cas que la migration décrit, un engagement pris avant le passage de 6 h : la recherche de
--     l'action ne borne pas `committed_at`, donc elle la retrouve, et c'est la règle « postérieur » et
--     non « différent » qui la tient à l'écart. Un instant fixe et non `now()` : le mois interrogé se
--     calcule en UTC, le mois du choix en heure de Paris, et `now()` le 1er entre minuit et 2 h
--     faisait rougir la prémisse à tort (contre-lecture du 02/10/2026).
--
-- **Éprouvé en le cassant, le 02/10/2026** (TESTING.md §1.1), six mutations du générateur, une à la
-- fois sur la stack locale, **la suite pgTAP entière** rejouée à chaque fois, la fonction restaurée
-- après :
--   - la règle retirée (aucune échéance ne l'enclenche) → A (deux assertions), D et E ; rien ailleurs ;
--   - le mois du choix lu en UTC → D, seul. C'est la mutation qui justifie ce profil ;
--   - « différent » écrit « égal » → E, seul ;
--   - l'action gardée sur le point générique → A, D et E, par leur `committed_action_text` ;
--   - toute échéance au lieu de « Le mois prochain » → C ici, et six assertions du fichier 40 et une
--     du fichier 20, dont les engagements sont pris le jour même, donc après le mois interrogé ;
--   - le mois du choix ignoré (toute action « Le mois prochain » reste générique) → B, seul. Ajoutée
--     sur un constat de la contre-lecture : aucune des cinq premières n'éprouvait B, qui garde que la
--     règle rend la main à l'action.
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

-- ── Fixtures ─────────────────────────────────────────────────────────────────────────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, is_anonymous, created_at, updated_at)
select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'pgtap-mois-choisi-' || right(u::text, 1) || '@test.local', 'x', now(), false, now(), now()
from unnest(array[
  'e6000000-0000-0000-0000-00000000000a'::uuid,  -- A
  'e6000000-0000-0000-0000-00000000000b',        -- B
  'e6000000-0000-0000-0000-00000000000c',        -- C
  'e6000000-0000-0000-0000-00000000000d',        -- D
  'e6000000-0000-0000-0000-00000000000e'         -- E
]) u;

insert into public.assessments (id, user_id, status, submitted_at)
select replace(u::text, 'e6000000', 'e6010000')::uuid, u, 'completed', now()
from unnest(array[
  'e6000000-0000-0000-0000-00000000000a'::uuid, 'e6000000-0000-0000-0000-00000000000b',
  'e6000000-0000-0000-0000-00000000000c', 'e6000000-0000-0000-0000-00000000000d',
  'e6000000-0000-0000-0000-00000000000e'
]) u;

insert into public.assessment_answers (assessment_id, commute_has_regular_trip, leisure_frequency,
  leisure_mode, leisure_distance_bracket, leisure_car_engine, household_vehicles, zone_type, tc_access)
select replace(u::text, 'e6000000', 'e6010000')::uuid, false, 'weekly', 'voiture', '15_30', 'thermique',
       '1', 'periurbain', 'bon'
from unnest(array[
  'e6000000-0000-0000-0000-00000000000a'::uuid, 'e6000000-0000-0000-0000-00000000000b',
  'e6000000-0000-0000-0000-00000000000c', 'e6000000-0000-0000-0000-00000000000d',
  'e6000000-0000-0000-0000-00000000000e'
]) u;

select public.recompute_assessment_results(replace(u::text, 'e6000000', 'e6010000')::uuid)
from unnest(array[
  'e6000000-0000-0000-0000-00000000000a'::uuid, 'e6000000-0000-0000-0000-00000000000b',
  'e6000000-0000-0000-0000-00000000000c', 'e6000000-0000-0000-0000-00000000000d',
  'e6000000-0000-0000-0000-00000000000e'
]) u;

-- Le mois écoulé, calculé comme le générateur le calcule.
create temporary table mois_interroge on commit drop as
select (date_trunc('month', now()) - interval '1 month')::date as debut;

-- Les engagements, par la clé naturelle du gabarit. Les heures sont écrites en heure de Paris.
update public.plan_actions pa
   set committed_at = v.choisie_le, intention_timing = d.echeance
  from public.plan_cycles pc, public.action_templates t, mois_interroge m,
       (values
         ('e6000000-0000-0000-0000-00000000000a'::uuid, 'le_mois_prochain', interval '14 days 12 hours'),
         ('e6000000-0000-0000-0000-00000000000b'::uuid, 'le_mois_prochain', interval '-1 month' + interval '14 days 12 hours'),
         ('e6000000-0000-0000-0000-00000000000c'::uuid, 'ce_mois', interval '14 days 12 hours'),
         ('e6000000-0000-0000-0000-00000000000d'::uuid, 'le_mois_prochain', interval '30 minutes'),
         ('e6000000-0000-0000-0000-00000000000e'::uuid, 'le_mois_prochain', interval '1 month 30 minutes')
       ) as d(utilisateur, echeance, decalage)
       cross join lateral (
         select (m.debut::timestamp + d.decalage) at time zone 'Europe/Paris' as choisie_le
       ) v
 where pc.id = pa.plan_cycle_id and t.id = pa.action_template_id
   and pc.user_id = d.utilisateur
   and t.action_text = 'Faire une sortie sur trois à vélo à assistance électrique';

-- La boucle cherche l'action du cycle qui couvre le mois écoulé : le cycle y est ramené, comme aux
-- fichiers 20 et 40, pour que le mois dernier y tombe quel que soit le jour où la suite tourne.
update public.plan_cycles set period_start = (select debut from mois_interroge)
 where user_id::text like 'e6000000%';

-- La prémisse se relit : sans elle, une assertion pourrait passer sur un engagement qui n'a pas eu
-- lieu, ou choisi un autre mois que celui qu'elle décrit. Le mois du choix y est lu en heure de
-- Paris, et rapporté au mois interrogé (-1 : le mois d'avant, 0 : le même, 1 : après).
select results_eq(
  $$ select pc.user_id::text, pa.intention_timing,
            (extract(year from age(date_trunc('month', pa.committed_at at time zone 'Europe/Paris'),
                                   (select debut from mois_interroge)::timestamp)) * 12
             + extract(month from age(date_trunc('month', pa.committed_at at time zone 'Europe/Paris'),
                                      (select debut from mois_interroge)::timestamp)))::int,
            date_trunc('month', pa.committed_at at time zone 'UTC')::date < (select debut from mois_interroge)
       from public.plan_actions pa join public.plan_cycles pc on pc.id = pa.plan_cycle_id
      where pc.user_id::text like 'e6000000%' and pa.committed_at is not null
      order by pc.user_id $$,
  $$ values ('e6000000-0000-0000-0000-00000000000a', 'le_mois_prochain'::text, 0, false),
            ('e6000000-0000-0000-0000-00000000000b', 'le_mois_prochain', -1, true),
            ('e6000000-0000-0000-0000-00000000000c', 'ce_mois', 0, false),
            ('e6000000-0000-0000-0000-00000000000d', 'le_mois_prochain', 0, true),
            ('e6000000-0000-0000-0000-00000000000e', 'le_mois_prochain', 1, false) $$,
  'prémisses : une action engagée chacun, l''échéance et le mois du choix voulus — D tombe en UTC le mois d''avant'
);

select public.generate_extras_checkins();

-- ── A : choisie pendant le mois interrogé, pour le suivant ───────────────────────────────

select results_eq(
  $$ select poste, question_kind, committed_action_text, committed_intention_timing
       from public.engagement_checkins
      where user_id = 'e6000000-0000-0000-0000-00000000000a' and loop_type = 'extras' $$,
  $$ values ('leisure'::text, 'generique'::text, null::text, null::text) $$,
  'A : le mois du choix, la question générique sur ses sorties, sans l''action'
);

select is(
  (select committed_question from public.engagement_checkins
    where user_id = 'e6000000-0000-0000-0000-00000000000a' and loop_type = 'extras'),
  (select public.checkin_question('extras', 'generique', 'leisure', null, debut, null, null)
     from mois_interroge),
  'A : et la question figée est la générique, celle d''un mois sans engagement'
);

-- ── B : le mois interrogé est celui qu'elle visait ───────────────────────────────────────

select results_eq(
  $$ select poste, question_kind, committed_action_text, committed_intention_timing
       from public.engagement_checkins
      where user_id = 'e6000000-0000-0000-0000-00000000000b' and loop_type = 'extras' $$,
  $$ values ('leisure'::text, 'occasion'::text,
             'Faire une sortie sur trois à vélo à assistance électrique'::text, 'le_mois_prochain'::text) $$,
  'B : le mois d''après le choix, l''action est interrogée'
);

-- ── C : « Ce mois-ci », le témoin de l'échéance ──────────────────────────────────────────

select results_eq(
  $$ select poste, question_kind, committed_action_text, committed_intention_timing
       from public.engagement_checkins
      where user_id = 'e6000000-0000-0000-0000-00000000000c' and loop_type = 'extras' $$,
  $$ values ('leisure'::text, 'occasion'::text,
             'Faire une sortie sur trois à vélo à assistance électrique'::text, 'ce_mois'::text) $$,
  'C : « Ce mois-ci » choisie le même mois est interrogée — la règle ne vise que « Le mois prochain »'
);

-- ── D : le fuseau ────────────────────────────────────────────────────────────────────────

select results_eq(
  $$ select question_kind, committed_action_text from public.engagement_checkins
      where user_id = 'e6000000-0000-0000-0000-00000000000d' and loop_type = 'extras' $$,
  $$ values ('generique'::text, null::text) $$,
  'D : choisie le 1er à 0 h 30 heure de Paris, elle l''est ce mois-là — même quand UTC dit le mois d''avant'
);

-- ── E : choisie après le mois interrogé ──────────────────────────────────────────────────

select results_eq(
  $$ select question_kind, committed_action_text from public.engagement_checkins
      where user_id = 'e6000000-0000-0000-0000-00000000000e' and loop_type = 'extras' $$,
  $$ values ('generique'::text, null::text) $$,
  'E : choisie après le mois interrogé, elle n''y est pas interrogée non plus'
);

select * from finish();
rollback;
