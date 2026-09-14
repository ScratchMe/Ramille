// Décrire une erreur pour qu'elle puisse être recopiée à la main.
//
// Module **pur** et testé : cette dérivation était une fonction privée de
// `src/components/erreur-inattendue.tsx` alors que **trois** écrans en ont besoin — le filet React,
// le démarrage, et la soumission du questionnaire. Les deux derniers écrivaient
// `erreur instanceof Error ? erreur.message : String(erreur)`, qui rend **« [object Object] »** pour
// toute erreur Supabase : un objet PostgREST (`{ code, details, hint, message }`) n'est pas une
// instance d'`Error`. Les deux écrans qui promettent « la cause exacte, à recopier » affichaient donc
// la seule chaîne qui n'en dit rien, et seulement sur les chemins d'échec — là où personne ne
// regarde tant que ça ne lui arrive pas (relevé en contre-lisant la vague 6, le 14/09/2026).

/**
 * Borne de la sortie. Ce qui est jeté n'a aucune longueur garantie : une erreur React minifiée
 * traîne son URL d'explication, une erreur Supabase son corps de réponse, un `JSON.stringify`
 * d'objet jeté tout son contenu. Le détail complet n'est de toute façon envoyé nulle part (seule la
 * *catégorie* remonte, cf. `src/types/analytics.ts`) : ce bloc sert à être recopié à la main, et
 * 600 caractères suffisent largement à le faire.
 */
export const DETAIL_MAX = 600;

/**
 * Normalisation volontairement verbeuse : un « [object Object] » affiché à la place du vrai message
 * coûterait le seul indice disponible.
 */
export function decrireErreur(erreur: unknown): string {
  if (erreur instanceof Error) {
    return (erreur.message ? `${erreur.name} : ${erreur.message}` : erreur.name).slice(0, DETAIL_MAX);
  }
  if (typeof erreur === 'string') return erreur.slice(0, DETAIL_MAX);
  try {
    // `JSON.stringify` rend `undefined` pour une fonction ou un `undefined`, et lève sur une
    // structure circulaire : les deux cas retombent sur `String()`.
    const json = JSON.stringify(erreur);
    if (typeof json === 'string') return json.slice(0, DETAIL_MAX);
  } catch {
    // Rien à journaliser ici : on est déjà dans le filet du filet.
  }
  return String(erreur).slice(0, DETAIL_MAX);
}
