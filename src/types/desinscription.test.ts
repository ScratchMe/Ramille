import { etatApres, etatDeLaPage, jetonDuLien, phraseDeLaPanne } from './desinscription';

describe('jetonDuLien', () => {
  const jeton = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';

  it('accepte un uuid et le rend tel quel', () => {
    expect(jetonDuLien(jeton)).toBe(jeton);
  });

  it('accepte un uuid en majuscules — une messagerie peut recasser une URL', () => {
    expect(jetonDuLien(jeton.toUpperCase())).toBe(jeton.toUpperCase());
  });

  it('ignore les espaces autour, qu’un copier-coller ajoute', () => {
    expect(jetonDuLien(`  ${jeton}  `)).toBe(jeton);
  });

  it('rend null sans paramètre', () => {
    expect(jetonDuLien(undefined)).toBeNull();
    expect(jetonDuLien('')).toBeNull();
  });

  // Le cas qui compte : un lien coupé par une messagerie. Sans ce refus, le serveur répondrait
  // une erreur de syntaxe et la page afficherait une panne — donc « réessaie » sur un lien mort.
  it('refuse un jeton tronqué plutôt que de le faire partir au serveur', () => {
    expect(jetonDuLien('3f2a1b4c-5d6e-4f70-8a9b')).toBeNull();
    expect(jetonDuLien(`${jeton}extra`)).toBeNull();
    expect(jetonDuLien('pas-un-uuid-du-tout')).toBeNull();
  });

  it('prend le premier quand le paramètre est dupliqué', () => {
    expect(jetonDuLien([jeton, 'autre'])).toBe(jeton);
  });

  it('rend null sur un tableau vide', () => {
    expect(jetonDuLien([])).toBeNull();
  });
});

describe('etatApres', () => {
  it('un jeton accepté coupe les rappels', () => {
    expect(etatApres({ ok: true, coupes: true })).toBe('coupes');
  });

  // La règle de non-divulgation : inconnu, déjà utilisé et purgé rendent tous `false`, et `false`
  // n'a qu'un seul écran.
  it('un refus du serveur mène toujours au même écran', () => {
    expect(etatApres({ ok: true, coupes: false })).toBe('lien-invalide');
  });

  // Et son revers : une panne ne doit pas se lire comme un lien mort, sinon personne ne réessaie.
  it('une panne de transport se distingue d’un lien refusé', () => {
    expect(etatApres({ ok: false, genre: 'horsLigne' })).toBe('panne');
    expect(etatApres({ ok: false, genre: 'serveur' })).toBe('panne');
  });
});

// La règle de D19 appliquée aux écritures (02/10/2026) : la connexion n'est nommée que hors ligne.
// Éprouvé en le cassant le même jour : la phrase du hors-ligne rendue pour les deux genres fait tomber
// ce test, seul. L'appel (`couperLesRappels`, qui passe le statut de la réponse) n'est gardé que par
// relecture.
describe('phraseDeLaPanne', () => {
  it('nomme la connexion hors ligne, et seulement hors ligne', () => {
    expect(phraseDeLaPanne('horsLigne')).toContain('Vérifie ta connexion');
    expect(phraseDeLaPanne('serveur')).not.toContain('connexion');
    expect(phraseDeLaPanne('serveur')).toContain('tes rappels ne sont pas encore coupés');
  });
});

// La page demande le geste au lieu de le faire (04/10/2026) : un analyseur de liens qui l'exécutait
// coupait les rappels sans que personne ait cliqué, et consommait le jeton.
//
// Éprouvé en cassant ce qu'il garde, le 04/10/2026 : « en cours » avant l'hydratation fait tomber le
// premier test, seul ; une page qui ne demande plus le geste une fois montée, le deuxième, seul. La
// garde de l'export (`scripts/verifier-etats-export.mjs`) éprouve la page rendue.
describe('etatDeLaPage', () => {
  const JETON = '6f1f3a9e-2b7c-4d1e-9a3b-1c2d3e4f5a6b';

  it('demande le geste avant l’hydratation, jeton ou pas : c’est ce que dit le HTML statique', () => {
    expect(etatDeLaPage({ apresHydratation: false, jeton: null, demandee: false, reponse: null })).toBe('a-confirmer');
    expect(etatDeLaPage({ apresHydratation: false, jeton: JETON, demandee: false, reponse: null })).toBe('a-confirmer');
  });

  it('attend le geste une fois montée, sans rien faire partir', () => {
    expect(etatDeLaPage({ apresHydratation: true, jeton: JETON, demandee: false, reponse: null })).toBe('a-confirmer');
  });

  it('dit que le lien n’est plus valable une fois montée, sans jeton', () => {
    expect(etatDeLaPage({ apresHydratation: true, jeton: null, demandee: false, reponse: null })).toBe('lien-invalide');
  });

  it('attend la réponse après le geste, puis la montre', () => {
    expect(etatDeLaPage({ apresHydratation: true, jeton: JETON, demandee: true, reponse: null })).toBe('en-cours');
    expect(etatDeLaPage({ apresHydratation: true, jeton: JETON, demandee: true, reponse: 'coupes' })).toBe('coupes');
    expect(etatDeLaPage({ apresHydratation: true, jeton: JETON, demandee: true, reponse: 'panne' })).toBe('panne');
  });
});
