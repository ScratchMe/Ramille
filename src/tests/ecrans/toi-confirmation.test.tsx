/**
 * « Toi » pendant la confirmation de « Supprimer mon compte » : un seul bouton principal
 * (`v1-33` §6, tension tranchée le 01/10/2026 ; Von Restorff).
 *
 * Confirmation ouverte, « Supprimer définitivement » est le principal — le kit n'a pas de variante
 * destructive — et « Rattacher un compte » portait le même vert plein : deux principaux sur l'écran,
 * mesurés. Tant que la confirmation est ouverte, ce que l'écran pose en principal passe en
 * secondaire, et redevient principal quand elle se ferme. Aucun texte ne change.
 *
 * **Le critère de `TESTING.md` §2.10 est rempli, et le parcours réel ne le voit pas** : la décision
 * est un câblage entre deux composants — `MonCompte` tient la confirmation, l'écran en lit l'état pour
 * choisir la variante d'un bouton qui est à lui. Le parcours joue bien « Supprimer mon compte » puis
 * « Supprimer définitivement », mais il ne lit la couleur d'aucun bouton, et ne referme jamais la
 * confirmation. Aucune dérivation de `src/types` n'y passe : c'est un ternaire d'écran.
 *
 * **Une branche garde sa moitié négative** (`TESTING.md` §2.10) : hors confirmation, et une fois
 * refermée, le bouton est principal ; et « Supprimer définitivement » reste principal pendant.
 *
 * **Ce que ce test ne dit pas** : ce que la couleur donne à l'œil (le contraste du secondaire sur le
 * fond de l'écran est celui du kit), ni le geste sur appareil. La couleur se lit sur le style du bouton
 * rendu : `accent` pour le principal, `backgroundElement` pour le secondaire.
 *
 * **Éprouvé en le cassant, le 01/10/2026** (`TESTING.md` §1.1), une mutation à la fois, l'état d'avant
 * réécrit ensuite — le témoin sans mutation est vert (7/7). Dans `src/app/compte/index.tsx` :
 *   - la variante toujours principale (l'état d'avant) → 2 tests : la confirmation ouverte, et
 *     « Réessayer » ;
 *   - la variante inversée → 4 : tout ce qui lit une couleur, sauf le nom des boutons ;
 *   - « Rattacher un compte » sans la variante → 1, la confirmation ouverte, seul ;
 *   - « Réessayer » sans la variante → 1, le sien, seul ;
 *   - la confirmation que l'écran lit toujours fermée → 4 : la confirmation ne s'ouvre plus.
 * Dans `src/components/compte/mon-compte.tsx` :
 *   - « Annuler » qui ne prévient plus l'écran → 1, « Annuler » : la confirmation reste ouverte ;
 *   - « Supprimer mon compte » qui ne prévient plus l'écran → 4 : elle ne s'ouvre plus ;
 *   - le retour matériel qui ne prévient plus l'écran → 1, le retour, seul ;
 *   - le retour matériel qui prend même confirmation fermée → 1, « il ne prend rien », seul — c'est la
 *     moitié négative : l'écoute que `MonCompte` laisse à la navigation.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { BackHandler, Platform, StyleSheet } from 'react-native';

import Compte from '@/app/compte/index';
import { Colors } from '@/constants/theme';
import type { EtatRattachement } from '@/types/compte';

// Le préfixe `mock` n'est pas cosmétique (`TESTING.md` §2.10) : jest hisse les `jest.mock()`.
const mockEtat = jest.fn<Promise<EtatRattachement>, []>();

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
  // Le retour matériel n'est écouté qu'au premier plan (le crochet le garde) : dans un test, l'écran l'est.
  useIsFocused: () => true,
}));

// Le client Supabase ne se monte pas : l'écran n'en lit que l'écoute de la session, ici muette.
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: jest.fn() } } }) },
  },
}));

jest.mock('@/lib/analytics', () => ({ track: jest.fn() }));

// Ce que l'écran lit et ce qu'il écrit : aucun appel ne part vers le réseau.
jest.mock('@/lib/compte', () => ({
  lireEtatDuRattachement: () => mockEtat(),
  seDeconnecterDeCetAppareil: jest.fn(),
  deleteMyAccount: jest.fn(),
  exportMyData: jest.fn(),
}));

jest.mock('@/lib/notification-prefs', () => ({
  loadReminderPrefs: async () => ({
    prefere: 'push',
    jetonActif: false,
    emailPossible: false,
    email: null,
    reponseALaVeille: null,
  }),
  lireLaFenetreDuMotDeLaVeille: async () => null,
  setMotDeLaVeille: jest.fn(),
  setReminderChannel: jest.fn(),
}));

// Les lignes de canal ne sont pas l'objet : elles tirent les rappels, les permissions et le jeton.
jest.mock('@/components/compte/choix-de-rappel', () => ({ ChoixDeRappel: () => null }));

const fondDe = (nom: string) => {
  const bouton = screen.getByRole('button', { name: nom });
  return StyleSheet.flatten(bouton.props.style).backgroundColor;
};
const estPrincipal = (nom: string) => fondDe(nom) === Colors.light.accent;
const estSecondaire = (nom: string) => fondDe(nom) === Colors.light.backgroundElement;

async function monterSansCompte() {
  mockEtat.mockResolvedValue({ kind: 'local' });
  render(<Compte />);
  await screen.findByRole('button', { name: 'Rattacher un compte' });
}

describe('« Rattacher un compte » pendant la confirmation de suppression', () => {
  test('hors confirmation, c’est le principal — et la couleur se lit bien sur le style', async () => {
    await monterSansCompte();
    expect(estPrincipal('Rattacher un compte')).toBe(true);
    expect(estSecondaire('Rattacher un compte')).toBe(false);
  });

  test('confirmation ouverte, il passe en secondaire et « Supprimer définitivement » reste le principal', async () => {
    await monterSansCompte();
    fireEvent.press(screen.getByRole('button', { name: 'Supprimer mon compte' }));
    await screen.findByRole('button', { name: 'Supprimer définitivement' });
    expect(estSecondaire('Rattacher un compte')).toBe(true);
    expect(estPrincipal('Rattacher un compte')).toBe(false);
    expect(estPrincipal('Supprimer définitivement')).toBe(true);
  });

  test('« Annuler » referme la confirmation, et il redevient le principal', async () => {
    await monterSansCompte();
    fireEvent.press(screen.getByRole('button', { name: 'Supprimer mon compte' }));
    fireEvent.press(await screen.findByRole('button', { name: 'Annuler' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Supprimer définitivement' })).toBeNull());
    expect(estPrincipal('Rattacher un compte')).toBe(true);
  });

  test('aucun texte ne change : le même bouton, sous le même nom, dans les trois états', async () => {
    await monterSansCompte();
    expect(screen.getAllByRole('button', { name: 'Rattacher un compte' })).toHaveLength(1);
    fireEvent.press(screen.getByRole('button', { name: 'Supprimer mon compte' }));
    await screen.findByRole('button', { name: 'Supprimer définitivement' });
    expect(screen.getAllByRole('button', { name: 'Rattacher un compte' })).toHaveLength(1);
  });
});

/**
 * **Le retour matériel referme la confirmation, et l'écran le sait** (T-8 : « Toi » confirmation
 * ouverte, il quittait l'écran). `MonCompte` ne tient plus la confirmation — elle est à l'écran —, donc
 * le retour passe par la même demande que « Annuler » : sans elle, la confirmation se refermerait sans
 * que « Rattacher un compte » redevienne le principal, ou l'inverse. Ce chemin ne se joue que sur
 * Android, que le parcours réel (web) ne voit pas.
 */
describe('le retour matériel d’Android, confirmation ouverte', () => {
  const osDOrigine = Platform.OS;
  type Ecouteur = () => boolean | null | undefined;
  let ecouteurs: Ecouteur[] = [];
  let abonnements: jest.SpyInstance;

  beforeEach(() => {
    ecouteurs = [];
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });
    abonnements = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_evenement, ecouteur) => {
      ecouteurs.push(ecouteur as Ecouteur);
      return { remove: () => (ecouteurs = ecouteurs.filter((e) => e !== ecouteur)) };
    });
  });
  afterEach(() => {
    abonnements.mockRestore();
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => osDOrigine });
  });

  test('il referme la confirmation, et « Rattacher un compte » redevient le principal', async () => {
    await monterSansCompte();
    fireEvent.press(screen.getByRole('button', { name: 'Supprimer mon compte' }));
    await screen.findByRole('button', { name: 'Supprimer définitivement' });
    expect(estSecondaire('Rattacher un compte')).toBe(true);
    // L'écoute la plus récente parle la première, comme le fait Android.
    let pris = false;
    act(() => {
      pris = [...ecouteurs].reverse().some((ecouteur) => ecouteur() === true);
    });
    expect(pris).toBe(true);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Supprimer définitivement' })).toBeNull());
    expect(estPrincipal('Rattacher un compte')).toBe(true);
  });

  test('sans confirmation ouverte, il ne prend rien : la navigation fait son travail', async () => {
    await monterSansCompte();
    let pris = false;
    act(() => {
      pris = [...ecouteurs].reverse().some((ecouteur) => ecouteur() === true);
    });
    expect(pris).toBe(false);
  });
});

describe('« Réessayer », l’autre principal de l’écran', () => {
  test('même règle : l’état indisponible porte un principal, et la confirmation le fait passer en secondaire', async () => {
    mockEtat.mockResolvedValue({ kind: 'indisponible' });
    render(<Compte />);
    await screen.findByRole('button', { name: 'Réessayer' });
    expect(estPrincipal('Réessayer')).toBe(true);
    fireEvent.press(screen.getByRole('button', { name: 'Supprimer mon compte' }));
    await screen.findByRole('button', { name: 'Supprimer définitivement' });
    expect(estSecondaire('Réessayer')).toBe(true);
    expect(estPrincipal('Supprimer définitivement')).toBe(true);
  });
});
