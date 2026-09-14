-- C3.10, point 4 — le refus du garde-fou de volume a son propre SQLSTATE.
--
-- ## Le défaut
--
-- `enforce_feedback_rate_limit` levait avec `errcode = 'check_violation'`, soit **23514** : le même
-- code que toutes les contraintes CHECK de la table (`feedback_message_check`, la borne de
-- longueur). Côté client, `sendFeedback` ne pouvait donc pas les distinguer autrement qu'en lisant
-- le texte du message — `error.message.includes('plusieurs retours')`.
--
-- C'est la faute que ce dépôt nomme partout ailleurs : **on reconnaît un refus à son code, jamais
-- à son message**. La règle est écrite pour `over_email_send_rate_limit` (`src/types/connexion.ts`,
-- « la limite d'envoi se reconnaît au code, jamais au message ») et pour `RM001`
-- (`commit_plan_action`, « que le client reconnaît par son code et jamais par le message »). Ici la
-- dépendance était double, donc doublement fragile : reformuler la phrase — ce que ce chantier fait
-- justement ailleurs, pour le ton — aurait fait retomber le refus dans la branche « panne », et la
-- personne aurait lu « Ton retour n'est pas parti. Vérifie ta connexion » alors que sa connexion va
-- très bien et que son retour est simplement le onzième du jour. Rien ne l'aurait signalé : le test
-- 11 vérifiait le **message**, donc il serait resté vert.
--
-- ## Ce qui change
--
-- `RM002`, dans la classe `RM` réservée aux conditions applicatives du produit — `RM001` est déjà
-- le refus de remplacement d'une action engagée. Le **message ne bouge pas** : il est rédigé pour
-- être montré tel quel, et c'est toujours lui qui s'affiche. Ce qui change est ce qui le
-- sélectionne.
--
-- Le `revoke` est réémis alors que `create or replace function` **préserve** les privilèges d'une
-- fonction existante : c'est une ceinture, pas une correction. Le test 11 épingle nommément ce
-- droit en disant qu'« un `create or replace` ultérieur rendrait le droit à PUBLIC sans que rien ne
-- tombe » — autant que la migration qui fait ce `create or replace` le referme elle-même.

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
    -- `RM002` : classe réservée aux conditions applicatives, reconnue par le client. Le message
    -- reste celui qui s'affiche — il s'adresse à la personne, pas au développeur.
    raise exception 'Tu as déjà envoyé plusieurs retours aujourd''hui. Reviens demain, on les lit tous.'
      using errcode = 'RM002';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_feedback_rate_limit() from public, anon, authenticated;

-- Contrôle : la fonction installée lève bien `RM002`, et plus `check_violation`. Rejouable —
-- il lit le corps installé, donc il dit la même chose au premier passage et au dixième.
do $$
declare
  v_corps text := pg_get_functiondef('public.enforce_feedback_rate_limit()'::regprocedure);
begin
  if position('RM002' in v_corps) = 0 then
    raise exception 'enforce_feedback_rate_limit ne lève pas RM002 : le client ne reconnaîtra pas le refus.';
  end if;
  if position('check_violation' in v_corps) > 0 then
    raise exception 'enforce_feedback_rate_limit lève encore check_violation : le code reste indistinguable de celui des contraintes de longueur.';
  end if;
end;
$$;
