import { router, useFocusEffect, useLocalSearchParams, useScrollToTop } from 'expo-router';
import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { CheckinCard, type EngagementCheckin } from '@/components/checkin-card';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { RAMILLE } from '@/constants/mascotte';
import { donnerLeFocus } from '@/lib/focus';
import { useRafraichirAuRetour } from '@/hooks/use-rafraichir-au-retour';
import { useReprendreLEngagement } from '@/hooks/use-reprendre-l-engagement';
import { usePassageDEngagement } from './_layout';
import { useTrackFocus } from '@/hooks/use-track-focus';
import { track } from '@/lib/analytics';
import { CarteDePiste, type PisteDuPlan } from '@/components/plan/carte-de-piste';
import { BanniereDeRelecture } from '@/components/plan/banniere-de-relecture';
import { CarteDOuverture } from '@/components/plan/carte-douverture';
import { CarteDuCap } from '@/components/plan/carte-du-cap';
import {
  CarteDAttente,
  CarteDeFelicitation,
  CarteDuRebilan,
  EncartDeContexte,
} from '@/components/plan/cartes-du-plan';
import {
  EncartDeLOrphelin,
  EncartDuCycleRevolu,
  EncartDuRattachement,
} from '@/components/plan/encarts-de-fait';
import { PlanSansPlan, type EtatSansPlan } from '@/components/plan/plan-sans-plan';
import { FeuilleRappels } from '@/components/plan/feuille-rappels';
import {
  cadreDuPlan,
  capDuCycle,
  cartesDuPlan,
  defilementVersLaCarte,
  felicitationDuPlanSansAction,
  motsDuContexte,
  orphelinAAnnoncer,
  phraseDesPistesSuffisantes,
  pistesDuPlan,
  type IntentionTiming,
  type ReponsesDeContexte,
} from '@/types/plan';
import { daysSince, regimeDeRebilan, titreDuRebilan } from '@/types/suivi';
import type { LoopType } from '@/constants/postes';
import {
  aVuLouvertureDeSaison,
  marquerLouvertureDeSaisonVue,
} from '@/lib/saison-prefs';
import { aVuLePremierPlan, marquerLePremierPlanVu } from '@/lib/premier-parcours';
import {
  etatDuPremierParcours,
  ouvertureDesDeuxLieux,
  SORTIE_DES_DEUX_LIEUX,
} from '@/types/premier-parcours';
import { usePremierParcours } from '@/app/(tabs)/_layout';
import {
  cadenceNommeUneSaison,
  estDansLouverture,
  estPremierPlan,
  finDePeriodeEnMots,
  kilosDeLaPeriodeEnMots,
  ouvertureDeSaison,
  ouvertureDuPremierPlan,
  periodeRevolue,
  pointDeSaison,
  progressionDeLaPeriode,
  SORTIE_COMPRIS,
  sortiesDeLouverture,
  type ContenuDOuverture,
} from '@/types/saison';
import {
  aVuEngagementOrphelin,
  aVuRattachementAnnonce,
  marquerEngagementOrphelinVu,
  marquerRattachementAnnonce,
  vientDUneReconnexion,
} from '@/lib/connexion-prefs';
import { lireEtatDuRattachement } from '@/lib/compte';
import {
  aDejaProposeLaVeille,
  aDejaVuLaFeuilleDeRappel,
  lireLaFenetreDuMotDeLaVeille,
  type ReminderPrefs,
} from '@/lib/notification-prefs';
import { lectureDuPlan } from '@/lib/lecture-du-plan';
import { Depliage, SansApparitionAuMontage } from '@/lib/mouvement';
import { lirePermission } from '@/lib/rappels';
import { supabase } from '@/lib/supabase';
import { mesurerDansLaFenetre } from '@/lib/defilement';
import { defilementPourMontrer } from '@/types/mouvement';
import {
  genreDeLEchec,
  genreDesEchecs,
  type GenreDEchec,
} from '@/types/lecture-en-echec';
import {
  accentDesPoints,
  historiqueParBoucle,
  lePlusRecentParBoucle,
  type PointRepondu,
  type ReponseDuPoint,
} from '@/types/checkin';
import { avecLesGestes, type GesteSurLePoint } from '@/types/kilos-evites';
import {
  boucleAVenir,
  boucleDeLAction,
  carteAttente,
  laBoucleDuPointTourne,
  laVeilleSeRepropose,
  lireLesBouclesAVenir,
  ouvertureDeLaFeuille,
  type CanalPrefere,
  type EngagementPris,
  type OuvertureDeLaFeuille,
  type Permission,
  type ReponseALaVeille,
} from '@/types/rappels';


type PlanCycle = {
  id: string;
  period_label: string;
  /** Le premier jour de la période : la fenêtre d'ouverture et le trait de temps en partent (C2.8). */
  period_start: string;
  /**
   * La fin de la période. Lue d'abord pour dire qu'un cycle est révolu plutôt que le montrer à jour
   * (C2.2), puis affichée telle quelle par la carte du cap depuis C2.8 — elle était écrite à chaque
   * génération et lue par aucun écran, donc le cap était annoncé sans échéance (constat A8-8).
   */
  period_end: string;
  /**
   * `season` | `rolling_quarter`, snapshoté à la génération. Ce qui décide si la période a un nom de
   * saison : un trimestre glissant peut parfaitement commencer un 1er décembre sans être l'hiver.
   */
  cadence_type: string;
  trip_label: string;
  /** `commute` | `leisure` | `travel`, snapshoté à la génération (C2.6). */
  poste: string | null;
  baseline_co2_kg_year: number | null;
  target_reduction_pct: number;
  plan_actions: PisteDuPlan[];
};

/**
 * L'engagement qu'un re-bilan a emporté (C2.2), lu dans `plan_action_commitments_archive`.
 *
 * Le plan le dit **une fois** : c'est une nouvelle, pas un état. La marque d'annonce vit en
 * AsyncStorage et porte l'identifiant de la ligne, pour qu'un second re-bilan puisse le dire à
 * son tour.
 */
type EngagementOrphelin = {
  id: string;
  action_template_id: string;
  plan_cycle_id: string | null;
  action_text: string;
  released_reason: string;
};

/**
 * Par quel chemin ce compte a-t-il été rattaché ? Lu sur les **identités** de la session, jamais
 * déduit de la présence d'une adresse : Google en fournit une aussi, et prendre « email » par
 * défaut rangerait tous les comptes Google du mauvais côté. Sert à ne pas compter deux fois un
 * rattachement Google, que `/connexion` émet déjà au retour de `linkIdentity()`.
 *
 * `null` quand la lecture échoue : une méthode inventée fausserait la seule comparaison que
 * `connexion_success` permet, donc on préfère ne rien compter et réessayer au passage suivant.
 */
async function methodeDuRattachement(): Promise<'google' | 'email' | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return (data.user.identities ?? []).some((identite) => identite.provider === 'google')
    ? 'google'
    : 'email';
}

type LoadState =
  // Les quatre états sans plan à montrer — la lecture qui tourne, pas de bilan, rien de lu, le plan
  // pas encore généré —, et ce que chacun veut dire : `PlanSansPlan` (étape 7b de `v1-35`).
  | EtatSansPlan
  | {
      status: 'ok';
      cycle: PlanCycle;
      assessmentId: string;
      /**
       * Les réponses du contexte B4, pour l'encart (C5.5).
       *
       * Dans le **même** `LoadState` que le reste, sans drapeau d'échec à elle : la règle de C1.4
       * est qu'une lecture qui échoue rend `{ ok: false }`, jamais une valeur par défaut. Un encart
       * qui afficherait « zone : — » sur une coupure réseau serait un mensonge sur les données de
       * la personne, et un quatrième état à tenir en phase serait un état de trop.
       */
      contexte: ReponsesDeContexte | null;
      /** Date du dernier bilan complété — sert la proposition de re-bilan. */
      assessmentDate: string | null;
      checkins: EngagementCheckin[];
      /**
       * Les points déjà répondus des périodes récentes, par boucle et hors carte affichée (C2.10).
       * Sert au seul second renforcement ; la fenêtre de lecture est bornée par la requête.
       */
      historique: Record<EngagementCheckin['loop_type'], PointRepondu[]>;
      /**
       * Tous les points de la fenêtre lue, affichés ou non (étape 6a de `v1-35`) : le total des kilos
       * évités de la saison les additionne. La fenêtre couvre le cycle affiché en entier — elle part au
       * plus tard du début du cycle précédent (`fenetreDesPoints`).
       */
      points: EngagementCheckin[];
      /**
       * Les bornes et la cadence du cycle précédent, lues sur sa ligne, ou `null` (étape 6a de `v1-35`).
       * Le récapitulatif de la carte d'ouverture se recompose au rendu avec elles : la dernière semaine et
       * le dernier mois d'une saison sont interrogés dans la suivante, pendant que la carte est à l'écran,
       * et un « oui » donné là doit y compter sans attendre la relecture.
       */
      precedente: { debut: string; fin: string; cadence: string } | null;
      /**
       * Est-ce le tout premier plan de cette personne ? (C5.6, `estPremierPlan`.)
       *
       * **Dans le `LoadState` et non dans un état à part**, parce que c'est un fait lu en base au
       * même instant que le reste : le mettre à côté en ferait une valeur à tenir en phase avec le
       * cycle affiché. Il pilote **deux** choses qui ne se referment pas ensemble — la carte, qu'un
       * « Compris » suffit à retirer (marque locale), et le trait de temps, qui attend un
       * engagement parce qu'il n'a rien à mesurer avant — sauf sur un plan à zéro action, où il n'y
       * a rien à choisir (`cartesDuPlan`, `traitDeTemps`).
       */
      premierPlan: boolean;
    };

// B "Plan de réduction". Depuis l'étape 6a (v1-07 §3.3), chaque action porte son gain estimé,
// figé à la génération du cycle : `plan_actions.saving_kg_year` et `.saving_share_percent`.
// L'écran ne calcule donc rien — il affiche ce que `estimate_action_savings` a arrêté au
// moment du bilan, pour qu'un chiffre montré ne bouge pas sous les yeux de la personne au gré
// d'une mise à jour ADEME.
//
// Le cap de la saison (`target_reduction_pct`, -20 %) était stocké depuis l'increment 3 et
// lu par aucun écran (T10 de l'audit). Il est affiché ici, avec l'objectif qu'il implique.
//
// Deux formulations à ne pas durcir : le gain est une **estimation** déclarative fondée sur
// des moyennes ADEME, jamais une mesure ; et un plan sans action n'est pas un échec mais le
// signe que la personne fait déjà l'essentiel — l'état correspondant la félicite au lieu de
// lui présenter une liste vide.
/**
 * Le repli quand la lecture du contexte n'a rien rendu : quatre `null`, donc zéro segment, donc
 * pas d'encart. Nommé plutôt qu'écrit en littéral : il a été lu à deux endroits du rendu, et deux
 * littéraux finissent par différer. Il n'est plus lu qu'une fois depuis `cartesDuPlan` (les mots du
 * contexte sont calculés avant le rendu), et le nom reste — un littéral de quatre `null` au milieu
 * du composant dirait moins bien ce qu'il est.
 */
const VIDE_DE_CONTEXTE: ReponsesDeContexte = {
  zone_type: null,
  tc_access: null,
  household_vehicles: null,
  teletravail: null,
};

/**
 * **La carte des deux lieux, et l'instant où elle est vue : rendue, l'écran au premier plan** (décision
 * du 01/10/2026, `v1-33` §6). Un composant à part pour que l'instant soit le sien — son montage —, et
 * par `useFocusEffect` plutôt qu'un effet de montage : une relecture au retour de l'app peut la rendre
 * sur un plan resté derrière un autre onglet, et ce n'est pas une carte vue. Le focus suivant la
 * notera. `onRendue` doit être stable : l'effet de focus se réabonne à chaque identité nouvelle.
 */
function CarteDesDeuxLieux({
  onRendue,
  ...carte
}: ComponentProps<typeof CarteDOuverture> & { onRendue: () => void }) {
  useFocusEffect(onRendue);
  return <CarteDOuverture {...carte} />;
}

export default function Plan() {
  // **Émis au focus et non au montage** : dans une barre d'onglets, react-navigation garde
  // l'écran monté quand on passe à l'autre. Avec `useTrackView`, l'événement ne partirait
  // qu'à la première ouverture de la session — et le taux de retour, qui est la question
  // même que la navigation pose, deviendrait invisible (v1-11 §2, piège relevé au plan).
  useTrackFocus('plan_view');

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  /**
   * Les réponses données sur les cartes de cet écran depuis sa dernière lecture (étape 6a de `v1-35`).
   * Le total de la saison les compte tant que la ligne relue ne les a pas rattrapées — la règle de la
   * carte, dans `avecLesGestes`. Elles ne se vident pas : un geste dont la ligne a été relue ne
   * s'applique plus de lui-même.
   */
  const [gestes, setGestes] = useState<Record<string, GesteSurLePoint>>({});
  const noterLeGeste = useCallback((point: EngagementCheckin, reponse: ReponseDuPoint) => {
    setGestes((avant) => ({ ...avant, [point.id]: { reponse, ligneAvant: point.responded_at } }));
  }, []);
  // **Hors du `LoadState`, et pas par commodité** : la dernière relecture peut échouer
  // au-dessus de n'importe quel écran issu d'une lecture réussie — le plan, mais aussi
  // « en préparation » et « pas encore de bilan ». Porté par la variante `ok` seule, le drapeau
  // obligeait le repli à écraser les deux autres, qui perdaient alors leurs sorties : « Revoir
  // mon bilan » depuis `pending`, et « Faire mon bilan » depuis `no_assessment` — le
  // questionnaire, lui, se remplit très bien hors ligne (brouillon AsyncStorage).
  //
  // **Le genre de l'échec, ou `null`** (D19, 01/10/2026) : la ligne ne parle de connexion qu'à qui n'a
  // pas de réseau — une réponse du serveur en échec dit seulement que ce qu'on voit peut avoir changé.
  const [relectureEnEchec, setRelectureEnEchec] = useState<GenreDEchec | null>(null);

  /**
   * Le refus qui demande une relecture, remonté à l'écran plutôt que gardé dans la carte : le
   * remplacement refusé (`RM001`) et, depuis le 04/10/2026, le plan qui a changé entre-temps
   * (`P0002`) — à l'engagement comme au retrait. L'état garde son nom d'origine.
   *
   * **Logé ici pour la même raison que la ligne de relecture**, et parce que le message était
   * invisible : `commitPisteDuPlan` rend `rechargerLePlan`, la carte appelait `onChanged()` dans la
   * foulée, donc le plan était relu et les cartes remontées — l'état local qui portait la phrase
   * disparaissait au rendu suivant. Personne ne lisait donc jamais pourquoi son choix n'avait pas
   * été enregistré ; le plan changeait simplement sous ses yeux (relevé le 14/09/2026). (Ce
   * commentaire disait encore qu'on dépliait « Voir d'autres pistes » en même temps : le plan n'a
   * plus que deux cartes depuis C5.2, et rien à déplier.)
   */
  const [refusDeRemplacement, setRefusDeRemplacement] = useState<string | null>(null);
  // Recharge après un engagement : le RPC libère aussi l'action précédente, donc l'état à
  // jour ne se déduit pas de l'action qu'on vient de toucher — il faut relire le cycle.
  const [refreshKey, setRefreshKey] = useState(0);
  const rafraichir = useCallback(() => setRefreshKey((cle) => cle + 1), []);
  // Le premier chargement de l'écran, le seul qui reprenne la lecture préchargée au lancement (`v1-33`
  // T-12) : un rafraîchissement, une relance ou « Je m'y engage » relisent la base.
  const premierChargement = useRef(true);

  // **Le plan est la destination du rappel, il doit donc être à jour quand on y arrive.**
  // Sans ça il ne se chargeait qu'une fois par lancement : appuyer sur une notification avec
  // l'app en arrière-plan ramenait sur un plan sans la question qui venait de s'ouvrir — la
  // promesse rompue à l'endroit exact où elle se tient (09/09/2026, vérifié sur appareil).
  useRafraichirAuRetour(rafraichir);

  const passage = usePassageDEngagement();
  // Annonce du rattachement : `null` tant qu'on ne sait pas, une adresse (ou la chaîne vide
  // quand Google ne la remonte pas) quand il y a quelque chose à dire.
  const [rattachement, setRattachement] = useState<string | null>(null);
  // Les rappels : ce que la carte d'attente affiche, et ce que la feuille présélectionne.
  // `null` tant qu'on ne sait pas — mieux vaut ne rien dire qu'annoncer un canal faux.
  const [rappels, setRappels] = useState<ReminderPrefs | null>(null);
  // Les boucles qui tournent, `null` tant qu'on ne sait pas : elles viennent du serveur
  // (`mes_boucles_a_venir`), et une valeur par défaut nommerait le mauvais rythme — ou promettrait un
  // point à qui n'a aucune boucle (cf. le chargement). Trois textes en dépendent : la carte
  // d'attente, la carte des deux lieux et le pied d'un point répondu (`v1-27` §12.22 et §12.23).
  const [boucles, setBoucles] = useState<LoopType[] | null>(null);
  // Le total du bilan courant, pour la seule phrase du plan qui l'affirme : la félicitation du
  // résiduel des sorties rares dit « sous le repère 2050 » (`felicitationDuPlanSansAction`). Lu dans
  // `assessment_results`, avec le bilan (étape 7b de `v1-35`) ; `null` tant qu'on ne sait pas, et quand
  // le bilan n'en a pas — la phrase retombe alors sur celle qui n'affirme rien.
  const [totalDuBilan, setTotalDuBilan] = useState<number | null>(null);
  const [permission, setPermission] = useState<Permission>('fermee');
  /**
   * L'engagement qu'un re-bilan a emporté, tant qu'il n'a pas été annoncé sur cet appareil (C2.2).
   *
   * Logé **à côté** du `LoadState` et jamais dans sa variante `ok`, comme la ligne de relecture :
   * un drapeau dans `LoadState.ok` détruirait `pending`, `no_assessment` et `empty` — donc
   * « Revoir mon bilan » et « Faire mon bilan » — au premier repli.
   */
  const [orphelin, setOrphelin] = useState<EngagementOrphelin | null>(null);
  /**
   * La carte d'ouverture de saison, tant qu'elle n'a pas été vue sur cet appareil (C2.8).
   *
   * Logée **à côté** du `LoadState` pour la même raison que `orphelin` et la ligne de relecture : un
   * drapeau dans sa variante `ok` détruirait `pending`, `no_assessment` et l'écran de rappel au
   * premier repli, donc « Revoir mon bilan » et « Faire mon bilan ».
   */
  const [ouverture, setOuverture] = useState<ContenuDOuverture | null>(null);
  /**
   * La carte « Ton premier plan », tant qu'elle n'a pas été refermée sur cet appareil (C5.6).
   *
   * Même logement et même raison que `ouverture` juste au-dessus — et les deux ne peuvent pas
   * coexister : la carte de saison demande un cycle précédent, celle-ci demande qu'il n'y en ait
   * pas. C'est aussi ce qui permet aux deux de remplacer la même chose, la carte d'attente, sans
   * jamais se disputer la place.
   */
  const [cartePremierPlan, setCartePremierPlan] = useState<ContenuDOuverture | null>(null);
  /**
   * Le premier parcours, détenu par le layout des onglets parce que c'est lui qui rend la barre
   * (C5.7). L'écran y fait **deux** choses : il signale que la carte du premier plan s'est refermée,
   * et il rend la carte qui nomme la barre au moment où elle arrive.
   */
  const premierParcours = usePremierParcours();
  const { laBarreArrive, lesDeuxLieuxSontVus } = premierParcours;
  /**
   * **La carte des deux lieux, vue une fois puis partie** (décision du 01/10/2026, `v1-33` §6). Elle
   * passe à `fait` à l'instant où elle se rend, l'écran au premier plan (`CarteDesDeuxLieux`, plus bas) ;
   * ce drapeau la retient **le temps de la visite**, pour qu'elle ne disparaisse pas sous les yeux de
   * qui la lit, et retombe quand l'écran perd le focus — elle ne revient alors ni au focus suivant ni
   * au lancement suivant. Une visite et non une marque : rien ne la stocke, et la marque garde ses trois
   * états (`PLAN.md` §4).
   */
  const [deuxLieuxDansLaVisite, setDeuxLieuxDansLaVisite] = useState(false);
  useFocusEffect(useCallback(() => () => setDeuxLieuxDansLaVisite(false), []));
  const lesDeuxLieuxSeRendent = useCallback(() => {
    setDeuxLieuxDansLaVisite(true);
    lesDeuxLieuxSontVus();
  }, [lesDeuxLieuxSontVus]);
  const refermerLesDeuxLieux = useCallback(() => {
    setDeuxLieuxDansLaVisite(false);
    lesDeuxLieuxSontVus();
  }, [lesDeuxLieuxSontVus]);
  const { carteDesDeuxLieux } = etatDuPremierParcours(premierParcours.etape, deuxLieuxDansLaVisite);
  /**
   * Le lien du rappel porte `?rappel=1` (C2.11). Il ne sert qu'à l'état sans bilan : quand il y a un
   * plan à montrer, il n'y a rien à expliquer — la personne est au bon endroit.
   */
  const { rappel } = useLocalSearchParams<{ rappel?: string }>();
  const vientDUnRappel = rappel === '1';
  /**
   * L'étape où s'ouvre la feuille des rappels — le choix du canal, la seule question de la veille
   * (C4.2), ou le compte (web, sans adresse, `v1-35` étape 4) —, `null` quand elle est fermée. Décidée par `ouvertureDeLaFeuille`, jamais ici.
   */
  const [ouvertureDeFeuille, setOuvertureDeFeuille] = useState<OuvertureDeLaFeuille | null>(null);
  /**
   * Le poste de l'action qu'on vient d'engager, pour la feuille et pour elle seule.
   *
   * **Il ne se confond pas avec les boucles lues** (`boucles`, recette du 14/09/2026) : elles
   * répondent à « quel est le prochain contact, quel qu'en soit le sujet » et se dérivent de la
   * personne ; la feuille, elle,
   * promet un contact *sur cette action-là*. Quelqu'un qui a un trajet domicile-travail et
   * s'engage sur un vol s'entendait promettre le lundi, alors que le point du lundi s'apparie sur
   * le poste `commute` (C2.1) et ne lui demandera jamais rien sur son vol.
   */
  const [posteEngage, setPosteEngage] = useState<string | null>(null);
  /** Son échéance, pour la même feuille : « Le mois prochain » lui fait nommer un autre mois (D14). */
  const [echeanceEngagee, setEcheanceEngagee] = useState<IntentionTiming | null>(null);

  // Appelée quand un engagement vient d'être pris — y compris « Choisir celle-ci à la place », qui
  // en prend un —, jamais quand on le libère. La feuille entière ne s'ouvre qu'une fois par appareil :
  // c'est une cérémonie pour la première fois, pas un péage à chaque action. **Sur le web sans adresse,
  // c'est la petite feuille du compte qui s'ouvre à sa place** (`ouvertureDeLaFeuille`, 23/10/2026) :
  // `rappels` porte l'adresse (`email`) que la dérivation lit, et la marque est la même. Et depuis C4.2 elle peut
  // rouvrir sur la seule question de la veille, une fois aussi, au premier engagement de trajet où
  // elle peut être posée — le cas de qui a choisi un vol d'abord (`ouvertureDeLaFeuille`).
  // **Elle ne s'ouvre que sur un plan au premier plan** : la réouverture attend une lecture réseau
  // (la fenêtre), et une feuille — un `Modal` — ouverte après que la personne a changé d'onglet
  // apparaîtrait ailleurs (contre-lecture de C4.2). Rien n'est marqué vu tant qu'elle ne s'affiche
  // pas, donc un engagement suivant la reproposera.
  // **Stable, et ce n'est pas du confort** : l'effet de focus qui reprend l'engagement des pistes
  // la porte en dépendance, donc une fonction recréée à chaque rendu ferait se réabonner cet effet
  // à chaque rendu. C'est la règle déjà écrite pour `useRafraichirAuRetour` — un rappel instable
  // fait tourner chargement et rendu l'un dans l'autre.
  const auPremierPlan = useRef(false);
  useFocusEffect(
    useCallback(() => {
      auPremierPlan.current = true;
      return () => {
        auPremierPlan.current = false;
      };
    }, [])
  );
  const proposerLesRappels = useCallback(async ({ poste, echeance }: EngagementPris) => {
    if (!rappels) return;
    setPosteEngage(poste);
    setEcheanceEngagee(echeance);
    const [feuilleDejaVue, veilleDejaProposee] = await Promise.all([
      aDejaVuLaFeuilleDeRappel(),
      aDejaProposeLaVeille(),
    ]);
    const etat = {
      ...rappels,
      plateforme: Platform.OS === 'web' ? ('web' as const) : ('natif' as const),
      poste,
      feuilleDejaVue,
      veilleDejaProposee,
      reponse: rappels.reponseALaVeille,
    };
    // La fenêtre n'est lue que si elle peut changer quelque chose : une économie d'appel, et rien de
    // plus — la dérivation repose toutes les conditions.
    const fenetre = laVeilleSeRepropose(etat) ? await lireLaFenetreDuMotDeLaVeille() : null;
    const ouverture = ouvertureDeLaFeuille({ ...etat, fenetre });
    if (ouverture === null || !auPremierPlan.current) return;
    // `rappels_view` compte les vues du choix du canal : ni la seule question de la veille, ni la feuille
    // du compte (le web sans adresse, 23/10/2026) n'en sont une, et les compter gonflerait l'entonnoir
    // qu'il mesure. La réponse à la veille est en base (`profiles.mot_de_la_veille`) ; la feuille du
    // compte ne se compte pas, faute d'événement — il demanderait une migration (`MESURE.md`) —, et sa
    // porte se lit à `connexion_view`, provenance `rappels`.
    if (ouverture.etape === 'canal') track('rappels_view');
    setOuvertureDeFeuille(ouverture);
  }, [rappels]);
  /**
   * Reprendre l'engagement pris sur l'écran des pistes (C5.2, `v1-17` §7.3).
   *
   * **Sans attendre le rechargement, et c'est le point.** Brancher l'ouverture de la feuille
   * derrière la résolution du `Promise.all` ferait qu'une coupure réseau au retour coûte la
   * cérémonie — et comme elle ne s'ouvre qu'une fois par appareil, la coûte **définitivement**.
   * C'est le défaut corrigé le 14/09/2026, atteint par un autre chemin. Les données et la
   * cérémonie sont deux choses indépendantes.
   *
   * **Mais pas avant la première lecture des préférences** : sur une pile neuve — les pistes
   * rechargées, puis `revenirOu('/plan')` —, le plan se monte à neuf et son premier focus précède
   * toute lecture. Le drapeau y attend donc `rappels`, sans être consommé (contre-lecture du
   * 28/09/2026) ; le détail, et le fait qu'il ne se consomme qu'une fois, dans le hook.
   */
  useReprendreLEngagement(passage.reprendre, rappels !== null, proposerLesRappels);

  // ── Le geste d'engagement, jusqu'au bout (audit P-1 et P-2, 01/10/2026) ───────────────────────
  //
  // Trois défauts cumulés au geste le plus important du produit. Le sélecteur se refermait avant la
  // relecture, donc « Je m'y engage » revenait sous les yeux (corrigé dans `ActionCommitment`, qui
  // attend la lecture suivante : `lecturesTerminees`). « C'est noté » s'ouvrait sous la barre
  // d'onglets, sans que l'écran défile, quand la liste, elle, défile (HANDOFF du canvas `v1-30`,
  // B2). Et la relecture déplaçait la carte engagée hors de la fenêtre — au premier plan, le cap
  // repasse devant les pistes —, le focus tombant sur le document.

  /**
   * Les lectures de l'écran **terminées** — réussies ou non, jamais une lecture qu'une plus récente a
   * remplacée. `ActionCommitment` la lit pour savoir quand refermer un engagement pris ici, l'effet
   * plus bas pour savoir quand montrer la carte engagée.
   */
  const [lecturesTerminees, setLecturesTerminees] = useState(0);
  /**
   * **Une relance demandée répond sous le doigt** (audit P-8, 01/10/2026). « Réessayer » de la ligne
   * de relecture, « Réessayer » de l'état en préparation et « Voir la saison » n'appelaient que
   * `rafraichir`, qui n'incrémente qu'une clé : rien ne changeait à l'écran pendant la lecture, et
   * rien après si elle échouait encore ou ne trouvait rien de neuf — le bouton qui a l'air mort que
   * `reessayerDepuisLErreur` corrige pour l'écran d'erreur. Le contrôle touché reste inactif, et
   * l'annonce `aria-busy` sur web, jusqu'à la fin de la lecture : le `finally` du chargement le
   * relâche, quelle que soit l'issue. Sans phrase neuve, et sans repasser par « Chargement… », que
   * `rafraichir` évite exprès (il ferait clignoter l'écran à chaque retour au premier plan).
   */
  const [relectureDemandee, setRelectureDemandee] = useState(false);
  const relire = useCallback(() => {
    setRelectureDemandee(true);
    rafraichir();
  }, [rafraichir]);

  /**
   * Le défilement de la plateforme, posé sous « réduire les animations » (`FRONT-MOUVEMENT.md`
   * §2.12) : `scrollTo` animé ne consulte pas la préférence sur web, où react-native-web le traduit
   * en `behavior: 'smooth'`. Rien n'attend sa fin, qui ne s'annonce pas sur web, et le focus part
   * avant lui.
   */
  const animationsReduites = useReducedMotion();
  const defilement = useRef<ScrollView>(null);
  const position = useRef(0);
  const surDefilement = useCallback((evenement: NativeSyntheticEvent<NativeScrollEvent>) => {
    position.current = evenement.nativeEvent.contentOffset.y;
  }, []);

  /**
   * **Toucher l'onglet du plan, déjà là, remonte en haut** (audit T-14, 01/10/2026) — le geste de
   * toute barre d'onglets, sur Android comme sur iOS, et le plan dépasse trois écrans quand un point
   * attend. `useScrollToTop` ne remonte que si l'onglet est à la racine de sa pile, et seulement si
   * son toucher n'a pas été retenu : c'est le layout des onglets qui ne le retient plus dans ce cas
   * (`toucherDOnglet`, `src/types/plan.ts`).
   *
   * **Par un relais, et non par la `ScrollView` elle-même** : `useScrollToTop` appelle
   * `scrollTo({ y: 0, animated: true })` en dur, donc remonterait en glissant sous « réduire les
   * animations ». Le relais porte la seule méthode qu'il appelle en priorité, `scrollToTop`, et la
   * pose sous la préférence.
   */
  const versLeHaut = useMemo(
    () => ({
      current: {
        scrollToTop: () => defilement.current?.scrollTo({ y: 0, animated: !animationsReduites }),
      },
    }),
    [animationsReduites]
  );
  useScrollToTop(versLeHaut);

  /** Les cartes d'action, et le bloc qui annonce chacune, par identifiant de piste. */
  const cartes = useRef(new Map<string, View>());
  const blocs = useRef(new Map<string, View>());
  const inscrireCarte = useCallback((id: string, noeud: View | null) => {
    if (noeud) cartes.current.set(id, noeud);
    else cartes.current.delete(id);
  }, []);
  const inscrireBloc = useCallback((id: string, noeud: View | null) => {
    if (noeud) blocs.current.set(id, noeud);
    else blocs.current.delete(id);
  }, []);

  /**
   * Amener une carte dans la fenêtre — **juste assez**, jamais au point de faire passer son titre sous
   * la bande. Deux cas, deux dérivations testées :
   *  - **à l'ouverture du sélecteur** (`defilementPourMontrer`, la règle de la liste) : la carte
   *    grandit vers le bas sous le doigt, on la fait monter jusqu'à « C'est noté », jamais redescendre ;
   *  - **quand elle a changé de place sans geste sur elle** (`defilementVersLaCarte`) — après la
   *    relecture d'un engagement, ou la carte de saison refermée par « Choisir une action » (D16) : on
   *    l'amène où qu'elle soit, y compris vers le haut.
   * Les mesures se prennent dans la fenêtre de défilement, comme sur la liste : l'ancrage du défilement
   * de Chrome compense ce qui change de taille au-dessus, et une position dans la page bougerait sans
   * que rien ne bouge à l'œil (`TESTING-GARDES.md` §2.14).
   */
  const amenerDansLaFenetre = useCallback(
    (id: string, cas: 'ouverture' | 'deplacee') => {
      const carte = cartes.current.get(id);
      // La fenêtre de défilement elle-même — le nœud qui défile, et non l'instance du composant.
      const ecran = defilement.current?.getNativeScrollRef();
      if (!carte || !ecran) return;
      // La marge et la mesure sont communes avec la liste des pistes (`src/lib/defilement.ts`).
      mesurerDansLaFenetre(ecran, carte, (mesure) => {
        const aDefiler = cas === 'ouverture' ? defilementPourMontrer(mesure) : defilementVersLaCarte(mesure);
        if (aDefiler === 0) return;
        defilement.current?.scrollTo({
          y: Math.max(0, position.current + aDefiler),
          animated: !animationsReduites,
        });
      });
    },
    [animationsReduites]
  );

  /**
   * **« C'est noté » ne s'ouvre plus sous la barre d'onglets** (audit P-2). Le sélecteur s'ouvre d'un
   * coup — rien ne grandit ici, à la différence de la liste —, donc la carte a sa hauteur pleine à la
   * mise en page qui suit le toucher : c'est elle qu'on attend (`onLayout` de son cadre), une fois, pour
   * la carte qui vient de s'ouvrir. Le focus, lui, est déjà parti au geste, sur la question
   * (`ActionCommitment`) : `donnerLeFocus` ne défile pas, et laisse le défilement à qui l'a lancé.
   */
  const aMontrerALOuverture = useRef<string | null>(null);
  const carteMiseEnPage = useCallback(
    (id: string) => {
      if (aMontrerALOuverture.current !== id) return;
      aMontrerALOuverture.current = null;
      amenerDansLaFenetre(id, 'ouverture');
    },
    [amenerDansLaFenetre]
  );

  /**
   * **La carte engagée se montre après la relecture, une fois** (audit P-1). Trois temps :
   *  - `engagementAMontrer` est posé **au geste** — « C'est noté » sur cet écran (`surEngagement`,
   *    et `surModification` depuis D15), ou le retour de la liste après un choix
   *    (`passage.aMontrer`, lu au focus sans attendre les préférences) ;
   *  - la lecture qui suit le consomme dans son `finally`, réussie ou non, et seulement si elle a lu
   *    un plan pose `carteEngageeAMontrer` : un engagement ne déplace l'écran qu'une fois, jamais à
   *    chaque retour sur le plan, et jamais sur la foi d'une lecture en échec ;
   *  - l'effet qui suit son rendu amène la carte dans la fenêtre et lui donne le focus.
   *
   * **Le focus part avec le rendu qui retire « C'est noté »** — c'est le moment exact. Le geste l'a
   * laissé sur le bouton, inactif mais focalisé pendant l'aller-retour réseau ; la relecture remplace
   * le sélecteur par la carte engagée, et sans ceci le focus tombait sur le document. Il ne peut pas
   * partir plus tôt : avant la relecture, le bloc n'annonce pas encore « Action engagée ». Et il
   * n'attend aucune animation : il part **avant** le défilement, qu'il ne fait pas lui-même
   * (`preventScroll`), comme la réplique du point après sa réponse (`CheckinCard`).
   *
   * **Il ne vole pas celui de la feuille des rappels** : sur natif, elle peut s'ouvrir juste après le
   * premier engagement. Ouverte, elle garde le focus ; il revient à la carte quand elle se referme.
   */
  const engagementAMontrer = useRef(false);
  const carteEngageeAMontrer = useRef(false);
  const focusApresLaFeuille = useRef(false);
  const surEngagement = useCallback(
    (engagement: EngagementPris) => {
      engagementAMontrer.current = true;
      void proposerLesRappels(engagement);
    },
    [proposerLesRappels]
  );
  // Une intention modifiée (`v1-33` D15) se montre comme un engagement — la carte relue reçoit le
  // focus et annonce la nouvelle intention —, sans la feuille des rappels, qui n'a rien de neuf à
  // proposer.
  const surModification = useCallback(() => {
    engagementAMontrer.current = true;
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (passage.aMontrer()) engagementAMontrer.current = true;
    }, [passage])
  );
  const idEngage =
    state.status === 'ok'
      ? (state.cycle.plan_actions.find((action) => action.committed_at !== null)?.id ?? null)
      : null;
  useEffect(() => {
    if (!carteEngageeAMontrer.current) return;
    carteEngageeAMontrer.current = false;
    if (idEngage === null) return;
    amenerDansLaFenetre(idEngage, 'deplacee');
    if (ouvertureDeFeuille !== null) {
      focusApresLaFeuille.current = true;
      return;
    }
    donnerLeFocus(blocs.current.get(idEngage));
  }, [lecturesTerminees, idEngage, ouvertureDeFeuille, amenerDansLaFenetre]);
  useEffect(() => {
    if (ouvertureDeFeuille !== null || !focusApresLaFeuille.current) return;
    focusApresLaFeuille.current = false;
    if (idEngage !== null) donnerLeFocus(blocs.current.get(idEngage));
  }, [ouvertureDeFeuille, idEngage]);

  /**
   * **La première piste, amenée quand « Choisir une action » referme la carte de saison** (D16 de
   * `v1-33`, 01/10/2026 ; audit P-14). Posée au geste (`refermerLouverture`), consommée par l'effet qui
   * suit le rendu où la carte n'est plus : la mesure se prend sur la mise en page d'après — la carte
   * d'action a remonté de la hauteur de la carte refermée, et la carte d'attente a pu se rendre
   * au-dessus d'elle. Par la dérivation de la carte engagée relue, et pour la même raison : elle a
   * changé de place sans geste sur elle (`defilementVersLaCarte`, qui achève `defilementPourMontrer`).
   * Le défilement de la plateforme, posé sous « réduire les animations » ; le focus est déjà parti, au
   * geste.
   */
  const premiereAMontrer = useRef<string | null>(null);
  useEffect(() => {
    const id = premiereAMontrer.current;
    if (id === null || ouverture !== null) return;
    premiereAMontrer.current = null;
    amenerDansLaFenetre(id, 'deplacee');
  }, [ouverture, amenerDansLaFenetre]);

  // **La confirmation passe par la boîte de réception** : la personne y lit son code, le tape, et
  // arrive ici avec `is_anonymous` passé à `false`. Rien ne le lui disait (issue #62) — la boucle
  // ouverte par l'écran des e-mails ne se refermait nulle part. (C'était un lien à cliquer jusqu'au
  // 20/09/2026 ; le rattachement se terminait alors hors de l'app, ce qui rendait cette annonce
  // encore plus nécessaire — elle reste, puisque le code se tape sur un écran qui mène droit ici.)
  // On l'annonce une seule fois : c'est une nouvelle, pas un état permanent en tête du plan. Qui
  // veut le revoir le trouve sur « Toi ».
  //
  // **C'est aussi le seul endroit qui peut constater un rattachement par email, donc c'est ici
  // que part `connexion_success`** (v1-13 C1.2). L'écran email l'émettait juste après
  // `updateUser({ email })`, où rien n'est encore rattaché : `etatDuRattachement` classe cet
  // instant en `a_confirmer`, et `is_anonymous` ne bascule qu'au clic du lien. Il n'y porte plus
  // que `connexion_demande`, l'intention — l'écart entre les demandes `flux = rattachement` et ces
  // succès est le taux de codes jamais saisis, c'est-à-dire le chiffre cherché (`MESURE.md` §1).
  //
  // Trois précautions qui font que ce chiffre veut dire quelque chose — la troisième, une reconnexion
  // qui ne se compte pas, est écrite au point d'émission ci-dessous (`v1-27` §12.28) :
  //
  // — **Google n'est émis ici que sur web**, où l'écran de connexion ne peut pas le faire : sa
  //   redirection plein écran emporte la page avant la ligne suivante, et le retour d'OAuth
  //   atterrit ici sans repasser par lui. Sur natif, `/connexion` constate la session liée dans le
  //   geste même et l'émet là-bas ; le compter une seconde fois doublerait exactement la branche à
  //   laquelle on compare l'email. La méthode se lit donc sur les identités de la session, jamais
  //   sur la présence d'une adresse — Google en fournit une aussi.
  // — **L'émission partage la marque d'annonce, et ce n'est pas un raccourci.** Sans garde,
  //   l'événement repartirait à chaque passage sur le plan et ne compterait plus des
  //   rattachements mais des ouvertures d'onglet par quelqu'un de connecté : le taux de
  //   conversion, seule chose que cet événement sert à lire, deviendrait un ratio de fréquence
  //   d'usage. La marque est écrite dans la même foulée que l'annonce, donc « déjà annoncé »
  //   vaut « déjà compté ».
  //
  // `refreshKey` en dépendance, et pas un tableau vide : le retour de la messagerie est
  // exactement le cas d'un écran d'onglet que react-navigation garde monté (v1-12 §8.1). Avec
  // `[]`, la bascule survenue après le premier passage n'était vue qu'au lancement suivant —
  // l'annonce arrivait en retard et l'événement avec elle. La marque empêche le doublon.
  useEffect(() => {
    let annule = false;

    (async () => {
      if (await aVuRattachementAnnonce()) return;
      const etat = await lireEtatDuRattachement().catch(() => null);
      if (annule || etat?.kind !== 'rattache') return;
      const methode = await methodeDuRattachement().catch(() => null);
      if (annule) return;
      setRattachement(etat.email ?? '');
      // Méthode indéterminée : on n'écrit ni l'événement ni la marque — le passage suivant
      // reprendra les deux, et l'annonce ci-dessus est déjà à l'écran en attendant.
      if (methode === null) return;
      // **Sur web, Google se compte ici aussi, et c'est la seule façon de le compter.**
      // `/connexion` l'émet au retour de `linkIdentity()` — mais sur web cet appel déclenche une
      // redirection plein écran et rend la main avant elle : la ligne de mesure partait pendant
      // le déchargement du document et n'arrivait jamais, et le retour d'OAuth atterrit
      // directement ici sans repasser par l'écran de connexion (A6-20). Le rattachement Google
      // sur web n'était donc jamais compté, ce qui se lit comme une conversion plus faible sur
      // web que sur natif, sans cause visible. Sur natif, l'écran de connexion constate la
      // session liée dans le geste même : le compter une seconde fois doublerait exactement la
      // branche à laquelle on compare l'email.
      //
      // **Et une reconnexion ne se compte pas** (`v1-27` §12.28, 02/10/2026) : elle arrive ici dans
      // le même état qu'un rattachement — un compte permanent, une annonce jamais faite sur cet
      // appareil —, mais le compte l'était déjà. L'annonce, elle, reste : elle dit vrai.
      const reconnexion = await vientDUneReconnexion();
      // La garde d'annulation après chaque attente, comme plus haut : un effet relancé pendant cette
      // lecture compterait le même rattachement deux fois.
      if (annule) return;
      if ((methode === 'email' || Platform.OS === 'web') && !reconnexion) {
        track('connexion_success', { method: methode });
      }
      await marquerRattachementAnnonce();
    })();

    return () => {
      annule = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;

    // **Une lecture qui échoue n'est ni « pas de bilan » ni « plan en préparation ».** Les deux
    // replis disaient la même chose à quelqu'un dans le métro : que ses données n'existent pas.
    //
    // Un écran déjà rempli n'est jamais remplacé par l'erreur : ce qu'il montre reste vrai,
    // seulement plus tout à fait à jour. Ce chargement tourne à chaque retour au premier plan
    // (`useRafraichirAuRetour`), et le plan est la destination du rappel — le remplacer par un
    // écran d'erreur à chaque ouverture hors ligne coûterait plus que la ligne qui le dit.
    //
    // **Le genre se calcule une fois** (D19, `FRONT.md` §2.11) : dans `lireLePlan`, sur le statut de la
    // lecture qui a échoué — `0` quand elle n'a pas eu de réponse —, et ici `serveur` quand rien ne le
    // dit, une promesse qui lève par exemple (`src/types/lecture-en-echec.ts` dit pourquoi ce repli est
    // le bon).
    const echecDeLecture = (genre: GenreDEchec) => {
      if (cancelled) return;
      setRelectureEnEchec(genre);
      // `pending` et `no_assessment` sont dérivés d'une lecture **réussie** au même titre que
      // `ok` : seul `loading` n'a jamais rien su, et c'est le seul que l'écran d'erreur plein
      // écran remplace.
      setState((precedent) =>
        precedent.status === 'loading' ? { status: 'erreur_reseau', genre } : precedent
      );
    };

    // Le plan a-t-il été lu ? Seule une lecture qui a rendu un cycle peut montrer une carte engagée
    // (`carteEngageeAMontrer`, plus haut) — un échec, un « pas de bilan » ou un « en préparation » n'en
    // ont pas.
    let planLu = false;

    (async () => {
      try {
        // **La lecture vit dans `lireLePlan`** (`src/lib/lecture-du-plan.ts`, `v1-33` T-12), avec l'ordre de
        // ses décisions (P-9) : la racine la lance pendant l'écran de lancement, et le **premier**
        // chargement de l'écran la reprend au lieu de la refaire. Une lecture que l'écran ajoute se place
        // là-bas, jamais ici — ici, elle repartirait après le plancher, et le gain fondrait.
        const reprendre = premierChargement.current;
        premierChargement.current = false;
        const lecture = await lectureDuPlan({ reprendre, annulee: () => cancelled });

        if (cancelled || lecture.genre === 'annulee') return;

        if (lecture.genre === 'echec') {
          echecDeLecture(lecture.echec);
          return;
        }

        // Une lecture qui aboutit efface la ligne de relecture, y compris sur les deux sorties
        // anticipées : sans ça, elle survivrait à l'échec précédent au-dessus d'un écran pourtant à jour.
        if (lecture.genre === 'sans_bilan') {
          setState({ status: 'no_assessment' });
          setRelectureEnEchec(null);
          return;
        }

        if (lecture.genre === 'en_preparation') {
          setState({ status: 'pending', assessmentId: lecture.assessmentId });
          setRelectureEnEchec(null);
          return;
        }

        const {
          assessment,
          cycle,
          cyclePrecedent,
          checkins,
          resultat,
          bouclesAVenir,
          erreurBoucle,
          statutDesBoucles,
          contexte,
          orphelins,
          engagementsArchives,
          prefs,
          etatPermission,
        } = lecture;

        // **Les boucles ne se devinent pas sur un échec de lecture.** Le repli n'est jamais neutre :
        // `mensuel` nommait « le 1er du mois » à quelqu'un dont le point s'ouvre le lundi, et
        // « aucune » tairait un point qui viendra. On préfère ne pas les deviner — `boucles` garde la
        // dernière liste lue, et reste `null` si aucune ne l'a été : ni carte d'attente ni carte des
        // deux lieux, et un point répondu garde son rendez-vous (`laBoucleDuPointTourne`) —, plutôt
        // que de remplacer tout le plan par un écran d'erreur pour une lecture secondaire. La ligne
        // de relecture dit que l'écran n'est pas tout à fait à jour. Une réponse inconnue se lit de
        // même (`lireLesBouclesAVenir`).
        // Une réponse illisible est un échec de lecture comme un autre : elle ne remplace pas la
        // dernière liste lue, et allume la ligne de relecture plus bas, plutôt que de se taire.
        const bouclesLues = erreurBoucle ? null : lireLesBouclesAVenir(bouclesAVenir);
        if (bouclesLues !== null) setBoucles(bouclesLues);
        setTotalDuBilan(resultat?.total_co2_kg_year ?? null);
        // **Une lecture des rappels qui n'a rien rendu ne remplace pas la dernière** (relevé par le
        // chantier B le 01/10/2026, effet de bord de T-6) : `loadReminderPrefs` rend `null` quand il n'a
        // rien lu, et le poser ici effaçait la dernière lecture réussie — la carte d'attente, qui la
        // demande, disparaissait sans que la ligne de relecture s'allume. La règle des boucles, juste
        // au-dessus, et de `FRONT.md` §1.2 : on garde ce qu'on savait, et la ligne dit que l'écran date.
        if (prefs !== null) setRappels(prefs);
        setPermission(etatPermission);

        // **Sauf si l'action est revenue dans le plan, ou si la perte date d'un autre cycle**
        // (recette du 01/10/2026, décisions #312) — `orphelinAAnnoncer`, apparié sur le gabarit.
        const orphelin = orphelinAAnnoncer(orphelins?.[0] ?? null, {
          cycle: cycle.id,
          gabarits: cycle.plan_actions.map((action) => action.action_template_id),
        });

        const points = (checkins as EngagementCheckin[] | null) ?? [];
        const affiches = lePlusRecentParBoucle(points);

        // **La carte d'ouverture, trois conditions et une marque locale** (C2.8). Il faut une
        // période écoulée (sinon « On repart » ne veut rien dire), être dans les deux premières
        // semaines du cycle, et que la carte n'ait pas déjà été refermée sur cet appareil. La marque
        // est locale comme la feuille des rappels : la carte ne vit que deux semaines, et un second
        // appareil peut la revoir.
        //
        // Calculée ici et non au rendu : le rendu tourne à chaque frappe d'état, et ce calcul lit
        // AsyncStorage. Le chargement, lui, repasse à chaque focus et à chaque retour au premier
        // plan (`useRafraichirAuRetour`), ce qui suffit largement pour une fenêtre de deux semaines.
        const aOuvrir =
          cyclePrecedent && estDansLouverture(cycle.period_start)
            ? ouvertureDeSaison({
                debutDuCycle: cycle.period_start,
                cadence: cycle.cadence_type,
                precedente: {
                  debut: cyclePrecedent.period_start,
                  fin: cyclePrecedent.period_end,
                  cadence: cyclePrecedent.cadence_type,
                },
                points: points.map(pointDeSaison),
              })
            : null;
        // **Le tout premier plan** (C5.6). Trois faits, tous lus dans cette même fournée : pas de
        // cycle avant celui-ci (l'écran en lit deux), aucune action engagée, aucune ligne dans
        // l'archive quelle qu'en soit la raison — la troisième étant la seule qui distingue un
        // arrivant de quelqu'un qui s'est déjà engagé puis a repris (« Changer d'avis », ou un
        // re-bilan dans la même période).
        //
        // **Un `count` nul veut dire « on n'a pas pu lire », pas « zéro »**, et c'est pourquoi il
        // se lit ici comme « cette personne s'est déjà engagée ». Le signal pilote deux choses, et
        // les deux erreurs ne coûtent pas la même chose : se tromper vers la carte réexplique la
        // règle du jeu à quelqu'un qui la connaît, se tromper vers le trait le **retire** au milieu
        // d'une saison pour une coupure réseau. On préfère la lecture qui ne retire rien, et la
        // lecture suivante rétablit la carte si elle avait lieu d'être.
        const premierPlan = estPremierPlan({
          aUnCyclePrecedent: cyclePrecedent !== null,
          aUnEngagement: cycle.plan_actions.some((action) => action.committed_at !== null),
          aDejaEngage: engagementsArchives === null || engagementsArchives > 0,
        });

        // La carte ne se rend pas sur un plan à zéro action — tout cycliste et tout profil
        // sédentaire depuis C2.5 : « Choisis-en une » y promettrait une liste vide, et c'est la
        // même règle que celle qui écarte la porte, l'encart et la note technique de cet écran-là.
        const carteDuPremierPlan =
          premierPlan && cycle.plan_actions.length > 0
            ? ouvertureDuPremierPlan({
                debutDuCycle: cycle.period_start,
                cadence: cycle.cadence_type,
              })
            : null;

        // **Les trois marques locales se lisent ensemble, et une seule garde d'annulation les
        // suit** (contre-lecture du lot 5, 17/09/2026). Chacune était lue par un `await` séparé
        // **après** le dernier `if (cancelled)`, donc les quatre écritures d'état qui s'ensuivent
        // pouvaient venir d'un chargement périmé — l'inverse exact de l'idiome que les deux onglets
        // partagent (« seul le dernier lancé écrit »). C2.8 l'avait introduit pour une carte, C5.5
        // et C5.6 l'ont élargi à quatre — dont un appel qui **écrit** (l'arrivée de la barre). Les
        // lire en parallèle est aussi ce qui coûte le moins : trois allers-retours de stockage
        // s'additionnaient.
        const [orphelinVu, ouvertureVue, premierPlanVu] = await Promise.all([
          orphelin ? aVuEngagementOrphelin(orphelin.id) : Promise.resolve(true),
          aVuLouvertureDeSaison(cycle.id),
          aVuLePremierPlan(),
        ]);

        if (cancelled) return;

        // L'encart n'apparaît que si la marque locale ne porte pas déjà cet identifiant. Une
        // lecture en échec laisse simplement `orphelin` à `null` : mieux vaut ne rien dire qu'une
        // nouvelle inventée.
        setOrphelin(orphelin && !orphelinVu ? orphelin : null);
        setOuverture(aOuvrir && !ouvertureVue ? aOuvrir : null);

        const premiereCarte = premierPlanVu ? null : carteDuPremierPlan;
        setCartePremierPlan(premiereCarte);

        // **La barre arrive quand la carte du premier plan n'a plus lieu d'être** (C5.7), et c'est
        // ici que trois chemins se rejoignent : le premier engagement (qui rend le signal faux), un
        // plan à zéro action (qui n'a jamais de carte), et une carte déjà refermée sur cet appareil.
        // Le quatrième, « Compris », est immédiat et vit dans son gestionnaire — attendre le
        // rechargement y ferait arriver la barre une seconde trop tard, après le geste qui la
        // demande.
        //
        // La transition est gardée à l'intérieur (`questionnaire` → `barre`) : sur un appareil qui
        // n'a pas commencé son parcours ici, cet appel ne fait rien.
        if (premiereCarte === null) laBarreArrive();

        setState({
          status: 'ok',
          cycle: cycle as PlanCycle,
          assessmentId: assessment.id,
          assessmentDate: assessment.submitted_at,
          contexte: contexte ?? null,
          checkins: affiches,
          historique: historiqueParBoucle(points, affiches),
          points,
          precedente: cyclePrecedent
            ? {
                debut: cyclePrecedent.period_start,
                fin: cyclePrecedent.period_end,
                cadence: cyclePrecedent.cadence_type,
              }
            : null,
          premierPlan,
        });
        planLu = true;
        // Écrit une seule fois, après le `setState` : le plan est à jour, sauf si l'une des deux
        // lectures secondaires ci-dessus a échoué — les boucles, sans lesquelles ni la carte d'attente
        // ni celle des deux lieux ne se montrent, ou les rappels, sans lesquels la carte d'attente ne se
        // montre pas. Le genre suit le statut de chacune ; une réponse illisible et des rappels qui
        // n'ont rien rendu ne disent pas de statut, et ne sont pas une coupure. (Le total du bilan en
        // était une troisième jusqu'à l'étape 7b de `v1-35` : il vient désormais avec le bilan, dont
        // l'échec arrête la lecture.)
        setRelectureEnEchec(
          genreDesEchecs([
            erreurBoucle ? genreDeLEchec(statutDesBoucles) : bouclesLues === null ? 'serveur' : null,
            prefs === null ? 'serveur' : null,
          ])
        );
      } catch {
        // Une promesse rejetée — `loadReminderPrefs` ou `lirePermission`, qui touchent un
        // module natif et ne rendent pas d'erreur mais lèvent — laissait l'écran sur
        // « Chargement de ton plan… » pour toujours : le même mensonge par omission, en plus
        // muet. Même leçon que la racine de l'app (07/09/2026). Rien n'y dit le réseau : le
        // transport de PostgREST rend ses coupures, il ne les lève pas.
        echecDeLecture('serveur');
      } finally {
        // **La fin d'une lecture, quelle que soit son issue** — jamais celle d'une lecture qu'une
        // plus récente a remplacée, qui n'écrit rien (« seul le dernier lancé écrit »). Une relance
        // demandée se relâche ici et nulle part ailleurs (audit P-8) : un `return` anticipé, un
        // échec ou une exception la laisseraient sinon inactive pour toujours. Et l'engagement pris
        // juste avant se montre à cette lecture-là, une fois (audit P-1).
        if (!cancelled) {
          setRelectureDemandee(false);
          carteEngageeAMontrer.current = engagementAMontrer.current && planLu;
          engagementAMontrer.current = false;
          setLecturesTerminees((lectures) => lectures + 1);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // `laBarreArrive` est stable (`useCallback` sans dépendance dans le layout des onglets) : sans
    // ça, la porter ici relancerait la lecture à chaque rendu.
  }, [refreshKey, laBarreArrive]);

  // À la fermeture, on met à jour l'état local plutôt que de relire la base : la carte
  // d'attente doit refléter le choix immédiatement, et le serveur a déjà été écrit.
  // Dérivée à chaque rendu plutôt que stockée : elle ne dépend que de l'état des rappels et
  // de la boucle, et un second état à tenir en phase serait un état de trop.
  // La permission part avec le reste (A4-15) : sans elle, la carte accusait les réglages du
  // téléphone dès qu'un jeton manquait, y compris quand l'enregistrement venait d'échouer pour
  // une autre raison. C'est un fait de l'appareil, déjà lu par le chargement ci-dessus.
  const attente =
    rappels && boucles
      ? carteAttente({
          ...rappels,
          boucle: boucleAVenir(boucles),
          permission,
          plateforme: Platform.OS === 'web' ? 'web' : 'natif',
        })
      : null;


  const fermerLaFeuille = (
    canal: CanalPrefere,
    jetonActif: boolean,
    reponseALaVeille: ReponseALaVeille | null
  ) => {
    setOuvertureDeFeuille(null);
    setRappels((p) => (p ? { ...p, prefere: canal, jetonActif, reponseALaVeille } : p));
    void lirePermission().then(setPermission);
  };

  // **Le seul retour visible du bouton de l'écran d'erreur.** `rafraichir` n'incrémente qu'une
  // clé : l'effet relit, échoue, et `echecDeLecture` laisse rigoureusement le même écran —
  // hors ligne, donc dans le seul cas où cet écran existe, le bouton a l'air mort. Repasser par
  // « Chargement… » dit que le geste a été pris — et **tout de suite** (`relance`) : la relecture
  // échoue bien sous le délai de la ligne, qui sinon ne se montrerait jamais.
  //
  // Et surtout pas dans `rafraichir` lui-même, qui est aussi le rappel de
  // `useRafraichirAuRetour` et celui de l'engagement : y remettre `loading` ferait clignoter
  // « Chargement de ton plan… » à chaque retour au premier plan, c'est-à-dire à chaque arrivée
  // par notification.
  const reessayerDepuisLErreur = () => {
    setState({ status: 'loading', relance: true });
    rafraichir();
  };

  const banniereRelecture = (centree = false) => (
    <BanniereDeRelecture
      relectureEnEchec={relectureEnEchec}
      refusDeRemplacement={refusDeRemplacement}
      relectureDemandee={relectureDemandee}
      onRelire={relire}
      centree={centree}
    />
  );

  if (state.status !== 'ok') {
    return (
      <PlanSansPlan
        etat={state}
        banniere={banniereRelecture(true)}
        vientDUnRappel={vientDUnRappel}
        relectureDemandee={relectureDemandee}
        onRelire={relire}
        onReessayer={reessayerDepuisLErreur}
      />
    );
  }

  const { cycle, assessmentId, assessmentDate, checkins, historique, points, precedente, premierPlan } = state;
  const actionsCount = cycle.plan_actions.length;
  // Lue avant les retours anticipés (`idEngage`) : l'effet qui montre la carte engagée la lit aussi.
  const committedActionId = idEngage;
  // Le libellé de l'action engagée, pour que la carte du point sache si sa question figée porte
  // encore sur elle (C2.1). `null` quand rien n'est engagé, ce qui est aussi un « plus la même ».
  const actionEngageeTexte =
    cycle.plan_actions.find((a) => a.committed_at !== null)?.action_templates?.action_text ?? null;
  // L'accent des points ouverts : la question de l'engagement d'abord, le poste dominant sinon.
  const accents = accentDesPoints(checkins, { libelleDuCycle: cycle.trip_label, actionEngagee: actionEngageeTexte });
  // **Deux cartes, et le compte de ce qui attend ailleurs** (C5.2). Le `limit 2` du serveur avait
  // disparu en C4.6 — l'estimateur rendait déjà toutes les actions au gain ≥ 5 kg/an, et le plan en
  // jetait le reste avant même de l'écrire (constat A13-18) — mais l'exhaustivité était revenue
  // s'entasser ici, jusqu'à onze cartes sous un « Replier » hors écran. Elle vit désormais sur
  // `plan/pistes`. La dérivation copie avant de trier : `sort` mute, et `cycle` vient du state.
  const pistes = pistesDuPlan(cycle.plan_actions);
  // **Les cartes qui s'excluent, décidées hors du rendu** (`v1-27` §4, 27/09/2026). Les règles qui
  // les séparaient vivaient en prose dans les commentaires ci-dessous, et deux fois une paire leur
  // avait échappé ; `cartesDuPlan` les épingle sur toutes les combinaisons d'états, et le rendu les
  // lit — et depuis le 01/10/2026 l'intro et le trait de temps (audit P-5). Le reste de l'écran —
  // cap, re-bilan, encarts de faits — garde ses propres dérivations, que `cartesDuPlan` nomme.
  const motsDeContexte = motsDuContexte(state.contexte ?? VIDE_DE_CONTEXTE);
  // **La carte des deux lieux ne décrit que ce que ce plan porte** (décision du 30/09/2026, `v1-27`
  // §12.23) : l'action, si le plan en a ; le point régulier, si une boucle tourne. Tant que les
  // boucles ne sont pas connues, elle ne se rend pas — comme la carte d'attente, et pour la même
  // raison. Sa marque ne bouge pas : elle se rendra à la relecture suivante.
  const deuxLieux =
    boucles !== null
      ? ouvertureDesDeuxLieux({ actions: actionsCount > 0, boucle: boucles.length > 0 })
      : null;
  const affichage = cartesDuPlan({
    ouvertureDeSaison: ouverture !== null,
    carteDuPremierPlan: cartePremierPlan !== null,
    carteDesDeuxLieux: carteDesDeuxLieux && deuxLieux !== null,
    pointsAffiches: checkins.length,
    attenteDisponible: attente !== null,
    premierPlan,
    nombreDActions: actionsCount,
    motsDuContexte: motsDeContexte.length,
  });
  // Ce que l'écran annonce de lui-même, et ce que son cap a le droit de chiffrer (C3.8 §3). Dérivé
  // dans `src/types/plan.ts` plutôt qu'écrit en ternaires ici — une seule chose en dépend depuis que
  // C5.3 a retiré `intro` et `noteDuCap`, et ce commentaire a longtemps dit « trois phrases » ; c'est
  // la forme qui a laissé l'intro annoncer « pour ton trajet domicile-travail » au-dessus
  // d'actions qui n'en étaient pas.
  const cadre = cadreDuPlan({
    postesEnAvant: pistes.enAvant.map((action) => action.action_templates?.poste ?? null),
    nombreDActions: actionsCount,
  });
  // Le titre de la carte d'un plan à zéro action, et s'il peut promettre le point : le cycle porte
  // le poste et le libellé figé par le serveur, le bilan son total — seul le résiduel des sorties
  // rares le lit, pour dire qu'il est sous le repère 2050 —, et les boucles disent si un point
  // viendra (`felicitationDuPlanSansAction`).
  const felicitation = felicitationDuPlanSansAction(cycle.poste, cycle.trip_label, totalDuBilan, boucles);
  const baselineKg = cycle.baseline_co2_kg_year;
  // Le cap est une part de la baseline du poste dominant, pas du total : c'est sur ce poste
  // que le plan porte, et annoncer -20 % de l'empreinte entière serait une promesse fausse.
  // Même seuil et même lien que sur le suivi : une seule règle, deux endroits où la
  // rencontrer. Le plan est celui où l'on revient le plus souvent — c'est donc là qu'une
  // proposition de re-bilan a le plus de chances d'être vue, alors qu'elle n'existait que
  // sur le suivi.
  // Une seule règle, deux écrans : `doitProposerUnRebilan` porte le seuil **et** le cas de la date
  // absente (C2.7, point 7). Les deux écrans comparaient chacun de leur côté, avec pour l'un une date
  // qui peut manquer et pour l'autre une date toujours là — deux conditions à tenir en phase.
  // **Le titre porte la condition, et c'est ce qui les garde d'accord** (contre-lecture du
  // 19/09/2026). L'écran lisait un booléen puis composait sa phrase avec l'âge du bilan, tandis que
  // le suivi lisait le régime : deux lectures d'une même règle, et c'est celle d'ici qui a survécu
  // au changement de déclencheur de C6.3 en disant faux. `titreDuRebilan` rend `null` quand il n'y
  // a rien à proposer, donc il n'y a plus qu'une chose à tester.
  const titreRebilan =
    assessmentDate !== null
      ? titreDuRebilan(regimeDeRebilan(assessmentDate), daysSince(assessmentDate))
      : null;

  const capKg = capDuCycle(baselineKg, cycle.target_reduction_pct);

  // **Le cycle affiché peut être révolu, et l'écran le disait à personne** (C2.2) : la règle, et le
  // piège du fuseau qu'elle évite, sont dans `periodeRevolue`.
  const aujourdhui = new Date();
  const cyclePerime = periodeRevolue(cycle.period_end, aujourdhui);

  // La période a-t-elle un nom de saison ? `rolling_quarter` est dormant (aucun écran ne l'écrit,
  // tous les profils valent `season`) mais la chaîne serveur existe et est testée : trois phrases de
  // cet écran doivent savoir s'en passer plutôt que d'appeler « hiver » un trimestre glissant.
  const cadenceDeSaison = cadenceNommeUneSaison(cycle.cadence_type);
  const finDeLaPeriode = finDePeriodeEnMots(cycle.period_end);
  const progression = progressionDeLaPeriode(cycle.period_start, cycle.period_end, aujourdhui);

  // **Ce que les « oui » de la saison ont évité, au moins** (étape 6a de `v1-35`, décidée le
  // 24/10/2026). La somme des gains figés sur les points, réponses données ici comprises — jamais un
  // calcul, jamais un zéro (`kilosDeLaPeriodeEnMots`). Les bornes sont celles du cycle affiché, celles
  // que la carte d'ouverture relira à la saison suivante pour dire le total de celle-ci.
  const pointsDeLEcran = avecLesGestes(points, gestes).map(pointDeSaison);
  const kilosDeLaSaison = kilosDeLaPeriodeEnMots({
    debut: cycle.period_start,
    fin: cycle.period_end,
    cadence: cycle.cadence_type,
    points: pointsDeLEcran,
  });
  // **La carte d'ouverture se recompose au rendu, gestes compris** (contre-lecture du 24/10/2026). Le
  // chargement décide si elle se montre (`ouverture`, la marque locale comprise) ; son récapitulatif, lui,
  // compte les points tels que l'écran les sait. Elle ne vit que les deux premières semaines du cycle, où
  // la dernière semaine de la saison écoulée se répond, et le début de son dernier mois — dont le point
  // reste ouvert tout le premier mois : sans ceci, un « oui » donné pendant qu'elle est là s'inscrivait sur
  // la carte du point et nulle part dans le récapitulatif. Après, seul le suivi le compte.
  const ouvertureAffichee =
    ouverture === null || precedente === null
      ? ouverture
      : ouvertureDeSaison({
          debutDuCycle: cycle.period_start,
          cadence: cycle.cadence_type,
          precedente,
          points: pointsDeLEcran,
        });

  // Les quatre sorties de la carte d'ouverture, dérivées plutôt qu'écrites dans le composant : le
  // canvas suppose une action engagée et reconduite, et deux cas de production ne peuvent pas
  // recevoir ces libellés (rien d'engagé, plan sans action — tout cycliste depuis C2.5).
  const sortiesDeSaison = sortiesDeLouverture({
    actionEngagee: committedActionId !== null,
    nombreDActions: actionsCount,
  });

  // Les quatre sorties referment la carte, et **deux d'entre elles font quelque chose de plus**, sans
  // quoi elles reposeraient le plan tel qu'il était et ne se distingueraient pas de « Reprendre la même
  // action » — c'est-à-dire que le bouton ne ferait rien de ce que son libellé annonce (relevé par cinq
  // constats de l'audit, le 14/09/2026) :
  //  - **« Choisir une action » amène la première piste du plan** (D16 de `v1-33`, 01/10/2026). Elle
  //    menait à la liste complète, dix lignes, alors que les deux cartes que le plan a choisies sont
  //    juste dessous : le bouton le plus saillant de l'écran contournait la sélection que le plan existe
  //    pour faire (audit P-14). La liste reste derrière « Voir toutes les pistes · N » ;
  //  - **« Choisir une autre » mène à la liste**, où l'on change d'action : la bascule d'engagement se
  //    joue sur la carte d'action elle-même, où `commit_plan_action` libère et archive la précédente.
  //
  // « Reprendre la même action » n'a rien à faire : C2.2 a déjà reconduit l'engagement.
  //
  // **Ce qui reste à faire est la mémoire de saison** (écart 7 de `v1-14` §10, moitié « affichage ») :
  // rapatrier l'engagement libéré du cycle courant pour le rappeler à côté du choix. Elle n'est pas
  // livrée, et c'est désormais écrit là plutôt que promis à un chantier déjà passé.
  // « Compris » et rien d'autre : la carte du premier plan n'a pas de bouton qui mène ailleurs,
  // les deux cartes d'action l'attendent juste dessous. La marque est locale parce que le signal,
  // lui, ne se referme que sur un engagement — sans elle, quelqu'un qui a compris sans encore
  // choisir reverrait l'explication à chaque retour sur l'onglet, donc à chaque notification
  // ouverte.
  const refermerLePremierPlan = () => {
    void marquerLePremierPlanVu();
    setCartePremierPlan(null);
    // Le geste **est** ce qui fait venir la barre : l'attendre du prochain chargement la ferait
    // arriver après coup, sur un écran qui a déjà changé.
    laBarreArrive();
  };

  const refermerLouverture = (cle?: string) => {
    // **« Choisir une autre » mène là où l'on change d'action** (C5.2) : la liste, où chaque piste se
    // choisit à la place de celle qu'on suit.
    if (cle === 'choisir_une_autre') router.push('/plan/pistes');
    // **« Choisir une action » referme la carte et amène la première piste** (D16) — la première des
    // cartes du plan, rien n'étant engagé quand ce bouton se rend (`sortiesDeLouverture`). Le focus part
    // **au geste**, sur le bloc qui l'annonce par son titre : le bouton touché sort de l'écran avec sa
    // carte, et le focus retomberait sur le document. Le défilement, lui, attend le rendu qui referme
    // (`premiereAMontrer`, plus haut).
    if (cle === 'choisir') {
      const premiere = pistes.enAvant[0];
      if (premiere) {
        donnerLeFocus(blocs.current.get(premiere.id));
        premiereAMontrer.current = premiere.id;
      }
    }
    void marquerLouvertureDeSaisonVue(cycle.id);
    setOuverture(null);
  };

  // **Une carte, deux écrans** (C5.2). La fabrique qui vivait ici suffisait tant que le plan était
  // seul à rendre ces cartes ; depuis que « Toutes les pistes » a le sien, elle est un composant —
  // recopier celui qui porte l'engagement serait garantir que les deux surfaces divergent sur le
  // geste le plus irréversible du produit.
  //
  // Elle prenait un second argument, `estompeeParLeRang`, que plus aucun appel ne passait depuis
  // que C5.2 a sorti les rangs de cet écran : une branche morte, retirée le 24/09/2026 (`v1-29`).
  //
  // **Dans un cadre qui se mesure** (audit P-1 et P-2, 01/10/2026) : c'est lui qu'on amène dans la
  // fenêtre, à l'ouverture du sélecteur comme après la relecture d'un engagement. Le cadre et non la
  // carte, parce que la carte ne porte ni `ref` ni `onLayout` — une `View` de plus, sans style, que le
  // `gap` des cartes espace comme avant.
  const carteDaction = (action: PisteDuPlan) => (
    <View
      key={action.id}
      ref={(noeud) => inscrireCarte(action.id, noeud)}
      onLayout={() => carteMiseEnPage(action.id)}
    >
      <CarteDePiste
        action={action}
        committedActionId={committedActionId}
        onEngage={surEngagement}
        onModifie={surModification}
        onChanged={() => setRefreshKey((key) => key + 1)}
        onRefus={(message) => setRefusDeRemplacement(message)}
        onOuvert={() => {
          aMontrerALOuverture.current = action.id;
        }}
        lectures={lecturesTerminees}
        refDuBloc={(noeud) => inscrireBloc(action.id, noeud)}
      />
    </View>
  );

  // **Ce que le cap dit des pistes, quand c'est vrai** (24/09/2026, `v1-29`) : la même unité des
  // deux côtés, le kilo par an. Dérivé dans `src/types/plan.ts` — la phrase ne se dit que tant que
  // rien n'est engagé, et seulement sur un cap chiffré.
  const phraseDuCap = phraseDesPistesSuffisantes({
    capKg: cadre.chiffreLeCap ? capKg : null,
    gainsEnAvant: pistes.enAvant.map((action) => action.saving_kg_year),
    actionEngagee: committedActionId !== null,
  });

  // Le cap de la saison (T10), sa période et le trait de temps : `CarteDuCap`. À clé, pour que React le
  // réordonne avec les pistes sans remonter les cartes, qui portent l'engagement.
  const laCarteDuCap = (
    <CarteDuCap
      key="cap"
      capKg={capKg}
      chiffreLeCap={cadre.chiffreLeCap}
      cadenceDeSaison={cadenceDeSaison}
      reductionPct={cycle.target_reduction_pct}
      poste={cycle.poste}
      tripLabel={cycle.trip_label}
      baselineKg={baselineKg}
      phraseDuCap={phraseDuCap}
      periodLabel={cycle.period_label}
      finDeLaPeriode={finDeLaPeriode}
      progression={progression}
      traitDeTemps={affichage.traitDeTemps}
    />
  );

  // Les cartes mises en avant, puis la porte vers « Toutes les pistes » — **un seul bloc** (audit
  // P-15, 01/10/2026). Le lien vivait dans une vue à lui, sœur des cartes dans la liste défilante
  // (un fragment à clé les y posait côte à côte), donc à égale distance — l'écart de la liste — de la
  // seconde carte et de l'encart de contexte : il se lisait comme un bloc à part. Il prolonge les
  // cartes, il prend donc leur écart, dans leur conteneur. À clé, pour que React le réordonne avec le
  // cap sans remonter les cartes, qui portent l'engagement.
  const lesPistes =
    pistes.enAvant.length > 0 ? (
      <View key="pistes" style={styles.actions}>
        {/* L'action engagée passe en tête : c'est la réponse à « qu'est-ce que je fais en ce
            moment ? », elle n'a pas à être cherchée. Le reste suit le `rank` du serveur, qui porte
            déjà le bon ordre — poste dominant d'abord, puis gain décroissant.

            **Pas de conteneur vide** (24/09/2026, `v1-29`) : sur un plan à zéro action, la vue se
            rendait quand même, et le `gap` de la liste défilante lui réservait sa place — un écart
            fantôme sous le cap, puis au-dessus de lui depuis que le premier plan met les pistes
            devant. Le lien n'existe pas sans cartes : il demande plus de pistes que les deux. */}
        {pistes.enAvant.map((action) => carteDaction(action))}

        {/* **Toutes les pistes, sur un écran à elles** (C5.2, écarts 2 à 5). Le plan en montrait
            deux, puis dépliait jusqu'à onze cartes sous un « Replier » sorti de l'écran :
            l'insistance et l'exhaustivité tenaient sur la même surface, et l'exhaustivité gagnait.
            Elles se séparent — deux cartes ici, tout là-bas, groupé par poste.

            Le compte reste **dans** le libellé, et c'est le total : un lien qui ne dit pas combien il
            mène à voir n'aide pas à décider de l'ouvrir. Il ne se rend que s'il y a plus à voir que
            les deux cartes — sinon il promettrait un écran qui répète celui-ci.

            **Un lien, et il s'annonce comme tel** (24/09/2026, `v1-29`) : il mène à un autre écran,
            donc `link` et non `button`, qui promettrait une action sur place. */}
        {pistes.masquees > 0 && (
          <TextLink
            label={`Voir toutes les pistes · ${actionsCount}`}
            apparence="action"
            onPress={() => router.push('/plan/pistes')}
            role="link"
            style={styles.lienPistes}
          />
        )}
      </View>
    ) : null;

  return (
    <ThemedView style={styles.container}>
      {/* Rendue par-dessus le plan plutôt que dans le flux : elle arrive après un geste
          (« C'est noté ») et doit se lire comme un moment, pas comme un encart de plus. */}
      {/* **La feuille ne dépend plus de `boucle`**, et c'est le corollaire du correctif : ce
          qu'elle annonce se dérive du poste de l'action. La garde d'avant faisait qu'un échec
          de lecture secondaire empêchait la cérémonie de s'ouvrir — et comme elle ne s'ouvre
          qu'une fois par appareil, elle était alors perdue pour de bon. */}
      {ouvertureDeFeuille && rappels && (
        <FeuilleRappels
          prefs={rappels}
          boucle={boucleDeLAction(posteEngage)}
          echeance={echeanceEngagee}
          permission={permission}
          ouverture={ouvertureDeFeuille}
          onFerme={fermerLaFeuille}
        />
      )}

      <ScrollView
        ref={defilement}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={surDefilement}
        scrollEventThrottle={16}
      >
        {/* Sans cette ligne, une question ouverte depuis et un engagement pris ailleurs
            manqueraient à l'écran sans que rien ne le dise. */}
        {banniereRelecture()}
        {rattachement !== null && <EncartDuRattachement adresse={rattachement} />}
        {orphelin !== null && (
          <EncartDeLOrphelin
            orphelin={orphelin}
            onCompris={() => {
              void marquerEngagementOrphelinVu(orphelin.id);
              setOrphelin(null);
            }}
          />
        )}

        {cyclePerime && (
          <EncartDuCycleRevolu
            cadence={cycle.cadence_type}
            aujourdhui={aujourdhui}
            relectureDemandee={relectureDemandee}
            onRelire={relire}
          />
        )}

        {/* **L'ouverture d'une saison** (C2.8, planches B2 et B3). En tête du plan, au-dessus de
            son titre : c'est la nouvelle, et elle ne vit que deux semaines.

            **Elle ne prend pas la place d'un point en attente**, contrairement à ce que dit le
            canvas (écart consigné en `v1-14` §10). Le lien du rappel pointe `/plan` : masquer la
            question ici, c'est ouvrir une notification sur un écran qui ne la porte pas — le défaut
            exact que le test sur appareil du 09/09/2026 a trouvé (v1-12 §8.1), et la promesse
            rompue à l'endroit même où elle se tient. Ce qu'elle remplace est la **carte
            d'attente** : Ramille parle déjà sous la carte d'ouverture, et deux fois dans le même
            écran ferait du bruit. */}
        {affichage.carteDOuverture === 'saison' && ouvertureAffichee !== null ? (
          <CarteDOuverture
            ouverture={ouvertureAffichee}
            sorties={sortiesDeSaison}
            ligne={RAMILLE.ouvertureSaison}
            visage="happy"
            onSortie={(cle) => refermerLouverture(cle)}
          />
        ) : /* **La carte du tout premier plan** (C5.6, écart 8, planche B1). Le plan disait la règle
            du jeu nulle part : on arrivait de la restitution devant deux cartes chiffrées, un cap
            et un trait de temps, sans qu'un mot explique qu'on en choisit **une** et que le reste
            du produit tient en un point régulier.

            **Le même composant que la carte de saison**, parce que le canvas décrit les deux
            cadres de la même façon au pixel près : ce qui change est le contenu, dérivé dans
            `src/types/saison.ts`. Et la même règle qu'elle — **elle ne prend jamais la place d'un
            point en attente**, seulement celle de la carte d'attente, sous laquelle Ramille parle
            déjà. Avec la carte de saison, l'exclusion est structurelle : l'une exige un cycle
            précédent, l'autre exige qu'il n'y en ait pas. Avec celle des deux lieux, elle ne
            l'est pas — c'est `cartesDuPlan` qui la fait passer devant (voir plus bas). */
        affichage.carteDOuverture === 'premierPlan' && cartePremierPlan !== null ? (
          <CarteDOuverture
            ouverture={cartePremierPlan}
            sorties={SORTIE_COMPRIS}
            ligne={RAMILLE.premierPlan}
            visage="happy"
            onSortie={refermerLePremierPlan}
          />
        ) : /* **La barre vient d'arriver, et elle se nomme** (C5.7, planche F3). Elle n'apparaît
            qu'une fois, au moment exact où le premier parcours se referme : la personne voit
            apparaître deux lieux en bas de son écran, et la carte dit ce qu'on trouve dans
            chacun. Sans elle, la barre pousserait sans un mot, ce qui est la façon la plus sûre
            de faire d'une navigation à deux entrées une navigation à une.

            **Elle ne se rend que si le parcours s'est terminé sur cet appareil**, jamais sur la
            seule absence d'une marque : `etatDuPremierParcours` en fait un état à part entière,
            et son module dit pourquoi deux booléens l'auraient affichée à tout le monde. Comme
            les deux autres, elle prend la place de la carte d'attente et jamais celle d'un point
            en attente.

            **Elle cède aux deux autres, et ce n'est décidé qu'à un endroit** : `cartesDuPlan`
            (`src/types/plan.ts`), dans un ordre fixe — la saison, puis le premier plan, puis
            celle-ci. Deux cadres empilés au-dessus du plan, c'est une carte qui explique
            par-dessus une carte qui annonce ; celle-ci attend — sa marque ne bouge pas, et elle
            se rend dès que l'autre est refermée. **Et les trois cartes sont une seule expression**,
            dont chaque branche exclut les autres : l'écran ne peut pas plus en rendre deux que la
            dérivation ne peut en choisir deux. Trois blocs indépendants, eux, le pouvaient — il
            suffisait qu'une condition soit réécrite pour que l'empilement revienne.

            **Cette exclusion s'est trompée deux fois de paire.** La contre-lecture du lot 5 a
            trouvé qu'elle croisait la saison (avoir refermé le premier plan puis n'être pas
            revenu avant la bascule suffit), et jugé la paire avec le premier plan impossible
            « parce qu'il exige qu'aucun cycle ne précède » — mais cette carte-ci ne dépend
            d'aucun cycle, seulement de la marque locale. Un premier plan à zéro action (la barre
            arrive, et cette carte avec), puis un nouveau bilan dans la même saison qui donne des
            actions : les deux étaient dues le même jour. Relevé le 27/09/2026 en sortant la
            décision du rendu ; le premier plan passe devant, décidé par la personne qui pilote. */
        affichage.carteDOuverture === 'deuxLieux' && deuxLieux ? (
          <CarteDesDeuxLieux
            ouverture={deuxLieux.ouverture}
            sorties={SORTIE_DES_DEUX_LIEUX}
            ligne={deuxLieux.ligne}
            visage="calm"
            onSortie={refermerLesDeuxLieux}
            onRendue={lesDeuxLieuxSeRendent}
          />
        ) : null}

        <View style={styles.intro}>
          <ThemedText type="screenTitle">
            Ton plan
          </ThemedText>
          {/* **L'intro dit le principe, plus la description** (C5.3, écart 6). Elle écrivait
              « Deux actions pour ton trajet domicile-travail » — une description des deux cartes
              posées juste dessous, qui taisait les neuf autres et n'apprenait rien. La question
              que la personne se pose devant deux cartes n'est pas « lesquelles ? », c'est
              « pourquoi seulement deux ? ». La ligne y répond.

              **Fixe, donc plus dérivée** : elle ne nomme ni poste ni nombre, ce qui retire du
              même coup le défaut que `cadreDuPlan` existait pour éviter (annoncer un poste
              au-dessus d'actions qui n'en sont pas, constat A8-14). Il ne reste d'elle que la
              décision du cap.

              Le mot de période suit la cadence : un trimestre glissant n'a pas de saison, et
              « une action par saison » y serait faux.

              **Jamais sur un plan à zéro action** (audit P-5, 01/10/2026, HANDOFF `v1-17` planche
              C) : « une action, une seule » s'y lisait au-dessus d'aucune action, juste avant
              « Aucun changement de mode ne te ferait gagner assez… » (`cartesDuPlan`, `intro`). */}
          {/* **Le principe et le progrès de la saison, sans écart entre eux qui saute** : le total se déplie
              (plus bas), et un enfant direct de l'intro prendrait son `gap` d'un coup, à son montage. Le
              bloc n'existe que s'il porte l'un des deux — un plan à zéro action n'a pas d'intro —, mais le
              fournisseur, lui, monte avec l'écran : né plus tard avec le seul total, le bloc le déplie
              encore (contre-lecture du 24/10/2026). */}
          <SansApparitionAuMontage>
            {(affichage.intro || kilosDeLaSaison !== null) && (
              <View>
                {affichage.intro && (
                  <ThemedText type="body" themeColor="textSecondary">
                    Une action par {cadenceDeSaison ? 'saison' : 'période'}, une seule. C’est pas à pas
                    qu’on tient un cap.
                  </ThemedText>
                )}
                {/* **Le progrès de la saison, en tête** (étape 6a de `v1-35`). Sous le principe et au-dessus
                    des points : c'est la première chose qu'on relit en revenant, et elle répond à « où j'en
                    suis ? » avant la question de la semaine. **Pas près de la carte d'attente**, qui porte
                    le visage de Ramille et vient après les points : un chiffre juste au-dessus d'elle se
                    lirait comme son commentaire (`FRONT-MASCOTTE.md` §2.3). Voix produit, et la provenance
                    dite (« d’après tes réponses ») : ce n'est pas une mesure.

                    **Il se déplie quand le premier « oui » de la saison le fait naître** (`Depliage`), au-dessus
                    de la carte qu'on vient de toucher : sans lui, la carte et sa réplique, qui a déjà le focus,
                    descendaient d'une ligne d'un coup. Déjà là quand l'écran arrive, il est posé
                    (`SansApparitionAuMontage`) ; sous « réduire les animations » et sur Android, posé aussi.
                    L'écart au principe est **dans** le dépli, pour s'ouvrir avec lui. */}
                {kilosDeLaSaison !== null && (
                  <Depliage style={affichage.intro ? styles.kilosDeLaSaison : undefined}>
                    <ThemedText type="body" themeColor="textSecondary">
                      {kilosDeLaSaison}
                    </ThemedText>
                  </Depliage>
                )}
              </View>
            )}
          </SansApparitionAuMontage>
        </View>

        {/* **Le point de la semaine passe en tête** (v1-11 flux 4) : répondre à un rappel est
            la raison de revenir la plus fréquente, et la question vivait sous les actions,
            après le cap — il fallait faire défiler pour la trouver. Une question qu'on ne
            voit pas est une question à laquelle on ne répond pas.

            **L'accent, quand deux points sont ouverts, va à la question de l'engagement**
            (`v1-33` §6, tranché le 01/10/2026) — sinon au poste dominant, la règle d'avant
            (`accentDesPoints`). */}
        {checkins.length > 0 && (
          <View style={styles.checkins}>
            {checkins.map((checkin, rang) => (
              <CheckinCard
                key={checkin.id}
                checkin={checkin}
                emphasize={accents[rang]}
                actionEngagee={actionEngageeTexte}
                historique={historique[checkin.loop_type]}
                boucleTourne={laBoucleDuPointTourne(boucles, checkin.loop_type)}
                onReponse={noterLeGeste}
              />
            ))}
          </View>
        )}

        {/* Posée **au-dessus** du cap et non à côté : la règle « jamais la mascotte près
            d'un chiffre lourd » vise l'empreinte, mais un cap en kilos juste sous son
            visage donnerait l'impression qu'elle le commente. */}
        {affichage.carteDAttente && attente && <CarteDAttente attente={attente} />}

        {/* **Au tout premier plan, le choix passe avant le cap** (24/09/2026, `v1-29`). Sur un
            téléphone, la carte « Ton premier plan », Ramille, le titre et le cap remplissaient
            l'écran, et la première action arrivait coupée en bas : on expliquait qu'il fallait en
            choisir une sans la montrer. Tant que dure le premier plan (`premierPlan`, C5.6 — il ne
            se referme que sur un engagement), les cartes et le lien vers les pistes passent devant
            le cap ; ensuite l'ordre redevient celui de toujours, le cap d'abord.

            Deux éléments à clé plutôt que deux rendus écrits deux fois : React les réordonne sans
            remonter les cartes, qui portent l'engagement, et le cap comme les pistes ne s'écrivent
            qu'à un endroit. */}
        {affichage.pistesAvantLeCap ? [lesPistes, laCarteDuCap] : [laCarteDuCap, lesPistes]}

        {affichage.encartDeContexte && <EncartDeContexte mots={motsDeContexte} />}

        {affichage.felicitation && (
          <CarteDeFelicitation titre={felicitation.titre} promettreLePoint={felicitation.promettreLePoint} />
        )}

        {/* La provenance du chiffre, à l'endroit où il engage le plus. Le produit vise un
            registre institutionnel : une estimation présentée comme une mesure serait le
            premier endroit où la crédibilité se casse.

            **En Spline Sans et non plus en chasse fixe** (24/09/2026, `v1-29`, décision n° 10) :
            la chasse fixe est réservée aux sources et aux codes techniques, et ceci est une
            phrase adressée à la personne — « tes réponses ». */}
        {affichage.estimation && (
          <ThemedText type="small" themeColor="textTertiary">
            Estimations sur la base des facteurs ADEME et de tes réponses. Un ordre de
            grandeur pour choisir, pas une mesure.
          </ThemedText>
        )}

        {/* La proposition de re-bilan ferme l'écran (v1-11 flux 2). Elle apparaît au plus
            deux fois par an : la faire passer devant la question de la semaine ou devant
            l'action engagée inverserait l'urgence. « Une proposition, jamais un rappel
            insistant » — même règle que sur le suivi, même seuil, même lien. */}
        {titreRebilan !== null && <CarteDuRebilan titre={titreRebilan} />}

        {/* « Voir mon suivi » a disparu : la barre le porte, et un lien qui double un onglet
            apprend à ne pas se servir de la barre. Le renvoi vers le bilan reste — ce n'est
            pas une destination de la barre, c'est le détail d'une entrée du suivi.
            **Mais il ne vaut pas un bandeau collant** (retour d'appareil du 07/09/2026) :
            il occupait ~68 px en permanence sur l'écran où l'on revient le plus souvent,
            pour un geste que l'onglet Suivi économise à peine — une entrée permanente dans
            la chrome, soit exactement la troisième destination que le modèle à deux onglets
            a refusée. En fin de flux, il ne coûte rien. */}
        <TextLink
          label="Revoir mon bilan"
          apparence="discret"
          onPress={() => router.push({ pathname: '/suivi/bilan', params: { id: assessmentId } })}
          role="link"
          style={styles.lienBilan}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Largeur maximale du contenu, comme les pages légales et les écrans de compte (A5-21).
  // L'app est déployée sur le web, et sans borne la carte du cap comme les cartes d'action
  // s'étirent sur toute la fenêtre : le titre et le gain se retrouvent aux deux extrémités de
  // l'écran, ce qui casse l'appariement visuel que ces cartes existent pour porter.
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  intro: { gap: Spacing.two },
  // L'écart du principe au total de la saison, que le `gap` de l'intro donnait : porté par le dépli pour
  // s'ouvrir avec lui (étape 6a de `v1-35`).
  kilosDeLaSaison: { paddingTop: Spacing.two },
  // Les deux cartes et le lien vers la liste, au même écart : le lien prolonge les cartes (P-15).
  actions: { gap: Spacing.two + 2 },
  lienPistes: { textAlign: 'center' },
  checkins: { gap: Spacing.two + 2 },
  lienBilan: { textAlign: 'center' },
});
