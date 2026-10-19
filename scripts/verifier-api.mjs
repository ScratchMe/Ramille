// Les deux fonctions Vercel d'`api/` sont exercées ici, sous Node, à chaque PR — parce que leur
// seule boucle de retour était jusque-là un déploiement en production, et que leur échec y est muet
// (`FUNCTION_INVOCATION_FAILED` sans détail, cf. l'en-tête d'api/share-card.ts).
//
// `api/share-card.ts` (runtime Node.js, satori + resvg) et `api/partage.ts` (runtime Edge) tournent
// toutes deux en Web Fetch API : un `Request` entre, une `Response` sort. Node 22 exécute leur
// TypeScript tel quel (type stripping natif depuis 22.18), donc ce script les **importe** et les
// **appelle**, sans transpilation ni serveur — le même code que Vercel déploie, sur les mêmes
// polices (`api/fonts/`) et le même binaire wasm (`node_modules/@resvg/resvg-wasm`).
//
// Ce qu'il affirme, et pourquoi chaque assertion existe :
//   - **la carte rend par le vrai chemin, pas par son repli.** `GET` attrape tout et sert alors un
//     pixel en `no-store` : un satori cassé, une police absente, un wasm introuvable donneraient une
//     image valide et un statut 200. Le `cache-control` est la seule trace qui les distingue ;
//   - **1200 × 630**, lus dans l'IHDR du PNG — les dimensions que la page annonce en `og:image:*` ;
//   - **plus de 10 000 octets** : un aplat de la couleur du fond, sans un mot dessiné, tient en
//     quelques centaines d'octets et passerait les trois assertions du dessus ;
//   - **la page porte le chiffre dans son titre, et l'image du même `?…`** — les paramètres, pas la
//     chaîne au caractère près : `searchParams.toString()` ré-encode ;
//   - **hors de [0 ; 200] t, les deux côtés retombent** sur le libellé sans chiffre : la borne est
//     recopiée dans les deux fichiers, et un aperçu dont le titre et l'image ne s'accordent pas est
//     exactement ce que cette recopie promet d'éviter ;
//   - **40 kg et non 0,0 t** : la règle des kilos sous la tonne, recopiée de `src/lib/format.ts`
//     faute de pouvoir l'importer (constat A3-1, revenu par la porte de l'aperçu) ;
//   - **la carte rend aussi sur un chemin RELATIF** — la forme que Vercel donne à `request.url` en
//     runtime Node.js —, **elle y rend la même image qu'à l'absolue, et une autre qu'à vide.** Les
//     deux dernières se tiennent : l'égalité seule ne verrait pas une analyse qui perd la chaîne
//     de requête, puisqu'elle la perdrait sur les deux appels à la fois ; c'est la comparaison à
//     un rendu **sans paramètre** qui dit que la carte porte bien le chiffre de quelqu'un ;
//   - **un libellé forgé ne passe ni sur la page ni sur la carte** (`poste` en liste fermée) : la
//     page ne le reflète pas, la carte rend octet pour octet la carte sans poste, et un libellé de
//     l'app la change ;
//   - **une adresse a une forme, et une seule** (`api/_partage-commun.ts`). Le CDN de Vercel garde
//     une réponse par adresse complète : tout ce qui change l'adresse sans changer l'image était un
//     rendu payé de plus. La forme canonique est servie et gardée (`s-maxage` — `max-age` seul ne
//     parle qu'au navigateur) ; une variante lisible est redirigée en 308 vers elle, quinze
//     tournures sur la page comme sur la carte, et la même adresse dans un autre encodage est servie
//     comme elle, cinq écritures (19/10/2026 : Vercel décode avant la fonction) ; un paramètre sans sens (un texte derrière le
//     nombre, une valeur répétée) fait répondre 400 à la carte, jamais gardé, et la page l'ignore
//     — 308 vers la forme sans lui, servie : c'est la destination du lien qu'une personne a reçu ;
//     la forme canonique est un point fixe sur un balayage, pour les deux lectures — sinon la
//     redirection boucle sur l'adresse que l'app produit ;
//   - **une variante ne charge pas le wasm de resvg** : le jugement de la forme vient avant tout
//     rendu, sinon la redirection coûterait ce qu'elle doit éviter. La lecture du wasm est notée,
//     avec un témoin après le premier rendu ;
//   - **l'`og:image` que la page écrit est servie telle quelle par la carte**, pas redirigée ;
//   - **un repli n'est jamais gardé** (`no-store`), page comme carte ;
//   - **la disposition d'`api/`** : tout fichier qui n'est pas une des deux fonctions commence par
//     `_` (sinon Vercel le déploie), et tout import relatif se termine par `.js` et vise un `.ts`
//     (Vercel compile sans réécrire les spécificateurs). Node, lui, apprend ici que `./x.js` est
//     `x.ts`, via `registerHooks` — Node 22.15 ou plus, déjà exigé.
//
// **Éprouvé en le cassant, le 20/09/2026** (TESTING.md §1.1) — sept mutations sur l'arbre de
// travail, chacune remise en place aussitôt par l'opération inverse :
//   - `api/fonts/SplineSans-Bold.ttf` renommé      → l'import lève, sortie 1 (la police est lue
//     au chargement du module, avant tout rendu) ;
//   - `initWasm` privé de son binaire (chemin faux)  → la carte part par le repli : « servie
//     no-store », « 1 × 1 », « 69 octets », 3 écarts ;
//   - `width: 1200` → `1000` dans satori              → « 1200 × 756 » (resvg remet la largeur à
//     1200 par `fitTo`, et la hauteur suit), 1 écart ;
//   - `TOTAL_TONNES_MAX = 200` → `1` dans partage.ts  → le titre et la description perdent le
//     chiffre, 2 écarts ;
//   - `kilos < 1000` → `< 10` dans partage.ts         → « 0,0 t CO₂e » au lieu de « 40 kg », 1 écart ;
//   - la base factice de `new URL(request.url, 'http://localhost')` retirée dans share-card.ts
//     → « carte sur URL relative : c'est le repli statique », 1 écart. Celle-là est venue d'une
//     contre-lecture : les autres appels passent une URL **absolue**, donc ils traversaient tout
//     aussi bien un `new URL(request.url)` nu — le point le plus discret de la checklist de
//     `VERCEL.md` §1.6 n'était pas gardé, et ce fichier affirmait le contraire ;
//   - `request.url` → `request.url.split('?')[0]` dans la base factice de share-card.ts
//     → « identique à un rendu sans aucun paramètre », 1 écart. Celle-là vient de la
//     contre-lecture de la contre-lecture, et elle a **changé le script au lieu de le confirmer** :
//     la base factice restait en place, `new URL` réussissait, le statut valait 200 et le
//     `cache-control` `public`, la carte ne portait plus aucun chiffre — et l'égalité avec le
//     rendu absolu restait verte, la mutation dégradant les deux appels à l'identique. D'où le
//     témoin sans paramètre. Deux choses sont parties au passage : l'assertion de **statut** de ce
//     bloc, que rien ne pouvait faire tomber (`GET` n'a que deux sorties, toutes deux en 200), et
//     l'évaluation inconditionnelle des deux dernières, qui faisait rendre à la mutation
//     précédente trois écarts dont deux décrivaient une cause fausse ;
//   - une exception jetée en tête du rendu de **chaque** fonction → 5 écarts chacune, et **pas un
//     mot sur le statut ni sur le `content-type`**, alors que le rendu était intégralement cassé.
//     Ces quatre assertions-là vivaient encore dans les blocs 1 et 2 pendant que cet en-tête
//     annonçait, deux puces plus haut, les avoir retirées du bloc 1 bis — le même défaut une
//     quatrième fois dans la même journée, relevé par une relecture des gardes. Elles sont
//     parties, et les deux blocs disent désormais **pourquoi** plutôt que de laisser croire à une
//     couverture qui n'existait pas.
//
// **Et le 05/10/2026, pour la liste fermée de `poste` et le total réécrit** — quatre mutations, chacune
// remise en place :
//   - la carte relit le texte libre (`(searchParams.get('poste') ?? '').slice(0, 120)`) → « un
//     libellé forgé ne rend pas la carte sans poste », 1 écart ;
//   - la page relit le texte libre → « un libellé forgé se retrouve dans le HTML rendu », 1 écart ;
//   - la carte refuse tout libellé (`poste = null`) → « un libellé de l'app rend la même carte que
//     sans poste », 1 écart ;
//   - la page recopie de nouveau le total reçu dans l'`og:image` → « le texte qui suit le chiffre
//     du total se retrouve dans le HTML rendu », 1 écart (la section 2 envoie déjà `2.400`, la
//     forme de l'app, donc elle ne voit pas la différence).
//
// **Et le 18/10/2026, pour la forme canonique et le module commun** — trente-quatre mutations, chacune
// remise en place par réécriture de l'état d'avant, jamais par un second remplacement ; aucune ne passe,
// et le nombre d'écarts est celui du script tel qu'il est livré :
//   - le total relu par préfixe (`parseFloat`) → 22 ; la part relue par préfixe (`parseInt`) → 11 ;
//   - jamais de redirection (`canonique: true`) → 38 ; la page seule, 19 ; la carte seule, 19 ;
//   - la forme jugée après re-sérialisation (`%20` et `%30` passent pour canoniques) → 4 — c'est, depuis
//     le 19/10/2026, le comportement voulu (plus bas) ;
//   - les paramètres inconnus recopiés dans la forme canonique → 26 ; un paramètre répété accepté → 6 ;
//   - la part sans borne haute → 4 ; le total sans borne haute → 5 ;
//   - le total arrondi par troncature au lieu de l'arrondi au kilo → 2 (la variante « décimales qui
//     s'arrondissent » : sans elle, cette mutation passait) ; un total de quarante chiffres accepté → 2 ;
//     une part de quatre chiffres refusée au lieu d'ignorée → 2 ;
//   - la carte sans `s-maxage` ni `stale-while-revalidate`, comme elle partait → 1 ; la page sans
//     `stale-while-revalidate` → 1 ; la page en `max-age` seul → 1 ;
//   - un 400 gardé (`public, s-maxage`) → 36 ; le repli de la page gardé → 1 ; celui de la carte → 1 ;
//   - la redirection en 307 → 41 ; sans `s-maxage` → 32 ; le 400 en 422 → 37 ;
//   - le 400 sans `x-robots-tag` → 36 ; la redirection sans → 32 ; le 400 servi en HTML → 36 ;
//   - la redirection vers « rien » qui garde un `?` final → 4 ;
//   - l'ordre canonique inversé (`percent` avant `poste`) → 45 ; le libellé canonique passé en
//     minuscules (le point fixe casse) → 54 ; la liste fermée qui refuse tout → 52 ;
//   - l'`og:image` écrite dans un autre ordre que la forme canonique → 2 ;
//   - le wasm chargé avant de juger la forme → 1, seule ;
//   - un import relatif en `.ts` → 1, seule ; sans extension → le module est introuvable au chargement
//     (sortie 1, « ne se charge pas ») ; un fichier de `api/` sans préfixe `_` → 1, seule.
//
// **Et le même jour, après la contre-lecture, pour la page qui ignore l'illisible** — cinq mutations,
// chacune remise en place par réécriture de l'état d'avant :
//   - la page qui refuse de nouveau en 400 (l'état d'avant) → 23 ; la carte qui ignore au lieu de
//     refuser → 21 ;
//   - en ignorant, un paramètre répété qui garde sa première valeur → 4 ; un total illisible relu par
//     préfixe (`parseFloat`) → 12 ; une part relue par préfixe (`parseInt`) → 5, dont « part négative »
//     servie en 200 comme canonique (`percent=-1`).
//
// **Et le 19/10/2026, l'encodage** (5b′) : la forme se jugeait au caractère près, et Vercel décode la
// chaîne avant la fonction, si bien que tout partage qui porte un poste se redirigeait vers lui-même en
// production. Ce script le voyait d'autant moins qu'il exigeait la redirection de `%20` et de `%30`. Deux
// mutations, remises en place par recopie du fichier d'avant :
//   - la comparaison au caractère près (l'état livré par ScratchMe/Ramille#378) → 10, les cinq écritures
//     de 5b′ sur la page et sur la carte, et rien d'autre ;
//   - la forme jugée sur `params.toString()`, qui oublie un `&` de trop → 2, la variante « un `&` de
//     trop » sur la page et sur la carte.
//
// Usage : node --disable-warning=ExperimentalWarning scripts/verifier-api.mjs
//   (l'avertissement est celui du type stripping, encore marqué expérimental en 22.x ; le
//   retirer garde le journal lisible, le laisser ne change rien au résultat).
// Avec VERIFIER_API_PNG=<chemin>, la carte rendue est écrite là pour être regardée.

import { Buffer } from 'node:buffer';
import fs, { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const RACINE = path.join(import.meta.dirname, '..');
// share-card lit ses polices et le wasm depuis `process.cwd()`, comme sur Vercel.
process.chdir(RACINE);

const [majeure, mineure] = process.versions.node.split('.').map(Number);
if (majeure < 22 || (majeure === 22 && mineure < 18)) {
  console.error(
    `Node ${process.versions.node} : ce script importe du TypeScript tel quel et demande Node 22.18 ` +
      `ou plus (type stripping natif).`
  );
  process.exit(2);
}

const ecarts = [];
function verifier(condition, message) {
  if (!condition) ecarts.push(message);
}

// ── 0. La disposition d'api/, jugée sur les sources ───────────────────────────────────────
//
// Deux règles que Vercel applique au déploiement et que Node ne rejoue pas ici :
//  - **un fichier de `api/` qui n'est pas une des deux fonctions commence par `_`**, sinon Vercel en
//    fait une route publique et un troisième déploiement ;
//  - **un import relatif se termine par `.js`**, et vise un `.ts` qui existe. Vercel compile sans
//    réécrire les spécificateurs : `./x.ts` partirait tel quel dans un déploiement où seul `x.js`
//    existe (`ERR_MODULE_NOT_FOUND`, muet côté client), et `./x` n'est pas résolu par Node en ESM.
//    Node, lui, exécute un `.ts` sous son vrai nom : c'est pourquoi ce contrôle porte sur le texte.
const DOSSIER_API = path.join(RACINE, 'api');
const FONCTIONS = ['partage.ts', 'share-card.ts'];
for (const nom of readdirSync(DOSSIER_API).filter((n) => n.endsWith('.ts') && !n.endsWith('.d.ts'))) {
  if (!FONCTIONS.includes(nom) && !nom.startsWith('_')) {
    verifier(
      false,
      `api/${nom} : ni une des deux fonctions ni préfixé par « _ » — Vercel en ferait une route publique`
    );
  }
  const source = readFileSync(path.join(DOSSIER_API, nom), 'utf8');
  for (const [, specificateur] of source.matchAll(/^(?:import|export)\b[^;]*?\bfrom\s*['"](\.{1,2}\/[^'"]+)['"]/gm)) {
    verifier(
      specificateur.endsWith('.js') && existsSync(path.join(DOSSIER_API, specificateur.replace(/\.js$/, '.ts'))),
      `api/${nom} : l'import « ${specificateur} » ne se termine pas par .js, ou ne vise aucun .ts — ` +
        `Vercel le déploierait tel quel et le module serait introuvable`
    );
  }
}

// Node ne sait pas qu'un `./x.js` d'api/ est un `x.ts` (TypeScript le sait, et Vercel compile en `.js`) :
// on lui apprend cette correspondance, et seulement quand le `.js` n'existe pas.
registerHooks({
  resolve(specificateur, contexte, suivant) {
    if (/^\.{1,2}\//.test(specificateur) && specificateur.endsWith('.js') && contexte.parentURL) {
      const vise = fileURLToPath(new URL(specificateur, contexte.parentURL));
      if (!existsSync(vise)) return suivant(specificateur.replace(/\.js$/, '.ts'), contexte);
    }
    return suivant(specificateur, contexte);
  },
});

// Le wasm de resvg se lit au premier rendu, pas au chargement du module : on note chaque lecture pour
// savoir, plus bas, si une redirection ou un refus de la carte l'a déclenchée.
const lecturesDuWasmDeResvg = [];
const lireOrigine = fs.readFileSync;
fs.readFileSync = function lireEnNotant(chemin, ...suite) {
  if (String(chemin).endsWith('index_bg.wasm')) lecturesDuWasmDeResvg.push(String(chemin));
  return lireOrigine.call(fs, chemin, ...suite);
};

let GET;
let partage;
let commun;
try {
  ({ GET } = await import('../api/share-card.ts'));
  ({ default: partage } = await import('../api/partage.ts'));
  commun = await import('../api/_partage-commun.ts');
} catch (erreur) {
  console.error(
    `Une des deux fonctions d'api/ ne se charge pas — c'est ce que Vercel verrait au premier appel.\n` +
      `${erreur instanceof Error ? erreur.stack : String(erreur)}`
  );
  process.exit(1);
}

const ORIGINE = 'https://www.ramille.fr';
const PARAMS = new URLSearchParams({
  // La forme qu'envoie l'app (`urlDePartage`, `toFixed(3)`) : c'est aussi celle que la page
  // renvoie à la carte, qui ne recopie plus le total reçu.
  total: '2.400',
  // Un libellé que l'app produit (`dominantShareLabel`) : la liste est fermée depuis le 05/10/2026,
  // et l'ancienne forme « Trajet domicile-travail (Voiture thermique) » y est refusée.
  poste: 'Trajet domicile-travail en voiture thermique',
  percent: '58',
});
const TITRE_SANS_CHIFFRE = '<title>Mon empreinte transport</title>';

// ── 0 bis. Une redirection ou un refus de la carte ne charge pas le wasm de rendu ───────────
//
// C'est ce qui fait de la forme canonique une protection : une variante coûte une invocation, jamais
// un rendu. Jouée **avant** le premier rendu du script, parce que le wasm, une fois chargé, reste en
// mémoire et ne dirait plus rien. Le témoin suit le premier rendu : sans lui, une lecture qui ne
// serait plus notée ferait passer cette garde pour la mauvaise raison.
await GET({ url: '/api/share-card?fbclid=x' });
await GET({ url: '/api/share-card?total=abc' });
verifier(
  lecturesDuWasmDeResvg.length === 0,
  'carte : une redirection ou un refus charge le wasm de resvg — le jugement de la forme canonique ' +
    'doit venir avant tout rendu'
);

// ── 1. La carte, sur un partage réaliste ──────────────────────────────────────────────────
const carte = await GET(new Request(`${ORIGINE}/api/share-card?${PARAMS}`));
verifier(
  lecturesDuWasmDeResvg.length === 1,
  `carte : le premier rendu a lu le wasm de resvg ${lecturesDuWasmDeResvg.length} fois, attendu 1 — la ` +
    `garde « une variante ne charge pas le wasm » ne note plus ce qu'elle croit noter`
);
const png = Buffer.from(await carte.arrayBuffer());
// **Ni le statut ni le `content-type` ne sont affirmés, et c'est délibéré.** Les deux fonctions
// enveloppent tout leur corps dans un `try/catch` par décision documentée — jamais de 500 sur un
// endpoint lu par des aperçus de lien —, et leurs deux sorties passent par le même constructeur
// de réponse, qui ne pose pas de statut et écrit le type en littéral. Aucune entrée, aucune panne
// du rendu ne peut donc faire tomber ces deux assertions-là : mesuré le 20/09/2026 en jetant une
// exception en tête du rendu, elles sont restées vertes pendant que cinq autres tombaient. Une
// assertion qui ne peut pas tomber se lit comme de la couverture et n'en est pas ; c'est le
// `cache-control` qui distingue le vrai rendu de son repli, et lui seul.
const cache = carte.headers.get('cache-control') ?? '';
verifier(
  cache.startsWith('public'),
  `carte : servie « ${cache} » — c'est le repli statique, donc le rendu a échoué (satori, resvg, une ` +
    `police ou le wasm) ; le détail est dans le console.error juste au-dessus`
);
const SIGNATURE_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
verifier(png.subarray(0, 8).equals(SIGNATURE_PNG), 'carte : le corps n’est pas un PNG');
if (png.length >= 24) {
  const largeur = png.readUInt32BE(16);
  const hauteur = png.readUInt32BE(20);
  verifier(largeur === 1200 && hauteur === 630, `carte : ${largeur} × ${hauteur}, attendu 1200 × 630`);
}
verifier(
  png.length > 10_000,
  `carte : ${png.length} octets — un aplat sans texte ; la police n’a probablement pas été prise`
);
if (process.env.VERIFIER_API_PNG) writeFileSync(process.env.VERIFIER_API_PNG, png);

// ── 1 bis. `request.url` RELATIF, comme Vercel le donne en runtime Node.js ─────────────────
//
// Le point le plus discret de la checklist de `VERCEL.md` §1.6 : en Function Node.js, contrairement
// au runtime Edge, `request.url` est un **chemin**, pas une URL absolue — d'où la base factice de
// `new URL(request.url, 'http://localhost')` dans `api/share-card.ts`. Les appels ci-dessus passent
// une URL absolue, donc ils traverseraient tout aussi bien un `new URL(request.url)` nu : ils ne
// gardent pas ce point. Relevé en contre-lisant la journée du 20/09/2026, qui affirmait le
// contraire dans `VERCEL.md`.
//
// `GET` ne lit que `request.url`, donc un objet nu **est** la simulation fidèle — et c'est plus
// juste qu'une `Request`, que Node refuse de construire sur un chemin relatif.
const carteRelative = await GET({ url: `/api/share-card?${PARAMS}` });
const pngRelatif = Buffer.from(await carteRelative.arrayBuffer());
const relatifRendu = (carteRelative.headers.get('cache-control') ?? '').startsWith('public');
verifier(
  relatifRendu,
  'carte sur URL relative : c’est le repli statique, donc le rendu a échoué sur un chemin ' +
    'relatif — exactement ce que Vercel envoie en runtime Node.js'
);
// Les deux assertions suivantes ne se posent **que si le rendu a eu lieu** : sur le repli, les
// trois images sont le même pixel de 69 octets, donc elles tomberaient toutes les trois en
// décrivant chacune une cause différente, dont deux fausses. Un échec doit nommer ce qui s'est
// passé, pas offrir trois hypothèses — c'est la leçon que la contre-lecture du 20/09/2026 a
// payée ailleurs dans ce fichier, et elle vaut ici aussi.
if (relatifRendu) {
  // **L'image doit être la même qu'à l'absolue.** `new URL` peut parfaitement réussir en perdant
  // la chaîne de requête : les trois paramètres retombent alors sur leur repli, satori rend
  // « — / an » sans un chiffre, et le statut comme le `cache-control` restent ceux d'un rendu
  // réussi. Le statut, lui, n'est pas affirmé ici : `GET` n'a que deux sorties et toutes deux
  // rendent 200, donc aucune entrée ne pourrait faire tomber une telle assertion.
  //
  // L'égalité **octet à octet** suppose le rendu déterministe, ce qui se mesure et ne se raisonne
  // pas : cinq passages consécutifs, cinq fois la même image (20/09/2026). Si satori ou resvg
  // venaient à dater leur sortie, cette assertion clignoterait — elle se remplacerait alors par
  // une comparaison de tailles, moins serrée mais stable.
  verifier(
    pngRelatif.equals(png),
    `carte sur URL relative : ${pngRelatif.length} octets contre ${png.length} sur l'absolue — le ` +
      `chemin s'analyse, mais il ne rend pas la même image`
  );
  // **Et la carte doit changer quand les paramètres changent.** L'égalité ci-dessus ne suffit
  // pas, et c'est une mutation qui l'a dit : une analyse qui perd la chaîne de requête la perd
  // sur les **deux** appels à la fois, donc les deux images restent identiques et l'assertion
  // reste verte. Un rendu sans paramètre est le témoin — la carte y titre « — / an » sans le
  // moindre chiffre et pèse encore 21 ko, donc le seuil de 10 000 octets de la section 1 la
  // laisse passer tout autant.
  const pngSansParametre = Buffer.from(await (await GET({ url: '/api/share-card' })).arrayBuffer());
  verifier(
    !pngRelatif.equals(pngSansParametre),
    `carte sur URL relative : identique à un rendu sans aucun paramètre ` +
      `(${pngSansParametre.length} octets) — l'URL s'analyse, mais la chaîne de requête n'atteint ` +
      `pas le rendu, donc la carte ne porte le chiffre de personne`
  );
}

// ── 2. La page de partage, même URL ───────────────────────────────────────────────────────
const page = await partage(new Request(`${ORIGINE}/api/partage?${PARAMS}`));
const html = await page.text();


verifier(
  html.includes('<title>2,4 t CO₂e par an — mon empreinte transport</title>'),
  'page : le titre ne porte pas « 2,4 t CO₂e par an »'
);
// L'apostrophe est typographique depuis le 27/09/2026 : cette assertion épinglait la forme droite,
// échappée en `&#39;` — c'est-à-dire le défaut même, que la règle `no-restricted-syntax` d'eslint
// interdit désormais dans les chaînes de `api/`.
verifier(
  html.includes('Poste principal (58 % de l’empreinte) : Trajet domicile-travail en voiture thermique.'),
  'page : la description ne nomme pas le poste avec sa part'
);
const image = html.match(/property="og:image" content="([^"]+)"/);
verifier(image !== null, 'page : pas de balise og:image');
if (image) {
  const urlImage = new URL(image[1]);
  verifier(
    urlImage.origin === ORIGINE && urlImage.pathname === '/api/share-card',
    `page : og:image pointe sur ${urlImage.origin}${urlImage.pathname}, attendu ${ORIGINE}/api/share-card`
  );
  for (const [cle, valeur] of PARAMS) {
    verifier(
      urlImage.searchParams.get(cle) === valeur,
      `page : og:image porte ${cle}=« ${urlImage.searchParams.get(cle)} », attendu « ${valeur} »`
    );
  }
}
verifier(
  html.includes('property="og:image:width" content="1200"') &&
    html.includes('property="og:image:height" content="630"'),
  'page : og:image:width/height n’annoncent pas 1200 × 630'
);


// ── Aides : jouer une adresse sur l'une ou l'autre fonction ───────────────────────────────
//
// La page reçoit une URL absolue (runtime Edge), la carte un chemin (runtime Node.js) : chacune sous
// la forme que Vercel lui donne. Une redirection se suit **une fois** — une seconde serait une
// boucle, et une boucle sur une adresse que l'app produit tuerait le partage.
const appelPage = (adresse) => partage(new Request(new URL(adresse, ORIGINE)));
const appelCarte = (adresse) => GET({ url: adresse });

async function jouer(appel, adresse) {
  const premiere = await appel(adresse);
  if (premiere.status !== 308) return { reponse: premiere, location: null, boucle: false };
  const location = premiere.headers.get('location');
  const seconde = await appel(location);
  return { reponse: seconde, location, boucle: seconde.status === 308 };
}

/** `public, max-age=0, s-maxage=86400` → { public: true, 'max-age': 0, 's-maxage': 86400 } */
function directives(entete) {
  const lues = {};
  for (const morceau of (entete ?? '').split(',').map((m) => m.trim()).filter(Boolean)) {
    const [nom, valeur] = morceau.split('=');
    lues[nom] = valeur === undefined ? true : Number(valeur);
  }
  return lues;
}

// ── 2 bis. Ce que la page NE reflète PAS ──────────────────────────────────────────────────
//
// La boucle ci-dessus dit que les trois paramètres attendus survivent ; elle ne dit rien de ce
// qui arriverait en plus. Un paramètre inconnu — `fbclid` et `utm_*` que les réseaux ajoutent aux
// liens, ou une valeur inédite fabriquée à volonté — est une adresse de plus pour le CDN, donc une
// réponse de plus à calculer (et, pour la carte, un rendu satori + resvg complet). La page ne le
// sert pas : elle redirige vers la forme canonique, qui ne le porte plus.
const PARASITE = 'zzparasite';
const parasitee = await jouer(appelPage, `/api/partage?${PARAMS}&${PARASITE}=1`);
verifier(
  parasitee.location === `/api/partage?${PARAMS}`,
  `page : un paramètre inconnu (« ${PARASITE} ») n'est pas redirigé vers la forme canonique (cible « ${parasitee.location} »)`
);
const pageParasitee = await parasitee.reponse.text();
verifier(
  !pageParasitee.includes(PARASITE),
  `page : un paramètre inconnu (« ${PARASITE} ») se retrouve dans le HTML rendu — la query de la carte est recopiée au lieu d'être reconstruite`
);
verifier(
  pageParasitee.includes('<title>2,4 t CO₂e par an — mon empreinte transport</title>'),
  'page : le paramètre parasite a emporté le titre avec lui'
);

// ── 2 ter. Un libellé forgé ne passe ni sur la page ni sur la carte ───────────────────────
//
// `poste` est une liste fermée (`_partage-commun.ts`) : c'était la seule partie de l'aperçu qu'un
// tiers pouvait écrire à sa guise, sous la marque du produit. Que chaque libellé de l'app passe,
// `scripts/postes-partageables.test.ts` le prouve ; ici, ce que la page et la carte font d'un
// libellé refusé — le **rendu**, que Jest ne charge pas. Un libellé inconnu est ignoré, donc redirigé
// vers l'adresse sans lui ; un total qui n'est pas un nombre est illisible, que la page ignore de même.
const FORGE = 'Achetez sur un-site-quelconque.example';
const forgee = await jouer(appelPage, `/api/partage?total=2.400&poste=${encodeURIComponent(FORGE)}&percent=58`);
const pageForgee = await forgee.reponse.text();
verifier(
  forgee.location === '/api/partage?total=2.400&percent=58',
  `page : un libellé forgé n'est pas redirigé vers l'adresse sans poste (cible « ${forgee.location} »)`
);
verifier(!pageForgee.includes('un-site-quelconque'), 'page : un libellé forgé se retrouve dans le HTML rendu');
verifier(
  pageForgee.includes('<title>2,4 t CO₂e par an — mon empreinte transport</title>'),
  'page : le libellé forgé a emporté le titre avec lui'
);
// Le total : `parseFloat` n'en lisait que le préfixe, donc la suite passait la borne et voyageait
// jusque dans l'`og:image`. Un total qui n'est pas un nombre n'est plus deviné : la page l'ignore —
// redirigée vers l'adresse sans lui, titrée sans chiffre —, et le texte forgé ne revient ni dans la
// cible ni dans le HTML rendu.
const totalForge = await jouer(appelPage, `/api/partage?total=${encodeURIComponent(`2.4 ${FORGE}`)}&percent=58`);
const pageTotalForge = await totalForge.reponse.text();
verifier(
  totalForge.location === '/api/partage?percent=58' && totalForge.reponse.status === 200,
  `page : un total suivi d'un texte n'est pas redirigé vers l'adresse sans lui (cible « ${totalForge.location} », ` +
    `statut ${totalForge.reponse.status})`
);
verifier(
  !pageTotalForge.includes('un-site-quelconque') && pageTotalForge.includes(TITRE_SANS_CHIFFRE),
  'page : le texte qui suit le chiffre du total se retrouve dans le HTML rendu, ou le chiffre est deviné'
);
// Les rendus comparés ici — les deux suivants et celui de la section 1 — ne se comparent **que
// s'ils ont eu lieu** : sur le repli, ils seraient le même pixel, et l'égalité passerait sans rien
// dire du libellé (même raison qu'en 1 bis).
const carteForgee = await jouer(appelCarte, `/api/share-card?total=2.400&percent=58&poste=${encodeURIComponent(FORGE)}`);
const carteSansPoste = await appelCarte('/api/share-card?total=2.400&percent=58');
verifier(
  carteForgee.location === '/api/share-card?total=2.400&percent=58',
  `carte : un libellé forgé n'est pas redirigé vers l'adresse sans poste (cible « ${carteForgee.location} »)`
);
const rendus = [carte, carteForgee.reponse, carteSansPoste].every((r) =>
  (r.headers.get('cache-control') ?? '').startsWith('public')
);
verifier(rendus, 'carte : un libellé forgé ou absent part par le repli statique au lieu du vrai rendu');
if (rendus) {
  const pngForge = Buffer.from(await carteForgee.reponse.arrayBuffer());
  const pngSansPoste = Buffer.from(await carteSansPoste.arrayBuffer());
  // L'égalité octet à octet : un libellé refusé doit donner **exactement** la carte sans poste —
  // ni la ligne « Poste principal », ni le texte. Le témoin inverse (un libellé de l'app change
  // la carte) est déjà là : `png`, en section 1, porte le poste de `PARAMS`.
  verifier(
    pngForge.equals(pngSansPoste),
    `carte : un libellé forgé ne rend pas la carte sans poste (${pngForge.length} octets contre ` +
      `${pngSansPoste.length}) — il est dessiné, ou il dessine quelque chose`
  );
  verifier(
    !png.equals(pngSansPoste),
    'carte : un libellé de l’app rend la même carte que sans poste — la liste le refuse'
  );
}

// ── 3. Hors borne, les deux côtés retombent ensemble ──────────────────────────────────────
//
// Un total au-delà de 200 t est bien formé mais n'est pas un partage de l'app : il est ignoré, et
// l'adresse redirigée vers celle qui n'en a pas — la page titre sans chiffre, la carte rend sans
// chiffre par le vrai chemin. Ce serait un titre et une image qui se contredisent si un seul des
// deux côtés le bornait.
const pageHorsBorne = await jouer(appelPage, '/api/partage?total=201');
verifier(pageHorsBorne.location === '/api/partage', `page : 201 t devrait être redirigé vers /api/partage (cible « ${pageHorsBorne.location} »)`);
verifier(
  (await pageHorsBorne.reponse.text()).includes(TITRE_SANS_CHIFFRE),
  'page : 201 t devrait rendre le titre sans chiffre'
);
const carteHorsBorne = await jouer(appelCarte, '/api/share-card?total=201');
verifier(
  carteHorsBorne.location === '/api/share-card',
  `carte : 201 t devrait être redirigé vers /api/share-card (cible « ${carteHorsBorne.location} »)`
);
verifier(
  (carteHorsBorne.reponse.headers.get('cache-control') ?? '').startsWith('public'),
  'carte : 201 t doit rendre la carte sans chiffre par le vrai chemin, pas par le repli'
);

// ── 4. Les kilos sous la tonne, et l’URL sans paramètre ───────────────────────────────────
const pageKilos = await (await appelPage('/api/partage?total=0.040')).text();
verifier(
  pageKilos.includes('<title>40 kg CO₂e par an — mon empreinte transport</title>'),
  'page : 0,04 t doit se dire « 40 kg CO₂e », pas « 0,0 t »'
);
const pageNue = await appelPage('/api/partage');
verifier(
  pageNue.status === 200 && (await pageNue.text()).includes(TITRE_SANS_CHIFFRE),
  'page : sans paramètre, le titre doit être sans chiffre, en 200'
);

// ── 5. Une forme, et une seule ────────────────────────────────────────────────────────────
//
// Le CDN de Vercel garde une réponse par adresse. Tout ce qui change l'adresse sans changer l'image —
// un paramètre en plus, l'ordre, un zéro de tête, un texte derrière le nombre que `parseFloat` lisait
// quand même — était une entrée de cache neuve, donc un rendu complet payé en invocations, et le
// pare-feu compte des requêtes, pas des clés de cache. Désormais : l'adresse que l'app produit est
// servie et gardée, une variante lisible est redirigée (308) vers elle, une adresse qui n'a pas de
// sens est refusée (400). **L'encodage n'est pas une variante** (5b′) : le CDN le confond déjà.
const POSTE_APP = 'Trajet domicile-travail en voiture thermique';
const POSTE_PLUS = 'Trajet+domicile-travail+en+voiture+thermique';
const POSTE_20 = 'Trajet%20domicile-travail%20en%20voiture%20thermique';
const Q_COMPLETE = `total=2.400&poste=${POSTE_PLUS}&percent=58`;
verifier(
  Q_COMPLETE === PARAMS.toString(),
  'harnais : la query de référence n’est plus celle que sérialise URLSearchParams (la forme de l’app)'
);

// 5a. La forme canonique est servie telle quelle, avec un cache que le CDN garde.
const cachePage = directives(page.headers.get('cache-control'));
verifier(
  page.status === 200 &&
    cachePage.public === true &&
    cachePage['s-maxage'] >= 3600 &&
    cachePage['stale-while-revalidate'] > 0,
  `page canonique : servie « ${page.headers.get('cache-control')} » en ${page.status} — sans s-maxage et ` +
    `stale-while-revalidate le CDN de Vercel ne la garde pas (max-age ne parle qu'au navigateur)`
);
const cacheCarte = directives(carte.headers.get('cache-control'));
verifier(
  cacheCarte.public === true &&
    cacheCarte['s-maxage'] >= 3600 &&
    cacheCarte['stale-while-revalidate'] > 0 &&
    cacheCarte['max-age'] === 31536000 &&
    cacheCarte.immutable === true &&
    cacheCarte['no-transform'] === true,
  `carte canonique : servie « ${carte.headers.get('cache-control')} » — il lui faut s-maxage et ` +
    `stale-while-revalidate pour le CDN, et max-age d'un an, immutable, no-transform pour le navigateur`
);

// 5b. Une variante lisible → 308 vers sa forme canonique, la même pour la page et la carte.
const VARIANTES = [
  ['total à une décimale (les liens d’avant les trois décimales)', `total=2.4&poste=${POSTE_PLUS}&percent=58`, Q_COMPLETE],
  ['ordre des paramètres', `percent=58&poste=${POSTE_PLUS}&total=2.400`, Q_COMPLETE],
  ['paramètre inconnu à la fin (fbclid)', `${Q_COMPLETE}&fbclid=IwAR0abc`, Q_COMPLETE],
  ['paramètre inconnu au milieu', `total=2.400&utm_source=x&poste=${POSTE_PLUS}&percent=58`, Q_COMPLETE],
  ['zéros de tête', `total=02.400&poste=${POSTE_PLUS}&percent=058`, Q_COMPLETE],
  ['décimales en trop', `total=2.4000000&poste=${POSTE_PLUS}&percent=58`, Q_COMPLETE],
  ['décimales qui s’arrondissent au kilo', `total=2.4006&poste=${POSTE_PLUS}&percent=58`, `total=2.401&poste=${POSTE_PLUS}&percent=58`],
  ['un `&` de trop', `total=2.400&&poste=${POSTE_PLUS}&percent=58`, Q_COMPLETE],
  ['libellé vide', `total=2.400&poste=&percent=58`, 'total=2.400&percent=58'],
  ['total vide', `total=&poste=${POSTE_PLUS}&percent=58`, `poste=${POSTE_PLUS}&percent=58`],
  ['total hors borne', `total=200.001&poste=${POSTE_PLUS}&percent=58`, `poste=${POSTE_PLUS}&percent=58`],
  ['part hors borne', `total=2.400&poste=${POSTE_PLUS}&percent=101`, `total=2.400&poste=${POSTE_PLUS}`],
  ['part à quatre chiffres', `total=2.400&poste=${POSTE_PLUS}&percent=1000`, `total=2.400&poste=${POSTE_PLUS}`],
  ['libellé hors de la liste', `total=2.400&poste=Trajet+en+jet+prive&percent=58`, 'total=2.400&percent=58'],
  ['rien d’autre qu’un paramètre inconnu', 'utm_source=x', ''],
];
for (const [nom, entree, attendue] of VARIANTES) {
  for (const [fonction, chemin, appel] of [
    ['page', '/api/partage', appelPage],
    ['carte', '/api/share-card', appelCarte],
  ]) {
    const cible = attendue === '' ? chemin : `${chemin}?${attendue}`;
    const premiere = await appel(`${chemin}?${entree}`);
    verifier(
      premiere.status === 308 && premiere.headers.get('location') === cible,
      `${fonction} : « ${nom} » n'est pas redirigé (308) vers « ${cible} » — statut ${premiere.status}, cible « ${premiere.headers.get('location')} »`
    );
    if (premiere.status !== 308) continue;
    const cacheRedirection = directives(premiere.headers.get('cache-control'));
    verifier(
      cacheRedirection.public === true && cacheRedirection['s-maxage'] > 0,
      `${fonction} : la redirection de « ${nom} » est servie « ${premiere.headers.get('cache-control')} » — le CDN ne la garde pas`
    );
    verifier(
      (premiere.headers.get('x-robots-tag') ?? '').includes('noindex'),
      `${fonction} : la redirection de « ${nom} » ne porte pas x-robots-tag noindex`
    );
    // Et sa cible est **servie**, pas redirigée à son tour. La carte n'est rendue qu'une fois par
    // forme canonique distincte : c'est le cas de la section 1 ; ici on ne regarde que le statut,
    // et une cible qui part par le repli statique (`no-store`) serait vue par les sections 1 et 2.
    if (fonction === 'page') {
      const suite = await appel(cible);
      verifier(suite.status === 200, `page : la cible de « ${nom} » répond ${suite.status} — redirection en boucle`);
    }
  }
}

// 5b′. Le même partage dans un autre encodage **est** la forme canonique : servi en 200, jamais redirigé.
// Vercel décode la chaîne avant d'appeler la fonction — une espace y arrive en `%20`, quel que soit
// l'encodage du lien —, et son cache confond les encodages d'une même adresse : mesuré en production
// le 19/10/2026, où `percent=5%30` était servi depuis l'entrée de `percent=50` dès le premier appel. Juger
// l'encodage y faisait rediriger chaque partage qui porte un poste vers lui-même, en boucle. Les deux
// appels passent par le parseur d'URL, comme sur Vercel : une espace écrite telle quelle y devient `%20`,
// un accent `%C3%A9`, et la parenthèse, la barre oblique restent écrites en clair.
const MEME_ADRESSE = [
  ['espaces en %20, comme Vercel les passe', `total=2.400&poste=${POSTE_20}&percent=58`, true],
  ['espaces écrites telles quelles', `total=2.400&poste=${POSTE_APP}&percent=58`, true],
  ['chiffre encodé en %30', `total=2.40%30&poste=${POSTE_PLUS}&percent=58`, true],
  ['accent écrit tel quel', 'total=2.400&poste=Trajet domicile-travail en voiture électrique&percent=58', false],
  ['parenthèses et barre oblique en clair', 'total=2.400&poste=Voyages longue distance en avion (court/moyen-courrier)&percent=58', false],
];
for (const [nom, entree, memeImage] of MEME_ADRESSE) {
  const pageEncodee = await appelPage(`/api/partage?${entree}`);
  verifier(
    pageEncodee.status === 200,
    `page : « ${nom} » répond ${pageEncodee.status}${pageEncodee.headers.get('location') ? ` vers « ${pageEncodee.headers.get('location')} »` : ''} au lieu d'être servie — sur Vercel, ce serait une redirection en boucle`
  );
  const carteEncodee = await appelCarte(`/api/share-card?${entree}`);
  verifier(
    carteEncodee.status === 200 && (carteEncodee.headers.get('content-type') ?? '').startsWith('image/png'),
    `carte : « ${nom} » répond ${carteEncodee.status} au lieu d'être rendue`
  );
  if (memeImage && carteEncodee.status === 200) {
    const pngEncode = Buffer.from(await carteEncodee.arrayBuffer());
    verifier(pngEncode.equals(png), `carte : « ${nom} » ne rend pas l'image de la forme de l'app`);
  }
}

// 5c. Un paramètre qui n'a pas de sens : **la carte refuse l'adresse** — 400, jamais un rendu, jamais
// gardée —, **la page l'ignore** et redirige vers la forme sans lui, comme un paramètre inconnu. La carte
// n'est lue qu'à l'adresse que la page écrit, toujours canonique ; la page est la destination du lien
// qu'une personne a reçu, et un caractère recopié derrière le dernier nombre ne doit pas lui fermer le
// chemin vers Ramille. La troisième colonne est la forme canonique où la page redirige.
const ILLISIBLES = [
  ['texte derrière le total', `total=${encodeURIComponent('2.4 Achetez')}`, ''],
  ['lettres derrière le total', 'total=2.4abc', ''],
  ['total qui n’est pas un nombre', 'total=abc', ''],
  ['total négatif', 'total=-5', ''],
  ['total en notation exponentielle', 'total=1e3', ''],
  ['total à virgule', 'total=2,4', ''],
  ['total précédé d’une espace', 'total=%202.4', ''],
  ['total hexadécimal', 'total=0x10', ''],
  ['total infini', 'total=Infinity', ''],
  ['total de treize chiffres', 'total=1234567890123', ''],
  ['part suivie de lettres', 'percent=58abc', ''],
  ['part décimale', 'percent=5.8', ''],
  ['part négative', 'percent=-1', ''],
  ['part en notation exponentielle', 'percent=1e2', ''],
  ['part qui n’est pas un nombre', 'percent=abc', ''],
  ['total répété', 'total=1&total=2', ''],
  ['libellé répété', `poste=${POSTE_PLUS}&poste=${POSTE_PLUS}`, ''],
  ['part répétée', 'percent=1&percent=2', ''],
  // Un partage complet dont un seul paramètre est abîmé : la page garde les deux autres.
  ['ponctuation recopiée derrière la part', `total=2.400&poste=${POSTE_PLUS}&percent=58).`, `total=2.400&poste=${POSTE_PLUS}`],
  ['lettres derrière le total d’un partage complet', `total=2.4abc&poste=${POSTE_PLUS}&percent=58`, `poste=${POSTE_PLUS}&percent=58`],
  ['total répété d’un partage complet', `total=1&total=2&poste=${POSTE_PLUS}&percent=58`, `poste=${POSTE_PLUS}&percent=58`],
];
for (const [nom, entree, attendueDeLaPage] of ILLISIBLES) {
  const reponse = await appelCarte(`/api/share-card?${entree}`);
  const corps = await reponse.text();
  verifier(reponse.status === 400, `carte : « ${nom} » répond ${reponse.status}, attendu 400`);
  if (reponse.status === 400) {
    verifier(
      reponse.headers.get('cache-control') === 'no-store',
      `carte : le 400 de « ${nom} » est servi « ${reponse.headers.get('cache-control')} », attendu no-store`
    );
    verifier(
      (reponse.headers.get('content-type') ?? '').startsWith('text/plain') && !corps.includes('<') && corps.length < 100,
      `carte : le 400 de « ${nom} » n'est pas une courte réponse en texte brut`
    );
    verifier(
      (reponse.headers.get('x-robots-tag') ?? '').includes('noindex'),
      `carte : le 400 de « ${nom} » ne porte pas x-robots-tag noindex`
    );
  }

  const cible = attendueDeLaPage === '' ? '/api/partage' : `/api/partage?${attendueDeLaPage}`;
  const premiere = await appelPage(`/api/partage?${entree}`);
  verifier(
    premiere.status === 308 && premiere.headers.get('location') === cible,
    `page : « ${nom} » n'est pas redirigé (308) vers « ${cible} » — statut ${premiere.status}, cible « ${premiere.headers.get('location')} »`
  );
  if (premiere.status !== 308) continue;
  const cacheRedirection = directives(premiere.headers.get('cache-control'));
  verifier(
    cacheRedirection.public === true && cacheRedirection['s-maxage'] > 0 &&
      (premiere.headers.get('x-robots-tag') ?? '').includes('noindex'),
    `page : la redirection de « ${nom} » est servie « ${premiere.headers.get('cache-control')} », sans s-maxage ou sans noindex`
  );
  const suite = await appelPage(cible);
  const pageSuivie = await suite.text();
  verifier(
    suite.status === 200 && !pageSuivie.includes('Achetez'),
    `page : la cible de « ${nom} » répond ${suite.status}, ou porte le texte de l'adresse reçue`
  );
}

// 5d. **La forme canonique est un point fixe**, sur un balayage de combinaisons. Une adresse
// redirigée vers une cible qui se redirige à son tour est une boucle : la page ne s'ouvre plus et
// l'aperçu disparaît, sur l'adresse même que l'app produit. Le balayage mêle des valeurs
// canoniques, des variantes, des valeurs hors de la liste ou de la borne et des valeurs illisibles.
{
  const totaux = [null, '', '0', '0.04', '2.4', '2.400', '200', '200.0004', '200.001', '201', '2.4abc', '-1'];
  const postes = [null, '', POSTE_APP, 'Trajet domicile-travail', 'Voyages longue distance en avion long-courrier', 'inconnu'];
  const parts = [null, '', '0', '058', '100', '101', '5.8'];
  let lisibles = 0;
  let illisibles = 0;
  let canoniques = 0;
  let canoniquesDeLaPage = 0;
  let mal = null;
  for (const total of totaux) {
    for (const poste of postes) {
      for (const part of parts) {
        const p = new URLSearchParams();
        if (total !== null) p.set('total', total);
        if (poste !== null) p.set('poste', poste);
        if (part !== null) p.set('percent', part);
        // La lecture de la carte, qui refuse l'illisible.
        const lecture = commun.lireLaRequete(`?${p}`, 'refuser');
        if (lecture.statut === 'illisible') {
          illisibles += 1;
        } else {
          lisibles += 1;
          if (lecture.canonique) canoniques += 1;
          const encore = commun.lireLaRequete(`?${lecture.query}`, 'refuser');
          if (encore.statut !== 'lisible' || !encore.canonique || encore.query !== lecture.query) {
            mal ??= `carte : « ${p} » → « ${lecture.query} » → ${JSON.stringify(encore)}`;
          }
        }
        // Celle de la page, qui l'ignore : sa cible est servie par la page, et la carte sert la même
        // chaîne — c'est celle que la page écrit dans son `og:image`.
        const page = commun.lireLaRequete(`?${p}`, 'ignorer');
        if (page.statut !== 'lisible') {
          mal ??= `page : « ${p} » → ${JSON.stringify(page)}`;
          continue;
        }
        if (page.canonique) canoniquesDeLaPage += 1;
        const pageEncore = commun.lireLaRequete(`?${page.query}`, 'ignorer');
        const carteDeLaPage = commun.lireLaRequete(`?${page.query}`, 'refuser');
        if (
          !pageEncore.canonique ||
          pageEncore.query !== page.query ||
          carteDeLaPage.statut !== 'lisible' ||
          !carteDeLaPage.canonique
        ) {
          mal ??= `page : « ${p} » → « ${page.query} » → ${JSON.stringify(pageEncore)} / ${JSON.stringify(carteDeLaPage)}`;
        }
      }
    }
  }
  verifier(mal === null, `la forme canonique n'est pas un point fixe : ${mal}`);
  verifier(
    lisibles > 100 && illisibles > 100 && canoniques > 10 && canoniquesDeLaPage === canoniques,
    `le balayage ne couvre pas les trois issues (${lisibles} lisibles dont ${canoniques} canoniques, ${illisibles} ` +
      `illisibles), ou la page tient pour canonique une adresse que la carte ne sert pas (${canoniquesDeLaPage})`
  );
}

// 5e. **L'adresse que la page écrit dans son `og:image` est celle que la carte sert**, pas une
// variante qu'elle redirigerait : le lecteur d'aperçu irait chercher l'image par un détour, ou
// n'irait pas. Rejoué sur quatre formes de page — le partage complet, un total seul, un poste sans
// total, rien.
for (const query of [Q_COMPLETE, 'total=0.040', `poste=${POSTE_PLUS}&percent=58`, '']) {
  const adresse = query === '' ? '/api/partage' : `/api/partage?${query}`;
  const rendue = await (await appelPage(adresse)).text();
  const balise = rendue.match(/property="og:image" content="([^"]+)"/);
  if (!balise) {
    verifier(false, `page « ${adresse} » : pas de balise og:image`);
    continue;
  }
  const image = new URL(balise[1]);
  const reponse = await appelCarte(`${image.pathname}${image.search}`);
  verifier(
    reponse.status === 200 && (reponse.headers.get('cache-control') ?? '').startsWith('public'),
    `page « ${adresse} » : son og:image « ${image.pathname}${image.search} » est ${reponse.status === 200 ? 'rendue par le repli' : `redirigée ou refusée (${reponse.status})`} par la carte`
  );
}

// 5f. **Un repli ne se garde jamais.** Une panne passagère (satori, une police, une exception)
// sert une réponse neutre : si le CDN ou le navigateur la gardaient un an, la panne se figerait sur
// cette adresse après avoir cessé. L'exception est jetée par `request.url`, que les deux fonctions
// lisent à l'intérieur de leur `try`.
{
  const erreurOrigine = console.error;
  console.error = () => {};
  let repliPage;
  let repliCarte;
  try {
    const piege = { get url() { throw new Error('essai : repli'); } };
    repliPage = await partage(piege);
    repliCarte = await GET(piege);
  } finally {
    console.error = erreurOrigine;
  }
  verifier(
    repliPage.headers.get('cache-control') === 'no-store',
    `page : le repli est servi « ${repliPage.headers.get('cache-control')} », attendu no-store`
  );
  verifier(
    repliCarte.headers.get('cache-control') === 'no-store',
    `carte : le repli est servi « ${repliCarte.headers.get('cache-control')} », attendu no-store`
  );
}

// ── Verdict ───────────────────────────────────────────────────────────────────────────────
if (ecarts.length > 0) {
  console.error(
    `Les fonctions d'api/ ne rendent pas ce qu'elles promettent :\n` +
      ecarts.map((e) => `  - ${e}`).join('\n')
  );
  process.exit(1);
}

console.log(
  `api/ : carte de partage rendue (${png.length} octets, 1200 × 630, cache public) et page d'aperçu ` +
    `conforme — carte rejouée sur un chemin relatif, comme Vercel l'envoie, libellé forgé refusé des deux ` +
    `côtés, ${VARIANTES.length} variantes redirigées vers leur forme canonique, ${MEME_ADRESSE.length} encodages ` +
    `servis comme elle, ${ILLISIBLES.length} adresses ` +
    `illisibles refusées par la carte et ramenées par la page à leur forme lisible, et les réponses que le CDN ` +
    `peut garder portent s-maxage.`
);
