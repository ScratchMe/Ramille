/**
 * La page d'accueil du web (23/10/2026, étape 5 de `docs/architecture/v1-35-l-audit-en-chantiers.md`).
 *
 * **Le critère de `TESTING.md` §2.10 est rempli** : qui voit la page est une dérivation de `src/types`
 * (`destinationSurLaPlateforme`, testée), et ce qu'elle dit est comparé à la fiche Play
 * (`src/constants/accueil.test.ts`). Ce qui reste est un câblage d'écran que ni l'un ni l'autre ne voit :
 * où mènent ses portes — l'onboarding, la retrouvaille avec la provenance `accueil`, les trois pages
 * publiques —, la ligne sous le film, et la version texte du film qui se déplie. Le parcours réel joue
 * « Découvrir mon impact » dans un vrai navigateur, sur l'export.
 *
 * **Ce que ce fichier ne dit pas** : la vidéo, que le rendu natif ne rend pas (le film n'existe que sur le
 * web) — `film-de-presentation-sur-web.test.tsx` la tient ; et que la page ne crée pas de session, que
 * le parcours réel mesure dans la base.
 *
 * **Éprouvé en le cassant, le 23/10/2026** (`TESTING.md` §1.1) — voir le relevé au pied.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';

import { PageDAccueil } from '@/components/accueil/page-d-accueil';
import { ACCUEIL, FILM, FILM_EN_TEXTE } from '@/constants/accueil';
import { CONTACT_EMAIL } from '@/constants/editeur';

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    // `Link` rend son texte : l'adresse de contact s'y lit, et rien d'autre n'en dépend ici.
    Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
  };
});

beforeEach(() => jest.clearAllMocks());

describe('la page d’accueil du web', () => {
  it('dit le produit avant de rien demander : le titre, le chapeau, le bouton, et qu’il n’y a pas de compte à créer', () => {
    render(<PageDAccueil />);
    expect(screen.getByRole('header', { name: ACCUEIL.titre })).toBeTruthy();
    expect(screen.getByText(ACCUEIL.chapeau)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: ACCUEIL.bouton })).toHaveLength(2);
    expect(screen.getByText(ACCUEIL.sansCompte)).toBeTruthy();
  });

  it('« Découvrir mon impact » mène à l’onboarding, en haut comme en bas', () => {
    render(<PageDAccueil />);
    for (const bouton of screen.getAllByRole('button', { name: ACCUEIL.bouton })) {
      fireEvent.press(bouton);
    }
    expect(router.push).toHaveBeenCalledTimes(2);
    expect(router.push).toHaveBeenNthCalledWith(1, '/onboarding');
    expect(router.push).toHaveBeenNthCalledWith(2, '/onboarding');
  });

  it('« J’ai déjà un compte » mène à la retrouvaille, par la provenance `accueil`', () => {
    render(<PageDAccueil />);
    fireEvent.press(screen.getByRole('link', { name: ACCUEIL.dejaUnCompte }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/connexion/retrouver', params: { source: 'accueil' } });
  });

  it('sous le film, dit où le rappel arrive, sur Android et sur le web', () => {
    render(<PageDAccueil />);
    expect(screen.getByRole('header', { name: FILM.titre })).toBeTruthy();
    expect(screen.getByText(FILM.ouArriveLeRappel)).toBeTruthy();
  });

  it('déplie le film en texte, chapitre par chapitre, et le dit au lecteur d’écran', () => {
    expect(FILM_EN_TEXTE.length).toBeGreaterThan(0);
    render(<PageDAccueil />);
    const bascule = screen.getByRole('button', { name: 'Le film en texte' });
    expect(bascule.props.accessibilityState).toMatchObject({ expanded: false });
    expect(screen.queryByText(FILM_EN_TEXTE[0]!.texte)).toBeNull();

    fireEvent.press(bascule);
    expect(screen.getByRole('button', { name: 'Le film en texte' }).props.accessibilityState).toMatchObject({ expanded: true });
    for (const passage of FILM_EN_TEXTE) {
      expect(screen.getByText(passage.chapitre)).toBeTruthy();
      expect(screen.getByText(passage.texte)).toBeTruthy();
    }
  });

  it('porte les sections de la fiche, chacune sous un en-tête', () => {
    render(<PageDAccueil />);
    for (const section of ACCUEIL.sections) {
      expect(screen.getByRole('header', { name: section.titre })).toBeTruthy();
      expect(screen.getByText(section.texte)).toBeTruthy();
    }
    expect(screen.getByRole('header', { name: ACCUEIL.garanties.titre })).toBeTruthy();
    expect(screen.getByRole('header', { name: ACCUEIL.limites.titre })).toBeTruthy();
  });

  it('son pied mène aux trois pages publiques, et donne l’adresse de contact', () => {
    render(<PageDAccueil />);
    expect(screen.getByText(CONTACT_EMAIL)).toBeTruthy();
    fireEvent.press(screen.getByRole('link', { name: 'Confidentialité' }));
    fireEvent.press(screen.getByRole('link', { name: 'Conditions d’utilisation' }));
    fireEvent.press(screen.getByRole('link', { name: 'Licences' }));
    expect(router.push).toHaveBeenNthCalledWith(1, '/confidentialite');
    expect(router.push).toHaveBeenNthCalledWith(2, '/conditions');
    expect(router.push).toHaveBeenNthCalledWith(3, '/licences');
  });
});

// Relevé des mutations, le 23/10/2026, chacune posée dans `page-d-accueil.tsx` puis ce fichier rejoué, la
// page restaurée ensuite :
