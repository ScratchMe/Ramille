import { DEFAULT_PAGE_TITLE, PAGE_TITLES, pageTitle, PAGES_ALIAS } from './page-titles';
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
