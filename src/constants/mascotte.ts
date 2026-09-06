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
 * Les répliques de check-in et de période calme sont celles des maquettes validées (canvas
 * docs/design/v1-08-mascotte) : on ne les réécrit pas, on les rattache à elle.
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

  /** /suivi, période calme (maquette validée) : rien à faire n'est pas un échec. */
  periodeCalme: 'Rien à rattraper.',
  periodeCalmeDetail: 'Tes points de suivi arrivent d’eux-mêmes, à leur rythme.',

  /** Suppression de compte effectuée : on ne retient pas, on salue. */
  auRevoir: 'Merci d’être passé. Si tu reviens, on repart de zéro, tranquillement.',

  /** Page 404 — la seule page qu'on atteint sans l'avoir voulu : elle rend la main. */
  introuvable: 'Cette page n’existe pas. Ton bilan et ton plan, si — je te ramène.',
} as const;
