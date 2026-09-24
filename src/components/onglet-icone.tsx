import { StyleSheet, View, type ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

// Icônes de la barre d'onglets — dessinées ici plutôt qu'importées d'une bibliothèque : le
// projet n'a pas de jeu d'icônes, et en ajouter un pour deux tracés coûterait plus que ce
// qu'il rapporte. Grille 24, trait 1,9, même facture que les illustrations existantes.
//
// **L'onglet actif se reconnaît à une pastille pleine, et non à sa couleur** (24/09/2026,
// `v1-29`). Ce commentaire disait déjà que, sur une barre à deux entrées, la seule couleur du
// trait distingue mal l'actif de l'inactif — et la pastille qu'il décrivait ne réglait pas le
// problème. Peinte en `backgroundSelected`, elle ne tranchait qu'à 1,18:1 sur le fond de la
// barre, et le vert de l'icône active et le gris de l'inactive ont la même luminance (1,02:1) :
// l'état ne tenait qu'à la teinte, ce que WCAG 1.4.1 refuse, et l'indicateur restait sous le 3:1
// de 1.4.11. Pleine, en `accent`, la pastille tranche à 6,12:1 sur la barre et l'icône
// `onAccent` à 6,12:1 sur elle : l'actif se voit à une forme qui n'existe pas sur l'inactif, pour
// qui ne distingue pas le vert du gris comme pour tout le monde. `scripts/verifier-etats-export.mjs`
// mesure les deux moitiés sur l'export — une pastille à 3:1 au moins sur l'actif, aucune sur
// l'inactif.
//
// **`focused` ne dit pas si l'onglet est actif, il nomme une couche.** react-navigation dessine
// chaque icône deux fois, superposées, et règle lui-même l'opacité de chacune selon l'état de
// l'onglet (`TabBarIcon` : une couche « active » rendue avec `focused: true`, une « inactive »
// avec `focused: false`). La pastille vit donc dans la couche active, et `color` n'est plus lu
// que par l'inactive : sur la pastille, la teinte active (`accent`) disparaîtrait dans son fond.
export function OngletIcone({
  nom,
  focused,
  color,
}: {
  nom: 'plan' | 'suivi';
  focused: boolean;
  // `ColorValue` et non `string` : c'est le type que react-navigation passe au rendu.
  color: ColorValue;
}) {
  const theme = useTheme();
  const trait = focused ? theme.onAccent : color;

  return (
    <View
      style={[
        styles.pastille,
        { backgroundColor: focused ? theme.accent : 'transparent' },
      ]}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24">
        {nom === 'plan' ? (
          <>
            <Path
              d="M5 12l4.5 4.5L19 7"
              stroke={trait}
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Path d="M4 20h16" stroke={trait} strokeWidth={1.9} strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            <Path
              d="M4 15.5l5-5 3.5 3.5L20 7"
              stroke={trait}
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Circle cx={20} cy={7} r={1.6} fill={trait} />
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  pastille: { width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
