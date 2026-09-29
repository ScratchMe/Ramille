import { optionCible } from '@/types/demande';

// Ce que le « Suivant » en attente fait voir (29/09/2026, `v1-31`). Ce test garde les fonctions, pas
// leurs appels (`FRONT.md` §1.1) : que `StepShell` y défile vraiment, et que le focus se pose, c'est la
// section K de `scripts/verifier-etats-export.mjs` qui le relève dans l'export.
//
// **Éprouvé en le cassant, le 29/09/2026**, une mutation à la fois, l'état d'avant réécrit depuis une
// copie :
//   - `optionCible` qui rend toujours la première → « la cochée, quand il y en a une », et lui seul.

describe('optionCible', () => {
  it('la cochée, quand il y en a une', () => {
    expect(optionCible([false, false, true, false])).toBe(2);
  });

  it('la première, quand aucune ne l’est', () => {
    expect(optionCible([false, false, false])).toBe(0);
  });

  it('une liste vide ne désigne rien d’autre que zéro', () => {
    expect(optionCible([])).toBe(0);
  });
});
