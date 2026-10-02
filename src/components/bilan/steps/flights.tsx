import type { RefObject } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { IntituleDuChamp, useAncreDuChamp } from '@/components/bilan/ancre-du-champ';
import { ChampDuPlafond } from '@/components/bilan/champ-du-plafond';
import { ChoixOuvrant } from '@/components/bilan/choix-ouvrant';
import { Chip } from '@/components/bilan/chip';
import { GroupeDeChoix } from '@/components/bilan/groupe-de-choix';
import { NumericField } from '@/components/bilan/numeric-field';
import { TitreDEtape } from '@/components/bilan/step-shell';
import { ThemedText } from '@/components/themed-text';
import { HYPOTHESES } from '@/constants/methodologie';
import { Spacing, TypeScale } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatKm } from '@/lib/format';
import {
  CHOIX_DE_COMPTE,
  decompteDesLongsCourriers,
  PLAFOND_DE_COMPTE,
  volsCourtsApresTotal,
  type BilanAnswers,
} from '@/types/bilan';
import { optionCible } from '@/types/demande';

// « 10+ » stockait 10 — simplification de `v1-05`, levée le 02/10/2026 (`v1-33` §6) : la puce ouvre un
// champ, réclamé (`ChampDuPlafond`, `plafondChoisi`). La liste et son plafond sont ceux des longs trajets
// (`CHOIX_DE_COMPTE`, `src/types/bilan.ts`).
const MAX_VOLS = PLAFOND_DE_COMPTE;

/**
 * La question écrite une fois pour ses deux usages : le titre de l'étape et le nom de la série de
 * puces (`GroupeDeChoix`), qui s'annoncerait sinon comme onze chiffres sans rien qui dise ce qu'ils
 * comptent.
 */
const QUESTION_TOTAL = 'Combien de vols prends-tu dans une année type ?';

// B3.1 / B3.2
export function FlightsStep({
  answers,
  update,
  plafond,
  choisirLePlafond,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
  /** « 10+ » est la réponse du total (`plafondChoisi`) : le champ est ouvert. */
  plafond: boolean;
  /** « 10+ » touché, ou une autre puce : l'écran du questionnaire tient le drapeau (`HorsColonnes`). */
  choisirLePlafond: (choisi: boolean) => void;
}) {
  const theme = useTheme();
  // **Sans réponse, le total ne vaut rien, pas zéro** (01/10/2026, `v1-33` D1) : aucune puce n'arrive
  // cochée, et l'étape le réclame. Les lectures chiffrées ci-dessous ne servent qu'une fois un total
  // choisi — la seconde question ne se rend qu'à partir d'un vol.
  const total = answers.flights_total_per_year ?? 0;
  // **Au-delà de dix vols, la part de vols courts se saisit aussi** (décidé le 02/10/2026) : la rangée
  // de 0 au total ferait vingt-six puces pour vingt-cinq vols. Même question, un champ borné au total.
  const courtsSaisis = total > PLAFOND_DE_COMPTE;
  const shortChoices = courtsSaisis ? [] : Array.from({ length: total + 1 }, (_, i) => i);
  const longCount = Math.max(total - (answers.flights_short_per_year ?? 0), 0);
  const questionCourts = `Sur ces ${total}, combien sont courts ?`;
  // Où mène « Il manque encore le nombre de vols » (`v1-31` §2.5) : la question du titre, qui ne se
  // marque jamais (`seMarque`), et la puce choisie ou la première.
  const { bloc: blocDuTotal, cible: cibleDuTotal } = useAncreDuChamp('flights_total_per_year');
  const iCibleDuTotal = optionCible(
    CHOIX_DE_COMPTE.map((n) => (n === MAX_VOLS ? plafond : !plafond && answers.flights_total_per_year === n))
  );
  // Et, sous « 10+ », le champ du nombre : il manque quand « 10+ » est touché et le champ vide.
  const {
    bloc: blocDuNombre,
    cible: cibleDuNombre,
    marque: nombreMarque,
  } = useAncreDuChamp<TextInput>('nombre_de_vols', { saisie: true });
  // Où mène « Il manque encore la part de vols courts » : le sous-titre se marque, et le focus va à la
  // puce, ou au champ au-delà de dix vols — un seul champ logique, l'ancre suit ce qui est à l'écran.
  const { bloc, cible, marque } = useAncreDuChamp<unknown>('flights_short_per_year', { saisie: courtsSaisis });
  const iCible = optionCible(shortChoices.map((n) => answers.flights_short_per_year === n));

  return (
    <View style={styles.container}>
      <View ref={blocDuTotal} style={styles.block}>
        {/* **« Combien de fois » laissait le facteur 2 au hasard** (C3.3, constat A7-7). Un
            aller-retour compte-t-il un ou deux ? Chacun répond à sa façon, sur le poste le plus
            lourd de la plupart des bilans — un vol long-courrier vaut à lui seul plus d'une année
            de trajet domicile-travail en voiture pour beaucoup de profils.

            Levé par la copie et non en doublant les distances : doubler `dist_flight_short` et
            `dist_flight_long` invaliderait la quinzaine d'assertions chiffrées de la suite pgTAP
            **et** obligerait à relever à nouveau les facteurs avion, dont la valeur dépend du `km`
            demandé à l'API Impact CO2. Le calcul ne bouge pas ; c'est la question qui devient
            sans ambiguïté. */}
        <TitreDEtape>{QUESTION_TOTAL}</TitreDEtape>
        <ThemedText type="small" themeColor="textTertiary">
          Un aller-retour compte pour deux vols.
        </ThemedText>
        {/* Les puces et le champ qu'ouvre « 10+ », enveloppés ensemble : le haut de la rangée est la borne
            que l'écran ne fait pas passer au-dessus du bord en remontant pour montrer le champ. */}
        <ChoixOuvrant>
          <GroupeDeChoix question={QUESTION_TOTAL} style={styles.chipsWrap}>
            {CHOIX_DE_COMPTE.map((n, i) => (
              <Chip
                key={n}
                ref={i === iCibleDuTotal ? cibleDuTotal : undefined}
                label={n === MAX_VOLS ? `${MAX_VOLS}+` : String(n)}
                // Ce qu'un lecteur d'écran entend là où l'œil lit « 10+ » (A2-9).
                accessibilityLabel={n === MAX_VOLS ? `${MAX_VOLS} vols ou plus` : undefined}
                role="radio"
                selected={n === MAX_VOLS ? plafond : !plafond && answers.flights_total_per_year === n}
                onPress={() => {
                  if (n === MAX_VOLS) {
                    // Le champ s'ouvre vide, à remplir — sauf sur un nombre déjà au-delà, qu'on garde. La
                    // part de vols courts suit la règle d'un total qui change.
                    choisirLePlafond(true);
                    if (!plafond)
                      update({
                        flights_total_per_year: null,
                        flights_short_per_year: volsCourtsApresTotal(answers, MAX_VOLS),
                      });
                    return;
                  }
                  choisirLePlafond(false);
                  update({
                    flights_total_per_year: n,
                    flights_short_per_year: volsCourtsApresTotal(answers, n),
                  });
                }}
              />
            ))}
          </GroupeDeChoix>
          {plafond && (
            <ChampDuPlafond
              refDuBloc={blocDuNombre}
              refDuChamp={cibleDuNombre}
              marque={nombreMarque}
              valeur={answers.flights_total_per_year}
              // **La part de vols courts ne suit pas la frappe** : la ramener sous chaque valeur tapée
              // perdait la réponse pendant qu'on retape le total (« 20 » → « 2 » → « 25 »). Une part
              // devenue plus grande que le total se réclame (`manqueDeLEtape`). Seul un total nul la
              // pose à zéro, comme sa puce.
              onChange={(valeur) =>
                update(
                  valeur === 0
                    ? { flights_total_per_year: 0, flights_short_per_year: 0 }
                    : { flights_total_per_year: valeur }
                )
              }
              unite="vols"
              label="Nombre de vols sur une année"
            />
          )}
        </ChoixOuvrant>
      </View>

      {total > 0 && (
        <>
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          <View ref={bloc} style={styles.block}>
            <IntituleDuChamp type="subtitle" weight={600} style={TypeScale.question} marque={marque}>
              {questionCourts}
            </IntituleDuChamp>
            <ThemedText type="small" themeColor="textTertiary">
              Europe, moins de 3 h. Le reste est compté comme long-courrier.
            </ThemedText>
            {/* **La même forme que le total, juste au-dessus** (01/10/2026, `v1-33`, Q-12) : deux séries de
                nombres sur un même écran répondent à la même fonction — choisir un nombre —, donc elles
                prennent le même rayon, la pilule du défaut de `Chip`. Celle-ci était à `Radius.chip` : des
                ronds au-dessus, des carrés arrondis dessous, pour rien qui se dise. */}
            {courtsSaisis ? (
              // Borné au total pendant la saisie : 30 tapé sous 25 vols s'affiche 25, sans phrase de plus
              // — le décompte des long-courriers, juste dessous, dit ce qu'il en reste.
              <NumericField
                ref={cible as RefObject<TextInput | null>}
                value={answers.flights_short_per_year}
                onChange={(valeur) =>
                  update({ flights_short_per_year: valeur === null ? null : Math.min(valeur, total) })
                }
                unit="vols"
                label="Nombre de vols courts"
                entier
              />
            ) : (
              <GroupeDeChoix question={questionCourts} style={styles.row}>
                {shortChoices.map((n, i) => (
                  <Chip
                    key={n}
                    ref={i === iCible ? (cible as RefObject<View | null>) : undefined}
                    label={String(n)}
                    role="radio"
                    selected={answers.flights_short_per_year === n}
                    onPress={() => update({ flights_short_per_year: n })}
                  />
                ))}
              </GroupeDeChoix>
            )}
            {answers.flights_short_per_year !== null && (
              <ThemedText type="small">{decompteDesLongsCourriers(longCount)}</ThemedText>
            )}
          </View>
        </>
      )}

      {/* **Les hypothèses s'affichent ici comme sur l'écran des longs trajets** (C3.3). Elles y
          étaient depuis le début (« 800 km train, 700 km voiture ») et nulle part pour les vols,
          alors que ce sont les deux plus grandes distances du bilan. Interpolées depuis
          `HYPOTHESES` plutôt que réécrites : un script de CI compare cette table aux constantes de
          `recompute_assessment_results`, donc ce qui s'affiche ici suit le calcul.

          **En Spline Sans et non plus en chasse fixe** (24/09/2026, décision n° 10) : la chasse fixe
          est réservée aux sources et aux codes techniques, et cette ligne est une phrase adressée à la
          personne — d'où aussi sa majuscule, que le registre `code` faisait tomber. */}
      <ThemedText type="small" themeColor="textTertiary">
        Distances moyennes par défaut · {formatKm(HYPOTHESES.volCourtKm)} court et moyen-courrier,{' '}
        {formatKm(HYPOTHESES.volLongKm)} long-courrier
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.five },
  block: { gap: Spacing.three },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  separator: { height: 1 },
});
