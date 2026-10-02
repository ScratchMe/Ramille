-- L'export rend aussi ce que Supabase Auth garde de la personne : ses identités de connexion et
-- ses sessions (02/10/2026).
--
-- **D'où ça vient.** En préparant le formulaire « Sécurité des données » de Google Play
-- (`docs/exploitation/fiche-google-play.md` §1.4), le rapprochement entre ce que le produit
-- enregistre et ce que dit la page de confidentialité a trouvé deux choses que l'export ne rendait
-- pas, alors que la page promet « l'intégralité de ce que nous conservons sur toi » (RGPD art. 15) :
--
--   - **les identités de connexion** (`auth.identities`). La connexion avec Google y range ce que
--     Google transmet : l'adresse, l'identifiant du compte Google, et aussi le nom et l'adresse de la
--     photo de profil, parce que Supabase Auth demande le droit `userinfo.profile`. Le produit ne les
--     lit nulle part ; ils n'en sont pas moins conservés ;
--   - **les sessions** (`auth.sessions`), qui portent l'adresse IP et l'agent utilisateur de chaque
--     session ouverte. Mesuré le 02/10/2026 : 110 sessions sur 110 les portent.
--
-- La page de confidentialité les décrit depuis la même PR ; cette migration rend vraie la phrase
-- sur l'export. **Une troisième retouche, de la même famille** : les points de suivi s'exportaient
-- par leur seul booléen `response`, qui vaut `null` pour une réponse « sans objet » — donc une
-- réponse donnée se lisait comme une absence de réponse. `response_kind` est la vérité d'une
-- réponse (`BOUCLE.md`), et il part maintenant avec elle.
--
-- **Ce qui ne part pas, et pourquoi.** Des sessions, ni l'identifiant ni les jetons : ce sont des
-- clés, pas des faits sur la personne — même raisonnement que le jeton d'appareil, dont l'export
-- ne rend que la fin. Des identités, `provider_id` reste : c'est l'identifiant chez le fournisseur,
-- qu'`identity_data` porte déjà sous `sub`.
--
-- **Réécrite depuis `pg_get_functiondef`** du distant, relevé le 02/10/2026 (empreinte du corps
-- `3706e516ec6c8b143ac4352475236d9f`), et non depuis le fichier qui l'a créée (`SUPABASE.md` §1.5).
--
-- **Ne pas rejouer après celle-ci** les migrations qui réécrivent `export_my_data` en entier —
-- `20260905210000_suppression_et_export_compte.sql`, `20260907230000_rappels_canal.sql`,
-- `20260910140000_retention_outbox_et_jetons.sql`, `20260928075453_le_mot_de_la_veille.sql` :
-- chacune remettrait un export qui ne rend ni les identités ni les sessions.

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
        'mot_de_la_veille', p.mot_de_la_veille
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

-- Contrôle d'installation : la fonction que ce fichier vient d'installer rend bien les clés neuves,
-- et `anon` ne l'atteint toujours pas. Il ne protège pas d'un rejeu ultérieur d'une migration plus
-- ancienne, qui ne repasse pas par ici : c'est la consigne d'en-tête et le test 15 qui le font.
do $$
declare
  v_corps text := (select prosrc from pg_proc where oid = 'public.export_my_data()'::regprocedure);
begin
  if position('identites_de_connexion' in v_corps) = 0
     or position('''sessions''' in v_corps) = 0
     or position('type_de_reponse' in v_corps) = 0 then
    raise exception 'export_my_data ne rend pas les identités, les sessions ou le type de réponse';
  end if;
  if has_function_privilege('anon', 'public.export_my_data()', 'execute') then
    raise exception 'anon peut appeler export_my_data';
  end if;
end;
$$;
