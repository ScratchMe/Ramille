import { etatApres, jetonDuLien } from './desinscription';

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
    expect(etatApres({ ok: false })).toBe('panne');
  });
});
