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
  OCCUPATIONS_LONG_TRAJET,
  PARTS_DU_SECOND_MODE,
  STATUT_DE_BILAN,
  TAILLES_DE_COVOITURAGE,
  distanceDomicileTravailARelire,
  distanceDomicileTravailKm,
  distanceSortieKm,
  isStepComplete,
  isStepVisible,
  lireBrouillonBilan,
  manqueDeLEtape,
  teletravailSePose,
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

describe('BILAN_STEP_ORDER', () => {
  // **Moitié cliente d'une paire, et la jumelle est en SQL** : `analytics.bilan_funnel` porte ces
  // neuf identifiants écrits en clair dans son `unnest(array[…])`, et leur ordre décide de celui
  // des lignes de l'entonnoir. Rien ne tenait les deux d'accord, et aucun des deux côtés n'était
  // épinglé (C3.12 §4).
  //
  // Ce qu'on perd sans ça : une étape renommée ici, et l'entonnoir montre pour toujours une ligne à
  // zéro là où les gens passent — un abandon massif, inventé, à l'étape qu'on vient de retoucher.
  // Une étape ajoutée, et elle n'apparaît pas du tout. Les deux moitiés doivent tomber ensemble :
  // l'assertion jumelle est dans `supabase/tests/database/12_usage_events.test.sql`.
  it('porte les neuf étapes de l’entonnoir, dans leur ordre', () => {
    expect(BILAN_STEP_ORDER).toEqual([
      'commute_has_trip',
      'commute_days_distance',
      'commute_mode',
      'commute_extra',
      'leisure_frequency',
      'leisure_detail',
      'flights',
      'long_trips',
      'context',
    ]);
  });
});

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

  /**
   * **La taille du covoiturage se demande sur l'étape du mode, pas sur la suivante**
   * (recette du 14/09/2026, `v1-16` §3). Elle se rend sous « Voiture (covoiturage) », comme les
   * deux jumelles des sorties et des longs trajets ; la condition a suivi la question.
   *
   * L'assertion la plus utile est la **dernière** : `commute_extra` ne réclame plus rien d'un
   * covoiturage sans taille. Si elle tombe, c'est que la condition a été recopiée au lieu d'être
   * déplacée — et deux étapes réclameraient alors le même champ, dont une qui ne l'affiche pas.
   */
  it('commute_mode : la taille du covoiturage est réclamée là où elle se demande', () => {
    const voiture = { commute_mode: 'voiture' as const, commute_car_engine: 'thermique' as const };
    expect(isStepComplete('commute_mode', answers({ ...voiture, commute_is_carpool: false }))).toBe(
      true
    );
    expect(
      isStepComplete(
        'commute_mode',
        answers({ ...voiture, commute_is_carpool: true, commute_carpool_size: null })
      )
    ).toBe(false);
    expect(
      isStepComplete(
        'commute_mode',
        answers({ ...voiture, commute_is_carpool: true, commute_carpool_size: 3 })
      )
    ).toBe(true);
    // `commute_second_mode_used: false` est ici une **réponse**, pas un détail de fixture : le
    // champ a un troisième état depuis `v1-16` §4, et sans lui l'étape serait incomplète pour
    // une autre raison que celle qu'on éprouve.
    expect(
      isStepComplete(
        'commute_extra',
        answers({
          commute_is_carpool: true,
          commute_carpool_size: null,
          commute_second_mode_used: false,
        })
      )
    ).toBe(true);
  });

  /**
   * **Le défaut ne répond plus à la place de la personne** (recette du 14/09/2026, `v1-16` §4).
   *
   * `EMPTY_BILAN_ANSWERS.commute_second_mode_used` valait `false` : « Non » arrivait coché sur un
   * questionnaire vierge et l'étape se traversait sans qu'on décide — or « Non » **sous-estime**
   * un trajet intermodal, sur le poste qui décide du poste dominant, donc du plan.
   *
   * Les deux moitiés comptent, et une seule ne garderait rien : la valeur du défaut, et le fait
   * que l'étape la refuse. Le `false` explicite de la dernière ligne est là pour dire que c'est
   * bien l'absence de réponse qui bloque, pas la réponse « Non ».
   */
  it('commute_extra : un questionnaire vierge n’a pas répondu, et l’étape le refuse', () => {
    expect(EMPTY_BILAN_ANSWERS.commute_second_mode_used).toBeNull();
    expect(manqueDeLEtape('commute_extra', EMPTY_BILAN_ANSWERS)).toBe(
      'une réponse sur le second mode'
    );
    expect(isStepComplete('commute_extra', answers({ commute_second_mode_used: false }))).toBe(true);
  });

  it('commute_extra : le second mode doit être renseigné s’il est activé', () => {
    expect(
      isStepComplete('commute_extra', answers({ commute_second_mode_used: true, commute_second_mode: null }))
    ).toBe(false);
    // Un second mode choisi sans sa part n'est pas une étape finie (C3.4) : c'est l'état dans
    // lequel arrive tout re-bilan prérempli d'avant la question, c'est-à-dire précisément le
    // bilan dont la seconde jambe valait la moitié du trajet par hypothèse.
    expect(
      isStepComplete(
        'commute_extra',
        answers({ commute_second_mode_used: true, commute_second_mode: 'bus' })
      )
    ).toBe(false);
    expect(
      isStepComplete(
        'commute_extra',
        answers({
          commute_second_mode_used: true,
          commute_second_mode: 'bus',
          commute_second_mode_share: 0.75,
        })
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
          commute_second_mode_share: 0.5,
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
          commute_second_mode_share: 0.25,
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

  it('leisure_detail : le covoiturage exige sa taille, la tranche ouverte exige sa distance', () => {
    const base = { leisure_mode: 'voiture', leisure_car_engine: 'thermique' } as const;

    // C3.5 — sans la taille, le calcul ne divise pas : le choix « covoiturage » ne changerait
    // rien au chiffre, ce qui est pire qu'une question non posée.
    expect(
      isStepComplete(
        'leisure_detail',
        answers({ ...base, leisure_distance_bracket: 'lt_5', leisure_is_carpool: true })
      )
    ).toBe(false);
    expect(
      isStepComplete(
        'leisure_detail',
        answers({
          ...base,
          leisure_distance_bracket: 'lt_5',
          leisure_is_carpool: true,
          leisure_carpool_size: 4,
        })
      )
    ).toBe(true);

    // C3.6 — la tranche ouverte est la seule à réclamer un chiffre, et un « 0 » n'en est pas un.
    expect(
      isStepComplete('leisure_detail', answers({ ...base, leisure_distance_bracket: '30_plus' }))
    ).toBe(false);
    expect(
      isStepComplete(
        'leisure_detail',
        answers({ ...base, leisure_distance_bracket: '30_plus', leisure_distance_km: 0 })
      )
    ).toBe(false);
    expect(
      isStepComplete(
        'leisure_detail',
        answers({ ...base, leisure_distance_bracket: '30_plus', leisure_distance_km: 120 })
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

  it('long_trips : complet par défaut (0 trajet), exige moteur et occupation dès qu’un trajet voiture est déclaré', () => {
    expect(isStepComplete('long_trips', answers({}))).toBe(true);
    expect(isStepComplete('long_trips', answers({ car_long_trips_per_year: 3 }))).toBe(false);
    // C3.5 : la motorisation seule ne suffit plus. Le calcul divisait par une personne sans
    // jamais le demander, sur le trajet qu'on partage le plus.
    expect(
      isStepComplete(
        'long_trips',
        answers({ car_long_trips_per_year: 3, car_long_trips_engine: 'thermique' })
      )
    ).toBe(false);
    expect(
      isStepComplete(
        'long_trips',
        answers({
          car_long_trips_per_year: 3,
          car_long_trips_engine: 'thermique',
          car_long_trips_occupancy: 3,
        })
      )
    ).toBe(true);
  });

  it('context : les 3 champs sont requis, et le télétravail dès deux jours de trajet', () => {
    expect(isStepComplete('context', answers({ zone_type: 'urbain_dense' }))).toBe(false);
    // Les trois faits renseignés mais pas le télétravail, **sur un profil où il se pose** : c'est
    // le seul cas où l'étape reste incomplète pour cette raison-là. Sans les jours de trajet la
    // question n'a pas d'objet, et l'assertion dirait le contraire de ce qu'elle croit dire.
    expect(
      isStepComplete(
        'context',
        answers({
          commute_has_regular_trip: true,
          commute_days_per_week: 5,
          zone_type: 'urbain_dense',
          tc_access: 'bon',
          household_vehicles: '1',
        })
      )
    ).toBe(false);
    expect(
      isStepComplete(
        'context',
        answers({
          // C5.4 : sans jours de trajet la question ne se pose pas, et l'assertion passerait sans
          // rien éprouver — c'est `teletravailSePose` qui décide, pas la seule présence du champ.
          commute_has_regular_trip: true,
          commute_days_per_week: 5,
          zone_type: 'urbain_dense',
          tc_access: 'bon',
          household_vehicles: '1',
          teletravail: 'aucun',
        })
      )
    ).toBe(true);
    // C3.8 : sans trajet régulier la question n'est pas posée, donc elle n'est pas exigée non
    // plus. Les deux gabarits qui la lisent sont des gabarits du poste domicile-travail.
    // C5.4 a ajouté une seconde façon de ne pas se poser — un seul jour de trajet — éprouvée avec
    // `normaliserReponses`, là où elle peut laisser une réponse périmée derrière elle.
    expect(
      isStepComplete(
        'context',
        answers({
          commute_has_regular_trip: false,
          zone_type: 'rural',
          tc_access: 'inexistant',
          household_vehicles: '0',
        })
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

describe('distance d’une sortie', () => {
  // Jumelle de `distanceDomicileTravailKm`, et pour le même piège : la colonne porte
  // `check (leisure_distance_km > 0)`, donc un « 0 » qui traverse les neuf étapes n'échoue
  // qu'à la soumission, en anglais, sans désigner ni le champ ni l'étape.
  it('un 0 saisi ne compte pas comme une distance', () => {
    expect(distanceSortieKm(answers({ leisure_distance_km: 0 }))).toBeNull();
    expect(distanceSortieKm(answers({ leisure_distance_km: null }))).toBeNull();
    expect(distanceSortieKm(answers({ leisure_distance_km: 120 }))).toBe(120);
    expect(distanceSortieKm(answers({ leisure_distance_km: 32.5 }))).toBe(32.5);
  });
});

describe('les tables de réponses chiffrées', () => {
  // Ces trois tables sont des **miroirs des `check` du schéma**, pas des choix d'écran : une
  // valeur hors bornes ne serait refusée qu'à la soumission, neuf étapes trop tard et en
  // anglais. Les bornes sont recopiées ici parce que rien ne peut les lire depuis le SQL — même
  // limite que `distanceBracketMidpointKm`, et même raison de l'épingler.
  // Les deux valeurs sont celles du `check` de `assessments.status` (20260823094800), recopiées
  // ici à la main comme les bornes du dessous : une constante qui dérive de son `check` ne se voit
  // ni au typecheck (la colonne est un `text`) ni en CI — elle se lit « Ton bilan n'est pas encore
  // fait », en production. Éprouvé le 20/09/2026 : `'completed'` → `'complete'` fait tomber ce
  // seul test.
  it('les statuts de bilan sont ceux du check du schéma', () => {
    expect(Object.values(STATUT_DE_BILAN)).toEqual(['in_progress', 'completed']);
  });

  it('la part du second mode tient dans ses bornes strictes', () => {
    for (const { value } of PARTS_DU_SECOND_MODE) {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThan(1);
    }
    expect(PARTS_DU_SECOND_MODE.map((p) => p.value)).toEqual([0.25, 0.5, 0.75]);
  });

  it('les tailles de covoiturage vont de 2 à 6, et la dernière dit « ou plus »', () => {
    expect(TAILLES_DE_COVOITURAGE.map((t) => t.value)).toEqual([2, 3, 4, 5, 6]);
    expect(TAILLES_DE_COVOITURAGE[TAILLES_DE_COVOITURAGE.length - 1].label).toBe('6+');
    // Ce que l'œil lit « 6+ », un lecteur d'écran l'annonçait « six plus ». Le libellé accessible
    // est dérivé du plafond et non recopié : recopié, il continuerait de dire « 6 » sur une puce
    // qui aurait cessé d'être le plafond. Et les autres disent « personnes » plutôt que le chiffre
    // nu — sortie de sa question, la puce ne dit plus de quoi elle compte.
    expect(TAILLES_DE_COVOITURAGE.map((t) => t.accessibilityLabel)).toEqual([
      '2 personnes',
      '3 personnes',
      '4 personnes',
      '5 personnes',
      '6 personnes ou plus',
    ]);
  });

  it('l’occupation d’un long trajet commence à 1 et s’arrête à 5', () => {
    // Commence à 1 parce que « seul » est une réponse, pas une absence — c'est justement la
    // valeur que le calcul supposait sans jamais la demander. S'arrête à 5 là où le
    // covoiturage quotidien va à 6 : un long trajet se fait en voiture familiale.
    expect(OCCUPATIONS_LONG_TRAJET).toEqual([1, 2, 3, 4, 5]);
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
      leisure_distance_bracket: '15_30',
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
    // **`null` et non `false`** (`v1-16` §4) : la règle écrivait « Non » pour quelqu'un qui
    // venait de dire « Oui, voiture », c'est-à-dire qu'elle répondait à sa place. Elle repose
    // la question, et l'étape reste incomplète tant qu'on n'y a pas répondu.
    expect(a.commute_second_mode_used).toBeNull();
    expect(isStepComplete('commute_extra', a)).toBe(false);
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

  it('« Non » à B1.1 emporte aussi la réponse sur le télétravail (C3.8)', () => {
    expect(
      normaliserReponses(
        answers({ commute_has_regular_trip: false, teletravail: 'deux_ou_plus' })
      ).teletravail
    ).toBeNull();
    expect(
      normaliserReponses(
        answers({
          commute_has_regular_trip: true,
          commute_days_per_week: 5,
          teletravail: 'deux_ou_plus',
        })
      ).teletravail
    ).toBe('deux_ou_plus');
  });

  // **Mutations éprouvées le 17/09/2026** — les deux tests qui suivent gardent des choses
  // différentes, et aucun des deux n'est décoratif :
  //
  //   seuil `>= 2` ramené à `>= 1`                      ->  « redescendre à un seul jour » tombe
  //   `normaliserReponses` n'écoute plus le prédicat    ->  idem
  //   `manqueDeLEtape` n'écoute plus le prédicat        ->  idem
  //   seuil `>= 2` monté à `>= 3`                       ->  « à deux jours » tombe
  //
  // Le premier exerce les **trois** lecteurs à la fois, ce qui est le point du chantier ; le second
  // tient la borne basse, que le premier ne dit pas.
  //
  // **Le chemin que ni le typecheck ni l'écran ne voient** (C5.4, v1-17 §7.2) : la question
  // disparaît en dessous de deux jours de trajet, donc une réponse donnée à 3 jours puis rendue
  // sans objet par un retour en arrière doit partir. Sans cette ligne, elle serait soumise en base
  // sans que la personne puisse plus la voir ni la corriger — le défaut de `v1-16` §4 par une
  // autre porte.
  it('redescendre à un seul jour de trajet efface la réponse sur le télétravail (C5.4)', () => {
    const a_trois_jours = answers({
      commute_has_regular_trip: true,
      commute_days_per_week: 3,
      teletravail: 'deux_ou_plus',
    });
    expect(normaliserReponses(a_trois_jours).teletravail).toBe('deux_ou_plus');

    const redescendu = normaliserReponses({ ...a_trois_jours, commute_days_per_week: 1 });
    expect(redescendu.teletravail).toBeNull();

    // Et l'étape ne la réclame plus : les trois lecteurs disent la même chose, sinon « Suivant »
    // resterait inactif pour toujours sous un message nommant une question absente de l'écran.
    expect(teletravailSePose(redescendu)).toBe(false);
    expect(
      manqueDeLEtape(
        'context',
        answers({
          ...redescendu,
          zone_type: 'urbain_dense',
          tc_access: 'bon',
          household_vehicles: '1',
        })
      )
    ).toBeNull();
  });

  // À deux jours elle se pose, donc elle est exigée : c'est la borne du seuil, et l'assertion
  // ci-dessus ne dit rien sans celle-ci.
  it('à deux jours de trajet la question se pose et l’étape la réclame (C5.4)', () => {
    const a_deux_jours = answers({
      commute_has_regular_trip: true,
      commute_days_per_week: 2,
      zone_type: 'urbain_dense',
      tc_access: 'bon',
      household_vehicles: '1',
    });
    expect(teletravailSePose(a_deux_jours)).toBe(true);
    expect(manqueDeLEtape('context', a_deux_jours)).toBe('ta réponse sur le télétravail');
  });

  it('la part du second mode ne survit pas au second mode (C3.4)', () => {
    // Séquence réelle : « Oui » → « Train » → « Un quart », puis « Non ». Sans cette règle, la
    // fraction partait à l'insert sous une question qu'on ne pose plus — et revenait telle
    // quelle dans le re-bilan prérempli.
    expect(
      normaliserReponses(
        answers({
          commute_second_mode_used: false,
          commute_second_mode: 'train',
          commute_second_mode_share: 0.25,
        })
      ).commute_second_mode_share
    ).toBeNull();
    // Et le second chemin, celui du mode devenu identique au principal.
    expect(
      normaliserReponses(
        answers({
          commute_mode: 'train',
          commute_second_mode_used: true,
          commute_second_mode: 'train',
          commute_second_mode_share: 0.5,
        })
      ).commute_second_mode_share
    ).toBeNull();
    expect(
      normaliserReponses(
        answers({
          commute_second_mode_used: true,
          commute_second_mode: 'train',
          commute_second_mode_share: 0.25,
        })
      ).commute_second_mode_share
    ).toBe(0.25);
  });

  it('le covoiturage des loisirs suit la voiture, et sa taille suit le covoiturage (C3.5)', () => {
    const versVelo = normaliserReponses(
      answers({
        leisure_frequency: 'weekly',
        leisure_mode: 'velo',
        leisure_is_carpool: true,
        leisure_carpool_size: 4,
      })
    );
    expect(versVelo.leisure_is_carpool).toBe(false);
    expect(versVelo.leisure_carpool_size).toBeNull();

    const enVoiture = normaliserReponses(
      answers({
        leisure_frequency: 'weekly',
        leisure_mode: 'voiture',
        leisure_car_engine: 'thermique',
        leisure_is_carpool: true,
        leisure_carpool_size: 4,
      })
    );
    expect(enVoiture.leisure_carpool_size).toBe(4);
  });

  it('« rarement » emporte le covoiturage des loisirs, à l’inverse de la motorisation', () => {
    // La règle du dessus (« garde la motorisation, que le calcul lit encore ») ne s'étend pas
    // au covoiturage, et c'est la distinction à ne pas défaire : le calcul divise par
    // `leisure_carpool_size` **quel que soit** le mode, donc laisser le drapeau diviserait le
    // résiduel de « rarement » par une taille déclarée pour une sortie qui n'est plus
    // déclarée. La motorisation décrit le véhicule de la personne, le covoiturage un trajet
    // qui n'existe plus.
    const rarement = normaliserReponses(
      answers({
        leisure_frequency: 'rarely',
        leisure_mode: null,
        leisure_car_engine: 'electrique',
        leisure_is_carpool: true,
        leisure_carpool_size: 4,
      })
    );
    expect(rarement.leisure_car_engine).toBe('electrique');
    expect(rarement.leisure_is_carpool).toBe(false);
    expect(rarement.leisure_carpool_size).toBeNull();
  });

  it('la distance libre des loisirs ne survit qu’à la tranche ouverte (C3.6)', () => {
    // Le calcul préfère `leisure_distance_km` à **toute** tranche (`coalesce`), donc une valeur
    // laissée par un aller-retour écraserait le milieu de tranche affiché : la personne lirait
    // « 5 à 15 km » et le bilan compterait 120.
    expect(
      normaliserReponses(
        answers({
          leisure_frequency: 'weekly',
          leisure_mode: 'velo',
          leisure_distance_bracket: '5_15',
          leisure_distance_km: 120,
        })
      ).leisure_distance_km
    ).toBeNull();
    expect(
      normaliserReponses(
        answers({
          leisure_frequency: 'weekly',
          leisure_mode: 'velo',
          leisure_distance_bracket: '30_plus',
          leisure_distance_km: 120,
        })
      ).leisure_distance_km
    ).toBe(120);
    // Et « rarement » l'emporte, comme il emporte la tranche.
    expect(
      normaliserReponses(
        answers({ leisure_frequency: 'rarely', leisure_distance_km: 120 })
      ).leisure_distance_km
    ).toBeNull();
  });

  it('l’occupation des longs trajets part avec les trajets eux-mêmes (C3.5)', () => {
    expect(
      normaliserReponses(
        answers({ car_long_trips_per_year: 0, car_long_trips_occupancy: 3 })
      ).car_long_trips_occupancy
    ).toBeNull();
    expect(
      normaliserReponses(
        answers({ car_long_trips_per_year: 2, car_long_trips_occupancy: 3 })
      ).car_long_trips_occupancy
    ).toBe(3);
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
      commute_second_mode_share: 0.75,
      commute_car_engine: 'hybride',
      leisure_frequency: 'weekly',
      leisure_mode: 'deux_roues_motorise',
      leisure_two_wheeler_type: 'moto_petite',
      leisure_distance_bracket: '5_15',
      car_long_trips_per_year: 2,
      car_long_trips_engine: 'thermique',
      car_long_trips_occupancy: 3,
      teletravail: 'un_jour',
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
    // Cf. `normaliserReponses` : l'état se défait en « pas encore répondu », pas en « Non ».
    expect(brouillon!.answers.commute_second_mode_used).toBeNull();
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
