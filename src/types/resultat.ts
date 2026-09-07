/**
 * Le résultat d'un bilan a **deux entrées, et un seul écran** (v1-11 §1).
 *
 * En fin de questionnaire, c'est l'aboutissement : on propose la suite (le plan) et, la
 * première fois, on propose de rattacher un compte. Ouvert depuis le suivi, c'est la relecture
 * d'un instantané : ni suite ni proposition, mais un retour — sinon l'écran pousserait vers un
 * plan qu'on a déjà, et redemanderait un compte à chaque consultation de son historique.
 *
 * Dérivé ici plutôt que dans l'écran pour la raison habituelle : c'est une règle, elle se
 * teste, et elle ne doit pas se réinventer si une troisième entrée apparaît un jour.
 */
export type ModeResultat = 'nouveau' | 'relecture';

/**
 * `nouveau` seulement sur le paramètre explicite posé par le questionnaire à sa dernière
 * étape. Tout le reste — un lien partagé, un favori, une entrée du suivi, un paramètre
 * absent — est une relecture. Le défaut penche vers le mode le plus sobre : se tromper en
 * relecture ne fait rien perdre, alors que se tromper en « nouveau » relancerait une
 * proposition de compte à quelqu'un qui consulte simplement son historique.
 */
export function modeResultat(nouveau: string | undefined): ModeResultat {
  return nouveau === '1' ? 'nouveau' : 'relecture';
}
