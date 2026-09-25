import {
  FORME_INSERABLE,
  POSTES,
  POSTE_EN_PHRASE,
  POSTE_LABEL,
  POSTE_SUBJECT,
  estLeResiduelDesSortiesRares,
  formeInserable,
  posteLabel,
} from '@/constants/postes';

describe('formeInserable', () => {
  // La table du canvas v1-14 §3.2 et du brief. C'est elle qui décide de la question du point,
  // de l'email, du push, du sous-titre du plan et du cap — cinq phrases, une table.
  it.each([
    ['commute', 'ton trajet domicile-travail'],
    ['leisure', 'tes sorties du week-end'],
    ['travel', 'tes voyages'],
  ])('%s → « %s »', (poste, forme) => {
    expect(formeInserable(poste)).toBe(forme);
  });

  // Le repli n'existe que pour les lignes générées avant la colonne `poste` : quand le poste est
  // là, il gagne toujours. L'inverse ferait lire « tes sorties du week-end » à quelqu'un dont le
  // poste extras est les voyages — une fausseté lisible à la place d'une vérité laide.
  it('le poste l’emporte toujours sur la boucle', () => {
    expect(formeInserable('travel', 'extras')).toBe('tes voyages');
    expect(formeInserable('travel', 'commute')).toBe('tes voyages');
  });

  it('retombe sur la boucle quand le poste manque', () => {
    expect(formeInserable(null, 'commute')).toBe('ton trajet domicile-travail');
    expect(formeInserable(null, 'extras')).toBe('tes sorties du week-end');
    expect(formeInserable(undefined, 'extras')).toBe('tes sorties du week-end');
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

  // Le vocabulaire doit rester le même d'un registre à l'autre : la personne qui lit « Loisirs du
  // week-end » en tête du questionnaire doit retrouver « loisirs » dans la restitution.
  it('garde le même mot-clé d’un registre à l’autre', () => {
    for (const [poste, motCle] of Object.entries({
      commute: 'domicile-travail',
      leisure: 'week-end',
      travel: 'voyage',
    })) {
      for (const table of [POSTE_LABEL, POSTE_SUBJECT, POSTE_EN_PHRASE, FORME_INSERABLE]) {
        expect({ poste, valeur: table[poste].toLowerCase() }).toEqual({
          poste,
          valeur: expect.stringContaining(motCle),
        });
      }
    }
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
  it('reconnaît le libellé que le serveur fige sur le résiduel', () => {
    expect(estLeResiduelDesSortiesRares('leisure', 'Loisirs du week-end (occasionnels)')).toBe(true);
  });

  it('ne prend pas des sorties déclarées pour le résiduel', () => {
    expect(estLeResiduelDesSortiesRares('leisure', 'Loisirs du week-end (Voiture thermique)')).toBe(false);
    expect(estLeResiduelDesSortiesRares('leisure', null)).toBe(false);
  });

  // Le marqueur ne vaut que sur les sorties : un autre poste qui le porterait resterait nommé.
  it('ne lit le marqueur que sur les sorties', () => {
    expect(estLeResiduelDesSortiesRares('travel', 'Voyages (occasionnels)')).toBe(false);
    expect(estLeResiduelDesSortiesRares(null, 'Loisirs du week-end (occasionnels)')).toBe(false);
  });
});
