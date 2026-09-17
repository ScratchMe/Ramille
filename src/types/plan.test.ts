import {
  ACTIONS_EN_AVANT,
  INTENTION_TIMINGS,
  INTENTION_TIMINGS_LOISIRS,
  INTENTION_TIMINGS_VOYAGES,
  cadreDuPlan,
  formatIntention,
  formatIntentionDays,
  formatIntentionTiming,
  intentionKindForPoste,
  intentionTimingsForPoste,
  isIntentionComplete,
  motsDuContexte,
  pistesDuPlan,
  pistesParPoste,
  separationsDesLignes,
  type IntentionDay,
  type ReponsesDeContexte,
} from './plan';

describe('intentionKindForPoste', () => {
  it('ne propose des jours de la semaine que pour le domicile-travail', () => {
    // Un trajet loisir ou un voyage n'a pas de rythme hebdomadaire : lui demander un jour
    // produirait une intention intenable.
    expect(intentionKindForPoste('commute')).toBe('days');
    expect(intentionKindForPoste('leisure')).toBe('timing');
    expect(intentionKindForPoste('travel')).toBe('timing');
    expect(intentionKindForPoste(null)).toBe('timing');
  });
});

describe('intentionTimingsForPoste', () => {
  it('ne propose pas le calendrier du mois pour un voyage (C3.8)', () => {
    // « Ce mois-ci » n'est pas une échéance pour un vol : sur les trois échéances générales, une
    // seule tenait, donc la question revenait à demander un engagement au mois sur une décision
    // annuelle.
    expect(intentionTimingsForPoste('travel')).toEqual(INTENTION_TIMINGS_VOYAGES);
    expect(intentionTimingsForPoste('leisure')).toEqual(INTENTION_TIMINGS_LOISIRS);
  });

  it('retombe sur les échéances générales plutôt que sur une liste vide', () => {
    // Un poste inconnu — un gabarit à venir, une ligne relue d'une version antérieure — ouvrirait
    // la feuille d'engagement sur rien, et « C'est noté » resterait inactif sans dire pourquoi.
    expect(intentionTimingsForPoste(null)).toEqual(INTENTION_TIMINGS_LOISIRS);
    expect(intentionTimingsForPoste('commute')).toEqual(INTENTION_TIMINGS_LOISIRS);
  });

  it('la table de relecture couvre les deux listes, sans doublon', () => {
    // `formatIntentionTiming` lit `INTENTION_TIMINGS` et doit savoir rendre une valeur quel que
    // soit le poste qui l'a écrite, y compris celle d'un engagement archivé dont on ne connaît
    // plus le gabarit.
    const valeurs = INTENTION_TIMINGS.map((t) => t.value);
    expect(new Set(valeurs).size).toBe(valeurs.length);
    for (const { value } of [...INTENTION_TIMINGS_LOISIRS, ...INTENTION_TIMINGS_VOYAGES]) {
      expect(valeurs).toContain(value);
    }
  });
});

describe('formatIntentionDays', () => {
  it('rend une phrase, pas une liste de cases', () => {
    expect(formatIntentionDays([2, 4])).toBe('le mardi et le jeudi');
    expect(formatIntentionDays([1])).toBe('le lundi');
    expect(formatIntentionDays([1, 2, 3])).toBe('le lundi, le mardi et le mercredi');
  });

  it('trie les jours quelle que soit la saisie', () => {
    expect(formatIntentionDays([4, 2])).toBe('le mardi et le jeudi');
  });

  it('raccourcit la semaine complète', () => {
    expect(formatIntentionDays([1, 2, 3, 4, 5, 6, 7])).toBe('tous les jours');
  });

  it("rend null plutôt qu'une phrase vide", () => {
    expect(formatIntentionDays(null)).toBeNull();
    expect(formatIntentionDays([])).toBeNull();
    expect(formatIntentionDays([42])).toBeNull();
  });
});

describe('formatIntentionTiming', () => {
  it("rend le libellé en minuscule, pour s'insérer dans une phrase", () => {
    expect(formatIntentionTiming('ce_mois')).toBe('ce mois-ci');
    expect(formatIntentionTiming('prochaine_occasion')).toBe('à ma prochaine occasion');
    expect(formatIntentionTiming(null)).toBeNull();
    expect(formatIntentionTiming('valeur_inconnue')).toBeNull();
  });

  it('sait relire une échéance de voyage (C3.8)', () => {
    expect(formatIntentionTiming('au_prochain_voyage')).toBe('à mon prochain projet de voyage');
    expect(formatIntentionTiming('avant_le_prochain_bilan')).toBe('avant mon prochain bilan');
  });
});

describe('formatIntention', () => {
  it('rend celle des deux formes qui est renseignée', () => {
    expect(formatIntention([2, 4], null)).toBe('le mardi et le jeudi');
    expect(formatIntention(null, 'ce_mois')).toBe('ce mois-ci');
    expect(formatIntention(null, null)).toBeNull();
  });
});

describe('isIntentionComplete', () => {
  it("exige un « quand » : un engagement sans intention n'en est pas un", () => {
    expect(isIntentionComplete('days', [], null)).toBe(false);
    expect(isIntentionComplete('days', [2] as IntentionDay[], null)).toBe(true);
    expect(isIntentionComplete('timing', [], null)).toBe(false);
    expect(isIntentionComplete('timing', [], 'ce_mois')).toBe(true);
  });
});

describe('cadreDuPlan', () => {
  /**
   * **Il ne reste qu'un booléen, et la dérivation reste** (C5.3). `intro` et `noteDuCap` sont
   * parties — la première décrivait les cartes posées dessous en taisant les autres, la seconde
   * énonçait une règle que rien n'applique. Ce qui reste porte **deux causes distinctes**, et
   * c'est pourquoi la fonction n'est pas remplacée par un `nombreDActions > 0` écrit dans l'écran :
   * les réunir rendrait la seconde inéprouvable, la première suffisant toujours à faire passer
   * l'assertion.
   */
  it('ne chiffre pas le cap d’un plan sans action', () => {
    // Tout cycliste et tout profil sédentaire depuis C2.5 : « − 11 kg sur tes sorties » juste
    // au-dessus de « Tu fais déjà l'essentiel sur ce poste » était le défaut.
    expect(cadreDuPlan({ postesEnAvant: [], nombreDActions: 0 }).chiffreLeCap).toBe(false);
  });

  it('chiffre le cap dès qu’il y a une action', () => {
    expect(cadreDuPlan({ postesEnAvant: ['commute'], nombreDActions: 1 }).chiffreLeCap).toBe(true);
    expect(
      cadreDuPlan({ postesEnAvant: ['travel', 'commute'], nombreDActions: 11 }).chiffreLeCap
    ).toBe(true);
  });

  // La seconde cause, prise à part. Elle est inatteignable aujourd'hui — `pistesDuPlan` remplit
  // toujours `enAvant` dès qu'il y a une action — et c'est justement pourquoi elle est éprouvée :
  // le jour où elle cesserait de l'être, la cumuler avec la première effacerait le cap d'un plan
  // qui en a un.
  it('garde le cap d’un plan dont aucune action n’est en avant', () => {
    expect(cadreDuPlan({ postesEnAvant: [], nombreDActions: 5 }).chiffreLeCap).toBe(true);
  });
});

describe('pistesDuPlan', () => {
  const action = (rank: number | null, committed = false) => ({
    id: `a${rank}`,
    rank,
    committed_at: committed ? '2026-09-01T10:00:00Z' : null,
  });

  it('met deux actions en avant et compte tout ce qui reste', () => {
    const p = pistesDuPlan([action(1), action(2), action(3), action(4), action(5)]);
    expect(p.enAvant.map((a) => a.id)).toEqual(['a1', 'a2']);
    expect(p.masquees).toBe(3);
    expect(ACTIONS_EN_AVANT).toBe(2);
  });

  // **L'action engagée passe toujours devant** : c'est la réponse à « qu'est-ce que je fais en ce
  // moment ? », elle n'a pas à être cherchée — même quand son rang la mettrait en cinquième.
  it('met l’action engagée en tête, quel que soit son rang', () => {
    const p = pistesDuPlan([action(1), action(2), action(3), action(4, true)]);
    expect(p.enAvant.map((a) => a.id)).toEqual(['a4', 'a1']);
  });

  // Le `rank` du serveur porte déjà le bon ordre — meilleure piste du poste dominant d'abord, puis
  // gain décroissant depuis C5.1 — donc l'écran le suit au lieu de retrier sur autre chose.
  it('suit le rang du serveur et ne retrie pas sur autre chose', () => {
    const p = pistesDuPlan([action(3), action(1), action(2)]);
    expect(p.enAvant.map((a) => a.id)).toEqual(['a1', 'a2']);
  });

  // Un rang absent va au bout, il ne remonte pas en tête par accident — comme le `nulls last` du
  // serveur. Aucune migration n'en produit, mais la colonne l'autorise.
  it('range un rang absent en dernier', () => {
    const p = pistesDuPlan([action(null), action(2), action(1)]);
    expect(p.enAvant.map((a) => a.id)).toEqual(['a1', 'a2']);
  });

  // Le plan d'avant C4.6 : deux actions, rien de plus, donc pas de lien vers l'écran des pistes —
  // il promettrait un écran qui répète celui-ci.
  it('ne renvoie à rien quand il n’y a que deux actions', () => {
    expect(pistesDuPlan([action(1), action(2)]).masquees).toBe(0);
  });

  // Tout cycliste et tout profil sédentaire depuis C2.5 : le plan est vide, et l'écran le félicite
  // plutôt que de lui présenter une liste.
  it('ne met rien en avant sans action', () => {
    const p = pistesDuPlan([]);
    expect(p.enAvant).toEqual([]);
    expect(p.masquees).toBe(0);
  });
});

describe('pistesParPoste', () => {
  const action = (rank: number | null, poste: string | null, committed = false) => ({
    id: `a${rank}`,
    rank,
    poste,
    committed_at: committed ? '2026-09-01T10:00:00Z' : null,
  });
  const grouper = (actions: ReturnType<typeof action>[]) =>
    pistesParPoste(actions, (a) => a.poste);

  // Les groupes sortent dans l'ordre où leur poste **apparaît**, jamais dans un ordre à eux : la
  // tête de cet écran doit être la première carte du plan, sinon les deux surfaces se contredisent
  // sur ce qui compte le plus.
  it('sort les groupes dans l’ordre d’apparition, et garde le rang à l’intérieur', () => {
    const groupes = grouper([
      action(3, 'commute'),
      action(1, 'travel'),
      action(4, 'commute'),
      action(2, 'travel'),
    ]);
    expect(groupes.map((g) => g.poste)).toEqual(['travel', 'commute']);
    expect(groupes[0].pistes.map((a) => a.id)).toEqual(['a1', 'a2']);
    expect(groupes[1].pistes.map((a) => a.id)).toEqual(['a3', 'a4']);
  });

  // L'action engagée passe devant ici aussi — et elle entraîne son poste en tête du même coup,
  // parce que l'ordre des groupes se dérive de l'ordre des actions et de rien d'autre.
  it('met l’action engagée en tête, et son poste avec elle', () => {
    const groupes = grouper([action(1, 'travel'), action(2, 'travel'), action(5, 'commute', true)]);
    expect(groupes.map((g) => g.poste)).toEqual(['commute', 'travel']);
    expect(groupes[0].pistes.map((a) => a.id)).toEqual(['a5']);
  });

  /**
   * **Le groupement partitionne, il ne sélectionne pas** — et cette propriété porte une promesse
   * d'écran depuis §12.4 (`v1-16` §5) : toute action affichée est engageable, donc toute action
   * figée doit être affichée. Un groupement qui en laisserait tomber une la rendrait invisible,
   * c'est-à-dire recréerait le `limit 2` que C4.6 a retiré du serveur, ici et en silence.
   *
   * C'est la garde que C5.2 hérite de l'ancienne partition à trois rangs : elle a changé de forme,
   * pas d'objet. Neuf actions sur trois postes pour qu'elle ait quelque chose à perdre.
   */
  it('ne perd aucune action, quels que soient les postes', () => {
    const postes = ['travel', 'commute', 'leisure'];
    const actions = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((r) => action(r, postes[r % 3]));
    const aplati = grouper(actions).flatMap((g) => g.pistes);
    expect(aplati).toHaveLength(actions.length);
    expect(new Set(aplati.map((a) => a.id)).size).toBe(actions.length);
  });

  // Un poste nul est un groupe comme un autre : la jointure sur `action_templates` peut ne rien
  // rendre, et perdre l'action serait pire que l'afficher sans en-tête.
  it('garde les actions dont le poste est inconnu', () => {
    const groupes = grouper([action(1, null), action(2, 'commute')]);
    expect(groupes.map((g) => g.poste)).toEqual([null, 'commute']);
  });

  it('rend une liste vide sans action', () => {
    expect(grouper([])).toEqual([]);
  });
});

describe('separationsDesLignes', () => {
  // **13.5 de la recette web du 16/09/2026** : deux lignes dépliées en carte se touchaient. Aucune
  // assertion ne portait sur l'espacement — c'est exactement pourquoi la CI ne l'a pas vu —, d'où
  // cette règle sortie de l'écran.
  //
  // Éprouvée en cassant ce qu'elle garde, le 16/09/2026 : la marge posée aussi sur la première
  // ligne, la marge portée par la seule carte (et non par la frontière), et le « ou » changé en
  // « et » — soit le cas de la carte isolée. Deux assertions tombent à chaque fois, jamais les
  // mêmes deux.
  const lignes = ['a', 'b', 'c', 'd'];

  it('ne sépare rien quand tout est fermé', () => {
    expect(separationsDesLignes(lignes, new Set())).toEqual([false, false, false, false]);
  });

  // La première ligne n'a pas de voisine au-dessus : lui donner une marge la décollerait du lien
  // « Voir d'autres pistes », dont le conteneur porte déjà l'écart.
  it('ne pose jamais de marge sur la première', () => {
    expect(separationsDesLignes(lignes, new Set(['a']))[0]).toBe(false);
  });

  // Une carte isolée : un écart avant elle, et un avant la ligne qui la suit. Sans le second, la
  // ligne fermée viendrait se coller sous la carte — c'est une frontière comme l'autre.
  it('sépare des deux côtés d’une carte isolée', () => {
    expect(separationsDesLignes(lignes, new Set(['b']))).toEqual([false, true, true, false]);
  });

  // **Le piège de Yoga, épinglé**. Les marges n'y fusionnent pas : si les deux voisines portaient
  // chacune la leur, l'écart entre deux cartes vaudrait le double de celui entre une carte et une
  // ligne. On compte donc **une** séparation par frontière, jamais deux.
  it('ne compte qu’une séparation entre deux cartes voisines', () => {
    expect(separationsDesLignes(lignes, new Set(['b', 'c']))).toEqual([false, true, true, true]);
  });

  it('sépare partout quand tout est ouvert, sauf en tête', () => {
    expect(separationsDesLignes(lignes, new Set(lignes))).toEqual([false, true, true, true]);
  });

  it('rend une liste vide sans ligne', () => {
    expect(separationsDesLignes([], new Set())).toEqual([]);
  });
});

describe('motsDuContexte', () => {
  const reponses = (o: Partial<ReponsesDeContexte> = {}): ReponsesDeContexte => ({
    zone_type: null,
    tc_access: null,
    household_vehicles: null,
    teletravail: null,
    ...o,
  });

  it('énumère les quatre réponses dans l’ordre de l’étape', () => {
    expect(
      motsDuContexte({
        zone_type: 'urbain_dense',
        tc_access: 'bon',
        household_vehicles: '1',
        teletravail: 'deux_ou_plus',
      })
    ).toEqual([
      'zone urbaine dense',
      'bon accès aux transports en commun',
      'un véhicule dans le foyer',
      'deux jours de télétravail possibles ou plus',
    ]);
  });

  // Le télétravail manque **légitimement** : la question ne se pose ni sans trajet régulier ni en
  // dessous de deux jours de trajet (C5.4). L'encart perd son quatrième segment, il n'écrit pas de
  // phrase à trou.
  it('tait le télétravail quand la question ne s’est pas posée', () => {
    const mots = motsDuContexte(
      reponses({ zone_type: 'rural', tc_access: 'inexistant', household_vehicles: '2_plus' })
    );
    expect(mots).toEqual([
      'zone rurale',
      'pas de transports en commun',
      'deux véhicules ou plus dans le foyer',
    ]);
  });

  /**
   * **La table est parcourue, pas énumérée valeur par valeur.** Celle qu'on ajoutera demain
   * traverserait une liste écrite à la main — c'est le motif des deux balayages de `first_step`
   * (C4.6) et de la liste des modes de maintien (C2.5). Trois choses s'y vérifient d'un coup :
   * chaque valeur rend un mot, aucun mot n'est vide, et aucun ne porte de chiffre — l'encart dit un
   * contexte, jamais une quantité, et surtout jamais le gain d'une action écartée.
   */
  it('rend une phrase pour chaque valeur admise, sans chiffre', () => {
    const colonnes: (keyof ReponsesDeContexte)[] = [
      'zone_type',
      'tc_access',
      'household_vehicles',
      'teletravail',
    ];
    const valeurs: Record<string, string[]> = {
      zone_type: ['urbain_dense', 'periurbain', 'rural'],
      tc_access: ['bon', 'limite', 'inexistant'],
      household_vehicles: ['0', '1', '2_plus'],
      teletravail: ['aucun', 'un_jour', 'deux_ou_plus'],
    };

    for (const colonne of colonnes) {
      for (const valeur of valeurs[colonne]) {
        const [mot] = motsDuContexte(reponses({ [colonne]: valeur }));
        expect(mot).toBeDefined();
        expect(mot.length).toBeGreaterThan(0);
        expect(mot).not.toMatch(/\d/);
      }
    }
  });

  // Une valeur hors table ne peut venir que d'une migration qui aurait ajouté une réponse sans
  // passer ici : on tait ce qu'on ne sait pas dire plutôt que d'afficher un identifiant technique.
  it('tait une valeur qu’elle ne sait pas dire', () => {
    expect(motsDuContexte(reponses({ zone_type: 'montagne' }))).toEqual([]);
  });

  it('rend une liste vide quand rien n’est renseigné', () => {
    expect(motsDuContexte(reponses())).toEqual([]);
  });
});
