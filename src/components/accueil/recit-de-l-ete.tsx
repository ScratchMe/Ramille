// Les trois figures du récit de la page d'accueil du web (`docs/architecture/v1-36-la-page-d-accueil.md` §3
// et §4, 31/10/2026) : l'été 2026 jour par jour, l'échelle des étés, et la part du transport.
//
// **Des données, pas des illustrations** : chaque figure dessine des valeurs sourcées — les vagues de
// chaleur du bilan de Météo-France (`climat.ts`), la trajectoire de réchauffement qu'il cite, les postes
// du SDES (`carbon-reference.ts`) —, et chacune porte sa phrase entière pour le lecteur d'écran, qui ne
// lit pas un dessin. **Dans le système de design** : un seul accent, l'encre pour les jours de chaleur,
// ni rouge ni orange (`docs/design/design-system/readme.md`) — la chaleur se lit à la durée, pas à la
// couleur.
//
// **Le mouvement dit la donnée** : la bande se remplit dans l'ordre de l'été, le trait de l'échelle descend
// d'aujourd'hui à +4 °C, la barre se remplit poste par poste, le transport d'abord. Une fois, quand la figure
// paraît (`vu`, décidé par la page), et posé sous « réduire les animations » (`styleDuRecit`).
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import {
  CONSUMPTION_POSTES,
  CONSUMPTION_POSTES_TOTAL_T,
  formatTonnesShort,
} from '@/constants/carbon-reference';
import { ETE_2026, FAITS_DE_L_ETE, VAGUES_DE_CHALEUR_2026 } from '@/constants/climat';
import { RECIT } from '@/constants/accueil';
import { Mouvement, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { styleDuRecit } from '@/lib/mouvement';
import { calendrierDeLaSaison } from '@/types/ete';
import { delaiEchelonne } from '@/types/mouvement';

type Lecture = { vu: boolean; reduit: boolean };

/** Ce que le lecteur d'écran entend à la place de la bande : les trois vagues, dates comprises. */
const BANDE_EN_MOTS =
  `L’été 2026, du 1er juin au 31 août : ${FAITS_DE_L_ETE.joursDeVagueDeChaleur} jours de vague de chaleur sur ` +
  '92, du 17 au 30 juin, du 4 au 19 juillet et du 28 juillet au 19 août.';

/**
 * **L'été 2026, un trait par jour** : 92 traits, du 1er juin au 31 août, pleins les jours de vague de
 * chaleur. Comme les « bandes de réchauffement », mais en jours et en encre : on y lit d'un coup que plus
 * d'un jour sur deux en était.
 */
export function BandeDeLEte({ vu, reduit, grande = false }: Lecture & { grande?: boolean }) {
  const theme = useTheme();
  const mois = useMemo(() => calendrierDeLaSaison(ETE_2026, VAGUES_DE_CHALEUR_2026), []);
  const jours = useMemo(() => mois.flatMap((m) => m.cases).filter((c) => c !== null), [mois]);

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={BANDE_EN_MOTS} style={styles.bande}>
      <View style={[styles.traits, grande && styles.traitsGrands]} aria-hidden>
        {jours.map((jour) => (
          <View key={jour.date} style={[styles.trait, { backgroundColor: theme.border }]}>
            {jour.enVague ? (
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: theme.text },
                  styleDuRecit(
                    'fondu',
                    { vu, reduit },
                    {
                      duree: Mouvement.fondu,
                      delai: delaiEchelonne(
                        jour.rangDansLesVagues ?? 0,
                        FAITS_DE_L_ETE.joursDeVagueDeChaleur,
                        Mouvement.recit,
                        Mouvement.fondu
                      ),
                    }
                  ),
                ]}
              />
            ) : null}
          </View>
        ))}
      </View>
      {/* Les mois, chacun à la largeur de ses jours. */}
      <View style={styles.mois} aria-hidden>
        {mois.map((m) => (
          <View
            key={m.nom}
            style={[
              styles.unMois,
              {
                flex: m.cases.filter((c) => c !== null).length,
                borderColor: theme.border,
              },
            ]}
          >
            <ThemedText type="small" themeColor="textTertiary">
              {m.nom}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * **L'échelle des étés** : aujourd'hui, la France vers 2050, la France vers 2100 — la trajectoire de
 * réchauffement de référence que cite Météo-France, et ce qu'un été comme 2026 y devient. Un trait descend
 * d'un repère à l'autre ; le dernier est plein.
 */
export function EchelleDesEtes({ vu, reduit }: Lecture) {
  const theme = useTheme();
  const reperes = RECIT.echelle.reperes;
  return (
    <View style={styles.echelle}>
      {reperes.map((repere, i) => {
        const dernier = i === reperes.length - 1;
        return (
          <View key={repere.libelle} style={styles.repere}>
            {/* Le point, puis le trait jusqu'au repère suivant : la colonne s'étire à la hauteur du texte. */}
            <View style={styles.colonneDuRepere} aria-hidden>
              <View
                style={[
                  styles.point,
                  {
                    borderColor: theme.accent,
                    backgroundColor: dernier ? theme.accent : theme.background,
                  },
                ]}
              />
              {dernier ? null : (
                <View style={[styles.rail, { backgroundColor: theme.border }]}>
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFill,
                      { backgroundColor: theme.accent },
                      styleDuRecit(
                        'traceVertical',
                        { vu, reduit },
                        {
                          duree: Mouvement.trace,
                          delai: i * Mouvement.trace,
                        }
                      ),
                    ]}
                  />
                </View>
              )}
            </View>
            <View style={[styles.texteDuRepere, dernier ? null : styles.avantLeSuivant]}>
              <ThemedText weight={600} style={styles.libelleDuRepere}>
                {repere.libelle}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.corps}>
                {repere.detail}
              </ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * **La part du transport** : l'empreinte moyenne, poste par poste, en une barre ; le transport en tête et
 * dans l'accent, parce que c'est lui qu'on vient voir. Les valeurs sont celles du SDES, mises en mots par
 * `formatTonnesShort` — l'échelle des repères (`FRONT.md` §2.1).
 */
export function PartDuTransport({ vu, reduit }: Lecture) {
  const theme = useTheme();
  return (
    <View style={styles.part}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={CONSUMPTION_POSTES.map((p) => `${p.label} : ${formatTonnesShort(p.valueT)}`).join(
          ', '
        )}
        style={styles.barre}
      >
        {CONSUMPTION_POSTES.map((poste, i) => (
          <View key={poste.key} style={{ flex: poste.valueT }} aria-hidden>
            <Animated.View
              style={[
                styles.segment,
                {
                  backgroundColor: poste.key === 'transport' ? theme.accent : theme.accentMuted,
                  borderTopLeftRadius: i === 0 ? Radius.chip : 0,
                  borderBottomLeftRadius: i === 0 ? Radius.chip : 0,
                  borderTopRightRadius: i === CONSUMPTION_POSTES.length - 1 ? Radius.chip : 0,
                  borderBottomRightRadius: i === CONSUMPTION_POSTES.length - 1 ? Radius.chip : 0,
                },
                styleDuRecit(
                  'traceHorizontal',
                  { vu, reduit },
                  {
                    duree: Mouvement.trace,
                    delai: delaiEchelonne(i, CONSUMPTION_POSTES.length, Mouvement.recit, Mouvement.trace),
                  }
                ),
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.legende} aria-hidden>
        {CONSUMPTION_POSTES.map((poste) => (
          <ThemedText
            key={poste.key}
            type="small"
            weight={poste.key === 'transport' ? 600 : 400}
            themeColor={poste.key === 'transport' ? 'accentText' : 'textSecondary'}
          >
            {`${poste.label} ${formatTonnesShort(poste.valueT)}`}
          </ThemedText>
        ))}
        <ThemedText type="small" themeColor="textTertiary">
          {`Total ${formatTonnesShort(CONSUMPTION_POSTES_TOTAL_T)}`}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bande: { gap: Spacing.two },
  // Un trait par jour, le jour qui prend sa part de la largeur : 92 parts égales, un filet blanc entre.
  traits: { flexDirection: 'row', height: 72, gap: 1 },
  traitsGrands: { height: 112, gap: 2 },
  trait: { flex: 1, borderRadius: 1 },
  mois: { flexDirection: 'row' },
  unMois: { borderLeftWidth: 1, paddingLeft: Spacing.one, paddingTop: 2 },

  echelle: {},
  repere: { flexDirection: 'row', gap: Spacing.three },
  colonneDuRepere: { width: 18, alignItems: 'center' },
  point: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    marginTop: 4,
  },
  // Le trait part sous le point et rejoint le suivant, à travers l'espace entre les deux.
  rail: { flex: 1, width: 2, marginVertical: Spacing.one },
  texteDuRepere: { flex: 1, gap: 2 },
  avantLeSuivant: { paddingBottom: Spacing.five },
  libelleDuRepere: { fontSize: 20, lineHeight: 26 },
  corps: { fontSize: 15, lineHeight: 23 },

  part: { gap: Spacing.three },
  barre: { flexDirection: 'row', height: 22, gap: 2 },
  segment: { flex: 1 },
  legende: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.three,
    rowGap: Spacing.one,
  },
});
