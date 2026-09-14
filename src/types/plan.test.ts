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

    // Et la garde porte sur le nombre **total** d'actions, pas sur celles mises en avant : les deux
    // peuvent différer depuis C4.6, où le plan fige toutes les pistes et l'écran en montre deux.
    expect(
      cadreDuPlan({ postesEnAvant: [], posteDuCycle: 'commute', nombreDActions: 3 }).chiffreLeCap
    ).toBe(false);
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
      'Deux actions, dont une action ailleurs que sur ton trajet domicile-travail.'
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
