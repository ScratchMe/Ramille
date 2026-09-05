-- L'horodatage des événements d'usage était serveur *par défaut*, pas *par contrainte*.
--
-- `occurred_at` avait un `default now()`, ce qui couvre le chemin nominal mais n'empêche
-- rien : un client peut fournir la colonne explicitement, la RLS ne regarde pas sa valeur, et
-- des événements antidatés fausseraient silencieusement tous les entonnoirs. Une horloge de
-- client se règle — c'est précisément pour ça que la valeur ne devait pas venir de lui.
--
-- Le trigger écrase systématiquement ce qui arrive. Il ne rejette pas : refuser ferait perdre
-- l'événement pour une colonne dont le client n'a de toute façon pas le droit de décider.

create or replace function public.stamp_usage_event_time()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.occurred_at := now();
  return new;
end;
$$;

create trigger usage_events_stamp_time
  before insert on public.usage_events
  for each row execute function public.stamp_usage_event_time();
