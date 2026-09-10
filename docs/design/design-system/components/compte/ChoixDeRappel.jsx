import React from 'react';
import { ChoiceRow } from '../forms/ChoiceRow.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/compte/choix-de-rappel.tsx — bloc « Les rappels » sur « Toi », radiogroup.
export function ChoixDeRappel({ lignes, canal, onChoisir }) {
  const items = lignes || [
    { canal: 'push', titre: 'Une notification', detail: 'Sur ce téléphone, le lundi matin.' },
    { canal: 'email', titre: 'Un email', detail: 'Rattache un compte pour recevoir des emails.', choisissable: false },
    { canal: 'aucun', titre: 'Rien', detail: 'On se retrouve ici lundi.' },
  ];
  return (
    <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <ThemedText type="cardTitle">Les rappels</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">Un mot à chaque point de suivi, jamais plus.</ThemedText>
      </div>
      {items.map((l) => <ChoiceRow key={l.canal} label={l.titre} detail={l.detail} selected={canal === l.canal} disabled={l.choisissable === false} onPress={() => onChoisir && onChoisir(l.canal)} />)}
    </div>
  );
}
