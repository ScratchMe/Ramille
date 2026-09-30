import React from 'react';
import { GroupeDeChoix, MissingModeLink, ModeListItem, ThemedText } from 'ramille-design-system';

const QUESTION_MODE = 'Quel est ton mode de transport principal pour ce trajet ?';

// Les libellés de `COMMUTE_MODE_CHOICES` (src/constants/transport-modes.ts), recopiés, dans les trois familles de
// `MODES_PAR_FAMILLE` : motorisés, collectifs, actifs — 4 px dans une famille, 16 entre deux.
const FAMILLES = [
  ['Voiture (seul)', 'Voiture (covoiturage)', 'Deux-roues motorisé'],
  ['Bus', 'Train', 'Métro ou tram'],
  ['Vélo', 'Marche', 'Trottinette ou mobilité douce'],
];

/**
 * À sa place, sous la liste des modes du trajet domicile-travail, à 8 px : une porte de sortie
 * discrète, centrée, pour le mode que le référentiel ne connaît pas.
 */
export const SousLaListeDesModes = () => {
  const [mode, setMode] = React.useState<string | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <ThemedText type="screenTitle">{QUESTION_MODE}</ThemedText>
      <GroupeDeChoix question={QUESTION_MODE} style={{ gap: 16, marginTop: 16 }}>
        {FAMILLES.map((famille) => (
          <div key={famille[0]} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {famille.map((libelle) => (
              <ModeListItem key={libelle} label={libelle} selected={mode === libelle} onPress={() => setMode(libelle)} />
            ))}
          </div>
        ))}
      </GroupeDeChoix>
      <div style={{ marginTop: 8 }}>
        <MissingModeLink context="B1.4 mode domicile-travail" />
      </div>
    </div>
  );
};

/**
 * Seul : une phrase adressée à la personne, en petit corps tertiaire et en Spline Sans — jamais la
 * chasse fixe. La cible fait 48 px de haut sans déplacer le texte.
 */
export const Seul = () => <MissingModeLink context="B1.7 second mode domicile-travail" />;
