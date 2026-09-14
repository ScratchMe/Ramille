import { DETAIL_MAX, decrireErreur } from './erreur';

describe('decrireErreur', () => {
  it('rend le nom et le message d’une Error', () => {
    expect(decrireErreur(new TypeError('rien à lire'))).toBe('TypeError : rien à lire');
    expect(decrireErreur(new Error(''))).toBe('Error');
  });

  it('rend une erreur Supabase lisible, et jamais « [object Object] »', () => {
    // **Le garde qui compte.** C'est la forme que PostgREST renvoie, et ce n'est pas une `Error` :
    // `String(erreur)` en faisait « [object Object] » sur les deux écrans qui promettent la cause
    // exacte.
    const postgrest = { code: 'PGRST303', details: null, hint: null, message: 'JWT issued at future' };
    const decrit = decrireErreur(postgrest);
    expect(decrit).not.toContain('[object Object]');
    expect(decrit).toContain('PGRST303');
    expect(decrit).toContain('JWT issued at future');
  });

  it('passe une chaîne telle quelle', () => {
    expect(decrireErreur('Network request failed')).toBe('Network request failed');
  });

  it('ne lève sur aucune forme, structure circulaire comprise', () => {
    const circulaire: Record<string, unknown> = {};
    circulaire.soi = circulaire;
    expect(() => decrireErreur(circulaire)).not.toThrow();
    for (const valeur of [null, undefined, 0, NaN, [], () => {}, Symbol('x')]) {
      expect(() => decrireErreur(valeur)).not.toThrow();
    }
  });

  it('borne la sortie', () => {
    expect(decrireErreur(new Error('x'.repeat(2000))).length).toBe(DETAIL_MAX);
    expect(decrireErreur('y'.repeat(2000)).length).toBe(DETAIL_MAX);
    expect(decrireErreur({ m: 'z'.repeat(2000) }).length).toBe(DETAIL_MAX);
  });
});
