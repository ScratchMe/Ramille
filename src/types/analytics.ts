// Mesure d'usage (issue #30) — logique pure, testée. Les requêtes vivent dans
// `src/lib/analytics.ts`, comme pour bilan/suivi : un module importé par un test ne doit
// tirer ni React Native ni `@/lib/supabase`.
//
// ## La règle qui décide de ce qui est ici
//
// **On n'instrumente jamais ce que le schéma enregistre déjà.** Une soumission de bilan, une
// réponse de check-in, un retour utilisateur laissent chacun une ligne en base : les compter
// une seconde fois garantit deux chiffres divergents le jour où l'un des deux chemins
// échoue. Ne sont mesurés ici que des faits qui, sans ça, ne laisseraient aucune trace —
// essentiellement des affichages et des abandons.
//
// ## Synchronisation avec la base
//
// `public.usage_event_types` porte la même liste. **Ajouter un événement impose les deux
// côtés** : une ligne dans le référentiel (par migration) et une entrée ici. Sinon la clé
// étrangère rejette l'insert et l'événement est perdu en silence. Un test garde la liste.

export const USAGE_EVENT_NAMES = [
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
] as const;

export type UsageEventName = (typeof USAGE_EVENT_NAMES)[number];

export type UsageEventPropValue = string | number | boolean;
export type UsageEventProps = Record<string, UsageEventPropValue>;

// Propriétés attendues par événement. Le typage sert au moment de l'appel : il est trop
// facile d'écrire `{ etape: ... }` au lieu de `{ step: ... }` et de découvrir six semaines
// plus tard que l'entonnoir est vide.
export type UsageEventPropsByName = {
  app_open: never;
  onboarding_step_view: { step: string };
  onboarding_complete: never;
  bilan_step_view: { step: string };
  resultat_view: never;
  resultat_share: never;
  // Les deux entrées vers /connexion ne disent pas la même chose : `resultat_transition`
  // est l'interstitiel imposé en allant au plan, `resultat_cta` un clic délibéré. Comparer
  // leurs taux de conversion, c'est répondre à « l'interstitiel mérite-t-il sa friction ? ».
  connexion_view: { source: 'resultat_transition' | 'resultat_cta' | 'plan' | 'suivi' | 'compte' };
  connexion_success: { method: 'google' | 'email' };
  connexion_dismiss: never;
  plan_view: never;
  suivi_view: never;
  compte_view: never;
};

// Bornes de `public.check_usage_event_props`, répliquées ici pour ne jamais émettre un insert
// que la base refusera. Les valeurs viennent du code, pas de l'utilisateur : dépasser une
// borne est un bug de notre côté, pas une saisie à valider — d'où un écrêtage silencieux
// plutôt qu'une exception qui ferait tomber un écran pour une histoire de mesure.
export const MAX_PROP_KEYS = 6;
export const MAX_PROP_KEY_LENGTH = 32;
export const MAX_PROP_VALUE_LENGTH = 48;

export function sanitizeEventProps(props: UsageEventProps | undefined): UsageEventProps {
  if (!props) return {};
  const entries = Object.entries(props)
    .filter(([key, value]) => key.length > 0 && key.length <= MAX_PROP_KEY_LENGTH && value != null)
    .slice(0, MAX_PROP_KEYS);

  const safe: UsageEventProps = {};
  for (const [key, value] of entries) {
    if (typeof value === 'string') {
      safe[key] = value.slice(0, MAX_PROP_VALUE_LENGTH);
    } else if (typeof value === 'number') {
      // Un NaN ou un Infinity ne survit pas au JSON : mieux vaut ne pas envoyer la clé que
      // d'envoyer `null` et faire échouer la contrainte de type.
      if (Number.isFinite(value)) safe[key] = value;
    } else if (typeof value === 'boolean') {
      safe[key] = value;
    }
  }
  return safe;
}
