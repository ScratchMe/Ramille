// Tests de la logique pure du suivi (v1-07 §3.2). Même critère que
// `src/types/bilan.test.ts` : on teste ce qui produit un chiffre ou une phrase affichée à
// l'utilisateur, là où un bug coûte cher — pas les requêtes elles-mêmes.
import {
  daysSince,
  formatDate,
  keepLatestPerDay,
  variationNote,
  type AssessmentSnapshot,
} from '@/types/suivi';

function snapshot(submittedAt: string, totalKg: number): AssessmentSnapshot {
  return {
    assessmentId: `id-${submittedAt}-${totalKg}`,
    submittedAt,
    totalKg,
    dominantPoste: 'commute',
    dominantLabel: 'Trajet domicile-travail (Voiture)',
  };
}

describe('variationNote', () => {
  it('annonce une baisse en pourcentage', () => {
    expect(variationNote(3000, 2400)).toBe('20 % de moins que ton bilan précédent.');
  });

  it('annonce une hausse sans en faire une faute', () => {
    // Le second membre de phrase n'est pas décoratif : une hausse peut venir d'un
    // déménagement ou d'une année avec un voyage familial, et la spec §7 exige une relance
    // factuelle et non culpabilisante.
    expect(variationNote(2000, 2600)).toBe(
      '30 % de plus que ton bilan précédent. Une année n’est pas l’autre.'
    );
  });

  it('traite un écart de moins de 3 % comme stable plutôt que comme une variation', () => {
    expect(variationNote(2000, 2040)).toBe('Stable par rapport à ton bilan précédent.');
    expect(variationNote(2000, 1960)).toBe('Stable par rapport à ton bilan précédent.');
  });

  it('ne divise jamais par zéro', () => {
    // Atteignable : quelqu'un dont le premier bilan est à zéro (vélo et marche uniquement,
    // aucun vol, aucun trajet longue distance) puis qui achète une voiture.
    expect(variationNote(0, 1200)).toBe('Premier point de comparaison.');
    expect(variationNote(0, 0)).toBe('Premier point de comparaison.');
  });

  it('arrondit au pourcent le plus proche', () => {
    expect(variationNote(1000, 1126)).toBe('13 % de plus que ton bilan précédent. Une année n’est pas l’autre.');
  });
});

describe('keepLatestPerDay', () => {
  it('ne garde que le dernier bilan de chaque journée', () => {
    // Corriger une réponse juste après avoir soumis crée un second bilan : deux barres à la
    // même date se liraient comme un bug alors que c'est une correction.
    const result = keepLatestPerDay([
      snapshot('2026-03-01T09:00:00Z', 3000),
      snapshot('2026-03-01T09:12:00Z', 2800),
      snapshot('2026-09-01T10:00:00Z', 2400),
    ]);

    expect(result.map((s) => s.totalKg)).toEqual([2800, 2400]);
  });

  it('conserve l’ordre chronologique', () => {
    const result = keepLatestPerDay([
      snapshot('2026-01-15T08:00:00Z', 3200),
      snapshot('2026-06-15T08:00:00Z', 2900),
      snapshot('2026-09-15T08:00:00Z', 2500),
    ]);

    expect(result.map((s) => s.submittedAt.slice(0, 10))).toEqual(['2026-01-15', '2026-06-15', '2026-09-15']);
  });

  it('renvoie une liste vide sans bilan', () => {
    expect(keepLatestPerDay([])).toEqual([]);
  });
});

describe('daysSince', () => {
  it('compte les jours écoulés depuis une date', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(daysSince(tenDaysAgo)).toBe(10);
  });

  it('renvoie 0 pour aujourd’hui', () => {
    expect(daysSince(new Date().toISOString())).toBe(0);
  });
});

describe('formatDate', () => {
  // Une seule implémentation pour deux écrans : la liste du suivi et la relecture d'un bilan
  // (A3-15). Une date à midi UTC, pour que le fuseau de la machine ne décide pas du jour.
  it('écrit la date à la française, mois en lettres', () => {
    expect(formatDate('2026-03-12T12:00:00Z')).toBe('12 mars 2026');
  });

  it('garde le jour sur deux chiffres', () => {
    expect(formatDate('2026-09-01T12:00:00Z')).toBe('01 septembre 2026');
  });
});
