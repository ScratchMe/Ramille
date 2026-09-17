// La règle des kilos sous la tonne, et ses jumeaux dans `api/` (point 3 de la revue du 17/09/2026).
//
// **Ce que ce fichier garde, et pourquoi il ne ressemble pas aux autres tests du dépôt.**
// `CLAUDE.md` pose une règle que rien n'appliquait : ce que `api/` duplique de `src/` doit être
// tenu des deux côtés. Elle existe parce que le défaut est arrivé — quand `formatTonnes` a basculé
// en kilos sous la tonne, le message de partage s'est mis à dire « 40 kg CO₂e » pendant que
// l'aperçu et l'image gardaient « 0,0 t CO₂e ». Les deux chiffres du même partage se
// contredisaient, sur la **seule surface publique du produit**, et aucune des deux suites de tests
// ne regardait les deux à la fois.
//
// La règle a été jouée à la main en C5.8 et a rendu « rien à faire ». C'est une réponse valable
// **une fois qu'on a regardé** — et c'est exactement ce qui ne se rejoue pas tout seul.
//
// **Pourquoi lire les sources plutôt qu'appeler les fonctions.** Trois raisons, dans l'ordre :
//
//  1. `api/share-card.ts` importe `satori` et `@resvg/resvg-wasm` au chargement du module — un
//     binaire WASM de 2,5 Mo, 57 % du poids de la fonction (`VERCEL.md` §1.7). L'importer ici
//     ferait entrer tout cela dans une suite qui tourne en quelques secondes.
//  2. Les deux copies n'ont pas la même signature (l'une prend un nombre de tonnes, l'autre une
//     chaîne de requête), donc « appeler les deux » demanderait déjà deux adaptateurs.
//  3. **Le dépôt a déjà retenu ce motif** pour les contraintes de `api/` : `VERCEL.md` §1.7 décrit
//     « une exclusion de traçage **plus un test** qui affirme que l'usage n'existe pas dans les
//     sources ». Un garde-fou qui lit du code est ici la forme normale, pas un pis-aller.
//
// Ce qu'il ne peut pas attraper, et qu'il ne prétend pas : une copie qui porterait le bon seuil et
// la mauvaise arithmétique. Ce qu'il attrape est ce qui est **arrivé** — une moitié qui bouge sans
// l'autre.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { formatTonnes } from '@/lib/format';

const API = join(__dirname, '..', '..', 'api');

/** Les fichiers de fonction, hors tests et hors configuration. */
const FICHIERS = readdirSync(API)
  .filter((nom) => nom.endsWith('.ts') && !nom.includes('.test.'))
  .map((nom) => ({ nom, source: readFileSync(join(API, nom), 'utf8') }));

/**
 * **Mutations éprouvées le 17/09/2026**, sur `api/partage.ts` — trois, et chacune tombe sur la
 * seule assertion qu'elle vise :
 *
 * | Ce qu'on casse | Ce qui tombe |
 * |---|---|
 * | le seuil passe à `kilos <= 1000` | « porte le même seuil et les mêmes deux formes » |
 * | le point décimal anglais revient (`toFixed(1)` sans `replace`) | la même |
 * | « TraceVerte » réapparaît dans une balise `og:` | « ne ressuscite pas l'ancien nom » |
 */
describe('la règle des kilos sous la tonne, des deux côtés de la frontière', () => {
  // Le côté `src/`, éprouvé pour de vrai : c'est lui qui définit la règle, les copies la suivent.
  it('bascule à mille kilos dans `src/lib/format.ts`', () => {
    expect(formatTonnes(999)).toBe('999 kg CO₂e');
    expect(formatTonnes(1000)).toBe('1,0 t CO₂e');
    // L'arrondi vient **avant** la comparaison, des deux côtés : 999,6 kg est une tonne.
    expect(formatTonnes(999.6)).toBe('1,0 t CO₂e');
  });

  // **Le relevé, pas une supposition.** Deux fichiers portent la règle aujourd'hui, `partage.ts`
  // (l'aperçu du lien) et `share-card.ts` (l'image). Le jour où une troisième surface publique
  // affiche un total, cette assertion la fait entrer dans la liste plutôt que de la laisser
  // diverger en silence — c'est le seul endroit du dépôt qui compte ces copies.
  const porteuses = FICHIERS.filter(({ source }) => source.includes('kg CO₂e'));

  it('deux fichiers de `api/` affichent un total, et ce sont ceux qu’on croit', () => {
    expect(porteuses.map(({ nom }) => nom).sort()).toEqual(['partage.ts', 'share-card.ts']);
  });

  it.each(porteuses.map(({ nom }) => nom))(
    'api/%s porte le même seuil et les mêmes deux formes',
    (nom) => {
      const source = porteuses.find((f) => f.nom === nom)!.source;

      // Les kilos arrivent d'un arrondi sur des tonnes — la conversion fait partie de la règle,
      // puisque c'est elle qui décide de quel côté du seuil on tombe.
      expect(source).toMatch(/Math\.round\(\s*\w+\s*\*\s*1000\s*\)/);
      // Le seuil lui-même, en **kilos** et strictement inférieur : `<= 1000` ferait dire
      // « 1000 kg CO₂e » là où `src/` dit déjà « 1,0 t CO₂e ».
      expect(source).toMatch(/kilos\s*<\s*1000/);
      // Les deux formes de sortie, avec leur unité — la virgule décimale comprise, une copie qui
      // rendrait « 1.0 t » sur la seule surface publique du produit étant précisément le genre
      // d'écart qu'aucune des deux suites ne voyait.
      expect(source).toMatch(/\$\{kilos\}\s*kg CO₂e/);
      expect(source).toMatch(/toFixed\(1\)\.replace\('\.', ','\)/);
      expect(source).toMatch(/t CO₂e/);
    }
  );

  // `APP_NAME` est l'autre chose que `api/` duplique, et elle est plus discrète : le produit
  // s'appelle Ramille, et « TraceVerte » ne doit pas revenir sur une surface publique — les clés
  // de stockage et les migrations le gardent volontairement, `api/` non.
  it.each(FICHIERS.map(({ nom }) => nom))('api/%s ne ressuscite pas l’ancien nom', (nom) => {
    const source = FICHIERS.find((f) => f.nom === nom)!.source;
    expect(source).not.toMatch(/TraceVerte/);
  });
});
