import { APP_NAME } from '@/constants/produit';

/**
 * Ramille — la mascotte, et tout ce qu'elle dit.
 *
 * Elle porte le nom du produit : décision du 05/09/2026, produit et personnage ne font qu'un
 * (cf. docs/architecture/v1-09-renommage-ramille.md). Un test épingle l'égalité pour qu'elle
 * ne dérive pas par inadvertance ; si un jour on la sépare, c'est ici et dans ce test.
 *
 * Ses phrases vivent toutes ici, pas dans les écrans, pour la même raison que les repères
 * chiffrés vivent dans carbon-reference.ts : une voix qui se déclare à dix endroits finit par
 * se contredire au onzième. Trois règles, découlant de ce qui est déjà acté sur la mascotte
 * (aucune expression négative, jamais à côté d'un chiffre lourd, le produit ne commente pas) :
 *
 *   1. Elle parle à la première personne, court, en tutoyant.
 *   2. **Jamais un nombre dans sa bouche.** Les chiffres restent au produit ; elle accompagne.
 *      Un test refuse tout chiffre dans ces lignes — c'est aussi ce qui garantit qu'elle ne
 *      commente jamais une empreinte.
 *   3. Jamais « tu devrais », « il faut ». Toujours une porte ouverte, jamais une injonction.
 *
 * Les répliques de check-in sont celles des maquettes validées (canvas
 * docs/design/v1-08-mascotte) : on ne les réécrit pas, on les rattache à elle.
 *
 * **Une exception, et une seule** : « Rien à rattraper. » a été retirée le 07/09/2026 sur un
 * retour d'usage explicite — la phrase se lisait comme une attente déçue la première fois
 * qu'on la voyait, alors qu'elle devait dire le contraire. Ramille dit maintenant l'attente
 * (v1-12 §6.3). Le rythme du produit étant fixe — le lundi, le premier du mois — elle peut
 * nommer le jour sans jamais compter, ce qui est la seule façon de tenir la règle 2 tout en
 * disant quand elle revient.
 */
export const MASCOT_NAME = APP_NAME;

export const RAMILLE = {
  /** Onboarding, première apparition — la promesse d'accompagnement, dite par celle qui la tient. */
  presentation: `Moi, c’est ${MASCOT_NAME}. Je serai là à chaque saison, à ton rythme.`,

  /** Attente du calcul du bilan — son seul moment de réflexion. */
  calcul: 'Je calcule ton bilan…',

  /** Check-in répondu oui (maquette validée). */
  checkinOui: 'Bien joué — chaque changement compte.',

  /** Check-in répondu non (maquette validée) : une relance, jamais une déception. */
  checkinNon: 'Pas cette fois-ci. Rien d’obligatoire, on se repose la question au prochain point.',

  /**
   * **La troisième réponse : « pas de trajet cette période »** (C2.4, v1-14 §3.1).
   *
   * Une semaine de congés n'est pas un « Non ». La réplique dit donc une attente, pas une relance :
   * il n'y a rien à consoler, rien à encourager, et surtout rien à reprocher — c'est exactement la
   * raison d'être du troisième choix. Visage `calm`, comme `maintienNon`.
   *
   * **Quatre variantes et non deux, et c'est un écart au canvas** (consigné en `v1-14` §10). Le
   * canvas en écrit deux, indexées sur la boucle — « Pas de trajet … » pour l'hebdomadaire, « Pas
   * de voyage … » pour la mensuelle — mais la boucle mensuelle couvre **deux** postes depuis C2.6 :
   * les voyages et les sorties du week-end. Répondre « Pas de voyage, pas de question. » à
   * quelqu'un qui vient d'appuyer sur « Pas de sortie en septembre » serait la même fausseté
   * lisible que C2.6 a retirée ailleurs. Les variantes sont donc indexées sur le **poste**, comme
   * le libellé du bouton, et `autre` ferme la liste pour un point d'avant C2.6 qui n'en porte pas.
   *
   * Le jour de retour est nommé sans jamais compter — le rythme du produit est fixe (le lundi, le
   * premier du mois), ce qui est la seule façon de tenir la règle « jamais un nombre » tout en
   * disant quand elle revient.
   */
  checkinSansObjet: {
    commute: 'Pas de trajet, pas de question. On se retrouve lundi.',
    leisure: 'Pas de sortie, pas de question. On se retrouve au début du mois prochain.',
    travel: 'Pas de voyage, pas de question. On se retrouve au début du mois prochain.',
    autre: 'Pas de déplacement, pas de question. On se retrouve au prochain point.',
  },

  /**
   * **Le « Non » d'une question de maintien, et la raison d'un second tableau** (C2.5, v1-14 §3.1).
   *
   * Quand le trajet se fait déjà à vélo, à pied ou en trottinette, le point ne demande pas si
   * quelque chose a changé mais si l'habitude a tenu. Son « Non » ne décrit donc aucun manquement
   * — une semaine en voiture ne défait pas une année de vélo — et `checkinNon` (« Pas cette
   * fois-ci. Rien d'obligatoire… ») y serait une consolation d'échec là où il n'y a pas d'échec.
   * C'est exactement ce que le chantier existe pour retirer : la recevoir cinquante-deux fois par
   * an, juste sous un écran qui dit « Tu fais déjà l'essentiel », était le défaut A13-3.
   *
   * Le mode est nommé parce que c'est lui qui porte l'identité qu'on renforce — « le vélo reste
   * ton trajet » ne vaut pas « ce trajet reste le tien ». Le canvas n'a écrit que les deux
   * premières variantes ; `trottinette` et `autre` sont ajoutées parce que la catégorie
   * `velo_marche` compte **trois** modes en base et qu'un mode inattendu ne doit pas retomber sur
   * `checkinNon` (écart consigné en `v1-14` §10).
   */
  maintienNon: {
    velo: 'Noté. Le vélo reste ton trajet ; une semaine autrement n’y change rien.',
    marche: 'Noté. La marche reste ton trajet ; une semaine autrement n’y change rien.',
    trottinette: 'Noté. La trottinette reste ton trajet ; une semaine autrement n’y change rien.',
    autre: 'Noté. Ce trajet-là reste le tien ; une semaine autrement n’y change rien.',
  },

  /**
   * Restitution, profil sans aucune émission — le seul moment de félicitation de tout l'écran,
   * et le seul endroit où elle a quelque chose à ajouter au texte.
   *
   * La phrase vivait dans l'écran, à la deuxième personne et hors de portée du test (A3-13) :
   * « Tes déplacements n'émettent quasiment rien. » Elle est dans sa voix maintenant. Aucun
   * chiffre n'est affiché dans cette branche de la carte, donc la règle « jamais à côté d'un
   * chiffre lourd » est tenue sans condition.
   */
  bilanQuasiNul: 'Je ne vois presque rien à compter chez toi — c’est rare.',

  /**
   * /suivi, quand la personne a des bilans mais aucun point répondu. Contexte différent de
   * la carte d'attente du plan : ici il n'y a rien à annoncer — ni jour, ni canal —, la
   * cadence dépend de la boucle et une date fausse serait pire que pas de date.
   */
  suiviSansPoint: 'Je note tes réponses ici, au fil des saisons.',

  /**
   * Juste après « C'est noté », sur la feuille : ce qui va se passer, avant de demander quoi
   * que ce soit. Deux variantes selon la boucle qui concerne la personne — jamais un nombre
   * de jours, toujours le jour lui-même.
   */
  engagementAttenteHebdo: 'Je te laisse mener ton action. Lundi, je reviens te demander si tu l’as faite.',
  engagementAttenteMensuel:
    'Je te laisse mener ton action. Au début du mois prochain, je reviens te demander si tu l’as faite.',

  /** La question de la feuille — le choix du canal vient après, et il est du produit. */
  choixCanal: 'Comment tu préfères que je te fasse signe ?',

  /** Carte d'attente du plan, quand un rappel partira : elle s'engage, et elle tient. */
  attenteSigneHebdo: 'Je te fais signe lundi.',
  attenteSigneMensuel: 'Je te fais signe au début du mois prochain.',

  /**
   * Carte d'attente du plan, sans rappel. Ce n'est pas une punition : elle revient *ici* de
   * toute façon, c'est l'app qui porte le rendez-vous quand aucun canal ne le porte.
   */
  attenteIciHebdo: 'On se retrouve ici lundi.',
  attenteIciMensuel: 'On se retrouve ici au début du mois prochain.',

  /** Suppression de compte effectuée : on ne retient pas, on salue. */
  auRevoir: 'Merci d’être passé. Si tu reviens, on repart de zéro, tranquillement.',

  /** Page 404 — la seule page qu'on atteint sans l'avoir voulu : elle rend la main. */
  introuvable: 'Cette page n’existe pas. Ton bilan et ton plan, si — je te ramène.',
} as const;
