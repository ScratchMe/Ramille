/**
 * La page d'accueil du web (23/10/2026, étape 5 de `docs/architecture/v1-35-l-audit-en-chantiers.md`).
 *
 * **Le critère de `TESTING.md` §2.10 est rempli** : qui voit la page est une dérivation de `src/types`
 * (`destinationSurLaPlateforme`, testée), et ce qu'elle dit est comparé à la fiche Play
 * (`src/constants/accueil.test.ts`). Ce qui reste est un câblage d'écran que ni l'un ni l'autre ne voit :
 * où mènent ses portes — l'onboarding à sa deuxième page et la retrouvaille avec la provenance `accueil`,
 * toutes deux par `allerVers`, qui ouvre la session au geste (`src/app/index.tsx`) ; les trois pages
 * publiques et le contact, en vrais liens —, la ligne sous le film, et la version texte du film qui se
 * déplie. Le parcours réel joue « Découvrir mon impact » dans un vrai navigateur, sur l'export.
 *
 * **Ce que ce fichier ne dit pas** : la vidéo, que le rendu natif ne rend pas (le film n'existe que sur le
 * web) — `film-de-presentation-sur-web.test.tsx` la tient ; et que la page ne crée pas de session, que
 * le parcours réel mesure dans la base.
 *
 * **Éprouvé en le cassant, le 23/10/2026** (`TESTING.md` §1.1) — voir le relevé au pied.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { PageDAccueil } from '@/components/accueil/page-d-accueil';
import { ACCUEIL, FILM, FILM_EN_TEXTE } from '@/constants/accueil';
import { CONTACT_EMAIL } from '@/constants/editeur';

// `Link` rend son enfant (`asChild`) ou son texte, marqué de son adresse : c'est l'adresse qu'un moteur suit.
jest.mock('expo-router', () => {
  const { cloneElement } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    Link: ({ children, href, asChild }: { children: React.ReactElement; href: string; asChild?: boolean }) =>
      asChild ? cloneElement(children, { testID: `lien:${href}` }) : <Text testID={`lien:${href}`}>{children}</Text>,
  };
});

const allerVers = jest.fn();
const VERS_L_ONBOARDING = { pathname: '/onboarding', params: { depuis: 'accueil' } };

beforeEach(() => jest.clearAllMocks());

describe('la page d’accueil du web', () => {
  it('dit le produit avant de rien demander : le titre, le chapeau, le bouton, et qu’il n’y a pas de compte à créer', () => {
    render(<PageDAccueil allerVers={allerVers} />);
    expect(screen.getByRole('header', { name: ACCUEIL.titre })).toBeTruthy();
    expect(screen.getByText(ACCUEIL.chapeau)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: ACCUEIL.bouton })).toHaveLength(2);
    expect(screen.getByText(ACCUEIL.sansCompte)).toBeTruthy();
  });

  it('« Découvrir mon impact » mène à l’onboarding, à sa deuxième page, en haut comme en bas', () => {
    render(<PageDAccueil allerVers={allerVers} />);
    for (const bouton of screen.getAllByRole('button', { name: ACCUEIL.bouton })) {
      fireEvent.press(bouton);
    }
    expect(allerVers).toHaveBeenCalledTimes(2);
    expect(allerVers).toHaveBeenNthCalledWith(1, VERS_L_ONBOARDING);
    expect(allerVers).toHaveBeenNthCalledWith(2, VERS_L_ONBOARDING);
  });

  it('« J’ai déjà un compte » mène à la retrouvaille, par la provenance `accueil`', () => {
    render(<PageDAccueil allerVers={allerVers} />);
    fireEvent.press(screen.getByRole('link', { name: ACCUEIL.dejaUnCompte }));
    expect(allerVers).toHaveBeenCalledWith({ pathname: '/connexion/retrouver', params: { source: 'accueil' } });
  });

  it('sous le film, dit où le rappel arrive, sur Android et sur le web', () => {
    render(<PageDAccueil allerVers={allerVers} />);
    expect(screen.getByRole('header', { name: FILM.titre })).toBeTruthy();
    expect(screen.getByText(FILM.ouArriveLeRappel)).toBeTruthy();
  });

  it('déplie le film en texte, chapitre par chapitre, et le dit au lecteur d’écran', () => {
    expect(FILM_EN_TEXTE.length).toBeGreaterThan(0);
    render(<PageDAccueil allerVers={allerVers} />);
    const bascule = screen.getByRole('button', { name: 'Le film en texte' });
    expect(bascule.props.accessibilityState).toMatchObject({ expanded: false });
    expect(screen.queryByText(FILM_EN_TEXTE[0]!.texte)).toBeNull();

    fireEvent.press(bascule);
    expect(screen.getByRole('button', { name: 'Le film en texte' }).props.accessibilityState).toMatchObject({ expanded: true });
    // `getAllByText` pour le titre : le troisième chapitre s'appelle comme le produit, que la page signe aussi.
    for (const passage of FILM_EN_TEXTE) {
      expect(screen.getAllByText(passage.chapitre).length).toBeGreaterThan(0);
      expect(screen.getByText(passage.texte)).toBeTruthy();
    }
  });

  it('porte les sections de la fiche, chacune sous un en-tête', () => {
    render(<PageDAccueil allerVers={allerVers} />);
    for (const section of ACCUEIL.sections) {
      expect(screen.getByRole('header', { name: section.titre })).toBeTruthy();
      expect(screen.getByText(section.texte)).toBeTruthy();
    }
    expect(screen.getByRole('header', { name: ACCUEIL.garanties.titre })).toBeTruthy();
    expect(screen.getByRole('header', { name: ACCUEIL.limites.titre })).toBeTruthy();
  });

  // De vrais liens, avec leur adresse : un moteur et l'écran de consentement de Google suivent une ancre, pas
  // un bouton (`EXPO.md` §1.1).
  it('son pied porte de vrais liens vers les trois pages publiques, et l’adresse de contact', () => {
    render(<PageDAccueil allerVers={allerVers} />);
    expect(screen.getByTestId(`lien:mailto:${CONTACT_EMAIL}`)).toHaveTextContent(CONTACT_EMAIL);
    expect(screen.getByTestId('lien:/confidentialite')).toHaveTextContent('Confidentialité');
    expect(screen.getByTestId('lien:/conditions')).toHaveTextContent('Conditions d’utilisation');
    expect(screen.getByTestId('lien:/licences')).toHaveTextContent('Licences');
  });
});

// Relevé des mutations, le 23/10/2026, chacune posée dans `page-d-accueil.tsx` puis ce fichier rejoué, la
// page restaurée ensuite :
//   - « Découvrir mon impact » vers `/onboarding` sans `depuis` → « … à sa deuxième page, en haut comme en bas »,
//     seul ;
//   - la provenance `onboarding` au lieu d'`accueil` → « J'ai déjà un compte… », seul ;
//   - la ligne sous le film retirée → « sous le film, dit où le rappel arrive… », seul ;
//   - `expanded` retiré de la bascule → « déplie le film en texte… », seul ;
//   - le film en texte déplié d'office → le même, seul ;
//   - le lien « Licences » vers `/conditions` → « son pied porte de vrais liens… », seul ;
//   - le second « Découvrir mon impact » retiré → « dit le produit… » et « … en haut comme en bas ».
