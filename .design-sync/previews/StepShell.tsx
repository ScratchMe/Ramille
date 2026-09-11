import React from 'react';
import { Chip, StepShell, ThemedText } from 'ramille-design-system';

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Un écran de questionnaire complet : en-tête, contenu défilant, pied collant. */
export const EtapeCourante = () => (
  <StepShell section="Domicile-travail" step={3} total={9} onBack={() => {}} onNext={() => {}}>
    <ThemedText type="screenTitle">Combien de jours par semaine ?</ThemedText>
    <div style={{ display: 'flex', gap: 6, marginTop: 20 }}>
      {[1, 2, 3, 4, 5, 6, 7].map((n) => <Chip key={n} label={String(n)} selected={n === 4} flex />)}
    </div>
  </StepShell>
);

/** Le premier écran : pas de Retour, et le bandeau du pré-remplissage sous l'en-tête. */
export const PremierEcranPrerempli = () => (
  <StepShell
    section="Domicile-travail"
    step={1}
    total={9}
    notice="Tes réponses du dernier bilan sont pré-remplies."
    onNext={() => {}}
  >
    <ThemedText type="screenTitle">As-tu un trajet domicile-travail régulier ?</ThemedText>
  </StepShell>
);

/**
 * Suivant inactif : ce qui reste à renseigner se dit à côté du bouton. Le libellé du bouton
 * ne change pas — on n'explique pas un blocage en renommant l'action.
 */
export const SuivantInactif = () => (
  <StepShell
    section="Domicile-travail"
    step={4}
    total={9}
    onBack={() => {}}
    nextDisabled
    manque="la distance d’un aller"
  >
    <ThemedText type="screenTitle">Quelle distance ?</ThemedText>
  </StepShell>
);

/** Un échec d'enregistrement, au-dessus des boutons, ton neutre et sans couleur d'alerte. */
export const AvecEchec = () => (
  <StepShell
    section="Contexte"
    step={9}
    total={9}
    onBack={() => {}}
    onNext={() => {}}
    nextLabel="Voir mon bilan"
    message="Ton bilan n’a pas pu être enregistré. Réessaie dans un instant."
  >
    <ThemedText type="screenTitle">Où habites-tu ?</ThemedText>
  </StepShell>
);
