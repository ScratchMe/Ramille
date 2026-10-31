/**
 * La page d'accueil du web (31/10/2026, `docs/architecture/v1-36-la-page-d-accueil.md`).
 *
 * **Le critère de `TESTING.md` §2.10 est rempli** : qui voit la page est une dérivation de `src/types`
 * (`destinationSurLaPlateforme`, testée), ce qu'elle dit de Ramille est comparé à la fiche Play
 * (`src/constants/accueil.test.ts`), et l'été qu'elle dessine est vérifié par `src/types/ete.test.ts`. Ce qui
 * reste est un câblage d'écran que ni l'un ni l'autre ne voit :
 * - **où mènent ses portes** — l'onboarding à sa deuxième page, depuis chacun des quatre boutons, et la
 *   retrouvaille avec la provenance `accueil`, toutes par `allerVers`, qui ouvre la session au geste ;
 * - **ce qu'elle compte** (`compterSurLAccueil`) : la page affichée, chaque section une fois, et le bouton
 *   touché à son emplacement — une mesure mal câblée se lit zéro, sans rien qui rougisse ailleurs ;
 * - **quand paraît la barre d'appel** : après le bouton du haut, et jusqu'à celui de la fin ;
 * - ses sources, ses sections, le film en texte, et ses vrais liens.
 *
 * **Ce que ce fichier ne dit pas** : le mouvement (reanimated est doublé, `TESTING.md` §2.10) ; la vidéo, que
 * le rendu natif ne rend pas — `film-de-presentation-sur-web.test.tsx` la tient ; que la page ne crée pas de
 * session et qu'elle se compte vraiment dans la base, que le parcours réel mesure. Ici, sans
 * `IntersectionObserver`, chaque section est réputée vue dès le rendu (`useVuUneFois`).
 *
 * **Éprouvé en le cassant, le 31/10/2026** (`TESTING.md` §1.1) — voir le relevé au pied.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { PageDAccueil } from '@/components/accueil/page-d-accueil';
import { ACCUEIL, FILM, FILM_EN_TEXTE, RECIT } from '@/constants/accueil';
import { SOURCE_DES_POSTES } from '@/constants/carbon-reference';
import { SOURCE_DE_L_ETE } from '@/constants/climat';
import { CONTACT_EMAIL } from '@/constants/editeur';
import { compterSurLAccueil, nouvelAffichageDeLAccueil } from '@/lib/visites-de-l-accueil';

// `Link` rend son enfant (`asChild`) ou son texte, marqué de son adresse : c'est l'adresse qu'un moteur suit.
jest.mock('expo-router', () => {
  const { cloneElement } = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    Link: ({ children, href, asChild }: { children: React.ReactElement; href: string; asChild?: boolean }) =>
      asChild ? (
        cloneElement(children, { testID: `lien:${href}` })
      ) : (
        <Text testID={`lien:${href}`}>{children}</Text>
      ),
  };
});

jest.mock('@/lib/visites-de-l-accueil', () => ({
  compterSurLAccueil: jest.fn(),
  nouvelAffichageDeLAccueil: jest.fn(),
}));

const allerVers = jest.fn();
const VERS_L_ONBOARDING = {
  pathname: '/onboarding',
  params: { depuis: 'accueil' },
};
const compte = compterSurLAccueil as jest.MockedFunction<typeof compterSurLAccueil>;

beforeEach(() => jest.clearAllMocks());

/** Place le bouton du haut et celui de la fin, puis fait défiler la page jusqu'à `y`. */
function defilerJusqua(y: number) {
  act(() => {
    fireEvent(screen.getByTestId('accueil-haut'), 'layout', {
      nativeEvent: { layout: { y: 0, height: 700 } },
    });
    fireEvent(screen.getByTestId('accueil-fin'), 'layout', {
      nativeEvent: { layout: { y: 5000, height: 400 } },
    });
  });
  act(() => {
    fireEvent.scroll(screen.getByTestId('accueil-defilement'), {
      nativeEvent: {
        contentOffset: { y },
        contentSize: { height: 6000, width: 390 },
        layoutMeasurement: { height: 844, width: 390 },
      },
    });
  });
}

describe('la page d’accueil du web', () => {
  it('part de l’été 2026 avant de rien demander : la question, le titre, le chapeau, le bouton', () => {
    render(<PageDAccueil allerVers={allerVers} />);
    expect(screen.getByText(RECIT.question)).toBeTruthy();
    expect(screen.getByRole('header', { name: RECIT.titre })).toBeTruthy();
    expect(screen.getByText(RECIT.chapeau)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: RECIT.bouton })).toHaveLength(3);
  });

  // La scène de l'été, en tête, ne se rend que sur le web (`scene-de-l-ete-sur-web.test.tsx`) ; la bande des
  // 92 jours, elle, est descendue sous son titre.
  it('dessine la bande de l’été sous « 53 jours de vague de chaleur », et non dans le haut', () => {
    render(<PageDAccueil allerVers={allerVers} />);
    const haut = screen.getByTestId('accueil-haut');
    const bande = screen.getByLabelText(/53 jours de vague de chaleur sur 92/);
    expect(screen.getByText(RECIT.ete.legende)).toBeTruthy();
    expect(haut).not.toContainElement(bande);
  });

  it('chacun des trois boutons mène à l’onboarding, à sa deuxième page, et se compte à son emplacement', () => {
    render(<PageDAccueil allerVers={allerVers} />);
    compte.mockClear();
    for (const bouton of screen.getAllByRole('button', { name: RECIT.bouton })) fireEvent.press(bouton);
    expect(allerVers.mock.calls).toEqual([[VERS_L_ONBOARDING], [VERS_L_ONBOARDING], [VERS_L_ONBOARDING]]);
    expect(compte.mock.calls).toEqual([['clic_haut'], ['clic_agir'], ['clic_fin']]);
  });

  it('se compte à l’affichage, puis chaque section une fois, dans l’ordre de la page', () => {
    render(<PageDAccueil allerVers={allerVers} />);
    expect(nouvelAffichageDeLAccueil).toHaveBeenCalledTimes(1);
    const evenements = compte.mock.calls.map(([evenement]) => evenement);
    expect(evenements.filter((e) => e.startsWith('lu_'))).toEqual([
      'lu_ete',
      'lu_echelle',
      'lu_trajets',
      'lu_agir',
      'lu_comment',
      'lu_fin',
    ]);
    expect(evenements.filter((e) => e === 'vue')).toHaveLength(1);
    // Le compte des vues repart à zéro avant la première : un retour sur la page est un nouvel affichage.
    expect((nouvelAffichageDeLAccueil as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      compte.mock.invocationCallOrder[evenements.indexOf('vue')]
    );
  });

  it('la barre d’appel paraît une fois le bouton du haut dépassé, et s’efface quand celui de la fin arrive', () => {
    render(<PageDAccueil allerVers={allerVers} />);
    defilerJusqua(300);
    expect(screen.getAllByRole('button', { name: RECIT.bouton })).toHaveLength(3);

    defilerJusqua(1500);
    const avecLaBarre = screen.getAllByRole('button', { name: RECIT.bouton });
    expect(avecLaBarre).toHaveLength(4);
    compte.mockClear();
    fireEvent.press(avecLaBarre[3]);
    expect(compte).toHaveBeenCalledWith('clic_collant');
    expect(allerVers).toHaveBeenCalledWith(VERS_L_ONBOARDING);

    defilerJusqua(4400);
    expect(screen.getAllByRole('button', { name: RECIT.bouton })).toHaveLength(3);
  });

  it('cite ses sources : Météo-France en lien, le SDES sous la part du transport', () => {
    render(<PageDAccueil allerVers={allerVers} />);
    expect(screen.getByTestId(`lien:${SOURCE_DE_L_ETE.url}`)).toHaveTextContent(SOURCE_DE_L_ETE.libelle);
    expect(screen.getByText(new RegExp(SOURCE_DES_POSTES))).toBeTruthy();
  });

  it('« J’ai déjà un compte » mène à la retrouvaille, par la provenance `accueil`', () => {
    render(<PageDAccueil allerVers={allerVers} />);
    fireEvent.press(screen.getByRole('link', { name: ACCUEIL.dejaUnCompte }));
    expect(allerVers).toHaveBeenCalledWith({
      pathname: '/connexion/retrouver',
      params: { source: 'accueil' },
    });
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
    expect(screen.getByRole('button', { name: 'Le film en texte' }).props.accessibilityState).toMatchObject({
      expanded: true,
    });
    // `getAllByText` pour le titre : le troisième chapitre s'appelle comme le produit, que la page signe aussi.
    for (const passage of FILM_EN_TEXTE) {
      expect(screen.getAllByText(passage.chapitre).length).toBeGreaterThan(0);
      expect(screen.getByText(passage.texte)).toBeTruthy();
    }
  });

  it('porte ce que fait Ramille, dans les mots de la fiche, chaque temps sous un en-tête', () => {
    render(<PageDAccueil allerVers={allerVers} />);
    expect(screen.getByText(ACCUEIL.chapeau)).toBeTruthy();
    expect(screen.getByText(ACCUEIL.introduction)).toBeTruthy();
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

// Relevé des mutations, le 31/10/2026, chacune posée dans `page-d-accueil.tsx` (ou `film-de-presentation.web.tsx`)
// puis ce fichier rejoué seul, la page restaurée ensuite :
//   - le bouton de la bande « agir » compté `haut` → « chacun des trois boutons… », seul ;
//   - la bande de l'été remise dans le haut → « dessine la bande de l'été sous… », seul ;
//   - la section de l'échelle comptée `lu_ete` → « se compte à l'affichage, puis chaque section… », seul ;
//   - la barre d'appel sans la borne du haut → « la barre d'appel paraît… », seul ;
//   - `nouvelAffichageDeLAccueil` appelé après la vue → « se compte à l'affichage… », seul ;
//   - la source de Météo-France sans son lien → « cite ses sources… », seul ;
//   - le compteur du film retiré (`film-de-presentation-sur-web.test.tsx`) → « se compte quand il démarre », seul.
