/**
 * La page 4 de l'onboarding annonce les sections du questionnaire (`v1-33`, Q-15) : l'annonce et ce qu'on
 * trouve ensuite doivent porter le même nom.
 *
 * Elle les recopiait à la main, avec un commentaire qui affirmait « les mêmes libellés qu'en tête du
 * questionnaire » : c'était faux pour deux sections sur quatre (« Trajet domicile-travail » contre
 * « Domicile-travail », « Ton contexte de mobilité » contre « Contexte de mobilité »). Elle les lit
 * désormais dans `BILAN_SECTION_LABEL`, qui est aussi ce que lit l'en-tête du questionnaire — une seule
 * source, donc une section renommée change l'annonce sans qu'on y touche.
 *
 * **Le critère de `TESTING.md` §2.10 est rempli** : la mutation se nomme — recopier un libellé à la main
 * —, et elle n'est visible ni par `src/types` ni par le parcours réel, qui ne cherche pas ces quatre lignes.
 *
 * **Éprouvé en le cassant, le 01/10/2026** (`TESTING.md` §1.1), le fichier restauré depuis une copie :
 *   - la liste remise en dur avec les anciens libellés (l'état d'avant) → « porte les noms de l'en-tête » et
 *     « les quatre noms de la page », et eux seuls ;
 *   - un libellé du questionnaire renommé dans `BILAN_SECTION_LABEL` sans toucher à la page → rien ne tombe, et
 *     c'est le but : « porte les noms de l'en-tête » le suit au lieu de le contredire. « les quatre noms de la
 *     page », écrit en littéral, tombe alors — c'est lui qui force à relire un renommage, qui est un texte.
 */
import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { EtapeTransition } from '@/components/onboarding/etape-transition';
import { BILAN_SECTION_LABEL, BILAN_STEP_ORDER } from '@/types/bilan';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), canDismiss: jest.fn(() => false), dismissAll: jest.fn() },
}));
jest.mock('@/lib/analytics', () => ({ track: jest.fn() }));

describe('la page 4 de l’onboarding, et ses quatre sections', () => {
  test('porte les noms de l’en-tête du questionnaire, dans son ordre, numérotés', () => {
    render(<EtapeTransition onPrecedent={jest.fn()} />);

    const sections = [...new Set(BILAN_STEP_ORDER.map((etape) => BILAN_SECTION_LABEL[etape]))];
    expect(sections).toHaveLength(4);
    sections.forEach((nom, i) => {
      expect(screen.getByText(`${i + 1} — ${nom}`)).toBeTruthy();
    });
  });

  test('les quatre noms de la page', () => {
    // Écrits en littéral, indépendamment de la source : c'est la valeur que la personne lit, et un
    // renommage dans le questionnaire doit passer par ici.
    render(<EtapeTransition onPrecedent={jest.fn()} />);

    expect(screen.getByText('1 — Domicile-travail')).toBeTruthy();
    expect(screen.getByText('2 — Loisirs du week-end')).toBeTruthy();
    expect(screen.getByText('3 — Voyages longue distance')).toBeTruthy();
    expect(screen.getByText('4 — Contexte de mobilité')).toBeTruthy();
    // Les anciens libellés ont disparu.
    expect(screen.queryByText(/Trajet domicile-travail/)).toBeNull();
    expect(screen.queryByText(/Ton contexte de mobilité/)).toBeNull();
  });
});
