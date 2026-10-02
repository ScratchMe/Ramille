-- Tests pgTAP : la quatrième fréquence des loisirs, « Deux ou trois fois par mois » (`v1-33` D5,
-- migration `20261002201852_la_quatrieme_frequence_des_loisirs.sql`).
--
-- **Deux profils, aux réponses identiques sauf la fréquence** : P sort deux ou trois fois par mois,
-- Q une fois par semaine — en voiture, 15 à 30 km, sans trajet domicile-travail ni voyage. Q est le
-- témoin : ce que P doit faire se lit **par rapport à lui**, jamais contre un chiffre recopié, donc
-- une retouche du référentiel des facteurs ne touche pas ce fichier (`TESTING-PGTAP.md` §2.2).
--
-- **Ce que chaque assertion garde** :
--   - la distance de P vaut 0,6 fois celle de Q — la valeur de la réponse ;
--   - P est une sortie **déclarée**, pas le résiduel de « rarement » : son mode est nommé, sans
--     « (occasionnels) », et son plan propose des actions de loisirs ;
--   - P reçoit la boucle mensuelle sans avoir déclaré de voyage — le filtre de
--     `boucles_du_dernier_bilan` ne laisse passer sans voyage que ce qui n'est pas « rarement » —, et
--     son point du mois porte sur ses sorties ;
--   - **chaque** fréquence que la contrainte admet rend une distance, par le calcul lui-même : le
--     `case` du calcul n'a pas de `else`, donc une valeur admise sans sa branche rend une distance
--     nulle, un total NULL que la colonne refuse, et un calcul qui lève — chaque bilan portant cette
--     réponse échouerait à la soumission. La liste est lue dans la contrainte, jamais recopiée ici ;
--   - une valeur que la contrainte n'admet pas est refusée.
--
-- **Éprouvé en le cassant, le 02/10/2026** (TESTING.md §1.1), huit mutations, une à la fois sur la
-- stack locale, **la suite pgTAP entière** rejouée à chaque fois, la fonction restaurée après :
--   - la branche du calcul retirée, le `check` élargi → « chaque fréquence admise », puis le fichier
--     tombe au calcul de P (8 sur 9) : le total NULL est refusé par la colonne. C'est pour nommer
--     cette cause avant la chute que la boucle sur les fréquences passe en premier ;
--   - 0,5 au lieu de 0,6 → « 0,6 fois une sortie par semaine », seul ;
--   - la valeur de « rarement » donnée à la nouvelle réponse → la même, seule ;
--   - « (occasionnels) » ajouté au libellé du poste dominant → « les deux libellés », seul. La
--     première écriture ne comparait que `extras_poste_label`, et cette mutation passait : c'est
--     elle qui a fait ajouter `dominant_poste_label` ;
--   - le mode du poste dominant retiré comme pour le résiduel → la même, seule ;
--   - la boucle mensuelle refusée sans voyage → « la boucle mensuelle », seul ;
--   - l'estimateur refusant les gabarits de loisirs → « le plan de P », seul.
--   - le point du mois basculé sur les voyages comme pour « rarement » (`generate_extras_checkins`)
--     → « le point du mois de P », seul. Ajoutée sur un constat de la contre-lecture : sans cette
--     assertion, la mutation passait la suite entière, aucun autre fichier n'utilisant la valeur.
-- Le contrôle de la migration a été joué de même : la branche retirée, il lève
-- « la fréquence multiple_monthly est admise mais le calcul ne lui donne aucune branche ».
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

-- ── Fixtures ─────────────────────────────────────────────────────────────────────────────

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, is_anonymous, created_at, updated_at)
select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'pgtap-frequence-' || right(u::text, 1) || '@test.local', 'x', now(), false, now(), now()
from unnest(array[
  'e5000000-0000-0000-0000-00000000000a'::uuid,  -- P : deux ou trois fois par mois
  'e5000000-0000-0000-0000-00000000000b',        -- Q : une fois par semaine, le témoin
  'e5000000-0000-0000-0000-00000000000c'         -- S : chaque fréquence admise, tour à tour
]) u;

insert into public.assessments (id, user_id, status, submitted_at)
select replace(u::text, 'e5000000', 'e5010000')::uuid, u, 'completed', now()
from unnest(array[
  'e5000000-0000-0000-0000-00000000000a'::uuid, 'e5000000-0000-0000-0000-00000000000b',
  'e5000000-0000-0000-0000-00000000000c'
]) u;

insert into public.assessment_answers (assessment_id, commute_has_regular_trip, leisure_frequency,
  leisure_mode, leisure_distance_bracket, leisure_car_engine, household_vehicles, zone_type, tc_access)
values
  ('e5010000-0000-0000-0000-00000000000a', false, 'multiple_monthly', 'voiture', '15_30', 'thermique',
   '1', 'periurbain', 'bon'),
  ('e5010000-0000-0000-0000-00000000000b', false, 'weekly', 'voiture', '15_30', 'thermique',
   '1', 'periurbain', 'bon'),
  ('e5010000-0000-0000-0000-00000000000c', false, 'weekly', 'voiture', '15_30', 'thermique',
   '1', 'periurbain', 'bon');

-- ── Chaque fréquence admise a sa branche dans le calcul ─────────────────────────────────
-- En premier : sans branche, le calcul de P lèverait plus bas et ferait tomber le fichier avant
-- toute assertion, donc avant celle qui nomme la cause.

create temporary table distances_par_frequence (frequence text, km numeric) on commit drop;

do $$
declare
  v_valeur text;
begin
  for v_valeur in
    select (regexp_matches(pg_get_constraintdef(oid), '''([a-z_]+)''', 'g'))[1]
      from pg_constraint
     where conrelid = 'public.assessment_answers'::regclass
       and conname = 'assessment_answers_leisure_frequency_check'
  loop
    update public.assessment_answers set leisure_frequency = v_valeur
     where assessment_id = 'e5010000-0000-0000-0000-00000000000c';
    begin
      perform public.recompute_assessment_results('e5010000-0000-0000-0000-00000000000c');
      insert into distances_par_frequence
      select v_valeur, leisure_km_year from public.assessment_results
       where assessment_id = 'e5010000-0000-0000-0000-00000000000c';
    exception when others then
      -- Sans branche, le total est NULL et la colonne le refuse : le calcul lève. L'échec est noté
      -- plutôt que propagé, pour que l'assertion nomme la fréquence au lieu de faire tomber le fichier.
      insert into distances_par_frequence values (v_valeur, null);
    end;
  end loop;
end
$$;

select is(
  (select count(*)::int from distances_par_frequence),
  4,
  'prémisse : les quatre fréquences admises ont été jouées'
);

select is(
  (select string_agg(frequence, ', ' order by frequence) from distances_par_frequence
    where km is null or km <= 0),
  null,
  'chaque fréquence admise rend une distance de loisirs : aucune n''est sans branche dans le calcul'
);

-- ── Ce que vaut la réponse ───────────────────────────────────────────────────────────────

select public.recompute_assessment_results(a)
from unnest(array[
  'e5010000-0000-0000-0000-00000000000a'::uuid, 'e5010000-0000-0000-0000-00000000000b'
]) a;

select is(
  (select leisure_km_year from public.assessment_results
    where assessment_id = 'e5010000-0000-0000-0000-00000000000a'),
  (select leisure_km_year * 0.6 from public.assessment_results
    where assessment_id = 'e5010000-0000-0000-0000-00000000000b'),
  'deux ou trois sorties par mois valent 0,6 fois une sortie par semaine'
);

select ok(
  (select leisure_km_year > 0 from public.assessment_results
    where assessment_id = 'e5010000-0000-0000-0000-00000000000b'),
  'prémisse : le témoin a des loisirs, donc le rapport ci-dessus n''est pas 0 = 0'
);

-- ── Une sortie déclarée, pas le résiduel de « rarement » ────────────────────────────────

select results_eq(
  $$ select dominant_poste, dominant_poste_mode, dominant_poste_label, extras_poste_label
       from public.assessment_results
      where assessment_id = 'e5010000-0000-0000-0000-00000000000a' $$,
  $$ select dominant_poste, dominant_poste_mode, dominant_poste_label, extras_poste_label
       from public.assessment_results
      where assessment_id = 'e5010000-0000-0000-0000-00000000000b' $$,
  'le poste, le mode et les deux libellés de P sont ceux du témoin : ses sorties sont nommées, sans « (occasionnels) »'
);

select ok(
  exists (
    select 1
      from public.plan_actions pa
      join public.plan_cycles pc on pc.id = pa.plan_cycle_id
      join public.action_templates t on t.id = pa.action_template_id
     where pc.user_id = 'e5000000-0000-0000-0000-00000000000a' and t.poste = 'leisure'
  ),
  'le plan de P propose des actions sur ses sorties, que l''estimateur refuse au résiduel'
);

select results_eq(
  $$ select loop_type from public.boucles_du_dernier_bilan('e5000000-0000-0000-0000-00000000000a') $$,
  $$ values ('extras'::text) $$,
  'P reçoit la boucle mensuelle sans avoir déclaré de voyage, comme une sortie chaque semaine'
);

-- Et le point du mois porte sur ses sorties : le générateur choisit le poste à part de
-- `boucles_du_dernier_bilan`, et ne bascule sur les voyages que pour « rarement » (constat de la
-- contre-lecture du 02/10/2026 — la boucle seule ne disait pas sur quoi elle interroge). La
-- question est générique : P n'a engagé aucune action, donc le poste vient du choix par défaut.
select public.generate_extras_checkins();

select results_eq(
  $$ select poste, question_kind from public.engagement_checkins
      where user_id = 'e5000000-0000-0000-0000-00000000000a' and loop_type = 'extras' $$,
  $$ values ('leisure'::text, 'generique'::text) $$,
  'le point du mois de P porte sur ses sorties, pas sur des voyages qu''il n''a pas déclarés'
);

-- ── Une valeur hors de la liste est refusée ─────────────────────────────────────────────

select throws_ok(
  $$ update public.assessment_answers set leisure_frequency = 'monthly'
      where assessment_id = 'e5010000-0000-0000-0000-00000000000c' $$,
  '23514',
  null,
  'une fréquence que la contrainte n''admet pas est refusée'
);

select * from finish();
rollback;
