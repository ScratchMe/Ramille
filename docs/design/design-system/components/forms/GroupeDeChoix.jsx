import React from 'react';
// Source : src/components/bilan/groupe-de-choix.tsx — le conteneur d'une série de choix : un `radiogroup`
// quand on n'en choisit qu'un, un `group` quand ils se cumulent, toujours nommé par la question à laquelle
// il répond. C'est le seul endroit qui pose l'un de ces deux rôles, dans le dépôt comme dans le kit.
//
// Au clavier, un `radiogroup` se comporte comme des cases d'option natives (src/lib/groupe-au-clavier.ts) :
// un seul arrêt de tabulation — l'option cochée, sinon la première qu'on peut choisir —, et les flèches
// passent à la voisine en la cochant, bouclent aux deux bouts et sautent les options désactivées. Les
// options d'un groupe sont celles dont il est le groupe LE PLUS PROCHE : une précision imbriquée (« Quelle
// motorisation ? » sous « Voiture (seul) ») garde ses flèches et son arrêt. Un `group` de cases à cocher
// n'y passe pas : chacune reste un arrêt, et les flèches n'y font rien.

// `sensDeLaTouche`, `optionVoisine` et `arretDeTabulation` (src/types/groupe-au-clavier.ts), recopiées :
// le kit ne lit rien de `src/`.
const sensDeLaTouche = (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return null;
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') return 1;
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') return -1;
  return null;
};
const optionVoisine = (etats, courante, sens) => {
  const n = etats.length;
  for (let pas = 1; pas < n; pas++) {
    const i = (courante + sens * pas + n) % n;
    if (!etats[i].desactivee) return i;
  }
  return null;
};
const arretDeTabulation = (etats) => {
  const cochee = etats.findIndex((o) => o.cochee && !o.desactivee);
  if (cochee !== -1) return cochee;
  const premiere = etats.findIndex((o) => !o.desactivee);
  return premiere === -1 ? null : premiere;
};

function brancherLeClavier(groupe) {
  const options = () =>
    Array.from(groupe.querySelectorAll('[role="radio"]')).filter((o) => o.closest('[role="radiogroup"]') === groupe);
  const etat = (o) => ({
    cochee: o.getAttribute('aria-checked') === 'true',
    // Le kit rend ses options en `<button>` : désactivées par l'attribut `disabled`, là où react-native-web
    // pose `aria-disabled`. Les deux se lisent.
    desactivee: o.disabled === true || o.getAttribute('aria-disabled') === 'true',
  });
  const ranger = () => {
    const liste = options();
    const arret = arretDeTabulation(liste.map(etat));
    liste.forEach((o, i) => {
      if (etat(o).desactivee) return;
      const voulu = i === arret ? '0' : '-1';
      if (o.getAttribute('tabindex') !== voulu) o.setAttribute('tabindex', voulu);
    });
  };
  const auClavier = (e) => {
    const sens = sensDeLaTouche(e);
    if (sens === null) return;
    const liste = options();
    const courante = liste.indexOf(e.target);
    // Une touche qui ne vient pas d'une option de CE groupe — celle d'une précision imbriquée, un lien posé
    // au milieu — garde son sens.
    if (courante === -1) return;
    e.preventDefault();
    const i = optionVoisine(liste.map(etat), courante, sens);
    if (i === null) return;
    liste[i].focus();
    if (!etat(liste[i]).cochee) liste[i].click();
  };
  groupe.addEventListener('keydown', auClavier);
  const observateur = new MutationObserver(ranger);
  observateur.observe(groupe, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-checked', 'aria-disabled', 'disabled', 'tabindex'] });
  ranger();
  return () => {
    groupe.removeEventListener('keydown', auClavier);
    observateur.disconnect();
  };
}

export function GroupeDeChoix({ question, cumulable = false, colonnes, style, children }) {
  const role = cumulable ? 'group' : 'radiogroup';
  const groupe = React.useRef(null);
  const enGrille = colonnes !== undefined;
  React.useEffect(() => {
    if (cumulable || !groupe.current) return undefined;
    return brancherLeClavier(groupe.current);
  }, [cumulable, enGrille]);

  // Un `View` de React Native est une colonne flexible par défaut ; le kit reprend ce défaut pour qu'une
  // série posée sans style se range comme dans le dépôt.
  if (!enGrille) {
    return (
      <div ref={groupe} role={role} aria-label={question} style={{ display: 'flex', flexDirection: 'column', ...style }}>
        {children}
      </div>
    );
  }
  // `colonnes` est un maximum, pas une promesse : une cellule ne descend jamais sous une cible de 48 plus son
  // écart de 8, donc sept jours sur quatre colonnes passent d'eux-mêmes à trois quand quatre n'y tiennent plus.
  // L'écart vient d'une marge intérieure de chaque cellule et non d'un `gap`, qui s'ajouterait aux largeurs en
  // pourcentage au lieu de s'en retrancher.
  const largeur = 100 / colonnes + '%';
  return (
    <div ref={groupe} role={role} aria-label={question} style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, margin: '0 -4px', ...style }}>
      {React.Children.map(children, (puce) => (
        <div style={{ width: largeur, minWidth: 56, padding: '0 4px', display: 'flex', flexDirection: 'column' }}>{puce}</div>
      ))}
    </div>
  );
}
