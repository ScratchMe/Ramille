import { LegalPage, type LegalSection } from '@/components/legal/legal-page';
import { CONTACT_EMAIL, EDITOR_NAME, HEBERGEUR_DES_DONNEES, HEBERGEUR_DU_SITE } from '@/constants/editeur';
// **`ORIGINE_CANONIQUE` et non `APP_URL`, et ce n'est pas interchangeable ici.** `APP_URL`
// vaut l'origine réelle côté client et le domaine canonique au rendu statique : écrite dans
// un **texte**, elle produit un écart d'hydratation — le HTML exporté dit
// `https://www.ramille.fr/…`, le client recalcule autre chose, et React remplace le texte
// sans rien signaler (erreur 418, que `scripts/verifier-rendu-export.mjs` classe en
// avertissement par conception, donc la CI reste verte). Sur une preview Vercel, les deux
// seules surfaces publiques du produit afficheraient l'hôte de preview dans un texte
// juridique. C'est le raisonnement que `titre-de-page.tsx` applique déjà à l'`og:url`, et
// l'origine canonique est celle que `sitemap.xml` annonce pour cette même page. `APP_URL`
// reste pour ce qui doit suivre l'origine réelle : les `redirectTo` de connexion et le
// lien de partage.
import { APP_NAME, ORIGINE_CANONIQUE } from '@/constants/produit';

// Politique de confidentialité — URL exigée par l'écran de consentement Google OAuth et par
// la fiche Google Play.
//
// Règle de rédaction : **ne décrire que ce que le produit fait réellement**. Chaque
// affirmation ci-dessous est vérifiable dans le code ou le schéma :
//   - session anonyme dès l'ouverture -> `ensureSession()` (src/lib/supabase.ts), v1-04 §1, sauf sur
//     les surfaces sans compte et, depuis le 23/10/2026, la page d'accueil du web (la racine du site), qui
//     ne font que restaurer une session existante (`restaurerLaSession`, `laSessionSOuvreSur`,
//     `COMPTE.md`) ;
//   - champs collectés -> colonnes de `assessment_answers` (v1-05 §3) ;
//   - réponses aux points de suivi, oui, non ou sans objet -> `engagement_checkins.response_kind`
//     et `responded_at` (C2.4) ;
//   - rappels par notification ou par email -> `notification_outbox` + `profiles.reminder_channel` ;
//   - décroissance des rappels (un par mois à partir de quatre questions sans réponse, silence à
//     huit, remise à zéro par une réponse ou une ouverture) -> `public.regime_de_rappel()` et la
//     clause `where` d'`enqueue_checkin_reminders()` (C2.9) ;
//   - sortie sans ouvrir l'app -> `desinscrire_des_rappels(uuid)` et
//     `notification_outbox.unsubscribe_token`, page `/rappels/stop` ;
//   - réponse au point depuis l'email, sans se connecter, au geste et jusqu'à la fin de sa période
//     (24/10/2026) -> `repondre_par_le_lien(uuid, text)` et `notification_outbox.jeton_de_reponse`, page
//     `/point` ; l'heure de la dernière réponse par ce lien -> `lien_de_reponse_utilise_le`, rendue par
//     l'export ;
//   - purge à 120 jours sans activité -> `purge_stale_anonymous_accounts()`, cron quotidien ;
//   - rétention des rappels (6 mois) et des jetons désactivés (90 jours) ->
//     `purge_notification_outbox()`, cron quotidien 1h ;
//   - panne d'affichage enregistrée sans son message -> événement `app_error` de `usage_events` ;
//   - aucune géolocalisation -> non-goal explicite de la spec §2 ;
//   - retours utilisateur -> table `feedback`, insert-only côté client, issue #29 ;
//   - trace des demandes de code de connexion (deux jours au plus) -> `envois_d_e_mails_d_auth`,
//     cron `purge-envois-d-e-mails-d-auth` (ce qui a plus d'un jour, chaque nuit), rendue par l'export ;
//   - corrections du contexte (vingt au plus sur vingt-quatre heures) -> `profiles.corrections_du_contexte`
//     et `corrections_du_contexte_depuis`, écrites par `mettre_a_jour_le_contexte`, rendues par l'export
//     (clé `compte`) ; le compteur horaire des événements, sans identifiant -> `evenements_d_usage_par_heure`,
//     purgé chaque nuit au-delà de deux jours par `purge_usage_events()` (3 h 30 UTC), donc trois jours au
//     plus (`20261018110000`) ;
//   - opposition aux repères (19/10/2026) -> `profiles.mesure_refusee_le`, posée par `refuser_la_mesure`,
//     rendue par l'export ; ensuite le déclencheur des événements ne garde que la dernière ouverture, sans
//     propriétés, avec sa plateforme (`20261019150000`, `MESURE.md` §5) ;
//   - sous-traitants et localisation -> les seuls tiers appelés par le produit :
//     `api.resend.com` et `exp.host` dans `send_pending_reminders()`, `api.brevo.com` dans
//     `requete_d_e_mail_d_auth()` pour les codes de connexion depuis le 05/10/2026 (`api.resend.com`
//     en repli tant que la clé Brevo manque ; le SMTP de Supabase passait déjà par Resend),
//     Supabase (Paris) pour la
//     base, Vercel pour servir la version web et fabriquer la carte de partage, Google pour
//     OAuth et pour FCM, GitHub Actions et Cloudflare R2 pour la sauvegarde
//     (`.github/workflows/sauvegarde.yml`, `docs/exploitation/sauvegarde.md`), et depuis le
//     04/10/2026 Cloudflare Turnstile pour le captcha de la session anonyme et des codes
//     (`src/lib/captcha.ts` — sur le web d'abord, l'app Android au build qui suit) ;
//   - identifiant de notification enregistré quand la personne a choisi la notification et que le
//     téléphone l'accepte (depuis le 22/10/2026 ; avant, dès la permission, quel que soit le canal)
//     -> `reglerLeJetonDeCetAppareil` (`src/lib/rappels.ts`), appelé à chaque démarrage par
//     `src/app/_layout.tsx`, qui le désactive pour un autre canal ;
//   - adresse IP et appareil de chaque session -> colonnes `ip` et `user_agent` de
//     `auth.sessions`, posées par Supabase Auth (110 sessions sur 110, mesuré le 02/10/2026), et
//     effacées après 90 jours sans renouvellement par `menage_des_jetons_d_auth()` (22/10/2026) ;
//   - ce que la connexion Google transmet -> le droit `userinfo.profile` que Supabase Auth
//     demande, d'où le nom et la photo dans `auth.identities.identity_data`.
//
// **Deux sorties de données qu'il ne faut pas reperdre de vue, parce qu'aucune n'est visible
// depuis cette page** — les deux ont été écrites comme inexistantes ici avant d'être
// contre-vérifiées en base et dans le code :
//   - le **texte du rappel** contient la question du point, figée à la génération
//     (`engagement_checkins.committed_question`), et, en notification, le poste en étiquette
//     (`poste_inserable`) — donc des faits tirés du bilan : le poste (« ton trajet
//     domicile-travail », « tes voyages »), parfois le mode (« ton trajet s’est-il fait à
//     vélo ? ») ou l'action engagée. Ce commentaire disait `trip_label`, le libellé figé avec son
//     mode entre parenthèses : `enqueue_checkin_reminders` ne le lit plus (relu le 27/09/2026).
//     Il part dans le `text` de `api.resend.com` et dans le `body` de `exp.host`. Aucun chiffre,
//     en revanche.
//   - « Partager mon bilan » (`src/app/(tabs)/suivi/bilan.tsx`) construit
//     `/api/partage?total=&poste=&percent=` : le total annuel en tonnes, le libellé du poste
//     dominant et sa part partent en clair dans l'URL d'une Vercel Function, à l'émission du
//     lien comme à chaque ouverture par un destinataire. Que le serveur ne lise **rien** dans
//     la base (v1-06 §2) ne veut pas dire qu'il ne reçoive rien.
//
// Sur les transferts hors UE, cette page nomme **depuis le 18/10/2026 l'entité, le pays et le
// mécanisme** de chaque prestataire, relevés pièce en main : `docs/exploitation/sous-traitants.md`
// dit, pour chacun, l'adresse lue et sa version. Avant, elle s'en tenait au fait (« société
// américaine ») faute d'avoir lu les contrats — c'était le défaut A11-12, et il se réparait en les
// lisant, pas en reformulant la page. **La règle reste, dans les deux sens** : un mécanisme ne
// s'écrit que s'il a été lu. « Inscrite au Data Privacy Framework » vaut pour une inscription
// *Active* sur la liste officielle (l'interface publique du site dataprivacyframework.gov, lue le
// 18/10/2026 ; la liste bouge, et trois inscriptions portaient la mention « re-certification under
// review ») ; « clauses contractuelles types » pour un contrat qui les incorpore (Supabase, Resend,
// Cloudflare, Google/Firebase). Là où le contrat n'a pas été lu — Expo n'en publie pas, GitHub refuse
// la lecture de sa page, et l'avenant de Vercel vise les plans Pro et Entreprise alors que le projet
// est en Hobby —, la page ne dit que la certification, jamais un contrat qu'on n'a pas.
//
// Les renvois qui nomment un écran sont ce qui vieillit le plus vite ici : « Mes données » vit
// dans `src/app/compte/index.tsx` (écran « Toi »), atteignable par `CompteBouton` en haut à
// droite des deux onglets. Rien en CI ne garde ce point — il se relit à la main. Ils nomment
// l'icône **comme le produit l'annonce** (« Ton compte », `accessibilityLabel` de
// `src/components/compte-bouton.tsx`) : « icône de compte » était un mot à nous, introuvable à
// l'écran comme au lecteur d'écran pour quelqu'un — examinateur Play compris — qui cherche
// exactement ce qu'on lui a dit de chercher.
//
// Les deux seules informations que cette page ne peut pas déduire — nom du responsable de
// traitement et email de contact — vivent dans `@/constants/editeur`, où le régime juridique
// applicable (édition non professionnelle) est expliqué. Un texte qui promettrait un
// mécanisme inexistant serait pire que pas de texte du tout.

// Cette date est le seul repère qu'a le lecteur pour voir que la page a changé, et la page
// s'engage elle-même à l'afficher (« Évolutions de ce document »). Elle avance à chaque
// modification de fond : le 11/09/2026 pour les sous-traitants, les durées de conservation et
// les renvois d'écran ; le 25/09/2026 pour les réponses aux points de suivi, qui ne se disaient
// que par oui ou par non alors qu'un point se répond aussi « pas concerné » depuis C2.4 (la
// troisième réponse du point, 12/09/2026) — la page décrivait une donnée de moins que ce que le
// produit enregistre (`engagement_checkins.response_kind`).
//
// **Elle porte la date à laquelle le texte atteint le lecteur, pas celle où il a été rédigé.**
// Le lecteur ne peut pas voir autre chose que la page servie : une date antérieure à la mise en
// ligne se lit comme « rien n'a bougé depuis » le jour même où tout a bougé.
//
// Rédigé le 24/09/2026, mis en ligne le 25 : la date est celle du second jour, pour cette raison-là
// (contre-lecture de `v1-29`). Le même passage a retiré deux « liens » que le code a remplacés le
// 20/09/2026 : l'adresse gardée sur l'appareil sert à reprendre la saisie d'un code, et
// `/compte/suppression` envoie un code, plus un lien.
//
// **27/09/2026 : ce que le rappel fait sortir était décrit à l'état d'avant le lot 2.** La page disait
// que seul le nom du poste partait vers Resend et Expo, « Trajet domicile-travail (Voiture seul) » en
// exemple, et que c'était « la seule chose issue de ton bilan ». Ce libellé a quitté le rappel avec
// C2.6 (`poste_inserable`), et la question figée du point y est entrée avec C2.1 : elle peut nommer
// le mode, l'action choisie et les jours fixés (relevé dans les migrations le 27/09/2026). Corrigé sur décision de la personne qui pilote
// (relevé par la contre-lecture de `v1-27` §4) ; la date suit la mise en ligne.
//
// **Et le même jour, un bilan retiré** (C4.7, décision de la personne qui pilote) : « retirer » peut se
// lire « effacer », et ce n'en est pas un — la ligne reste, l'export la rend avec son statut
// (`v1-22` D1). Sans cette phrase, la page laisserait croire à un effacement qui n'a pas lieu. Elle
// nomme la session anonyme parce que la purge à 120 jours l'emporte aussi, comme le reste. Mise en
// ligne à la fusion de C4.7 — la date suit, **heure de Paris** (la fusion a lieu dans la nuit du 27 au
// 28 : le 27 en UTC, déjà le 28 pour qui lit la page), et la feuille de recette la cite (11.1).
//
// **Et les compteurs qui survivent à une suppression** (lot 6, décidé le 27/09/2026 : « la page de
// confidentialité le dit »). La page écrivait que la session « et toutes les données associées »
// partent, et c'est toujours vrai de ses données ; ce qui reste est un +1 dans un compteur, sans
// identifiant ni date plus fine que la semaine (`20260927230611`). Le taire aurait laissé croire à
// une suppression sans aucune trace, sur la page même qui promet de dire ce qu'on garde. **Et les
// sauvegardes** (décision du 27/09/2026) : l'archive hebdomadaire chiffrée garde une copie de la base
// jusqu'à ce que la règle de cycle de vie du bucket l'efface (`docs/exploitation/sauvegarde.md`
// §3 bis) ; les taire rendait « il ne reste que des compteurs » faux pendant 90 jours. Le chiffre de
// la page est celui de cette règle, et il se vérifie au tableau de bord Cloudflare, pas d'ici.
//
// **02/10/2026 : six choses que le produit enregistrait sans que la page les dise** (relevées en
// préparant le formulaire « Sécurité des données » de Play, `docs/exploitation/fiche-google-play.md`
// §1.4, corrigées sur décision de la personne qui pilote). Ce que la connexion Google transmet en
// plus de l'adresse ; l'identifiant de notification, enregistré quel que soit le canal ; l'adresse IP
// et l'appareil de chaque session ; l'échec d'une soumission du bilan, qui est un repère de parcours ;
// GitHub et Cloudflare pour les sauvegardes ; et un export qui ne rendait ni les identités ni les
// sessions (`20261002195246_l_export_rend_les_identites_et_les_sessions.sql`, puis
// `20261002201448_l_export_rend_aussi_les_messages.sql` pour les messages, et
// `20261002203559_l_export_retire_le_jeton_du_message.sql`, qui retire du message le jeton de
// désinscription que la deuxième y avait laissé). **Aucune ne change ce
// que le produit fait** : la page décrit ce qui existait déjà, donc ce n'est pas l'élargissement que
// « Évolutions de ce document » promet d'annoncer dans l'application avant qu'il prenne effet.
// Une phrase repose sur une lecture et non sur une mesure, et se vérifie sur le premier build :
// que Firebase attribue son identifiant dès le premier lancement, permission accordée ou non
// (initialisation automatique de `firebase-messaging`, embarqué par `expo-notifications`).
// La page déclare plutôt trop que pas assez. La réécriture de l'adresse IP d'une session à chaque
// renouvellement, elle, est mesurée (stack locale, GoTrue v2.196, 02/10/2026 : `203.0.113.10` puis
// `198.51.100.20` après un rafraîchissement).
//
// **02/10/2026 : la file d'attente locale des erreurs** (`src/types/erreurs-en-attente.ts`). La page
// écrivait que les repères de parcours « n'écrivent rien de plus sur ton appareil », et la file y garde
// désormais une panne qui n'a pas pu partir — le type de l'erreur, l'écran et l'heure, trente jours au
// plus. Relevé par la contre-lecture de la file ; la phrase a été validée par la personne qui pilote
// le même jour (« OK pour corriger la phrase »), comme chaque phrase de cette page. La date suit la
// mise en ligne, heure de Paris.
//
// **04/10/2026 : Cloudflare Turnstile** (`src/lib/captcha.ts`, plan anti-abus). Celle-ci **change ce
// que le produit fait** : l'adresse IP et des informations techniques sur le navigateur partent chez
// un nouveau destinataire, dès la mise en ligne. C'est donc l'élargissement que « Évolutions de ce
// document » promet d'annoncer dans l'application avant qu'il prenne effet — relevé par la
// contre-lecture du captcha —, et la personne qui pilote a décidé le même soir que la mise à jour
// datée de cette page en tient lieu, sans annonce dans l'application, **parce qu'aucun lancement
// officiel n'a eu lieu et qu'elle en est alors la seule utilisatrice**. La raison vaut jusqu'au
// lancement (redit le 06/10/2026) : après lui, un élargissement s'annonce. Le texte de l'entrée
// Cloudflare et du paragraphe des transferts a été validé par elle, comme chaque phrase de cette page.
//
// **05/10/2026 : la trace des codes de connexion envoyés** (plafonds d'e-mail, plan anti-abus,
// `20261005103733_les_plafonds_d_e_mail.sql`). Les plafonds comptent chaque code parti — compte, date,
// empreinte de l'adresse — dans un journal purgé au bout de deux jours au plus : une donnée de plus,
// que la liste des durées de conservation devait nommer, et que l'export rend. Le journal garde aussi
// les demandes que les plafonds ont tues, d'où « demandes » et « ce qu'il en est advenu ». Et la fiche
// Resend ne parlait que des rappels, alors que les codes de connexion y passaient déjà par le SMTP —
// faux depuis le 20/09/2026, relevé par la contre-lecture du hook. Les deux textes validés par la
// personne qui pilote le même jour.
//
// **05/10/2026 encore : les codes de connexion passent par Brevo** (`20261005125029_les_codes_par_brevo.sql`).
// Brevo entre dans la liste, avec sa mesure des ouvertures, anonymisée — Brevo ne laisse pas la couper
// soi-même —, et Resend n'y garde que les rappels. La page est en ligne avant que la clé Brevo soit
// posée : jusque-là les codes partent encore par Resend, et la page dit l'état qui arrive. Textes
// validés par la personne qui pilote le même jour.
//
// **06/10/2026 : un code de connexion qui n'a pas pu partir** (`connexion_limite`,
// `20261006140000_le_menage_d_auth_et_les_verrous_visibles.sql`). L'app enregistre désormais qu'une
// demande de code a été refusée par la limite d'envoi, avec l'écran d'où elle part, jamais l'adresse :
// un échec de plus parmi ceux que nomme le paragraphe des repères. Phrase proposée le 06/10/2026 et
// voulue par la personne qui pilote le même jour (« faisons les modifs maintenant »). Pas d'annonce dans
// l'application : **tant que Ramille n'est pas lancé, la date de mise à jour en tient lieu**, et ce n'est
// plus une exception (la règle du 04/10/2026 ci-dessus vaut jusqu'au lancement, fiche Play §1.7).
//
// **18/10/2026 : l'audit juridique du jour** (`docs/exploitation/registre-des-traitements.md`,
// `sous-traitants.md`, `violations.md`). Trois choses changent ici, aucune ne change ce que le produit
// fait — donc, comme toujours avant le lancement, la date en tient lieu d'annonce. (1) « Où sont tes
// données » nomme l'entité, le pays et le mécanisme de transfert de chaque prestataire (art. 13, 1, f
// du RGPD), le moyen d'en obtenir copie, et la réutilisation propre de Cloudflare pour Turnstile (il
// est responsable de traitement de ce qu'il en tire pour améliorer sa détection, d'après son avenant
// Turnstile du 18/06/2025). (2) Les repères de parcours gagnent ce que l'app enregistre et que la page
// ne disait pas : la plateforme, la version de l'app (à l'ouverture et dans chaque panne) et d'où la
// panne a été captée — l'ajout de la version et de l'origine est celui du chantier C de la même vague.
// (3) La phrase « il n'y a rien à consentir » est partie : elle affirmait une absence de consentement
// que ni la CNIL ni le code ne garantissent — les repères sont rattachés à une session et servent aussi
// aux rappels et à la purge, donc ce ne sont pas les « statistiques anonymes » que l'exemption de la CNIL
// exige (« Cookies : solutions pour les outils de mesure d'audience », 04/07/2025). La page dit
// maintenant ce qui est mesuré, sur quelle base, et comment s'y opposer **aujourd'hui** : par e-mail
// (art. 21 du RGPD), car l'app n'a aucun réglage pour les couper — **une phrase qui en promettrait un
// serait pire que pas de phrase**. Ce qu'une opposition fait vraiment (supprimer les repères déjà
// enregistrés ; en enregistrer moins à l'avenir exige un réglage) est une décision de produit, laissée
// à la personne qui pilote. (4) Trois exactitudes que le code imposait : la suppression des sessions
// anonymes peut s'étaler sur plusieurs nuits (garde de volume de la purge, `20261006130000`), la sauvegarde
// garde une copie chiffrée des repères (ils ne « quittaient pas l'hébergeur » que sans elle), et la plateforme
// est enregistrée avec chaque repère. (5) La contre-lecture du même jour : la liste des durées nomme les
// corrections du contexte, une donnée du compte que l'export rend, et le compteur horaire des événements ;
// l'origine d'une erreur et la version ne sont dites que des erreurs inattendues, seules à les porter ; et
// les hébergeurs viennent de `src/constants/editeur.ts`. Textes à valider par la personne qui pilote, comme
// chaque phrase de cette page.
//
// **19/10/2026 : l'opposition arrête la mesure** (décision de la personne qui pilote). La phrase de
// l'opposition dit désormais que l'enregistrement cesse, sauf la date de dernière ouverture et la
// plateforme, et pourquoi la date reste ; la liste des durées nomme la date de l'opposition, une donnée du
// compte que l'export rend. Même jour que la refonte d'au-dessus, donc même date de mise à jour — à avancer
// si la page part en production un autre jour.
//
// **22/10/2026 : l'identifiant de notification suit le canal choisi** (audit du 18/10/2026, `v1-27`
// §12.30, premier point). Il n'est plus enregistré qu'avec la notification choisie, et celui d'un
// téléphone passé à l'email ou à « Sans rappel » est désactivé au démarrage suivant
// (`leJetonAuDemarrage`, `src/types/rappels.ts`). Cinq phrases suivent : l'identifiant dans la liste
// de ce qui est enregistré, sa base légale — l'exécution du service et non plus l'intérêt légitime,
// puisqu'il ne sert qu'à la notification demandée —, Expo, qui ne reçoit plus rien sans elle, ce que
// garde une session anonyme, et la durée de conservation de l'identifiant.
//
// **22/10/2026 : l'adresse IP d'une session s'efface après 90 jours sans servir** (décision de la
// personne qui pilote, `v1-35` étape 2, `20261022123448_l_ip_des_sessions_s_efface.sql`). Deux phrases :
// la définition des sessions, et la liste des durées, qui disait « sans limite de durée ». La session
// elle-même reste — la fermer déconnecterait la personne. Même jour que l'entrée d'au-dessus, donc même
// date de mise à jour.
//
// **23/10/2026 : une session anonyme attend 120 jours sans servir, et non plus 90** (décision de la personne
// qui pilote, `v1-35` étape 4, `20261023174656_la_purge_attend_une_saison.sql`) : une saison dure environ
// 91 jours, et Ramille promet d'être là à chacune. Deux phrases : ce que devient une session jamais
// rattachée, et la liste des durées.
//
// **Et le même jour, la page d'accueil du site** (`v1-35` étape 5) : la racine du web présente le produit
// sans ouvrir de session, et la phrase qui nomme les pages qui n'en créent pas la compte. Même date.
//
// **24/10/2026 : ce que les « oui » ont évité, au moins** (décision de la personne qui pilote, `v1-35`
// étape 6a, `ce_qu_un_oui_a_evite`). Le plan et le suivi disent des kilos de CO₂e évités, calculés depuis
// les réponses au bilan et aux points : un résultat calculé de plus, que la définition nomme. Rien de
// nouveau n'est demandé à la personne, et l'export le rend.
//
// **Et le même jour, répondre depuis l'e-mail** (`v1-35` étape 6b, `repondre_depuis_l_e_mail`) : l'e-mail du
// point porte trois liens de réponse, qui agissent sans connexion. Quatre phrases : ce que font ces liens et
// leur portée — la question de cet e-mail, sa réponse pendant sa période, rien après —, qu'un e-mail transféré
// laisse en faire autant, la page de réponse parmi celles qui n'ouvrent pas de session, et l'heure d'usage du
// lien dans la trace d'un rappel. Même date.
const UPDATED_AT = '24 octobre 2026';

const SECTIONS: LegalSection[] = [
  {
    heading: 'Qui est responsable de tes données',
    blocks: [
      {
        kind: 'paragraph',
        text:
          `${APP_NAME} est un projet personnel, développé et publié par ${EDITOR_NAME} à titre non ` +
          'professionnel et sans but lucratif. C’est donc une personne physique, et non une société, ' +
          'qui est responsable du traitement de tes données.',
      },
      {
        kind: 'paragraph',
        text:
          'Pour toute question sur tes données, ou pour exercer les droits décrits plus bas, écris à ' +
          `${CONTACT_EMAIL}.`,
      },
    ],
  },
  {
    heading: 'Ce que nous collectons, et pourquoi',
    blocks: [
      {
        kind: 'paragraph',
        text:
          `${APP_NAME} estime l’empreinte carbone de tes déplacements à partir de ce que tu déclares. ` +
          'Ce que tu déclares ne sert qu’à produire ce résultat et à te le restituer dans le temps. S’y ajoutent ce ' +
          'que nos services techniques enregistrent d’eux-mêmes — tes sessions, ce que Google transmet si tu passes ' +
          'par lui — et l’identifiant de notification que l’application enregistre, décrits ci-dessous, dont nous ' +
          'ne nous servons pas pour autre chose que faire fonctionner la connexion et les notifications.',
      },
      {
        kind: 'definitions',
        items: [
          {
            term: 'Tes réponses au bilan',
            text:
              'Existence d’un trajet domicile-travail régulier, nombre de jours par semaine, distance, mode ou modes de transport, ' +
              'précisions sur ce mode (motorisation, type de deux-roues, type de train, vélo mécanique ou à assistance), ' +
              'covoiturage et nombre de personnes, fréquence et distance de tes trajets loisirs, ' +
              'nombre de vols, de trajets longue distance en train, en autocar et en voiture par an, type de zone d’habitation, ' +
              'accès perçu aux transports en commun, nombre de véhicules du foyer, jours de télétravail possibles.',
          },
          {
            term: 'Les résultats calculés',
            text:
              'Le total annuel estimé, sa répartition par poste, le poste qui pèse le plus, et le plan de réduction associé. ' +
              'Ces résultats sont figés au moment du calcul pour rester comparables dans le temps. Quand tu réponds « oui » ' +
              'à un point de suivi, le gain d’une seule fois de ton action donne aussi ce que tu as évité, au moins.',
          },
          {
            term: 'Tes réponses aux points de suivi',
            text: 'Ta réponse à la question périodique (oui, non, ou pas concerné cette fois-là), et sa date.',
          },
          {
            term: 'Ton compte, si tu en crées un',
            text:
              'Ton adresse email. Si tu passes par Google, nous recevons aussi l’identifiant du compte Google, ainsi ' +
              'que le nom et l’adresse de la photo de profil, que notre service d’authentification demande à Google par ' +
              'défaut : nous ne les lisons ni ne ' +
              'les affichons. Rien d’autre — ni tes contacts, ni ton agenda, ni aucune autre donnée Google.',
          },
          {
            term: 'Tes sessions de connexion',
            text:
              'Pour chaque session ouverte sur un appareil, la session anonyme comprise, notre service ' +
              'd’authentification enregistre l’adresse IP et le navigateur ou le système de sa dernière utilisation, ' +
              'remplacés à chaque renouvellement de la session, et effacés quand elle reste 90 jours sans servir. ' +
              'C’est son fonctionnement ordinaire : nous ne nous en servons pas, et nous n’en tirons aucune position.',
          },
          {
            term: 'L’identifiant de notification de ton téléphone',
            text:
              'Si tu choisis les notifications comme canal de rappel et que ton téléphone les accepte, nous ' +
              'enregistrons l’identifiant qui permet de lui en envoyer. Avec un rappel par email ou sans rappel, nous ' +
              'ne le demandons pas, et celui que ton téléphone avait déjà est désactivé au démarrage suivant de ' +
              'l’application. Couper les notifications dans les réglages du téléphone le désactive de même.',
          },
        ],
      },
      {
        kind: 'paragraph',
        text:
          'Si tu nous envoies un retour, nous enregistrons ton message, la catégorie que tu as choisie et, le cas ' +
          'échéant, l’écran d’où il part — rattachés à ton compte pour pouvoir rapprocher ton retour de ce que tu ' +
          'vois. Ces retours sont lus à la main et ne déclenchent aucune réponse : il n’existe aucun canal pour t’en ' +
          'adresser une, et nous préférons te le dire plutôt que de te laisser l’attendre.',
      },
      {
        kind: 'paragraph',
        text:
          'Nous enregistrons aussi quelques repères de parcours dans l’application : quels écrans tu as ouverts et ' +
          'd’où tu y arrivais, à quelle étape du questionnaire tu en es, si tu as partagé ton bilan, demandé un code ' +
          'de connexion ou rattaché un compte — et, quand tu cherches un compte existant, si cet appareil portait déjà ' +
          'un bilan —, et le fait qu’une erreur inattendue s’est produite (un écran qui n’a pas réussi à s’afficher, ' +
          'une opération restée sans réponse, une erreur qui a fermé l’application), qu’un envoi de ton bilan a échoué ' +
          'ou qu’un code de connexion n’a pas pu partir : le type de l’erreur et l’endroit, jamais son message, et pour ' +
          'une erreur inattendue, d’où elle vient. Chaque repère porte aussi ' +
          'la plateforme (web ou Android), et ceux de l’ouverture de l’application et des erreurs inattendues la ' +
          'version de l’application que tu utilises, pour savoir si un défaut vient d’une version précise. Ces ' +
          'repères ne portent rien d’autre : ni texte que tu aurais saisi, ni adresse IP, ni identifiant d’appareil, et ' +
          'aucun suivi de ce que tu fais ailleurs. Ils servent à voir où le produit décroche pour le réparer. ' +
          'L’ouverture de l’application sert aussi à savoir que tu es toujours là : elle remet tes rappels à leur ' +
          'rythme normal et repousse la suppression automatique d’une session anonyme (le détail plus bas). Ces ' +
          'repères sont enregistrés chez notre hébergeur et aucun outil d’analyse tiers ne les reçoit ; la sauvegarde ' +
          'chiffrée de la base en garde une copie, comme du reste.',
      },
      {
        kind: 'paragraph',
        text:
          'La base légale est l’exécution du service que tu demandes. Pour les rappels par email et pour les repères de ' +
          'parcours, c’est notre intérêt légitime — maintenir le suivi que tu as commencé dans un cas, corriger ce qui ne ' +
          'fonctionne pas dans l’autre. Ce que nos services techniques enregistrent d’eux-mêmes — tes sessions, ce que ' +
          'Google transmet — relève de l’exécution du service : la connexion ne fonctionne pas sans. L’identifiant de ' +
          'notification, que nous ne demandons que si tu choisis les notifications, en relève aussi : sans lui, elles ' +
          'ne peuvent pas t’arriver. Tu peux désactiver les rappels à tout moment depuis l’écran « Toi », ou par le ' +
          'lien « ne plus recevoir ces rappels » au bas de chaque email : ce lien agit sans ouvrir l’application, et sans ' +
          'que tu aies à te connecter. Les liens de réponse du même email aussi : tant que la période de sa question ' +
          'n’est pas finie, ils montrent cette question, la réponse que tu y as donnée et ce qu’elle a évité, et ils ' +
          'enregistrent ta réponse — une fois que tu l’as confirmée sur la page qu’ils ouvrent. Ensuite, ils ne ' +
          'montrent plus que la question. Comme le lien de désinscription, ils valent pour qui a l’email : si tu le ' +
          'transfères, la personne qui le reçoit peut en faire autant.',
      },
      {
        kind: 'paragraph',
        // **La décroissance se dit, parce qu'elle décrit un traitement automatisé** : les rappels
        // s'espacent puis s'arrêtent selon ce que la personne fait, et ce qui est observé pour en
        // décider est une donnée la concernant. Le dire ici vaut mieux que de la laisser découvrir
        // qu'on a cessé d'écrire.
        text:
          'Les rappels s’espacent d’eux-mêmes, puis s’arrêtent. Si plusieurs questions de suite passent sans réponse, ' +
          'nous n’envoyons plus qu’un message par mois, et au bout de huit nous n’écrivons plus du tout — il suffit ' +
          'd’ouvrir l’application, ou de répondre à une question, pour que le rythme normal reprenne. La question, elle, ' +
          'continue de t’attendre dans l’application : c’est seulement le message qui s’espace.',
      },
      {
        kind: 'paragraph',
        // **Le mot de la veille (C4.2) se dit ici, à côté de l'espacement qui le coupe** : c'est un
        // second message, qui part la veille d'un jour choisi. Sa règle d'envoi vit dans
        // `mettre_en_file_les_mots_de_la_veille` — notification seule, dix semaines, régime normal —,
        // et la retoucher là-bas impose de relire cette phrase.
        text:
          'Le mot de la veille ne part que si tu l’as demandé : par notification, pendant les dix semaines qui ' +
          'suivent la première action de trajet que tu choisis dans la saison, et jamais une fois les rappels ' +
          'espacés. Tu l’arrêtes depuis l’écran « Toi », et choisir « Sans rappel » l’arrête aussi.',
      },
    ],
  },
  {
    heading: 'Ce que nous ne collectons pas',
    blocks: [
      {
        kind: 'paragraph',
        text: 'Cette liste n’est pas une intention, c’est une description du produit tel qu’il est construit.',
      },
      {
        kind: 'bullets',
        items: [
          'Aucune géolocalisation, aucun suivi automatique de tes déplacements. Le produit repose sur ce que tu déclares, parce que la prise de conscience passe par le moment où tu choisis, pas par une mesure passive.',
          'Aucun traceur publicitaire, aucun cookie de mesure d’audience tierce. Les repères de parcours décrits plus ' +
            'haut ne sont confiés à aucun outil d’analyse et ne permettent de te suivre sur aucun autre site.',
          'Aucune revente, location ou cession de tes données à qui que ce soit.',
          'Aucune comparaison entre utilisateurs. Ton bilan n’est jamais rapproché de celui de quelqu’un d’autre, ni classé.',
        ],
      },
    ],
  },
  {
    heading: 'Avant même que tu crées un compte',
    blocks: [
      {
        kind: 'paragraph',
        text:
          'Dès l’ouverture de l’application, une session anonyme est créée pour que ton bilan puisse être enregistré et te ' +
          'revenir si tu fermes puis rouvres l’app. Lire cette page, la page d’accueil du site, les conditions ' +
          'd’utilisation, la page de suppression de compte, celle qui coupe les rappels ou celle qui reçoit ta ' +
          'réponse depuis un email n’en crée pas. Cette session n’est reliée à aucune identité : ni email, ni nom, ni ' +
          'numéro de téléphone — sauf l’adresse que tu saisis pour recevoir un code, gardée même si tu ne vas pas au ' +
          'bout, jusqu’à ce que tu la confirmes, en saisisses une autre ou que la session soit supprimée. Comme toute ' +
          'session, elle garde l’adresse IP et l’appareil de sa dernière utilisation, et l’identifiant de ' +
          'notification si tu choisis les notifications comme canal de rappel (le détail plus haut).',
      },
      {
        kind: 'paragraph',
        text:
          'Si tu ne rattaches jamais cette session à un compte, elle et toutes les données associées sont supprimées ' +
          'automatiquement après 120 jours sans utilisation de l’application. Tant que tu reviens, rien n’est effacé. ' +
          'Si tu crées un compte, ton bilan déjà effectué reste attaché à toi : rien n’est à ressaisir.',
      },
    ],
  },
  {
    heading: 'Où sont tes données, et qui les traite pour nous',
    blocks: [
      {
        kind: 'paragraph',
        text:
          'Tout ce que tu déclares et tout ce que nous en calculons sont hébergés dans l’Union européenne. Nous faisons ' +
          'appel aux prestataires suivants, chacun pour une fonction précise, et chacun ne reçoit que ce qui sert à ' +
          'cette fonction :',
      },
      {
        kind: 'definitions',
        items: [
          {
            term: 'Supabase',
            text:
              'Base de données, authentification et hébergement des données applicatives — donc l’intégralité de tes ' +
              'réponses, de tes résultats et de ton compte. ' +
              `Serveurs situés à ${HEBERGEUR_DES_DONNEES.emplacementDesServeurs} (région eu-west-3), chez Amazon Web ` +
              `Services. Le contrat est conclu avec ${HEBERGEUR_DES_DONNEES.nom}, société singapourienne : il l’autorise à traiter ` +
              'ces données hors de la région choisie si le service ou la loi l’exige, et il incorpore à ce titre les clauses ' +
              'contractuelles types de la Commission européenne.',
          },
          {
            term: 'Vercel',
            text:
              'Hébergement de la version web de l’application. Vercel sert les pages, sans rien lire dans la base. ' +
              'Si tu utilises « Partager mon bilan », c’est aussi Vercel qui fabrique la carte d’aperçu à partir du ' +
              'lien que tu génères : ce lien porte ton total annuel, ton poste principal et sa part — rien d’autre. ' +
              `${HEBERGEUR_DU_SITE.nom}, société américaine (Californie), inscrite au Data Privacy Framework.`,
          },
          {
            term: 'Resend',
            text:
              'Envoi des rappels par email, si tu as choisi ce canal : reçoit alors ton adresse email et le texte du ' +
              'rappel, c’est-à-dire la question de ton point (le détail plus bas). Plus Five Five, Inc. (Resend), ' +
              'société américaine (Californie), inscrite au Data Privacy Framework ; son contrat de sous-traitance ' +
              'incorpore aussi les clauses contractuelles types.',
          },
          {
            term: 'Brevo',
            text:
              'Envoi des codes de connexion par email : reçoit alors ton adresse email et le code. Brevo mesure ' +
              'l’ouverture de ces emails de façon anonymisée ; nous ne lisons pas cette mesure. Sendinblue SAS (Brevo), ' +
              'société française, à Paris ; d’après son contrat, les données sont hébergées en France et en Belgique.',
          },
          {
            term: 'Expo',
            text:
              'Acheminement des notifications vers ton téléphone, si tu les as choisies comme canal de rappel. Expo ' +
              'reçoit alors l’identifiant que Google attribue à l’application sur ton téléphone et un identifiant ' +
              'd’installation, et nous rend l’identifiant de notification ; puis le texte de chaque notification : la ' +
              'question de ton point, ou le mot de la veille si tu l’as demandé (le détail plus bas). Avec un rappel par ' +
              'email ou sans rappel, aucun de ces identifiants ne lui est envoyé. 650 Industries, Inc. (Expo), ' +
              'société américaine, serveurs situés aux États-Unis, inscrite au Data Privacy Framework.',
          },
          {
            term: 'Google (Firebase Cloud Messaging)',
            text:
              'La couche du système Android qui remet les notifications à ton téléphone. Elle attribue un identifiant à ' +
              'l’application sur ton téléphone, dès son premier lancement, que tu acceptes les notifications ou non, et ' +
              'ne remet un message que dans les cas décrits juste au-dessus. Google LLC, société américaine, inscrite au ' +
              'Data Privacy Framework ; les conditions de traitement des données de Firebase incorporent aussi les ' +
              'clauses contractuelles types.',
          },
          {
            term: 'Google (connexion avec un compte Google)',
            text:
              'Vérification de ton identité, uniquement si tu choisis de te connecter avec un compte Google. Google ' +
              'nous transmet alors ton adresse email, l’identifiant de ton compte Google, ton nom et l’adresse de ta ' +
              'photo de profil. Google LLC, société américaine, inscrite au Data Privacy Framework. Ce que Google fait ' +
              'de ta connexion relève de ses propres règles de confidentialité, pas des nôtres.',
          },
          {
            term: 'GitHub',
            text:
              'Fabrication de la sauvegarde hebdomadaire de la base : une machine de GitHub Actions en fait une copie, ' +
              'sessions exceptées, et la chiffre, puis la machine est effacée à la fin de l’opération. GitHub, Inc., ' +
              'société américaine, inscrite au Data Privacy Framework.',
          },
          {
            term: 'Cloudflare',
            text:
              'Vérification que c’est bien une personne, et non un robot, qui ouvre une session ou demande un code de ' +
              'connexion : Cloudflare reçoit alors ton adresse IP et des informations techniques sur ton navigateur ou ' +
              'ton téléphone, rien de ce que tu déclares. Il agit pour notre compte, mais il réutilise aussi ces ' +
              'informations pour son propre compte, afin d’améliorer sa détection des robots : pour cet usage, c’est lui ' +
              'le responsable de traitement, d’après sa politique de confidentialité de Turnstile. Stockage des ' +
              'sauvegardes, déjà chiffrées, dans un espace situé dans l’Union européenne. Elles s’effacent d’elles-mêmes ' +
              'au bout de 90 jours. Cloudflare, Inc., société américaine, inscrite au Data Privacy Framework ; son ' +
              'avenant de sous-traitance incorpore aussi les clauses contractuelles types.',
          },
        ],
      },
      {
        kind: 'paragraph',
        text:
          'Tes réponses, tes résultats et ton compte sont stockés dans l’Union européenne, chez Supabase. Plusieurs des ' +
          'fonctions ci-dessus passent en revanche par des sociétés américaines, et ce qui leur parvient sort donc de ' +
          'l’Union européenne : l’acheminement des notifications (Expo, puis Google pour Android), la connexion avec un ' +
          'compte Google, l’hébergement de la version web (Vercel), les rappels par email (Resend), la vérification ' +
          'anti-robot (Cloudflare) et la fabrication des sauvegardes (GitHub). À la date de mise à jour de cette page, ' +
          'ces sociétés sont inscrites sur la liste officielle du Data Privacy Framework (dataprivacyframework.gov/list), ' +
          'par lequel la Commission européenne reconnaît un niveau de protection adéquat aux entreprises américaines qui ' +
          's’y certifient. Là où un contrat de sous-traitance incorpore aussi les clauses contractuelles types de la ' +
          'Commission européenne, c’est écrit ci-dessus. Cloudflare garde par ailleurs les sauvegardes chiffrées dans ' +
          `l’Union européenne. Pour obtenir copie de ces garanties, ou savoir où les lire, écris à ${CONTACT_EMAIL}.`,
      },
      {
        kind: 'paragraph',
        text:
          'Ce qui parvient à chacun se limite à sa fonction. Pour le rappel : ce qui permet de te le remettre — ton ' +
          'adresse email, ou l’identifiant de notification de ton appareil — et le texte du rappel. Ce texte est la ' +
          'question de ton point, par exemple « Mardi ou jeudi, as-tu fait ce trajet à vélo ? » : selon le cas, elle ' +
          'nomme le poste sur lequel elle porte, ton mode de transport, l’action que tu as choisie et les jours que tu ' +
          't’es fixés. Si tu as demandé le mot de la veille, la notification du soir nomme aussi ce que tu as prévu ' +
          'pour ton trajet, par exemple « Demain, tu as prévu de faire ton trajet à vélo. » C’est tout ce qui sort de ' +
          'ton bilan et de ton plan par ce canal : il n’y figure aucun chiffre, ' +
          'aucun de tes totaux, aucune autre de tes réponses. Pour la connexion Google : l’adresse du ' +
          'compte avec lequel tu choisis de te connecter. Pour la sauvegarde : une copie de la base, sessions exceptées, que ' +
          'GitHub chiffre avant qu’elle quitte sa machine, et que Cloudflare ne reçoit que chiffrée. Pour la carte de ' +
          'partage : le lien que tu génères toi-même, ' +
          'avec ton total annuel, ton poste principal et sa part — tant que tu ne partages rien, rien ne part. Le canal ' +
          'de rappel se choisit — et s’éteint complètement — depuis l’écran « Toi », ou par le lien de désinscription de ' +
          'n’importe quel email de rappel.',
      },
      {
        kind: 'paragraph',
        text:
          'L’accès à tes données est cloisonné au niveau de la base : les règles de sécurité n’autorisent la lecture et ' +
          'l’écriture de tes lignes qu’à toi. Aucun autre utilisateur ne peut y accéder.',
      },
    ],
  },
  {
    heading: 'Combien de temps nous les gardons',
    blocks: [
      {
        kind: 'bullets',
        items: [
          'Session anonyme jamais rattachée à un compte : supprimée automatiquement après 120 jours sans utilisation ' +
            'de l’application. Tant que tu reviens, rien n’est effacé — ouvrir l’application, commencer un bilan, ' +
            'répondre à un point de suivi ou nous envoyer un retour remet le compteur à zéro. La suppression a lieu ' +
            'la nuit, et une garde de sécurité peut l’étaler sur plusieurs nuits si beaucoup de sessions arrivent à ' +
            'échéance en même temps.',
          'Compte rattaché : tes données sont conservées tant que ton compte existe, puisque leur intérêt est précisément de te montrer une évolution dans la durée.',
          'Bilan retiré : un bilan que tu retires n’apparaît plus dans ton suivi, mais il reste conservé — et ' +
            'dans l’export de tes données — jusqu’à la suppression de ton compte, ou de ta session anonyme si ' +
            'tu n’as pas créé de compte.',
          'Repères de parcours : supprimés automatiquement au bout de douze mois. Au-delà, ils ne disent plus rien du ' +
            'produit tel qu’il est.',
          'Sessions de connexion : gardées tant que ton compte existe. Leur adresse IP et leur appareil sont effacés ' +
            'quand une session reste 90 jours sans servir ; si elle sert de nouveau, la nouvelle adresse est notée. Une session part quand tu ' +
            'te déconnectes de cet appareil, si l’appareil joint alors notre service, et toutes partent avec la ' +
            'suppression de ton compte ou la suppression automatique d’une session anonyme.',
          'Identifiant de notification de ton téléphone : désactivé au prochain démarrage de l’application si tu ' +
            'passes aux rappels par email ou sans rappel, ou si tu as retiré la permission dans les réglages du ' +
            'téléphone, et au premier envoi qui échoue si l’application est désinstallée ; puis supprimé 90 jours plus ' +
            'tard. Tant que tu gardes les notifications, il reste enregistré, même quand aucun rappel ne part. Il part ' +
            'dans tous les cas avec la suppression de ton compte et avec la suppression automatique d’une session ' +
            'anonyme.',
          'Rappels envoyés : une fois le rappel parti (ou abandonné), sa trace — période concernée, canal, date ' +
            'd’envoi, message, et l’heure de la dernière réponse donnée par ses liens — est gardée six mois, le temps de pouvoir vérifier qu’un rappel est bien parti quand ' +
            'tu nous dis ne pas l’avoir reçu. Elle est supprimée ensuite.',
          'Demandes de code de connexion par e-mail : pour chacune, nous gardons deux jours une trace — le compte ' +
            'concerné, la date, ce qu’il en est advenu et une empreinte de l’adresse, jamais l’adresse elle-même — le ' +
            'temps d’appliquer les plafonds qui empêchent les envois abusifs. Elle est supprimée ensuite.',
          'Corrections de ton contexte de mobilité : pour que personne ne puisse faire recalculer son bilan et son ' +
            'plan sans fin, nous gardons le nombre de fois où tu l’as corrigé sur vingt-quatre heures (vingt au plus) ' +
            'et la date de la première de ces corrections — un nombre et une date, rien d’autre —, tant que ton compte ' +
            'ou ta session anonyme existe, et l’export de tes données les rend. Si tu t’opposes aux repères de ' +
            'parcours, nous gardons de même la date de ton opposition, tant que ton compte ou ta session existe, et ' +
            'l’export la rend. Le nombre d’événements que notre ' +
            'service reçoit à chaque ' +
            'heure, qui borne ce que la base accepte, ne porte aucun identifiant et s’efface au plus tard au bout de ' +
            'trois jours.',
          'À la suppression de ton compte, l’ensemble de tes bilans, résultats, points de suivi, plans, retours, ' +
            'repères de parcours et sessions est supprimé.',
          'Après une suppression, il ne reste que des compteurs, sans aucun identifiant — et, le temps qu’elles ' +
            'expirent, nos sauvegardes chiffrées, effacées d’elles-mêmes au bout de 90 jours. Quand une session anonyme ' +
            'est supprimée automatiquement, nous ajoutons un à un compteur qui ne retient que sa semaine d’arrivée, jusqu’où elle ' +
            'était allée (bilan, action choisie, point répondu), combien de semaines elle avait duré et où en étaient ' +
            'ses rappels ; quand tu supprimes ton compte, un au compteur du mois. Ces compteurs ne portent ni ' +
            'adresse, ni identifiant, ni date plus précise que la semaine, et ils sont gardés sans limite de durée.',
        ],
      },
    ],
  },
  {
    heading: 'Cookies et stockage local',
    blocks: [
      {
        kind: 'paragraph',
        text:
          `${APP_NAME} n’utilise aucun cookie publicitaire ni aucun outil de mesure d’audience tierce. Le stockage utilisé ` +
          'sur ton appareil est strictement nécessaire au fonctionnement : il conserve ta session, le brouillon du ' +
          'questionnaire en cours, l’adresse email de ta dernière demande de code — pour ne pas te la faire retaper ' +
          'si tu reviens saisir ce code plus tard — et quelques préférences d’affichage. Tout cela reste sur cet appareil, et part avec ' +
          'la suppression de ton compte. Les repères de parcours décrits plus haut sont enregistrés côté serveur, ' +
          'rattachés à la session que le produit a déjà besoin de conserver, à une exception près : quand une erreur ' +
          'n’a pas pu partir tout de suite — hors connexion, ou parce qu’elle a fermé l’application —, le type de ' +
          'l’erreur, l’écran concerné, son origine et la version de l’application attendent sur ton appareil, trente ' +
          'jours au plus, de pouvoir partir. ' +
          'La vérification anti-robot de Cloudflare peut aussi enregistrer des informations sur ton appareil ; selon ' +
          'Cloudflare, elles sont strictement nécessaires à la détection des robots.',
      },
      {
        kind: 'paragraph',
        // **Cette phrase remplace « il n'y a rien à consentir »** (audit du 18/10/2026), qui affirmait une absence
        // de consentement qu'aucune source lue ne garantit. Elle dit trois choses vérifiables : ce qui est
        // mesuré (la liste de la section « Ce que nous collectons »), sur quelle base (l'intérêt légitime,
        // dite plus haut), et le seul chemin d'opposition qui existe : un e-mail. **Elle ne promet pas de
        // réglage, parce que l'app n'en a aucun.** Depuis le 19/10/2026, elle dit que l'enregistrement
        // s'arrête, sauf la date de dernière ouverture (`refuser_la_mesure`, `MESURE.md` §5, décision de la
        // personne qui pilote), et pourquoi cette date reste. L'identifiant demandé est celui que l'export
        // rend (`export_my_data`, clé `compte.identifiant`) : sans lui, une session anonyme n'a aucun nom
        // qui permette de retrouver ses repères. Reste la question de l'article 82 de la loi Informatique et Libertés, à trancher par un
        // juriste : la CNIL n'exempte la mesure d'audience que pour des statistiques anonymes, et ces repères
        // sont rattachés à une session (`registre-des-traitements.md` §8).
        text:
          'Nous ne te présentons aucune bannière de consentement : ce que ton appareil conserve se limite à ce qui est ' +
          'nécessaire au fonctionnement, et les repères de parcours reposent sur notre intérêt légitime, non sur ton ' +
          'consentement. Tu peux t’opposer à ces repères à tout moment (droit d’opposition, article 21 du RGPD) en ' +
          `écrivant à ${CONTACT_EMAIL}, en joignant l’identifiant de ton compte, qui figure dans l’export de tes données. ` +
          'Nous répondons dans le délai d’un mois indiqué plus bas et, si ta demande est fondée, nous supprimons les ' +
          'repères déjà enregistrés pour ta session et nous cessons d’en enregistrer. Seules restent la date de ta ' +
          'dernière ouverture de l’application et la plateforme (web ou Android) : cette date règle le rythme de tes ' +
          'rappels et repousse la suppression automatique d’une session inutilisée. L’application n’a pas de réglage ' +
          'pour le faire toi-même : nous le faisons à ta demande.',
      },
    ],
  },
  {
    heading: 'Tes droits',
    blocks: [
      {
        kind: 'paragraph',
        text:
          'Conformément au RGPD, tu disposes d’un droit d’accès, de rectification, d’effacement, de portabilité, ' +
          'de limitation et d’opposition sur tes données.',
      },
      {
        kind: 'paragraph',
        text:
          'Deux d’entre eux s’exercent directement dans l’application, sans avoir à écrire à qui que ce soit : ouvre ' +
          '« Ton compte », l’icône en haut à droite de l’écran, puis la section « Mes données » de l’écran « Toi ». ' +
          'Tu y trouves de quoi récupérer ' +
          'l’intégralité de ce que nous conservons sur toi, au format JSON, et de quoi supprimer définitivement ton ' +
          'compte. La suppression est immédiate et sans confirmation par email — tes bilans, ton plan, tes points de ' +
          'suivi, tes retours, tes repères de parcours et tes sessions disparaissent avec elle.',
      },
      {
        kind: 'paragraph',
        text:
          'Si tu n’as plus l’application installée, la suppression reste possible depuis un navigateur, ' +
          `sur ${ORIGINE_CANONIQUE}/compte/suppression : on t’y envoie un code à l’adresse de ton compte, et la ` +
          'suppression se confirme sur place. Cette page ne peut jamais créer de compte.',
      },
      {
        kind: 'paragraph',
        text:
          `Pour tout le reste, écris à ${CONTACT_EMAIL}. Nous répondons dans un délai d’un mois.`,
      },
      {
        kind: 'paragraph',
        text:
          'Tu peux choisir ton canal de rappel, ou n’en recevoir aucun, à tout moment depuis l’écran « Toi » — ' +
          '« Ton compte », l’icône en haut à droite — sans avoir à nous écrire.',
      },
      {
        kind: 'paragraph',
        text:
          'Si tu estimes que tes droits ne sont pas respectés, tu peux introduire une réclamation auprès de la CNIL ' +
          '(Commission nationale de l’informatique et des libertés), 3 place de Fontenoy, 75007 Paris, ou sur cnil.fr.',
      },
    ],
  },
  {
    heading: 'Les chiffres que nous affichons',
    blocks: [
      {
        kind: 'paragraph',
        text:
          'Les facteurs d’émission utilisés proviennent de la Base Empreinte de l’ADEME, consultée via l’API publique ' +
          'Impact CO2. Ton bilan est une estimation déclarative, pas une mesure : il sert à faire apparaître des ordres ' +
          'de grandeur et le poste sur lequel tu as le plus de prise, pas à produire un chiffre exact.',
      },
    ],
  },
  {
    heading: 'Évolutions de ce document',
    blocks: [
      {
        kind: 'paragraph',
        text:
          'Si cette politique change, la date de dernière mise à jour en haut de cette page le dit : c’est aujourd’hui ' +
          'le seul signal dont tu disposes. Un changement qui élargirait ce que nous collectons, ou ce que nous en ' +
          'faisons, serait annoncé dans l’application avant de prendre effet.',
      },
    ],
  },
];

export default function Confidentialite() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      updatedAt={UPDATED_AT}
      intro={`${APP_NAME} collecte ce qui sert à estimer l’empreinte carbone de tes déplacements et à t’accompagner dans la durée, et ses services techniques enregistrent d’eux-mêmes quelques données de fonctionnement. Cette page dit précisément quoi, pourquoi, pendant combien de temps, et ce que tu peux exiger.`}
      sections={SECTIONS}
    />
  );
}
