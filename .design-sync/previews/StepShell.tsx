import React from 'react';
import { Chip, CommuteDaysDistanceStep, GroupeDeChoix, StepShell, ThemedText } from 'ramille-design-system';

const QUESTION_JOURS = 'Ce trajet, tu le fais combien de jours par semaine ?';

/**
 * Le toucher du « Suivant », rejoué une fois après le montage — une carte ne se touche pas, et c'est
 * au toucher, jamais d'office, que ce qui manque se dit (`v1-31`, décision 1).
 */
const ApresLeToucher = ({ children }: { children: React.ReactNode }) => {
  const cadre = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const suivant = cadre.current?.querySelector<HTMLButtonElement>('button[aria-label="Suivant"]');
    suivant?.click();
  }, []);
  return (
    <div ref={cadre} style={{ display: 'flex', flexDirection: 'column', height: 640 }}>
      {children}
    </div>
  );
};

/** Un écran de questionnaire complet : en-tête, contenu défilant, pied collant — l'étape est complète. */
export const EtapeCourante = () => (
  <StepShell
    section="Domicile-travail"
    step={2}
    total={9}
    entree={{ cle: 'commute_days_distance', sens: null }}
    reponsesDonnees={0}
    manque={null}
    onBack={() => {}}
    onNext={() => {}}
  >
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
    entree={{ cle: 'commute_has_trip', sens: null }}
    reponsesDonnees={0}
    manque={null}
    notice="Tes réponses précédentes sont préremplies. Modifie ce qui a changé."
    motDeRamille="À peu près, c’est déjà bien. Je ne vérifie rien, et personne ne relit."
    onNext={() => {}}
  >
    <ThemedText type="screenTitle">As-tu un trajet régulier pour le travail ou les études ?</ThemedText>
  </StepShell>
);

/**
 * « Suivant » en attente, à l'arrivée : gris, mais un bouton ordinaire — et rien d'écrit. Ce qui
 * manque ne se dit qu'au toucher ; le libellé du bouton ne change jamais.
 */
export const SuivantEnAttente = () => {
  const [answers, update] = React.useState({
    commute_days_per_week: 4,
    commute_distance_km: null as number | null,
    commute_distance_bracket: null as 'lt_5' | '5_15' | '15_30' | '30_50' | '50_plus' | null,
  });
  return (
    <StepShell
      section="Domicile-travail"
      step={2}
      total={9}
      entree={{ cle: 'commute_days_distance', sens: null }}
      reponsesDonnees={0}
      manque={{ champ: 'distance_du_trajet', phrase: 'la distance' }}
      onBack={() => {}}
    >
      <CommuteDaysDistanceStep answers={answers} update={(patch) => update((a) => ({ ...a, ...patch }))} />
    </StepShell>
  );
};

/**
 * Le même, « Suivant » touché : « Il manque encore la distance. » au-dessus des boutons — un lien, qui
 * mène à la même question —, l'intitulé de la distance en `accentText`, et le focus sur le champ.
 */
export const SuivantTouche = () => {
  const [answers, update] = React.useState({
    commute_days_per_week: 4,
    commute_distance_km: null as number | null,
    commute_distance_bracket: null as 'lt_5' | '5_15' | '15_30' | '30_50' | '50_plus' | null,
  });
  return (
    <ApresLeToucher>
      <StepShell
        section="Domicile-travail"
        step={2}
        total={9}
        entree={{ cle: 'commute_days_distance', sens: null }}
        reponsesDonnees={0}
        manque={{ champ: 'distance_du_trajet', phrase: 'la distance' }}
        onBack={() => {}}
      >
        <CommuteDaysDistanceStep answers={answers} update={(patch) => update((a) => ({ ...a, ...patch }))} />
      </StepShell>
    </ApresLeToucher>
  );
};

/**
 * Un échec d'enregistrement, au-dessus des boutons, ton neutre et sans couleur d'alerte — et
 * la cause technique séparée, en chasse fixe, à recopier.
 */
export const AvecEchec = () => (
  <StepShell
    section="Contexte de mobilité"
    step={9}
    total={9}
    entree={{ cle: 'context', sens: null }}
    reponsesDonnees={0}
    manque={null}
    onBack={() => {}}
    onNext={() => {}}
    nextLabel="Voir mon bilan"
    message="Ton bilan n’a pas pu être enregistré. Tes réponses sont conservées, réessaie dans un instant."
    detail={'{"code":"23514","message":"new row violates check constraint"}'}
  >
    <ThemedText type="screenTitle">Quel est ton contexte de mobilité ?</ThemedText>
  </StepShell>
);
