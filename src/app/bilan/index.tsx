import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

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
import { track } from '@/lib/analytics';
import { clearBilanDraft, loadBilanDraft, saveBilanDraft } from '@/lib/bilan-draft';
import { loadLastSubmittedAnswers } from '@/lib/bilan-history';
import { ensureSession, supabase } from '@/lib/supabase';
import {
  BILAN_SECTION_LABEL,
  EMPTY_BILAN_ANSWERS,
  isStepComplete,
  nextStep,
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
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const draft = await loadBilanDraft();
      if (cancelled) return;
      if (draft) {
        setAnswers(draft.answers);
        setStep(draft.step);
        setDraftLoaded(true);
        return;
      }

      const previousAnswers = await loadLastSubmittedAnswers();
      if (cancelled) return;
      if (previousAnswers) {
        setAnswers(previousAnswers);
        setPrefilled(true);
      }
      setDraftLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    saveBilanDraft({ answers, step });
  }, [answers, step, draftLoaded]);

  // Entonnoir du questionnaire (issue #30). Deux précautions, chacune corrige un biais
  // qui serait invisible dans les chiffres :
  //   - attendre `draftLoaded`, sinon un brouillon repris à l'étape 6 émettrait d'abord
  //     l'étape 1 (l'état initial), et l'entonnoir montrerait un abandon qui n'a pas eu lieu ;
  //   - ne compter chaque étape qu'une fois par visite, sinon un aller-retour Précédent /
  //     Suivant gonfle le volume sans rien apprendre — et mange le garde-fou de 500/24 h.
  const etapesVues = useRef(new Set<BilanStepId>());
  useEffect(() => {
    if (!draftLoaded || etapesVues.current.has(step)) return;
    etapesVues.current.add(step);
    track('bilan_step_view', { step });
  }, [step, draftLoaded]);

  const update = (patch: Partial<BilanAnswers>) => setAnswers((prev) => ({ ...prev, ...patch }));

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

  const submit = async () => {
    setSubmitting(true);
    try {
      const session = await ensureSession();
      const userId = session?.user.id;
      if (!userId) throw new Error('Session introuvable.');

      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert({ user_id: userId, status: 'completed', submitted_at: new Date().toISOString() })
        .select('id')
        .single();
      if (assessmentError || !assessment) throw assessmentError ?? new Error('Création du bilan impossible.');

      const { error: answersError } = await supabase.from('assessment_answers').insert({
        assessment_id: assessment.id,
        commute_has_regular_trip: answers.commute_has_regular_trip ?? false,
        commute_days_per_week: answers.commute_days_per_week,
        commute_distance_km: answers.commute_distance_km,
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
      });
      if (answersError) throw answersError;

      const { error: computeError } = await supabase.rpc('compute_assessment_results', {
        p_assessment_id: assessment.id,
      });
      if (computeError) throw computeError;

      await clearBilanDraft();
      // `nouveau=1` distingue l'aboutissement du questionnaire d'une relecture depuis le
      // suivi : c'est ce paramètre, et lui seul, qui autorise la proposition de compte et le
      // bouton vers le plan (cf. `src/types/resultat.ts`).
      router.replace({ pathname: '/suivi/bilan', params: { id: assessment.id, nouveau: '1' } });
    } catch (error) {
      Alert.alert(
        'Une erreur est survenue',
        error instanceof Error ? error.message : 'Impossible d’enregistrer ton bilan pour le moment.'
      );
    } finally {
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

  return (
    <StepShell
      section={section}
      step={stepNumber}
      total={total}
      onBack={handleBack}
      onNext={handleNext}
      nextLabel={isLastStep ? (submitting ? 'Enregistrement…' : 'Voir mon bilan') : 'Suivant'}
      nextDisabled={submitting || !isStepComplete(step, answers)}
      notice={prefilled ? 'Tes réponses précédentes sont pré-remplies. Modifie ce qui a changé.' : undefined}
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
