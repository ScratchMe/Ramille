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

export default function handler(request: Request) {
  const url = new URL(request.url);
  const total = url.searchParams.get('total');
  const poste = (url.searchParams.get('poste') ?? '').slice(0, 120);
  const percentRaw = Number.parseInt(url.searchParams.get('percent') ?? '', 10);
  const percent = Number.isFinite(percentRaw) && percentRaw >= 0 && percentRaw <= 100 ? percentRaw : null;
  const tonnes = total ? Number.parseFloat(total) : NaN;
  const totalLabel = Number.isFinite(tonnes) ? `${tonnes.toFixed(1).replace('.', ',')} t CO₂e` : null;

  const imageUrl = `${url.origin}/api/share-card?${url.searchParams.toString()}`;
  const appUrl = url.origin;

  const title = totalLabel ? `${totalLabel} par an — mon empreinte transport` : 'Mon empreinte transport';
  // percent donne un sens réel à `poste` (ex. "58 % de l'empreinte") — sans lui, "Poste
  // principal : Voyages longue distance..." ne dit pas ce que ce poste représente (retour
  // utilisateur du 04/09/2026).
  const description = totalLabel
    ? poste
      ? percent !== null
        ? `Poste principal (${percent} % de l'empreinte) : ${poste}. Calcule la tienne en 5 minutes sur TraceVerte.`
        : `Poste principal : ${poste}. Calcule la tienne en 5 minutes sur TraceVerte.`
      : 'Calcule la tienne en 5 minutes sur TraceVerte.'
    : 'Calcule ton empreinte carbone transport en 5 minutes sur TraceVerte.';

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${imageUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${imageUrl}">
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
    <img src="${imageUrl}" width="600" height="315" alt="${escapeHtml(title)}">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <a class="cta" href="${appUrl}/">Faire mon bilan</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
