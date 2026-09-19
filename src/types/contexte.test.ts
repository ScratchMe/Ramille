import {
  CHOIX_DE_TC,
  CHOIX_DE_VEHICULES,
  CHOIX_DE_ZONE,
  contexteAChange,
  contexteEstComplet,
  lireLeContexte,
  phraseDuCalculDuContexte,
  type ChoixDeContexte,
} from '@/types/contexte';

const choix = (surcharge: Partial<ChoixDeContexte> = {}): ChoixDeContexte => ({
  zone_type: 'periurbain',
  tc_access: 'limite',
  household_vehicles: '1',
  teletravail: 'un_jour',
  ...surcharge,
});

describe('les trois listes de puces', () => {
  // **Miroirs des `check` du schéma**, comme `PARTS_DU_SECOND_MODE` et `OCCUPATIONS_LONG_TRAJET` :
  // rien ne peut lire ces bornes depuis TypeScript, et une valeur hors bornes ne serait refusée
  // qu'à l'appel du RPC, en anglais. Les trois `check` relevés sur la base le 19/09/2026 :
  // `assessment_answers_zone_type_check`, `_tc_access_check`, `_household_vehicles_check`.
  it('portent exactement les valeurs que la base accepte', () => {
    expect(CHOIX_DE_ZONE.map((c) => c.value)).toEqual(['urbain_dense', 'periurbain', 'rural']);
    expect(CHOIX_DE_TC.map((c) => c.value)).toEqual(['bon', 'limite', 'inexistant']);
    expect(CHOIX_DE_VEHICULES.map((c) => c.value)).toEqual(['0', '1', '2_plus']);
  });

  it('donnent un libellé à chacune', () => {
    for (const liste of [CHOIX_DE_ZONE, CHOIX_DE_TC, CHOIX_DE_VEHICULES]) {
      for (const option of liste) {
        expect(option.label.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('lireLeContexte', () => {
  it('rend les quatre réponses quand elles sont connues', () => {
    expect(
      lireLeContexte({
        zone_type: 'rural',
        tc_access: 'inexistant',
        household_vehicles: '2_plus',
        teletravail: 'deux_ou_plus',
      })
    ).toEqual({
      zone_type: 'rural',
      tc_access: 'inexistant',
      household_vehicles: '2_plus',
      teletravail: 'deux_ou_plus',
    });
  });

  it('ramène une valeur inconnue à `null` plutôt que de la propager', () => {
    // Le seul cas de production est un bilan d'avant la colonne ; une valeur hors liste ne peut
    // venir que d'une migration qui aurait ajouté une réponse sans passer par ce module. Dans les
    // deux cas on repose la question — envoyer la chaîne au RPC la ferait refuser par le `check`,
    // en anglais et après coup.
    expect(
      lireLeContexte({
        zone_type: 'montagne',
        tc_access: null,
        household_vehicles: '3',
        teletravail: 'parfois',
      })
    ).toEqual({ zone_type: null, tc_access: null, household_vehicles: null, teletravail: null });
  });
});

describe('contexteEstComplet', () => {
  it('exige les trois réponses posées à tout le monde', () => {
    expect(contexteEstComplet(choix({ zone_type: null }), true)).toBe(false);
    expect(contexteEstComplet(choix({ tc_access: null }), true)).toBe(false);
    expect(contexteEstComplet(choix({ household_vehicles: null }), true)).toBe(false);
  });

  it('exige le télétravail seulement quand la question se pose', () => {
    expect(contexteEstComplet(choix({ teletravail: null }), true)).toBe(false);
    expect(contexteEstComplet(choix({ teletravail: null }), false)).toBe(true);
  });

  it('accepte un contexte entier', () => {
    expect(contexteEstComplet(choix(), true)).toBe(true);
  });
});

describe('contexteAChange', () => {
  it('ne voit rien quand les quatre valeurs sont identiques', () => {
    expect(contexteAChange(choix(), choix())).toBe(false);
  });

  // **La jumelle du `is not distinct from` du RPC**, qui sort sans rien toucher dans ce cas. Les
  // quatre colonnes sont éprouvées une par une : en oublier une ferait promettre à l'écran un
  // enregistrement que le serveur n'effectuerait pas — et c'est la moitié silencieuse du défaut.
  it.each([
    ['zone_type', { zone_type: 'rural' as const }],
    ['tc_access', { tc_access: 'bon' as const }],
    ['household_vehicles', { household_vehicles: '0' as const }],
    ['teletravail', { teletravail: 'aucun' as const }],
  ])('voit un changement sur %s', (_colonne, patch) => {
    expect(contexteAChange(choix(), choix(patch))).toBe(true);
  });

  it('voit aussi une réponse qui disparaît', () => {
    expect(contexteAChange(choix(), choix({ teletravail: null }))).toBe(true);
  });
});

describe('phraseDuCalculDuContexte', () => {
  // **La phrase fixe était fausse pour le profil où l'écart est le plus grand** (C6.4). Mesuré sur
  // la base le 19/09/2026, par le RPC lui-même : un profil « sorties rares » passe de 10,88 kg à
  // 55,56 kg quand le foyer gagne un véhicule — le résiduel de sorties bascule du train à la
  // voiture. Sur les six bilans à sorties hebdomadaires, le même basculement vaut 1,2 %.
  it('dit l’exception à qui sort rarement', () => {
    const phrase = phraseDuCalculDuContexte('rarely');
    expect(phrase).toContain('véhicules du foyer');
    expect(phrase).not.toContain('n’entrent pas');
  });

  it('dit la règle à tous les autres', () => {
    for (const frequence of ['weekly', 'multiple_weekly', null]) {
      expect(phraseDuCalculDuContexte(frequence)).toBe(
        'Elles n’entrent pas dans le calcul de ton bilan.'
      );
    }
  });
});
