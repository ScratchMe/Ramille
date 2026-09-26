import React from 'react';
// Source : src/components/titre-d-arrivee.tsx — le titre d'un écran qui en remplace un autre sous le doigt, et
// qui prend le focus en arrivant : « C’est envoyé, merci. » après « Envoyer », le calcul du bilan après « Voir
// mon bilan ». Le bouton pressé disparaît avec l'écran qui le portait, et le focus avec lui ; ce composant
// enveloppe le titre de l'écran qui arrive et y porte le focus au montage, pour que le lecteur d'écran dise ce
// titre et reprenne la lecture à partir de lui.
//
// Au montage, et seulement parce que ce montage suit un geste : ne pas l'employer sur un écran qui peut s'ouvrir
// sans geste — une route qu'on charge, un onglet qu'on retrouve. Sur web, l'enveloppe ne porte que
// `tabIndex={-1}` : le titre à l'intérieur garde son propre rôle d'en-tête, et un second en-tête autour de lui
// le ferait lire deux fois. `preventScroll` laisse le défilement à qui l'a lancé.
export function TitreDArrivee({ style, children }) {
  const cible = React.useRef(null);
  React.useEffect(() => {
    if (cible.current && cible.current.focus) cible.current.focus({ preventScroll: true });
  }, []);
  return (
    <div ref={cible} tabIndex={-1} style={{ display: 'flex', flexDirection: 'column', ...style }}>
      {children}
    </div>
  );
}
