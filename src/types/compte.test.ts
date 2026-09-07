import { etatDuRattachement } from './compte';

describe('etatDuRattachement', () => {
  it('sans session, tout est local', () => {
    expect(etatDuRattachement(null)).toEqual({ kind: 'local' });
  });

  it('session anonyme sans adresse : local', () => {
    expect(etatDuRattachement({ isAnonymous: true, email: null })).toEqual({ kind: 'local' });
  });

  // Le cas de l'issue #62 : l'adresse est écrite, la confirmation n'est pas cliquée. C'est
  // l'état que `etatDuCompte` confond volontairement avec une session anonyme, et que cet
  // écran-ci doit au contraire nommer.
  it('session anonyme avec adresse : à confirmer', () => {
    expect(etatDuRattachement({ isAnonymous: true, email: 'camille@exemple.fr' })).toEqual({
      kind: 'a_confirmer',
      email: 'camille@exemple.fr',
    });
  });

  it('une adresse blanche ne vaut pas une adresse', () => {
    expect(etatDuRattachement({ isAnonymous: true, email: '   ' })).toEqual({ kind: 'local' });
  });

  it('identité confirmée : rattaché', () => {
    expect(etatDuRattachement({ isAnonymous: false, email: 'camille@exemple.fr' })).toEqual({
      kind: 'rattache',
      email: 'camille@exemple.fr',
    });
  });

  // Rattaché par Google sans que l'adresse remonte : on le dit quand même, sans la nommer.
  it('rattaché sans adresse connue', () => {
    expect(etatDuRattachement({ isAnonymous: false, email: null })).toEqual({
      kind: 'rattache',
      email: null,
    });
  });
});
