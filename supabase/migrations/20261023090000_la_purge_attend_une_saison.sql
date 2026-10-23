-- La purge des sessions anonymes attend 120 jours sans signe de vie, et non plus 90 (étape 4 de
-- `docs/architecture/v1-35-l-audit-en-chantiers.md`, décidé par la personne qui pilote le 22/10/2026).
--
-- **Le défaut.** Ramille promet « Je serai là à chaque saison », et une saison dure environ 91
-- jours. Une session anonyme muette depuis 90 jours partait donc avant la saison suivante : qui fait
-- son bilan au début d'une saison et revient au début de la suivante retrouvait un compte vide.
-- 120 jours laissent un mois de marge après la saison.
--
-- **Ce qui change.** Le prédicat d'inactivité de `purge_stale_anonymous_accounts()` : le plus récent
-- des signes de vie doit dater de plus de **120 jours**. Rien d'autre : ni la garde de volume, ni
-- les cohortes comptées avant la suppression, ni le journal. La sélection des porteurs qui partent
-- quand la garde ralentit ne relit pas la fenêtre, elle trie les candidats que le prédicat a déjà
-- retenus.
--
-- **Une substitution vérifiée**, et non une réécriture : la fonction a été retouchée par plusieurs
-- migrations (`20261006130000` en dernier), et son empreinte normalisée (commentaires retirés, blancs
-- réduits) était identique en local et en production le 23/10/2026 :
-- `7b8d3f0da9040b03d3dd0c98f86286d8`. L'ancre tient sur une ligne, parce que le corps installé en
-- production est en fins de ligne CRLF ; le remplacement se reconnaît à sa présence, pour qu'un
-- rejeu ne lève pas (`SUPABASE.md` §2.3). Le commentaire du corps qui cite la fenêtre suit quand il
-- est là (la production peut ne pas porter les commentaires du dépôt).

do $la_purge_attend_une_saison$
declare
  src text := pg_get_functiondef('public.purge_stale_anonymous_accounts()'::regprocedure);
  ancre constant text := ') < now() - interval ''90 days'';';
  remplacement constant text := ') < now() - interval ''120 days'';';
  n int;
begin
  if position(remplacement in src) > 0 then
    return;
  end if;
  n := (length(src) - length(replace(src, ancre, ''))) / length(ancre);
  if n <> 1 then
    raise exception 'purge_stale_anonymous_accounts a été réécrite autrement : % ancre(s) trouvée(s), une attendue.', n;
  end if;
  src := replace(src, ancre, remplacement);
  src := replace(src, 'soient muets depuis 90 jours', 'soient muets depuis 120 jours');
  execute src;
end
$la_purge_attend_une_saison$;

comment on function public.purge_stale_anonymous_accounts() is
  'Supprime les sessions anonymes muettes depuis 120 jours (90 jusqu''au 23/10/2026 : une saison '
  'dure environ 91 jours). La garde de volume (20 %, plancher 50) ne compte que les comptes qui '
  'portent un bilan finalisé ou un retour : au-delà du seuil, elle ralentit (depuis 20261006130000) — '
  'partent les vides et les porteurs les plus anciennement inactifs, jusqu''au seuil, les autres la '
  'nuit suivante. Compte les cohortes avant de supprimer, et journalise chaque passage dans purge_runs.';

-- ---------------------------------------------------------------------------------------------
-- Contrôle : la fenêtre vaut 120 jours, plus aucune ne vaut 90, et la fonction reste fermée aux
-- clients. Lu sans les commentaires, qui pourraient citer l'ancienne valeur.
-- ---------------------------------------------------------------------------------------------

do $controle$
declare
  v_corps text := regexp_replace(
    pg_get_functiondef('public.purge_stale_anonymous_accounts()'::regprocedure),
    '--[^' || chr(10) || ']*', '', 'g');
begin
  if position('interval ''120 days''' in v_corps) = 0 then
    raise exception 'CONTROLE: la purge des sessions anonymes n''attend pas 120 jours';
  end if;
  if position('90 days' in v_corps) > 0 then
    raise exception 'CONTROLE: une fenêtre de 90 jours reste dans la purge des sessions anonymes';
  end if;
  if has_function_privilege('anon', 'public.purge_stale_anonymous_accounts()', 'execute')
     or has_function_privilege('authenticated', 'public.purge_stale_anonymous_accounts()', 'execute') then
    raise exception 'CONTROLE: la purge des sessions anonymes est appelable par un client';
  end if;
end
$controle$;
