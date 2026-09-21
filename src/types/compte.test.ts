import {
  CONDITIONS_DE_PERTE_SANS_COMPTE,
  DELAI_SANS_COMPTE_EN_MOTS,
  etatDuRattachement,
  PHRASE_SANS_COMPTE_SOUS_LA_SORTIE,
  PHRASE_SANS_COMPTE_SUR_TOI,
} from './compte';

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

describe('ce qu’on perd sans compte', () => {
  /**
   * **La garde de l’arbitrage du 21/09/2026 (`v1-28` §7.2), et elle est écrite sur la
   * non-divergence, pas sur le texte.**
   *
   * Deux écrans disent le même fait — la sortie de `/connexion` et « Toi » en état local. Le
   * risque n’est pas qu’une phrase soit mal tournée : c’est qu’on en retouche **une** et que
   * l’autre continue d’annoncer un autre délai, chacune ayant l’air juste toute seule. C’est
   * exactement ce qui est arrivé à la puce « Cadence » en C2.8.
   *
   * Ce test tombe dès qu’une des deux cesse de porter la clause commune — donc dès qu’on y
   * réécrit le délai à la main. Ce qu’il ne voit **pas**, et qu’il ne faut pas lui prêter : un
   * troisième écran qui dirait le fait sans passer par ici. Rien ne balaie le dépôt pour le
   * trouver, comme pour `MIROIRS` en `TESTING.md` §2.7.
   */
  it('dit le même délai aux deux endroits, par la même clause', () => {
    expect(PHRASE_SANS_COMPTE_SOUS_LA_SORTIE).toContain(CONDITIONS_DE_PERTE_SANS_COMPTE);
    expect(PHRASE_SANS_COMPTE_SUR_TOI).toContain(CONDITIONS_DE_PERTE_SANS_COMPTE);
    expect(CONDITIONS_DE_PERTE_SANS_COMPTE).toContain(DELAI_SANS_COMPTE_EN_MOTS);
  });

  /**
   * **« Toi » disait l’avantage et jamais l’échéance**, et c’est le défaut que l’arbitrage a
   * tranché. La phrase doit donc porter les deux : ce qu’un compte apporte, et ce que son
   * absence coûte. Sans la seconde moitié, la seule personne prévenue est celle qui envisageait
   * déjà un compte — pas celle que la purge efface.
   */
  it('dit sur « Toi » l’avantage ET l’échéance', () => {
    expect(PHRASE_SANS_COMPTE_SUR_TOI).toContain('te suivre ailleurs');
    expect(PHRASE_SANS_COMPTE_SUR_TOI).toContain(DELAI_SANS_COMPTE_EN_MOTS);
  });

  /**
   * Le texte de `/connexion` était arbitré et en production : ce chantier le fait lire ailleurs,
   * il ne le réécrit pas. Cette assertion est ce qui rend cette promesse vérifiable.
   */
  it('ne retouche pas le texte déjà en production sous la sortie de /connexion', () => {
    expect(PHRASE_SANS_COMPTE_SOUS_LA_SORTIE).toBe(
      'Sur cet appareil seulement : si tu changes de téléphone ou si tu ne reviens pas pendant trois mois, ton bilan ne te suivra pas.'
    );
  });
});
