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
