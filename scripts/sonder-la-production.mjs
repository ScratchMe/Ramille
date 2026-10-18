#!/usr/bin/env node
// Interroge la production de l'extérieur, comme le ferait un visiteur sans JavaScript, et sort en 1
// si un point ne répond pas comme attendu. `.github/workflows/sonde.yml` la lance toutes les heures :
// un échec fait prévenir GitHub, ce que rien d'autre ne fait.
//
//   node scripts/sonder-la-production.mjs [--annotations] [--tentatives 3] [--pause-ms 8000]
//                                         [--origine https://www.ramille.fr] [--supabase https://…]
//
// **Pourquoi elle existe.** La seule alerte du produit vit dans la base qu'elle surveille
// (`verifier-les-alertes`, README d'exploitation §8.11) : une base en pause, un déploiement qui sert
// une page vide ou une Function qui plante ne l'atteignent pas. Ici, ce que voit quelqu'un qui ouvre
// le site, un lien partagé ou le fichier qu'Android lit pour ouvrir l'app.
//
// **Ce qu'elle sonde** (neuf points) : les quatre pages publiques (statut, type, deux marqueurs
// ASCII chacune — un accent absent d'un fichier minifié ne prouve rien, et ici il n'est jamais
// cherché) ; `/.well-known/assetlinks.json` (JSON, paquet `fr.ramille.app`) ; `/api/partage` et
// `/api/share-card` avec l'adresse que l'app génère (`urlDePartage`, `src/types/resultat.ts`) ; la
// clé publishable, lue dans le bundle web déployé ; et `/auth/v1/health` de Supabase, qui la demande.
//
// **Ce qu'elle ne fait pas.** Aucun JavaScript de l'app n'est exécuté (le bundle est lu comme du
// texte), donc aucune session anonyme n'est créée ; rien n'est écrit ; aucun secret n'est employé — la
// clé publishable est publique, c'est son rôle. Elle ne sait rien de ce qui se passe derrière
// (base, e-mails, rappels) : c'est le rôle des journaux du §8.
//
// **La carte change d'adresse à chaque passage.** `/api/share-card` répond `public, immutable, max-age=
// 31536000` : la même adresse sondée deux fois est servie par le cache, et la Function ne serait
// plus appelée. Le total (de 1,000 à 190,999 t, sous la borne de 200 t des Functions) suit donc la
// minute : chaque passage rend une carte neuve par satori et resvg — le chemin qui a déjà coûté un
// `FUNCTION_INVOCATION_FAILED` muet (`VERCEL.md` §1.6). Un coût d'environ une seconde de calcul par
// passage, soit vingt-quatre par jour ; l'espacer, c'est espacer le `cron` de `sonde.yml`.
//
// **Un passage retente avant d'échouer** (trois essais, huit secondes entre eux) : un à-coup du
// réseau ne doit pas réveiller quelqu'un, une panne qui dure, si. La décision (« cette réponse
// est-elle la bonne ? ») est pure et testée sans réseau : `sonder-la-production.test.ts`.

import { pathToFileURL } from 'node:url';

export const ORIGINE = 'https://www.ramille.fr';
export const ORIGINE_SUPABASE = 'https://nuugfepfsypqgvsvyzht.supabase.co';
export const PAQUET_ANDROID = 'fr.ramille.app';

/** Le poste que l'app écrit pour un bilan type — `urlDePartage`, un libellé de la liste fermée de `api/`. */
export const POSTE_DE_LA_SONDE = 'Trajet domicile-travail en voiture thermique';
export const PART_DE_LA_SONDE = '58';

/** Les dimensions que la page annonce en `og:image:*`, et que resvg rend. */
const LARGEUR_DE_LA_CARTE = 1200;
const HAUTEUR_DE_LA_CARTE = 630;
/** Un aplat sans un mot dessiné tient en quelques centaines d'octets ; une vraie carte pèse ~38 Ko. */
const TAILLE_MINIMALE_DE_LA_CARTE = 10_000;

// ─── Ce qui est attendu ──────────────────────────────────────────────────────────────────────

/**
 * Les pages publiques. Les marqueurs sont de l'ASCII pur : l'adresse canonique que l'export pose en
 * `og:url`, et le début du `<h1>` qui prouve que le corps de la page a été rendu (et pas seulement
 * son `<head>`). `src/constants/page-titles.ts` reste la source des titres : le test de ce fichier
 * exige que chaque début de `<h1>` d'ici en soit un début.
 */
export const PAGES = [
  { id: 'accueil', libelle: 'Accueil', chemin: '/', entete: null, tailleMinimale: 10_000 },
  {
    id: 'confidentialite',
    libelle: 'Politique de confidentialité',
    chemin: '/confidentialite',
    entete: 'Politique de confidentialit',
    tailleMinimale: 30_000,
  },
  {
    id: 'conditions',
    libelle: 'Conditions d’utilisation',
    chemin: '/conditions',
    entete: 'Conditions d',
    tailleMinimale: 20_000,
  },
  {
    id: 'suppression',
    libelle: 'Suppression du compte',
    chemin: '/compte/suppression',
    entete: 'Supprimer mon compte',
    tailleMinimale: 15_000,
  },
];

const SCRIPT_D_ENTREE = /<script[^>]+src="([^"]*\/_expo\/static\/js\/web\/entry-[^"]+\.js)"/;
const CLE_PUBLISHABLE = /sb_publishable_[A-Za-z0-9_-]{16,}/;

/** Les marqueurs d'une page, pour une origine donnée (celle de la production, ou celle d'un essai). */
export function marqueursDeLaPage(page, origine) {
  const marqueurs = [
    {
      libelle: 'l’adresse canonique de la page (og:url)',
      motif: `property="og:url" content="${origine}${page.chemin}"`,
    },
  ];
  if (page.entete) {
    marqueurs.push({
      libelle: `le <h1> « ${page.entete}… »`,
      motif: new RegExp(`<h1[^>]*>${escaperPourMotif(page.entete)}`),
    });
  } else {
    marqueurs.push({ libelle: 'le script d’entrée de l’app', motif: SCRIPT_D_ENTREE });
  }
  return marqueurs;
}

const escaperPourMotif = (texte) => texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Les paramètres de la carte de ce passage : mêmes noms, même ordre, mêmes formes que `urlDePartage`
 * (`total` à trois décimales, `poste` de la liste fermée, `percent` entier), avec un total qui suit
 * la minute pour que la carte soit rendue et non servie par le cache : il ne se répète qu'au bout de
 * 190 000 minutes, quatre mois.
 */
export function parametresDePartage(maintenant) {
  const minute = Math.floor(maintenant.getTime() / 60_000);
  const millitonnes = 1000 + (minute % 190_000);
  return new URLSearchParams({
    total: (millitonnes / 1000).toFixed(3),
    poste: POSTE_DE_LA_SONDE,
    percent: PART_DE_LA_SONDE,
  });
}

/** Le début du titre que `api/partage.ts` compose pour ce total (`libelleDuTotal` : au-dessus de la tonne). */
export function debutDuTitreDePartage(parametres) {
  const tonnes = Number.parseFloat(parametres.get('total') ?? '');
  return `<title>${tonnes.toFixed(1).replace('.', ',')} t CO`;
}

// ─── La décision — pure ──────────────────────────────────────────────────────────────────────
//
// Une réponse est `{ statut, entetes, corps, erreur }` : `statut` vaut `null` si rien n'est revenu,
// `entetes` a des noms en minuscules, `corps` est un `Uint8Array`. Chaque vérification rend
// `{ ok: true, detail }` ou `{ ok: false, raison }`, et la raison dit ce qui a été vu à côté de ce
// qui était attendu.

const ok = (detail) => ({ ok: true, detail });
const ko = (raison) => ({ ok: false, raison });
const texteDe = (reponse) => new TextDecoder().decode(reponse.corps);
const octets = (n) => (n >= 1024 ? `${Math.round(n / 1024)} Ko` : `${n} o`);

/** Le statut et le type : ce qui ne dépend pas du contenu. Rend `null` si c'est bon, sinon la raison. */
export function verifierLeTransport(reponse, typeAttendu) {
  if (reponse.erreur) return `injoignable : ${reponse.erreur}`;
  if (reponse.statut === null) return 'aucune réponse';
  if (reponse.statut !== 200) {
    const ailleurs = reponse.statut >= 300 && reponse.statut < 400 && reponse.entetes.location;
    return ailleurs
      ? `statut ${reponse.statut}, redirigé vers ${reponse.entetes.location} au lieu de répondre 200`
      : `statut ${reponse.statut} au lieu de 200`;
  }
  const type = reponse.entetes['content-type'] ?? '(aucun)';
  if (!type.toLowerCase().startsWith(typeAttendu)) return `type de contenu « ${type} » au lieu de « ${typeAttendu} »`;
  return null;
}

function marqueursAbsents(texte, marqueurs) {
  return marqueurs
    .filter(({ motif }) => !(typeof motif === 'string' ? texte.includes(motif) : motif.test(texte)))
    .map(({ libelle }) => libelle);
}

export function verifierUnePage(reponse, { marqueurs, tailleMinimale }) {
  const transport = verifierLeTransport(reponse, 'text/html');
  if (transport) return ko(transport);
  if (reponse.corps.length < tailleMinimale) {
    return ko(`corps de ${octets(reponse.corps.length)}, moins que les ${octets(tailleMinimale)} d’une page rendue`);
  }
  const absents = marqueursAbsents(texteDe(reponse), marqueurs);
  if (absents.length > 0) return ko(`absent de la page : ${absents.join(' ; ')}`);
  return ok(`200, ${octets(reponse.corps.length)}`);
}

const EMPREINTE = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

/** Le fichier qu'Android lit pour ouvrir l'app depuis un lien (`EXPO.md` §2.3). */
export function verifierAssetlinks(reponse) {
  const transport = verifierLeTransport(reponse, 'application/json');
  if (transport) return ko(transport);
  let json;
  try {
    json = JSON.parse(texteDe(reponse));
  } catch {
    return ko('le corps n’est pas du JSON');
  }
  if (!Array.isArray(json)) return ko('le JSON n’est pas un tableau de déclarations');
  const declaration = json.find(
    (d) => d?.target?.namespace === 'android_app' && d?.target?.package_name === PAQUET_ANDROID,
  );
  if (!declaration) {
    const paquets = json.map((d) => d?.target?.package_name).filter(Boolean);
    return ko(`aucune déclaration pour le paquet ${PAQUET_ANDROID} (paquets vus : ${paquets.join(', ') || 'aucun'})`);
  }
  if (!(declaration.relation ?? []).includes('delegate_permission/common.handle_all_urls')) {
    return ko('la déclaration ne porte pas la relation delegate_permission/common.handle_all_urls');
  }
  const empreintes = declaration.target.sha256_cert_fingerprints;
  if (!Array.isArray(empreintes) || empreintes.length === 0) return ko('aucune empreinte de certificat déclarée');
  const mal = empreintes.filter((e) => typeof e !== 'string' || !EMPREINTE.test(e));
  if (mal.length > 0) return ko(`${mal.length} empreinte(s) de forme invalide (attendu : 32 octets en hexadécimal, majuscules, séparés par « : »)`);
  return ok(`paquet ${PAQUET_ANDROID}, ${empreintes.length} empreinte(s)`);
}

/** La page de partage : le total passé dans l'adresse doit se retrouver dans son titre et dans l'image. */
export function verifierLePartage(reponse, { origine, parametres }) {
  const transport = verifierLeTransport(reponse, 'text/html');
  if (transport) return ko(transport);
  const marqueurs = [
    {
      libelle: `le titre « ${debutDuTitreDePartage(parametres).slice('<title>'.length)}… » (le total a été lu)`,
      motif: debutDuTitreDePartage(parametres),
    },
    {
      libelle: 'l’image de l’aperçu (og:image) vers /api/share-card',
      motif: `property="og:image" content="${origine}/api/share-card?`,
    },
    { libelle: 'la balise robots noindex', motif: '<meta name="robots" content="noindex, nofollow">' },
  ];
  const absents = marqueursAbsents(texteDe(reponse), marqueurs);
  if (absents.length > 0) return ko(`absent de la page : ${absents.join(' ; ')}`);
  const robots = reponse.entetes['x-robots-tag'] ?? '';
  if (!/noindex/i.test(robots)) return ko(`en-tête x-robots-tag « ${robots || '(aucun)'} » sans noindex`);
  return ok(`200, ${octets(reponse.corps.length)}`);
}

const SIGNATURE_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Largeur et hauteur lues dans l'IHDR d'un PNG, ou `null` si le corps n'en est pas un. */
export function dimensionsDuPng(corps) {
  if (corps.length < 24 || SIGNATURE_PNG.some((o, i) => corps[i] !== o)) return null;
  const vue = new DataView(corps.buffer, corps.byteOffset, corps.byteLength);
  return { largeur: vue.getUint32(16), hauteur: vue.getUint32(20) };
}

/**
 * La carte. `GET` attrape toute exception et sert alors un pixel en `no-store` : statut 200 et PNG
 * valide, la seule trace d'un satori, d'un resvg ou d'une police en panne est `cache-control`
 * (`scripts/verifier-api.mjs`). C'est donc ce qu'on lit, avec la taille.
 */
export function verifierLaCarte(reponse) {
  const transport = verifierLeTransport(reponse, 'image/png');
  if (transport) return ko(transport);
  const cache = reponse.entetes['cache-control'] ?? '';
  if (/no-store/i.test(cache)) return ko(`servie par le repli statique (cache-control « ${cache} ») : le rendu a échoué côté Function`);
  if (!/public/i.test(cache)) return ko(`cache-control « ${cache || '(aucun)'} » sans public`);
  const dimensions = dimensionsDuPng(reponse.corps);
  if (!dimensions) return ko('le corps n’est pas un PNG');
  if (dimensions.largeur !== LARGEUR_DE_LA_CARTE || dimensions.hauteur !== HAUTEUR_DE_LA_CARTE) {
    return ko(`${dimensions.largeur} × ${dimensions.hauteur} au lieu de ${LARGEUR_DE_LA_CARTE} × ${HAUTEUR_DE_LA_CARTE}`);
  }
  if (reponse.corps.length < TAILLE_MINIMALE_DE_LA_CARTE) {
    return ko(`image de ${octets(reponse.corps.length)}, moins que les ${octets(TAILLE_MINIMALE_DE_LA_CARTE)} d’une carte dessinée`);
  }
  const cacheDeLaPlateforme = reponse.entetes['x-vercel-cache'];
  const servieParLeCache = /^(HIT|STALE)$/i.test(cacheDeLaPlateforme ?? '');
  return ok(`${dimensions.largeur} × ${dimensions.hauteur}, ${octets(reponse.corps.length)}${servieParLeCache ? ', servie par le cache (la Function n’a pas tourné)' : ', rendue'}`);
}

/** Le script d'entrée du bundle web, lu dans la page d'accueil ; `null` s'il n'y en a pas. */
export function trouverLeScriptDEntree(html, origine) {
  const chemin = html.match(SCRIPT_D_ENTREE)?.[1];
  if (!chemin) return null;
  return new URL(chemin, `${origine}/`).href;
}

/** La clé publishable de Supabase, publique par construction, lue dans le bundle ; `null` si absente. */
export function extraireLaClePublishable(bundle) {
  return bundle.match(CLE_PUBLISHABLE)?.[0] ?? null;
}

/** Le bundle, tel qu'il a été lu : de quoi dire pourquoi la clé n'a pas été trouvée. */
export function verifierLaCle(reponseDuBundle) {
  const transport = verifierLeTransport(reponseDuBundle, 'application/javascript');
  if (transport) return { ...ko(`bundle web : ${transport}`), cle: null };
  const cle = extraireLaClePublishable(texteDe(reponseDuBundle));
  if (!cle) {
    return {
      ...ko('aucune clé « sb_publishable_… » dans le bundle web déployé : l’app n’aurait pas de quoi parler à Supabase'),
      cle: null,
    };
  }
  return { ...ok(`clé de ${cle.length} caractères`), cle };
}

/** `/auth/v1/health` : GoTrue répond `{"name":"GoTrue",…}` quand le projet est vivant et la clé acceptée. */
export function verifierLaSante(reponse) {
  if (reponse.erreur) return ko(`injoignable : ${reponse.erreur} — projet en pause ? (README d’exploitation §3.1)`);
  if (reponse.statut === 401 || reponse.statut === 403) {
    const code = reponse.entetes['sb-error-code'];
    return ko(`statut ${reponse.statut}${code ? ` (${code})` : ''} : la clé publishable du bundle déployé est refusée`);
  }
  if (reponse.statut !== null && reponse.statut >= 500) {
    return ko(`statut ${reponse.statut} : Auth ne répond pas — projet en pause ou en incident ? (README d’exploitation §3.1)`);
  }
  const transport = verifierLeTransport(reponse, 'application/json');
  if (transport) return ko(transport);
  let json;
  try {
    json = JSON.parse(texteDe(reponse));
  } catch {
    return ko('le corps n’est pas du JSON');
  }
  if (json?.name !== 'GoTrue') return ko(`le service ne se présente pas comme GoTrue (name « ${json?.name ?? '(absent)'} »)`);
  return ok(`GoTrue ${json.version ?? ''}`.trim());
}

// ─── Les annotations de GitHub Actions ───────────────────────────────────────────────────────

const echapperLeMessage = (s) => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const echapperLaPropriete = (s) => echapperLeMessage(s).replace(/:/g, '%3A').replace(/,/g, '%2C');

/** `::error title=…::message`, avec les échappements du protocole (une virgule couperait le titre). */
export function annotation(niveau, titre, message) {
  return `::${niveau} title=${echapperLaPropriete(titre)}::${echapperLeMessage(message)}`;
}

// ─── L'entrée-sortie ─────────────────────────────────────────────────────────────────────────

const DELAI_D_UNE_REQUETE_MS = 20_000;
const AGENT = 'ramille-sonde/1.0 (surveillance de la production, sans JavaScript)';

/** Une requête GET sans suivre les redirections, qui rend toujours une réponse au sens du §« décision ». */
export async function requeter(url, { entetes = {}, fetchImpl = fetch } = {}) {
  try {
    const r = await fetchImpl(url, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'user-agent': AGENT, ...entetes },
      signal: AbortSignal.timeout(DELAI_D_UNE_REQUETE_MS),
    });
    const corps = new Uint8Array(await r.arrayBuffer());
    return { statut: r.status, entetes: Object.fromEntries([...r.headers].map(([k, v]) => [k.toLowerCase(), v])), corps, erreur: null };
  } catch (e) {
    const cause = e?.cause?.code ?? e?.cause?.message;
    const delai = e?.name === 'TimeoutError' ? `pas de réponse en ${DELAI_D_UNE_REQUETE_MS / 1000} s` : null;
    return { statut: null, entetes: {}, corps: new Uint8Array(), erreur: delai ?? [e?.message, cause].filter(Boolean).join(' — ') };
  }
}

const dormir = (ms) => new Promise((fin) => setTimeout(fin, ms));

/** Rejoue un essai jusqu'à ce qu'il réussisse ou que les tentatives soient épuisées. */
export async function avecTentatives(essai, { tentatives, pauseMs }) {
  let dernier;
  for (let n = 1; n <= tentatives; n++) {
    const debut = Date.now();
    dernier = await essai();
    dernier.dureeMs = Date.now() - debut;
    dernier.tentatives = n;
    if (dernier.ok) break;
    if (n < tentatives) await dormir(pauseMs);
  }
  return dernier;
}

/**
 * Sonde les neuf points et rend un résultat par point, dans l'ordre : `statut` vaut `ok`, `echec` ou
 * `saute` (un point qui dépend d'un autre déjà tombé : la santé de Supabase sans clé à présenter).
 * Les points sont indépendants, sauf la santé qui attend la clé : ils partent ensemble, de sorte que
 * le pire cas — tout suspendu, vingt secondes par requête, trois essais — reste à quelques minutes.
 */
export async function sonder({
  origine = ORIGINE,
  origineSupabase = ORIGINE_SUPABASE,
  maintenant = new Date(),
  tentatives = 3,
  pauseMs = 8000,
  fetchImpl = fetch,
} = {}) {
  const demander = (chemin, entetes) => requeter(`${origine}${chemin}`, { entetes, fetchImpl });
  const conf = { tentatives, pauseMs };
  const parametres = parametresDePartage(maintenant);
  const point = async (id, libelle, chemin, essai) => {
    const resultat = await avecTentatives(essai, conf);
    return {
      id,
      libelle,
      chemin,
      statut: resultat.ok ? 'ok' : 'echec',
      detail: resultat.detail,
      raison: resultat.raison,
      dureeMs: resultat.dureeMs,
      tentatives: resultat.tentatives,
    };
  };

  // La clé : accueil → script d'entrée → bundle (quelque 3 Mo, ~700 Ko compressés) ; puis la santé.
  const cleEtSante = async () => {
    let cle = null;
    const resultatCle = await point('cle', 'Clé publishable dans le bundle web', '/_expo/static/js/web/entry-*.js', async () => {
      const accueil = await demander('/');
      const transport = verifierLeTransport(accueil, 'text/html');
      if (transport) return ko(`accueil : ${transport}`);
      const script = trouverLeScriptDEntree(texteDe(accueil), origine);
      if (!script) return ko('aucun script d’entrée du bundle dans la page d’accueil');
      const verdict = verifierLaCle(await requeter(script, { fetchImpl }));
      cle = verdict.cle;
      return verdict;
    });
    if (resultatCle.statut !== 'ok') {
      const sante = {
        id: 'sante',
        libelle: 'Auth Supabase',
        chemin: '/auth/v1/health',
        statut: 'saute',
        raison: 'non sondé : il n’y a pas de clé à présenter',
      };
      return [resultatCle, sante];
    }
    const sante = await point('sante', 'Auth Supabase', '/auth/v1/health', async () =>
      verifierLaSante(await requeter(`${origineSupabase}/auth/v1/health`, { entetes: { apikey: cle }, fetchImpl })),
    );
    return [resultatCle, sante];
  };

  const [pages, assetlinks, partage, carte, cle] = await Promise.all([
    Promise.all(
      PAGES.map((page) =>
        point(page.id, page.libelle, page.chemin, async () =>
          verifierUnePage(await demander(page.chemin), {
            marqueurs: marqueursDeLaPage(page, origine),
            tailleMinimale: page.tailleMinimale,
          }),
        ),
      ),
    ),
    point('assetlinks', 'Fichier des liens Android', '/.well-known/assetlinks.json', async () =>
      verifierAssetlinks(await demander('/.well-known/assetlinks.json')),
    ),
    point('partage', 'Page de partage', '/api/partage', async () =>
      verifierLePartage(await demander(`/api/partage?${parametres}`), { origine, parametres }),
    ),
    point('carte', 'Carte de partage', '/api/share-card', async () =>
      verifierLaCarte(await demander(`/api/share-card?${parametres}`)),
    ),
    cleEtSante(),
  ]);
  return [...pages, assetlinks, partage, carte, ...cle];
}

/** Les lignes du journal, puis le verdict. Rend `{ lignes, echecs }`. */
export function rapporter(points, { annotations = false } = {}) {
  const lignes = [];
  for (const p of points) {
    const marque = { ok: '✓', echec: '✗', saute: '–' }[p.statut];
    const duree = p.dureeMs === undefined ? '' : `, ${p.dureeMs} ms`;
    const essais = p.tentatives > 1 ? ` (${p.tentatives} essais)` : '';
    const corps = p.statut === 'ok' ? `${p.detail}${duree}` : `${p.raison}${essais}`;
    lignes.push(`${marque} ${p.libelle} (${p.chemin}) — ${corps}`);
  }
  const echecs = points.filter((p) => p.statut === 'echec');
  if (annotations) {
    for (const p of echecs) lignes.push(annotation('error', `Sonde — ${p.libelle}`, `${p.chemin} — ${p.raison}`));
  }
  lignes.push(
    echecs.length === 0
      ? `Tout répond (${points.filter((p) => p.statut === 'ok').length} points).`
      : `${echecs.length} point(s) sur ${points.length} ne répondent pas comme attendu : ${echecs.map((p) => p.libelle).join(' ; ')}.`,
  );
  return { lignes, echecs };
}

// ─── Le programme ────────────────────────────────────────────────────────────────────────────

function lireLesOptions(argv) {
  const options = { annotations: false };
  const valeur = (i, nom) => {
    if (argv[i + 1] === undefined) throw new Error(`${nom} demande une valeur`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--annotations': options.annotations = true; break;
      case '--tentatives': options.tentatives = Number(valeur(i++, '--tentatives')); break;
      case '--pause-ms': options.pauseMs = Number(valeur(i++, '--pause-ms')); break;
      case '--origine': options.origine = valeur(i++, '--origine'); break;
      case '--supabase': options.origineSupabase = valeur(i++, '--supabase'); break;
      default: throw new Error(`option inconnue : ${argv[i]}`);
    }
  }
  return options;
}

const estLeProgramme = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (estLeProgramme) {
  let options;
  try {
    options = lireLesOptions(process.argv.slice(2));
  } catch (e) {
    console.error(`${e.message}\nUsage : node scripts/sonder-la-production.mjs [--annotations] [--tentatives n] [--pause-ms n] [--origine url] [--supabase url]`);
    process.exit(64);
  }
  const { annotations, ...reste } = options;
  console.log(`Sonde de la production — ${new Date().toISOString()}`);
  const points = await sonder(reste);
  const { lignes, echecs } = rapporter(points, { annotations });
  console.log(lignes.join('\n'));
  process.exitCode = echecs.length === 0 ? 0 : 1;
}
