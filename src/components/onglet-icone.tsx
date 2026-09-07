import { StyleSheet, View, type ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

// Icônes de la barre d'onglets — dessinées ici plutôt qu'importées d'une bibliothèque : le
// projet n'a pas de jeu d'icônes, et en ajouter un pour deux tracés coûterait plus que ce
// qu'il rapporte. Grille 24, trait 1,9, même facture que les illustrations existantes.
//
// La pastille derrière l'icône active reprend `backgroundSelected`, comme la sélection
// ailleurs dans le produit. Elle n'est pas décorative : sur une barre à deux entrées, la seule
// couleur du trait distingue mal l'actif de l'inactif.
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

  return (
    <View
      style={[
        styles.pastille,
        { backgroundColor: focused ? theme.backgroundSelected : 'transparent' },
      ]}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24">
        {nom === 'plan' ? (
          <>
            <Path
              d="M5 12l4.5 4.5L19 7"
              stroke={color}
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Path d="M4 20h16" stroke={color} strokeWidth={1.9} strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            <Path
              d="M4 15.5l5-5 3.5 3.5L20 7"
              stroke={color}
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Circle cx={20} cy={7} r={1.6} fill={color} />
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  pastille: { width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
