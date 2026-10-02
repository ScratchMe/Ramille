/**
 * **« 10+ » ouvre un champ, réclamé** (`v1-33` §6, décidé le 01/10/2026, précisé le 02/10/2026 avec la
 * personne qui pilote).
 *
 * La puce enregistrait 10 : vingt vols comptaient pour dix, sur le poste le plus lourd, chez ceux qui
 * émettent le plus. Ce qui manque et ce que vaut un nombre se dérivent dans `src/types/bilan.ts`
 * (`plafondChoisi`, `manqueDeLEtape`), et c'est là qu'ils se testent ; ce fichier garde **ce que l'écran
 * leur passe** — le drapeau du « 10+ » touché, que la colonne ne sait pas dire —, et ce qu'il en fait :
 * le champ qui s'ouvre, la part de vols courts qui devient un champ borné au total, la relecture au-delà
 * de cinquante, et « Suivant » qui mène au champ resté vide (`TESTING.md` §2.10).
 *
 * Éprouvé en le cassant, le 02/10/2026 (TESTING.md §1.1), une mutation à la fois, la suite Jest entière
 * sous `TZ=Europe/Paris` :
 *   - le drapeau jamais posé (`choisirLePlafond` vidé dans l'écran) → six tests sur sept : tous, sauf
 *     le nombre relu d'un re-bilan, que le nombre seul suffit à dire ;
 *   - la part de vols courts sans borne → « au-delà de dix vols… », seul ;
 *   - la puce « 3 » qui ne retire pas le drapeau → « une autre puce referme le champ », seul ;
 *   - « Oui » ou « Non » qui gardent les drapeaux des séries → « Non retire les 10+ des séries », seul.
 *
 * **Et le soir même, sur la contre-lecture**, sept de plus, chacune ne fait tomber qu'un test :
 *   - la frappe dans le champ des vols qui ne pose pas le drapeau → « corriger un nombre relu… » ;
 *   - la même dans une série → « corriger une série relue… » ;
 *   - un total qui repart de zéro sans reposer la part → « un total tapé 0 puis remonté… » ;
 *   - « Oui » retouché qui efface toujours les drapeaux des séries → « retoucher Oui… » ;
 *   - le décompte rendu même quand la part dépasse le total → « retaper le total… » ;
 *   - le total qui ramène la part à chaque frappe (`volsCourtsApresTotal`) → « retaper le total… » ;
 *   - le champ sans la borne du `smallint` → « le champ s'arrête à la borne… ».
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import BilanQuestionnaire from '@/app/bilan';
import { loadBilanDraft } from '@/lib/bilan-draft';
import { EMPTY_BILAN_ANSWERS, type BilanAnswers } from '@/types/bilan';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => false), dismissAll: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
  useIsFocused: () => true,
}));
jest.mock('@/lib/analytics', () => ({ track: jest.fn() }));
jest.mock('@/lib/bilan-draft', () => ({
  loadBilanDraft: jest.fn(),
  saveBilanDraft: jest.fn(),
  clearBilanDraft: jest.fn(async () => {}),
}));
jest.mock('@/lib/bilan-history', () => ({
  loadLastSubmittedAnswers: jest.fn(async () => ({ ok: true, data: null })),
}));
jest.mock('@/lib/engagement-en-cours', () => ({
  lireLEngagementEnCours: jest.fn(async () => ({ ok: true, data: null })),
}));
jest.mock('@/lib/marque-de-bilan', () => ({
  aDejaVuUnBilan: jest.fn(async () => false),
  marquerQuIlYAUnBilan: jest.fn(async () => {}),
}));
jest.mock('@/lib/premier-parcours', () => ({
  lireLePremierParcours: jest.fn(async () => null),
  noterLePremierParcours: jest.fn(async () => {}),
}));
jest.mock('@/lib/supabase', () => ({
  ensureSession: jest.fn(async () => ({ user: { id: 'u1' } })),
  supabase: { from: jest.fn() },
}));

/** Un brouillon arrêté aux vols, rien de répondu dessus. */
const AUX_VOLS: BilanAnswers = {
  ...EMPTY_BILAN_ANSWERS,
  commute_has_regular_trip: false,
  leisure_frequency: 'rarely',
};

/** Arrêté aux longs trajets, deux trajets en train : un « Oui » que disent les compteurs. */
const AUX_LONGS_TRAJETS: BilanAnswers = {
  ...AUX_VOLS,
  flights_total_per_year: 0,
  flights_short_per_year: 0,
  train_long_trips_per_year: 2,
  coach_long_trips_per_year: 0,
  car_long_trips_per_year: 0,
};

const coche = (nom: string, rang = 0) =>
  screen.getAllByRole('radio', { name: nom })[rang].props.accessibilityState?.checked === true;
const taper = (label: string, texte: string) => fireEvent.changeText(screen.getByLabelText(label), texte);

async function ouvrirSur(step: 'flights' | 'long_trips', answers: BilanAnswers, titre: string) {
  jest.mocked(loadBilanDraft).mockResolvedValue({ answers, step, savedAt: new Date().toISOString() });
  render(<BilanQuestionnaire />);
  await screen.findByText(titre);
}

const QUESTION_DES_VOLS = 'Combien de vols prends-tu dans une année type ?';
const QUESTION_DES_LONGS_TRAJETS = 'Hors avion, fais-tu des trajets de plus de 300 km sur une année type ?';

describe('les vols', () => {
  test('« 10+ » ouvre le champ, vide et réclamé : « Suivant » y mène', async () => {
    await ouvrirSur('flights', AUX_VOLS, QUESTION_DES_VOLS);
    expect(screen.queryByLabelText('Nombre de vols sur une année')).toBeNull();

    fireEvent.press(screen.getByRole('radio', { name: '10 vols ou plus' }));
    expect(coche('10 vols ou plus')).toBe(true);
    expect(screen.getByLabelText('Nombre de vols sur une année').props.value).toBe('');

    fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText('Il manque encore le nombre de vols.')).toBeTruthy();

    taper('Nombre de vols sur une année', '25');
    expect(coche('10 vols ou plus')).toBe(true);
    expect(screen.getByText(/^Sur ces 25, combien sont courts/)).toBeTruthy();
  });

  test('au-delà de dix vols, la part de vols courts est un champ, borné au total', async () => {
    await ouvrirSur('flights', AUX_VOLS, QUESTION_DES_VOLS);
    fireEvent.press(screen.getByRole('radio', { name: '10 vols ou plus' }));
    taper('Nombre de vols sur une année', '25');

    taper('Nombre de vols courts', '30');
    expect(screen.getByLabelText('Nombre de vols courts').props.value).toBe('25');
    expect(screen.getByText('Aucun vol long-courrier ne sera compté.')).toBeTruthy();
  });

  test('au-delà de cinquante, une ligne de relecture — jamais un blocage', async () => {
    await ouvrirSur('flights', AUX_VOLS, QUESTION_DES_VOLS);
    fireEvent.press(screen.getByRole('radio', { name: '10 vols ou plus' }));
    taper('Nombre de vols sur une année', '50');
    expect(screen.queryByText(/^C’est beaucoup pour une année/)).toBeNull();
    taper('Nombre de vols sur une année', '250');
    expect(screen.getByText(/^C’est beaucoup pour une année/)).toBeTruthy();
  });

  test('une autre puce referme le champ, et c’est elle qui répond', async () => {
    await ouvrirSur('flights', AUX_VOLS, QUESTION_DES_VOLS);
    fireEvent.press(screen.getByRole('radio', { name: '10 vols ou plus' }));
    taper('Nombre de vols sur une année', '5');
    // Un nombre plus petit tapé dans le champ : c'est encore le champ qui répond.
    expect(coche('5')).toBe(false);
    expect(coche('10 vols ou plus')).toBe(true);

    // Cinq vols tapés font apparaître la rangée des vols courts, de 0 à 5 : la première « 3 » est celle du total.
    fireEvent.press(screen.getAllByRole('radio', { name: '3' })[0]);
    expect(coche('3')).toBe(true);
    expect(coche('10 vols ou plus')).toBe(false);
    expect(screen.queryByLabelText('Nombre de vols sur une année')).toBeNull();
  });

  // **Corriger un nombre relu passe par un nombre plus petit** (contre-lecture du 02/10/2026) : sans
  // drapeau, « 1 » — la frappe qui mène de 14 à 16 — refermait le champ sous le doigt, clavier compris.
  // La frappe est jouée chiffre à chiffre : un `changeText('16')` d'un coup est un collé (TESTING.md §1.9).
  test('corriger un nombre relu garde le champ ouvert, même en passant sous dix', async () => {
    await ouvrirSur('flights', { ...AUX_VOLS, flights_total_per_year: 14, flights_short_per_year: 2 }, QUESTION_DES_VOLS);
    taper('Nombre de vols sur une année', '1');
    expect(coche('10 vols ou plus')).toBe(true);
    taper('Nombre de vols sur une année', '16');
    expect(coche('10 vols ou plus')).toBe(true);
    expect(screen.getByLabelText('Nombre de vols sur une année').props.value).toBe('16');
  });

  // Un total nul pose la part à zéro ; en repartir la repose à vide — ce zéro n'était pas une réponse.
  test('un total tapé « 0 » puis remonté repose la part de vols courts à vide', async () => {
    await ouvrirSur('flights', AUX_VOLS, QUESTION_DES_VOLS);
    fireEvent.press(screen.getByRole('radio', { name: '10 vols ou plus' }));
    taper('Nombre de vols sur une année', '0');
    taper('Nombre de vols sur une année', '15');
    expect(screen.getByLabelText('Nombre de vols courts').props.value).toBe('');
    expect(screen.queryByText(/(sera|seront) comptés?\.$/)).toBeNull();
  });

  // **Le total ne ramène pas la part** : la ramener à chaque frappe perdait la réponse pendant qu'on
  // retape le total. Plus grande qu'un total redescendu, elle se tait — ni puce cochée, ni décompte — et
  // revient quand le total remonte.
  test('retaper le total en passant sous la part ne la perd pas', async () => {
    await ouvrirSur('flights', AUX_VOLS, QUESTION_DES_VOLS);
    fireEvent.press(screen.getByRole('radio', { name: '10 vols ou plus' }));
    taper('Nombre de vols sur une année', '25');
    taper('Nombre de vols courts', '20');
    taper('Nombre de vols sur une année', '2');
    expect(screen.queryByText(/(sera|seront) comptés?\.$/)).toBeNull();
    taper('Nombre de vols sur une année', '25');
    expect(screen.getByLabelText('Nombre de vols courts').props.value).toBe('20');
    expect(screen.getByText('5 vols long-courriers seront comptés.')).toBeTruthy();
  });

  // La colonne est un `smallint` : au-delà, l'insert échouait sans dire où.
  test('le champ s’arrête à la borne de la colonne', async () => {
    await ouvrirSur('flights', AUX_VOLS, QUESTION_DES_VOLS);
    fireEvent.press(screen.getByRole('radio', { name: '10 vols ou plus' }));
    taper('Nombre de vols sur une année', '40000');
    expect(screen.getByLabelText('Nombre de vols sur une année').props.value).toBe('32767');
  });

  test('un nombre déjà au-delà de dix — un re-bilan, un bilan d’avant — dit « 10+ » et se relit dans le champ', async () => {
    await ouvrirSur('flights', { ...AUX_VOLS, flights_total_per_year: 14, flights_short_per_year: 2 }, QUESTION_DES_VOLS);
    expect(coche('10 vols ou plus')).toBe(true);
    expect(screen.getByLabelText('Nombre de vols sur une année').props.value).toBe('14');
    expect(screen.getByLabelText('Nombre de vols courts').props.value).toBe('2');
  });
});

describe('les longs trajets', () => {
  test('« 10+ » d’une série ouvre son champ, et « Suivant » le réclame même quand le train compte deux trajets', async () => {
    await ouvrirSur('long_trips', AUX_LONGS_TRAJETS, QUESTION_DES_LONGS_TRAJETS);
    // Les trois séries ont chacune leur « 10+ » : train, autocar, voiture.
    fireEvent.press(screen.getAllByRole('radio', { name: '10 trajets ou plus' })[2]);
    expect(screen.getByLabelText('Nombre de trajets en voiture sur une année').props.value).toBe('');

    fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText('Il manque encore le nombre de trajets en voiture.')).toBeTruthy();

    taper('Nombre de trajets en voiture sur une année', '14');
    // La boîte de la voiture attendait le nombre : elle s'ouvre avec lui.
    expect(screen.getByText('Quelle motorisation ?')).toBeTruthy();
  });

  test('corriger une série relue garde son champ, et la boîte de la voiture avec ses réponses', async () => {
    await ouvrirSur(
      'long_trips',
      { ...AUX_LONGS_TRAJETS, car_long_trips_per_year: 14, car_long_trips_engine: 'thermique', car_long_trips_occupancy: 2 },
      QUESTION_DES_LONGS_TRAJETS
    );
    taper('Nombre de trajets en voiture sur une année', '1');
    taper('Nombre de trajets en voiture sur une année', '16');
    expect(coche('10 trajets ou plus', 2)).toBe(true);
    expect(screen.getByLabelText('Nombre de trajets en voiture sur une année').props.value).toBe('16');
    expect(coche('Thermique')).toBe(true);
  });

  // « Oui » retouché sur des trajets déjà déclarés ne réécrit rien : il garde les « 10+ » des séries.
  test('retoucher « Oui » garde le « 10+ » d’une série et son champ vide, réclamé', async () => {
    await ouvrirSur('long_trips', AUX_LONGS_TRAJETS, QUESTION_DES_LONGS_TRAJETS);
    fireEvent.press(screen.getAllByRole('radio', { name: '10 trajets ou plus' })[1]);
    fireEvent.press(screen.getByRole('radio', { name: 'Oui' }));
    expect(coche('10 trajets ou plus', 1)).toBe(true);
    fireEvent.press(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText('Il manque encore le nombre de trajets en autocar.')).toBeTruthy();
  });

  test('« Non » retire les « 10+ » des séries : rouvertes par « Oui », elles ne réclament rien d’office', async () => {
    await ouvrirSur('long_trips', AUX_LONGS_TRAJETS, QUESTION_DES_LONGS_TRAJETS);
    fireEvent.press(screen.getAllByRole('radio', { name: '10 trajets ou plus' })[1]);
    expect(screen.getByLabelText('Nombre de trajets en autocar sur une année')).toBeTruthy();

    fireEvent.press(screen.getByRole('radio', { name: 'Non' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Oui' }));
    expect(coche('10 trajets ou plus', 1)).toBe(false);
    expect(screen.queryByLabelText('Nombre de trajets en autocar sur une année')).toBeNull();
  });
});
