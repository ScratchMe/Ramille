/**
 * Le captcha de l'app Android (`CaptchaNatif`) : le câblage des messages de la vue web aux issues du
 * pont (`src/lib/captcha.ts`). La page et la lecture des messages ont leurs tests
 * (`src/types/captcha-natif.test.ts`), le pont les siens (`src/lib/captcha.test.ts`) ; ce fichier garde
 * ce qui les relie, que le parcours réel, joué sur le web, ne voit pas (`TESTING.md` §2.10).
 *
 * La vue web est doublée : elle compte ses montages et rend ses propriétés. Ce que ce fichier ne voit
 * pas : le vrai widget dans une vraie vue web — le premier build qui l'embarque, puis l'activation en
 * séance (registre d'exploitation §3.11).
 *
 * Éprouvé en le cassant, le 04/10/2026 : `jeton` et `erreur` intervertis font tomber les deux tests ;
 * `demande.interaction()` oublié fait tomber « la case demandée… », seul (la phrase s'affiche, mais le
 * pont n'est pas prévenu et le plafond reste à trente secondes) ; `Keyboard.dismiss` retiré, le même,
 * seul ; `signalerLaCaseDuCaptcha(true)` oublié, le même, seul ; la vue web remontée à la bascule (une
 * `key` qui suit l'état), le même, seul. Une première écriture simulait les horloges après la demande,
 * et l'oubli de `interaction()` passait : le plafond, posé sur la vraie horloge, ne tombait jamais.
 */
import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Keyboard } from 'react-native';

import { CaptchaNatif } from '@/components/captcha-natif';
import { DELAI_POUR_COCHER_MS, jetonDuCaptcha, laCaseDuCaptchaEstMontree, PHRASE_DE_LA_CASE } from '@/lib/captcha';

type ProprietesDeLaVueWeb = {
  source: { html: string; baseUrl: string };
  onMessage: (evenement: { nativeEvent: { data: string } }) => void;
};

const mockVueWeb: { montages: number; proprietes: ProprietesDeLaVueWeb | null } = { montages: 0, proprietes: null };

jest.mock('react-native-webview', () => {
  const { useEffect, createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    WebView: (proprietes: ProprietesDeLaVueWeb) => {
      useEffect(() => {
        mockVueWeb.montages += 1;
      }, []);
      mockVueWeb.proprietes = proprietes;
      return createElement(View, { testID: 'vue-web' });
    },
  };
});

const message = (donnees: object) => {
  act(() => mockVueWeb.proprietes?.onMessage({ nativeEvent: { data: JSON.stringify(donnees) } }));
};

beforeEach(() => {
  mockVueWeb.montages = 0;
  mockVueWeb.proprietes = null;
  // Les horloges sont simulées avant la demande : le plafond se pose à la demande, et une horloge
  // simulée après coup ne le verrait jamais tomber.
  jest.useFakeTimers();
});

// Une demande restée en suspens (un test qui tombe) tiendrait la file du pont, et ferait tomber le
// suivant par délai : ses plafonds tombent ici.
afterEach(() => {
  act(() => jest.runOnlyPendingTimers());
  jest.useRealTimers();
});

it('la case demandée : la phrase, le clavier fermé, la pile cachée, la même vue web — puis le jeton', async () => {
  const fermerLeClavier = jest.spyOn(Keyboard, 'dismiss');
  render(<CaptchaNatif />);
  let promesse: Promise<string | undefined> = Promise.resolve(undefined);
  await act(async () => {
    promesse = jetonDuCaptcha('session_anonyme', 'cle-de-test');
    await Promise.resolve();
  });

  expect(mockVueWeb.proprietes?.source.baseUrl).toBe('https://www.ramille.fr');
  expect(mockVueWeb.proprietes?.source.html).toContain('"sitekey":"cle-de-test"');
  expect(screen.queryByText(PHRASE_DE_LA_CASE)).toBeNull();

  message({ type: 'interaction' });
  expect(screen.getByText(PHRASE_DE_LA_CASE)).toBeTruthy();
  expect(fermerLeClavier).toHaveBeenCalled();
  expect(laCaseDuCaptchaEstMontree()).toBe(true);
  expect(mockVueWeb.montages).toBe(1);
  // Le pont a été prévenu : au-delà des trente secondes ordinaires, la demande tient encore.
  act(() => jest.advanceTimersByTime(DELAI_POUR_COCHER_MS - 1_000));
  expect(screen.getByTestId('vue-web')).toBeTruthy();

  message({ type: 'jeton', jeton: 'jeton-natif' });
  await expect(promesse).resolves.toBe('jeton-natif');
  expect(screen.queryByTestId('vue-web')).toBeNull();
  expect(laCaseDuCaptchaEstMontree()).toBe(false);
  fermerLeClavier.mockRestore();
});

it('une erreur de la vue web ne rend aucun jeton, et la retire', async () => {
  render(<CaptchaNatif />);
  let promesse: Promise<string | undefined> = Promise.resolve('pas encore');
  await act(async () => {
    promesse = jetonDuCaptcha('code_de_connexion', 'cle-de-test');
    await Promise.resolve();
  });
  message({ type: 'erreur' });
  await expect(promesse).resolves.toBeUndefined();
  expect(screen.queryByTestId('vue-web')).toBeNull();
});
