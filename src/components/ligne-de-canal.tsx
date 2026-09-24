import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Stroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CanalPrefere, LigneDeReglage } from '@/types/rappels';

/**
 * Une ligne du choix du canal de rappel — « Par notification », « Par email », « Sans rappel » —,
 * **rendue au même endroit pour ses deux écrans** : le réglage de « Toi » (`ChoixDeRappel`) et la
 * feuille ouverte après « C'est noté » (`FeuilleRappels`), 24/09/2026, `v1-29`.
 *
 * Les deux la recopiaient à la ligne près, alors que la dérivation qui la nourrit
 * (`lignesDeReglage`) était déjà partagée : deux rendus d'une même dérivation divergent au premier
 * ajustement de l'un, sans que rien ne le dise. Ce qui reste chez chaque écran est ce qui se rend
 * **sous** la ligne — le lien des réglages du téléphone, la porte vers le compte — et ce qu'on
 * fait du choix.
 *
 * `radio` et non `button` : c'est le seul rôle qui annonce « sélectionné » (règle T11). Le libellé
 * annoncé recompose ce que l'œil lit sur deux lignes : le titre seul ne dirait pas qu'un canal est
 * hors d'atteinte, ni pourquoi.
 */
export function LigneDeCanal({
  ligne,
  onChoisir,
  occupe = false,
}: {
  ligne: LigneDeReglage;
  onChoisir: (canal: CanalPrefere) => void;
  /** Un enregistrement est en cours : aucune ligne ne se choisit le temps qu'il aboutisse. */
  occupe?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => ligne.choisissable && onChoisir(ligne.canal)}
      // `disabled` porte l'inactivité **des deux côtés** : `Pressable` de react-native-web en tire
      // `aria-disabled`, React Native le range dans l'état que TalkBack annonce. Une ligne hors
      // d'atteinte s'annonce donc « désactivée » en plus de dire pourquoi.
      disabled={!ligne.choisissable || occupe}
      accessibilityRole="radio"
      accessibilityLabel={`${ligne.titre}. ${ligne.detail}`}
      // `aria-checked`, le seul état que le web reçoive (cf. `chip.tsx`).
      aria-checked={ligne.choisi}
      style={[
        styles.ligne,
        {
          backgroundColor: ligne.choisi ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: ligne.choisi ? theme.accent : 'transparent',
          opacity: ligne.choisissable ? 1 : 0.6,
        },
      ]}
    >
      <ThemedText weight={ligne.choisi ? 600 : 400} style={styles.titre}>
        {ligne.titre}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {ligne.detail}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ligne: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.field,
    borderWidth: Stroke.selected,
    gap: 2,
  },
  titre: { fontSize: 16, lineHeight: 22 },
});
