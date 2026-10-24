/**
 * La page `/point` reçoit les liens de réponse de l'e-mail (étape 6b de `v1-35`, 24/10/2026).
 *
 * Les dérivations sont gardées par leurs tests (`src/types/reponse-par-le-lien.test.ts`, la carte par
 * `checkin-card.test.tsx`) ; ce fichier garde **leurs appels** — `TESTING.md` §2.10 : que la page lise le
 * point par le jeton du lien et jamais sans lui, qu'elle passe à la carte la réponse du lien et l'appel du
 * jeton, que rien ne s'écrive avant le geste, et que chaque état dise ce qu'il doit. Ce que l'export
 * statique rend avant le JavaScript, lui, est gardé par la section D de `scripts/verifier-etats-export.mjs`.
 *
 * Éprouvé en le cassant, le 24/10/2026 — voir le relevé au pied.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import RepondreAuPoint from '@/app/point';
import { debutDePeriodeInterrogee, periodePrecedente, repliqueDuPoint } from '@/types/checkin';
import type { LectureDuPoint, PointDuLien } from '@/types/reponse-par-le-lien';

const JETON = '3bb3de17-8df3-4910-9e77-1381d9ee90f7';

let mockParams: Record<string, string | undefined> = {};
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), setParams: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

const mockLire = jest.fn<Promise<LectureDuPoint>, [string]>();
const mockRepondre = jest.fn();
jest.mock('@/lib/reponse-par-le-lien', () => ({
  lireLePointDuLien: (jeton: string) => mockLire(jeton),
  repondreParLeLien: (...args: unknown[]) => mockRepondre(...args),
}));

// La carte appelle `repondre_au_checkin` par défaut : la page doit lui passer l'appel du jeton, et ce double
// le prouve en restant muet.
const mockRpc = jest.fn();
jest.mock('@/lib/supabase', () => ({ supabase: { rpc: (...args: unknown[]) => mockRpc(...args) } }));

jest.mock('@/components/ramille-dit', () => {
  const { Text } = jest.requireActual('react-native');
  return { RamilleDit: ({ ligne }: { ligne: string }) => <Text>{ligne}</Text> };
});

const SEMAINE = debutDePeriodeInterrogee('commute');

const point = (surcharge: Partial<PointDuLien> = {}): PointDuLien => ({
  loop_type: 'commute',
  poste: 'commute',
  question_kind: 'engagement',
  mode: 'voiture_thermique',
  period_start: SEMAINE,
  period_label: 'Semaine dernière',
  trip_label: 'Trajet domicile-travail',
  question: 'Mardi ou jeudi, as-tu fait ce trajet en train ?',
  committed_saving_kg_once: 2.29,
  status: 'pending',
  response_kind: null,
  responded_at: null,
  boucle_tourne: true,
  ...surcharge,
});

/** `ThemedText` rend insécables certaines espaces : on cherche une phrase sans s'y arrêter. */
const phrase = (texte: string) => new RegExp(texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s'));

beforeEach(() => {
  mockParams = {};
  mockLire.mockReset();
  mockRepondre.mockReset();
  mockRpc.mockReset();
  mockPush.mockReset();
});

it('lit le point par le jeton du lien, dit la réponse choisie, et n’écrit rien avant le geste', async () => {
  mockParams = { jeton: JETON, reponse: 'oui' };
  mockLire.mockResolvedValue({ ok: true, point: point() });

  render(<RepondreAuPoint />);

  expect(await screen.findByText('Tu as choisi : oui.')).toBeTruthy();
  expect(mockLire).toHaveBeenCalledWith(JETON);
  expect(screen.getByText(phrase('Mardi ou jeudi, as-tu fait ce trajet en train ?'))).toBeTruthy();
  expect(mockRepondre).not.toHaveBeenCalled();
  expect(mockRpc).not.toHaveBeenCalled();
});

it('envoie au geste par le jeton, puis dit la réplique de Ramille et ce que le « oui » a évité', async () => {
  mockParams = { jeton: JETON, reponse: 'oui' };
  mockLire.mockResolvedValue({ ok: true, point: point() });
  mockRepondre.mockResolvedValue({ error: null, status: 200 });

  render(<RepondreAuPoint />);
  fireEvent.press(await screen.findByText('Envoyer ma réponse'));

  await waitFor(() => expect(screen.getByText('Au moins 2,2 kg CO₂e évités.')).toBeTruthy());
  expect(mockRepondre).toHaveBeenCalledWith(JETON, 'oui');
  expect(mockRpc).not.toHaveBeenCalled();
  expect(screen.getByText(repliqueDuPoint(point(), 'oui', true).ligne)).toBeTruthy();
});

// « Pas de trajet » et non « non » : toutes ses variantes donnent rendez-vous, alors que celle du « non »
// tirée pour une semaine peut tomber, par le hachage de la période, sur la seule qui n'en donne pas — le
// test serait alors vert sans rien garder (mesuré le 24/10/2026).
it('sans boucle qui tourne, la réplique ne donne pas rendez-vous', async () => {
  mockParams = { jeton: JETON, reponse: 'sans_objet' };
  mockLire.mockResolvedValue({ ok: true, point: point({ boucle_tourne: false }) });
  mockRepondre.mockResolvedValue({ error: null, status: 200 });

  render(<RepondreAuPoint />);
  fireEvent.press(await screen.findByText('Envoyer ma réponse'));

  await waitFor(() => expect(screen.getByText(repliqueDuPoint(point(), 'sans_objet', false).ligne)).toBeTruthy());
  expect(screen.queryByText(repliqueDuPoint(point(), 'sans_objet', true).ligne)).toBeNull();
});

it('sans réponse dans le lien, propose les trois réponses de la carte', async () => {
  mockParams = { jeton: JETON };
  mockLire.mockResolvedValue({ ok: true, point: point() });

  render(<RepondreAuPoint />);

  expect(await screen.findByText('Oui')).toBeTruthy();
  expect(screen.getByText('Non')).toBeTruthy();
  expect(screen.getByText('Pas de trajet la semaine dernière')).toBeTruthy();
  expect(screen.queryByText('Envoyer ma réponse')).toBeNull();
});

it('sans jeton, dit que le lien n’est plus valable sans rien lire', async () => {
  mockParams = { reponse: 'oui' };

  render(<RepondreAuPoint />);

  expect(await screen.findByText('Ce lien n’est plus valable. Tu peux répondre depuis ton plan.')).toBeTruthy();
  expect(mockLire).not.toHaveBeenCalled();
});

it('un jeton que le serveur ne connaît pas mène au même endroit, et le plan s’ouvre par le lien du rappel', async () => {
  mockParams = { jeton: JETON, reponse: 'oui' };
  mockLire.mockResolvedValue({ ok: true, point: null });

  render(<RepondreAuPoint />);

  expect(await screen.findByText('Ce lien n’est plus valable. Tu peux répondre depuis ton plan.')).toBeTruthy();
  fireEvent.press(screen.getByText('Ouvrir mon plan'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/plan', params: { rappel: '1' } });
});

it('un point clos garde sa question et sa réponse, sans bouton', async () => {
  mockParams = { jeton: JETON, reponse: 'non' };
  mockLire.mockResolvedValue({
    ok: true,
    point: point({
      period_start: periodePrecedente('commute', SEMAINE),
      status: 'answered',
      response_kind: 'oui',
      responded_at: '2026-10-01T08:00:00Z',
    }),
  });

  render(<RepondreAuPoint />);

  expect(await screen.findByText('Ce point n’attend plus de réponse : sa période est passée.')).toBeTruthy();
  expect(screen.getByText('Ta réponse : oui.')).toBeTruthy();
  expect(screen.getByText('Au moins 2,2 kg CO₂e évités.')).toBeTruthy();
  expect(screen.queryByText('Envoyer ma réponse')).toBeNull();
  expect(screen.queryByText('Modifier ma réponse')).toBeNull();
});

it('une panne de lecture se dit, et « Réessayer » relit', async () => {
  mockParams = { jeton: JETON, reponse: 'oui' };
  mockLire.mockResolvedValueOnce({ ok: false, genre: 'horsLigne' });
  mockLire.mockResolvedValueOnce({ ok: true, point: point() });

  render(<RepondreAuPoint />);

  expect(await screen.findByText('Ta question n’a pas pu s’afficher. Vérifie ta connexion et réessaie.')).toBeTruthy();
  fireEvent.press(screen.getByText('Réessayer'));

  expect(await screen.findByText('Tu as choisi : oui.')).toBeTruthy();
  expect(mockLire).toHaveBeenCalledTimes(2);
});

// Relevé des mutations, le 24/10/2026 :
//   - la réponse du lien non passée à la carte → les quatre tests qui attendent « Tu as choisi » ;
//   - l'appel du jeton non passé à la carte, qui répond alors par la session → les deux tests qui envoient ;
//   - la boucle dite toujours en train de tourner → « sans boucle qui tourne… », seul (sur « non », il restait
//     vert : voir son commentaire) ;
//   - la lecture lancée sans jeton → « sans jeton… » et la panne, qui relit un jeton nul ;
//   - « Ouvrir mon plan » sans `?rappel=1` → le jeton inconnu, seul ;
//   - la réponse du point clos retirée → « un point clos garde sa question et sa réponse », seul ;
//   - « Réessayer » sans nouvel essai → la panne, seule.
