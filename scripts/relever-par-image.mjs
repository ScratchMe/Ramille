// Relever une animation image par image — pour les deux gardes qui ouvrent vraiment les pages :
// `verifier-etats-export.mjs` (section J, ce qui se voit sans réseau) et `verifier-parcours-reel.mjs`
// (la feuille, l'arrivée de la barre, le point répondu, qui demandent des données). Écrit le
// 27/09/2026 avec les transitions (`docs/architecture/v1-30-les-transitions.md`), et écrit une fois
// pour les deux, comme `mesurer-un-choix.mjs` : deux copies d'une mesure divergent, et on ne sait
// plus laquelle a raison.
//
// **Une animation ne se juge pas au repos.** Une étape qui entre et une étape posée d'emblée
// finissent au même endroit ; tout ce qu'on voudrait savoir se lit pendant, à chaque image
// (`requestAnimationFrame`). Et « en chemin » se lit sur une valeur **strictement intermédiaire**,
// jamais sur une durée : un runner lent perd des images, il n'en invente pas.

/**
 * Posé avant le premier script de la page (`page.addInitScript(releverParImage, depuisLeDebut)`),
 * donc **autonome** : Playwright en transmet le texte, pas les modules qu'il importerait.
 *
 * - `window.__releve.demarrer(mesures, duree)` relève chaque mesure nommée à chaque image, jusqu'à
 *   la fin de la durée — `mesures` associe une clé à `[nom, argument]` ;
 * - `window.__releve.mesurer(nom, argument)` en prend une seule, au repos ;
 * - `depuisLeDebut` (`{ mesures, duree }`) lance le relevé avant que React ne monte : la seule façon
 *   de voir la première image d'un écran.
 *
 * Une cible introuvable rend `null`, et c'est à l'assertion de dire qu'elle ne peut pas conclure.
 */
export function releverParImage(depuisLeDebut) {
  const normaliser = (t) => (t ?? '').replace(/\s+/g, ' ').trim();
  // L'opacité qu'on voit est le produit de celles des ancêtres : l'animation vit sur une enveloppe,
  // jamais sur le texte qu'on vise.
  const opacite = (n) => {
    let o = 1;
    for (let e = n; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
    return o;
  };
  const visible = (e) => e.getClientRects().length > 0 && (e.checkVisibility?.({ visibilityProperty: true }) ?? true);
  const MESURES = {
    barre: () => {
      const n = document.querySelector('[role="tablist"]');
      const r = n?.getBoundingClientRect();
      return r && r.height > 0 ? { opacite: opacite(n), haut: r.top } : null;
    },
    titre: (texte) => {
      const n = [...document.querySelectorAll('h1, [role="heading"]')].find(
        (t) => visible(t) && normaliser(t.innerText) === texte
      );
      return n ? { opacite: opacite(n), gauche: n.getBoundingClientRect().left } : null;
    },
    // Le plus profond des éléments visibles dont c'est tout le texte : ni un ancêtre, qui porterait
    // aussi ses voisins, ni un écran resté monté sous l'écran courant, dans la pile.
    texte: (texte) => {
      const n = [...document.querySelectorAll('body *')].find(
        (e) =>
          visible(e) &&
          normaliser(e.innerText) === texte &&
          ![...e.children].some((c) => normaliser(c.innerText) === texte)
      );
      return n ? { opacite: opacite(n), haut: n.getBoundingClientRect().top } : null;
    },
    // Visible, comme les autres : une option se trouve par son `aria-label`, qui survit à un
    // `visibility: hidden` — sans ce filtre, une précision masquée passait pour là.
    option: (nom) => {
      const n = [...document.querySelectorAll('[role="radio"]')].find(
        (o) => visible(o) && (o.getAttribute('aria-label') ?? normaliser(o.innerText)) === nom
      );
      return n ? { opacite: opacite(n), haut: n.getBoundingClientRect().top } : null;
    },
    // Le rail n'a ni rôle ni nom : c'est l'enfant de la piste qui suit la ligne « Étape N sur M »
    // (`src/components/bilan/progress-header.tsx`).
    rail: () => {
      const etape = [...document.querySelectorAll('div')].find(
        (d) => d.children.length === 0 && /^Étape \d+ sur \d+$/.test(normaliser(d.innerText))
      );
      const rail = etape?.parentElement?.nextElementSibling?.firstElementChild;
      return rail ? { largeur: rail.getBoundingClientRect().width } : null;
    },
    // Une scène d'onglet se reconnaît à sa taille ; on compte celles qui sont en plein fondu, ni
    // transparentes ni opaques.
    scenes: () => ({
      enFondu: [...document.querySelectorAll('div')].filter((d) => {
        const o = Number(getComputedStyle(d).opacity);
        return o > 0.02 && o < 0.98 && d.getBoundingClientRect().height > 400;
      }).length,
    }),
    // L'anneau de focus d'un contrôle, que le navigateur dessine **hors** de l'élément : le premier
    // ancêtre qui le découperait — `overflow` autre que `visible`, dont la boîte ne contient pas le
    // contrôle élargi de deux pixels —, ou `null`. Une découpe au ras l'effaçait
    // (`HauteurSuivie`, 27/09/2026).
    anneau: ({ role, nom }) => {
      const n = [...document.querySelectorAll(`[role="${role}"]`)].find(
        (e) => visible(e) && (e.getAttribute('aria-label') ?? normaliser(e.innerText)) === nom
      );
      if (!n) return null;
      const r = n.getBoundingClientRect();
      for (let a = n.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
        const b = a.getBoundingClientRect();
        const dedans =
          r.left - 2 >= b.left + a.clientLeft - 0.5 &&
          r.top - 2 >= b.top + a.clientTop - 0.5 &&
          r.right + 2 <= b.left + a.clientLeft + a.clientWidth + 0.5 &&
          r.bottom + 2 <= b.top + a.clientTop + a.clientHeight + 0.5;
        if (!dedans) return { rogne: `${a.tagName.toLowerCase()} (overflow ${cs.overflowX}/${cs.overflowY})` };
      }
      return { rogne: null };
    },
    // La hauteur de la découpe qui porte un contrôle — le premier ancêtre qui ne laisse rien
    // dépasser, c'est-à-dire le cadre d'une `HauteurSuivie`. Une **hauteur** et non une position :
    // une position se lit à travers le défilement, et l'ancrage du navigateur compense ce qui
    // grandit au-dessus de la fenêtre — la carte du point regrandissait au retour sur le plan sans
    // que rien de visible ne bouge dans la mesure (contre-lecture du 27/09/2026).
    decoupe: ({ role, nom }) => {
      const n = [...document.querySelectorAll(`[role="${role}"]`)].find(
        (e) => visible(e) && (e.getAttribute('aria-label') ?? normaliser(e.innerText)) === nom
      );
      for (let a = n?.parentElement; a && a !== document.body; a = a.parentElement) {
        if (getComputedStyle(a).overflowY === 'hidden') return { hauteur: a.getBoundingClientRect().height };
      }
      return null;
    },
    // Une feuille du bas (`src/components/feuille-du-bas.tsx`), par le nom de son dialogue : son
    // voile — le seul élément sans enfant qui couvre toute la fenêtre — et le haut de la feuille,
    // qui porte l'en-tête du même nom.
    //
    // **Par `aria-modal` et non par le rôle** : react-native-web ne pose `role="dialog"` qu'une fois
    // le `Modal` « actif », c'est-à-dire à la fin de **son** animation (`onShow`, sur
    // `animationEnd`). Cherchée par son rôle, une feuille remise en `slide` était invisible pendant
    // tout son glissement, puis relevée déjà posée : la garde tombait, mais en disant « s'ouvre d'un
    // coup » d'une feuille qui glissait, voile compris (mutation P1, 27/09/2026).
    feuille: (titre) => {
      const dialogue = [...document.querySelectorAll('[aria-modal="true"]')].find(
        (d) => d.getAttribute('aria-label') === titre
      );
      // Et **montré** : au premier rendu, react-native-web pose `opacity: 0` sur tout le `Modal`
      // (`styles.hidden` de `ModalAnimation`), le temps que son effet le rende. Relevée là, la feuille
      // est à sa place mais son voile vaut zéro, ce qui se lisait « elle bouge » sous la préférence —
      // une fausse alerte, au premier passage en CI, mesurée ensuite image par image. Ce n'est pas un
      // mouvement : le `Modal` n'est pas encore montré, feuille et voile ensemble.
      if (!dialogue || opacite(dialogue) < 0.01) return null;
      const voile = [...dialogue.querySelectorAll('div')].find((d) => {
        const r = d.getBoundingClientRect();
        return d.children.length === 0 && r.width >= innerWidth - 1 && r.height >= innerHeight - 1;
      });
      const entete = [...dialogue.querySelectorAll('h1, h2, h3, [role="heading"]')].find(
        (h) => normaliser(h.innerText) === titre
      );
      return {
        voile: voile ? { opacite: opacite(voile), haut: voile.getBoundingClientRect().top } : null,
        haut: entete?.parentElement ? entete.parentElement.getBoundingClientRect().top : null,
      };
    },
  };
  const releve = (mesures) =>
    Object.fromEntries(Object.entries(mesures).map(([cle, [nom, argument]]) => [cle, MESURES[nom](argument)]));
  window.__releve = {
    echantillons: [],
    mesurer: (nom, argument) => MESURES[nom](argument),
    demarrer(mesures, duree) {
      const echantillons = [];
      window.__releve.echantillons = echantillons;
      const debut = performance.now();
      const image = () => {
        echantillons.push({ t: Math.round(performance.now() - debut), ...releve(mesures) });
        if (performance.now() - debut < duree) requestAnimationFrame(image);
      };
      requestAnimationFrame(image);
    },
  };
  if (depuisLeDebut) window.__releve.demarrer(depuisLeDebut.mesures, depuisLeDebut.duree);
}

/** Lance un relevé, joue le geste, attend la fin, et rend les échantillons. */
export async function releverPendant(page, mesures, geste, duree = 800) {
  await page.evaluate(({ mesures, duree }) => window.__releve.demarrer(mesures, duree), { mesures, duree });
  await geste();
  await page.waitForTimeout(duree + 200);
  return page.evaluate(() => window.__releve.echantillons);
}

/** Les échantillons d'un relevé lancé plus tôt — par `depuisLeDebut`, ou avant une navigation. */
export const echantillons = (page) => page.evaluate(() => window.__releve.echantillons);

/** Une mesure au repos. */
export const mesurer = (page, nom, argument) =>
  page.evaluate(([n, a]) => window.__releve.mesurer(n, a), [nom, argument]);

/** Strictement entre deux valeurs, à une marge près (un demi-pixel par défaut) : ni au départ, ni à l'arrivée. */
export const entre = (valeur, a, b, marge = 0.5) => valeur > Math.min(a, b) + marge && valeur < Math.max(a, b) - marge;

/** Parmi des valeurs relevées, celle qui est la plus éloignée d'un repère — le départ observé d'un mouvement. */
export const plusLoin = (valeurs, repere) =>
  valeurs.reduce((loin, v) => (Math.abs(v - repere) > Math.abs(loin - repere) ? v : loin), repere);

/**
 * **Un mouvement, pas un saut** : au moins une valeur strictement entre le repère (l'arrivée, ou le
 * départ d'une sortie) et la valeur la plus éloignée qu'on a relevée.
 *
 * « Au moins une image ailleurs qu'à l'arrivée » ne suffit pas, et c'est une mutation qui l'a montré
 * le 27/09/2026 (P4 du parcours réel) : une barre qui surgit sans glisser passait quand même, parce
 * qu'elle attend masquée en bas et transparente, et qu'un effet — qui part après le rendu — ne la
 * remet en place qu'une image plus tard. Une image au départ puis une à l'arrivée, c'est un saut.
 */
export const enChemin = (valeurs, repere, marge = 0.5) => {
  const loin = plusLoin(valeurs, repere);
  return valeurs.some((v) => entre(v, repere, loin, marge));
};

export const ouiNon = (vrai) => (vrai === true ? 'oui' : 'non');

/**
 * Vrai si une cible, une fois relevée, a disparu d'au moins une image ensuite : masquée, retirée,
 * remontée. Sans ce contrôle, une moitié « rien ne bouge » ne regardait que les images où la cible
 * était là, et concluait sur ce qu'elle ne voyait pas (contre-lecture du 27/09/2026).
 *
 * **Ce n'est pas le mode d'échec d'`entering`**, mesuré le 28/09/2026 : `entering` masque la cible
 * **avant** de la montrer — une apparition tardive, que ce contrôle laisse passer et que voient les
 * branches du sens, du fondu et du focus. Ce qu'il voit, c'est un clignotement (mutations J16, J17
 * et P9).
 */
export const disparaitApresEtreApparue = (valeurs) => {
  const premiere = valeurs.findIndex((v) => v != null);
  return premiere >= 0 && valeurs.slice(premiere).some((v) => v == null);
};
