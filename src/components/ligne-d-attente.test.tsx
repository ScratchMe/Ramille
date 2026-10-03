/**
 * La ligne de chargement : une forme, un délai, deux exceptions (`v1-33` T-9, 03/10/2026).
 *
 * **Pourquoi un test de rendu.** Le délai lui-même est gardé par `src/hooks/use-apres-un-delai.test.ts` ;
 * ce que ce fichier garde, c'est son **appel** — que le composant passe bien la demande et la page ouverte
 * à froid au crochet, et la forme qu'il pose. Les écrans l'appelaient chacun à côté d'un `ThemedText`
 * écrit à la main, et c'est ainsi que l'audit en a compté huit formes. Le parcours réel ne mesure aucun
 * délai, et la section D de `verifier-etats-export.mjs` ne lit que la restitution.
 *
 * Éprouvé en cassant ce qu'il garde, le 03/10/2026 — quatre mutations, chacune faisant tomber le sien
 * et aucun autre :
 *   - le délai ignoré (`useChargementVisible(true, true)`) → le premier test ;
 *   - la demande de la personne oubliée (`demandee ||` retiré) → le deuxième ;
 *   - `immediate` oublié → le troisième ;
 *   - la ligne posée en `small` tertiaire, la forme de « Toi » avant ce chantier → le quatrième.
 */
import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { LigneDAttente } from '@/components/ligne-d-attente';
import { Colors, TypeScale } from '@/constants/theme';
import { DELAI_AVANT_CHARGEMENT } from '@/hooks/use-apres-un-delai';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('LigneDAttente', () => {
  it('se tait pendant le délai, puis se dit', () => {
    render(<LigneDAttente>Chargement de ton plan…</LigneDAttente>);
    expect(screen.queryByText('Chargement de ton plan…')).toBeNull();

    act(() => jest.advanceTimersByTime(DELAI_AVANT_CHARGEMENT));
    expect(screen.getByText('Chargement de ton plan…')).toBeTruthy();
  });

  it('demandée par la personne (« Réessayer »), elle se dit au premier rendu', () => {
    render(<LigneDAttente demandee>Chargement de ton suivi…</LigneDAttente>);
    expect(screen.getByText('Chargement de ton suivi…')).toBeTruthy();
  });

  it('sur une page ouverte à froid, elle se dit au premier rendu — le HTML statique la porte', () => {
    render(<LigneDAttente immediate>Chargement de ton bilan…</LigneDAttente>);
    expect(screen.getByText('Chargement de ton bilan…')).toBeTruthy();
  });

  it('a une seule forme : le corps `body`, le gris secondaire', () => {
    render(<LigneDAttente>Chargement de ton compte…</LigneDAttente>);
    act(() => jest.advanceTimersByTime(DELAI_AVANT_CHARGEMENT));
    const style = StyleSheet.flatten(screen.getByText('Chargement de ton compte…').props.style);

    expect(style.fontSize).toBe(TypeScale.body.fontSize);
    expect(style.color).toBe(Colors.light.textSecondary);
  });
});
