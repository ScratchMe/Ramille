import React from 'react';
import { Chip, GroupeDeChoix, StepShell, ThemedText } from 'ramille-design-system';

const QUESTION_JOURS = 'Ce trajet, tu le fais combien de jours par semaine ?';

/** Un écran de questionnaire complet : en-tête, contenu défilant, pied collant. */
export const EtapeCourante = () => (
  <StepShell section="Domicile-travail" step={2} total={9} onBack={() => {}} onNext={() => {}}>
    <ThemedText type="screenTitle">{QUESTION_JOURS}</ThemedText>
    <GroupeDeChoix question={QUESTION_JOURS} colonnes={4}>
      {[1, 2, 3, 4, 5, 6, 7].map((n) => <Chip key={n} label={String(n)} role="radio" selected={n === 4} radius={14} />)}
    </GroupeDeChoix>
  </StepShell>
);

/**
 * Le premier écran d'un re-bilan : pas de Retour, le bandeau du pré-remplissage sous l'en-tête,
 * et le mot de Ramille à l'entrée de la section — sans second visage, le sien est déjà en haut.
 */
export const PremierEcranPrerempli = () => (
  <StepShell
    section="Domicile-travail"
    step={1}
    total={9}
    notice="Tes réponses précédentes sont pré-remplies. Modifie ce qui a changé."
    motDeRamille="À peu près, c’est déjà bien. Je ne vérifie rien, et personne ne relit."
    onNext={() => {}}
  >
    <ThemedText type="screenTitle">As-tu un trajet régulier pour le travail ou les études ?</ThemedText>
  </StepShell>
);

/**
 * Suivant inactif : ce qui reste à renseigner se dit à côté du bouton. Le libellé du bouton
 * ne change pas — on n'explique pas un blocage en renommant l'action.
 */
export const SuivantInactif = () => (
  <StepShell
    section="Domicile-travail"
    step={2}
    total={9}
    onBack={() => {}}
    nextDisabled
    manque="la distance"
  >
    <ThemedText type="screenTitle">{QUESTION_JOURS}</ThemedText>
  </StepShell>
);

/**
 * Un échec d'enregistrement, au-dessus des boutons, ton neutre et sans couleur d'alerte — et
 * la cause technique séparée, en chasse fixe, à recopier.
 */
export const AvecEchec = () => (
  <StepShell
    section="Contexte de mobilité"
    step={9}
    total={9}
    onBack={() => {}}
    onNext={() => {}}
    nextLabel="Voir mon bilan"
    message="Ton bilan n’a pas pu être enregistré. Tes réponses sont conservées, réessaie dans un instant."
    detail={'{"code":"23514","message":"new row violates check constraint"}'}
  >
    <ThemedText type="screenTitle">Quel est ton contexte de mobilité ?</ThemedText>
  </StepShell>
);
