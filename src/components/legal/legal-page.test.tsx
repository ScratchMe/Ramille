/**
 * Les pages légales ont une sortie en haut, et gardent celle de la fin (`v1-33` T-10, 03/10/2026).
 *
 * **Pourquoi un test de rendu** (le critère de `TESTING.md` §2.10). La seule sortie de la politique de
 * confidentialité était sa dernière ligne, à 10 559 px du haut à 390 de large : on ne quittait la page
 * qu'en la lisant toute. Rien d'autre ne lit la place d'un lien — le parcours réel n'ouvre aucune page
 * légale, et `verifier-etats-export.mjs` ne les lit que pour leur titre.
 *
 * Éprouvé en cassant ce qu'il garde, le 03/10/2026 — deux mutations, chacune faisant tomber la sienne :
 *   - la sortie du haut retirée (l'état d'avant) → « une sortie au-dessus de la date… » ;
 *   - celle de la fin retirée → « …et une à la fin ».
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { LegalPage } from '@/components/legal/legal-page';
import { revenirOu } from '@/lib/navigation';

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
    router: { push: (href: string) => mockPush(href) },
  };
});
jest.mock('@/lib/navigation', () => ({ revenirOu: jest.fn() }));

function rendre() {
  render(
    <LegalPage
      title="Politique de confidentialité"
      updatedAt="2 octobre 2026"
      intro="Ce que Ramille collecte."
      sections={[
        { heading: 'Qui est responsable', blocks: [{ kind: 'paragraph', text: 'Une personne physique.' }] },
        { heading: 'Tes droits', blocks: [{ kind: 'paragraph', text: 'Le dernier paragraphe.' }] },
      ]}
    />
  );
  return JSON.stringify(screen.toJSON());
}

describe('LegalPage — ses sorties', () => {
  it('une sortie au-dessus de la date, la première chose de la page', () => {
    const texte = rendre();

    expect(texte.indexOf('"Retour"')).toBeGreaterThan(-1);
    expect(texte.indexOf('"Retour"')).toBeLessThan(texte.indexOf('Dernière mise à jour'));
  });

  it('…et une à la fin, après la dernière section, pour qui a tout lu', () => {
    const texte = rendre();

    expect(texte.lastIndexOf('"Retour"')).toBeGreaterThan(texte.indexOf('Le dernier paragraphe.'));
    const sorties = screen.getAllByRole('link', { name: 'Retour' });
    fireEvent.press(sorties[sorties.length - 1]);
    expect(revenirOu).toHaveBeenCalledWith('/');
  });
});

/**
 * Un renvoi d'une page légale vers une autre (22/10/2026) : `/conditions` renvoie à `/licences`. Le bloc
 * `link` est un `TextLink` — le texte cliquable du produit, annoncé comme un lien, de 48 px de haut — et
 * il pousse la page demandée. Rien d'autre ne lit ce bloc : le parcours réel n'ouvre aucune page légale,
 * et `verifier-rendu-export.mjs` ne lit que leur titre.
 *
 * Éprouvé en cassant ce qu'il garde, le 22/10/2026 — deux mutations, chacune faisant tomber la sienne :
 *   - le bloc rendu sans `onPress` qui pousse (`onPress={() => undefined}`) → « …et pousse la page demandée » ;
 *   - le bloc `link` retiré de `LegalBlockView` (il retombe sur la définition) → « …un lien annoncé comme tel ».
 */
describe('LegalPage — un renvoi vers une autre page', () => {
  function rendreAvecUnRenvoi() {
    render(
      <LegalPage
        title="Conditions d’utilisation"
        updatedAt="18 octobre 2026"
        intro="Ce que fait le service."
        sections={[
          {
            heading: 'Propriété intellectuelle',
            blocks: [
              { kind: 'paragraph', text: 'Le code est publié sous licence libre.' },
              { kind: 'link', label: 'Licences des bibliothèques et des polices', href: '/licences' },
            ],
          },
        ]}
      />
    );
  }

  beforeEach(() => mockPush.mockClear());

  it('rend un lien annoncé comme tel, sous la phrase qui le porte', () => {
    rendreAvecUnRenvoi();

    const lien = screen.getByRole('link', { name: 'Licences des bibliothèques et des polices' });
    expect(lien).toBeTruthy();
    const texte = JSON.stringify(screen.toJSON());
    expect(texte.indexOf('Licences des bibliothèques et des polices')).toBeGreaterThan(texte.indexOf('Le code est publié'));
  });

  it('…et pousse la page demandée', () => {
    rendreAvecUnRenvoi();

    fireEvent.press(screen.getByRole('link', { name: 'Licences des bibliothèques et des polices' }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/licences');
  });

  it('ne rend aucun renvoi quand la page n’en porte pas', () => {
    rendre();

    expect(screen.queryByRole('link', { name: /Licences/ })).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
