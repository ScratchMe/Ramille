import {
  ACTIONS_EN_AVANT,
  INTENTION_TIMINGS,
  INTENTION_TIMINGS_LOISIRS,
  INTENTION_TIMINGS_VOYAGES,
  cadreDuPlan,
  felicitationDuPlanSansAction,
  formatIntention,
  formatIntentionDays,
  formatIntentionTiming,
  intentionKindForPoste,
  intentionTimingsForPoste,
  isIntentionComplete,
  ligneDuGain,
  motsDuContexte,
  phraseDeLOrphelin,
  phraseDesPistesSuffisantes,
  RAISONS_ANNONCABLES,
  pistesDuPlan,
  pistesParPoste,
  filetsDesLignes,
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

/**
 * **« par an » colle au chiffre qu'il qualifie** (24/09/2026, `v1-29`). La carte engagée disait
 * « Le mardi et le jeudi · par an · 15 % » : « par an » s'y lisait comme le rythme des jours.
 *
 * Éprouvé en cassant ce qu'il garde, le 24/09/2026 : l'ordre d'avant remis (l'intention devant
 * « par an ») fait tomber les deux tests qui portent une intention, et eux seuls ; la part
 * d'empreinte oubliée fait tomber les deux qui en portent une.
 */
describe('ligneDuGain', () => {
  it('commence par « par an », avant l’intention', () => {
    expect(ligneDuGain('le mardi et le jeudi', 15.4)).toBe(
      'par an · le mardi et le jeudi · 15 % de ton empreinte'
    );
  });

  it('dit la même chose qu’une carte non engagée, sans intention', () => {
    expect(ligneDuGain(null, 43)).toBe('par an · 43 % de ton empreinte');
  });

  it('se passe de la part d’empreinte quand elle manque', () => {
    expect(ligneDuGain(null, null)).toBe('par an');
    expect(ligneDuGain('à mon prochain projet de voyage', null)).toBe(
      'par an · à mon prochain projet de voyage'
    );
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
   * énonçait une règle que rien n'applique. Ce qui reste n'a **qu'une cause**, le plan à zéro
   * action, et la fonction n'est pas remplacée par un `nombreDActions > 0` écrit dans l'écran parce
   * que l'écran ne doit pas trancher ça en ternaire. Ce commentaire lui prêtait encore « deux causes
   * distinctes » jusqu'au 24/09/2026, soit la phrase que la doc de `cadreDuPlan` réfute depuis le
   * 20/09/2026 : celle qui dictait la régression épinglée par le dernier test de ce bloc.
   */
  it('ne chiffre pas le cap d’un plan sans action', () => {
    // Tout cycliste et tout profil sédentaire depuis C2.5 : « − 11 kg sur tes sorties » juste
    // au-dessus de la félicitation du plan sans action était le défaut.
    expect(cadreDuPlan({ postesEnAvant: [], nombreDActions: 0 }).chiffreLeCap).toBe(false);
  });

  it('chiffre le cap dès qu’il y a une action', () => {
    expect(cadreDuPlan({ postesEnAvant: ['commute'], nombreDActions: 1 }).chiffreLeCap).toBe(true);
    expect(
      cadreDuPlan({ postesEnAvant: ['travel', 'commute'], nombreDActions: 11 }).chiffreLeCap
    ).toBe(true);
  });

  // **`postesEnAvant` ne décide de rien, et c'est ça qu'il faut épingler.** L'assertion précédente
  // de ce bloc affirmait `.toBe(true)` sur une liste vide, ce que le repli rendait déjà : elle ne
  // pouvait pas tomber. Celle-ci compare les **deux** formes à nombre d'actions égal, donc elle
  // tombe le jour où quelqu'un fusionne les conditions en
  // `nombreDActions === 0 || postesEnAvant.length === 0` — la régression que la doc de cette
  // dérivation a invitée à écrire jusqu'au 20/09/2026, et qui ôterait son cap à un plan qui en a un.
  it('ne fait pas dépendre le cap des actions mises en avant', () => {
    const sansMiseEnAvant = cadreDuPlan({ postesEnAvant: [], nombreDActions: 5 });
    const avecMiseEnAvant = cadreDuPlan({ postesEnAvant: ['commute'], nombreDActions: 5 });
    expect(sansMiseEnAvant.chiffreLeCap).toBe(true);
    expect(sansMiseEnAvant).toEqual(avecMiseEnAvant);
  });
});

/**
 * **Le cap et les pistes parlent la même unité, et la phrase ne se dit que quand elle est vraie**
 * (24/09/2026, `v1-29`). Le cap est annuel ; « − 384 kg » sous « Ton cap pour cette saison »,
 * au-dessus de pistes à « − 619 kg par an », laissait croire qu'une saison valait un an.
 *
 * Éprouvé en cassant ce qu'il garde, le 24/09/2026 — quatre mutations :
 *   - `>=` → `>` : 1 test tombe, l'égalité au kilo affiché ;
 *   - l'arrondi retiré (valeurs brutes comparées) : le même, et lui seul ;
 *   - l'engagement ignoré : 1, celui de l'action engagée ;
 *   - les deux phrases à deux cartes interverties : 3, tous ceux qui attendent l'une d'elles.
 */
describe('phraseDesPistesSuffisantes', () => {
  const phrase = (capKg: number | null, gainsEnAvant: (number | null)[], actionEngagee = false) =>
    phraseDesPistesSuffisantes({ capKg, gainsEnAvant, actionEngagee });

  // Le profil de la recette : cap 384 kg, les deux premières pistes à 619 et 1 601 kg par an.
  it('dit que chacune des deux suffit quand les deux atteignent le cap', () => {
    expect(phrase(384, [619, 1601])).toBe('Chacune des deux pistes proposées suffit à le franchir.');
  });

  it('dit que l’une des deux suffit quand une seule l’atteint, où qu’elle soit', () => {
    expect(phrase(384, [619, 200])).toBe('L’une des deux pistes proposées suffit à le franchir.');
    expect(phrase(384, [200, 619])).toBe('L’une des deux pistes proposées suffit à le franchir.');
  });

  it('parle de « la piste » quand le plan n’en porte qu’une', () => {
    expect(phrase(384, [400])).toBe('La piste proposée suffit à le franchir.');
  });

  it('se tait quand aucune piste n’atteint le cap', () => {
    expect(phrase(384, [300, 200])).toBeNull();
    expect(phrase(384, [300])).toBeNull();
  });

  // **Atteindre, c'est « au moins égal », comparé sur ce que l'écran montre** : 383,6 kg s'affiche
  // « − 384 kg » comme le cap. Ce n'est pas un cas d'école — sur cinq jours de trajet, le
  // télétravail d'un jour vaut exactement le cap du poste domicile-travail.
  it('compte l’égalité au kilo affiché comme atteinte', () => {
    expect(phrase(384, [383.6])).toBe('La piste proposée suffit à le franchir.');
    expect(phrase(384, [384])).toBe('La piste proposée suffit à le franchir.');
    expect(phrase(384, [383.4])).toBeNull();
  });

  // La phrase aide à choisir. Une fois l'action engagée, la personne a choisi : la répéter au-dessus
  // de son engagement serait commenter son choix.
  it('se tait dès qu’une action est engagée', () => {
    expect(phrase(384, [619, 1601], true)).toBeNull();
  });

  it('se tait quand le cap n’est pas chiffré', () => {
    expect(phrase(null, [619, 1601])).toBeNull();
    expect(phrase(0, [619])).toBeNull();
  });

  it('ne compte pas une piste sans gain', () => {
    expect(phrase(384, [null, 200])).toBeNull();
    expect(phrase(384, [null, 619])).toBe('L’une des deux pistes proposées suffit à le franchir.');
  });

  it('se tait sans piste en avant', () => {
    expect(phrase(384, [])).toBeNull();
  });
});

/**
 * **Le plan à zéro action nomme son poste** (24/09/2026, `v1-29`) : « sur ce poste » ne disait
 * lequel à personne, sur un écran où rien d'autre ne le nomme.
 *
 * Éprouvé en cassant ce qu'il garde, le 24/09/2026 : `formeInserable` à la place de la table (son
 * repli devine « tes sorties du week-end ») fait tomber le test du poste inconnu, et lui seul ;
 * `POSTE_EN_PHRASE` à la place de `FORME_INSERABLE` fait tomber celui du registre.
 */
describe('felicitationDuPlanSansAction', () => {
  it('nomme le poste du cycle', () => {
    expect(felicitationDuPlanSansAction('commute')).toBe(
      'Tu fais déjà l’essentiel sur ton trajet domicile-travail.'
    );
  });

  // Le registre qu'on insère après une préposition : « tes sorties du week-end », jamais « tes
  // loisirs du week-end » — et c'est le poste du cycliste aux sorties rares du parcours réel.
  it('parle le registre inséré', () => {
    expect(felicitationDuPlanSansAction('leisure')).toBe(
      'Tu fais déjà l’essentiel sur tes sorties du week-end.'
    );
    expect(felicitationDuPlanSansAction('travel')).toBe('Tu fais déjà l’essentiel sur tes voyages.');
  });

  it('ne devine pas un poste qu’elle ne connaît pas', () => {
    expect(felicitationDuPlanSansAction(null)).toBe('Tu fais déjà l’essentiel sur ce poste.');
    expect(felicitationDuPlanSansAction('teletravail')).toBe('Tu fais déjà l’essentiel sur ce poste.');
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

describe('filetsDesLignes', () => {
  // **L'écart au canvas que la recette du 18/09/2026 a fait ressortir sans pouvoir le nommer** : le
  // bloc 06 de la feuille était conforme sur ses six lignes, et l'écran gênait quand même. La
  // planche A2 demandait un filet sous chaque ligne ; il n'a jamais été livré, et onze lignes de
  // 14 px formaient un pavé.
  //
  // Éprouvée en cassant ce qu'elle garde : en retirant l'exclusion des cartes, la première
  // assertion tombe seule ; en retirant celle de la dernière ligne, la deuxième tombe seule.
  const lignes = ['a', 'b', 'c', 'd'];

  it('pose un filet sous chaque ligne fermée sauf la dernière', () => {
    expect(filetsDesLignes(lignes, new Set())).toEqual([true, true, true, false]);
  });

  // Une carte porte sa propre bordure : un filet dessous dessinerait un second bord à deux pixels
  // du premier.
  it('n’en pose pas sous une ligne rendue en carte', () => {
    expect(filetsDesLignes(lignes, new Set(['b']))).toEqual([true, false, true, false]);
  });

  // La dernière ligne n'a rien à séparer d'elle : ce qui suit est la tête du groupe suivant, ou la
  // fin de l'écran. Un filet y annoncerait une ligne de plus.
  it('ne pose rien sur une liste d’une seule ligne', () => {
    expect(filetsDesLignes(['a'], new Set())).toEqual([false]);
    expect(filetsDesLignes([], new Set())).toEqual([]);
  });

  // Le cas qui réunit les deux exclusions : dernière ligne **et** rendue en carte.
  it('n’en pose pas sous une dernière ligne ouverte', () => {
    expect(filetsDesLignes(lignes, new Set(['d']))).toEqual([true, true, true, false]);
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

  // **Le paramètre est « rendue en carte », et pas « ouverte au toucher »**, et cette nuance a
  // changé de raison d'être sans changer de contenu. Elle est née de la contre-lecture du lot 5,
  // quand l'écran rendait aussi en carte l'**action engagée** qu'on ne déplie pas — lui passer les
  // seules lignes ouvertes laissait la ligne suivante se coller sous elle. Depuis #234 l'action
  // engagée **reste une ligne** (planche A2), donc l'ensemble est aujourd'hui exactement celui des
  // lignes ouvertes. Le contrat, lui, ne bouge pas : la fonction parle de cartes rendues, quelle
  // que soit la manière dont elles le sont, et c'est ce qui la laisse juste le jour où une
  // troisième cause de carte apparaît.
  it('sépare sous une carte, quelle qu’en soit la cause', () => {
    expect(separationsDesLignes(lignes, new Set(['b']))[2]).toBe(true);
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
      'au moins deux jours de télétravail possibles',
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

describe('l’encart orphelin', () => {
  // **Deux raisons et pas quatre**, et la règle est « effet de bord non choisi » : `saison` est une
  // reconduction qui a échoué à la frontière d'une saison, `changement` est la décision de la
  // personne. Les lui apprendre serait inutile ou condescendant.
  it('n’annonce que les deux libérations que la personne n’a pas choisies', () => {
    expect([...RAISONS_ANNONCABLES]).toEqual(['rebilan', 'contexte']);
    // Les deux tues, nommées : `saison` est une reconduction qui a échoué à la frontière d'une
    // saison, `changement` est la décision de la personne. La liste des quatre raisons vit dans le
    // `check` de `plan_action_commitments_archive`, qu'un test pgTAP éprouve de son côté.
    for (const tue of ['saison', 'changement']) {
      expect(RAISONS_ANNONCABLES).not.toContain(tue);
    }
  });

  // **La phrase nommait le nouveau bilan, et il n'y en a pas toujours un** : depuis C6.4, corriger
  // son contexte reconstruit le plan sans resoumettre de bilan. C'est la seule moitié de la phrase
  // qui change — l'action reste dans le suivi dans les deux cas, et c'est ce qui la distingue
  // d'une disparition.
  it('nomme la cause, et pas un bilan qui n’a pas eu lieu', () => {
    const contexte = phraseDeLOrphelin('contexte', 'Faire un trajet sur cinq à vélo.');
    expect(contexte).toContain('avec tes nouvelles réponses de contexte');
    expect(contexte).not.toContain('nouveau bilan');

    const rebilan = phraseDeLOrphelin('rebilan', 'Faire un trajet sur cinq à vélo.');
    expect(rebilan).toContain('avec ton nouveau bilan');
  });

  it('cite l’action et rappelle qu’elle reste dans le suivi', () => {
    for (const raison of RAISONS_ANNONCABLES) {
      const phrase = phraseDeLOrphelin(raison, 'Faire un trajet sur cinq à vélo.');
      expect(phrase).toContain('« Faire un trajet sur cinq à vélo. »');
      expect(phrase).toContain('elle reste dans ton suivi');
    }
  });
});
