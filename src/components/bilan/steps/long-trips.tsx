import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/bilan/chip';
import { PrecisionChiffres } from '@/components/bilan/precision-chiffres';
import { PrecisionMode } from '@/components/bilan/precision-mode';
import { TitreDEtape } from '@/components/bilan/step-shell';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { CAR_ENGINE_OPTIONS } from '@/constants/transport-modes';
import { OCCUPATIONS_LONG_TRAJET, type BilanAnswers } from '@/types/bilan';

// Même plage que les vols (`flights.tsx`, `TOTAL_CHOICES`) : l'écart à la spec §5 était que
// celle-ci s'arrêtait à 6, ce qui plafonnait les trajets longue distance d'un grand rouleur ou
// d'un habitué du train à un chiffre inférieur à la réalité — et dans le sens qui allège
// l'empreinte. Un re-bilan prérempli à « 6 » continue d'afficher 6 : rien ne se perd.
const COUNT_CHOICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Dernière puce de la série, qui vaut « ce nombre ou plus » — dérivée de `COUNT_CHOICES` et
 * non écrite en dur, à deux endroits qui auraient divergé : le libellé visible (« 6+ ») et le
 * libellé accessible (« 10 trajets ou plus »). C'est ce qui a permis de porter la plage de 6 à
 * 10 sans rien retoucher ailleurs : une valeur recopiée aurait fait annoncer « 6 trajets ou
 * plus » sur une puce qui n'est plus le plafond.
 */
const MAX_TRAJETS = COUNT_CHOICES[COUNT_CHOICES.length - 1];

/**
 * Ce qu'un lecteur d'écran entend sur la puce de plafond, là où l'œil lit « 6+ » (A2-9).
 *
 * Les autres puces gardent leur chiffre pour libellé : c'est le `radiogroup` nommé qui dit de
 * quelle série il s'agit, une fois, au lieu de le répéter sur chacune de ses puces.
 */
const LIBELLE_PLAFOND = `${MAX_TRAJETS} trajets ou plus`;

/**
 * Les puces d'occupation d'un long trajet en voiture (C3.5), dérivées de la liste que
 * `src/types/bilan.ts` tient face au `check` de la colonne.
 *
 * La dernière vaut « ce nombre ou plus », comme la puce de plafond des trajets — et pour la
 * même raison, son libellé accessible est dérivé plutôt que recopié. « 1 » n'a pas besoin
 * d'être traduit en « seul » : la question posée juste au-dessus est « Vous êtes combien ? »,
 * à laquelle « 1 » répond.
 */
const PLAFOND_OCCUPATION = OCCUPATIONS_LONG_TRAJET[OCCUPATIONS_LONG_TRAJET.length - 1];

const OPTIONS_OCCUPATION = OCCUPATIONS_LONG_TRAJET.map((n) => ({
  value: n,
  label: n === PLAFOND_OCCUPATION ? `${n}+` : String(n),
  accessibilityLabel:
    n === PLAFOND_OCCUPATION ? `${n} personnes ou plus` : `${n} personne${n > 1 ? 's' : ''}`,
}));

// B3.3 / B3.4 — la dernière puce stocke sa valeur nominale, même simplification que flights.tsx.
//
// Trois séries depuis C4.4, toutes trois rendues depuis `COUNT_CHOICES` : l'autocar a la même
// plage que le train et la voiture, parce que rien ne justifie qu'on plafonne plus bas le mode
// qu'on vient d'ouvrir — et un plafond propre à une série serait un second nombre à tenir.
export function LongTripsStep({
  answers,
  update,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.block}>
        <TitreDEtape>
          Et les trajets de plus de 300 km ?
        </TitreDEtape>
        <ThemedText type="small" themeColor="textTertiary">
          Sur une année type, hors avion.
        </ThemedText>
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textTertiary">
          En train
        </ThemedText>
        {/* `radiogroup` ferme la série, et **c'est son libellé qui la distingue, pas son rôle**
            (A2-9) : les séries de l'étape sont rigoureusement identiques — la même rangée, de
            « 0 » au plafond, rendue depuis la même liste, trois fois depuis C4.4 — et l'intitulé
            qui les qualifie est un frère dans l'arbre, pas un libellé rattaché. En lecture séquentielle
            il précède bien le groupe, mais en navigation de contrôle en contrôle ou en
            exploration tactile plus rien ne disait dans lequel on se trouve. Nommer le groupe le
            dit une fois ; le répéter sur chaque puce le dirait autant de fois qu'il y en a — un
            nombre qu'on ne recopie pas ici, la plage étant déjà passée de 6 à 10 sans que cette
            phrase le suive. Même motif que `ChoixDeRappel`. */}
        <View
          style={styles.chipsWrap}
          accessibilityRole="radiogroup"
          accessibilityLabel="Trajets longue distance en train"
        >
          {COUNT_CHOICES.map((n) => (
            <Chip
              key={n}
              label={n === MAX_TRAJETS ? `${MAX_TRAJETS}+` : String(n)}
              accessibilityLabel={n === MAX_TRAJETS ? LIBELLE_PLAFOND : undefined}
              role="radio"
              selected={answers.train_long_trips_per_year === n}
              onPress={() => update({ train_long_trips_per_year: n })}
              radius={Radius.chip}
            />
          ))}
        </View>
      </View>

      {/* C4.4 — le troisième compteur, entre les deux modes collectifs et la voiture. B3.4 ne
          proposait que l'avion, le train et la voiture, donc un Paris-Lyon en car était compté
          comme s'il n'avait pas eu lieu.

          **Il n'a pas de question de suivi**, et c'est ce qui le distingue de la voiture juste
          en dessous : la personne ne choisit ni la motorisation ni le remplissage d'un autocar —
          ce n'est pas son véhicule, donc il n'y a rien à lui demander de plus.

          Ce que ce compteur ne raconte pas, c'est une histoire flatteuse : l'autocar émet
          0,037560 kg/km, soit **plus qu'un TER** et douze fois un TGV. C'est précisément pour ça
          qu'il fallait le poser. */}
      <View style={styles.field}>
        <ThemedText type="small" themeColor="textTertiary">
          En autocar
        </ThemedText>
        <View
          style={styles.chipsWrap}
          accessibilityRole="radiogroup"
          accessibilityLabel="Trajets longue distance en autocar"
        >
          {COUNT_CHOICES.map((n) => (
            <Chip
              key={n}
              label={n === MAX_TRAJETS ? `${MAX_TRAJETS}+` : String(n)}
              accessibilityLabel={n === MAX_TRAJETS ? LIBELLE_PLAFOND : undefined}
              role="radio"
              selected={answers.coach_long_trips_per_year === n}
              onPress={() => update({ coach_long_trips_per_year: n })}
              radius={Radius.chip}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textTertiary">
          En voiture
        </ThemedText>
        <View
          style={styles.chipsWrap}
          accessibilityRole="radiogroup"
          accessibilityLabel="Trajets longue distance en voiture"
        >
          {COUNT_CHOICES.map((n) => (
            <Chip
              key={n}
              label={n === MAX_TRAJETS ? `${MAX_TRAJETS}+` : String(n)}
              accessibilityLabel={n === MAX_TRAJETS ? LIBELLE_PLAFOND : undefined}
              role="radio"
              selected={answers.car_long_trips_per_year === n}
              onPress={() =>
                update({ car_long_trips_per_year: n, car_long_trips_engine: n > 0 ? answers.car_long_trips_engine : null })
              }
              radius={Radius.chip}
            />
          ))}
        </View>

        {/* La précision s'ouvre sous les puces qui la déclenchent — cf.
            `precision-mode.tsx`. */}
        {answers.car_long_trips_per_year > 0 && (
          <View style={styles.precision}>
            <PrecisionMode
              question="Quelle motorisation ?"
              options={CAR_ENGINE_OPTIONS}
              valeur={answers.car_long_trips_engine}
              onChange={(value) => update({ car_long_trips_engine: value })}
            />
          </View>
        )}

        {/* C3.5 — le calcul supposait « seul » sur 700 km, sans jamais le demander, alors que
            c'est le trajet qu'on partage le plus : partir à trois divise l'empreinte par
            trois. La question suit la motorisation parce qu'elle décrit la même voiture, et
            elle apparaît sous la même condition — déclarer des longs trajets en voiture, c'est
            en déclarer deux choses. */}
        {answers.car_long_trips_per_year > 0 && (
          <View style={styles.precision}>
            <PrecisionChiffres
              question="Vous êtes combien dans la voiture ?"
              options={OPTIONS_OCCUPATION}
              valeur={answers.car_long_trips_occupancy}
              onChange={(value) => update({ car_long_trips_occupancy: value })}
            />
          </View>
        )}
      </View>

      {/* En Spline Sans et non plus en chasse fixe (24/09/2026, décision n° 10) : une phrase adressée à
          la personne, comme la ligne jumelle des vols — d'où sa majuscule. */}
      <ThemedText type="small" themeColor="textTertiary">
        Distances moyennes par défaut · 800 km train, 700 km autocar et voiture
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.five },
  block: { gap: Spacing.two },
  field: { gap: Spacing.two + 2 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  precision: { marginTop: 4 },
});
