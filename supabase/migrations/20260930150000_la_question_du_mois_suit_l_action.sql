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
--   * qui reçoit une boucle reste décidé par `boucles_du_dernier_bilan`, sur le **dernier** bilan
--     (§12.21). Une action engagée l'a été sur un poste déclaré dans le bilan de son cycle, donc la
--     boucle existe dans le cas courant — mais pas si un bilan plus récent n'en ouvre plus : des
--     sorties engagées en novembre, puis un bilan « rarement » sans voyage le 1er décembre, et
--     l'action de novembre n'est pas interrogée. C'est la règle de §12.21, laissée telle quelle ;
--   * le mot de la veille ne lit que le trajet domicile-travail (`engagement_de_la_veille`, D5) ;
--   * aucune signature ne bouge, donc ni `database.types.ts` ni les privilèges ;
--   * **sauf une conséquence, décidée le même soir** : la série « deux fois de suite » se compte
--     désormais sur un même poste (plus bas, la vue d'analyse).
--
-- **Pas de recopie de la recherche.** Le poste suivi se demande à `action_engagee_de_la_periode`,
-- une fois par poste, et les deux réponses se départagent par `committed_at`, lu sur la ligne que la
-- fonction désigne (`plan_action_id`). Un cycle n'a qu'une action engagée (index unique partiel),
-- mais deux cycles peuvent couvrir le même mois — la cadence `rolling_quarter`, dormante, le permet,
-- et la fonction départage déjà ce cas pour un poste ; un ordre fixe entre les deux postes l'aurait
-- rompu. Recopier sa jointure ferait tomber le balayage du fichier 33.
--
-- **Ne rejouer après elle aucune migration qui réécrit ce générateur** — `20260930105923`,
-- `20260930092838`, `20260927210247`, `20260927210200`, `20260927191009` et celles du 12/09/2026 :
-- chacune ramènerait la question du mois sur le poste le plus lourd sans que rien ne le signale.
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
    -- L'action engagée décide d'abord (v1-27 §12.25). Si les deux postes en rendent une — deux
    -- cycles qui se chevauchent —, la plus récente gagne, comme la fonction le fait pour un poste.
    select coalesce(
      (select v.poste
         from (values ('leisure'::text), ('travel'::text)) as v(poste)
         cross join lateral public.action_engagee_de_la_periode(a.user_id, v.poste, v_period_start) e
         join public.plan_actions pa on pa.id = e.plan_action_id
        order by pa.committed_at desc
        limit 1),
      -- Sans action : qui sort rarement n'a déclaré, hors de son trajet, que ses voyages — c'est sur
      -- eux que porte la boucle, même quand le résiduel des sorties pèse plus lourd ;
      -- `boucles_du_dernier_bilan` garantit qu'il en a. Les autres : le poste le plus lourd.
      case when ans.leisure_frequency = 'rarely' then 'travel' else ar.extras_poste end
    ) as poste
  ) p
  cross join lateral (
    -- Le mode ne se dit que sur le poste le plus lourd, seul que le bilan fige — et jamais sur le
    -- résiduel des sorties rares. Un résultat sans `extras_poste` (la colonne l'admet, aucune ligne
    -- de production ne l'a) garde son libellé, comme avant.
    select
      p.poste,
      case
        when ar.extras_poste is null then ar.extras_poste_label
        when p.poste = ar.extras_poste and not (ans.leisure_frequency = 'rarely' and p.poste = 'leisure')
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

-- ── Le second renforcement se compte sur un même poste ──────────────────────────────────
--
-- **Décidé le 30/09/2026 par la personne qui pilote, sur un constat de la contre-lecture** : le point
-- du mois peut désormais changer de poste d'un mois sur l'autre (août sur les voyages sans action,
-- septembre sur une action de sorties), et la série « deux fois de suite » se comptait par boucle
-- alors que sa phrase nomme le poste du mois — « Deuxième mois de suite que tu sors autrement »
-- après un « oui » sur les voyages. La série ne compte plus que deux « oui » **sur le même poste** :
-- le signal marque le passage d'un geste à une habitude, et deux gestes différents n'en font pas
-- une. La boucle hebdomadaire n'a qu'un poste, donc rien n'y change. Jumelle client :
-- `estDeuxiemeFoisDeSuite` (`src/types/checkin.ts`), qui applique la même condition ; un point
-- mensuel sans `poste` (d'avant la colonne) n'apparie rien, des deux côtés.

create or replace view analytics.checkins_consecutifs as
with points as (
  select c.user_id, c.loop_type, c.period_start, c.response_kind, c.poste,
         public.periode_precedente(c.loop_type, c.period_start) as periode_precedente
  from public.engagement_checkins c
  where c.status = 'answered'
)
select
  s.zone_type,
  s.tc_access,
  s.dominant_poste,
  p.loop_type,
  count(*) filter (where p.response_kind = 'oui') as oui,
  count(*) filter (where p.response_kind = 'oui' and precedent.response_kind = 'oui') as oui_consecutifs
from points p
join analytics.user_segments s on s.user_id = p.user_id
left join points precedent
  on precedent.user_id = p.user_id
 and precedent.loop_type = p.loop_type
 and precedent.period_start = p.periode_precedente
 and (p.loop_type = 'commute' or precedent.poste = p.poste)
group by 1, 2, 3, 4;

-- Contrôles : `create or replace` garde les privilèges, et le corps installé est bien celui-ci.
do $$
begin
  if has_table_privilege('anon', 'analytics.checkins_consecutifs', 'select')
     or has_table_privilege('authenticated', 'analytics.checkins_consecutifs', 'select') then
    raise exception 'analytics.checkins_consecutifs est lisible par un client : le privilège a bougé';
  end if;
  if has_function_privilege('anon', 'public.generate_extras_checkins()', 'execute')
     or has_function_privilege('authenticated', 'public.generate_extras_checkins()', 'execute') then
    raise exception 'generate_extras_checkins est appelable par un client : le privilège a bougé';
  end if;
  if pg_get_functiondef('public.generate_extras_checkins()'::regprocedure)
     not like '%action_engagee_de_la_periode(a.user_id, v.poste, v_period_start)%' then
    raise exception 'generate_extras_checkins ne suit pas l''action engagée : le corps installé n''est pas celui de cette migration';
  end if;
end;
$$;
