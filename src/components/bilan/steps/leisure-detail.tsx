import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/bilan/chip';
import { GroupeDeChoix } from '@/components/bilan/groupe-de-choix';
import { MissingModeLink } from '@/components/bilan/missing-mode-link';
import { ModeListItem } from '@/components/bilan/mode-list-item';
import { NumericField } from '@/components/bilan/numeric-field';
import { PrecisionChiffres } from '@/components/bilan/precision-chiffres';
import { PrecisionMode } from '@/components/bilan/precision-mode';
import { TitreDEtape } from '@/components/bilan/step-shell';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  CAR_ENGINE_OPTIONS,
  TRAIN_TYPE_OPTIONS,
  LEISURE_MODE_CHOICES_MORE,
  LEISURE_MODE_CHOICES_PRIMARY,
  TWO_WHEELER_TYPE_OPTIONS,
  VELO_TYPE_OPTIONS,
} from '@/constants/transport-modes';
import { useTheme } from '@/hooks/use-theme';
import { donnerLeFocus } from '@/lib/focus';
import {
  TAILLES_DE_COVOITURAGE,
  type BilanAnswers,
  type LeisureDistanceBracket,
} from '@/types/bilan';

const BRACKETS: { value: LeisureDistanceBracket; label: string }[] = [
  { value: 'lt_5', label: 'Moins de 5 km' },
  { value: '5_15', label: '5 à 15 km' },
  { value: '15_30', label: '15 à 30 km' },
  { value: '30_plus', label: 'Plus de 30 km' },
];

/** Écrite une fois : le titre de la seconde moitié de l'étape et le nom de la série de tranches. */
const QUESTION_DISTANCE = 'Quelle distance aller, en général ?';

/**
 * Écrite une fois : le titre de la première moitié et le nom de la liste des modes. La liste n'avait
 * pas de groupe jusqu'au 25/09/2026 — « Voiture (seul) » ne disait pas à quelle question il répond,
 * et l'étape pose deux questions.
 */
const QUESTION_MODE = 'Avec quel mode, principalement ?';

// B2.2 / B2.3 — les deux options voiture écrivent toujours le même `leisure_mode: 'voiture'`,
// mais **le covoiturage compte désormais** (C3.5) : `leisure_is_carpool` le porte en base,
// exactement comme `commute_is_carpool` le fait depuis toujours pour le trajet quotidien. Une
// sortie à quatre dans la même voiture comptait quatre fois.
//
// Deux conséquences sur cet écran. La taille est demandée sous l'option choisie, parce que le
// calcul ne divise que si elle est renseignée — un drapeau seul ne dit pas par combien. Et
// l'écart consigné ici (« revenir en arrière oublie laquelle des deux était cochée ») a
// disparu de lui-même : la clé sélectionnée se dérive maintenant d'une réponse persistée, pas
// d'un état local qui repartait sur « seul ».
export function LeisureDetailStep({
  answers,
  update,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
}) {
  const theme = useTheme();
  // Ouvert d'emblée si le mode déjà répondu vit dans la seconde liste. Sinon la question
  // paraît vide alors qu'elle est remplie : un re-bilan prérempli (la personne allait en bus
  // le mois dernier) comme un simple aller-retour Retour/Suivant remontaient quatre modes
  // parmi lesquels le bon n'était pas, « Suivant » restait actif, et la personne cochait une
  // voiture pour avancer — son « bus » changeait de valeur sans qu'elle le sache (audit A2-5).
  const [showMore, setShowMore] = useState(() =>
    LEISURE_MODE_CHOICES_MORE.some((choice) => choice.modeId === answers.leisure_mode)
  );
  // **« Voir les autres modes » disparaît sous le geste qui l'active, et le focus partait avec lui**
  // (`v1-29` §6.4, corrigé le 25/09/2026). Au clavier, le lien sortait de l'arbre, le focus
  // retombait sur le document, et la tabulation repartait du haut de la page — au lecteur d'écran,
  // rien des cinq modes qui venaient d'arriver n'était annoncé. Il va désormais au **premier mode
  // révélé** : c'est à sa place que le lien se trouvait, et c'est lui qu'on venait chercher.
  // Seulement après le geste — jamais au montage d'une liste déjà ouverte par un brouillon, où le
  // focus n'a rien à suivre (la même règle que la réplique de la carte du point).
  const premierDesAutres = useRef<View>(null);
  const vientDeDeplier = useRef(false);
  useEffect(() => {
    if (!showMore || !vientDeDeplier.current) return;
    vientDeDeplier.current = false;
    donnerLeFocus(premierDesAutres.current);
  }, [showMore]);
  // Voiture seul/covoiturage partagent le même `leisure_mode` ('voiture') : la clé
  // choisie, pas la valeur, distingue laquelle des deux rangées est cochée à l'écran —
  // et donc sous laquelle des deux la précision s'ouvre.
  const [selectedKey, setSelectedKey] = useState<string | null>(
    answers.leisure_mode === 'voiture'
      ? answers.leisure_is_carpool
        ? 'voiture_covoiturage'
        : 'voiture_solo'
      : (answers.leisure_mode ?? null)
  );
  const modeChoices = showMore
    ? [...LEISURE_MODE_CHOICES_PRIMARY, ...LEISURE_MODE_CHOICES_MORE]
    : LEISURE_MODE_CHOICES_PRIMARY;

  return (
    <View style={styles.container}>
      <View style={styles.block}>
        <TitreDEtape>{QUESTION_MODE}</TitreDEtape>
        {/* Le groupe ne porte que les modes et leurs précisions — chacune son propre groupe, posé
            dedans sous le mode qu'elle décrit (`GroupeDeChoix`). « Voir les autres modes » le suit
            sans y entrer : c'est une commande, pas une option, et il ne se rattache à aucune
            ligne. Il garde sa place au pixel près, l'écart de la liste étant aussi celui qui les
            sépare. */}
        <View style={styles.list}>
          <GroupeDeChoix question={QUESTION_MODE} style={styles.list}>
            {modeChoices.map((choice) => {
              const selected = selectedKey === choice.key;
              return (
                <View key={choice.key}>
                  <ModeListItem
                    ref={choice.key === LEISURE_MODE_CHOICES_MORE[0].key ? premierDesAutres : undefined}
                    label={choice.label}
                    selected={selected}
                    onPress={() => {
                      setSelectedKey(choice.key);
                      // La motorisation, le type de deux-roues et la taille du covoiturage
                      // rattachés au mode précédent sont effacés par `normaliserReponses`, pas
                      // ici (audit A2-17).
                      update({ leisure_mode: choice.modeId, leisure_is_carpool: choice.carpool });
                    }}
                  />

                  {/* La précision s'ouvre sous l'élément qui la déclenche — cf.
                      `precision-mode.tsx` pour la raison, qui n'est pas cosmétique. */}
                  {selected && choice.modeId === 'voiture' && (
                    <View style={styles.precision}>
                      <PrecisionMode
                        question="Quelle motorisation ?"
                        options={CAR_ENGINE_OPTIONS}
                        valeur={answers.leisure_car_engine}
                        onChange={(value) => update({ leisure_car_engine: value })}
                      />
                    </View>
                  )}

                  {selected && choice.modeId === 'deux_roues_motorise' && (
                    <View style={styles.precision}>
                      <PrecisionMode
                        question="Quel type de deux-roues ?"
                        options={TWO_WHEELER_TYPE_OPTIONS}
                        valeur={answers.leisure_two_wheeler_type}
                        onChange={(value) => update({ leisure_two_wheeler_type: value })}
                      />
                    </View>
                  )}

                  {/* C4.4 — les jumelles loisirs des deux révélations du quotidien. Elles sont
                      posées ici plutôt que déduites de B1 parce qu'on ne fait pas ses sorties
                      comme son trajet : on peut aller au travail en RER et en week-end en TER. */}
                  {selected && choice.modeId === 'train' && (
                    <View style={styles.precision}>
                      <PrecisionMode
                        question="Quel type de train ?"
                        options={TRAIN_TYPE_OPTIONS}
                        valeur={answers.leisure_train_type}
                        onChange={(value) => update({ leisure_train_type: value })}
                      />
                    </View>
                  )}

                  {selected && choice.modeId === 'velo' && (
                    <View style={styles.precision}>
                      <PrecisionMode
                        question="Quel type de vélo ?"
                        options={VELO_TYPE_OPTIONS}
                        valeur={answers.leisure_velo_type}
                        onChange={(value) => update({ leisure_velo_type: value })}
                      />
                    </View>
                  )}

                  {/* C3.5 — après la motorisation, sous la même option : les deux précisions
                      décrivent la même voiture. */}
                  {selected && choice.carpool && (
                    <View style={styles.precision}>
                      <PrecisionChiffres
                        question="Vous êtes combien dans la voiture ?"
                        options={TAILLES_DE_COVOITURAGE}
                        valeur={answers.leisure_carpool_size}
                        onChange={(value) => update({ leisure_carpool_size: value })}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </GroupeDeChoix>
          {!showMore && (
            <TextLink
              label="Voir les autres modes"
              onPress={() => {
                vientDeDeplier.current = true;
                setShowMore(true);
              }}
              type="linkPrimary"
            />
          )}
        </View>
      </View>

      <View style={[styles.separator, { backgroundColor: theme.border }]} />

      <View style={styles.block}>
        <ThemedText type="subtitle" weight={600} style={styles.subtitle}>
          {QUESTION_DISTANCE}
        </ThemedText>
        <GroupeDeChoix question={QUESTION_DISTANCE} style={styles.chipsWrap}>
          {BRACKETS.map((bracket) => (
            <Chip
              key={bracket.value}
              label={bracket.label}
              role="radio"
              selected={answers.leisure_distance_bracket === bracket.value}
              onPress={() => update({ leisure_distance_bracket: bracket.value })}
            />
          ))}
        </GroupeDeChoix>

        {/* C3.6 — la seule tranche sans borne haute est aussi la seule qui demandait quelque
            chose de plus : « Plus de 30 km » valait 40 km, donc une sortie de 120 km comptait
            pour un tiers d'elle-même, sur un poste qui peut être dominant.

            Le champ se rend **après** la rangée de puces et non sous celle qui l'ouvre, à
            l'inverse des précisions de mode : les tranches sont un groupe qui revient à la
            ligne, pas une liste d'éléments, donc il n'y a pas d'élément sous lequel se glisser
            — et à quatre puces, le champ reste juste sous l'œil. */}
        {answers.leisure_distance_bracket === '30_plus' && (
          <View style={styles.distanceLibre}>
            <ThemedText type="small" themeColor="textTertiary">
              Environ combien, pour un aller ?
            </ThemedText>
            <NumericField
              value={answers.leisure_distance_km}
              onChange={(value) => update({ leisure_distance_km: value })}
              unit="km"
              label="Distance d’un aller"
            />
          </View>
        )}
      </View>
      <MissingModeLink context="B2.2 mode loisirs" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.five },
  block: { gap: Spacing.three },
  subtitle: { fontSize: 22, lineHeight: 28, letterSpacing: -0.22 },
  list: { gap: Spacing.two },
  precision: { marginTop: Spacing.two },
  separator: { height: 1 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  distanceLibre: { gap: Spacing.two },
});
