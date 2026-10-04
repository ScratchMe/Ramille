// Le captcha Turnstile dans l'app Android : la page que la vue web charge, et ce qu'elle renvoie.
//
// Module **pur** : aucune importation de la plateforme, pour la raison donnée en tête de
// `src/types/session.ts`. Le composant (`src/components/captcha-natif.tsx`) et le pont
// (`src/lib/captcha.ts`) ne font que brancher ce qui est décidé ici.
//
// **Pourquoi une page écrite par l'app, et pas une page du site** (04/10/2026). Turnstile ne vit que
// dans une page web, et il refuse un nom d'hôte qui n'est pas dans la liste du widget (`ramille.fr`,
// `www.ramille.fr`). La vue web charge donc ce HTML avec `www.ramille.fr` comme origine
// (`baseUrl`) : Cloudflare voit le bon nom d'hôte, sans page publique à servir, sans CSP à élargir et
// sans garde d'export à contenter — une page `public/captcha.html` aurait dû porter titre,
// description et `noindex`, et dépendre d'un déploiement.

/** Ce que la page renvoie à l'app, une fois lu. */
export type MessageDuCaptcha =
  | { type: 'jeton'; jeton: string }
  | { type: 'interaction' }
  | { type: 'erreur' };

/** L'action du widget, comme sur le web (`UsageDuCaptcha` de `src/lib/captcha.ts`). */
export type UsageDuCaptchaNatif = 'session_anonyme' | 'code_de_connexion';

/**
 * La page de la vue web : Turnstile en rendu explicite, mode `interaction-only` comme sur le web, et
 * chaque issue renvoyée par `window.ReactNativeWebView.postMessage`. La clé et l'usage passent par
 * `JSON.stringify`, jamais collés dans le script : une valeur qui contiendrait un guillemet ne
 * pourrait rien y injecter.
 *
 * La page est transparente et sans marge : la carte qui l'entoure quand Cloudflare demande de
 * cocher est dessinée par l'app, aux jetons du produit, comme sur le web.
 */
export function pageDuCaptcha(cle: string, usage: UsageDuCaptchaNatif): string {
  const options = JSON.stringify({ sitekey: cle, action: usage });
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;padding:0;background:transparent;display:flex;justify-content:center}</style>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"></script>
</head>
<body>
<div id="widget"></div>
<script>
(function () {
  function envoyer(message) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
  function poser() {
    if (!window.turnstile) { envoyer({ type: 'erreur' }); return; }
    var options = ${options};
    window.turnstile.render('#widget', {
      sitekey: options.sitekey,
      action: options.action,
      language: 'fr',
      theme: 'light',
      appearance: 'interaction-only',
      retry: 'never',
      callback: function (jeton) { envoyer({ type: 'jeton', jeton: jeton }); },
      'error-callback': function () { envoyer({ type: 'erreur' }); return true; },
      'before-interactive-callback': function () { envoyer({ type: 'interaction' }); }
    });
  }
  if (document.readyState === 'complete') poser();
  else window.addEventListener('load', poser);
})();
</script>
</body>
</html>`;
}

/**
 * Lit un message de la page. Tout ce qui n'a pas la forme attendue vaut `null` et s'ignore : la vue
 * web ne charge que cette page, mais un message illisible ne doit ni lever ni passer pour un jeton.
 */
export function lireMessageDuCaptcha(donnees: string): MessageDuCaptcha | null {
  let message: unknown;
  try {
    message = JSON.parse(donnees);
  } catch {
    return null;
  }
  if (typeof message !== 'object' || message === null) return null;
  const { type, jeton } = message as { type?: unknown; jeton?: unknown };
  if (type === 'jeton') return typeof jeton === 'string' && jeton !== '' ? { type: 'jeton', jeton } : null;
  if (type === 'interaction') return { type: 'interaction' };
  if (type === 'erreur') return { type: 'erreur' };
  return null;
}
