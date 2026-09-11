-- v1-13, chantier C2.11 — le lien du rappel se reconnaît quand il est ouvert ailleurs.
-- Constats C-2, A6-15 (partie repli), A6-16.
--
-- ## Le défaut
--
-- L'email de rappel ne porte que `https://www.ramille.fr/plan`. Ouvert sur un ordinateur ou un
-- téléphone neuf, `ensureSession()` y crée une session anonyme vide et le plan répond « Ton bilan
-- n'est pas encore fait », avec pour seul bouton « Faire mon bilan » — à quelqu'un qui a un bilan,
-- un plan et des points, juste pas sur cet appareil. Pire : la consigne de désinscription du même
-- email (« désactive-les depuis « Toi » dans l'app ») réglait alors la préférence d'une session qui
-- n'est personne, donc sans aucun effet sur les rappels qu'elle voulait arrêter.
--
-- ## Ce que change cette migration, et ce qu'elle ne change pas
--
-- Une seule chose : le lien porte `?rappel=1`. L'écran du plan s'en sert pour dire, **dans le seul
-- cas où il n'a pas de bilan local**, que ce rappel concerne un compte et où le retrouver. Quand il
-- y a un plan à montrer, le paramètre ne sert à rien et rien ne l'affiche : la personne est au bon
-- endroit.
--
-- **Le chemin ne bouge pas, et c'est une contrainte, pas une commodité.** `assetlinks.json` ne
-- revendique nommément que `https://www.ramille.fr/plan` — périmètre volontairement étroit, pour que
-- les pages légales et `/compte/suppression` restent atteignables **sans** l'app, ce que Google Play
-- exige. Une chaîne de requête ne fait pas partie du chemin d'un `intentFilter`, donc le lien
-- continue de s'ouvrir dans l'app sur Android ; une nouvelle route l'aurait renvoyé au navigateur,
-- sans que rien ne le signale.
--
-- Le reste de la fonction est repris de son **état installé** (`pg_get_functiondef`) et non de la
-- migration qui l'a créée : c'est la leçon de C2.2, où reprendre un fichier d'origine a supprimé en
-- silence trois gardes ajoutées depuis. D'où la substitution vérifiée plutôt qu'une réécriture.

do $garde_lien$
declare
  src text;
  cible oid;
  ancre constant text := E'''Réponds-moi en un geste : '' || v_app_url || ''/plan''';
  remplacement constant text := E'''Réponds-moi en un geste : '' || v_app_url || ''/plan?rappel=1''';
  occurrences int;
begin
  select p.oid into cible from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.proname = 'enqueue_checkin_reminders';

  if cible is null then
    raise exception 'enqueue_checkin_reminders est introuvable.';
  end if;

  src := pg_get_functiondef(cible);
  occurrences := (length(src) - length(replace(src, ancre, ''))) / length(ancre);

  if occurrences <> 1 then
    raise exception 'L''ancre du lien de rappel a été trouvée % fois (une seule attendue).', occurrences;
  end if;

  execute replace(src, ancre, remplacement);
end
$garde_lien$;

do $controle_lien$
begin
  if position('/plan?rappel=1' in
      (select prosrc from pg_proc
       where pronamespace = 'public'::regnamespace and proname = 'enqueue_checkin_reminders')) = 0 then
    raise exception 'Le lien du rappel ne porte pas la marque ?rappel=1.';
  end if;
end
$controle_lien$;
