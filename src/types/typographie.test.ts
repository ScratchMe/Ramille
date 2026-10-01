/**
 * Éprouvé en cassant ce qu'il garde, le 25/09/2026 (contre-lecture de `v1-29`) :
 * - `ESPACE_INSECABLE` devenue une espace ordinaire → cinq tests tombent sur huit, dont le premier,
 *   qui la nomme ; restent verts les trois qui ne posent aucune espace. Avant ce jour, les attentes
 *   interpolaient **la constante testée**, et la même mutation laissait les sept tests d'alors
 *   verts (rejoué sur l'ancien fichier) ;
 * - `»` retiré de la classe des signes → le test des guillemets tombe, et lui seul ;
 * - le drapeau `g` retiré des deux motifs → « chaque occurrence » tombe, et lui seul : les
 *   guillemets n'y portent qu'une espace de chaque sorte.
 *
 * Et le 30/09/2026, pour « % » et le signe d'un nombre (recette `v1-13` §18) :
 * - `%` retiré de la classe des signes → le test de « % » et celui du signe tombent, et eux seuls
 *   (le second porte aussi un « % ») ;
 * - le remplacement `APRES_LE_SIGNE` retiré → le test du signe tombe, et lui seul ;
 * - `\d` remplacé par `\S` dans son anticipation → le même tombe, sur « Plan − suivi ».
 *
 * Et le 01/10/2026, pour le nombre et son unité (`v1-33`, Q-7), une mutation à la fois, l'état d'avant
 * réécrit depuis une copie, le module relu en entier après chacune :
 * - le remplacement `NOMBRE_ET_SON_UNITE` retiré de la chaîne → six tombent : les cinq tests de l'unité
 *   qui posent une insécable (« chacune de ses unités », « les minutes », « les titres relevés »,
 *   « groupé » et « une unité de masse garde son nom de gaz », qui lit son résultat) et celui du signe
 *   (« − 1 601 kg CO₂e ») ; restent verts les trois qui ne doivent rien coller ;
 * - l'anticipation de fin d'unité remplacée par `\b` → « ne colle jamais un nombre à un mot ordinaire »,
 *   et lui seul, sur « 5 hôtes » : « 2 trajets » et « 2 tours » tiennent, `\b` voyant la coupure entre
 *   « t » et « r », mais « ô » n'est pas une lettre pour lui ;
 * - la classe des lettres ramenée à `A-Za-z` (les accentuées oubliées) → le même test, et lui seul ;
 * - `UNITE_ET_SON_GAZ` retiré → deux tombent : « une unité de masse garde son nom de gaz » et celui du
 *   signe (« − 1 601 kg CO₂e ») ;
 * - `UNITE_ET_SON_GAZ` privé de son chiffre (`\b` à la place de `\d\u00A0`) → « une unité de masse
 *   garde son nom de gaz », sur « août CO₂e », **et** « ne colle pas une unité à qui n'a pas de nombre »,
 *   sur « en t CO₂e ». (« été CO₂e », écrit d'abord, ne prouvait rien : son « t » n'est pas devant
 *   l'espace — d'où « août ») ;
 * - `min(?:utes?)?` ramené à `min` → « les minutes », et lui seul : « 5 minutes » reste coupé ;
 * - `tonnes?` ramené à `tonne` → « chacune de ses unités » et « les titres relevés » : « 2 tonnes
 *   visées » reste coupé ; l'unité `h` retirée de la liste → « chacune de ses unités », seul.
 */
import { ESPACE_INSECABLE, espacesInsecables } from './typographie';

// Écrites par leur point de code, et **indépendamment du module testé** : une attente qui recopie
// la constante qu'elle vérifie ne peut pas tomber quand cette constante change.
const NBSP = '\u00A0';
const FINE = '\u202F';

describe('espacesInsecables', () => {
  it("pose U+00A0, l'espace insécable à la largeur d'une espace ordinaire", () => {
    expect(ESPACE_INSECABLE).toBe(NBSP);
  });

  it("rend insécable l'espace qui précède les quatre signes doubles", () => {
    expect(espacesInsecables('As-tu fait ce trajet à vélo ?')).toBe(`As-tu fait ce trajet à vélo${NBSP}?`);
    expect(espacesInsecables('Bravo !')).toBe(`Bravo${NBSP}!`);
    expect(espacesInsecables('Étape 2 : tes loisirs')).toBe(`Étape 2${NBSP}: tes loisirs`);
    expect(espacesInsecables('un choix ; un seul')).toBe(`un choix${NBSP}; un seul`);
  });

  it("rend insécables les deux espaces intérieures des guillemets", () => {
    expect(espacesInsecables('Appuie sur « Continuer » pour finir')).toBe(
      `Appuie sur «${NBSP}Continuer${NBSP}» pour finir`,
    );
  });

  it('traite chaque occurrence, pas seulement la première', () => {
    expect(espacesInsecables('Oui ? Non ? Peut-être !')).toBe(`Oui${NBSP}? Non${NBSP}? Peut-être${NBSP}!`);
  });

  it("n'ajoute jamais d'espace là où le texte n'en porte pas", () => {
    // Corriger un texte se fait à la source : le rendu ne réécrit que la nature d'une espace.
    expect(espacesInsecables('Note: rien')).toBe('Note: rien');
    expect(espacesInsecables('https://www.ramille.fr')).toBe('https://www.ramille.fr');
    expect(espacesInsecables('«Continuer»')).toBe('«Continuer»');
  });

  it('laisse intacte une espace déjà insécable, fine ou non', () => {
    expect(espacesInsecables(`Vraiment${FINE}?`)).toBe(`Vraiment${FINE}?`);
    expect(espacesInsecables(`Vraiment${NBSP}?`)).toBe(`Vraiment${NBSP}?`);
  });

  it("ne touche que l'espace qui touche le signe", () => {
    // Deux espaces de suite : seule la dernière est rendue insécable, la première reste une
    // occasion de coupure, ce qui ne laisse jamais le signe seul en début de ligne.
    expect(espacesInsecables('Vraiment  ?')).toBe(`Vraiment ${NBSP}?`);
    expect(espacesInsecables('? en tête')).toBe('? en tête');
  });

  it("rend insécable l'espace qui précède « % »", () => {
    expect(espacesInsecables('soit 35 % de ton empreinte')).toBe(`soit 35${NBSP}% de ton empreinte`);
  });

  it("rend insécable l'espace qui suit le signe d'un nombre, et seulement d'un nombre", () => {
    // La phrase du suivi relevée à la recette du 30/09/2026 : ni « % » ni « (+ » ne restent seuls.
    expect(espacesInsecables('bilan précédent (+ 875 %). Une année')).toBe(
      `bilan précédent (+${NBSP}875${NBSP}%). Une année`,
    );
    // Les milliers sont ici une espace ordinaire (le formateur du dépôt écrit déjà U+00A0) : seule celle du
    // signe, et depuis le 01/10/2026 celles de l'unité et de son gaz, deviennent insécables.
    expect(espacesInsecables('− 1 601 kg CO₂e')).toBe(`−${NBSP}1 601${NBSP}kg${NBSP}CO₂e`);
    expect(espacesInsecables('soit − 20 % sur')).toBe(`soit −${NBSP}20${NBSP}% sur`);
    // Un signe qui ne précède pas un chiffre, et le trait d'union, restent tels quels.
    expect(espacesInsecables('Plan − suivi')).toBe('Plan − suivi');
    expect(espacesInsecables('pas - 5')).toBe('pas - 5');
    expect(espacesInsecables('a+ 5')).toBe('a+ 5');
  });

  it('rend une chaîne vide telle quelle', () => {
    expect(espacesInsecables('')).toBe('');
  });
});

// Q-7 (`v1-33`) : un nombre ne se sépare pas de son unité. Les attentes sont écrites à la main avec
// `NBSP`, jamais produites par la fonction qu'elles éprouvent.
describe('un nombre ne se sépare pas de son unité', () => {
  it("rend insécable l'espace entre un nombre et chacune de ses unités", () => {
    expect(espacesInsecables('plus de 300 km')).toBe(`plus de 300${NBSP}km`);
    expect(espacesInsecables('soit 40 kg')).toBe(`soit 40${NBSP}kg`);
    expect(espacesInsecables('2 t visées')).toBe(`2${NBSP}t visées`);
    expect(espacesInsecables('2 tonnes visées')).toBe(`2${NBSP}tonnes visées`);
    expect(espacesInsecables('1 tonne de moins')).toBe(`1${NBSP}tonne de moins`);
    expect(espacesInsecables('moins de 3 h.')).toBe(`moins de 3${NBSP}h.`);
    expect(espacesInsecables('10 min de marche')).toBe(`10${NBSP}min de marche`);
  });

  it('les minutes, au pluriel comme au singulier', () => {
    expect(espacesInsecables('environ 5 minutes')).toBe(`environ 5${NBSP}minutes`);
    expect(espacesInsecables('1 minute')).toBe(`1${NBSP}minute`);
  });

  it('les titres relevés à l’audit du 01/10/2026 ne se coupent plus entre le nombre et l’unité', () => {
    // Page 2 de l'onboarding, et les deux phrases de l'étape des longs trajets (captures p1-02, p1-27).
    expect(espacesInsecables('9,5 tonnes en moyenne, 2 tonnes visées en 2050')).toBe(
      `9,5${NBSP}tonnes en moyenne, 2${NBSP}tonnes visées en 2050`,
    );
    expect(espacesInsecables('Et les trajets de plus de 300 km ?')).toBe(`Et les trajets de plus de 300${NBSP}km${NBSP}?`);
    expect(espacesInsecables('800 km train, 700 km autocar et voiture')).toBe(
      `800${NBSP}km train, 700${NBSP}km autocar et voiture`,
    );
  });

  it("garde le nombre groupé et son unité ensemble, sans toucher à ce qui groupe", () => {
    expect(espacesInsecables(`1${NBSP}601 kg`)).toBe(`1${NBSP}601${NBSP}kg`);
    expect(espacesInsecables('une unité suivie de ponctuation : 50 km/h, 12 km².')).toBe(
      `une unité suivie de ponctuation${NBSP}: 50${NBSP}km/h, 12${NBSP}km².`,
    );
  });

  it('une unité de masse garde son nom de gaz', () => {
    expect(espacesInsecables('9,5 t CO₂e')).toBe(`9,5${NBSP}t${NBSP}CO₂e`);
    expect(espacesInsecables('une marche à 384 kg CO₂e de moins')).toBe(`une marche à 384${NBSP}kg${NBSP}CO₂e de moins`);
    expect(espacesInsecables('(1,9 t CO₂e aujourd’hui)')).toBe(`(1,9${NBSP}t${NBSP}CO₂e aujourd’hui)`);
    expect(espacesInsecables(`−${NBSP}1${NBSP}601 kg CO₂e`)).toBe(`−${NBSP}1${NBSP}601${NBSP}kg${NBSP}CO₂e`);
    // Un texte qui portait déjà l'insécable entre le nombre et l'unité garde la suite de la règle.
    expect(espacesInsecables(`2${NBSP}t CO₂e`)).toBe(`2${NBSP}t${NBSP}CO₂e`);
    // Un « t » qui finit un mot n'est pas l'unité d'un nombre, et n'est pas collé au gaz — « août » finit
    // par un « t » qu'un `\b` croirait seul, « û » n'étant pas une lettre pour lui.
    expect(espacesInsecables('cet CO₂e, août CO₂e')).toBe('cet CO₂e, août CO₂e');
  });

  it('ne colle jamais un nombre à un mot ordinaire, même quand il commence par une unité', () => {
    // « t », « h » et « min » ouvrent beaucoup de mots ; ce sont les mots suivants qui les départagent.
    for (const texte of [
      '2 trajets',
      '3 jours',
      '3 tours',
      '4 heures',
      '3 minimum',
      '2 kilomètres',
      '2 kilos',
      '5 hôtes',
      '2 tés',
      '7 tâches',
    ]) {
      expect(espacesInsecables(texte)).toBe(texte);
    }
  });

  it("ne colle pas une unité à qui n'a pas de nombre", () => {
    expect(espacesInsecables('Un kg de pommes, en t CO₂e, par km')).toBe('Un kg de pommes, en t CO₂e, par km');
    expect(espacesInsecables('10+ km')).toBe('10+ km');
  });

  it('laisse une espace déjà insécable entre le nombre et l’unité, fine ou non', () => {
    expect(espacesInsecables(`300${NBSP}km`)).toBe(`300${NBSP}km`);
    expect(espacesInsecables(`300${FINE}km`)).toBe(`300${FINE}km`);
  });
});
