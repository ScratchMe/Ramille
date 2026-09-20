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
//     un rendu **sans paramètre** qui dit que la carte porte bien le chiffre de quelqu'un.
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
//     précédente trois écarts dont deux décrivaient une cause fausse.
//
// Usage : node --disable-warning=ExperimentalWarning scripts/verifier-api.mjs
//   (l'avertissement est celui du type stripping, encore marqué expérimental en 22.x ; le
//   retirer garde le journal lisible, le laisser ne change rien au résultat).
// Avec VERIFIER_API_PNG=<chemin>, la carte rendue est écrite là pour être regardée.

import { Buffer } from 'node:buffer';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

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

let GET;
let partage;
try {
  ({ GET } = await import('../api/share-card.ts'));
  ({ default: partage } = await import('../api/partage.ts'));
} catch (erreur) {
  console.error(
    `Une des deux fonctions d'api/ ne se charge pas — c'est ce que Vercel verrait au premier appel.\n` +
      `${erreur instanceof Error ? erreur.stack : String(erreur)}`
  );
  process.exit(1);
}

const ORIGINE = 'https://www.ramille.fr';
const PARAMS = new URLSearchParams({
  total: '2.4',
  poste: 'Trajet domicile-travail (Voiture thermique)',
  percent: '58',
});
const TITRE_SANS_CHIFFRE = '<title>Mon empreinte transport</title>';

// ── 1. La carte, sur un partage réaliste ──────────────────────────────────────────────────
const carte = await GET(new Request(`${ORIGINE}/api/share-card?${PARAMS}`));
const png = Buffer.from(await carte.arrayBuffer());
verifier(carte.status === 200, `carte : statut ${carte.status}, attendu 200`);
verifier(
  carte.headers.get('content-type') === 'image/png',
  `carte : content-type « ${carte.headers.get('content-type')} », attendu image/png`
);
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
verifier(page.status === 200, `page : statut ${page.status}, attendu 200`);
verifier(
  (page.headers.get('content-type') ?? '').startsWith('text/html'),
  `page : content-type « ${page.headers.get('content-type')} », attendu text/html`
);
verifier(
  html.includes('<title>2,4 t CO₂e par an — mon empreinte transport</title>'),
  'page : le titre ne porte pas « 2,4 t CO₂e par an »'
);
verifier(
  html.includes('Poste principal (58 % de l&#39;empreinte) : Trajet domicile-travail (Voiture thermique).'),
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

// ── 3. Hors borne, les deux côtés retombent ensemble ──────────────────────────────────────
const pageHorsBorne = await (await partage(new Request(`${ORIGINE}/api/partage?total=201`))).text();
verifier(pageHorsBorne.includes(TITRE_SANS_CHIFFRE), 'page : 201 t devrait rendre le titre sans chiffre');
const carteHorsBorne = await GET(new Request(`${ORIGINE}/api/share-card?total=201`));
verifier(
  (carteHorsBorne.headers.get('cache-control') ?? '').startsWith('public'),
  'carte : 201 t doit rendre la carte sans chiffre par le vrai chemin, pas par le repli'
);

// ── 4. Les kilos sous la tonne, et l’URL sans paramètre ───────────────────────────────────
const pageKilos = await (await partage(new Request(`${ORIGINE}/api/partage?total=0.04`))).text();
verifier(
  pageKilos.includes('<title>40 kg CO₂e par an — mon empreinte transport</title>'),
  'page : 0,04 t doit se dire « 40 kg CO₂e », pas « 0,0 t »'
);
const pageNue = await (await partage(new Request(`${ORIGINE}/api/partage`))).text();
verifier(pageNue.includes(TITRE_SANS_CHIFFRE), 'page : sans paramètre, le titre doit être sans chiffre');

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
    `conforme sur quatre URL — carte rejouée sur un chemin relatif, comme Vercel l'envoie.`
);
