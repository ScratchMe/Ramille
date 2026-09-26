import React from 'react';
import { ChoiceRow } from 'ramille-design-system';

const Liste = ({ children }: { children?: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
);

/** Un choix exclusif, pleine largeur — la première question du questionnaire (B1.1). */
export const OuiNon = () => (
  <Liste>
    <ChoiceRow label="Oui" selected />
    <ChoiceRow label="Non" selected={false} />
  </Liste>
);

/**
 * Les tranches de distance d'un aller (B1.3), libellés du questionnaire. `ChoiceRow` ne porte
 * qu'un libellé : le canal de rappel, avec sa seconde ligne et son état indisponible, n'est pas
 * une rangée mais une `LigneDeCanal` (dans `ChoixDeRappel` et `FeuilleRappels`) — cet aperçu le
 * montrait à tort jusqu'au 26/09/2026, avec des props `detail` et `disabled` qui n'existent pas.
 */
export const TranchesDeDistance = () => (
  <Liste>
    <ChoiceRow label="Moins de 5 km" selected={false} />
    <ChoiceRow label="5 à 15 km" selected />
    <ChoiceRow label="15 à 30 km" selected={false} />
    <ChoiceRow label="30 à 50 km" selected={false} />
    <ChoiceRow label="Plus de 50 km" selected={false} />
  </Liste>
);

/** La fréquence des sorties du week-end (B2.1) : un libellé long reste sur une rangée pleine. */
export const FrequenceDesSorties = () => (
  <Liste>
    <ChoiceRow label="Rarement — une fois par mois ou moins" selected={false} />
    <ChoiceRow label="Une fois par semaine" selected />
    <ChoiceRow label="Plusieurs fois par semaine" selected={false} />
  </Liste>
);
