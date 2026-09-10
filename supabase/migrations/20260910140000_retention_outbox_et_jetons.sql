-- Rétention de la boîte d'envoi et des jetons d'appareil désactivés.
-- Chantier C0.6 du plan v1-13 (docs/architecture/v1-13-audit-et-chantiers.md §3),
-- constats A9-2, C-11, A9-5.
--
-- CE QUI EST EN JEU. `notification_outbox` garde indéfiniment l'adresse, le sujet et le corps
-- de chaque rappel parti : c'est la table du produit qui accumule le plus de données
-- nominatives sans qu'aucune durée de conservation ne soit annoncée (RGPD art. 5-1-e), et la
-- seule dont le contenu est un message adressé à une personne. `push_tokens`, de son côté,
-- marque `disabled_at` et ne supprimait **jamais** une ligne — alors que /confidentialite
-- affirmait que l'identifiant du téléphone « disparaît si tu coupes les notifications ».
-- La page est corrigée dans le même chantier ; ici on rend la phrase vraie.
--
-- POURQUOI DEUX DURÉES DIFFÉRENTES.
--   * Six mois pour la boîte d'envoi : c'est la fenêtre où un message parti peut encore
--     servir à diagnostiquer un non-reçu (plainte « je n'ai rien eu », `last_error`,
--     `provider_ticket`). Au-delà, la ligne ne sert plus à rien et ne porte que du texte
--     nominatif.
--   * Quatre-vingt-dix jours pour un jeton désactivé : la même durée que la purge des
--     sessions anonymes. On ne supprime pas tout de suite parce que la désactivation est
--     réversible — rouvrir les notifications dans les réglages du téléphone fait repartir le
--     push sur la **même** ligne (`register_push_token` la reprend). Passé trois mois, un
--     jeton Expo désactivé ne redeviendra pas valide.
--
-- CE QU'ELLE NE FAIT JAMAIS. Toucher une ligne `pending`. Un rappel en attente l'est parce
-- que l'envoi n'a pas encore eu lieu — les secrets Vault absents suffisent à ce qu'une file
-- entière attende des mois (v1-07 §3.1) — et le supprimer ferait disparaître un message que
-- `unique(checkin_id)` empêche de remettre en file : le point de suivi ne serait jamais
-- rappelé, sans trace. D'où l'énumération explicite des trois statuts terminaux
-- (`sent`, `cancelled`, `failed`) plutôt qu'un `status <> 'pending'`, qui avalerait en
-- silence tout statut ajouté plus tard.

create or replace function public.purge_notification_outbox()
returns void
language sql
security definer
set search_path = public
as $$
  -- L'ancienneté se compte depuis la mise en file et non depuis `sent_at` : une ligne
  -- `cancelled` ou `failed` n'a pas de date d'envoi, et `send_after` ne décale l'envoi que de
  -- quatre jours au plus (étalement du pic du lundi, v1-10 §2.B) — négligeable sur six mois.
  delete from public.notification_outbox
  where status in ('sent', 'cancelled', 'failed')
    and created_at < now() - interval '6 months';

  delete from public.push_tokens
  where disabled_at < now() - interval '90 days';
$$;

comment on function public.purge_notification_outbox() is
  'Rétention : supprime les rappels terminés (sent, cancelled, failed) de plus de six mois et les jetons d''appareil désactivés depuis plus de 90 jours. Ne touche jamais une ligne pending — un rappel en attente peut attendre des mois si les secrets d''envoi manquent, et unique(checkin_id) interdit de le remettre en file.';

-- `revoke ... from anon, authenticated` ne révoque rien : PostgreSQL accorde EXECUTE à PUBLIC
-- à la création et les deux rôles en héritent (v1-08 §5.2). Il faut nommer `public`.
revoke execute on function public.purge_notification_outbox() from public, anon, authenticated;

-- 2h UTC, parce que c'est la seule heure libre de la nuit : les autres passages occupent 3h30
-- (purge des repères de parcours), 4h (purge des sessions anonymes), 5h (génération des plans),
-- 6h (génération des points de suivi), 7h (envoi des rappels) et 8h (collecte des reçus push).
-- La purge ne dépend d'aucun de ces passages — elle ne regarde que des lignes vieilles de six
-- mois — donc seule compte l'absence de chevauchement, sur une base où un seul `pg_cron`
-- exécute tout.
select cron.schedule(
  'purge-notification-outbox',
  '0 2 * * *',
  $$select public.purge_notification_outbox()$$
);

-- ── L'export ───────────────────────────────────────────────────────────────────────────
-- `export_my_data` **énumère** ses tables, et `notification_outbox` était la seule rattachée
-- à `profiles` qui n'y figurait pas : un export silencieusement incomplet (RGPD art. 15).
-- Recréée à l'identique de 20260907230000_rappels_canal.sql, clé `rappels_envoyes` en plus.
--
-- On rend le fait et non le texte : la période concernée, le canal, le statut et la date
-- d'envoi. Le sujet et le corps sont un message type, identique pour tout le monde à la
-- période près — les recopier gonflerait l'export sans rien apprendre à personne, alors que
-- la question à laquelle la personne peut vouloir répondre (« m'avez-vous écrit, quand, et
-- par où ? ») est exactement celle-là.
--
-- `security definer` reste obligatoire, et pour la raison d'origine : `usage_events` n'a
-- aucune policy de lecture (v1-08 §4), donc une fonction en `security invoker` rendrait un
-- export incomplet sans lever la moindre erreur. Chaque requête est bornée à `auth.uid()`.
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
        'canal_de_rappel', p.reminder_channel
      )
      from auth.users u join public.profiles p on p.id = u.id
      where u.id = v_user_id
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
    'rappels_envoyes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'periode', c.period_label,
        'canal', o.channel,
        'statut', o.status,
        'envoye_le', o.sent_at
      ) order by o.created_at), '[]'::jsonb)
      from public.notification_outbox o
      join public.engagement_checkins c on c.id = o.checkin_id
      where o.user_id = v_user_id
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
