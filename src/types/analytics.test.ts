import {
  appErrorCategory,
  DELAI_NOUVELLE_OUVERTURE_MS,
  MAX_PROP_KEYS,
  MAX_PROP_VALUE_LENGTH,
  sanitizeEventProps,
  sourceConnexion,
  SOURCES_CONNEXION,
  SOURCES_RETROUVER,
  USAGE_EVENT_NAMES,
  sourceRetrouver,
  SEJOUR_INITIAL,
  suivreLEtatDeLApp,
  type UsageEventName,
  type UsageEventPropsByName,
} from './analytics';

describe('USAGE_EVENT_NAMES', () => {
  // Ce test ne peut pas interroger la base. Ce qu'il garantit, c'est qu'un ajout d'événement
  // côté client ne passe pas inaperçu : la liste attendue est écrite en dur, donc toute
  // modification oblige à venir ici — et le commentaire rappelle la migration à écrire.
  it('correspond au référentiel public.usage_event_types', () => {
    expect([...USAGE_EVENT_NAMES]).toEqual([
      'app_open',
      'onboarding_step_view',
      'onboarding_complete',
      'bilan_step_view',
      'resultat_view',
      'resultat_share',
      'connexion_view',
      'connexion_demande',
      'connexion_success',
      'connexion_dismiss',
      'plan_view',
      'suivi_view',
      'compte_view',
      'retrouver_view',
      'retrouver_send',
      'rappels_view',
      'app_error',
      'bilan_submit_error',
    ]);
  });

  it("n'instrumente aucun fait que le schéma enregistre déjà", () => {
    // `assessments.submitted_at`, `engagement_checkins.response` et la table `feedback`
    // portent ces faits. Les mesurer en double, c'est se garantir deux chiffres qui
    // divergeront le jour où l'un des chemins échoue.
    //
    // **`bilan_submit_error` n'est pas l'exception qui confirmerait la règle** : le schéma
    // n'enregistre justement rien d'une soumission qui échoue — `submitted_at` n'est écrit que
    // quand elle aboutit, et un bilan resté `in_progress` ne dit ni pourquoi ni à quel pas.
    // C'est le complément du fait, pas son double.
    const interdits = ['bilan_submit', 'checkin_answer', 'feedback_submit'];
    for (const nom of interdits) {
      expect(USAGE_EVENT_NAMES).not.toContain(nom as UsageEventName);
    }
  });

  it('déclare des propriétés pour chaque événement', () => {
    // Purement statique : le test échoue à la compilation si une clé manque dans la table
    // de types. `expect` est là pour que Jest compte l'assertion.
    const _exhaustif: Record<UsageEventName, keyof UsageEventPropsByName> = {
      app_open: 'app_open',
      onboarding_step_view: 'onboarding_step_view',
      onboarding_complete: 'onboarding_complete',
      bilan_step_view: 'bilan_step_view',
      resultat_view: 'resultat_view',
      resultat_share: 'resultat_share',
      connexion_view: 'connexion_view',
      connexion_demande: 'connexion_demande',
      connexion_success: 'connexion_success',
      connexion_dismiss: 'connexion_dismiss',
      plan_view: 'plan_view',
      suivi_view: 'suivi_view',
      compte_view: 'compte_view',
      retrouver_view: 'retrouver_view',
      retrouver_send: 'retrouver_send',
      rappels_view: 'rappels_view',
      app_error: 'app_error',
      bilan_submit_error: 'bilan_submit_error',
    };
    expect(Object.keys(_exhaustif)).toHaveLength(USAGE_EVENT_NAMES.length);
  });
});

describe('suivreLEtatDeLApp', () => {
  // **Ce bloc éprouvait un littéral contre lui-même** (`expect(['demarrage', 'retour'])
  // .toEqual(['demarrage', 'retour'])`, sous une annotation de type). Son commentaire le disait
  // — « purement statique » — et c'était vrai : jest efface les types, donc l'assertion ne
  // pouvait tomber pour aucune raison. Ce qu'elle annonçait garder, « le démarrage et le retour
  // au premier plan n'écrivent pas des lignes indistinguables », est en réalité tenu par le
  // typecheck du côté du type — et, du côté du **fait**, par la règle ci-dessous, qui vivait
  // en variable mutable dans le layout racine sans qu'aucun test ne la voie.
  //
  // Éprouvé en la cassant, le 20/09/2026 (TESTING.md §1.1) — trois mutations :
  //   - `sejour.depuis ?? maintenant` remplacé par `maintenant` (dater à chaque événement
  //     non-actif) → le parcours iOS tombe, et lui seul ;
  //   - `>=` remplacé par `>` → la borne tombe, et elle seule ;
  //   - `depart !== null &&` retiré → le premier `active` du lancement tombe, et lui seul.

  const T0 = 1_700_000_000_000;

  it('ne compte pas le tout premier `active` du lancement', () => {
    // Le démarrage a déjà écrit son `app_open` depuis `ensureSession()` : compter aussi celui-ci
    // écrirait deux ouvertures pour une seule, sur le chemin le plus fréquent du produit.
    const { ouverture } = suivreLEtatDeLApp(SEJOUR_INITIAL, 'active', T0);
    expect(ouverture).toBe(false);
  });

  it('compte le retour après un séjour assez long, et pas un aller-retour', () => {
    const parti = suivreLEtatDeLApp(SEJOUR_INITIAL, 'background', T0);
    expect(parti.sejour.depuis).toBe(T0);

    const detour = suivreLEtatDeLApp(parti.sejour, 'active', T0 + 60_000);
    expect(detour.ouverture).toBe(false);
    expect(detour.sejour.depuis).toBeNull();

    const reparti = suivreLEtatDeLApp(detour.sejour, 'background', T0 + 120_000);
    const revenu = suivreLEtatDeLApp(reparti.sejour, 'active', T0 + 120_000 + DELAI_NOUVELLE_OUVERTURE_MS);
    expect(revenu.ouverture).toBe(true);
  });

  it('compte à la borne exacte — le délai est atteint, pas dépassé', () => {
    const parti = suivreLEtatDeLApp(SEJOUR_INITIAL, 'background', T0);
    expect(suivreLEtatDeLApp(parti.sejour, 'active', T0 + DELAI_NOUVELLE_OUVERTURE_MS).ouverture).toBe(true);
    expect(suivreLEtatDeLApp(parti.sejour, 'active', T0 + DELAI_NOUVELLE_OUVERTURE_MS - 1).ouverture).toBe(false);
  });

  it('survit à l’`inactive` qu’iOS traverse AU RETOUR — la mutation qui perdrait tout', () => {
    // Le parcours réel d'iOS : `inactive` puis `background` à l'aller, `inactive` puis `active`
    // au retour. Dater à chaque événement non-actif remettrait le compteur à zéro sur
    // l'`inactive` du retour — l'écart mesuré vaudrait une seconde, et **aucun** retour ne
    // serait jamais compté. La perte est totale et muette : la série ne montre pas un trou,
    // elle montre une plateforme qui ne revient jamais au premier plan.
    let sejour = SEJOUR_INITIAL;
    let ouvertures = 0;
    const parcours: [string, number][] = [
      ['inactive', T0],
      ['background', T0 + 1_000],
      ['inactive', T0 + DELAI_NOUVELLE_OUVERTURE_MS + 1_000],
      ['active', T0 + DELAI_NOUVELLE_OUVERTURE_MS + 2_000],
    ];
    for (const [etat, quand] of parcours) {
      const suite = suivreLEtatDeLApp(sejour, etat, quand);
      sejour = suite.sejour;
      if (suite.ouverture) ouvertures += 1;
    }
    expect(ouvertures).toBe(1);
  });

  it('n’a que deux origines, et la seconde est celle qu’elle produit', () => {
    // Ce qui reste de l'assertion statique d'avant, gardé pour ce qu'elle disait de vrai : la
    // valeur qu'écrit le retour au premier plan appartient bien à l'union déclarée. C'est le
    // typecheck qui tombe si l'union se réduit — `npm test` ne peut pas le voir, et le dire
    // ici évite qu'on reprenne un jour cette ligne pour une garde qu'elle n'est pas.
    const origine: UsageEventPropsByName['app_open']['origine'] = 'retour';
    expect(origine).toBe('retour');
  });
});

describe('sourceConnexion', () => {
  // Ce qui est épinglé ici, c'est l'absence de seconde liste. Le garde de l'écran de connexion
  // était écrit à la main et avait perdu `compte` en route : une arrivée depuis « Toi » était
  // enregistrée comme l'interstitiel post-bilan, c'est-à-dire dans la case à laquelle on voulait
  // justement la comparer. Dérivé de `SOURCES_CONNEXION`, le garde ne peut plus rater une
  // provenance que le type déclare.
  it('reconnaît toutes les provenances déclarées', () => {
    for (const source of SOURCES_CONNEXION) {
      expect(sourceConnexion(source)).toBe(source);
    }
  });

  /**
   * **Le repli dit « on ne sait pas », il ne devine pas.** Il rendait `resultat_transition`
   * jusqu'au 20/09/2026 — « mieux compté sur le chemin historique que perdu » —, et le retrait de
   * l'interstitiel a rendu cette phrase fausse : plus personne n'émet cette provenance, donc
   * chaque arrivée sans source se serait ajoutée aux lignes de l'interstitiel, c'est-à-dire au
   * seul chiffre qui sert à mesurer ce que le retrait a changé.
   */
  it('range une provenance absente ou inconnue dans « inconnue », et jamais sur une vraie porte', () => {
    expect(sourceConnexion(undefined)).toBe('inconnue');
    expect(sourceConnexion('')).toBe('inconnue');
    // `plan` et `suivi` ont été retirées faute d'émetteur : elles ne doivent pas se rattraper
    // en douce par le garde.
    expect(sourceConnexion('plan')).toBe('inconnue');
    expect(sourceConnexion('suivi')).toBe('inconnue');
    // Et surtout : le repli ne gonfle aucune porte réelle.
    for (const porte of ['resultat_transition', 'resultat_cta', 'compte', 'rappels'] as const) {
      expect(sourceConnexion(undefined)).not.toBe(porte);
    }
  });

  /**
   * **Deux valeurs déclarées n'ont pas d'émetteur d'écran, et chacune pour sa raison** :
   * `resultat_transition` est l'interstitiel retiré le 20/09/2026, gardée pour que l'historique
   * d'avant se lise ; `inconnue` n'est émise que par le garde ci-dessus. Le test les nomme pour
   * que la liste ne grossisse pas d'une valeur muette sans qu'on s'en aperçoive.
   */
  it('ne déclare que les portes réelles, plus l’interstitiel retiré et le repli', () => {
    expect([...SOURCES_CONNEXION]).toEqual([
      'resultat_transition',
      'resultat_cta',
      'compte',
      'rappels',
      'inconnue',
    ]);
  });
});

describe('sourceRetrouver', () => {
  // **La jumelle, et elle a coûté le même défaut que sa sœur, un écran plus loin.** Jusqu'au
  // 20/09/2026 elle vivait dans `/connexion/retrouver` sous la forme d'une **seconde liste écrite
  // à la main** — `if (source === 'email') …` sur trois valeurs — et l'écran n'étant pas testé,
  // rien ne pouvait dire qu'elle avait manqué les quatre portes ouvertes par C2.11. Les quatre
  // arrivées étaient donc comptées comme venant de l'accueil de l'onboarding.
  //
  // Cette boucle est ce qui l'aurait vu : elle tombe dès que le garde cesse d'être **dérivé** de
  // la liste, quelle que soit la valeur oubliée.
  it('reconnaît toutes les portes déclarées', () => {
    for (const source of SOURCES_RETROUVER) {
      expect(sourceRetrouver(source)).toBe(source);
    }
  });

  it('retombe sur l’accueil pour une porte absente ou inconnue', () => {
    // Un lien direct, un retour arrière : mieux vaut compté sur le chemin historique que perdu.
    expect(sourceRetrouver(undefined)).toBe('onboarding');
    expect(sourceRetrouver('')).toBe('onboarding');
    // Et une valeur inconnue ne doit pas se rattraper en douce : elle se replie, visiblement.
    expect(sourceRetrouver('compte')).toBe('onboarding');
  });

  // `session_refusee` est un **état de panne** et non une arrivée volontaire : elle a son nom pour
  // pouvoir être soustraite. L'épingler séparément dit qu'elle n'est pas là par inadvertance.
  it('distingue l’état de panne des portes volontaires', () => {
    expect(sourceRetrouver('session_refusee')).toBe('session_refusee');
    expect(SOURCES_RETROUVER).toContain('rappel');
  });
});

describe('appErrorCategory', () => {
  // Ce qui est épinglé ici : la catégorie se dérive du **type** de l'exception, et tout ce qui
  // n'est pas une erreur native retombe sur `autre` — jamais sur le message, qui est du texte
  // libre que `usage_events` ne doit pas porter. Ce qu'aucune assertion de ce fichier ne peut
  // montrer, en revanche, c'est pourquoi la dérivation lit `error.name` plutôt qu'`instanceof` :
  // une exception qui traverse deux contextes (un iframe, un worker) garde son nom et perd son
  // prototype. Le commentaire de `appErrorCategory` porte cette raison ; ne pas la remplacer par
  // un `instanceof` au motif que ces deux cas passeraient quand même.
  it('dérive la catégorie du type de l’exception', () => {
    expect(appErrorCategory(new TypeError('x'))).toBe('type');
  });

  it('retombe sur « autre » pour ce qui n’est pas une erreur native', () => {
    expect(appErrorCategory('chaîne jetée')).toBe('autre');
  });
});

describe('sanitizeEventProps', () => {
  it('laisse passer des propriétés normales', () => {
    expect(sanitizeEventProps({ step: 'commute_mode', rank: 1, first: true })).toEqual({
      step: 'commute_mode',
      rank: 1,
      first: true,
    });
  });

  it('rend un objet vide plutôt que undefined', () => {
    expect(sanitizeEventProps(undefined)).toEqual({});
  });

  it('respecte les bornes de la contrainte SQL', () => {
    const trop = Object.fromEntries(
      Array.from({ length: MAX_PROP_KEYS + 3 }, (_, i) => [`k${i}`, i])
    );
    expect(Object.keys(sanitizeEventProps(trop))).toHaveLength(MAX_PROP_KEYS);

    const long = sanitizeEventProps({ step: 'x'.repeat(MAX_PROP_VALUE_LENGTH + 20) });
    expect((long.step as string).length).toBe(MAX_PROP_VALUE_LENGTH);

    expect(sanitizeEventProps({ ['k'.repeat(40)]: 1 })).toEqual({});
  });

  it('écarte ce que la contrainte de type refuserait', () => {
    // Un objet imbriqué, un NaN ou un Infinity feraient échouer l'insert côté base. Une
    // mesure d'usage ne doit jamais faire tomber l'écran qu'elle observe.
    const props = { nested: { a: 1 }, nan: NaN, inf: Infinity, ok: 'oui' } as never;
    expect(sanitizeEventProps(props)).toEqual({ ok: 'oui' });
  });
});
