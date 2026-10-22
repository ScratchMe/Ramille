import React from 'react';
import { ChoiceRow } from '../forms/ChoiceRow.jsx';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { useAncreDuChamp } from '../forms/IntituleDuChamp.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/bilan/steps/leisure-frequency.tsx — la fréquence des loisirs, la semaine comme le week-end,
// cinq rangées dans un groupe nommé par la question, qui est aussi le titre de l'étape.
//
// **Une seule étape pour toute la semaine** (22/10/2026, `v1-35`, étape « Le périmètre du bilan », décidé avec la
// personne qui pilote) : « le week-end » seul laissait de côté les sorties du mercredi soir, et deux étapes — la
// semaine, puis le week-end — auraient demandé une distinction limpide entre elles. Les libellés suffisent à dire ce
// que la question couvre. **« le week-end comme en semaine », dans cet ordre** : « en semaine comme le week-end »
// coupait la ligne dans « week- » / « end ? » à 390 de large, et Spline Sans n'a pas de trait d'union insécable.
//
// « Rarement » saute l'étape suivante (plus de mode, plus de distance) alors que le calcul compte toujours une
// petite base : la ligne qui le dit s'ouvre sous cette réponse et seulement quand elle est choisie — posée sous le
// groupe, elle se lirait comme une note sur toutes. Ses valeurs sont interpolées, jamais réécrites. La ligne
// d'exemples se rend pour tous, avec ou sans trajet domicile-travail (01/10/2026, `v1-33` D7).

// `REPONSES_FREQUENCE_DES_LOISIRS` (src/types/bilan.ts), recopiées — la quatrième depuis le 02/10/2026 (`v1-33` D5), la
// cinquième et dernière depuis le 22/10/2026 : l'échelle monte, du moins fréquent au plus fréquent.
const OPTIONS = [
  { value: 'rarely', label: 'Rarement — une fois par mois ou moins' },
  { value: 'multiple_monthly', label: 'Deux ou trois fois par mois' },
  { value: 'weekly', label: 'Une fois par semaine' },
  { value: 'multiple_weekly', label: 'Plusieurs fois par semaine' },
  { value: 'almost_daily', label: 'Presque tous les jours' },
];
const QUESTION_FREQUENCE = 'À quelle fréquence fais-tu des trajets pour tes loisirs, le week-end comme en semaine ?';

// Les deux valeurs de `HYPOTHESES` (src/constants/methodologie.ts) que la ligne interpole, recopiées — le dépôt
// les compare en CI aux constantes du calcul.
const HYPOTHESES = { sortiesParSemaine: { rarement: 0.25 }, distanceSortieParDefautKm: 15 };
// Virgule décimale écrite à la main, comme dans la source.
const virgule = (valeur) => String(valeur).replace('.', ',');

export function LeisureFrequencyStep({ answers, update }) {
  // Où mène « Il manque encore ta fréquence » : la question, sans recolorer le titre.
  const { bloc } = useAncreDuChamp('leisure_frequency');
  return (
    <div ref={bloc} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <ThemedText type="screenTitle">{QUESTION_FREQUENCE}</ThemedText>
      <ThemedText type="small" themeColor="textTertiary">Sport, sorties, visites à la famille.</ThemedText>
      <GroupeDeChoix question={QUESTION_FREQUENCE} style={{ gap: 10 }}>
        {OPTIONS.map((option) => (
          <div key={option.value} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <ChoiceRow label={option.label} selected={answers.leisure_frequency === option.value} onPress={() => update({ leisure_frequency: option.value })} />
            {/* Alignée sur le texte de la réponse au-dessus, pas sur le bord de l'écran. */}
            {option.value === 'rarely' && answers.leisure_frequency === 'rarely' && (
              <ThemedText type="small" themeColor="textTertiary" style={{ paddingLeft: 16 }}>
                On comptera une petite base par défaut · {virgule(HYPOTHESES.sortiesParSemaine.rarement)} sortie par semaine, {HYPOTHESES.distanceSortieParDefautKm} km
              </ThemedText>
            )}
          </div>
        ))}
      </GroupeDeChoix>
    </div>
  );
}
