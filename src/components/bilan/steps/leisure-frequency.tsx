import { StyleSheet, View } from 'react-native';

import { useAncreDuChamp } from '@/components/bilan/ancre-du-champ';
import { ChoiceRow } from '@/components/bilan/choice-row';
import { GroupeDeChoix } from '@/components/bilan/groupe-de-choix';
import { TitreDEtape } from '@/components/bilan/step-shell';
import { ThemedText } from '@/components/themed-text';
import { HYPOTHESES } from '@/constants/methodologie';
import { Spacing } from '@/constants/theme';
import { REPONSES_FREQUENCE_DES_LOISIRS as OPTIONS, type BilanAnswers } from '@/types/bilan';
import { optionCible } from '@/types/demande';

/** Écrite une fois : le titre de l'étape et le nom de la série (`GroupeDeChoix`). */
const QUESTION_FREQUENCE = 'À quelle fréquence fais-tu des trajets loisirs le week-end ?';

// B2.1.
//
// **Les exemples pour tous, et plus de décompte d'étapes** (01/10/2026, `v1-33` D7). Sans trajet
// domicile-travail, la maquette « Progression adaptative — section sautée » remplaçait les exemples
// par un encadré « Sans trajet domicile-travail, ton bilan compte N étapes. » : il répétait l'en-tête
// (« Étape 2 sur 6 »), changeait de chiffre sous le doigt — « Rarement » retire une étape — et ôtait
// les exemples au profil qui en a le plus besoin, retraité ou sans emploi, pour qui « trajets
// loisirs » est la première question du bilan.
export function LeisureFrequencyStep({
  answers,
  update,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
}) {
  // Où mène « Il manque encore ta fréquence » (`v1-31` §2.5).
  const { bloc, cible } = useAncreDuChamp('leisure_frequency');
  const iCible = optionCible(OPTIONS.map((option) => answers.leisure_frequency === option.value));

  return (
    <View ref={bloc} style={styles.container}>
      <TitreDEtape>{QUESTION_FREQUENCE}</TitreDEtape>
      <ThemedText type="small" themeColor="textTertiary">
        Sport, sorties, visites à la famille.
      </ThemedText>
      <GroupeDeChoix question={QUESTION_FREQUENCE} style={styles.choices}>
        {OPTIONS.map((option, i) => (
          <View key={option.value} style={styles.choix}>
            <ChoiceRow
              ref={i === iCible ? cible : undefined}
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
                choisie : posée sous le groupe, elle se lit comme une note sur toutes. Même
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
});
