import type { ReactNode } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { IntituleDuChamp, useAncreDuChamp } from '@/components/bilan/ancre-du-champ';
import { BoiteDePrecision } from '@/components/bilan/boite-de-precision';
import { ChampDuPlafond } from '@/components/bilan/champ-du-plafond';
import { ChoixOuvrant } from '@/components/bilan/choix-ouvrant';
import { Chip } from '@/components/bilan/chip';
import { GroupeDeChoix } from '@/components/bilan/groupe-de-choix';
import { PrecisionChiffres } from '@/components/bilan/precision-chiffres';
import { PrecisionMode } from '@/components/bilan/precision-mode';
import { TitreDEtape } from '@/components/bilan/step-shell';
import { ThemedText } from '@/components/themed-text';
import { HYPOTHESES } from '@/constants/methodologie';
import { Radius, Spacing } from '@/constants/theme';
import { CAR_ENGINE_OPTIONS } from '@/constants/transport-modes';
import { formatKm } from '@/lib/format';
import { Depliage } from '@/lib/mouvement';
import {
  CHOIX_DE_COMPTE,
  OCCUPATIONS_LONG_TRAJET,
  PLAFOND_DE_COMPTE,
  type BilanAnswers,
  type ChampDuBilan,
  type CompteAPlafond,
} from '@/types/bilan';
import { optionCible } from '@/types/demande';

// Même plage que les vols (`CHOIX_DE_COMPTE`, `src/types/bilan.ts`) : l'écart à la spec §5 était
// que celle-ci s'arrêtait à 6, ce qui plafonnait les trajets longue distance d'un grand rouleur ou
// d'un habitué du train à un chiffre inférieur à la réalité — et dans le sens qui allège
// l'empreinte. Un re-bilan prérempli à « 6 » continue d'afficher 6 : rien ne se perd. Et depuis le
// 02/10/2026 (`v1-33` §6), « 10+ » ne plafonne plus : elle ouvre un champ (`ChampDuPlafond`).
const COUNT_CHOICES = CHOIX_DE_COMPTE;

/**
 * Dernière puce de la série, qui vaut « ce nombre ou plus » — dérivée de `COUNT_CHOICES` et
 * non écrite en dur, à deux endroits qui auraient divergé : le libellé visible (« 10+ ») et le
 * libellé accessible (« 10 trajets ou plus »). C'est ce qui a permis de porter la plage de 6 à
 * 10 sans rien retoucher ailleurs : une valeur recopiée aurait fait annoncer « 6 trajets ou
 * plus » sur une puce qui n'est plus le plafond.
 */
const MAX_TRAJETS = PLAFOND_DE_COMPTE;

/**
 * Ce qu'un lecteur d'écran entend sur la puce de plafond, là où l'œil lit « 10+ » (A2-9).
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

/**
 * Écrite une fois : le titre de l'étape et le nom du « Oui / Non » (`GroupeDeChoix`) — mot pour mot la
 * question de `v1-33` D1 (01/10/2026). Elle remplace « Et les trajets de plus de 300 km ? » et l'aide
 * « Sur une année type, hors avion. », qu'elle contient.
 */
const QUESTION_LONGS_TRAJETS = 'Hors avion, fais-tu des trajets de plus de 300 km sur une année type ?';

/**
 * L'intitulé affiché au-dessus de chaque série, et le nom de son groupe qui s'en dérive — les deux
 * écrits une fois (25/09/2026).
 *
 * **Le nom n'est pas l'intitulé, et c'est l'une des deux exceptions de `GroupeDeChoix`** : « En
 * train » ne se comprend qu'avec le titre de l'écran, or en navigation de contrôle en contrôle ou en
 * exploration tactile le groupe arrive seul. Il porte donc la forme complète, qui **contient**
 * l'intitulé : ce qu'on entend est ce qu'on lit, plus son contexte. Dérivé plutôt que recopié, pour
 * qu'un intitulé retouché ne laisse pas derrière lui un nom qui dit autre chose.
 */
const EN_TRAIN = 'En train';
const EN_AUTOCAR = 'En autocar';
const EN_VOITURE = 'En voiture';
const nomDeLaSerie = (intitule: string) => `Trajets longue distance ${intitule.toLowerCase()}`;

const OPTIONS_OCCUPATION = OCCUPATIONS_LONG_TRAJET.map((n) => ({
  value: n,
  label: n === PLAFOND_OCCUPATION ? `${n}+` : String(n),
  accessibilityLabel:
    n === PLAFOND_OCCUPATION ? `${n} personnes ou plus` : `${n} personne${n > 1 ? 's' : ''}`,
}));

// B3.3 / B3.4 — la dernière puce ouvre un champ, comme celle des vols (`v1-33` §6, 02/10/2026).
//
// Trois séries depuis C4.4, toutes trois rendues depuis `COUNT_CHOICES` : l'autocar a la même
// plage que le train et la voiture, parce que rien ne justifie qu'on plafonne plus bas le mode
// qu'on vient d'ouvrir — et un plafond propre à une série serait un second nombre à tenir.
//
// **Une question d'entrée depuis le 01/10/2026** (`v1-33` D1). Les trois séries arrivaient avec leur
// « 0 » coché et un « Suivant » vert : on traversait le poste sans un toucher, et un « 0 » qu'on n'a
// pas choisi sous-estime les voyages. « Oui / Non » d'abord — pour la majorité, l'étape passe de
// trente-trois cibles à deux —, et « Oui » ouvre les séries sans aucune puce cochée, comme le « Oui »
// du second mode ouvre « Lequel ? » (`ChoixOuvrant`, avec son défilement à l'ouverture). La réponse se
// dérive des compteurs, plus le « Oui » qu'ils ne savent pas dire : c'est l'écran du questionnaire qui
// la tient et qui l'écrit (`reponseAuxLongsTrajets`, `compteursApresLaReponse`), pour que
// `manqueDeLEtape` reste la seule source de ce qui manque.
export function LongTripsStep({
  answers,
  update,
  reponse,
  repondre,
  plafond,
  choisirLePlafond,
}: {
  answers: BilanAnswers;
  update: (patch: Partial<BilanAnswers>) => void;
  /** La réponse à la question d'entrée : `null` tant qu'elle n'est pas donnée. */
  reponse: boolean | null;
  /** « Oui » ou « Non » touché : les compteurs et le « Oui » que l'écran retient, ensemble. */
  repondre: (oui: boolean) => void;
  /** « 10+ » est-elle la réponse de cette série (`plafondChoisi`) ? */
  plafond: (compte: CompteAPlafond) => boolean;
  /** « 10+ » touché, ou une autre puce de la série : l'écran du questionnaire tient le drapeau. */
  choisirLePlafond: (compte: CompteAPlafond, choisi: boolean) => void;
}) {
  // Où mène « Il manque encore une réponse » (`v1-31` §2.5) : la question du titre, qui ne se marque
  // jamais (`seMarque`), et « Oui » ou la réponse déjà donnée.
  const { bloc: blocDeLaQuestion, cible: cibleDeLaQuestion } = useAncreDuChamp('fait_des_longs_trajets');
  const iCibleDeLaQuestion = optionCible([reponse === true, reponse === false]);
  // Et « le nombre de trajets », sous « Oui » : les trois séries, dont les intitulés se marquent — le
  // trajet qui manque peut venir de n'importe laquelle. Le focus va à la première, sur sa puce cochée.
  const {
    bloc: blocDesSeries,
    cible: cibleDesSeries,
    marque: seriesMarquees,
  } = useAncreDuChamp('nombre_de_longs_trajets');
  const iCibleDesSeries = optionCible(
    COUNT_CHOICES.map((n) =>
      n === MAX_TRAJETS
        ? plafond('train_long_trips_per_year')
        : !plafond('train_long_trips_per_year') && answers.train_long_trips_per_year === n
    )
  );
  // Ce que touche une puce d'une série, et ce que saisit son champ — le même chemin pour les trois.
  // « 10+ » ouvre le champ vide, sauf sur un nombre déjà au-delà, qu'on garde.
  const choisir = (compte: CompteAPlafond, n: number, patch: Partial<BilanAnswers> = {}) => {
    if (n === MAX_TRAJETS) {
      const dejaAuDela = plafond(compte);
      choisirLePlafond(compte, true);
      if (!dejaAuDela) update({ [compte]: null, ...patch });
      return;
    }
    choisirLePlafond(compte, false);
    update({ [compte]: n, ...patch });
  };

  return (
    <View style={styles.container}>
      <View ref={blocDeLaQuestion} style={styles.block}>
        <TitreDEtape>{QUESTION_LONGS_TRAJETS}</TitreDEtape>
        {/* **Un aller, comme un vol** (01/10/2026, `v1-33` D2) : le calcul compte 800 km par trajet en
            train et 700 en voiture ou en autocar, une fois — un aller. L'écran des vols le disait
            (« Un aller-retour compte pour deux vols. »), celui-ci non : un Paris–Lyon aller-retour se
            déclarait 1, et le calcul n'en voyait que la moitié. */}
        <ThemedText type="small" themeColor="textTertiary">
          Un aller-retour compte pour deux trajets.
        </ThemedText>
        {/* Le « Oui » et ce qu'il ouvre, enveloppés ensemble : le haut du groupe est la borne que
            l'écran ne fait pas passer au-dessus du bord en remontant pour montrer les séries. La forme
            est celle du second mode — des puces cernées côte à côte, `Radius.field` —, parce que
            « Oui » y ouvre aussi ce qui suit (`Chip.prompt.md`). */}
        <ChoixOuvrant>
          <GroupeDeChoix question={QUESTION_LONGS_TRAJETS} style={styles.row}>
            <Chip
              ref={iCibleDeLaQuestion === 0 ? cibleDeLaQuestion : undefined}
              label="Oui"
              role="radio"
              selected={reponse === true}
              onPress={() => repondre(true)}
              flex
              radius={Radius.field}
              selectedStyle="outline"
            />
            <Chip
              ref={iCibleDeLaQuestion === 1 ? cibleDeLaQuestion : undefined}
              label="Non"
              role="radio"
              selected={reponse === false}
              onPress={() => repondre(false)}
              flex
              radius={Radius.field}
              selectedStyle="outline"
            />
          </GroupeDeChoix>
          {/* L'écart qui sépare les séries du « Oui / Non » est **dans** le dépli (`style`) : il s'ouvre
              avec elles, au lieu d'apparaître d'un coup au-dessus — la règle de `BoiteDePrecision`. */}
          {reponse === true && (
            <Depliage suivieALOuverture style={styles.depli}>
              <View ref={blocDesSeries} style={styles.series}>
                <SerieDeTrajets
                  intitule={EN_TRAIN}
                  marqueDeLIntitule={seriesMarquees}
                  champ="trajets_en_train"
                  valeur={answers.train_long_trips_per_year}
                  plafond={plafond('train_long_trips_per_year')}
                  saisir={(valeur) => update({ train_long_trips_per_year: valeur })}
                >
                  {/* Le groupe ferme la série, et **c'est son nom qui la distingue, pas son rôle** (A2-9) :
                      les séries de l'étape sont rigoureusement identiques — la même rangée, de « 0 » au
                      plafond, rendue depuis la même liste — et l'intitulé qui les qualifie est un frère
                      dans l'arbre, pas un libellé rattaché. En lecture séquentielle il précède bien le
                      groupe, mais en navigation de contrôle en contrôle ou en exploration tactile plus
                      rien ne disait dans lequel on se trouve. Nommer le groupe le dit une fois ; le
                      répéter sur chaque puce le dirait autant de fois qu'il y en a — un nombre qu'on ne
                      recopie pas ici, la plage étant déjà passée de 6 à 10 sans que cette phrase le
                      suive. Même motif que `ChoixDeRappel`, et même composant depuis le 25/09/2026 : les
                      trois séries posaient leur rôle elles-mêmes.

                      **En pilule, comme les nombres de vols** (01/10/2026, `v1-33`, Q-12) : deux séries
                      de nombres du même poste, d'un écran à l'autre, prennent la même forme — le défaut
                      de `Chip`. Elles étaient à `Radius.chip`, le rayon des jours. */}
                  <GroupeDeChoix question={nomDeLaSerie(EN_TRAIN)} style={styles.chipsWrap}>
                    {COUNT_CHOICES.map((n, i) => (
                      <Chip
                        key={n}
                        ref={i === iCibleDesSeries ? cibleDesSeries : undefined}
                        label={n === MAX_TRAJETS ? `${MAX_TRAJETS}+` : String(n)}
                        accessibilityLabel={n === MAX_TRAJETS ? LIBELLE_PLAFOND : undefined}
                        role="radio"
                        selected={estChoisie(n, answers.train_long_trips_per_year, plafond('train_long_trips_per_year'))}
                        onPress={() => choisir('train_long_trips_per_year', n)}
                      />
                    ))}
                  </GroupeDeChoix>
                </SerieDeTrajets>

                {/* C4.4 — le troisième compteur, entre les deux modes collectifs et la voiture. B3.4 ne
                    proposait que l'avion, le train et la voiture, donc un Paris-Lyon en car était
                    compté comme s'il n'avait pas eu lieu.

                    **Il n'a pas de question de suivi**, et c'est ce qui le distingue de la voiture juste
                    en dessous : la personne ne choisit ni la motorisation ni le remplissage d'un
                    autocar — ce n'est pas son véhicule, donc il n'y a rien à lui demander de plus.

                    Ce que ce compteur ne raconte pas, c'est une histoire flatteuse : l'autocar émet
                    0,037560 kg/km, soit **plus qu'un TER** et douze fois un TGV. C'est précisément pour
                    ça qu'il fallait le poser. */}
                <SerieDeTrajets
                  intitule={EN_AUTOCAR}
                  marqueDeLIntitule={seriesMarquees}
                  champ="trajets_en_autocar"
                  valeur={answers.coach_long_trips_per_year}
                  plafond={plafond('coach_long_trips_per_year')}
                  saisir={(valeur) => update({ coach_long_trips_per_year: valeur })}
                >
                  <GroupeDeChoix question={nomDeLaSerie(EN_AUTOCAR)} style={styles.chipsWrap}>
                    {COUNT_CHOICES.map((n) => (
                      <Chip
                        key={n}
                        label={n === MAX_TRAJETS ? `${MAX_TRAJETS}+` : String(n)}
                        accessibilityLabel={n === MAX_TRAJETS ? LIBELLE_PLAFOND : undefined}
                        role="radio"
                        selected={estChoisie(n, answers.coach_long_trips_per_year, plafond('coach_long_trips_per_year'))}
                        onPress={() => choisir('coach_long_trips_per_year', n)}
                      />
                    ))}
                  </GroupeDeChoix>
                </SerieDeTrajets>

                {/* Les deux précisions de la voiture suivent le groupe sans y entrer, à la différence de
                    celles d'un mode : elles dépendent d'un **compte** non nul, pas d'une option — il n'y
                    a pas de puce sous laquelle les ranger. La série, son champ et sa boîte sont enveloppés
                    ensemble (`SerieDeTrajets`), pour que la boîte s'ouvre à 8 sous les puces comme sous un
                    mode, et non à l'écart de l'intitulé — et le haut de la série est la borne que l'écran
                    ne fait pas passer au-dessus du bord quand il remonte pour montrer la boîte
                    (`ChoixOuvrant` : le plus proche l'emporte sur celui du « Oui »).

                    **Sous « 10+ », la boîte attend le nombre** : elle tient à un compte non nul, et
                    `normaliserReponses` efface ses deux réponses sous un compte vide. Toucher « 10+ » après
                    trois trajets, ou vider le champ pour le retaper, les fait donc reposer — un effacement
                    qui ne vit que là, la règle de `FRONT-QUESTIONNAIRE.md` §2.6. */}
                <SerieDeTrajets
                  intitule={EN_VOITURE}
                  marqueDeLIntitule={seriesMarquees}
                  champ="trajets_en_voiture"
                  valeur={answers.car_long_trips_per_year}
                  plafond={plafond('car_long_trips_per_year')}
                  saisir={(valeur) => update({ car_long_trips_per_year: valeur })}
                  apres={
                    /* La précision s'ouvre sous les puces qui la déclenchent — cf. `precision-mode.tsx`.
                       **Une seule boîte pour les deux** (`v1-31` §2.2) : elles décrivent la même voiture.

                       C3.5 — le calcul supposait « seul » sur 700 km, sans jamais le demander, alors que
                       c'est le trajet qu'on partage le plus : partir à trois divise l'empreinte par
                       trois. La question suit la motorisation parce qu'elle décrit la même voiture, et
                       elle apparaît sous la même condition — déclarer des longs trajets en voiture,
                       c'est en déclarer deux choses. */
                    (answers.car_long_trips_per_year ?? 0) > 0 && (
                      <BoiteDePrecision>
                        <PrecisionMode
                          champ="car_long_trips_engine"
                          question="Quelle motorisation ?"
                          options={CAR_ENGINE_OPTIONS}
                          valeur={answers.car_long_trips_engine}
                          onChange={(value) => update({ car_long_trips_engine: value })}
                        />
                        <PrecisionChiffres
                          champ="car_long_trips_occupancy"
                          question="Vous êtes combien dans la voiture ?"
                          options={OPTIONS_OCCUPATION}
                          valeur={answers.car_long_trips_occupancy}
                          onChange={(value) => update({ car_long_trips_occupancy: value })}
                        />
                      </BoiteDePrecision>
                    )
                  }
                >
                  <GroupeDeChoix question={nomDeLaSerie(EN_VOITURE)} style={styles.chipsWrap}>
                    {COUNT_CHOICES.map((n) => (
                      <Chip
                        key={n}
                        label={n === MAX_TRAJETS ? `${MAX_TRAJETS}+` : String(n)}
                        accessibilityLabel={n === MAX_TRAJETS ? LIBELLE_PLAFOND : undefined}
                        role="radio"
                        selected={estChoisie(n, answers.car_long_trips_per_year, plafond('car_long_trips_per_year'))}
                        onPress={() =>
                          choisir('car_long_trips_per_year', n, {
                            car_long_trips_engine: n > 0 ? answers.car_long_trips_engine : null,
                          })
                        }
                      />
                    ))}
                  </GroupeDeChoix>
                </SerieDeTrajets>
              </View>
            </Depliage>
          )}
        </ChoixOuvrant>
      </View>

      {/* En Spline Sans et non plus en chasse fixe (24/09/2026, décision n° 10) : une phrase adressée à
          la personne, comme la ligne jumelle des vols — d'où sa majuscule.

          **Interpolée depuis `HYPOTHESES` depuis le 27/09/2026** : elle était écrite à la main, donc
          hors du contrôle qui compare ces valeurs au calcul, et la distance de l'autocar n'existait
          nulle part côté client. L'autocar et la voiture partagent un nombre ; le contrôle tombe
          s'ils divergent, pour que la phrase soit réécrite.

          **Rendue sous « Oui » comme sous « Non »**, comme sa jumelle sous le nombre de vols : elle dit
          ce que compte un trajet, ce qui sert à répondre à la question autant qu'aux séries. */}
      <ThemedText type="small" themeColor="textTertiary">
        Distances moyennes par défaut · {formatKm(HYPOTHESES.trainLongKm)} train,{' '}
        {formatKm(HYPOTHESES.autocarLongKm)} autocar et voiture
      </ThemedText>
    </View>
  );
}

/**
 * La puce de rang `n` est-elle cochée ? « 10+ » quand c'est la réponse de la série (`plafondChoisi`) ;
 * une autre puce quand c'est son nombre, et que « 10+ » ne l'est pas — un « 5 » tapé dans le champ de
 * « 10+ » ne coche pas la puce « 5 » : c'est encore le champ qui répond.
 */
function estChoisie(n: number, valeur: number | null, plafond: boolean): boolean {
  return n === MAX_TRAJETS ? plafond : !plafond && valeur === n;
}

/**
 * Une série des longs trajets : son intitulé, ses puces, le champ qu'ouvre « 10+ », et ce qui suit (la
 * boîte de la voiture) — enveloppés dans un `ChoixOuvrant`, dont le haut est la borne du défilement à
 * l'ouverture du champ comme de la boîte. Le champ a son ancre, à lui (`trajets_en_train`…) : « Il
 * manque encore le nombre de trajets en train » y mène, et marque l'intitulé du champ, pas celui de la
 * série.
 */
function SerieDeTrajets({
  intitule,
  marqueDeLIntitule,
  champ,
  valeur,
  plafond,
  saisir,
  apres,
  children,
}: {
  intitule: string;
  marqueDeLIntitule: boolean;
  champ: ChampDuBilan;
  valeur: number | null;
  plafond: boolean;
  saisir: (valeur: number | null) => void;
  apres?: ReactNode;
  /** Les puces de la série. */
  children: ReactNode;
}) {
  const { bloc, cible, marque } = useAncreDuChamp<TextInput>(champ, { saisie: true });
  return (
    <View style={styles.field}>
      <IntituleDuChamp type="small" themeColor="textTertiary" marque={marqueDeLIntitule}>
        {intitule}
      </IntituleDuChamp>
      <ChoixOuvrant>
        {children}
        {plafond && (
          <ChampDuPlafond
            refDuBloc={bloc}
            refDuChamp={cible}
            marque={marque}
            valeur={valeur}
            onChange={saisir}
            unite="trajets"
            label={`Nombre de trajets ${intitule.toLowerCase()} sur une année`}
          />
        )}
        {apres}
      </ChoixOuvrant>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.five },
  // 16 entre le titre, l'aide et le « Oui / Non » : l'écart de l'étape du second mode.
  block: { gap: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.two },
  // 32 sous le « Oui / Non », puis entre deux séries : l'écart qui séparait les séries quand elles
  // étaient toujours là.
  depli: { marginTop: Spacing.five },
  series: { gap: Spacing.five },
  field: { gap: Spacing.two + 2 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
