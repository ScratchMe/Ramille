import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BandeHaute } from '@/components/bande-haute';
import { Button } from '@/components/button';
import { CheckinCard, type EngagementCheckin } from '@/components/checkin-card';
import { EmptyStateIllustration } from '@/components/illustrations/empty-state-illustration';
import { Mascot } from '@/components/mascot';
import { MessageInline } from '@/components/message-inline';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { RAMILLE } from '@/constants/mascotte';
import { formatKg, formatTonnes } from '@/lib/format';
import { useRafraichirAuRetour } from '@/hooks/use-rafraichir-au-retour';
import { usePassageDEngagement } from './_layout';
import { useTrackFocus } from '@/hooks/use-track-focus';
import { track } from '@/lib/analytics';
import { CarteDePiste, type PisteDuPlan } from '@/components/plan/carte-de-piste';
import { CarteDOuverture } from '@/components/plan/carte-douverture';
import { FeuilleRappels } from '@/components/plan/feuille-rappels';
import { TraitDeTemps } from '@/components/plan/trait-de-temps';
import {
  cadreDuPlan,
  formeInserable,
  motsDuContexte,
  phraseDeLOrphelin,
  pistesDuPlan,
  RAISONS_ANNONCABLES,
  type ReponsesDeContexte,
} from '@/types/plan';
import { daysSince, regimeDeRebilan, titreDuRebilan } from '@/types/suivi';
import {
  aVuLouvertureDeSaison,
  marquerLouvertureDeSaisonVue,
} from '@/lib/saison-prefs';
import { aVuLePremierPlan, marquerLePremierPlanVu } from '@/lib/premier-parcours';
import {
  etatDuPremierParcours,
  OUVERTURE_DES_DEUX_LIEUX,
  SORTIE_DES_DEUX_LIEUX,
} from '@/types/premier-parcours';
import { usePremierParcours } from '@/app/(tabs)/_layout';
import {
  basculeDeSaison,
  cadenceNommeUneSaison,
  estDansLouverture,
  estPremierPlan,
  finDePeriodeEnMots,
  ouvertureDeSaison,
  ouvertureDuPremierPlan,
  progressionDeLaPeriode,
  SORTIE_COMPRIS,
  sortiesDeLouverture,
  type ContenuDOuverture,
  type PointDeSaison,
} from '@/types/saison';
import {
  aVuEngagementOrphelin,
  aVuRattachementAnnonce,
  marquerEngagementOrphelinVu,
  marquerRattachementAnnonce,
} from '@/lib/connexion-prefs';
import { lireEtatDuRattachement } from '@/lib/compte';
import {
  aDejaVuLaFeuilleDeRappel,
  loadReminderPrefs,
  type ReminderPrefs,
} from '@/lib/notification-prefs';
import { lirePermission } from '@/lib/rappels';
import { supabase } from '@/lib/supabase';
import { STATUT_DE_BILAN } from '@/types/bilan';
import {
  debutDePeriodeInterrogee,
  estDeLaPeriodeCourante,
  genreDeReponse,
  periodePrecedente,
  type PointRepondu,
  STATUT_DU_POINT,
} from '@/types/checkin';
import {
  boucleDeLAction,
  carteAttente,
  doitProposerLaFeuille,
  type Boucle,
  type CanalPrefere,
  type Permission,
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
type EngagementOrphelin = { id: string; action_text: string; released_reason: string };

// Une seule carte par boucle, la plus récente. La requête est déjà triée par `period_start`
// décroissant, donc le premier vu de chaque `loop_type` est le bon.
//
// `period_start` n'est plus ajouté ici : il fait partie d'`EngagementCheckin` depuis C2.3, parce
// que c'est lui qui nomme le mois dans la question de la boucle mensuelle.
//
// **Et depuis C2.4, la période borne l'affichage.** La requête ramène aussi les points répondus,
// pour que le renforcement survive à un changement d'onglet ; il ne doit pas survivre à la période.
// Un compte dont la boucle a cessé d'être générée — un re-bilan sans trajet régulier, par exemple —
// garderait sinon à l'écran, pour toujours, un « Répondu lundi » suivi de la promesse d'un point qui
// ne viendra pas. `estDeLaPeriodeCourante` est la jumelle du `date_trunc` des deux générateurs ; un
// point **en attente** n'est jamais filtré, lui, parce que seul le serveur décide de le clore.
function keepLatestPerLoop(checkins: EngagementCheckin[]): EngagementCheckin[] {
  const seen = new Set<EngagementCheckin['loop_type']>();
  return checkins.filter((checkin) => {
    if (seen.has(checkin.loop_type)) return false;
    if (checkin.status === STATUT_DU_POINT.repondu && !estDeLaPeriodeCourante(checkin)) return false;
    seen.add(checkin.loop_type);
    return true;
  });
}

// **La borne basse de la lecture des points, et pourquoi elle existe** (C2.4 puis C2.10). La requête
// ramenait les seuls points `pending` — un ou deux. Depuis qu'elle lit aussi les points répondus, elle
// ramènerait tout l'historique d'un compte, soit une ligne par semaine qui s'accumule sans fin. Ce qui
// est réellement nécessaire est la période courante et les **deux** qui la précèdent (le second
// renforcement a besoin de savoir qu'on est à deux et pas à cinq) : la fenêtre est donc celle de la
// boucle mensuelle, trois mois, qui couvre largement l'hebdomadaire.
//
// **`debutDuCyclePrecedent` l'élargit, et ce n'est pas une précaution de confort** (C2.8). Le
// récapitulatif de la carte d'ouverture compte les points de la période écoulée : au premier jour
// d'une saison, ces points remontent à trois mois pleins. Les deux bornes tombent aujourd'hui
// **exactement** au même jour — trois périodes mensuelles en arrière depuis le 1er d'un mois est le
// 1er du mois trois mois plus tôt, qui est aussi le premier jour de la saison précédente — donc
// l'oubli ne se verrait pas, jusqu'au jour où l'une des deux dérivations bouge. Une cadence
// `rolling_quarter`, elle, n'est pas alignée sur les mois et sortirait déjà de la fenêtre. On prend
// le minimum des deux plutôt que de compter sur une coïncidence.
function fenetreDesPoints(
  maintenant: Date = new Date(),
  debutDuCyclePrecedent?: string | null
): string {
  const courante = debutDePeriodeInterrogee('extras', maintenant);
  const troisPeriodes = periodePrecedente('extras', periodePrecedente('extras', courante));
  if (!debutDuCyclePrecedent) return troisPeriodes;
  const debutDuCycle = debutDuCyclePrecedent.slice(0, 10);
  return debutDuCycle < troisPeriodes ? debutDuCycle : troisPeriodes;
}

// Les points répondus de chaque boucle, hors carte affichée : c'est ce que `estDeuxiemeFoisDeSuite`
// interroge. Regroupé ici plutôt que dans la carte, qui n'a pas à relire la base pour savoir ce qui
// s'est passé la période d'avant.
function historiqueParBoucle(
  checkins: EngagementCheckin[],
  affiches: EngagementCheckin[]
): Record<EngagementCheckin['loop_type'], PointRepondu[]> {
  const affichesIds = new Set(affiches.map((checkin) => checkin.id));
  const parBoucle: Record<EngagementCheckin['loop_type'], PointRepondu[]> = {
    commute: [],
    extras: [],
  };

  for (const checkin of checkins) {
    if (affichesIds.has(checkin.id)) continue;
    const reponse = genreDeReponse(checkin.response_kind);
    if (reponse === null) continue;
    parBoucle[checkin.loop_type].push({ period_start: checkin.period_start, reponse });
  }

  return parBoucle;
}

/**
 * Un point, réduit à ce que le récapitulatif de saison regarde (C2.8).
 *
 * `PointDeSaison` parle le vocabulaire de `response_kind` — la seule vérité côté base (C2.4) — donc
 * la conversion n'est qu'un changement de nom de champ. `genreDeReponse` est la même lecture que
 * partout ailleurs dans l'écran : la reconvertir en booléen ici rouvrirait l'ambiguïté que C2.4 a
 * fermée, où `null` voulait dire à la fois « pas répondu » et « répondu sans objet ».
 */
function pointDeSaison(checkin: EngagementCheckin): PointDeSaison {
  return {
    periodStart: checkin.period_start,
    status: checkin.status,
    reponse: genreDeReponse(checkin.response_kind),
  };
}

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
  | { status: 'loading' }
  // Aucun bilan complété — écran "État vide" de la maquette.
  | { status: 'no_assessment' }
  // **Rien n'a pu être lu, et c'est autre chose que « rien à afficher »** (A4-1). L'erreur des
  // requêtes était purement ignorée : hors ligne, `assessment === null` menait à
  // `no_assessment`, donc à « Ton bilan n'est pas encore fait » et à un bouton pour le refaire,
  // à quelqu'un qui en a un. Un état vide est une affirmation sur les données de la personne.
  //
  // **Cet état ne s'atteint que depuis `loading`** : les trois autres viennent d'une lecture
  // qui a réussi, et l'écran d'erreur plein écran ne vaut que quand rien n'a jamais pu être lu.
  // La relecture en échec se dit à côté (`relectureEnEchec`), sans rien effacer.
  | { status: 'erreur_reseau' }
  // Bilan complété mais plan_cycles pas encore généré — ne devrait plus arriver en
  // pratique (compute_assessment_results le génère désormais immédiatement, cf.
  // migration 20260824190000), gardé comme filet pour les bilans complétés avant elle
  // et pas encore repris par le cron quotidien.
  | { status: 'pending'; assessmentId: string }
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
       * Est-ce le tout premier plan de cette personne ? (C5.6, `estPremierPlan`.)
       *
       * **Dans le `LoadState` et non dans un état à part**, parce que c'est un fait lu en base au
       * même instant que le reste : le mettre à côté en ferait une valeur à tenir en phase avec le
       * cycle affiché. Il pilote **deux** choses qui ne se referment pas ensemble — la carte, qu'un
       * « Compris » suffit à retirer (marque locale), et le trait de temps, qui attend un
       * engagement parce qu'il n'a rien à mesurer avant.
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
 * pas d'encart. Nommé plutôt qu'écrit en littéral dans le rendu — il y est lu deux fois, et deux
 * littéraux finiraient par différer.
 */
const VIDE_DE_CONTEXTE: ReponsesDeContexte = {
  zone_type: null,
  tc_access: null,
  household_vehicles: null,
  teletravail: null,
};

export default function Plan() {
  // **Émis au focus et non au montage** : dans une barre d'onglets, react-navigation garde
  // l'écran monté quand on passe à l'autre. Avec `useTrackView`, l'événement ne partirait
  // qu'à la première ouverture de la session — et le taux de retour, qui est la question
  // même que la navigation pose, deviendrait invisible (v1-11 §2, piège relevé au plan).
  useTrackFocus('plan_view');

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  // **Hors du `LoadState`, et pas par commodité** : la dernière relecture peut échouer
  // au-dessus de n'importe quel écran issu d'une lecture réussie — le plan, mais aussi
  // « en préparation » et « pas encore de bilan ». Porté par la variante `ok` seule, le drapeau
  // obligeait le repli à écraser les deux autres, qui perdaient alors leurs sorties : « Revoir
  // mon bilan » depuis `pending`, et « Faire mon bilan » depuis `no_assessment` — le
  // questionnaire, lui, se remplit très bien hors ligne (brouillon AsyncStorage).
  const [relectureEnEchec, setRelectureEnEchec] = useState(false);

  /**
   * Le refus de remplacement (`RM001`), remonté à l'écran plutôt que gardé dans la carte.
   *
   * **Logé ici pour la même raison que la ligne de relecture**, et parce que le message était
   * invisible : `commitPisteDuPlan` rend `rechargerLePlan`, la carte appelait `onChanged()` dans la
   * foulée, donc le plan était relu et les cartes remontées — l'état local qui portait la phrase
   * disparaissait au rendu suivant. Personne ne lisait donc jamais pourquoi son choix n'avait pas
   * été enregistré ; le plan changeait simplement sous ses yeux (relevé le 14/09/2026). Et le
   * remonter ne suffisait pas à le rendre visible si la carte concernée repassait derrière « Voir
   * d'autres pistes », replié par défaut : on déplie donc en même temps.
   */
  const [refusDeRemplacement, setRefusDeRemplacement] = useState<string | null>(null);
  // Recharge après un engagement : le RPC libère aussi l'action précédente, donc l'état à
  // jour ne se déduit pas de l'action qu'on vient de toucher — il faut relire le cycle.
  const [refreshKey, setRefreshKey] = useState(0);
  const rafraichir = useCallback(() => setRefreshKey((cle) => cle + 1), []);

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
  // `null` tant qu'on ne sait pas : le jour que Ramille nomme vient du libellé du poste
  // domicile-travail, et une valeur par défaut nommerait le mauvais rythme (cf. le chargement).
  const [boucle, setBoucle] = useState<Boucle | null>(null);
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
  const { laBarreArrive } = premierParcours;
  const { carteDesDeuxLieux } = etatDuPremierParcours(premierParcours.etape);
  /**
   * Le lien du rappel porte `?rappel=1` (C2.11). Il ne sert qu'à l'état sans bilan : quand il y a un
   * plan à montrer, il n'y a rien à expliquer — la personne est au bon endroit.
   */
  const { rappel } = useLocalSearchParams<{ rappel?: string }>();
  const vientDUnRappel = rappel === '1';
  const [feuilleOuverte, setFeuilleOuverte] = useState(false);
  /**
   * Le poste de l'action qu'on vient d'engager, pour la feuille et pour elle seule.
   *
   * **Il ne se confond pas avec `boucle`** (recette du 14/09/2026) : `boucle` répond à « quel est
   * le prochain contact, quel qu'en soit le sujet » et se dérive de la personne ; la feuille, elle,
   * promet un contact *sur cette action-là*. Quelqu'un qui a un trajet domicile-travail et
   * s'engage sur un vol s'entendait promettre le lundi, alors que le point du lundi s'apparie sur
   * le poste `commute` (C2.1) et ne lui demandera jamais rien sur son vol.
   */
  const [posteEngage, setPosteEngage] = useState<string | null>(null);

  // Appelée quand un engagement vient d'être pris — jamais quand on en change ni quand on
  // le libère. La feuille ne s'ouvre qu'une fois par appareil : c'est une cérémonie pour la
  // première fois, pas un péage à chaque action.
  // **Stable, et ce n'est pas du confort** : l'effet de focus qui reprend l'engagement des pistes
  // la porte en dépendance, donc une fonction recréée à chaque rendu ferait se réabonner cet effet
  // à chaque rendu. C'est la règle déjà écrite pour `useRafraichirAuRetour` — un rappel instable
  // fait tourner chargement et rendu l'un dans l'autre.
  const proposerLesRappels = useCallback(async (poste: string | null) => {
    if (!rappels) return;
    setPosteEngage(poste);
    const dejaProposee = await aDejaVuLaFeuilleDeRappel();
    if (
      !doitProposerLaFeuille({
        plateforme: Platform.OS === 'web' ? 'web' : 'natif',
        emailPossible: rappels.emailPossible,
        dejaProposee,
      })
    ) {
      return;
    }
    track('rappels_view');
    setFeuilleOuverte(true);
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
   * Le drapeau se consomme au passage : `useRafraichirAuRetour` écoute aussi le retour de l'app au
   * premier plan, donc un drapeau qui resterait posé rouvrirait la feuille à chaque aller-retour.
   */
  useFocusEffect(
    useCallback(() => {
      const engagement = passage.reprendre();
      if (engagement !== null) void proposerLesRappels(engagement.poste);
    }, [passage, proposerLesRappels])
  );

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
  // que `connexion_demande`, l'intention — l'écart entre les deux **est** le taux d'emails jamais
  // confirmés, c'est-à-dire le chiffre cherché.
  //
  // Deux précautions qui font que ce chiffre veut dire quelque chose :
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
      if (methode === 'email' || Platform.OS === 'web') {
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
    const echecDeLecture = () => {
      if (cancelled) return;
      setRelectureEnEchec(true);
      // `pending` et `no_assessment` sont dérivés d'une lecture **réussie** au même titre que
      // `ok` : seul `loading` n'a jamais rien su, et c'est le seul que l'écran d'erreur plein
      // écran remplace.
      setState((precedent) =>
        precedent.status === 'loading' ? { status: 'erreur_reseau' } : precedent
      );
    };

    (async () => {
      try {
        // Le lien "Revenir à mon bilan" pointe vers la restitution du dernier bilan
        // complété (elle-même donne accès à "Modifier mes réponses") — il faut donc son
        // id systématiquement, pas seulement dans le cas filet ci-dessous.
        const { data: assessment, error: erreurBilan } = await supabase
          .from('assessments')
          .select('id, submitted_at')
          .eq('status', STATUT_DE_BILAN.complete)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (erreurBilan) {
          echecDeLecture();
          return;
        }

        if (!assessment) {
          setState({ status: 'no_assessment' });
          // Une lecture qui aboutit efface la ligne de relecture, y compris sur les deux
          // sorties anticipées : sans ça, elle survivrait à l'échec précédent au-dessus d'un
          // écran pourtant à jour.
          setRelectureEnEchec(false);
          return;
        }

        // **Deux cycles et non un** (C2.8) : le second est la période écoulée, dont la carte
        // d'ouverture récapitule les points. Ses bornes sont **lues sur sa ligne** plutôt que
        // recalculées — une cadence `rolling_quarter` n'a pas de saison nommée, donc dériver les
        // bornes de la saison ferait compter trois mois calendaires qui ne sont pas les siens. Et
        // son existence est ce qui distingue une bascule d'un premier bilan : « On repart pour une
        // saison » ne vaut que si l'on a déjà roulé une saison.
        const { data: cycles, error: cycleError } = await supabase
          .from('plan_cycles')
          .select(
            // Chaîne littérale d'un seul tenant, volontairement longue : supabase-js infère le
            // type du résultat en analysant ce littéral au niveau des types. Une concaténation
            // lui rend un `string` opaque et le typage du retour est perdu.
            //
            // **`plan_actions!plan_actions_plan_cycle_id_fkey` est obligatoire depuis C2.2**, et
            // ce n'est pas une précaution de typage : `carried_over_from` est une **seconde** clé
            // étrangère de `plan_actions` vers `plan_cycles`, donc PostgREST ne sait plus laquelle
            // suivre et refuse la requête (« more than one relationship was found »). Sans le
            // nom de la clé, l'écran du plan ne charge plus du tout. Le typecheck l'attrape —
            // c'est le seul garde qui le fait, la chaîne étant analysée au niveau des types.
            'id, period_label, period_start, period_end, cadence_type, trip_label, poste, baseline_co2_kg_year, target_reduction_pct, plan_actions!plan_actions_plan_cycle_id_fkey(id, saving_kg_year, saving_share_percent, detail_text, first_step, rank, committed_at, intention_days, intention_timing, carried_over_from, action_templates(action_text, poste))'
          )
          .order('period_start', { ascending: false })
          .limit(2);

        if (cancelled) return;

        // **Le cycle manquant et le cycle illisible ne sont plus le même état.** Les deux
        // tombaient sur « Ton plan est en cours de préparation », qui est une affirmation :
        // elle dit qu'il n'y a rien à montrer *encore*, donc qu'il suffit d'attendre. Hors
        // ligne, il n'y a rien à attendre. `pending` reste le filet du cas légitime — un bilan
        // complété avant que le calcul ne génère le plan, que le cron rattrape.
        if (cycleError) {
          echecDeLecture();
          return;
        }

        const cycle = cycles?.[0] ?? null;
        const cyclePrecedent = cycles?.[1] ?? null;

        if (!cycle) {
          setState({ status: 'pending', assessmentId: assessment.id });
          setRelectureEnEchec(false);
          return;
        }

        // Check-ins en attente (boucle hebdo domicile-travail + boucle mensuelle extras,
        // cf. generate_commute_checkins/generate_extras_checkins). Les périodes révolues sont
        // clôturées côté serveur en `expired` (migration 20260904180000) : sans ça, un
        // utilisateur absent huit semaines retrouvait huit cartes identiques.
        //
        // Le `keepLatestPerLoop` ci-dessous est une ceinture en plus de cette bretelle : si un
        // passage de cron était manqué, la table pourrait de nouveau porter deux périodes en
        // attente pour une même boucle. On n'affiche jamais qu'une question vivante par boucle,
        // la plus récente — une pile de rappels est le contraire de ce que cette boucle promet.
        //
        // Une erreur ici compte autant que les deux autres : sans les points, la carte d'attente
        // prend leur place et Ramille dit qu'il n'y a rien à rattraper le jour où la question
        // est justement ouverte.
        const { data: checkins, error: erreurCheckins } = await supabase
          .from('engagement_checkins')
          // `committed_question` d'abord : c'est la question **figée** à la génération, celle que
          // le rappel a envoyée (C2.1). La carte l'affiche telle quelle plutôt que de la
          // recomposer, pour qu'elle ne puisse pas différer d'un caractère de la notification
          // qu'on vient d'ouvrir. `committed_action_text` sert à dire, le cas échéant, que la
          // question porte sur une action quittée depuis.
          //
          // `committed_intention_days` n'est **pas** rapatrié, et c'est délibéré : il ne remplirait
          // que la branche à gabarit de `composerQuestionDuPoint`, qu'aucune requête de l'app ne
          // peut atteindre — le gabarit vit sur `action_templates`. La carte n'a besoin que de la
          // question figée.
          .select(
            'id, loop_type, period_label, trip_label, poste, period_start, question_kind, mode, committed_question, committed_action_text, status, response_kind, responded_at'
          )
          // **`answered` autant que `pending` depuis C2.4.** La carte répondue reste le temps de la
          // période : sans les lignes répondues, le renforcement vivait dans un `useState` et
          // disparaissait au premier changement d'onglet — la personne répondait, voyait le mot de
          // Ramille, revenait, et ne trouvait plus rien du tout. `expired` reste dehors : un point
          // que la période suivante a clos n'a rien à montrer.
          .in('status', [STATUT_DU_POINT.enAttente, STATUT_DU_POINT.repondu])
          // La fenêtre borne une lecture qui grossirait sans fin depuis qu'elle prend les points
          // répondus : trois périodes mensuelles couvrent ce dont le second renforcement a besoin.
          .gte('period_start', fenetreDesPoints(new Date(), cyclePrecedent?.period_start))
          .order('period_start', { ascending: false });

        if (cancelled) return;

        if (erreurCheckins) {
          echecDeLecture();
          return;
        }

        // Quelle boucle concerne cette personne, donc quel jour Ramille peut nommer : le point
        // du lundi n'est généré que si un poste domicile-travail existe (v1-12 §3). C'est le
        // prochain contact qui compte, pas l'action engagée.
        //
        // **L'engagement qu'un recalcul a emporté** se lit dans la même fournée (C2.2). Le filtre
        // porte sur la raison : `saison` et `changement` n'ont rien à annoncer — l'une est une
        // reconduction qui a échoué à la frontière d'une saison, l'autre est la décision de la
        // personne elle-même, qu'il serait absurde de lui apprendre. Restent les **deux effets de
        // bord non choisis**, `rebilan` et, depuis C6.4, `contexte` — la liste vit dans
        // `RAISONS_ANNONCABLES` et non ici, la requête et la phrase devant filtrer sur la même.
        //
        // **Et une seconde lecture de la même table, qui n'est pas un doublon** (C5.6) : celle du
        // dessus répond à « quel engagement le dernier re-bilan a-t-il emporté ? », celle du
        // dessous à « cette personne s'est-elle **déjà** engagée, de quelque façon que ce soit ? ».
        // Élargir le filtre de la première casserait l'encart orphelin — qui n'annonce que l'effet
        // de bord non choisi — et la borner à une ligne ne dirait rien de la seconde question. Un
        // `count` en `head` ne ramène aucune ligne : c'est une existence, pas une donnée.
        const [
          { data: resultat, error: erreurResultat },
          { data: contexte },
          { data: orphelins },
          { count: engagementsArchives },
          prefs,
          etatPermission,
        ] = await Promise.all([
            supabase
              .from('assessment_results')
              .select('commute_poste_label')
              .eq('assessment_id', assessment.id)
              .maybeSingle(),
            // **Dans le lot existant, jamais en plus** (C5.5, `v1-17` §7.4) : l'écran se recharge à
            // chaque retour au premier plan — le chemin nominal de la boucle d'engagement, celui
            // qu'on emprunte en appuyant sur une notification — donc une requête en séquence
            // additionnerait sa latence à chaque fois au lieu de se fondre dans le maximum.
            supabase
              .from('assessment_answers')
              .select('zone_type, tc_access, household_vehicles, teletravail')
              .eq('assessment_id', assessment.id)
              .maybeSingle(),
            supabase
              .from('plan_action_commitments_archive')
              .select('id, action_text, released_reason')
              .in('released_reason', RAISONS_ANNONCABLES)
              .order('released_at', { ascending: false })
              .limit(1),
            supabase
              .from('plan_action_commitments_archive')
              .select('id', { count: 'exact', head: true }),
            loadReminderPrefs(),
            lirePermission(),
          ]);

        if (cancelled) return;

        // **La boucle ne se devine pas sur un échec de lecture.** C'était la seule des quatre
        // lectures dont l'`error` restait ignorée, et le repli n'était pas neutre : sans
        // libellé, `boucle` valait `mensuel`, donc la carte d'attente nommait « le 1er du
        // mois » à quelqu'un dont le point s'ouvre le lundi. On préfère ne pas la nommer du
        // tout — `boucle` reste `null`, la carte ne s'affiche pas — plutôt que de remplacer
        // tout le plan par un écran d'erreur pour une lecture secondaire. La ligne de relecture
        // dit que l'écran n'est pas tout à fait à jour.
        if (!erreurResultat) setBoucle(resultat?.commute_poste_label ? 'hebdo' : 'mensuel');
        setRappels(prefs);
        setPermission(etatPermission);

        const orphelin = orphelins?.[0] ?? null;

        const points = (checkins as EngagementCheckin[] | null) ?? [];
        const affiches = keepLatestPerLoop(points);

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
          premierPlan,
        });
        // Écrit une seule fois, après le `setState` : le plan est à jour, sauf si la lecture
        // secondaire ci-dessus a échoué.
        setRelectureEnEchec(Boolean(erreurResultat));
      } catch {
        // Une promesse rejetée — `loadReminderPrefs` ou `lirePermission`, qui touchent un
        // module natif et ne rendent pas d'erreur mais lèvent — laissait l'écran sur
        // « Chargement de ton plan… » pour toujours : le même mensonge par omission, en plus
        // muet. Même leçon que la racine de l'app (07/09/2026).
        echecDeLecture();
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
  const attente = rappels && boucle ? carteAttente({ ...rappels, boucle, permission, plateforme: Platform.OS === 'web' ? 'web' : 'natif' }) : null;

  // Sortie en variable, et pas lue depuis `attente` dans le rendu : le rappel du `TextLink`
  // ferme sur elle, et TypeScript ne conserve pas le rétrécissement d'un **accès de propriété**
  // dans une fermeture — celui d'une `const`, si. Sans ça il faudrait une assertion non-nulle,
  // c'est-à-dire promettre à la main ce que le compilateur sait déjà.
  const porteDeLAttente = attente?.action ?? null;

  const fermerLaFeuille = (canal: CanalPrefere, jetonActif: boolean) => {
    setFeuilleOuverte(false);
    setRappels((p) => (p ? { ...p, prefere: canal, jetonActif } : p));
    void lirePermission().then(setPermission);
  };

  // **Le seul retour visible du bouton de l'écran d'erreur.** `rafraichir` n'incrémente qu'une
  // clé : l'effet relit, échoue, et `echecDeLecture` laisse rigoureusement le même écran —
  // hors ligne, donc dans le seul cas où cet écran existe, le bouton a l'air mort. Repasser par
  // « Chargement… » dit que le geste a été pris.
  //
  // Et surtout pas dans `rafraichir` lui-même, qui est aussi le rappel de
  // `useRafraichirAuRetour` et celui de l'engagement : y remettre `loading` ferait clignoter
  // « Chargement de ton plan… » à chaque retour au premier plan, c'est-à-dire à chaque arrivée
  // par notification.
  const reessayerDepuisLErreur = () => {
    setState({ status: 'loading' });
    rafraichir();
  };

  // Ce qui est affiché reste vrai, mais date. La ligne vaut au-dessus des trois écrans issus
  // d'une lecture réussie — le plan, « en préparation » et « pas encore de bilan » — et le lien
  // relance la même lecture que le retour sur l'onglet.
  const banniereRelecture = (centree = false) =>
    relectureEnEchec || refusDeRemplacement ? (
      <View style={[styles.relecture, centree && styles.relectureCentree]}>
        {refusDeRemplacement && <MessageInline message={refusDeRemplacement} />}
        {relectureEnEchec && (
          <>
            <MessageInline message="Ton plan n’a pas pu être relu à l’instant : ce que tu vois peut avoir changé depuis. Vérifie ta connexion." />
            <TextLink
              label="Réessayer"
              onPress={rafraichir}
              type="small"
              weight={600}
              themeColor="accentText"
            />
          </>
        )}
      </View>
    ) : null;

  if (state.status === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <BandeHaute />
          <View style={styles.centered}>
            <ThemedText themeColor="textSecondary">Chargement de ton plan…</ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (state.status === 'no_assessment') {
    // **Venir d'un rappel et n'avoir aucun bilan ici ne veut pas dire « pas de bilan »** (C2.11,
    // constat C-2). L'email ne porte que `/plan` : ouvert sur un ordinateur ou un téléphone neuf, il
    // tombe sur la session anonyme vide que l'app vient de créer, et cet écran répondait « Ton bilan
    // n'est pas encore fait » — avec pour seul bouton « Faire mon bilan » — à quelqu'un qui a un
    // bilan, un plan et des points, juste pas sur cet appareil. La consigne de désinscription du
    // même email (« depuis Toi ») réglait alors la préférence d'une session qui n'est personne.
    //
    // Le paramètre ne change pas le **chemin** : `assetlinks.json` ne revendique que `/plan`, et son
    // périmètre est volontairement étroit (les pages légales et la suppression de compte doivent
    // rester atteignables sans l'app). Une autre route aurait donc fait ouvrir le lien dans le
    // navigateur sur Android.
    if (vientDUnRappel) {
      return (
        <ThemedView style={styles.container}>
          <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <BandeHaute />
            <View style={styles.emptySafeArea}>
              {banniereRelecture(true)}
              {/* Aucun chiffre sur cet écran : la mascotte peut l'occuper sans rien commenter
                  (règle de `src/constants/mascotte.ts`). Elle ne parle pas pour autant — les deux
                  phrases sont de la voix produit. */}
              <View style={styles.rappelMascotte}>
                <Mascot mood="calm" size={72} tilt={-6} />
              </View>
              <ThemedText type="screenTitle">Ce rappel concerne un compte</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
                Retrouve-le ici. Ton bilan, ton plan et tes points sont rattachés à ce compte, pas à
                cet appareil.
              </ThemedText>
              <Button
                title="J’ai déjà un compte"
                // `rappel` est **la** provenance que C2.11 existe pour produire : quelqu'un qui
                // ouvre le rappel e-mail sur un appareil où il n'est pas connecté. Sans elle, ce
                // chiffre était indiscernable d'une découverte depuis l'onboarding.
                onPress={() =>
                  router.push({ pathname: '/connexion/retrouver', params: { source: 'rappel' } })
                }
                style={styles.emptyButton}
              />
              <TextLink
                label="Commencer un bilan sur cet appareil"
                onPress={() => router.push('/bilan')}
              />
            </View>
          </SafeAreaView>
        </ThemedView>
      );
    }

    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <BandeHaute />
          <View style={styles.emptySafeArea}>
            {banniereRelecture(true)}
            <EmptyStateIllustration style={styles.emptyIllustration} />
            <ThemedText type="screenTitle">
              Ton bilan n’est pas encore fait
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
              Sans bilan, on ne peut pas savoir quel déplacement compte le plus pour toi. Environ 5
              minutes.
            </ThemedText>
            <Button title="Faire mon bilan" onPress={() => router.push('/bilan')} style={styles.emptyButton} />
            {/* **Le chemin vers un compte existant manquait ici**, et c'est le seul écran qu'un
                appareil neuf montre : sans ce lien, quelqu'un qui a un compte n'avait que
                « Faire mon bilan », c'est-à-dire l'invitation à refaire ce qu'il a déjà fait. Même
                lien que l'accueil de l'onboarding, et même libellé. */}
            <TextLink
              label="J’ai déjà un compte"
              onPress={() =>
                router.push({ pathname: '/connexion/retrouver', params: { source: 'plan_vide' } })
              }
            />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // L'écran ne sait rien : il le dit, et il ne propose surtout ni de faire un bilan ni
  // d'attendre — les deux replis d'avant affirmaient quelque chose sur les données de la
  // personne. « Réessayer » relance exactement la lecture que le retour sur l'onglet relance.
  if (state.status === 'erreur_reseau') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <BandeHaute />
          <View style={styles.centered}>
            <MessageInline
              message="Ton plan n’a pas pu être relu. Vérifie ta connexion."
              style={styles.erreurTexte}
            />
            <Button title="Réessayer" onPress={reessayerDepuisLErreur} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // **Cet état était un cul-de-sac, et c'est là qu'atterrissait le bilan fantôme** (A2-2, A3-5) :
  // une phrase, aucun bouton, et rien qui en sorte — ni le retour matériel (on est sur l'onglet
  // racine, il quitte l'app), ni le temps (le cron nocturne ne peut pas générer un plan sans
  // réponses). La personne voyait un plan « en préparation » pour toujours.
  //
  // Deux sorties, et les deux sont vraies maintenant. « Réessayer » a un sens depuis que le plan
  // peut manquer pour une raison passagère : la garde de C1.1 rend le bilan même quand la
  // génération du plan échoue, donc relire peut trouver le cycle que le cron a rattrapé depuis.
  // « Revoir mon bilan » est la sortie qui marche dans tous les cas — le résultat, lui, est bien
  // là, et c'est ce que la personne est venue chercher.
  if (state.status === 'pending') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <BandeHaute />
          <View style={styles.centered}>
            {banniereRelecture(true)}
            <ThemedText themeColor="textSecondary" style={styles.attenteTexte}>
              Ton plan est en cours de préparation, reviens dans un instant.
            </ThemedText>
            <Button title="Réessayer" onPress={rafraichir} style={styles.attenteBouton} />
            <TextLink
              label="Revoir mon bilan"
              onPress={() => router.push({ pathname: '/suivi/bilan', params: { id: state.assessmentId } })}
            />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const { cycle, assessmentId, assessmentDate, checkins, historique, premierPlan } = state;
  const actionsCount = cycle.plan_actions.length;
  const committedActionId = cycle.plan_actions.find((a) => a.committed_at !== null)?.id ?? null;
  // Le libellé de l'action engagée, pour que la carte du point sache si sa question figée porte
  // encore sur elle (C2.1). `null` quand rien n'est engagé, ce qui est aussi un « plus la même ».
  const actionEngageeTexte =
    cycle.plan_actions.find((a) => a.committed_at !== null)?.action_templates?.action_text ?? null;
  // **Deux cartes, et le compte de ce qui attend ailleurs** (C5.2). Le `limit 2` du serveur avait
  // disparu en C4.6 — l'estimateur rendait déjà toutes les actions au gain ≥ 5 kg/an, et le plan en
  // jetait le reste avant même de l'écrire (constat A13-18) — mais l'exhaustivité était revenue
  // s'entasser ici, jusqu'à onze cartes sous un « Replier » hors écran. Elle vit désormais sur
  // `plan/pistes`. La dérivation copie avant de trier : `sort` mute, et `cycle` vient du state.
  const pistes = pistesDuPlan(cycle.plan_actions);
  // Ce que l'écran annonce de lui-même, et ce que son cap a le droit de chiffrer (C3.8 §3). Dérivé
  // dans `src/types/plan.ts` plutôt qu'écrit en ternaires ici — une seule chose en dépend depuis que
  // C5.3 a retiré `intro` et `noteDuCap`, et ce commentaire a longtemps dit « trois phrases » ; c'est
  // c'est la forme qui a laissé l'intro annoncer « pour ton trajet domicile-travail » au-dessus
  // d'actions qui n'en étaient pas.
  const cadre = cadreDuPlan({
    postesEnAvant: pistes.enAvant.map((action) => action.action_templates?.poste ?? null),
    nombreDActions: actionsCount,
  });
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

  const capKg =
    baselineKg !== null && baselineKg > 0
      ? Math.round((baselineKg * cycle.target_reduction_pct) / 100)
      : null;

  // **Le cycle affiché peut être révolu, et l'écran le disait à personne** (C2.2). Le cron
  // nocturne construit le cycle de la saison courante, mais il peut ne pas être passé — et un
  // cycle périmé présenté comme courant fait croire qu'on travaille encore sur une période
  // terminée. On le **dit** plutôt que de retomber sur l'écran d'attente : l'action engagée, les
  // jours choisis et le cap restent à l'écran, parce qu'ils ont eu lieu.
  //
  // La comparaison est en chaînes `YYYY-MM-DD` et non en `Date` : `period_end` vient de Postgres
  // en date nue, et `new Date('2026-11-30')` est minuit UTC — donc la veille, à l'ouest de
  // Greenwich, ce qui ferait annoncer une saison révolue un jour trop tôt.
  const aujourdhui = new Date();
  const dateDuJour = `${aujourdhui.getFullYear()}-${String(aujourdhui.getMonth() + 1).padStart(2, '0')}-${String(aujourdhui.getDate()).padStart(2, '0')}`;
  const cyclePerime = cycle.period_end < dateDuJour;

  // La période a-t-elle un nom de saison ? `rolling_quarter` est dormant (aucun écran ne l'écrit,
  // tous les profils valent `season`) mais la chaîne serveur existe et est testée : trois phrases de
  // cet écran doivent savoir s'en passer plutôt que d'appeler « hiver » un trimestre glissant.
  const cadenceDeSaison = cadenceNommeUneSaison(cycle.cadence_type);
  const finDeLaPeriode = finDePeriodeEnMots(cycle.period_end);
  const progression = progressionDeLaPeriode(cycle.period_start, cycle.period_end, aujourdhui);

  // Les quatre sorties de la carte d'ouverture, dérivées plutôt qu'écrites dans le composant : le
  // canvas suppose une action engagée et reconduite, et deux cas de production ne peuvent pas
  // recevoir ces libellés (rien d'engagé, plan sans action — tout cycliste depuis C2.5).
  const sortiesDeSaison = sortiesDeLouverture({
    actionEngagee: committedActionId !== null,
    nombreDActions: actionsCount,
  });

  // Les quatre sorties referment la carte, et **deux d'entre elles font quelque chose de plus** :
  // « Choisir une action » et « Choisir une autre » déplient les pistes en refermant, sans quoi elles
  // reposent le plan tel qu'il était et ne se distinguent pas de « Reprendre la même action » —
  // c'est-à-dire que le bouton ne fait rien de ce que son libellé annonce. La clé était transmise
  // par le composant et jetée ici, sous un commentaire qui annonçait au futur ce que C4.6 allait
  // ajouter alors que C4.6 est livré dans la même vague (relevé par cinq constats de l'audit, le
  // 14/09/2026).
  //
  // « Reprendre la même action » n'a effectivement rien à faire : C2.2 a déjà reconduit l'engagement.
  // Et la bascule d'engagement se joue sur la carte d'action elle-même, où `commit_plan_action`
  // libère et archive la précédente — d'où le dépli, qui amène simplement ces cartes sous les yeux.
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
    // **Le bouton mène là où l'on choisit** (C5.2). Il dépliait les pistes sous la carte ; depuis
    // qu'elles ont leur écran, il y conduit. C'est la même intention, avec une destination qui
    // existe : une sortie nommée « Choisir une action » qui laisse la personne sur le même écran
    // devant les deux mêmes cartes ne tiendrait pas sa promesse.
    if (cle === 'choisir' || cle === 'choisir_une_autre') router.push('/plan/pistes');
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
  const carteDaction = (action: PisteDuPlan) => (
    <CarteDePiste
      key={action.id}
      action={action}
      committedActionId={committedActionId}
      onEngage={proposerLesRappels}
      onChanged={() => setRefreshKey((key) => key + 1)}
      onRefus={(message) => setRefusDeRemplacement(message)}
    />
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Hors du ScrollView : la bande ne défile pas (cf. bande-haute.tsx). */}
        <BandeHaute />

        {/* Rendue par-dessus le plan plutôt que dans le flux : elle arrive après un geste
            (« C'est noté ») et doit se lire comme un moment, pas comme un encart de plus. */}
        {/* **La feuille ne dépend plus de `boucle`**, et c'est le corollaire du correctif : ce
            qu'elle annonce se dérive du poste de l'action. La garde d'avant faisait qu'un échec
            de lecture secondaire empêchait la cérémonie de s'ouvrir — et comme elle ne s'ouvre
            qu'une fois par appareil, elle était alors perdue pour de bon. */}
        {feuilleOuverte && rappels && (
          <FeuilleRappels
            prefs={rappels}
            boucle={boucleDeLAction(posteEngage)}
            permission={permission}
            onFerme={fermerLaFeuille}
          />
        )}

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Sans cette ligne, une question ouverte depuis et un engagement pris ailleurs
              manqueraient à l'écran sans que rien ne le dise. */}
          {banniereRelecture()}
          {/* Un fait, pas une félicitation : ni mascotte (elle ne commente pas l'état du
              compte), ni exclamation, ni action à faire. */}
          {rattachement !== null && (
            <ThemedView type="backgroundSelected" style={styles.rattachement}>
              <ThemedText type="small" themeColor="accentText">
                {rattachement
                  ? `Ton compte est rattaché à ${rattachement}. Ton bilan te suit d’un appareil à l’autre.`
                  : 'Ton compte est rattaché. Ton bilan te suit d’un appareil à l’autre.'}
              </ThemedText>
            </ThemedView>
          )}
          {/* **Ce qu'un recalcul a emporté, dit une fois** (C2.2, `v1-14` §5 ; étendu par C6.4). Avant, le
              `delete from plan_actions` de la génération effaçait l'engagement, ses jours et son
              intention sans un mot — le geste le plus engageant du produit annulé par le second
              geste le plus encouragé. Il est maintenant archivé, et cet encart est l'endroit où la
              personne l'apprend.

              Discret, et sans mascotte : c'est un fait sur ses données, pas un commentaire. Le
              bouton écrit la marque locale, qui porte l'identifiant de la ligne — un second
              re-bilan pourra donc le dire à son tour. */}
          {orphelin !== null && (
            <ThemedView type="backgroundElement" style={styles.orphelin}>
              <ThemedText type="small" themeColor="textSecondary">
                {phraseDeLOrphelin(orphelin.released_reason, orphelin.action_text)}
              </ThemedText>
              <TextLink
                label="Compris"
                onPress={() => {
                  void marquerEngagementOrphelinVu(orphelin.id);
                  setOrphelin(null);
                }}
              />
            </ThemedView>
          )}

          {/* **Une période terminée se dit, elle ne se masque pas** (C2.2). Retomber sur l'écran
              d'attente ferait disparaître l'action engagée et les jours choisis — ce qui a eu lieu
              n'a pas à s'effacer parce que le cron n'est pas encore passé.

              **La phrase nomme la saison depuis C2.8**, et celle du **jour** : le cycle suivant peut
              ne pas exister encore — le cron nocturne ne passe qu'une fois par nuit — alors que le
              calendrier, lui, a bien tourné. La seconde phrase reste, et elle est ce qui empêche
              « Voir la saison » d'avoir l'air mort : entre minuit et le passage du cron, relire ne
              trouve rien de plus, et la personne sait pourquoi. Jamais une carte remplacée sous les
              yeux — c'est un lien, pas une bascule automatique. */}
          {cyclePerime && (
            <ThemedView type="backgroundElement" style={styles.orphelin}>
              <ThemedText type="small" themeColor="textSecondary">
                {basculeDeSaison(cycle.cadence_type, aujourdhui)} Ton prochain plan arrive ; en
                attendant, voici où tu en étais.
              </ThemedText>
              <TextLink
                label="Voir la saison"
                onPress={rafraichir}
                type="small"
                weight={600}
                themeColor="accentText"
              />
            </ThemedView>
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
          {ouverture !== null && (
            <CarteDOuverture
              ouverture={ouverture}
              sorties={sortiesDeSaison}
              ligne={RAMILLE.ouvertureSaison}
              visage="happy"
              onSortie={(cle) => refermerLouverture(cle)}
            />
          )}

          {/* **La carte du tout premier plan** (C5.6, écart 8, planche B1). Le plan disait la règle
              du jeu nulle part : on arrivait de la restitution devant deux cartes chiffrées, un cap
              et un trait de temps, sans qu'un mot explique qu'on en choisit **une** et que le reste
              du produit tient en un point régulier.

              **Le même composant que la carte de saison**, parce que le canvas décrit les deux
              cadres de la même façon au pixel près : ce qui change est le contenu, dérivé dans
              `src/types/saison.ts`. Et la même règle qu'elle — **elle ne prend jamais la place d'un
              point en attente**, seulement celle de la carte d'attente, sous laquelle Ramille parle
              déjà. Les deux ne peuvent pas coexister : l'une exige un cycle précédent, l'autre
              exige qu'il n'y en ait pas. */}
          {cartePremierPlan !== null && (
            <CarteDOuverture
              ouverture={cartePremierPlan}
              sorties={SORTIE_COMPRIS}
              ligne={RAMILLE.premierPlan}
              visage="happy"
              onSortie={refermerLePremierPlan}
            />
          )}

          {/* **La barre vient d'arriver, et elle se nomme** (C5.7, planche F3). Elle n'apparaît
              qu'une fois, au moment exact où le premier parcours se referme : la personne voit
              apparaître deux lieux en bas de son écran, et la carte dit ce qu'on trouve dans
              chacun. Sans elle, la barre pousserait sans un mot, ce qui est la façon la plus sûre
              de faire d'une navigation à deux entrées une navigation à une.

              **Elle ne se rend que si le parcours s'est terminé sur cet appareil**, jamais sur la
              seule absence d'une marque : `etatDuPremierParcours` en fait un état à part entière,
              et son module dit pourquoi deux booléens l'auraient affichée à tout le monde. Comme
              les deux autres, elle prend la place de la carte d'attente et jamais celle d'un point
              en attente.

              **Elle cède à la carte de saison, et cette garde n'est pas décorative** (contre-lecture
              du lot 5). Je la croyais impossible à croiser : elle l'est avec celle du premier plan,
              qui exige qu'aucun cycle ne précède, mais **pas** avec l'ouverture de saison — il
              suffit d'avoir refermé le premier plan puis de n'être pas revenu avant la bascule
              suivante pour que les deux soient dues le même jour. Deux cadres empilés au-dessus du
              plan, c'est une carte qui explique par-dessus une carte qui annonce ; la nouvelle
              passe devant, celle-ci attendra le prochain passage — sa marque, elle, ne bouge pas. */}
          {ouverture === null && carteDesDeuxLieux && (
            <CarteDOuverture
              ouverture={OUVERTURE_DES_DEUX_LIEUX}
              sorties={SORTIE_DES_DEUX_LIEUX}
              ligne={RAMILLE.planEtSuivi}
              visage="calm"
              onSortie={premierParcours.lesDeuxLieuxSontVus}
            />
          )}

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
                « une action par saison » y serait faux. */}
            <ThemedText type="body" themeColor="textSecondary">
              Une action par {cadenceDeSaison ? 'saison' : 'période'}, une seule. C’est pas à pas
              qu’on tient un cap.
            </ThemedText>
          </View>

          {/* **Le point de la semaine passe en tête** (v1-11 flux 4) : répondre à un rappel est
              la raison de revenir la plus fréquente, et la question vivait sous les actions,
              après le cap — il fallait faire défiler pour la trouver. Une question qu'on ne
              voit pas est une question à laquelle on ne répond pas. */}
          {checkins.length > 0 && (
            <View style={styles.checkins}>
              {checkins.map((checkin) => (
                <CheckinCard
                  key={checkin.id}
                  checkin={checkin}
                  emphasize={checkin.trip_label === cycle.trip_label}
                  actionEngagee={actionEngageeTexte}
                  historique={historique[checkin.loop_type]}
                />
              ))}
            </View>
          )}

          {/* **Ramille dit l'attente, pas le vide** (v1-12 §6.2). « Rien à rattraper. »
              vivait ici et se lisait comme une attente déçue la première fois qu'on la
              voyait — retour d'appareil du 07/09. Elle nomme maintenant le jour où elle
              revient, ce que le rythme fixe du produit (lundi, premier du mois) lui permet
              de faire sans jamais compter.

              Le détail sous sa phrase est **du produit, pas d'elle** : une adresse peut
              porter un chiffre, et elle n'en dit jamais.

              Posée **au-dessus** du cap et non à côté : la règle « jamais la mascotte près
              d'un chiffre lourd » vise l'empreinte, mais un cap en kilos juste sous son
              visage donnerait l'impression qu'elle le commente. */}
          {checkins.length === 0 &&
            attente &&
            ouverture === null &&
            cartePremierPlan === null &&
            !carteDesDeuxLieux && (
            <ThemedView type="backgroundElement" style={styles.calmeCard}>
              <View style={styles.calmeRow}>
                <Mascot mood="resting" size={40} />
                <View style={styles.calmeTexte}>
                  <ThemedText weight={600}>{RAMILLE[attente.cle]}</ThemedText>
                  {attente.detail && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {attente.detail}
                    </ThemedText>
                  )}

                  {/* **La porte, sous la ligne qui la porte** (13.4, recette web du 16/09/2026).
                      « Rattache un compte pour recevoir le mot par email. » disait quoi faire et
                      n'offrait aucun moyen de le faire : le seul chemin était l'icône de compte
                      en haut à droite, que rien n'explique.

                      Un lien, et non la carte entière rendue `Pressable` : trois des six
                      variantes n'ont rien à offrir — elles deviendraient une cible morte — et un
                      `Pressable` à trois textes impose un `accessibilityLabel` qui les
                      recompose, ce que la règle T11 ne tolère qu'en dernier recours. Ici le
                      libellé annoncé **est** le texte affiché.

                      Même forme que le lien « Ouvrir les réglages du téléphone » des rappels :
                      rendu sous la ligne qui l'appelle, jamais après le groupe. */}
                  {porteDeLAttente && (
                    <TextLink
                      label={porteDeLAttente.libelle}
                      onPress={() => router.push(porteDeLAttente.vers)}
                      role="link"
                      hint="Ouvre l’écran « Toi »."
                      type="small"
                      weight={600}
                      themeColor="accentText"
                      containerStyle={styles.calmePorte}
                    />
                  )}
                </View>
              </View>
            </ThemedView>
          )}

          {/* Le cap de la saison (T10). Affiché en kg parce que c'est l'unité des actions
              juste en dessous : la personne doit pouvoir voir d'un coup d'œil qu'en cumulant
              deux actions elle l'atteint — ou ne l'atteint pas, ce qui est une information
              tout aussi utile et jamais présentée comme un échec.

              **Elle porte la période et sa fin depuis C2.8**, et c'est ce qui lui manquait : le cap
              était annoncé puis abandonné, `period_end` étant écrit à chaque génération et lu par
              aucun écran (constat A8-8). Une échéance sans date n'en est pas une.

              La carte se rend **même sans cap** — `baseline_co2_kg_year` peut valoir zéro, ce qui est
              le cas d'un profil sans émission sur son poste dominant — parce qu'elle est devenue
              l'endroit où la période se nomme. La puce « Cadence : Automne 2026 » a donc disparu de
              l'intro : elle disait la même chose dans un vocabulaire de réglage, et la répéter à deux
              endroits de l'écran était le plus sûr moyen de les voir un jour se contredire.

              Le trait de temps **mesure la saison, pas la personne** : `accentMuted` et jamais
              `accent`, et la légende le dit en mots. Confondre les deux ferait de chaque semaine
              écoulée un retard. */}
          <ThemedView type="backgroundSelected" style={styles.capCard}>
            {capKg !== null && cadre.chiffreLeCap && (
              <>
                <ThemedText type="small" weight={600} themeColor="accentText">
                  Ton cap pour cette {cadenceDeSaison ? 'saison' : 'période'}
                </ThemedText>
                <ThemedText type="salient">
                  − {formatKg(capKg)} kg
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  soit − {Math.round(cycle.target_reduction_pct)} % sur {formeInserable(cycle.poste)}
                  {baselineKg !== null ? ` (${formatTonnes(baselineKg)} aujourd’hui)` : ''}
                </ThemedText>
                {/* **La note qui suivait ici a été retirée** (C5.3, écart 7) — « Le cap porte sur
                    tes voyages ; cette action porte ailleurs. » Elle énonçait une règle que rien
                    n'applique : le cap est une quantité à atteindre, et aucun endroit du produit ne
                    vérifie d'où vient la réduction. Elle était rare tant que le poste dominant
                    remplissait les deux premières cartes ; le classement de C5.1 l'aurait réveillée
                    sur la plupart des plans, les meilleurs leviers venant souvent d'ailleurs. */}
              </>
            )}
            <View style={styles.capPeriode}>
              <ThemedText type="small" themeColor="textSecondary">
                {cycle.period_label}
              </ThemedText>
              {finDeLaPeriode && (
                <ThemedText type="small" weight={600} themeColor="accentText">
                  {finDeLaPeriode}
                </ThemedText>
              )}
            </View>
            {/* **Le trait attend qu'il y ait quelque chose à mesurer** (C5.6). Au tout premier
                plan il annoncerait un temps qui s'écoule sur une action qu'on n'a pas encore
                choisie — c'est-à-dire un compte à rebours, exactement ce que sa légende jure qu'il
                n'est pas. La période et sa fin, elles, restent : elles disent le cadre, pas une
                avance.

                Le canvas écrit la condition `progression !== null && (engagement || !premierPlan)`.
                La moitié `engagement ||` est **impliquée par la seconde** — un engagement rend
                `estPremierPlan` faux par sa deuxième condition, et un test le dit — donc on garde
                la forme courte plutôt qu'une clause qu'aucun cas ne peut exercer. La légende
                disparaît **avec** le trait : seule, elle commenterait quelque chose qui n'est pas
                là. */}
            {progression !== null && !premierPlan && (
              <>
                <TraitDeTemps progression={progression} />
                <ThemedText themeColor="textTertiary" style={styles.capLegende}>
                  {cadenceDeSaison ? 'La saison avance' : 'La période avance'} ; le trait mesure le
                  temps, pas toi.
                </ThemedText>
              </>
            )}
          </ThemedView>

          {/* L'action engagée passe en tête : c'est la réponse à « qu'est-ce que je fais en ce
              moment ? », elle n'a pas à être cherchée. Le reste suit le `rank` du serveur, qui porte
              déjà le bon ordre — poste dominant d'abord, puis gain décroissant. */}
          <View style={styles.actions}>
            {pistes.enAvant.map((action) => carteDaction(action))}
          </View>

          {/* **Toutes les pistes, sur un écran à elles** (C5.2, écarts 2 à 5). Le plan en
              montrait deux, puis dépliait jusqu'à onze cartes sous un « Replier » sorti de l'écran :
              l'insistance et l'exhaustivité tenaient sur la même surface, et l'exhaustivité gagnait.
              Elles se séparent — deux cartes ici, tout là-bas, groupé par poste.

              Le compte reste **dans** le libellé, et c'est le total : un lien qui ne dit pas combien
              il mène à voir n'aide pas à décider de l'ouvrir. Il ne se rend que s'il y a plus à voir
              que les deux cartes — sinon il promettrait un écran qui répète celui-ci. */}
          {pistes.masquees > 0 && (
            <View style={styles.pistes}>
              <TextLink
                label={`Voir toutes les pistes · ${actionsCount}`}
                onPress={() => router.push('/plan/pistes')}
                type="small"
                weight={600}
                themeColor="accentText"
                style={styles.lienPistes}
              />
            </View>
          )}

          {/* **L'encart de contexte, et sa porte** (C5.5, écarts 9 et 10). C'est la moitié « plan »
              du constat 13.1 : « Parfois » au télétravail coûtait une action, et rien ne le disait.
              La restriction se dit donc **après**, sur un écran qu'on relit — dite au moment du
              choix, elle apprend à répondre haut ; dite ici, elle informe sans marchander.

              **Il ne nomme jamais l'action écartée ni son gain**, et c'est la contrainte du
              chantier : ce serait la liste des portes fermées pour qui a répondu juste, et un prix
              affiché sur une réponse pour les autres. Il dit sur quoi le plan s'appuie, la porte
              permet de corriger, rien de plus.

              **Jamais sur un plan à zéro action** : il n'a rien à expliquer, et la carte de
              félicitation juste en dessous serait la dernière chose à nuancer. Et jamais non plus
              quand il n'y a rien à énumérer — une lecture qui a échoué ne devient pas une phrase
              vide (C1.4). */}
          {actionsCount > 0 && motsDuContexte(state.contexte ?? VIDE_DE_CONTEXTE).length > 0 && (
            <ThemedView type="backgroundElement" style={styles.contexteCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Ton plan tient compte de ton contexte :{' '}
                {motsDuContexte(state.contexte ?? VIDE_DE_CONTEXTE).join(', ')}. Ce qui ne tient pas
                avec ces réponses n’est pas proposé.
              </ThemedText>
              {/* La porte se rend **sous** la phrase qui la porte, comme le lien des réglages du
                  téléphone et celui de la carte d'attente : détachée, elle se lirait comme
                  appartenant à ce qui suit. */}
              <TextLink
                label="Modifier ces réponses"
                onPress={() => router.push('/contexte')}
                type="small"
                weight={600}
                themeColor="accentText"
                style={styles.contextePorte}
              />
            </ThemedView>
          )}

          {/* Profil qui n'a plus rien à céder sur son poste dominant. Le pire accueil
              possible serait une liste vide : c'est la personne qui fait déjà le plus
              d'efforts. Même principe que le T8 de l'audit sur la restitution. */}
          {actionsCount === 0 && (
            <ThemedView type="backgroundElement" style={styles.emptyActionsCard}>
              <View style={styles.praiseRow}>
                <Mascot mood="happy" size={36} />
                <ThemedText type="cardTitle" style={styles.praiseText}>
                  Tu fais déjà l’essentiel sur ce poste.
                </ThemedText>
              </View>
              <ThemedText type="body" themeColor="textSecondary">
                Aucun changement de mode ne te ferait gagner assez pour valoir la peine d’être
                proposé. Le check-in reste là si tu veux garder un œil dessus.
              </ThemedText>
            </ThemedView>
          )}

          {/* La provenance du chiffre, à l'endroit où il engage le plus. Le produit vise un
              registre institutionnel : une estimation présentée comme une mesure serait le
              premier endroit où la crédibilité se casse. */}
          {actionsCount > 0 && (
            <ThemedText type="code" themeColor="textTertiary" style={styles.disclaimer}>
              Estimations sur la base des facteurs ADEME et de tes réponses. Un ordre de
              grandeur pour choisir, pas une mesure.
            </ThemedText>
          )}

          {/* La proposition de re-bilan ferme l'écran (v1-11 flux 2). Elle apparaît au plus
              deux fois par an : la faire passer devant la question de la semaine ou devant
              l'action engagée inverserait l'urgence. « Une proposition, jamais un rappel
              insistant » — même règle que sur le suivi, même seuil, même lien.

              **Elle disait le fait et non la saison, et la prémisse s'est inversée** (C2.8 point 3,
              puis contre-lecture du 19/09/2026). Son titre était « Une nouvelle saison a commencé »,
              ce qui pouvait être faux : la carte se déclenchait alors sur 182 jours d'ancienneté du
              bilan, pas sur une bascule. **C6.3 a fait exactement l'inverse** — le déclencheur est
              la bascule — donc c'est l'âge qui est devenu la chose qui peut être fausse, jusqu'à
              « Ton bilan a moins d'un mois » sous une invitation à en refaire un. Le titre vient
              maintenant de `titreDuRebilan`, partagé avec le suivi, qui donne à chaque régime ce
              qu'il peut dire de vrai. La puce « Cadence : Été 2026 » avec laquelle il ne fallait pas
              coexister a, elle, disparu avec C2.8. Fond `backgroundElement`
              plutôt que `backgroundSelected` (canvas B1) : une proposition, pas une mise en avant. */}
          {titreRebilan !== null && (
            <ThemedView type="backgroundElement" style={styles.rebilanCard}>
              <ThemedText type="small" themeColor="textSecondary">
                {titreRebilan} En faire un nouveau prend quelques minutes ; ton plan s’ajuste.
              </ThemedText>
              {/* **« Refaire » laissait croire à un écrasement** (C6.1, `v1-19` D1) : un nouveau
                  bilan s'ajoute, il n'efface rien. Le libellé est le même sur les deux écrans qui
                  portent cette porte, et c'est voulu — deux mots différents pour un même geste se
                  liraient comme deux gestes. */}
              <TextLink
                label="Faire un nouveau bilan"
                onPress={() => router.push('/bilan')}
                role="link"
                type="small"
                weight={600}
                themeColor="accentText"
              />
            </ThemedView>
          )}

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
            onPress={() => router.push({ pathname: '/suivi/bilan', params: { id: assessmentId } })}
            role="link"
            type="small"
            themeColor="textTertiary"
            style={styles.lienBilan}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  // La phrase au-dessus des deux sorties : centrée comme le conteneur, mais elle a besoin de
  // son propre espace sous elle, sinon le bouton la touche.
  attenteTexte: { textAlign: 'center', paddingHorizontal: Spacing.four, marginBottom: Spacing.four },
  attenteBouton: { marginBottom: Spacing.three },
  // Le corps d'un état plein écran, comme les états vides voisins : `MessageInline` rend du
  // « small » par défaut, ce qui se lit comme une note sous un bouton — pas comme la seule
  // phrase de l'écran.
  //
  // 16/24, c'est la taille du `default` de `ThemedText`, pas `TypeScale.body` (15/22) : deux
  // valeurs nues, recopiées à l'identique sur l'onglet voisin (`suivi/index.tsx`). L'endroit
  // où les factoriser est un `type` sur `MessageInline`, qui n'appartient pas à ce chantier —
  // le prochain passage visuel saura quoi faire de ces deux lignes.
  erreurTexte: {
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
    fontSize: 16,
    lineHeight: 24,
  },
  relecture: { gap: Spacing.one },
  // La même ligne au-dessus d'un écran centré : elle a besoin de son propre air sous elle.
  relectureCentree: { alignItems: 'center', marginBottom: Spacing.four },
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
  rattachement: { borderRadius: Radius.field, paddingVertical: 12, paddingHorizontal: Spacing.three },
  // Les deux encarts de C2.2 : le même gabarit discret, parce qu'ils disent la même sorte de
  // chose — un fait sur l'état du plan, jamais une injonction.
  orphelin: {
    borderRadius: Radius.field,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  capCard: { borderRadius: Radius.card, padding: 20, gap: 6 },
  // La période à gauche, sa fin à droite : `baseline` et non `center`, pour que les deux lignes
  // s'alignent sur leur texte et non sur leur boîte. `flexWrap` parce que le texte suit
  // l'agrandissement des polices du système, que rien dans le produit ne plafonne (A10-21) : à
  // 200 %, « Hiver 2026-2027 » et « jusqu'au 28 février » ne tiennent plus sur une ligne, et une
  // rangée sans retour les tronquerait au lieu de les empiler.
  capPeriode: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  // 12/16 : la seule occurrence de cette taille dans l'écran, donc elle reste en dur — la nommer
  // dans `theme.ts` encoderait une équivalence avec les autres légendes qui n'existe pas encore.
  capLegende: { fontSize: 12, lineHeight: 16 },
  actions: { gap: Spacing.two + 2 },
  pistes: { gap: Spacing.two + 2 },
  lienPistes: { textAlign: 'center' },
  // Les lignes simples : un filet entre elles suffit, elles ne sont pas des cartes. Le `gap`
  // reste donc à zéro, et l'écart ne se pose qu'aux frontières qui touchent une carte dépliée
  // (`pisteSeparee`, décidée au rendu — le conteneur ne sait pas lesquelles sont ouvertes).
  contexteCard: { borderRadius: Radius.card, padding: 20, gap: Spacing.two },
  // `alignSelf` pour que la cible de 44 px du lien ne s'étende pas sur toute la largeur de la
  // carte : une zone tactile plus large que son texte se touche par accident.
  contextePorte: { alignSelf: 'flex-start' },
  emptyActionsCard: { borderRadius: Radius.card, padding: 20, gap: 8 },
  praiseRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  praiseText: { flex: 1, minWidth: 0 },
  disclaimer: { lineHeight: 18 },
  checkins: { gap: Spacing.two + 2 },
  calmeCard: { borderRadius: Radius.card, padding: 20 },
  rebilanCard: { borderRadius: Radius.card, padding: 20, gap: Spacing.two },
  calmeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  calmeTexte: { flex: 1, minWidth: 0, gap: 2 },
  // `alignSelf` pour que la cible de 44 px du lien ne s'étende pas sur toute la largeur de la
  // carte : une zone tactile plus large que son texte se touche par accident.
  calmePorte: { alignSelf: 'flex-start' },
  lienBilan: { textAlign: 'center' },
  emptySafeArea: { flex: 1, padding: Spacing.four, justifyContent: 'center', gap: Spacing.three },
  // La mascotte prend la place de l'illustration d'état vide : centrée comme elle l'était.
  rappelMascotte: { alignItems: 'center' },
  emptyIllustration: { height: 140 },
  emptyBody: { fontSize: 16, lineHeight: 24 },
  emptyButton: { marginTop: 12 },
});
