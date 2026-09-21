import { etatDuCompte } from './compte-suppression';

describe('etatDuCompte', () => {
  it('sans session, rien n’est identifiable', () => {
    expect(etatDuCompte(null)).toEqual({ kind: 'inconnu' });
  });

  it('un compte permanent est nommé par son adresse', () => {
    expect(etatDuCompte({ isAnonymous: false, email: 'a@b.fr', emailEnAttente: null, aDesDonnees: true })).toEqual({
      kind: 'rattache',
      email: 'a@b.fr',
    });
  });

  it('reste supprimable même si l’adresse manque', () => {
    expect(etatDuCompte({ isAnonymous: false, email: null, emailEnAttente: null, aDesDonnees: true })).toEqual({
      kind: 'rattache',
      email: null,
    });
  });

  /**
   * Le piège : `updateUser({ email })` inscrit l'adresse avant la confirmation, et `is_anonymous`
   * ne bascule qu'après. Se fier à une adresse annoncerait un compte rattaché à quelqu'un qui ne
   * l'a jamais confirmé.
   *
   * **La fixture portait `email`, et c'était une fiction** : mesuré le 21/09/2026, sur une session
   * anonyme GoTrue laisse `email` **vide** et n'écrit que `new_email` (`emailEnAttente` ici). Le
   * cas est donc joué dans les deux formes — celle que la production produit, et celle qu'elle ne
   * produit pas — parce que ce module doit répondre pareil aux deux : une adresse en attente, quel
   * que soit le champ qui la porte, ne rend pas un compte rattaché.
   */
  it('une session anonyme portant déjà une adresse non confirmée n’est pas un compte rattaché', () => {
    // La forme réelle : l'adresse est en attente, `email` est vide.
    expect(
      etatDuCompte({ isAnonymous: true, email: null, emailEnAttente: 'a@b.fr', aDesDonnees: true })
    ).toEqual({ kind: 'anonyme-avec-donnees' });
    // Et la forme que le dossier supposait, au cas où GoTrue changerait d'avis.
    expect(
      etatDuCompte({ isAnonymous: true, email: 'a@b.fr', emailEnAttente: null, aDesDonnees: true })
    ).toEqual({ kind: 'anonyme-avec-donnees' });
  });

  it('une session anonyme avec un bilan est supprimable', () => {
    expect(etatDuCompte({ isAnonymous: true, email: null, emailEnAttente: null, aDesDonnees: true })).toEqual({
      kind: 'anonyme-avec-donnees',
    });
  });

  // Le cas qui motive tout ce module : navigateur neuf, session anonyme vide créée à
  // l'ouverture de la page. La supprimer ne supprimerait rien et le dirait quand même.
  it('une session anonyme vide n’est pas un compte à supprimer', () => {
    expect(etatDuCompte({ isAnonymous: true, email: null, emailEnAttente: null, aDesDonnees: false })).toEqual({
      kind: 'inconnu',
    });
  });
});
