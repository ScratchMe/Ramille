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

  // **Ce test éprouvait une phrase, pas la fonction** (C3.11, constat A3-2). Il s'intitulait
  // « donne le même effort relatif quel que soit le point de départ » et alimentait `nextPalier`
  // avec un cap valant exactement 20 % du **total** — une valeur que la production ne produit
  // jamais. Le cap est 20 % de `baseline_co2_kg_year`, c'est-à-dire du **poste dominant**
  // (`v1-07` §3.3). Le test confirmait donc le commentaire d'en-tête, qui était faux, et aucun des
  // deux ne regardait le SQL.
  //
  // Ce qu'on épingle à la place est la vraie propriété, avec ses conséquences assumées : à cap
  // égal la marche est la même en kilos, et sa part du total dépend de la concentration du
  // profil. Deux personnes au même total et au même pourcentage de réduction sur leur poste
  // dominant n'ont pas la même marche — c'est voulu, c'est ce que les actions savent atteindre,
  // et c'est ce que `palierNote` dit maintenant en nommant le poste.
  it('taille la marche sur le poste dominant, donc pas sur la même part du total', () => {
    const total = 4380;
    // Poste dominant à 90 % du total, cap de 20 % de ce poste.
    const concentre = nextPalier(total, 0.2 * 0.9 * total, CIBLE)!;
    // Même total, poste dominant à 34 % : même règle, même pourcentage, marche plus petite.
    const diversifie = nextPalier(total, 0.2 * 0.34 * total, CIBLE)!;

    expect(concentre.reductionKg / total).toBeCloseTo(0.18, 5);
    expect(diversifie.reductionKg / total).toBeCloseTo(0.068, 5);
    expect(concentre.reductionKg).toBeGreaterThan(diversifie.reductionKg);
  });

  it('retranche le cap tel qu’il est donné, sans jamais le dériver du total', () => {
    // La garde qui empêche de « corriger » `nextPalier` vers une normalisation sur le total : à
    // cap identique, la marche est identique, quel que soit le total. Une normalisation ferait
    // varier `reductionKg` avec `totalKg`.
    //
    // Les totaux restent au-dessus de `CIBLE + 768` : en dessous, c'est l'autre règle qui parle —
    // la marche s'arrête au repère 2050 et devient plus courte que le cap, ce que le test suivant
    // éprouve déjà.
    for (const total of [1500, 4380, 15820]) {
      expect(nextPalier(total, 768, CIBLE)!.reductionKg).toBe(768);
    }
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
    // Pas de cycle de plan, ou un cap nul : c'est le profil que `/plan` accueille par sa
    // félicitation (`felicitationDuPlanSansAction`). On ne dit rien plutôt que d'inventer une marche.
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
  // franchi. C'est le profil que `/plan` accueille par sa félicitation (`felicitationDuPlanSansAction`).
  it('ne prétend rien quand aucun palier n’était proposé', () => {
    expect(
      palierEstDerriere({ precedentKg: 500, courantKg: 100, capAlorsKg: 0, target2050Kg: CIBLE })
    ).toBe(false);
  });
});
