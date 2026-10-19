-- Les budgets du jour : ce que la base reçoit d'événements d'usage, et ce que coûte une correction du
-- contexte.
--
-- **Avant de l'appliquer au distant : une sauvegarde manuelle** (workflow « Sauvegarde de la base »
-- lancé à la main, attendre le vert), parce qu'elle réécrit `purge_usage_events()` (`sauvegarde.md` §6).
--
-- 1. **Un compte de plus de vingt-quatre heures écrivait sans plafond de tout le projet.** Le plafond
--    horaire (6 000 événements, dont 300 pannes) ne visait que les comptes nés depuis moins d'un jour ;
--    au-delà, seuls les 500 événements par jour et par compte bornaient l'écriture. Mesuré sur la
--    stack locale : un événement pèse 173 octets, table et index compris, avec les propriétés que
--    l'app envoie, et 675 au maximum de `check_usage_event_props` — 500 par jour et par compte, c'est
--    environ 340 Ko, et 1 500 sessions anonymes vieillies de deux jours suffisaient à passer les
--    500 Mo du plan gratuit en une journée, ce qui met la base en lecture seule pour tout le monde.
--
-- 2. **Le jour du lancement, le plafond horaire coupait l'entonnoir.** Tous les visiteurs ont alors
--    moins de vingt-quatre heures, et au-delà de 6 000 événements dans l'heure — 120 arrivées à
--    cinquante événements — les suivantes étaient refusées, leur ouverture comprise.
--
--    D'où trois budgets pour tout le projet, sur les vingt-quatre dernières heures et quel que soit
--    l'âge du compte, comptés dans une table d'une ligne par heure plutôt qu'en relisant les
--    événements : compter cent mille lignes par l'index de `occurred_at` coûte 14 ms (mesuré), et le
--    faire à chaque insertion ferait du plafond lui-même la façon d'occuper la base.
--      - 50 000 événements des comptes nés depuis moins de vingt-quatre heures : un millier
--        d'arrivées au rythme du parcours réel (51 événements au plus pour un compte, deux bilans, un
--        re-bilan et un retrait compris). Il n'y a plus de plafond horaire : un pic se mesure en
--        heures, et c'est ce budget qui le borne ;
--      - 25 000 événements des autres comptes : deux mille personnes qui reviennent, à une dizaine
--        d'événements par jour. Un flot de sessions neuves ne leur prend rien, et l'inverse ;
--      - 2 500 pannes (`app_error`), à part : un flot d'autres événements ne les étouffe pas, et
--        inversement.
--    Au pire, 77 500 événements de 675 octets : 52 Mo par jour, soit cinq jours avant l'alerte des
--    300 Mo et neuf avant les 500, depuis les 18 Mo de la production. Le compteur, lui, ne garde que
--    deux jours : la purge quotidienne des événements retire ses tranches plus anciennes.
--
--    **Le premier `app_open` d'un compte en vingt-quatre heures passe toujours ces budgets** : c'est le
--    signe de vie que lisent le régime des rappels et la purge, et le dénominateur de l'entonnoir d'une
--    cohorte. Un flot ne doit coûter ni l'un ni l'autre aux vrais comptes. Il coûte une ligne par compte
--    et par jour, et les comptes se créent derrière un captcha.
--
--    Et par compte, sur vingt-quatre heures glissantes : 200 événements — quatre fois le parcours réel
--    le plus chargé — et 50 pannes à part (la file d'attente de l'app en garde vingt).
--
-- 3. **`mettre_a_jour_le_contexte` n'avait aucun plafond.** Chaque correction qui change quelque chose
--    recalcule le bilan et reconstruit le plan (une dizaine de lignes de `plan_actions` supprimées puis
--    réinsérées) : 3 ms sur la stack locale, davantage sur la petite instance, et autant de lignes
--    mortes à chaque appel. Une boucle qui alterne deux valeurs occupait le processeur et faisait
--    grossir la base. Vingt corrections par compte dans une fenêtre de vingt-quatre heures ouverte par
--    la première, un appel à la fois par compte. Une correction qui ne change rien ne compte pas.
--
-- 4. **L'alerte d'exploitation dit quand un budget du jour passe 80 %** : un événement refusé ne laisse
--    aucune trace, et sans elle un budget atteint ne se verrait qu'à un entonnoir qui s'aplatit. **Et son
--    détail des pannes nomme la page introuvable** : l'app écrit `/+not-found` pour toute adresse hors du
--    produit (`routeDeLaPanne`, même jour), que la forme des routes du relevé classait « route hors
--    forme » à cause du `+`.
--
-- Les fonctions réécrites partent de `pg_get_functiondef` (SUPABASE.md §2.3) ; seuls les fragments que
-- cet en-tête nomme changent.

-- ── 1. Le compteur de tout le projet ─────────────────────────────────────────────────────────────
--
-- Un agrégat sans identifiant ni segment : une ligne par heure, trois nombres. Seul le déclencheur
-- l'écrit ; aucun client ne le lit.

create table if not exists public.evenements_d_usage_par_heure (
  heure timestamptz primary key,
  comptes_neufs integer not null default 0,
  autres_comptes integer not null default 0,
  pannes integer not null default 0
);

alter table public.evenements_d_usage_par_heure enable row level security;
revoke all on table public.evenements_d_usage_par_heure from public, anon, authenticated, service_role;

comment on table public.evenements_d_usage_par_heure is
  'Les événements d''usage reçus, par heure (UTC) : ceux des comptes nés depuis moins de vingt-quatre heures, ceux des autres comptes, et les pannes (app_error). Les budgets du jour se lisent sur les vingt-quatre dernières lignes (budgets_des_evenements_d_usage). Écrit par enforce_usage_events_rate_limit, jamais lu par un client, purgé au-delà de deux jours par purge_usage_events. Sans identifiant.';

-- Le compteur ne sert que sur ses vingt-quatre dernières heures : la purge quotidienne des événements
-- (tâche `purge-usage-events`, 3 h 30 UTC) en retire les tranches de plus de deux jours, plutôt que d'en
-- garder 8 760 par an que rien ne lit. Réécrite depuis `pg_get_functiondef` — son corps n'a pas bougé
-- depuis `20260905170000` — : seule la seconde ligne s'ajoute, et ses privilèges restent ceux d'avant.
create or replace function public.purge_usage_events()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.usage_events where occurred_at < now() - interval '12 months';
  delete from public.evenements_d_usage_par_heure where heure < now() - interval '2 days';
$$;

-- Les vingt-quatre heures déjà reçues comptent dès l'application : sans elles, le premier jour aurait
-- un budget de plus. L'âge du compte est celui qu'il avait à l'événement, comme le déclencheur le lit.
insert into public.evenements_d_usage_par_heure (heure, comptes_neufs, autres_comptes, pannes)
select date_trunc('hour', e.occurred_at),
       count(*) filter (where e.name <> 'app_error' and u.created_at > e.occurred_at - interval '24 hours'),
       count(*) filter (where e.name <> 'app_error' and not (u.created_at > e.occurred_at - interval '24 hours')),
       count(*) filter (where e.name = 'app_error')
from public.usage_events e
join auth.users u on u.id = e.user_id
where e.occurred_at > date_trunc('hour', now()) - interval '24 hours'
group by 1
on conflict (heure) do nothing;

-- Les trois budgets, ce qui en est reçu et leur plafond : la seule définition, que le déclencheur et
-- l'alerte lisent tous deux. La fenêtre est celle des vingt-quatre dernières heures entamées, celle en
-- cours comprise.
create or replace function public.budgets_des_evenements_d_usage()
returns table (budget text, recus bigint, plafond integer)
language sql
stable
set search_path = public, pg_temp
as $$
  select b.budget,
         coalesce(sum(case b.budget
                        when 'comptes_neufs' then t.comptes_neufs
                        when 'autres_comptes' then t.autres_comptes
                        else t.pannes
                      end), 0)::bigint,
         b.plafond
  from (values ('comptes_neufs', 50000), ('autres_comptes', 25000), ('pannes', 2500)) as b(budget, plafond)
  left join public.evenements_d_usage_par_heure t
    on t.heure > date_trunc('hour', now()) - interval '24 hours'
  group by b.budget, b.plafond;
$$;

revoke execute on function public.budgets_des_evenements_d_usage() from public, anon, authenticated, service_role;

comment on function public.budgets_des_evenements_d_usage() is
  'Les trois budgets du jour des événements d''usage pour tout le projet (comptes neufs 50 000, autres comptes 25 000, pannes 2 500), et ce qui en a été reçu sur les vingt-quatre dernières heures. Lue par enforce_usage_events_rate_limit et par releve_des_alertes.';

-- ── 2. Le déclencheur des événements d'usage ────────────────────────────────────────────────────

create or replace function public.enforce_usage_events_rate_limit()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  c_evenements_par_compte constant integer := 200;
  c_pannes_par_compte constant integer := 50;
  v_panne boolean := new.name = 'app_error';
  v_budget text;
  v_recus bigint;
  v_plafond integer;
begin
  -- Par compte, sur vingt-quatre heures glissantes, et les pannes à part : un écran qui plante ne coûte
  -- pas ses autres événements à la personne, ni l'inverse. `offset n - 1 limit 1` trouve une ligne si
  -- et seulement s'il en existe déjà au moins n : la n+1ᵉ est donc refusée, sans compter toute la
  -- fenêtre.
  if v_panne then
    perform 1
    from public.usage_events
    where user_id = new.user_id and name = 'app_error' and occurred_at > now() - interval '24 hours'
    offset c_pannes_par_compte - 1 limit 1;

    if found then
      raise exception 'Trop de pannes remontées pour cet utilisateur sur 24 h.'
        using errcode = 'check_violation';
    end if;
  else
    perform 1
    from public.usage_events
    where user_id = new.user_id and name <> 'app_error' and occurred_at > now() - interval '24 hours'
    offset c_evenements_par_compte - 1 limit 1;

    if found then
      raise exception 'Trop d''événements d''usage pour cet utilisateur sur 24 h.'
        using errcode = 'check_violation';
    end if;
  end if;

  -- Pour tout le projet, quel que soit l'âge du compte : les comptes neufs et les autres ont chacun
  -- leur budget, pour qu'un flot de sessions neuves ne prenne rien aux comptes qui reviennent, ni
  -- des comptes vieillis exprès à l'entonnoir d'un lancement.
  v_budget := case
    when v_panne then 'pannes'
    when exists (
      select 1 from auth.users u where u.id = new.user_id and u.created_at > now() - interval '24 hours'
    ) then 'comptes_neufs'
    else 'autres_comptes'
  end;

  select b.recus, b.plafond into v_recus, v_plafond
  from public.budgets_des_evenements_d_usage() b
  where b.budget = v_budget;

  -- Le premier `app_open` du compte en vingt-quatre heures passe quand même : c'est son signe de vie
  -- (`dernier_signe_de_vie`, la purge) et l'ouverture que compte l'entonnoir (en-tête).
  if v_recus >= v_plafond
     and not (
       new.name = 'app_open'
       and not exists (
         select 1 from public.usage_events e
         where e.user_id = new.user_id and e.name = 'app_open' and e.occurred_at > now() - interval '24 hours'
       )
     ) then
    raise exception 'Budget du jour des événements d''usage atteint pour tout le projet : %.', v_budget
      using errcode = 'check_violation';
  end if;

  -- Un refus plus bas (une propriété hors borne) annule aussi ce compte : seul ce qui entre est compté.
  insert into public.evenements_d_usage_par_heure as t (heure, comptes_neufs, autres_comptes, pannes)
  values (
    date_trunc('hour', now()),
    (v_budget = 'comptes_neufs')::integer,
    (v_budget = 'autres_comptes')::integer,
    (v_budget = 'pannes')::integer
  )
  on conflict (heure) do update
    set comptes_neufs = t.comptes_neufs + excluded.comptes_neufs,
        autres_comptes = t.autres_comptes + excluded.autres_comptes,
        pannes = t.pannes + excluded.pannes;

  return new;
end;
$function$;

comment on function public.enforce_usage_events_rate_limit() is
  'Plafonds des événements d''usage : par compte sur 24 h glissantes (200 événements, 50 pannes à part), puis les budgets du jour de tout le projet (budgets_des_evenements_d_usage), quel que soit l''âge du compte ; le premier app_open d''un compte en 24 h passe toujours. Compte ce qui entre dans evenements_d_usage_par_heure. Refuse en check_violation.';

-- ── 3. Le contexte : vingt corrections par jour, une à la fois ──────────────────────────────────
--
-- Le compte vit sur `profiles`, que le client lit mais n'écrit que sur ses deux préférences de rappel
-- (`20261004173905`) : ces deux colonnes ne s'écrivent que par le RPC.

alter table public.profiles
  add column if not exists corrections_du_contexte smallint not null default 0;
alter table public.profiles
  add column if not exists corrections_du_contexte_depuis timestamptz;

comment on column public.profiles.corrections_du_contexte is
  'Corrections du contexte qui ont changé quelque chose depuis corrections_du_contexte_depuis (mettre_a_jour_le_contexte, vingt au plus par fenêtre de vingt-quatre heures). Écrit par le RPC seul.';
comment on column public.profiles.corrections_du_contexte_depuis is
  'Ouverture de la fenêtre de vingt-quatre heures de corrections_du_contexte : la première correction après la fenêtre précédente.';

CREATE OR REPLACE FUNCTION public.mettre_a_jour_le_contexte(p_zone_type text, p_transports_proches text[], p_household_vehicles text, p_teletravail text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  c_corrections_par_jour constant integer := 20;
  v_uid uuid := auth.uid();
  v_assessment_id uuid;
  v_avant record;
  v_transports text[] := public.transports_ranges(p_transports_proches);
  v_corrections integer;
begin
  if v_uid is null then
    raise exception 'mettre_a_jour_le_contexte: aucune session' using errcode = 'RM003';
  end if;

  -- **Un appel à la fois par compte**, jusqu'à la fin de la transaction : tout ce qui suit lit, compare,
  -- écrit puis reconstruit le plan, et deux appels simultanés reconstruiraient deux fois le même plan
  -- l'un sous l'autre. La clé porte le compte : deux personnes ne s'attendent jamais.
  perform pg_advisory_xact_lock(hashtext('mettre_a_jour_le_contexte:' || v_uid::text));

  -- **Une réponse ne s'efface pas** (C3.8) : une condition qu'on ne peut pas évaluer n'est pas
  -- remplie, donc vider `zone_type`, `transports_proches` ou `household_vehicles` **retire** des
  -- actions du plan, en silence. Les trois sont posées à tout le monde ; les refuser nulles rend la
  -- règle structurelle plutôt que conventionnelle. `p_teletravail` est la quatrième et la seule qui
  -- puisse légitimement être nulle : B4.4 ne se pose pas en dessous de deux jours de trajet
  -- (`teletravailSePose`, C5.4), et l'y forcer inventerait une réponse à une question absente. **Un
  -- tableau vide n'est pas une réponse non plus** : rangé, il reste vide, et sans ce refus il
  -- buterait sur le `check` de la table, en anglais et après coup.
  if p_zone_type is null or coalesce(cardinality(v_transports), 0) = 0 or p_household_vehicles is null then
    raise exception 'mettre_a_jour_le_contexte: les trois réponses de contexte sont obligatoires'
      using errcode = 'RM003';
  end if;

  select a.id into v_assessment_id
  from public.assessments a
  where a.user_id = v_uid and a.status = 'completed'
  order by a.submitted_at desc nulls last
  limit 1;

  if v_assessment_id is null then
    raise exception 'mettre_a_jour_le_contexte: aucun bilan complété' using errcode = 'RM003';
  end if;

  select zone_type, transports_proches, household_vehicles, teletravail
    into v_avant
  from public.assessment_answers
  where assessment_id = v_assessment_id;

  -- **Rien n'a bougé : on ne touche à rien.** Ce n'est pas une optimisation — `recompute` réécrit
  -- `assessment_results` et la régénération forcée reconstruit `plan_actions`, donc un
  -- enregistrement à blanc ferait perdre les rangs d'affichage et rejouerait la reprise
  -- d'engagement pour rien. Le geste le plus fréquent sur cet écran est de l'ouvrir, de le lire et
  -- de le refermer. La réponse stockée est rangée par le déclencheur, et celle qu'on reçoit l'est
  -- juste au-dessus : deux réponses égales se comparent égales, dans quelque ordre qu'on ait touché
  -- les puces (`v1-34`).
  if v_avant.zone_type is not distinct from p_zone_type
     and v_avant.transports_proches is not distinct from v_transports
     and v_avant.household_vehicles is not distinct from p_household_vehicles
     and v_avant.teletravail is not distinct from p_teletravail then
    return;
  end if;

  -- **Vingt corrections par fenêtre de vingt-quatre heures**, ouverte par la première : chacune
  -- recalcule le bilan et reconstruit le plan, et personne ne corrige son contexte vingt fois dans la
  -- journée. Compté avant le travail, pour qu'un refus ne coûte rien ; le refus annule le compte. Les
  -- deux `case` lisent la ligne d'avant la mise à jour.
  update public.profiles
  set corrections_du_contexte = case
        when corrections_du_contexte_depuis > now() - interval '24 hours' then corrections_du_contexte + 1
        else 1
      end,
      corrections_du_contexte_depuis = case
        when corrections_du_contexte_depuis > now() - interval '24 hours' then corrections_du_contexte_depuis
        else now()
      end
  where id = v_uid
  returning corrections_du_contexte into v_corrections;

  if v_corrections > c_corrections_par_jour then
    raise exception 'Tu as corrigé ton contexte de nombreuses fois aujourd''hui. Reviens demain.'
      using errcode = 'RM002';
  end if;

  -- Les valeurs admissibles ne sont pas revalidées ici : les `check` de la table les portent déjà
  -- (`assessment_answers_zone_type_check` et ses sœurs), et les réécrire ferait un second endroit à
  -- tenir d'accord — le piège de `PARTS_DU_SECOND_MODE` par l'autre bout. Et `tc_access` ne s'écrit
  -- pas : le déclencheur le déduit de la réponse (`v1-34` D5).
  update public.assessment_answers
  set zone_type = p_zone_type,
      transports_proches = v_transports,
      household_vehicles = p_household_vehicles,
      teletravail = p_teletravail
  where assessment_id = v_assessment_id;

  -- L'ordre compte. `recompute_assessment_results` remet `assessment_results` d'accord avec les
  -- réponses — `mobility_constrained`, et le résiduel des sorties rares — et appelle lui-même
  -- `generate_plan_cycle_for_user(user)` en fin de course, qui **retourne sur la garde
  -- d'idempotence** puisque `submitted_at` n'a pas bougé. C'est le second appel, celui-ci nommé,
  -- qui reconstruit le plan. Ne pas « simplifier » en retirant l'un des deux : sans le premier le
  -- plan se reconstruirait sur un résultat périmé, sans le second il ne se reconstruirait pas.
  perform public.recompute_assessment_results(v_assessment_id);
  perform public.generate_plan_cycle_for_user(v_uid, 'contexte');
end;
$function$;

revoke execute on function public.mettre_a_jour_le_contexte(text, text[], text, text)
  from public, anon, authenticated;
grant execute on function public.mettre_a_jour_le_contexte(text, text[], text, text) to authenticated;

comment on function public.mettre_a_jour_le_contexte(text, text[], text, text) is
  'Corrige les réponses de contexte du dernier bilan complété (C6.4) : zone, ce qui passe près de chez soi (v1-34), véhicules, télétravail. L''accès se déduit de la réponse. Recalcule le bilan et reconstruit le plan, sauf si rien n''a bougé. Vingt corrections par compte et par fenêtre de vingt-quatre heures (RM002 au-delà), un appel à la fois par compte.';

-- ── 4. L'export rend le compte des corrections ──────────────────────────────────────────────────
--
-- La page de confidentialité promet que l'export rend tout ce que nous conservons : ces deux colonnes
-- en sont, comme les vérifications du captcha. Seules les deux lignes de `compte` changent.

CREATE OR REPLACE FUNCTION public.export_my_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_export jsonb;
begin
  if v_user_id is null then
    raise exception 'Aucune session.' using errcode = 'insufficient_privilege';
  end if;

  select jsonb_build_object(
    'export_genere_le', now(),
    'compte', (
      select jsonb_build_object(
        'identifiant', u.id,
        'email', u.email,
        'compte_anonyme', u.is_anonymous,
        'cree_le', u.created_at,
        'cadence_du_plan', p.cadence_type,
        'canal_de_rappel', p.reminder_channel,
        'mot_de_la_veille', p.mot_de_la_veille,
        'corrections_du_contexte', p.corrections_du_contexte,
        'corrections_du_contexte_depuis', p.corrections_du_contexte_depuis,
        'metadonnees', u.raw_user_meta_data,
        'adresse_en_attente_de_confirmation', nullif(u.email_change, '')
      )
      from auth.users u join public.profiles p on p.id = u.id
      where u.id = v_user_id
    ),
    'identites_de_connexion', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'fournisseur', i.provider,
        'donnees_transmises', i.identity_data,
        'liee_le', i.created_at,
        'derniere_connexion_le', i.last_sign_in_at
      ) order by i.created_at), '[]'::jsonb)
      from auth.identities i where i.user_id = v_user_id
    ),
    'sessions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'ouverte_le', s.created_at,
        'mise_a_jour_le', s.updated_at,
        'adresse_ip', host(s.ip),
        'appareil', s.user_agent
      ) order by s.created_at), '[]'::jsonb)
      from auth.sessions s where s.user_id = v_user_id
    ),
    'appareils_pour_les_rappels', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'plateforme', t.platform,
        'jeton_derniers_caracteres', right(t.token, 6),
        'enregistre_le', t.created_at,
        'vu_le', t.last_seen_at,
        'desactive_le', t.disabled_at
      ) order by t.created_at), '[]'::jsonb)
      from public.push_tokens t where t.user_id = v_user_id
    ),
    'bilans', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'soumis_le', a.submitted_at,
        'statut', a.status,
        'reponses', to_jsonb(ans.*) - 'assessment_id',
        'resultats', to_jsonb(r.*) - 'assessment_id' - 'id'
      ) order by a.created_at), '[]'::jsonb)
      from public.assessments a
      left join public.assessment_answers ans on ans.assessment_id = a.id
      left join public.assessment_results r on r.assessment_id = a.id
      where a.user_id = v_user_id
    ),
    'plans', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'periode', pc.period_label,
        'du', pc.period_start,
        'au', pc.period_end,
        'objectif_pct', pc.target_reduction_pct,
        'premier_engagement_le', pc.premier_engagement_le,
        'actions', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'action', t.action_text,
            'gain_kg_par_an', pa.saving_kg_year,
            'engagement_pris_le', pa.committed_at,
            'jours_choisis', pa.intention_days,
            'echeance_choisie', pa.intention_timing
          ) order by pa.rank), '[]'::jsonb)
          from public.plan_actions pa
          join public.action_templates t on t.id = pa.action_template_id
          where pa.plan_cycle_id = pc.id
        )
      ) order by pc.period_start), '[]'::jsonb)
      from public.plan_cycles pc where pc.user_id = v_user_id
    ),
    'points_de_suivi', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'periode', c.period_label,
        'trajet', c.trip_label,
        'statut', c.status,
        'reponse', c.response,
        'type_de_reponse', c.response_kind,
        'question', c.committed_question,
        'poste', c.poste,
        'mode', c.mode,
        'action_suivie', c.committed_action_text,
        'jours_choisis', c.committed_intention_days,
        'echeance_choisie', c.committed_intention_timing,
        'repondu_le', c.responded_at
      ) order by c.period_start), '[]'::jsonb)
      from public.engagement_checkins c where c.user_id = v_user_id
    ),
    'rappels_envoyes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'genre', o.genre,
        'periode', c.period_label,
        'jour_vise', o.jour_vise,
        'canal', o.channel,
        'destinataire', case when o.channel = 'email' then o.recipient_email end,
        'objet', case when o.channel = 'email' then o.subject end,
        'message', case when o.channel = 'email'
          then regexp_replace(o.body, 'jeton=[0-9A-Fa-f-]+', 'jeton=(retiré de l''export)', 'g') end,
        'notification', case when o.channel = 'push' then o.push_body end,
        'statut', o.status,
        'envoye_le', o.sent_at,
        'desinscription_utilisee_le', o.unsubscribe_used_at
      ) order by o.created_at), '[]'::jsonb)
      from public.notification_outbox o
      left join public.engagement_checkins c on c.id = o.checkin_id
      where o.user_id = v_user_id
    ),
    'engagements_relaches', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'action', ar2.action_text,
        'engagement_pris_le', ar2.committed_at,
        'jours_choisis', ar2.intention_days,
        'echeance_choisie', ar2.intention_timing,
        'relache_le', ar2.released_at,
        'raison', ar2.released_reason
      ) order by ar2.released_at), '[]'::jsonb)
      from public.plan_action_commitments_archive ar2 where ar2.user_id = v_user_id
    ),
    'retours_envoyes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'categorie', f.kind, 'message', f.message, 'ecran', f.context, 'envoye_le', f.created_at
      ) order by f.created_at), '[]'::jsonb)
      from public.feedback f where f.user_id = v_user_id
    ),
    'codes_de_connexion_envoyes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'type', ev.type, 'issue', ev.issue, 'le', ev.cree_le
      ) order by ev.cree_le), '[]'::jsonb)
      from public.envois_d_e_mails_d_auth ev where ev.user_id = v_user_id
    ),
    -- Le captcha du rattachement (passe avant le lancement, 05/10/2026) : une ligne au plus, purgée au
    -- bout d'un jour comme le journal des codes.
    'verifications_du_captcha', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'autorisation_accordee_le', a.accordee_le, 'essais_dans_l_heure', a.essais, 'essais_depuis', a.essais_depuis
      )), '[]'::jsonb)
      from public.autorisations_de_rattachement a where a.user_id = v_user_id
    ),
    'reperes_de_parcours', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'evenement', e.name, 'details', e.props, 'plateforme', e.platform, 'le', e.occurred_at
      ) order by e.occurred_at), '[]'::jsonb)
      from public.usage_events e where e.user_id = v_user_id
    )
  ) into v_export;

  return v_export;
end;
$function$;

-- ── 5. L'alerte dit un budget du jour entamé à 80 % ─────────────────────────────────────────────
--
-- Un événement refusé ne laisse aucune ligne : seul le compteur dit qu'un budget s'épuise. À 80 %,
-- l'alerte le dit avant que rien ne se perde, et le redit tant qu'il y reste, sous le plafond du jour
-- de l'alerte — ce sont des clients qui le remplissent. Trois fonctions, une clé et une ligne chacune.

CREATE OR REPLACE FUNCTION public.releve_des_alertes(p_depuis timestamp with time zone)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select jsonb_build_object(
    'pannes', (
      select count(*) from public.usage_events
      where name = 'app_error' and occurred_at > p_depuis
    ),
    'pannes_detail', (
      select coalesce(jsonb_agg(ligne order by (ligne ->> 'nombre')::int desc), '[]'::jsonb)
      from (
        select jsonb_build_object('route', route, 'categorie', categorie, 'nombre', count(*)) as ligne
        from (
          -- La forme, jamais le texte du client (voir l'en-tête). La page introuvable s'écrit
          -- `/+not-found` (`routeDeLaPanne`), seul chemin du produit qui porte un `+` : elle est admise
          -- telle quelle, sans ouvrir le `+` aux autres.
          select
            case when props ->> 'route' ~ '^/[a-z/_-]{0,47}$' or props ->> 'route' = '/+not-found'
              then props ->> 'route'
              else 'route hors forme' end as route,
            case when props ->> 'category' ~ '^[a-z]{1,16}$' then props ->> 'category'
              else 'hors forme' end as categorie
          from public.usage_events
          where name = 'app_error' and occurred_at > p_depuis
        ) e
        group by route, categorie
        order by count(*) desc
        limit 5
      ) t
    ),
    'soumissions_en_echec', (
      select count(*) from public.usage_events
      where name = 'bilan_submit_error' and occurred_at > p_depuis
    ),
    'taches_en_echec', (
      select coalesce(jsonb_agg(distinct j.jobname), '[]'::jsonb)
      from cron.job_run_details d
      join cron.job j on j.jobid = d.jobid
      where d.status = 'failed' and d.end_time > p_depuis
    ),
    'envois_en_echec', (
      select count(*) from public.reminder_send_runs
      where status in ('error', 'partial', 'skipped') and ran_at > p_depuis
    ),
    'synchronisations_en_echec', (
      select count(*) from public.emission_factor_sync_runs
      where status in ('error', 'partial') and ran_at > p_depuis
    ),
    'purges_bloquees', (
      select count(*) from public.purge_runs
      where status = 'blocked' and ran_at > p_depuis
    ),
    'plans_en_echec', (
      select coalesce(sum(echecs), 0) from public.plan_cycle_runs
      where ran_at > p_depuis
    ),
    -- La taille de la base, en Mo : au-delà de 500, le plan gratuit la passe en lecture seule pour
    -- tout le monde (passe avant le lancement, 05/10/2026).
    'taille_de_la_base_mo', (
      select (pg_database_size(current_database()) / 1048576)::integer
    ),
    'rappels_bloques', (
      select count(*) from analytics.rappels_bloques
      where not (genre = 'veille' and statut = 'failed')
    ),
    -- Les demandes d'un e-mail d'Auth que le produit n'envoie jamais (`recovery` surtout) : le hook les
    -- journalise sans rien envoyer. Chacune use le plafond horaire global d'e-mails du projet, et une
    -- récupération arme en plus la minute de l'adresse (06/10/2026, voir l'en-tête de 20261006140000).
    'demandes_ignorees', (
      select count(*) from public.envois_d_e_mails_d_auth
      where issue = 'type_ignore' and cree_le > p_depuis
    ),
    'demandes_ignorees_adresses', (
      select count(distinct adresse_empreinte) from public.envois_d_e_mails_d_auth
      where issue = 'type_ignore' and cree_le > p_depuis
    ),
    -- Le plafond quotidien des rattachements atteint : le hook ne fait plus partir aucun code de
    -- rattachement tant que la fenêtre glissante de vingt-quatre heures est pleine — et il se tait, par
    -- non-divulgation.
    'plafond_du_projet_atteint', (
      select count(*) from public.envois_d_e_mails_d_auth
      where issue = 'plafond_projet' and cree_le > p_depuis
    ),
    -- Les codes que Supabase a refusés avant même le hook (le plafond horaire du projet, ou la minute
    -- d'une adresse) : seule l'app les voit, et les signale (`connexion_limite`).
    'codes_refuses_par_la_limite', (
      select count(*) from public.usage_events
      where name = 'connexion_limite' and occurred_at > p_depuis
    ),
    -- Les budgets du jour des événements d'usage entamés à 80 % ou plus : un état, pas une fenêtre —
    -- un refus ne laisse pas de ligne à compter depuis `p_depuis`.
    'budgets_des_evenements_entames', (
      select coalesce(jsonb_agg(jsonb_build_object('budget', b.budget, 'recus', b.recus, 'plafond', b.plafond)
                                order by b.budget), '[]'::jsonb)
      from public.budgets_des_evenements_d_usage() b
      where b.recus * 5 >= b.plafond * 4
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.alerte_a_dire(p_releve jsonb, p_rappels_bloques_vus integer)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select (p_releve ->> 'pannes')::int > 0
      or (p_releve ->> 'soumissions_en_echec')::int > 0
      or jsonb_array_length(p_releve -> 'taches_en_echec') > 0
      or (p_releve ->> 'envois_en_echec')::int > 0
      or (p_releve ->> 'synchronisations_en_echec')::int > 0
      or (p_releve ->> 'purges_bloquees')::int > 0
      or coalesce((p_releve ->> 'plans_en_echec')::int, 0) > 0
      or (p_releve ->> 'rappels_bloques')::int > p_rappels_bloques_vus
      or coalesce((p_releve ->> 'taille_de_la_base_mo')::int, 0) >= 300
      or coalesce((p_releve ->> 'plafond_du_projet_atteint')::int, 0) > 0
      or coalesce((p_releve ->> 'demandes_ignorees')::int, 0) > 0
      or coalesce((p_releve ->> 'codes_refuses_par_la_limite')::int, 0) >= 3
      or jsonb_array_length(coalesce(p_releve -> 'budgets_des_evenements_entames', '[]'::jsonb)) > 0;
$function$;

CREATE OR REPLACE FUNCTION public.texte_de_l_alerte(p_releve jsonb, p_depuis timestamp with time zone, p_rappels_bloques_vus integer)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_lignes text[] := array[]::text[];
  v_detail text;
begin
  if (p_releve ->> 'pannes')::int > 0 then
    select string_agg(format('%s · %s (%s)', l ->> 'route', l ->> 'categorie', l ->> 'nombre'), ', ')
      into v_detail
    from jsonb_array_elements(p_releve -> 'pannes_detail') as l;
    v_lignes := v_lignes || format('- Pannes de l''app (app_error) : %s — %s', p_releve ->> 'pannes', v_detail);
  end if;
  if (p_releve ->> 'soumissions_en_echec')::int > 0 then
    v_lignes := v_lignes || format('- Soumissions de bilan en échec (bilan_submit_error) : %s', p_releve ->> 'soumissions_en_echec');
  end if;
  if jsonb_array_length(p_releve -> 'taches_en_echec') > 0 then
    select string_agg(t, ', ') into v_detail from jsonb_array_elements_text(p_releve -> 'taches_en_echec') as t;
    v_lignes := v_lignes || format('- Tâches planifiées en échec : %s', v_detail);
  end if;
  if (p_releve ->> 'envois_en_echec')::int > 0 then
    v_lignes := v_lignes || format('- Passages d''envoi des rappels en échec, partiels ou sautés : %s', p_releve ->> 'envois_en_echec');
  end if;
  if (p_releve ->> 'synchronisations_en_echec')::int > 0 then
    v_lignes := v_lignes || format('- Synchronisations des facteurs ADEME non réussies : %s', p_releve ->> 'synchronisations_en_echec');
  end if;
  if (p_releve ->> 'purges_bloquees')::int > 0 then
    v_lignes := v_lignes || format('- Purges des sessions anonymes ralenties par la garde de volume (des comptes qui portent un bilan sont partis, d''autres attendent) : %s', p_releve ->> 'purges_bloquees');
  end if;
  if coalesce((p_releve ->> 'plans_en_echec')::int, 0) > 0 then
    v_lignes := v_lignes || format('- Échecs de la préparation nocturne des plans (generate_plan_cycles) : %s', p_releve ->> 'plans_en_echec');
  end if;
  if coalesce((p_releve ->> 'taille_de_la_base_mo')::int, 0) >= 300 then
    v_lignes := v_lignes || format('- Taille de la base : %s Mo, sur les 500 du plan gratuit — au-delà, elle passe en lecture seule pour tout le monde',
      p_releve ->> 'taille_de_la_base_mo');
  end if;
  if coalesce((p_releve ->> 'plafond_du_projet_atteint')::int, 0) > 0 then
    v_lignes := v_lignes || format('- Plafond quotidien des rattachements par e-mail atteint (%s demandes retenues) : plus aucun compte ne se rattache par e-mail tant que la fenêtre glissante de vingt-quatre heures est pleine ; la reconnexion passe',
      p_releve ->> 'plafond_du_projet_atteint');
  end if;
  if coalesce((p_releve ->> 'demandes_ignorees')::int, 0) > 0 then
    v_lignes := v_lignes || format('- Demandes d''un e-mail que Ramille n''envoie jamais (récupération de mot de passe…) : %s, sur %s adresse(s) — chacune use le plafond horaire d''e-mails du projet (trente par heure, toute connexion par e-mail comprise), et une récupération bloque une minute la reconnexion par code de son adresse',
      p_releve ->> 'demandes_ignorees', p_releve ->> 'demandes_ignorees_adresses');
  end if;
  if coalesce((p_releve ->> 'codes_refuses_par_la_limite')::int, 0) >= 3 then
    v_lignes := v_lignes || format('- Codes de connexion refusés par la limite d''envoi de Supabase (connexion_limite) : %s — le plafond horaire du projet est peut-être épuisé ; les Logs Auth du tableau de bord disent lequel',
      p_releve ->> 'codes_refuses_par_la_limite');
  end if;
  if jsonb_array_length(coalesce(p_releve -> 'budgets_des_evenements_entames', '[]'::jsonb)) > 0 then
    select string_agg(format('%s %s sur %s', b ->> 'budget', b ->> 'recus', b ->> 'plafond'), ', ')
      into v_detail
    from jsonb_array_elements(p_releve -> 'budgets_des_evenements_entames') as b;
    v_lignes := v_lignes || format('- Budgets du jour des événements d''usage entamés à 80 %% ou plus (table evenements_d_usage_par_heure) : %s — un budget atteint refuse les événements suivants sans laisser de trace, hors la première ouverture du jour de chaque compte',
      v_detail);
  end if;
  if (p_releve ->> 'rappels_bloques')::int > p_rappels_bloques_vus then
    v_lignes := v_lignes || format('- Rappels bloqués : %s (%s de plus qu''au relevé précédent)',
      p_releve ->> 'rappels_bloques', (p_releve ->> 'rappels_bloques')::int - p_rappels_bloques_vus);
  end if;

  return format(
    E'Bonjour,\n\nDepuis le %s (heure de Paris), l''exploitation de Ramille a relevé :\n\n%s\n\n'
    'Les requêtes pour y voir clair : docs/exploitation/README.md §8, et docs/exploitation/remontee-erreurs.md §4 '
    'pour les pannes de l''app.\n\n'
    'Pour couper ces alertes : tableau de bord Supabase, Table Editor, table alertes_d_exploitation, décocher « actives ».',
    to_char(p_depuis at time zone 'Europe/Paris', 'DD/MM/YYYY à HH24"h"MI'),
    array_to_string(v_lignes, E'\n')
  );
end;
$function$;

-- ── 6. Le contrôle de fin : ce que les migrations suivantes ne doivent pas défaire ──────────────
--
-- Sur les corps installés, sans commentaires (SUPABASE.md §2.3) : le rejeu d'une migration plus
-- ancienne qui réinstallerait un plafond sans budget du jour, un contexte sans plafond ou un export
-- sans les corrections ferait tomber ce bloc au prochain rejeu de celle-ci.
do $controle$
declare
  v_evenements text := pg_get_functiondef('public.enforce_usage_events_rate_limit()'::regprocedure);
  v_contexte text := pg_get_functiondef('public.mettre_a_jour_le_contexte(text, text[], text, text)'::regprocedure);
  v_export text := pg_get_functiondef('public.export_my_data()'::regprocedure);
  v_releve text := pg_get_functiondef('public.releve_des_alertes(timestamptz)'::regprocedure);
  v_purge text := pg_get_functiondef('public.purge_usage_events()'::regprocedure);
begin
  if position('budgets_des_evenements_d_usage()' in v_evenements) = 0
     or position('c_pannes_par_compte' in v_evenements) = 0
     or position('evenements_d_usage_par_heure' in v_evenements) = 0 then
    raise exception 'Le plafond des événements a perdu ses budgets du jour ou son budget de pannes par compte';
  end if;
  if position('pg_advisory_xact_lock' in v_contexte) = 0
     or position('c_corrections_par_jour' in v_contexte) = 0
     or position('pg_advisory_xact_lock' in v_contexte) > position('v_avant.zone_type' in v_contexte) then
    raise exception 'La correction du contexte a perdu son plafond, ou son verrou ne précède plus la comparaison';
  end if;
  if position('corrections_du_contexte' in v_export) = 0 then
    raise exception 'L''export ne rend plus le compte des corrections du contexte';
  end if;
  if position('budgets_des_evenements_entames' in v_releve) = 0 then
    raise exception 'L''alerte ne lit plus les budgets du jour des événements';
  end if;
  if position('''/+not-found''' in v_releve) = 0 then
    raise exception 'L''alerte classe de nouveau la page introuvable en « route hors forme »';
  end if;
  if position('evenements_d_usage_par_heure' in v_purge) = 0
     or position('12 months' in v_purge) = 0 then
    raise exception 'La purge des événements ne purge plus le compteur, ou plus les événements';
  end if;
  if has_function_privilege('anon', 'public.purge_usage_events()', 'execute')
     or has_function_privilege('authenticated', 'public.purge_usage_events()', 'execute') then
    raise exception 'La purge des événements est appelable par un client';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.evenements_d_usage_par_heure'::regclass)
     or has_table_privilege('authenticated', 'public.evenements_d_usage_par_heure', 'select')
     or has_table_privilege('anon', 'public.evenements_d_usage_par_heure', 'select') then
    raise exception 'Le compteur des événements est lisible par un client';
  end if;
end;
$controle$;
