// Les pannes que le rendu ne voit pas — `docs/exploitation/remontee-erreurs.md` §3 ter.
//
// L'`ErrorBoundary` du layout racine n'attrape que les exceptions **de rendu**. Une exception levée dans
// un gestionnaire de toucher, un minuteur, la suite d'une promesse, ou une promesse rejetée que personne
// n'attend, n'y passe pas : sur natif, la première ferme l'app, la seconde se perd sans un mot. Ce module
// les écoute là où la plateforme les rend, sans dépendance de plus :
//
//   * **natif** : le gestionnaire global de React Native (`ErrorUtils.setGlobalHandler`), **chaîné** à
//     celui d'avant — c'est lui qui affiche l'écran rouge en développement et ferme l'app sur une panne
//     fatale en production, et il le fait toujours ; et le suivi des rejets de Hermes
//     (`HermesInternal.enablePromiseRejectionTracker`), que React Native n'active qu'en développement ;
//   * **web** : les événements `error` et `unhandledrejection` de la fenêtre.
//
// **Rien en développement** : l'écran rouge et la console disent déjà tout au développeur, et le
// développement courant écrit dans la base de la production. Le suivi des rejets y est celui de React
// Native, que le nôtre remplacerait.
//
// **Une panne fatale ne part pas, elle se garde** : l'app se ferme dès que le gestionnaire d'avant la
// reçoit, avant qu'un insert ait pu partir — et l'écriture locale elle-même demande deux allers-retours
// au stockage. Elle est donc gardée dans la file d'attente des erreurs, et le gestionnaire d'avant n'est
// appelé qu'une fois l'écriture faite, ou au plus tard `DELAI_AVANT_LA_FIN_MS` après : elle part au
// lancement suivant. Les autres partent tout de suite (`track`), et la file les garde si l'envoi échoue.
import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

import { garderUnePanne, track } from '@/lib/analytics';
import type { OrigineDUnePanne } from '@/types/analytics';
import {
  estUneErreurDHydratation,
  laPanne,
  laPanneEstANous,
  signatureDeLaPanne,
  trierLesPannes,
  versionDeLApp,
  type PanneSignalee,
} from '@/types/remontee-des-pannes';

/** Le temps laissé à l'écriture d'une panne fatale avant que l'app ne se ferme. */
export const DELAI_AVANT_LA_FIN_MS = 1_000;

// ── La route et la version ────────────────────────────────────────────────────────────────────────

/**
 * La route courante, notée par le layout racine à chaque changement (`usePathname()`). Une panne hors du
 * rendu n'a pas d'arbre où la lire ; avant le montage de la navigation, c'est `/`, comme pour le rendu
 * (`remontee-erreurs.md` §2).
 */
let routeCourante = '/';

export function noterLaRoute(chemin: string): void {
  routeCourante = chemin;
}

type ModuleDeLApplication = { nativeApplicationVersion?: string | null; nativeBuildVersion?: string | null };

let versionLue: { valeur: string | undefined } | null = null;

/**
 * La version de cette app, lue une fois. **Sur natif, celle du binaire installé** : le module natif
 * d'`expo-application`, qu'`expo-notifications` embarque déjà, lu par `requireOptionalNativeModule` — qui
 * rend `null` plutôt que de lever si un build ne l'avait pas, et la version d'`app.json` sert alors seule.
 * Sur le web, la version d'`app.json` que l'export a figée. Ne lève jamais.
 */
export function versionDeCetteApp(): string | undefined {
  if (!versionLue) versionLue = { valeur: lireLaVersion() };
  return versionLue.valeur;
}

function lireLaVersion(): string | undefined {
  try {
    const natif = Platform.OS === 'web' ? null : requireOptionalNativeModule<ModuleDeLApplication>('ExpoApplication');
    return versionDeLApp(natif?.nativeApplicationVersion ?? Constants.expoConfig?.version, natif?.nativeBuildVersion);
  } catch {
    return undefined;
  }
}

// ── Le signalement ────────────────────────────────────────────────────────────────────────────────

const doitPartir = trierLesPannes();

/** La panne, si elle est à signaler dans ce lancement (`trierLesPannes`) ; `null` sinon. */
function panneASignaler(erreur: unknown, origine: OrigineDUnePanne, chemin: string): PanneSignalee | null {
  const panne = laPanne(erreur, origine, chemin, versionDeCetteApp());
  return doitPartir(signatureDeLaPanne(panne)) ? panne : null;
}

/**
 * Signale une panne tout de suite — gardée sur l'appareil si elle ne peut pas partir (`track`). Ne lève
 * jamais, et ne s'attend pas : c'est appelé depuis les filets, où plus personne ne rattrape rien.
 */
export function signalerUnePanne(erreur: unknown, origine: OrigineDUnePanne, chemin: string = routeCourante): void {
  try {
    const panne = panneASignaler(erreur, origine, chemin);
    if (panne) track('app_error', panne);
  } catch {
    // Une mesure qui échoue ne doit pas ajouter une panne à la panne.
  }
}

/** La panne fatale, gardée pour le lancement suivant : la promesse de l'écriture, ou `null` s'il n'y a rien à garder. */
function garderPourLeLancementSuivant(erreur: unknown): Promise<void> | null {
  try {
    const panne = panneASignaler(erreur, 'fatale', routeCourante);
    return panne ? garderUnePanne(panne) : null;
  } catch {
    return null;
  }
}

// ── Les écoutes ───────────────────────────────────────────────────────────────────────────────────

type GestionnaireDErreur = (erreur: unknown, fatale?: boolean) => void;
type ErrorUtilsDeReactNative = {
  getGlobalHandler(): GestionnaireDErreur;
  setGlobalHandler(gestionnaire: GestionnaireDErreur): void;
};
type OptionsDuSuivi = {
  allRejections: boolean;
  onUnhandled: (id: number, raison?: unknown) => void;
  onHandled: (id: number) => void;
};
type HermesInterne = {
  hasPromise?: () => boolean;
  enablePromiseRejectionTracker?: (options: OptionsDuSuivi) => void;
};
type Fenetre = {
  addEventListener(type: 'error', ecoute: (evenement: { error?: unknown; filename?: string }) => void): void;
  addEventListener(type: 'unhandledrejection', ecoute: (evenement: { reason?: unknown }) => void): void;
  location: { origin: string };
};

/** Ce dont l'installation dépend, injecté par les tests ; l'app prend les valeurs par défaut. */
export type EnvironnementDesPannes = {
  enDeveloppement: boolean;
  plateforme: string;
  global: {
    ErrorUtils?: ErrorUtilsDeReactNative;
    HermesInternal?: HermesInterne;
    window?: Fenetre;
  };
};

let installee = false;

/**
 * Pose les écoutes, une fois par chargement du bundle — appelée au chargement du layout racine. Ne lève
 * jamais : c'est le module que tout l'arbre importe, et une écoute qui ne se pose pas ne doit pas
 * emporter l'app.
 */
export function installerLaRemonteeDesPannes(environnement: Partial<EnvironnementDesPannes> = {}): void {
  const { enDeveloppement = __DEV__, plateforme = Platform.OS, global = globalThis as EnvironnementDesPannes['global'] } =
    environnement;
  if (installee || enDeveloppement) return;
  installee = true;
  try {
    if (plateforme === 'web') {
      // Pendant l'export statique, le layout se charge sous Node : il n'y a pas de fenêtre.
      if (global.window) ecouterLeNavigateur(global.window);
    } else {
      if (global.ErrorUtils) chainerLeGestionnaireGlobal(global.ErrorUtils);
      suivreLesRejetsDeHermes(global.HermesInternal);
    }
  } catch {
    // Sans écoute, l'app tourne comme avant ; seul le rendu remonte ses pannes.
  }
}

/**
 * **Chaîné, jamais remplacé** : le gestionnaire d'avant est appelé pour chaque panne, avec ses deux
 * arguments, et c'est lui qui fait ce que React Native fait — l'écran rouge en développement (que ce module
 * n'atteint pas), la fermeture de l'app sur une panne fatale. Une panne non fatale part tout de suite et
 * passe aussitôt au gestionnaire d'avant ; une panne fatale attend son écriture (en-tête).
 */
function chainerLeGestionnaireGlobal(errorUtils: ErrorUtilsDeReactNative): void {
  const precedent = errorUtils.getGlobalHandler();
  // Une panne fatale déjà en cours de fermeture : une autre arrive pendant l'attente — le gestionnaire
  // d'avant qui lève depuis la promesse, par exemple —, et elle passe sans attendre.
  let fermetureEnCours = false;

  errorUtils.setGlobalHandler((erreur, fatale) => {
    let attente: Promise<void> | null = null;
    try {
      if (!fatale) signalerUnePanne(erreur, 'globale');
      else if (!fermetureEnCours) attente = garderPourLeLancementSuivant(erreur);
    } catch {
      attente = null;
    }
    if (!attente) {
      precedent(erreur, fatale);
      return;
    }

    fermetureEnCours = true;
    let rendue = false;
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    const rendre = () => {
      if (rendue) return;
      rendue = true;
      clearTimeout(minuterie);
      try {
        precedent(erreur, fatale);
      } finally {
        fermetureEnCours = false;
      }
    };
    minuterie = setTimeout(rendre, DELAI_AVANT_LA_FIN_MS);
    attente.then(rendre, rendre);
  });
}

/**
 * Le suivi des rejets de Hermes, **en production seulement** (l'appelant l'a vérifié) : React Native ne
 * l'active qu'en développement, où il pose l'avertissement jaune, et un rejet que personne n'attend se
 * perd sinon sans un mot. Un rejet rattrapé plus tard (`onHandled`) a déjà été signalé, et le reste.
 */
function suivreLesRejetsDeHermes(hermes: HermesInterne | undefined): void {
  if (!hermes?.hasPromise?.() || !hermes.enablePromiseRejectionTracker) return;
  hermes.enablePromiseRejectionTracker({
    allRejections: true,
    onUnhandled: (_id, raison) => signalerUnePanne(raison, 'promesse'),
    onHandled: () => undefined,
  });
}

/**
 * Le web : `error` pour une exception que personne n'a rattrapée — l'onglet reste ouvert, elle part tout
 * de suite —, et `unhandledrejection`. Ni l'une ni l'autre n'est empêchée : la console du navigateur la
 * montre comme avant. Une erreur d'un autre script et une erreur d'hydratation ne se signalent pas
 * (`laPanneEstANous`, `estUneErreurDHydratation`).
 */
function ecouterLeNavigateur(fenetre: Fenetre): void {
  fenetre.addEventListener('error', (evenement) => {
    const aUneErreur = evenement.error !== undefined && evenement.error !== null;
    if (!laPanneEstANous({ aUneErreur, fichier: evenement.filename, origine: fenetre.location.origin })) return;
    if (estUneErreurDHydratation(evenement.error)) return;
    signalerUnePanne(evenement.error, 'globale');
  });
  fenetre.addEventListener('unhandledrejection', (evenement) => signalerUnePanne(evenement.reason, 'promesse'));
}
