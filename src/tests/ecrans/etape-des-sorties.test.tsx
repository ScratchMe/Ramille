/**
 * L'étape des sorties, quand ses réponses arrivent APRÈS son montage (`v1-27` §12.20).
 *
 * L'étape recopiait deux choses dans des états locaux initialisés au montage seulement : la rangée
 * cochée — qui départage « Voiture (seul) » de « Voiture (covoiturage) », les deux valant
 * `voiture` — et la seconde liste de modes ouverte. Un préremplissage arrivé après le montage ne
 * les mettait pas à jour : sur le re-bilan d'un profil qui sort en bus, aucun mode ne paraissait
 * coché et « Bus » restait caché sous « Voir les autres modes », pendant que la réponse était bien
 * dans l'état et que « Suivant » avançait. Le seul chemin qui y mène aujourd'hui est une adresse
 * `/bilan?etape=leisure_detail` tapée, mais la famille est celle de l'écart 12 de `v1-31` (une donnée
 * arrivée après le montage), et elle attend le prochain chemin qui l'ouvrira.
 *
 * **Le critère de `TESTING.md` §2.10 est rempli** : la décision vit dans l'écran — ce qui est coché,
 * ce qui est déplié —, pas dans une dérivation de `src/types`, et le parcours réel n'ouvre jamais
 * cette étape avant son préremplissage.
 *
 * **Rejoué avant d'être corrigé, le 29/09/2026** : les deux premiers tests tombaient sur le code
 * d'avant, et eux seuls. **Éprouvé en le cassant, le même jour** (TESTING.md §1.1) :
 *   - la rangée cochée recopiée au montage (l'état d'avant) → les deux tests du préremplissage
 *     tardif, et eux seuls ;
 *   - la seconde liste ouverte seulement par un état initialisé au montage (l'état d'avant, pour elle
 *     seule) → « un bus prérempli après le montage », seul ;
 *   - un choix fait pendant que la seconde liste est ouverte par la réponse, qui ne l'épingle plus
 *     → « choisir un mode de la première liste ne referme pas la seconde », seul ;
 *   - la rangée cochée lue sur le seul mode, sans le covoiturage → « une voiture partagée » et « le
 *     toucher départage encore les deux voitures » — les deux rangées « Voiture » se cochaient
 *     ensemble.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import React, { useState } from 'react';

import { LeisureDetailStep } from '@/components/bilan/steps/leisure-detail';
import { EMPTY_BILAN_ANSWERS, type BilanAnswers } from '@/types/bilan';

// « Ton mode n'est pas dans la liste ? » navigue : `expo-router` ne se charge pas sous Jest, et le lien
// n'est pas ce que ce fichier garde.
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

// Les gestes : l'hôte tient les réponses, comme l'écran du questionnaire.
function Hote({ depart }: { depart: Partial<BilanAnswers> }) {
  const [answers, setAnswers] = useState<BilanAnswers>({ ...EMPTY_BILAN_ANSWERS, ...depart });
  return <LeisureDetailStep answers={answers} update={(patch) => setAnswers((a) => ({ ...a, ...patch }))} />;
}

// Le préremplissage d'un re-bilan, vu de l'étape : de nouvelles `answers` qui ne passent pas par son
// `update` — un second rendu du même composant, donc sans remontage.
const etape = (reponses: Partial<BilanAnswers>) => (
  <LeisureDetailStep answers={{ ...EMPTY_BILAN_ANSWERS, ...reponses }} update={jest.fn()} />
);

// `aria-checked` arrive sur l'élément hôte en `accessibilityState` : c'est ce qu'un lecteur d'écran lit.
const estCoche = (radio: { props: { accessibilityState?: { checked?: unknown } } }) =>
  radio.props.accessibilityState?.checked === true;
const coche = (libelle: string) => estCoche(screen.getByRole('radio', { name: libelle }));

describe('des réponses arrivées après le montage de l’étape', () => {
  test('un bus prérempli après le montage est coché, et visible sans « Voir les autres modes »', () => {
    const { rerender } = render(etape({}));
    expect(screen.queryByText('Bus')).toBeNull();
    rerender(etape({ leisure_mode: 'bus' }));
    expect(coche('Bus')).toBe(true);
    expect(screen.queryByText('Voir les autres modes')).toBeNull();
  });

  test('une voiture partagée préremplie après le montage coche le covoiturage, et lui seul', () => {
    const { rerender } = render(etape({}));
    rerender(etape({ leisure_mode: 'voiture', leisure_is_carpool: true }));
    expect(coche('Voiture (covoiturage)')).toBe(true);
    expect(coche('Voiture (seul)')).toBe(false);
  });
});

describe('ce que la correction ne doit pas défaire', () => {
  test('choisir un mode de la première liste ne referme pas la seconde', () => {
    // Ouverte parce que la réponse y vit : la lire sur la seule réponse la refermerait sous le doigt
    // dès qu'on choisit « Train ».
    render(<Hote depart={{ leisure_mode: 'bus' }} />);
    fireEvent.press(screen.getByRole('radio', { name: 'Train' }));
    expect(coche('Train')).toBe(true);
    expect(screen.getByRole('radio', { name: 'Bus' })).toBeTruthy();
    expect(screen.queryByText('Voir les autres modes')).toBeNull();
  });

  test('sans réponse, la seconde liste reste repliée derrière son lien, et rien n’est coché', () => {
    render(<Hote depart={{}} />);
    expect(screen.getByText('Voir les autres modes')).toBeTruthy();
    expect(screen.getAllByRole('radio').filter(estCoche)).toHaveLength(0);
  });

  test('le toucher départage encore les deux voitures', () => {
    render(<Hote depart={{}} />);
    fireEvent.press(screen.getByRole('radio', { name: 'Voiture (covoiturage)' }));
    expect(coche('Voiture (covoiturage)')).toBe(true);
    fireEvent.press(screen.getByRole('radio', { name: 'Voiture (seul)' }));
    expect(coche('Voiture (seul)')).toBe(true);
    expect(coche('Voiture (covoiturage)')).toBe(false);
  });
});
