import { doitOuvrirUneSessionAnonyme, etatDeSession, lEcranDeReconnexionSePose } from '@/types/session';

describe('etatDeSession', () => {
  it('une session présente se reconnaît avant tout le reste', () => {
    expect(etatDeSession(true, null, false)).toBe('presente');
    // Même avec une erreur : `getSession()` peut rendre une session encore valide **et** l'erreur
    // du rafraîchissement qui a échoué (la « proactive-preserve » d'`auth-js`). La session gagne —
    // elle marche.
    expect(etatDeSession(true, { name: 'AuthApiError', status: 400, code: 'refresh_token_not_found' }, false)).toBe(
      'presente'
    );
  });

  it('aucune session et aucune erreur : première ouverture', () => {
    // `null` et pas `undefined` : c'est la forme exacte que rend `getSession()`, et `ErreurAuth`
    // ne couvre que celle-là. Élargir le type pour un cas que le SDK ne produit pas, ce serait
    // exactement le test qui n'éprouve rien dont `src/types/connexion.ts` porte l'exemple.
    expect(etatDeSession(false, null, false)).toBe('absente');
  });

  /**
   * **L'état pour lequel ce module existe.** Un jeton refusé, c'est la session d'un compte réel qui
   * vient d'être rejetée : créer une session anonyme là donne un compte vide à quelqu'un qui en a
   * un, et l'app lui dit « Ton bilan n'est pas encore fait » alors que son bilan, son plan et ses
   * points sont intacts côté serveur.
   */
  it('un jeton refusé n’est pas une absence de session', () => {
    expect(
      etatDeSession(false, { name: 'AuthApiError', status: 400, code: 'refresh_token_not_found' }, false)
    ).toBe('refusee');
    expect(etatDeSession(false, { name: 'AuthApiError', status: 401, code: 'invalid_grant' }, false)).toBe(
      'refusee'
    );
  });

  /**
   * **Le refus du démarrage n'a pas d'erreur** (02/10/2026, `v1-27` §12.27) : l'initialisation
   * d'`auth-js` a déjà retiré la session, et `getSession()` ne voit plus rien. Ce qui le sépare d'une
   * première ouverture, c'est la marque d'un compte rattaché (`porteUnCompte`) ; sans elle — une
   * session anonyme purgée —, c'est bien une première ouverture. Éprouvé : la branche réduite à
   * `return 'absente'` → ce test, seul (le client réel le voit aussi, `src/lib/session-refusee.test.ts`).
   */
  it('sans session ni erreur, un appareil qui portait un compte est un refus', () => {
    expect(etatDeSession(false, null, true)).toBe('refusee');
    expect(etatDeSession(false, null, false)).toBe('absente');
    // Une session présente gagne toujours : une connexion a eu lieu depuis.
    expect(etatDeSession(true, null, true)).toBe('presente');
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
    expect(etatDeSession(false, { name: 'AuthRetryableFetchError' }, false)).toBe('indisponible');
    expect(etatDeSession(false, { name: 'AuthApiError', status: 503 }, false)).toBe('indisponible');
    expect(etatDeSession(false, { name: 'TypeError' }, false)).toBe('indisponible');
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

/**
 * Où l'écran de reconnexion se pose (02/10/2026, contre-lecture de la PR #315). Éprouvé : la garde de
 * `/connexion/` retirée → « s'efface sur la reconnexion… », seul ; la liste vidée → « laisse les
 * surfaces publiques… », seul.
 */
describe('lEcranDeReconnexionSePose', () => {
  it('se pose sur les écrans qui demandent le compte, et sur une route neuve', () => {
    // `/feedback` aussi : il écrit un retour rattaché à la session, et ne marche pas sans elle.
    for (const chemin of ['/', '/plan', '/plan/pistes', '/suivi', '/suivi/bilan', '/compte', '/bilan', '/onboarding', '/contexte', '/feedback', '/une-route-neuve']) {
      expect({ chemin, pose: lEcranDeReconnexionSePose(chemin) }).toEqual({ chemin, pose: true });
    }
  });

  it('s’efface sur la reconnexion, où la personne va justement', () => {
    for (const chemin of ['/connexion', '/connexion/retrouver', '/connexion/email']) {
      expect({ chemin, pose: lEcranDeReconnexionSePose(chemin) }).toEqual({ chemin, pose: false });
    }
  });

  it('laisse les surfaces publiques et de service, qui ne demandent pas de compte', () => {
    for (const chemin of ['/compte/suppression', '/rappels/stop', '/confidentialite', '/conditions', '/status']) {
      expect({ chemin, pose: lEcranDeReconnexionSePose(chemin) }).toEqual({ chemin, pose: false });
    }
  });
});
