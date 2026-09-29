import React from 'react';
import { BoiteDePrecision } from '../forms/BoiteDePrecision.jsx';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { useAncreDuChamp } from '../forms/IntituleDuChamp.jsx';
import { ModeListItem } from '../forms/ModeListItem.jsx';
import { PrecisionMode } from '../forms/PrecisionMode.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { PrecisionChiffres } from './PrecisionChiffres.jsx';
import { MissingModeLink } from './MissingModeLink.jsx';
// Source : src/components/bilan/steps/commute-mode.tsx — B1.4 : le titre de l'étape, 16, les neuf modes en
// `ModeListItem` dans un groupe nommé par la même question, puis, 8 plus bas, le lien du mode manquant.
//
// **Trois familles, sans intertitre** (29/09/2026, `v1-31`) : Voiture (seul), Voiture (covoiturage), Deux-roues
// motorisé · Bus, Train, Métro ou tram · Vélo, Marche, Trottinette ou mobilité douce. Une sous-vue sans rôle par
// famille, 4 entre deux modes d'une famille, 16 entre deux familles ; les flèches du clavier ne voient pas les
// sous-vues. Neuf rangées de 48 tiennent sous la question à 390 × 844 comme à 360 × 800.
//
// Une précision — motorisation, type de deux-roues, de train, de vélo, taille du covoiturage — s'ouvre juste sous
// l'option choisie, DANS la liste et jamais après, dans une seule `BoiteDePrecision` : sous « Voiture (covoiturage) »,
// la motorisation puis la taille, qui décrivent la même voiture. Chacune est son propre groupe, posé dans celui des
// modes. Jamais une entrée de plus dans la liste. L'étape n'écrit que le choix ; ce qu'il rend impossible est effacé par
// l'écran du questionnaire (`normaliserReponses`).
//
// « Il manque encore ton mode de transport » mène à la liste, focus sur « Voiture (seul) » — le titre ne se marque
// pas ; « la motorisation », « le nombre de personnes dans la voiture »… mènent à la précision, dont l'intitulé se
// marque.

// Écrite une fois : le titre de l'étape et le nom de la liste des modes.
const QUESTION_MODE = 'Quel est ton mode de transport principal pour ce trajet ?';

// `COMMUTE_MODE_CHOICES`, `FAMILLE_DU_MODE`, `CAR_ENGINE_OPTIONS`, `TWO_WHEELER_TYPE_OPTIONS`, `TRAIN_TYPE_OPTIONS` et
// `VELO_TYPE_OPTIONS` (src/constants/transport-modes.ts), recopiées — la liste dans l'ordre des familles.
const CHOIX_DE_MODE = [
  { key: 'voiture_solo', modeId: 'voiture', carpool: false, label: 'Voiture (seul)' },
  { key: 'voiture_covoiturage', modeId: 'voiture', carpool: true, label: 'Voiture (covoiturage)' },
  { key: 'deux_roues_motorise', modeId: 'deux_roues_motorise', carpool: false, label: 'Deux-roues motorisé' },
  { key: 'bus', modeId: 'bus', carpool: false, label: 'Bus' },
  { key: 'train', modeId: 'train', carpool: false, label: 'Train' },
  { key: 'metro_tram', modeId: 'metro_tram', carpool: false, label: 'Métro ou tram' },
  { key: 'velo', modeId: 'velo', carpool: false, label: 'Vélo' },
  { key: 'marche', modeId: 'marche', carpool: false, label: 'Marche' },
  { key: 'trottinette', modeId: 'trottinette', carpool: false, label: 'Trottinette ou mobilité douce' },
];
const FAMILLE_DU_MODE = {
  voiture: 'motorise',
  deux_roues_motorise: 'motorise',
  bus: 'collectif',
  train: 'collectif',
  metro_tram: 'collectif',
  velo: 'actif',
  marche: 'actif',
  trottinette: 'actif',
};
// `enFamilles` (src/constants/transport-modes.ts), recopiée : un bloc par suite de choix de la même famille.
const enFamilles = (choix, modeDe) => {
  const blocs = [];
  let precedente = null;
  for (const c of choix) {
    const famille = FAMILLE_DU_MODE[modeDe(c)];
    if (famille !== precedente) blocs.push([]);
    blocs[blocs.length - 1].push(c);
    precedente = famille;
  }
  return blocs;
};
const MOTORISATIONS = [
  { value: 'thermique', label: 'Thermique' },
  { value: 'hybride', label: 'Hybride' },
  { value: 'hybride_rechargeable', label: 'Hybride rechargeable' },
  { value: 'electrique', label: 'Électrique' },
];
const DEUX_ROUES = [
  { value: 'scooter_thermique', label: 'Scooter thermique' },
  { value: 'scooter_electrique', label: 'Scooter électrique' },
  { value: 'moto_petite', label: 'Moto, petite cylindrée' },
  { value: 'moto_grosse', label: 'Moto, grosse cylindrée' },
];
const TRAINS = [
  { value: 'ter', label: 'TER ou train régional' },
  { value: 'rer', label: 'RER ou Transilien' },
  { value: 'intercites', label: 'Intercités' },
];
const VELOS = [
  { value: 'mecanique', label: 'Mécanique' },
  { value: 'electrique', label: 'À assistance électrique' },
];

// `TAILLES_DE_COVOITURAGE` (src/types/bilan.ts), recopiée : de 2 à 6, la dernière vaut « ce nombre ou plus », et
// chaque puce porte son libellé accessible.
const PLAFOND_COVOITURAGE = 6;
const TAILLES_DE_COVOITURAGE = [2, 3, 4, 5, PLAFOND_COVOITURAGE].map((n) => ({
  value: n,
  label: n === PLAFOND_COVOITURAGE ? n + '+' : String(n),
  accessibilityLabel: n === PLAFOND_COVOITURAGE ? n + ' personnes ou plus' : n + ' personnes',
}));

export function CommuteModeStep({ answers, update }) {
  // Ce que le choix ouvre, dans l'ordre de l'écran — rien pour un mode qui n'a pas de précision.
  const precisionsDuMode = (choix) =>
    [
      choix.modeId === 'voiture' && (
        <PrecisionMode key="motorisation" champ="commute_car_engine" question="Quelle motorisation ?" options={MOTORISATIONS}
          valeur={answers.commute_car_engine} onChange={(valeur) => update({ commute_car_engine: valeur })} />
      ),
      choix.modeId === 'deux_roues_motorise' && (
        <PrecisionMode key="deux-roues" champ="commute_two_wheeler_type" question="Quel type de deux-roues ?" options={DEUX_ROUES}
          valeur={answers.commute_two_wheeler_type} onChange={(valeur) => update({ commute_two_wheeler_type: valeur })} />
      ),
      choix.modeId === 'train' && (
        <PrecisionMode key="train" champ="commute_train_type" question="Quel type de train ?" options={TRAINS}
          valeur={answers.commute_train_type} onChange={(valeur) => update({ commute_train_type: valeur })} />
      ),
      choix.modeId === 'velo' && (
        <PrecisionMode key="velo" champ="commute_velo_type" question="Quel type de vélo ?" options={VELOS}
          valeur={answers.commute_velo_type} onChange={(valeur) => update({ commute_velo_type: valeur })} />
      ),
      choix.carpool && (
        <PrecisionChiffres key="personnes" champ="commute_carpool_size" question="Vous êtes combien à partager ce trajet ?"
          options={TAILLES_DE_COVOITURAGE} valeur={answers.commute_carpool_size} onChange={(valeur) => update({ commute_carpool_size: valeur })} />
      ),
    ].filter(Boolean);
  // Où mène « Il manque encore ton mode de transport » : la question et sa liste.
  const { bloc } = useAncreDuChamp('commute_mode');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div ref={bloc} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ThemedText type="screenTitle">{QUESTION_MODE}</ThemedText>
        <GroupeDeChoix question={QUESTION_MODE} style={{ gap: 16 }}>
          {enFamilles(CHOIX_DE_MODE, (choix) => choix.modeId).map((famille) => (
            <div key={FAMILLE_DU_MODE[famille[0].modeId]} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {famille.map((choix) => {
                const selected = answers.commute_mode === choix.modeId && answers.commute_is_carpool === choix.carpool;
                const precisions = selected ? precisionsDuMode(choix) : [];
                return (
                  // Le choix et sa boîte, enveloppés ensemble (`ChoixOuvrant` dans le dépôt) : le haut de l'enveloppe ne
                  // passe jamais au-dessus du bord quand l'écran remonte pour montrer la boîte.
                  <div key={choix.key} style={{ display: 'flex', flexDirection: 'column' }}>
                    <ModeListItem
                      label={choix.label}
                      selected={selected}
                      onPress={() => update({ commute_mode: choix.modeId, commute_is_carpool: choix.carpool })}
                    />
                    {precisions.length > 0 && <BoiteDePrecision>{precisions}</BoiteDePrecision>}
                  </div>
                );
              })}
            </div>
          ))}
        </GroupeDeChoix>
      </div>
      <MissingModeLink context="B1.4 mode domicile-travail" />
    </div>
  );
}
