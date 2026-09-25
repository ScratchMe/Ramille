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
// étrangère rejette l'insert et l'événement est perdu en silence. Un test garde la liste — et
// la suite pgTAP en garde une troisième copie (`12_usage_events.test.sql`), qu'il faut donc
// rouvrir elle aussi.
//
// ## Une valeur de propriété déclarée et jamais émise se lit **zéro**
//
// La même règle qu'un nom d'événement, pour une raison plus discrète : la base ne valide pas
// les valeurs de `props` (`check_usage_event_props` ne compte que des clés et des longueurs),
// donc rien n'arrête la dérive. `connexion_view` déclarait cinq provenances dont deux
// qu'aucun écran n'émettait plus, et une sixième — `compte` — que l'écran de connexion
// réécrivait en `resultat_transition` faute de la reconnaître. D'où `SOURCES_CONNEXION`
// ci-dessous : **une seule liste**, qui donne à la fois le type et le garde d'appartenance.

// Seul import de ce module, et il reste pur : `src/types/resultat.ts` ne tire ni React Native ni
// `@/lib/supabase`. Réutiliser le type plutôt que recopier `'nouveau' | 'relecture'` fait que le
// jour où une troisième entrée de la restitution apparaît, le typecheck vient poser la question
// ici — c'est-à-dire à l'endroit où l'entonnoir se lit.
import type { ModeResultat } from '@/types/resultat';
// Même raison que l'import ci-dessus : les deux dimensions de `bilan_submit_error` ont leur
// source unique dans `src/types/soumission.ts`, module pur lui aussi, qui porte la dérivation du
// genre et la raison de ne jamais émettre le message d'erreur.
import type { EtapeSoumission, GenreErreurSoumission } from '@/types/soumission';

export const USAGE_EVENT_NAMES = [
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
] as const;

export type UsageEventName = (typeof USAGE_EVENT_NAMES)[number];

export type UsageEventPropValue = string | number | boolean;
export type UsageEventProps = Record<string, UsageEventPropValue>;

// ## Les provenances de `/connexion`, et pourquoi elles tiennent dans une seule liste
//
// Chacune doit correspondre à un écran qui navigue vraiment vers `/connexion` : aujourd'hui la
// bannière de la restitution, « Toi », et la feuille des rappels. (L'interstitiel imposé en allant
// au plan en était une quatrième jusqu'au 20/09/2026 ; il est retiré, et sa provenance reste
// déclarée pour que son historique se lise.) `plan` et `suivi` ont été retirées par v1-13 C1.2 — déclarées, jamais émises depuis
// que le compte est sorti du suivi (v1-11 §2.5), elles se lisaient zéro.
// **`rappels` est la quatrième porte, ouverte le 20/09/2026 avec le retrait de l'interstitiel.**
// C'est la feuille des rappels, seul écran du produit qui POSE la question à laquelle le compte
// répond (« comment te faire signe ? ») : sa ligne « Par email » était grisée sans porte. La
// valeur s'ajoute des deux côtés ensemble — ici pour le type et le garde, et dans la description
// du référentiel en base, seul endroit où les valeurs attendues d'une propriété peuvent vivre
// (`check_usage_event_props` ne compte que des clés et des longueurs, donc rien n'arrête la
// dérive côté serveur).
//
// **Et `resultat_transition` reste déclarée alors que plus rien ne l'émet**, à dessein : c'était
// l'interstitiel imposé, et les lignes déjà en base la portent. La retirer rendrait illisible
// l'historique d'avant le retrait, c'est-à-dire la seule mesure à laquelle comparer l'après.
//
// **Et le repli du garde a dû changer de valeur le même jour**, sinon le retrait se payait d'un
// mensonge : il rendait `resultat_transition`, « mieux compté sur le chemin historique que perdu ».
// Ce chemin n'existe plus, donc chaque arrivée sans provenance — une URL collée, un favori, un
// retour arrière — se serait ajoutée aux lignes de l'interstitiel, c'est-à-dire **au seul chiffre
// qu'on garde pour mesurer ce que le retrait a changé**. D'où `inconnue`, qui est un fait et non
// une supposition : on ne sait pas d'où la personne vient, et on le dit.
export const SOURCES_CONNEXION = [
  'resultat_transition',
  'resultat_cta',
  'compte',
  'rappels',
  'inconnue',
] as const;

export type SourceConnexion = (typeof SOURCES_CONNEXION)[number];

// ## Les portes de `/connexion/retrouver`, même règle
//
// `lien` a été déclarée parce qu'elle était **émise sans l'être** — le garde de l'écran la repliait
// sur `onboarding`, gonflant la porte à laquelle on voulait la comparer. L'inverse du défaut
// d'une valeur déclarée et jamais émise, et aussi silencieux.
//
// **Et le même défaut vivait à quatre autres portes pendant que ce commentaire le décrivait**
// (relevé le 20/09/2026, en relisant le dépôt entier). C2.11 en a ouvert trois — les deux états
// vides du plan et celui du suivi — et `SessionRefusee` la quatrième ; aucune ne passait de
// `source`, donc les quatre étaient comptées comme venant de l'accueil de l'onboarding, sur leurs
// **deux** dimensions (`collision` étant faux dans les deux cas). Celle qui coûtait le plus cher :
// `rappel`, quelqu'un qui ouvre le rappel e-mail sur un appareil neuf — c'est-à-dire le chiffre
// que C2.11 existe pour produire, rendu indiscernable d'une découverte.
//
// `session_refusee` n'est pas une porte comme les autres : c'est un **état de panne** (un jeton
// refusé, C2.11), et le compter comme une arrivée volontaire mélangerait un incident à une
// intention. Il vaut mieux qu'elle ait son nom et qu'on la soustraie, que de ne pas la voir.
export const SOURCES_RETROUVER = [
  'onboarding',
  'email',
  'google',
  'lien',
  'rappel',
  'plan_vide',
  'suivi_vide',
  'session_refusee',
] as const;

export type SourceRetrouver = (typeof SOURCES_RETROUVER)[number];

/**
 * Reconnaît la provenance passée en paramètre d'URL, ou retombe sur `inconnue`.
 *
 * **Le garde se dérive de la liste, il ne la recopie pas.** C'est la duplication qui avait
 * dérivé : l'écran de connexion filtrait sur trois valeurs écrites à la main, si bien qu'une
 * arrivée depuis « Toi » — la provenance la plus intéressante à mesurer, quelqu'un qui vient
 * chercher le rattachement hors de tout interstitiel — était enregistrée comme l'interstitiel
 * lui-même, et gonflait exactement le chiffre qu'on voulait lui comparer.
 *
 * **Le repli est `inconnue`, et ce commentaire disait le contraire du corps** jusqu'au 21/09/2026 —
 * sa première ligne jusqu'au 24/09, la correction du 21 l'ayant laissée :
 * il annonçait `resultat_transition`, « parce que c'est le chemin historique ». C'était vrai la
 * veille et faux le jour d'après — l'interstitiel retiré, cette provenance est devenue la **mesure
 * de l'avant**, donc y verser chaque arrivée sans paramètre polluait le seul chiffre qui sert à
 * juger le retrait. Un paramètre absent (lien direct, favori, retour arrière) est un fait, pas une
 * supposition : il se compte pour ce qu'il est. Le bloc en tête de `SOURCES_CONNEXION` dit le
 * calcul ; c'est la famille de défaut que la contre-lecture cherche (« une phrase qui décrit ce que
 * le code faisait avant »), et elle a survécu à la passe qui en a corrigé cinq autres.
 */
export function sourceConnexion(valeur: string | undefined): SourceConnexion {
  return SOURCES_CONNEXION.find((source) => source === valeur) ?? 'inconnue';
}

/**
 * La porte par laquelle on est entré dans `/connexion/retrouver`, ramenée aux valeurs déclarées.
 *
 * **Jumelle de `sourceConnexion`, et elle vivait dans l'écran jusqu'au 20/09/2026** — avec une
 * **seconde liste écrite à la main** (`if (source === 'email') …`), c'est-à-dire exactement la
 * forme que le commentaire ci-dessus dit avoir supprimée pour l'autre écran. Les deux défauts
 * qu'elle a coûtés sont les deux faces de la même : la liste manuelle n'a jamais reçu les quatre
 * portes ouvertes par C2.11, et l'écran n'étant pas testé (décision du dépôt), rien ne pouvait
 * le dire.
 *
 * Elle est ici parce que c'est la règle : **toute dérivation pure décidant d'une navigation ou
 * affichée à la personne vit dans `src/types`**, où Jest la lit. Le repli sur `onboarding` reste
 * — une arrivée sans provenance (lien direct, retour arrière) vaut mieux comptée là que perdue —
 * mais il ne peut plus avaler une porte que le type déclare.
 */
export function sourceRetrouver(valeur: string | undefined): SourceRetrouver {
  return SOURCES_RETROUVER.find((source) => source === valeur) ?? 'onboarding';
}

// Propriétés attendues par événement. Le typage sert au moment de l'appel : il est trop
// facile d'écrire `{ etape: ... }` au lieu de `{ step: ... }` et de découvrir six semaines
// plus tard que l'entonnoir est vide.
export type UsageEventPropsByName = {
  /** **Deux chemins d'émission, donc une dimension.** `origine: 'demarrage'` part après la
   *  résolution d'`ensureSession()` au chargement du bundle ; `'retour'` part quand l'app
   *  revient au premier plan après plus de cinq minutes derrière — le chemin du rappel, qui
   *  n'écrivait rien du tout (A1-4). Fondus en lignes identiques, les deux rendaient
   *  invérifiable le second (« ouvrir un rappel doit écrire une ouverture ») et
   *  incomparables les séries d'avant et d'après le 11/09/2026. `'retour'` n'existe que sur
   *  natif : voir le commentaire de l'écoute `AppState` dans `src/app/_layout.tsx`. */
  app_open: { origine: 'demarrage' | 'retour' };
  onboarding_step_view: { step: string };
  onboarding_complete: never;
  bilan_step_view: { step: string };
  /** **Le mode n'est pas un détail d'entonnoir, c'est ce qui le rend lisible.** Les deux entrées
   *  de l'écran (v1-11 §1) sont deux faits différents : l'aboutissement du questionnaire, et la
   *  relecture d'un instantané depuis le suivi. Sans la dimension, « bilan soumis → résultat vu
   *  → plan vu » additionne les deux, et plus le suivi dans la durée fonctionne, plus le taux de
   *  conversion vers le plan paraît chuter — un chiffre plausible et faux, la même famille de
   *  biais que `plan_view` au montage. */
  resultat_view: { mode: ModeResultat };
  resultat_share: never;
  // **La question que cet événement servait à trancher est tranchée**, et il faut le savoir pour ne
  // pas lire son historique de travers. `resultat_transition` était l'interstitiel imposé en allant
  // au plan, `resultat_cta` le clic délibéré sur la bannière ; comparer leurs taux répondait à
  // « l'interstitiel mérite-t-il sa friction ? », avec `compte` pour repère — quelqu'un qui vient de
  // lui-même. La réponse est venue d'ailleurs le 20/09/2026 : l'interstitiel perdait les trois
  // tests du critère de `v1-28`, dont celui de la vérité, et un titre faux ne se rachète pas par un
  // taux. Ce que l'événement mesure maintenant est la question **suivante** — les trois portes qui
  // restent se valent-elles ? — et `resultat_transition` devient la mesure de l'avant, à laquelle
  // les trois se comparent. D'où le repli du garde sur `inconnue` et non sur elle.
  connexion_view: { source: SourceConnexion };
  /** **Une demande de lien, pas un rattachement.** L'écran email émettait `connexion_success`
   *  juste après `updateUser({ email })` ; le modèle de données dit l'inverse et de façon
   *  appuyée — `etatDuRattachement` classe cet instant en `a_confirmer`, « une adresse présente
   *  ne signifie pas que le compte est rattaché », et `is_anonymous` ne bascule qu'au clic du
   *  lien reçu. Le chemin Google, lui, n'émettait l'événement qu'après une session réellement
   *  liée : les deux branches ne mesuraient pas la même chose, et la seule comparaison que cet
   *  événement permet était faussée du taux d'emails jamais confirmés — précisément le chiffre
   *  qu'on veut connaître. Celui-ci porte l'intention, `connexion_success` le fait : l'écart
   *  entre les deux **est** ce taux. Pas de propriété de méthode — il n'y a que l'email à
   *  demander un lien, Google liant l'identité dans le même geste. */
  connexion_demande: never;
  /** Le rattachement **constaté**, jamais demandé : une session réellement liée côté Google, la
   *  bascule d'`is_anonymous` côté email (que `/plan` observe déjà pour annoncer le
   *  rattachement). Les deux valeurs mesurent donc le même fait, et se comparent. */
  connexion_success: { method: 'google' | 'email' };
  /**
   * **Retiré le 20/09/2026 : plus aucun code ne l'émet.** C'était « Continuer sans compte » sur
   * l'interstitiel de compte, qui ne s'interpose plus — on ne refuse plus rien, on reporte.
   *
   * La règle du dépôt dit qu'un événement que rien n'émet se retire, parce qu'il se lit **zéro** et
   * non « pas encore instrumenté ». Elle suppose un événement **sans histoire** : ici cinq lignes
   * existent en base, et `usage_events.name` référence le référentiel. Les supprimer détruirait une
   * mesure réelle pour respecter une règle qui vise l'inverse. La déclaration reste donc, et la
   * description du référentiel porte la date de retrait (migration `20260920220000`) : un zéro daté
   * est lisible, un zéro muet ne l'est pas.
   */
  connexion_dismiss: never;
  plan_view: never;
  suivi_view: never;
  compte_view: never;
  // Les deux seules mesures d'un écran dont le schéma ne garde aucune trace : `signInWithOtp`
  // n'écrit que dans `auth`. `collision` dit que l'appareil portait déjà un bilan anonyme —
  // c'est ce chiffre-là qui décide si la collision Google (#60) mérite un écran dédié.
  retrouver_view: { source: SourceRetrouver; collision: boolean };
  // Le toucher de « Recevoir un code », sans distinguer adresse connue ou inconnue : la réponse
  // est volontairement la même dans les deux cas, sans quoi l'écran dirait qui utilise Ramille.
  // C'était « Recevoir le lien » jusqu'au 20/09/2026 ; le geste mesuré est le même, la demande.
  retrouver_send: never;
  /** La feuille des rappels s'est affichée. Elle ne s'ouvre que depuis un engagement,
   *  donc elle n'a pas de propriété de provenance : il n'y en a qu'une. */
  rappels_view: never;
  /** Une exception de rendu a remonté jusqu'à l'`ErrorBoundary` du layout racine (C0.4).
   *  **Deux propriétés, et jamais une troisième** : la catégorie et la route. Pas de message
   *  d'exception, pas de pile — un message d'erreur est du texte libre, et du texte libre dans
   *  `usage_events` rendrait la table réidentifiable (cf. l'en-tête de la migration). */
  app_error: { category: AppErrorCategory; route: string };
  /** **Une soumission de bilan qui échoue, et le seul événement du produit qui mesure un
   *  échec.** Il existe parce que le défaut qu'il mesure était invisible des deux côtés : côté
   *  base, un bilan `completed` sans réponses ni résultat se lit comme un bilan réussi (A2-2) ;
   *  côté produit, la personne voyait une phrase française, réessayait ou partait, et rien n'en
   *  restait. `assessments.submitted_at` ne peut pas le dire — par construction, il n'est écrit
   *  que quand la soumission aboutit.
   *
   *  **Deux propriétés, et jamais le message.** `etape` vient du code qui appelle, qui sait où il
   *  en est ; `genre` se dérive du code de l'erreur, jamais de son texte — une violation de
   *  contrainte cite la valeur refusée, c'est-à-dire une réponse de la personne, et `usage_events`
   *  ne porte pas de texte libre (cf. l'en-tête de 20260905170000 et
   *  `src/types/soumission.ts`). */
  bilan_submit_error: { etape: EtapeSoumission; genre: GenreErreurSoumission };
};

// ## `app_error` : la catégorie, et pourquoi elle est fermée
//
// Ce qu'on veut savoir d'une panne de rendu tient en deux questions : **où** (la route) et de
// **quelle nature** (un accès sur `undefined` n'a pas la même cause qu'un JSON mal formé). Le
// message, lui, est du texte libre : il peut contenir une URL, une valeur, un identifiant —
// exactement ce que cette table ne doit jamais porter. La catégorie se dérive donc du *type* de
// l'exception, qui est un nom de classe du langage et non une donnée.
export const APP_ERROR_CATEGORIES = [
  'type',
  'reference',
  'range',
  'syntax',
  'uri',
  'autre',
] as const;

export type AppErrorCategory = (typeof APP_ERROR_CATEGORIES)[number];

// `name` plutôt qu'`instanceof` : les constructeurs natifs portent leur nom dans le prototype,
// que la minification ne touche pas, alors qu'`instanceof` se trompe dès qu'une exception
// traverse deux contextes (un iframe, un worker) — et le repli `autre` serait silencieux.
export function appErrorCategory(erreur: unknown): AppErrorCategory {
  const nom = erreur instanceof Error ? erreur.name : '';
  switch (nom) {
    case 'TypeError':
      return 'type';
    case 'ReferenceError':
      return 'reference';
    case 'RangeError':
      return 'range';
    case 'SyntaxError':
      return 'syntax';
    case 'URIError':
      return 'uri';
    default:
      return 'autre';
  }
}

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

// ---------------------------------------------------------------------------------------------
// Ce qui compte comme une ouverture quand l'app revient au premier plan
// ---------------------------------------------------------------------------------------------
//
// `app_open` a deux chemins d'émission (cf. `UsageEventPropsByName['app_open']`), et le second —
// le retour au premier plan, celui du rappel — porte une règle que rien n'éprouvait : elle vivait
// dans l'écoute `AppState` du layout racine, en variable mutable, à l'endroit du produit où une
// exception n'a plus personne au-dessus d'elle.
//
// **La subtilité est la date de départ, qui ne se réécrit jamais pendant le séjour derrière.**
// iOS passe par `inactive` avant `background` à l'aller **comme au retour** : dater à chaque
// événement non-actif remettrait le compteur à zéro sur l'`inactive` du retour, l'écart mesuré
// vaudrait quelques millisecondes, et **aucun retour ne serait jamais compté**. La perte est
// totale et silencieuse — la série ne montre pas un trou, elle montre une plateforme qui ne
// revient jamais au premier plan.
//
// L'état de l'app est pris en `string` plutôt qu'en union recopiée de `AppStateStatus` : cette
// dérivation ne distingue que « actif » de « pas actif », et une seconde copie d'un type de
// react-native serait un miroir de plus à tenir pour une distinction qu'elle ne fait pas.

/**
 * En dessous de ce séjour derrière, le retour n'est pas une nouvelle ouverture — c'est un
 * aller-retour dans les réglages du téléphone, une notification balayée, un appel pris.
 */
export const DELAI_NOUVELLE_OUVERTURE_MS = 5 * 60 * 1000;

/** Depuis quand l'app est derrière, ou `null` si elle est au premier plan. */
export type SejourDerriere = { readonly depuis: number | null };

export const SEJOUR_INITIAL: SejourDerriere = { depuis: null };

/**
 * Le pas de l'écoute `AppState` : l'état suivant, et si ce passage est une ouverture.
 *
 * Un `active` sans départ enregistré ne compte pas : c'est le tout premier événement du
 * lancement, et le démarrage a déjà écrit son `app_open` — le compter ici en écrirait deux
 * pour une seule ouverture.
 */
export function suivreLEtatDeLApp(
  sejour: SejourDerriere,
  etatDeLApp: string,
  maintenant: number,
): { sejour: SejourDerriere; ouverture: boolean } {
  if (etatDeLApp !== 'active') {
    return { sejour: { depuis: sejour.depuis ?? maintenant }, ouverture: false };
  }
  const depart = sejour.depuis;
  return {
    sejour: SEJOUR_INITIAL,
    ouverture: depart !== null && maintenant - depart >= DELAI_NOUVELLE_OUVERTURE_MS,
  };
}
