-- C3.8 §6 — ce que le plan propose, et ce que les gens en retiennent.
--
-- **La question que rien ne permettait de poser.** `analytics.engagement_by_segment` compte les
-- **points** — répondus, expirés, « oui », « sans objet » —, c'est-à-dire ce qui se passe *après*
-- l'engagement. Rien ne disait ce qui se passe avant : quels gabarits sont proposés, lesquels sont
-- choisis, et sous quelle forme d'intention. Or c'est exactement ce que C3.8 vient de changer —
-- quatre gabarits ajoutés, deux filtres posés, un libellé réécrit — et sans cette vue, l'effet de
-- ces décisions ne se lit nulle part.
--
-- **Une proposition et un engagement ne sont pas la même ligne comptée deux fois.** Le taux qui
-- intéresse est `engages / proposes` par gabarit : un levier proposé cent fois et jamais choisi
-- n'est pas un levier, c'est du bruit dans une liste que C4.6 a justement rallongée.
--
-- **Les engagements relâchés sont comptés à part, et il le faut** : `commit_plan_action` libère
-- l'engagement précédent (C2.2), donc `plan_actions.committed_at` ne porte que celui qui tient
-- **en ce moment**. Compter sur cette seule colonne ferait disparaître de la statistique tout
-- gabarit qu'on a choisi puis quitté — c'est-à-dire précisément celui qui n'a pas tenu, qui est
-- l'information la plus utile des deux.
--
-- Comme les autres vues d'analyse, elle est révoquée des deux rôles clients : elle croise des
-- segments et des choix personnels, et aucune policy ne s'applique à une vue.

create or replace view analytics.engagement_action_by_segment as
with proposees as (
  select
    pc.user_id,
    pa.action_template_id,
    pa.committed_at,
    pa.intention_days,
    pa.intention_timing
  from public.plan_actions pa
  join public.plan_cycles pc on pc.id = pa.plan_cycle_id
),
relachees as (
  select action_template_id, count(*) as n
  from public.plan_action_commitments_archive
  group by 1
)
select
  s.zone_type,
  s.tc_access,
  s.dominant_poste,
  t.poste as action_poste,
  t.action_text,
  count(*) as proposees,
  count(*) filter (where p.committed_at is not null) as engagees,
  count(*) filter (where p.intention_days is not null) as intentions_en_jours,
  count(*) filter (where p.intention_timing is not null) as intentions_en_echeance,
  -- Hors segment : l'archive ne porte pas de quoi retrouver le segment du moment, et le segment
  -- d'aujourd'hui n'est pas celui d'alors. Le chiffre est donc identique sur toutes les lignes d'un
  -- même gabarit, et c'est ce qu'il dit — combien de fois ce gabarit a été quitté, tous profils
  -- confondus.
  coalesce(max(r.n), 0) as relachees_tous_segments
from proposees p
join public.action_templates t on t.id = p.action_template_id
join analytics.user_segments s on s.user_id = p.user_id
left join relachees r on r.action_template_id = p.action_template_id
group by 1, 2, 3, 4, 5;

revoke all on analytics.engagement_action_by_segment from anon, authenticated;

comment on view analytics.engagement_action_by_segment is
  'C3.8 §6 — par segment et par gabarit : combien de fois proposé, combien de fois engagé, sous quelle forme d''intention. Les engagements relâchés sont comptés hors segment (l''archive ne porte pas celui du moment).';

do $$
begin
  if has_table_privilege('anon', 'analytics.engagement_action_by_segment', 'select')
     or has_table_privilege('authenticated', 'analytics.engagement_action_by_segment', 'select') then
    raise exception 'La vue d''analyse est lisible par un rôle client : aucune policy ne protège une vue.';
  end if;
end;
$$;
