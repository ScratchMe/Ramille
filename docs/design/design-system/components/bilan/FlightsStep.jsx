import React from 'react';
import { Chip } from '../forms/Chip.jsx';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { IntituleDuChamp, useAncreDuChamp } from '../forms/IntituleDuChamp.jsx';
import { ChampDuPlafond } from '../forms/ChampDuPlafond.jsx';
import { NumericField } from '../forms/NumericField.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/bilan/steps/flights.tsx — le nombre de vols d'une année type, puis combien sont courts.
// La question dit qu'un aller-retour compte pour deux vols : sans elle, le facteur 2 était laissé au hasard, sur le
// poste le plus lourd de la plupart des bilans. La seconde question n'apparaît qu'à partir d'un vol et propose de 0
// au total choisi ; changer le total ramène les courts sous lui. La dernière puce affiche « 10+ », et le lecteur
// d'écran l'entend « 10 vols ou plus ». Les distances supposées s'affichent en bas, interpolées depuis les hypothèses du calcul.
// **Aucune puce n'arrive cochée** (01/10/2026, `v1-33` D1) : le total vaut `null` tant qu'on n'a pas répondu, et
// « Il manque encore le nombre de vols » mène à la question du titre, qui ne change pas de couleur.
// « Il manque encore la part de vols courts » mène à la seconde question, dont le sous-titre passe en `accentText`.
// **Les deux séries de nombres prennent la même forme, la pilule** (22, le défaut de `Chip` ; 01/10/2026, `v1-33`,
// Q-12) : la série des courts était à `Radius.chip`, des carrés arrondis sous des ronds, pour une même fonction.
// **« 10+ » ouvre un champ, réclamé** (02/10/2026, `v1-33` §6, `ChampDuPlafond`) : elle enregistrait 10. Au-delà de dix
// vols, la part de vols courts devient elle aussi un champ, borné au total — vingt-six puces pour vingt-cinq vols ne
// tiendraient pas. `plafond` dit que « 10+ » est la réponse ; dans le dépôt, l'écran du questionnaire tient ce drapeau
// (`HorsColonnes`), et un nombre de dix ou plus le dit de lui-même.

// `CHOIX_DE_COMPTE` de la source (src/types/bilan.ts), recopiée.
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

// `decompteDesLongsCourriers` (src/types/bilan.ts), recopiée : à zéro, la confirmation se dit en mots.
const decompteDesLongsCourriers = (n) =>
  n <= 0 ? 'Aucun vol long-courrier ne sera compté.' : n === 1 ? '1 vol long-courrier sera compté.' : n + ' vols long-courriers seront comptés.';

// `volsCourtsApresTotal` (src/types/bilan.ts), recopiée : sous un total nul — ou sans réponse —, le 0 des vols courts
// est posé d'office et n'est pas une réponse — passer de 0 à 4 vols pose la seconde question à vide, au lieu de la
// montrer répondue.
const volsCourtsApresTotal = (avant, nouveauTotal) => {
  if (nouveauTotal === 0) return 0;
  if (!avant.flights_total_per_year || avant.flights_short_per_year === null) return null;
  return Math.min(avant.flights_short_per_year, nouveauTotal);
};

// Le sous-titre d'une question sous le titre de l'étape : `TypeScale.question` (src/constants/theme.ts), jeton du kit
// `--type-question-*` — `subtitle` ramené à 22/28, graisse 600 (01/10/2026, `v1-33`, Q-12).
const SOUS_TITRE = {
  fontSize: 'var(--type-question-size)',
  lineHeight: 'var(--type-question-line)',
  letterSpacing: 'var(--type-question-tracking)',
};

export function FlightsStep({ answers, update, plafond: plafondTouche = false, choisirLePlafond = () => {} }) {
  // Sans réponse, le total ne vaut rien, pas zéro : aucune puce cochée, et la seconde question attend un vol.
  const total = answers.flights_total_per_year ?? 0;
  const courts = answers.flights_short_per_year;
  const plafond = plafondTouche || (answers.flights_total_per_year !== null && answers.flights_total_per_year >= MAX_VOLS);
  const courtsSaisis = total > MAX_VOLS;
  const shortChoices = courtsSaisis ? [] : Array.from({ length: total + 1 }, (_, i) => i);
  const longCount = Math.max(total - (courts === null ? 0 : courts), 0);
  const questionCourts = 'Sur ces ' + total + ', combien sont courts ?';
  const { bloc, marque } = useAncreDuChamp('flights_short_per_year');

  return (
    <div style={{ ...COLONNE, gap: 32 }}>
      <div style={{ ...COLONNE, gap: 16 }}>
        <ThemedText type="screenTitle">{QUESTION_TOTAL}</ThemedText>
        <ThemedText type="small" themeColor="textTertiary">Un aller-retour compte pour deux vols.</ThemedText>
        <GroupeDeChoix question={QUESTION_TOTAL} style={PUCES}>
          {TOTAL_CHOICES.map((n) => (
            <Chip key={n} label={n === MAX_VOLS ? MAX_VOLS + '+' : String(n)} accessibilityLabel={n === MAX_VOLS ? MAX_VOLS + ' vols ou plus' : undefined}
              role="radio" selected={n === MAX_VOLS ? plafond : !plafond && answers.flights_total_per_year === n}
              onPress={() => {
                if (n === MAX_VOLS) {
                  choisirLePlafond(true);
                  if (!plafond) update({ flights_total_per_year: null, flights_short_per_year: volsCourtsApresTotal(answers, MAX_VOLS) });
                  return;
                }
                choisirLePlafond(false);
                update({ flights_total_per_year: n, flights_short_per_year: volsCourtsApresTotal(answers, n) });
              }} />
          ))}
        </GroupeDeChoix>
        {plafond && (
          <ChampDuPlafond valeur={answers.flights_total_per_year} unite="vols" label="Nombre de vols sur une année"
            onChange={(v) => {
              // Toute frappe dit « 10+ » : corriger 14 en 16 passe par « 1 ». Un total nul pose la part à zéro, et en
              // repartant la repose à vide ; sinon, la part ne suit pas la frappe.
              choisirLePlafond(true);
              if (v === 0) update({ flights_total_per_year: 0, flights_short_per_year: 0 });
              else if (answers.flights_total_per_year === 0) update({ flights_total_per_year: v, flights_short_per_year: null });
              else update({ flights_total_per_year: v });
            }} />
        )}
      </div>

      {total > 0 && (
        <>
          <div style={{ height: 1, background: 'var(--color-border)' }} />
          <div ref={bloc} style={{ ...COLONNE, gap: 16 }}>
            <IntituleDuChamp type="subtitle" weight={600} style={SOUS_TITRE} marque={marque}>{questionCourts}</IntituleDuChamp>
            <ThemedText type="small" themeColor="textTertiary">Europe, moins de 3 h. Le reste est compté comme long-courrier.</ThemedText>
            {courtsSaisis ? (
              <NumericField value={courts} unit="vols" label="Nombre de vols courts" entier
                onChange={(v) => update({ flights_short_per_year: v === null ? null : Math.min(v, total) })} />
            ) : (
              <GroupeDeChoix question={questionCourts} style={PUCES}>
                {shortChoices.map((n) => (
                  <Chip key={n} label={String(n)} role="radio" selected={courts === n} onPress={() => update({ flights_short_per_year: n })} />
                ))}
              </GroupeDeChoix>
            )}
            {courts !== null && courts <= total && (
              <ThemedText type="small">
                {decompteDesLongsCourriers(longCount)}
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
