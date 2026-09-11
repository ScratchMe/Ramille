import { RAMILLE } from '@/constants/mascotte';
import {
  COMPLEMENT_DE_MAINTIEN,
  MOIS_FRANCAIS,
  complementDeMaintien,
  moisFrancais,
  questionDuPoint,
  repliqueDuPoint,
  type PointInterrogeable,
} from '@/types/checkin';

/**
 * **La moitié client d'une paire.** `20_qui_recoit_quelle_boucle.test.sql` épingle les mêmes
 * phrases côté serveur : `complement_de_maintien`, `mois_francais` et la question composée par
 * `enqueue_checkin_reminders`. Ce n'est pas l'un des deux fichiers qui protège quoi que ce soit,
 * c'est la paire — un rappel part sans le client, la carte repose la question avec lui, et c'est
 * la même question. Même motif que `rappels.test.ts` / `17_rappels_canal.test.sql`.
 */

const point = (p: Partial<PointInterrogeable> = {}): PointInterrogeable => ({
  loop_type: 'commute',
  poste: 'commute',
  question_kind: 'changement',
  mode: null,
  period_start: '2026-09-07',
  ...p,
});

describe('moisFrancais', () => {
  it.each([
    ['2026-01-15', 'janvier'],
    ['2026-02-01', 'février'],
    ['2026-08-01', 'août'],
    ['2026-09-01', 'septembre'],
    ['2026-12-31', 'décembre'],
  ])('%s → %s', (iso, mois) => {
    expect(moisFrancais(iso)).toBe(mois);
  });

  // Les douze chaînes, écrites ici une fois de plus que dans le module : c'est l'assertion qui
  // tient la jumelle de `public.mois_francais(date)`. Une faute de frappe dans le module tombe
  // ici, pas trois semaines plus tard dans un email.
  it('porte exactement les douze mois de mois_francais', () => {
    expect([...MOIS_FRANCAIS]).toEqual([
      'janvier',
      'février',
      'mars',
      'avril',
      'mai',
      'juin',
      'juillet',
      'août',
      'septembre',
      'octobre',
      'novembre',
      'décembre',
    ]);
  });

  /**
   * **Le piège du fuseau, et pourquoi ce test prend ce détour.**
   *
   * `new Date('2026-09-01')` est minuit **UTC** : son mois local est août partout à l'ouest de
   * Greenwich. Une implémentation passant par `Date` aurait donc fait parler le point du
   * 1er septembre d'août à une partie des lecteurs — et **aucune suite tournant en UTC ne
   * l'aurait vu**, ce qui est précisément la famille de défauts que ce dépôt se prend.
   *
   * La façon directe de l'éprouver — basculer `process.env.TZ` pendant le test — a été écrite
   * puis retirée : sous Jest, la réassignation ne mord pas sur `Date` (vérifié, le garde posé
   * pour s'en assurer est tombé). Un tel test serait passé sans rien éprouver, ce qui est pire
   * qu'un test absent.
   *
   * Ce qui se teste vraiment, et dans n'importe quel fuseau : **la fonction n'ouvre pas de `Date`
   * du tout.** Les deux entrées ci-dessous portent un mois parfaitement lisible et ne sont pas
   * des dates valides — `new Date` les rend toutes les deux `Invalid Date`, donc une
   * implémentation qui y passerait rendrait `null` ici.
   */
  it('lit les caractères du mois, jamais un Date — d’où l’indépendance au fuseau', () => {
    expect(new Date('0000-09-00').getTime()).toBeNaN();
    expect(moisFrancais('0000-09-00')).toBe('septembre');

    expect(new Date('XXXX-12-XX').getTime()).toBeNaN();
    expect(moisFrancais('XXXX-12-XX')).toBe('décembre');
  });

  it('rend null sur une date illisible plutôt qu’un mois faux', () => {
    expect(moisFrancais('')).toBeNull();
    expect(moisFrancais('2026-13-01')).toBeNull();
    expect(moisFrancais('pas-une-date')).toBeNull();
  });
});

describe('complementDeMaintien', () => {
  // La catégorie `velo_marche` compte **trois** modes en base, pas deux : un repli sur le vélo
  // demanderait « ton trajet s'est-il fait à vélo ? » à quelqu'un qui n'en a pas.
  it.each([
    ['velo', 'à vélo'],
    ['marche', 'à pied'],
    ['trottinette', 'en trottinette'],
  ])('%s → « %s »', (mode, complement) => {
    expect(complementDeMaintien(mode)).toBe(complement);
  });

  it('ferme la liste sur « autrement » plutôt que de laisser la phrase tronquée', () => {
    for (const valeur of [null, undefined, '', 'voiture_thermique']) {
      expect(complementDeMaintien(valeur)).toBe('autrement');
      expect(complementDeMaintien(valeur).length).toBeGreaterThan(0);
    }
  });

  it('ne couvre que la catégorie vélo/marche', () => {
    expect(Object.keys(COMPLEMENT_DE_MAINTIEN).sort()).toEqual(['marche', 'trottinette', 'velo']);
  });
});

describe('questionDuPoint', () => {
  // Les quatre phrases du canvas v1-14 §3.2, au mot près. Ce sont celles que la notification a
  // envoyées : elles ne peuvent pas différer d'une virgule.
  it('la boucle hebdo interroge la semaine écoulée', () => {
    expect(questionDuPoint(point())).toBe(
      'La semaine dernière, as-tu changé de mode de transport pour ton trajet domicile-travail ?'
    );
  });

  it('la boucle mensuelle nomme le mois écoulé', () => {
    expect(
      questionDuPoint(point({ loop_type: 'extras', poste: 'travel', period_start: '2026-09-01' }))
    ).toBe('En septembre, as-tu changé de mode de transport pour tes voyages ?');
    expect(
      questionDuPoint(point({ loop_type: 'extras', poste: 'leisure', period_start: '2026-08-01' }))
    ).toBe('En août, as-tu changé de mode de transport pour tes sorties du week-end ?');
  });

  it('la question de maintien est affirmative et nomme le mode', () => {
    expect(questionDuPoint(point({ question_kind: 'maintien', mode: 'velo' }))).toBe(
      'La semaine dernière, ton trajet s’est-il fait à vélo ?'
    );
    expect(questionDuPoint(point({ question_kind: 'maintien', mode: 'marche' }))).toBe(
      'La semaine dernière, ton trajet s’est-il fait à pied ?'
    );
  });

  /**
   * **Ce que la question ne dit jamais : le mode, hors maintien.** Avant C2.6 elle collait le
   * libellé snapshoté — « … pour Trajet domicile-travail (Voiture thermique) ? » — c'est-à-dire
   * une phrase que personne n'a écrite, avec une majuscule et une parenthèse au milieu.
   */
  it('ne colle jamais le libellé snapshoté après la préposition', () => {
    const phrase = questionDuPoint(point({ poste: 'commute' }));
    expect(phrase).not.toMatch(/\(/);
    expect(phrase).not.toMatch(/Trajet domicile-travail/);
  });

  // Le poste l'emporte sur la boucle, et une ligne générée avant C2.5 (sans `question_kind`)
  // garde la forme de changement plutôt que de tomber dans une branche vide.
  it('reste lisible sur une ligne générée avant ces colonnes', () => {
    expect(questionDuPoint(point({ question_kind: null, mode: null }))).toBe(
      'La semaine dernière, as-tu changé de mode de transport pour ton trajet domicile-travail ?'
    );
  });

  it('un period_start illisible perd la précision, jamais la phrase', () => {
    expect(questionDuPoint(point({ loop_type: 'extras', poste: 'leisure', period_start: '' }))).toBe(
      'Le mois dernier, as-tu changé de mode de transport pour tes sorties du week-end ?'
    );
  });
});

describe('repliqueDuPoint', () => {
  it('le « Oui » est le même des deux côtés', () => {
    expect(repliqueDuPoint({ question_kind: 'changement', mode: null }, true)).toEqual({
      ligne: RAMILLE.checkinOui,
      mood: 'happy',
    });
    expect(repliqueDuPoint({ question_kind: 'maintien', mode: 'velo' }, true)).toEqual({
      ligne: RAMILLE.checkinOui,
      mood: 'happy',
    });
  });

  /**
   * **L'assertion pour laquelle ce chantier existe.**
   *
   * `checkinNon` console d'un échec. Sur un trajet déjà fait à vélo il n'y a pas d'échec : la
   * recevoir cinquante-deux fois par an, juste sous un écran qui dit « Tu fais déjà l'essentiel »,
   * était le défaut A13-3. Si quelqu'un « simplifie » un jour `repliqueDuPoint` en retirant la
   * branche de maintien, c'est cette ligne qui doit tomber.
   */
  it('un point de maintien ne reçoit JAMAIS checkinNon', () => {
    for (const mode of ['velo', 'marche', 'trottinette', 'autre-mode', null]) {
      const { ligne, mood } = repliqueDuPoint({ question_kind: 'maintien', mode }, false);
      expect(ligne).not.toBe(RAMILLE.checkinNon);
      expect(mood).toBe('calm');
      expect(ligne.length).toBeGreaterThan(0);
    }
  });

  it('le « Non » de maintien nomme le mode, et retombe sur une phrase neutre sinon', () => {
    expect(repliqueDuPoint({ question_kind: 'maintien', mode: 'velo' }, false).ligne).toBe(
      RAMILLE.maintienNon.velo
    );
    expect(repliqueDuPoint({ question_kind: 'maintien', mode: 'marche' }, false).ligne).toBe(
      RAMILLE.maintienNon.marche
    );
    expect(repliqueDuPoint({ question_kind: 'maintien', mode: 'trottinette' }, false).ligne).toBe(
      RAMILLE.maintienNon.trottinette
    );
    expect(repliqueDuPoint({ question_kind: 'maintien', mode: 'voiture' }, false).ligne).toBe(
      RAMILLE.maintienNon.autre
    );
  });

  it('une question de changement garde checkinNon', () => {
    expect(repliqueDuPoint({ question_kind: 'changement', mode: null }, false)).toEqual({
      ligne: RAMILLE.checkinNon,
      mood: 'encouraging',
    });
    expect(repliqueDuPoint({ question_kind: null, mode: null }, false).ligne).toBe(
      RAMILLE.checkinNon
    );
  });
});
