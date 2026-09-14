// Tests de la logique pure du wizard bilan (dérivation de navigation + complétude).
// Volontairement sans dépendance UI/réseau : c'est ici que se joue le comportement du
// questionnaire (saut d'étapes, activation du bouton "Suivant") — un bug ici casse un
// flux entier sans qu'aucun typecheck ne le voie.
import {
  BILAN_STEP_ORDER,
  BROUILLON_ANCIEN_JOURS,
  COMMUTE_DISTANCE_A_RELIRE_KM,
  EMPTY_BILAN_ANSWERS,
  afficherNombreSaisi,
  avancementDeLaReprise,
  brouillonEstAncien,
  distanceBracketMidpointKm,
  distanceDomicileTravailARelire,
  distanceDomicileTravailKm,
  isStepComplete,
  isStepVisible,
  lireBrouillonBilan,
  manqueDeLEtape,
  memesReponses,
  nettoyerSaisieNumerique,
  nextStep,
  normaliserReponses,
  previousStep,
  saisieVersNombre,
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

describe('manqueDeLEtape', () => {
  it('rend null quand l’étape est complète', () => {
    expect(manqueDeLEtape('commute_has_trip', answers({ commute_has_regular_trip: false }))).toBeNull();
  });

  it('nomme la motorisation quand une voiture est choisie sans elle', () => {
    expect(manqueDeLEtape('leisure_detail', answers({ leisure_mode: 'voiture' }))).toBe(
      'la motorisation'
    );
  });

  // L'ordre compte : c'est le défaut relevé sur appareil le 07/09/2026. La précision du mode
  // se déplie au-dessus de la tranche de distance, donc on la réclame d'abord — on nomme ce
  // qu'il reste à faire dans l'ordre où on le rencontre en descendant la page.
  it('réclame la distance seulement une fois la motorisation renseignée', () => {
    expect(manqueDeLEtape('leisure_detail', answers({ leisure_mode: 'voiture' }))).toBe(
      'la motorisation'
    );
    expect(
      manqueDeLEtape('leisure_detail', answers({ leisure_mode: 'voiture', leisure_car_engine: 'thermique' }))
    ).toBe('la distance habituelle');
    expect(
      manqueDeLEtape(
        'leisure_detail',
        answers({
          leisure_mode: 'voiture',
          leisure_car_engine: 'thermique',
          leisure_distance_bracket: '5_15',
        })
      )
    ).toBeNull();
  });

  it('nomme le type de deux-roues', () => {
    expect(manqueDeLEtape('commute_mode', answers({ commute_mode: 'deux_roues_motorise' }))).toBe(
      'le type de deux-roues'
    );
  });

  // Le garde-fou qui empêche les deux dérivations de diverger : `isStepComplete` n'est plus
  // qu'une lecture de celle-ci, et ce test le vérifie sur toutes les étapes.
  it('isStepComplete dit exactement l’inverse, sur toutes les étapes', () => {
    const cas: BilanAnswers[] = [
      EMPTY_BILAN_ANSWERS,
      answers({ commute_mode: 'voiture' }),
      answers({ leisure_mode: 'deux_roues_motorise' }),
      answers({ car_long_trips_per_year: 2 }),
      answers({ flights_total_per_year: 3 }),
    ];
    for (const cas_ of cas) {
      for (const step of BILAN_STEP_ORDER) {
        expect(isStepComplete(step, cas_)).toBe(manqueDeLEtape(step, cas_) === null);
      }
    }
  });
});

describe('distance domicile-travail', () => {
  // Le défaut le plus coûteux du questionnaire : « 0 » passait les neuf étapes et n'échouait
  // qu'à la soumission, sur le `check (commute_distance_km > 0)` de la table, en anglais.
  it('un 0 saisi ne compte pas comme une distance', () => {
    expect(distanceDomicileTravailKm(answers({ commute_distance_km: 0 }))).toBeNull();
    expect(
      isStepComplete('commute_days_distance', answers({ commute_days_per_week: 5, commute_distance_km: 0 }))
    ).toBe(false);
    expect(
      manqueDeLEtape('commute_days_distance', answers({ commute_days_per_week: 5, commute_distance_km: 0 }))
    ).toBe('la distance');
  });

  it('une tranche reste une réponse valable quand aucun kilométrage n’est saisi', () => {
    expect(
      isStepComplete(
        'commute_days_distance',
        answers({ commute_days_per_week: 5, commute_distance_bracket: '5_15' })
      )
    ).toBe(true);
  });

  it('une distance positive est retenue telle quelle, décimale comprise', () => {
    expect(distanceDomicileTravailKm(answers({ commute_distance_km: 3.5 }))).toBe(3.5);
    expect(
      isStepComplete('commute_days_distance', answers({ commute_days_per_week: 2, commute_distance_km: 3.5 }))
    ).toBe(true);
  });

  // La borne haute est une relecture, jamais un blocage : l'étape reste complète.
  it('au-delà de la borne haute, on propose une relecture sans bloquer', () => {
    const loin = answers({
      commute_days_per_week: 5,
      commute_distance_km: COMMUTE_DISTANCE_A_RELIRE_KM + 1,
    });
    expect(distanceDomicileTravailARelire(loin)).toBe(true);
    expect(isStepComplete('commute_days_distance', loin)).toBe(true);
    expect(distanceDomicileTravailARelire(answers({ commute_distance_km: COMMUTE_DISTANCE_A_RELIRE_KM }))).toBe(
      false
    );
    expect(distanceDomicileTravailARelire(answers({ commute_distance_km: 12 }))).toBe(false);
    expect(distanceDomicileTravailARelire(answers({}))).toBe(false);
  });
});

describe('saisie numérique', () => {
  it('garde la virgule et le point, et ne concatène plus les décimales aux unités', () => {
    expect(nettoyerSaisieNumerique('3,5')).toBe('3,5');
    expect(nettoyerSaisieNumerique('3.5')).toBe('3,5');
    expect(saisieVersNombre(nettoyerSaisieNumerique('3,5'))).toBe(3.5);
    expect(saisieVersNombre(nettoyerSaisieNumerique('3.5'))).toBe(3.5);
  });

  it('garde la frappe en cours telle quelle, pour que la décimale soit saisissable', () => {
    expect(nettoyerSaisieNumerique('3,')).toBe('3,');
    expect(saisieVersNombre('3,')).toBe(3);
  });

  it('n’accepte qu’un séparateur et ignore le reste', () => {
    expect(nettoyerSaisieNumerique('3,5,2')).toBe('3,52');
    expect(nettoyerSaisieNumerique('12 km')).toBe('12');
    expect(nettoyerSaisieNumerique('-4')).toBe('4');
  });

  it('une saisie sans chiffre ne porte aucune valeur', () => {
    expect(saisieVersNombre('')).toBeNull();
    expect(saisieVersNombre(',')).toBeNull();
  });

  it('affiche un nombre avec la virgule française', () => {
    expect(afficherNombreSaisi(3.5)).toBe('3,5');
    expect(afficherNombreSaisi(12)).toBe('12');
    expect(afficherNombreSaisi(null)).toBe('');
  });
});

describe('normaliserReponses', () => {
  it('efface le mode et la tranche des loisirs quand la fréquence passe à « rarement »', () => {
    // Les deux chemins d'entrée doivent converger : l'étape B2.1 tenait sa propre liste, donc un
    // brouillon relu gardait un mode que le clic effaçait. La motorisation, elle, reste — le calcul
    // la lit encore dans cette branche (commentée sur place).
    const a = normaliserReponses({
      ...EMPTY_BILAN_ANSWERS,
      leisure_frequency: 'rarely',
      leisure_mode: 'voiture',
      leisure_distance_bracket: '10_30',
      leisure_car_engine: 'electrique',
    });
    expect(a.leisure_mode).toBeNull();
    expect(a.leisure_distance_bracket).toBeNull();
    expect(a.leisure_car_engine).toBe('electrique');
    // Idempotence, comme le reste de la fonction.
    expect(normaliserReponses(a)).toEqual(a);
  });

  it('efface le second mode devenu identique au mode principal, et la réponse qui l’annonçait', () => {
    // Séquence réelle : Train, puis second mode Voiture, puis Retour et mode principal
    // Voiture (covoiturage). La liste de B1.7 filtre le mode principal, donc la ligne
    // n'apparaissait plus nulle part, « Suivant » restait actif, et la moitié du trajet était
    // facturée en voiture sans être divisée par le covoiturage.
    const a = normaliserReponses(
      answers({
        commute_mode: 'voiture',
        commute_is_carpool: true,
        commute_carpool_size: 3,
        commute_second_mode_used: true,
        commute_second_mode: 'voiture',
        commute_car_engine: 'thermique',
      })
    );
    expect(a.commute_second_mode).toBeNull();
    expect(a.commute_second_mode_used).toBe(false);
    // La jambe principale est encore une voiture : la motorisation reste.
    expect(a.commute_car_engine).toBe('thermique');
    expect(a.commute_carpool_size).toBe(3);
  });

  it('garde la motorisation tant qu’une des deux jambes est une voiture, et l’efface sinon', () => {
    const secondeJambe = normaliserReponses(
      answers({
        commute_mode: 'train',
        commute_second_mode_used: true,
        commute_second_mode: 'voiture',
        commute_car_engine: 'electrique',
      })
    );
    expect(secondeJambe.commute_car_engine).toBe('electrique');

    const aucuneJambe = normaliserReponses(
      answers({
        commute_mode: 'train',
        commute_second_mode_used: true,
        commute_second_mode: 'velo',
        commute_car_engine: 'electrique',
      })
    );
    expect(aucuneJambe.commute_car_engine).toBeNull();
  });

  it('efface le type de deux-roues rattaché à une jambe qui n’existe plus', () => {
    const orphelin = normaliserReponses(
      answers({ commute_mode: 'bus', commute_two_wheeler_type: 'moto_grosse' })
    );
    expect(orphelin.commute_two_wheeler_type).toBeNull();

    const secondeJambe = normaliserReponses(
      answers({
        commute_mode: 'bus',
        commute_second_mode_used: true,
        commute_second_mode: 'deux_roues_motorise',
        commute_two_wheeler_type: 'moto_grosse',
      })
    );
    expect(secondeJambe.commute_two_wheeler_type).toBe('moto_grosse');
  });

  it('« Non » à B1.1 n’oublie plus le type de deux-roues', () => {
    const a = normaliserReponses(
      answers({
        commute_has_regular_trip: false,
        commute_days_per_week: 5,
        commute_distance_km: 12,
        commute_distance_bracket: '5_15',
        commute_mode: 'deux_roues_motorise',
        commute_is_carpool: true,
        commute_carpool_size: 3,
        commute_second_mode_used: true,
        commute_second_mode: 'train',
        commute_car_engine: 'thermique',
        commute_two_wheeler_type: 'moto_grosse',
      })
    );
    expect(a.commute_days_per_week).toBeNull();
    expect(a.commute_distance_km).toBeNull();
    expect(a.commute_distance_bracket).toBeNull();
    expect(a.commute_mode).toBeNull();
    expect(a.commute_is_carpool).toBe(false);
    expect(a.commute_carpool_size).toBeNull();
    expect(a.commute_second_mode_used).toBe(false);
    expect(a.commute_second_mode).toBeNull();
    expect(a.commute_car_engine).toBeNull();
    expect(a.commute_two_wheeler_type).toBeNull();
  });

  it('le covoiturage ne survit pas à un mode qui n’est pas une voiture', () => {
    const a = normaliserReponses(
      answers({ commute_mode: 'train', commute_is_carpool: true, commute_carpool_size: 4 })
    );
    expect(a.commute_is_carpool).toBe(false);
    expect(a.commute_carpool_size).toBeNull();
  });

  it('efface la précision des loisirs rattachée à un autre mode', () => {
    const a = normaliserReponses(
      answers({
        leisure_mode: 'bus',
        leisure_car_engine: 'thermique',
        leisure_two_wheeler_type: 'scooter_thermique',
      })
    );
    expect(a.leisure_car_engine).toBeNull();
    expect(a.leisure_two_wheeler_type).toBeNull();
  });

  it('garde la motorisation des loisirs sur « rarement », que le calcul lit encore', () => {
    // Séquence réelle : « une fois par semaine » + voiture électrique, puis retour sur
    // « rarement » — l'étape loisirs disparaît et `leisure_mode` est remis à null. Le calcul,
    // lui, force le mode à « voiture » sur cette branche et résout la motorisation avec
    // `leisure_car_engine` : l'effacer ferait passer le poste de 0,067365 à 0,142253, soit
    // 2,1× plus lourd pour quelqu'un qui roule à l'électrique.
    const rarement = normaliserReponses(
      answers({
        leisure_frequency: 'rarely',
        leisure_mode: null,
        leisure_car_engine: 'electrique',
        leisure_two_wheeler_type: 'moto_grosse',
      })
    );
    expect(rarement.leisure_car_engine).toBe('electrique');
    expect(rarement.leisure_two_wheeler_type).toBe('moto_grosse');

    // Revenir à une fréquence qui repose la question du mode rend la main à la règle.
    expect(
      normaliserReponses(
        answers({ leisure_frequency: 'weekly', leisure_mode: null, leisure_car_engine: 'electrique' })
      ).leisure_car_engine
    ).toBeNull();
  });

  it('une distance saisie efface la tranche, que le calcul n’utiliserait plus', () => {
    // État qu'aucun des deux liens de l'écran ne produit (ils s'effacent l'un l'autre), mais
    // qu'un brouillon antérieur ou un bilan relu peut porter. Le calcul fait
    // `coalesce(km, milieu de tranche)` : garder les deux laisse l'écran annoncer « On comptera
    // environ 10 km » sur un trajet compté à 12.
    const a = normaliserReponses(
      answers({ commute_distance_km: 12, commute_distance_bracket: '5_15' })
    );
    expect(a.commute_distance_km).toBe(12);
    expect(a.commute_distance_bracket).toBeNull();

    // Un « 0 » n'est pas une distance : la tranche reste la seule réponse de l'étape.
    expect(
      normaliserReponses(answers({ commute_distance_km: 0, commute_distance_bracket: '5_15' }))
        .commute_distance_bracket
    ).toBe('5_15');
  });

  it('efface la motorisation des trajets longs quand il n’y en a plus', () => {
    expect(
      normaliserReponses(answers({ car_long_trips_per_year: 0, car_long_trips_engine: 'hybride' }))
        .car_long_trips_engine
    ).toBeNull();
    expect(
      normaliserReponses(answers({ car_long_trips_per_year: 2, car_long_trips_engine: 'hybride' }))
        .car_long_trips_engine
    ).toBe('hybride');
  });

  it('ne touche pas à un jeu de réponses cohérent, et s’applique deux fois sans rien changer', () => {
    const coherent = answers({
      commute_has_regular_trip: true,
      commute_days_per_week: 4,
      commute_distance_km: 8,
      commute_mode: 'voiture',
      commute_is_carpool: true,
      commute_carpool_size: 2,
      commute_second_mode_used: true,
      commute_second_mode: 'train',
      commute_car_engine: 'hybride',
      leisure_frequency: 'weekly',
      leisure_mode: 'deux_roues_motorise',
      leisure_two_wheeler_type: 'moto_petite',
      leisure_distance_bracket: '5_15',
      car_long_trips_per_year: 2,
      car_long_trips_engine: 'thermique',
    });
    const une = normaliserReponses(coherent);
    expect(une).toEqual(coherent);
    expect(normaliserReponses(une)).toEqual(une);
  });
});

describe('lireBrouillonBilan', () => {
  it('complète les champs qu’une version antérieure ne connaissait pas', () => {
    // Brouillon écrit avant la question de cylindrée : le champ était absent, donc
    // `undefined` à la relecture — et `undefined !== null` déclarait l'étape complète. Le
    // bilan partait au tarif du scooter pour un motard.
    const brouillon = lireBrouillonBilan({
      step: 'commute_mode',
      answers: { commute_has_regular_trip: true, commute_mode: 'deux_roues_motorise' },
    });
    expect(brouillon).not.toBeNull();
    expect(brouillon!.answers.commute_two_wheeler_type).toBeNull();
    expect(isStepComplete('commute_mode', brouillon!.answers)).toBe(false);
    expect(brouillon!.answers).toEqual(
      answers({ commute_has_regular_trip: true, commute_mode: 'deux_roues_motorise' })
    );
  });

  it('normalise un état qu’une version antérieure autorisait', () => {
    const brouillon = lireBrouillonBilan({
      step: 'commute_extra',
      answers: {
        commute_mode: 'voiture',
        commute_second_mode_used: true,
        commute_second_mode: 'voiture',
      },
    });
    expect(brouillon!.answers.commute_second_mode).toBeNull();
    expect(brouillon!.answers.commute_second_mode_used).toBe(false);
  });

  it('rejette un brouillon dont l’étape est inconnue', () => {
    // Sans ce garde, aucune des neuf branches de rendu ne s'active : l'écran garde son
    // en-tête et ses boutons, et le corps est vide.
    expect(lireBrouillonBilan({ step: 'commute_carpool', answers: {} })).toBeNull();
    expect(lireBrouillonBilan({ step: 42, answers: {} })).toBeNull();
    expect(lireBrouillonBilan({ answers: {} })).toBeNull();
  });

  it('rejette ce qui n’a pas la forme d’un brouillon', () => {
    expect(lireBrouillonBilan(null)).toBeNull();
    expect(lireBrouillonBilan('brouillon')).toBeNull();
    expect(lireBrouillonBilan({ step: 'commute_mode' })).toBeNull();
    expect(lireBrouillonBilan({ step: 'commute_mode', answers: null })).toBeNull();
  });

  it('relit l’horodatage, et s’en passe quand il n’y en a pas', () => {
    expect(
      lireBrouillonBilan({ step: 'flights', answers: {}, savedAt: '2026-09-01T08:00:00.000Z' })!.savedAt
    ).toBe('2026-09-01T08:00:00.000Z');
    expect(lireBrouillonBilan({ step: 'flights', answers: {} })!.savedAt).toBeNull();
    expect(lireBrouillonBilan({ step: 'flights', answers: {}, savedAt: 1757000000000 })!.savedAt).toBeNull();
  });
});

describe('brouillonEstAncien', () => {
  const maintenant = new Date('2026-09-30T12:00:00.000Z');

  function brouillonDu(savedAt: string | null) {
    return { step: 'commute_mode' as const, answers: EMPTY_BILAN_ANSWERS, savedAt };
  }

  it('ancien au-delà du délai, récent en deçà', () => {
    const jour = 24 * 60 * 60 * 1000;
    const pile = new Date(maintenant.getTime() - BROUILLON_ANCIEN_JOURS * jour).toISOString();
    const veille = new Date(maintenant.getTime() - (BROUILLON_ANCIEN_JOURS - 1) * jour).toISOString();
    expect(brouillonEstAncien(brouillonDu(pile), maintenant)).toBe(true);
    expect(brouillonEstAncien(brouillonDu(veille), maintenant)).toBe(false);
  });

  it('ne suppose rien quand l’âge est inconnu ou illisible', () => {
    expect(brouillonEstAncien(brouillonDu(null), maintenant)).toBe(false);
    expect(brouillonEstAncien(brouillonDu('hier'), maintenant)).toBe(false);
  });
});

describe('memesReponses', () => {
  it('reconnaît un brouillon qui n’est que le dernier bilan rechargé', () => {
    const dernier = answers({ commute_mode: 'train', leisure_frequency: 'weekly' });
    expect(memesReponses(dernier, { ...dernier })).toBe(true);
    expect(memesReponses(dernier, answers({ commute_mode: 'bus', leisure_frequency: 'weekly' }))).toBe(false);
  });

  it('ignore les clés en plus d’un brouillon relu, jamais une réponse qui diffère', () => {
    const dernier = answers({ commute_days_per_week: 3 });
    const avecSurplus = { ...dernier, champ_disparu: 'oui' } as BilanAnswers;
    expect(memesReponses(dernier, avecSurplus)).toBe(true);
  });
});

describe('avancementDeLaReprise', () => {
  it('dit la phrase du canvas à l’étape 5 sur 9', () => {
    // Le cas dessiné : « Loisirs du week-end · Étape 5 sur 9 » → quatre écrans derrière, cinq
    // devant en comptant celui-ci.
    expect(avancementDeLaReprise('leisure_frequency', EMPTY_BILAN_ANSWERS)).toBe(
      'Quatre écrans déjà remplis. Il en reste cinq, en comptant celui-ci.'
    );
  });

  it('dérive le total des étapes visibles, jamais de neuf', () => {
    // **Le point du chantier.** Sans trajet régulier, trois étapes disparaissent : annoncer
    // « sur 9 » serait faux pour une bonne part des brouillons, et le canvas dit bien que le
    // compte se dérive.
    const sansTrajet = { ...EMPTY_BILAN_ANSWERS, commute_has_regular_trip: false };
    expect(visibleSteps(sansTrajet)).toHaveLength(6);
    expect(avancementDeLaReprise('leisure_frequency', sansTrajet)).toBe(
      'Un écran déjà rempli. Il en reste cinq, en comptant celui-ci.'
    );

    // Et deux sauts cumulés : pas de trajet régulier **et** loisirs rares.
    const minimal = { ...sansTrajet, leisure_frequency: 'rarely' as const };
    expect(visibleSteps(minimal)).toHaveLength(5);
    expect(avancementDeLaReprise('flights', minimal)).toBe(
      'Deux écrans déjà remplis. Il en reste trois, en comptant celui-ci.'
    );
  });

  it('ne dit jamais zéro écran rempli', () => {
    // Même règle que le récapitulatif de la carte d'ouverture : « Aucun écran déjà rempli » est
    // une façon de dire à quelqu'un qu'il n'a rien fait.
    expect(avancementDeLaReprise('commute_has_trip', EMPTY_BILAN_ANSWERS)).toBe(
      'Il en reste neuf, en comptant celui-ci.'
    );
  });

  it('accorde le singulier', () => {
    expect(avancementDeLaReprise('commute_days_distance', EMPTY_BILAN_ANSWERS)).toBe(
      'Un écran déjà rempli. Il en reste huit, en comptant celui-ci.'
    );
    expect(avancementDeLaReprise('context', EMPTY_BILAN_ANSWERS)).toBe(
      'Huit écrans déjà remplis. Il en reste un, en comptant celui-ci.'
    );
  });

  it('ne compte rien sur une étape que les réponses excluent', () => {
    // Un brouillon peut porter une étape que ses propres réponses rendent invisible : le
    // questionnaire l'en déplace, mais la phrase se calcule avant. On n'invente pas un rang.
    const rares = { ...EMPTY_BILAN_ANSWERS, leisure_frequency: 'rarely' as const };
    expect(visibleSteps(rares)).not.toContain('leisure_detail');
    expect(avancementDeLaReprise('leisure_detail', rares)).toBe(
      'Il en reste huit, en comptant celui-ci.'
    );
  });
});
