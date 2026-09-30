-- La question du mois suit l'action engagée (`v1-27` §12.25, décidé le 30/09/2026).
--
-- **Le défaut.** La boucle mensuelle interroge un seul poste — le plus lourd des sorties et des
-- voyages, les voyages pour qui sort rarement — et ne cherche l'action engagée que sur ce poste-là.
-- Quelqu'un dont les voyages pèsent plus et qui s'engage sur ses sorties (ou l'inverse) n'était donc
-- jamais interrogé sur son action, alors que la feuille ouverte après « C'est noté » lui promet
-- « Au début du mois prochain, je reviens te demander si tu l'as faite » et que la carte du premier
-- plan dit qu'« un point régulier te demandera si tu l'as faite ». Il recevait à la place la
-- question générique sur l'autre poste : un résumé du mois, qui ne referme rien. Aucun compte de
-- production n'y était le jour de la décision ; le profil de la recette web y était.
--
-- **La règle.** Quand une action est engagée sur les sorties ou sur les voyages, dans le cycle qui
-- couvre le mois interrogé, le point du mois porte sur ce poste-là. Sinon rien ne change : le poste
-- le plus lourd, ou les voyages pour qui sort rarement (`20260927191009`). Trois choses suivent le
-- poste ensemble, comme en septembre pour les sorties rares : la question (par
-- `action_engagee_de_la_periode`, qui reçoit le poste et ne le choisit pas — `v1-27` §5), la colonne
-- `poste` du point (d'où le troisième choix « Pas de sortie en … » et la réplique de Ramille), et
-- le libellé figé.
--
-- **Le libellé ne porte un mode que sur le poste le plus lourd**, le seul dont le bilan fige le
-- libellé (`extras_poste_label`, « Voyages longue distance (Avion long-courrier) ») ; tout autre
-- poste se nomme sans mode, comme le fait déjà la bascule des sorties rares. Le libellé du résiduel
-- (« Loisirs du week-end (occasionnels) ») n'est jamais repris : il décrit des sorties que la
-- personne a dit ne presque jamais faire.
--
-- **Ce qui ne change pas, et pourquoi** :
--   * la règle des sorties rares (27/09/2026) vise la question **générique** posée sur le résiduel.
--     Une action de loisirs engagée n'existe pas pour ce profil — `estimate_action_savings` refuse
--     les gabarits de loisirs sur des sorties rares —, sauf au changement de saison : une action
--     engagée en novembre, puis un nouveau bilan « rarement » le 1er décembre avant 6 h. La question
--     porte alors sur l'action de novembre, qui était bien la sienne en novembre ;
--   * qui reçoit une boucle reste décidé par `boucles_du_dernier_bilan` : une action engagée sur un
--     poste l'a été sur un poste déclaré, donc la boucle mensuelle existe ;
--   * le mot de la veille ne lit que le trajet domicile-travail (`engagement_de_la_veille`, D5) ;
--   * aucune signature ne bouge, donc ni `database.types.ts` ni les privilèges.
--
-- **Pas de recopie de la recherche.** Le poste suivi se demande à `action_engagee_de_la_periode`,
-- une fois par poste : une seule action est engagée par cycle (index unique partiel), donc l'ordre
-- des deux appels ne départage jamais rien. Recopier sa jointure ferait tomber le balayage du
-- fichier 33.
--
-- **Réécrite depuis `pg_get_functiondef` du distant** (SUPABASE.md §1.5), le 30/09/2026, après
-- `20260930105923` qui l'avait réécrite en dernier.

create or replace function public.generate_extras_checkins()
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_period_start date := (date_trunc('month', now()) - interval '1 month')::date;
  v_period_label text := public.mois_francais(v_period_start)
    || ' ' || extract(year from v_period_start)::text;
begin
  update public.engagement_checkins
  set status = 'expired'
  where loop_type = 'extras' and status = 'pending' and period_start < v_period_start;

  insert into public.engagement_checkins (
    user_id, loop_type, period_start, period_label, trip_label, poste, question_kind,
    committed_action_text, committed_intention_days, committed_intention_timing, committed_question
  )
  select
    a.user_id, 'extras', v_period_start, v_period_label, b.libelle, b.poste,
    g.genre,
    eng.action_text, eng.intention_days, eng.intention_timing,
    public.checkin_question('extras', g.genre, b.poste, null, v_period_start,
                            eng.question_template, eng.intention_days)
  -- Qui reçoit la boucle, et depuis quel bilan : décidé en un seul endroit, que l'écran du plan lit
  -- aussi — la base déclarée (`a_des_voyages_declares`) comprise (30/09/2026).
  from public.boucles_du_dernier_bilan() o
  join public.assessments a on a.id = o.assessment_id
  join public.assessment_results ar on ar.assessment_id = a.id
  join public.assessment_answers ans on ans.assessment_id = a.id
  cross join lateral (
    -- L'action engagée décide d'abord (v1-27 §12.25) : une seule par cycle, donc au plus un de ces
    -- deux appels rend une ligne.
    select coalesce(
      (select 'leisure'::text from public.action_engagee_de_la_periode(a.user_id, 'leisure', v_period_start)),
      (select 'travel'::text from public.action_engagee_de_la_periode(a.user_id, 'travel', v_period_start)),
      -- Sans action : qui sort rarement n'a déclaré, hors de son trajet, que ses voyages — c'est sur
      -- eux que porte la boucle, même quand le résiduel des sorties pèse plus lourd ;
      -- `boucles_du_dernier_bilan` garantit qu'il en a. Les autres : le poste le plus lourd.
      case when ans.leisure_frequency = 'rarely' then 'travel' else ar.extras_poste end
    ) as poste
  ) p
  cross join lateral (
    -- Le mode ne se dit que sur le poste le plus lourd, seul que le bilan fige — et jamais sur le
    -- résiduel des sorties rares. `is not distinct from` : un résultat sans `extras_poste` (la
    -- colonne l'admet, aucune ligne de production ne l'a) garde son libellé, comme avant.
    select
      p.poste,
      case
        when p.poste is not distinct from ar.extras_poste
             and not (ans.leisure_frequency = 'rarely' and p.poste = 'leisure')
          then ar.extras_poste_label
        when p.poste = 'leisure' then 'Loisirs du week-end'
        else 'Voyages longue distance'
      end as libelle
  ) b
  -- L'action engagée est cherchée sur le poste DE LA BOUCLE, celui que `b` vient de choisir. La
  -- fonction reçoit ce poste, elle ne le choisit pas (v1-27 §5).
  left join lateral public.action_engagee_de_la_periode(a.user_id, b.poste, v_period_start) eng
    on true
  cross join lateral (
    -- Pas de `maintien` ici : la catégorie vélo/marche ne qualifie que le trajet quotidien.
    select case when eng.question_template is not null then 'occasion' else 'generique' end as genre
  ) g
  where o.loop_type = 'extras'
  on conflict (user_id, loop_type, period_start) do nothing;

  perform public.enqueue_checkin_reminders();
end;
$function$;

-- Contrôles : `create or replace` garde les privilèges, et le corps installé est bien celui-ci.
do $$
begin
  if has_function_privilege('anon', 'public.generate_extras_checkins()', 'execute')
     or has_function_privilege('authenticated', 'public.generate_extras_checkins()', 'execute') then
    raise exception 'generate_extras_checkins est appelable par un client : le privilège a bougé';
  end if;
  if pg_get_functiondef('public.generate_extras_checkins()'::regprocedure)
     not like '%action_engagee_de_la_periode(a.user_id, ''leisure'', v_period_start)%' then
    raise exception 'generate_extras_checkins ne suit pas l''action engagée : le corps installé n''est pas celui de cette migration';
  end if;
end;
$$;
