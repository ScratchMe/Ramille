import React from 'react';
import { ThemedView } from '../core/ThemedView.jsx';
import { contexteDesAncres } from './IntituleDuChamp.jsx';
// Source : src/components/bilan/boite-de-precision.tsx — ce qui s'ouvre sous un choix pour le préciser, écrit une
// fois : 8 sous le choix, un retrait de 16, fond `backgroundElement`, rayon 16 (`Radius.field`), 12 de marge
// intérieure, 16 entre deux groupes, 8 sous la boîte — donc 12 jusqu'au choix suivant d'une famille. Les deux marges
// sont dans le dépli : elles s'ouvrent avec lui.
//
// `PrecisionMode` et `PrecisionChiffres` ne dessinent pas de boîte : ils sont un intitulé et son groupe, posés ici.
// Une boîte en porte un, ou deux quand un choix ouvre deux précisions — le covoiturage du trajet et des sorties (la
// motorisation, puis combien vous êtes), la voiture des longs trajets, un second mode qui a un type (le type, puis la
// part du trajet). Deux groupes, jamais un groupe fusionné : chacun garde son `radiogroup` nommé par sa question.
//
// 12 est hors de l'échelle des espacements, et c'est voulu : avec 16, cinq puces de 48 passaient à la ligne à 360 ;
// avec 12, elles tiennent à 0 px près (272 + les 8 que la grille rend par sa marge négative, pour 5 × 56).
//
// À l'ouverture, l'écran remonte juste assez pour qu'elle finisse 16 au-dessus du pied, sans jamais faire passer le
// choix au-dessus du bord (8) — seulement quand elle suit une réponse, jamais au préremplissage. Le focus reste sur
// le choix qu'on vient de toucher. Dans le dépôt, c'est un `Depliage` suivi (hauteur animée 250 ms, fondu 200 ms, sur web ; posé sur Android),
// et la borne est le haut du `ChoixOuvrant` qui enveloppe le choix et sa boîte ; le kit pose la boîte à sa hauteur
// finale, et prend pour borne l'élément qui l'enveloppe avec son choix.
export function BoiteDePrecision({ children }) {
  const depli = React.useRef(null);
  const ancres = React.useContext(contexteDesAncres());
  // Lue au montage seulement : l'annonce part une fois, à l'ouverture.
  const annoncer = React.useRef(ancres ? ancres.ouverture : null);
  React.useEffect(() => {
    // Les marges sont hors du rectangle mesuré : son bas est celui de la boîte, ce qui doit finir 16 au-dessus du pied.
    if (annoncer.current && depli.current) annoncer.current(depli.current, depli.current.parentElement);
  }, []);
  return (
    <div ref={depli} style={{ marginTop: 8, marginBottom: 8, display: 'flex', flexDirection: 'column' }}>
      <ThemedView type="backgroundElement" style={{ borderRadius: 16, padding: 12, gap: 16, marginLeft: 16 }}>
        {children}
      </ThemedView>
    </div>
  );
}
