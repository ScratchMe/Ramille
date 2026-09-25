// Ce que les contrôles d'export mesurent d'un choix autour d'un appui clavier — partagé par
// `verifier-etats-export.mjs` (section F) et `verifier-parcours-reel.mjs` (25/09/2026).
//
// **Extraite dès la seconde copie**, pour la raison de `servir-export.mjs` : deux mesures d'une même
// chose divergent au premier réglage de l'une, et un garde-fou mesurerait alors autre chose que
// l'autre sans que rien ne le dise.

/**
 * L'état d'un choix, s'il a le focus, et la position de tout ce qui peut défiler autour de lui — ses
 * ancêtres qui débordent, et le document.
 *
 * **Évaluée dans la page, sur l'élément** (`locator.evaluate(mesurerUnChoix)`) : Playwright en
 * envoie le texte au navigateur, donc elle ne doit rien capturer de ce module.
 *
 * `peutDefiler` dit si un défilement était possible sous le choix : sans lui, « la page n'a pas
 * défilé » ne prouverait rien — une page trop courte ne défile jamais, avec ou sans correctif.
 */
export function mesurerUnChoix(choix) {
  const defileurs = [];
  for (let n = choix.parentElement; n; n = n.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(n).overflowY) && n.scrollHeight > n.clientHeight + 1) defileurs.push(n);
  }
  const tous = [...defileurs, document.scrollingElement];
  return {
    etat: choix.getAttribute('aria-checked'),
    focus: document.activeElement === choix,
    positions: tous.map((n) => Math.round(n.scrollTop)).join(','),
    peutDefiler: tous.some((n) => n.scrollTop + n.clientHeight < n.scrollHeight - 1),
  };
}
