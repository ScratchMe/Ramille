import {
  MAX_PROP_KEYS,
  MAX_PROP_VALUE_LENGTH,
  sanitizeEventProps,
  USAGE_EVENT_NAMES,
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
      'connexion_success',
      'connexion_dismiss',
      'plan_view',
      'suivi_view',
      'compte_view',
      'retrouver_view',
      'retrouver_send',
    ]);
  });

  it("n'instrumente aucun fait que le schéma enregistre déjà", () => {
    // `assessments.submitted_at`, `engagement_checkins.response` et la table `feedback`
    // portent ces faits. Les mesurer en double, c'est se garantir deux chiffres qui
    // divergeront le jour où l'un des chemins échoue.
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
      connexion_success: 'connexion_success',
      connexion_dismiss: 'connexion_dismiss',
      plan_view: 'plan_view',
      suivi_view: 'suivi_view',
      compte_view: 'compte_view',
      retrouver_view: 'retrouver_view',
      retrouver_send: 'retrouver_send',
    };
    expect(Object.keys(_exhaustif)).toHaveLength(USAGE_EVENT_NAMES.length);
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
