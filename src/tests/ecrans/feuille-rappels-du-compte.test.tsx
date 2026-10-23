/**
 * La feuille des rappels, sur sa troisième ouverture : **le compte** (`etape: 'compte'`, 23/10/2026,
 * `v1-35` étape 4 — « le compte comme condition des rappels sur le web »).
 *
 * Sur le web, sans adresse sur laquelle un rappel pourrait partir, il n'y a rien à choisir : pas de
 * notification, et l'email exige un compte. La feuille du canal ne s'ouvre donc pas, et c'est une
 * petite feuille qui s'ouvre à sa place, une fois par appareil — Ramille dit pourquoi, et la porte est
 * à deux boutons : « Rattacher mon adresse » et « Plus tard ».
 *
 * **Le critère de `TESTING.md` §2.10 est rempli** : quelle feuille s'ouvre est une dérivation de
 * `src/types` (`ouvertureDeLaFeuille`, testée), mais ce que la feuille **fait** de ses deux boutons est
 * un câblage d'écran — la porte vers `/connexion` et sa provenance, la marque posée à l'affichage, le
 * rendu de ce qu'elle a reçu — que ni la dérivation ni le parcours réel ne voient en entier (le parcours
 * joue « Plus tard » ; il ne passe pas par la porte, qui quitterait le plan).
 *
 * **Ce que ce fichier ne dit pas** : la feuille rendue par react-native-web (le focus d'ouverture que le
 * `Modal` pose, `feuille-du-bas-sur-web.test.tsx` en tient le principe, le parcours réel la mesure) et
 * le geste sur appareil.
 *
 * **Éprouvé en le cassant, le 23/10/2026** (`TESTING.md` §1.1), `src/components/plan/feuille-rappels.tsx`
 * restauré par l'état d'avant réécrit après chaque mutation, le témoin sans mutation vert (140 tests
 * avec `rappels.test.ts`, `plan.test.tsx` et `mascotte.test.ts`, joués ensemble) :
 *   - la marque jamais posée à l'affichage → « afficher la feuille pose la marque », seul ;
 *   - `allerRattacher` qui ne repose plus la marque au geste → « la porte de la feuille du canal fait
 *     toujours la même chose », seul — c'est la porte que le partage a touchée ;
 *   - la provenance `compte` au lieu de `rappels` → « mène à `/connexion` par la provenance `rappels` » et
 *     la porte de la feuille du canal ;
 *   - la route poussée avant que la feuille rende la main → « rend la main à l'écran avant de naviguer »,
 *     seul ;
 *   - « Plus tard » qui prend la porte du rattachement, ou qui écrit « Sans rappel » → « Plus tard referme…
 *     sans naviguer ni rien écrire », seul chaque fois ;
 *   - `TitreDArrivee` retiré de la phrase → « le focus va à la phrase d'ouverture », seul ;
 *   - la branche du compte qui ne reconnaît plus son étape → huit tests ;
 *   - le geste de retour qui ne rend plus la main → « le geste de retour ferme de même », seul ;
 *   - la feuille du canal qui marque aussi à l'affichage → « la feuille du canal ne marque pas à
 *     l'affichage » (la moitié négative) et la porte du canal.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';
import { AccessibilityInfo, Modal } from 'react-native';

import { FeuilleRappels } from '@/components/plan/feuille-rappels';
import { marquerFeuilleDeRappelVue, setMotDeLaVeille, setReminderChannel } from '@/lib/notification-prefs';
import type { ReminderPrefs } from '@/lib/notification-prefs';
import { demanderLaPermission, enregistrerLeJeton } from '@/lib/rappels';
import type { OuvertureDeLaFeuille } from '@/types/rappels';

// ── Les doublures : le réseau, le stockage et la navigation. La feuille et son cadre sont vrais. ──

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));
jest.mock('@/lib/notification-prefs', () => ({
  lireLaFenetreDuMotDeLaVeille: jest.fn(async () => null),
  marquerFeuilleDeRappelVue: jest.fn(async () => {}),
  marquerLaVeilleProposee: jest.fn(async () => {}),
  setMotDeLaVeille: jest.fn(async () => null),
  setReminderChannel: jest.fn(async () => null),
}));
jest.mock('@/lib/rappels', () => ({
  demanderLaPermission: jest.fn(async () => 'demandable'),
  enregistrerLeJeton: jest.fn(async () => false),
}));
// La mascotte dessine en SVG, que ce fichier ne garde pas.
jest.mock('@/components/mascot', () => ({ Mascot: () => null }));

/** Un appareil sans compte : la préférence en base vaut `email`, et rien ne peut l'envoyer. */
const SANS_COMPTE: ReminderPrefs = {
  prefere: 'email',
  jetonActif: false,
  emailPossible: false,
  email: null,
  reponseALaVeille: 'jamais_propose',
};

const PHRASE = 'Sur le web, je ne peux te faire signe que par email. Rattache ton adresse pour recevoir le rappel.';

function monter(ouverture: OuvertureDeLaFeuille, prefs: ReminderPrefs = SANS_COMPTE) {
  const onFerme = jest.fn();
  render(
    <FeuilleRappels
      prefs={prefs}
      boucle="hebdo"
      echeance={null}
      permission="fermee"
      ouverture={ouverture}
      onFerme={onFerme}
    />
  );
  return { onFerme };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('FeuilleRappels — l’ouverture sur le compte', () => {
  test('Ramille dit la phrase de la décision, mot pour mot, et la feuille offre deux boutons', () => {
    monter({ etape: 'compte' });
    expect(screen.getByText(PHRASE)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rattacher mon adresse' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Plus tard' })).toBeTruthy();
  });

  test('elle ne montre rien du choix du canal : ni la question, ni les lignes, ni le bouton du canal', () => {
    monter({ etape: 'compte' });
    expect(screen.queryByText('Comment tu préfères que je te fasse signe ?')).toBeNull();
    expect(screen.queryByText('Par email')).toBeNull();
    expect(screen.queryByText('Sans rappel')).toBeNull();
    expect(screen.queryByText('C’est bon')).toBeNull();
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  test('le dialogue garde son nom « Les rappels », sans en-tête visible', () => {
    monter({ etape: 'compte' });
    expect(screen.queryByText('Les rappels')).toBeNull();
    expect(screen.UNSAFE_getByType(Modal).props['aria-label']).toBe('Les rappels');
  });

  test('afficher la feuille pose la marque « feuille déjà vue », sans qu’aucun geste ait eu lieu', () => {
    monter({ etape: 'compte' });
    expect(marquerFeuilleDeRappelVue).toHaveBeenCalledTimes(1);
  });

  // La moitié négative : la feuille du canal, elle, ne marque qu'à son geste ou à sa fermeture. Si elle
  // marquait aussi à l'affichage, la perte d'une marque se jouerait autrement qu'avant.
  test('la feuille du canal ne marque pas à l’affichage — la moitié négative', () => {
    monter({ etape: 'canal' });
    expect(marquerFeuilleDeRappelVue).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Rattacher mon adresse' })).toBeNull();
    expect(screen.queryByText(PHRASE)).toBeNull();
  });

  test('le focus va à la phrase d’ouverture : elle est toute l’explication', () => {
    const focus = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => {});
    try {
      monter({ etape: 'compte' });
      const vise = focus.mock.calls.filter(([, evenement]) => evenement === 'focus').at(-1)?.[0] as
        | { props?: { accessibilityRole?: string; children?: unknown } }
        | undefined;
      // Le nœud focalisé est l'enveloppe du titre d'arrivée, un en-tête qui porte la phrase de Ramille.
      expect(vise?.props?.accessibilityRole).toBe('header');
      const phrase = screen.getByText(PHRASE);
      let enveloppe: typeof phrase.parent = phrase.parent;
      while (enveloppe && enveloppe.props.accessibilityRole !== 'header') enveloppe = enveloppe.parent;
      expect(enveloppe).toBeTruthy();
    } finally {
      focus.mockRestore();
    }
  });

  describe('« Rattacher mon adresse »', () => {
    test('mène à `/connexion` par la provenance `rappels` — la porte de la ligne « Par email », pas une neuve', () => {
      monter({ etape: 'compte' });
      fireEvent.press(screen.getByRole('button', { name: 'Rattacher mon adresse' }));
      expect(router.push).toHaveBeenCalledTimes(1);
      expect(router.push).toHaveBeenCalledWith({ pathname: '/connexion', params: { source: 'rappels' } });
    });

    test('rend la main à l’écran avant de naviguer, avec ce qu’il avait donné — la route ne s’empile pas sous le Modal', () => {
      const { onFerme } = monter({ etape: 'compte' });
      fireEvent.press(screen.getByRole('button', { name: 'Rattacher mon adresse' }));
      expect(onFerme).toHaveBeenCalledTimes(1);
      expect(onFerme).toHaveBeenCalledWith('email', false, 'jamais_propose');
      // L'ordre : la feuille se démonte (l'écran a la main) puis la route est poussée.
      expect((onFerme.mock.invocationCallOrder[0] ?? Infinity) < ((router.push as jest.Mock).mock.invocationCallOrder[0] ?? 0)).toBe(true);
    });

    test('n’écrit ni la préférence, ni le jeton, ni la réponse à la veille', () => {
      monter({ etape: 'compte' });
      fireEvent.press(screen.getByRole('button', { name: 'Rattacher mon adresse' }));
      expect(setReminderChannel).not.toHaveBeenCalled();
      expect(setMotDeLaVeille).not.toHaveBeenCalled();
      expect(demanderLaPermission).not.toHaveBeenCalled();
      expect(enregistrerLeJeton).not.toHaveBeenCalled();
    });

    test('la marque est posée avant de partir : qui revient avec une adresse ne voit pas la feuille du canal', () => {
      monter({ etape: 'compte' });
      fireEvent.press(screen.getByRole('button', { name: 'Rattacher mon adresse' }));
      // Posée à l'affichage et reposée au geste : au moins une fois avant la navigation.
      const premiereMarque = (marquerFeuilleDeRappelVue as jest.Mock).mock.invocationCallOrder[0] ?? Infinity;
      const navigation = (router.push as jest.Mock).mock.invocationCallOrder[0] ?? 0;
      expect(premiereMarque < navigation).toBe(true);
    });
  });

  // La porte de la ligne « Par email » de la feuille du canal et celle-ci ne sont plus qu'une
  // (`allerRattacher`) : ce test garde la première, que le partage a touchée.
  test('la porte de la feuille du canal fait toujours la même chose : marque, retour à l’écran, `/connexion`', () => {
    const { onFerme } = monter({ etape: 'canal' });
    fireEvent.press(screen.getByRole('link', { name: 'Rattacher un compte' }));
    expect(marquerFeuilleDeRappelVue).toHaveBeenCalledTimes(1);
    expect(onFerme).toHaveBeenCalledWith('email', false, 'jamais_propose');
    expect(router.push).toHaveBeenCalledWith({ pathname: '/connexion', params: { source: 'rappels' } });
  });

  describe('« Plus tard »', () => {
    test('referme la feuille et rend la main à l’écran, sans naviguer ni rien écrire', async () => {
      const { onFerme } = monter({ etape: 'compte' });
      fireEvent.press(screen.getByRole('button', { name: 'Plus tard' }));
      // La feuille redescend avant de rendre la main : la fin passe par `scheduleOnRN`, un microtask.
      await waitFor(() => expect(onFerme).toHaveBeenCalledTimes(1));
      expect(onFerme).toHaveBeenCalledWith('email', false, 'jamais_propose');
      expect(router.push).not.toHaveBeenCalled();
      expect(setReminderChannel).not.toHaveBeenCalled();
      expect(setMotDeLaVeille).not.toHaveBeenCalled();
    });

    test('le geste de retour ferme de même : une feuille qu’on ne peut pas fermer n’est plus une proposition', async () => {
      const { onFerme } = monter({ etape: 'compte' });
      const modal = screen.UNSAFE_getByType(Modal);
      await act(async () => modal.props.onRequestClose());
      await waitFor(() => expect(onFerme).toHaveBeenCalledTimes(1));
      expect(onFerme).toHaveBeenCalledWith('email', false, 'jamais_propose');
      expect(router.push).not.toHaveBeenCalled();
    });
  });
});
