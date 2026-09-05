// Tests de la logique pure du wizard bilan (dérivation de navigation + complétude).
// Volontairement sans dépendance UI/réseau : c'est ici que se joue le comportement du
// questionnaire (saut d'étapes, activation du bouton "Suivant") — un bug ici casse un
// flux entier sans qu'aucun typecheck ne le voie.
import {
  EMPTY_BILAN_ANSWERS,
  distanceBracketMidpointKm,
  isStepComplete,
  isStepVisible,
  nextStep,
  previousStep,
  visibleSteps,
  type BilanAnswers,
} from '@/types/bilan';

function answers(overrides: Partial<BilanAnswers>): BilanAnswers {
  return { ...EMPTY_BILAN_ANSWERS, ...overrides };
}

describe('isStepVisible', () => {
  it('affiche les étapes domicile-travail par défaut (réponse pas encore donnée)', () => {
    const a = answers({});
    expect(isStepVisible('commute_days_distance', a)).toBe(true);
    expect(isStepVisible('commute_mode', a)).toBe(true);
    expect(isStepVisible('commute_extra', a)).toBe(true);
  });

  it('masque les étapes domicile-travail si "Non" à commute_has_regular_trip', () => {
    const a = answers({ commute_has_regular_trip: false });
    expect(isStepVisible('commute_days_distance', a)).toBe(false);
    expect(isStepVisible('commute_mode', a)).toBe(false);
    expect(isStepVisible('commute_extra', a)).toBe(false);
  });

  it('garde les étapes domicile-travail visibles si "Oui"', () => {
    const a = answers({ commute_has_regular_trip: true });
    expect(isStepVisible('commute_days_distance', a)).toBe(true);
  });

  it('masque leisure_detail seulement si leisure_frequency === "rarely"', () => {
    expect(isStepVisible('leisure_detail', answers({ leisure_frequency: 'rarely' }))).toBe(false);
    expect(isStepVisible('leisure_detail', answers({ leisure_frequency: 'weekly' }))).toBe(true);
    expect(isStepVisible('leisure_detail', answers({ leisure_frequency: null }))).toBe(true);
  });

  it('les étapes sans condition sont toujours visibles', () => {
    const a = answers({});
    expect(isStepVisible('commute_has_trip', a)).toBe(true);
    expect(isStepVisible('leisure_frequency', a)).toBe(true);
    expect(isStepVisible('flights', a)).toBe(true);
    expect(isStepVisible('long_trips', a)).toBe(true);
    expect(isStepVisible('context', a)).toBe(true);
  });
});

describe('visibleSteps', () => {
  it('retourne les 9 étapes quand rien n’exclut de saut', () => {
    expect(visibleSteps(answers({}))).toHaveLength(9);
  });

  it('exclut les 3 étapes domicile-travail si pas de trajet régulier', () => {
    const steps = visibleSteps(answers({ commute_has_regular_trip: false }));
    expect(steps).not.toContain('commute_days_distance');
    expect(steps).not.toContain('commute_mode');
    expect(steps).not.toContain('commute_extra');
    expect(steps).toHaveLength(6);
  });

  it('exclut leisure_detail si loisirs rares, en plus du saut domicile-travail', () => {
    const steps = visibleSteps(
      answers({ commute_has_regular_trip: false, leisure_frequency: 'rarely' })
    );
    expect(steps).toEqual(['commute_has_trip', 'leisure_frequency', 'flights', 'long_trips', 'context']);
  });
});

describe('nextStep / previousStep', () => {
  it('avance à l’étape suivante visible en séquence normale', () => {
    const a = answers({});
    expect(nextStep('commute_has_trip', a)).toBe('commute_days_distance');
    expect(previousStep('commute_days_distance', a)).toBe('commute_has_trip');
  });

  it('saute directement les étapes masquées vers l’avant', () => {
    const a = answers({ commute_has_regular_trip: false });
    expect(nextStep('commute_has_trip', a)).toBe('leisure_frequency');
  });

  it('saute directement les étapes masquées vers l’arrière', () => {
    const a = answers({ commute_has_regular_trip: false });
    expect(previousStep('leisure_frequency', a)).toBe('commute_has_trip');
  });

  it('renvoie null après la dernière étape et avant la première', () => {
    const a = answers({});
    expect(nextStep('context', a)).toBeNull();
    expect(previousStep('commute_has_trip', a)).toBeNull();
  });

  it('un saut de condition qui change en cours de route change bien la navigation', () => {
    // Piège classique : la visibilité est dérivée de l'état courant, donc nextStep doit
    // refléter un changement de réponse à commute_has_regular_trip sans recalcul manuel.
    let a = answers({ commute_has_regular_trip: true });
    expect(nextStep('commute_has_trip', a)).toBe('commute_days_distance');
    a = answers({ commute_has_regular_trip: false });
    expect(nextStep('commute_has_trip', a)).toBe('leisure_frequency');
  });
});

describe('isStepComplete', () => {
  it('commute_has_trip : complet seulement une fois répondu', () => {
    expect(isStepComplete('commute_has_trip', answers({}))).toBe(false);
    expect(isStepComplete('commute_has_trip', answers({ commute_has_regular_trip: false }))).toBe(true);
  });

  it('commute_days_distance : distance en km OU en tranche, pas besoin des deux', () => {
    expect(isStepComplete('commute_days_distance', answers({ commute_days_per_week: 5 }))).toBe(false);
    expect(
      isStepComplete(
        'commute_days_distance',
        answers({ commute_days_per_week: 5, commute_distance_km: 12 })
      )
    ).toBe(true);
    expect(
      isStepComplete(
        'commute_days_distance',
        answers({ commute_days_per_week: 5, commute_distance_bracket: '5_15' })
      )
    ).toBe(true);
  });

  it('commute_extra : covoiturage et second mode doivent chacun être renseignés si activés', () => {
    expect(isStepComplete('commute_extra', answers({ commute_is_carpool: false }))).toBe(true);
    expect(
      isStepComplete('commute_extra', answers({ commute_is_carpool: true, commute_carpool_size: null }))
    ).toBe(false);
    expect(
      isStepComplete('commute_extra', answers({ commute_is_carpool: true, commute_carpool_size: 3 }))
    ).toBe(true);
    expect(
      isStepComplete('commute_extra', answers({ commute_second_mode_used: true, commute_second_mode: null }))
    ).toBe(false);
    expect(
      isStepComplete(
        'commute_extra',
        answers({ commute_second_mode_used: true, commute_second_mode: 'bus' })
      )
    ).toBe(true);
  });

  it('commute_mode / commute_extra : "voiture" exige en plus le type de moteur', () => {
    expect(isStepComplete('commute_mode', answers({ commute_mode: 'bus' }))).toBe(true);
    expect(isStepComplete('commute_mode', answers({ commute_mode: 'voiture', commute_car_engine: null }))).toBe(
      false
    );
    expect(
      isStepComplete('commute_mode', answers({ commute_mode: 'voiture', commute_car_engine: 'electrique' }))
    ).toBe(true);
    expect(
      isStepComplete(
        'commute_extra',
        answers({ commute_second_mode_used: true, commute_second_mode: 'voiture', commute_car_engine: null })
      )
    ).toBe(false);
    expect(
      isStepComplete(
        'commute_extra',
        answers({
          commute_second_mode_used: true,
          commute_second_mode: 'voiture',
          commute_car_engine: 'thermique',
        })
      )
    ).toBe(true);
  });

  it('commute_mode / commute_extra : "deux-roues motorisé" exige en plus le type', () => {
    // Même règle que la motorisation voiture, et pour une raison plus forte : entre un scooter
    // électrique et une grosse cylindrée il y a un facteur 3,6, et la grosse moto dépasse la
    // voiture thermique. Laisser la question facultative reviendrait à compter tout le monde
    // au tarif du scooter, ce que le produit faisait jusqu'ici.
    expect(
      isStepComplete(
        'commute_mode',
        answers({ commute_mode: 'deux_roues_motorise', commute_two_wheeler_type: null })
      )
    ).toBe(false);
    expect(
      isStepComplete(
        'commute_mode',
        answers({ commute_mode: 'deux_roues_motorise', commute_two_wheeler_type: 'moto_grosse' })
      )
    ).toBe(true);
    expect(
      isStepComplete(
        'commute_extra',
        answers({
          commute_second_mode_used: true,
          commute_second_mode: 'deux_roues_motorise',
          commute_two_wheeler_type: null,
        })
      )
    ).toBe(false);
    expect(
      isStepComplete(
        'commute_extra',
        answers({
          commute_second_mode_used: true,
          commute_second_mode: 'deux_roues_motorise',
          commute_two_wheeler_type: 'scooter_electrique',
        })
      )
    ).toBe(true);
  });

  it('leisure_detail : mode et distance requis, plus le type de deux-roues si besoin', () => {
    expect(
      isStepComplete(
        'leisure_detail',
        answers({
          leisure_mode: 'deux_roues_motorise',
          leisure_distance_bracket: 'lt_5',
          leisure_two_wheeler_type: null,
        })
      )
    ).toBe(false);
    expect(
      isStepComplete(
        'leisure_detail',
        answers({
          leisure_mode: 'deux_roues_motorise',
          leisure_distance_bracket: 'lt_5',
          leisure_two_wheeler_type: 'moto_petite',
        })
      )
    ).toBe(true);
  });

  it('leisure_detail : mode et distance requis, plus le type de moteur si "voiture"', () => {
    expect(isStepComplete('leisure_detail', answers({ leisure_mode: 'velo' }))).toBe(false);
    expect(
      isStepComplete('leisure_detail', answers({ leisure_mode: 'velo', leisure_distance_bracket: 'lt_5' }))
    ).toBe(true);
    expect(
      isStepComplete(
        'leisure_detail',
        answers({ leisure_mode: 'voiture', leisure_distance_bracket: 'lt_5', leisure_car_engine: null })
      )
    ).toBe(false);
    expect(
      isStepComplete(
        'leisure_detail',
        answers({
          leisure_mode: 'voiture',
          leisure_distance_bracket: 'lt_5',
          leisure_car_engine: 'electrique',
        })
      )
    ).toBe(true);
  });

  it('flights : short_per_year requis seulement si au moins un vol déclaré', () => {
    expect(isStepComplete('flights', answers({ flights_total_per_year: 0 }))).toBe(true);
    expect(
      isStepComplete('flights', answers({ flights_total_per_year: 2, flights_short_per_year: null }))
    ).toBe(false);
    expect(
      isStepComplete('flights', answers({ flights_total_per_year: 2, flights_short_per_year: 1 }))
    ).toBe(true);
  });

  it('long_trips : complet par défaut (0 trajet), exige le type de moteur dès qu’un trajet voiture est déclaré', () => {
    expect(isStepComplete('long_trips', answers({}))).toBe(true);
    expect(isStepComplete('long_trips', answers({ car_long_trips_per_year: 3 }))).toBe(false);
    expect(
      isStepComplete(
        'long_trips',
        answers({ car_long_trips_per_year: 3, car_long_trips_engine: 'thermique' })
      )
    ).toBe(true);
  });

  it('context : les 3 champs sont requis', () => {
    expect(isStepComplete('context', answers({ zone_type: 'urbain_dense' }))).toBe(false);
    expect(
      isStepComplete(
        'context',
        answers({ zone_type: 'urbain_dense', tc_access: 'bon', household_vehicles: '1' })
      )
    ).toBe(true);
  });
});

describe('distanceBracketMidpointKm', () => {
  it('renvoie le point médian de chaque tranche', () => {
    expect(distanceBracketMidpointKm('lt_5')).toBe(2.5);
    expect(distanceBracketMidpointKm('5_15')).toBe(10);
    expect(distanceBracketMidpointKm('15_30')).toBe(22.5);
    expect(distanceBracketMidpointKm('30_50')).toBe(40);
    expect(distanceBracketMidpointKm('50_plus')).toBe(60);
  });
});
