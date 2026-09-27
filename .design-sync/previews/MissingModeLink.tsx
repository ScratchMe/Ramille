import React from 'react';
import { GroupeDeChoix, MissingModeLink, ModeListItem, ThemedText } from 'ramille-design-system';

const QUESTION_MODE = 'Quel est ton mode de transport principal pour ce trajet ?';

// Les libellés de `COMMUTE_MODE_CHOICES` (src/constants/transport-modes.ts), recopiés.
const MODES = [
  'Voiture (seul)',
  'Voiture (covoiturage)',
  'Bus',
  'Train',
  'Métro ou tram',
  'Vélo',
  'Marche',
  'Deux-roues motorisé',
  'Trottinette ou mobilité douce',
];

/**
 * À sa place, sous la liste des modes du trajet domicile-travail, à 24 px : une porte de sortie
 * discrète, centrée, pour le mode que le référentiel ne connaît pas.
 */
export const SousLaListeDesModes = () => {
  const [mode, setMode] = React.useState<string | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ThemedText type="screenTitle">{QUESTION_MODE}</ThemedText>
      <GroupeDeChoix question={QUESTION_MODE} style={{ gap: 8 }}>
        {MODES.map((libelle) => (
          <ModeListItem key={libelle} label={libelle} selected={mode === libelle} onPress={() => setMode(libelle)} />
        ))}
      </GroupeDeChoix>
      <MissingModeLink context="B1.4 mode domicile-travail" />
    </div>
  );
};

/**
 * Seul : une phrase adressée à la personne, en petit corps tertiaire et en Spline Sans — jamais la
 * chasse fixe. La cible fait 48 px de haut sans déplacer le texte.
 */
export const Seul = () => <MissingModeLink context="B1.7 second mode domicile-travail" />;
