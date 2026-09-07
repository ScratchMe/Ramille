import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ReminderPrefs } from '@/lib/notification-prefs';
import { lignesDeReglage, type CanalPrefere } from '@/types/rappels';

/**
 * Le réglage du canal de rappel sur « Toi » (canvas `docs/design/v1-12-rappels/Toi.dc.html`).
 *
 * Il remplace l'interrupteur « Rappels par email », qui n'apparaissait qu'avec un compte
 * rattaché : **le push n'a pas besoin de compte**, donc ce bloc s'affiche pour tout le
 * monde, sessions anonymes comprises.
 *
 * Trois règles portées par `lignesDeReglage` (module pur, testé), pas par cet écran :
 * les indisponibilités disent *pourquoi* ; la notification reste choisissable même après un
 * refus système, parce que la préférence ne se dégrade pas et que rouvrir les notifications
 * dans les réglages du téléphone suffit à la faire repartir ; et sur web la ligne
 * notification n'existe pas du tout plutôt que d'être grisée sans explication.
 *
 * `radio` et non `button` : c'est le seul rôle qui annonce « sélectionné » (règle T11).
 */
export function ChoixDeRappel({
  prefs,
  onChoisir,
}: {
  prefs: ReminderPrefs;
  onChoisir: (canal: CanalPrefere) => void;
}) {
  const theme = useTheme();
  const lignes = lignesDeReglage({ ...prefs, plateforme: Platform.OS === 'web' ? 'web' : 'natif' });

  return (
    <View style={styles.bloc} accessibilityRole="radiogroup">
      <View style={styles.entete}>
        <ThemedText weight={600} type="cardTitle">
          Les rappels
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Un mot à chaque point de suivi, jamais plus.
        </ThemedText>
      </View>

      {lignes.map((ligne) => (
        <Pressable
          key={ligne.canal}
          onPress={() => ligne.choisissable && onChoisir(ligne.canal)}
          disabled={!ligne.choisissable}
          accessibilityRole="radio"
          // Le libellé annoncé recompose ce que l'œil lit sur deux lignes : le titre seul ne
          // dirait pas qu'un canal est hors d'atteinte, ni pourquoi.
          accessibilityLabel={`${ligne.titre}. ${ligne.detail}`}
          accessibilityState={{ selected: ligne.choisi, checked: ligne.choisi, disabled: !ligne.choisissable }}
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
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { gap: Spacing.two },
  entete: { gap: 2 },
  ligne: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.field,
    borderWidth: 1.5,
    gap: 2,
  },
  titre: { fontSize: 16, lineHeight: 22 },
});
