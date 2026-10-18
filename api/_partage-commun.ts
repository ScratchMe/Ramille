// Ce que partagent `api/partage.ts` (runtime Edge, la page) et `api/share-card.ts` (runtime Node.js,
// l’image) : ce qu’une adresse de partage a le droit de dire, et la façon de la ramener à une forme
// unique. Les deux fonctions lisent la même URL, et un aperçu dont le titre et l’image ne s’accordent
// pas est exactement ce qu’une copie de ces règles dans chaque fichier finissait par produire.
//
// **Pourquoi ce fichier est dans `api/`, et préfixé par `_`.** Vercel fait une fonction de chaque
// fichier de `api/` — un module commun hors du dossier serait sorti du `tsconfig` des fonctions et de
// leurs règles de lint —, sauf de ceux dont le nom commence par `_`. Un fichier sans ce préfixe
// deviendrait une route publique et un troisième déploiement. `scripts/verifier-api.mjs` refuse tout
// fichier de `api/` qui n’est ni une des deux fonctions ni préfixé.
//
// **Et pourquoi chaque import relatif d’`api/` se termine par `.js`.** Vercel compile le TypeScript
// sans réécrire les spécificateurs : `./_partage-commun.ts` partirait tel quel dans le `.js` déployé,
// où seul `_partage-commun.js` existe — `ERR_MODULE_NOT_FOUND` au premier appel, muet côté client
// (`VERCEL.md` §1.6). TypeScript résout `./x.js` vers `x.ts`, Node non : `verifier-api.mjs` lui
// apprend cette correspondance pour jouer le même code.
//
// Aucun import ici, et il n’en viendra pas : ce module est chargé par un runtime Edge (pas de `node:*`)
// et par la suite Jest, qui ne résout pas les `.js` vers des `.ts`.

/**
 * **Borne haute du total affichable, en tonnes.** `Number.parseFloat` acceptait un négatif, un zéro ou
 * un 1e40, et une URL fabriquée par un tiers rendait une page titrée « -5,0 t CO₂e par an — mon
 * empreinte transport », avec l’image et la marque du produit, indiscernable d’un vrai partage dans un
 * aperçu de messagerie. Au-delà de la borne, le total est ignoré comme s’il était absent.
 *
 * Ce n’est **pas** une garde de sécurité : un total inventé entre 0 et 200 t reste un aperçu plausible,
 * et seule une chaîne de requête signée fermerait la fabrication des chiffres.
 */
export const TOTAL_TONNES_MAX = 200;

export const CHEMIN_PAGE = '/api/partage';
export const CHEMIN_CARTE = '/api/share-card';

// **`poste` est une liste fermée** : les libellés que `dominantShareLabel` (`src/types/resultat.ts`)
// sait produire — un poste, suivi ou non de la préposition de son mode —, et rien d’autre. Il était du
// texte libre : n’importe qui fabriquait un aperçu aux couleurs du produit, portant la phrase de son
// choix sous « Poste principal ». Un libellé inconnu est ignoré, et la page comme la carte retombent
// sur leur forme sans poste.
//
// `scripts/postes-partageables.test.ts` exige que chaque libellé que l’app produit soit accepté.
// L’inverse n’est pas exigé, et c’est voulu : un libellé que l’app ne produit plus garde lisibles les
// liens déjà partagés.
export const POSTES_PARTAGEABLES = [
  'Trajet domicile-travail',
  'Loisirs du week-end',
  'Loisirs occasionnels',
  'Voyages longue distance',
];

export const MODES_PARTAGEABLES = [
  'en voiture',
  'en voiture thermique',
  'en voiture électrique',
  'en voiture hybride',
  'en voiture hybride rechargeable',
  'en deux-roues motorisé',
  'en scooter thermique',
  'en scooter électrique',
  'en moto de petite cylindrée',
  'en moto de grosse cylindrée',
  'en train',
  'en TER',
  'en RER ou Transilien',
  'en Intercités',
  'en TGV',
  'en bus',
  'en métro ou tram',
  'à vélo',
  'à vélo électrique',
  'à pied',
  'en trottinette',
  'en autocar',
  'en avion (court/moyen-courrier)',
  'en avion long-courrier',
];

export function posteFerme(brut: string | null): string | null {
  if (!brut) return null;
  for (const poste of POSTES_PARTAGEABLES) {
    if (brut === poste) return poste;
    if (brut.startsWith(`${poste} `) && MODES_PARTAGEABLES.includes(brut.slice(poste.length + 1))) {
      return brut;
    }
  }
  return null;
}

/**
 * **La règle des kilos sous la tonne, recopiée depuis `src/lib/format.ts`.** `api/` ne peut pas
 * importer `src/` (tsconfig dédié, runtime Web Fetch API), donc la règle se duplique une fois, ici, et
 * `scripts/postes-partageables.test.ts` la confronte à `formatTonnes`. Sans cette bascule, un bilan de
 * 40 kg partait avec un texte disant « 40 kg CO₂e » et une carte titrée « 0,0 t CO₂e » : les deux
 * chiffres du même partage se contredisaient.
 *
 * Le paramètre arrive en **tonnes** (cf. `urlDePartage`), la règle raisonne en kilos : l’arrondi vient
 * avant la comparaison, donc 0,9996 t est une tonne et non « 1000 kg ». Le libellé est rendu entier,
 * unité comprise, parce que l’unité dépend de la valeur.
 */
export function libelleDuTotal(tonnes: number): string {
  const kilos = Math.round(tonnes * 1000);
  if (kilos < 1000) return `${kilos} kg CO₂e`;
  return `${tonnes.toFixed(1).replace('.', ',')} t CO₂e`;
}

export type ParametresDePartage = {
  total: number | null;
  poste: string | null;
  percent: number | null;
};

export type LectureDePartage =
  | {
      statut: 'lisible';
      parametres: ParametresDePartage;
      /** La chaîne de requête canonique, sans le `?`, vide quand il n’y a rien à dire. */
      query: string;
      /** L’adresse reçue **est** la forme canonique : sinon, elle se redirige vers elle. */
      canonique: boolean;
    }
  | { statut: 'illisible'; motif: string };

// Ce que l’app envoie (`urlDePartage`) : un décimal positif, un entier. Rien d’autre n’est lu — ni
// exposant, ni signe, ni espace, ni suite après le nombre.
const FORME_DU_TOTAL = /^\d{1,12}(?:\.\d{1,12})?$/;
const FORME_DE_LA_PART = /^\d{1,12}$/;

/**
 * Lit la chaîne de requête d’une adresse de partage, et la ramène à **une** forme.
 *
 * **Pourquoi une forme unique.** Le CDN de Vercel garde une réponse par adresse complète : tout ce
 * qui change l’adresse sans changer l’image est une entrée de cache neuve, donc un rendu complet
 * (satori + resvg) payé en invocations. `parseFloat` lisait le préfixe numérique de `4.2 n’importe
 * quoi`, `parseInt` celui de `58abc`, un paramètre inconnu traversait, l’ordre et l’encodage étaient
 * libres. Chaque variante coûtait un rendu, sous un pare-feu qui compte les requêtes et non les
 * clés de cache.
 *
 * La forme canonique est celle que l’app produit (`total` à trois décimales, `poste`, `percent`, dans
 * cet ordre, sérialisés par `URLSearchParams`). Trois issues :
 *  - **lisible et canonique** : l’adresse est servie telle quelle ;
 *  - **lisible, pas canonique** : l’appelant redirige (308) vers `query`. C’est le cas d’un paramètre
 *    inconnu (`fbclid`, `utm_*` que les réseaux ajoutent aux liens), d’un total à une décimale (les
 *    liens d’avant les trois décimales), d’une valeur vide, d’un ordre ou d’un encodage différent —
 *    et d’une valeur bien formée mais qu’aucun partage de l’app ne porte : total au-delà de la borne,
 *    part au-delà de 100, libellé hors de la liste. Celles-là sont **ignorées**, comme elles l’ont
 *    toujours été, plutôt que refusées : le lien d’un poste renommé continue d’ouvrir son aperçu ;
 *  - **illisible** : un total ou une part qui n’est pas un nombre de la forme ci-dessus, ou un
 *    paramètre répété. On n’en devine pas le sens — deviner le préfixe d’un texte, c’est la faille —,
 *    l’appelant répond 400.
 */
export function lireLaRequete(recherche: string): LectureDePartage {
  const params = new URLSearchParams(recherche.startsWith('?') ? recherche.slice(1) : recherche);

  for (const nom of ['total', 'poste', 'percent']) {
    if (params.getAll(nom).length > 1) return { statut: 'illisible', motif: `${nom} répété` };
  }

  let total: number | null = null;
  const brutTotal = params.get('total');
  if (brutTotal) {
    if (!FORME_DU_TOTAL.test(brutTotal)) return { statut: 'illisible', motif: 'total illisible' };
    const lu = Number(brutTotal);
    // La borne se juge sur la valeur reçue, l’arrondi vient après : 200,0004 t reste 200 t.
    if (lu <= TOTAL_TONNES_MAX) total = Number(lu.toFixed(3));
  }

  let percent: number | null = null;
  const brutPart = params.get('percent');
  if (brutPart) {
    if (!FORME_DE_LA_PART.test(brutPart)) return { statut: 'illisible', motif: 'percent illisible' };
    const lu = Number(brutPart);
    if (lu <= 100) percent = lu;
  }

  const poste = posteFerme(params.get('poste'));

  const canonique = new URLSearchParams();
  if (total !== null) canonique.set('total', total.toFixed(3));
  if (poste) canonique.set('poste', poste);
  if (percent !== null) canonique.set('percent', String(percent));
  const query = canonique.toString();

  return {
    statut: 'lisible',
    parametres: { total, poste, percent },
    query,
    canonique: recherche.replace(/^\?/, '') === query,
  };
}

// **Ce que le CDN de Vercel garde, et ce qu’il ne garde pas.** Une réponse de fonction n’est mise en
// cache que si son `Cache-Control` porte `s-maxage` : `max-age` seul ne parle qu’au navigateur, et
// c’était tout ce que portait la carte. Le cache est propre à chaque déploiement (l’identifiant du
// déploiement fait partie de la clé), donc une durée longue ne fige rien d’une version à l’autre.
//
//  - la page ne dépend que de l’adresse : `max-age=0` pour que le navigateur revienne au CDN, un an
//    côté CDN ;
//  - la carte aussi, et le navigateur la garde un an (`immutable`) ;
//  - une redirection est une réponse déterministe elle aussi, mais courte : sa cible est une règle de
//    lecture, qu’une version suivante peut resserrer ;
//  - **un 400 et un repli ne se gardent jamais** : le CDN ne cache de toute façon pas un 400, et le
//    repli d’une panne passagère ne doit pas se figer sur cette adresse.
export const CACHE_PAGE = 'public, max-age=0, s-maxage=31536000, stale-while-revalidate=86400';
export const CACHE_CARTE =
  'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable, no-transform';
export const CACHE_REDIRECTION = 'public, max-age=0, s-maxage=86400';
export const CACHE_JAMAIS = 'no-store';

// `noindex` sur toutes les réponses : la raison est dans `api/partage.ts`.
const ROBOTS = 'noindex, nofollow';

/**
 * 308 vers la forme canonique, par un chemin **relatif** : la cible ne dépend ni de l’en-tête `Host`
 * (client) ni de la forme de `request.url`, absolue en Edge et relative en Node.js. 308 plutôt que
 * 301 : la méthode est conservée, et les lecteurs d’aperçu suivent l’un comme l’autre.
 */
export function reponseRedirection(chemin: string, query: string): Response {
  return new Response(null, {
    status: 308,
    headers: {
      location: query === '' ? chemin : `${chemin}?${query}`,
      'cache-control': CACHE_REDIRECTION,
      'x-robots-tag': ROBOTS,
    },
  });
}

/** 400 : l’adresse n’a pas de sens qu’on puisse lui donner. Le corps ne dit pas quel paramètre. */
export function reponseIllisible(): Response {
  return new Response('Adresse de partage illisible.\n', {
    status: 400,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': CACHE_JAMAIS,
      'x-robots-tag': ROBOTS,
    },
  });
}
