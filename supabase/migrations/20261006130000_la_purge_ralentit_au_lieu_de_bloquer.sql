-- La garde de volume de la purge ralentit au lieu de bloquer (seconde passe de sécurité,
-- `v1-27` §12.39, décision de la personne qui pilote du 05/10/2026).
--
-- **Le défaut, vérifié en local** : la garde retenait tous les comptes « porteurs » (un bilan
-- finalisé ou un retour) dès qu'ils dépassaient le seuil — `greatest(50, 20 %)` des porteurs. Un
-- tiers qui semait cinquante et un comptes porteurs (un retour de trois lettres suffit, sans
-- captcha) les retrouvait candidats quatre-vingt-dix jours plus tard, et la purge restait bloquée
-- nuit après nuit : de vrais comptes inactifs restaient au-delà des 90 jours que promet la page de
-- confidentialité, et l'alerte sonnait `blocked` chaque matin. Mesuré : 51 comptes de ce genre, une
-- vraie personne inactive depuis cent jours portant un bilan — passage `blocked`, elle reste.
--
-- **Le correctif** : au-delà du seuil, la purge laisse partir les comptes vides **et les `v_seuil`
-- porteurs inactifs depuis le plus longtemps** ; les autres attendent le passage suivant. Un tiers
-- ne fait plus que retarder — de quelques nuits à quelques semaines selon le volume de sa rafale, le
-- seuil suivant 20 % des porteurs restants ; un défaut du prédicat d'inactivité, lui, coûterait
-- au plus `v_seuil` comptes par nuit au lieu de zéro — c'est le prix accepté, et l'alerte le dit à
-- chaque nuit où la garde se déclenche. Le journal garde `blocked`, qui veut désormais dire « garde
-- déclenchée, purge ralentie » : l'alerte, les vues et la contrainte de `purge_runs` n'ont pas à
-- changer. Les cohortes suivent sans retouche : elles se relèvent sur la même liste que le `delete`.
--
-- Réécrite depuis `pg_get_functiondef` du corps installé (identique en local et sur la production
-- au relevé du 05/10/2026, empreintes égales) — seuls la liste des porteurs qui partent, le
-- message et le détail du journal changent. `create or replace` garde l'ACL (le `revoke` de
-- `20260910100000` tient). Rejouable telle quelle.

create or replace function public.purge_stale_anonymous_accounts()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $$
declare
  -- Plancher absolu : en dessous, la garde ne se mêle de rien (justification en en-tête de
  -- `20260910100000_garde_volume_purge_anonyme.sql`).
  c_plancher constant integer := 50;
  c_part_max constant numeric := 0.20;

  v_candidats uuid[];
  v_vides uuid[];
  v_porteurs uuid[];
  v_porteurs_partants uuid[] := '{}'::uuid[];
  v_a_supprimer uuid[];
  v_nb_candidats integer;
  v_nb_porteurs integer;
  v_total integer;
  v_seuil integer;
  v_bloque boolean;
  v_supprimes integer := 0;
  v_echec_du_compte text;
begin
  -- **La garde ne compte que les comptes qui portent quelque chose** (plan anti-abus, 04/10/2026) :
  -- un bilan, ou un retour. Des milliers de sessions de robots, vides, gonflaient le dénominateur
  -- — donc desserraient la garde pour les vrais comptes — puis, inactives ensemble, la faisaient
  -- tomber pour tout le monde. Un compte vide ne perd rien à partir à tort : il n'a ni bilan, ni
  -- plan, ni point, ni retour, et la session suivante en ouvre un autre.
  --
  -- **Un bilan en cours ne porte rien** (passe avant le lancement, 05/10/2026) : une seule requête en
  -- crée un, et des comptes de robots qui en portaient chacun un déclenchaient la garde exprès, nuit
  -- après nuit, et retenaient les vrais comptes au-delà des 90 jours promis. Un bilan qui n'a jamais
  -- été finalisé n'a ni résultat ni plan : le compte part comme un compte vide.
  select count(*) into v_total
  from auth.users u
  where u.is_anonymous = true
    and (exists (select 1 from public.assessments a where a.user_id = u.id and a.status <> 'in_progress')
      or exists (select 1 from public.feedback f where f.user_id = u.id));

  -- Le prédicat d'inactivité, identique à celui de 20260907093000 : le plus récent des signes
  -- de vie gagne, et il faut que tous soient muets depuis 90 jours pour qu'un compte parte.
  -- `created_at` reste le plancher, pour qu'un compte créé hier sans aucun événement ne passe
  -- pas pour inactif depuis toujours.
  select coalesce(array_agg(u.id), '{}'::uuid[]) into v_candidats
  from auth.users u
  where u.is_anonymous = true
    and greatest(
      u.created_at,
      coalesce((select max(e.occurred_at) from public.usage_events e where e.user_id = u.id), u.created_at),
      coalesce((select max(a.submitted_at) from public.assessments a where a.user_id = u.id), u.created_at),
      coalesce((select max(a.created_at)   from public.assessments a where a.user_id = u.id), u.created_at),
      coalesce((select max(c.responded_at) from public.engagement_checkins c where c.user_id = u.id), u.created_at),
      coalesce((select max(f.created_at)   from public.feedback f where f.user_id = u.id), u.created_at)
    ) < now() - interval '90 days';

  v_nb_candidats := coalesce(array_length(v_candidats, 1), 0);

  select coalesce(array_agg(c.id) filter (where not c.porte), '{}'::uuid[]),
         coalesce(array_agg(c.id) filter (where c.porte), '{}'::uuid[])
    into v_vides, v_porteurs
  from (
    select candidat.id,
           exists (select 1 from public.assessments a where a.user_id = candidat.id and a.status <> 'in_progress')
             or exists (select 1 from public.feedback f where f.user_id = candidat.id) as porte
    from unnest(v_candidats) as candidat(id)
  ) c;

  v_nb_porteurs := coalesce(array_length(v_porteurs, 1), 0);
  v_seuil := greatest(c_plancher, ceil(v_total * c_part_max)::integer);
  v_bloque := v_nb_porteurs > v_seuil;

  -- **Au-delà du seuil, la garde ralentit la purge au lieu de la bloquer** (seconde passe de sécurité,
  -- décision de la personne qui pilote, 05/10/2026, `v1-27` §12.39). Bloquée, elle retenait tous les
  -- comptes porteurs : un tiers qui semait cinquante et un comptes porteurs vieillis de 90 jours la
  -- tenait fermée nuit après nuit, et de vrais comptes restaient au-delà des 90 jours promis. Ralentie,
  -- elle laisse partir les vides, plus les `v_seuil` porteurs inactifs depuis le plus longtemps ; les
  -- autres attendent le passage suivant. Un tiers ne fait plus que retarder ; un défaut du prédicat
  -- d'inactivité, lui, coûterait au plus `v_seuil` comptes par nuit, et l'alerte le dit chaque nuit
  -- (`blocked` veut désormais dire « garde déclenchée, purge ralentie »).
  if v_bloque then
    select coalesce(array_agg(x.id order by x.derniere, x.id), '{}'::uuid[]) into v_porteurs_partants
    from (
      select p.id,
             greatest(
               u.created_at,
               coalesce((select max(e.occurred_at) from public.usage_events e where e.user_id = u.id), u.created_at),
               coalesce((select max(a.submitted_at) from public.assessments a where a.user_id = u.id), u.created_at),
               coalesce((select max(a.created_at)   from public.assessments a where a.user_id = u.id), u.created_at),
               coalesce((select max(c.responded_at) from public.engagement_checkins c where c.user_id = u.id), u.created_at),
               coalesce((select max(f.created_at)   from public.feedback f where f.user_id = u.id), u.created_at)
             ) as derniere
      from unnest(v_porteurs) as p(id)
      join auth.users u on u.id = p.id
      order by derniere, p.id
      limit v_seuil
    ) x;
  end if;

  v_a_supprimer := case when v_bloque then v_vides || v_porteurs_partants else v_candidats end;

  if v_bloque then
    raise warning 'purge_stale_anonymous_accounts : garde de volume déclenchée (% comptes porteurs candidats sur %, seuil %), purge ralentie : % porteurs les plus anciennement inactifs et % vides supprimés.',
      v_nb_porteurs, v_total, v_seuil, coalesce(array_length(v_porteurs_partants, 1), 0), coalesce(array_length(v_vides, 1), 0);
  end if;

  -- Les cohortes, AVANT la suppression : après, la cascade a emporté tout ce qui les décrit.
  -- Même liste d'identifiants que le `delete` qui suit. **Dans une sous-transaction** : si ce
  -- compte échoue, lui seul est annulé, et la suppression promise a lieu quand même (en-tête).
  begin
    insert into public.purges_par_cohorte (semaine_d_arrivee, etape, semaines_tenues, rappels_au_depart, comptes)
    select c.semaine_d_arrivee, c.etape, c.semaines_tenues, c.rappels_au_depart, count(*)::integer
    from unnest(v_a_supprimer) as candidat(id)
    cross join lateral public.cohorte_de(candidat.id) c
    group by c.semaine_d_arrivee, c.etape, c.semaines_tenues, c.rappels_au_depart
    on conflict (semaine_d_arrivee, etape, semaines_tenues, rappels_au_depart)
    do update set comptes = public.purges_par_cohorte.comptes + excluded.comptes;
  exception when others then
    v_echec_du_compte := format('Compteur des cohortes en échec, suppression faite quand même : %s (%s)',
                                sqlerrm, sqlstate);
    raise warning 'purge_stale_anonymous_accounts : %', v_echec_du_compte;
  end;

  -- Suppression par identifiants relevés juste au-dessus : la liste et le compte journalisé
  -- décrivent forcément les mêmes lignes, ce qu'un second passage du prédicat ne garantirait
  -- pas.
  delete from auth.users u
  where u.id = any(v_a_supprimer);

  get diagnostics v_supprimes = row_count;

  if v_bloque then
    insert into public.purge_runs (status, candidates, deleted, detail)
    values (
      'blocked',
      v_nb_candidats,
      v_supprimes,
      concat_ws(' — ',
        format(
          'Garde de volume : %s comptes anonymes porteurs (un bilan finalisé ou un retour) candidats sur %s, au-delà du seuil de %s (20 %%, plancher %s). Purge ralentie : les %s porteurs les plus anciennement inactifs sont partis avec les %s comptes vides, %s attendent le passage suivant — vérifier le prédicat d''inactivité si la garde se déclenche plusieurs nuits de suite.',
          v_nb_porteurs, v_total, v_seuil, c_plancher,
          coalesce(array_length(v_porteurs_partants, 1), 0),
          coalesce(array_length(v_vides, 1), 0),
          v_nb_porteurs - coalesce(array_length(v_porteurs_partants, 1), 0)
        ),
        v_echec_du_compte
      )
    );
  else
    insert into public.purge_runs (status, candidates, deleted, detail)
    values ('applied', v_nb_candidats, v_supprimes, v_echec_du_compte);
  end if;
end;
$$;

-- L'alerte d'exploitation disait « Purges des sessions anonymes bloquées » (contre-lecture du
-- 05/10/2026) : le mécanisme ne change pas — `releve_des_alertes` compte toujours les lignes
-- `blocked` —, mais le mot faisait lire « rien n'est parti, on a le temps », alors qu'un passage
-- `blocked` emporte désormais jusqu'au seuil de comptes porteurs. Dans le cas que la garde couvre, un
-- prédicat d'inactivité fautif, c'est exactement la phrase qu'il ne fallait pas. Réécrite depuis
-- `pg_get_functiondef` du corps installé (`20261005170000`) : seule cette ligne change.
create or replace function public.texte_de_l_alerte(p_releve jsonb, p_depuis timestamp with time zone, p_rappels_bloques_vus integer)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $$
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
$$;

-- `create or replace` garde le commentaire d'un objet, qui décrivait la garde qui retient.
comment on table public.purge_runs is
  'Journal des passages de purge_stale_anonymous_accounts(). status = blocked : la garde de volume '
  's''est déclenchée — depuis 20261006130000 elle ralentit au lieu de bloquer : deleted compte les '
  'comptes vides et les porteurs les plus anciennement inactifs partis (jusqu''au seuil), les autres '
  'attendent le passage suivant. Écrit par le serveur, jamais lu par un client.';

comment on function public.purge_stale_anonymous_accounts() is
  'Supprime les sessions anonymes muettes depuis 90 jours. La garde de volume (20 %, plancher 50) ne '
  'compte que les comptes qui portent un bilan finalisé ou un retour : au-delà du seuil, elle ralentit '
  '(depuis 20261006130000) — partent les vides et les porteurs les plus anciennement inactifs, jusqu''au '
  'seuil, les autres la nuit suivante. Compte les cohortes avant de supprimer, et journalise chaque '
  'passage dans purge_runs.';
