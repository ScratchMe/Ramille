// La page d'accueil du web dit ce que la fiche Play dit, mot pour mot (23/10/2026, étape 5 de `v1-35`).
//
// **Pourquoi lire le document plutôt que recopier ses phrases ici.** La fiche (`docs/exploitation/
// fiche-google-play.md` §2.1) est la source : chaque phrase y a sa ligne dans « Ce que chaque phrase
// engage », qui dit ce qui la rend vraie et quand la revoir. La page reprend ces phrases pour ne rien
// promettre de neuf. Un test qui recopierait les phrases une seconde fois serait une garde du code contre
// lui-même ; celui-ci lit la fiche, donc une phrase changée d'un côté sans l'autre le fait rougir — dans
// les deux sens. Même motif que `src/lib/format-jumeaux.test.ts`, qui lit les sources de `api/`.
//
// Ce qu'il ne voit pas : la ligne sous le film et le titre du film, qui n'ont pas de jumelle dans la fiche
// (décidés le 23/10/2026, `src/constants/accueil.ts`), et la version texte du film, qui suit le film.
//
// Éprouvé le 23/10/2026 : un mot changé dans « Ton suivi » côté page (« chaque semaine » → « chaque
// jour ») → « chaque section… » tombe, seul ; le même mot changé dans la fiche → le même test tombe, seul ;
// une puce retirée de la fiche → « chaque garantie… » tombe, seul. Et le 31/10/2026, depuis que le titre et
// le bouton de la page ne sont plus ceux de l'onboarding (`v1-36`) : « Pas de compte à créer pour commencer »
// changé dans `etape-accroche.tsx` → « la ligne sous le bouton… » tombe, seul.

// Le récit, lui, n'est pas dans la fiche : il est écrit pour la page (`RECIT`), ses chiffres viennent de
// `climat.ts` et de `carbon-reference.ts`, et ce fichier ne le compare à rien.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ACCUEIL, enDegres } from '@/constants/accueil';
import { CONTACT_EMAIL } from '@/constants/editeur';

const RACINE = join(__dirname, '..', '..');
const FICHE = readFileSync(join(RACINE, 'docs/exploitation/fiche-google-play.md'), 'utf8');

/** Le bloc de code qui suit une étiquette en gras de la fiche (« **Description courte** »…). */
function blocApres(etiquette: string): string {
  const debut = FICHE.indexOf(etiquette);
  if (debut < 0) throw new Error(`La fiche Play ne porte plus « ${etiquette} ».`);
  const ouverture = FICHE.indexOf('```\n', debut) + 4;
  return FICHE.slice(ouverture, FICHE.indexOf('\n```', ouverture));
}

const COURTE = blocApres('**Description courte**');
const COMPLETE = blocApres('**Description complète**');
const PARAGRAPHES = COMPLETE.split('\n').filter((ligne) => ligne.trim() !== '');

describe('la page d’accueil dit ce que dit la fiche Play', () => {
  it('le chapeau est la description courte', () => {
    expect(ACCUEIL.chapeau).toBe(COURTE.trim());
  });

  it('l’introduction est le premier paragraphe de la description', () => {
    expect(ACCUEIL.introduction).toBe(PARAGRAPHES[0]);
  });

  it('chaque section est un paragraphe de la description, sous son titre', () => {
    for (const section of ACCUEIL.sections) {
      const titre = PARAGRAPHES.indexOf(section.titre.toLocaleUpperCase('fr'));
      expect({ section: section.titre, titreDansLaFiche: titre >= 0 }).toEqual({ section: section.titre, titreDansLaFiche: true });
      expect(PARAGRAPHES[titre + 1]).toBe(section.texte);
    }
  });

  it('chaque garantie est une puce de la fiche, et la fiche n’en porte pas d’autre', () => {
    const puces = PARAGRAPHES.filter((ligne) => ligne.startsWith('• ')).map((ligne) => ligne.slice(2));
    expect(ACCUEIL.garanties.points).toEqual(puces);
    expect(PARAGRAPHES).toContain(ACCUEIL.garanties.titre.toLocaleUpperCase('fr'));
  });

  it('ce que Ramille n’est pas, et la dernière ligne, avec l’adresse', () => {
    expect(PARAGRAPHES).toContain(ACCUEIL.limites.titre.toLocaleUpperCase('fr'));
    expect(PARAGRAPHES).toContain(ACCUEIL.limites.texte);
    expect(PARAGRAPHES.at(-1)).toBe(`${ACCUEIL.editeur}${CONTACT_EMAIL}`);
  });

  // Le titre et le bouton ne sont plus ceux de l'onboarding depuis le 31/10/2026 (`v1-36`) : la page part de
  // l'été 2026, l'onboarding de Ramille. La ligne sous le bouton reste la même phrase, pour la même question.
  it('la ligne sous le bouton est celle de la première page de l’onboarding', () => {
    const accroche = readFileSync(join(RACINE, 'src/components/onboarding/etape-accroche.tsx'), 'utf8');
    expect(accroche.includes(ACCUEIL.sansCompte)).toBe(true);
  });
});

// Le formateur des degrés du récit (`v1-36`). Éprouvé en le cassant, le 31/10/2026 : le point laissé tel quel,
// puis le signe retiré, font chacun tomber ce test.
describe('enDegres', () => {
  it('signé, à la virgule française, l’unité après une espace', () => {
    expect(enDegres(2.7)).toBe('+2,7 °C');
    expect(enDegres(4)).toBe('+4 °C');
  });
});
