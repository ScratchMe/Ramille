-- Une opposition à la mesure arrête l'enregistrement, sauf la date de dernière ouverture (19/10/2026).
--
-- ## Pourquoi
--
-- La page de confidentialité ouvre le droit d'opposition aux repères de parcours (article 21 du RGPD)
-- par un e-mail, et une opposition fondée effaçait les repères déjà enregistrés. Mais rien ne savait
-- ne plus en enregistrer : chaque lancement en émettait de nouveaux, et l'opposition se défaisait à
-- l'ouverture suivante. Or une opposition fondée vise l'arrêt du traitement. **Décidé par la personne
-- qui pilote le 19/10/2026** : un indicateur par compte, posé à la demande, fait cesser tous les
-- repères sauf la date de la dernière ouverture, sans écran neuf.
--
-- **Pourquoi garder cette date.** L'ouverture de l'app est aussi le signe de vie que lisent le régime
-- des rappels (`dernier_signe_de_vie`) et la purge des sessions anonymes (le plus récent des
-- événements d'un compte). Tout couper espacerait les rappels de la personne, puis supprimerait sa
-- session anonyme quatre-vingt-dix jours après son dernier bilan, quelle que soit la dernière fois
-- qu'elle a ouvert l'app. Ne garder **qu'une** ligne, l'`app_open` le plus récent vidé de ses
-- propriétés, suffit à tous ces lecteurs **sans en toucher aucun** : ils lisent un `max(occurred_at)`.
--
-- ## Ce que fait cette migration
--
-- 1. `profiles.mesure_refusee_le` : la date de l'opposition, nulle tant qu'il n'y en a pas. Le client
--    ne l'écrit pas (privilèges de colonne de `20261004173905`) ; l'export la rend.
-- 2. `enforce_usage_events_rate_limit`, par substitution vérifiée sur le corps installé : pour un
--    compte opposé, tout événement autre qu'`app_open` est écarté sans erreur (le déclencheur rend
--    `null`, et le client ne voit rien d'autre qu'un envoi réussi), **comme une ouverture qui suit la
--    précédente de moins d'une heure** ; une ouverture plus tardive remplace la précédente et part sans
--    propriétés. **L'heure est la borne de ce compte**, et elle est nécessaire : remplacer efface la
--    ligne que comptent le plafond par compte et l'exemption de la première ouverture du jour, donc sans
--    elle une boucle d'ouvertures passerait l'un et l'autre à chaque fois, et viderait les budgets du
--    jour de tout le monde (contre-lecture du 19/10/2026). Avec elle, un compte opposé écrit vingt-quatre
--    ouvertures par jour au plus ; les rappels et la purge, qui lisent à la journée ou à la semaine, ne
--    voient pas la différence.
-- 3. `refuser_la_mesure(p_user_id)`, serveur seulement : pose l'indicateur, efface les repères déjà
--    enregistrés sauf la dernière ouverture, et vide les propriétés de celle-ci. C'est le geste de
--    l'agent ou de la personne qui pilote quand une demande fondée arrive (`docs/exploitation/README.md`
--    §8, registre des traitements). Rejouable : elle ne fait rien de plus la seconde fois.
-- 4. `export_my_data` rend la date de l'opposition.
--
-- ## Ce qu'elle ne fait pas
--
-- Rien ne se lève tout seul : retirer une opposition se fait à la main (`mesure_refusee_le` remis à
-- nul), et rien ne revient de ce qui a été effacé. Le compteur des budgets du jour garde, sans
-- identifiant, le nombre d'ouvertures reçues. La sauvegarde garde l'historique effacé jusqu'à son
-- propre terme, comme pour une suppression de compte.

-- ── 1. L'indicateur ──────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists mesure_refusee_le timestamptz;

comment on column public.profiles.mesure_refusee_le is
  'Date de l''opposition aux repères de parcours (article 21 du RGPD), nulle sans opposition. Posée par refuser_la_mesure, jamais par le client. Tant qu''elle est posée, enforce_usage_events_rate_limit écarte tout événement sauf la dernière ouverture, sans propriétés.';

-- ── 2. Le déclencheur : écarter, sauf la dernière ouverture ────────────────────────────────────

do $l_opposition_dans_le_declencheur$
declare
  src text;
  cible oid := 'public.enforce_usage_events_rate_limit()'::regprocedure;
  ancre constant text := E'  v_plafond integer;\nbegin\n';
  remplacement constant text := E'  v_plafond integer;\nbegin\n'
    || E'  if exists (select 1 from public.profiles p where p.id = new.user_id and p.mesure_refusee_le is not null) then\n'
    || E'    if new.name <> ''app_open'' or exists (\n'
    || E'      select 1 from public.usage_events e\n'
    || E'      where e.user_id = new.user_id and e.name = ''app_open'' and e.occurred_at > now() - interval ''1 hour''\n'
    || E'    ) then\n'
    || E'      return null;\n'
    || E'    end if;\n'
    || E'    delete from public.usage_events e where e.user_id = new.user_id and e.name = ''app_open'';\n'
    || E'    new.props := ''{}''::jsonb;\n'
    || E'  end if;\n'
    || E'\n';
  occurrences int;
begin
  src := pg_get_functiondef(cible);
  occurrences := (length(src) - length(replace(src, ancre, ''))) / length(ancre);

  -- Zéro occurrence de l'ancre : soit « déjà substitué », soit « corps réécrit autrement », où l'on ne
  -- devine pas. Les deux se séparent par la présence du remplacement (`SUPABASE.md` §2.3).
  if position('p.mesure_refusee_le is not null' in src) > 0 then
    return;
  elsif occurrences = 0 then
    raise exception 'enforce_usage_events_rate_limit ne porte plus le début de son corps (« v_plafond integer; begin ») : il a été réécrit autrement.';
  elsif occurrences > 1 then
    raise exception 'Le début du corps a été trouvé % fois dans enforce_usage_events_rate_limit (une seule attendue).', occurrences;
  end if;

  execute replace(src, ancre, remplacement);
end
$l_opposition_dans_le_declencheur$;

comment on function public.enforce_usage_events_rate_limit() is
  'Plafonds des événements d''usage : pour un compte opposé à la mesure (profiles.mesure_refusee_le), tout est écarté sans erreur sauf une ouverture par heure, qui remplace la précédente sans propriétés ; puis, pour tous, par compte sur 24 h glissantes (200 événements, 50 pannes à part), et les budgets du jour de tout le projet (budgets_des_evenements_d_usage), quel que soit l''âge du compte ; le premier app_open d''un compte en 24 h passe toujours. Compte ce qui entre dans evenements_d_usage_par_heure. Refuse en check_violation.';

-- ── 3. Le geste de l'opposition ─────────────────────────────────────────────────────────────────

create or replace function public.refuser_la_mesure(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_refusee_le timestamptz;
  v_derniere timestamptz;
  v_effaces integer;
begin
  update public.profiles
  set mesure_refusee_le = coalesce(mesure_refusee_le, now())
  where id = p_user_id
  returning mesure_refusee_le into v_refusee_le;

  if v_refusee_le is null then
    raise exception 'refuser_la_mesure : aucun compte ne porte l''identifiant %.', p_user_id;
  end if;

  -- La dernière ouverture reste, vidée de ses propriétés : c'est le signe de vie des rappels et de la
  -- purge (en-tête). Tout le reste part.
  select max(occurred_at) into v_derniere
  from public.usage_events
  where user_id = p_user_id and name = 'app_open';

  delete from public.usage_events
  where user_id = p_user_id
    and not (name = 'app_open' and occurred_at is not distinct from v_derniere);
  get diagnostics v_effaces = row_count;

  update public.usage_events
  set props = '{}'::jsonb
  where user_id = p_user_id and props <> '{}'::jsonb;

  return jsonb_build_object(
    'mesure_refusee_le', v_refusee_le,
    'reperes_effaces', v_effaces,
    'derniere_ouverture', v_derniere
  );
end;
$$;

revoke execute on function public.refuser_la_mesure(uuid) from public, anon, authenticated, service_role;

comment on function public.refuser_la_mesure(uuid) is
  'Opposition aux repères de parcours (article 21 du RGPD) : pose profiles.mesure_refusee_le, efface les repères déjà enregistrés sauf la dernière ouverture, et vide les propriétés de celle-ci. Serveur seulement ; rejouable.';

-- ── 4. L'export rend la date de l'opposition ─────────────────────────────────────────────────────

do $l_opposition_dans_l_export$
declare
  src text;
  cible oid := 'public.export_my_data()'::regprocedure;
  ancre constant text := E'''mot_de_la_veille'', p.mot_de_la_veille,\n';
  remplacement constant text := E'''mot_de_la_veille'', p.mot_de_la_veille,\n        ''mesure_refusee_le'', p.mesure_refusee_le,\n';
  occurrences int;
begin
  src := pg_get_functiondef(cible);
  occurrences := (length(src) - length(replace(src, ancre, ''))) / length(ancre);

  if position('''mesure_refusee_le'', p.mesure_refusee_le' in src) > 0 then
    return;
  elsif occurrences = 0 then
    raise exception 'export_my_data ne porte plus la ligne du mot de la veille : le corps a été réécrit autrement.';
  elsif occurrences > 1 then
    raise exception 'La ligne du mot de la veille a été trouvée % fois dans export_my_data (une seule attendue).', occurrences;
  end if;

  execute replace(src, ancre, remplacement);
end
$l_opposition_dans_l_export$;

-- ── 5. Le contrôle de fin ───────────────────────────────────────────────────────────────────────
--
-- Sur les corps installés sans commentaires : le rejeu d'une migration plus ancienne qui réinstallerait
-- un déclencheur sans l'opposition, ou un export qui ne la rend pas, ferait tomber ce bloc au prochain
-- rejeu de celle-ci.
do $controle$
declare
  v_declencheur text := regexp_replace(pg_get_functiondef('public.enforce_usage_events_rate_limit()'::regprocedure),
                                       '--[^' || chr(10) || ']*', '', 'g');
  v_export text := regexp_replace(pg_get_functiondef('public.export_my_data()'::regprocedure),
                                  '--[^' || chr(10) || ']*', '', 'g');
begin
  if position('p.mesure_refusee_le is not null' in v_declencheur) = 0
     or position('budgets_des_evenements_d_usage()' in v_declencheur) = 0 then
    raise exception 'Le déclencheur des événements a perdu l''opposition, ou ses budgets du jour';
  end if;
  if position('p.mesure_refusee_le is not null' in v_declencheur) > position('if v_panne then' in v_declencheur) then
    raise exception 'L''opposition ne se lit plus avant les plafonds du déclencheur';
  end if;
  if position('interval ''1 hour''' in v_declencheur) = 0 then
    raise exception 'L''ouverture d''un compte opposé a perdu sa borne d''une heure';
  end if;
  if position('''mesure_refusee_le'', p.mesure_refusee_le' in v_export) = 0 then
    raise exception 'L''export ne rend pas la date de l''opposition';
  end if;
  if has_function_privilege('anon', 'public.refuser_la_mesure(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.refuser_la_mesure(uuid)', 'execute') then
    raise exception 'refuser_la_mesure est appelable par un client';
  end if;
  if has_column_privilege('authenticated', 'public.profiles', 'mesure_refusee_le', 'update') then
    raise exception 'Le client peut écrire la date de l''opposition';
  end if;
end
$controle$;
