import { faceAuClavier } from './face-au-clavier';

/**
 * Ce test garde le calcul, pas l'appel : que les écrans à champ se posent dans `AuDessusDuClavier`,
 * seul un téléphone le montre.
 *
 * **Éprouvé en le cassant le 03/10/2026**, une mutation sur un fichier égal au commit, restauré depuis
 * sa copie : la fonction qui rend toujours `null` fait tomber « rembourre sur Android » — seulement.
 */
describe('faceAuClavier', () => {
  it('rembourre sur Android, où la fenêtre ne rétrécit plus sous le clavier', () => {
    expect(faceAuClavier('android')).toBe('padding');
  });

  it('ne fait rien sur le web, où le navigateur réduit la zone visible lui-même', () => {
    expect(faceAuClavier('web')).toBeNull();
  });
});
