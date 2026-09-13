import { StyleSheet, View } from 'react-native';

import { BarreContour } from '@/components/suivi/barre-contour';
import { ThemedText } from '@/components/themed-text';
import { POSTE_LABEL } from '@/constants/postes';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTonnesNu } from '@/lib/format';
import type { EcartDePoste } from '@/types/suivi';

/** Hauteur des deux barres d'un poste, et leur rayon. Six barres à lire d'un coup. */
const HAUTEUR = 10;

/**
 * L'écart entre deux bilans, poste par poste (C2.7, point 3, planche D1).
 *
 * **Le total seul cachait l'essentiel** : un effort tenu tout l'hiver sur le trajet quotidien
 * disparaît derrière un vol de l'été, et le suivi ne montrait que le total. Trois choses à ne pas
 * défaire :
 *
 * — **L'échelle est commune aux six barres.** Une échelle par poste rendrait un poste de 40 kg aussi
 *   long qu'un poste de 2 t, et la carte dirait alors l'inverse de ce qu'elle existe pour dire.
 * — **Le contour est le bilan précédent, le plein est celui-ci.** L'accent suit le poste dominant du
 *   bilan **courant** : c'est celui sur lequel le plan travaille, et il peut avoir changé depuis le
 *   bilan précédent — le plus souvent parce que la personne a fait baisser l'ancien.
 * — **Aucune hiérarchie morale.** Pas de flèche verte ni rouge, pas de « bien » ni de « à
 *   améliorer » : deux nombres et deux barres, le lecteur voit le sens tout seul.
 *
 * Les barres sont masquées au lecteur d'écran : la ligne au-dessus porte déjà les deux valeurs, et
 * la légende dit ce que chaque forme veut dire.
 */
export function EcartParPoste({ ecarts }: { ecarts: EcartDePoste[] }) {
  const theme = useTheme();

  // Échelle commune : le plus grand des six nombres. Le plancher à 1 évite la division par zéro d'un
  // bilan entièrement nul, que le produit accueille par ailleurs (profil marche uniquement).
  const maxKg = Math.max(...ecarts.flatMap((e) => [e.precedentKg, e.courantKg]), 1);
  const part = (kg: number) => Math.max((kg / maxKg) * 100, kg > 0 ? 3 : 0);

  return (
    <View style={styles.bloc}>
      {ecarts.map((ecart) => (
        <View key={ecart.poste} style={styles.poste}>
          <View style={styles.entete}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.libelle}>
              {POSTE_LABEL[ecart.poste]}
            </ThemedText>
            <ThemedText type="small" weight={600}>
              {formatTonnesNu(ecart.precedentKg)} → {formatTonnesNu(ecart.courantKg)}
            </ThemedText>
          </View>
          <BarreContour percent={part(ecart.precedentKg)} hauteur={HAUTEUR} />
          <View
            style={styles.rail}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            aria-hidden
          >
            <View
              style={[
                styles.plein,
                {
                  width: `${part(ecart.courantKg)}%`,
                  backgroundColor: ecart.dominant ? theme.accent : theme.accentMuted,
                },
              ]}
            />
          </View>
        </View>
      ))}
      <ThemedText themeColor="textTertiary" style={styles.legende}>
        Contour : bilan précédent · plein : ce bilan · accent : le poste qui pèse le plus
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { gap: Spacing.three },
  poste: { gap: 4 },
  entete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: Spacing.two },
  // Le libellé cède la place au couple de valeurs, qui ne doit jamais se couper : c'est lui qui
  // porte l'information, l'étiquette se comprend tronquée.
  libelle: { flexShrink: 1, minWidth: 0 },
  rail: { width: '100%', height: HAUTEUR },
  plein: { height: '100%', borderRadius: HAUTEUR / 2 },
  // 12/16 : la légende, une seule occurrence de cette taille ici.
  legende: { fontSize: 12, lineHeight: 16 },
});
