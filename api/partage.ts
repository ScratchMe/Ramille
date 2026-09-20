// Vercel Edge Function (cf. commentaire d'en-tête de share-card.tsx pour le contexte
// d'exécution). Page de destination d'un lien partagé depuis /bilan/resultat — jamais
// générée par l'export statique Expo (qui ne peut pas produire des balises og:* uniques par
// paramètre, cf. discussion increment "carte de résultat partageable" du 04/09/2026) : cette
// route sert le HTML directement, avec les balises Open Graph que les apps de messagerie
// (WhatsApp, iMessage, Twitter/X…) lisent pour afficher un aperçu riche du lien, avant même
// que le destinataire ne clique. L'image elle-même est déléguée à /api/share-card, mêmes
// paramètres.
//
// Aucune lecture de base de données : les chiffres transitent uniquement par l'URL, générée
// côté client à partir de ce que l'utilisateur voit déjà sur son propre écran de résultat
// (cf. bilan/resultat.tsx) — pas de nouvelle surface d'exposition de données, pas de RLS à
// repenser pour ce premier increment.
export const config = { runtime: 'edge' };

// **Borne haute du total affichable, en tonnes.** `percent` était déjà validé (entier 0-100),
// `total` ne l'était pas : `Number.parseFloat` accepte un négatif, un zéro ou un 1e40, et une URL
// fabriquée par un tiers rendait une page titrée « -5,0 t CO₂e par an — mon empreinte transport »
// avec l'image et la marque du produit, indiscernable d'un vrai partage dans un aperçu de
// messagerie. Hors de [0 ; 200], on retombe sur le libellé sans chiffre, exactement comme sur une
// URL sans paramètre.
//
// Ce n'est **pas** une garde de sécurité et il ne faut pas la lire comme telle : `poste` reste du
// texte libre tronqué à 120 caractères, donc l'aperçu reste falsifiable par son libellé. Fermer
// vraiment la fabrication d'aperçus demanderait de signer la query string, ce qui est un autre
// chantier. C'est une garde de robustesse — et la même borne est écrite dans `api/share-card.ts` :
// les deux endpoints lisent la même URL et doivent retomber sur le même repli, sinon le titre et
// l'image se contredisent dans le même aperçu.
const TOTAL_TONNES_MAX = 200;

function totalBorne(raw: string | null): number | null {
  const tonnes = raw ? Number.parseFloat(raw) : NaN;
  if (!Number.isFinite(tonnes) || tonnes < 0 || tonnes > TOTAL_TONNES_MAX) return null;
  return tonnes;
}

/**
 * L'origine, rendue sûre pour une **valeur d'attribut** — et elle seule.
 *
 * `url.origin` vient de l'en-tête `Host`, donc du client. Le guillemet n'est pas un
 * « forbidden host code point » du parseur URL : un hôte qui en porte un traverse `new URL()`
 * sans lever et ressort intact dans `content="…"`, qui se referme alors dessus. Vercel ne
 * route que les hôtes assignés au projet, donc rien n'est atteignable aujourd'hui — mais la
 * garde était une propriété de l'hébergeur et pas une ligne de ce fichier, et l'asymétrie avec
 * `titre`/`description` se lisait comme un oubli alors que le commentaire d'à côté la
 * présentait comme un choix.
 *
 * **Les `&` ne sont pas touchés**, et c'est la moitié qu'il ne faut pas « uniformiser » : la
 * chaîne de requête passe par `URLSearchParams`, dont la sortie a été éprouvée en conditions
 * réelles (v1-06 §2-3), et un lecteur d'aperçu qui n'interprète pas les entités irait chercher
 * une autre URL. Une origine, elle, n'en contient jamais.
 */
function attributSur(origine: string): string {
  return origine.replace(/["'<>]/g, (char) =>
    char === '"' ? '&quot;' : char === "'" ? '&#39;' : char === '<' ? '&lt;' : '&gt;',
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

// **La règle des kilos sous la tonne, recopiée depuis `src/lib/format.ts`.** `api/` ne peut pas
// importer `src/` (tsconfig dédié, runtime Web Fetch API), exactement comme pour `APP_NAME` — donc
// la règle se duplique, et il faut la tenir des deux côtés. Sans cette bascule, un bilan de 40 kg
// partait avec un texte disant « 40 kg CO₂e » et une carte titrée « 0,0 t CO₂e » : les deux
// chiffres du même partage se contredisaient, sur la seule surface publique du produit. C'est le
// constat A3-1, réapparu par la porte de l'aperçu.
//
// Le paramètre arrive en **tonnes** (cf. `urlDePartage`), la règle raisonne en kilos : l'arrondi
// vient avant la comparaison, donc 0,9996 t est une tonne et non « 1000 kg ».
function libelleDuTotal(tonnes: number): string {
  const kilos = Math.round(tonnes * 1000);
  if (kilos < 1000) return `${kilos} kg CO₂e`;
  return `${tonnes.toFixed(1).replace('.', ',')} t CO₂e`;
}

const TITRE_SANS_CHIFFRE = 'Mon empreinte transport';
const DESCRIPTION_SANS_CHIFFRE = 'Calcule ton empreinte carbone transport en 5 minutes sur Ramille.';

// **`try/catch` autour de tout le corps, pas seulement du parsing.** L'en-tête des deux endpoints
// promet qu'une URL mal formée, y compris construite par un tiers, ne les fait jamais planter — et
// une promesse qui ne couvre que le parsing n'en est pas une. Sans ce filet, une exception rend un
// 500 sans détail exploitable (`FUNCTION_INVOCATION_FAILED` côté client) là où un aperçu était
// attendu ; avec lui, on sert la page sans aucun chiffre, celle d'un lien sans paramètre.
export default function handler(request: Request) {
  try {
    return pageDePartage(request);
  } catch (erreur) {
    console.error('api/partage : rendu impossible, repli sans chiffre.', erreur);
    return reponseHtml(
      htmlDePartage({
        titre: TITRE_SANS_CHIFFRE,
        description: DESCRIPTION_SANS_CHIFFRE,
        // Chemins relatifs : le repli ne peut pas supposer que l'URL entrante était analysable,
        // or c'est elle qui donnait l'origine.
        imageUrl: null,
        accueilUrl: '/',
      }),
    );
  }
}

function pageDePartage(request: Request): Response {
  const url = new URL(request.url);
  const poste = (url.searchParams.get('poste') ?? '').slice(0, 120);
  const percentRaw = Number.parseInt(url.searchParams.get('percent') ?? '', 10);
  const percent = Number.isFinite(percentRaw) && percentRaw >= 0 && percentRaw <= 100 ? percentRaw : null;
  const tonnes = totalBorne(url.searchParams.get('total'));
  const totalLabel = tonnes !== null ? libelleDuTotal(tonnes) : null;

  const titre = totalLabel ? `${totalLabel} par an — mon empreinte transport` : TITRE_SANS_CHIFFRE;
  // percent donne un sens réel à `poste` (ex. "58 % de l'empreinte") — sans lui, "Poste
  // principal : Voyages longue distance..." ne dit pas ce que ce poste représente (retour
  // utilisateur du 04/09/2026).
  const description = totalLabel
    ? poste
      ? percent !== null
        ? `Poste principal (${percent} % de l'empreinte) : ${poste}. Calcule la tienne en 5 minutes sur Ramille.`
        : `Poste principal : ${poste}. Calcule la tienne en 5 minutes sur Ramille.`
      : 'Calcule la tienne en 5 minutes sur Ramille.'
    : DESCRIPTION_SANS_CHIFFRE;

  // **La query de la carte est reconstruite, jamais recopiée.** `url.searchParams.toString()`
  // reprenait la chaîne entrante *en entier* : un paramètre inconnu ajouté par un tiers
  // survivait donc jusque dans l'`og:image`, c'est-à-dire dans l'URL que chaque lecteur
  // d'aperçu va chercher — et, `share-card` posant un cache d'un an, chaque valeur inédite
  // est une clé de cache neuve, donc un rendu complet (satori + resvg) qui se paie en
  // invocations. Trois paramètres, dans un ordre fixe : c'est exactement ce que la carte lit,
  // et deux partages identiques produisent maintenant la même clé.
  const queryDeLaCarte = new URLSearchParams();
  if (tonnes !== null) queryDeLaCarte.set('total', url.searchParams.get('total') ?? '');
  if (poste) queryDeLaCarte.set('poste', poste);
  if (percent !== null) queryDeLaCarte.set('percent', String(percent));

  const origine = attributSur(url.origin);
  return reponseHtml(
    htmlDePartage({
      titre,
      description,
      imageUrl: `${origine}/api/share-card?${queryDeLaCarte.toString()}`,
      accueilUrl: `${origine}/`,
    }),
  );
}

// **`noindex, nofollow` et l'en-tête qui va avec.** Cette page porte le chiffre de quelqu'un dans
// son titre ; un lien posté une seule fois sur un forum suffirait à faire entrer « 4,2 t CO₂e par
// an — mon empreinte transport » dans les résultats de recherche du domaine. Deux dégâts : des
// pages personnelles indexées, et la dilution des deux seules surfaces publiques voulues (les
// pages légales). Un produit qui refuse toute comparaison entre utilisateurs n'a pas à en
// fabriquer un catalogue par accident.
//
// L'en-tête **et** la balise, parce qu'ils ne portent pas au même endroit : la balise vaut pour
// cette page HTML, l'en-tête vaut aussi pour l'image d'`api/share-card.ts`, qui n'a pas de
// `<head>` où écrire.
//
// **Et c'est `noindex`, pas `Disallow`.** `public/robots.txt` interdit `/api/` au crawl mais
// rouvre nommément `/api/partage` et `/api/share-card` : facebookexternalhit, Twitterbot et
// LinkedInBot lisent ce fichier avant d'aller chercher une page, donc les y interdire
// supprimerait l'aperçu que ces balises existent pour composer — et priverait du même coup
// tout crawler du droit de lire le `noindex` ci-dessous, seule façon de tenir une URL hors de
// l'index une fois qu'elle a été citée quelque part.
function reponseHtml(html: string): Response {
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

function htmlDePartage({
  titre,
  description,
  imageUrl,
  accueilUrl,
}: {
  titre: string;
  description: string;
  imageUrl: string | null;
  accueilUrl: string;
}): string {
  // `imageUrl` n'est **pas** réécrite : `searchParams.toString()` percent-encode déjà tout ce qui
  // pourrait sortir de l'attribut, et passer ses `&` en `&amp;` modifierait une chaîne dont
  // l'aperçu a été vérifié en conditions réelles (v1-06 §2-3) — un lecteur d'aperçu qui
  // n'interprète pas les entités irait chercher une autre URL. Le titre et la description, eux,
  // portent du texte libre : ils sont échappés.
  const titreEchappe = escapeHtml(titre);
  const descriptionEchappee = escapeHtml(description);

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${titreEchappe}</title>
<meta name="description" content="${descriptionEchappee}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Ramille">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${titreEchappe}">
<meta property="og:description" content="${descriptionEchappee}">
${
  imageUrl === null
    ? '<meta name="twitter:card" content="summary">'
    : `<meta property="og:image" content="${imageUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${imageUrl}">`
}
<meta name="twitter:title" content="${titreEchappe}">
<meta name="twitter:description" content="${descriptionEchappee}">
<style>
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #E4EFE8;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    padding: 24px;
    box-sizing: border-box;
  }
  .card { max-width: 420px; width: 100%; text-align: center; }
  img { max-width: 100%; height: auto; border-radius: 16px; box-shadow: 0 12px 32px rgba(19, 22, 18, 0.12); }
  h1 { font-size: 22px; line-height: 28px; color: #131612; margin: 24px 0 8px; }
  p { font-size: 15px; line-height: 22px; color: #39403B; margin: 0 0 24px; }
  a.cta {
    display: inline-block;
    background: #1F6F4A;
    color: #FFFFFF;
    text-decoration: none;
    font-weight: 600;
    font-size: 16px;
    padding: 14px 28px;
    border-radius: 27px;
  }
</style>
</head>
<body>
  <div class="card">
    ${imageUrl === null ? '' : `<img src="${imageUrl}" width="600" height="315" alt="${titreEchappe}">`}
    <h1>${titreEchappe}</h1>
    <p>${descriptionEchappee}</p>
    <a class="cta" href="${escapeHtml(accueilUrl)}">Faire mon bilan</a>
  </div>
</body>
</html>`;
}
