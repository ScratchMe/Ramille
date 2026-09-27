import React from 'react';
import { Chip } from '../forms/Chip.jsx';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { ThemedView } from '../core/ThemedView.jsx';
// Source : src/components/bilan/precision-chiffres.tsx — la jumelle chiffrée de `PrecisionMode` : même encart
// (fond élément, rayon 16, padding 16, gap 8), même retrait gauche de 16, mais des puces équiréparties au lieu de
// rangées. Des chiffres ont tous la même largeur et tiennent à cinq sur une ligne : cinq rangées hautes pour cinq
// chiffres feraient une liste plus longue que la question.
//
// Le groupe est un `radiogroup` nommé par la question, posé par `GroupeDeChoix` : une étape peut porter plusieurs
// séries de puces identiques, et nommer le groupe dit une fois dans laquelle on se trouve. Les puces non choisies
// prennent le fond de la page (`nestedBackground`), sans quoi elles se confondraient avec l'encart.
export function PrecisionChiffres({ question, options, valeur, onChange }) {
  return (
    <ThemedView type="backgroundElement" style={{ borderRadius: 16, padding: 16, gap: 8, marginLeft: 16 }}>
      <ThemedText type="small" themeColor="textSecondary">{question}</ThemedText>
      <GroupeDeChoix question={question} style={{ flexDirection: 'row', gap: 8 }}>
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            accessibilityLabel={option.accessibilityLabel}
            role="radio"
            selected={valeur === option.value}
            onPress={() => onChange && onChange(option.value)}
            flex
            radius={14}
            nestedBackground
          />
        ))}
      </GroupeDeChoix>
    </ThemedView>
  );
}
