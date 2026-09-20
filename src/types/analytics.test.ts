import {
  appErrorCategory,
  MAX_PROP_KEYS,
  MAX_PROP_VALUE_LENGTH,
  sanitizeEventProps,
  sourceConnexion,
  SOURCES_CONNEXION,
  SOURCES_RETROUVER,
  USAGE_EVENT_NAMES,
  sourceRetrouver,
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

describe('app_open', () => {
  it('distingue ses deux chemins d’émission', () => {
    // Purement statique : le typecheck refuse une valeur inconnue, et `app_open` redevenu
    // `never` ferait échouer cette ligne. Ce qui est épinglé, c'est que le démarrage et le
    // retour au premier plan n'écrivent pas des lignes indistinguables — sans quoi on ne peut
    // ni vérifier que le chemin du rappel fonctionne, ni comparer les séries d'avant et
    // d'après le 11/09/2026 (v1-13 C1.2, constat A1-4).
    const origines: UsageEventPropsByName['app_open']['origine'][] = ['demarrage', 'retour'];
    expect(origines).toEqual(['demarrage', 'retour']);
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

  it('retombe sur l’interstitiel pour une provenance absente ou inconnue', () => {
    // Un lien direct, un retour arrière : mieux vaut compté sur le chemin historique que perdu.
    expect(sourceConnexion(undefined)).toBe('resultat_transition');
    expect(sourceConnexion('')).toBe('resultat_transition');
    // `plan` et `suivi` ont été retirées faute d'émetteur : elles ne doivent pas se rattraper
    // en douce par le garde.
    expect(sourceConnexion('plan')).toBe('resultat_transition');
    expect(sourceConnexion('suivi')).toBe('resultat_transition');
  });

  it('ne déclare aucune provenance qu’aucun écran n’émet', () => {
    expect([...SOURCES_CONNEXION]).toEqual(['resultat_transition', 'resultat_cta', 'compte']);
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
