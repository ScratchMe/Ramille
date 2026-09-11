import { etatDuRattachement } from './compte';

describe('etatDuRattachement', () => {
  it('sans session et sans échec, tout est local', () => {
    expect(etatDuRattachement({ session: null, lectureEnEchec: false })).toEqual({ kind: 'local' });
  });

  it('session anonyme sans adresse : local', () => {
    expect(
      etatDuRattachement({ session: { isAnonymous: true, email: null }, lectureEnEchec: false })
    ).toEqual({ kind: 'local' });
  });

  // Le cas de l'issue #62 : l'adresse est écrite, la confirmation n'est pas cliquée. C'est
  // l'état que `etatDuCompte` confond volontairement avec une session anonyme, et que cet
  // écran-ci doit au contraire nommer.
  it('session anonyme avec adresse : à confirmer', () => {
    expect(
      etatDuRattachement({
        session: { isAnonymous: true, email: 'camille@exemple.fr' },
        lectureEnEchec: false,
      })
    ).toEqual({ kind: 'a_confirmer', email: 'camille@exemple.fr' });
  });

  it('une adresse blanche ne vaut pas une adresse', () => {
    expect(
      etatDuRattachement({ session: { isAnonymous: true, email: '   ' }, lectureEnEchec: false })
    ).toEqual({ kind: 'local' });
  });

  it('identité confirmée : rattaché', () => {
    expect(
      etatDuRattachement({
        session: { isAnonymous: false, email: 'camille@exemple.fr' },
        lectureEnEchec: false,
      })
    ).toEqual({ kind: 'rattache', email: 'camille@exemple.fr' });
  });

  // Rattaché par Google sans que l'adresse remonte : on le dit quand même, sans la nommer.
  it('rattaché sans adresse connue', () => {
    expect(
      etatDuRattachement({ session: { isAnonymous: false, email: null }, lectureEnEchec: false })
    ).toEqual({ kind: 'rattache', email: null });
  });

  // A6-8 : hors ligne, `getUser()` rend `{ user: null, error }` sans lever. Ramener ce cas à
  // `local` faisait dire à une personne rattachée depuis des mois qu'elle n'a pas de compte,
  // et lui proposait d'en créer un.
  it('lecture en échec sans session : indisponible, jamais local', () => {
    expect(etatDuRattachement({ session: null, lectureEnEchec: true })).toEqual({
      kind: 'indisponible',
    });
  });

  it('une session lue prime sur l’échec', () => {
    // Les deux ensemble ne devraient pas arriver ; si c'est le cas, ce qu'on a lu vaut mieux
    // que ce qu'on n'a pas pu lire.
    expect(
      etatDuRattachement({
        session: { isAnonymous: false, email: 'camille@exemple.fr' },
        lectureEnEchec: true,
      })
    ).toEqual({ kind: 'rattache', email: 'camille@exemple.fr' });
  });
});
