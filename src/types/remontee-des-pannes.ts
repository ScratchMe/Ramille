/**
 * Ce qu'on retient d'une panne, et lesquelles on signale — `docs/exploitation/remontee-erreurs.md`.
 *
 * Module **pur** : les écoutes (le gestionnaire global de React Native, le suivi des promesses de
 * Hermes, les événements du navigateur) et l'envoi vivent dans `src/lib/remontee-des-pannes.ts`.
 *
 * ## Ce qui part, et rien d'autre
 *
 * Une panne se réduit à des valeurs que le code produit : la **catégorie**, tirée du nom de la classe
 * de l'exception (`appErrorCategory`) ; la **route**, ramenée aux chemins du produit ; l'**origine**,
 * posée par l'écoute qui l'a reçue ; la **version** de l'app. Le message et la pile restent sur
 * l'appareil : un message est du texte libre, qui peut porter une saisie, une adresse, un identifiant.
 * Ce module lit le message pour **une** chose — reconnaître une erreur d'hydratation de React, qui ne
 * se signale pas — et ne le rend jamais.
 */
import { PAGE_TITLES } from '@/constants/page-titles';
import {
  appErrorCategory,
  MAX_PROP_VALUE_LENGTH,
  type AppErrorCategory,
  type OrigineDUnePanne,
} from '@/types/analytics';

/** Ce qui part d'une panne : les propriétés d'`app_error` posées au moment où elle arrive. */
export type PanneSignalee = {
  category: AppErrorCategory;
  route: string;
  origine: OrigineDUnePanne;
  version?: string;
};

/**
 * **La route est un chemin du produit, jamais l'adresse que la personne a tapée.** `usePathname()` rend
 * l'adresse demandée telle quelle sur la page introuvable : une panne survenue là partait avec ce qu'on
 * avait tapé dans la barre d'adresse — une adresse électronique, un nom. Le produit n'a aucune route
 * dynamique (`CLAUDE.md`), donc la table des titres (`PAGE_TITLES`) énumère tous ses chemins, et ce qui
 * n'y est pas se dit `/+not-found`. La chaîne de requête et le fragment ne font jamais partie du chemin.
 */
export function routeDeLaPanne(chemin: string | null | undefined): string {
  if (!chemin) return '/';
  const sansRequete = chemin.split(/[?#]/)[0] ?? '';
  const nu = sansRequete.length > 1 && sansRequete.endsWith('/') ? sansRequete.slice(0, -1) : sansRequete;
  if (nu === '') return '/';
  return Object.prototype.hasOwnProperty.call(PAGE_TITLES, nu) ? nu : '/+not-found';
}

/**
 * La version de l'app, et le numéro de son build quand la plateforme le donne : `1.0.0+14`.
 *
 * **Le numéro de build est ce qui distingue deux builds** : la version d'`app.json` ne change qu'à la main,
 * alors qu'EAS incrémente le numéro à chaque build de production (`eas.json`, `autoIncrement`). Sur le web,
 * il n'y en a pas, et la version vient seule. Les deux viennent du système ou de la configuration, jamais
 * de la personne ; une valeur d'une autre forme est ignorée plutôt qu'envoyée.
 */
export function versionDeLApp(version: unknown, build: unknown): string | undefined {
  if (typeof version !== 'string' || !/^[0-9A-Za-z.-]{1,24}$/.test(version)) return undefined;
  const avecBuild = typeof build === 'string' && /^[0-9A-Za-z.]{1,16}$/.test(build) ? `${version}+${build}` : version;
  return avecBuild.slice(0, MAX_PROP_VALUE_LENGTH);
}

/** La panne telle qu'elle part, depuis ce que l'écoute a reçu. */
export function laPanne(
  erreur: unknown,
  origine: OrigineDUnePanne,
  chemin: string | null | undefined,
  version: string | undefined
): PanneSignalee {
  return {
    category: appErrorCategory(erreur),
    route: routeDeLaPanne(chemin),
    origine,
    ...(version ? { version } : {}),
  };
}

/** Deux pannes de même signature sont la même panne : une boucle de rendu, un minuteur qui relève. */
export function signatureDeLaPanne(panne: PanneSignalee): string {
  return `${panne.origine}|${panne.category}|${panne.route}`;
}

/** Au plus autant de pannes signalées par lancement — même distinctes. */
export const PANNES_PAR_LANCEMENT = 10;

/**
 * Le tri des pannes d'un lancement : une signature ne part qu'une fois, et pas plus de
 * `PANNES_PAR_LANCEMENT` en tout. **Une panne qui se répète n'est pas plus grave à chaque fois** : une
 * exception levée dans un rendu que « Réessayer » relance, ou par un minuteur, partait autant de fois
 * qu'elle tombait, et une seule personne pouvait remplir le plafond horaire des pannes de tout le projet
 * (300, `20261004201217`) — celles des autres ne passaient plus. Chaque lancement repart à zéro : une
 * panne qui revient à chaque ouverture se compte une fois par ouverture.
 */
export function trierLesPannes(plafond = PANNES_PAR_LANCEMENT): (signature: string) => boolean {
  const vues = new Set<string>();
  return (signature) => {
    if (vues.has(signature) || vues.size >= plafond) return false;
    vues.add(signature);
    return true;
  };
}

/**
 * **Sur le web, une erreur qui n'a pas d'objet ou qui vient d'un autre script n'est pas à nous.** Le
 * navigateur rend « Script error. », sans erreur ni fichier, pour toute exception d'un script d'une autre
 * origine (Cloudflare pour le captcha) ; et une extension du navigateur lève depuis `chrome-extension://`
 * ou `moz-extension://`. Les signaler compterait des pannes que rien chez nous ne peut réparer. Un fichier
 * absent (un gestionnaire qui lève depuis une évaluation) reste à nous.
 */
export function laPanneEstANous(evenement: { aUneErreur: boolean; fichier: string | undefined; origine: string }): boolean {
  if (!evenement.aUneErreur) return false;
  if (!evenement.fichier) return true;
  return evenement.fichier.startsWith(`${evenement.origine}/`) || evenement.fichier === evenement.origine;
}

/**
 * Les erreurs d'hydratation de React, que la page rattrape d'elle-même (`EXPO.md` §1.4) — la même
 * reconnaissance que `scripts/verifier-rendu-export.mjs`, qui les tient pour des avertissements.
 *
 * **Elles arrivent par le même événement qu'une vraie panne** : React 19 les rend à
 * `window.reportError` (`defaultOnRecoverableError`), comme une exception que personne n'a rattrapée.
 * Signalées, une seule page dont le HTML diffère du premier rendu en écrirait une à chaque chargement,
 * chez chaque visiteur, et prendrait la place des vraies dans le plafond horaire.
 */
const HYDRATATION = /Minified React error #(418|419|420|421|422|423|425)\b|hydrat/i;

export function estUneErreurDHydratation(erreur: unknown): boolean {
  const message = erreur instanceof Error ? erreur.message : typeof erreur === 'string' ? erreur : '';
  return HYDRATATION.test(message);
}
