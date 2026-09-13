-- C4.6 — Toutes les pistes, une seule engagée, et un premier pas
--
-- Trois choses, et deux d'entre elles étaient déjà décidées depuis l'increment 6 sans être livrées.
--
-- 1. **`generate_plan_cycle_for_user` ne fige plus que deux actions.** Le `limit 2` n'était pas un
--    choix de calcul mais un choix d'écran, posé dans le SQL : l'estimateur rend déjà **toutes** les
--    actions dont le gain atteint 5 kg/an, triées, et le plan en jetait le reste avant même de
--    l'écrire. L'autonomie de la personne s'exerçait donc sur deux leviers, les autres restant
--    invisibles (constat A13-18, arbitrage D18 du 10/09/2026 : oui, deux en avant, les suivantes
--    dépliables). Le `rank` existe depuis l'increment 6 précisément pour ça.
--
-- 2. **`first_step` sur `action_templates`, recopié sur `plan_actions`.** La carte d'action porte un
--    titre, un gain et un détail chiffré ; rien n'abaisse le coût de la première fois (A13-19). Une
--    ligne par gabarit, sans chiffre, qui décrit un **essai** et non une prescription — la page
--    `/conditions` affirme que Ramille ne fournit ni conseil professionnel ni prestation de conseil
--    en mobilité, et une ligne qui dirait quoi faire de ses déplacements sortirait de ce cadre.
--    Recopiée sur `plan_actions` pour la même raison que `saving_kg_year` : ce que la personne a lu
--    en s'engageant ne doit pas changer sous ses yeux si le libellé du gabarit est reformulé.
--
-- 3. **`commit_plan_action` gagne `p_replace`.** La fonction libère et archive déjà l'engagement
--    précédent (C2.2), sans condition : le geste le plus irréversible du produit — effacer le seul
--    choix personnel qu'il demande — se déclenchait donc en silence depuis n'importe quel appel.
--    Le drapeau le rend explicite au point d'appel, et son défaut `false` **refuse** au lieu de
--    remplacer. C'est ce que `v1-14` §4.4 décrit, et c'est la seule sémantique qui rende le paramètre
--    utile : à `true` il ne fait rien de neuf.
--
-- Ce que cette migration ne fait **pas** : la norme dynamique de l'arbitrage D16 (constat A13-20).
-- Une norme dynamique est une affirmation sur un comportement collectif, et la règle du dépôt est
-- qu'une affirmation sur le monde est sourcée ou signalée comme dérivation. La mettre dans la voix
-- de Ramille en retire le **nombre**, pas l'affirmation : « de plus en plus de gens changent un
-- trajet » sans source serait la première assertion non sourcée du produit, et le tableau des
-- arbitrages de `v1-13` rattache d'ailleurs D16 à C4.7. Reportée telle quelle.

-- ── 1. Le premier pas, sur le gabarit ──────────────────────────────────────────────────────

alter table public.action_templates
  add column if not exists first_step text;

comment on column public.action_templates.first_step is
  'Le premier pas : une ligne sans chiffre qui décrit un essai à faire avant la première fois, jamais une prescription (cf. /conditions). Affichée uniquement une fois l''action engagée. Recopiée sur plan_actions.first_step à la génération du cycle.';

-- **Appariés par `action_text` et jamais par identifiant** : `action_templates.id` vaut
-- `gen_random_uuid()`, donc les douze gabarits portent des identifiants différents sur chaque base
-- construite depuis `supabase/migrations/`. C'est le défaut qui a fait tomber la CI en livrant C2.1,
-- et les douze libellés sont insérés littéralement par `20260905130000`. Le contrôle en fin de
-- section est ce qui rend l'appariement par texte sûr — pas la relecture.
update public.action_templates set first_step = case action_text
  when 'Faire ce trajet à deux au moins un jour sur deux'
    then 'Demande autour de toi qui fait le même trajet, avant de choisir un jour.'
  when 'Faire un de tes longs trajets en train plutôt qu''en voiture'
    then 'Regarde les horaires d''un trajet que tu dois déjà faire.'
  when 'Faire un trajet sur cinq à pied'
    then 'Fais-le une fois un jour où tu n''es pas pressé.'
  when 'Faire un trajet sur cinq à vélo'
    then 'Repère un itinéraire cyclable avant ton premier jour.'
  when 'Faire une sortie sur trois à vélo'
    then 'Repère une sortie proche, accessible sans voiture.'
  when 'Garder une journée de télétravail par semaine'
    then 'Bloque ce jour-là dans ton agenda, dès maintenant.'
  when 'Passer deux trajets sur cinq en métro ou en tram'
    then 'Fais le trajet une fois en métro, un jour sans horaire serré.'
  when 'Passer deux trajets sur cinq en train ou en RER'
    then 'Vérifie l''horaire qui te convient, puis essaie-le une fois.'
  when 'Prendre les transports en commun pour deux sorties sur cinq'
    then 'Repère la ligne qui dessert ta sortie habituelle.'
  when 'Regrouper deux sorties en une seule, une fois sur cinq'
    then 'Note tes deux prochaines sorties et vois si elles tiennent le même jour.'
  when 'Remplacer un aller-retour en avion par le train'
    then 'Compare les horaires en train sur le voyage que tu prévois.'
  when 'Renoncer à un vol long-courrier cette année'
    then 'Note les dates que tu gardes libres, avant de réserver.'
  else first_step
end;

do $controle$
declare
  v_sans integer;
  v_chiffres integer;
begin
  select count(*) into v_sans from public.action_templates where first_step is null;
  if v_sans > 0 then
    raise exception 'C4.6 : % gabarit(s) sans premier pas — l''appariement par action_text a échoué.', v_sans;
  end if;

  -- La règle est la même que pour la voix de Ramille : un premier pas ne chiffre rien. Le gain est
  -- juste au-dessus sur la carte, et un second nombre à cet endroit se lirait comme une consigne.
  select count(*) into v_chiffres from public.action_templates where first_step ~ '[0-9]';
  if v_chiffres > 0 then
    raise exception 'C4.6 : % premier(s) pas contient un chiffre.', v_chiffres;
  end if;
end
$controle$;

-- ── 2. Le premier pas, figé sur l'action du cycle ──────────────────────────────────────────

alter table public.plan_actions
  add column if not exists first_step text;

comment on column public.plan_actions.first_step is
  'Le premier pas du gabarit, figé à la génération du cycle — même raison que saving_kg_year : ce que la personne a lu en s''engageant ne change pas sous ses yeux si le gabarit est reformulé.';

-- ── 3. Toutes les actions, et leur premier pas ─────────────────────────────────────────────

-- **Substitution vérifiée** : `generate_plan_cycle_for_user` fait deux cents lignes et n'a rien à
-- voir avec ce chantier au-delà de cet `insert`. On lit le corps **installé** — jamais le fichier
-- qui l'a créé, leçon de C2.2 : deux chantiers y ont ajouté des gardes depuis, et repartir de la
-- migration d'origine les supprimerait en silence. L'ancre ne contient aucune ligne de commentaire,
-- le distant ayant perdu ceux du dépôt.
do $substitution$
declare
  v_def text;
  v_ancre text;
  v_neuf text;
  v_occurrences integer;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'generate_plan_cycle_for_user';

  if v_def is null then
    raise exception 'C4.6 : generate_plan_cycle_for_user est introuvable.';
  end if;

  v_ancre := '    e.detail_text,
    row_number() over (order by (e.poste = rec.dominant_poste) desc, e.saving_kg_year desc)
  from public.estimate_action_savings(rec.assessment_id) e
  order by (e.poste = rec.dominant_poste) desc, e.saving_kg_year desc
  limit 2;';

  v_neuf := '    e.detail_text,
    row_number() over (order by (e.poste = rec.dominant_poste) desc, e.saving_kg_year desc),
    tpl.first_step
  from public.estimate_action_savings(rec.assessment_id) e
  join public.action_templates tpl on tpl.id = e.action_template_id
  order by (e.poste = rec.dominant_poste) desc, e.saving_kg_year desc;';

  v_occurrences := (length(v_def) - length(replace(v_def, v_ancre, ''))) / length(v_ancre);

  -- **Une substitution vérifiée est à un coup, donc elle doit reconnaître « déjà appliquée »** — et
  -- les deux causes de zéro occurrence se distinguent par la **présence du remplacement**, jamais
  -- par la seule absence de l'ancre. Une migration doit se rejouer telle quelle après une
  -- restauration.
  if v_occurrences = 0 then
    if position('join public.action_templates tpl on tpl.id = e.action_template_id' in v_def) > 0 then
      return;
    end if;
    raise exception 'C4.6 : ni l''ancre ni le remplacement ne sont dans generate_plan_cycle_for_user.';
  elsif v_occurrences > 1 then
    raise exception 'C4.6 : % occurrences de l''ancre au lieu d''une seule.', v_occurrences;
  end if;

  v_def := replace(v_def, v_ancre, v_neuf);
  v_def := replace(
    v_def,
    'plan_cycle_id, action_template_id, saving_kg_year, saving_share_percent, detail_text, rank',
    'plan_cycle_id, action_template_id, saving_kg_year, saving_share_percent, detail_text, rank, first_step'
  );

  execute v_def;
end
$substitution$;

-- ── 4. Remplacer une action est un geste explicite ─────────────────────────────────────────

-- La signature change, elle ne s'ajoute pas : deux surcharges que PostgREST devrait départager sur
-- un appel à trois arguments seraient ambiguës, et l'ancienne forme n'a plus d'appelant. Même
-- raisonnement que `repondre_au_checkin` en C2.4 — qui ne tient que parce que l'app n'est pas encore
-- publiée sur Play.
drop function if exists public.commit_plan_action(uuid, smallint[], text);

create or replace function public.commit_plan_action(
  p_plan_action_id uuid,
  p_days smallint[] default null,
  p_timing text default null,
  p_replace boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle_id uuid;
  v_poste text;
  v_forme_attendue text;
  v_precedent uuid;
begin
  select pc.id, tpl.poste into v_cycle_id, v_poste
  from public.plan_actions pa
  join public.plan_cycles pc on pc.id = pa.plan_cycle_id
  join public.action_templates tpl on tpl.id = pa.action_template_id
  where pa.id = p_plan_action_id and pc.user_id = auth.uid();

  if v_cycle_id is null then
    raise exception 'Action introuvable.' using errcode = 'no_data_found';
  end if;

  v_forme_attendue := case when coalesce(v_poste, '') = 'commute' then 'des jours de la semaine' else 'une échéance' end;

  if (p_days is not null) = (p_timing is not null) then
    raise exception 'Une intention et une seule est attendue pour cette action : %.', v_forme_attendue
      using errcode = 'invalid_parameter_value';
  end if;

  if (coalesce(v_poste, '') = 'commute') <> (p_days is not null) then
    raise exception 'Cette action attend %.', v_forme_attendue
      using errcode = 'invalid_parameter_value';
  end if;

  select id into v_precedent
  from public.plan_actions
  where plan_cycle_id = v_cycle_id and committed_at is not null and id <> p_plan_action_id;

  if v_precedent is not null then
    -- **Le refus est le défaut, et c'est tout l'apport de C4.6 ici.** Libérer l'engagement
    -- précédent efface `committed_at`, les jours et l'échéance — le seul choix personnel que le
    -- produit demande — et l'archive de C2.2 en garde la trace mais ne le rend pas. Un appel qui
    -- ne dit pas qu'il remplace ne remplace donc pas : l'écran qui propose « Choisir celle-ci à la
    -- place » le dit, un appel écrit par inadvertance ne le dira pas.
    --
    -- Le SQLSTATE est réservé aux conditions définies par l'utilisateur (classe R) : le client
    -- l'utilise pour recharger le plan plutôt que pour parler de réseau — ce refus veut presque
    -- toujours dire que l'état a changé depuis l'affichage.
    if not p_replace then
      raise exception 'Une autre action est déjà engagée sur cette période.'
        using errcode = 'RM001';
    end if;

    perform public.archiver_engagement_de_laction(v_precedent, 'changement');

    update public.plan_actions
    set committed_at = null, intention_days = null, intention_timing = null, carried_over_from = null
    where id = v_precedent;
  end if;

  update public.plan_actions
  set committed_at = now(),
      intention_days = p_days,
      intention_timing = p_timing
  where id = p_plan_action_id;
end;
$$;

comment on function public.commit_plan_action(uuid, smallint[], text, boolean) is
  'Engage une action du cycle. p_replace doit valoir true pour remplacer un engagement existant : à false, la fonction refuse (SQLSTATE RM001) plutôt que d''effacer en silence le seul choix personnel que le produit demande.';

-- **`revoke ... from public` ne suffit pas ici, et le contrôle ci-dessous l'a prouvé.** PostgreSQL
-- accorde `EXECUTE` à PUBLIC à la création (leçon de `purge_usage_events`), mais Supabase ajoute des
-- **privilèges par défaut** sur le schéma `public` qui accordent `EXECUTE` directement à `anon` et à
-- `authenticated` : retirer PUBLIC laisse donc ces deux grants nominatifs intacts. Il faut nommer les
-- trois.
--
-- `anon` est le rôle d'une requête **sans jeton** — une session anonyme, elle, porte le rôle
-- `authenticated` — donc cette fonction ne lui sert à rien : `auth.uid()` y est nul et elle ne
-- trouverait aucune action. Le retirer suit la doctrine de `20260910110000_grants_explicites.sql` :
-- un privilège se justifie par un appel réel depuis `src/`.
revoke all on function public.commit_plan_action(uuid, smallint[], text, boolean)
  from public, anon, authenticated;
grant execute on function public.commit_plan_action(uuid, smallint[], text, boolean) to authenticated;

-- Sa jumelle reçoit le même traitement, pour que la paire ne se lise pas comme deux décisions
-- différentes : « Changer d'avis » n'est atteignable que depuis une session, comme l'engagement. Une
-- asymétrie ici inviterait à « corriger » celle des deux qui paraît trop stricte.
revoke all on function public.clear_plan_action_commitment(uuid) from public, anon, authenticated;
grant execute on function public.clear_plan_action_commitment(uuid) to authenticated;

do $controle$
begin
  -- Le `grant` ci-dessus est ce qui rend la fonction appelable ; le `revoke` du PUBLIC de sa
  -- création est ce qui empêche `anon` de l'atteindre. Les deux se vérifient plutôt que de se
  -- supposer : un `drop`/`create` repart des privilèges par défaut.
  if not has_function_privilege('authenticated', 'public.commit_plan_action(uuid, smallint[], text, boolean)', 'execute') then
    raise exception 'C4.6 : commit_plan_action n''est pas appelable par authenticated.';
  end if;
  if has_function_privilege('anon', 'public.commit_plan_action(uuid, smallint[], text, boolean)', 'execute') then
    raise exception 'C4.6 : commit_plan_action est appelable par anon.';
  end if;
  if not has_function_privilege('authenticated', 'public.clear_plan_action_commitment(uuid)', 'execute') then
    raise exception 'C4.6 : clear_plan_action_commitment n''est plus appelable par authenticated.';
  end if;
  if has_function_privilege('anon', 'public.clear_plan_action_commitment(uuid)', 'execute') then
    raise exception 'C4.6 : clear_plan_action_commitment est appelable par anon.';
  end if;
end
$controle$;
