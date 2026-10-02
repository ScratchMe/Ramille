import React from 'react';
import { LongTripsStep } from 'ramille-design-system';

type Reponses = React.ComponentProps<typeof LongTripsStep>['answers'];

// L'état vierge du produit (`EMPTY_BILAN_ANSWERS`) : depuis le 01/10/2026 (`v1-33` D1), les compteurs partent de
// `null` — aucune puce n'arrive cochée.
const VIERGE: Reponses = {
  train_long_trips_per_year: null,
  coach_long_trips_per_year: null,
  car_long_trips_per_year: null,
  car_long_trips_engine: null,
  car_long_trips_occupancy: null,
};

// `normaliserReponses` (src/types/bilan.ts), la part que cette étape déclenche, recopiée : la motorisation
// et l'occupation ne tiennent qu'à la présence d'un trajet en voiture — une série vide vaut zéro —, et c'est
// l'écran du questionnaire, après chaque `update`, qui les efface — pas l'étape.
const normaliser = (r: Reponses): Reponses =>
  (r.car_long_trips_per_year ?? 0) === 0 ? { ...r, car_long_trips_engine: null, car_long_trips_occupancy: null } : r;

// `reponseAuxLongsTrajets` et `compteursApresLaReponse` (src/types/bilan.ts), recopiées : la réponse au Oui / Non
// se dérive des compteurs, plus le « Oui » qu'ils ne savent pas dire, que l'écran retient.
const compteurs = (r: Reponses) => [r.train_long_trips_per_year, r.coach_long_trips_per_year, r.car_long_trips_per_year];
const reponseAuxLongsTrajets = (r: Reponses, oui: boolean): boolean | null => {
  if (compteurs(r).some((n) => n !== null && n > 0)) return true;
  if (oui) return true;
  if (compteurs(r).every((n) => n === null)) return null;
  return compteurs(r).every((n) => n === 0) ? false : true;
};
const compteursApresLaReponse = (r: Reponses, oui: boolean): Partial<Reponses> => {
  if (!oui) return { train_long_trips_per_year: 0, coach_long_trips_per_year: 0, car_long_trips_per_year: 0 };
  if (compteurs(r).some((n) => n !== null && n > 0)) return {};
  return { train_long_trips_per_year: null, coach_long_trips_per_year: null, car_long_trips_per_year: null };
};

// Le contenu défilant de `StepShell`, à la largeur d'un téléphone : 390 moins ses deux marges de 24.
const Etape = ({ depart, oui: ouiAuDepart = false }: { depart: Partial<Reponses>; oui?: boolean }) => {
  const [answers, setAnswers] = React.useState<Reponses>({ ...VIERGE, ...depart });
  const [oui, setOui] = React.useState(ouiAuDepart);
  return (
    <div style={{ maxWidth: 342 }}>
      <LongTripsStep
        answers={answers}
        update={(patch) => setAnswers((a) => normaliser({ ...a, ...patch }))}
        reponse={reponseAuxLongsTrajets(answers, oui)}
        repondre={(o) => {
          setOui(o);
          setAnswers((a) => normaliser({ ...a, ...compteursApresLaReponse(a, o) }));
        }}
      />
    </div>
  );
};

/** À l'arrivée : la question seule, rien de coché — « Suivant » est en attente. */
export const SansReponse = () => <Etape depart={{}} />;

/** « Non » : zéro partout, et l'étape est complète. C'est aussi ce que relit un re-bilan sans long trajet. */
export const Non = () => (
  <Etape depart={{ train_long_trips_per_year: 0, coach_long_trips_per_year: 0, car_long_trips_per_year: 0 }} />
);

/** « Oui » vient d'être touché : les trois séries s'ouvrent sans aucune puce cochée, et un trajet est réclamé. */
export const OuiSansTrajet = () => <Etape depart={{}} oui />;

/** Du train et un peu d'autocar : l'autocar n'ouvre rien, ce n'est pas le véhicule de la personne. */
export const TrainEtAutocar = () => <Etape depart={{ train_long_trips_per_year: 4, coach_long_trips_per_year: 1 }} />;

/**
 * Des trajets en voiture : la motorisation puis le nombre de personnes s'ouvrent sous les puces, dans une
 * seule boîte, hors du groupe — ils dépendent d'un compte, pas d'une option.
 */
export const EnVoiture = () => (
  <Etape depart={{ car_long_trips_per_year: 2, car_long_trips_engine: 'electrique', car_long_trips_occupancy: 3 }} />
);
