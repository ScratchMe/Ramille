// Résoudre `@/…` comme le fait le bundler, pour qu'un script puisse IMPORTER `src/`.
//
// Node 22 exécute le TypeScript en retirant les types (le dépôt s'en sert déjà pour `api/` dans
// `scripts/verifier-api.mjs`), mais il ne connaît pas l'alias `@/` de `tsconfig.json` : sans ce
// crochet, importer `src/types/checkin.ts` échoue sur `@/constants/mascotte`. Les alias ne sont pas
// tous équivalents — `import type` est effacé par le retrait des types, donc seuls les imports de
// **valeurs** passent ici.
//
// Pourquoi importer plutôt que lire le source : un analyseur de `as const` par expression
// régulière est exactement là où la fragilité vit (v1-27 §12.5). La valeur importée est celle que
// l'app utilise, sans intermédiaire à tenir d'accord.
//
// Usage : `node --import ./scripts/alias.mjs …`, ou `register()` depuis le script lui-même.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SRC = path.join(import.meta.dirname, '..', 'src');

/** Les extensions que le bundler essaie, dans son ordre. */
const CANDIDATS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const base = path.join(SRC, specifier.slice(2));
    for (const suffixe of CANDIDATS) {
      const chemin = `${base}${suffixe}`;
      if (fs.existsSync(chemin) && fs.statSync(chemin).isFile()) {
        return nextResolve(pathToFileURL(chemin).href, context);
      }
    }
  }
  return nextResolve(specifier, context);
}
