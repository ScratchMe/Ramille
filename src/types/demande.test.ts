import { decalagePourMontrer, optionCible, suiteSousLePied } from '@/types/demande';

// Ce que le « Suivant » en attente fait voir (29/09/2026, `v1-31`). Ce test garde les fonctions, pas
// leurs appels (`FRONT.md` §1.1) : que `StepShell` y défile vraiment, et que le focus se pose, c'est la
// section K de `scripts/verifier-etats-export.mjs` qui le relève dans l'export.
//
// **Éprouvé en le cassant, le 29/09/2026**, une mutation à la fois, l'état d'avant réécrit depuis une
// copie :
//   - `optionCible` qui rend toujours la première → « la cochée, quand il y en a une », et lui seul ;
//   - la cible au-dessus de la zone ignorée (la branche `hautVisible < 0` retirée) → « au-dessus de la
//     zone, elle redescend » et « plus haute que la zone… », et eux seuls ;
//   - l'ouverture sans sa borne (`margeHaut` de la demande) → « une ouverture ne fait jamais passer le
//     choix au-dessus du bord », et lui seul ;
//   - le filet sans la marge basse (`MARGE_BASSE_DU_CONTENU` retirée) → « seule la marge basse est
//     sous le pied » et « un demi-pixel du bas », et eux seuls ;
//   - le filet toujours posé (`return true`) → les trois moitiés négatives de `suiteSousLePied`, et
//     elles seules ;
//   - la cible entière qui défile quand même (le `return null` du bas dans la zone retiré) → « une
//     cible déjà entière ne fait rien défiler », et lui seul. La première version portait une garde
//     de plus, « entière → rien », avant les deux autres : la retirer ne faisait rien tomber, parce
//     qu'elle était redondante avec celle-ci. Elle est partie.
//
// Les tests de `defilementPourMontrer` (`mouvement.test.ts`), dont la moitié « vers le bas » est
// réutilisée ici, restent verts sous les quatre : ils n'emploient pas `margeHaut`.

describe('optionCible', () => {
  it('la cochée, quand il y en a une', () => {
    expect(optionCible([false, false, true, false])).toBe(2);
  });

  it('la première, quand aucune ne l’est', () => {
    expect(optionCible([false, false, false])).toBe(0);
  });

  it('une liste vide ne désigne rien d’autre que zéro', () => {
    expect(optionCible([])).toBe(0);
  });
});

describe('decalagePourMontrer', () => {
  // Une zone de 600 px de haut, qui a défilé de 100 : on voit le contenu de 100 à 700.
  const zone = { decalage: 100, hauteurZone: 600 };

  it('une cible déjà entière ne fait rien défiler, même collée au pied', () => {
    expect(decalagePourMontrer({ ...zone, haut: 150, bas: 690 })).toBeNull();
    expect(decalagePourMontrer({ ...zone, haut: 100, bas: 700 })).toBeNull();
    expect(decalagePourMontrer({ ...zone, haut: 300, bas: 700, ouverture: true })).toBeNull();
  });

  it('sous le pied, elle remonte juste assez pour s’arrêter 16 au-dessus', () => {
    // bas 800 : 800 + 16 − 600 = 216.
    expect(decalagePourMontrer({ ...zone, haut: 650, bas: 800 })).toBe(216);
  });

  it('au-dessus de la zone, elle redescend jusqu’à 24 sous l’en-tête', () => {
    expect(decalagePourMontrer({ ...zone, haut: 40, bas: 120 })).toBe(16);
    expect(decalagePourMontrer({ decalage: 100, hauteurZone: 600, haut: 10, bas: 80 })).toBe(0);
  });

  it('plus haute que la zone, elle s’aligne en haut, 24 sous l’en-tête', () => {
    // En dessous : le haut s'arrête à 24, le bas attend le doigt.
    expect(decalagePourMontrer({ ...zone, haut: 400, bas: 1400 })).toBe(376);
    // Débordant des deux côtés : même alignement.
    expect(decalagePourMontrer({ ...zone, haut: 50, bas: 1400 })).toBe(26);
  });

  it('une ouverture ne fait jamais passer le choix au-dessus du bord : la borne gagne', () => {
    // Dans la zone, le choix est à 300 et la boîte finit à 1000 : 1000 + 16 − 600 = 416 voudrait
    // défiler de 416, mais le choix ne remonte que jusqu'à 8 du bord — 300 − 8 = 292, soit 100 + 292.
    expect(decalagePourMontrer({ ...zone, haut: 400, bas: 1100, ouverture: true })).toBe(392);
    // Sans conflit, la boîte s'arrête 16 au-dessus du pied.
    expect(decalagePourMontrer({ ...zone, haut: 500, bas: 760, ouverture: true })).toBe(176);
  });

  it('une ouverture ne fait jamais remonter la page', () => {
    expect(decalagePourMontrer({ ...zone, haut: 60, bas: 900, ouverture: true })).toBeNull();
  });
});

describe('suiteSousLePied', () => {
  // Un contenu de 1000 px, marge basse de 24 comprise, dans une zone de 600.
  const etape = { hauteurZone: 600, hauteurContenu: 1000 };

  it('le contenu continue sous le pied : il y a une suite', () => {
    expect(suiteSousLePied({ ...etape, decalage: 0 })).toBe(true);
    expect(suiteSousLePied({ ...etape, decalage: 370 })).toBe(true);
  });

  it('seule la marge basse est sous le pied : pas de suite', () => {
    expect(suiteSousLePied({ ...etape, decalage: 376 })).toBe(false);
    expect(suiteSousLePied({ ...etape, decalage: 400 })).toBe(false);
  });

  it('une étape courte n’a pas de suite', () => {
    expect(suiteSousLePied({ decalage: 0, hauteurZone: 600, hauteurContenu: 400 })).toBe(false);
  });

  // Un défilement s'arrête à des positions fractionnaires : pas de filet qui clignote au bas.
  it('un demi-pixel du bas n’est pas une suite', () => {
    expect(suiteSousLePied({ ...etape, decalage: 375.6 })).toBe(false);
  });
});
