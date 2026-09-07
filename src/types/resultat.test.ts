import { modeResultat } from './resultat';

describe('modeResultat', () => {
  it('est « nouveau » sur le paramètre explicite du questionnaire', () => {
    expect(modeResultat('1')).toBe('nouveau');
  });

  it('est « relecture » sans paramètre — le cas d’une entrée du suivi', () => {
    expect(modeResultat(undefined)).toBe('relecture');
  });

  // Le défaut penche vers le mode sobre : une valeur inattendue ne doit pas relancer une
  // proposition de compte à quelqu'un qui consulte son historique.
  it('est « relecture » sur toute autre valeur', () => {
    for (const valeur of ['', '0', 'true', 'oui', '11']) {
      expect({ valeur, mode: modeResultat(valeur) }).toEqual({ valeur, mode: 'relecture' });
    }
  });
});
