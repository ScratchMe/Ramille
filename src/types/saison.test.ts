import { recapDeSaison, saisonDe, type PointDeSaison } from '@/types/saison';

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

  const point = (periodStart: string, status: string, response: boolean | null): PointDeSaison => ({
    periodStart,
    status,
    response,
  });

  it('compte les répondus et les oui de la période', () => {
    const r = recapDeSaison(
      [
        point('2026-09-07', 'answered', true),
        point('2026-09-14', 'answered', false),
        point('2026-10-05', 'answered', true),
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
        point('2026-09-07', 'answered', true),
        point('2026-09-14', 'expired', null),
        point('2026-09-21', 'pending', null),
      ],
      automne
    );
    expect(r).toEqual({ repondus: 1, changements: 1 });
    expect(Object.keys(r)).toEqual(['repondus', 'changements']);
  });

  // Le filtre est `status = 'answered'`, **jamais** `response !== null` : c'est ce qui a rendu le
  // module compatible avec la troisième réponse livrée par C2.4 (« pas de trajet cette période »),
  // qui porte bien `response = null` — et `response_kind = 'sans_objet'` — sur un point répondu.
  it('compte un point répondu sans objet, sans le compter comme un changement', () => {
    const r = recapDeSaison([point('2026-10-12', 'answered', null)], automne);
    expect(r).toEqual({ repondus: 1, changements: 0 });
  });

  it('exclut ce qui tombe hors des bornes, veilles comprises', () => {
    const r = recapDeSaison(
      [
        point('2026-08-31', 'answered', true),
        point('2026-09-01', 'answered', true),
        point('2026-11-30', 'answered', true),
        point('2026-12-01', 'answered', true),
      ],
      automne
    );
    expect(r).toEqual({ repondus: 2, changements: 2 });
  });

  it('accepte un horodatage complet et n’en lit que le jour', () => {
    const r = recapDeSaison([point('2026-10-05T06:00:00.000Z', 'answered', true)], automne);
    expect(r.repondus).toBe(1);
  });

  it('rend zéro sur une saison vide', () => {
    expect(recapDeSaison([], automne)).toEqual({ repondus: 0, changements: 0 });
  });
});
