/**
 * La liste fermée des libellés de `poste` sur la carte de partage (05/10/2026, plan anti-abus).
 *
 * `api/partage.ts` et `api/share-card.ts` n'acceptent plus qu'un libellé que l'app sait produire ;
 * tout autre est ignoré, et l'aperçu retombe sur sa forme sans poste. La liste vit dans `api/`, qui
 * ne peut pas importer `src/` : c'est une recopie, et une recopie dérive. Le défaut qu'elle ferait
 * est muet — un mode ajouté au produit, un poste renommé, et les partages réels perdent leur ligne
 * « Poste principal » sans que rien ne casse ni d'un côté ni de l'autre.
 *
 * D'où deux exigences, et pas une de plus :
 *   - **chaque libellé que `dominantShareLabel` produit est accepté par la page**, appelée pour de
 *     vrai : quatre noms de poste (le résiduel des sorties rares compris) × chaque mode connu, et
 *     sans mode ;
 *   - **les deux fonctions portent le même bloc**, au caractère près : la carte ne se charge pas
 *     sous Jest (satori, resvg, un binaire wasm), donc c'est l'identité du bloc qui étend à elle ce
 *     que la page prouve. Ce que la carte en fait, `scripts/verifier-api.mjs` le rend.
 *
 * L'inverse — que la liste ne porte **que** ce que l'app produit — n'est pas exigé : un libellé
 * retiré de l'app garde lisibles les liens déjà partagés, et il n'ouvre rien.
 *
 * Éprouvé en le cassant le 05/10/2026 (chaque mutation remise en place avant la suivante) : retirer
 * « en TGV » de la page seule fait tomber 2 tests (le bloc diffère, et 4 libellés sont refusés) ;
 * retirer « Loisirs occasionnels » des deux copies, 1 (4 × 25 = 100 attendus, 25 refusés) ; ajouter
 * un mode à l'app (`MODE_IDS` et sa préposition) sans le recopier, 1 ; faire accepter tout libellé (`return brut`)
 * dans les deux copies, 1 — le libellé forgé passe.
 */
import fs from 'node:fs';
import path from 'node:path';

import partage from '../api/partage';
import { POSTES } from '../src/constants/postes';
import { MODE_IDS, dominantShareLabel, type ResultatBilan } from '../src/types/resultat';

const racine = path.resolve(__dirname, '..');

function bloc(fichier: string): string {
  const source = fs.readFileSync(path.join(racine, fichier), 'utf8');
  const debut = source.indexOf('// <postes-partageables>');
  const fin = source.indexOf('// </postes-partageables>');
  if (debut === -1 || fin === -1 || fin < debut) return '';
  return source.slice(debut, fin);
}

/** Tous les libellés que l'app peut mettre dans `poste`, construits par la fonction qui les met. */
function libellesDeLApp(): string[] {
  const libelles = new Set<string>();
  for (const poste of POSTES) {
    const marqueurs = poste === 'leisure' ? ['Loisirs du week-end', 'Loisirs du week-end (occasionnels)'] : ['x'];
    for (const dominant_poste_label of marqueurs) {
      for (const dominant_poste_mode of [null, ...MODE_IDS]) {
        libelles.add(
          dominantShareLabel({
            dominant_poste: poste,
            dominant_poste_label,
            dominant_poste_mode,
          } as ResultatBilan)
        );
      }
    }
  }
  return [...libelles];
}

async function descriptionPour(poste: string): Promise<string> {
  const reponse = partage(
    new Request(`https://www.ramille.fr/api/partage?${new URLSearchParams({ total: '2.4', poste, percent: '58' })}`)
  );
  const html = await reponse.text();
  return html.match(/<meta name="description" content="([^"]*)">/)?.[1] ?? '';
}

describe('le poste de la carte de partage', () => {
  it('est le même bloc dans les deux fonctions', () => {
    const page = bloc('api/partage.ts');
    expect(page).not.toBe('');
    expect(bloc('api/share-card.ts')).toBe(page);
  });

  it('accepte chaque libellé que l’app produit', async () => {
    const libelles = libellesDeLApp();
    // Quatre noms (le résiduel des sorties rares compris) × (chaque mode, et aucun).
    expect(libelles).toHaveLength(4 * (MODE_IDS.length + 1));
    const refuses: string[] = [];
    for (const libelle of libelles) {
      if (!(await descriptionPour(libelle)).includes(`: ${libelle}.`)) refuses.push(libelle);
    }
    expect(refuses).toEqual([]);
  });

  it('ignore un libellé forgé, et l’aperçu retombe sur sa forme sans poste', async () => {
    const forge = await descriptionPour('Trajet domicile-travail en jet privé');
    expect(forge).toBe('Calcule la tienne en 5 minutes sur Ramille.');
    expect(await descriptionPour('Trajet domicile-travail')).toContain(': Trajet domicile-travail.');
  });
});
