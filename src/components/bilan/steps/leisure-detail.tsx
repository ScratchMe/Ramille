import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { IntituleDuChamp, useAncreDuChamp } from '@/components/bilan/ancre-du-champ';
import { BoiteDePrecision } from '@/components/bilan/boite-de-precision';
import { ChoixOuvrant } from '@/components/bilan/choix-ouvrant';
import { Chip } from '@/components/bilan/chip';
import { GroupeDeChoix } from '@/components/bilan/groupe-de-choix';
import { MissingModeLink } from '@/components/bilan/missing-mode-link';
import { ModeListItem } from '@/components/bilan/mode-list-item';
import { NumericField } from '@/components/bilan/numeric-field';
import { PrecisionChiffres } from '@/components/bilan/precision-chiffres';
import { PrecisionMode } from '@/components/bilan/precision-mode';
import { TitreDEtape } from '@/components/bilan/step-shell';
import { TextLink } from '@/components/text-link';
import { Spacing, TypeScale } from '@/constants/theme';
import {
  CAR_ENGINE_OPTIONS,
  enFamilles,
  FAMILLE_DU_MODE,
  TRAIN_TYPE_OPTIONS,
  LEISURE_MODE_CHOICES_MORE,
  LEISURE_MODE_CHOICES_PRIMARY,
  TWO_WHEELER_TYPE_OPTIONS,
  VELO_TYPE_OPTIONS,
  type CommuteModeChoice,
} from '@/constants/transport-modes';
import { useTheme } from '@/hooks/use-theme';
import { donnerLeFocus } from '@/lib/focus';
import { Depliage } from '@/lib/mouvement';
import {
  TAILLES_DE_COVOITURAGE,
  type BilanAnswers,
  type LeisureDistanceBracket,
} from '@/types/bilan';
import { optionCible } from '@/types/demande';

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
// disparu : la rangée cochée se lit sur la réponse persistée, mode **et** covoiturage, comme sur
// l'étape du trajet. Ce commentaire l'affirmait avant que ce soit vrai — la clé était encore
// recopiée dans un état local au montage — jusqu'au 29/09/2026 (`v1-27` §12.20, plus bas).
export function LeisureDetailStep({
  answers,
  update,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
}) {
  const theme = useTheme();
  // Ouverte si le mode répondu vit dans la seconde liste. Sinon la question paraît vide alors
  // qu'elle est remplie : un re-bilan prérempli (la personne allait en bus le mois dernier) comme
  // un simple aller-retour Retour/Suivant remontaient quatre modes parmi lesquels le bon n'était
  // pas, « Suivant » restait actif, et la personne cochait une voiture pour avancer — son « bus »
  // changeait de valeur sans qu'elle le sache (audit A2-5).
  //
  // **Lue sur la réponse à chaque rendu, et non recopiée au montage** (`v1-27` §12.20, 29/09/2026) :
  // un préremplissage arrivé après le montage laissait la liste repliée sur une réponse qu'elle
  // cachait. L'état ne garde que le geste — « Voir les autres modes », ou un choix fait pendant
  // qu'elle était ouverte —, sans quoi choisir « Train » sous un « Bus » prérempli la refermerait
  // sous le doigt.
  const [deplieeParUnGeste, setDeplieeParUnGeste] = useState(false);
  const showMore =
    deplieeParUnGeste || LEISURE_MODE_CHOICES_MORE.some((choice) => choice.modeId === answers.leisure_mode);
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
  // Voiture seul/covoiturage partagent le même `leisure_mode` ('voiture') : c'est
  // `leisure_is_carpool` qui distingue laquelle des deux rangées est cochée à l'écran — et donc
  // sous laquelle des deux la précision s'ouvre. Lue sur la réponse, comme la liste ci-dessus.
  const estChoisi = (choice: CommuteModeChoice) =>
    answers.leisure_mode === choice.modeId && answers.leisure_is_carpool === choice.carpool;
  // Où mène « Il manque encore … » (`v1-31` §2.5), dans l'ordre de l'écran : le mode — le titre ne se
  // marque pas —, puis ses précisions (`PrecisionMode`), puis la distance et, sous « Plus de 30 km »,
  // le champ de saisie, qui reçoit le focus lui-même.
  const { bloc: blocDuMode, cible: cibleDuMode } = useAncreDuChamp('leisure_mode');
  const modesAffiches = showMore
    ? [...LEISURE_MODE_CHOICES_PRIMARY, ...LEISURE_MODE_CHOICES_MORE]
    : LEISURE_MODE_CHOICES_PRIMARY;
  const cleCible = modesAffiches[optionCible(modesAffiches.map(estChoisi))].key;
  const {
    bloc: blocDeLaTranche,
    cible: cibleDeLaTranche,
    marque: trancheMarquee,
  } = useAncreDuChamp('leisure_distance_bracket');
  const iCibleDeLaTranche = optionCible(BRACKETS.map((b) => answers.leisure_distance_bracket === b.value));
  const {
    bloc: blocDeLaDistance,
    cible: cibleDeLaDistance,
    marque: distanceMarquee,
  } = useAncreDuChamp<TextInput>('leisure_distance_km', { saisie: true });

  // Ce que le choix ouvre, dans l'ordre de l'écran — rien pour un mode qui n'a pas de précision.
  const precisionsDuMode = (choice: CommuteModeChoice) =>
    [
      choice.modeId === 'voiture' && (
        <PrecisionMode
          key="motorisation"
          champ="leisure_car_engine"
          question="Quelle motorisation ?"
          options={CAR_ENGINE_OPTIONS}
          valeur={answers.leisure_car_engine}
          onChange={(value) => update({ leisure_car_engine: value })}
        />
      ),
      choice.modeId === 'deux_roues_motorise' && (
        <PrecisionMode
          key="deux-roues"
          champ="leisure_two_wheeler_type"
          question="Quel type de deux-roues ?"
          options={TWO_WHEELER_TYPE_OPTIONS}
          valeur={answers.leisure_two_wheeler_type}
          onChange={(value) => update({ leisure_two_wheeler_type: value })}
        />
      ),
      // C4.4 — les jumelles loisirs des deux révélations du quotidien. Elles sont posées ici plutôt
      // que déduites de B1 parce qu'on ne fait pas ses sorties comme son trajet : on peut aller au
      // travail en RER et en week-end en TER.
      choice.modeId === 'train' && (
        <PrecisionMode
          key="train"
          champ="leisure_train_type"
          question="Quel type de train ?"
          options={TRAIN_TYPE_OPTIONS}
          valeur={answers.leisure_train_type}
          onChange={(value) => update({ leisure_train_type: value })}
        />
      ),
      choice.modeId === 'velo' && (
        <PrecisionMode
          key="velo"
          champ="leisure_velo_type"
          question="Quel type de vélo ?"
          options={VELO_TYPE_OPTIONS}
          valeur={answers.leisure_velo_type}
          onChange={(value) => update({ leisure_velo_type: value })}
        />
      ),
      // C3.5 — après la motorisation, dans la même boîte : les deux précisions décrivent la même
      // voiture.
      choice.carpool && (
        <PrecisionChiffres
          key="personnes"
          champ="leisure_carpool_size"
          question="Vous êtes combien dans la voiture ?"
          options={TAILLES_DE_COVOITURAGE}
          valeur={answers.leisure_carpool_size}
          onChange={(value) => update({ leisure_carpool_size: value })}
        />
      ),
    ].filter(Boolean);

  // Une rangée de mode et ce qui s'ouvre sous elle — écrite une fois pour les deux blocs de la liste.
  const rendreLeMode = (choice: CommuteModeChoice) => {
    const selected = estChoisi(choice);
    const precisions = selected ? precisionsDuMode(choice) : [];
    return (
      <ChoixOuvrant key={choice.key}>
        {/* Deux références ne se disputent jamais la même rangée : la cible du mode est la rangée cochée
            ou la première, « Voiture (seul) », et quand la cochée est « Deux-roues motorisé », le mode
            ne manque pas — rien n'y mènera. */}
        <ModeListItem
          ref={
            choice.key === LEISURE_MODE_CHOICES_MORE[0].key
              ? premierDesAutres
              : choice.key === cleCible
                ? cibleDuMode
                : undefined
          }
          label={choice.label}
          selected={selected}
          onPress={() => {
            // Ouverte par la réponse, la seconde liste le reste après un choix, quel qu'il soit :
            // choisir « Train » sous un « Bus » prérempli la refermerait sinon sous le doigt.
            if (showMore) setDeplieeParUnGeste(true);
            // La motorisation, le type de deux-roues et la taille du covoiturage
            // rattachés au mode précédent sont effacés par `normaliserReponses`, pas
            // ici (audit A2-17).
            update({ leisure_mode: choice.modeId, leisure_is_carpool: choice.carpool });
          }}
        />

        {/* La précision s'ouvre sous l'élément qui la déclenche — cf. `precision-mode.tsx` pour la
            raison, qui n'est pas cosmétique. Une seule boîte par choix (`v1-31` §2.2), qui porte une
            question, ou deux pour le covoiturage. */}
        {precisions.length > 0 && <BoiteDePrecision>{precisions}</BoiteDePrecision>}
      </ChoixOuvrant>
    );
  };

  return (
    <View style={styles.container}>
      {/* **Le lien de secours suit la liste des modes, avant la question de la distance** (01/10/2026, `v1-33`,
          Q-8). Il était posé tout en bas, après les tranches, séparé des modes par un filet et un second
          titre : il se lisait comme portant sur la distance. À 8 sous « Voir les autres modes » — ou sous le
          dernier mode, une fois la liste ouverte —, comme sous la liste de B1.4 ; **hors** du bloc où mène
          « Il manque encore … », qui ne doit montrer que la question. */}
      <View style={styles.modes}>
        <View ref={blocDuMode} style={styles.block}>
          <TitreDEtape>{QUESTION_MODE}</TitreDEtape>
          {/* Le groupe ne porte que les modes et leurs précisions — chacune son propre groupe, posé
              dedans sous le mode qu'elle décrit (`GroupeDeChoix`). « Voir les autres modes » le suit
              sans y entrer : c'est une commande, pas une option, et il ne se rattache à aucune
              ligne. Le premier mode révélé arrive à sa place, **8 px plus bas** : le lien suit la liste à
              8, le bloc révélé à 16, l'écart entre deux familles (handoff `v1-31`, D4 — mesuré sur
              l'export, 398 pour le lien, 406 pour « Deux-roues motorisé »). */}
          <View style={styles.list}>
            {/* **Trois familles, sans intertitre** (29/09/2026, `v1-31`, décision 2), comme la liste du
                trajet : 4 px dans une famille, 16 entre deux. */}
            <GroupeDeChoix question={QUESTION_MODE} style={styles.familles}>
              {enFamilles(LEISURE_MODE_CHOICES_PRIMARY, (choice) => choice.modeId).map((famille) => (
                <View key={FAMILLE_DU_MODE[famille[0].modeId]} style={styles.famille}>
                  {famille.map(rendreLeMode)}
                </View>
              ))}
              {/* « Voir les autres modes » ajoute ses cinq modes **en un bloc sous les quatre premiers**,
                  rangé par famille lui aussi, et ne les intercale pas dans la première liste : le
                  premier révélé reste à la place du lien, et reçoit le focus. Le bloc s'ouvre ; ce qui est
                  là à l'arrivée de l'étape, non (`SansApparitionAuMontage`, posé par `StepShell`). */}
              {showMore && (
                <Depliage style={styles.familles}>
                  {enFamilles(LEISURE_MODE_CHOICES_MORE, (choice) => choice.modeId).map((famille) => (
                    <View key={FAMILLE_DU_MODE[famille[0].modeId]} style={styles.famille}>
                      {famille.map(rendreLeMode)}
                    </View>
                  ))}
                </Depliage>
              )}
            </GroupeDeChoix>
            {!showMore && (
              <TextLink
                label="Voir les autres modes"
                onPress={() => {
                  vientDeDeplier.current = true;
                  setDeplieeParUnGeste(true);
                }}
                type="linkPrimary"
              />
            )}
          </View>
        </View>
        <MissingModeLink context="B2.2 mode loisirs" />
      </View>

      <View style={[styles.separator, { backgroundColor: theme.border }]} />

      <View ref={blocDeLaTranche} style={styles.block}>
        <IntituleDuChamp type="subtitle" weight={600} style={TypeScale.question} marque={trancheMarquee}>
          {QUESTION_DISTANCE}
        </IntituleDuChamp>
        {/* Les tranches et la distance qu'ouvre « Plus de 30 km », enveloppées ensemble : le haut de
            la rangée est la borne que l'écran ne fait pas passer au-dessus du bord en remontant pour
            montrer le champ (`ChoixOuvrant`). */}
        <ChoixOuvrant style={styles.block}>
          <GroupeDeChoix question={QUESTION_DISTANCE} style={styles.chipsWrap}>
            {BRACKETS.map((bracket, i) => (
              <Chip
                key={bracket.value}
                ref={i === iCibleDeLaTranche ? cibleDeLaTranche : undefined}
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
            <Depliage suivieALOuverture>
              <View ref={blocDeLaDistance} style={styles.distanceLibre}>
                <IntituleDuChamp type="small" themeColor="textTertiary" marque={distanceMarquee}>
                  Environ combien, pour un aller ?
                </IntituleDuChamp>
                <NumericField
                  ref={cibleDeLaDistance}
                  value={answers.leisure_distance_km}
                  onChange={(value) => update({ leisure_distance_km: value })}
                  unit="km"
                  label="Distance d’un aller"
                />
              </View>
            </Depliage>
          )}
        </ChoixOuvrant>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.five },
  block: { gap: Spacing.three },
  // Les modes et le lien qui les complète : 8 entre les deux, comme sous la liste de B1.4.
  modes: { gap: Spacing.two },
  list: { gap: Spacing.two },
  familles: { gap: Spacing.three },
  famille: { gap: Spacing.one },
  separator: { height: 1 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  distanceLibre: { gap: Spacing.two },
});
