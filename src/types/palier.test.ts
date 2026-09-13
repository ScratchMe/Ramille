import { nextPalier, palierEstDerriere, showsTarget2050 } from './palier';

// 0,6 t — le repère transport 2050, cf. `carbon-reference.ts`. Écrit en dur ici pour que le
// test dise ce qu'il éprouve plutôt que de recopier la dérivation.
const CIBLE = 600;
const MOYENNE = 2800;

describe('nextPalier — au-dessus du repère', () => {
  it('propose une marche de la taille du cap de la saison', () => {
    expect(nextPalier(4380, 768, CIBLE)).toEqual({
      targetKg: 3612,
      reductionKg: 768,
      isTarget2050: false,
      beyondTarget2050: false,
    });
  });

  it('donne le même effort relatif quel que soit le point de départ', () => {
    // C'est la propriété qui a fait retenir cette mécanique : la trajectoire linéaire, elle,
    // offrait −609 kg/an à 15,8 t et −6 kg/an à 0,76 t.
    const gros = nextPalier(15820, 3164, CIBLE)!;
    const petit = nextPalier(1330, 266, CIBLE)!;
    expect(gros.reductionKg / 15820).toBeCloseTo(0.2, 5);
    expect(petit.reductionKg / 1330).toBeCloseTo(0.2, 5);
  });

  it('s’arrête au repère quand le cap le dépasserait, et le signale comme tel', () => {
    // Le palier devient alors l'objectif final, pas une étape : l'écran le nomme « Repère
    // transport 2050 » plutôt que « ton prochain palier ».
    expect(nextPalier(700, 300, CIBLE)).toEqual({
      targetKg: 600,
      reductionKg: 100,
      isTarget2050: true,
      beyondTarget2050: false,
    });
  });

  it('ne rend jamais une réduction supérieure à ce qui sépare du repère', () => {
    for (const total of [700, 900, 1500, 4380, 15820]) {
      const palier = nextPalier(total, total, CIBLE)!;
      expect(palier.targetKg).toBeGreaterThanOrEqual(CIBLE);
      expect(palier.reductionKg).toBeLessThanOrEqual(total - CIBLE);
    }
  });
});

describe('nextPalier — déjà sous le repère', () => {
  // Décision produit du 05/09/2026 : on continue de proposer une marche. Ce n'est pas exiger
  // plus de qui fait déjà le plus — ce qu'on n'émet pas laisse de la marge ailleurs. Le drapeau
  // fait basculer la phrase dans ce registre, sans rien demander.
  it('propose quand même une marche, marquée comme un au-delà', () => {
    expect(nextPalier(260, 100, CIBLE)).toEqual({
      targetKg: 160,
      reductionKg: 100,
      isTarget2050: false,
      beyondTarget2050: true,
    });
  });

  it('vaut aussi pile sur le repère', () => {
    expect(nextPalier(600, 100, CIBLE)?.beyondTarget2050).toBe(true);
  });

  it('ne descend jamais sous zéro', () => {
    // Une empreinte de déplacements négative n'a aucun sens : la marche s'arrête à zéro.
    const palier = nextPalier(55, 500, CIBLE)!;
    expect(palier.targetKg).toBe(0);
    expect(palier.reductionKg).toBe(55);
  });
});

describe('nextPalier — rien à proposer', () => {
  it('ne propose rien sans cap exploitable', () => {
    // Pas de cycle de plan, ou un cap nul : c'est le profil que `/plan` accueille par « Tu fais
    // déjà l'essentiel sur ce poste ». On ne dit rien plutôt que d'inventer une marche.
    expect(nextPalier(4380, null, CIBLE)).toBeNull();
    expect(nextPalier(4380, undefined, CIBLE)).toBeNull();
    expect(nextPalier(4380, 0, CIBLE)).toBeNull();
    expect(nextPalier(260, 0, CIBLE)).toBeNull();
  });

  it('ne propose rien à une empreinte déjà nulle', () => {
    expect(nextPalier(0, 100, CIBLE)).toBeNull();
  });
});

describe('showsTarget2050', () => {
  it('cache le repère au-dessus de la moyenne, où il est un gouffre', () => {
    // 15,8 t contre 0,6 t : un rapport de 1 à 26 qu'aucune formulation ne rattrape.
    expect(showsTarget2050(15820, MOYENNE)).toBe(false);
    expect(showsTarget2050(4380, MOYENNE)).toBe(false);
  });

  it('le remontre en dessous, où il redevient un horizon crédible', () => {
    // 1,33 t contre 0,6 t : un facteur 2,2. Le masquer priverait de sa cible celui qui en est
    // le plus près.
    expect(showsTarget2050(2440, MOYENNE)).toBe(true);
    expect(showsTarget2050(1330, MOYENNE)).toBe(true);
    expect(showsTarget2050(260, MOYENNE)).toBe(true);
  });

  it('range la moyenne elle-même du côté visible', () => {
    expect(showsTarget2050(MOYENNE, MOYENNE)).toBe(true);
  });
});

describe('palierEstDerriere', () => {
  // La seule phrase du produit qui ferme la boucle du plan : le palier a été annoncé une saison plus
  // tôt, et il est passé. 4 380 kg avec un cap de 768 visait 3 612 kg.
  it('reconnaît un palier franchi', () => {
    expect(
      palierEstDerriere({
        precedentKg: 4380,
        courantKg: 3600,
        capAlorsKg: 768,
        target2050Kg: CIBLE,
      })
    ).toBe(true);
  });

  it('ne dit rien quand le palier est encore devant', () => {
    expect(
      palierEstDerriere({
        precedentKg: 4380,
        courantKg: 3700,
        capAlorsKg: 768,
        target2050Kg: CIBLE,
      })
    ).toBe(false);
  });

  // Le palier tombe **pile** dessus : il est atteint, donc derrière. La borne large est le bon choix
  // — dire « pas encore » à quelqu'un qui est exactement au seuil annoncé serait faux.
  it('compte le palier atteint exactement comme franchi', () => {
    expect(
      palierEstDerriere({
        precedentKg: 4380,
        courantKg: 3612,
        capAlorsKg: 768,
        target2050Kg: CIBLE,
      })
    ).toBe(true);
  });

  // **Le cap d'alors n'est pas toujours connaissable** : quand les deux bilans tombent dans la même
  // période, la soumission a réécrit le cycle et le cap affiché à l'époque n'existe plus. On ne dit
  // rien plutôt que de l'affirmer avec le cap d'aujourd'hui, qui est plus petit — donc un palier plus
  // proche, donc une phrase trop facile.
  it('ne prétend rien sans le cap de l’époque', () => {
    expect(
      palierEstDerriere({
        precedentKg: 4380,
        courantKg: 100,
        capAlorsKg: null,
        target2050Kg: CIBLE,
      })
    ).toBe(false);
  });

  // Un cap nul ne produit aucun palier (`nextPalier` rend `null`) : rien n'était visé, rien n'est
  // franchi. C'est le profil que `/plan` accueille par « Tu fais déjà l'essentiel sur ce poste ».
  it('ne prétend rien quand aucun palier n’était proposé', () => {
    expect(
      palierEstDerriere({ precedentKg: 500, courantKg: 100, capAlorsKg: 0, target2050Kg: CIBLE })
    ).toBe(false);
  });
});
