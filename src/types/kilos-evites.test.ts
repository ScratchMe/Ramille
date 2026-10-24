/**
 * Ce qu'un « oui » au point a évité, au moins — étape 6a de `v1-35` (24/10/2026).
 *
 * Trois choses gardées ici : **le plancher** (un minimum ne s'arrondit jamais vers le haut, et le
 * calcul passe par les centièmes entiers), **ce qui compte** (le seul « oui », et jamais un zéro dit),
 * et **la règle des gestes** (une réponse donnée sur l'écran vaut tant que la ligne n'a pas été
 * relue — celle de la carte). Le formateur vit dans `src/lib/format.ts` ; il est éprouvé ici, à travers
 * les phrases qui le lisent, et dans `format.test.ts` pour ses formes.
 *
 * Éprouvé en le cassant, le 24/10/2026 — voir le relevé au pied.
 */
import { formatAuMoins } from '@/lib/format';
import {
  avecLesGestes,
  kilosEvites,
  kilosEvitesEnMots,
  phraseDuGroupe,
  phraseDuOui,
} from '@/types/kilos-evites';

describe('formatAuMoins', () => {
  const texte = (kg: number) => formatAuMoins(kg)?.texte ?? null;

  it('descend toujours, jamais au plus proche', () => {
    expect(texte(2.29)).toBe('2,2 kg CO₂e');
    expect(texte(9.99)).toBe('9,9 kg CO₂e');
    expect(texte(1.999)).toBe('1,9 kg CO₂e');
    expect(texte(27.99)).toBe('27 kg CO₂e');
    expect(texte(999.6)).toBe('999 kg CO₂e');
    expect(texte(1299)).toBe('1,2 t CO₂e');
  });

  // `0.29 * 100` vaut 28,999… en virgule flottante : un plancher nu sur les centièmes écrirait « 0,2 »
  // pour 0,29 — juste ici par chance —, et « 2,2 » pour 2,3.
  it('prend le plancher sur les centièmes, à la marge du flottant près', () => {
    expect(texte(0.29)).toBe('0,2 kg CO₂e');
    expect(texte(1.1)).toBe('1,1 kg CO₂e');
    expect(texte(2.3)).toBe('2,3 kg CO₂e');
    expect(texte(0.3)).toBe('0,3 kg CO₂e');
  });

  it('écrit l’entier sans « ,0 » sous dix kilos, et le dixième de tonne au-delà de la tonne', () => {
    expect(texte(4)).toBe('4 kg CO₂e');
    expect(texte(1000)).toBe('1,0 t CO₂e');
  });

  it('rend la valeur écrite et son unité, dont l’accord dépend', () => {
    expect(formatAuMoins(1.999)).toEqual({ texte: '1,9 kg CO₂e', valeur: 1.9, unite: 'kg' });
    expect(formatAuMoins(1601)).toEqual({ texte: '1,6 t CO₂e', valeur: 1.6, unite: 't' });
  });

  it('ne dit rien d’un minimum nul à la précision affichée', () => {
    expect(formatAuMoins(0)).toBeNull();
    expect(formatAuMoins(0.09)).toBeNull();
  });
});

describe('kilosEvites', () => {
  it('additionne les seuls « oui » qui portent un gain', () => {
    expect(
      kilosEvites([
        { reponse: 'oui', gainDUneFois: 2.29 },
        { reponse: 'non', gainDUneFois: 2.29 },
        { reponse: 'sans_objet', gainDUneFois: 2.29 },
        { reponse: null, gainDUneFois: 2.29 },
        { reponse: 'oui', gainDUneFois: null },
        { reponse: 'oui', gainDUneFois: 5.69 },
      ])
    ).toBe(7.98);
  });

  // Douze « oui » à 2,29 kg font 27,48 kg, et non 27,479999… : la somme est faite en centièmes.
  it('additionne au centième exact', () => {
    expect(kilosEvites(Array.from({ length: 12 }, () => ({ reponse: 'oui' as const, gainDUneFois: 2.29 })))).toBe(
      27.48
    );
    expect(kilosEvites(Array.from({ length: 10 }, () => ({ reponse: 'oui' as const, gainDUneFois: 0.1 })))).toBe(1);
    // Celui-ci tombe faux en virgule flottante : 3 × 28,999… ne fait pas 87.
    expect(kilosEvites(Array.from({ length: 3 }, () => ({ reponse: 'oui' as const, gainDUneFois: 0.29 })))).toBe(0.87);
  });

  it('rend zéro sans « oui », et ne compte jamais un gain nul ou négatif', () => {
    expect(kilosEvites([])).toBe(0);
    expect(kilosEvites([{ reponse: 'oui', gainDUneFois: 0 }, { reponse: 'oui', gainDUneFois: -3 }])).toBe(0);
  });
});

describe('les phrases', () => {
  it('accorde le participe au nombre écrit et à son unité', () => {
    expect(kilosEvitesEnMots(1.42)).toBe('au moins 1,4 kg CO₂e évité');
    expect(kilosEvitesEnMots(1.999)).toBe('au moins 1,9 kg CO₂e évité');
    expect(kilosEvitesEnMots(2)).toBe('au moins 2 kg CO₂e évités');
    expect(kilosEvitesEnMots(1601)).toBe('au moins 1,6 t CO₂e évitée');
    expect(kilosEvitesEnMots(2400)).toBe('au moins 2,4 t CO₂e évitées');
    expect(kilosEvitesEnMots(0)).toBeNull();
  });

  it('dit le minimum d’un « oui », et rien d’une autre réponse', () => {
    expect(phraseDuOui('oui', 2.29)).toBe('Au moins 2,2 kg CO₂e évités.');
    expect(phraseDuOui('non', 2.29)).toBeNull();
    expect(phraseDuOui('sans_objet', 2.29)).toBeNull();
    expect(phraseDuOui('oui', null)).toBeNull();
    expect(phraseDuOui(null, 2.29)).toBeNull();
  });

  it('dit le total d’un groupe du suivi, et sa provenance', () => {
    expect(
      phraseDuGroupe([
        { reponse: 'oui', gainDUneFois: 2.29 },
        { reponse: 'oui', gainDUneFois: 25.2 },
      ])
    ).toBe('Au moins 27 kg CO₂e évités, d’après tes réponses.');
    expect(phraseDuGroupe([{ reponse: 'non', gainDUneFois: 2.29 }])).toBeNull();
  });
});

describe('avecLesGestes', () => {
  const point = (surcharge: Partial<{ status: string; response_kind: string | null; responded_at: string | null }>) => ({
    id: 'p1',
    status: 'pending',
    response_kind: null as string | null,
    responded_at: null as string | null,
    ...surcharge,
  });

  it('applique une réponse donnée ici tant que la ligne n’a pas été relue', () => {
    expect(avecLesGestes([point({})], { p1: { reponse: 'oui', ligneAvant: null } })).toEqual([
      point({ status: 'answered', response_kind: 'oui' }),
    ]);
  });

  // Une correction faite ailleurs, relue : la ligne porte une autre heure que celle du geste, et l'emporte.
  it('laisse la ligne relue l’emporter', () => {
    const relue = point({ status: 'answered', response_kind: 'non', responded_at: '2026-10-21T09:00:00Z' });
    expect(avecLesGestes([relue], { p1: { reponse: 'oui', ligneAvant: null } })).toEqual([relue]);
  });

  it('corrige une réponse déjà donnée, tant que la ligne porte la première', () => {
    const repondue = point({ status: 'answered', response_kind: 'oui', responded_at: '2026-10-20T08:00:00Z' });
    expect(
      avecLesGestes([repondue], { p1: { reponse: 'non', ligneAvant: '2026-10-20T08:00:00Z' } })
    ).toEqual([{ ...repondue, response_kind: 'non' }]);
  });

  it('ne touche pas aux points sans geste', () => {
    const autre = { ...point({}), id: 'p2' };
    expect(avecLesGestes([autre], { p1: { reponse: 'oui', ligneAvant: null } })).toEqual([autre]);
  });
});

// Relevé des mutations, le 24/10/2026, une à la fois :
//   - le plancher sans sa marge (`Math.floor(kg * 100)`) → « prend le plancher sur les centièmes », seul ;
//   - l'arrondi au plus proche au lieu du plancher → « descend toujours », « rend la valeur écrite » et
//     « accorde le participe » ;
//   - la somme en flottant (`centiemes += gain * 100`) → « additionne au centième exact », seul, par son
//     troisième cas — les deux premiers tombent juste par chance ;
//   - tout genre de réponse compté → les trois tests qui nomment un « non », et deux de `saison.test.ts` ;
//   - la tonne accordée au masculin → « accorde le participe », et la carte d'ouverture de
//     `saison.test.ts` ;
//   - le geste appliqué sans regarder la ligne → « laisse la ligne relue l'emporter », seul.
