-- Suppression de compte et export des données (T12 — bloqueur Play Store, RGPD art. 17 et 20).
--
-- ## Pourquoi c'est un bloqueur, et pas seulement une bonne pratique
--
-- Google Play impose depuis 2023 que toute app permettant de créer un compte offre **un chemin
-- de suppression dans l'app**, et une URL publique pour ceux qui l'ont désinstallée. TraceVerte
-- crée un compte pour chaque visiteur dès l'ouverture (session anonyme, v1-04 §1) : la règle
-- s'applique donc pleinement, y compris à quelqu'un qui ne s'est jamais « inscrit ».
--
-- ## La suppression est structurelle, pas une liste d'effacements
--
-- Tout cascade depuis `auth.users` : `profiles` en dépend, et `assessments`,
-- `engagement_checkins`, `feedback`, `notification_outbox`, `plan_cycles` et `usage_events`
-- dépendent de `profiles` — puis `assessment_answers`, `assessment_results` et `plan_actions`
-- de leurs parents. Vérifié dans `pg_constraint` avant d'écrire cette fonction : **aucun
-- maillon en NO ACTION ou SET NULL**. Supprimer la ligne d'authentification suffit donc, et
-- surtout aucune table future ne sera oubliée tant qu'elle est rattachée à cette chaîne — une
-- fonction qui énumérerait les tables une à une deviendrait fausse à la prochaine migration,
-- silencieusement.
--
-- `security definer` est obligatoire ici : `authenticated` n'a aucun droit sur le schéma
-- `auth`. La protection est la vérification de `auth.uid()` **dans** la fonction, comme pour
-- `compute_assessment_results` (v1-05 §4) ou `commit_plan_action`.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Aucune session.' using errcode = 'insufficient_privilege';
  end if;

  -- Une seule ligne à supprimer : tout le reste suit par cascade.
  delete from auth.users where id = v_user_id;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ## L'export
--
-- Droit d'accès et de portabilité (RGPD art. 15 et 20). Rendu en JSON parce que c'est le format
-- « structuré, couramment utilisé et lisible par machine » que l'article 20 demande, et parce
-- qu'il n'exige aucune dépendance nouvelle côté client.
--
-- Les événements d'usage en font partie : ce sont des données observées, mais rattachées à la
-- personne. Les exclure au motif qu'elle ne les a pas « fournies » serait une lecture étroite
-- que les lignes directrices du CEPD écartent.
--
-- `security definer` là aussi, mais pour une raison différente de la suppression : `usage_events`
-- n'a aucune policy de lecture (v1-08 §4), donc une fonction en `security invoker` rendrait un
-- export silencieusement incomplet. Chaque requête est explicitement bornée à `auth.uid()`.

create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
        'rappels_email_actives', p.email_reminders_enabled
      )
      from auth.users u join public.profiles p on p.id = u.id
      where u.id = v_user_id
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
        'repondu_le', c.responded_at
      ) order by c.period_start), '[]'::jsonb)
      from public.engagement_checkins c where c.user_id = v_user_id
    ),
    'retours_envoyes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'categorie', f.kind, 'message', f.message, 'ecran', f.context, 'envoye_le', f.created_at
      ) order by f.created_at), '[]'::jsonb)
      from public.feedback f where f.user_id = v_user_id
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
$$;

revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
