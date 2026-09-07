/**
 * Lecture de la configuration Supabase — module **pur**, sans aucun import de
 * `@/lib/supabase` (règle du CLAUDE.md : son constructeur lève sans variables
 * d'environnement et ferait échouer toute la suite Jest).
 *
 * Il existe parce que l'échec était invisible là où il comptait le plus. `src/lib/supabase.ts`
 * levait à l'exécution du module : sur web on lit l'erreur dans la console, mais **sur un
 * build natif de production elle ne se lit nulle part** — l'exception part avant le premier
 * rendu, l'app s'ouvre et se referme, et rien sur le téléphone ne distingue ce cas d'un
 * plantage natif. C'est arrivé le 07/09/2026 (v1-10 §10.4) et seule la page du build sur
 * expo.dev a permis de le voir.
 *
 * Les valeurs sont passées en argument et jamais lues ici : `process.env.EXPO_PUBLIC_*` est
 * **remplacé textuellement** par le bundler Expo, donc l'accès doit être écrit en toutes
 * lettres sur le site d'appel — et pas n'importe comment, voir l'en-tête de
 * `src/lib/supabase.ts` : la forme choisie décide si la valeur arrive ou si elle vaut
 * `undefined` en production, sans que rien ne le signale. Exactement le genre de panne que ce
 * module existe pour rendre visible.
 */

export const VARIABLES_SUPABASE = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
] as const;

export type VariableSupabase = (typeof VARIABLES_SUPABASE)[number];

export type ProblemeConfiguration =
  | { type: 'manquante'; variable: VariableSupabase }
  /**
   * L'URL d'un projet Supabase ne porte **aucun chemin** : `https://<ref>.supabase.co`.
   * Y coller l'URL de l'API REST (`.../rest/v1`) produit des requêtes vers
   * `/rest/v1/auth/v1/signup` et une seule erreur à l'écran, « Invalid path specified in
   * request url » — qui ne dit ni quelle variable est en cause ni ce qu'elle devrait valoir.
   * Deuxième cycle de build perdu le 07/09/2026 ; le seul indice était le journal Supabase.
   */
  | { type: 'url_avec_chemin'; variable: 'EXPO_PUBLIC_SUPABASE_URL'; valeur: string };

export type ConfigurationSupabase =
  | { complete: true; url: string; anonKey: string }
  | { complete: false; problemes: ProblemeConfiguration[] };

/** Une valeur vide ou blanche vaut absente : `EXPO_PUBLIC_SUPABASE_URL=` est l'erreur de
 *  `.env` la plus courante, et elle est indiscernable d'une variable non déclarée à l'usage. */
function renseignee(valeur: string | undefined): valeur is string {
  return typeof valeur === 'string' && valeur.trim().length > 0;
}

/** `https://x.supabase.co` et `https://x.supabase.co/` sont bons ; tout ce qui porte un
 *  segment de chemin ne l'est pas. On ne valide pas le domaine : un projet auto-hébergé est
 *  légitime, un chemin ne l'est jamais. */
export function urlPorteUnChemin(url: string): boolean {
  const sansProtocole = url.trim().replace(/^https?:\/\//, '');
  const premierSlash = sansProtocole.indexOf('/');
  if (premierSlash === -1) return false;
  return sansProtocole.slice(premierSlash + 1).length > 0;
}

export function lireConfigurationSupabase(env: {
  EXPO_PUBLIC_SUPABASE_URL: string | undefined;
  EXPO_PUBLIC_SUPABASE_ANON_KEY: string | undefined;
}): ConfigurationSupabase {
  const problemes: ProblemeConfiguration[] = [];

  // Ordre de déclaration : l'écran les liste dans l'ordre où on les renseigne.
  for (const variable of VARIABLES_SUPABASE) {
    if (!renseignee(env[variable])) problemes.push({ type: 'manquante', variable });
  }

  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  if (renseignee(url) && urlPorteUnChemin(url)) {
    problemes.push({ type: 'url_avec_chemin', variable: 'EXPO_PUBLIC_SUPABASE_URL', valeur: url.trim() });
  }

  if (problemes.length > 0) return { complete: false, problemes };

  return {
    complete: true,
    // `renseignee` a déjà écarté undefined et les blancs ; le trim évite qu'un retour à la
    // ligne collé depuis le tableau de bord parte dans une URL.
    url: (url as string).trim(),
    anonKey: (env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string).trim(),
  };
}

/** Texte destiné à la personne qui développe, jamais à un utilisateur : ni la voix de Ramille
 *  ni un ton rassurant n'ont leur place ici — ce qu'il faut, c'est la cause exacte. */
export function decrireProbleme(probleme: ProblemeConfiguration): string {
  switch (probleme.type) {
    case 'manquante':
      return `${probleme.variable} n’est pas définie.`;
    case 'url_avec_chemin':
      return `${probleme.variable} comporte un chemin (${probleme.valeur}). L’URL d’un projet Supabase s’arrête au domaine, sans /rest/v1 ni rien après.`;
  }
}
