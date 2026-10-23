import {
  destinationDuDemarrage,
  destinationSurLaPlateforme,
  issueDeLaSession,
  leBrouillonCompte,
  premierePageDeLOnboarding,
  LECTURE_SANS_SESSION,
  phraseDeLaVerification,
  lireLeBilan,
  prechargeLePlan,
  type LectureDuBilan,
} from '@/types/demarrage';

describe('lireLeBilan', () => {
  it('une réponse du serveur est une lecture, qu’elle trouve un bilan ou non', () => {
    expect(lireLeBilan({ aUnBilan: true, enErreur: false, status: 200 })).toEqual({
      etat: 'lue',
      bilanComplete: true,
    });
    // `maybeSingle()` sans ligne rend un 200 et aucune erreur : c'est une réponse, et elle dit non.
    expect(lireLeBilan({ aUnBilan: false, enErreur: false, status: 200 })).toEqual({
      etat: 'lue',
      bilanComplete: false,
    });
  });

  /**
   * **L'état pour lequel ce module existe.** `status: 0` est ce que rend le bloc `catch` du transport
   * de `@supabase/postgrest-js` : la requête n'a jamais reçu de réponse HTTP.
   */
  it('un statut à zéro est une coupure de transport', () => {
    expect(lireLeBilan({ aUnBilan: false, enErreur: true, status: 0 })).toEqual({ etat: 'coupure' });
  });

  /**
   * **Le garde qui interdit le critère que l'audit proposait.** A1-5 recommandait de reconnaître la
   * coupure à l'absence de `code`. Trois chemins du SDK rendent une erreur **sans `code`** tout en
   * portant un statut réel — un corps non-JSON sur une réponse 2xx, un corps d'erreur illisible, un
   * 404 au corps vide. Un critère fondé sur le `code` les classerait « pas de connexion » devant un
   * serveur qui a parfaitement répondu.
   *
   * La signature de `lireLeBilan` ne reçoit d'ailleurs pas de `code` du tout, ce qui rend ce
   * mauvais critère inexprimable — mais la raison mérite d'être épinglée, pour que personne ne
   * l'ajoute.
   */
  it('une erreur sans code mais avec un statut réel reste une erreur serveur', () => {
    // Le 200 au corps non-JSON, et le 404 au corps vide : deux des trois chemins sans `code`.
    expect(lireLeBilan({ aUnBilan: false, enErreur: true, status: 200 })).toEqual({ etat: 'erreur' });
    expect(lireLeBilan({ aUnBilan: false, enErreur: true, status: 404 })).toEqual({ etat: 'erreur' });
  });

  it('un refus du serveur est une erreur, quel que soit son statut', () => {
    // 42501 — le refus de privilège qu'`anon` reçoit sur `assessments`, et qui est précisément ce
    // qui empêche une requête sans session de rendre « zéro ligne » (`v1-15` §1).
    expect(lireLeBilan({ aUnBilan: false, enErreur: true, status: 401 })).toEqual({ etat: 'erreur' });
    expect(lireLeBilan({ aUnBilan: false, enErreur: true, status: 403 })).toEqual({ etat: 'erreur' });
    expect(lireLeBilan({ aUnBilan: false, enErreur: true, status: 500 })).toEqual({ etat: 'erreur' });
  });
});

describe('destinationDuDemarrage', () => {
  const lue = (bilanComplete: boolean): LectureDuBilan => ({ etat: 'lue', bilanComplete });
  const coupure: LectureDuBilan = { etat: 'coupure' };
  const erreur: LectureDuBilan = { etat: 'erreur' };

  it('une lecture qui trouve un bilan mène au plan', () => {
    expect(destinationDuDemarrage(lue(true), { brouillon: false, marqueDeBilan: false })).toEqual({
      vers: 'plan',
    });
    // Et le brouillon ne détourne pas : qui a un bilan complété a le plan pour maison (C3.9).
    expect(destinationDuDemarrage(lue(true), { brouillon: true, marqueDeBilan: true })).toEqual({
      vers: 'plan',
    });
  });

  it('une lecture sans bilan mène à la reprise s’il y a un brouillon, sinon à l’onboarding', () => {
    expect(destinationDuDemarrage(lue(false), { brouillon: true, marqueDeBilan: false })).toEqual({
      vers: 'reprise',
    });
    expect(destinationDuDemarrage(lue(false), { brouillon: false, marqueDeBilan: false })).toEqual({
      vers: 'onboarding',
    });
  });

  /**
   * **La propriété qui rend la marque sûre, et le seul test qui la garde.** Quand le serveur a
   * répondu, c'est lui qui décide. Une marque fausse — un appareil restauré depuis une sauvegarde,
   * `allowBackup` étant vrai par défaut sur Android — ne peut donc pas contredire la vérité : elle
   * n'est lue que là où l'on ne sait rien.
   *
   * Si cette assertion tombe un jour, c'est que quelqu'un a fait de la marque une source de vérité,
   * et elle sera fausse.
   */
  it('la marque n’est jamais lue quand le serveur a répondu', () => {
    expect(destinationDuDemarrage(lue(false), { brouillon: false, marqueDeBilan: true })).toEqual({
      vers: 'onboarding',
    });
  });

  it('un refus du serveur mène à l’écran technique, marque ou pas', () => {
    expect(destinationDuDemarrage(erreur, { brouillon: false, marqueDeBilan: true })).toEqual({
      vers: 'echec',
    });
    expect(destinationDuDemarrage(erreur, { brouillon: true, marqueDeBilan: false })).toEqual({
      vers: 'echec',
    });
  });

  /**
   * **Hors ligne, le brouillon passe devant la marque**, à l'inverse de la règle en ligne. Ce n'est
   * pas une incohérence : le questionnaire se remplit sans réseau, le plan non. Router vers le plan
   * retirerait à la personne la seule chose qu'elle pouvait faire — et c'est déjà ce que le code
   * fait aujourd'hui, donc l'inverser serait une régression.
   */
  it('une coupure avec un brouillon mène à la reprise, même avec la marque', () => {
    expect(destinationDuDemarrage(coupure, { brouillon: true, marqueDeBilan: true })).toEqual({
      vers: 'reprise',
    });
    expect(destinationDuDemarrage(coupure, { brouillon: true, marqueDeBilan: false })).toEqual({
      vers: 'reprise',
    });
  });

  /**
   * **Le défaut que ce chantier ferme.** Sans marque, cette branche levait et l'app entière
   * s'arrêtait sur un écran technique en anglais — pour toute personne ayant déjà soumis un bilan,
   * puisque son brouillon a été effacé à la soumission.
   */
  it('une coupure sans brouillon mène au plan si la marque est là', () => {
    expect(destinationDuDemarrage(coupure, { brouillon: false, marqueDeBilan: true })).toEqual({
      vers: 'plan',
    });
  });

  /**
   * Et sans marque, l'onboarding — jamais l'écran d'échec. Il n'affirme rien sur les données de la
   * personne, il marche hors ligne de bout en bout, il mène au questionnaire, et il porte « J'ai
   * déjà un compte » : le recours du seul cas où l'absence de marque trompe.
   */
  it('une coupure sans brouillon ni marque mène à l’onboarding', () => {
    expect(destinationDuDemarrage(coupure, { brouillon: false, marqueDeBilan: false })).toEqual({
      vers: 'onboarding',
    });
  });
});

/**
 * La lecture du plan préchargée pendant l'écran de lancement (`v1-33` T-12, 03/10/2026). Éprouvé en le
 * cassant le même jour : la condition sur la lecture retirée fait tomber « pas sur la marque d'une
 * coupure », et lui seul ; la condition sur la destination retirée fait tomber « ni vers la reprise… »,
 * et lui seul.
 */
describe('prechargeLePlan', () => {
  const lue: LectureDuBilan = { etat: 'lue', bilanComplete: true };
  const coupure: LectureDuBilan = { etat: 'coupure' };

  it('précharge quand une lecture réussie désigne le plan', () => {
    expect(prechargeLePlan(lue, { vers: 'plan' })).toBe(true);
  });

  it('pas sur la marque d’une coupure : l’écran du plan retentera sa propre lecture', () => {
    expect(prechargeLePlan(coupure, { vers: 'plan' })).toBe(false);
  });

  it('ni vers la reprise, ni vers l’onboarding, ni vers l’écran d’échec', () => {
    expect(prechargeLePlan({ etat: 'lue', bilanComplete: false }, { vers: 'reprise' })).toBe(false);
    expect(prechargeLePlan({ etat: 'lue', bilanComplete: false }, { vers: 'onboarding' })).toBe(false);
    expect(prechargeLePlan({ etat: 'erreur' }, { vers: 'echec' })).toBe(false);
  });
});

/**
 * La racine du web sans session, et la page d'accueil (23/10/2026, étape 5 de `v1-35`). Éprouvé le
 * 23/10/2026 : `LECTURE_SANS_SESSION` écrite en coupure (`{ etat: 'coupure' }`) → « sans session, la marque
 * ne décide pas » tombe, seul ; la condition sur la plateforme retirée (l'accueil partout) → « sur natif,
 * l'onboarding reste… » tombe, seul ; la condition sur la destination retirée (l'accueil pour toute
 * destination du web) → « … le plan et la reprise ne passent pas par elle » tombe, seul.
 */
describe('la racine du web', () => {
  const VIDE = { brouillon: false, marqueDeBilan: false };

  it('sans session, aucun bilan : l’accueil, ou la reprise d’un questionnaire en cours', () => {
    expect(destinationDuDemarrage(LECTURE_SANS_SESSION, VIDE)).toEqual({ vers: 'onboarding' });
    expect(destinationDuDemarrage(LECTURE_SANS_SESSION, { ...VIDE, brouillon: true })).toEqual({ vers: 'reprise' });
  });

  // La marque survit à un stockage d'authentification vidé à la main : lue en repli, elle enverrait au plan
  // un navigateur qui n'a plus de session, où le plan ouvrirait une session neuve et vide.
  it('sans session, la marque ne décide pas', () => {
    expect(destinationDuDemarrage(LECTURE_SANS_SESSION, { ...VIDE, marqueDeBilan: true })).toEqual({ vers: 'onboarding' });
  });

  it('sur le web, la présentation du produit est la page d’accueil', () => {
    expect(destinationSurLaPlateforme({ vers: 'onboarding' }, 'web')).toEqual({ vers: 'accueil' });
  });

  it('sur natif, l’onboarding reste le premier écran', () => {
    expect(destinationSurLaPlateforme({ vers: 'onboarding' }, 'natif')).toEqual({ vers: 'onboarding' });
  });

  // Décidé le 23/10/2026 : qui revient avec un bilan ou un questionnaire en cours va comme avant à son plan.
  it('sur le web, le plan, la reprise et l’écran d’échec ne passent pas par elle', () => {
    for (const vers of ['plan', 'reprise', 'echec'] as const) {
      expect(destinationSurLaPlateforme({ vers }, 'web')).toEqual({ vers });
    }
  });
});

/**
 * Le brouillon sans session, à la racine du web (23/10/2026, contre-lecture de l'étape 5). Éprouvé le
 * 23/10/2026 : la condition sur le propriétaire retirée (le brouillon décide toujours) → « … celui d'une session
 * partie… » tombe, seul ; la condition sur `sansSession` retirée → « avec une session, le brouillon décide… »
 * tombe, seul.
 */
describe('leBrouillonCompte', () => {
  it('sans session, le brouillon d’une session partie ne décide pas : les marques ont un propriétaire', () => {
    expect(leBrouillonCompte({ brouillon: true, sansSession: true, marquesAvecProprietaire: true })).toBe(false);
  });

  it('sans session ni propriétaire, le brouillon est celui du visiteur, et il décide', () => {
    expect(leBrouillonCompte({ brouillon: true, sansSession: true, marquesAvecProprietaire: false })).toBe(true);
  });

  it('avec une session, le brouillon décide comme avant : la conciliation a déjà balayé ce qui n’était pas à elle', () => {
    expect(leBrouillonCompte({ brouillon: true, sansSession: false, marquesAvecProprietaire: true })).toBe(true);
    expect(leBrouillonCompte({ brouillon: false, sansSession: true, marquesAvecProprietaire: false })).toBe(false);
  });
});

// Décidé le 23/10/2026. Éprouvé le même jour : la comparaison retirée (toujours 1) → « partout ailleurs… »
// tombe, seul ; toujours 0 → « depuis la page d'accueil… » tombe, seul.
describe('premierePageDeLOnboarding', () => {
  it('depuis la page d’accueil, l’onboarding s’ouvre à sa deuxième page', () => {
    expect(premierePageDeLOnboarding('accueil')).toBe(1);
  });

  it('partout ailleurs, à la première, et une valeur inconnue ne déplace rien', () => {
    expect(premierePageDeLOnboarding(undefined)).toBe(0);
    expect(premierePageDeLOnboarding('ailleurs')).toBe(0);
    expect(premierePageDeLOnboarding(['accueil', 'accueil'])).toBe(0);
  });
});

// Ce que la racine fait d'une session qui ne s'ouvre pas (04/10/2026). Le refus du captcha avait
// l'écran technique et le message anglais de GoTrue ; il a désormais le sien. Éprouvé en le cassant le
// même soir : la branche du refus retirée fait tomber « le refus du captcha a son écran… », seul. Ce
// que ce fichier ne voit pas — que la racine lise cette issue — a été vu dans un export servi sous la
// CSP de production, le refus fabriqué : l'écran s'affiche, et « Réessayer » relance une création.
// Pour revoir l'écran sur le vrai serveur, il faut que le captcha soit activé dans Supabase. Et la
// phrase selon la plateforme (`phraseDeLaVerification`), éprouvée de même : la condition inversée fait
// tomber ses deux tests.
describe('issueDeLaSession', () => {
  it('une panne de transport est une coupure : le repli hors ligne, comme avant', () => {
    expect(issueDeLaSession({ name: 'AuthRetryableFetchError', status: 0 })).toBe('coupure');
    expect(issueDeLaSession({ status: 503, code: 'unexpected_failure' })).toBe('coupure');
  });

  it('le refus du captcha a son écran, ni coupure ni échec', () => {
    expect(issueDeLaSession({ status: 400, code: 'captcha_failed', message: 'captcha protection: request disallowed' })).toBe(
      'verification'
    );
  });

  it('tout le reste garde l’écran technique', () => {
    expect(issueDeLaSession({ status: 400, code: 'anonymous_provider_disabled' })).toBe('echec');
    expect(issueDeLaSession({ status: 429, code: 'over_request_rate_limit' })).toBe('echec');
  });
});

describe('phraseDeLaVerification', () => {
  it('sur le web, elle nomme le bloqueur et le domaine à débloquer', () => {
    expect(phraseDeLaVerification('web')).toBe(
      'Avant d’ouvrir ta session, une vérification automatique s’assure que c’est bien une personne qui arrive. ' +
        'Elle n’a pas pu se faire. Si un bloqueur de publicités est actif, désactive-le pour ramille.fr, puis réessaie.'
    );
  });

  it('dans l’app, elle renvoie au réseau, sans parler de bloqueur ni de domaine', () => {
    const phrase = phraseDeLaVerification('natif');
    expect(phrase.endsWith('Vérifie ta connexion, puis réessaie.')).toBe(true);
    expect(phrase).not.toContain('bloqueur');
    expect(phrase).not.toContain('ramille.fr');
  });
});
