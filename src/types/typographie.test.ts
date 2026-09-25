/**
 * Éprouvé en cassant ce qu'il garde, le 25/09/2026 (contre-lecture de `v1-29`) :
 * - `ESPACE_INSECABLE` devenue une espace ordinaire → cinq tests tombent sur huit, dont le premier,
 *   qui la nomme ; restent verts les trois qui ne posent aucune espace. Avant ce jour, les attentes
 *   interpolaient **la constante testée**, et la même mutation laissait les sept tests d'alors
 *   verts (rejoué sur l'ancien fichier) ;
 * - `»` retiré de la classe des signes → le test des guillemets tombe, et lui seul ;
 * - le drapeau `g` retiré des deux motifs → « chaque occurrence » tombe, et lui seul : les
 *   guillemets n'y portent qu'une espace de chaque sorte.
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

  it('rend une chaîne vide telle quelle', () => {
    expect(espacesInsecables('')).toBe('');
  });
});
