// Ces constantes sont affichées telles quelles à l'utilisateur et portent le cadrage du
// produit. Les tests ci-dessous ne « vérifient » pas des chiffres officiels — ils gardent
// les invariants qu'une retouche distraite casserait sans que personne ne s'en aperçoive.
import {
  CONSUMPTION_POSTES,
  CONSUMPTION_POSTES_TOTAL_T,
  FRANCE_AVERAGE_TOTAL_T,
  FRANCE_AVERAGE_TRANSPORT_T,
  TARGET_2050_TOTAL_T,
  TARGET_2050_TRANSPORT_T,
  formatTonnesShort,
} from '@/constants/carbon-reference';

describe('repères carbone', () => {
  it('reprend les valeurs publiées par le SDES pour chaque poste', () => {
    // Épingle les chiffres de la publication (données 2017) : si quelqu'un les retouche
    // « au feeling », le test tombe et l'oblige à revenir à la source.
    expect(CONSUMPTION_POSTES.map((poste) => [poste.key, poste.valueT])).toEqual([
      ['transport', 2.8],
      ['logement', 2.2],
      ['alimentation', 2.1],
      ['services', 1.5],
      ['equipements', 0.9],
    ]);
    expect(CONSUMPTION_POSTES_TOTAL_T).toBeCloseTo(9.5, 5);
  });

  it('les postes sont classés du plus lourd au plus léger', () => {
    // L'onboarding dimensionne ses barres sur CONSUMPTION_POSTES[0] et annonce que le
    // transport est le premier poste : un ordre cassé rendrait l'écran faux sans planter.
    const values = CONSUMPTION_POSTES.map((poste) => poste.valueT);
    expect([...values].sort((a, b) => b - a)).toEqual(values);
  });

  it('le total affiché est exactement la somme des postes affichés', () => {
    // Le cœur de l'arbitrage de source (cf. en-tête de carbon-reference.ts) : l'onboarding
    // montre la ventilation, la restitution montre le total, et les deux doivent venir de
    // la même publication. Un total repris d'une autre source rouvrirait l'incohérence.
    expect(FRANCE_AVERAGE_TOTAL_T).toBe(CONSUMPTION_POSTES_TOTAL_T);
    expect(FRANCE_AVERAGE_TRANSPORT_T).toBe(CONSUMPTION_POSTES[0].valueT);
  });

  it('le repère transport 2050 est bien la part actuelle appliquée à la cible', () => {
    const share = FRANCE_AVERAGE_TRANSPORT_T / CONSUMPTION_POSTES_TOTAL_T;
    expect(TARGET_2050_TRANSPORT_T).toBeCloseTo(TARGET_2050_TOTAL_T * share, 1);
  });

  it('le repère 2050 est très en dessous de la moyenne actuelle', () => {
    // Garde-fou de sens : si une retouche inversait le rapport, l'écran de restitution
    // afficherait une cible plus haute que la moyenne, ce qui n'aurait aucun sens.
    expect(TARGET_2050_TRANSPORT_T).toBeLessThan(FRANCE_AVERAGE_TRANSPORT_T / 3);
    expect(TARGET_2050_TRANSPORT_T).toBeGreaterThan(0);
  });

  it('formate en tonnes à la française', () => {
    expect(formatTonnesShort(2.8)).toBe('2,8 t');
    expect(formatTonnesShort(0.6)).toBe('0,6 t');
    expect(formatTonnesShort(9)).toBe('9,0 t');
  });
});
