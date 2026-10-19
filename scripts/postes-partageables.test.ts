/**
 * Ce que les deux fonctions de partage (`api/partage.ts`, `api/share-card.ts`) lisent d'une adresse, face
 * à ce que l'app produit : `api/_partage-commun.ts` est le seul endroit qui le dit, et il ne peut pas
 * importer `src/` (tsconfig dédié, runtime Web Fetch API). Ce fichier est donc la frontière — il lit
 * les deux côtés et exige qu'ils s'accordent.
 *
 * Le défaut que ces gardes préviennent est muet. Un mode ajouté au produit, un poste renommé, un
 * format de total changé : les vrais partages perdent leur ligne « Poste principal », ou sont
 * redirigés en boucle, ou refusés en 400, sans que rien ne casse d'un côté ni de l'autre.
 *
 * Quatre exigences, et pas une de plus :
 *   - **chaque libellé que `dominantShareLabel` produit est accepté** : quatre noms de poste (le
 *     résiduel des sorties rares compris) × chaque mode connu, et sans mode ;
 *   - **chaque adresse que `urlDePartage` produit est canonique** : lue sans rien perdre, et servie
 *     telle quelle — jamais redirigée, jamais refusée. C'est la contrepartie de la redirection des
 *     variantes : une forme canonique qui ne serait pas celle de l'app redirigerait chaque vrai
 *     partage ;
 *   - **le total se dit comme `formatTonnes`** (`src/lib/format.ts`), kilo par kilo : la règle des
 *     kilos sous la tonne est recopiée dans `api/`, et un partage dont le titre dit « 1,0 t » quand
 *     le message dit « 999 kg » se contredit lui-même ;
 *   - **les fonctions ne redéfinissent rien de ce que le module commun porte** : la copie qu'on
 *     remettrait par commodité redeviendrait, en silence, une seconde règle.
 *
 * L'inverse de la première — que la liste ne porte **que** ce que l'app produit — n'est pas exigé : un
 * libellé retiré de l'app garde lisibles les liens déjà partagés, et il n'ouvre rien.
 *
 * Le rendu (la page et la carte appelées pour de vrai, la redirection, le 400, le cache) est joué par
 * `scripts/verifier-api.mjs`, que Jest ne peut pas faire : la carte ne se charge pas ici (satori,
 * resvg, un binaire wasm). L'import en `./_partage-commun.js` des fonctions, Jest le résout par le
 * `moduleNameMapper` de `package.json`, qui le renvoie au `.ts` : c'est ce qui permet à la sonde
 * (`sonder-la-production.test.ts`) de charger la vraie page.
 *
 * Éprouvé en le cassant le 18/10/2026 (chaque mutation remise en place avant la suivante) :
 * retirer « en TGV » de la liste fait tomber 2 tests (4 libellés refusés, et les adresses de l'app
 * qui le portent ne sont plus canoniques) ; retirer « Loisirs occasionnels », 2 ; faire renommer
 * le TGV par l'app sans que la liste suive, 2 ; faire accepter tout libellé (`return brut`), 1 — le
 * libellé forgé passe ; passer le total canonique à deux décimales, 2 (chaque adresse de l'app serait
 * redirigée) ; mettre `percent` avant `poste` dans la forme canonique, 1 ; changer le seuil des kilos
 * (`< 1000` → `<= 1000`), 1 ; ne plus mettre la virgule décimale, 2 ; remettre une copie de
 * `posteFerme` dans `api/partage.ts`, 1. **Une mutation passait** : remplacer l'arrondi des kilos par
 * une troncature (`Math.floor`) — équivalente sur tout ce que l'app envoie, des kilos entiers passés
 * par trois décimales, donc invisible du balayage ; elle a sa propre assertion (0,9996 t est une
 * tonne), qui la fait tomber seule. **Ces comptes datent d'avant le 19/10/2026**, où le test des adresses
 * de l'app est devenu un `it.each` sur les deux lectures (`'refuser'`, `'ignorer'`) : une mutation qui le
 * touche y fait tomber un test de plus — non rejoué depuis.
 */
import fs from 'node:fs';
import path from 'node:path';

import { libelleDuTotal, lireLaRequete, posteFerme } from '../api/_partage-commun';
import { POSTES } from '../src/constants/postes';
import { formatTonnes } from '../src/lib/format';
import {
  MODE_IDS,
  dominantShareLabel,
  pourcentageDominant,
  urlDePartage,
  type ResultatBilan,
} from '../src/types/resultat';

const racine = path.resolve(__dirname, '..');

/** Tous les bilans dont le partage peut porter un libellé : un poste dominant, avec ou sans mode. */
function bilansDeLApp(total_co2_kg_year: number): ResultatBilan[] {
  const bilans: ResultatBilan[] = [];
  for (const poste of POSTES) {
    const marqueurs = poste === 'leisure' ? ['Loisirs du week-end', 'Loisirs du week-end (occasionnels)'] : ['x'];
    for (const dominant_poste_label of marqueurs) {
      for (const dominant_poste_mode of [null, ...MODE_IDS]) {
        bilans.push({
          total_co2_kg_year,
          dominant_poste: poste,
          dominant_poste_label,
          dominant_poste_mode,
          // La moitié du total : une part ronde, et zéro quand le bilan l'est.
          dominant_poste_co2_kg_year: total_co2_kg_year / 2,
          mobility_constrained: null,
        } as ResultatBilan);
      }
    }
  }
  return bilans;
}

/** Tous les libellés que l'app peut mettre dans `poste`, construits par la fonction qui les met. */
function libellesDeLApp(): string[] {
  return [...new Set(bilansDeLApp(4200).map((bilan) => dominantShareLabel(bilan)))];
}

describe('le poste de la carte de partage', () => {
  it('accepte chaque libellé que l’app produit', () => {
    const libelles = libellesDeLApp();
    // Quatre noms (le résiduel des sorties rares compris) × (chaque mode, et aucun).
    expect(libelles).toHaveLength(4 * (MODE_IDS.length + 1));
    expect(libelles.filter((libelle) => posteFerme(libelle) !== libelle)).toEqual([]);
  });

  it('ignore un libellé forgé, et garde le poste seul', () => {
    expect(posteFerme('Trajet domicile-travail en jet privé')).toBeNull();
    expect(posteFerme('Achetez sur un-site-quelconque.example')).toBeNull();
    expect(posteFerme('')).toBeNull();
    expect(posteFerme(null)).toBeNull();
    expect(posteFerme('Trajet domicile-travail')).toBe('Trajet domicile-travail');
  });
});

describe('l’adresse de partage que l’app produit', () => {
  // Les totaux qui comptent : zéro (bilan nul), moins d'une tonne (la règle des kilos), la bascule,
  // un total qui ne tombe pas rond sur trois décimales, le haut de la plage.
  const TOTAUX_KG = [0, 40, 499, 999, 1000, 1049, 4213.7, 15820, 199999];

  // Les deux lectures : celle de la carte, qui refuse l'illisible, et celle de la page, qui l'ignore.
  it.each(['refuser', 'ignorer'] as const)(
    'est canonique pour chaque libellé et chaque total : lue sans rien perdre, ni redirigée ni refusée (%s l’illisible)',
    (devant) => {
      const refusees: string[] = [];
      for (const kg of TOTAUX_KG) {
        for (const bilan of bilansDeLApp(kg)) {
          const adresse = urlDePartage(bilan, 'https://www.ramille.fr');
          const lecture = lireLaRequete(new URL(adresse).search, devant);
          const attendu = {
            total: Number((kg / 1000).toFixed(3)),
            poste: dominantShareLabel(bilan),
            percent: pourcentageDominant(bilan),
          };
          if (
            lecture.statut !== 'lisible' ||
            !lecture.canonique ||
            JSON.stringify(lecture.parametres) !== JSON.stringify(attendu)
          ) {
            refusees.push(`${adresse} → ${JSON.stringify(lecture)}`);
          }
        }
      }
      expect(refusees).toEqual([]);
    }
  );

  it('reste canonique sans poste : le total et la part suffisent à une adresse', () => {
    const lecture = lireLaRequete('?total=4.200&percent=50', 'refuser');
    expect(lecture).toMatchObject({ statut: 'lisible', canonique: true, query: 'total=4.200&percent=50' });
  });
});

describe('le total, dit comme dans l’app', () => {
  it('se dit comme `formatTonnes`, kilo par kilo, en passant par l’adresse', () => {
    const differences: string[] = [];
    const kilos = new Set<number>();
    for (let kg = 0; kg <= 3000; kg += 1) kilos.add(kg);
    for (let kg = 3000; kg <= 200_000; kg += 7) kilos.add(kg);
    for (const kg of kilos) {
      const [bilan] = bilansDeLApp(kg);
      const lecture = lireLaRequete(new URL(urlDePartage(bilan, 'https://www.ramille.fr')).search, 'refuser');
      if (lecture.statut !== 'lisible' || lecture.parametres.total === null) {
        differences.push(`${kg} kg : total illisible`);
        continue;
      }
      const dit = libelleDuTotal(lecture.parametres.total);
      if (dit !== formatTonnes(kg)) differences.push(`${kg} kg : « ${dit} » au lieu de « ${formatTonnes(kg)} »`);
    }
    // Le nombre d'abord, et dix exemples : une règle cassée diffère sur des milliers de totaux.
    expect({ ecarts: differences.length, premiers: differences.slice(0, 10) }).toEqual({ ecarts: 0, premiers: [] });
  });

  it('arrondit au kilo avant de comparer à la tonne : 0,9996 t est une tonne, 0,9994 t non', () => {
    expect(libelleDuTotal(0.9996)).toBe('1,0 t CO₂e');
    expect(libelleDuTotal(0.9994)).toBe('999 kg CO₂e');
    expect(libelleDuTotal(0)).toBe('0 kg CO₂e');
  });
});

describe('les deux fonctions et le module commun', () => {
  const sources = ['api/partage.ts', 'api/share-card.ts'].map((fichier) => ({
    fichier,
    source: fs.readFileSync(path.join(racine, fichier), 'utf8'),
  }));

  it.each(sources)('$fichier importe le module commun et n’en redéfinit rien', ({ source }) => {
    expect(source).toContain("from './_partage-commun.js'");
    expect(source).not.toMatch(
      /\b(?:function|const|let)\s+(?:posteFerme|libelleDuTotal|totalBorne|formatTonnes|formatPercent|POSTES_PARTAGEABLES|MODES_PARTAGEABLES|TOTAL_TONNES_MAX)\b/
    );
  });
});
