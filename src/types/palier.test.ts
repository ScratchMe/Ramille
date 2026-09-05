import { nextPalier } from './palier';

// 0,6 t — le repère transport 2050, cf. `carbon-reference.ts`. Écrit en dur ici pour que le
// test dise ce qu'il éprouve plutôt que de recopier la dérivation.
const CIBLE = 600;

describe('nextPalier', () => {
  it('propose une marche de la taille du cap de la saison', () => {
    const palier = nextPalier(4380, 768, CIBLE);
    expect(palier).toEqual({ targetKg: 3612, reductionKg: 768, reachesTarget2050: false });
  });

  it('donne le même effort relatif quel que soit le point de départ', () => {
    // C'est la propriété qui a fait retenir cette mécanique : la trajectoire linéaire, elle,
    // offrait −609 kg/an à 15,8 t et −6 kg/an à 0,76 t.
    const gros = nextPalier(15820, 3164, CIBLE);
    const petit = nextPalier(1330, 266, CIBLE);
    expect(gros!.reductionKg / 15820).toBeCloseTo(0.2, 5);
    expect(petit!.reductionKg / 1330).toBeCloseTo(0.2, 5);
  });

  it('ne propose rien à qui est déjà sous le repère 2050', () => {
    // Demander −20 % de plus à quelqu'un qui fait déjà l'essentiel est exactement ce que
    // `/plan` refuse. Quatre des treize bilans en base sont dans ce cas.
    expect(nextPalier(600, 100, CIBLE)).toBeNull();
    expect(nextPalier(260, 100, CIBLE)).toBeNull();
    expect(nextPalier(55, 100, CIBLE)).toBeNull();
  });

  it('ne propose rien sans cap exploitable', () => {
    // Pas de cycle de plan, ou un cap nul : on ne dit rien plutôt que d'inventer une marche.
    expect(nextPalier(4380, null, CIBLE)).toBeNull();
    expect(nextPalier(4380, undefined, CIBLE)).toBeNull();
    expect(nextPalier(4380, 0, CIBLE)).toBeNull();
  });

  it('borne le palier au repère 2050 quand le cap le dépasserait', () => {
    // Un palier « sous 2050 » ne serait pas une étape mais l'arrivée : on l'annonce comme
    // telle, et la réduction affichée reste celle qui y mène vraiment.
    const palier = nextPalier(700, 300, CIBLE);
    expect(palier).toEqual({ targetKg: 600, reductionKg: 100, reachesTarget2050: true });
  });

  it('ne rend jamais une réduction supérieure à ce qui sépare du repère', () => {
    for (const total of [700, 900, 1500, 4380, 15820]) {
      const palier = nextPalier(total, total, CIBLE);
      expect(palier!.targetKg).toBeGreaterThanOrEqual(CIBLE);
      expect(palier!.reductionKg).toBeLessThanOrEqual(total - CIBLE);
    }
  });
});
