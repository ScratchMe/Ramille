// Ce que l'absence de session veut dire — C2.11, constats C-2, A6-15, A6-16.
//
// Module **pur** : aucune importation de `@/lib/supabase`, pour la raison donnée en tête de
// `src/types/bilan.ts` (ce module tire AsyncStorage, `react-native` et un polyfill d'URL, qui
// n'ont rien à faire dans une suite de logique pure).
//
// ## Pourquoi cette dérivation existe
//
// `ensureSession()` faisait un raisonnement à deux branches : une session, ou pas de session —
// et dans le second cas elle en créait une anonyme. Or « pas de session » recouvre **trois**
// situations qui n'appellent pas la même réponse, et les confondre a deux coûts distincts :
//
//   * **personne n'est encore passé** (`absente`) — c'est le cas nominal d'une première ouverture,
//     et créer une session anonyme est exactement ce qu'il faut faire ;
//   * **le jeton stocké a été refusé** (`refusee`) — la session d'un compte réel vient d'être
//     rejetée. Créer une session anonyme ici donne un compte **vide** à quelqu'un qui en a un, et
//     rend le sien inatteignable autrement que par `/connexion/retrouver` : son bilan, son plan et
//     ses points sont toujours là, mais l'app affiche « Ton bilan n'est pas encore fait ». C'est la
//     moitié serveur du défaut que C2.11 ferme côté écran ;
//   * **le rafraîchissement n'a pas abouti** (`indisponible`) — une panne de transport, pas un
//     refus. Créer une session anonyme sur un réseau coupé produirait le même compte orphelin, pour
//     une cause qui disparaîtra d'elle-même ; et dire « reconnecte-toi » reprocherait à la personne
//     ce que le réseau a fait. On ne fait donc **rien**, et le prochain lancement réessaie.
//
// **Le refus a deux formes, et la première version n'en lisait qu'une** (02/10/2026, `v1-27` §12.27).
// `getSession()` peut rendre l'erreur d'un rafraîchissement refusé (`GoTrueClient.__loadSession`) ;
// mais au démarrage, sur un jeton d'accès déjà expiré, c'est l'initialisation d'`auth-js` qui le
// rafraîchit, essuie le refus et **retire la session elle-même**, avant toute lecture : `getSession()`
// ne voit plus ni session ni erreur, exactement comme à une première ouverture. Ce qui les sépare,
// c'est que l'appareil **portait un compte rattaché** — une marque locale que seuls les départs voulus
// effacent (`src/lib/marque-de-compte.ts`) : c'est `porteUnCompte`. Une session **anonyme** refusée
// (purgée au bout de 120 jours, révoquée) ne la porte pas, et reste une première ouverture : elle n'a
// aucun compte à retrouver — **dans la forme du démarrage**. Quand c'est `getSession()` qui rend
// l'erreur (un processus resté vivant, rare : une lecture passe d'ordinaire avant lui), le refus se
// dit sans consulter la marque, anonyme compris. Mesuré sur l'export, puis reproduit sur le client réel par
// `src/lib/session-refusee.test.ts`. Les quatre états sont donc atteignables — aucun n'est décoratif.

import { estPanneDeTransport, type ErreurAuth } from '@/types/connexion';
import type { Plateforme } from '@/types/rappels';

export type EtatDeSession =
  /** Une session est là, anonyme ou rattachée. Rien à faire. */
  | 'presente'
  /** Aucune session, et aucune raison : première ouverture. C'est le moment d'en créer une. */
  | 'absente'
  /** Le jeton stocké a été refusé. **Ne pas créer de session anonyme** : on couvrirait un compte. */
  | 'refusee'
  /** Le rafraîchissement n'a pas abouti. Ni création, ni reproche — le prochain lancement réessaie. */
  | 'indisponible';

/**
 * Ce que rend `supabase.auth.getSession()`, et ce que l'appareil sait du compte qu'il portait, traduit en décision.
 *
 * `porteUnCompte` : l'appareil portait un compte rattaché, et aucun départ voulu ne l'a quitté (voir
 * l'en-tête). Sans session, c'est un refus, même sans erreur — le seul argument qui ne vient pas de
 * `getSession()`.
 *
 * `aUneSession` plutôt que la session elle-même : ce module ne doit rien savoir du type `Session`
 * d'`auth-js`, et la seule chose qui compte ici est qu'il y en ait une.
 */
export function etatDeSession(aUneSession: boolean, error: ErreurAuth, porteUnCompte: boolean): EtatDeSession {
  if (aUneSession) return 'presente';
  if (!error) return porteUnCompte ? 'refusee' : 'absente';
  return estPanneDeTransport(error) ? 'indisponible' : 'refusee';
}

/**
 * Faut-il ouvrir une session anonyme ?
 *
 * Écrit comme une fonction et non lu en `=== 'absente'` sur les quatre appels : c'est **la** règle
 * que ce module existe pour tenir, et une comparaison recopiée ailleurs la perdrait. La réponse est
 * non dans les trois autres cas, et pour trois raisons différentes.
 */
export function doitOuvrirUneSessionAnonyme(etat: EtatDeSession): boolean {
  return etat === 'absente';
}

/**
 * **Les surfaces publiques et de service** — `/compte/suppression` (exigée par Google Play),
 * `/rappels/stop` (le lien de désinscription d'un e-mail), `/confidentialite`, `/conditions`, `/licences`,
 * `/status` : elles ne demandent pas de compte. Deux règles s'en déduisent, et une seule liste les porte, pour
 * qu'une page ne soit jamais publique pour l'une et pas pour l'autre :
 *
 *   * **l'écran de reconnexion ne s'y pose pas**, même pendant un refus (`lEcranDeReconnexionSePose`) :
 *     la surcouche cachait la confirmation d'une désinscription déjà partie ;
 *   * **leur ouverture ne crée pas de session** (`laSessionSOuvreSur`, 18/10/2026) : un navigateur neuf
 *     qui lit la politique de confidentialité — l'examinateur de Play, quelqu'un qui a désinstallé l'app —
 *     recevait un compte anonyme, et le captcha qui le précède. Aucune n'en a besoin : les pages légales
 *     (les licences comprises : une liste générée, sans lecture ni écriture) ne lisent rien, `/status` lit un référentiel public, `/rappels/stop` appelle un RPC ouvert à `anon`
 *     (le jeton du lien autorise), et `/compte/suppression` ouvre la session du compte par le code reçu —
 *     une session anonyme créée là n'était pas celle de la personne. Une session déjà là se restaure.
 *
 * **`/feedback` n'en est pas** : il écrit un retour rattaché à la session (`sendFeedback`), et sans elle
 * « Envoyer » répondrait sans fin « Ta session n'est pas prête » — l'écran de reconnexion y dit mieux ce
 * qui manque. Ni la page introuvable : `usePathname()` y rend l'adresse tapée, qu'aucune liste ne nomme.
 *
 * Écrit comme une liste, et non comme « les routes qui ont besoin du compte » : une route neuve se
 * couvre par défaut, et c'est le cas sûr — l'écran dit vrai partout où un compte manque, et la session
 * s'ouvre partout où l'app peut écrire.
 */
const SURFACES_SANS_COMPTE = [
  '/compte/suppression',
  '/rappels/stop',
  '/confidentialite',
  '/conditions',
  '/licences',
  '/status',
] as const;

/** Le chemin sans sa barre finale : `/confidentialite/` est la même page. */
function cheminNu(chemin: string): string {
  return chemin.length > 1 && chemin.endsWith('/') ? chemin.slice(0, -1) : chemin;
}

function estUneSurfaceSansCompte(chemin: string): boolean {
  return (SURFACES_SANS_COMPTE as readonly string[]).includes(cheminNu(chemin));
}

/**
 * L'écran de reconnexion se pose-t-il sur cette route ? Non sur les surfaces sans compte, ni sur
 * **`/connexion/…`** : c'est là que la personne va se reconnecter. L'écran s'efface quand elle y part, et
 * revient si elle en ressort sans session — sans quoi un « Retour » vers le plan la laissait devant un
 * plan illisible, sans rien pour le dire (contre-lecture de la PR #315).
 */
export function lEcranDeReconnexionSePose(chemin: string): boolean {
  if (chemin === '/connexion' || chemin.startsWith('/connexion/')) return false;
  return !estUneSurfaceSansCompte(chemin);
}

/**
 * Le montage de l'app ouvre-t-il une session sur cette route, ou se contente-t-il de restaurer celle qui
 * est là ? Il l'ouvre partout sauf sur les surfaces sans compte ; **quitter l'une d'elles pour l'app
 * l'ouvre** — le layout racine relit cette règle à chaque changement de route —, et toute écriture la
 * garantit de toute façon avant de partir (`ensureSession()`).
 *
 * **Ni sur la racine du web, depuis qu'elle est une page d'accueil** (23/10/2026, étape 5 de
 * `docs/architecture/v1-35-l-audit-en-chantiers.md`). Un navigateur neuf y lit la présentation du
 * produit, et la session s'ouvre au premier pas dans l'app — « Découvrir mon impact » mène à
 * l'onboarding, où ce montage l'ouvre. Sans quoi chaque visite de ramille.fr, robots compris, créait un
 * compte anonyme et passait par le captcha. **Elle n'est pas pour autant une surface sans compte** : qui
 * revient avec une session refusée y voit l'écran de reconnexion, comme avant, parce que c'est une
 * personne qui a un compte, et la racine décide d'après la session restaurée (`src/app/index.tsx`). Sur
 * natif, la racine n'affiche rien et ouvre la session comme partout.
 */
export function laSessionSOuvreSur(chemin: string, plateforme: Plateforme): boolean {
  if (plateforme === 'web' && cheminNu(chemin) === '/') return false;
  return !estUneSurfaceSansCompte(chemin);
}

/**
 * Ce que la racine fait une fois la session demandée, selon l'état qu'elle a laissé (`v1-27` §12.35).
 *
 *   * **`lire`** — une session est là : la racine lit le dernier bilan ;
 *   * **`attendre`** — un refus : sans session la lecture partirait en `anon`, et l'écran technique se
 *     poserait sous l'écran de reconnexion, qui décide ;
 *   * **`repli`** — la session n'a pas pu se rafraîchir (`indisponible`, réseau coupé ou serveur
 *     d'authentification en panne) : la racine route comme hors ligne, sur ce que l'appareil sait. Elle
 *     lisait le bilan quand même, en `anon`, recevait un `42501`, et disait « Le démarrage a échoué »
 *     là où le repli était dû (`COMPTE.md` §3) ;
 *   * **`sansSession`** — personne n'est passé, **et la racine n'a rien tenté d'ouvrir** : c'est la
 *     racine du web, qui ne fait que restaurer (`laSessionSOuvreSur`, 23/10/2026). Il n'y a rien à lire,
 *     et la réponse est connue sans aller-retour : sans session, aucun bilan n'existe
 *     (`LECTURE_SANS_SESSION`, `src/types/demarrage.ts`). Ce n'est pas un repli : la marque locale de
 *     bilan n'y décide pas, elle enverrait au plan quelqu'un qui n'a plus de session.
 *
 * **Quand la racine a tenté d'ouvrir** (natif), `absente` veut dire autre chose : la création a échoué
 * par une coupure de transport, que la racine a attrapée, et l'état est resté celui d'avant la tentative.
 * C'est un repli, où la marque locale décide comme hors ligne (C4.5) — contre-lecture du 23/10/2026, qui
 * a vu cette coupure tomber dans `sansSession`, sur natif, où rien ne devait changer.
 */
export type SuiteDuDemarrage = 'lire' | 'attendre' | 'repli' | 'sansSession';

export function suiteDuDemarrage(etat: EtatDeSession, ouvertureTentee: boolean): SuiteDuDemarrage {
  switch (etat) {
    case 'presente':
      return 'lire';
    case 'refusee':
      return 'attendre';
    case 'indisponible':
      return 'repli';
    case 'absente':
      return ouvertureTentee ? 'repli' : 'sansSession';
    default: {
      const inconnu: never = etat;
      throw new Error(`État de session inconnu : ${String(inconnu)}`);
    }
  }
}

/**
 * Quand l'enregistrement du jeton d'appareil se tente — `src/app/_layout.tsx`.
 *
 * **Le jeton appartient à la personne connectée, pas à l'appareil** : `register_push_token` le reprend à
 * son propriétaire précédent, et l'appareil doit se réinscrire à chaque changement d'utilisateur, sans
 * quoi il reçoit les rappels de celui qu'on vient de quitter (A4-7). `onAuthStateChange` émet aussi à
 * chaque rafraîchissement de jeton, une fois l'heure : la garde fait qu'un même utilisateur ne relance
 * rien, et qu'un enregistrement en cours ne se double pas.
 *
 * **Un enregistrement qui n'a pas inscrit de jeton se retente au retour au premier plan** (`'retour'`), et
 * au démarrage suivant, qui repart d'une garde neuve — jamais à l'émission d'une session, ni de lui-même :
 * un échec n'ouvre pas de boucle. La garde ne se fondait que sur une exception, alors que
 * l'enregistrement rend `false` sur ses échecs courants (pas de réseau, le RPC refusé), donc un échec
 * passait pour fait jusqu'au démarrage à froid suivant. « Pas inscrit » couvre aussi la permission
 * refusée : la retenter au retour, c'est voir celle qu'on vient de rouvrir dans les réglages.
 *
 * **Une session qui devient nulle efface la mémoire** : la déconnexion désinscrit le jeton de cet
 * appareil (`seDeconnecterDeCetAppareil`), donc la personne qui se reconnecte dans le même lancement —
 * le même utilisateur — doit le réinscrire. La garde la croyait encore inscrite, et l'appareil restait
 * sans rappels jusqu'au démarrage à froid suivant.
 */
export type MomentDuJeton = 'session' | 'retour';

export function gardeDuJeton(
  enregistrer: () => Promise<boolean>
): (utilisateur: string | null, moment: MomentDuJeton) => Promise<void> {
  let pour: string | null = null;
  let enCours = false;
  let aRetenter = false;
  // Une génération plutôt que l'utilisateur : seul le dernier enregistrement lancé conclut, même quand
  // deux se suivent pour le même utilisateur (A, puis B, puis A de nouveau).
  let generation = 0;

  return async (utilisateur, moment) => {
    if (utilisateur === null) {
      pour = null;
      aRetenter = false;
      return;
    }
    if (utilisateur === pour && (enCours || !(moment === 'retour' && aRetenter))) return;
    pour = utilisateur;
    enCours = true;
    const mienne = ++generation;
    let inscrit = false;
    try {
      inscrit = await enregistrer();
    } catch {
      inscrit = false;
    }
    if (mienne !== generation) return;
    enCours = false;
    aRetenter = !inscrit;
  };
}
