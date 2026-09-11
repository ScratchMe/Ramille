import { doitOuvrirUneSessionAnonyme, etatDeSession } from '@/types/session';

describe('etatDeSession', () => {
  it('une session présente se reconnaît avant tout le reste', () => {
    expect(etatDeSession(true, null)).toBe('presente');
    // Même avec une erreur : `getSession()` peut rendre une session encore valide **et** l'erreur
    // du rafraîchissement qui a échoué (la « proactive-preserve » d'`auth-js`). La session gagne —
    // elle marche.
    expect(etatDeSession(true, { name: 'AuthApiError', status: 400, code: 'refresh_token_not_found' })).toBe(
      'presente'
    );
  });

  it('aucune session et aucune erreur : première ouverture', () => {
    // `null` et pas `undefined` : c'est la forme exacte que rend `getSession()`, et `ErreurAuth`
    // ne couvre que celle-là. Élargir le type pour un cas que le SDK ne produit pas, ce serait
    // exactement le test qui n'éprouve rien dont `src/types/connexion.ts` porte l'exemple.
    expect(etatDeSession(false, null)).toBe('absente');
  });

  /**
   * **L'état pour lequel ce module existe.** Un jeton refusé, c'est la session d'un compte réel qui
   * vient d'être rejetée : créer une session anonyme là donne un compte vide à quelqu'un qui en a
   * un, et l'app lui dit « Ton bilan n'est pas encore fait » alors que son bilan, son plan et ses
   * points sont intacts côté serveur.
   */
  it('un jeton refusé n’est pas une absence de session', () => {
    expect(
      etatDeSession(false, { name: 'AuthApiError', status: 400, code: 'refresh_token_not_found' })
    ).toBe('refusee');
    expect(etatDeSession(false, { name: 'AuthApiError', status: 401, code: 'invalid_grant' })).toBe(
      'refusee'
    );
  });

  /**
   * Et la panne de transport n'est ni l'un ni l'autre. La même erreur lue comme un refus
   * reprocherait à la personne ce que le réseau a fait ; lue comme une absence, elle lui
   * fabriquerait un compte orphelin pour une cause qui disparaît d'elle-même.
   *
   * La reconnaissance est déléguée à `estPanneDeTransport` — une seule définition de « le transport
   * n'a pas abouti » dans tout le produit, et elle couvre les 5xx volontairement (cf.
   * `src/types/connexion.ts`).
   */
  it('une panne de transport n’est ni un refus ni une absence', () => {
    expect(etatDeSession(false, { name: 'AuthRetryableFetchError' })).toBe('indisponible');
    expect(etatDeSession(false, { name: 'AuthApiError', status: 503 })).toBe('indisponible');
    expect(etatDeSession(false, { name: 'TypeError' })).toBe('indisponible');
  });
});

describe('doitOuvrirUneSessionAnonyme', () => {
  it('n’ouvre une session que sur une vraie première ouverture', () => {
    expect(doitOuvrirUneSessionAnonyme('absente')).toBe(true);
  });

  // Les trois autres cas disent non, et pour trois raisons différentes : il y en a déjà une, on
  // couvrirait un compte, ou la cause est passagère. C'est l'assertion qui tombe si quelqu'un
  // « simplifie » la fonction en `etat !== 'presente'`.
  it.each<[Parameters<typeof doitOuvrirUneSessionAnonyme>[0]]>([
    ['presente'],
    ['refusee'],
    ['indisponible'],
  ])('n’ouvre rien quand l’état est %s', (etat) => {
    expect(doitOuvrirUneSessionAnonyme(etat)).toBe(false);
  });
});
