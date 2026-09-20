import {
  adresseDejaRattachee,
  adresseSemblePlausible,
  estLimiteDEnvoi,
  estPanneDeTransport,
  codeDuRetourDeLien,
  estVerifieurManquant,
  etatDeLaProposition,
  identiteDejaRattachee,
  issueDuNavigateurDAuth,
  lireRetourDeLien,
  messageDuRetourDeLien,
  motifRetourLien,
  MOTIFS_RETOUR_LIEN,
} from './connexion';

describe('estLimiteDEnvoi', () => {
  it('reconnaît la limite à son code, pas à son message', () => {
    // Le message réel de Supabase ne contient pas le mot « rate » : une détection par
    // message ne voyait rien (cf. commentaire du module).
    expect(
      estLimiteDEnvoi({
        code: 'over_email_send_rate_limit',
        status: 429,
        message: 'For security purposes, you can only request this after 52 seconds.',
      })
    ).toBe(true);
  });

  it('retombe sur le 429 si le code manque', () => {
    expect(estLimiteDEnvoi({ status: 429 })).toBe(true);
  });

  it('ne confond pas la limite avec une adresse inconnue', () => {
    // 422 `otp_disabled` : `shouldCreateUser: false` a fait son travail — ce n'est pas une
    // panne, et surtout pas un message distinct à afficher.
    expect(estLimiteDEnvoi({ code: 'otp_disabled', status: 422 })).toBe(false);
    expect(estLimiteDEnvoi(null)).toBe(false);
  });
});

describe('estPanneDeTransport', () => {
  it('reconnaît l’échec de fetch que le SDK nomme lui-même', () => {
    // Ce que `auth-js` construit quand `fetch` échoue : nom explicite, `status: 0`, pas de
    // code d'API. C'est le cas du mode avion, celui pour lequel ces écrans existent.
    expect(
      estPanneDeTransport({
        name: 'AuthRetryableFetchError',
        status: 0,
        message: 'Network request failed',
      })
    ).toBe(true);
  });

  it('reconnaît une erreur sans statut ni code', () => {
    expect(estPanneDeTransport({ message: 'Failed to fetch' })).toBe(true);
  });

  // Non-régression explicite : une adresse inconnue doit continuer de mener à l'écran
  // d'attente, sans quoi la page dirait qui utilise Ramille.
  it('ne prend jamais une adresse inconnue pour une panne', () => {
    expect(estPanneDeTransport({ code: 'otp_disabled', status: 422 })).toBe(false);
    // Même code sans statut : le code seul suffit à disqualifier, puisqu'il prouve que le
    // serveur a répondu.
    expect(estPanneDeTransport({ code: 'otp_disabled' })).toBe(false);
  });

  it('range le 5xx du côté de la panne, dans la forme que le SDK produit vraiment', () => {
    // **La forme compte, et c'est ce qui a rendu une première version de ce test creuse** :
    // elle fabriquait `{ status: 500 }` *sans* `name` et concluait `false`, alors que
    // `auth-js` ne renvoie jamais un 500 sous cette forme. `lib/fetch.js` porte
    // `NETWORK_ERROR_CODES = [500, 501, 502, 503, 504, 520…530]` et lève pour chacun un
    // `AuthRetryableFetchError`, code du corps jeté au passage — un 500 valait donc `true`
    // pendant que le commentaire du module affirmait le contraire.
    expect(
      estPanneDeTransport({
        name: 'AuthRetryableFetchError',
        status: 500,
        message: 'Internal Server Error',
      })
    ).toBe(true);
    // Et le statut suffit sans le nom : la règle de la contre-vérification d'A6-12
    // (« retryable du SDK ou status >= 500 ») ne dépend pas d'un détail interne d'auth-js.
    expect(estPanneDeTransport({ status: 503, message: 'Service Unavailable' })).toBe(true);
  });

  it('ne prend pas un 4xx pour une panne', () => {
    // La frontière du 5xx : un refus métier a répondu, il suit le chemin de l'écran d'attente.
    expect(estPanneDeTransport({ status: 400, message: 'Bad Request' })).toBe(false);
    expect(estPanneDeTransport({ status: 422 })).toBe(false);
  });

  it('ne recouvre pas la limite d’envoi, qui a son propre message', () => {
    expect(estPanneDeTransport({ code: 'over_email_send_rate_limit', status: 429 })).toBe(false);
    expect(estPanneDeTransport({ status: 429 })).toBe(false);
  });

  it('sans erreur, il n’y a pas de panne', () => {
    expect(estPanneDeTransport(null)).toBe(false);
  });
});

describe('adresseDejaRattachee', () => {
  it('ne réagit qu’au code email_exists', () => {
    expect(adresseDejaRattachee({ code: 'email_exists', status: 422 })).toBe(true);
    expect(adresseDejaRattachee({ code: 'otp_disabled', status: 422 })).toBe(false);
    expect(adresseDejaRattachee(null)).toBe(false);
  });
});

describe('identiteDejaRattachee', () => {
  // Code vérifié contre la liste officielle de l'API Auth le 07/09/2026 :
  // « The identity to which the API relates is already linked to a user. »
  it('ne réagit qu’au code identity_already_exists', () => {
    expect(identiteDejaRattachee({ code: 'identity_already_exists', status: 422 })).toBe(true);
    expect(identiteDejaRattachee(null)).toBe(false);
  });

  // Deux voisins qu'il serait tentant de confondre : `identity_not_found` est l'inverse
  // exact, et `email_exists` appartient au chemin email, qui a déjà son aiguillage.
  it('ne confond pas avec les codes voisins', () => {
    expect(identiteDejaRattachee({ code: 'identity_not_found' })).toBe(false);
    expect(identiteDejaRattachee({ code: 'email_exists' })).toBe(false);
    expect(identiteDejaRattachee({ code: 'manual_linking_disabled' })).toBe(false);
  });

  // La détection par message est ce qui a déjà échoué en silence pour la limite d'envoi.
  it('ignore le message, même s’il décrit exactement le cas', () => {
    expect(
      identiteDejaRattachee({ message: 'The identity is already linked to a user.' })
    ).toBe(false);
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

describe('issueDuNavigateurDAuth', () => {
  // Le défaut d'origine : tout ce qui n'était pas une erreur valait réussite, donc une fenêtre
  // refermée à la main émettait `connexion_success` et consommait la proposition de compte.
  it('sépare les trois issues', () => {
    expect(issueDuNavigateurDAuth({ type: 'success', url: 'ramille://#access_token=a' })).toBe(
      'jetons'
    );
    expect(issueDuNavigateurDAuth({ type: 'cancel' })).toBe('annulation');
    expect(issueDuNavigateurDAuth({ type: 'dismiss' })).toBe('annulation');
  });

  it('ne prend pas une panne pour une annulation', () => {
    // `locked` (une autre session d'auth est déjà ouverte) et `opened` ne sont le geste de
    // personne : l'écran doit le dire, pas se taire comme sur un abandon.
    expect(issueDuNavigateurDAuth({ type: 'locked' })).toBe('echec');
    expect(issueDuNavigateurDAuth({ type: 'opened' })).toBe('echec');
  });

  it('refuse une réussite sans URL', () => {
    // Les jetons sortent de l'URL de retour : sans elle, il n'y a rien à ouvrir.
    expect(issueDuNavigateurDAuth({ type: 'success' })).toBe('echec');
    expect(issueDuNavigateurDAuth({ type: 'success', url: null })).toBe('echec');
  });
});

describe('lireRetourDeLien', () => {
  it('reconnaît les jetons dans le fragment', () => {
    expect(
      lireRetourDeLien('ramille://#access_token=ey.JJ&refresh_token=abc&token_type=bearer')
    ).toBe('jetons');
  });

  // Le cas qui ne produisait rien du tout : le layout racine ne cherchait que `access_token=`,
  // et Supabase renvoie l'expiration sous une forme qui ne le contient jamais.
  it('reconnaît le lien expiré tel que Supabase le renvoie', () => {
    expect(
      lireRetourDeLien(
        'ramille://#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
      )
    ).toBe('erreur');
  });

  it('lit l’échec dans la requête comme dans le fragment', () => {
    expect(lireRetourDeLien('https://www.ramille.fr/?error_code=403')).toBe('erreur');
    expect(lireRetourDeLien('https://www.ramille.fr/#error=server_error')).toBe('erreur');
    expect(lireRetourDeLien('ramille://?foo=1#error_description=Something%20went%20wrong')).toBe(
      'erreur'
    );
  });

  it('fait passer l’échec avant les jetons', () => {
    expect(lireRetourDeLien('ramille://#access_token=ey.JJ&error_code=otp_expired')).toBe('erreur');
  });

  it('ne voit rien dans une URL d’ouverture ordinaire', () => {
    for (const url of [
      'ramille://',
      'ramille:///plan',
      'https://www.ramille.fr/plan',
      'https://www.ramille.fr/suivi/bilan?id=42',
      // `error` dans le chemin n'est pas un paramètre : sans ce test, un écran d'erreur
      // hypothétique ferait ouvrir « retrouver mon compte ».
      'ramille://error',
    ]) {
      expect({ url, retour: lireRetourDeLien(url) }).toEqual({ url, retour: 'aucun' });
    }
  });

  it('ignore une clé vide', () => {
    // `access_token=` sans valeur n'ouvre aucune session : inutile d'envoyer `setSession` s'y
    // casser les dents.
    expect(lireRetourDeLien('ramille://#access_token=&refresh_token=')).toBe('aucun');
  });

  // ── Depuis le passage en PKCE (20/09/2026) ────────────────────────────────────────────

  it('reconnaît le `code` — la forme du produit depuis PKCE', () => {
    expect(lireRetourDeLien('ramille://?code=abc123')).toBe('code');
    expect(lireRetourDeLien('https://www.ramille.fr/?code=abc123&sb_flow_id=xyz')).toBe('code');
  });

  /**
   * **La forme `jetons` reste lue, et c'est tout l'intérêt de la distinction.**
   *
   * Un attaquant qui veut poser sa propre session dans l'app de quelqu'un n'a que ses jetons à
   * lui : il ne peut pas fabriquer un `code` échangeable, l'échange exigeant le vérifieur resté
   * sur l'appareil qui a demandé le lien. Rendre `'aucun'` sur un fragment de jetons ferait
   * ignorer la tentative en silence ; la nommer permet de la refuser avec une phrase vraie.
   */
  it('nomme encore les jetons, pour pouvoir les refuser', () => {
    expect(lireRetourDeLien('ramille://x#access_token=ey.JJ&refresh_token=abc')).toBe('jetons');
  });

  it('fait passer le `code` avant les jetons, et l’échec avant les deux', () => {
    // Une URL qui porterait les deux est déjà anormale ; ce qui compte est que l'ordre soit
    // décidé ici et pas par le hasard de l'écriture.
    expect(lireRetourDeLien('ramille://?code=abc#access_token=ey.JJ')).toBe('code');
    expect(lireRetourDeLien('ramille://?code=abc&error_code=otp_expired')).toBe('erreur');
  });

  it('ignore un `code` vide', () => {
    expect(lireRetourDeLien('ramille://?code=')).toBe('aucun');
  });
});

describe('codeDuRetourDeLien', () => {
  it('rend le code, décodé, depuis la requête comme depuis le fragment', () => {
    expect(codeDuRetourDeLien('ramille://?code=abc123')).toBe('abc123');
    expect(codeDuRetourDeLien('https://www.ramille.fr/#code=a%2Bb')).toBe('a+b');
  });

  it('rend `null` quand il n’y en a pas, ou qu’il est vide', () => {
    expect(codeDuRetourDeLien('ramille://?code=')).toBeNull();
    expect(codeDuRetourDeLien('https://www.ramille.fr/plan')).toBeNull();
    expect(codeDuRetourDeLien('ramille://#access_token=ey.JJ')).toBeNull();
  });
});

describe('estVerifieurManquant', () => {
  /**
   * **Reconnu au code, jamais au message** — la règle du dépôt, et ici elle n'est pas théorique :
   * le texte d'`auth-js` fait quatre lignes, il est en anglais et il parle de Next.js et de
   * `@supabase/ssr`. Le reformuler d'une version à l'autre ne coûterait rien à personne, sauf à
   * nous.
   *
   * Ce que ça décide : le seul échec **attendu** du flux PKCE — un lien valable ouvert dans un
   * autre navigateur — et donc le seul qui doive dire « rouvre-le là où tu l'as demandé » plutôt
   * que « vérifie ta connexion », qui ferait redemander un lien à l'infini.
   */
  it('reconnaît le vérifieur manquant à son code comme à son nom de classe', () => {
    expect(estVerifieurManquant({ code: 'pkce_code_verifier_not_found' })).toBe(true);
    expect(estVerifieurManquant({ name: 'AuthPKCECodeVerifierMissingError' })).toBe(true);
  });

  it('ne confond pas un échange refusé avec un vérifieur absent', () => {
    // `AuthPKCEGrantCodeExchangeError` est l'autre erreur PKCE d'`auth-js` : elle dit « cette URL
    // n'est pas un retour PKCE valable », ce qui est une vraie panne et pas un lien mal ouvert.
    expect(estVerifieurManquant({ name: 'AuthPKCEGrantCodeExchangeError' })).toBe(false);
    expect(estVerifieurManquant({ code: 'otp_expired' })).toBe(false);
    expect(estVerifieurManquant(new Error('pkce_code_verifier_not_found'))).toBe(false);
    expect(estVerifieurManquant(null)).toBe(false);
    expect(estVerifieurManquant(undefined)).toBe(false);
    expect(estVerifieurManquant('pkce_code_verifier_not_found')).toBe(false);
  });
});

describe('motifRetourLien', () => {
  it('n’accepte que les motifs déclarés', () => {
    expect(motifRetourLien('lien_expire')).toBe('lien_expire');
    expect(motifRetourLien('session_non_ouverte')).toBe('session_non_ouverte');
    expect(motifRetourLien('lien_ouvert_ailleurs')).toBe('lien_ouvert_ailleurs');
    expect(motifRetourLien('autre_chose')).toBeNull();
    expect(motifRetourLien(undefined)).toBeNull();
  });

  // Non-divulgation : un message d'échec ne doit pas plus dire qui a un compte que l'écran
  // d'attente. Aucun des deux textes ne parle de l'existence d'un compte.
  //
  // **La promesse d'envoi relève de la même règle**, et elle manquait : « Demande-en un
  // nouveau, il part tout de suite » affirmait un envoi que l'écran suivant refuse justement
  // de confirmer (« *si* un compte existe avec cette adresse… »). Chercher le mot « compte »
  // ne suffisait pas à l'attraper.
  it('dit quoi faire sans rien dire du compte ni promettre un envoi', () => {
    for (const motif of MOTIFS_RETOUR_LIEN) {
      const message = messageDuRetourDeLien(motif);
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toMatch(/compte/i);
      expect(message).not.toMatch(/envoy|part /i);
    }
  });

  /**
   * **Les trois motifs disent trois gestes différents, et c'est leur seule raison d'exister.**
   *
   * `lien_ouvert_ailleurs` est arrivé avec PKCE, et il décrit le seul des trois où **le lien est
   * encore valable** : le geste utile est de le rouvrir au bon endroit, pas d'en redemander un.
   * Le confondre avec `lien_expire` enverrait quelqu'un en redemander indéfiniment, chacun
   * échouant pour la même raison, sans que rien ne le dise.
   *
   * Le test porte sur la **distinction** et pas sur les mots, pour qu'une reformulation le laisse
   * vert : trois motifs, trois messages deux à deux différents.
   */
  it('ne donne jamais le même message à deux motifs', () => {
    const messages = MOTIFS_RETOUR_LIEN.map(messageDuRetourDeLien);
    expect(new Set(messages).size).toBe(MOTIFS_RETOUR_LIEN.length);
  });

  /**
   * **Trois messages distincts ne suffisent pas : encore faut-il qu'ils soient à la bonne
   * place.** Le 20/09/2026, une restauration de mutation a remplacé la mauvaise occurrence d'une
   * chaîne et **interverti** `lien_expire` et `lien_ouvert_ailleurs`. L'assertion de distinction
   * ci-dessus est restée verte — les deux messages étaient toujours différents —, le typecheck
   * aussi, le linter aussi. C'est `scripts/verifier-lien-de-connexion.mjs` qui l'a vu, en
   * ouvrant vraiment un lien dans un second navigateur et en lisant l'écran.
   *
   * Ce que ça coûtait : quelqu'un dont le lien est parfaitement valable lisait « il a expiré, ou
   * il a déjà servi », en redemandait un, et retombait sur le même mur — indéfiniment, sans que
   * rien ne lui dise que le problème est *l'endroit* où il l'ouvre.
   *
   * L'assertion porte sur **ce que chaque message affirme** et pas sur sa formulation : celui du
   * lien expiré dit que le lien ne vaut plus, celui du lien ouvert ailleurs ne le dit surtout
   * pas — c'est toute la différence entre les deux, et une reformulation qui la perdrait serait
   * un vrai changement de sens.
   */
  it('n’annonce un lien mort que pour le motif où il l’est', () => {
    const mort = /expir|d[ée]j[àa] servi|ne marche plus/i;
    expect(messageDuRetourDeLien('lien_expire')).toMatch(mort);
    expect(messageDuRetourDeLien('lien_ouvert_ailleurs')).not.toMatch(mort);
    // Et celui-ci décrit une panne de notre côté, pas un lien fautif.
    expect(messageDuRetourDeLien('session_non_ouverte')).not.toMatch(mort);
  });
});

describe('etatDeLaProposition', () => {
  it('attend au lieu de sauter quand la session n’est pas lisible', () => {
    // Le défaut d'origine penchait du mauvais côté : le booléen optimiste routait droit au plan
    // et la personne ne voyait ni l'interstitiel ni la bannière.
    expect(etatDeLaProposition({ estAnonyme: null, dejaProposee: false })).toBe('inconnu');
    expect(etatDeLaProposition({ estAnonyme: null, dejaProposee: true })).toBe('inconnu');
  });

  it('distingue la première proposition de la relance discrète', () => {
    expect(etatDeLaProposition({ estAnonyme: true, dejaProposee: false })).toBe(
      'anonyme-jamais-proposee'
    );
    expect(etatDeLaProposition({ estAnonyme: true, dejaProposee: true })).toBe(
      'anonyme-deja-proposee'
    );
  });

  it('ne propose rien à qui a déjà un compte', () => {
    expect(etatDeLaProposition({ estAnonyme: false, dejaProposee: false })).toBe('autre');
    expect(etatDeLaProposition({ estAnonyme: false, dejaProposee: true })).toBe('autre');
  });
});
