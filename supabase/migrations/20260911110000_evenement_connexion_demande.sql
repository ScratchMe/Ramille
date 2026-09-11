-- v1-13, chantier C1.2 (constat A6-11) — séparer la demande de lien du rattachement constaté.
--
-- ## Le défaut
--
-- L'écran `/connexion/email` émettait `connexion_success` juste après `updateUser({ email })`,
-- avec ce commentaire : « le rattachement est effectif ici ». Le modèle de données dit l'inverse
-- et de façon appuyée — `etatDuRattachement` (src/types/compte.ts) classe cet instant en
-- `a_confirmer`, « une adresse présente ne signifie pas que le compte est rattaché », et
-- `is_anonymous` ne bascule qu'au clic du lien reçu dans la messagerie. Le chemin Google, lui,
-- n'émettait l'événement qu'après une session réellement liée.
--
-- Les deux branches ne mesuraient donc pas la même chose, et la seule comparaison que
-- `connexion_success` permet — email contre Google — était faussée **du taux d'emails jamais
-- confirmés**, c'est-à-dire précisément du chiffre qu'on voulait lire.
--
-- ## Ce que cet événement est, et ce qu'il n'est pas
--
-- Une **intention** : la personne a demandé le lien. Le fait, lui, reste sur
-- `connexion_success`, émis au constat de la bascule d'`is_anonymous`. L'écart entre les deux
-- **est** le taux de confirmations manquantes.
--
-- Aucune propriété. Il n'y a que l'email à passer par une demande — Google lie l'identité dans le
-- même geste — donc une propriété de méthode serait une constante déguisée en dimension.
--
-- Et ce n'est pas un doublon de ce que le schéma enregistre déjà (règle de v1-08 §2) :
-- `updateUser` n'écrit qu'une adresse non confirmée dans `auth`, sans jamais dire qu'un lien a
-- été demandé depuis cet écran — un envoi refusé, un `email_exists`, un abandon avant le clic ne
-- laissent rien derrière eux.
--
-- Le pendant côté client est `src/types/analytics.ts` (`USAGE_EVENT_NAMES` et
-- `UsageEventPropsByName`), livré dans le même lot : sans lui, rien n'émet l'événement et la
-- ligne ci-dessous se lirait **zéro** plutôt que « pas encore instrumenté ». La troisième copie
-- de la liste vit dans `supabase/tests/database/12_usage_events.test.sql` (`bag_eq`), à rouvrir
-- en même temps.

insert into public.usage_event_types (name, description) values
  (
    'connexion_demande',
    'Un lien de rattachement par email a été demandé depuis /connexion/email. Une intention, pas un rattachement : le fait reste connexion_success, émis au constat de la bascule d''is_anonymous. Aucune propriété.'
  )
on conflict (name) do nothing;

-- ── Trois libellés remis d'aplomb ───────────────────────────────────────────────────────
-- Les descriptions de ce référentiel sont la seule documentation qu'on ait sous la main en
-- écrivant une requête d'analyse : une qui ne nomme pas la dimension se lit comme un événement
-- sans dimension, et la requête agrège les deux cas sans le dire.
--
-- `resultat_view` porte désormais `props.mode` (constat A3-21) : les deux entrées de l'écran
-- (v1-11 §1) sont deux faits différents — l'aboutissement du questionnaire, et la relecture d'un
-- instantané depuis le suivi. Sans la dimension, plus le suivi dans la durée fonctionne, plus le
-- taux de conversion vers le plan paraît chuter.
update public.usage_event_types
set description = 'Affichage de la restitution du bilan (props.mode : « nouveau » en fin de questionnaire, « relecture » depuis le suivi).'
where name = 'resultat_view';

-- `connexion_success` cesse d'être émis à l'envoi du lien côté email : il ne porte plus qu'un
-- rattachement constaté, pour que ses deux valeurs de méthode mesurent le même fait. Côté
-- email, l'émetteur est l'annonce de rattachement de `/plan` — le seul endroit du produit qui
-- observe la bascule, puisqu'elle se termine hors de l'app (clic du lien dans la messagerie).
-- Côté Google, c'est `/connexion` au retour de `linkIdentity()`, où l'identité est liée dans le
-- même geste : l'émettre une seconde fois depuis le plan compterait deux fois le même
-- rattachement.
update public.usage_event_types
set description = 'Rattachement du compte constaté (props.method) : identité liée côté Google (/connexion), bascule d''is_anonymous côté email (annonce de /plan). Jamais la demande de lien — c''est connexion_demande.'
where name = 'connexion_success';

-- `app_open` comptait des démarrages à froid, pas des ouvertures (constat A1-4) : le layout
-- racine n'est monté qu'une fois par chargement du bundle, or le chemin nominal de la boucle
-- d'engagement est une app en arrière-plan que la notification ramène devant. Il est désormais
-- émis après la résolution d'`ensureSession()` **et** à chaque retour au premier plan au-delà de
-- cinq minutes derrière. C'est ce qui rend vraie la phrase sur laquelle
-- `purge_stale_anonymous_accounts()` fonde sa fenêtre de 90 jours (migration 20260907093000,
-- « app_open est émis à chaque ouverture ») : une session anonyme qui revient chaque semaine par
-- le rappel écrit enfin un signe de vie.
--
-- Les deux chemins se distinguent par `props.origine`, et cette dimension n'est pas un ornement :
-- sans elle, les lignes sont identiques, on ne peut ni vérifier que le second chemin fonctionne
-- (« ouvrir un rappel doit écrire une ouverture ») ni comparer une série d'avant cette migration,
-- où seuls les démarrages comptaient, à une série d'après. Elle ne coûte aucune ligne de
-- référentiel : `check_usage_event_props` ne valide que des clés et des longueurs, jamais des
-- valeurs — d'où la description, seul endroit où les valeurs attendues sont écrites côté base.
-- `retour` n'existe que sur natif : sur web, `AppState` se dérive de la visibilité du document,
-- et un onglet réaffiché n'est pas une app ouverte (chaque chargement de page émet déjà son
-- `demarrage`).
update public.usage_event_types
set description = 'Ouverture de l''app — dénominateur de tous les entonnoirs. props.origine : « demarrage » après la résolution d''ensureSession() (jamais au montage), « retour » au passage au premier plan après plus de cinq minutes en arrière-plan (natif seulement).'
where name = 'app_open';
