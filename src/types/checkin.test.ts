import { RAMILLE } from '@/constants/mascotte';
import {
  COMPLEMENT_DE_MAINTIEN,
  JOURS_FRANCAIS,
  MOIS_FRANCAIS,
  complementDeMaintien,
  composerQuestionDuPoint,
  debutDePeriodeInterrogee,
  estDeLaPeriodeCourante,
  estDeuxiemeFoisDeSuite,
  genreDeReponse,
  joursDeLaQuestion,
  libelleSansObjet,
  moisFrancais,
  periodePrecedente,
  phraseDeSecondRenforcement,
  piedDuPointRepondu,
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
  question_kind: 'generique',
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

describe('joursDeLaQuestion', () => {
  it('porte les sept jours, dans l’ordre ISO de la contrainte SQL', () => {
    expect(JOURS_FRANCAIS).toHaveLength(7);
    expect(JOURS_FRANCAIS[0]).toBe('lundi');
    expect(JOURS_FRANCAIS[6]).toBe('dimanche');
  });

  // **« ou » et non « et »**, et une seule majuscule : la jumelle SQL rend la même chaîne, et les
  // deux sont comparées caractère par caractère par la paire de tests.
  it('joint par « ou » et ne capitalise que le premier mot', () => {
    expect(joursDeLaQuestion([2, 4])).toBe('Mardi ou jeudi');
    expect(joursDeLaQuestion([1])).toBe('Lundi');
    expect(joursDeLaQuestion([1, 3, 5])).toBe('Lundi ou mercredi ou vendredi');
  });

  it('trie, dédoublonne et ignore ce qui sort de la semaine', () => {
    expect(joursDeLaQuestion([4, 2, 2])).toBe('Mardi ou jeudi');
    expect(joursDeLaQuestion([0, 2, 9])).toBe('Mardi');
  });

  // Énumérer sept jours tiendrait sur trois lignes dans une notification.
  it('sept jours se disent « Tous les jours »', () => {
    expect(joursDeLaQuestion([1, 2, 3, 4, 5, 6, 7])).toBe('Tous les jours');
  });

  it('rend null plutôt qu’une chaîne vide quand il n’y a rien à nommer', () => {
    expect(joursDeLaQuestion(null)).toBeNull();
    expect(joursDeLaQuestion([])).toBeNull();
    expect(joursDeLaQuestion([0, 8])).toBeNull();
  });
});

describe('composerQuestionDuPoint — les quatre genres', () => {
  it('engagement : le gabarit, avec les jours nommés', () => {
    expect(
      composerQuestionDuPoint(
        point({
          question_kind: 'engagement',
          question_template: '{jours}, as-tu fait ce trajet à vélo ?',
          committed_intention_days: [2, 4],
        })
      )
    ).toBe('Mardi ou jeudi, as-tu fait ce trajet à vélo ?');
  });

  it('occasion : le gabarit, avec le mois écoulé', () => {
    expect(
      composerQuestionDuPoint(
        point({
          loop_type: 'extras',
          poste: 'travel',
          question_kind: 'occasion',
          period_start: '2026-09-01',
          // L'apostrophe est **droite**, comme dans la base : les gabarits sont lus de
          // `action_templates` par les deux côtés de la paire, donc aucune divergence n'est
          // possible là — contrairement à la phrase de maintien, écrite en dur des deux côtés, qui
          // a dû être alignée. Le référentiel entier porte l'apostrophe droite (`action_text`
          // comprise) ; l'uniformiser appartient à C3.8, qui possède ces libellés.
          question_template:
            "En {mois}, as-tu eu un déplacement où tu as choisi autre chose que l'avion ?",
        })
      )
    ).toBe("En septembre, as-tu eu un déplacement où tu as choisi autre chose que l'avion ?");
  });

  // **Le maintien gagne**, et ce n'est pas l'ordre du `if` par hasard : demander à quelqu'un qui va
  // déjà au travail à vélo s'il a tenu son engagement de faire un trajet à vélo poserait deux fois
  // la même question. Le générateur applique la même priorité, et un contrôle SQL l'épingle.
  it('maintien gagne sur engagement, gabarit présent ou non', () => {
    expect(
      composerQuestionDuPoint(
        point({
          question_kind: 'maintien',
          mode: 'velo',
          question_template: '{jours}, as-tu fait ce trajet à vélo ?',
          committed_intention_days: [2, 4],
        })
      )
    ).toBe('La semaine dernière, ton trajet s’est-il fait à vélo ?');
  });

  // Un `{jours}` affiché tel quel serait pire que vague : on retombe sur le générique.
  it('un genre d’engagement sans gabarit retombe sur le générique', () => {
    expect(composerQuestionDuPoint(point({ question_kind: 'engagement' }))).toBe(
      'La semaine dernière, as-tu changé de mode de transport pour ton trajet domicile-travail ?'
    );
  });

  it('un gabarit sans jours figés ne laisse pas la marque à l’écran', () => {
    expect(
      composerQuestionDuPoint(
        point({
          question_kind: 'engagement',
          question_template: '{jours}, as-tu fait ce trajet à vélo ?',
        })
      )
    ).toBe('Cette semaine, as-tu fait ce trajet à vélo ?');
  });
});

describe('questionDuPoint — la question figée gagne', () => {
  // C'est tout l'intérêt de figer : la carte dit mot pour mot ce que la notification a dit, même si
  // la composition a changé de version entre les deux.
  it('affiche la question figée plutôt que de la recomposer', () => {
    expect(
      questionDuPoint(
        point({
          question_kind: 'engagement',
          committed_question: 'Mardi ou jeudi, as-tu fait ce trajet à vélo ?',
          question_template: '{jours}, as-tu travaillé depuis chez toi ?',
          committed_intention_days: [1],
        })
      )
    ).toBe('Mardi ou jeudi, as-tu fait ce trajet à vélo ?');
  });

  it('recompose sur un point d’avant C2.1, qui n’en porte pas', () => {
    expect(questionDuPoint(point({ committed_question: null }))).toBe(
      'La semaine dernière, as-tu changé de mode de transport pour ton trajet domicile-travail ?'
    );
  });

  // Une chaîne vide en base doit se comporter comme une absence, pas s'afficher à la place.
  it('une question figée vide ne remplace pas la vraie', () => {
    expect(questionDuPoint(point({ committed_question: '   ' }))).toContain('as-tu changé de mode');
  });
});

describe('repliqueDuPoint', () => {
  it('le « Oui » est le même des deux côtés', () => {
    expect(repliqueDuPoint(point(), 'oui')).toEqual({
      ligne: RAMILLE.checkinOui,
      mood: 'happy',
    });
    expect(repliqueDuPoint(point({ question_kind: 'maintien', mode: 'velo' }), 'oui')).toEqual({
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
      const { ligne, mood } = repliqueDuPoint(point({ question_kind: 'maintien', mode }), 'non');
      expect(ligne).not.toBe(RAMILLE.checkinNon);
      expect(mood).toBe('calm');
      expect(ligne.length).toBeGreaterThan(0);
    }
  });

  it('le « Non » de maintien nomme le mode, et retombe sur une phrase neutre sinon', () => {
    const maintien = (mode: string) => point({ question_kind: 'maintien', mode });
    expect(repliqueDuPoint(maintien('velo'), 'non').ligne).toBe(RAMILLE.maintienNon.velo);
    expect(repliqueDuPoint(maintien('marche'), 'non').ligne).toBe(RAMILLE.maintienNon.marche);
    expect(repliqueDuPoint(maintien('trottinette'), 'non').ligne).toBe(
      RAMILLE.maintienNon.trottinette
    );
    expect(repliqueDuPoint(maintien('voiture'), 'non').ligne).toBe(RAMILLE.maintienNon.autre);
  });

  it('une question générique garde checkinNon', () => {
    expect(repliqueDuPoint(point(), 'non')).toEqual({
      ligne: RAMILLE.checkinNon,
      mood: 'encouraging',
    });
    expect(repliqueDuPoint(point({ question_kind: null }), 'non').ligne).toBe(RAMILLE.checkinNon);
  });

  /**
   * **La seconde assertion de jugement de cette fonction** (C2.4), jumelle de la précédente.
   *
   * « Pas de trajet cette semaine » n'est ni un échec ni un manquement à une habitude : c'est
   * l'absence de l'occasion. Ni `checkinNon` (qui console) ni `maintienNon` (qui renforce une
   * habitude dont la personne vient de dire qu'elle n'a pas eu lieu) ne conviennent — d'où l'ordre
   * des branches, que cette assertion tient.
   */
  it('« sans objet » ne reçoit ni checkinNon ni maintienNon, même sur un point de maintien', () => {
    const sur = (p: Partial<PointInterrogeable>) => repliqueDuPoint(point(p), 'sans_objet');
    for (const p of [{}, { question_kind: 'maintien', mode: 'velo' }, { question_kind: null }]) {
      const { ligne, mood } = sur(p);
      expect(ligne).not.toBe(RAMILLE.checkinNon);
      expect(Object.values(RAMILLE.maintienNon)).not.toContain(ligne);
      expect(Object.values(RAMILLE.checkinSansObjet)).toContain(ligne);
      expect(mood).toBe('calm');
    }
  });

  // La boucle mensuelle couvre deux postes depuis C2.6 : la réplique suit le poste, pas la boucle,
  // sinon elle dit « Pas de voyage » à qui vient d'appuyer sur « Pas de sortie en septembre ».
  it('« sans objet » suit le poste, et la boucle hebdomadaire gagne sur lui', () => {
    const sansObjet = (p: Partial<PointInterrogeable>) =>
      repliqueDuPoint(point(p), 'sans_objet').ligne;
    expect(sansObjet({ loop_type: 'commute', poste: 'commute' })).toBe(
      RAMILLE.checkinSansObjet.commute
    );
    expect(sansObjet({ loop_type: 'extras', poste: 'leisure' })).toBe(
      RAMILLE.checkinSansObjet.leisure
    );
    expect(sansObjet({ loop_type: 'extras', poste: 'travel' })).toBe(
      RAMILLE.checkinSansObjet.travel
    );
    // Un point d'avant C2.6 ne porte pas de poste : la liste se ferme, elle ne devine pas.
    expect(sansObjet({ loop_type: 'extras', poste: null })).toBe(RAMILLE.checkinSansObjet.autre);
    // Et un point hebdomadaire sans poste reste hebdomadaire.
    expect(sansObjet({ loop_type: 'commute', poste: null })).toBe(
      RAMILLE.checkinSansObjet.commute
    );
  });
});

describe('genreDeReponse', () => {
  it.each([
    ['oui', 'oui'],
    ['non', 'non'],
    ['sans_objet', 'sans_objet'],
  ])('%s traverse', (valeur, attendu) => {
    expect(genreDeReponse(valeur)).toBe(attendu);
  });

  // Une valeur inattendue rend `null`, donc la carte affiche la question : le comportement d'un
  // point non répondu, jamais une réponse inventée.
  it.each([null, undefined, '', 'true', 'peut-être'])('%s ne traverse pas', (valeur) => {
    expect(genreDeReponse(valeur)).toBeNull();
  });
});

describe('libelleSansObjet', () => {
  it('la boucle hebdomadaire ne nomme pas de mois', () => {
    expect(libelleSansObjet(point())).toBe('Pas de trajet cette semaine');
  });

  // Le mois vient de `period_start`, comme la question juste au-dessus : lu sur l'horloge, il
  // pourrait nommer un autre mois que celui de la question.
  it('la boucle mensuelle nomme le mois interrogé, et le poste décide du mot', () => {
    expect(libelleSansObjet(point({ loop_type: 'extras', poste: 'travel', period_start: '2026-09-01' }))).toBe(
      'Pas de voyage en septembre'
    );
    expect(libelleSansObjet(point({ loop_type: 'extras', poste: 'leisure', period_start: '2026-08-01' }))).toBe(
      'Pas de sortie en août'
    );
    expect(libelleSansObjet(point({ loop_type: 'extras', poste: null, period_start: '2026-12-01' }))).toBe(
      'Pas de déplacement en décembre'
    );
  });

  it('un period_start illisible ne laisse pas un trou dans la phrase', () => {
    expect(libelleSansObjet(point({ loop_type: 'extras', poste: 'travel', period_start: 'x' }))).toBe(
      'Pas de voyage ce mois-ci'
    );
  });
});

/**
 * **La borne se calcule en UTC, et c'est le sujet du test.**
 *
 * Les deux générateurs posent `period_start` depuis `now()` dans le fuseau du serveur, qui est UTC.
 * Une borne locale divergerait d'une période entre minuit et 6 h UTC le lundi — la carte d'un point
 * courant disparaîtrait juste avant que le cron ne produise la suivante. Les dates sont donc
 * construites en UTC ici aussi, sinon le test passerait en CI (UTC) et raterait le défaut.
 */
describe('debutDePeriodeInterrogee', () => {
  it.each([
    // 2026-09-14 est un lundi : la semaine interrogée est celle du 7.
    ['2026-09-14T06:00:00Z', '2026-09-07'],
    ['2026-09-14T00:00:00Z', '2026-09-07'],
    // Dimanche 20 : toujours la semaine du 7, le cron n'est pas repassé.
    ['2026-09-20T23:59:00Z', '2026-09-07'],
    // Lundi 21 : la semaine du 14.
    ['2026-09-21T06:00:00Z', '2026-09-14'],
  ])('hebdomadaire, %s → %s', (instant, attendu) => {
    expect(debutDePeriodeInterrogee('commute', new Date(instant))).toBe(attendu);
  });

  it.each([
    ['2026-09-01T06:00:00Z', '2026-08-01'],
    ['2026-09-30T23:00:00Z', '2026-08-01'],
    ['2026-10-01T06:00:00Z', '2026-09-01'],
    // Le passage d'année se fait par le constructeur UTC, pas par une soustraction de mois.
    ['2026-01-05T06:00:00Z', '2025-12-01'],
  ])('mensuelle, %s → %s', (instant, attendu) => {
    expect(debutDePeriodeInterrogee('extras', new Date(instant))).toBe(attendu);
  });
});

describe('estDeLaPeriodeCourante', () => {
  const lundi21 = new Date('2026-09-21T08:00:00Z');

  it('le point de la période courante est gardé', () => {
    expect(estDeLaPeriodeCourante(point({ period_start: '2026-09-14' }), lundi21)).toBe(true);
  });

  // C'est la raison d'être de la borne : un compte dont la boucle a cessé d'être générée garderait
  // sinon un « Répondu lundi » et la promesse d'un point qui ne viendra jamais.
  it('un point répondu d’une période révolue ne l’est pas', () => {
    expect(estDeLaPeriodeCourante(point({ period_start: '2026-09-07' }), lundi21)).toBe(false);
  });

  it('un point en avance reste affiché plutôt que de disparaître sans raison', () => {
    expect(estDeLaPeriodeCourante(point({ period_start: '2026-09-28' }), lundi21)).toBe(true);
  });
});

describe('piedDuPointRepondu', () => {
  // Dates **locales** ici, à la différence de la borne : ce pied est lu par une personne dans son
  // fuseau, pas comparé à un calcul serveur.
  it('la boucle hebdomadaire nomme le jour de la réponse et le lundi suivant', () => {
    expect(
      piedDuPointRepondu(
        { loop_type: 'commute', responded_at: new Date(2026, 8, 14, 9, 0).toISOString() },
        new Date(2026, 8, 14, 9, 30)
      )
    ).toBe('Répondu lundi. Prochain point : lundi 21 septembre.');
  });

  // Répondre un lundi ne renvoie pas au lundi du jour : le point suivant est dans sept jours.
  it('un lundi, le prochain point est le lundi d’après et jamais aujourd’hui', () => {
    const pied = piedDuPointRepondu(
      { loop_type: 'commute', responded_at: new Date(2026, 8, 16, 9, 0).toISOString() },
      new Date(2026, 8, 16, 9, 30)
    );
    expect(pied).toBe('Répondu mercredi. Prochain point : lundi 21 septembre.');
  });

  it('la boucle mensuelle dit le jour du mois, avec « 1er » pour le premier', () => {
    expect(
      piedDuPointRepondu(
        { loop_type: 'extras', responded_at: new Date(2026, 9, 1, 9, 0).toISOString() },
        new Date(2026, 9, 1, 9, 30)
      )
    ).toBe('Répondu le 1er. Prochain point : 1er novembre.');
    expect(
      piedDuPointRepondu(
        { loop_type: 'extras', responded_at: new Date(2026, 9, 3, 9, 0).toISOString() },
        new Date(2026, 9, 3, 9, 30)
      )
    ).toBe('Répondu le 3. Prochain point : 1er novembre.');
  });

  it('le passage d’année ne se fait pas par une addition de mois', () => {
    expect(
      piedDuPointRepondu(
        { loop_type: 'extras', responded_at: new Date(2026, 11, 2, 9, 0).toISOString() },
        new Date(2026, 11, 2, 9, 30)
      )
    ).toBe('Répondu le 2. Prochain point : 1er janvier.');
  });

  // Une carte répondue sans date vaut mieux qu'une date inventée.
  it.each([null, undefined, 'pas-une-date'])('%s ne produit pas de pied', (valeur) => {
    expect(piedDuPointRepondu({ loop_type: 'commute', responded_at: valeur })).toBeNull();
  });
});

/**
 * **La moitié client de `public.periode_precedente(text, date)`**, et la paire compte autant que les
 * deux autres de ce fichier : la vue d'analyse compte côté serveur, la carte affiche côté client, et
 * les deux doivent désigner la même période.
 */
describe('periodePrecedente', () => {
  it.each([
    ['2026-09-14', '2026-09-07'],
    ['2026-09-07', '2026-08-31'],
    // Le passage de mois et d'année se fait par le constructeur UTC, pas par une soustraction de
    // numéro de jour.
    ['2026-01-05', '2025-12-29'],
    ['2026-03-02', '2026-02-23'],
  ])('hebdomadaire, %s → %s', (courante, attendue) => {
    expect(periodePrecedente('commute', courante)).toBe(attendue);
  });

  it.each([
    ['2026-09-01', '2026-08-01'],
    ['2026-01-01', '2025-12-01'],
    ['2026-03-01', '2026-02-01'],
  ])('mensuelle, %s → %s', (courante, attendue) => {
    expect(periodePrecedente('extras', courante)).toBe(attendue);
  });

  // **Le mois est ramené au premier, pas décalé du même nombre de jours**, et c'est ce qui rend la
  // paire SQL/TypeScript identique par construction : PostgreSQL ramène le 31 mars au 28 février,
  // `Date.UTC` le pousserait au 3 mars. `period_start` vaut toujours le 1er en pratique.
  it('un period_start mensuel inhabituel retombe sur le premier du mois précédent', () => {
    expect(periodePrecedente('extras', '2026-03-31')).toBe('2026-02-01');
  });
});

describe('estDeuxiemeFoisDeSuite', () => {
  const courant = (reponse: 'oui' | 'non' | 'sans_objet', periodStart = '2026-09-14') => ({
    loop_type: 'commute' as const,
    period_start: periodStart,
    reponse,
  });

  it('deux « oui » sur deux périodes qui se suivent', () => {
    expect(
      estDeuxiemeFoisDeSuite(courant('oui'), [{ period_start: '2026-09-07', reponse: 'oui' }])
    ).toBe(true);
  });

  /**
   * **L'assertion pour laquelle la troisième condition existe.**
   *
   * La phrase dit « Deuxième semaine de suite » : à la cinquième elle serait fausse, et la recevoir
   * chaque semaine en ferait du papier peint. Le signal marque le passage d'un geste à une habitude,
   * puis se tait — c'est ce que « jamais au-delà de deux » veut dire.
   */
  it('une troisième fois de suite ne rallume pas le signal', () => {
    expect(
      estDeuxiemeFoisDeSuite(courant('oui'), [
        { period_start: '2026-09-07', reponse: 'oui' },
        { period_start: '2026-08-31', reponse: 'oui' },
      ])
    ).toBe(false);
  });

  /**
   * **Les périodes, jamais les dernières lignes répondues.** C'est le défaut de la requête de
   * `v1-02` §4, qui était juste avant que les périodes révolues ne soient closes en `expired` et
   * gardées en base : « les deux dernières lignes » peut recouvrir deux périodes séparées de trois
   * mois de silence.
   */
  it('deux « oui » séparés par un trou ne font pas une série', () => {
    expect(
      estDeuxiemeFoisDeSuite(courant('oui'), [{ period_start: '2026-08-17', reponse: 'oui' }])
    ).toBe(false);
  });

  it('un « non » ou un « sans objet » à la période précédente ne prolonge rien', () => {
    expect(
      estDeuxiemeFoisDeSuite(courant('oui'), [{ period_start: '2026-09-07', reponse: 'non' }])
    ).toBe(false);
    expect(
      estDeuxiemeFoisDeSuite(courant('oui'), [{ period_start: '2026-09-07', reponse: 'sans_objet' }])
    ).toBe(false);
  });

  it('la réponse courante doit être un « oui »', () => {
    for (const reponse of ['non', 'sans_objet'] as const) {
      expect(
        estDeuxiemeFoisDeSuite(courant(reponse), [{ period_start: '2026-09-07', reponse: 'oui' }])
      ).toBe(false);
    }
  });

  it('un historique vide ne déclenche rien, et ne lève pas', () => {
    expect(estDeuxiemeFoisDeSuite(courant('oui'), [])).toBe(false);
  });

  // Un « sans objet » ne prolonge pas la série ; il ne la casse pas non plus au sens où il n'y a
  // rien à reprocher — il n'est simplement pas un « oui ».
  it('la boucle mensuelle se compte en mois, pas en semaines', () => {
    const mensuel = (periodStart: string) => ({
      loop_type: 'extras' as const,
      period_start: periodStart,
      reponse: 'oui' as const,
    });
    expect(
      estDeuxiemeFoisDeSuite(mensuel('2026-09-01'), [{ period_start: '2026-08-01', reponse: 'oui' }])
    ).toBe(true);
    expect(
      estDeuxiemeFoisDeSuite(mensuel('2026-09-01'), [{ period_start: '2026-08-25', reponse: 'oui' }])
    ).toBe(false);
  });
});

describe('phraseDeSecondRenforcement', () => {
  it('quatre formes, une par poste — la boucle hebdomadaire gagne', () => {
    expect(phraseDeSecondRenforcement({ loop_type: 'commute', poste: 'commute' })).toBe(
      'Deuxième semaine de suite que tu fais ce trajet autrement.'
    );
    expect(phraseDeSecondRenforcement({ loop_type: 'extras', poste: 'travel' })).toBe(
      'Deuxième mois de suite que tu voyages autrement.'
    );
    expect(phraseDeSecondRenforcement({ loop_type: 'extras', poste: 'leisure' })).toBe(
      'Deuxième mois de suite que tu sors autrement.'
    );
    expect(phraseDeSecondRenforcement({ loop_type: 'extras', poste: null })).toBe(
      'Deuxième mois de suite que tu te déplaces autrement.'
    );
  });

  // **Jamais un compteur, jamais un nombre au-delà de « deuxième ».** La phrase est du produit et
  // non de Ramille, mais la règle qui la borne est la même : le produit ne tient pas de score.
  it('aucune forme ne nomme un chiffre ni ne promet une suite', () => {
    for (const poste of ['commute', 'leisure', 'travel', null]) {
      for (const loop of ['commute', 'extras'] as const) {
        const phrase = phraseDeSecondRenforcement({ loop_type: loop, poste });
        expect(phrase).not.toMatch(/[0-9]/);
        expect(phrase).toMatch(/^Deuxième /);
      }
    }
  });
});
