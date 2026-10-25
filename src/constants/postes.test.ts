/**
 * Le vocabulaire des postes, et la lecture des libellés que le serveur fige.
 *
 * **Éprouvé en le cassant, le 22/10/2026** (`v1-35` étape 3 ; `TESTING.md` §1.1), le fichier remis en
 * place depuis le commit après chaque mutation, et le compte pris sur `src/constants`, `src/types`,
 * `src/tests` et `scripts/postes-partageables.test.ts` ensemble :
 *   - `FORME_INSERABLE.leisure` redevenue « tes loisirs » (les deux registres fusionnés) : 13 tests
 *     tombent, dont 6 ici (la table, le repli, la différence entre registres, le mot-clé, « pas de
 *     week-end », `nomDuPoste` inséré) ;
 *   - `POSTE_LABEL.leisure` redevenue « Loisirs du week-end » : 6 (4 ici, 2 de `resultat.test.ts`) ;
 *   - `POSTE_SUBJECT.leisure` redevenue « Tes loisirs du week-end » : 6 (3 ici, 3 de `resultat.test.ts`) ;
 *   - le marqueur lu en « Loisirs (occasionnels) » seul : 7 tests, tous ceux qui portent le libellé
 *     d'avant le 22/10/2026 ; lu en « Loisirs du week-end (occasionnels) » seul : 9, ceux qui portent le
 *     libellé d'aujourd'hui. Chaque libellé a ses cas, et le seul test qui les porte tous les deux
 *     (« retombe sur les libellés quand la fréquence n'a pas été lue ») tombe sur l'une et l'autre ;
 *   - `loisirsSontLeResiduel` qui prend « Presque tous les jours » pour le résiduel : 1, et lui seul.
 */
import {
  FORME_INSERABLE,
  POSTES,
  POSTE_EN_PHRASE,
  POSTE_LABEL,
  POSTE_SUBJECT,
  boucleLue,
  estLeResiduelDesSortiesRares,
  formeInserable,
  loisirsSontLeResiduel,
  nomDuPoste,
  posteDeLHistorique,
  posteLabel,
} from '@/constants/postes';
import { REPONSES_FREQUENCE_DES_LOISIRS } from '@/types/bilan';

describe('formeInserable', () => {
  // La table du canvas v1-14 §3.2 et du brief. C'est elle qui décide de la question du point,
  // de l'email, du push, du sous-titre du plan et du cap — cinq phrases, une table.
  it.each([
    ['commute', 'ton trajet domicile-travail'],
    ['leisure', 'tes sorties'],
    ['travel', 'tes voyages'],
  ])('%s → « %s »', (poste, forme) => {
    expect(formeInserable(poste)).toBe(forme);
  });

  // Le repli n'existe que pour les lignes générées avant la colonne `poste` : quand le poste est
  // là, il gagne toujours. L'inverse ferait lire « tes sorties » à quelqu'un dont le
  // poste extras est les voyages — une fausseté lisible à la place d'une vérité laide.
  it('le poste l’emporte toujours sur la boucle', () => {
    expect(formeInserable('travel', 'extras')).toBe('tes voyages');
    expect(formeInserable('travel', 'commute')).toBe('tes voyages');
  });

  it('retombe sur la boucle quand le poste manque', () => {
    expect(formeInserable(null, 'commute')).toBe('ton trajet domicile-travail');
    expect(formeInserable(null, 'extras')).toBe('tes sorties');
    expect(formeInserable(undefined, 'extras')).toBe('tes sorties');
  });

  // Jamais de chaîne vide : elle produirait « pour  ? » dans un email déjà parti.
  it('ne rend jamais rien, même sur un poste inconnu', () => {
    for (const valeur of [null, undefined, '', 'inconnu']) {
      expect(formeInserable(valeur).length).toBeGreaterThan(0);
    }
  });
});

describe('le vocabulaire du poste', () => {
  it('couvre les trois postes dans les quatre registres', () => {
    for (const table of [POSTE_LABEL, POSTE_SUBJECT, POSTE_EN_PHRASE, FORME_INSERABLE]) {
      expect(Object.keys(table).sort()).toEqual([...POSTES].sort());
    }
  });

  it('POSTE_EN_PHRASE est POSTE_SUBJECT à la majuscule près', () => {
    for (const [poste, sujet] of Object.entries(POSTE_SUBJECT)) {
      expect(POSTE_EN_PHRASE[poste]).toBe(sujet.charAt(0).toLowerCase() + sujet.slice(1));
    }
  });

  /**
   * **Le test qui existe pour empêcher une fusion de bonne foi.**
   *
   * `FORME_INSERABLE` et `POSTE_EN_PHRASE` se ressemblent assez pour qu'on soit tenté de n'en
   * garder qu'une. Les unifier rallongerait la question du point d'un « longue distance », ou
   * changerait « sorties » en « loisirs » dans la copie validée du canvas.
   *
   * Elles coïncident sur `commute` — la forme y est déjà courte — et diffèrent sur les deux
   * autres, mais **pas de la même façon** : `travel` raccourcit (« tes voyages longue distance »
   * → « tes voyages »), `leisure` change de mot sans raccourcir (« loisirs » → « sorties », même
   * longueur au caractère près). Épingler « la forme insérable est plus courte » serait donc
   * faux la moitié du temps ; ce qui se tient, c'est qu'elles diffèrent.
   */
  it('diffère de la forme de restitution sur les deux postes où le canvas l’a voulu', () => {
    expect(FORME_INSERABLE.commute).toBe(POSTE_EN_PHRASE.commute);
    expect(FORME_INSERABLE.leisure).not.toBe(POSTE_EN_PHRASE.leisure);
    expect(FORME_INSERABLE.travel).not.toBe(POSTE_EN_PHRASE.travel);
    // Le seul raccourcissement réel, et le plus utile : c'est la forme qui suit « pour » dans
    // une question déjà longue.
    expect(FORME_INSERABLE.travel.length).toBeLessThan(POSTE_EN_PHRASE.travel.length);
  });

  // Le vocabulaire doit rester le même d'un registre à l'autre : la personne qui lit « Trajet
  // domicile-travail » en tête du questionnaire doit retrouver « domicile-travail » dans la restitution.
  //
  // **Les loisirs sont l'exception, et elle est écrite** (22/10/2026, `v1-35` étape 3) : ils s'appelaient
  // « … du week-end » dans les quatre registres, et ce mot-clé commun a disparu avec le week-end. Trois
  // registres disent « loisirs » ; la forme insérable dit « sorties », le mot de la copie validée du
  // canvas (`v1-14` §3.2), et c'est le test de la différence, plus haut, qui la tient à l'écart.
  // Le nom d'un registre qui dériverait vers un autre mot (« Sorties » en tête de section, « tes trajets »
  // en sujet) tombe ici.
  it('garde le même mot-clé d’un registre à l’autre', () => {
    const motsCles: Record<string, { registres: Record<string, string>[]; motCle: string }[]> = {
      commute: [
        { registres: [POSTE_LABEL, POSTE_SUBJECT, POSTE_EN_PHRASE, FORME_INSERABLE], motCle: 'domicile-travail' },
      ],
      leisure: [
        { registres: [POSTE_LABEL, POSTE_SUBJECT, POSTE_EN_PHRASE], motCle: 'loisirs' },
        { registres: [FORME_INSERABLE], motCle: 'sorties' },
      ],
      travel: [{ registres: [POSTE_LABEL, POSTE_SUBJECT, POSTE_EN_PHRASE, FORME_INSERABLE], motCle: 'voyage' }],
    };
    for (const [poste, groupes] of Object.entries(motsCles)) {
      for (const { registres, motCle } of groupes) {
        for (const table of registres) {
          expect({ poste, valeur: table[poste].toLowerCase() }).toEqual({
            poste,
            valeur: expect.stringContaining(motCle),
          });
        }
      }
    }
  });

  // **Les loisirs ne sont plus « du week-end », dans aucun des quatre registres** (22/10/2026) : la
  // question couvre la semaine comme le week-end, et chaque registre qui garderait le mot en
  // promettrait la moitié. Les libellés que le serveur a figés avant cette date, eux, le portent encore
  // — c'est leur lecture qui l'accepte, pas leur écriture.
  it('ne dit « week-end » nulle part pour les loisirs', () => {
    for (const table of [POSTE_LABEL, POSTE_SUBJECT, POSTE_EN_PHRASE, FORME_INSERABLE]) {
      expect(table.leisure.toLowerCase()).not.toMatch(/week-?end/);
    }
    expect(POSTE_LABEL.leisure).toBe('Loisirs');
    expect(POSTE_SUBJECT.leisure).toBe('Tes loisirs');
    expect(POSTE_EN_PHRASE.leisure).toBe('tes loisirs');
    expect(FORME_INSERABLE.leisure).toBe('tes sorties');
  });
});

describe('posteLabel', () => {
  it('rend l’étiquette connue', () => {
    expect(posteLabel('travel', 'repli')).toBe('Voyages longue distance');
  });

  // Le repli est le libellé snapshoté, pas une chaîne vide : `dominant_poste` peut porter une
  // valeur ajoutée côté serveur avant que le client ne soit déployé, et un vide muet à l'écran
  // serait pire qu'un libellé un peu long.
  it('retombe sur le libellé fourni plutôt que sur du vide', () => {
    expect(posteLabel('inconnu', 'Trajet domicile-travail (Voiture thermique)')).toBe(
      'Trajet domicile-travail (Voiture thermique)'
    );
    expect(posteLabel(null, 'repli')).toBe('repli');
  });
});

/**
 * **Le résiduel des sorties rares se reconnaît d'un seul critère, pour deux écrans** (25/09/2026,
 * `v1-29` §6.3) : la félicitation du plan et la marche de la restitution. Le libellé est celui que
 * le serveur fige, épinglé côté base par `01` et `20`.
 */
describe('estLeResiduelDesSortiesRares', () => {
  // **Les deux libellés, parce que `assessment_results` ne se réécrit pas** (22/10/2026) : le serveur
  // fige « Loisirs (occasionnels) » depuis la migration des loisirs de toute la semaine, et les bilans
  // d'avant portent encore « Loisirs du week-end (occasionnels) ». Le marqueur lu est `(occasionnels)`,
  // vrai des deux ; un test qui n'en prenait qu'un laisserait la lecture se resserrer sur lui sans bruit.
  it.each(['Loisirs (occasionnels)', 'Loisirs du week-end (occasionnels)'])(
    'reconnaît le libellé que le serveur fige sur le résiduel : « %s »',
    (libelle) => {
      expect(estLeResiduelDesSortiesRares('leisure', libelle)).toBe(true);
    }
  );

  it.each(['Loisirs (Voiture thermique)', 'Loisirs du week-end (Voiture thermique)'])(
    'ne prend pas des sorties déclarées pour le résiduel : « %s »',
    (libelle) => {
      expect(estLeResiduelDesSortiesRares('leisure', libelle)).toBe(false);
    }
  );

  it('ne prend pas non plus un libellé absent', () => {
    expect(estLeResiduelDesSortiesRares('leisure', null)).toBe(false);
  });

  // Le marqueur ne vaut que sur les sorties : un autre poste qui le porterait resterait nommé.
  it('ne lit le marqueur que sur les sorties', () => {
    expect(estLeResiduelDesSortiesRares('travel', 'Voyages (occasionnels)')).toBe(false);
    expect(estLeResiduelDesSortiesRares(null, 'Loisirs (occasionnels)')).toBe(false);
    expect(estLeResiduelDesSortiesRares(null, 'Loisirs du week-end (occasionnels)')).toBe(false);
  });
});

/**
 * **Le résiduel des sorties rares s'appelle « loisirs occasionnels », partout où il est nommé**
 * (arbitrage du 27/09/2026, `v1-29` §6.3), dans chacun des quatre registres — et seulement lui.
 */
describe('nomDuPoste', () => {
  it.each([
    ['label', 'Loisirs occasionnels', 'Loisirs'],
    ['sujet', 'Tes loisirs occasionnels', 'Tes loisirs'],
    ['enPhrase', 'tes loisirs occasionnels', 'tes loisirs'],
    ['insere', 'tes loisirs occasionnels', 'tes sorties'],
  ] as const)('%s : « %s » pour le résiduel, « %s » sinon', (registre, residuel, declare) => {
    expect(nomDuPoste('leisure', registre, true)).toBe(residuel);
    expect(nomDuPoste('leisure', registre, false)).toBe(declare);
  });

  it('ne touche jamais aux deux autres postes', () => {
    expect(nomDuPoste('commute', 'label', true)).toBe('Trajet domicile-travail');
    expect(nomDuPoste('travel', 'insere', true)).toBe('tes voyages');
  });

  it('laisse son repli à l’appelant pour un poste inconnu', () => {
    expect(nomDuPoste('inconnu', 'label', true)).toBeUndefined();
    expect(nomDuPoste(null, 'label', true)).toBeUndefined();
  });
});

/**
 * **La fréquence déclarée dit toujours si les loisirs sont le résiduel ; les libellés, pas
 * toujours** : ils ne le marquent que quand il domine ou pèse le plus des deux postes hors trajet
 * (`extras_poste_label`) — et ce dernier ne dit plus quelle boucle mensuelle la personne reçoit :
 * qui sort rarement est interrogé sur ses voyages depuis le 27/09/2026.
 */
describe('loisirsSontLeResiduel', () => {
  const RESIDUEL = 'Loisirs (occasionnels)';
  // Un bilan soumis avant le 22/10/2026 : `assessment_results` garde le libellé d'alors.
  const RESIDUEL_D_AVANT = 'Loisirs du week-end (occasionnels)';

  it('lit la fréquence quand elle est là, même quand aucun libellé ne marque le résiduel', () => {
    // « Rarement » et un vol : les voyages dominent et portent la boucle mensuelle.
    expect(
      loisirsSontLeResiduel({
        leisure_frequency: 'rarely',
        dominant_poste: 'travel',
        dominant_poste_label: 'Voyages longue distance (Avion moyen-courrier)',
        extras_poste_label: 'Voyages longue distance (Avion moyen-courrier)',
      })
    ).toBe(true);
    expect(
      loisirsSontLeResiduel({
        leisure_frequency: 'weekly',
        dominant_poste: 'leisure',
        dominant_poste_label: RESIDUEL,
      })
    ).toBe(false);
  });

  it('retombe sur les libellés quand la fréquence n’a pas été lue', () => {
    expect(loisirsSontLeResiduel({ dominant_poste: 'leisure', dominant_poste_label: RESIDUEL })).toBe(true);
    expect(loisirsSontLeResiduel({ dominant_poste: 'leisure', dominant_poste_label: RESIDUEL_D_AVANT })).toBe(true);
    expect(
      loisirsSontLeResiduel({
        leisure_frequency: null,
        dominant_poste: 'commute',
        dominant_poste_label: 'Trajet domicile-travail (Trottinette)',
        extras_poste_label: RESIDUEL,
      })
    ).toBe(true);
    expect(
      loisirsSontLeResiduel({
        dominant_poste: 'commute',
        dominant_poste_label: 'Trajet domicile-travail (Voiture thermique)',
        extras_poste_label: 'Loisirs (Voiture thermique)',
      })
    ).toBe(false);
    expect(
      loisirsSontLeResiduel({
        dominant_poste: 'commute',
        dominant_poste_label: 'Trajet domicile-travail (Voiture thermique)',
        extras_poste_label: 'Loisirs du week-end (Voiture thermique)',
      })
    ).toBe(false);
  });

  // « Presque tous les jours » est une sortie déclarée, comme les trois d'avant elle : seule « rarely »
  // est le résiduel. Une cinquième réponse qu'on prendrait pour lui serait nommée « loisirs occasionnels »
  // — le contraire de ce que la personne vient de dire (22/10/2026).
  it.each(REPONSES_FREQUENCE_DES_LOISIRS.map((reponse) => reponse.value).filter((valeur) => valeur !== 'rarely'))(
    'ne prend pas « %s » pour le résiduel, quel que soit le libellé',
    (frequence) => {
      expect(
        loisirsSontLeResiduel({
          leisure_frequency: frequence,
          dominant_poste: 'leisure',
          dominant_poste_label: RESIDUEL,
        })
      ).toBe(false);
    }
  );
});

/**
 * **Sous une entrée du suivi, le résiduel s'appelle « Loisirs occasionnels »** : le poste principal
 * porte toujours le marqueur sur son libellé figé. Les autres postes gardent leur étiquette nue,
 * sans le mode que porte le libellé.
 */
describe('posteDeLHistorique', () => {
  it.each(['Loisirs (occasionnels)', 'Loisirs du week-end (occasionnels)'])(
    'nomme le résiduel « Loisirs occasionnels » : le libellé figé est « %s »',
    (libelle) => {
      expect(posteDeLHistorique('leisure', libelle)).toBe('Loisirs occasionnels');
    }
  );

  // L'étiquette nue vient de la table, jamais du libellé figé : un bilan d'avant le 22/10/2026 y lit
  // « Loisirs du week-end », et l'historique l'appelle déjà « Loisirs ».
  it.each(['Loisirs (Voiture thermique)', 'Loisirs du week-end (Voiture thermique)'])(
    'garde l’étiquette nue des postes déclarés : le libellé figé est « %s »',
    (libelle) => {
      expect(posteDeLHistorique('leisure', libelle)).toBe('Loisirs');
    }
  );

  it('garde l’étiquette nue des autres postes', () => {
    expect(posteDeLHistorique('commute', 'Trajet domicile-travail (Vélo)')).toBe(
      'Trajet domicile-travail'
    );
  });

  it('retombe sur le libellé figé pour un poste inconnu', () => {
    expect(posteDeLHistorique('inconnu', 'Autre chose')).toBe('Autre chose');
  });
});

/**
 * La boucle d'une valeur lue en base (24/10/2026, étape 6b de `v1-35`) : la page `/point` en compose sa carte,
 * et une valeur que `LOOP_TYPES` ne connaît pas s'y dit comme une panne, jamais comme un lien abîmé.
 * Éprouvé le même jour : `boucleLue` qui accepte tout (`return valeur as LoopType`) → ce test, seul ; et
 * `LOOP_TYPES` augmentée d'une valeur → `verifier-miroirs-de-check.mjs`, « le produit propose « voyages », que
 * la base refuse ».
 */
describe('boucleLue', () => {
  it('reconnaît les deux boucles, et rien d’autre', () => {
    expect(boucleLue('commute')).toBe('commute');
    expect(boucleLue('extras')).toBe('extras');
    expect(boucleLue('voyages')).toBeNull();
    expect(boucleLue(null)).toBeNull();
    expect(boucleLue(undefined)).toBeNull();
  });
});
