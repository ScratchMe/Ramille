import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Carte d'une action du plan — extraite de l'écran (v1-11 lot 1).
//
// **L'action engagée est le fait saillant de cet écran, et rien ne la distinguait.** Une seule
// action peut être engagée par cycle (index unique partiel en base), c'est donc *la* réponse à
// « qu'est-ce que je fais en ce moment ? » — et elle portait exactement la même carte que les
// propositions, l'engagement n'apparaissant qu'en lisant le pavé du bas. Retour de test sur
// appareil du 07/09 : « je distingue mal l'action pour laquelle je me suis engagé ».
//
// Trois marques, cumulées parce qu'aucune ne suffit seule à distance de bras : une bordure
// accent de 2 px, un fond teinté, et une étiquette en tête précédée d'une coche.
//
// L'action non retenue s'estompe **sans disparaître et sans perdre son bouton** : changer
// d'avis ne doit jamais ressembler à un renoncement (même registre que /suivi, qui ne compte
// jamais ce qu'on a laissé passer).
export function ActionCard({
  titre,
  gainKg,
  partPercent,
  detail,
  intention,
  engagee,
  estompee,
  children,
}: {
  titre: string;
  gainKg: number | null;
  partPercent: number | null;
  detail: string | null;
  /** Phrase d'intention déjà formatée (`formatIntention`), affichée seulement si engagée. */
  intention: string | null;
  engagee: boolean;
  /** Une autre action porte l'engagement : celle-ci passe au second plan, sans se désactiver. */
  estompee: boolean;
  children: React.ReactNode;
}) {
  const theme = useTheme();

  // Le libellé accessible recompose ce que la mise en forme dit à l'œil : un lecteur d'écran
  // ne voit ni la bordure ni le fond. Sans lui, l'engagement serait invisible pour lui.
  const annonce = engagee
    ? `Action engagée : ${titre}${intention ? ` ${intention}` : ''}`
    : titre;

  return (
    <View
      accessible
      accessibilityLabel={annonce}
      style={[
        styles.carte,
        {
          borderColor: engagee ? theme.accent : theme.border,
          borderWidth: engagee ? 2 : 1,
          backgroundColor: engagee ? theme.backgroundTinted : 'transparent',
          opacity: estompee ? 0.72 : 1,
        },
      ]}
    >
      {engagee && (
        <View style={styles.enTete}>
          <View style={[styles.pastille, { backgroundColor: theme.accent }]}>
            <Svg width={12} height={12} viewBox="0 0 24 24">
              <Path
                d="M5 13l4 4L19 7"
                stroke="#FFFFFF"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </View>
          <ThemedText themeColor="accentText" weight={700} style={styles.etiquette}>
            TU T’Y ES ENGAGÉ
          </ThemedText>
        </View>
      )}

      <ThemedText type="cardTitle">{titre}</ThemedText>

      {gainKg !== null && (
        <View style={styles.gain}>
          <ThemedText weight={600} themeColor="accentText" style={styles.gainValeur}>
            − {Math.round(gainKg)} kg CO₂e
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {intention ? `${majuscule(intention)} · par an` : 'par an'}
            {partPercent !== null ? ` · ${Math.round(partPercent)} % de ton empreinte` : ''}
          </ThemedText>
        </View>
      )}

      {detail && (
        <ThemedText type="small" themeColor="textTertiary">
          {detail}
        </ThemedText>
      )}

      {children}
    </View>
  );
}

// `formatIntention` rend « le mardi et le jeudi » — minuscule, parce qu'elle est écrite pour
// s'insérer au milieu d'une phrase (« C'est ton choix pour cette période, le mardi et le
// jeudi. »). En tête de ligne il lui faut sa majuscule, et on ne touche pas à la source.
function majuscule(phrase: string): string {
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

const styles = StyleSheet.create({
  carte: { borderRadius: Radius.card, padding: 20, gap: Spacing.two },
  enTete: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  pastille: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  etiquette: { fontSize: 13, lineHeight: 18, letterSpacing: 0.3 },
  gain: { gap: 2 },
  gainValeur: { fontSize: 20, lineHeight: 26 },
});
