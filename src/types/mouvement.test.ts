import { BILAN_STEP_ORDER } from '@/types/bilan';
import {
  animationDesOnglets,
  barreArrive,
  decalageDEntree,
  defilementPourMontrer,
  dureeSelonLaPreference,
  sensDuPassage,
} from '@/types/mouvement';

// Ce qui décide d'une animation (27/09/2026, `v1-30` §4.3). Chaque fonction est petite, et chacune
// porte une moitié qu'on casserait en simplifiant : le `null` du montage pour le sens, le passage
// strict de masquée à visible pour la barre.
//
// **Ce que ce test ne garde pas** : que les écrans les appellent avec les bons arguments — un test
// garde la fonction, jamais ses appels (`FRONT.md` §1.1). Ce sont les gardes de l'export et du
// parcours réel qui regardent ce qui bouge vraiment (`v1-30` §5).
//
// **Éprouvé en le cassant le 27/09/2026**, une mutation à la fois, l'état d'avant réécrit ensuite :
//
//   | Ce qu'on casse | Ce qui tombe |
//   |---|---|
//   | le sens lu à l'envers (`arrivee < depart`) | « avancer vient de la droite » et « un saut dit d'où il vient » |
//   | plus de `null` sur place (`de === vers` retiré) | « au montage, aucun sens » — seulement |
//   | une étape hors de l'ordre prise pour la première | « une étape qu'on ne sait pas placer n'a pas de côté » — seulement |
//   | le décalage d'un recul positif | « reculer vient de la gauche » — seulement |
//   | la barre qui glisse dès qu'elle est visible (`apres` seul) | « au démarrage, la barre est posée » — seulement |
//   | les onglets en fondu même sous la préférence | « sous la préférence, aucun fondu » — seulement |
//   | la durée gardée sous la préférence | « sous la préférence, la durée est nulle » — seulement |

describe('sensDuPassage', () => {
  test('avancer vient de la droite, reculer de la gauche', () => {
    expect(sensDuPassage('commute_has_trip', 'commute_days_distance', BILAN_STEP_ORDER)).toBe('avant');
    expect(sensDuPassage('commute_days_distance', 'commute_has_trip', BILAN_STEP_ORDER)).toBe('arriere');
    expect(decalageDEntree('avant', 8)).toBe(8);
  });

  test('un saut dit d’où il vient, quel que soit le nombre d’étapes franchies', () => {
    // Un saut de plusieurs étapes, dans un sens puis dans l'autre. (« Repartir de mon dernier bilan »
    // n'en est pas un : l'étape arrive d'un autre écran, et se pose — `src/app/bilan/index.tsx`.)
    expect(sensDuPassage('context', 'commute_has_trip', BILAN_STEP_ORDER)).toBe('arriere');
    expect(sensDuPassage('commute_has_trip', 'context', BILAN_STEP_ORDER)).toBe('avant');
  });

  test('au montage, aucun sens : la première étape ne glisse pas', () => {
    expect(sensDuPassage(null, 'commute_has_trip', BILAN_STEP_ORDER)).toBeNull();
    expect(sensDuPassage('context', 'context', BILAN_STEP_ORDER)).toBeNull();
    expect(decalageDEntree(null, 8)).toBe(0);
  });

  test('une étape qu’on ne sait pas placer n’a pas de côté', () => {
    expect(sensDuPassage('inconnue', 'context', ['commute_has_trip', 'context'])).toBeNull();
    expect(sensDuPassage('context', 'inconnue', ['commute_has_trip', 'context'])).toBeNull();
  });
});

describe('decalageDEntree', () => {
  test('reculer vient de la gauche', () => {
    expect(decalageDEntree('arriere', 8)).toBe(-8);
  });
});

describe('barreArrive', () => {
  test('la barre glisse quand elle passe de masquée à visible', () => {
    expect(barreArrive(false, true)).toBe(true);
  });

  test('au démarrage, la barre est posée : l’état d’avant est inconnu', () => {
    expect(barreArrive(null, true)).toBe(false);
    expect(barreArrive(true, true)).toBe(false);
  });

  test('une barre qui disparaît ne s’anime pas', () => {
    expect(barreArrive(true, false)).toBe(false);
    expect(barreArrive(false, false)).toBe(false);
    expect(barreArrive(null, false)).toBe(false);
  });
});

describe('ce que la bibliothèque ne coupe pas d’elle-même', () => {
  test('les onglets passent en fondu', () => {
    expect(animationDesOnglets(false)).toBe('fade');
  });

  test('sous la préférence, aucun fondu entre les onglets', () => {
    expect(animationDesOnglets(true)).toBe('none');
  });

  test('la durée est gardée sans la préférence', () => {
    expect(dureeSelonLaPreference(250, false)).toBe(250);
  });

  test('sous la préférence, la durée est nulle', () => {
    expect(dureeSelonLaPreference(250, true)).toBe(0);
  });
});

/**
 * **Le défilement jusqu'à « C'est noté »** (29/09/2026, `v1-32` §4.4, planche B2) : juste assez pour
 * montrer le bas de la carte ouverte, jamais au point de faire passer son titre sous la bande.
 *
 * Ce test garde le calcul, pas l'appel : que l'écran mesure la **carte** et non son `HauteurSuivie`,
 * qu'il attende le repli d'une carte ouverte au-dessus, et qu'il ne défile pas en chemin sous la
 * préférence, c'est le parcours réel qui le regarde, image par image.
 *
 * MUTATIONS
 */
describe('defilementPourMontrer', () => {
  const fenetre = { hauteurFenetre: 700, marge: 16 };

  test('ne défile pas quand le bas est déjà dans la fenêtre, marge comprise', () => {
    expect(defilementPourMontrer({ ...fenetre, haut: 100, bas: 684 })).toBe(0);
    expect(defilementPourMontrer({ ...fenetre, haut: 100, bas: 300 })).toBe(0);
  });

  test('défile juste assez pour montrer le bas, marge comprise', () => {
    expect(defilementPourMontrer({ ...fenetre, haut: 400, bas: 800 })).toBe(116);
  });

  // Une carte plus haute que ce qui reste : le titre s'arrête sous le bord, à la marge, et le bas
  // attend le doigt — B2 interdit que le titre passe sous la bande.
  test('arrête le haut sous le bord quand le bloc ne tient pas', () => {
    expect(defilementPourMontrer({ ...fenetre, haut: 200, bas: 1200 })).toBe(184);
  });

  // Une ligne touchée alors qu'elle dépassait déjà du haut : ouvrir vers le bas ne remonte jamais
  // la page, et ne défile pas non plus plus loin.
  test('ne remonte jamais la page, et ne descend pas quand le haut est déjà au bord', () => {
    expect(defilementPourMontrer({ ...fenetre, haut: 10, bas: 900 })).toBe(0);
    expect(defilementPourMontrer({ ...fenetre, haut: -40, bas: 900 })).toBe(0);
  });
});
