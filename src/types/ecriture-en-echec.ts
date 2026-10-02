/**
 * Ce qu'un écran dit d'une **écriture** qui n'a pas abouti — hors ligne, ou le serveur en échec.
 *
 * La décision D19 de `v1-33` (01/10/2026) a posé la règle pour les lectures : une erreur du serveur ne
 * parle pas de la connexion. **Elle ne couvrait que les lectures** (`src/types/lecture-en-echec.ts`), et
 * la contre-lecture de la PR #314 l'a relevé (`v1-33` §9) : `commitPlanAction` disait « Vérifie ta
 * connexion et réessaie. » à toute erreur, et il n'était pas seul — le choix du canal de rappel et du
 * mot de la veille, la réponse au point, le contexte corrigé et le canal de retour faisaient de même.
 * Sur une réponse 500, la personne vérifie sa connexion, la trouve bonne, et conclut que l'app ne marche
 * pas sur son téléphone.
 *
 * **La règle est celle des lectures, appliquée aux écritures** — `02/10/2026`, la dette du jour :
 *
 *   * le **constat** reste celui que chaque écran disait déjà (« Ton choix n'a pas été enregistré. ») ;
 *   * hors ligne, la suite ne change pas : « Vérifie ta connexion et réessaie. » ;
 *   * sur une réponse du serveur, elle dit d'attendre : « Réessaie dans un instant. » — la phrase que
 *     `clearPlanActionCommitment` et la déconnexion disaient déjà à toute erreur.
 *
 * Le genre se calcule comme pour une lecture — `status === 0` et rien d'autre, jamais le message — et
 * pour la même raison : « Réessaie dans un instant » reste vrai hors ligne, « Vérifie ta connexion » est
 * faux dès que le réseau n'est pas en cause. D'où `serveur` par défaut (`genreDeLEchec`).
 */
import type { GenreDEchec } from '@/types/lecture-en-echec';

export function messageDEcriture(constat: string, genre: GenreDEchec): string {
  return genre === 'horsLigne'
    ? `${constat} Vérifie ta connexion et réessaie.`
    : `${constat} Réessaie dans un instant.`;
}
