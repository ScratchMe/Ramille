-- La neuvième porte de `/connexion/retrouver` : « J'ai déjà un compte » de la page d'accueil du web
-- (étape 5 de `docs/architecture/v1-35-l-audit-en-chantiers.md`, 23/10/2026).
--
-- **Le défaut qu'elle évite.** Depuis le 23/10/2026, la racine du site web est une page d'accueil, et elle
-- porte « J'ai déjà un compte », comme la première page de l'onboarding. `retrouver_view` porte
-- `props.source`, et la base ne valide pas les valeurs de `props` : le référentiel des événements est le
-- seul endroit où elles sont dites (`20260920170000`, qui l'explique). Une porte ajoutée à
-- `SOURCES_RETROUVER` (`src/types/analytics.ts`) sans sa ligne ici serait lue dans la base sans que rien ne
-- dise ce qu'elle veut dire.
--
-- **Ce qui change.** La description de `retrouver_view` : « huit portes » devient « neuf portes », la
-- porte `accueil` y entre, et `onboarding` ne se dit plus « sur l'accueil » — le mot désignait la première
-- page de l'onboarding, et il nomme désormais la page d'accueil du web.
--
-- **Une substitution vérifiée**, comme `20261023174656` : la description était identique en local et en
-- production le 23/10/2026 (`74b9616c620f25339f930b9188b524e9`). Le remplacement se reconnaît à sa
-- présence, pour qu'un rejeu ne lève pas (`SUPABASE.md` §2.3).
do $la_porte_de_la_page_d_accueil$
declare
  v_description text;
  ancre constant text :=
    'props.source, huit portes : « onboarding » (« J''ai déjà un compte » sur l''accueil), ';
  remplacement constant text :=
    'props.source, neuf portes : « onboarding » (« J''ai déjà un compte » sur la première page de '
    || 'l''onboarding), « accueil » (le même lien sur la page d''accueil du web, la racine du site, '
    || 'depuis le 23/10/2026 — la lire n''ouvre pas de session, le geste l''ouvre avant de mener ici), ';
begin
  select description into v_description from public.usage_event_types where name = 'retrouver_view';
  if v_description is null then
    raise exception 'L''événement `retrouver_view` n''est pas au référentiel.';
  end if;
  if position(remplacement in v_description) > 0 then
    return;
  end if;
  if position(ancre in v_description) = 0 then
    raise exception 'La description de retrouver_view a été réécrite autrement : l''ancre des portes est absente.';
  end if;
  update public.usage_event_types
     set description = replace(description, ancre, remplacement)
   where name = 'retrouver_view';
end
$la_porte_de_la_page_d_accueil$;

-- Contrôle : la description nomme les neuf portes, dont `accueil`, et ne parle plus de huit.
do $controle$
declare
  v_description text;
  v_porte text;
begin
  select description into v_description from public.usage_event_types where name = 'retrouver_view';
  foreach v_porte in array array['« onboarding »', '« accueil »', '« email »', '« google »', '« lien »',
                                 '« rappel »', '« plan_vide »', '« suivi_vide »', '« session_refusee »'] loop
    if position(v_porte in v_description) = 0 then
      raise exception 'CONTROLE: la description de retrouver_view ne nomme pas la porte %.', v_porte;
    end if;
  end loop;
  if position('huit portes' in v_description) > 0 then
    raise exception 'CONTROLE: la description de retrouver_view compte encore huit portes.';
  end if;
end
$controle$;
