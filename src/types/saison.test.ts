import {
  basculeDeSaison,
  estDansLouverture,
  estPremierPlan,
  finDePeriodeEnMots,
  JOURS_DOUVERTURE,
  ouvertureDeSaison,
  ouvertureDuPremierPlan,
  progressionDeLaPeriode,
  recapDeLaPeriode,
  recapDeSaison,
  saisonDe,
  sortiesDeLouverture,
  SORTIE_DU_PREMIER_PLAN,
  type PointDeSaison,
} from '@/types/saison';

/**
 * Ces bornes sont **écrites deux fois** : ici, et dans `public.season_bounds`
 * (20260823110000_plan_reduction.sql), épinglée par `supabase/tests/database/00_period_bounds.test.sql`.
 * Toucher à l'une sans l'autre est le défaut que cette paire existe pour attraper — même motif
 * que la table de vérité des rappels (`rappels.test.ts` / `17_rappels_canal.test.sql`).
 */
const jour = (annee: number, mois: number, j: number) => new Date(annee, mois - 1, j);

describe('saisonDe', () => {
  // Les douze mois, une fois chacun : c'est le test qui attrape une branche inversée, et
  // aucune assertion de borne ne le remplace.
  it.each([
    [1, 'hiver', 'Hiver 2025-2026'],
    [2, 'hiver', 'Hiver 2025-2026'],
    [3, 'printemps', 'Printemps 2026'],
    [4, 'printemps', 'Printemps 2026'],
    [5, 'printemps', 'Printemps 2026'],
    [6, 'ete', 'Été 2026'],
    [7, 'ete', 'Été 2026'],
    [8, 'ete', 'Été 2026'],
    [9, 'automne', 'Automne 2026'],
    [10, 'automne', 'Automne 2026'],
    [11, 'automne', 'Automne 2026'],
    [12, 'hiver', 'Hiver 2026-2027'],
  ])('le mois %i tombe en %s (%s)', (mois, saison, libelle) => {
    const r = saisonDe(jour(2026, mois, 15));
    expect(r.saison).toBe(saison);
    expect(r.libelle).toBe(libelle);
  });

  // **Décembre appartient à l'hiver qui commence**, pas à celui qui s'achève. C'est la seule
  // règle de ce module qu'on peut « corriger » de bonne foi et à l'envers : un lecteur pressé
  // rattacherait décembre 2026 à « Hiver 2025-2026 » puisque c'est l'hiver en cours depuis
  // janvier. `season_bounds` fait le même choix, et le test pgTAP le dit dans son intitulé.
  it('décembre ouvre l’hiver suivant, janvier appartient au précédent', () => {
    expect(saisonDe(jour(2026, 12, 25)).libelle).toBe('Hiver 2026-2027');
    expect(saisonDe(jour(2027, 1, 5)).libelle).toBe('Hiver 2026-2027');
    expect(saisonDe(jour(2026, 1, 5)).libelle).toBe('Hiver 2025-2026');
  });

  it.each([
    [12, 1, jour(2026, 12, 1), jour(2027, 2, 28)],
    [3, 1, jour(2026, 3, 1), jour(2026, 5, 31)],
    [6, 1, jour(2026, 6, 1), jour(2026, 8, 31)],
    [9, 1, jour(2026, 9, 1), jour(2026, 11, 30)],
  ])('les bornes du 1er du mois %i sont fermées sur le dernier jour', (mois, j, debut, fin) => {
    const r = saisonDe(jour(2026, mois, j));
    expect(r.debut).toEqual(debut);
    expect(r.fin).toEqual(fin);
  });

  // Les veilles : le jour d'avant une borne doit rester dans la saison précédente. Une erreur
  // de comparaison stricte/large se voit ici et nulle part ailleurs.
  it.each([
    [jour(2026, 11, 30), 'automne'],
    [jour(2026, 2, 28), 'hiver'],
    [jour(2026, 5, 31), 'printemps'],
    [jour(2026, 8, 31), 'ete'],
  ])('la veille d’une borne reste dans la saison qui s’achève (%s)', (d, saison) => {
    expect(saisonDe(d).saison).toBe(saison);
  });

  // Février d'une année bissextile : la fin de l'hiver suit le calendrier, elle n'est pas
  // posée à 28. `setMonth` puis `setDate(-1)` le gère ; un calcul en jours ne le ferait pas.
  it('l’hiver d’une année bissextile finit le 29 février', () => {
    expect(saisonDe(jour(2027, 12, 3)).fin).toEqual(jour(2028, 2, 29));
  });

  // Une date porteuse d'une heure ne doit pas changer la saison ni décaler les bornes : les
  // bornes sortent toujours à minuit local.
  it('l’heure de la date n’entre pas dans le calcul', () => {
    const soir = new Date(2026, 8, 1, 23, 45, 12);
    const r = saisonDe(soir);
    expect(r.saison).toBe('automne');
    expect(r.debut).toEqual(jour(2026, 9, 1));
  });
});

describe('recapDeSaison', () => {
  const automne = saisonDe(jour(2026, 10, 1));

  const point = (
    periodStart: string,
    status: string,
    reponse: PointDeSaison['reponse']
  ): PointDeSaison => ({ periodStart, status, reponse });

  it('compte les répondus et les oui de la période', () => {
    const r = recapDeSaison(
      [
        point('2026-09-07', 'answered', 'oui'),
        point('2026-09-14', 'answered', 'non'),
        point('2026-10-05', 'answered', 'oui'),
      ],
      automne
    );
    expect(r).toEqual({ repondus: 3, changements: 2 });
  });

  // **Aucune mécanique d'échec** : les points non répondus ne sont pas comptés, et il n'y a
  // volontairement aucun champ pour les dire. Ajouter un `manques` ici rendrait affichable ce
  // que `/suivi` refuse de montrer.
  it('ignore les points non répondus, et ne les rend nulle part', () => {
    const r = recapDeSaison(
      [
        point('2026-09-07', 'answered', 'oui'),
        point('2026-09-14', 'expired', null),
        point('2026-09-21', 'pending', null),
      ],
      automne
    );
    expect(r).toEqual({ repondus: 1, changements: 1 });
    expect(Object.keys(r)).toEqual(['repondus', 'changements']);
  });

  // Le filtre est `status = 'answered'`, **jamais** la réponse elle-même : c'est ce qui a rendu le
  // module compatible avec la troisième réponse livrée par C2.4 (« pas de trajet cette période »),
  // qui est un point bel et bien répondu.
  it('compte un point répondu sans objet, sans le compter comme un changement', () => {
    const r = recapDeSaison([point('2026-10-12', 'answered', 'sans_objet')], automne);
    expect(r).toEqual({ repondus: 1, changements: 0 });
  });

  it('exclut ce qui tombe hors des bornes, veilles comprises', () => {
    const r = recapDeSaison(
      [
        point('2026-08-31', 'answered', 'oui'),
        point('2026-09-01', 'answered', 'oui'),
        point('2026-11-30', 'answered', 'oui'),
        point('2026-12-01', 'answered', 'oui'),
      ],
      automne
    );
    expect(r).toEqual({ repondus: 2, changements: 2 });
  });

  it('accepte un horodatage complet et n’en lit que le jour', () => {
    const r = recapDeSaison([point('2026-10-05T06:00:00.000Z', 'answered', 'oui')], automne);
    expect(r.repondus).toBe(1);
  });

  it('rend zéro sur une saison vide', () => {
    expect(recapDeSaison([], automne)).toEqual({ repondus: 0, changements: 0 });
  });
});

describe('finDePeriodeEnMots', () => {
  // Les quatre fins de saison, telles que `season_bounds` les rend. Le 28 février est celle
  // qu'une année bissextile déplace, et le libellé suit la date qu'on lui donne : il ne la
  // recalcule pas.
  it.each([
    ['2026-11-30', 'jusqu’au 30 novembre'],
    ['2027-02-28', 'jusqu’au 28 février'],
    ['2028-02-29', 'jusqu’au 29 février'],
    ['2026-05-31', 'jusqu’au 31 mai'],
    ['2026-08-31', 'jusqu’au 31 août'],
  ])('%s se dit « %s »', (iso, attendu) => {
    expect(finDePeriodeEnMots(iso)).toBe(attendu);
  });

  // « jusqu'au 1er mars », jamais « jusqu'au 1 mars » — la seule irrégularité des jours du mois
  // en français, portée par `jourDuMois` de `src/types/checkin.ts` et non recopiée ici.
  it('dit « 1er » pour un premier du mois', () => {
    expect(finDePeriodeEnMots('2027-03-01')).toBe('jusqu’au 1er mars');
  });

  // **Les caractères, jamais un `Date`.** `new Date('2026-11-30')` est minuit UTC : à l'ouest de
  // Greenwich, son jour local est le 29. Une carte du cap qui annoncerait « jusqu'au 29 novembre »
  // serait fausse d'un jour, et aucun test tournant en UTC ne le verrait — d'où cette lecture.
  it('lit le jour écrit', () => {
    expect(finDePeriodeEnMots('2026-12-01')).toBe('jusqu’au 1er décembre');
    expect(finDePeriodeEnMots('2026-01-01')).toBe('jusqu’au 1er janvier');
  });

  // **Et la garde qui vaut vraiment quelque chose** (contre-lecture de la vague 6, 14/09/2026).
  // L'assertion ci-dessus s'intitulait « quel que soit le fuseau » et restait verte avec
  // l'implémentation qu'elle prétend interdire : la suite tourne en `TZ=Europe/Paris`, à l'**est**
  // de Greenwich, où minuit UTC et le jour écrit tombent le même jour. L'écart n'apparaît qu'à
  // l'ouest, donc nulle part en CI. On n'éprouve donc plus la sortie mais le **moyen** : le
  // constructeur `Date` est neutralisé le temps de l'appel, et une implémentation qui en construit
  // un lève. C'est indépendant du fuseau du processus, ce que le nom du test promettait.
  it('ne construit aucun `Date` pour lire une date nue', () => {
    const vrai = globalThis.Date;
    const interdit = function () {
      throw new Error('une date nue ne se lit pas avec `Date`');
    } as unknown as DateConstructor;
    globalThis.Date = Object.assign(interdit, vrai);
    try {
      expect(finDePeriodeEnMots('2026-12-01')).toBe('jusqu’au 1er décembre');
      expect(finDePeriodeEnMots('2026-11-30')).toBe('jusqu’au 30 novembre');
    } finally {
      globalThis.Date = vrai;
    }
  });

  it('rend null sur ce qui n’est pas une date', () => {
    expect(finDePeriodeEnMots('')).toBeNull();
    expect(finDePeriodeEnMots('pas-une-date')).toBeNull();
    expect(finDePeriodeEnMots('2026-13-01')).toBeNull();
  });
});

describe('progressionDeLaPeriode', () => {
  const automne = ['2026-09-01', '2026-11-30'] as const;

  // **Le trait n'est pas plein le dernier jour, et c'est le rôle du « + 1 » de la durée.**
  // Du 1er septembre au 30 novembre inclus, la saison dure 91 jours : au matin du dernier, 90
  // sont derrière et il en reste un. Sans ce « + 1 », le dénominateur vaudrait 90 et le trait
  // afficherait « plein » alors que la journée n'a pas commencé. Il n'atteint 1 qu'une fois la
  // période révolue — c'est-à-dire quand le bandeau de bascule prend le relais.
  it('part de 0 le premier jour, et n’est plein qu’une fois la période révolue', () => {
    expect(progressionDeLaPeriode(...automne, jour(2026, 9, 1))).toBe(0);
    expect(progressionDeLaPeriode(...automne, jour(2026, 11, 30))).toBeCloseTo(90 / 91, 9);
    expect(progressionDeLaPeriode(...automne, jour(2026, 12, 1))).toBe(1);
  });

  it('vaut la moitié au milieu de la saison', () => {
    // 91 jours du 1er septembre au 30 novembre inclus : le 46e jour est le milieu.
    expect(progressionDeLaPeriode(...automne, jour(2026, 10, 16))).toBeCloseTo(45 / 91, 6);
  });

  it('se borne à [0, 1] hors de la période', () => {
    expect(progressionDeLaPeriode(...automne, jour(2026, 8, 20))).toBe(0);
    expect(progressionDeLaPeriode(...automne, jour(2027, 3, 4))).toBe(1);
  });

  // Le calcul passe par `Date.UTC` sur des composantes déjà séparées : la différence est un
  // nombre de jours exact, y compris à travers un changement d'heure — que la soustraction de
  // deux horodatages locaux divisée par 86 400 000 ferait dériver d'une heure.
  it('traverse un changement d’heure sans dériver', () => {
    // Le passage à l'heure d'hiver 2026 en France est le 25 octobre.
    const avant = progressionDeLaPeriode(...automne, jour(2026, 10, 24));
    const apres = progressionDeLaPeriode(...automne, jour(2026, 10, 26));
    expect((apres as number) - (avant as number)).toBeCloseTo(2 / 91, 9);
  });

  it('rend null sur des bornes inutilisables', () => {
    expect(progressionDeLaPeriode('', '2026-11-30')).toBeNull();
    // Fin avant le début : aucune durée à mesurer, donc pas de trait plutôt qu'un trait faux.
    expect(progressionDeLaPeriode('2026-11-30', '2026-09-01')).toBeNull();
  });
});

describe('estDansLouverture', () => {
  it('couvre les quatorze premiers jours, pas le quinzième', () => {
    expect(estDansLouverture('2026-09-01', jour(2026, 9, 1))).toBe(true);
    expect(estDansLouverture('2026-09-01', jour(2026, 9, 14))).toBe(true);
    expect(estDansLouverture('2026-09-01', jour(2026, 9, 15))).toBe(false);
    expect(JOURS_DOUVERTURE).toBe(14);
  });

  // Un cycle dont le début est dans le futur n'a pas commencé : rien à ouvrir.
  it('ne s’ouvre pas avant le premier jour', () => {
    expect(estDansLouverture('2026-09-01', jour(2026, 8, 31))).toBe(false);
  });

  // Un cycle révolu est loin de sa propre ouverture : la carte de bascule et la carte
  // d'ouverture ne peuvent donc pas se retrouver à l'écran ensemble.
  it('ne s’ouvre pas sur un cycle révolu', () => {
    expect(estDansLouverture('2026-06-01', jour(2026, 9, 3))).toBe(false);
  });
});

describe('ouvertureDeSaison', () => {
  const points = (...jours: string[]): PointDeSaison[] =>
    jours.map((periodStart) => ({ periodStart, status: 'answered', reponse: 'oui' as const }));

  const ete = { debut: '2026-06-01', fin: '2026-08-31', cadence: 'season' };

  it('nomme la saison qui commence et récapitule celle qui s’achève', () => {
    const r = ouvertureDeSaison({
      debutDuCycle: '2026-09-01',
      cadence: 'season',
      precedente: ete,
      points: points('2026-06-08', '2026-07-06', '2026-08-03'),
    });
    expect(r.etiquette).toBe('NOUVELLE SAISON');
    expect(r.titre).toBe('L’automne commence.');
    expect(r.corps).toBe('Cet été : 3 points répondus, 3 fois où tu as changé quelque chose.');
  });

  // Le printemps est la seule saison dont l'article ne s'élide pas, dans les deux registres.
  it('accorde l’article du printemps', () => {
    const r = ouvertureDeSaison({
      debutDuCycle: '2026-03-01',
      cadence: 'season',
      precedente: { debut: '2025-12-01', fin: '2026-02-28', cadence: 'season' },
      points: points('2026-01-05'),
    });
    expect(r.titre).toBe('Le printemps commence.');
    expect(r.corps).toBe('Cet hiver : 1 point répondu, 1 fois où tu as changé quelque chose.');
  });

  it('nomme l’hiver qui commence en décembre, jamais celui qui s’achève', () => {
    const r = ouvertureDeSaison({
      debutDuCycle: '2026-12-01',
      cadence: 'season',
      precedente: { debut: '2026-09-01', fin: '2026-11-30', cadence: 'season' },
      points: points('2026-10-05', '2026-11-02'),
    });
    expect(r.titre).toBe('L’hiver commence.');
    expect(r.corps).toBe('Cet automne : 2 points répondus, 2 fois où tu as changé quelque chose.');
  });

  // **Jamais les points manqués** : sans réponse sur la période écoulée, il n'y a pas de
  // récapitulatif du tout. « 0 point répondu » serait exactement la phrase qui les nomme, et
  // c'est ce que `/suivi` refuse de montrer.
  it('ne dit rien plutôt que de dire zéro point répondu', () => {
    const r = ouvertureDeSaison({
      debutDuCycle: '2026-09-01',
      cadence: 'season',
      precedente: ete,
      points: [
        { periodStart: '2026-06-08', status: 'expired', reponse: null },
        { periodStart: '2026-07-06', status: 'pending', reponse: null },
      ],
    });
    expect(r.titre).toBe('L’automne commence.');
    expect(r.corps).toBeNull();
  });

  // Aucun changement n'est pas un échec : la seconde moitié de la phrase tombe, le décompte des
  // réponses reste.
  it('laisse tomber la seconde moitié quand rien n’a changé', () => {
    const r = ouvertureDeSaison({
      debutDuCycle: '2026-09-01',
      cadence: 'season',
      precedente: ete,
      points: [
        { periodStart: '2026-06-08', status: 'answered', reponse: 'non' },
        { periodStart: '2026-07-06', status: 'answered', reponse: 'sans_objet' },
      ],
    });
    expect(r.corps).toBe('Cet été : 2 points répondus.');
  });

  // Première saison d'un compte : pas de cycle précédent, donc rien à récapituler. L'écran ne
  // montre pas la carte dans ce cas (« On repart » ne vaut que si l'on a déjà roulé), mais la
  // dérivation reste totale.
  it('ne récapitule rien sans période précédente', () => {
    const r = ouvertureDeSaison({
      debutDuCycle: '2026-09-01',
      cadence: 'season',
      precedente: null,
      points: points('2026-06-08'),
    });
    expect(r.corps).toBeNull();
  });

  // **La cadence de repli ne nomme aucune saison** : `rolling_quarter` produit des trimestres
  // glissants, et un trimestre qui commence un 1er décembre n'est pas l'hiver. Le mécanisme est
  // dormant (aucun écran ne l'écrit) mais la chaîne serveur existe et est testée.
  it('se passe du nom de saison en cadence de repli', () => {
    const r = ouvertureDeSaison({
      debutDuCycle: '2026-12-01',
      cadence: 'rolling_quarter',
      precedente: { debut: '2026-09-01', fin: '2026-11-30', cadence: 'rolling_quarter' },
      points: points('2026-10-05'),
    });
    expect(r.etiquette).toBe('NOUVELLE PÉRIODE');
    expect(r.titre).toBe('Une nouvelle période commence.');
    expect(r.corps).toBe(
      'Ces trois mois : 1 point répondu, 1 fois où tu as changé quelque chose.'
    );
  });

  // Le sujet du récapitulatif vient de la cadence **du cycle précédent** : c'est cette
  // période-là qu'on récapitule, et rien n'interdit que la cadence ait changé entre les deux.
  it('lit la cadence de la période récapitulée, pas celle qui commence', () => {
    const r = ouvertureDeSaison({
      debutDuCycle: '2026-09-01',
      cadence: 'season',
      precedente: { debut: '2026-06-01', fin: '2026-08-31', cadence: 'rolling_quarter' },
      points: points('2026-07-06'),
    });
    expect(r.titre).toBe('L’automne commence.');
    expect(r.corps).toBe(
      'Ces trois mois : 1 point répondu, 1 fois où tu as changé quelque chose.'
    );
  });

  // Les bornes viennent du cycle précédent, jamais d'un calcul : un point hors de ces bornes
  // n'entre pas dans le récapitulatif, même s'il est dans la fenêtre lue par l'écran.
  it('ne compte que les points de la période récapitulée', () => {
    const r = ouvertureDeSaison({
      debutDuCycle: '2026-09-01',
      cadence: 'season',
      precedente: ete,
      points: points('2026-05-25', '2026-07-06', '2026-09-07'),
    });
    expect(r.corps).toBe('Cet été : 1 point répondu, 1 fois où tu as changé quelque chose.');
  });
});

describe('recapDeLaPeriode', () => {
  // Les bornes arrivent telles que `plan_cycles` les porte — des dates nues — mais un
  // horodatage complet ne doit pas décaler la comparaison.
  it('accepte des bornes horodatées et n’en lit que le jour', () => {
    const r = recapDeLaPeriode(
      [{ periodStart: '2026-06-01', status: 'answered', reponse: 'oui' }],
      '2026-06-01T00:00:00.000Z',
      '2026-08-31T00:00:00.000Z'
    );
    expect(r).toEqual({ repondus: 1, changements: 1 });
  });
});

describe('sortiesDeLouverture', () => {
  // Le cas du canvas : une action engagée, reconduite par C2.2, et d'autres au plan.
  it('propose de reprendre ou de choisir autrement quand une action est engagée', () => {
    expect(sortiesDeLouverture({ actionEngagee: true, nombreDActions: 2 })).toEqual([
      { cle: 'reprendre', label: 'Reprendre la même action', forme: 'primaire' },
      { cle: 'choisir_une_autre', label: 'Choisir une autre', forme: 'secondaire' },
    ]);
  });

  // Une seule action au plan : « Choisir une autre » ne mènerait nulle part.
  it('n’offre pas de choisir une autre action quand il n’y en a qu’une', () => {
    expect(sortiesDeLouverture({ actionEngagee: true, nombreDActions: 1 })).toEqual([
      { cle: 'reprendre', label: 'Reprendre la même action', forme: 'primaire' },
    ]);
  });

  // Rien d'engagé — personne ne s'était engagé la saison passée, ou la reconduction n'a pas
  // trouvé son gabarit dans le nouveau plan : « Reprendre la même action » ne nomme rien.
  it('invite à choisir quand rien n’est engagé', () => {
    expect(sortiesDeLouverture({ actionEngagee: false, nombreDActions: 2 })).toEqual([
      { cle: 'choisir', label: 'Choisir une action', forme: 'primaire' },
    ]);
  });

  // **Un plan à zéro action, c'est tout cycliste et tout profil sédentaire depuis C2.5** :
  // proposer d'en choisir une serait promettre une liste vide. Il reste de quoi refermer la
  // carte, sans quoi elle tiendrait deux semaines sans sortie.
  it('ne promet aucune action quand le plan n’en porte pas', () => {
    expect(sortiesDeLouverture({ actionEngagee: false, nombreDActions: 0 })).toEqual([
      { cle: 'compris', label: 'Compris', forme: 'lien' },
    ]);
  });
});

describe('basculeDeSaison', () => {
  // La saison nommée est celle **du jour**, pas celle du cycle suivant : celui-ci peut ne pas
  // exister encore (le cron nocturne ne passe qu'une fois par nuit), alors que le calendrier a
  // bien tourné.
  it('nomme la saison du jour', () => {
    expect(basculeDeSaison('season', jour(2026, 12, 1))).toBe(
      'L’hiver a commencé pendant que tu étais là.'
    );
    expect(basculeDeSaison('season', jour(2026, 3, 1))).toBe(
      'Le printemps a commencé pendant que tu étais là.'
    );
  });

  it('se passe du nom de saison en cadence de repli', () => {
    expect(basculeDeSaison('rolling_quarter', jour(2026, 12, 1))).toBe(
      'Une nouvelle période a commencé pendant que tu étais là.'
    );
  });
});

/**
 * **Mutations éprouvées le 17/09/2026** — cinq, et chacune fait tomber ce qu'elle devait faire
 * tomber, sans rien emporter d'autre :
 *
 * | Ce qu'on casse | Ce qui tombe |
 * |---|---|
 * | la condition d'archive retirée | « une ligne dans l'archive » **et** « s'est engagé puis a repris » |
 * | la condition d'engagement retirée | « une action engagée » **et** la redondance du trait |
 * | la condition de cycle précédent retirée | « un cycle précédent » |
 * | la majuscule gardée sous la préposition | les quatre saisons |
 * | la cadence ignorée | « se passe du nom de saison en cadence de repli » |
 */
describe('estPremierPlan', () => {
  const neuf = { aUnCyclePrecedent: false, aUnEngagement: false, aDejaEngage: false };

  it('reconnaît un plan neuf', () => {
    expect(estPremierPlan(neuf)).toBe(true);
  });

  // Les trois conditions comptent : le test vaut par ce qu'il **casse**, une par une.
  it.each([
    ['un cycle précédent', { ...neuf, aUnCyclePrecedent: true }],
    ['une action engagée', { ...neuf, aUnEngagement: true }],
    ['une ligne dans l’archive', { ...neuf, aDejaEngage: true }],
  ])('%s suffit à dire que ce n’est plus le premier plan', (_cas, params) => {
    expect(estPremierPlan(params)).toBe(false);
  });

  // **La condition qu'on oublie**, et c'est le scénario en entier : quelqu'un qui s'est engagé,
  // puis a repris son engagement (« Changer d'avis », ou un re-bilan dans la même période). Il n'a
  // toujours qu'un cycle et plus aucun `committed_at` — seule l'archive le distingue d'un
  // arrivant, et sans elle la carte lui réexpliquerait la règle du jeu.
  it('n’est plus le premier plan pour quelqu’un qui s’est engagé puis a repris', () => {
    expect(
      estPremierPlan({ aUnCyclePrecedent: false, aUnEngagement: false, aDejaEngage: true })
    ).toBe(false);
  });

  // Le canvas écrit le trait `progression !== null && (engagement || !premierPlan)`. La moitié
  // `engagement ||` n'est exerçable par aucun cas : un engagement rend déjà le signal faux. Le
  // jour où cette assertion tombe, c'est que la deuxième condition a quitté le signal — et que la
  // forme courte du trait est redevenue fausse.
  it('exclut toujours un engagement, ce qui rend « engagement ou pas premier plan » redondant', () => {
    for (const aUnCyclePrecedent of [false, true]) {
      for (const aDejaEngage of [false, true]) {
        expect(estPremierPlan({ aUnCyclePrecedent, aUnEngagement: true, aDejaEngage })).toBe(false);
      }
    }
  });
});

describe('ouvertureDuPremierPlan', () => {
  // L'article suit une préposition, donc il perd sa majuscule — et l'élision reste juste, parce
  // qu'elle vient de la même table que « L'hiver commence. ».
  it.each([
    ['2026-12-01', 'Une action pour l’hiver.'],
    ['2026-03-01', 'Une action pour le printemps.'],
    ['2026-06-15', 'Une action pour l’été.'],
    ['2026-09-01', 'Une action pour l’automne.'],
  ])('nomme la saison du cycle (%s)', (debutDuCycle, titre) => {
    expect(ouvertureDuPremierPlan({ debutDuCycle, cadence: 'season' }).titre).toBe(titre);
  });

  // `rolling_quarter` est dormant mais sa chaîne serveur existe : un trimestre glissant n'a pas de
  // saison, et l'appeler « automne » serait la seule fausseté que cette carte pourrait dire.
  it('se passe du nom de saison en cadence de repli', () => {
    expect(ouvertureDuPremierPlan({ debutDuCycle: '2026-09-01', cadence: 'rolling_quarter' })).toEqual(
      {
        etiquette: 'TON PREMIER PLAN',
        titre: 'Une action pour cette période.',
        corps:
          'Choisis-en une, et dis quand. Ensuite, un point régulier te demandera si tu l’as faite — rien d’autre à suivre.',
      }
    );
  });

  // La carte explique la règle du jeu ; elle ne commente pas ce plan-ci. Un chiffre ou un poste
  // dedans en ferait une seconde description des cartes posées dessous — le défaut exact que C5.3
  // vient de retirer de l'intro.
  it('ne chiffre rien et ne nomme aucun poste', () => {
    const carte = ouvertureDuPremierPlan({ debutDuCycle: '2026-09-01', cadence: 'season' });
    const texte = [carte.etiquette, carte.titre, carte.corps].join(' ');
    expect(texte).not.toMatch(/\d/);
    expect(texte).not.toMatch(/trajet|voyage|sortie|loisir|domicile/i);
  });
});

describe('SORTIE_DU_PREMIER_PLAN', () => {
  // Un lien « Compris », et rien d'autre : il n'y a rien à reconduire au premier plan, donc pas
  // les libellés de `sortiesDeLouverture`.
  it('est un seul lien', () => {
    expect(SORTIE_DU_PREMIER_PLAN).toEqual([{ cle: 'compris', label: 'Compris', forme: 'lien' }]);
  });
});
