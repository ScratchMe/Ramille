import React from 'react';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/bilan/ancre-du-champ.tsx — l'intitulé d'un champ du questionnaire, et ce qui le rattache à
// « Il manque encore … » : chaque étape enregistre ses champs auprès de `StepShell`, qui y mène au toucher du
// « Suivant » en attente — l'écran y défile, le focus s'y pose, et l'intitulé passe en `accentText` 600 depuis sa
// couleur de tous les jours (`textSecondary` pour une précision, `textTertiary` pour « Lequel ? » et le contexte,
// `text` pour un sous-titre d'étape). Jamais d'office, jamais pendant qu'on répond, jamais sur le titre de l'étape.
//
// Deux écarts avec le dépôt, tous deux dus au kit et non au produit :
//   - le dépôt partage le contexte des ancres par une constante (`ContexteDesAncres`) ; le chargeur du kit n'expose
//     que les fonctions déclarées en tête de fichier, donc le contexte s'obtient ici par `contexteDesAncres()`, qui le
//     crée une fois. Il porte aussi l'annonce d'une ouverture (`BoiteDePrecision`), que le dépôt fait passer par
//     `SuiviDesOuvertures` (src/lib/mouvement.tsx) ;
//   - le dépôt donne à chaque ancre sa cible de focus par la prop `ref` d'une option (`Chip`, `ChoiceRow`,
//     `ModeListItem`, `NumericField`) ; les cartes du kit tournent sous React 18, où une fonction ne reçoit pas `ref`,
//     donc `useAncreDuChamp` ne rend que le bloc et la marque, et `StepShell` retrouve la cible dans le bloc — la
//     règle d'`optionCible` : l'option cochée du groupe, ou sa première, ou le champ de saisie.
//
// Hors de `StepShell`, rien ne se passe : l'ancre ne s'enregistre nulle part et la marque vaut faux — c'est le cas de
// l'écran `/contexte`, qui rend `ChampsDeContexte` sans le questionnaire autour.

let contexte = null;
export function contexteDesAncres() {
  if (contexte === null) contexte = React.createContext(null);
  return contexte;
}

export function useMarqueDuChamp(champ) {
  const ancres = React.useContext(contexteDesAncres());
  return !!champ && !!ancres && ancres.marque === champ;
}

// `saisie` : le bloc est un champ de saisie, qui reçoit le focus lui-même (et ouvre le clavier sur l'appareil).
export function useAncreDuChamp(champ, options) {
  const saisie = !!(options && options.saisie);
  const ancres = React.useContext(contexteDesAncres());
  const bloc = React.useRef(null);
  const enregistrer = ancres ? ancres.enregistrer : null;
  React.useEffect(() => {
    if (!enregistrer || !champ) return undefined;
    return enregistrer(champ, { bloc, saisie });
  }, [enregistrer, champ, saisie]);
  return { bloc, marque: useMarqueDuChamp(champ) };
}

export function IntituleDuChamp({ marque, themeColor, weight, ...props }) {
  return <ThemedText {...props} themeColor={marque ? 'accentText' : themeColor} weight={marque ? 600 : weight} />;
}
