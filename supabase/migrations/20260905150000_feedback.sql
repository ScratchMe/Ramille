-- TraceVerte V1 — canal de retour utilisateur (issue #29).
--
-- Décision produit du 05/09/2026 : ce qui a fait entrer cette issue dans le périmètre V1,
-- c'est le référentiel de modes de transport. Il est forcément incomplet — camping-car, van,
-- covoiturage longue distance, vélo cargo existent dans la Base Empreinte et pas chez nous —
-- et **aucun mécanisme ne permettait de l'apprendre**. Une personne dont le mode principal
-- manque n'a aujourd'hui que deux options : mentir, ou partir. Les deux sont silencieuses.
--
-- ## Ce que ce canal n'est pas
--
-- Pas un support client, pas une messagerie. Un formulaire à sens unique, lu à la main. Rien
-- dans le produit ne promet de réponse, et la politique de confidentialité le dit.
--
-- ## Un point de sécurité qui n'est pas théorique ici
--
-- Chaque visiteur reçoit une session anonyme dès l'ouverture de l'app (v1-04 §1). Ouvrir un
-- INSERT à `authenticated` revient donc à l'ouvrir à n'importe qui sait appeler l'API. D'où
-- le garde-fou de volume ci-dessous : sans lui, cette table est un formulaire de spam public.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('mode_manquant', 'chiffre', 'bug', 'idee', 'autre')),
  -- Bornes basses ET hautes : un message d'un caractère n'apprend rien, et un message de
  -- 50 000 caractères n'est pas un retour, c'est une charge utile.
  message text not null check (length(btrim(message)) between 3 and 2000),
  -- Écran d'où part le retour, rempli par le client. Permet de situer « le mode manque »
  -- sans avoir à réécrire à la personne — on n'a de toute façon pas de canal pour le faire.
  context text check (context is null or length(context) <= 120),
  created_at timestamptz not null default now()
);

create index feedback_created_at_idx on public.feedback(created_at desc);
create index feedback_user_id_idx on public.feedback(user_id);

-- ── RLS ────────────────────────────────────────────────────────────────────────────────
-- Lecture et suppression de ses propres retours : ce n'est pas du confort, c'est le droit
-- d'accès et le droit à l'effacement du RGPD, que /confidentialite annonce. Une table que
-- l'utilisateur ne pourrait pas relire obligerait à traiter chaque demande à la main.

alter table public.feedback enable row level security;

create policy "feedback insert own"
  on public.feedback for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "feedback select own"
  on public.feedback for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "feedback delete own"
  on public.feedback for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Pas de policy update : un retour est un envoi, pas un document. Le réécrire après coup
-- n'aurait pas de sens et compliquerait la relecture.

-- ── Garde-fou de volume ────────────────────────────────────────────────────────────────
-- Dix retours par 24 h et par utilisateur. Assez large pour que personne de bonne foi ne le
-- rencontre jamais, assez bas pour qu'un script n'en fasse rien. Le message d'erreur est
-- rédigé pour être montrable tel quel : il sera lu par un humain, pas par un développeur.

create or replace function public.enforce_feedback_rate_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  max_per_day constant integer := 10;
  v_recent integer;
begin
  select count(*) into v_recent
  from public.feedback
  where user_id = new.user_id and created_at > now() - interval '24 hours';

  if v_recent >= max_per_day then
    raise exception 'Tu as déjà envoyé plusieurs retours aujourd''hui. Reviens demain, on les lit tous.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger feedback_rate_limit
  before insert on public.feedback
  for each row execute function public.enforce_feedback_rate_limit();
