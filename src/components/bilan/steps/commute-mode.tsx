import { StyleSheet, View } from 'react-native';

import { useAncreDuChamp } from '@/components/bilan/ancre-du-champ';
import { BoiteDePrecision } from '@/components/bilan/boite-de-precision';
import { ChoixOuvrant } from '@/components/bilan/choix-ouvrant';
import { GroupeDeChoix } from '@/components/bilan/groupe-de-choix';
import { MissingModeLink } from '@/components/bilan/missing-mode-link';
import { ModeListItem } from '@/components/bilan/mode-list-item';
import { PrecisionChiffres } from '@/components/bilan/precision-chiffres';
import { PrecisionMode } from '@/components/bilan/precision-mode';
import { TitreDEtape } from '@/components/bilan/step-shell';
import {
  CAR_ENGINE_OPTIONS,
  COMMUTE_MODE_CHOICES,
  enFamilles,
  FAMILLE_DU_MODE,
  TRAIN_TYPE_OPTIONS,
  TWO_WHEELER_TYPE_OPTIONS,
  VELO_TYPE_OPTIONS,
  type CommuteModeChoice,
} from '@/constants/transport-modes';
import { Spacing } from '@/constants/theme';
import { TAILLES_DE_COVOITURAGE, type BilanAnswers } from '@/types/bilan';
import { optionCible } from '@/types/demande';

/**
 * Écrite une fois : le titre de l'étape et le nom de la liste des modes (`GroupeDeChoix`). La liste
 * n'avait pas de groupe jusqu'au 25/09/2026 : neuf `radio` isolés, et « Voiture (seul) », atteint au
 * clavier ou au doigt, ne disait pas à quelle question il répond.
 */
const QUESTION_MODE = 'Quel est ton mode de transport principal pour ce trajet ?';

// B1.4. Le moteur (B1.4bis, hors spec d'origine — cf. migration
// 20260904*_car_engine.sql) n'ajoute jamais d'entrée à la liste ci-dessus : question de
// suivi affichée uniquement quand "voiture" est choisi, sur ce même écran plutôt qu'un
// pas séparé, même logique que le "Lequel ?" imbriqué de commute-extra.tsx.
//
// Chaque précision est son propre groupe, posé **dans** celui des modes, juste sous l'option
// qu'elle décrit — `GroupeDeChoix` dit pourquoi c'est la forme juste.
export function CommuteModeStep({
  answers,
  update,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
}) {
  // Ce que le choix ouvre, dans l'ordre de l'écran — rien pour un mode qui n'a pas de précision.
  const precisionsDuMode = (choice: CommuteModeChoice) =>
    [
      choice.modeId === 'voiture' && (
        <PrecisionMode
          key="motorisation"
          champ="commute_car_engine"
          question="Quelle motorisation ?"
          options={CAR_ENGINE_OPTIONS}
          valeur={answers.commute_car_engine}
          onChange={(value) => update({ commute_car_engine: value })}
        />
      ),
      choice.modeId === 'deux_roues_motorise' && (
        <PrecisionMode
          key="deux-roues"
          champ="commute_two_wheeler_type"
          question="Quel type de deux-roues ?"
          options={TWO_WHEELER_TYPE_OPTIONS}
          valeur={answers.commute_two_wheeler_type}
          onChange={(value) => update({ commute_two_wheeler_type: value })}
        />
      ),
      choice.modeId === 'train' && (
        <PrecisionMode
          key="train"
          champ="commute_train_type"
          question="Quel type de train ?"
          options={TRAIN_TYPE_OPTIONS}
          valeur={answers.commute_train_type}
          onChange={(value) => update({ commute_train_type: value })}
        />
      ),
      choice.modeId === 'velo' && (
        <PrecisionMode
          key="velo"
          champ="commute_velo_type"
          question="Quel type de vélo ?"
          options={VELO_TYPE_OPTIONS}
          valeur={answers.commute_velo_type}
          onChange={(value) => update({ commute_velo_type: value })}
        />
      ),
      choice.carpool && (
        <PrecisionChiffres
          key="personnes"
          champ="commute_carpool_size"
          question="Vous êtes combien à partager ce trajet ?"
          options={TAILLES_DE_COVOITURAGE}
          valeur={answers.commute_carpool_size}
          onChange={(value) => update({ commute_carpool_size: value })}
        />
      ),
    ].filter(Boolean);

  // Où mène « Il manque encore ton mode de transport » (`v1-31` §2.5) : la question et sa liste, et le
  // focus sur le mode coché — ou le premier, « Voiture (seul) ». Le titre ne se marque pas (`seMarque`).
  const { bloc, cible } = useAncreDuChamp('commute_mode');
  const iCible = optionCible(
    COMMUTE_MODE_CHOICES.map(
      (choice) => answers.commute_mode === choice.modeId && answers.commute_is_carpool === choice.carpool
    )
  );
  const cleCible = COMMUTE_MODE_CHOICES[iCible].key;

  return (
    <View style={styles.container}>
      <View ref={bloc} style={styles.question}>
        <TitreDEtape>{QUESTION_MODE}</TitreDEtape>
        {/* **Trois familles, sans intertitre** (29/09/2026, `v1-31`, décision 2) : une sous-vue sans rôle
            par famille, 4 px entre deux modes d'une famille, 16 entre deux familles. Les flèches du
            clavier ne les voient pas — `groupe-au-clavier.ts` prend les options dont le groupe est le
            plus proche. */}
        <GroupeDeChoix question={QUESTION_MODE} style={styles.familles}>
          {enFamilles(COMMUTE_MODE_CHOICES, (choice) => choice.modeId).map((famille) => (
            <View key={FAMILLE_DU_MODE[famille[0].modeId]} style={styles.famille}>
              {famille.map((choice) => {
                const selected =
                  answers.commute_mode === choice.modeId && answers.commute_is_carpool === choice.carpool;
                const precisions = selected ? precisionsDuMode(choice) : [];
                return (
                  <ChoixOuvrant key={choice.key}>
                    <ModeListItem
                      ref={choice.key === cleCible ? cible : undefined}
                      label={choice.label}
                      selected={selected}
                      // Cet écran ne dit que ce que la personne vient de choisir. Ce que ce choix
                      // rend impossible — taille du covoiturage, second mode devenu identique,
                      // motorisation ou type de deux-roues rattachés à une jambe qui n'existe
                      // plus — est effacé par `normaliserReponses`, appliquée après chaque
                      // `update`. Trois écrans tenaient ces listes à la main, et elles
                      // divergeaient déjà (audit A2-17).
                      onPress={() => update({ commute_mode: choice.modeId, commute_is_carpool: choice.carpool })}
                    />

                    {/* La précision s'ouvre sous l'élément qui la déclenche — cf. `precision-mode.tsx`
                        pour la raison, qui n'est pas cosmétique. **Une seule boîte par choix** (`v1-31`
                        §2.2), qui porte une question, ou deux pour le covoiturage.

                        C4.4 a ajouté le type de train et de vélo, sur le patron exact de la
                        motorisation. Le mode s'appelait « Train ou RER » et portait le facteur du TER,
                        soit 2,83 fois celui du RER : le produit promettait une chose et en comptait une
                        autre. Et « Vélo » ne distinguait pas l'assistance électrique, 64 fois plus
                        émettrice — petit en valeur absolue, mais sur le profil dont le total est de
                        l'ordre de la dizaine de kilos. Jamais des entrées de plus dans la liste : une
                        liste qui gonfle est ce qui fait abandonner un questionnaire, une question de
                        suivi ne coûte qu'à ceux qu'elle concerne.

                        **La taille du covoiturage vient de l'écran suivant** (recette du 14/09/2026,
                        `v1-16` §3). Le produit pose trois fois combien de personnes partagent la
                        voiture, et le présentait de deux façons : sous l'option choisie pour les sorties
                        et les longs trajets depuis C3.5, en tête de l'écran suivant pour celui-ci. La
                        question décrit la voiture qu'on vient de choisir, exactement comme la
                        motorisation — la séparer du choix demandait de se souvenir d'un écran à l'autre
                        de quelle voiture on parle. Elle suit donc la motorisation, dans la même boîte :
                        les deux précisions décrivent la même voiture. */}
                    {precisions.length > 0 && <BoiteDePrecision>{precisions}</BoiteDePrecision>}
                  </ChoixOuvrant>
                );
              })}
            </View>
          ))}
        </GroupeDeChoix>
      </View>

      <MissingModeLink context="B1.4 mode domicile-travail" />
    </View>
  );
}

const styles = StyleSheet.create({
  // **16 entre le titre et la liste, 8 entre la liste et le lien du mode manquant** (`v1-31` écart 5) —
  // 24 et 24 auparavant. Deux écarts différents, et Yoga ne fusionne pas les marges (`EXPO.md` §1.6) :
  // chacun est le `gap` d'un conteneur — la question et sa liste forment le bloc où mène ce qui manque.
  container: { gap: Spacing.two },
  question: { gap: Spacing.three },
  familles: { gap: Spacing.three },
  famille: { gap: Spacing.one },
});
