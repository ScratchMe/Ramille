/**
 * Ce qu'un écran dit d'une lecture qui n'a rien rendu — **hors ligne, ou le serveur en échec** (D19 de
 * `v1-33`, décidé le 01/10/2026).
 *
 * Module **pur**, pour la raison donnée en tête de `src/types/session.ts` : la lecture qui échoue (un
 * écran, `src/lib/bilan-history.ts`, `src/lib/contexte.ts`) en tire le genre, et c'est ici qu'il se
 * nomme et qu'il se dit.
 *
 * ## Le défaut
 *
 * Le plan, le suivi et `/contexte` disaient « Vérifie ta connexion. » à **toute** lecture en échec. Sur
 * une réponse 500 (capture `e-19` de l'audit), la connexion de la personne n'y est pour rien : elle
 * l'aurait vérifiée, l'aurait trouvée bonne, et aurait conclu que l'app ne marchait pas sur son
 * téléphone. La phrase du serveur ne parle pas de connexion ; celle du hors-ligne ne change pas.
 *
 * ## Pourquoi `serveur` est le genre par défaut
 *
 * Seul `status === 0` dit « pas de réponse HTTP » — c'est le discriminant que `lireLeBilan`
 * (`src/types/demarrage.ts`) justifie et que `COMPTE.md` §3 consigne : le `catch` du transport de
 * `@supabase/postgrest-js` le pose lui-même, et trois autres chemins du même paquet rendent une erreur
 * sans `code` **avec** un statut réel. Tout le reste — un statut serveur, une réponse illisible, une
 * promesse qui lève dans un module natif — se range du côté `serveur`, et c'est l'erreur la moins chère
 * des deux : « Réessaie dans un instant » reste vrai hors ligne, « Vérifie ta connexion » est faux dès
 * que le réseau n'est pas en cause. `serveur` veut donc dire « le réseau n'est pas en cause, à ce qu'on
 * en sait », pas « le serveur a répondu 500 ».
 *
 * **Jamais au message** : « Failed to fetch », « Network request failed »… varient selon la plateforme
 * et la langue du système (même règle que `lireLeBilan`).
 */

/** Pourquoi une lecture n'a rien rendu : la requête n'a pas eu de réponse, ou elle en a eu une mauvaise. */
export type GenreDEchec = 'horsLigne' | 'serveur';

/**
 * Le genre d'une lecture en échec, d'après son **statut HTTP** — `0` quand la requête n'a jamais reçu de
 * réponse (le `catch` du transport de PostgREST, un `AbortError` compris).
 */
export function genreDeLEchec(status: number): GenreDEchec {
  return status === 0 ? 'horsLigne' : 'serveur';
}

/**
 * Le genre de plusieurs lectures, dont certaines ont réussi (`null`) — ou `null` si toutes ont réussi.
 *
 * **Une coupure gagne** : hors ligne, toutes les lectures échouent ensemble, et une seule qui le dit
 * suffit à expliquer les autres — une lecture qui aurait levé avant d'atteindre le réseau, par exemple.
 * L'inverse — un serveur en panne pendant qu'une autre lecture n'a pas eu de réponse — ne se distingue
 * pas d'une coupure, et c'est elle qu'on dit.
 */
export function genreDesEchecs(genres: readonly (GenreDEchec | null)[]): GenreDEchec | null {
  if (genres.includes('horsLigne')) return 'horsLigne';
  return genres.some((genre) => genre !== null) ? 'serveur' : null;
}

/**
 * Les écrans qui disent une lecture en échec, et sous quelle forme : l'écran d'erreur plein écran
 * (« rien n'a jamais pu être lu ») ou la ligne de relecture au-dessus d'un écran déjà rempli
 * (`FRONT.md` §1.2).
 */
export type EcranEnEchec = 'plan' | 'relectureDuPlan' | 'suivi' | 'contexte';

/**
 * **Mot pour mot, et hors ligne inchangé** (D19, textes donnés par la décision). La phrase du serveur
 * ne parle pas de la connexion ; elle garde le constat, et dit d'attendre plutôt que de chercher.
 *
 * **La ligne de relecture du suivi n'y est pas** : la décision n'en donne pas le texte, et elle dit
 * encore « Vérifie ta connexion. » quel que soit le genre — à l'intégration de l'écrire
 * (`src/app/(tabs)/suivi/index.tsx`, `banniereRelecture`).
 */
const PHRASES: Record<EcranEnEchec, Record<GenreDEchec, string>> = {
  plan: {
    horsLigne: 'Ton plan n’a pas pu être relu. Vérifie ta connexion.',
    serveur: 'Ton plan n’a pas pu être relu. Réessaie dans un instant.',
  },
  relectureDuPlan: {
    horsLigne:
      'Ton plan n’a pas pu être relu à l’instant : ce que tu vois peut avoir changé depuis. Vérifie ta connexion.',
    serveur: 'Ton plan n’a pas pu être relu à l’instant : ce que tu vois peut avoir changé depuis.',
  },
  suivi: {
    horsLigne: 'Ton suivi n’a pas pu être relu. Vérifie ta connexion.',
    serveur: 'Ton suivi n’a pas pu être relu. Réessaie dans un instant.',
  },
  contexte: {
    horsLigne: 'Tes réponses n’ont pas pu être lues. Vérifie ta connexion et réessaie.',
    serveur: 'Tes réponses n’ont pas pu être lues. Réessaie dans un instant.',
  },
};

/** Ce que l'écran dit d'une lecture en échec, selon son genre. */
export function phraseDeLaLectureEnEchec(ecran: EcranEnEchec, genre: GenreDEchec): string {
  return PHRASES[ecran][genre];
}
