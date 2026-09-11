import { router } from 'expo-router';
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
import { StepShell } from '@/components/bilan/step-shell';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { clearBilanDraft, loadBilanDraft, saveBilanDraft } from '@/lib/bilan-draft';
import { loadLastSubmittedAnswers } from '@/lib/bilan-history';
import { ensureSession, supabase } from '@/lib/supabase';
import { genreErreurSoumission, type EtapeSoumission } from '@/types/soumission';
import {
  BILAN_SECTION_LABEL,
  EMPTY_BILAN_ANSWERS,
  brouillonEstAncien,
  distanceDomicileTravailKm,
  isStepComplete,
  manqueDeLEtape,
  memesReponses,
  nextStep,
  normaliserReponses,
  previousStep,
  visibleSteps,
  type BilanAnswers,
  type BilanStepId,
} from '@/types/bilan';

// Questionnaire du bilan (9 pas maximum, branchements B1.1/B2.1) — état local pour
// toute la traversée, un seul aller-retour serveur à la soumission (cf. commentaire
// bilan-draft.ts : `assessment_answers.leisure_frequency` est NOT NULL sans défaut, un
// upsert partiel avant l'étape 5 échouerait de toute façon). La reprise après
// interruption est couverte par un brouillon local (AsyncStorage), pas par un état
// serveur intermédiaire.
export default function BilanQuestionnaire() {
  const [answers, setAnswers] = useState<BilanAnswers>(EMPTY_BILAN_ANSWERS);
  const [step, setStep] = useState<BilanStepId>('commute_has_trip');
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  // Réponses du dernier bilan, quand un brouillon ancien les rend offrables en alternative
  // (écran de reprise ci-dessous). `null` = rien à demander, on entre dans le questionnaire.
  const [repriseDepuis, setRepriseDepuis] = useState<BilanAnswers | null>(null);
  // Vrai dès que la lecture du dernier bilan a tranché : on sait si l'écran de reprise
  // s'affiche, donc quelle étape la personne va réellement voir. C'est ce que l'entonnoir
  // attend, cf. son commentaire plus bas.
  const [repriseResolue, setRepriseResolue] = useState(false);

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
  }, []);

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
  // Le bilan `in_progress` de la tentative précédente, gardé pour que la reprise ne crée pas un
  // second brouillon côté serveur. Il est aussi relu en base au cas où l'app a été relancée
  // entre-temps : la ref ne survit pas à un redémarrage, la ligne si.
  const bilanEnCours = useRef<string | null>(null);
  useEffect(() => {
    if (!draftLoaded || !repriseResolue || repriseDepuis !== null) return;
    if (etapesVues.current.has(step)) return;
    etapesVues.current.add(step);
    track('bilan_step_view', { step });
  }, [step, draftLoaded, repriseResolue, repriseDepuis]);

  // Un seul point d'entrée pour toute modification de réponse : le patch dit ce que la
  // personne vient de choisir, `normaliserReponses` efface ce que ce choix rend impossible.
  // Les écrans ne tiennent plus de liste de remises à zéro — ils en tenaient trois, qui
  // divergeaient déjà (audit A2-17).
  const update = (patch: Partial<BilanAnswers>) => {
    reponseModifiee.current = true;
    setAnswers((prev) => normaliserReponses({ ...prev, ...patch }));
  };

  const continuerLeBrouillon = () => setRepriseDepuis(null);

  const repartirDuDernierBilan = () => {
    if (repriseDepuis === null) return;
    void clearBilanDraft();
    brouillonExistant.current = false;
    savedAtCharge.current = null;
    setAnswers(repriseDepuis);
    setStep('commute_has_trip');
    setPrefilled(true);
    setRepriseDepuis(null);
  };

  const visible = visibleSteps(answers);
  const stepNumber = Math.max(visible.indexOf(step) + 1, 1);
  const total = visible.length;
  const section = BILAN_SECTION_LABEL[step];
  const isLastStep = step === 'context';

  const handleBack = () => {
    const prev = previousStep(step, answers);
    if (prev) {
      setStep(prev);
    } else {
      router.back();
    }
  };

  const handleNext = async () => {
    if (!isLastStep) {
      const next = nextStep(step, answers);
      if (next) setStep(next);
      return;
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
          .eq('status', 'in_progress')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (repriseError) throw repriseError;
        assessmentId = repris?.id ?? null;
      }

      if (assessmentId === null) {
        const { data: assessment, error: assessmentError } = await supabase
          .from('assessments')
          .insert({ user_id: userId, status: 'in_progress' })
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
      const { error: answersError } = await supabase.from('assessment_answers').upsert(
        {
          assessment_id: assessmentId,
          commute_has_regular_trip: answers.commute_has_regular_trip ?? false,
          commute_days_per_week: answers.commute_days_per_week,
          // Même lecture que la complétude de l'étape : un « 0 » n'est pas une distance, et la
          // colonne porte `check (commute_distance_km > 0)`.
          commute_distance_km: distanceDomicileTravailKm(answers),
          commute_distance_bracket: answers.commute_distance_bracket,
          commute_mode: answers.commute_mode,
          commute_is_carpool: answers.commute_is_carpool,
          commute_carpool_size: answers.commute_carpool_size,
          commute_second_mode_used: answers.commute_second_mode_used,
          commute_second_mode: answers.commute_second_mode,
          commute_car_engine: answers.commute_car_engine,
          commute_two_wheeler_type: answers.commute_two_wheeler_type,
          leisure_frequency: answers.leisure_frequency ?? 'rarely',
          leisure_mode: answers.leisure_mode,
          leisure_distance_bracket: answers.leisure_distance_bracket,
          leisure_car_engine: answers.leisure_car_engine,
          leisure_two_wheeler_type: answers.leisure_two_wheeler_type,
          flights_total_per_year: answers.flights_total_per_year,
          flights_short_per_year: answers.flights_short_per_year,
          train_long_trips_per_year: answers.train_long_trips_per_year,
          car_long_trips_per_year: answers.car_long_trips_per_year,
          car_long_trips_engine: answers.car_long_trips_engine,
          zone_type: answers.zone_type,
          tc_access: answers.tc_access,
          household_vehicles: answers.household_vehicles,
        },
        { onConflict: 'assessment_id' }
      );
      if (answersError) throw answersError;

      etape = 'finalisation';
      // **Le passage en `completed` doit précéder le calcul**, et ce n'est pas un détail d'ordre :
      // `compute_assessment_results` termine en appelant `generate_plan_cycle_for_user`, qui
      // sélectionne les bilans `completed`. L'inverse rendrait un bilan sans plan jusqu'au
      // prochain passage du cron.
      const { error: finalisationError } = await supabase
        .from('assessments')
        .update({ status: 'completed', submitted_at: new Date().toISOString() })
        .eq('id', assessmentId);
      if (finalisationError) throw finalisationError;

      etape = 'calcul';
      const { error: computeError } = await supabase.rpc('compute_assessment_results', {
        p_assessment_id: assessmentId,
      });
      if (computeError) throw computeError;

      bilanEnCours.current = null;
      await clearBilanDraft();
      // `nouveau=1` distingue l'aboutissement du questionnaire d'une relecture depuis le
      // suivi : c'est ce paramètre, et lui seul, qui autorise la proposition de compte et le
      // bouton vers le plan (cf. `src/types/resultat.ts`).
      router.replace({ pathname: '/suivi/bilan', params: { id: assessmentId, nouveau: '1' } });
    } catch (error) {
      // **Le seul échec que le produit mesure**, parce que c'est le seul dont le schéma ne garde
      // aucune trace : `submitted_at` n'est écrit que si la soumission aboutit. Deux dimensions,
      // et jamais le message — une violation de contrainte cite la valeur refusée, c'est-à-dire
      // une réponse de la personne, et `usage_events` ne porte pas de texte libre.
      track('bilan_submit_error', { etape, genre: genreErreurSoumission(error) });

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
      setDetail(error instanceof Error ? error.message : String(error));
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

  // Reprise de bilan : un brouillon de plusieurs semaines ne se rouvre plus en silence. Du
  // handoff §5.2, cet écran tient ses deux interdits — aucune mention du délai écoulé, pas de
  // « Recommencer » : les deux chemins mènent à un questionnaire rempli, l'un par le
  // brouillon, l'autre par le dernier bilan.
  //
  // Le reste est un écart assumé, repris du À faire de C1.3 et non du handoff : la copie est
  // celle du chantier (« Tu as un bilan commencé. ») et le second chemin est « Repartir de mon
  // dernier bilan », que le handoff ne prévoit pas. Ne sont pas reprises la barre de
  // progression à l'étape exacte avec son décompte, ni le lien « Revoir les étapes
  // précédentes » — les deux boutons mènent déjà à un questionnaire où « Retour » marche.
  if (repriseDepuis !== null) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.repriseSafeArea}>
          <View style={styles.repriseBloc}>
            <ThemedText type="screenTitle">Tu as un bilan commencé.</ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              Tu peux le reprendre où tu en étais, ou repartir de tes dernières réponses
              enregistrées.
            </ThemedText>
            <Button title="Continuer mon bilan" onPress={continuerLeBrouillon} />
            <Button
              title="Repartir de mon dernier bilan"
              variant="secondary"
              onPress={repartirDuDernierBilan}
            />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <StepShell
      section={section}
      step={stepNumber}
      total={total}
      // Rendu à chaque passage, jamais mémoïsé : `router.canGoBack()` n'est pas réactif. Sans
      // `onBack`, `StepShell` n'affiche pas de bouton — c'est ce qu'il faut au premier pas du
      // premier lancement, où la pile est vide (cf. son commentaire d'en-tête).
      onBack={previousStep(step, answers) !== null || router.canGoBack() ? handleBack : undefined}
      onNext={handleNext}
      nextLabel={isLastStep ? (submitting ? 'Enregistrement…' : 'Voir mon bilan') : 'Suivant'}
      nextDisabled={submitting || !isStepComplete(step, answers)}
      manque={submitting ? null : manqueDeLEtape(step, answers)}
      notice={prefilled ? 'Tes réponses précédentes sont pré-remplies. Modifie ce qui a changé.' : undefined}
      message={message}
      detail={detail}
    >
      {step === 'commute_has_trip' && <CommuteHasTripStep answers={answers} update={update} />}
      {step === 'commute_days_distance' && <CommuteDaysDistanceStep answers={answers} update={update} />}
      {step === 'commute_mode' && <CommuteModeStep answers={answers} update={update} />}
      {step === 'commute_extra' && <CommuteExtraStep answers={answers} update={update} />}
      {step === 'leisure_frequency' && <LeisureFrequencyStep answers={answers} update={update} total={total} />}
      {step === 'leisure_detail' && <LeisureDetailStep answers={answers} update={update} />}
      {step === 'flights' && <FlightsStep answers={answers} update={update} />}
      {step === 'long_trips' && <LongTripsStep answers={answers} update={update} />}
      {step === 'context' && <ContextStep answers={answers} update={update} />}
    </StepShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  repriseSafeArea: { flex: 1, justifyContent: 'center', padding: Spacing.four },
  repriseBloc: { gap: Spacing.three },
});
