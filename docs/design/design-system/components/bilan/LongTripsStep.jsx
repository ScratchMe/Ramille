import React from 'react';
import { Chip } from '../forms/Chip.jsx';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { PrecisionMode } from '../forms/PrecisionMode.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { PrecisionChiffres } from './PrecisionChiffres.jsx';
// Source : src/components/bilan/steps/long-trips.tsx — les trajets de plus de 300 km hors avion, en trois séries
// identiques (train, autocar, voiture) rendues depuis la même liste. C'est le nom du groupe qui les distingue : il
// porte la forme complète de l'intitulé (« Trajets longue distance en train »), qui le contient. Seule la voiture
// ouvre des précisions — motorisation, puis nombre de personnes —, sous ses puces et hors du groupe : elles dépendent
// d'un compte non nul, pas d'une option. L'autocar n'en a pas : ce n'est pas le véhicule de la personne.

// `COUNT_CHOICES` de la source, recopiée : la dernière puce stocke sa valeur nominale et vaut « ce nombre ou plus ».
const COUNT_CHOICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const MAX_TRAJETS = COUNT_CHOICES[COUNT_CHOICES.length - 1];
const LIBELLE_PLAFOND = MAX_TRAJETS + ' trajets ou plus';

// `OCCUPATIONS_LONG_TRAJET` (src/types/bilan.ts) et `OPTIONS_OCCUPATION` de la source, recopiées : « 1 » répond à
// « Vous êtes combien ? » sans être traduit en « seul ».
const OCCUPATIONS_LONG_TRAJET = [1, 2, 3, 4, 5];
const PLAFOND_OCCUPATION = OCCUPATIONS_LONG_TRAJET[OCCUPATIONS_LONG_TRAJET.length - 1];
const OPTIONS_OCCUPATION = OCCUPATIONS_LONG_TRAJET.map((n) => ({
  value: n,
  label: n === PLAFOND_OCCUPATION ? n + '+' : String(n),
  accessibilityLabel: n === PLAFOND_OCCUPATION ? n + ' personnes ou plus' : n + ' personne' + (n > 1 ? 's' : ''),
}));
// `CAR_ENGINE_OPTIONS` (src/constants/transport-modes.ts), recopiée.
const CAR_ENGINE_OPTIONS = [
  { value: 'thermique', label: 'Thermique' },
  { value: 'hybride', label: 'Hybride' },
  { value: 'hybride_rechargeable', label: 'Hybride rechargeable' },
  { value: 'electrique', label: 'Électrique' },
];

const EN_TRAIN = 'En train';
const EN_AUTOCAR = 'En autocar';
const EN_VOITURE = 'En voiture';
const nomDeLaSerie = (intitule) => 'Trajets longue distance ' + intitule.toLowerCase();

const COLONNE = { display: 'flex', flexDirection: 'column' };
// `field` de la source : l'intitulé, sa série et, pour la voiture, ses précisions.
const CHAMP = { ...COLONNE, gap: 10 };

export function LongTripsStep({ answers, update }) {
  // Une série de 0 à « 10+ », rayon `Radius.chip` (14), dans son groupe nommé.
  const serie = (intitule, valeur, choisir) => (
    <GroupeDeChoix question={nomDeLaSerie(intitule)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {COUNT_CHOICES.map((n) => (
        <Chip key={n} label={n === MAX_TRAJETS ? MAX_TRAJETS + '+' : String(n)} accessibilityLabel={n === MAX_TRAJETS ? LIBELLE_PLAFOND : undefined}
          role="radio" selected={valeur === n} onPress={() => choisir(n)} radius={14} />
      ))}
    </GroupeDeChoix>
  );
  const enVoiture = answers.car_long_trips_per_year > 0;

  return (
    <div style={{ ...COLONNE, gap: 32 }}>
      <div style={{ ...COLONNE, gap: 8 }}>
        <ThemedText type="screenTitle">Et les trajets de plus de 300 km ?</ThemedText>
        <ThemedText type="small" themeColor="textTertiary">Sur une année type, hors avion.</ThemedText>
      </div>

      <div style={CHAMP}>
        <ThemedText type="small" themeColor="textTertiary">{EN_TRAIN}</ThemedText>
        {serie(EN_TRAIN, answers.train_long_trips_per_year, (n) => update({ train_long_trips_per_year: n }))}
      </div>

      <div style={CHAMP}>
        <ThemedText type="small" themeColor="textTertiary">{EN_AUTOCAR}</ThemedText>
        {serie(EN_AUTOCAR, answers.coach_long_trips_per_year, (n) => update({ coach_long_trips_per_year: n }))}
      </div>

      <div style={CHAMP}>
        <ThemedText type="small" themeColor="textTertiary">{EN_VOITURE}</ThemedText>
        {serie(EN_VOITURE, answers.car_long_trips_per_year, (n) =>
          update({ car_long_trips_per_year: n, car_long_trips_engine: n > 0 ? answers.car_long_trips_engine : null })
        )}
        {enVoiture && (
          <div style={{ marginTop: 4 }}>
            <PrecisionMode question="Quelle motorisation ?" options={CAR_ENGINE_OPTIONS} valeur={answers.car_long_trips_engine}
              onChange={(value) => update({ car_long_trips_engine: value })} />
          </div>
        )}
        {/* Même condition que la motorisation : elle décrit la même voiture. */}
        {enVoiture && (
          <div style={{ marginTop: 4 }}>
            <PrecisionChiffres question="Vous êtes combien dans la voiture ?" options={OPTIONS_OCCUPATION} valeur={answers.car_long_trips_occupancy}
              onChange={(value) => update({ car_long_trips_occupancy: value })} />
          </div>
        )}
      </div>

      <ThemedText type="small" themeColor="textTertiary">Distances moyennes par défaut · 800 km train, 700 km autocar et voiture</ThemedText>
    </div>
  );
}
