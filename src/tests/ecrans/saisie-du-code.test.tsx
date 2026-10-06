/**
 * La saisie du code, quand on redemande un code (recette du 28/09/2026, constat H2).
 *
 * Le champ se vidait à **chaque** « Renvoyer un code », y compris refusé : un second envoi à moins
 * d'une minute rend « Trop de demandes pour le moment », aucun code ne part, celui qu'on était en
 * train de comparer à l'e-mail vaut peut-être encore — et ses chiffres avaient disparu. La règle
 * écrite était pourtant « le champ ne se vide qu'au renvoi ».
 *
 * **Le critère de `TESTING.md` §2.10 est rempli** : la décision vit dans l'écran, pas dans une
 * dérivation de `src/types`, et le parcours réel ne fait jamais de renvoi refusé.
 *
 * Le troisième cas garde la raison pour laquelle c'est `suiteDuRenvoi` qui décide et non l'erreur
 * nue : une adresse sans compte rend une erreur (`otp_disabled`) que le produit traite comme un
 * envoi réussi. Si le champ ne se vidait que « sans erreur », il se viderait pour une adresse connue
 * et pas pour une inconnue — l'écran dirait qui utilise Ramille.
 *
 * **Éprouvé en le cassant, le 28/09/2026** (TESTING.md §1.1) :
 *   - `setCode('')` sans condition (l'état d'avant) → « un renvoi refusé garde les chiffres », seul ;
 *   - `if (!error) setCode('')` → « une adresse sans compte vide le champ comme une adresse
 *     connue », seul ;
 *   - le champ jamais vidé → les deux cas qui vident, et eux seuls.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { SaisieDuCode } from '@/components/auth/saisie-du-code';
import { track } from '@/lib/analytics';
import type { ErreurAuth } from '@/types/connexion';

// La vérification part au huitième chiffre et appellerait Supabase : on n'en tape que sept, et le
// module est doublé pour que son import ne monte pas de client.
jest.mock('@/lib/auth', () => ({ verifierLeCode: jest.fn() }));
// Et la mesure, doublée pour lire ce qui part (`connexion_limite`, plus bas).
jest.mock('@/lib/analytics', () => ({ track: jest.fn() }));

const LIBELLE_DU_CHAMP = 'Code reçu par email, 8 chiffres';

function monter(
  renvoyer: (email: string) => Promise<{ error: ErreurAuth }>,
  contexte: 'rattachement' | 'connexion' = 'rattachement'
) {
  render(
    <SaisieDuCode
      contexte={contexte}
      voix={contexte === 'rattachement' ? 'parti' : 'peut_etre'}
      apresUnGeste={false}
      adresse="camille@example.org"
      libelleBouton="Valider mon code"
      onOuverte={jest.fn()}
      onAutreAdresse={jest.fn()}
      renvoyer={renvoyer}
    />
  );
  fireEvent.changeText(screen.getByLabelText(LIBELLE_DU_CHAMP), '1122334');
}

async function renvoyerUnCode() {
  await act(async () => {
    fireEvent.press(screen.getByText('Renvoyer un code'));
  });
}

const valeurDuChamp = () => screen.getByLabelText(LIBELLE_DU_CHAMP).props.value;

describe('« Renvoyer un code »', () => {
  it('un renvoi refusé garde les chiffres : aucun code n’est parti', async () => {
    monter(async () => ({
      error: { code: 'over_email_send_rate_limit', status: 429, message: 'rate limit' },
    }));
    await renvoyerUnCode();
    expect(valeurDuChamp()).toBe('1122334');
    expect(screen.getByText(/Trop de demandes/)).toBeTruthy();
  });

  it('un code reparti vide le champ : l’ancien ne vaut plus', async () => {
    monter(async () => ({ error: null }));
    await renvoyerUnCode();
    expect(valeurDuChamp()).toBe('');
  });

  it('une adresse sans compte vide le champ comme une adresse connue', async () => {
    monter(
      async () => ({ error: { code: 'otp_disabled', status: 422, message: 'Signups not allowed' } }),
      'connexion'
    );
    await renvoyerUnCode();
    expect(valeurDuChamp()).toBe('');
  });
});

/**
 * Le renvoi refusé par la limite de Supabase se signale (06/10/2026, `connexion_limite`). Le plafond
 * horaire du projet est vérifié avant le hook d'envoi et ne laisse aucune ligne en base : l'app seule
 * le voit, et l'alerte d'exploitation compte ces refus (`20261006140000`).
 *
 * **Éprouvé en le cassant, le 06/10/2026** : la ligne d'émission retirée de `surRenvoi` fait tomber le
 * premier cas, seul ; émise sur tout `suite === 'message'` sans regarder la limite, le troisième
 * (une panne de transport), seul.
 */
describe('« Renvoyer un code » refusé par la limite d’envoi', () => {
  beforeEach(() => jest.mocked(track).mockClear());

  it('signale le refus, avec son écran', async () => {
    monter(async () => ({
      error: { code: 'over_email_send_rate_limit', status: 429, message: 'rate limit' },
    }));
    await renvoyerUnCode();
    expect(track).toHaveBeenCalledWith('connexion_limite', { ecran: 'renvoi' });
  });

  it('ne signale rien quand le code est reparti', async () => {
    monter(async () => ({ error: null }));
    await renvoyerUnCode();
    expect(track).not.toHaveBeenCalled();
  });

  it('ne compte pas une panne de transport comme une limite', async () => {
    monter(async () => ({
      error: { name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' },
    }));
    await renvoyerUnCode();
    expect(track).not.toHaveBeenCalled();
  });
});
