import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CommuteDaysDistanceStep } from '@/components/bilan/steps/commute-days-distance';
import { CommuteExtraStep } from '@/components/bilan/steps/commute-extra';
import { CommuteHasTripStep } from '@/components/bilan/steps/commute-has-trip';
import { CommuteModeStep } from '@/components/bilan/steps/commute-mode';
import { ContextStep } from '@/components/bilan/steps/context';
import { FlightsStep } from '@/components/bilan/steps/flights';
import { LeisureDetailStep } from '@/components/bilan/steps/leisure-detail';
import { LeisureFrequencyStep } from '@/components/bilan/steps/leisure-frequency';
import { LongTripsStep } from '@/components/bilan/steps/long-trips';
import { CalculEnCours } from '@/components/bilan/calcul-en-cours';
import { FeuilleNouveauBilan } from '@/components/bilan/feuille-nouveau-bilan';
import { ProgressHeader } from '@/components/bilan/progress-header';
import { StepShell } from '@/components/bilan/step-shell';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { RAMILLE } from '@/constants/mascotte';
import { useRetourVersLaPhasePrecedente } from '@/hooks/use-retour-vers-la-phase-precedente';
import { track } from '@/lib/analytics';
import { clearBilanDraft, loadBilanDraft, saveBilanDraft } from '@/lib/bilan-draft';
import { loadLastSubmittedAnswers } from '@/lib/bilan-history';
import { lireLEngagementEnCours } from '@/lib/engagement-en-cours';
import { aDejaVuUnBilan, marquerQuIlYAUnBilan } from '@/lib/marque-de-bilan';
import { revenirOu } from '@/lib/navigation';
import { lireLePremierParcours, noterLePremierParcours } from '@/lib/premier-parcours';
import { ensureSession, supabase } from '@/lib/supabase';
import { type EngagementEnCours } from '@/types/rebilan';
import { genreErreurSoumission, type EtapeSoumission } from '@/types/soumission';
import {
  BILAN_SECTION_LABEL,
  BILAN_STEP_ORDER,
  EMPTY_BILAN_ANSWERS,
  avancementDeLaReprise,
  brouillonEstAncien,
  compteursApresLaReponse,
  distanceDomicileTravailKm,
  distanceSortieKm,
  issueDuSuivant,
  manqueDeLEtape,
  memesReponses,
  normaliserReponses,
  previousStep,
  reponseAuxLongsTrajets,
  type BilanAnswers,
  type BilanStepId,
  type HorsColonnes,
  visibleSteps,
  STATUT_DE_BILAN,
} from '@/types/bilan';
import { decrireErreur } from '@/types/erreur';
import { sensDuPassage, type Sens } from '@/types/mouvement';
import { ouvreUnPremierParcours } from '@/types/premier-parcours';

/** Le retour matériel pendant le calcul : l'appui est pris et rien ne se passe (`retourMateriel`, plus bas). */
const consommerLAppui = () => {};

// Questionnaire du bilan (9 pas maximum, branchements B1.1/B2.1) — état local pour
// toute la traversée, un seul aller-retour serveur à la soumission (cf. commentaire
// bilan-draft.ts : `assessment_answers.leisure_frequency` est NOT NULL sans défaut, un
// upsert partiel avant l'étape 5 échouerait de toute façon). La reprise après
// interruption est couverte par un brouillon local (AsyncStorage), pas par un état
// serveur intermédiaire.
export default function BilanQuestionnaire() {
  // Posé par la racine quand elle a trouvé un brouillon : elle a sauté l'onboarding, donc c'est
  // ici qu'il faut dire où l'on en était. Le paramètre ne fait rien tout seul — il faut aussi
  // qu'un brouillon soit réellement relu, sinon un lien recopié afficherait un écran de reprise
  // sur un questionnaire vierge.
  const { reprise, etape } = useLocalSearchParams<{ reprise?: string; etape?: string }>();
  const [answers, setAnswers] = useState<BilanAnswers>(EMPTY_BILAN_ANSWERS);
  const [step, setStep] = useState<BilanStepId>('commute_has_trip');
  // Le côté d'où arrive l'étape affichée (`v1-30` §5.6), posé par les seuls gestes de la personne :
  // la reprise d'un brouillon et la porte `?etape=` changent d'étape sans mouvement.
  const [sens, setSens] = useState<Sens | null>(null);
  const passerA = (vers: BilanStepId) => {
    setSens(sensDuPassage(step, vers, BILAN_STEP_ORDER));
    setStep(vers);
  };
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  // Réponses du dernier bilan, quand elles sont offrables en alternative sur l'écran de reprise.
  // `null` = il n'y a rien vers quoi repartir, et le second bouton ne se rend pas — jamais que
  // l'écran ne s'affiche pas : depuis C3.9 ce sont **deux faits distincts**, et les confondre
  // réservait la reprise à ceux qui avaient déjà soumis un bilan.
  const [repriseDepuis, setRepriseDepuis] = useState<BilanAnswers | null>(null);
  // L'écran de reprise s'affiche-t-il ? Deux chemins y mènent, et ils ne se recouvrent pas :
  // la racine qui a trouvé un brouillon (`?reprise=1`, C3.9) et un brouillon de plus de trois
  // semaines (C1.3, audit A2-6), qui peut arriver par n'importe quelle autre porte.
  const [montrerLaReprise, setMontrerLaReprise] = useState(false);
  // Vrai dès que la lecture du dernier bilan a tranché : on sait si l'écran de reprise
  // s'affiche, donc quelle étape la personne va réellement voir. C'est ce que l'entonnoir
  // attend, cf. son commentaire plus bas.
  const [repriseResolue, setRepriseResolue] = useState(false);

  // **L'étape d'entrée de la visite** (01/10/2026, `v1-33` D3) : celle que la personne voit en arrivant,
  // retenue au premier rendu après la lecture du brouillon — qui a posé l'étape où l'on s'était arrêté,
  // ou celle que demande `?etape=`. Le bandeau du re-bilan ne se rend qu'à elle : répété sur les neuf
  // étapes, il devenait un bandeau qu'on ne lit plus, et ses 76 px faisaient passer la liste des modes
  // sous le pied. Ce qu'on accepte en échange : qui reprend un re-bilan au milieu ne le relit pas — il
  // voit ses réponses cochées. Retenue au rendu et non dans un effet, comme la demande de `StepShell` :
  // un effet laisserait une image sans bandeau.
  const [etapeDEntree, setEtapeDEntree] = useState<BilanStepId | null>(null);
  if (draftLoaded && etapeDEntree === null) setEtapeDEntree(step);

  // Deux raisons de tenir ces deux drapeaux hors de l'état : ils décident d'écritures, pas
  // d'affichage, et ils doivent être lus par des effets sans relancer de rendu.
  //
  // `reponseModifiee` arme la sauvegarde du brouillon. Elle se déclenchait dès que la lecture
  // du brouillon était finie, donc **ouvrir `/bilan` et repartir suffisait à en créer un** —
  // et comme le brouillon est la première source de préremplissage, la visite suivante entrait
  // par cette branche, sans bandeau. Le vrai dommage n'est pas la bannière perdue : c'est le
  // re-bilan à demi modifié qui devient des semaines plus tard la base du bilan suivant et
  // fausse la comparaison du suivi (audit A2-6).
  const reponseModifiee = useRef(false);
  // `brouillonExistant` garde la sauvegarde armée pour un brouillon déjà écrit : il faut
  // continuer à y suivre l'étape courante, sinon reprendre un questionnaire puis le quitter
  // sans rien changer le ramènerait à l'étape d'avant.
  const brouillonExistant = useRef(false);
  // Horodatage du brouillon tel qu'il a été relu, reconduit à chaque écriture qui ne fait que
  // suivre l'étape : sinon la seule ouverture de l'écran redate le brouillon, et un brouillon
  // de plusieurs semaines ne serait proposé au choix qu'une fois — à la visite suivante il
  // passerait pour écrit du jour (audit A2-6).
  const savedAtCharge = useRef<string | null>(null);

  // Trois sources possibles, dans cet ordre de priorité :
  //
  //  1. un brouillon local, s'il y en a un — un questionnaire interrompu se reprend là où
  //     il s'est arrêté, promesse déjà faite dans l'onboarding ;
  //  2. sinon, les réponses du dernier bilan complété — c'est le re-bilan (v1-07 T7). Sans
  //     ça, « Modifier mes réponses » et le re-bilan périodique repartaient d'un
  //     questionnaire vide : neuf étapes à retaper pour corriger une ligne, alors que
  //     comparer deux bilans dans le temps est précisément ce que le suivi promet ;
  //  3. sinon, un questionnaire vide (premier bilan).
  //
  // Le brouillon prime sur le dernier bilan : il est plus récent par construction, et il
  // porte peut-être déjà des modifications que la personne est en train de faire.
  //
  // Le dernier bilan est relu **même quand un brouillon existe**, pour deux choses que le
  // brouillon seul ne peut pas dire : si le brouillon n'est rien d'autre que ce dernier bilan
  // rechargé (alors le bandeau de préremplissage reste vrai), et vers quoi repartir si le
  // brouillon a plusieurs semaines. La lecture du brouillon ne l'attend pas : elle débloque
  // l'écran, et ce second aller-retour ne fait qu'affiner ce qui est déjà affiché — hors ligne
  // il rend `null` et rien ne change.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const draft = await loadBilanDraft();
      if (cancelled) return;
      if (draft) {
        setAnswers(draft.answers);
        setStep(draft.step);
        brouillonExistant.current = true;
        savedAtCharge.current = draft.savedAt;
        // Premier des deux chemins : la racine a trouvé ce brouillon et nous a envoyés ici
        // directement. L'écran s'affiche **avant** le second aller-retour serveur, qui ne fera
        // qu'ajouter le bouton de repli s'il y a un bilan précédent — attendre la réponse
        // réseau pour afficher une phrase qu'on peut déjà écrire ferait clignoter l'entrée.
        if (reprise === '1') setMontrerLaReprise(true);
      }

      // **La porte de l'encart du plan** (C5.5) : `?etape=context` ouvre le questionnaire là où la
      // personne veut corriger, prérempli dans l'ordre habituel (brouillon > dernier bilan > vide).
      //
      // Elle passe **après** la relecture du brouillon, qui pose l'étape où l'on s'était arrêté :
      // dans l'autre ordre, arriver par la porte sur un questionnaire interrompu ramènerait à
      // l'étape du brouillon plutôt qu'à celle demandée, ce qui est exactement ce que la porte
      // promet de ne pas faire.
      //
      // Le paramètre est **vérifié contre les étapes visibles pour ces réponses-là**, et non
      // contre la liste complète (corrigé par la contre-lecture du lot 5). C5.5 le validait contre
      // `BILAN_STEP_ORDER`, ce qui suffit pour la porte — qui n'émet que `context`, toujours
      // visible — mais pas pour l'adresse, qui existe sur web et se tape : `?etape=commute_mode`
      // sur un profil sans trajet régulier ouvrait une étape que son parcours saute, numérotée
      // « Étape 1 sur 6 » par le repli de l'en-tête. Inconnue ou invisible, l'étape est ignorée et
      // le questionnaire s'ouvre normalement, ce qui n'affirme rien de faux.
      //
      // Les réponses lues ici sont celles du brouillon s'il y en a un, sinon les réponses vides :
      // le bilan précédent n'arrive qu'après, et il ne change la visibilité d'une étape que dans le
      // sens où elle en ouvre **plus**. Une étape refusée ici pour un questionnaire vierge l'aurait
      // été de toute façon — c'est le même préremplissage qui décide des deux.
      //
      // **Plus aucun écran du produit n'émet ce paramètre depuis C6.4** — « Modifier ces réponses »
      // ouvre `/contexte`, qui corrige le contexte sans resoumettre de bilan. Il reste malgré tout,
      // et ce n'est pas un oubli : sur web l'adresse **se tape**, donc la validation ci-dessous
      // garde quelque chose que personne n'émet mais que n'importe qui peut atteindre. Le retirer
      // ne supprimerait pas le cas, il supprimerait la garde.
      const reponsesPourLaVisibilite = draft ? draft.answers : EMPTY_BILAN_ANSWERS;
      if (
        etape !== undefined &&
        visibleSteps(reponsesPourLaVisibilite).some((connue) => connue === etape)
      ) {
        setStep(etape as BilanStepId);
      }

      setDraftLoaded(true);

      // Enveloppé, parce que cette lecture n'est plus seulement celle du préremplissage : un
      // échec ne doit pas pouvoir coûter un questionnaire déjà affiché et déjà utilisable.
      const previousAnswers = await loadLastSubmittedAnswers().catch(() => null);
      if (cancelled) return;

      if (previousAnswers !== null) {
        // Un bilan soumis avant les règles d'aujourd'hui peut porter un état qu'elles
        // n'autorisent plus (les deux jambes sur « voiture », par exemple) : il se normalise
        // comme un brouillon, sinon le re-bilan repartirait de l'incohérence.
        const precedent = normaliserReponses(previousAnswers);

        if (!draft) {
          // La personne a pu commencer à répondre pendant cet aller-retour : on ne remplace
          // jamais une réponse qu'elle vient de donner par un préremplissage.
          if (!reponseModifiee.current) {
            setAnswers(precedent);
            setPrefilled(true);
          }
        } else if (memesReponses(draft.answers, precedent)) {
          setPrefilled(true);
        } else if (brouillonEstAncien(draft, new Date()) && !reponseModifiee.current) {
          // Second chemin, et il survit à C3.9 : un brouillon de plus de trois semaines ne se
          // rouvre pas en silence, **par quelque porte qu'on arrive**. La racine n'est pas la
          // seule — un lien direct, un retour en arrière, une app relancée sur `/bilan`.
          setRepriseDepuis(precedent);
          setMontrerLaReprise(true);
        } else if (reprise === '1') {
          // Arrivé par la racine avec un brouillon récent : l'écran est déjà affiché, et le
          // bilan précédent lui donne son second bouton. Le paramètre est lu et non l'état —
          // celui-ci serait périmé dans cette fermeture, alors que le paramètre ne bouge pas.
          setRepriseDepuis(precedent);
        }
      }

      // Dernière ligne de cette lecture, sur **toutes** ses sorties, y compris quand il n'y a
      // pas de bilan précédent : c'est ce drapeau qui autorise l'entonnoir à compter une
      // étape, et il ne faut pas le poser plus haut.
      setRepriseResolue(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [reprise, etape]);

  useEffect(() => {
    if (!draftLoaded) return;
    if (!reponseModifiee.current && !brouillonExistant.current) return;
    // Tant qu'aucune réponse n'a changé, on reconduit l'horodatage relu : suivre l'étape d'un
    // brouillon qu'on vient d'ouvrir n'est pas un travail de la personne sur son bilan.
    saveBilanDraft({ answers, step }, reponseModifiee.current ? undefined : savedAtCharge.current);
  }, [answers, step, draftLoaded]);

  // Entonnoir du questionnaire (issue #30). Trois précautions, chacune corrige un biais
  // qui serait invisible dans les chiffres :
  //   - attendre `draftLoaded`, sinon un brouillon repris à l'étape 6 émettrait d'abord
  //     l'étape 1 (l'état initial), et l'entonnoir montrerait un abandon qui n'a pas eu lieu ;
  //   - attendre `repriseResolue`, et ne rien compter tant que l'écran de reprise est à
  //     l'écran : l'étape du brouillon partait avant que la reprise soit tranchée, puis celle
  //     du dernier bilan si la personne repartait de lui — deux affichages comptés pour un
  //     seul écran de questionnaire montré ;
  //   - ne compter chaque étape qu'une fois par visite, sinon un aller-retour Précédent /
  //     Suivant gonfle le volume sans rien apprendre — et mange le garde-fou de 500/24 h.
  const etapesVues = useRef(new Set<BilanStepId>());

  // **Le verrou de soumission vit dans une `useRef`, pas dans l'état d'affichage.** `submitting`
  // ne vaut `true` qu'au rendu **suivant** : deux appuis rapprochés sur « Voir mon bilan », ou un
  // double événement de presse, entraient tous les deux dans `submit()` et créaient deux bilans
  // (A2-19). Une ref est lue et écrite dans le même tour de boucle, donc le second appel
  // repart immédiatement. Les deux restent nécessaires — la ref garde la fonction, l'état garde
  // l'écran.
  const soumissionEnCours = useRef(false);

  /**
   * L'engagement exposé au recalcul, et la feuille qui le dit **avant de commencer** (C6.2, `v1-19`
   * D3 et D4 ; déplacée le 01/10/2026, `v1-33` §6).
   *
   * **Il n'est pas « menacé », et le nom le disait à tort** : le serveur le repose sur la ligne du
   * nouveau plan qui porte le même gabarit, et ne l'archive que si ce gabarit n'est plus proposé
   * (`src/types/rebilan.ts`). La feuille annonce donc une règle, pas une perte.
   *
   * **Elle s'ouvrait à la soumission, et c'était la fin qui colorait tout l'effort** (Peak-End) : au
   * terme de neuf étapes, elle disait « ton bilan actuel est toujours juste ». Elle s'ouvre désormais à
   * l'entrée du questionnaire, dès que la lecture a trouvé un engagement de la période courante — les
   * mêmes conditions qu'avant (`engagementDeLaPeriodeCourante`), une fois par visite : « Commencer »
   * la referme et l'on répond, « Pas maintenant » ressort. La soumission ne l'ouvre plus.
   *
   * **Lue au montage, sans attendre personne** : le questionnaire s'affiche aussitôt (bloquer le
   * premier rendu sur une lecture ne résout jamais sur l'export statique, cf. plus bas), et la feuille
   * monte par-dessus quand la réponse arrive — d'ordinaire avant qu'on ait répondu à quoi que ce soit.
   * Plus tard, elle dit encore vrai : rien n'est soumis tant qu'on n'a pas fini.
   *
   * **Un échec de lecture laisse passer**, et c'est le bon sens de l'erreur : la feuille *nomme*
   * l'action et l'intention, donc sans elles elle n'aurait rien à dire — et bloquer un bilan parce
   * qu'on n'a pas su lire un cycle coûterait plus cher que l'information qu'on manque. Le produit
   * garde son filet d'après coup, l'encart orphelin du plan (C2.2).
   */
  const [feuilleDeLEngagement, setFeuilleDeLEngagement] = useState<EngagementEnCours | null>(null);

  useEffect(() => {
    let quitte = false;
    (async () => {
      try {
        await ensureSession();
        // La même lecture que la confirmation du retrait d'un bilan (C4.7), écrite une fois.
        const lecture = await lireLEngagementEnCours();
        // Une soumission déjà partie n'a plus rien à commencer (inatteignable en pratique : neuf
        // étapes ne se traversent pas le temps d'une lecture).
        if (quitte || !lecture.ok || lecture.data === null || soumissionEnCours.current) return;
        setFeuilleDeLEngagement(lecture.data);
      } catch {
        // Voir le commentaire ci-dessus : on laisse passer.
      }
    })();
    return () => {
      quitte = true;
    };
  }, []);

  // Le bilan `in_progress` de la tentative précédente, gardé pour que la reprise ne crée pas un
  // second brouillon côté serveur. Il est aussi relu en base au cas où l'app a été relancée
  // entre-temps : la ref ne survit pas à un redémarrage, la ligne si.
  const bilanEnCours = useRef<string | null>(null);
  useEffect(() => {
    if (!draftLoaded || !repriseResolue || montrerLaReprise) return;
    if (etapesVues.current.has(step)) return;
    etapesVues.current.add(step);
    track('bilan_step_view', { step });
  }, [step, draftLoaded, repriseResolue, montrerLaReprise]);

  // Un seul point d'entrée pour toute modification de réponse : le patch dit ce que la
  // personne vient de choisir, `normaliserReponses` efface ce que ce choix rend impossible.
  // Les écrans ne tiennent plus de liste de remises à zéro — ils en tenaient trois, qui
  // divergeaient déjà (audit A2-17).
  //
  // C'est aussi le seul chemin des gestes : le préremplissage et la relecture d'un brouillon passent
  // par `setAnswers`, jamais par ici. D'où `reponsesDonnees`, que `StepShell` lit pour ne suivre une
  // ouverture — une précision qui s'ouvre, que l'écran remonte pour montrer — que si elle suit une
  // réponse de la personne (`v1-31` §2.7).
  const [reponsesDonnees, setReponsesDonnees] = useState(0);
  const update = (patch: Partial<BilanAnswers>) => {
    reponseModifiee.current = true;
    setReponsesDonnees((n) => n + 1);
    setAnswers((prev) => normaliserReponses({ ...prev, ...patch }));
  };

  // **Le « Oui » aux longs trajets que les compteurs ne disent pas** (`HorsColonnes`, 01/10/2026,
  // `v1-33` D1). « Oui » laisse les trois séries vides, et rien dans les colonnes ne le distingue
  // alors d'une question pas encore vue : il vit ici, à côté des réponses — `BilanAnswers` ne porte
  // que des colonnes, sans quoi l'insert qui le diffuse serait refusé —, et passe à `manqueDeLEtape`
  // comme à l'étape. Il ne survit pas à l'écran, et c'est sans perte : quitté sur « Oui » sans aucun
  // trajet, le questionnaire rouvre la question, à reposer.
  const [ouiAuxLongsTrajets, setOuiAuxLongsTrajets] = useState(false);
  const horsColonnes: HorsColonnes = { ouiAuxLongsTrajets };
  // Les deux ensemble, et par `update` : c'est une réponse donnée, qui arme le défilement à
  // l'ouverture des séries (`reponsesDonnees`) et la sauvegarde du brouillon.
  const repondreAuxLongsTrajets = (oui: boolean) => {
    setOuiAuxLongsTrajets(oui);
    update(compteursApresLaReponse(answers, oui));
  };

  const continuerLeBrouillon = () => setMontrerLaReprise(false);

  const repartirDuDernierBilan = () => {
    if (repriseDepuis === null) return;
    void clearBilanDraft();
    brouillonExistant.current = false;
    savedAtCharge.current = null;
    setAnswers(repriseDepuis);
    // L'étape arrive d'un autre écran, celui de la reprise : c'est un montage et non un passage, donc
    // elle se pose (`v1-30` §5.6) — y calculer un sens la ferait entrer par la gauche au montage.
    setSens(null);
    setStep('commute_has_trip');
    // L'entrée de la visite est désormais celle-ci : c'est là que le bandeau dit le préremplissage.
    setEtapeDEntree('commute_has_trip');
    setPrefilled(true);
    setMontrerLaReprise(false);
  };

  const visible = visibleSteps(answers);
  const stepNumber = Math.max(visible.indexOf(step) + 1, 1);
  const total = visible.length;
  const section = BILAN_SECTION_LABEL[step];
  const isLastStep = step === 'context';

  const handleBack = () => {
    const prev = previousStep(step, answers);
    if (prev) {
      passerA(prev);
    } else {
      router.back();
    }
  };

  // **Le retour matériel d'Android recule d'une étape, comme le bouton « Retour »** (01/10/2026,
  // `v1-33`, Q-4). Le questionnaire est un parcours par étapes dont l'état change sans changer de
  // route : sans ce branchement, le retour quittait la route depuis n'importe quelle étape — et l'app
  // au premier parcours, où la pile ne contient que `/bilan` (`dismissAll()` puis `replace`). Le
  // brouillon survivait, mais la personne avait sous les yeux un « Retour » qui reculait d'une étape
  // et un geste système qui faisait autre chose.
  //
  // Trois cas, et le crochet les lit à l'appui (`use-retour-vers-la-phase-precedente.ts`) :
  //   - **une étape visible derrière** : `handleBack`, la même action que le bouton ;
  //   - **première étape, ou écran de reprise** : `null`, et le retour passe à la navigation. C'est ce
  //     qui quitte l'app au premier parcours et renvoie à l'écran d'origine pour un re-bilan — l'écran
  //     de reprise n'a rien derrière lui, ses deux boutons mènent à un questionnaire ;
  //   - **le calcul en cours** : l'appui est **consommé sans rien faire**. Laisser passer le retour
  //     reculerait la pile pendant que la soumission continue, et le `router.replace` du succès
  //     tomberait alors sur un autre écran que celui qu'on vient de quitter ; le faire reculer d'une
  //     étape changerait l'étape sous un calcul qui l'a déjà lue, et un échec rendrait la personne à
  //     une autre étape que celle qu'elle a soumise.
  //
  // **Une feuille ouverte** (`FeuilleNouveauBilan`, un `Modal`) n'a pas à être exclue ici : Android
  // livre le retour à la boîte de dialogue du `Modal`, qui le rend à son `onRequestClose` sans que
  // l'activité — donc `BackHandler` — en entende parler. Ce branchement ne la prive de rien. Et depuis
  // qu'elle s'ouvre à l'entrée (01/10/2026), ce retour-là ressort du questionnaire, comme « Pas
  // maintenant » : la feuille referme sur l'écran d'où l'on vient, jamais sur la première étape.
  //
  // Les étapes visibles se lisent à chaque rendu : `previousStep` saute celles que les réponses
  // excluent (« Non » à B1.1, loisirs « rarement »), comme le bouton.
  const retourMateriel = submitting
    ? consommerLAppui
    : !montrerLaReprise && previousStep(step, answers) !== null
      ? handleBack
      : null;
  useRetourVersLaPhasePrecedente(retourMateriel);

  // **Ce que fait « Suivant » se décide dans `issueDuSuivant`, pas ici** (29/09/2026, `v1-31` §2.4) :
  // `StepShell` n'appelle déjà pas `onNext` sur une étape incomplète, mais son « Suivant » n'est plus
  // `disabled`, et la dernière étape soumet — d'où cette seconde garde, et à la dernière étape la
  // vérification de **toutes** les étapes visibles, que `?etape=context` permettait de contourner.
  //
  // **Un aiguillage exhaustif, et la soumission nommée** (contre-lecture du 29/09/2026) : le test garde
  // la fonction, pas son appel. Écrit en `if` successifs, tout genre non aiguillé tombait sur la
  // soumission — retirer la ligne d'`attendre` ne faisait rien tomber, et soumettait un bilan
  // incomplet depuis n'importe quelle étape. Ici, un cas oublié ne compile pas (éprouvé : le cas
  // `attendre` retiré, `tsc` refuse `{ genre: "attendre" }` sur le `never`).
  //
  // **La soumission part sans feuille** (01/10/2026, `v1-33` §6) : ce qu'un nouveau bilan fait à
  // l'engagement en cours se dit à l'entrée, avant la première étape — plus au terme de la dernière.
  const handleNext = async () => {
    const issue = issueDuSuivant(step, answers, horsColonnes);
    switch (issue.genre) {
      case 'attendre':
        return;
      case 'passer':
      case 'revenir':
        passerA(issue.vers);
        return;
      case 'soumettre':
        break;
      default: {
        const genreInconnu: never = issue;
        return genreInconnu;
      }
    }

    await submit();
  };

  /**
   * Les trois écritures et le calcul, dans l'ordre qui ne laisse jamais de bilan fantôme.
   *
   * **L'ancienne séquence écrivait `completed` d'abord** : insert en `completed` avec son
   * `submitted_at`, puis les réponses, puis le calcul. Ce qui s'arrêtait entre les deux premières
   * laissait un bilan complété sans réponses ni résultat — et cet état n'est pas inerte : la
   * racine de l'app route sur `status = 'completed'`, donc elle envoyait au plan, qui affichait
   * « Ton plan est en cours de préparation » sans bouton et pour toujours (le cron nocturne
   * boucle lui aussi sur les bilans `completed`, mais il a besoin des réponses) ; le
   * préremplissage du re-bilan ne trouvait rien ; et l'entonnoir comptait un bilan soumis là où
   * il y avait eu une panne. Constats A2-2, A2-19, A2-15.
   *
   * `in_progress` est l'état qui ne déclenche rien : aucune lecture du produit ne le regarde.
   * Le bilan n'existe donc pour l'app qu'une fois ses réponses écrites.
   */
  const submit = async () => {
    // Le verrou avant tout le reste, `setSubmitting` ne valant `true` qu'au rendu suivant.
    if (soumissionEnCours.current) return;
    soumissionEnCours.current = true;

    // Le questionnaire cède la place au calcul ; s'il revient — un échec —, c'est un remontage, et
    // l'étape se pose au lieu de rentrer par la droite au-dessus du message (contre-lecture du
    // 27/09/2026).
    setSens(null);
    setSubmitting(true);
    setMessage(null);
    setDetail(null);

    // Le pas courant, pour que l'échec dise **où** la séquence s'est arrêtée sans avoir à le
    // deviner depuis l'erreur (cf. `src/types/soumission.ts`).
    let etape: EtapeSoumission = 'session';

    try {
      const session = await ensureSession();
      const userId = session?.user.id;
      if (!userId) throw new Error('Session introuvable.');

      etape = 'creation';
      // **La reprise passe par le bilan `in_progress` qui traîne, jamais par sa suppression.**
      // Supprimer demanderait un privilège `delete` sur `assessments` que le lot 0 a retiré à
      // tout le monde, et surtout ne couvrirait pas le cas où l'app est tuée entre deux
      // écritures — aucun code de nettoyage ne tournerait alors jamais. La reprise, elle, couvre
      // les deux. Un `in_progress` oublié ne coûte rien : rien ne le lit.
      let assessmentId = bilanEnCours.current;
      if (assessmentId === null) {
        const { data: repris, error: repriseError } = await supabase
          .from('assessments')
          .select('id')
          .eq('status', STATUT_DE_BILAN.enCours)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (repriseError) throw repriseError;
        assessmentId = repris?.id ?? null;
      }

      if (assessmentId === null) {
        const { data: assessment, error: assessmentError } = await supabase
          .from('assessments')
          .insert({ user_id: userId, status: STATUT_DE_BILAN.enCours })
          .select('id')
          .single();
        if (assessmentError || !assessment) {
          throw assessmentError ?? new Error('Création du bilan impossible.');
        }
        assessmentId = assessment.id;
      }
      bilanEnCours.current = assessmentId;

      etape = 'reponses';
      // `upsert` et non `insert` : `assessment_answers` a `assessment_id` pour clé primaire, donc
      // une reprise dont les réponses étaient déjà écrites buterait sur un doublon (23505). Les
      // réponses de cette tentative-ci sont les bonnes — la personne a pu corriger un champ entre
      // les deux essais.
      //
      // **Une diffusion de `answers`, et non une énumération de colonnes** — corrigé le 21/09/2026
      // en contre-lisant C4.4. Cet objet listait les colonnes une par une, et les cinq réponses
      // neuves du chantier n'y avaient pas été ajoutées : elles étaient posées à l'écran,
      // normalisées, affichées dans un re-bilan… et jetées à la soumission. **Rien ne le disait** —
      // une colonne ajoutée par une migration arrive `optional` dans `Insert`, donc le typecheck
      // reste vert, et le calcul retombe sur le repli, qui est exactement le défaut que le
      // chantier venait de corriger.
      //
      // La diffusion ne garde pas contre l'oubli : elle le rend **impossible**. `BilanAnswers` est
      // un miroir exact des colonnes (relevé le 21/09/2026 : aucune clé qui ne soit une colonne,
      // et seules `assessment_id` et `updated_at` existent en base sans y figurer), donc ajouter
      // une réponse au questionnaire suffit à l'écrire. Ce que ça demande en échange : **ne jamais
      // mettre dans `BilanAnswers` un champ qui n'est pas une colonne** — PostgREST refuserait
      // l'insert entier, et le parcours réel, qui soumet un bilan à chaque PR, le dirait tout de
      // suite (une réponse d'écran sans colonne vit à côté : `HorsColonnes`). Les clés qui suivent
      // ne sont pas des exceptions à la règle : ce sont des valeurs que la colonne exige et que le
      // questionnaire n'a pas sous cette forme.
      const { error: answersError } = await supabase.from('assessment_answers').upsert(
        {
          ...answers,
          assessment_id: assessmentId,
          // **Ce repli est inatteignable, et il est écrit quand même** (`v1-16` §4). Le champ porte
          // un troisième état « pas encore répondu » côté questionnaire, que la colonne n'a pas :
          // elle est `not null`, et c'est voulu — un bilan soumis a toujours une réponse. Aucune
          // des deux branches ne peut produire `null` ici (étape visible ⇒ complète ; étape
          // invisible ⇒ `normaliserReponses` a écrit `false`), mais le typecheck l'exige — et
          // c'est le seul garde qui voit cette dérive, `database.types.ts` étant tenu à la main.
          commute_second_mode_used: answers.commute_second_mode_used ?? false,
          commute_has_regular_trip: answers.commute_has_regular_trip ?? false,
          leisure_frequency: answers.leisure_frequency ?? 'rarely',
          // **Le même repli inatteignable pour le nombre de vols** (01/10/2026, `v1-33` D1) : l'étape
          // est toujours visible et le réclame, donc un bilan soumis en porte un ; la colonne reste
          // `not null default 0`, et le typecheck exige le repli.
          flights_total_per_year: answers.flights_total_per_year ?? 0,
          // **Celui des longs trajets, lui, s'atteint, et il dit vrai** : « Oui » puis deux trajets en
          // train laisse l'autocar et la voiture sans réponse, ce qui veut dire « aucun » — l'étape
          // réclame un trajet, pas une réponse par série (`manqueDeLEtape`).
          train_long_trips_per_year: answers.train_long_trips_per_year ?? 0,
          car_long_trips_per_year: answers.car_long_trips_per_year ?? 0,
          coach_long_trips_per_year: answers.coach_long_trips_per_year ?? 0,
          // Même lecture que la complétude des étapes : un « 0 » n'est pas une distance, et les
          // deux colonnes portent `check (… > 0)`.
          commute_distance_km: distanceDomicileTravailKm(answers),
          leisure_distance_km: distanceSortieKm(answers),
        },
        { onConflict: 'assessment_id' }
      );
      if (answersError) throw answersError;

      etape = 'finalisation';
      // **Le passage en `completed` doit précéder le calcul**, et ce n'est pas un détail d'ordre :
      // `compute_assessment_results` termine en appelant `generate_plan_cycle_for_user`, qui
      // sélectionne les bilans `completed`. L'inverse rendrait un bilan sans plan jusqu'au
      // prochain passage du cron.
      //
      // **`submitted_at` n'est plus envoyé** (C2.2) : un trigger le pose avec l'horloge du
      // serveur au passage en `completed`. Il venait d'ici, c'est-à-dire du téléphone, et la
      // garde d'idempotence du plan le comparait à un horodatage serveur (A4-20) — un téléphone
      // en avance faisait reconstruire le plan à chaque passage du cron, donc effacer
      // l'engagement chaque nuit ; un téléphone en retard le figeait. L'envoyer quand même
      // serait sans effet, mais laisserait croire que c'est le client qui décide.
      const { error: finalisationError } = await supabase
        .from('assessments')
        .update({ status: STATUT_DE_BILAN.complete })
        .eq('id', assessmentId);
      if (finalisationError) throw finalisationError;

      etape = 'calcul';
      const { error: computeError } = await supabase.rpc('compute_assessment_results', {
        p_assessment_id: assessmentId,
      });
      if (computeError) throw computeError;

      bilanEnCours.current = null;
      await clearBilanDraft();
      // **Le premier parcours commence ici** (C5.7), et il faut le noter **avant** de poser la
      // marque de bilan : c'est elle qui dit si cet appareil en avait déjà vu un. « Premier » veut
      // dire premier **sur cet appareil**, et c'est la bonne définition pour une barre d'onglets —
      // ce qui se joue est qu'on ne montre pas deux lieux à quelqu'un qui n'a encore rien à y
      // mettre, et quelqu'un qui refait un bilan a déjà tout vu.
      //
      // Trois situations retombent donc naturellement du bon côté, sans garde à écrire : un
      // re-bilan (la marque est là), un appareil neuf d'un compte existant (la racine a posé la
      // marque en lisant le bilan), et une installation d'avant ce chantier (idem, au premier
      // lancement en ligne). Dans les trois cas, la barre reste. **Et une quatrième depuis C4.7** :
      // retirer son seul bilan efface la marque, mais l'étape notée dit que le parcours a déjà été
      // vu ici — il ne recommence pas (`ouvreUnPremierParcours`, décision du 27/09/2026).
      if (ouvreUnPremierParcours(await aDejaVuUnBilan(), await lireLePremierParcours())) {
        await noterLePremierParcours('questionnaire');
      }
      // **La marque locale se pose ici aussi, et pas seulement à la racine** (C4.5). Le
      // questionnaire mène à la restitution puis au plan, sans repasser par la racine : sans cette
      // ligne, la marque n'existerait qu'au **prochain** lancement en ligne, et quelqu'un qui
      // soumet son premier bilan puis rouvre l'app sans réseau retomberait sur l'onboarding. Elle
      // se pose après `clearBilanDraft()` parce que c'est exactement ce que cet effacement rend
      // nécessaire : le brouillon était jusque-là la preuve locale.
      void marquerQuIlYAUnBilan();
      // `nouveau=1` distingue l'aboutissement du questionnaire d'une relecture depuis le
      // suivi : c'est ce paramètre, et lui seul, qui autorise la proposition de compte et le
      // bouton vers le plan (cf. `src/types/resultat.ts`).
      router.replace({ pathname: '/suivi/bilan', params: { id: assessmentId, nouveau: '1' } });
    } catch (error) {
      // **Le seul échec que le produit mesure**, parce que c'est le seul dont le schéma ne garde
      // aucune trace : `submitted_at` n'est écrit que si la soumission aboutit. Deux dimensions,
      // et jamais le message — une violation de contrainte cite la valeur refusée, c'est-à-dire
      // une réponse de la personne, et `usage_events` ne porte pas de texte libre.
      //
      // Le genre est calculé **une fois** et sert deux fois : ici pour la mesure, et trois
      // lignes plus bas pour décider s'il y a un détail à montrer. Les séparer était le défaut
      // de 13.2 (recette web du 16/09/2026) : l'information était déjà dérivée dans cette
      // portée, et n'était pas lue là où elle servait.
      const genre = genreErreurSoumission(error);
      track('bilan_submit_error', { etape, genre });

      // Le message revient sur le dernier pas du questionnaire, juste au-dessus du bouton :
      // les réponses sont toujours là, il n'y a qu'à réessayer. Une boîte système disait la
      // même chose en bloquant le fil et sans rien laisser à l'écran une fois fermée.
      //
      // Une phrase fixe, et vraie : `clearBilanDraft()` n'est appelé que sur le chemin de
      // succès, après l'écriture et le calcul, donc rien n'est perdu ici. Le détail technique
      // part dans `detail` — concaténé à cette phrase, il faisait lire « Network request
      // failed » ou une contrainte Postgres entière, en anglais, au terme de cinq minutes de
      // saisie (audit A2-16).
      setMessage(
        'Ton bilan n’a pas pu être enregistré. Tes réponses sont conservées, réessaie dans un instant.'
      );

      // **Sur une coupure réseau, il n'y a pas de détail du tout.** `decrireErreur` reste juste
      // et indispensable aux quatre autres genres — une contrainte, une permission, un `P0002`
      // se recopient à la main et nomment la cause. Mais sur `reseau` il rend
      // « TypeError: Failed to fetch » suivi des numéros de ligne d'un bundle minifié : cinq
      // lignes d'anglais au terme de cinq minutes de saisie. Or c'est le cas d'échec **le plus
      // probable en production** — un tunnel, un ascenseur, un réseau qui tombe —, pas un
      // défaut, et le seul où la phrase française au-dessus est déjà toute la vérité. Le reste
      // du produit y répond ainsi depuis C1.4 (l'écran `erreur_reseau` de `/plan`) ; le
      // questionnaire était le seul endroit à y répondre par une trace de pile.
      setDetail(genre === 'reseau' ? null : decrireErreur(error));
    } finally {
      soumissionEnCours.current = false;
      setSubmitting(false);
    }
  };

  // Ne jamais bloquer le premier rendu sur la lecture du brouillon (AsyncStorage) : sur
  // l'export web statique, cette lecture async ne résout jamais pendant la génération —
  // même piège que le chargement des polices dans _layout.tsx. Le pas 1 s'affiche
  // immédiatement avec l'état par défaut, puis bascule sur le brouillon dès qu'il
  // arrive (quasi instantané en pratique, AsyncStorage local).
  // Le calcul prend le pas sur le questionnaire : trois écritures puis
  // `compute_assessment_results`, qui génère aussi le plan. Laisser le wizard à l'écran avec un
  // bouton grisé fait paraître l'app bloquée.
  if (submitting) return <CalculEnCours />;

  // **La feuille du re-bilan se rend par-dessus l'entrée, quelle qu'elle soit** (01/10/2026, `v1-33`
  // §6) : la première étape, ou l'écran de reprise quand un brouillon de plus de trois semaines l'ouvre.
  // C'est un `Modal`, donc son rendu ne dépend pas de sa place dans l'arbre, et chaque branche la porte.
  const feuille =
    feuilleDeLEngagement !== null ? (
      <FeuilleNouveauBilan
        engagement={feuilleDeLEngagement}
        onCommencer={() => setFeuilleDeLEngagement(null)}
        // Ressortir vers l'écran d'où l'on vient — la restitution, le suivi, le plan… Plusieurs
        // portes y mènent, donc le repli d'une adresse ouverte sans pile est la racine, qui route
        // d'elle-même vers le plan (`FRONT.md` §2.8). La feuille se démonte en même temps : la pile garde
        // l'écran monté le temps de sa transition, et le `Modal` qu'il porte n'a pas à y survivre — ce
        // que fait Android d'un `Modal` laissé là ne se lit que sur l'appareil.
        onQuitter={() => {
          setFeuilleDeLEngagement(null);
          revenirOu('/');
        }}
      />
    ) : null;

  // **L'écran de reprise du handoff §5.2**, spécifié depuis l'origine et livré par C3.9.
  //
  // Deux chemins y mènent et ils ne se recouvrent pas : la racine qui a trouvé un brouillon — le
  // cas fréquent, et celui qui faisait rejouer les quatre écrans d'onboarding avant d'atterrir
  // sur une étape 5 sans explication — et un brouillon de plus de trois semaines, quelle que
  // soit la porte (C1.3, audit A2-6).
  //
  // Trois choses que cet écran tient, et qu'il ne faut pas défaire :
  //
  //   - **il ne dit jamais le délai écoulé.** Interdit du handoff, et pour une raison qui se
  //     vérifie à la lecture : « tu as commencé il y a trois semaines » est un reproche déguisé
  //     en information, et la personne n'a rien à en faire — les deux chemins mènent au même
  //     endroit quel que soit le délai ;
  //   - **il n'offre pas de « Recommencer ».** Les deux boutons mènent à un questionnaire
  //     rempli, l'un par le brouillon, l'autre par le dernier bilan. Repartir de zéro se fait en
  //     répondant, pas en effaçant ;
  //   - **le second bouton n'apparaît que s'il y a un bilan vers quoi repartir.** C'est ce que
  //     `repriseDepuis` porte, et c'est un fait distinct de « l'écran s'affiche » — les
  //     confondre réservait la reprise à ceux qui avaient déjà soumis un bilan, c'est-à-dire à
  //     personne au premier questionnaire interrompu.
  //
  // L'en-tête est celui du questionnaire, à l'étape et à la section où l'on s'était arrêté :
  // c'est lui qui rend la phrase vraie plutôt que rassurante. Le décompte se dérive
  // (`avancementDeLaReprise`), il ne s'écrit pas — le total dépend des réponses déjà données.
  if (montrerLaReprise) {
    return (
      <ThemedView style={styles.container}>
        {feuille}
        <SafeAreaView style={styles.repriseSafeArea}>
          <ProgressHeader section={section} step={stepNumber} total={total} />
          <View style={styles.repriseBloc}>
            <ThemedText type="screenTitle">On reprend là où tu en étais.</ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              {avancementDeLaReprise(step, answers)}
            </ThemedText>
            <Button title="Continuer mon bilan" onPress={continuerLeBrouillon} />
            {repriseDepuis !== null && (
              <Button
                title="Repartir de mon dernier bilan"
                variant="secondary"
                onPress={repartirDuDernierBilan}
              />
            )}
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // Quatre entrées de section sur les neuf étapes — la table décide, pas l'écran (C3.9).
  const motDeRamille =
    step in RAMILLE.entreeDeSection
      ? RAMILLE.entreeDeSection[step as keyof typeof RAMILLE.entreeDeSection]
      : null;

  return (
    <StepShell
      section={section}
      step={stepNumber}
      total={total}
      entree={{ cle: step, sens }}
      reponsesDonnees={reponsesDonnees}
      motDeRamille={motDeRamille}
      // Rendu à chaque passage, jamais mémoïsé : `router.canGoBack()` n'est pas réactif. Sans
      // `onBack`, `StepShell` n'affiche pas de bouton — c'est ce qu'il faut au premier pas du
      // premier lancement, où la pile est vide (cf. son commentaire d'en-tête).
      onBack={previousStep(step, answers) !== null || router.canGoBack() ? handleBack : undefined}
      onNext={handleNext}
      // Pendant l'envoi, `StepShell` n'est pas rendu du tout (`CalculEnCours` le remplace, plus haut) :
      // un libellé « Enregistrement… », un `disabled` ou un `manque` nul le temps de l'envoi étaient des
      // branches mortes, et c'est le verrou `soumissionEnCours` qui garde la double soumission.
      nextLabel={isLastStep ? 'Voir mon bilan' : 'Suivant'}
      manque={manqueDeLEtape(step, answers, horsColonnes)}
      // À l'étape d'entrée seulement (`etapeDEntree`, plus haut) ; « préremplies » s'écrit d'une seule
      // façon dans le produit (01/10/2026, `v1-33` D3).
      notice={
        prefilled && step === etapeDEntree
          ? 'Tes réponses précédentes sont préremplies. Modifie ce qui a changé.'
          : undefined
      }
      message={message}
      detail={detail}
    >
      {step === 'commute_has_trip' && <CommuteHasTripStep answers={answers} update={update} />}
      {step === 'commute_days_distance' && <CommuteDaysDistanceStep answers={answers} update={update} />}
      {step === 'commute_mode' && <CommuteModeStep answers={answers} update={update} />}
      {step === 'commute_extra' && <CommuteExtraStep answers={answers} update={update} />}
      {step === 'leisure_frequency' && <LeisureFrequencyStep answers={answers} update={update} />}
      {step === 'leisure_detail' && <LeisureDetailStep answers={answers} update={update} />}
      {step === 'flights' && <FlightsStep answers={answers} update={update} />}
      {step === 'long_trips' && (
        <LongTripsStep
          answers={answers}
          update={update}
          reponse={reponseAuxLongsTrajets(answers, horsColonnes)}
          repondre={repondreAuxLongsTrajets}
        />
      )}
      {step === 'context' && <ContextStep answers={answers} update={update} />}

      {/* La feuille vit **dans** `StepShell` plutôt qu'à côté : c'est un `Modal`, donc son rendu
          ne dépend pas de sa place dans l'arbre, et l'écran garde un seul élément racine. */}
      {feuille}
    </StepShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // L'en-tête reste **en haut**, là où il est dans le questionnaire : centrer tout le bloc le
  // faisait flotter au milieu de l'écran, et une barre de progression au milieu d'une page ne se
  // lit plus comme une position dans un parcours. Le texte, lui, se centre dans ce qui reste.
  // Vu au rendu, pas à la lecture.
  repriseSafeArea: { flex: 1, padding: Spacing.four, paddingTop: Spacing.two, gap: Spacing.three },
  repriseBloc: { flex: 1, justifyContent: 'center', gap: Spacing.three },
});
