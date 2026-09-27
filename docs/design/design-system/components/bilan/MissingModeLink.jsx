import React from 'react';
import { TextLink } from '../core/TextLink.jsx';
// Source : src/components/bilan/missing-mode-link.tsx — le lien discret sous une liste de modes du questionnaire,
// vers le canal de retour. Une porte de sortie pour les rares modes absents du référentiel, pas une invitation à
// quitter le questionnaire : petit corps, couleur tertiaire, centré — en Spline Sans, c'est une phrase adressée à
// la personne, jamais la chasse fixe.
//
// Un `TextLink`, `role="link"` ; le centrage se pose sur le texte ET sur la cible : sur web, l'un sans l'autre ne
// centre pas. `context` part avec le retour et ne s'affiche jamais : le kit, sans navigation, ne l'emploie pas, mais
// le garde dans la signature pour que les étapes s'écrivent comme dans le dépôt.
export function MissingModeLink({ context }) {
  return (
    <TextLink
      label="Ton mode n’est pas dans la liste ? Dis-le-nous."
      role="link"
      type="small"
      themeColor="textTertiary"
      containerStyle={{ alignItems: 'center' }}
      style={{ textAlign: 'center' }}
    />
  );
}
