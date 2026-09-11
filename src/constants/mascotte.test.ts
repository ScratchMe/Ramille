import { MASCOT_NAME, RAMILLE } from './mascotte';
import { APP_NAME } from './produit';

/**
 * **Toutes les répliques, aplaties — et c'est le garde du garde.**
 *
 * `Object.entries(RAMILLE)` a suffi tant que chaque clé portait une chaîne. Depuis C2.5,
 * `maintienNon` groupe ses variantes par mode, et C2.1 ajoutera des tableaux de variantes : une
 * valeur non-textuelle traverse `expect.stringMatching` **sans jamais matcher**, donc les trois
 * règles de voix — pas de nombre, pas d'injonction, jamais de vouvoiement — passeraient en
 * silence sur une réplique groupée. Seul « parle court » tomberait, et par accident
 * (`undefined.length`). Le piège est le même que partout ailleurs dans ce dépôt : un test vert
 * qui n'éprouve rien.
 *
 * La fonction lève plutôt que d'ignorer une valeur qu'elle ne sait pas lire : une réplique
 * silencieusement sautée est ce qu'on cherche à empêcher.
 */
function aplatir(valeur: unknown, chemin: string): [string, string][] {
  if (typeof valeur === 'string') return [[chemin, valeur]];
  if (valeur !== null && typeof valeur === 'object') {
    return Object.entries(valeur).flatMap(([cle, sous]) =>
      aplatir(sous, chemin === '' ? cle : `${chemin}.${cle}`)
    );
  }
  throw new Error(`RAMILLE.${chemin} n’est ni une réplique ni un groupe de répliques.`);
}

const lignes = aplatir(RAMILLE, '');

describe('Ramille', () => {
  // Sans cette assertion, un aplatissement qui rendrait un tableau vide rendrait tous les
  // gardes ci-dessous vrais par vacuité. Un groupe rend au moins une ligne, donc le total ne
  // peut jamais passer sous le nombre de clés de premier niveau — invariant, pas seuil choisi.
  it('éprouve bien chaque réplique, groupes compris', () => {
    expect(lignes.length).toBeGreaterThanOrEqual(Object.keys(RAMILLE).length);
    expect(lignes.map(([cle]) => cle)).toContain('maintienNon.velo');
  });

  it('porte le nom du produit — décision du 05/09/2026, à changer ici et nulle part ailleurs', () => {
    expect(MASCOT_NAME).toBe(APP_NAME);
  });

  it('ne dit jamais un nombre : les chiffres restent au produit', () => {
    for (const [cle, ligne] of lignes) {
      expect({ cle, ligne }).not.toMatchObject({ ligne: expect.stringMatching(/\d/) });
    }
  });

  it('ne donne jamais d’injonction', () => {
    const injonctions = /\b(tu devrais|il faut|tu dois|il faudrait|obligé|obligée)\b/i;
    for (const [cle, ligne] of lignes) {
      expect({ cle, ligne }).not.toMatchObject({ ligne: expect.stringMatching(injonctions) });
    }
  });

  // La règle 1 tient en deux moitiés ; seule celle-ci se teste sans faux positif. « Première
  // personne » n'est pas mécanisable — « Bien joué — chaque changement compte. » et « On se
  // retrouve ici lundi. » sont des répliques validées qui ne portent ni « je » ni « tu ». Le
  // vouvoiement, lui, est une faute dans tous les cas.
  it('tutoie toujours', () => {
    // Le trait d'union est une frontière de mot : `\b(vous)\b` matche à l'intérieur de
    // « rendez-vous », qui n'est pas un vouvoiement et qui est exactement le mot qu'on emploie
    // à propos de Ramille. Le lookbehind exclut donc tout composé — le jour où une réplique
    // validée dit « notre rendez-vous », le garde doit tenir et non se faire retirer.
    const vouvoiement = /(?<![-\p{L}])(vous|votre|vos)\b/iu;
    for (const [cle, ligne] of lignes) {
      expect({ cle, ligne }).not.toMatchObject({ ligne: expect.stringMatching(vouvoiement) });
    }
  });

  it('parle court', () => {
    for (const [cle, ligne] of lignes) {
      expect({ cle, longueur: ligne.length }).toEqual({ cle, longueur: expect.any(Number) });
      expect(ligne.length).toBeLessThanOrEqual(120);
      expect(ligne.trim().length).toBeGreaterThan(0);
    }
  });

  it('ne cite jamais l’ancien nom du produit', () => {
    for (const [, ligne] of lignes) {
      expect(ligne).not.toMatch(/trace ?verte/i);
    }
  });
});
