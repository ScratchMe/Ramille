import React from 'react';
import { Chip } from '../forms/Chip.jsx';
import { ChoiceRow } from '../forms/ChoiceRow.jsx';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { NumericField } from '../forms/NumericField.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/bilan/steps/commute-days-distance.tsx — B1.2 / B1.3 : les jours par semaine en puces
// (grille de quatre colonnes, rayon 14), un filet, puis la distance d'un aller — le champ numérique, ou les
// tranches quand on ne sait pas. Gap 32 entre les deux blocs, 16 dans chaque bloc, 10 entre les tranches.
//
// « Je ne sais pas » et « Je connais la distance exacte » s'effacent l'un l'autre (le kilométrage, ou la tranche) :
// c'est ce qui rend vraie la phrase « On comptera environ … km pour un aller. », le calcul préférant le kilométrage
// dès qu'il existe. Le choix d'affichage est un état local — il doit basculer avant qu'une tranche soit choisie —
// qui repart de la présence d'une tranche. La relecture d'une longue distance se propose, jamais ne bloque.

const JOURS = [1, 2, 3, 4, 5, 6, 7];

// Écrites une fois : le titre de chaque question et le nom de sa série.
const QUESTION_JOURS = 'Ce trajet, tu le fais combien de jours par semaine ?';
const QUESTION_TRANCHE = 'Environ, ça représente quelle distance ?';

// `BRACKETS` (src/components/bilan/steps/commute-days-distance.tsx), recopiée.
const TRANCHES = [
  { value: 'lt_5', label: 'Moins de 5 km' },
  { value: '5_15', label: '5 à 15 km' },
  { value: '15_30', label: '15 à 30 km' },
  { value: '30_50', label: '30 à 50 km' },
  { value: '50_plus', label: 'Plus de 50 km' },
];

// `distanceBracketMidpointKm`, `afficherNombreSaisi`, `distanceDomicileTravailKm` et
// `distanceDomicileTravailARelire` (src/types/bilan.ts), recopiées : le kit ne lit rien de `src/`.
const MILIEU_DE_TRANCHE_KM = { lt_5: 2.5, '5_15': 10, '15_30': 22.5, '30_50': 40, '50_plus': 60 };
const afficherNombreSaisi = (valeur) => (valeur === null ? '' : String(valeur).replace('.', ','));
const COMMUTE_DISTANCE_A_RELIRE_KM = 200;
const distanceDomicileTravailKm = (answers) => {
  const km = answers.commute_distance_km;
  return km !== null && km > 0 ? km : null;
};
const distanceDomicileTravailARelire = (answers) => {
  const km = distanceDomicileTravailKm(answers);
  return km !== null && km > COMMUTE_DISTANCE_A_RELIRE_KM;
};

// Le sous-titre d'un bloc : `subtitle` ramené à 22/28, graisse 600.
const SOUS_TITRE = { fontSize: 22, lineHeight: '28px', letterSpacing: '-0.22px' };

export function CommuteDaysDistanceStep({ answers, update }) {
  const [inconnue, setInconnue] = React.useState(answers.commute_distance_bracket !== null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ThemedText type="screenTitle">{QUESTION_JOURS}</ThemedText>
        <GroupeDeChoix question={QUESTION_JOURS} colonnes={4}>
          {JOURS.map((jour) => (
            <Chip
              key={jour}
              label={String(jour)}
              role="radio"
              selected={answers.commute_days_per_week === jour}
              onPress={() => update({ commute_days_per_week: jour })}
              radius={14}
            />
          ))}
        </GroupeDeChoix>
      </div>

      <div style={{ height: 1, background: 'var(--color-border)' }} />

      {inconnue ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ThemedText type="subtitle" weight={600} style={SOUS_TITRE}>{QUESTION_TRANCHE}</ThemedText>
          <ThemedText type="small" themeColor="textTertiary">
            Une estimation suffit. Tu pourras donner un chiffre plus précis en refaisant ton bilan : tes réponses seront
            préremplies.
          </ThemedText>
          <GroupeDeChoix question={QUESTION_TRANCHE} style={{ gap: 10 }}>
            {TRANCHES.map((tranche) => (
              <ChoiceRow
                key={tranche.value}
                label={tranche.label}
                selected={answers.commute_distance_bracket === tranche.value}
                onPress={() => update({ commute_distance_bracket: tranche.value })}
              />
            ))}
          </GroupeDeChoix>
          {answers.commute_distance_bracket !== null && (
            <ThemedText type="small" themeColor="textSecondary">
              {'On comptera environ ' + afficherNombreSaisi(MILIEU_DE_TRANCHE_KM[answers.commute_distance_bracket]) + ' km pour un aller.'}
            </ThemedText>
          )}
          <TextLink
            label="Je connais la distance exacte"
            hint="Revient à la saisie en kilomètres"
            onPress={() => {
              setInconnue(false);
              update({ commute_distance_bracket: null });
            }}
            type="linkPrimary"
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ThemedText type="subtitle" weight={600} style={SOUS_TITRE}>Quelle distance pour un aller ?</ThemedText>
          <NumericField
            value={answers.commute_distance_km}
            onChange={(valeur) => update({ commute_distance_km: valeur })}
            unit="km"
            label="Distance pour un aller"
          />
          {distanceDomicileTravailARelire(answers) && (
            <ThemedText type="small" themeColor="textSecondary">
              C’est une longue distance pour un aller. Vérifie qu’il s’agit bien d’un seul trajet : le retour est déjà
              compté.
            </ThemedText>
          )}
          <TextLink
            label="Je ne sais pas"
            hint="Propose des tranches de distance à la place"
            onPress={() => {
              setInconnue(true);
              update({ commute_distance_km: null });
            }}
            type="linkPrimary"
          />
        </div>
      )}
    </div>
  );
}
