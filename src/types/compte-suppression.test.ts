import { adresseSemblePlausible, etatDuCompte } from './compte-suppression';

describe('etatDuCompte', () => {
  it('sans session, rien n’est identifiable', () => {
    expect(etatDuCompte(null)).toEqual({ kind: 'inconnu' });
  });

  it('un compte permanent est nommé par son adresse', () => {
    expect(etatDuCompte({ isAnonymous: false, email: 'a@b.fr', aDesDonnees: true })).toEqual({
      kind: 'rattache',
      email: 'a@b.fr',
    });
  });

  it('reste supprimable même si l’adresse manque', () => {
    expect(etatDuCompte({ isAnonymous: false, email: null, aDesDonnees: true })).toEqual({
      kind: 'rattache',
      email: null,
    });
  });

  // Le piège : `updateUser({ email })` écrit l'adresse avant la confirmation, et
  // `is_anonymous` ne bascule qu'après. Se fier à l'adresse annoncerait un compte rattaché
  // à quelqu'un qui ne l'a jamais confirmé.
  it('une session anonyme portant déjà une adresse non confirmée n’est pas un compte rattaché', () => {
    expect(etatDuCompte({ isAnonymous: true, email: 'a@b.fr', aDesDonnees: true })).toEqual({
      kind: 'anonyme-avec-donnees',
    });
  });

  it('une session anonyme avec un bilan est supprimable', () => {
    expect(etatDuCompte({ isAnonymous: true, email: null, aDesDonnees: true })).toEqual({
      kind: 'anonyme-avec-donnees',
    });
  });

  // Le cas qui motive tout ce module : navigateur neuf, session anonyme vide créée à
  // l'ouverture de la page. La supprimer ne supprimerait rien et le dirait quand même.
  it('une session anonyme vide n’est pas un compte à supprimer', () => {
    expect(etatDuCompte({ isAnonymous: true, email: null, aDesDonnees: false })).toEqual({
      kind: 'inconnu',
    });
  });
});

describe('adresseSemblePlausible', () => {
  it('accepte les adresses ordinaires', () => {
    for (const valeur of ['a@b.fr', 'prenom.nom@exemple.co.uk', ' a@b.fr ', 'a+tag@b.io']) {
      expect({ valeur, ok: adresseSemblePlausible(valeur) }).toEqual({ valeur, ok: true });
    }
  });

  it('refuse ce qui ne peut pas être une adresse', () => {
    for (const valeur of ['', '   ', 'sansarobase.fr', 'a@b', 'a@b.', '@b.fr', 'a@', 'a b@c.fr', 'a@b@c.fr']) {
      expect({ valeur, ok: adresseSemblePlausible(valeur) }).toEqual({ valeur, ok: false });
    }
  });
});
