import React from 'react';
import { Chip } from '../forms/Chip.jsx';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/bilan/steps/flights.tsx — le nombre de vols d'une année type, puis combien sont courts.
// La question dit qu'un aller-retour compte pour deux vols : sans elle, le facteur 2 était laissé au hasard, sur le
// poste le plus lourd de la plupart des bilans. La seconde question n'apparaît qu'à partir d'un vol et propose de 0
// au total choisi ; changer le total ramène les courts sous lui. La dernière puce affiche « 10+ », et le lecteur
// d'écran l'entend « 10 vols ou plus ». Les distances supposées s'affichent en bas, interpolées depuis les hypothèses du calcul.

// `TOTAL_CHOICES` de la source, recopiée : « N+ » stocke N.
const TOTAL_CHOICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const MAX_VOLS = TOTAL_CHOICES[TOTAL_CHOICES.length - 1];
const QUESTION_TOTAL = 'Combien de vols prends-tu dans une année type ?';

// Les deux valeurs de `HYPOTHESES` (src/constants/methodologie.ts) que la ligne interpole, recopiées — le dépôt les
// compare en CI aux constantes du calcul.
const HYPOTHESES = { volCourtKm: 1500, volLongKm: 9000 };
// `grouperLesMilliers` (src/lib/format.ts), recopiée : une espace insécable entre les milliers.
const grouperLesMilliers = (entier) => entier.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const formatKm = (km) => grouperLesMilliers(String(km)) + ' km';

const COLONNE = { display: 'flex', flexDirection: 'column' };
const PUCES = { flexDirection: 'row', flexWrap: 'wrap', gap: 8 };

// `volsCourtsApresTotal` (src/types/bilan.ts), recopiée : sous un total nul, le 0 des vols courts est posé d'office
// et n'est pas une réponse — passer de 0 à 4 vols pose la seconde question à vide, au lieu de la montrer répondue.
const volsCourtsApresTotal = (avant, nouveauTotal) => {
  if (nouveauTotal === 0) return 0;
  if (avant.flights_total_per_year === 0 || avant.flights_short_per_year === null) return null;
  return Math.min(avant.flights_short_per_year, nouveauTotal);
};

export function FlightsStep({ answers, update }) {
  const total = answers.flights_total_per_year;
  const courts = answers.flights_short_per_year;
  const shortChoices = Array.from({ length: total + 1 }, (_, i) => i);
  const longCount = Math.max(total - (courts === null ? 0 : courts), 0);
  const questionCourts = 'Sur ces ' + total + ', combien sont courts ?';
  const pluriel = longCount > 1;

  return (
    <div style={{ ...COLONNE, gap: 32 }}>
      <div style={{ ...COLONNE, gap: 16 }}>
        <ThemedText type="screenTitle">{QUESTION_TOTAL}</ThemedText>
        <ThemedText type="small" themeColor="textTertiary">Un aller-retour compte pour deux vols.</ThemedText>
        <GroupeDeChoix question={QUESTION_TOTAL} style={PUCES}>
          {TOTAL_CHOICES.map((n) => (
            <Chip key={n} label={n === MAX_VOLS ? MAX_VOLS + '+' : String(n)} accessibilityLabel={n === MAX_VOLS ? MAX_VOLS + ' vols ou plus' : undefined}
              role="radio" selected={total === n}
              onPress={() => update({
                flights_total_per_year: n,
                flights_short_per_year: volsCourtsApresTotal(answers, n),
              })} />
          ))}
        </GroupeDeChoix>
      </div>

      {total > 0 && (
        <>
          <div style={{ height: 1, background: 'var(--color-border)' }} />
          <div style={{ ...COLONNE, gap: 16 }}>
            <ThemedText type="subtitle" weight={600} style={{ fontSize: 22, lineHeight: '28px', letterSpacing: '-0.22px' }}>{questionCourts}</ThemedText>
            <ThemedText type="small" themeColor="textTertiary">Europe, moins de 3 h. Le reste est compté comme long-courrier.</ThemedText>
            <GroupeDeChoix question={questionCourts} style={PUCES}>
              {shortChoices.map((n) => (
                <Chip key={n} label={String(n)} role="radio" selected={courts === n} onPress={() => update({ flights_short_per_year: n })} radius={14} />
              ))}
            </GroupeDeChoix>
            {courts !== null && (
              <ThemedText type="small">
                {longCount} vol{pluriel ? 's' : ''} long-courrier{pluriel ? 's' : ''} {pluriel ? 'seront' : 'sera'} compté{pluriel ? 's' : ''}.
              </ThemedText>
            )}
          </div>
        </>
      )}

      <ThemedText type="small" themeColor="textTertiary">
        Distances moyennes par défaut · {formatKm(HYPOTHESES.volCourtKm)} court et moyen-courrier, {formatKm(HYPOTHESES.volLongKm)} long-courrier
      </ThemedText>
    </div>
  );
}
