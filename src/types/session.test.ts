import {
  doitOuvrirUneSessionAnonyme,
  etatDeSession,
  gardeDuJeton,
  laSessionSOuvreSur,
  lEcranDeReconnexionSePose,
  suiteDuDemarrage,
} from '@/types/session';

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

/**
 * Où le montage ouvre une session, et où il ne fait que restaurer (18/10/2026). La même liste que
 * l'écran de reconnexion : une page publique pour l'une et pas pour l'autre serait un oubli. Éprouvé le
 * 18/10/2026 : `laSessionSOuvreSur` réduite à `return true` → « ne crée rien sur les surfaces sans
 * compte », « … avec ou sans barre finale » et « suit la même liste… » ; la barre finale plus retirée
 * → « … avec ou sans barre finale », seul.
 */
describe('laSessionSOuvreSur', () => {
  it('ouvre la session partout où l’app peut écrire, et sur une route neuve', () => {
    for (const chemin of ['/', '/onboarding', '/bilan', '/plan', '/suivi/bilan', '/compte', '/connexion/retrouver', '/feedback', '/une-route-neuve']) {
      expect({ chemin, ouvre: laSessionSOuvreSur(chemin) }).toEqual({ chemin, ouvre: true });
    }
  });

  it('ne crée rien sur les surfaces sans compte — elles ne font que restaurer', () => {
    for (const chemin of ['/compte/suppression', '/rappels/stop', '/confidentialite', '/conditions', '/status']) {
      expect({ chemin, ouvre: laSessionSOuvreSur(chemin) }).toEqual({ chemin, ouvre: false });
    }
  });

  it('reconnaît une surface sans compte avec ou sans barre finale', () => {
    expect(laSessionSOuvreSur('/confidentialite/')).toBe(false);
    expect(lEcranDeReconnexionSePose('/rappels/stop/')).toBe(false);
  });

  it('suit la même liste que l’écran de reconnexion, hors `/connexion/…`', () => {
    for (const chemin of ['/', '/plan', '/compte/suppression', '/rappels/stop', '/confidentialite', '/conditions', '/status', '/feedback']) {
      expect({ chemin, ouvre: laSessionSOuvreSur(chemin) }).toEqual({ chemin, ouvre: lEcranDeReconnexionSePose(chemin) });
    }
  });
});

/**
 * Ce que la racine fait de la session qu'elle a demandée (`v1-27` §12.35). Éprouvé le 18/10/2026 :
 * `indisponible` rendu à `lire`, la conduite d'avant → « un rafraîchissement en panne se replie… », seul.
 */
describe('suiteDuDemarrage', () => {
  it('une session présente se lit', () => {
    expect(suiteDuDemarrage('presente')).toBe('lire');
  });

  it('un refus attend l’écran de reconnexion, sans rien lire', () => {
    expect(suiteDuDemarrage('refusee')).toBe('attendre');
  });

  it('un rafraîchissement en panne se replie comme une coupure, au lieu de lire en `anon`', () => {
    expect(suiteDuDemarrage('indisponible')).toBe('repli');
  });

  it('une absence ne lit rien non plus : c’est le côté qui ne part jamais sans session', () => {
    expect(suiteDuDemarrage('absente')).toBe('repli');
  });
});

/**
 * La garde de l'enregistrement du jeton (`src/app/_layout.tsx`). Éprouvé le 18/10/2026, une mutation à
 * la fois :
 *   - un échec retenu comme fait (`aRetenter` jamais posé) → « un enregistrement qui n'a rien inscrit se
 *     retente au retour… », « une exception compte comme un échec… » et « seul le dernier lancé
 *     conclut » ;
 *   - un échec retenté à chaque émission de session (le moment ignoré) → « … et pas à chaque émission de
 *     session », seul ;
 *   - deux appels rapprochés lancés tous deux (`enCours` ignoré) → « un enregistrement en cours ne se
 *     double pas » et « seul le dernier lancé conclut » ;
 *   - la conclusion d'un appel dépassé gardée (la génération ignorée, sauf changement d'utilisateur) →
 *     « seul le dernier lancé conclut », seul — et seulement depuis que le premier appel d'A y échoue :
 *     réussi, il concluait comme le troisième, et la mutation passait ;
 *   - la mémoire gardée quand la session devient nulle (l'état d'avant la contre-lecture du même jour)
 *     → « réinscrit le même utilisateur après une déconnexion… », seul.
 */
describe('gardeDuJeton', () => {
  /** Un enregistrement doublé, dont chaque appel se règle à la main. */
  function enregistrement() {
    const reglements: ((inscrit: boolean) => void)[] = [];
    const enregistrer = jest.fn(
      () =>
        new Promise<boolean>((resoudre) => {
          reglements.push(resoudre);
        })
    );
    return { enregistrer, regler: (n: number, inscrit: boolean) => reglements[n]?.(inscrit) };
  }

  it('enregistre une fois par utilisateur, et à chaque changement d’utilisateur', async () => {
    const enregistrer = jest.fn(async () => true);
    const demander = gardeDuJeton(enregistrer);

    await demander('a', 'session');
    await demander('a', 'session');
    await demander('a', 'retour');
    await demander('b', 'session');
    await demander(null, 'session');

    expect(enregistrer).toHaveBeenCalledTimes(2);
  });

  // La déconnexion désinscrit le jeton de cet appareil : la même personne qui revient dans le même
  // lancement doit le réinscrire, et une session nulle ne lance rien.
  it('réinscrit le même utilisateur après une déconnexion, sans rien lancer pour la session nulle', async () => {
    const enregistrer = jest.fn(async () => true);
    const demander = gardeDuJeton(enregistrer);

    await demander('a', 'session');
    await demander(null, 'session');
    expect(enregistrer).toHaveBeenCalledTimes(1);

    await demander('a', 'session');
    expect(enregistrer).toHaveBeenCalledTimes(2);
  });

  it('un enregistrement qui n’a rien inscrit se retente au retour au premier plan, et pas à chaque émission de session', async () => {
    const enregistrer = jest.fn(async () => false);
    const demander = gardeDuJeton(enregistrer);

    await demander('a', 'session');
    // Le rafraîchissement du jeton, une fois l'heure : pas une raison de retenter.
    await demander('a', 'session');
    expect(enregistrer).toHaveBeenCalledTimes(1);

    await demander('a', 'retour');
    expect(enregistrer).toHaveBeenCalledTimes(2);

    // Inscrit au retour : le retour suivant ne relance plus rien.
    enregistrer.mockResolvedValue(true);
    await demander('a', 'retour');
    await demander('a', 'retour');
    expect(enregistrer).toHaveBeenCalledTimes(3);
  });

  it('une exception compte comme un échec, et se retente de même', async () => {
    const enregistrer = jest.fn(async (): Promise<boolean> => {
      throw new Error('réseau');
    });
    const demander = gardeDuJeton(enregistrer);

    await expect(demander('a', 'session')).resolves.toBeUndefined();
    await demander('a', 'retour');
    expect(enregistrer).toHaveBeenCalledTimes(2);
  });

  it('un enregistrement en cours ne se double pas', async () => {
    const { enregistrer, regler } = enregistrement();
    const demander = gardeDuJeton(enregistrer);

    const premier = demander('a', 'session');
    const second = demander('a', 'retour');
    regler(0, false);
    await Promise.all([premier, second]);

    expect(enregistrer).toHaveBeenCalledTimes(1);
  });

  it('seul le dernier lancé conclut : A, puis B, puis A de nouveau', async () => {
    const { enregistrer, regler } = enregistrement();
    const demander = gardeDuJeton(enregistrer);

    const pourA = demander('a', 'session');
    const pourB = demander('b', 'session');
    const pourAEncore = demander('a', 'session');
    // Le premier enregistrement d'A finit en dernier, sur un échec : il ne doit pas conclure pour le
    // troisième, encore en vol — un retour pendant ce vol n'en lance pas un quatrième.
    regler(1, true);
    regler(0, false);
    await Promise.all([pourA, pourB]);
    await demander('a', 'retour');
    expect(enregistrer).toHaveBeenCalledTimes(3);

    // Le troisième échoue : c'est lui qui conclut, et le retour suivant retente — un quatrième appel,
    // qu'on ne règle pas.
    regler(2, false);
    await pourAEncore;
    void demander('a', 'retour');
    expect(enregistrer).toHaveBeenCalledTimes(4);
  });
});
