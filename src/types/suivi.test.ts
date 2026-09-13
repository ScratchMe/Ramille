// Tests de la logique pure du suivi (v1-07 §3.2). Même critère que
// `src/types/bilan.test.ts` : on teste ce qui produit un chiffre ou une phrase affichée à
// l'utilisateur, là où un bug coûte cher — pas les requêtes elles-mêmes.
import {
  ancienneteEnMots,
  daysSince,
  formatDate,
  keepLatestPerDay,
  libelleDeReponse,
  libellePeriodeAffiche,
  REBILAN_SUGGESTION_DAYS,
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

describe('libellePeriodeAffiche', () => {
  const maintenant = new Date(2026, 8, 14);

  it('laisse le libellé de l’année en cours intact', () => {
    expect(libellePeriodeAffiche('Semaine du 31/08', '2026-08-31', maintenant)).toBe(
      'Semaine du 31/08'
    );
  });

  // Sans l'année, deux points à douze mois d'écart portent le même libellé et la liste se lit
  // comme un doublon.
  it('ajoute l’année à un libellé hebdomadaire passé', () => {
    expect(libellePeriodeAffiche('Semaine du 31/08', '2025-08-31', maintenant)).toBe(
      'Semaine du 31/08 2025'
    );
  });

  // Le libellé mensuel porte déjà son année : la redoubler donnerait « septembre 2025 2025 ».
  it('ne redouble pas une année déjà présente', () => {
    expect(libellePeriodeAffiche('septembre 2025', '2025-09-01', maintenant)).toBe(
      'septembre 2025'
    );
    expect(libellePeriodeAffiche('septembre 2026', '2026-09-01', maintenant)).toBe(
      'septembre 2026'
    );
  });

  // Le libellé snapshoté n'est jamais réécrit : l'année vient de `periodStart`, pas d'une
  // relecture du texte. Un libellé ancien, écrit sous une autre forme, ressort tel quel avec son
  // année ajoutée.
  it('dérive l’année de periodStart et non du texte', () => {
    expect(libellePeriodeAffiche('Semaine du 05/01', '2024-01-01', maintenant)).toBe(
      'Semaine du 05/01 2024'
    );
  });

  it('accepte un horodatage complet', () => {
    expect(libellePeriodeAffiche('Semaine du 31/08', '2025-08-31T06:00:00.000Z', maintenant)).toBe(
      'Semaine du 31/08 2025'
    );
  });
});

describe('libelleDeReponse', () => {
  // **Les trois réponses ont chacune un libellé, et la troisième n'est pas « Non ».** C'est tout
  // le chantier C2.4 : une semaine de congés inscrite en « Non » dans le suivi est précisément ce
  // qui transformait dix mois sur douze en série d'échecs pour un profil « deux vols par an ».
  it.each([
    ['oui', 'Oui'],
    ['non', 'Non'],
    ['sans_objet', 'Pas de trajet'],
  ] as const)('%s → %s', (reponse, libelle) => {
    expect(libelleDeReponse(reponse)).toBe(libelle);
  });

  it('les trois libellés sont distincts', () => {
    const libelles = (['oui', 'non', 'sans_objet'] as const).map(libelleDeReponse);
    expect(new Set(libelles).size).toBe(3);
  });
});

describe('ancienneteEnMots', () => {
  // Le seuil de la proposition de re-bilan doit tomber pile sur « six mois » : c'est la phrase du
  // canvas (« Ton bilan a six mois »), et si la dérivation rendait « cinq mois » au jour où la
  // carte apparaît, la carte se contredirait elle-même le premier jour.
  it('dit « six mois » au seuil de la proposition', () => {
    expect(ancienneteEnMots(REBILAN_SUGGESTION_DAYS)).toBe('six mois');
  });

  it.each([
    [180, 'six mois'],
    [210, 'sept mois'],
    [240, 'huit mois'],
    [270, 'neuf mois'],
    [300, 'dix mois'],
    [330, 'onze mois'],
  ])('%i jours se disent « %s »', (jours, attendu) => {
    expect(ancienneteEnMots(jours)).toBe(attendu);
  });

  // En mots, jamais en chiffres : c'est un ordre de grandeur, et aucun de ces libellés ne doit
  // pouvoir se lire comme une mesure.
  it('n’écrit aucun chiffre', () => {
    for (const jours of [0, 30, 182, 300, 400, 4000]) {
      expect(ancienneteEnMots(jours)).not.toMatch(/\d/);
    }
  });

  // Au-delà de l'année, le compte exact n'apporte plus rien — et « quinze mois » se lit comme une
  // facture.
  it('ne compte plus en mois au-delà de l’année', () => {
    expect(ancienneteEnMots(360)).toBe('plus d’un an');
    expect(ancienneteEnMots(365)).toBe('plus d’un an');
    expect(ancienneteEnMots(1200)).toBe('plus d’un an');
  });

  // Les deux bornes basses existent pour que la dérivation soit totale, pas parce qu'un écran les
  // atteint : la carte n'apparaît qu'à partir de six mois.
  it('reste lisible sous le mois', () => {
    expect(ancienneteEnMots(0)).toBe('moins d’un mois');
    expect(ancienneteEnMots(29)).toBe('moins d’un mois');
    expect(ancienneteEnMots(30)).toBe('un mois');
  });
});
