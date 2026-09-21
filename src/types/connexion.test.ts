/**
 * Les gardes de ce fichier sont éprouvées en les cassant, et le compte des mutations est daté
 * (`TESTING.md` §1.1). Quatre mutations jouées le 20/09/2026, sur le chantier du code à usage
 * unique, avec le relevé de ce qui est tombé :
 *
 * | Mutation | Ce qui tombe |
 * | --- | --- |
 * | `etatDeLaBanniere` oublie `adresseAConfirmer` | « se tait dès que le geste est commencé ou fini » ET « n'a qu'une seule entrée qui parle » |
 * | `corpsDeLaSaisie` affirme l'envoi dans les deux contextes | « n'affirme qu'un code est parti que là où c'est vrai » |
 * | `suiteDeLaDemandeDeCode` rend `message` pour tout échec | « mène à l'écran de code pour une adresse sans compte » ET « ne bascule jamais depuis le flux de connexion » |
 * | la branche de transport d'`issueDeLaVerification` est retirée | « reconnaît la panne de transport plutôt qu'un échec anonyme » |
 *
 * **Une cinquième mutation n'a rien fait tomber, et c'est elle qui a appris quelque chose** :
 * intervertir l'ordre des tests d'`issueDeLaVerification` laisse la suite entièrement verte. Le
 * commentaire du module affirmait pourtant que l'ordre était porteur. Il avait tort — `auth-js` ne
 * nomme `AuthRetryableFetchError` que sur les 5xx, donc un 403 n'est jamais une panne de transport
 * et les deux branches ne se disputent aucune erreur réelle. Le commentaire a été corrigé plutôt
 * que le test rendu capable de tomber sur une entrée que le SDK ne produit jamais : c'est
 * exactement le piège déjà consigné pour le 500 sans `name`.
 *
 * **Trois mutations de plus le 21/09/2026**, sur l'arbitrage de la troisième voie (`v1-28` §7.1) :
 *
 * | Mutation | Ce qui tombe |
 * | --- | --- |
 * | `messageDeLaDemande` nomme l'adresse prise (« Cette adresse a déjà un compte. ») | « coupe l'annonce d'un code qui n'est pas parti, sans rien dire de l'adresse » |
 * | `corpsDeLaSaisie` reçoit un quatrième paramètre `flux` | « ne laisse pas le flux entrer dans les phrases de l'écran de code » |
 * | le même paramètre, mais **à valeur par défaut** | **rien** — `Function.length` ne le compte pas |
 *
 * La troisième est le relevé qui compte : elle dit la forme exacte que la garde d'arité ne voit
 * pas, et c'est pour ça qu'elle est écrite ici plutôt que tue. Ce qui la rattrape est l'assertion 6
 * de `scripts/verifier-code-de-connexion.mjs`, qui lit le texte rendu et non la signature.
 */

import {
  adresseDejaRattachee,
  adresseSemblePlausible,
  estLimiteDEnvoi,
  estPanneDeTransport,
  codeDuRetourDeLien,
  estVerifieurManquant,
  etatDeLaBanniere,
  identiteDejaRattachee,
  issueDuNavigateurDAuth,
  lireRetourDeLien,
  messageDuRetourDeLien,
  motifRetourLien,
  MOTIFS_RETOUR_LIEN,
  chiffresDuCode,
  codeSemblePlausible,
  consequenceDeLaSaisie,
  corpsDeLaSaisie,
  issueDeLaVerification,
  LONGUEUR_DU_CODE,
  messageDeLaDemande,
  messageDeLaVerification,
  messageDuRenvoi,
  MESSAGE_DE_LA_SUITE_MANQUEE,
  suiteDeLaDemandeDeCode,
  suiteDuRenvoi,
  type IssueDeLaVerification,
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

describe('etatDeLaBanniere', () => {
  it('ne dit rien tant que la session n’est pas lisible', () => {
    // Le défaut sûr est d'attendre (A3-20). Ici, se tromper ferait affirmer « ce bilan ne vit
    // que sur cet appareil » à quelqu'un qui a un compte — une phrase fausse.
    expect(etatDeLaBanniere({ estAnonyme: null, adresseAConfirmer: false })).toBe('inconnu');
    expect(etatDeLaBanniere({ estAnonyme: null, adresseAConfirmer: true })).toBe('inconnu');
  });

  it('se rend pour une session anonyme sans adresse en attente', () => {
    expect(etatDeLaBanniere({ estAnonyme: true, adresseAConfirmer: false })).toBe('anonyme');
  });

  it('se tait dès que le geste est commencé ou fini', () => {
    expect(etatDeLaBanniere({ estAnonyme: true, adresseAConfirmer: true })).toBe('autre');
    expect(etatDeLaBanniere({ estAnonyme: false, adresseAConfirmer: false })).toBe('autre');
    expect(etatDeLaBanniere({ estAnonyme: false, adresseAConfirmer: true })).toBe('autre');
  });

  /**
   * La garde qui tient la promesse du chantier : **une seule entrée rend la bannière**, et les
   * trois autres se taisent. Une condition qui s'élargirait — en oubliant `adresseAConfirmer`,
   * par exemple — repasserait la proposition à quelqu'un qui vient de taper son adresse.
   */
  it('n’a qu’une seule entrée qui parle', () => {
    const entrees = [false, true].flatMap((estAnonyme) =>
      [false, true].map((adresseAConfirmer) => ({ estAnonyme, adresseAConfirmer }))
    );
    const parlantes = entrees.filter((e) => etatDeLaBanniere(e) === 'anonyme');
    expect(parlantes).toEqual([{ estAnonyme: true, adresseAConfirmer: false }]);
  });
});

describe('chiffresDuCode', () => {
  it('garde les chiffres et retire ce qu’une messagerie colle autour', () => {
    // Refuser un collé qui contient le bon code ferait chercher une faute qui n'existe pas.
    expect(chiffresDuCode(' 847 924 69 ')).toBe('84792469');
    expect(chiffresDuCode('code : 84792469')).toBe('84792469');
  });

  it('tronque à la longueur attendue, et garde les chiffres utiles d’un collé trop long', () => {
    expect(chiffresDuCode('8479246912345')).toBe('84792469');
    expect(chiffresDuCode('84792469')).toHaveLength(LONGUEUR_DU_CODE);
  });

  it('n’est plausible qu’à la longueur exacte', () => {
    expect(codeSemblePlausible('8479246')).toBe(false);
    expect(codeSemblePlausible('84792469')).toBe(true);
    // Un collé plus long est tronqué, donc plausible : c'est voulu, les chiffres sont là.
    expect(codeSemblePlausible('84792469 merci')).toBe(true);
  });
});

describe('suiteDeLaDemandeDeCode', () => {
  it('mène à l’écran de code quand l’envoi est accepté', () => {
    expect(suiteDeLaDemandeDeCode('rattachement', null)).toBe('code');
    expect(suiteDeLaDemandeDeCode('connexion', null)).toBe('code');
  });

  /**
   * **La règle de non-divulgation, et elle est la raison d'être de cette dérivation.** Une
   * adresse sans compte rend `422 otp_disabled` (mesuré le 20/09/2026) : elle doit mener au
   * MÊME écran qu'un envoi accepté, sinon l'écran dit qui utilise Ramille.
   */
  it('mène à l’écran de code pour une adresse sans compte, exactement comme pour un envoi réussi', () => {
    const inconnue = { code: 'otp_disabled', status: 422, message: 'Signups not allowed for otp' };
    expect(suiteDeLaDemandeDeCode('connexion', inconnue)).toBe('code');
    expect(suiteDeLaDemandeDeCode('connexion', inconnue)).toBe(
      suiteDeLaDemandeDeCode('connexion', null)
    );
  });

  it('bascule vers la reconnexion quand l’adresse a déjà un compte', () => {
    expect(suiteDeLaDemandeDeCode('rattachement', { code: 'email_exists', status: 422 })).toBe(
      'bascule'
    );
  });

  /**
   * `signInWithOtp` ne rattache rien, donc `email_exists` ne peut pas en sortir. Si la bascule
   * était rendue ici, l'écran de connexion se renverrait à lui-même — une boucle.
   */
  it('ne bascule jamais depuis le flux de connexion', () => {
    expect(suiteDeLaDemandeDeCode('connexion', { code: 'email_exists', status: 422 })).toBe('code');
  });

  it('ne dit que les deux échecs qui ne parlent pas de l’adresse', () => {
    expect(suiteDeLaDemandeDeCode('rattachement', { code: 'over_email_send_rate_limit' })).toBe(
      'message'
    );
    expect(suiteDeLaDemandeDeCode('connexion', { name: 'AuthRetryableFetchError', status: 0 })).toBe(
      'message'
    );
  });
});

describe('issueDeLaVerification', () => {
  it('ouvre la session quand il n’y a pas d’erreur', () => {
    expect(issueDeLaVerification(null)).toBe('ouverte');
  });

  /**
   * **Le code faux et le code expiré rendent tous deux `403 otp_expired`** — mesuré contre
   * l'API le 20/09/2026, message « Token has expired or is invalid ». Les distinguer serait
   * inventer une information qu'on n'a pas.
   */
  it('range le code faux et le code expiré au même endroit', () => {
    const otp = { code: 'otp_expired', status: 403, message: 'Token has expired or is invalid' };
    expect(issueDeLaVerification(otp)).toBe('refuse');
    expect(issueDeLaVerification({ status: 403 })).toBe('refuse');
  });

  /**
   * **Ce qui est éprouvé ici est l'existence de la branche, pas l'ordre des tests.** Muter
   * l'ordre ne fait tomber aucune assertion, et c'est juste : `auth-js` ne nomme
   * `AuthRetryableFetchError` que sur les 5xx, donc un 403 n'est jamais une panne de transport
   * et les deux branches ne se disputent aucune erreur réelle. Retirer la branche, en revanche,
   * fait lire une panne de serveur comme un échec anonyme — la personne recopie alors
   * indéfiniment un code qui est bon.
   */
  it('reconnaît la panne de transport plutôt qu’un échec anonyme', () => {
    expect(issueDeLaVerification({ name: 'AuthRetryableFetchError', status: 503 })).toBe(
      'transport'
    );
    expect(issueDeLaVerification({ name: 'AuthRetryableFetchError', status: 0 })).toBe('transport');
  });

  it('nomme le plafond de vérification, qui est le seul cas où réessayer ne sert à rien', () => {
    expect(issueDeLaVerification({ code: 'over_request_rate_limit', status: 429 })).toBe(
      'trop_dessais'
    );
  });

  it('garde un dernier renvoi pour ce qu’on ne sait pas nommer', () => {
    expect(issueDeLaVerification({ code: 'validation_failed', status: 400 })).toBe('echec');
  });

  it('ne donne un message qu’aux issues qui en ont besoin', () => {
    expect(messageDeLaVerification('ouverte')).toBeNull();
    for (const issue of ['refuse', 'trop_dessais', 'transport', 'echec'] as const) {
      expect(messageDeLaVerification(issue)).toBeTruthy();
    }
  });

  /**
   * Le message d'un code refusé doit donner le geste utile — en redemander un — et celui d'un
   * plafond doit dire d'attendre. Les intervertir enverrait la personne redemander un code que
   * le plafond refusera, ou attendre alors qu'un nouveau code marcherait.
   */
  it('ne dit « demande-en un nouveau » que là où c’est le bon geste', () => {
    expect(messageDeLaVerification('refuse')).toMatch(/nouveau/i);
    expect(messageDeLaVerification('trop_dessais')).not.toMatch(/nouveau/i);
    expect(messageDeLaVerification('trop_dessais')).toMatch(/r[ée]essaie/i);
  });
});

describe('suiteDuRenvoi', () => {
  it('annonce un renvoi quand l’envoi est accepté', () => {
    expect(suiteDuRenvoi('rattachement', null)).toBe('renvoye');
    expect(suiteDuRenvoi('connexion', null)).toBe('renvoye');
  });

  /**
   * **L'oracle que cette dérivation ferme.** Le renvoi passait son erreur brute à
   * `messageDeLaDemande` : un `otp_disabled` — adresse sans compte — n'étant ni une limite d'envoi
   * ni une panne, il retombait sur « L'envoi n'a pas abouti », là où une adresse connue lisait
   * « un nouveau code vient d'y partir ». Deux réponses = on sait qui utilise Ramille, et sur la
   * page de suppression que Google Play exige publique. Relevé en revue le 21/09/2026.
   */
  it('ne distingue pas une adresse sans compte d’un renvoi réussi', () => {
    const inconnue = { code: 'otp_disabled', status: 422, message: 'Signups not allowed for otp' };
    expect(suiteDuRenvoi('connexion', inconnue)).toBe('renvoye');
    expect(suiteDuRenvoi('connexion', inconnue)).toBe(suiteDuRenvoi('connexion', null));
  });

  it('dit les deux échecs qui ne parlent pas de l’adresse', () => {
    expect(suiteDuRenvoi('connexion', { code: 'over_email_send_rate_limit' })).toBe('message');
    expect(suiteDuRenvoi('connexion', { name: 'AuthRetryableFetchError', status: 0 })).toBe('message');
  });

  /**
   * L'adresse prise ne peut arriver qu'en rattachement — `signInWithOtp` ne rattache rien —, et
   * depuis l'arbitrage du 21/09/2026 elle n'y arrive plus que par une **course** : le premier envoi
   * détourne une adresse prise vers le flux de connexion, donc il faut qu'elle ait été libre au
   * premier envoi et prise au second. Ce que `message` achète est l'absence de cul-de-sac — un code
   * annoncé quand `updateUser` vient de refuser ferait attendre pour rien —, et il ne divulgue rien
   * parce que le texte qui suit (`messageDeLaDemande`) ne nomme pas l'état de l'adresse. Ce
   * commentaire a dit jusqu'au 21/09/2026 « le produit le dit déjà au premier envoi » : il ne le dit
   * plus nulle part, et garder cette phrase aurait invité à faire nommer l'adresse par le message.
   */
  it('coupe l’annonce d’un code qui n’est pas parti, sans rien dire de l’adresse', () => {
    const prise = { code: 'email_exists', status: 422 };
    expect(suiteDuRenvoi('rattachement', prise)).toBe('message');
    expect(suiteDuRenvoi('connexion', prise)).toBe('renvoye');
    // Et la seconde moitié de la promesse : le texte que ce `message` fait afficher est le
    // générique, mot pour mot celui d'une erreur qui ne parle pas de l'adresse. Sans cette
    // assertion, le commentaire ci-dessus décrirait une propriété que rien ne tient.
    expect(messageDeLaDemande(prise)).toBe(messageDeLaDemande({ code: 'validation_failed' }));
    expect(messageDeLaDemande(prise)).not.toMatch(/compte|adresse déjà|existe/i);
  });

  /**
   * La garde qui tient la promesse : **le seul message que le flux de connexion peut produire est
   * un message qui ne parle pas de l'adresse.** Une entrée de plus qui produirait `message` là
   * rouvrirait l'oracle, quel qu'en soit le texte.
   */
  it('ne laisse le flux de connexion parler que des deux échecs neutres', () => {
    const entrees = [
      null,
      { code: 'otp_disabled', status: 422 },
      { code: 'email_exists', status: 422 },
      { code: 'validation_failed', status: 400 },
      { status: 403 },
      { code: 'over_email_send_rate_limit' },
      { name: 'AuthRetryableFetchError', status: 503 },
    ];
    const parlants = entrees.filter((e) => suiteDuRenvoi('connexion', e) === 'message');
    expect(parlants).toEqual([
      { code: 'over_email_send_rate_limit' },
      { name: 'AuthRetryableFetchError', status: 503 },
    ]);
  });
});

describe('MESSAGE_DE_LA_SUITE_MANQUEE', () => {
  /**
   * **Le code a marché, donc aucune phrase de `messageDeLaVerification` ne convient.** Le rejet de
   * `onOuverte` retombait sur `'echec'` (« La vérification n'a pas abouti »), ce qui est faux : la
   * vérification a abouti, le code est consommé, et réessayer ne peut plus rendre qu'un refus.
   *
   * La garde est écrite sur l'**invariant** et non sur le texte : elle tombe si quelqu'un
   * « simplifie » en réempruntant l'une des cinq issues, quel que soit le mot choisi — ce qui est
   * exactement la mutation dont ce message sort.
   */
  it('n’emprunte aucune phrase de la vérification', () => {
    const issues: IssueDeLaVerification[] = ['ouverte', 'refuse', 'trop_dessais', 'transport', 'echec'];
    for (const issue of issues) {
      expect(MESSAGE_DE_LA_SUITE_MANQUEE).not.toBe(messageDeLaVerification(issue));
    }
  });

  // Elle ne renvoie pas vers le geste qui ne peut plus marcher — retaper le code consommé.
  it('ne demande pas de retaper le code', () => {
    expect(MESSAGE_DE_LA_SUITE_MANQUEE).not.toMatch(/ne marche pas|Réessaie dans un instant\.$/);
  });
});

describe('les phrases de la demande et de la saisie', () => {
  it('ne nomme jamais l’adresse dans un message d’échec', () => {
    const adresse = 'camille@exemple.fr';
    for (const error of [
      { code: 'over_email_send_rate_limit' },
      { name: 'AuthRetryableFetchError', status: 0 },
      { code: 'email_exists', status: 422 },
    ]) {
      expect(messageDeLaDemande(error)).not.toContain(adresse);
    }
  });

  /**
   * **La différence entre les deux VOIX est la non-divulgation, et elle ne suit plus le flux.**
   * `parti` affirme qu'un code est parti, parce que c'est vrai dans les deux branches de
   * `/connexion/email` depuis l'arbitrage du 21/09/2026. `peut_etre` ne peut pas l'affirmer sans
   * dire si l'adresse a un compte — d'où le « si ». Recopier la première phrase dans la seconde
   * serait la fuite exacte que « retrouver » existe pour éviter.
   */
  it('n’affirme qu’un code est parti que là où c’est vrai', () => {
    const parti = corpsDeLaSaisie('parti', 'camille@exemple.fr', 'Ramille');
    const peutEtre = corpsDeLaSaisie('peut_etre', 'camille@exemple.fr', 'Ramille');
    expect(parti).toContain('camille@exemple.fr');
    expect(parti).not.toMatch(/^Si /);
    expect(peutEtre).toMatch(/^Si un compte Ramille existe/);
    expect(peutEtre).not.toContain('camille@exemple.fr');
  });

  it('dit la longueur du code, et la même des deux côtés', () => {
    for (const voix of ['parti', 'peut_etre'] as const) {
      expect(corpsDeLaSaisie(voix, 'camille@exemple.fr', 'Ramille')).toContain(
        `${LONGUEUR_DU_CODE} chiffres`
      );
    }
  });

  it('garde le même « si » au renvoi', () => {
    expect(messageDuRenvoi('parti')).not.toMatch(/^Si /);
    expect(messageDuRenvoi('peut_etre')).toMatch(/^Si un compte existe/);
  });

  /**
   * **La garde de l'arbitrage du 21/09/2026 — et elle a d'abord été écrite en tautologie.**
   *
   * `/connexion/email` envoie un code dans les deux branches — rattachement si l'adresse est libre,
   * connexion si elle est prise — et les deux doivent être **indistinguables à l'écran**. Le
   * mécanisme ne suffit pas : si un seul mot suivait le flux au lieu de la voix, l'oracle qu'on
   * ferme par l'envoi se rouvrirait par le texte.
   *
   * La première version appelait les trois fonctions deux fois et comparait les deux résultats.
   * Trois fonctions pures appelées avec les mêmes arguments rendent toujours la même chose : elle
   * ne pouvait tomber sous **aucune** mutation, pas même celle que son commentaire annonçait
   * (ajouter un quatrième paramètre laisse les appels à trois arguments parfaitement égaux entre
   * eux). Relevée en contre-lisant ce chantier le 21/09/2026, même famille que les trois
   * tautologies déjà mesurées.
   *
   * Ce qui garde vraiment est l'**arité** : la voix et l'adresse entrent, le flux n'entre pas. Lui
   * rouvrir une porte change le compte de paramètres, et ce test tombe — mesuré, un quatrième
   * paramètre `flux` le fait tomber.
   *
   * **Et il lui échappe deux formes, toutes deux mesurées le 21/09/2026 plutôt que supposées** —
   * une garde déclarative ne s'annonce jamais exhaustive :
   *   - un paramètre **à valeur par défaut** (`flux: ContexteDuCode = 'rattachement'`) ne compte
   *     pas dans `Function.length`, donc la suite reste verte ;
   *   - un hôte qui passerait `voix={flux === 'connexion' ? …}` laisserait ces trois fonctions
   *     parfaitement pures et l'écran mentirait quand même.
   *
   * Les deux sont tenues par l'assertion 6 de `scripts/verifier-code-de-connexion.mjs`, qui compare
   * les deux branches **réellement rendues**, adresse masquée : c'est elle qui voit le texte, et ce
   * test-ci ne garde que la porte d'entrée.
   */
  it('ne laisse pas le flux entrer dans les phrases de l’écran de code', () => {
    // La voix et l'adresse, jamais le flux : trois paramètres, deux, un.
    expect(corpsDeLaSaisie).toHaveLength(3);
    expect(consequenceDeLaSaisie).toHaveLength(2);
    expect(messageDuRenvoi).toHaveLength(1);
    // Et les trois surfaces sont bien renseignées à la voix des deux branches, sans quoi garder
    // leur signature ne garderait rien.
    const surfaces = [
      corpsDeLaSaisie('parti', 'camille@exemple.fr', 'Ramille'),
      consequenceDeLaSaisie('parti', 'Ramille'),
      messageDuRenvoi('parti'),
    ];
    expect(surfaces.every((phrase) => phrase !== null && phrase.length > 0)).toBe(true);
  });

  /**
   * **La phrase conditionnelle est le prix de l'arbitrage, et elle doit rester conditionnelle.**
   * Écrite à l'indicatif (« cette adresse a déjà un compte »), elle redeviendrait l'oracle que
   * l'écran de collision était. Le « si » n'est donc pas du style : c'est ce qui la rend vraie sur
   * une adresse libre, donc montrable aux deux.
   */
  it('n’annonce la conséquence qu’au conditionnel, et seulement quand un code est parti', () => {
    const phrase = consequenceDeLaSaisie('parti', 'Ramille');
    expect(phrase).toMatch(/^S’il existait déjà un compte Ramille/);
    expect(phrase).toContain('ne l’y rejoindra pas');
    // Aucune affirmation sur l'adresse : ni son nom, ni un verbe au présent qui trancherait.
    expect(phrase).not.toContain('camille@exemple.fr');
    expect(phrase).not.toMatch(/a déjà un compte/);
    // En « peut_etre », un code n'est peut-être jamais parti : il n'y a pas de conséquence à dire.
    expect(consequenceDeLaSaisie('peut_etre', 'Ramille')).toBeNull();
  });
});
