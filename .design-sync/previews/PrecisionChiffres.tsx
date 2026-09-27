import React from 'react';
import { ModeListItem, PrecisionChiffres, PrecisionMode } from 'ramille-design-system';

// `TAILLES_DE_COVOITURAGE` (src/types/bilan.ts), recopiée : de 2 à 6, la dernière vaut « ce nombre ou plus ».
const TAILLES_DE_COVOITURAGE = [2, 3, 4, 5, 6].map((n) => ({
  value: n,
  label: n === 6 ? '6+' : String(n),
  accessibilityLabel: n === 6 ? '6 personnes ou plus' : `${n} personnes`,
}));

// `OPTIONS_OCCUPATION` (src/components/bilan/steps/long-trips.tsx), recopiée : de 1 à 5, la dernière vaut « 5+ ».
const OCCUPATIONS = [1, 2, 3, 4, 5].map((n) => ({
  value: n,
  label: n === 5 ? '5+' : String(n),
  accessibilityLabel: n === 5 ? '5 personnes ou plus' : `${n} personne${n > 1 ? 's' : ''}`,
}));

// `CAR_ENGINE_OPTIONS` (src/constants/transport-modes.ts), recopiée.
const MOTORISATIONS = [
  { value: 'thermique', label: 'Thermique' },
  { value: 'hybride', label: 'Hybride' },
  { value: 'hybride_rechargeable', label: 'Hybride rechargeable' },
  { value: 'electrique', label: 'Électrique' },
];

/**
 * La taille du covoiturage, rien de choisi : cinq puces équiréparties sur une ligne, dans un groupe
 * nommé par la question — la dernière s'annonce « 6 personnes ou plus ».
 */
export const TailleDuCovoiturage = () => {
  const [taille, setTaille] = React.useState<number | null>(null);
  return (
    <PrecisionChiffres
      question="Vous êtes combien à partager ce trajet ?"
      options={TAILLES_DE_COVOITURAGE}
      valeur={taille}
      onChange={setTaille}
    />
  );
};

/**
 * Sous « Voiture (covoiturage) », après la motorisation : les deux précisions décrivent la même
 * voiture, chacune à 8 px de la précédente et en retrait de 16 sous l'option.
 */
export const SousLeCovoiturage = () => {
  const [moteur, setMoteur] = React.useState<string | null>('thermique');
  const [taille, setTaille] = React.useState<number | null>(3);
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <ModeListItem label="Voiture (covoiturage)" selected />
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column' }}>
        <PrecisionMode question="Quelle motorisation ?" options={MOTORISATIONS} valeur={moteur} onChange={setMoteur} />
      </div>
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column' }}>
        <PrecisionChiffres
          question="Vous êtes combien à partager ce trajet ?"
          options={TAILLES_DE_COVOITURAGE}
          valeur={taille}
          onChange={setTaille}
        />
      </div>
    </div>
  );
};

/**
 * L'occupation d'un long trajet en voiture : de 1, qui est une réponse, à « 5+ ». Même encart, même
 * groupe nommé — la puce « 1 » s'annonce « 1 personne ».
 */
export const OccupationDUnLongTrajet = () => {
  const [occupation, setOccupation] = React.useState<number | null>(2);
  return (
    <PrecisionChiffres
      question="Vous êtes combien dans la voiture ?"
      options={OCCUPATIONS}
      valeur={occupation}
      onChange={setOccupation}
    />
  );
};
