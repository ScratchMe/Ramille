/**
 * À qui appartiennent les marques locales de cet appareil, et que faire quand une session arrive —
 * [#319](https://github.com/ScratchMe/Ramille/issues/319), 02/10/2026.
 *
 * Module **pur**, pour la raison donnée en tête de `src/types/session.ts` : l'entrée-sortie vit dans
 * `src/lib/marques-locales.ts`, la décision ici, avec ses tests.
 *
 * ## Le défaut
 *
 * Les marques locales (`traceverte.*` : la marque de bilan, le premier parcours, le brouillon, la feuille
 * des rappels déjà proposée…) décrivent **un** compte, et rien ne disait lequel. Les départs voulus les
 * balaient — « Me déconnecter », la suppression, « Commencer un bilan sur cet appareil », une
 * reconnexion par code —, mais une session **anonyme refusée** n'est pas un départ voulu : `auth-js` la
 * retire à l'initialisation, l'app en ouvre une neuve, et la nouvelle lit les marques de l'ancienne
 * comme les siennes. Vu en recette le 02/10/2026 (`v1-13` §20) sur le cas réaliste d'un compte anonyme
 * purgé après 90 jours d'inactivité : la personne revient, sa nouvelle session n'a aucun bilan, et la
 * marque de bilan l'enverrait au plan au premier démarrage hors ligne.
 *
 * ## La règle
 *
 * Le refus d'une session anonyme ne se distingue pas d'une première ouverture, et c'est voulu
 * (`v1-27` §12.27). Ce qui se distingue, c'est le **propriétaire** des marques : on retient
 * l'identifiant du compte qui les porte, et une session d'un **autre** compte les balaie avant de
 * devenir leur propriétaire.
 *
 * **Sans propriétaire noté, l'arrivée ordinaire note et ne balaie rien** : c'est la première session de
 * l'appareil, ou la première depuis un départ voulu, qui a déjà tout balayé — et un brouillon écrit hors
 * ligne avant toute session doit survivre à la première. **Une reconnexion, elle, balaie** : c'est un
 * changement de compte délibéré, et c'était déjà son comportement avant cette règle.
 */

/** Ce que fait l'arrivée d'une session quand aucun propriétaire n'est noté. */
export type SiProprietaireInconnu = 'noter' | 'balayer';

/**
 * `rien` : la session est celle du propriétaire. `noter` : la retenir comme propriétaire, sans rien
 * effacer. `balayer` : effacer toutes les marques, puis la retenir.
 */
export type ConciliationDesMarques = 'rien' | 'noter' | 'balayer';

export function conciliationDesMarques(
  proprietaire: string | null,
  session: string,
  siInconnu: SiProprietaireInconnu
): ConciliationDesMarques {
  if (proprietaire === session) return 'rien';
  if (proprietaire === null) return siInconnu;
  return 'balayer';
}
