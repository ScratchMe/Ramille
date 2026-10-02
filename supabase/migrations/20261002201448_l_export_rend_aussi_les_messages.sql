-- L'export rend aussi les messages de rappel, la question figée de chaque point et les métadonnées
-- du compte (02/10/2026, le même soir que `20261002195246`).
--
-- **D'où ça vient.** La contre-lecture de la migration précédente a trouvé trois choses que la
-- page de confidentialité dit conservées et que l'export ne rendait pas, alors qu'il promet
-- « l'intégralité de ce que nous conservons sur toi » :
--
--   - **le message de chaque rappel** : la page dit que sa trace — « période concernée, canal, date
--     d'envoi, message » — est gardée six mois, et l'export n'en rendait ni l'objet, ni le corps, ni
--     le texte de la notification, ni l'adresse à laquelle il est parti ;
--   - **la question figée de chaque point** (`committed_question`), qui est la phrase même posée à
--     la personne et peut nommer son mode, son action et ses jours ;
--   - **les métadonnées du compte** (`auth.users.raw_user_meta_data`), où Supabase Auth recopie ce
--     que Google transmet à la connexion, nom et photo compris — la migration précédente ne rendait
--     que leur copie d'`auth.identities`.
--
-- **Ce qui ne part toujours pas** : le jeton de désinscription (`unsubscribe_token`) et le ticket du
-- fournisseur (`provider_ticket`) sont des clés ; l'erreur d'envoi (`last_error`) est un message
-- technique du fournisseur, pas un fait sur la personne.
--
-- **Réécrite depuis le corps que `20261002195246` vient d'installer** (empreinte
-- `1f5f70a641a087adb4c138f0270f60f7`, relevée en local et sur le distant).
--
-- **Ne pas rejouer après celle-ci** les migrations qui réécrivent `export_my_data` en entier —
-- `20260905210000_suppression_et_export_compte.sql`, `20260907230000_rappels_canal.sql`,
-- `20260910140000_retention_outbox_et_jetons.sql`, `20260928075453_le_mot_de_la_veille.sql`,
-- `20261002195246_l_export_rend_les_identites_et_les_sessions.sql`.

create or replace function public.export_my_data()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
        'metadonnees', u.raw_user_meta_data
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
        'destinataire', o.recipient_email,
        'objet', o.subject,
        'message', o.body,
        'notification', o.push_body,
        'statut', o.status,
        'envoye_le', o.sent_at
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

revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- Contrôle d'installation, comme celui de la migration précédente : il vérifie ce que ce fichier
-- vient d'installer, pas un rejeu ultérieur.
do $$
declare
  v_corps text := (select prosrc from pg_proc where oid = 'public.export_my_data()'::regprocedure);
begin
  if position('raw_user_meta_data' in v_corps) = 0
     or position('committed_question' in v_corps) = 0
     or position('o.push_body' in v_corps) = 0
     or position('identites_de_connexion' in v_corps) = 0 then
    raise exception 'export_my_data ne rend pas les messages, la question figée ou les métadonnées';
  end if;
  if position('unsubscribe_token' in v_corps) > 0 or position('provider_ticket' in v_corps) > 0 then
    raise exception 'export_my_data rend une clé qui ne doit pas partir';
  end if;
  if has_function_privilege('anon', 'public.export_my_data()', 'execute') then
    raise exception 'anon peut appeler export_my_data';
  end if;
end;
$$;
