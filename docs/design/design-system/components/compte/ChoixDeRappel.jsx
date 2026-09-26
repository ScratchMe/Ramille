import React from 'react';
import { LigneDeCanal } from '../forms/LigneDeCanal.jsx';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/compte/choix-de-rappel.tsx — bloc « Les rappels » sur « Toi » : l'en-tête, puis un
// `radiogroup` nommé par lui, qui ne porte que les lignes.
const TITRE = 'Les rappels';
export function ChoixDeRappel({ lignes, canal, permission = 'demandable', onChoisir }) {
  const DETAIL_NOTIFICATION = {
    accordee: 'Le matin où la question s’ouvre.',
    demandable: 'À activer en une fois.',
    fermee: 'Coupées dans les réglages du téléphone — c’est là que ça se rouvre.',
  };
  // `lignesDeReglage` (src/types/rappels.ts) sur un appareil sans compte. Sur web, la ligne « notification »
  // n'existe pas plutôt que d'être grisée.
  const items = lignes || [
    { canal: 'push', titre: 'Par notification sur ce téléphone', detail: DETAIL_NOTIFICATION[permission], lienVersLesReglages: permission === 'fermee' },
    { canal: 'email', titre: 'Par email', detail: 'Rattache un compte pour l’activer.', choisissable: false },
    { canal: 'none', titre: 'Sans rappel', detail: 'On se retrouve dans l’app, à chaque point.' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <ThemedText type="cardTitle">{TITRE}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">Un mot à chaque point de suivi, jamais plus.</ThemedText>
      </div>
      {/* Le groupe ne porte que les lignes, nommé par l'en-tête ; la ligne est `LigneDeCanal`, la même que dans
          la feuille des rappels. */}
      <GroupeDeChoix question={TITRE} style={{ gap: 8 }}>
        {items.map((l) => (
          <React.Fragment key={l.canal}>
            <LigneDeCanal ligne={{ ...l, choisi: canal === l.canal }} onChoisir={onChoisir} />
            {l.lienVersLesReglages && <TextLink label="Ouvrir les réglages du téléphone" role="link" type="small" weight={600} themeColor="accentText" containerStyle={{ alignSelf: 'flex-start', padding: '0 24px' }} />}
          </React.Fragment>
        ))}
      </GroupeDeChoix>
    </div>
  );
}
