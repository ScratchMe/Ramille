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

/**
 * Un accord qui genre la personne : un auxiliaire d'`être` suivi, à deux mots près, d'un participe
 * ou d'un adjectif accordé.
 *
 * **C'est l'auxiliaire qui fait le motif**, et c'est ce qui le rend utilisable : sans lui, la
 * liste des participes attraperait « Action engagée » (accordé avec un nom, correct) et « Mois
 * sans sortie » (qui n'est même pas un participe). Avec lui, seul l'accord avec « tu » est visé.
 *
 * La fin du motif est une **anticipation négative** et non un `\b` : en JavaScript, « é » n'est pas
 * un caractère de mot, donc il n'y a pas de frontière de mot entre « passé » et le point qui le
 * suit. Un `\b` rendait le motif incapable de reconnaître le moindre accord — un test vert qui
 * n'éprouvait rien, exactement ce que ce fichier existe pour empêcher ailleurs.
 */
const ACCORD_QUI_GENRE =
  /(?:d['’]être|être|t['’]es|tu\s+es|tu\s+étais|sois)\s+(?:\w+\s+){0,2}(?:\w+(?:é|ée|és|ées|ie|ies|ue|ues)|(?:prêt|sûr|content|heureux|déçu|seul|ravi|fier)e?s?)(?![a-zA-ZÀ-ÿ])/i;

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
  /**
   * **Règle 4 — jamais un accord qui genre la personne** (C3.10, arbitrage D15, constat A12-4).
   *
   * Le produit tutoie sans rien savoir de qui lit. « Merci d'être passé » — la formulation qui
   * était ici jusqu'au 14/09/2026 — choisit un genre à la place du lecteur, et la moitié des gens
   * la lisent comme une erreur sur eux, au moment précis où ils quittent le produit.
   *
   * **Se relire ne suffit pas, et c'est pour ça que ce test existe** : la forme fautive est la
   * forme naturelle. On écrit « passé » sans y penser, parce que c'est ainsi qu'on parle. Le
   * contrôle cherche donc le **motif** — un auxiliaire d'`être` suivi d'un participe ou d'un
   * adjectif accordé — plutôt qu'une liste de phrases interdites, qui serait périmée à la
   * réplique suivante.
   *
   * Ce qu'il ne cherche pas : un participe accordé avec un **nom**. « Action engagée » est
   * correct, et « Mois sans sortie » n'est même pas un participe. C'est l'auxiliaire qui distingue
   * les deux cas, et c'est pour ça qu'il est dans le motif.
   */
  it('n’accorde jamais un participe avec la personne', () => {
    for (const [cle, ligne] of lignes) {
      expect(`${cle} :: ${ligne}`).not.toMatch(ACCORD_QUI_GENRE);
    }
  });

  // Le motif attrape-t-il vraiment la phrase qui a motivé la règle ? Sans cette assertion, une
  // expression mal échappée rendrait le test ci-dessus vert pour toujours — c'est le mode d'échec
  // que ce dépôt attrape partout ailleurs en reposant le défaut. Il s'est produit ici : une
  // première rédaction finissait le motif par `\b`, qui **ne se déclenche pas** après « é » — en
  // JavaScript, une lettre accentuée n'est pas un caractère de mot, donc la frontière entre « é »
  // et le point qui suit n'en est pas une. Le motif ne reconnaissait littéralement aucun accord.
  it('le motif d’accord reconnaît la formulation qu’il remplace', () => {
    expect('Merci d’être passé. Si tu reviens, on repart de zéro.').toMatch(ACCORD_QUI_GENRE);
    expect('Tu t’es connecté avec Google ?').toMatch(ACCORD_QUI_GENRE);
    expect('Tu es prête à commencer ?').toMatch(ACCORD_QUI_GENRE);
    // Et il laisse passer ce qui est correct : un participe accordé avec un **nom**, un nom qui
    // finit comme un participe, et la réplique retenue.
    expect('Action engagée : faire un trajet sur cinq à vélo.').not.toMatch(ACCORD_QUI_GENRE);
    expect('Mois sans sortie. Je reviens au début du mois prochain.').not.toMatch(ACCORD_QUI_GENRE);
    expect('Merci du temps passé ici. Si tu reviens, on repart de zéro, tranquillement.').not.toMatch(
      ACCORD_QUI_GENRE
    );
  });

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

  /**
   * **Ce que cette assertion voit, et ce qu'elle ne voit pas** — mesuré le 20/09/2026, parce que
   * son titre d'avant (« à changer ici et nulle part ailleurs ») annonçait la moitié qu'elle ne
   * garde pas. Deux mutations :
   *   - `MASCOT_NAME = 'Rami'` → elle tombe. C'est le défaut réel : la mascotte et le produit
   *     portent le même nom depuis le 05/09/2026, et l'app dirait « Moi, c'est Rami » dans une
   *     app qui s'appelle Ramille ;
   *   - `MASCOT_NAME = 'Ramille'`, un littéral de même valeur → **elle reste verte**. Aucune
   *     assertion de runtime ne distingue un alias d'un littéral égal : la règle « le nom se
   *     change à un seul endroit » est une propriété de la SOURCE, et c'est
   *     `scripts/verifier-le-nom-du-produit.mjs` qui la tient, pas ce fichier.
   */
  it('porte la même valeur que le nom du produit — décision du 05/09/2026', () => {
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
