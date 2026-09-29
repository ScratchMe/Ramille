-- Les vues de l'administration : l'entonnoir, la rétention par cohorte, les états des rappels, les
-- départs
--
-- Lot 6, seconde brique (décisions du 27/09/2026, `docs/architecture/produit.md` §3). La première,
-- `20260927230611_les_cohortes_avant_la_purge.sql`, garde ce que la purge et la suppression de
-- compte effacent ; celle-ci rend lisible ce que la base porte déjà.
--
-- ## Ce qui a été décidé, et que ce fichier ne redécide pas
--
-- - **La surface vit dans le tableau de bord Supabase** : des vues `analytics.*` prêtes à lire, une
--   par indicateur — l'entonnoir, la rétention par cohorte, les régimes de rappel, les départs. Aucune
--   authentification à construire, rien à justifier devant Play, rien qui puisse passer pour un écran
--   de Ramille.
-- - **Le churn est le barreau `silence` de `regime_de_rappel`** : actif = `normal`, en décrochage =
--   `espace`, parti = `silence`. **Par personne, la boucle hebdomadaire quand elle existe**, puisque
--   c'est le rythme de l'app. Qui n'a pas de boucle n'a pas de régime : son seul départ lisible est la
--   purge. Aucune définition n'est écrite à côté de cette échelle.
-- - **Le vocabulaire est celui du glossaire de Tour de Growth** (`tourdegrowth.com/fr/glossary`,
--   relu le 29/09/2026), pour que les chiffres d'ici se comparent à ceux d'ailleurs. Deux de ses
--   règles décident de la forme des vues, et sont écrites à l'endroit où elles s'appliquent : une
--   rétention se lit **par cohorte, à âge égal** (« l'âge, pas la date »), et son dénominateur est
--   **toute la cohorte d'arrivée**, y compris ceux partis au bout de trente secondes.
--
-- ## Ce qui n'est PAS ici, et pourquoi
--
-- - **Aucun taux d'activation.** Le glossaire le définit par un moment « aha » et une fenêtre, qui
--   se **trouvent** en regardant ce que les personnes restées ont fait tôt — une décision de produit,
--   et à nos volumes une corrélation sur quelques dizaines de comptes. L'entonnoir donne les étapes ;
--   l'activation se décidera dessus, le jour où il y aura de quoi comparer.
-- - **Aucun taux de churn par mois.** Le glossaire le divise par l'effectif **au début** de la
--   période ; reconstruire l'état des rappels de chaque compte à une date passée demanderait de
--   rejouer le régime sur l'historique des points, et un retour (un signe de vie après le silence)
--   efface l'épisode — le dénominateur ne serait pas exact. La vue des départs donne des comptes, pas
--   des taux, et le dit.
-- - **Aucun segment** (zone, poste dominant) : la décision du 27/09/2026 les réserve à un volume où
--   une ligne n'est pas une personne. Ces vues calculent sur les comptes vivants, qu'une suppression
--   efface aussi ; ce n'est donc pas la raison de confidentialité des compteurs, c'est la même règle
--   de lecture.
--
-- ## Une seule dérivation pour chaque notion
--
-- - l'étape la plus loin et les semaines tenues : `public.cohorte_de`, celle des compteurs de la purge
--   — donc un compte vivant et un compte purgé de la même semaine d'arrivée s'additionnent ;
-- - le signe de vie : `public.dernier_signe_de_vie`. La rétention le lit **semaine par semaine**, ce
--   qu'un `max` ne sait pas faire : elle en recopie donc les deux sources (un `app_open`, le début de
--   période d'un point répondu), et les deux se nomment l'une l'autre — le commentaire de la fonction
--   et celui de la vue. Une source ajoutée à l'une se reporte dans l'autre ;
-- - le régime : `public.regime_de_rappel`, sur la boucle que rend `public.boucle_de_la_personne` —
--   la seule fonction neuve de ce fichier, parce que la règle « la boucle hebdomadaire quand elle
--   existe » est lue par deux vues.
--
-- **Une différence à connaître, et elle est voulue** : `cohortes_purgees.rappels_*` retient le plus
-- avancé des DEUX boucles — ce que le produit faisait à cette personne au moment de la supprimer —,
-- les vues d'ici la seule boucle qui tourne encore (la définition du churn). Les deux diffèrent quand
-- une boucle s'est arrêtée ou quand l'une est plus avancée que l'autre ; comme une ouverture de l'app
-- compte pour les deux boucles, le second cas est rare.
--
-- **Qui peut les lire.** Toutes les vues sont **sans `security_invoker`**, comme les autres
-- d'`analytics` : leurs tables (`auth.users`, des tables en RLS sans policy) sont lues avec les droits
-- de leur propriétaire. **Mais pas leurs fonctions** : une fonction appelée par une vue s'exécute avec
-- les droits de celui qui lit la vue, et `cohorte_de`, `regime_de_rappel` ou `boucle_de_la_personne`
-- sont révoquées de tous les rôles du client. Seul `postgres` — le tableau de bord — les lit donc en
-- entier ; un rôle de lecture créé un jour pour un outil tiers lirait la rétention et buterait sur
-- les trois autres, ce qui est le bon sens de l'échec. Chaque vue porte son propre `revoke` (le
-- `revoke all on all tables in schema analytics` des migrations passées ne couvre que ce qui existait
-- à leur date).

-- ── 0. Le signe de vie ne dépend plus du fuseau de la session ─────────────────────────────────────
--
-- Réécrite depuis `pg_get_functiondef` sur le distant (29/09/2026, identique au dépôt), pour un seul
-- changement : le début d'une période répondue devient un instant **en UTC**. `period_start` est une
-- `date` ; `::timestamptz` la plaçait à minuit **dans le fuseau de la session** — en UTC pour les
-- crons, la CI et le tableau de bord, mais à 23 h UTC la veille sous `Europe/Paris`. Relevé par la
-- contre-lecture du 29/09/2026 sur la vue des départs : un point mensuel commence un 1er, donc un
-- départ daté par lui changeait de mois selon la session qui lisait. `cohorte_de` écrivait déjà son
-- lundi en UTC pour la même raison. **Rien ne change sous une session en UTC**, c'est-à-dire pour
-- `regime_de_rappel` tel qu'il tourne.
create or replace function public.dernier_signe_de_vie(p_user_id uuid, p_loop_type text)
returns timestamptz
language sql
stable
set search_path to 'public'
as $function$
  select greatest(
    (select max(c.period_start)::timestamp at time zone 'UTC'
       from public.engagement_checkins c
      where c.user_id = p_user_id and c.loop_type = p_loop_type and c.status = 'answered'),
    (select max(e.occurred_at)
       from public.usage_events e
      where e.user_id = p_user_id and e.name = 'app_open')
  );
$function$;

revoke execute on function public.dernier_signe_de_vie(uuid, text) from public, anon, authenticated;

comment on function public.dernier_signe_de_vie(uuid, text) is
  'Le dernier signe de vie d''un compte pour une boucle : le plus récent du début de période (minuit '
  'UTC) d''un point répondu de cette boucle et d''un app_open. Lu par regime_de_rappel (C2.9) et par '
  'les cohortes de la purge (lot 6). analytics.retention_par_cohorte en relit les deux sources semaine '
  'par semaine : une source ajoutée ici s''y ajoute aussi.';

-- ── 1. La boucle sur laquelle se lit le churn d'une personne ────────────────────────────────────
--
-- « La boucle hebdomadaire quand elle existe » — **qui existe, pas qui a existé** : `commute` si la
-- boucle hebdomadaire tourne encore, sinon `extras` si la mensuelle tourne, sinon rien — pas de
-- boucle, pas de régime.
--
-- **« Tourne encore » se lit sur le dernier point posé.** Chaque lundi, le générateur hebdomadaire
-- pose le point de la semaine écoulée ; quand la boucle tourne, son dernier point commence donc au
-- plus tard sept jours avant le lundi courant. On tolère deux passages manqués (vingt et un jours) :
-- un cron en panne une semaine ne doit pas faire changer tout le monde de boucle. Même règle au mois
-- — le 1er, le point du mois écoulé —, avec trois mois. Lire « a existé » à la place figeait le
-- régime de quiconque avait arrêté sa boucle : plus aucun point clos, donc `normal` pour toujours,
-- compté actif et jamais parti (contre-lecture du 29/09/2026).
--
-- **Ce que ça laisse de côté, et c'est la décision du 27/09/2026 appliquée** : qui n'a plus aucune
-- boucle qui tourne — son seul bilan retiré (C4.7), ou un bilan sans aucun trajet — n'a plus de
-- régime. Il sort des états des rappels et des départs ; une session anonyme finit dans la purge, un
-- compte rattaché ne se lit nulle part comme parti.
--
-- `security invoker`, révoquée du client : voir l'en-tête, « Qui peut les lire ».
create or replace function public.boucle_de_la_personne(p_user_id uuid)
returns text
language sql
stable
set search_path to 'public'
as $function$
  select case
    when exists (select 1 from public.engagement_checkins c
                 where c.user_id = p_user_id and c.loop_type = 'commute'
                   and c.period_start >= date_trunc('week', now() at time zone 'UTC')::date - 21) then 'commute'
    when exists (select 1 from public.engagement_checkins c
                 where c.user_id = p_user_id and c.loop_type = 'extras'
                   and c.period_start >= (date_trunc('month', now() at time zone 'UTC') - interval '3 months')::date)
      then 'extras'
  end;
$function$;

revoke execute on function public.boucle_de_la_personne(uuid) from public, anon, authenticated;

comment on function public.boucle_de_la_personne(uuid) is
  'La boucle sur laquelle se lit le churn d''une personne (décision du 27/09/2026) : commute si la '
  'boucle hebdomadaire tourne encore (un point posé depuis le lundi d''il y a trois semaines), sinon '
  'extras si la mensuelle tourne (depuis le 1er d''il y a trois mois), sinon null — pas de régime.';

-- ── 2. L'entonnoir, par semaine d'arrivée ───────────────────────────────────────────────────────
--
-- Les comptes vivants (`cohorte_de`, lue maintenant) et les comptes purgés (`purges_par_cohorte`,
-- lus au moment de leur purge) **s'additionnent** : même dérivation, mêmes colonnes. `arrivees` est
-- donc toute la semaine d'arrivée, et c'est le dénominateur des deux parts.
--
-- Les étapes sont **exclusives** — chaque compte compte une fois, à l'étape la plus loin atteinte
-- dans l'ordre —, comme dans `cohortes_purgees`. Deux parts seulement, parce que ce sont les deux
-- seules qu'on puisse cumuler exactement : **toute étape après `a_ouvert` suppose un bilan soumis**
-- (un engagement se prend sur un plan, un point se pose sur un bilan), donc « a soumis un bilan »
-- somme les trois dernières colonnes ; et « a répondu » est la dernière. « S'est engagée » ne se
-- cumule pas : `a_repondu` compte aussi qui a répondu au point générique sans s'être engagé.
-- Les parts sont en pour cent, à une décimale.
create or replace view analytics.entonnoir_par_cohorte as
with vivants as (
  select c.semaine_d_arrivee, c.etape, count(*)::integer as comptes, 0 as purges
  from auth.users u
  cross join lateral public.cohorte_de(u.id) c
  group by c.semaine_d_arrivee, c.etape
),
purges as (
  select p.semaine_d_arrivee, p.etape, sum(p.comptes)::integer as comptes, sum(p.comptes)::integer as purges
  from public.purges_par_cohorte p
  group by p.semaine_d_arrivee, p.etape
),
tous as (
  select * from vivants
  union all
  select * from purges
),
par_semaine as (
  select
    t.semaine_d_arrivee,
    sum(t.comptes)::integer as arrivees,
    sum(t.purges)::integer as dont_purgees,
    coalesce(sum(t.comptes) filter (where t.etape = 'a_ouvert'), 0)::integer as etape_a_ouvert,
    coalesce(sum(t.comptes) filter (where t.etape = 'a_soumis_un_bilan'), 0)::integer as etape_a_soumis_un_bilan,
    coalesce(sum(t.comptes) filter (where t.etape = 's_est_engagee'), 0)::integer as etape_s_est_engagee,
    coalesce(sum(t.comptes) filter (where t.etape = 'a_repondu'), 0)::integer as etape_a_repondu
  from tous t
  group by t.semaine_d_arrivee
)
select
  s.*,
  round(100.0 * (s.etape_a_soumis_un_bilan + s.etape_s_est_engagee + s.etape_a_repondu) / s.arrivees, 1)
    as part_bilan_soumis,
  round(100.0 * s.etape_a_repondu / s.arrivees, 1) as part_a_repondu
from par_semaine s;

comment on view analytics.entonnoir_par_cohorte is
  'Par semaine d''arrivée (lundi UTC) : toute la cohorte — comptes vivants et comptes purgés —, '
  'rangée à l''étape la plus loin atteinte (colonnes exclusives, qui somment à arrivees), et deux '
  'parts cumulées en pour cent : a soumis un bilan, a répondu à un point. Aucun taux d''activation : '
  'il demande un moment « aha » qui n''est pas décidé.';

revoke all privileges on table analytics.entonnoir_par_cohorte from public, anon, authenticated;

-- ── 3. La rétention, par cohorte et par âge ─────────────────────────────────────────────────────
--
-- Une ligne par semaine d'arrivée et par **semaine d'âge** (0 = la semaine d'arrivée, calendrier du
-- lundi UTC) : « l'âge, pas la date » — c'est ce qui rend deux cohortes comparables. Seules les
-- semaines **révolues** figurent : la semaine en cours, à moitié vécue, ferait croire à une chute.
--
-- **Actif une semaine** veut dire : un signe de vie cette semaine-là, avec les deux sources de
-- `dernier_signe_de_vie` — un `app_open`, ou le début de période d'un point répondu. C'est la seule
-- définition du produit, et le glossaire exige qu'elle soit écrite une fois et ne change pas ; elle
-- est **recopiée** ici parce qu'un `max` ne se lit pas semaine par semaine, et les deux se nomment en
-- commentaire (section 0) : une source ajoutée à la fonction s'ajoute ici.
-- **A répondu une semaine** est l'action pour laquelle la boucle existe, lue sur `responded_at` : le
-- glossaire appelle « la version utile » ce que « la connexion », la plus faible, ne dit pas.
--
-- **Le dénominateur est toute la cohorte d'arrivée**, comptes purgés compris : sans eux, une cohorte
-- dont les sessions muettes ont été purgées paraîtrait plus fidèle en vieillissant — le seau se
-- viderait par le fond sans que la courbe le montre. Un compte purgé ne compte jamais comme actif,
-- puisque son activité a été effacée avec lui. C'est exact au-delà de ses semaines tenues, et
-- **seulement là** : `borne_basse` le dit, par la plus haute tranche de semaines tenues de la cohorte
-- (+ 1 : une semaine tenue compte depuis la création, une semaine d'âge depuis le lundi). Elle le dit
-- aussi d'une semaine vieille de plus de douze mois, dont les `app_open` sont purgés
-- (`purge_usage_events`).
--
-- **Ce que le dénominateur perd quand même** : un compte supprimé par `delete_my_account` sort de
-- `auth.users`, et `suppressions_de_compte_par_mois` ne garde que son mois de suppression, pas sa
-- semaine d'arrivée — il disparaît donc de sa cohorte, numérateur et dénominateur. C'est rare, et le
-- compter demanderait de garder la semaine d'arrivée des suppressions : une décision sur ce qu'on
-- garde, pas sur ce qu'on lit.
--
-- **Agrégé une fois, puis joint** : les signes de vie sont comptés par (semaine d'arrivée, semaine)
-- avant de rencontrer les semaines d'âge. La première version les recomptait pour chaque ligne en
-- relisant `usage_events` entier — quinze secondes pour trois cents comptes sur un an, mesuré par la
-- contre-lecture du 29/09/2026 —, et son coût croissait avec le nombre de semaines, pas de comptes.
create or replace view analytics.retention_par_cohorte as
with
maintenant as (
  select
    date_trunc('week', now() at time zone 'UTC')::date as lundi,
    (now() at time zone 'UTC' - interval '12 months')::date as limite_des_evenements
),
arrivees as (
  select u.id, date_trunc('week', u.created_at at time zone 'UTC')::date as semaine_d_arrivee
  from auth.users u
),
purges as (
  select
    p.semaine_d_arrivee,
    sum(p.comptes)::integer as purges,
    -- La plus haute semaine d'âge où un compte purgé a pu être actif : la borne haute de sa tranche,
    -- plus une. `13+` n'a pas de borne : jamais exacte.
    max(case p.semaines_tenues
          when '0' then 1 when '1' then 2 when '2-3' then 4 when '4-7' then 8 when '8-12' then 13
          else 2147483647
        end) as derniere_semaine_incertaine
  from public.purges_par_cohorte p
  group by p.semaine_d_arrivee
),
cohortes as (
  select
    coalesce(v.semaine_d_arrivee, p.semaine_d_arrivee) as semaine_d_arrivee,
    (coalesce(v.vivants, 0) + coalesce(p.purges, 0))::integer as arrivees,
    p.derniere_semaine_incertaine
  from (select semaine_d_arrivee, count(*)::integer as vivants from arrivees group by semaine_d_arrivee) v
  full join purges p on p.semaine_d_arrivee = v.semaine_d_arrivee
),
-- La jumelle de `dernier_signe_de_vie` : ses deux sources, une ligne par compte et par semaine.
signes_de_vie as (
  select e.user_id, date_trunc('week', e.occurred_at at time zone 'UTC')::date as semaine
  from public.usage_events e
  where e.name = 'app_open'
  union
  select c.user_id, date_trunc('week', c.period_start::timestamp)::date
  from public.engagement_checkins c
  where c.status = 'answered'
),
reponses as (
  select distinct c.user_id, date_trunc('week', c.responded_at at time zone 'UTC')::date as semaine
  from public.engagement_checkins c
  where c.status = 'answered' and c.responded_at is not null
),
-- Les deux `union` / `distinct` ci-dessus rendent une ligne par compte et par semaine : un `count(*)`
-- y compte donc des comptes, pas des événements.
actifs_par_semaine as (
  select a.semaine_d_arrivee, s.semaine, count(*)::integer as actifs
  from signes_de_vie s
  join arrivees a on a.id = s.user_id
  group by a.semaine_d_arrivee, s.semaine
),
reponses_par_semaine as (
  select a.semaine_d_arrivee, r.semaine, count(*)::integer as ont_repondu
  from reponses r
  join arrivees a on a.id = r.user_id
  group by a.semaine_d_arrivee, r.semaine
)
select
  c.semaine_d_arrivee,
  n.age as semaine_d_age,
  c.arrivees,
  coalesce(x.actifs, 0) as actifs,
  round(100.0 * coalesce(x.actifs, 0) / c.arrivees, 1) as part_actifs,
  coalesce(r.ont_repondu, 0) as ont_repondu,
  round(100.0 * coalesce(r.ont_repondu, 0) / c.arrivees, 1) as part_ont_repondu,
  (n.age <= coalesce(c.derniere_semaine_incertaine, -1)
   or c.semaine_d_arrivee + 7 * n.age < m.limite_des_evenements) as borne_basse
from cohortes c
cross join maintenant m
cross join lateral generate_series(0, (m.lundi - c.semaine_d_arrivee) / 7 - 1) as n(age)
left join actifs_par_semaine x
  on x.semaine_d_arrivee = c.semaine_d_arrivee and x.semaine = c.semaine_d_arrivee + 7 * n.age
left join reponses_par_semaine r
  on r.semaine_d_arrivee = c.semaine_d_arrivee and r.semaine = c.semaine_d_arrivee + 7 * n.age;

comment on view analytics.retention_par_cohorte is
  'Par semaine d''arrivée et semaine d''âge révolue (0 = la semaine d''arrivée) : combien de la '
  'cohorte ont donné un signe de vie (app_open ou point répondu, la définition de '
  'dernier_signe_de_vie), combien ont répondu à un point, en nombre et en pour cent de TOUTE la '
  'cohorte d''arrivée, purgés compris (les comptes supprimés en sortent). borne_basse : les purgés '
  'ou la purge des événements à douze mois peuvent avoir effacé de l''activité cette semaine-là. '
  'Jumelle de dernier_signe_de_vie, dont elle relit les deux sources semaine par semaine.';

revoke all privileges on table analytics.retention_par_cohorte from public, anon, authenticated;

-- ── 4. Les régimes de rappel, aujourd'hui ───────────────────────────────────────────────────────
--
-- Une ligne par boucle retenue (`boucle_de_la_personne`) : combien de comptes vivants y sont
-- actifs, en décrochage, partis. Qui n'a pas de boucle qui tourne n'y figure pas — l'entonnoir le
-- compte à son étape, quelle qu'elle soit. Les trois colonnes somment à `comptes` tant que
-- `regime_de_rappel` ne rend que ses trois valeurs, ce que `37_vues_de_l_administration` épingle.
create or replace view analytics.regimes_de_rappel as
select
  b.boucle,
  count(*)::integer as comptes,
  count(*) filter (where r.regime = 'normal')::integer as actifs,
  count(*) filter (where r.regime = 'espace')::integer as en_decrochage,
  count(*) filter (where r.regime = 'silence')::integer as partis,
  round(100.0 * count(*) filter (where r.regime = 'silence') / count(*), 1) as part_partis
from auth.users u
cross join lateral (select public.boucle_de_la_personne(u.id) as boucle) b
cross join lateral (select public.regime_de_rappel(u.id, b.boucle) as regime) r
where b.boucle is not null
group by b.boucle;

comment on view analytics.regimes_de_rappel is
  'Les comptes vivants dont une boucle tourne, par boucle retenue (l''hebdomadaire quand elle '
  'tourne) : actifs (normal), en décrochage (espace), partis (silence) — le churn décidé le '
  '27/09/2026. Un instantané : l''état de chaque compte aujourd''hui.';

revoke all privileges on table analytics.regimes_de_rappel from public, anon, authenticated;

-- ── 5. Les départs, par mois ────────────────────────────────────────────────────────────────────
--
-- Trois départs, chacun daté par ce qui le date vraiment :
--
-- - **`partis_en_silence`** : les comptes vivants dont le régime est `silence`, rangés au mois de
--   leur **dernier signe de vie** — celui-là même que `regime_de_rappel` lit, sur la boucle retenue.
--   Le glossaire date un départ par la fin de l'usage, pas par le moment où on le constate ;
-- - **`sessions_purgees`** : au mois de la purge (`purge_runs`, passages appliqués). **Un zéro ne
--   prouve rien seul** : il vaut aussi pour un mois qui n'est là que par une autre colonne. Il se lit
--   avec `passages_de_purge` (combien de passages appliqués ce mois-là : zéro, la purge n'a pas
--   tourné) et `passages_bloques` (la garde de volume a arrêté la purge — l'alerte de §8.5 du
--   registre d'exploitation), écrits pour ça (contre-lecture du 29/09/2026) ;
-- - **`comptes_supprimes`** : au mois de la suppression (`suppressions_de_compte_par_mois`).
--
-- **Un compte n'est jamais dans deux colonnes à la fois** : une session anonyme en silence finit
-- purgée, et elle quitte alors la première colonne — au mois de son dernier signe de vie — pour la
-- deuxième, au mois de sa purge. Les totaux ne se doublent donc pas ; un mois passé, lui, peut
-- baisser dans la première colonne. Et un compte qui revient (un signe de vie après le silence)
-- sort de la première : ce sont des départs **qui durent encore**.
--
-- Des comptes et non des taux : voir l'en-tête. `purge_runs` se purge à douze mois, donc la deuxième
-- colonne ne remonte pas plus loin ; `cohortes_purgees` garde les purgés sans limite, par semaine
-- d'arrivée.
create or replace view analytics.departs_par_mois as
with partis as (
  select
    date_trunc('month', coalesce(public.dernier_signe_de_vie(u.id, b.boucle), u.created_at) at time zone 'UTC')::date
      as mois,
    count(*)::integer as n
  from auth.users u
  cross join lateral (select public.boucle_de_la_personne(u.id) as boucle) b
  where b.boucle is not null
    and public.regime_de_rappel(u.id, b.boucle) = 'silence'
  group by 1
),
purges as (
  select
    date_trunc('month', r.ran_at at time zone 'UTC')::date as mois,
    coalesce(sum(r.deleted) filter (where r.status = 'applied'), 0)::integer as n,
    count(*) filter (where r.status = 'applied')::integer as appliques,
    count(*) filter (where r.status = 'blocked')::integer as bloques
  from public.purge_runs r
  group by 1
),
suppressions as (
  select s.mois, s.suppressions as n
  from public.suppressions_de_compte_par_mois s
),
mois as (
  select mois from partis
  union
  select mois from purges
  union
  select mois from suppressions
)
select
  m.mois,
  coalesce(pa.n, 0) as partis_en_silence,
  coalesce(pu.n, 0) as sessions_purgees,
  coalesce(pu.appliques, 0) as passages_de_purge,
  coalesce(pu.bloques, 0) as passages_bloques,
  coalesce(su.n, 0) as comptes_supprimes
from mois m
left join partis pa on pa.mois = m.mois
left join purges pu on pu.mois = m.mois
left join suppressions su on su.mois = m.mois;

comment on view analytics.departs_par_mois is
  'Par mois (UTC) : les comptes partis en silence (régime de rappel, au mois de leur dernier signe '
  'de vie), les sessions purgées (au mois de la purge, avec ses passages appliqués et bloqués) et '
  'les comptes supprimés. Un compte n''est jamais dans deux colonnes ; des départs qui durent '
  'encore, pas un taux.';

revoke all privileges on table analytics.departs_par_mois from public, anon, authenticated;

-- ── 6. Contrôles de la migration ────────────────────────────────────────────────────────────────
--
-- Ils ne remplacent pas `37_vues_de_l_administration.test.sql`, qui éprouve les vues sur des comptes
-- fabriqués : ils garantissent que ce fichier a produit ce qu'il décrit, y compris rejoué.

do $controle_vues$
begin
  if exists (
    select 1
    from (values ('analytics.entonnoir_par_cohorte'), ('analytics.retention_par_cohorte'),
                 ('analytics.regimes_de_rappel'), ('analytics.departs_par_mois')) as t(nom)
    cross join (values ('anon'), ('authenticated')) as r(role)
    where has_table_privilege(r.role, t.nom, 'select')
  ) then
    raise exception 'Une vue de l''administration est lisible depuis le client';
  end if;

  if position('::timestamp at time zone ''UTC''' in pg_get_functiondef('public.dernier_signe_de_vie(uuid, text)'::regprocedure)) = 0 then
    raise exception 'dernier_signe_de_vie date encore une période dans le fuseau de la session';
  end if;

  if has_function_privilege('anon', 'public.boucle_de_la_personne(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.boucle_de_la_personne(uuid)', 'execute') then
    raise exception 'boucle_de_la_personne est appelable depuis le client';
  end if;
end;
$controle_vues$;
