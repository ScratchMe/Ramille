// Le chiffre affiché à l'utilisateur, donc exactement la logique que la doctrine de test du
// dépôt vise en premier — et `src/lib/format.ts` n'avait aucun test, alors que c'est un module
// pur de six lignes lu par cinq écrans (A10-3, A10-7).
import { formatTonnesShort } from '@/constants/carbon-reference';
import { formatTonnes } from '@/lib/format';

describe('formatTonnes', () => {
  // Les valeurs du chantier C1.8, dans l'ordre : le zéro, les trois cas qui tombaient à
  // « 0,0 t » (un poste secondaire, une marche de palier), la bascule, et un bilan réel haut.
  const cas: [number, string][] = [
    [0, '0 kg CO₂e'],
    [12, '12 kg CO₂e'],
    [40, '40 kg CO₂e'],
    [49, '49 kg CO₂e'],
    [50, '50 kg CO₂e'],
    [940, '940 kg CO₂e'],
    [1000, '1,0 t CO₂e'],
    [1330, '1,3 t CO₂e'],
    [15820, '15,8 t CO₂e'],
  ];

  it.each(cas)('rend %p en « %s »', (kg, attendu) => {
    expect(formatTonnes(kg)).toBe(attendu);
  });

  // C'est le défaut complet : sous 50 kg, tout s'affichait « 0,0 t CO₂e » — le zéro, une marche
  // de palier, un poste secondaire. Trois valeurs distinctes rendues identiques.
  it('ne rend jamais deux valeurs différentes sous la tonne de la même façon', () => {
    const rendus = [0, 12, 40, 49, 50, 940].map(formatTonnes);
    expect(new Set(rendus).size).toBe(rendus.length);
  });

  // Deux bilans que le suivi affiche tous deux « 1,2 t » sous une note disant « 5 % de
  // moins » : l'écran se contredit à l'endroit exact du renforcement (A5-3, symptôme 1). Ce
  // défaut-là **reste ouvert** — le dixième de tonne est la forme au-dessus de la tonne, et le
  // remède est de dire l'écart en kilos côté suivi, pas de changer ce formateur. Ce que la
  // bascule apporte, c'est qu'une baisse qui franchit la tonne, elle, ne se lit plus identique.
  it('distingue une baisse qui franchit la tonne', () => {
    expect(formatTonnes(1040)).not.toBe(formatTonnes(980));
  });

  // L'arrondi vient avant la comparaison au seuil : 999,6 kg est une tonne, pas « 1000 kg ».
  it('bascule en tonnes dès que l’arrondi atteint la tonne', () => {
    expect(formatTonnes(999.4)).toBe('999 kg CO₂e');
    expect(formatTonnes(999.6)).toBe('1,0 t CO₂e');
  });

  it('arrondit au kilo, sans décimale', () => {
    expect(formatTonnes(12.4)).toBe('12 kg CO₂e');
    expect(formatTonnes(12.5)).toBe('13 kg CO₂e');
  });
});

// Les deux formateurs se lisent sur le même écran (`suivi/bilan.tsx`) et l'un prend des kilos
// quand l'autre prend des tonnes : les confondre décalerait de mille sans rien casser. Seule
// cette comparaison croisée reste ici — le comportement propre de `formatTonnesShort` et de
// `formatTonnesTexte` se teste à côté d'eux, dans `src/constants/carbon-reference.test.ts`.
describe('formatTonnes face à formatTonnesShort', () => {
  it('ne prennent pas la même unité — une tonne, c’est mille kilos', () => {
    expect(formatTonnesShort(1)).toBe('1,0 t');
    expect(formatTonnes(1000)).toBe('1,0 t CO₂e');
  });
});
