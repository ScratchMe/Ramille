import { MASCOT_NAME, RAMILLE } from './mascotte';
import { APP_NAME } from './produit';

const lignes = Object.entries(RAMILLE);

describe('Ramille', () => {
  it('porte le nom du produit — décision du 05/09/2026, à changer ici et nulle part ailleurs', () => {
    expect(MASCOT_NAME).toBe(APP_NAME);
  });

  it('ne dit jamais un nombre : les chiffres restent au produit', () => {
    for (const [cle, ligne] of lignes) {
      expect({ cle, ligne }).not.toMatchObject({ ligne: expect.stringMatching(/\d/) });
    }
  });

  it('ne donne jamais d’injonction', () => {
    const injonctions = /\b(tu devrais|il faut|tu dois|il faudrait|obligé|obligée)\b/i;
    for (const [cle, ligne] of lignes) {
      expect({ cle, ligne }).not.toMatchObject({ ligne: expect.stringMatching(injonctions) });
    }
  });

  it('parle court', () => {
    for (const [cle, ligne] of lignes) {
      expect({ cle, longueur: ligne.length }).toEqual({ cle, longueur: expect.any(Number) });
      expect(ligne.length).toBeLessThanOrEqual(120);
      expect(ligne.trim().length).toBeGreaterThan(0);
    }
  });

  it('ne cite jamais l’ancien nom du produit', () => {
    for (const [, ligne] of lignes) {
      expect(ligne).not.toMatch(/trace ?verte/i);
    }
  });
});
