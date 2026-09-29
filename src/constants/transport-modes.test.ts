import {
  COMMUTE_MODE_CHOICES,
  enFamilles,
  FAMILLE_DU_MODE,
  LEISURE_MODE_CHOICES_MORE,
  LEISURE_MODE_CHOICES_PRIMARY,
  MODES_PAR_FAMILLE,
  TRANSPORT_MODE_LABELS,
  type CommuteModeChoice,
  type TransportModeId,
} from '@/constants/transport-modes';

// L'ordre des modes, déclaré une fois dans `MODES_PAR_FAMILLE` (29/09/2026, `v1-31` §2.1), et les trois
// tableaux de choix, qui restent littéraux et suivent cet ordre à la main : ce fichier est ce qui les
// tient d'accord.
//
// **Éprouvé en le cassant, le 29/09/2026** (TESTING.md §1.1), une mutation à la fois, l'état d'avant
// réécrit depuis une copie ; ce qui tombe, sur onze tests :
//   - « Deux-roues motorisé » remis à la huitième place de `COMMUTE_MODE_CHOICES` → deux : « le trajet
//     est rangé par famille » et « un bloc par famille », qui découpe cette liste-là ;
//   - « Bus » remis en tête de `LEISURE_MODE_CHOICES_MORE` → un : « les autres modes des sorties sont
//     rangés par famille » ;
//   - « Marche » retirée de `LEISURE_MODE_CHOICES_MORE` → un : « les deux listes des sorties couvrent
//     chaque mode, une fois » ;
//   - `enFamilles` qui ouvre un bloc par choix → deux : les deux découpages qui ne sont pas vides.

const rangs = (choix: readonly CommuteModeChoice[]) =>
  choix.map((c) => MODES_PAR_FAMILLE.findIndex((m) => m.modeId === c.modeId));
const croissant = (valeurs: number[]) => valeurs.every((v, i) => i === 0 || v >= valeurs[i - 1]);

describe('MODES_PAR_FAMILLE', () => {
  it('porte chaque mode une fois', () => {
    const ids = MODES_PAR_FAMILLE.map((m) => m.modeId);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual((Object.keys(TRANSPORT_MODE_LABELS) as TransportModeId[]).sort());
  });

  // Une famille coupée en deux rendrait deux blocs de la même famille, séparés par une autre.
  it('range les familles d’un seul tenant, dans l’ordre motorisé, collectif, actif', () => {
    const familles = MODES_PAR_FAMILLE.map((m) => m.famille);
    const suites = familles.filter((f, i) => i === 0 || f !== familles[i - 1]);
    expect(suites).toEqual(['motorise', 'collectif', 'actif']);
  });

  // La décision 2 : le deux-roues passe à côté de la voiture, et non plus en huitième place.
  it('met le deux-roues motorisé dans la famille de la voiture', () => {
    expect(FAMILLE_DU_MODE.deux_roues_motorise).toBe(FAMILLE_DU_MODE.voiture);
  });
});

describe('les listes de choix', () => {
  it('le trajet porte les neuf entrées, chacune une fois', () => {
    expect(COMMUTE_MODE_CHOICES).toHaveLength(9);
    expect(new Set(COMMUTE_MODE_CHOICES.map((c) => c.key)).size).toBe(9);
  });

  it('le trajet est rangé par famille, dans l’ordre déclaré', () => {
    expect(croissant(rangs(COMMUTE_MODE_CHOICES))).toBe(true);
  });

  it('les quatre premiers modes des sorties sont rangés par famille', () => {
    expect(croissant(rangs(LEISURE_MODE_CHOICES_PRIMARY))).toBe(true);
  });

  it('les autres modes des sorties sont rangés par famille', () => {
    expect(croissant(rangs(LEISURE_MODE_CHOICES_MORE))).toBe(true);
  });

  // Les deux listes des sorties se lisent l'une sous l'autre : ensemble, elles sont celle du trajet.
  it('les deux listes des sorties couvrent chaque mode, une fois', () => {
    const sorties = [...LEISURE_MODE_CHOICES_PRIMARY, ...LEISURE_MODE_CHOICES_MORE].map((c) => c.key);
    expect(new Set(sorties).size).toBe(sorties.length);
    expect([...sorties].sort()).toEqual(COMMUTE_MODE_CHOICES.map((c) => c.key).sort());
  });
});

describe('enFamilles', () => {
  it('un bloc par famille, dans l’ordre de la liste', () => {
    const blocs = enFamilles(COMMUTE_MODE_CHOICES, (c) => c.modeId);
    expect(blocs.map((bloc) => bloc.map((c) => c.label))).toEqual([
      ['Voiture (seul)', 'Voiture (covoiturage)', 'Deux-roues motorisé'],
      ['Bus', 'Train', 'Métro ou tram'],
      ['Vélo', 'Marche', 'Trottinette ou mobilité douce'],
    ]);
  });

  // « Lequel ? » retire le mode principal : une famille qui perd un mode garde son bloc.
  it('une famille privée d’un mode reste un bloc', () => {
    const lequel = MODES_PAR_FAMILLE.map((m) => m.modeId).filter((id) => id !== 'deux_roues_motorise');
    expect(enFamilles(lequel, (id) => id)).toEqual([
      ['voiture'],
      ['bus', 'train', 'metro_tram'],
      ['velo', 'marche', 'trottinette'],
    ]);
  });

  it('une liste vide ne rend aucun bloc', () => {
    expect(enFamilles([], (id: TransportModeId) => id)).toEqual([]);
  });
});
