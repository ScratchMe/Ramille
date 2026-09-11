import { MASCOT_NAME, RAMILLE } from './mascotte';
import { APP_NAME } from './produit';

/**
 * **Toutes les répliques, aplaties — et c'est le garde du garde.**
 *
 * `Object.entries(RAMILLE)` a suffi tant que chaque clé portait une chaîne. Depuis C2.5,
 * `maintienNon` groupe ses variantes par mode, et C2.12 a ajouté des tableaux de variantes : une
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

  /**
   * **Les variantes de C2.12, et les deux façons de les abîmer.**
   *
   * La première est de réécrire l'originale : elle vient des maquettes validées, et la décision D12
   * du 10/09/2026 ajoute des variantes **après** elle, elle ne la remplace pas. La seconde est un
   * doublon — un copier-coller qui laisse deux entrées identiques réduit la variété sans que rien ne
   * le signale, et c'est précisément ce que ces tableaux existent pour apporter.
   */
  it('les répliques d’origine restent en tête de leur tableau', () => {
    expect(RAMILLE.checkinOui.hebdo[0]).toBe('Bien joué — chaque changement compte.');
    expect(RAMILLE.checkinOui.mensuel[0]).toBe('Bien joué — chaque changement compte.');
    expect(RAMILLE.checkinNon.hebdo[0]).toBe(
      'Pas cette fois-ci. Rien d’obligatoire, on se repose la question au prochain point.'
    );
    expect(RAMILLE.checkinNon.mensuel[0]).toBe(RAMILLE.checkinNon.hebdo[0]);
  });

  it('aucun tableau de variantes ne porte de doublon, ni de tableau vide', () => {
    const tableaux: [string, readonly string[]][] = [
      ['checkinOui.hebdo', RAMILLE.checkinOui.hebdo],
      ['checkinOui.mensuel', RAMILLE.checkinOui.mensuel],
      ['checkinNon.hebdo', RAMILLE.checkinNon.hebdo],
      ['checkinNon.mensuel', RAMILLE.checkinNon.mensuel],
      ...Object.entries(RAMILLE.checkinSansObjet).map(
        ([cle, variantes]) => [`checkinSansObjet.${cle}`, variantes] as [string, readonly string[]]
      ),
    ];
    for (const [cle, variantes] of tableaux) {
      expect({ cle, uniques: new Set(variantes).size }).toEqual({ cle, uniques: variantes.length });
      expect(variantes.length).toBeGreaterThan(1);
    }
  });

  /**
   * **Jamais un accord qui genre la personne** (règle reprise par C2.12 ; C3.10 tient la règle pour
   * tout le produit). Le garde porte sur la marque que quelqu'un écrirait *en cherchant* à être
   * neutre — « content(e) », « prêt·e » —, qui se glisse d'autant plus facilement dans une variante
   * ajoutée à la main. L'accord lui-même n'est pas mécanisable sans faux positifs, et un garde
   * fragile vaudrait moins que pas de garde : c'est la relecture qui le tient, et le fait que les
   * répliques validées n'en portent aucun.
   */
  it('n’écrit jamais un accord entre parenthèses ni un point médian', () => {
    const marque = /\([eE]s?\)|[·•]\s?[eE]s?\b/;
    for (const [cle, ligne] of lignes) {
      expect({ cle, ligne }).not.toMatchObject({ ligne: expect.stringMatching(marque) });
    }
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
