import { BILAN_STEP_ORDER } from '@/types/bilan';
import {
  animationDesOnglets,
  barreArrive,
  decalageDEntree,
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
    // Le re-bilan qui repart du début, depuis la dernière étape.
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
