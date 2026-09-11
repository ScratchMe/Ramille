import {
  cheminCanonique,
  DEFAULT_PAGE_TITLE,
  PAGE_DESCRIPTIONS,
  PAGE_TITLES,
  pageDescription,
  pageEstIndexable,
  pageTitle,
  PAGES_ALIAS,
} from './page-titles';
import { APP_NAME } from './produit';

// La garde qui compte — « toute page exportée a bien un titre dans son HTML » — ne peut pas
// se jouer ici : elle demande de lire `dist/`, et le tsconfig racine tient volontairement
// les types Node hors du code applicatif (contexte React Native, cf. api/tsconfig.json).
// Elle vit donc dans `scripts/verifier-titres-export.mjs`, lancé en CI après `expo export`
// — plus fort que compter des entrées, puisqu'il vérifie que le titre atterrit vraiment
// dans le HTML plutôt que dans `document.title` après hydratation. Restent ici les
// propriétés de la table elle-même et la résolution.
describe('PAGE_TITLES', () => {
  it('donne à chaque page un titre distinct et non vide', () => {
    const titres = Object.values(PAGE_TITLES);
    expect(titres.every((titre) => titre.trim().length > 0)).toBe(true);

    // Les alias sont exclus : une adresse historique conservée en redirection porte le titre
    // de sa cible, et c'est voulu. Partout ailleurs, deux titres identiques trahissent un
    // copier-coller — c'est ce que cette assertion attrape.
    const titresDePages = Object.entries(PAGE_TITLES)
      .filter(([chemin]) => !PAGES_ALIAS.has(chemin))
      .map(([, titre]) => titre);
    expect(new Set(titresDePages).size).toBe(titresDePages.length);
  });

  it('ne déclare comme alias que des chemins qui ont un titre', () => {
    for (const alias of PAGES_ALIAS) {
      expect({ alias, titre: PAGE_TITLES[alias] }).toEqual({ alias, titre: PAGE_TITLES[alias] });
      expect(PAGE_TITLES[alias]).toBeDefined();
    }
  });

  it('nomme le produit dans chaque titre', () => {
    expect(Object.values(PAGE_TITLES).every((titre) => titre.includes(APP_NAME))).toBe(true);
  });

  it('indexe des chemins absolus, jamais des noms de fichier de route', () => {
    expect(Object.keys(PAGE_TITLES).every((chemin) => chemin.startsWith('/'))).toBe(true);
    expect(Object.keys(PAGE_TITLES).some((chemin) => chemin.endsWith('/index'))).toBe(false);
  });
});

describe('pageTitle', () => {
  it('rend le titre du chemin demandé', () => {
    expect(pageTitle('/suivi')).toBe(PAGE_TITLES['/suivi']);
    expect(pageTitle('/bilan/resultat')).toBe(PAGE_TITLES['/bilan/resultat']);
  });

  it('ignore un slash final sans réduire la racine à la chaîne vide', () => {
    expect(pageTitle('/suivi/')).toBe(PAGE_TITLES['/suivi']);
    expect(pageTitle('/')).toBe(PAGE_TITLES['/']);
  });

  it('retombe sur le nom du produit plutôt que sur un onglet vide', () => {
    expect(pageTitle('/route-qui-nexiste-pas')).toBe(DEFAULT_PAGE_TITLE);
  });
});

// `PAGE_DESCRIPTIONS` décide de **deux** choses d'un coup : l'extrait qu'un moteur affiche, et
// l'indexation elle-même — une page sans description reçoit `noindex, nofollow`
// (`src/components/titre-de-page.tsx`). La bascule est donc binaire et muette : une ligne ajoutée
// par réflexe ouvre une coquille d'application à l'indexation, une ligne retirée fait disparaître
// une surface publique des résultats de recherche, et rien à l'écran ne change ni dans un cas ni
// dans l'autre. `scripts/verifier-titres-export.mjs` le vérifie sur le HTML produit ; ce qui suit
// vérifie la table et la résolution, qui sont ce que le script ne peut pas lire.
describe('PAGE_DESCRIPTIONS', () => {
  it('ne décrit que des pages qui ont un titre', () => {
    for (const chemin of Object.keys(PAGE_DESCRIPTIONS)) {
      expect(PAGE_TITLES[chemin]).toBeDefined();
    }
  });

  it('donne une description non vide et distincte du titre', () => {
    for (const [chemin, description] of Object.entries(PAGE_DESCRIPTIONS)) {
      expect(description.trim().length).toBeGreaterThan(0);
      expect(description).not.toBe(PAGE_TITLES[chemin]);
    }
  });

  it('indexe des chemins absolus, sans slash final', () => {
    for (const chemin of Object.keys(PAGE_DESCRIPTIONS)) {
      expect(chemin).toBe(cheminCanonique(chemin));
      expect(chemin.startsWith('/')).toBe(true);
    }
  });
});

describe('pageDescription', () => {
  it('rend la description du chemin demandé', () => {
    expect(pageDescription('/confidentialite')).toBe(PAGE_DESCRIPTIONS['/confidentialite']);
  });

  it('ignore un slash final sans réduire la racine à la chaîne vide', () => {
    expect(pageDescription('/suivi/')).toBeNull();
    expect(pageDescription('/')).toBe(PAGE_DESCRIPTIONS['/']);
    expect(pageDescription('/confidentialite/')).toBe(PAGE_DESCRIPTIONS['/confidentialite']);
  });

  it('rend null pour une page d’application', () => {
    expect(pageDescription('/plan')).toBeNull();
    expect(pageDescription('/route-qui-nexiste-pas')).toBeNull();
  });
});

describe('pageEstIndexable', () => {
  it('laisse les écrans d’application hors de l’index', () => {
    // Les deux onglets et le questionnaire : l'export produit une page HTML par route, donc ces
    // coquilles concourraient avec les deux pages légales dans les résultats de recherche.
    expect(pageEstIndexable('/plan')).toBe(false);
    expect(pageEstIndexable('/bilan')).toBe(false);
    expect(pageEstIndexable('/suivi')).toBe(false);
    expect(pageEstIndexable('/compte')).toBe(false);
    expect(pageEstIndexable('/connexion/email')).toBe(false);
    expect(pageEstIndexable('/status')).toBe(false);
  });

  it('n’offre à l’index aucune adresse conservée en redirection', () => {
    // Un alias sert la même page sous une autre URL : l'indexer mettrait les deux en
    // concurrence, et l'une des deux ne fait que rediriger.
    for (const alias of PAGES_ALIAS) {
      expect(pageEstIndexable(alias)).toBe(false);
    }
  });

  it('offre à l’index les surfaces publiques, et elles seules', () => {
    const indexables = Object.keys(PAGE_TITLES).filter((chemin) => pageEstIndexable(chemin));
    expect(indexables.sort()).toEqual(Object.keys(PAGE_DESCRIPTIONS).sort());
  });
});

describe('cheminCanonique', () => {
  it('retire le slash final, la racine exceptée', () => {
    expect(cheminCanonique('/compte/suppression/')).toBe('/compte/suppression');
    expect(cheminCanonique('/compte/suppression')).toBe('/compte/suppression');
    expect(cheminCanonique('/')).toBe('/');
  });
});
