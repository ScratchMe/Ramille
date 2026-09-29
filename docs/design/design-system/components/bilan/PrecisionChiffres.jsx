import React from 'react';
import { Chip } from '../forms/Chip.jsx';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { IntituleDuChamp, useAncreDuChamp } from '../forms/IntituleDuChamp.jsx';
// Source : src/components/bilan/precision-chiffres.tsx — la jumelle chiffrée de `PrecisionMode` : même intitulé (small,
// `textSecondary`, 8 au-dessus), même place dans `BoiteDePrecision`, mais des puces équiréparties au lieu de rangées.
// Des chiffres ont tous la même largeur et tiennent à cinq sur une ligne : cinq rangées hautes pour cinq chiffres
// feraient une liste plus longue que la question. Elle ne dessine pas de boîte : sous « Voiture (covoiturage) », elle
// partage celle de la motorisation.
//
// Les puces passent par la grille de `GroupeDeChoix` (`colonnes` est un maximum) : cinq colonnes quand elles tiennent,
// un retour à la ligne quand elles ne tiennent plus. Depuis que la boîte n'a plus que 12 de marge intérieure, cinq puces
// de 48 tiennent à 360 dp, à 0 px près ; une taille d'affichage agrandie fait encore passer la cinquième à la ligne.
//
// Le groupe est un `radiogroup` nommé par la question, posé par `GroupeDeChoix` : une étape peut porter plusieurs
// séries de puces identiques, et nommer le groupe dit une fois dans laquelle on se trouve. Les puces non choisies
// prennent le fond de la page (`nestedBackground`), sans quoi elles se confondraient avec la boîte. `champ` : ce
// qu'elle renseigne, où mène « Il manque encore … », qui en marque l'intitulé.
export function PrecisionChiffres({ champ, question, options, valeur, onChange }) {
  const { bloc, marque } = useAncreDuChamp(champ);
  return (
    <div ref={bloc} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <IntituleDuChamp type="small" themeColor="textSecondary" marque={marque}>{question}</IntituleDuChamp>
      <GroupeDeChoix question={question} colonnes={options.length}>
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
    </div>
  );
}
