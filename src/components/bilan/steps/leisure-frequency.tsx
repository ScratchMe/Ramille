import { StyleSheet, View } from 'react-native';

import { ChoiceRow } from '@/components/bilan/choice-row';
import { GroupeDeChoix } from '@/components/bilan/groupe-de-choix';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { HYPOTHESES } from '@/constants/methodologie';
import { Radius, Spacing } from '@/constants/theme';
import type { BilanAnswers, LeisureFrequency } from '@/types/bilan';

const OPTIONS: { value: LeisureFrequency; label: string }[] = [
  { value: 'rarely', label: 'Rarement — une fois par mois ou moins' },
  { value: 'weekly', label: 'Une fois par semaine' },
  { value: 'multiple_weekly', label: 'Plusieurs fois par semaine' },
];

/** Écrite une fois : le titre de l'étape et le nom de la série (`GroupeDeChoix`). */
const QUESTION_FREQUENCE = 'À quelle fréquence fais-tu des trajets loisirs le weekend ?';

// B2.1 — variante "Progression adaptative" quand la section 1 a été sautée (B1.1 =
// Non) : le paragraphe d'exemples est remplacé par un rappel du nombre d'étapes total,
// cf. maquette "Progression adaptative — section sautée".
export function LeisureFrequencyStep({
  answers,
  update,
  total,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
  total: number;
}) {
  const commuteSkipped = answers.commute_has_regular_trip === false;

  return (
    <View style={styles.container}>
      <ThemedText type="screenTitle">{QUESTION_FREQUENCE}</ThemedText>
      {!commuteSkipped && (
        <ThemedText type="small" themeColor="textTertiary">
          Sport, sorties, visites à la famille.
        </ThemedText>
      )}
      <GroupeDeChoix question={QUESTION_FREQUENCE} style={styles.choices}>
        {OPTIONS.map((option) => (
          <View key={option.value} style={styles.choix}>
            <ChoiceRow
              label={option.label}
              selected={answers.leisure_frequency === option.value}
              // Aucune remise à zéro ici : `normaliserReponses` s'applique après chaque `update` et
              // c'est elle qui efface ce que « Rarement » rend impossible. Deux listes, c'est deux
              // listes qui divergent.
              onPress={() => update({ leisure_frequency: option.value })}
            />
            {/* **« Rarement » fait disparaître les questions suivantes, et rien ne le disait**
                (C3.7, arbitrage D5, constats A2-11 et A12-22). Choisir cette réponse saute l'étape
                du détail : plus de mode, plus de distance. Le calcul continue pourtant — une base
                résiduelle, dont le chantier C2.5 a retiré toutes les conséquences visibles (elle
                ne nomme plus de mode nulle part, et le plan refuse d'en tirer des actions) mais qui
                pèse toujours dans le total. La personne voyait donc un poste « loisirs » non nul
                sans avoir rien déclaré.

                La ligne se rend **sous la réponse qui la provoque** et seulement quand elle est
                choisie : posée sous le groupe, elle se lit comme une note sur les trois. Même
                registre que la ligne d'hypothèses des longs trajets et des vols, et mêmes
                valeurs interpolées depuis `HYPOTHESES` — un script de CI les compare aux
                constantes du calcul. Ce registre était la chasse fixe (`code`) jusqu'au
                24/09/2026 ; elle est désormais réservée aux sources et aux codes techniques
                (décision n° 10), et cette ligne est une phrase adressée à la personne. */}
            {option.value === 'rarely' && answers.leisure_frequency === 'rarely' && (
              <ThemedText type="small" themeColor="textTertiary" style={styles.base}>
                On comptera une petite base par défaut ·{' '}
                {virgule(HYPOTHESES.sortiesParSemaine.rarement)} sortie par semaine,{' '}
                {HYPOTHESES.distanceSortieParDefautKm} km
              </ThemedText>
            )}
          </View>
        ))}
      </GroupeDeChoix>
      {commuteSkipped && (
        <ThemedView type="backgroundElement" style={styles.notice}>
          <ThemedText type="small" style={styles.noticeText}>
            Sans trajet domicile-travail, ton bilan compte {total} étapes.
          </ThemedText>
        </ThemedView>
      )}
    </View>
  );
}

// Virgule décimale écrite à la main : `toLocaleString('fr-FR')` rend « 0.25 » sur un Hermes
// construit sans ICU complet.
function virgule(valeur: number): string {
  return String(valeur).replace('.', ',');
}

const styles = StyleSheet.create({
  container: { gap: Spacing.five },
  choices: { gap: Spacing.two + 2 },
  choix: { gap: Spacing.one },
  // La ligne s'aligne sur le texte de la réponse au-dessus, pas sur le bord de l'écran.
  base: { paddingLeft: Spacing.three },
  notice: { borderRadius: Radius.field, padding: Spacing.three },
  noticeText: { lineHeight: 21 },
});
