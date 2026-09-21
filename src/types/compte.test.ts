import { etatDuRattachement } from './compte';

describe('etatDuRattachement', () => {
  it('sans session et sans échec, tout est local', () => {
    expect(etatDuRattachement({ session: null, lectureEnEchec: false })).toEqual({ kind: 'local' });
  });

  it('session anonyme sans adresse : local', () => {
    expect(
      etatDuRattachement({ session: { isAnonymous: true, email: null, emailEnAttente: null }, lectureEnEchec: false })
    ).toEqual({ kind: 'local' });
  });

  /**
   * Le cas de l'issue #62 : l'adresse est inscrite, la confirmation n'est pas faite. C'est l'état
   * que `etatDuCompte` confond volontairement avec une session anonyme, et que cet écran-ci doit au
   * contraire nommer.
   *
   * **Ce test passait sur une forme que la production ne produit pas** — il donnait l'adresse dans
   * `email`, et la dérivation la lisait là. Mesuré le 21/09/2026 contre GoTrue : sur une session
   * anonyme, `updateUser({ email })` laisse `email` **vide** et n'écrit que `new_email`. L'état
   * `a_confirmer` n'était donc rendu pour personne — le test gardait une fiction, et la porte
   * « Saisir le code » de « Toi » comme la phrase du pied de l'écran de code en dépendaient.
   *
   * C'est la même famille que « le test garde la fonction, jamais ses appels », un cran plus haut :
   * ici il gardait une **forme d'entrée** que rien n'envoie.
   */
  it('la forme que la production produit — adresse en attente, email vide — rend « à confirmer »', () => {
    expect(
      etatDuRattachement({
        session: { isAnonymous: true, email: null, emailEnAttente: 'camille@exemple.fr' },
        lectureEnEchec: false,
      })
    ).toEqual({ kind: 'a_confirmer', email: 'camille@exemple.fr' });
  });

  it('et le repli tient si GoTrue changeait d’avis sur le champ qu’il remplit', () => {
    expect(
      etatDuRattachement({
        session: { isAnonymous: true, email: 'camille@exemple.fr', emailEnAttente: null },
        lectureEnEchec: false,
      })
    ).toEqual({ kind: 'a_confirmer', email: 'camille@exemple.fr' });
  });

  it('une adresse blanche ne vaut pas une adresse, dans les deux champs', () => {
    expect(
      etatDuRattachement({
        session: { isAnonymous: true, email: '   ', emailEnAttente: null },
        lectureEnEchec: false,
      })
    ).toEqual({ kind: 'local' });
    expect(
      etatDuRattachement({
        session: { isAnonymous: true, email: null, emailEnAttente: '   ' },
        lectureEnEchec: false,
      })
    ).toEqual({ kind: 'local' });
  });

  /**
   * **Une adresse en attente ne rend jamais « rattaché ».** `is_anonymous` prime, et c'est ce qui
   * empêche d'annoncer « ton compte est rattaché à … » à quelqu'un qui n'a pas tapé son code.
   */
  it('une adresse en attente ne fait jamais dire « rattaché »', () => {
    const etat = etatDuRattachement({
      session: { isAnonymous: true, email: null, emailEnAttente: 'camille@exemple.fr' },
      lectureEnEchec: false,
    });
    expect(etat.kind).not.toBe('rattache');
  });

  it('identité confirmée : rattaché', () => {
    expect(
      etatDuRattachement({
        session: { isAnonymous: false, email: 'camille@exemple.fr', emailEnAttente: null },
        lectureEnEchec: false,
      })
    ).toEqual({ kind: 'rattache', email: 'camille@exemple.fr' });
  });

  // Rattaché par Google sans que l'adresse remonte : on le dit quand même, sans la nommer.
  it('rattaché sans adresse connue', () => {
    expect(
      etatDuRattachement({ session: { isAnonymous: false, email: null, emailEnAttente: null }, lectureEnEchec: false })
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
        session: { isAnonymous: false, email: 'camille@exemple.fr', emailEnAttente: null },
        lectureEnEchec: true,
      })
    ).toEqual({ kind: 'rattache', email: 'camille@exemple.fr' });
  });
});
