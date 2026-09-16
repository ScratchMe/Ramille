import {
  ACTIONS_EN_AVANT,
  cadreDuPlan,
  formatIntention,
  formatIntentionDays,
  formatIntentionTiming,
  intentionKindForPoste,
  intentionTimingsForPoste,
  INTENTION_TIMINGS,
  INTENTION_TIMINGS_LOISIRS,
  INTENTION_TIMINGS_VOYAGES,
  isIntentionComplete,
  separationsDesLignes,
  PISTES_ESTOMPEES,
  pistesDuPlan,
  type IntentionDay,
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
  const cadre = (postesEnAvant: (string | null)[], posteDuCycle: string | null) =>
    cadreDuPlan({ postesEnAvant, posteDuCycle, nombreDActions: postesEnAvant.length });

  it('nomme le poste quand toutes les actions y portent', () => {
    expect(cadre(['commute', 'commute'], 'commute').intro).toBe(
      'Deux actions pour ton trajet domicile-travail.'
    );
    expect(cadre(['leisure'], 'leisure').intro).toBe('Une action pour tes sorties du week-end.');
  });

  it('ne pose pas de cap chiffré sur un plan sans action (C2.5, puis C3.8)', () => {
    // Le cas est devenu courant, pas rare : depuis que les gabarits de loisirs sont refusés aux
    // sorties rares, tout cycliste et tout profil sédentaire a un plan à zéro action. La carte du
    // cap s'affichait alors juste au-dessus de « Tu fais déjà l'essentiel sur ce poste ».
    const vide = cadreDuPlan({ postesEnAvant: [], posteDuCycle: 'commute', nombreDActions: 0 });
    expect(vide.intro).toBeNull();
    expect(vide.chiffreLeCap).toBe(false);
  });

  it('garde le cap d’un plan dont toutes les actions sont derrière le lien des pistes', () => {
    // Les deux causes de « rien à annoncer » tenaient dans un seul `||`, et le commentaire de ce
    // test affirmait que la garde portait sur le nombre **total** d'actions — alors que
    // l'assertion passait par l'autre membre, `postesEnAvant` vide. Elle n'éprouvait donc pas ce
    // qu'elle disait, et ce qu'elle constatait était faux : un plan de trois actions n'a pas cessé
    // d'avoir un cap parce que l'écran n'en met aucune en avant.
    //
    // La branche est inatteignable aujourd'hui — `pistesDuPlan` remplit toujours `enAvant` dès
    // qu'il y a une action, les deux nombres différant seulement par les pistes repliées (C4.6).
    // Elle est écrite pour le jour où elle cesserait de l'être.
    const derriere = cadreDuPlan({
      postesEnAvant: [],
      posteDuCycle: 'commute',
      nombreDActions: 3,
    });
    expect(derriere.intro).toBeNull();
    expect(derriere.chiffreLeCap).toBe(true);
    expect(derriere.noteDuCap).toBeNull();
  });

  it('dit que le plan est allé chercher ailleurs, et que le cap ne mesure pas ça', () => {
    const ailleurs = cadre(['travel', 'leisure'], 'commute');
    expect(ailleurs.intro).toBe(
      'Deux actions, sur d’autres postes que ton trajet domicile-travail.'
    );
    expect(ailleurs.chiffreLeCap).toBe(true);
    expect(ailleurs.noteDuCap).toBe(
      'Le cap porte sur ton trajet domicile-travail ; ces actions portent ailleurs.'
    );
  });

  it('compte celles qui débordent quand le plan est mixte', () => {
    const mixte = cadre(['commute', 'travel'], 'commute');
    expect(mixte.intro).toBe(
      'Deux actions, dont une ailleurs que sur ton trajet domicile-travail.'
    );
    expect(mixte.noteDuCap).toBe(
      'Le cap porte sur ton trajet domicile-travail ; cette action porte ailleurs.'
    );
  });

  it('ne met la note qu’au-dessus d’un plan qui déborde', () => {
    expect(cadre(['commute', 'commute'], 'commute').noteDuCap).toBeNull();
  });

  it('un poste inconnu reste nommable : la forme insérable a son repli', () => {
    // Le repli côté client est celui de la boucle `extras`, « tes sorties du week-end » — un
    // libellé un peu décalé plutôt qu'une formule vague, décision de C2.6. Ce que ce test garde
    // n'est pas ce mot-là mais le fait que l'intro reste une phrase : sans repli, elle s'écrirait
    // « Une action pour . ».
    expect(cadre([null], null).intro).toBe('Une action pour tes sorties du week-end.');
  });
});

describe('pistesDuPlan', () => {
  const action = (rank: number | null, committed = false) => ({
    id: `a${rank}`,
    rank,
    committed_at: committed ? '2026-09-01T10:00:00Z' : null,
  });

  it('met deux actions en avant et compte celles qui restent', () => {
    const p = pistesDuPlan([action(1), action(2), action(3), action(4), action(5)]);
    expect(p.enAvant.map((a) => a.id)).toEqual(['a1', 'a2']);
    expect(p.estompees.map((a) => a.id)).toEqual(['a3', 'a4']);
    expect(p.lignes.map((a) => a.id)).toEqual(['a5']);
    expect(p.masquees).toBe(3);
    expect(ACTIONS_EN_AVANT).toBe(2);
    expect(PISTES_ESTOMPEES).toBe(2);
  });

  // **L'action engagée passe toujours devant** : c'est la réponse à « qu'est-ce que je fais en ce
  // moment ? », elle n'a pas à être cherchée — même quand son rang la mettrait en cinquième.
  it('met l’action engagée en tête, quel que soit son rang', () => {
    const p = pistesDuPlan([action(1), action(2), action(3), action(4, true)]);
    expect(p.enAvant.map((a) => a.id)).toEqual(['a4', 'a1']);
    expect(p.estompees.map((a) => a.id)).toEqual(['a2', 'a3']);
  });

  // Le `rank` du serveur porte déjà le bon ordre — poste dominant d'abord, puis gain décroissant —
  // donc l'écran le suit au lieu de retrier sur le gain, qui donnerait un ordre différent.
  it('suit le rang du serveur et ne retrie pas sur autre chose', () => {
    const p = pistesDuPlan([action(3), action(1), action(2)]);
    expect(p.enAvant.map((a) => a.id)).toEqual(['a1', 'a2']);
    expect(p.estompees.map((a) => a.id)).toEqual(['a3']);
  });

  // Un rang absent va au bout, il ne remonte pas en tête par accident — comme le `nulls last` du
  // serveur. Aucune migration n'en produit, mais la colonne l'autorise.
  it('range un rang absent en dernier', () => {
    const p = pistesDuPlan([action(null), action(2), action(1)]);
    expect(p.enAvant.map((a) => a.id)).toEqual(['a1', 'a2']);
    expect(p.estompees.map((a) => a.id)).toEqual(['anull']);
  });

  /**
   * **Les trois rangs partitionnent, ils ne sélectionnent pas** — et depuis §12.4 (`v1-16` §5)
   * cette propriété porte une promesse d'écran : toute action affichée est engageable, donc toute
   * action figée doit être affichée. Un rang qui en laisserait tomber une la rendrait invisible,
   * c'est-à-dire recréerait le `limit 2` que C4.6 a retiré du serveur, ici et en silence.
   *
   * L'assertion porte sur neuf actions pour déborder les deux bornes, et compare la
   * **concaténation des trois rangs** à l'ordre attendu plutôt que trois listes séparées : c'est
   * la partition qu'on éprouve, pas le contenu de chaque rang, déjà épinglé plus haut.
   */
  it('ne perd aucune action, quel qu’en soit le nombre', () => {
    const rangs = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const p = pistesDuPlan(rangs.map((r) => action(r)));
    expect([...p.enAvant, ...p.estompees, ...p.lignes].map((a) => a.id)).toEqual(
      rangs.map((r) => `a${r}`)
    );
    expect(p.masquees).toBe(rangs.length - ACTIONS_EN_AVANT);
  });

  // Le plan d'avant C4.6 : deux actions, rien derrière, donc pas de lien à afficher.
  it('ne cache rien quand il n’y a que deux actions', () => {
    const p = pistesDuPlan([action(1), action(2)]);
    expect(p.masquees).toBe(0);
    expect(p.estompees).toEqual([]);
    expect(p.lignes).toEqual([]);
  });

  // Tout cycliste et tout profil sédentaire depuis C2.5 : le plan est vide, et l'écran le félicite
  // plutôt que de lui présenter une liste.
  it('rend trois rangs vides sans action', () => {
    expect(pistesDuPlan([])).toEqual({ enAvant: [], estompees: [], lignes: [], masquees: 0 });
  });

  // La fonction ne mute pas ce qu'on lui donne : `cycle.plan_actions` vient du state, et `sort`
  // mute — c'est le piège que la copie évite, et il ne se voit qu'au second rendu.
  it('ne mute pas la liste reçue', () => {
    const liste = [action(3), action(1)];
    pistesDuPlan(liste);
    expect(liste.map((a) => a.id)).toEqual(['a3', 'a1']);
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
