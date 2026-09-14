// Tests de la logique pure du suivi (v1-07 §3.2). Même critère que
// `src/types/bilan.test.ts` : on teste ce qui produit un chiffre ou une phrase affichée à
// l'utilisateur, là où un bug coûte cher — pas les requêtes elles-mêmes.
import { formatTonnes } from '@/lib/format';
import { saisonDe } from './saison';
import {
  ancienneteEnMots,
  daysSince,
  decisionsParSaison,
  doitProposerUnRebilan,
  ecartParPoste,
  estStable,
  estUneBaisse,
  pointsParSaison,
  variationDepuisLeBilanPrecedent,
  formatDate,
  keepLatestPerDay,
  libelleDeReponse,
  libellePeriodeAffiche,
  REBILAN_SUGGESTION_DAYS,
  variationNote,
  type AssessmentSnapshot,
  type CheckinRecord,
  type DecisionBrute,
} from '@/types/suivi';

function snapshot(
  submittedAt: string,
  totalKg: number,
  parPoste?: Partial<AssessmentSnapshot['parPoste']>,
  dominantPoste = 'commute'
): AssessmentSnapshot {
  return {
    assessmentId: `id-${submittedAt}-${totalKg}`,
    submittedAt,
    totalKg,
    dominantPoste,
    dominantLabel: 'Trajet domicile-travail (Voiture)',
    parPoste: { commute: totalKg, leisure: 0, travel: 0, ...parPoste },
  };
}

describe('variationNote', () => {
  // La phrase de baisse est reprise en détail plus bas (« variationNote — la baisse reconnue ») :
  // ici on ne garde que le pourcentage, qui est ce que ce bloc-là éprouve.
  it('annonce une baisse en pourcentage', () => {
    expect(variationNote(3000, 2400)).toContain('600 kg de moins que ton bilan précédent (− 20 %).');
  });

  it('annonce une hausse sans en faire une faute', () => {
    // Le second membre de phrase n'est pas décoratif : une hausse peut venir d'un
    // déménagement ou d'une année avec un voyage familial, et la spec §7 exige une relance
    // factuelle et non culpabilisante.
    expect(variationNote(2000, 2600)).toBe(
      '600 kg de plus que ton bilan précédent (+ 30 %). Une année n’est pas l’autre.'
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

  it('distingue deux bilans que le total affiche à l’identique', () => {
    // **A5-3, symptôme 1.** 1 240 et 1 180 kg s'affichent tous deux « 1,2 t » dans la liste : si la
    // note ne porte qu'un pourcentage, rien à l'écran ne corrobore le changement. C'est l'écart
    // absolu qui referme le constat, et c'est ici qu'il est épinglé.
    expect(variationNote(1240, 1180)).toContain('60 kg de moins');
    expect(formatTonnes(1240)).toBe(formatTonnes(1180));
  });

  it('arrondit au pourcent le plus proche', () => {
    expect(variationNote(1000, 1126)).toBe('126 kg de plus que ton bilan précédent (+ 13 %). Une année n’est pas l’autre.');
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

  // **Le regroupement se fait sur le jour LOCAL, pas sur le jour UTC** (C2.7, point 7). Les dix
  // premiers caractères d'un `timestamptz` sont son jour UTC : un bilan soumis le 10 mars à 23 h 00
  // UTC et sa correction le 11 à 00 h 30 UTC sont le même 11 mars à Paris, et l'ancien regroupement
  // en faisait deux barres avec deux valeurs différentes — le doublon exact que cette fonction
  // existe pour empêcher, et qui se lit comme un bug alors que c'est une correction.
  //
  // **Ce test n'éprouve quelque chose que hors d'UTC**, et c'est pour lui que la suite tourne en
  // `TZ=Europe/Paris` (script `test` de `package.json`) : en UTC les deux implémentations sont
  // identiques par définition, donc l'assertion passerait aussi bien avec l'ancienne. Forcer le
  // fuseau depuis le corps du test ne marche pas — Node met son fuseau en cache à la première
  // opération de date, et Jest en a déjà fait une.
  it('regroupe sur le jour local, pas sur le jour UTC', () => {
    const result = keepLatestPerDay([
      snapshot('2026-03-10T23:00:00Z', 3000),
      snapshot('2026-03-11T00:30:00Z', 2800),
    ]);
    expect(result.map((s) => s.totalKg)).toEqual([2800]);
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
    ['oui', 'Changement fait'],
    ['non', 'Pas cette fois'],
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

describe('variationNote — la baisse reconnue', () => {
  // **Le seul moment où ce que la personne a changé se voit dans un chiffre**, et il passait sans un
  // mot : une hausse recevait « Une année n'est pas l'autre » (une phrase qui désamorce) et une
  // baisse un pourcentage sec.
  it('attribue la baisse sans la chiffrer deux fois', () => {
    expect(variationNote(3000, 2400)).toBe(
      '600 kg de moins que ton bilan précédent (− 20 %). Ce que tu as changé se voit ici.'
    );
  });

  // La hausse garde la phrase factuelle : un déménagement, un changement de travail, une année avec
  // un voyage familial. On dit le fait, jamais un verdict.
  it('laisse la hausse factuelle', () => {
    expect(variationNote(2400, 3000)).toBe(
      '600 kg de plus que ton bilan précédent (+ 25 %). Une année n’est pas l’autre.'
    );
  });

  it('ne reconnaît rien sous le seuil de stabilité', () => {
    expect(variationNote(3000, 2940)).toBe('Stable par rapport à ton bilan précédent.');
  });
});

describe('estStable / estUneBaisse', () => {
  // Le seuil sert à trois endroits — la note du suivi, la phrase de la restitution, et la décision
  // d'afficher « Je vois la différence. ». Trois copies finiraient par diverger.
  it('tient l’écart de mesure pour une stabilité', () => {
    expect(estStable(3000, 2920)).toBe(true);
    expect(estStable(3000, 2900)).toBe(false);
    expect(estStable(3000, 3080)).toBe(true);
  });

  it('ne compte une baisse que dans le bon sens et au-delà du seuil', () => {
    expect(estUneBaisse(3000, 2400)).toBe(true);
    expect(estUneBaisse(3000, 2950)).toBe(false);
    expect(estUneBaisse(3000, 3600)).toBe(false);
  });

  it('range deux bilans identiques dans le stable, même à zéro', () => {
    // Le seuil est relatif, donc sans issue sur une base nulle : `false` faisait dire « 0 kg de
    // plus que ton bilan de mars. Une année n'est pas l'autre. » à un écart nul. Un bilan à zéro
    // est celui d'un piéton sans vol ni long trajet, pas un cas théorique.
    expect(estStable(0, 0)).toBe(true);
    expect(estStable(2400, 2400)).toBe(true);
    expect(estUneBaisse(0, 0)).toBe(false);
    // Et une base nulle qui augmente reste une hausse, pas une stabilité.
    expect(estStable(0, 40)).toBe(false);
  });

  it("ne console pas d'une hausse quand l'écart est nul", () => {
    expect(
      variationDepuisLeBilanPrecedent({ totalKg: 0, submittedAt: '2026-03-10T09:00:00Z' }, 0)
    ).toBe('Stable par rapport à ton bilan de mars.');
  });

  // Un premier bilan n'a rien à comparer : ni stable, ni en baisse.
  it('ne dit rien sans point de départ', () => {
    expect(estStable(0, 2400)).toBe(false);
    expect(estUneBaisse(0, 2400)).toBe(false);
  });
});

describe('ecartParPoste', () => {
  const avant = snapshot('2026-03-01T12:00:00Z', 3000, { commute: 2100, leisure: 500, travel: 400 });
  const apres = snapshot('2026-09-01T12:00:00Z', 2200, { commute: 1700, leisure: 500, travel: 0 });

  it('apparie les postes et met le plus lourd d’abord', () => {
    const ecarts = ecartParPoste(avant, apres);
    expect(ecarts.map((e) => e.poste)).toEqual(['commute', 'leisure', 'travel']);
    expect(ecarts[0]).toEqual({
      poste: 'commute',
      precedentKg: 2100,
      courantKg: 1700,
      dominant: true,
    });
  });

  // **Le poste dominant peut changer d'un bilan à l'autre, et c'est le plus souvent une réussite.**
  // L'accent suit celui du bilan **courant**, et il vient du serveur : son départage n'est pas un
  // simple maximum, donc un maximum recalculé ici désignerait parfois un autre poste que celui sur
  // lequel le plan travaille.
  it('suit le poste dominant du bilan courant, tel que le serveur l’a désigné', () => {
    const voyages = snapshot(
      '2026-09-01T12:00:00Z',
      2200,
      { commute: 400, leisure: 300, travel: 1500 },
      'travel'
    );
    const ecarts = ecartParPoste(avant, voyages);
    expect(ecarts.find((e) => e.dominant)?.poste).toBe('travel');
    expect(ecarts.filter((e) => e.dominant)).toHaveLength(1);
  });

  // « Voyages · 0 kg → 0 kg » n'apprend rien à quelqu'un qui n'a jamais déclaré de voyage. Un poste
  // qui tombe à zéro, en revanche, est exactement ce qu'on veut montrer.
  it('retire un poste nul des deux côtés, jamais un poste qui tombe à zéro', () => {
    const sansVoyage = snapshot('2026-03-01T12:00:00Z', 2600, {
      commute: 2100,
      leisure: 500,
      travel: 0,
    });
    expect(ecartParPoste(sansVoyage, apres).map((e) => e.poste)).toEqual(['commute', 'leisure']);
    expect(ecartParPoste(avant, apres).map((e) => e.poste)).toContain('travel');
  });

  it('rend une liste vide entre deux bilans entièrement nuls', () => {
    const nul = snapshot('2026-03-01T12:00:00Z', 0, { commute: 0, leisure: 0, travel: 0 });
    expect(ecartParPoste(nul, nul)).toEqual([]);
  });
});

describe('variationDepuisLeBilanPrecedent', () => {
  const mars = { totalKg: 3000, submittedAt: '2026-03-12T12:00:00Z' };

  // **En écart absolu et non en pourcentage** : les barres de la restitution sont en tonnes, et
  // « 8 % de moins » ne se rattache à rien de ce qu'on y voit.
  it('dit l’écart et nomme le mois', () => {
    expect(variationDepuisLeBilanPrecedent(mars, 2400)).toBe(
      '600 kg de moins que ton bilan de mars.'
    );
  });

  // C'est aussi la seule forme qui distingue deux bilans proches : `formatTonnes` passe en kilos
  // sous la tonne, donc un écart de 80 kg se dit « 80 kg » et non « 0,1 t ».
  it('descend en kilos sous la tonne', () => {
    expect(variationDepuisLeBilanPrecedent({ ...mars, totalKg: 2480 }, 2400)).toBe(
      '80 kg de moins que ton bilan de mars.'
    );
  });

  it('dit la hausse sans en faire une faute', () => {
    expect(variationDepuisLeBilanPrecedent(mars, 4200)).toBe(
      '1,2 t de plus que ton bilan de mars. Une année n’est pas l’autre.'
    );
  });

  it('dit « stable » sous le seuil', () => {
    expect(variationDepuisLeBilanPrecedent(mars, 2960)).toBe(
      'Stable par rapport à ton bilan de mars.'
    );
  });

  // Le mois vient de `MOIS_FRANCAIS` et jamais de `toLocaleDateString` : Hermes peut être construit
  // sans ICU complet et rendrait « March », invisible en CI et visible sur l'appareil.
  it('écrit le mois en français', () => {
    for (const [iso, mois] of [
      ['2026-01-15T12:00:00Z', 'janvier'],
      ['2026-08-15T12:00:00Z', 'août'],
      ['2026-12-15T12:00:00Z', 'décembre'],
    ] as const) {
      expect(variationDepuisLeBilanPrecedent({ totalKg: 3000, submittedAt: iso }, 2400)).toContain(
        `que ton bilan de ${mois}`
      );
    }
  });

  it('se replie sur « précédent » si la date est illisible', () => {
    expect(variationDepuisLeBilanPrecedent({ totalKg: 3000, submittedAt: 'nawak' }, 2400)).toBe(
      '600 kg de moins que ton bilan précédent.'
    );
  });
});

describe('decisionsParSaison', () => {
  const brute = (
    cycleId: string,
    periodStart: string,
    actionText: string,
    releasedAt: string | null
  ): DecisionBrute => ({
    cycleId,
    periodLabel: `Cycle ${cycleId}`,
    periodStart,
    actionText,
    intentionDays: [2, 4],
    intentionTiming: null,
    releasedAt,
  });

  // **Une ligne par cycle, et l'engagement vivant gagne.** Un cycle peut porter à la fois une action
  // engagée et des lignes d'archive — la personne a changé d'avis en cours de saison — et c'est la
  // décision qui tient encore qui compte.
  it('préfère l’engagement en place à une archive du même cycle', () => {
    const lignes = decisionsParSaison([
      brute('c1', '2026-09-01', 'Une action relâchée', '2026-09-20T10:00:00Z'),
      brute('c1', '2026-09-01', 'Celle qui tient', null),
    ]);
    expect(lignes).toHaveLength(1);
    expect(lignes[0].actionText).toBe('Celle qui tient');
  });

  // À défaut d'engagement vivant, la dernière libérée : c'est celle qui a tenu le plus longtemps.
  it('prend la dernière archive libérée quand rien ne tient plus', () => {
    const lignes = decisionsParSaison([
      brute('c1', '2026-09-01', 'La première', '2026-09-05T10:00:00Z'),
      brute('c1', '2026-09-01', 'La dernière', '2026-11-05T10:00:00Z'),
    ]);
    expect(lignes.map((l) => l.actionText)).toEqual(['La dernière']);
  });

  it('range les saisons de la plus récente à la plus ancienne', () => {
    const lignes = decisionsParSaison([
      brute('c1', '2026-03-01', 'Printemps', null),
      brute('c3', '2026-09-01', 'Automne', null),
      brute('c2', '2026-06-01', 'Été', null),
    ]);
    expect(lignes.map((l) => l.actionText)).toEqual(['Automne', 'Été', 'Printemps']);
  });

  // `releasedAt` est un détail de provenance : la liste affichée ne le porte pas, et personne ne
  // doit pouvoir en déduire un statut « tenu / pas tenu ».
  it('n’expose pas la date de libération', () => {
    const [ligne] = decisionsParSaison([brute('c1', '2026-09-01', 'A', '2026-09-20T10:00:00Z')]);
    expect(ligne).not.toHaveProperty('releasedAt');
  });

  it('rend une liste vide sans décision', () => {
    expect(decisionsParSaison([])).toEqual([]);
  });
});

describe('pointsParSaison', () => {
  const point = (id: string, periodStart: string): CheckinRecord => ({
    id,
    loopType: 'commute',
    periodLabel: `Semaine du ${periodStart.slice(8, 10)}/${periodStart.slice(5, 7)}`,
    periodStart,
    reponse: 'oui',
    respondedAt: `${periodStart}T10:00:00Z`,
  });

  it('regroupe par saison et garde l’ordre de lecture', () => {
    const groupes = pointsParSaison([
      point('a', '2026-12-07'),
      point('b', '2026-11-30'),
      point('c', '2026-09-07'),
    ]);
    expect(groupes.map((g) => g.libelle)).toEqual(['Hiver 2026-2027', 'Automne 2026']);
    expect(groupes[1].points.map((p) => p.id)).toEqual(['b', 'c']);
  });

  // **La saison passe par les caractères de la date.** `new Date('2026-09-01')` est minuit UTC :
  // à l'ouest de Greenwich son jour local est le 31 août, et le point se rangerait dans l'été.
  //
  // Le nom de ce test promettait « quel que soit le fuseau » et ne pouvait pas le tenir
  // (contre-lecture de la vague 6, 14/09/2026) : la suite tourne en `TZ=Europe/Paris`, à l'est de
  // Greenwich, donc minuit UTC et le jour écrit y tombent le même jour et les deux implémentations
  // rendent la même chose. À la différence de `finDePeriodeEnMots`, on ne peut pas interdire ici le
  // constructeur `Date` — `saisonDe` suit délibérément le calendrier **local** — donc on énonce
  // l'invariant réellement portant : le regroupement doit dire la même saison que `saisonDe` sur la
  // même date, lue par ses caractères. Une lecture UTC des caractères ferait diverger les deux.
  it('range le 1er septembre dans l’automne', () => {
    const groupes = pointsParSaison([point('a', '2026-09-01')]);
    expect(groupes[0].libelle).toBe('Automne 2026');
  });

  // Le garde qui mord : on interdit `new Date(<chaîne>)` — la lecture UTC — tout en laissant passer
  // `new Date(annee, mois, jour)`, qui est la forme locale correcte et dont `saisonDe` a besoin. Une
  // implémentation qui passerait la chaîne ISO au constructeur lève ici, dans n'importe quel fuseau.
  it('ne passe jamais la date ISO au constructeur `Date`', () => {
    const vrai = globalThis.Date;
    class DateSansChaine extends vrai {
      constructor(...args: unknown[]) {
        if (args.length === 1 && typeof args[0] === 'string') {
          throw new Error('une date nue se lit par ses composantes, pas par `new Date(iso)`');
        }
        super(...(args as []));
      }
    }
    globalThis.Date = DateSansChaine as unknown as DateConstructor;
    try {
      for (const jour of ['2026-03-01', '2026-06-01', '2026-09-01', '2026-12-01', '2027-02-28']) {
        expect(pointsParSaison([point('x', jour)])[0].libelle).toBe(
          saisonDe(new vrai(Number(jour.slice(0, 4)), Number(jour.slice(5, 7)) - 1, Number(jour.slice(8, 10))))
            .libelle
        );
      }
    } finally {
      globalThis.Date = vrai;
    }
  });

  // L'en-tête d'un groupe porte son **vrai** total : c'est ce qui empêche la liste et le compteur de
  // compter deux choses différentes, comme le faisait la troncature muette à huit.
  it('compte tous les points d’un groupe, même au-delà de ce que l’écran montre', () => {
    const points = Array.from({ length: 11 }, (_, i) =>
      point(`p${i}`, `2026-09-${String(i + 1).padStart(2, '0')}`)
    );
    const groupes = pointsParSaison(points);
    expect(groupes).toHaveLength(1);
    expect(groupes[0].points).toHaveLength(11);
  });

  it('rend une liste vide sans point', () => {
    expect(pointsParSaison([])).toEqual([]);
  });
});

describe('doitProposerUnRebilan', () => {
  const ilYA = (jours: number) =>
    new Date(Date.now() - jours * 24 * 60 * 60 * 1000).toISOString();

  it('propose au seuil, pas la veille', () => {
    expect(doitProposerUnRebilan(ilYA(REBILAN_SUGGESTION_DAYS))).toBe(true);
    expect(doitProposerUnRebilan(ilYA(REBILAN_SUGGESTION_DAYS - 1))).toBe(false);
  });

  // Sans bilan il n'y a rien à refaire, et l'écran concerné propose déjà d'en faire un premier.
  it('ne propose rien sans date', () => {
    expect(doitProposerUnRebilan(null)).toBe(false);
    expect(doitProposerUnRebilan(undefined)).toBe(false);
  });
});
