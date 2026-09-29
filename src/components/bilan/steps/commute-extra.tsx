import { StyleSheet, View } from 'react-native';

import { IntituleDuChamp, useAncreDuChamp } from '@/components/bilan/ancre-du-champ';
import { BoiteDePrecision } from '@/components/bilan/boite-de-precision';
import { Chip } from '@/components/bilan/chip';
import { ChoixOuvrant } from '@/components/bilan/choix-ouvrant';
import { GroupeDeChoix } from '@/components/bilan/groupe-de-choix';
import { MissingModeLink } from '@/components/bilan/missing-mode-link';
import { ModeListItem } from '@/components/bilan/mode-list-item';
import { PrecisionMode } from '@/components/bilan/precision-mode';
import { TitreDEtape } from '@/components/bilan/step-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { Depliage } from '@/lib/mouvement';
import {
  CAR_ENGINE_OPTIONS,
  enFamilles,
  FAMILLE_DU_MODE,
  MODES_PAR_FAMILLE,
  TRAIN_TYPE_OPTIONS,
  TRANSPORT_MODE_LABELS,
  TWO_WHEELER_TYPE_OPTIONS,
  VELO_TYPE_OPTIONS,
  type TransportModeId,
} from '@/constants/transport-modes';
import { PARTS_DU_SECOND_MODE, type BilanAnswers } from '@/types/bilan';
import { optionCible } from '@/types/demande';

/** Écrite une fois : le titre de l'étape et le nom du « Oui / Non » (`GroupeDeChoix`). */
const QUESTION_SECOND_MODE = 'Utilises-tu un second mode en complément ?';

/**
 * Écrite une fois : l'intitulé de la liste imbriquée et le nom de son groupe. La liste n'en avait pas
 * jusqu'au 25/09/2026 — des `radio` isolés sous le « Oui ». « Lequel ? » seul est court, et il
 * suffit : le groupe s'ouvre juste après la question du second mode, dont il est la suite.
 */
const QUESTION_LEQUEL = 'Lequel ?';

// B1.6 / B1.7 — second mode Oui/Non, puis « Lequel ? » imbriqué si Oui.
//
// **B1.5 est parti sur l'écran précédent** (recette du 14/09/2026, `v1-16` §3) : la taille du
// covoiturage se demande sous l'option « Voiture (covoiturage) » de B1.4, comme ses deux jumelles
// des sorties et des longs trajets. Cet écran n'a donc plus qu'une question — et elle porte enfin
// son titre. Le `screenTitle` vivait sur le bloc du covoiturage, qui était **conditionnel** : qui
// ne covoiturait pas arrivait ici sur un écran sans titre. Le chantier ne crée pas ce défaut, il
// le referme.
export function CommuteExtraStep({
  answers,
  update,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
}) {
  // Dans l'ordre des familles, comme la liste du mode principal (`v1-31`, décision 2), moins le mode
  // déjà choisi : c'est `MODES_PAR_FAMILLE` qui le décide, et non l'ordre des clés d'un objet.
  const secondModeChoices = MODES_PAR_FAMILLE.map(({ modeId }) => modeId).filter(
    (id) => id !== answers.commute_mode
  );

  // Ce que le second mode ouvre, dans l'ordre de l'écran : son type quand il en a un, puis la part du
  // trajet, que tout second mode demande.
  const precisionsDuSecondMode = (modeId: TransportModeId) =>
    [
      // La motorisation et les types sont partagés par les deux jambes (cf. types/bilan.ts) : B1.7
      // exclut le mode déjà choisi en B1.4, donc au plus une jambe porte la voiture, le deux-roues,
      // le train ou le vélo à un instant donné (C4.4 pour les deux derniers).
      modeId === 'voiture' && (
        <PrecisionMode
          key="motorisation"
          champ="commute_car_engine"
          question="Quelle motorisation ?"
          options={CAR_ENGINE_OPTIONS}
          valeur={answers.commute_car_engine}
          onChange={(value) => update({ commute_car_engine: value })}
        />
      ),
      modeId === 'deux_roues_motorise' && (
        <PrecisionMode
          key="deux-roues"
          champ="commute_two_wheeler_type"
          question="Quel type de deux-roues ?"
          options={TWO_WHEELER_TYPE_OPTIONS}
          valeur={answers.commute_two_wheeler_type}
          onChange={(value) => update({ commute_two_wheeler_type: value })}
        />
      ),
      modeId === 'train' && (
        <PrecisionMode
          key="train"
          champ="commute_train_type"
          question="Quel type de train ?"
          options={TRAIN_TYPE_OPTIONS}
          valeur={answers.commute_train_type}
          onChange={(value) => update({ commute_train_type: value })}
        />
      ),
      modeId === 'velo' && (
        <PrecisionMode
          key="velo"
          champ="commute_velo_type"
          question="Quel type de vélo ?"
          options={VELO_TYPE_OPTIONS}
          valeur={answers.commute_velo_type}
          onChange={(value) => update({ commute_velo_type: value })}
        />
      ),
      // C3.4 — la question que le calcul se posait tout seul. Il attribuait exactement la moitié des
      // kilomètres à chaque jambe, ce qui sous-estime de 44 % un vélo + train (on fait rarement la
      // moitié du trajet à vélo) et surestime de 51 % un parc-relais (on ne conduit pas jusqu'à
      // mi-chemin) — sur le poste qui décide du poste dominant, donc du plan.
      <PrecisionMode
        key="part"
        champ="commute_second_mode_share"
        question="Quelle part du trajet fais-tu ainsi ?"
        options={PARTS_DU_SECOND_MODE}
        valeur={answers.commute_second_mode_share}
        onChange={(value) => update({ commute_second_mode_share: value })}
      />,
    ].filter(Boolean);

  // Où mène « Il manque encore … » (`v1-31` §2.5) : la question du second mode, puis « Lequel ? », dont
  // l'intitulé se marque — le titre, jamais (`seMarque`).
  const { bloc: blocDeLaQuestion, cible: cibleDeLaQuestion } = useAncreDuChamp('commute_second_mode_used');
  const iCibleDeLaQuestion = optionCible([
    answers.commute_second_mode_used === true,
    answers.commute_second_mode_used === false,
  ]);
  const {
    bloc: blocDeLequel,
    cible: cibleDeLequel,
    marque: lequelMarque,
  } = useAncreDuChamp('commute_second_mode');
  const modeCible =
    secondModeChoices[optionCible(secondModeChoices.map((id) => answers.commute_second_mode === id))];

  return (
    <View style={styles.container}>
      <View ref={blocDeLaQuestion} style={styles.block}>
        <TitreDEtape>{QUESTION_SECOND_MODE}</TitreDEtape>
        <ThemedText type="small" themeColor="textTertiary">
          Par exemple vélo puis train.
        </ThemedText>
        {/* Le « Oui » et ce qu'il ouvre, enveloppés ensemble : le haut du groupe est la borne que
            l'écran ne fait pas passer au-dessus du bord en remontant pour montrer « Lequel ? ». */}
        <ChoixOuvrant style={styles.block}>
          <GroupeDeChoix question={QUESTION_SECOND_MODE} style={styles.row}>
            <Chip
              ref={iCibleDeLaQuestion === 0 ? cibleDeLaQuestion : undefined}
              label="Oui"
              role="radio"
              selected={answers.commute_second_mode_used === true}
              onPress={() => update({ commute_second_mode_used: true })}
              flex
              radius={16}
              selectedStyle="outline"
            />
            <Chip
              ref={iCibleDeLaQuestion === 1 ? cibleDeLaQuestion : undefined}
              label="Non"
              role="radio"
              selected={answers.commute_second_mode_used === false}
              onPress={() => update({ commute_second_mode_used: false, commute_second_mode: null })}
              flex
              radius={16}
              selectedStyle="outline"
            />
          </GroupeDeChoix>
          {answers.commute_second_mode_used === true && (
            <Depliage suivieALOuverture>
              {/* `ThemedView` ne transmet pas de référence : le bloc où mène « le second mode » est une
                  vue ordinaire autour de la boîte. */}
              <View ref={blocDeLequel}>
                <ThemedView type="backgroundElement" style={styles.nestedBox}>
                  <IntituleDuChamp type="small" themeColor="textTertiary" marque={lequelMarque}>
                    {QUESTION_LEQUEL}
                  </IntituleDuChamp>
                  {/* Chaque précision — motorisation, type, part du trajet — est son propre groupe, posé
                      dans celui-ci sous le mode qu'elle décrit (`GroupeDeChoix` dit pourquoi). */}
                  <GroupeDeChoix question={QUESTION_LEQUEL} style={styles.familles}>
                    {enFamilles(secondModeChoices, (modeId) => modeId).map((famille) => (
                      <View key={FAMILLE_DU_MODE[famille[0]]} style={styles.famille}>
                        {famille.map((modeId) => (
                          <ChoixOuvrant key={modeId}>
                            <ModeListItem
                              ref={modeId === modeCible ? cibleDeLequel : undefined}
                              label={TRANSPORT_MODE_LABELS[modeId]}
                              selected={answers.commute_second_mode === modeId}
                              // La motorisation et le type de deux-roues sont partagés par les deux
                              // jambes (cf. types/bilan.ts) : ce qu'un changement de second mode rend
                              // orphelin est effacé par `normaliserReponses`, pas ici.
                              onPress={() => update({ commute_second_mode: modeId })}
                              nestedBackground
                            />
                            {/* La précision sous l'élément choisi, jamais après la liste (cf.
                                `precision-mode.tsx`) — **une seule boîte**, qui porte le type du mode
                                quand il en a un, puis la part du trajet (`v1-31` §2.2). Deux boîtes
                                feraient partir deux annonces de hauteur dans la même image, sans règle
                                pour dire laquelle gagne ; le handoff l'avait oublié, le plan l'a relevé. */}
                            {answers.commute_second_mode === modeId && (
                              <BoiteDePrecision>{precisionsDuSecondMode(modeId)}</BoiteDePrecision>
                            )}
                          </ChoixOuvrant>
                        ))}
                      </View>
                    ))}
                  </GroupeDeChoix>
                </ThemedView>
              </View>
            </Depliage>
          )}
        </ChoixOuvrant>
      </View>
      <MissingModeLink context="B1.7 second mode domicile-travail" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.five },
  block: { gap: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.two },
  nestedBox: { borderRadius: Radius.field, padding: Spacing.three, gap: Spacing.two },
  familles: { gap: Spacing.three },
  famille: { gap: Spacing.one },
});
