-- Le durcissement d'après la passe de sécurité du 05/10/2026 (v1-27 §12.39).
--
-- Quatre corrections de la seconde passe de sécurité, toutes serveur-only, aucune ne change un
-- écran ni une réponse vue par la personne :
--
--   1. `auth.users` ne grossit plus sans borne, et aucune écriture client n'y pose un mot de passe.
--      Le constat CRITIQUE de la passe : une session anonyme (un captcha) appelle `PUT /auth/v1/user
--      {"data": …}` en boucle — sans captcha ensuite —, et GoTrue **fusionne** jusqu'à 1 Mo de clés
--      neuves par requête dans `raw_user_meta_data` du même compte. ~360 Mo/h/IP, et le plan gratuit
--      passe la base en lecture seule à 500 Mo. Rien côté `public.*` ne voit `auth.users`, et la purge
--      des comptes anonymes ne regarde que l'inactivité à 90 jours (pas la taille) : un compte neuf et
--      actif n'est rattrapé par rien. Mesuré en local : 960 022 octets stockés pour un compte, en deux
--      requêtes. Le même appel sans captcha pose aussi un `encrypted_password` (le produit n'a pas de
--      mot de passe), qui ouvre une connexion par `grant_type=password` **survivant à une déconnexion
--      globale** — une porte dérobée que la personne ne peut ni voir ni retirer. Le hook « Password
--      Verification Attempt » qui refuserait `grant_type=password` est réservé aux plans Teams et
--      Enterprise : sur le plan gratuit, la garde se pose en base, par un trigger sur `auth.users`.
--
--      Le trigger refuse donc, **pour tous les rôles** (le trigger se déclenche quel que soit le rôle
--      qui écrit, et c'est voulu — GoTrue écrit sous `supabase_auth_admin`) :
--        * toute écriture dont `raw_user_meta_data` dépasse 8 Ko de texte JSON. Le produit n'y écrit
--          rien côté client ; les métadonnées réelles pèsent 5 octets pour une session anonyme et
--          27 octets au plus sur la production (relevé le 05/10/2026), un profil Google quelques
--          centaines d'octets — 8 Ko laisse tout passer et ferme la croissance sans borne.
--        * sur un `UPDATE` seulement, la **transition** d'`encrypted_password` vers une valeur non
--          vide. Les fixtures pgTAP posent `encrypted_password = 'x'` à l'`INSERT` (jamais par un
--          `UPDATE`), donc elles ne sont pas touchées ; aucun chemin du produit ne pose de mot de
--          passe. Un `UPDATE` qui laisse le mot de passe inchangé, ou qui le vide, passe.
--
--      Ce trigger est sur une table du schéma `auth`, à l'image d'`on_auth_user_created` : il se
--      déclenche dans la transaction de GoTrue, et une exception la fait échouer — c'est exactement
--      ce qu'on veut pour `PUT /user`, qui reçoit alors un refus et n'écrit rien. Les parcours réels
--      (session anonyme, rattachement par code, Google, reconnexion) le traversent sans rien poser de
--      tout cela : éprouvé par `verifier-code-de-connexion.mjs` et `verifier-parcours-reel.mjs` avant
--      la fusion.
--
--   2. La borne de `feedback.message` portait sur `btrim(message)`, pas sur le brut : un retour de
--      2000 caractères utiles pouvait être entouré d'un rembourrage d'espaces de plusieurs Mo, que la
--      contrainte ne voyait pas (seule table où un client écrit du texte libre, oubliée par la passe
--      du 05/10). Mesuré : un corps de 10 000 003 caractères accepté. On ajoute une borne sur le brut.
--
--   3. `verifier_le_jeton_du_captcha` tenait une connexion jusqu'à 3 s sur l'appel HTTP synchrone à
--      Cloudflare ; ramené à 1,5 s, comme le hook d'envoi, pour qu'un flot d'appels sature moins vite
--      le petit pool du plan gratuit. La borne principale (10 essais/h/compte, comptés avant l'appel)
--      ne change pas.
--
--   4. `check_intention_days` acceptait un `smallint[]` à deux dimensions (`{{1},{2}}`), que le
--      questionnaire ne produit jamais ; on exige une seule dimension. Sans effet sur les données
--      existantes (toutes à une dimension) ; cosmétique, sur ses propres données.
--
-- Rejouable telle quelle après une restauration : `drop … if exists` devant chaque objet,
-- `create or replace` pour les fonctions, et la contrainte retirée avant d'être reposée.

-- 1. auth.users : métadonnées bornées, mot de passe client refusé ------------------------------

create or replace function public.borner_les_ecritures_sur_le_compte()
returns trigger
language plpgsql
-- Pas de `security definer` : le trigger ne lit que NEW/OLD et lève, il n'accède à rien de
-- privilégié. `search_path` figé par prudence (il n'appelle que des fonctions intégrées).
set search_path to 'pg_catalog'
as $$
begin
  -- La taille logique (texte JSON), et non `pg_column_size` : on borne ce que la requête a envoyé,
  -- qu'il se comprime ou non. 8 Ko — très au-dessus de tout usage réel (5 o pour une session anonyme,
  -- 27 o au plus sur la production, quelques centaines pour un profil Google).
  if new.raw_user_meta_data is not null
     and octet_length(new.raw_user_meta_data::text) > 8192 then
    raise exception 'Métadonnées de compte trop volumineuses.'
      using errcode = 'check_violation';
  end if;

  -- Le produit n'a pas de mot de passe. Un `UPDATE` qui en pose un vient forcément d'un chemin que le
  -- produit n'offre pas (`PUT /auth/v1/user {"password": …}`) : on le refuse. L'`INSERT` n'est pas
  -- visé — les fixtures pgTAP y posent `encrypted_password = 'x'`, et la création directe d'un compte
  -- est déjà fermée par le hook `avant_la_creation_d_un_compte`. Une valeur inchangée ou vidée passe.
  if tg_op = 'UPDATE'
     and coalesce(new.encrypted_password, '') <> ''
     and new.encrypted_password is distinct from old.encrypted_password then
    raise exception 'La connexion par mot de passe n''est pas prise en charge.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.borner_les_ecritures_sur_le_compte() is
  'Garde de volume et de sécurité sur auth.users (v1-27 §12.39) : refuse des métadonnées de plus de '
  '8 Ko et la pose d''un mot de passe par un UPDATE. Se déclenche pour tous les rôles, GoTrue '
  '(supabase_auth_admin) compris. Aucun chemin du produit n''en est affecté.';

drop trigger if exists borner_les_ecritures_sur_le_compte on auth.users;
create trigger borner_les_ecritures_sur_le_compte
  before insert or update on auth.users
  for each row execute function public.borner_les_ecritures_sur_le_compte();

-- 2. feedback.message : borne sur le brut --------------------------------------------------------

alter table public.feedback drop constraint if exists feedback_message_check;
alter table public.feedback add constraint feedback_message_check
  check (length(btrim(message)) between 3 and 2000 and length(message) <= 4000);

-- 3. verifier_le_jeton_du_captcha : délai HTTP ramené de 3 s à 1,5 s -----------------------------

create or replace function public.verifier_le_jeton_du_captcha(p_secret text, p_jeton text)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_reponse extensions.http_response;
  v_contenu jsonb;
begin
  -- 1,5 s comme le hook d'envoi (était 3 s) : un flot d'appels tient moins longtemps une connexion du
  -- petit pool du plan gratuit. La borne de 10 essais/h/compte, comptée avant l'appel, ne change pas.
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '1500');
  select * into v_reponse from extensions.http((
    'POST',
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    null,
    'application/x-www-form-urlencoded',
    'secret=' || extensions.urlencode(p_secret) || '&response=' || extensions.urlencode(p_jeton)
  )::extensions.http_request);

  if v_reponse.status not between 200 and 299 then
    return false;
  end if;
  v_contenu := v_reponse.content::jsonb;
  -- L'action est celle que l'app donne au widget (`UsageDuCaptcha`) : un jeton obtenu pour autre chose
  -- ne vaut pas ici. **Absente, elle ne refuse pas** : les clés d'essai de Cloudflare ne la rendent
  -- pas (mesuré le 05/10/2026), et un jeton est à usage unique — celui d'un autre usage a déjà été
  -- consommé par Supabase, et Cloudflare le refuserait de toute façon.
  return coalesce((v_contenu ->> 'success')::boolean, false)
     and coalesce(v_contenu ->> 'action', 'rattachement') = 'rattachement';
exception when others then
  return false;
end;
$$;

-- 4. check_intention_days : une seule dimension --------------------------------------------------

create or replace function public.check_intention_days(p_days smallint[])
returns boolean
language sql
immutable
set search_path to 'public'
as $$
  select p_days is null
     or (array_ndims(p_days) = 1
         and array_length(p_days, 1) between 1 and 7
         and not exists (select 1 from unnest(p_days) as d where d < 1 or d > 7)
         and (select count(distinct d) from unnest(p_days) as d) = array_length(p_days, 1));
$$;
