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
  it('le poste transport de la décomposition est bien celui utilisé comme repère', () => {
    // Deux constantes distinctes pour deux écrans, mais une seule réalité : si l'une bouge
    // sans l'autre, la restitution et l'onboarding se contrediraient.
    const transport = CONSUMPTION_POSTES.find((poste) => poste.key === 'transport');
    expect(transport?.valueT).toBe(FRANCE_AVERAGE_TRANSPORT_T);
  });

  it('la somme des postes correspond à la publication SDES (9,5 t)', () => {
    expect(CONSUMPTION_POSTES_TOTAL_T).toBeCloseTo(9.5, 5);
  });

  it('la moyenne totale et la décomposition restent du même ordre de grandeur', () => {
    // Elles viennent de deux publications d'années différentes : un écart est normal, un
    // écart important signalerait qu'on a mélangé deux sources incompatibles.
    expect(Math.abs(CONSUMPTION_POSTES_TOTAL_T - FRANCE_AVERAGE_TOTAL_T)).toBeLessThan(1);
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
