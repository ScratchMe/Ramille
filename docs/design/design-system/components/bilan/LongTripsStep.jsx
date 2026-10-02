import React from 'react';
import { BoiteDePrecision } from '../forms/BoiteDePrecision.jsx';
import { ChampDuPlafond } from '../forms/ChampDuPlafond.jsx';
import { Chip } from '../forms/Chip.jsx';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { IntituleDuChamp, useAncreDuChamp } from '../forms/IntituleDuChamp.jsx';
import { PrecisionMode } from '../forms/PrecisionMode.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { PrecisionChiffres } from './PrecisionChiffres.jsx';
// Source : src/components/bilan/steps/long-trips.tsx — les trajets de plus de 300 km hors avion. **Une question d'entrée
// depuis le 01/10/2026** (`v1-33` D1) : « Hors avion, fais-tu des trajets de plus de 300 km sur une année type ? », en
// Oui / Non cernés côte à côte (`Radius.field`, 16), comme le second mode. Les trois séries arrivaient avec leur « 0 »
// coché : on traversait le poste sans un toucher. « Non » les met toutes trois à 0 ; « Oui » les ouvre sous lui, **sans
// aucune puce cochée**, et l'étape réclame au moins un trajet. Sous la question, « Un aller-retour compte pour deux
// trajets. » (D2) : le calcul compte 800 ou 700 km par trajet, un aller.
//
// Les trois séries sont identiques (train, autocar, voiture), rendues depuis la même liste, **en pilule comme les nombres
// de vols** (22, le défaut de `Chip`) : deux séries de nombres du même poste prennent la même forme. C'est le nom du
// groupe qui les distingue : il porte la forme complète de l'intitulé (« Trajets longue distance en train »). Seule la
// voiture ouvre des précisions — motorisation, puis nombre de personnes —, dans une seule `BoiteDePrecision`, 8 sous ses
// puces et hors du groupe : elles dépendent d'un compte non nul, pas d'une option. L'autocar n'en a pas : ce n'est pas le
// véhicule de la personne.
//
// La réponse au Oui / Non se dérive des compteurs, plus le « Oui » qu'ils ne savent pas dire : c'est l'écran du
// questionnaire qui la tient (`reponse`, `repondre` — `reponseAuxLongsTrajets` et `compteursApresLaReponse`,
// src/types/bilan.ts).
//
// **« 10+ » ouvre un champ, réclamé, dans chaque série** (02/10/2026, `v1-33` §6, `ChampDuPlafond`) : elle enregistrait
// 10. Le champ se rend sous les puces de sa série, avant la boîte de la voiture, qui attend le nombre. `plafond(compte)`
// dit que « 10+ » est la réponse d'une série ; dans le dépôt, l'écran du questionnaire en tient le drapeau.

// `CHOIX_DE_COMPTE` de la source (src/types/bilan.ts), recopiée : la dernière puce vaut « ce nombre ou plus » et ouvre
// un champ.
const COUNT_CHOICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const MAX_TRAJETS = COUNT_CHOICES[COUNT_CHOICES.length - 1];
const LIBELLE_PLAFOND = MAX_TRAJETS + ' trajets ou plus';
const QUESTION_LONGS_TRAJETS = 'Hors avion, fais-tu des trajets de plus de 300 km sur une année type ?';

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
// `field` de la source : l'intitulé, puis sa série — et, pour la voiture, la série et sa boîte.
const CHAMP = { ...COLONNE, gap: 10 };

export function LongTripsStep({ answers, update, reponse, repondre, plafond: plafondTouche = () => false, choisirLePlafond = () => {} }) {
  const plafond = (compte) => plafondTouche(compte) || (answers[compte] !== null && answers[compte] >= MAX_TRAJETS);
  // Où mène ce qui manque : la question du titre (qui ne se marque pas), puis « le nombre de trajets », dont les trois
  // intitulés se marquent — le trajet qui manque peut venir de n'importe quelle série.
  const { bloc: blocDeLaQuestion } = useAncreDuChamp('fait_des_longs_trajets');
  const { bloc: blocDesSeries, marque: seriesMarquees } = useAncreDuChamp('nombre_de_longs_trajets');
  // Une série de 0 à « 10+ », en pilule, dans son groupe nommé ; une série sans réponse (`null`) n'a aucune puce cochée.
  // « 10+ » ouvre le champ de la série, vide — sauf sur un nombre déjà au-delà.
  const serie = (intitule, compte, patch = () => ({})) => (
    <>
      <GroupeDeChoix question={nomDeLaSerie(intitule)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {COUNT_CHOICES.map((n) => (
          <Chip key={n} label={n === MAX_TRAJETS ? MAX_TRAJETS + '+' : String(n)} accessibilityLabel={n === MAX_TRAJETS ? LIBELLE_PLAFOND : undefined}
            role="radio" selected={n === MAX_TRAJETS ? plafond(compte) : !plafond(compte) && answers[compte] === n}
            onPress={() => {
              if (n === MAX_TRAJETS) {
                const dejaAuDela = plafond(compte);
                choisirLePlafond(compte, true);
                if (!dejaAuDela) update({ [compte]: null, ...patch(n) });
                return;
              }
              choisirLePlafond(compte, false);
              update({ [compte]: n, ...patch(n) });
            }} />
        ))}
      </GroupeDeChoix>
      {plafond(compte) && (
        <ChampDuPlafond valeur={answers[compte]} unite="trajets" label={'Nombre de trajets ' + intitule.toLowerCase() + ' sur une année'}
          onChange={(v) => update({ [compte]: v })} />
      )}
    </>
  );
  const enVoiture = (answers.car_long_trips_per_year ?? 0) > 0;

  return (
    <div style={{ ...COLONNE, gap: 32 }}>
      <div ref={blocDeLaQuestion} style={{ ...COLONNE, gap: 16 }}>
        <ThemedText type="screenTitle">{QUESTION_LONGS_TRAJETS}</ThemedText>
        <ThemedText type="small" themeColor="textTertiary">Un aller-retour compte pour deux trajets.</ThemedText>
        {/* Le « Oui » et ce qu'il ouvre, enveloppés ensemble (`ChoixOuvrant` dans le dépôt) : le haut du Oui / Non est la
            borne que l'écran ne fait pas passer au-dessus du bord quand il remonte pour montrer les séries. */}
        <div style={COLONNE}>
          <GroupeDeChoix question={QUESTION_LONGS_TRAJETS} style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="Oui" role="radio" selected={reponse === true} onPress={() => repondre(true)} flex radius={16} selectedStyle="outline" />
            <Chip label="Non" role="radio" selected={reponse === false} onPress={() => repondre(false)} flex radius={16} selectedStyle="outline" />
          </GroupeDeChoix>

          {reponse === true && (
            <div ref={blocDesSeries} style={{ ...COLONNE, gap: 32, marginTop: 32 }}>
              <div style={CHAMP}>
                <IntituleDuChamp type="small" themeColor="textTertiary" marque={seriesMarquees}>{EN_TRAIN}</IntituleDuChamp>
                {serie(EN_TRAIN, 'train_long_trips_per_year')}
              </div>

              <div style={CHAMP}>
                <IntituleDuChamp type="small" themeColor="textTertiary" marque={seriesMarquees}>{EN_AUTOCAR}</IntituleDuChamp>
                {serie(EN_AUTOCAR, 'coach_long_trips_per_year')}
              </div>

              <div style={CHAMP}>
                <IntituleDuChamp type="small" themeColor="textTertiary" marque={seriesMarquees}>{EN_VOITURE}</IntituleDuChamp>
                {/* La série et sa boîte, enveloppées ensemble (`ChoixOuvrant` dans le dépôt) : la boîte s'ouvre à 8 sous les
                    puces comme sous un mode, et le haut de la série ne passe pas au-dessus du bord quand l'écran remonte. */}
                <div style={COLONNE}>
                  {serie(EN_VOITURE, 'car_long_trips_per_year', (n) => ({ car_long_trips_engine: n > 0 ? answers.car_long_trips_engine : null }))}
                  {/* Une seule boîte pour les deux : elles décrivent la même voiture. */}
                  {enVoiture && (
                    <BoiteDePrecision>
                      <PrecisionMode champ="car_long_trips_engine" question="Quelle motorisation ?" options={CAR_ENGINE_OPTIONS} valeur={answers.car_long_trips_engine}
                        onChange={(value) => update({ car_long_trips_engine: value })} />
                      <PrecisionChiffres champ="car_long_trips_occupancy" question="Vous êtes combien dans la voiture ?" options={OPTIONS_OCCUPATION} valeur={answers.car_long_trips_occupancy}
                        onChange={(value) => update({ car_long_trips_occupancy: value })} />
                    </BoiteDePrecision>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ThemedText type="small" themeColor="textTertiary">Distances moyennes par défaut · 800 km train, 700 km autocar et voiture</ThemedText>
    </div>
  );
}
