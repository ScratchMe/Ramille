import {
  ACTIONS_EN_AVANT,
  INTENTION_TIMINGS,
  INTENTION_TIMINGS_LOISIRS,
  INTENTION_TIMINGS_VOYAGES,
  annonceDeLaPiste,
  cadreDuPlan,
  ceQuiManqueALIntention,
  etatDeLaPiste,
  introDesPistes,
  libelleDuChoix,
  cartesDuPlan,
  defilementVersLaCarte,
  felicitationDuPlanSansAction,
  pileALaRacine,
  pileDeLOnglet,
  toucherDOnglet,
  formatIntention,
  formatIntentionDays,
  formatIntentionTiming,
  intentionKindForPoste,
  intentionTimingsForPoste,
  isIntentionComplete,
  ligneDuGain,
  motsDuContexte,
  orphelinAAnnoncer,
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
import { TARGET_2050_TRANSPORT_T } from '@/constants/carbon-reference';
import type { LoopType } from '@/constants/postes';

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

  // **Une échéance relative se relit au mois qu'elle vise** (02/10/2026, contre-lecture de `v1-33`
  // D14) : « le mois prochain », choisi en octobre, se lisait « décembre » en novembre. Le mois se
  // compte depuis l'engagement, en heure de Paris — `moisEnHeureDeParis`, éprouvé sous d'autres
  // fuseaux dans `checkin.test.ts`. Éprouvé le même jour : le décalage de « Le mois prochain » ramené
  // à 0 → « vise le mois suivant… », seul.
  it('vise le mois suivant pour « Le mois prochain », le mois du choix pour « Ce mois-ci »', () => {
    expect(formatIntentionTiming('le_mois_prochain', '2026-10-15T10:00:00Z')).toBe('en novembre');
    expect(formatIntentionTiming('ce_mois', '2026-10-15T10:00:00Z')).toBe('en octobre');
    expect(formatIntentionTiming('le_mois_prochain', '2026-12-20T10:00:00Z')).toBe('en janvier');
  });

  it('lit le mois en heure de Paris : le 31 octobre à 23 h 30 UTC, c’est déjà novembre', () => {
    expect(formatIntentionTiming('ce_mois', '2026-10-31T23:30:00Z')).toBe('en novembre');
    expect(formatIntentionTiming('ce_mois', '2026-07-31T21:30:00Z')).toBe('en juillet');
    expect(formatIntentionTiming('ce_mois', '2026-07-31T22:30:00Z')).toBe('en août');
  });

  it('garde le libellé du choix sans date d’engagement, ou pour une échéance qui ne vise pas un mois', () => {
    expect(formatIntentionTiming('le_mois_prochain')).toBe('le mois prochain');
    expect(formatIntentionTiming('le_mois_prochain', 'pas une date')).toBe('le mois prochain');
    expect(formatIntentionTiming('prochaine_occasion', '2026-10-15T10:00:00Z')).toBe('à ma prochaine occasion');
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

/**
 * D13 de `v1-33` (01/10/2026) : « C'est noté » en attente dit ce qui manque, mot pour mot.
 *
 * Éprouvé en le cassant, le 01/10/2026 : les deux phrases interverties fait tomber « nomme ce qui
 * manque » ; la complétude réécrite à la main (`days.length > 0 || timing !== null`, un second
 * prédicat qui ne regarde plus la forme) fait tomber « se tait dès que l'intention est complète, et
 * seulement alors ».
 */
describe('ceQuiManqueALIntention', () => {
  it('nomme ce qui manque, selon la forme de l’intention', () => {
    expect(ceQuiManqueALIntention('days', [], null)).toBe('Choisis au moins un jour.');
    expect(ceQuiManqueALIntention('timing', [], null)).toBe('Choisis une échéance.');
  });

  // La phrase ne réclame que ce que la garde de l'appel réclame : les deux lisent la même complétude,
  // sur toutes les combinaisons — une échéance ne complète pas une intention à jours, ni l'inverse.
  it('se tait dès que l’intention est complète, et seulement alors', () => {
    const jours: IntentionDay[][] = [[], [2], [1, 3, 5]];
    const echeances = [null, 'ce_mois', 'avant_le_prochain_bilan'] as const;
    for (const kind of ['days', 'timing'] as const) {
      for (const days of jours) {
        for (const timing of echeances) {
          const manque = ceQuiManqueALIntention(kind, days, timing);
          expect({ kind, days, timing, seTait: manque === null }).toEqual({
            kind,
            days,
            timing,
            seTait: isIntentionComplete(kind, days, timing),
          });
        }
      }
    }
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

  // Aucune formulation pour trois cartes n'a été décidée : si `ACTIONS_EN_AVANT` grandit un jour,
  // l'écran doit perdre la phrase plutôt que dire « deux » devant trois cartes (contre-lecture du
  // 25/09/2026, qui relevait ce silence non éprouvé). Éprouvé en cassant : le `return null` final
  // remplacé par la phrase « Chacune des deux… » fait tomber ce test, et lui seul.
  it('se tait au-delà de deux cartes, même quand toutes atteignent le cap', () => {
    expect(phrase(384, [619, 1601, 480])).toBeNull();
  });
});

/**
 * **Le plan à zéro action nomme son poste** (24/09/2026, `v1-29`) : « sur ce poste » ne disait
 * lequel à personne, sur un écran où rien d'autre ne le nomme.
 *
 * Éprouvé en cassant ce qu'il garde, le 24/09/2026 : `formeInserable` à la place de la table (son
 * repli devine « tes sorties du week-end ») fait tomber le test du poste inconnu, et lui seul ;
 * `POSTE_EN_PHRASE` à la place de `FORME_INSERABLE` fait tomber celui du registre. Puis, pour le
 * résiduel des sorties rares : la branche neutralisée fait tomber « ne nomme ni ne promet », et lui
 * seul ; le marqueur lu sur tous les postes fait tomber « ne lit le marqueur que sur les sorties »,
 * et lui seul.
 *
 * Et le 25/09/2026, pour le titre du résiduel (« Tu es déjà sous le repère 2050. ») : le titre
 * rendu sans condition de total fait tomber « ne dit … que si le total l'est », et lui seul ; la
 * borne rendue stricte (`<` dans `sousLeRepere2050`) le fait tomber avec « vaut aussi pile sur le
 * repère » de `palier.test.ts` — les deux tests de la même égalité, et eux seuls ; le marqueur lu sur
 * tous les postes (dans `estLeResiduelDesSortiesRares`) fait tomber « ne lit le marqueur que sur les
 * sorties » ici et dans `postes.test.ts`, et eux seuls.
 */
describe('felicitationDuPlanSansAction', () => {
  // Les deux boucles tournent : le cas courant, où seul le poste du cycle décide.
  const LES_DEUX: LoopType[] = ['commute', 'extras'];
  const titre = (poste: string | null, libelle: string | null = null) =>
    felicitationDuPlanSansAction(poste, libelle, null, LES_DEUX).titre;

  it('nomme le poste du cycle', () => {
    expect(titre('commute', 'Trajet domicile-travail (Vélo)')).toBe(
      'Tu fais déjà l’essentiel sur ton trajet domicile-travail.'
    );
  });

  // Le registre qu'on insère après une préposition : « tes sorties du week-end », jamais « tes
  // loisirs du week-end ».
  it('parle le registre inséré', () => {
    expect(titre('leisure', 'Loisirs du week-end (Voiture thermique)')).toBe(
      'Tu fais déjà l’essentiel sur tes sorties du week-end.'
    );
    expect(titre('travel')).toBe('Tu fais déjà l’essentiel sur tes voyages.');
  });

  it('ne devine pas un poste qu’elle ne connaît pas', () => {
    expect(titre(null)).toBe('Tu fais déjà l’essentiel sur ce poste.');
    expect(titre('teletravail')).toBe('Tu fais déjà l’essentiel sur ce poste.');
  });

  // Le cycliste aux sorties rares du parcours réel : son poste est le résiduel du calcul, pas un
  // comportement déclaré, et aucune boucle mensuelle ne porte dessus. Son total (11 kg) est celui
  // que le parcours réel mesure.
  const RESIDUEL = 'Loisirs du week-end (occasionnels)';
  it('ne nomme ni ne promet le résiduel des sorties rares, et dit pourquoi le plan est vide', () => {
    expect(felicitationDuPlanSansAction('leisure', RESIDUEL, 11, LES_DEUX)).toEqual({
      titre: 'Tu es déjà sous le repère 2050.',
      promettreLePoint: false,
    });
  });

  // **Le titre affirme un repère, donc il se conditionne au total** (arbitrage du 25/09/2026). Vrai
  // par construction aujourd'hui, pas garanti demain : un poste neuf pourrait faire passer ce
  // profil au-dessus. La borne est celle de la restitution — le repère, égalité comprise —, et un total
  // inconnu (lecture en échec) n'affirme rien.
  it('ne dit « sous le repère 2050 » que si le total l’est, égalité comprise', () => {
    expect(titre('leisure', RESIDUEL)).toBe('Tu fais déjà l’essentiel.');
    const repereKg = TARGET_2050_TRANSPORT_T * 1000;
    expect(felicitationDuPlanSansAction('leisure', RESIDUEL, repereKg, LES_DEUX).titre).toBe('Tu es déjà sous le repère 2050.');
    expect(felicitationDuPlanSansAction('leisure', RESIDUEL, repereKg + 0.01, LES_DEUX).titre).toBe('Tu fais déjà l’essentiel.');
    expect(felicitationDuPlanSansAction('leisure', RESIDUEL, repereKg + 1, LES_DEUX).promettreLePoint).toBe(false);
  });

  // Le repère ne vaut que pour le résiduel : ailleurs le titre nomme le poste, quel que soit le total.
  it('ne parle du repère que pour le résiduel', () => {
    expect(felicitationDuPlanSansAction('commute', 'Trajet domicile-travail (Vélo)', 11, LES_DEUX).titre).toBe(
      'Tu fais déjà l’essentiel sur ton trajet domicile-travail.'
    );
  });

  it('promet le point partout ailleurs', () => {
    expect(felicitationDuPlanSansAction('commute', 'Trajet domicile-travail (Vélo)', 11, LES_DEUX).promettreLePoint).toBe(true);
    expect(felicitationDuPlanSansAction('leisure', 'Loisirs du week-end (Voiture thermique)', 11, LES_DEUX).promettreLePoint).toBe(true);
    expect(felicitationDuPlanSansAction('travel', 'Voyages longue distance (Avion)', 11, LES_DEUX).promettreLePoint).toBe(true);
    expect(felicitationDuPlanSansAction(null, null, null, LES_DEUX).promettreLePoint).toBe(true);
  });

  // Le marqueur ne vaut que pour les sorties : un libellé d'un autre poste qui le porterait ne
  // ferait pas taire le poste.
  it('ne lit le marqueur que sur les sorties', () => {
    expect(titre('travel', 'Voyages (occasionnels)')).toBe('Tu fais déjà l’essentiel sur tes voyages.');
  });

  // **La promesse suit les boucles** (30/09/2026, `v1-27` §12.25) : le poste vient du cycle, mais
  // seul `mes_boucles_a_venir` sait si un point viendra. Ils divergent quand le plan est en retard
  // sur le dernier bilan — et c'est la boucle qui dit vrai. Éprouvé le 30/09/2026 : la promesse
  // remise à `true`, puis les deux boucles interverties, font tomber ce test, et lui seul.
  it('ne promet pas un point dont la boucle est connue pour être arrêtée', () => {
    const promet = (poste: string | null, libelle: string | null, boucles: LoopType[] | null) =>
      felicitationDuPlanSansAction(poste, libelle, 11, boucles).promettreLePoint;
    expect(promet('commute', 'Trajet domicile-travail (Vélo)', ['extras'])).toBe(false);
    expect(promet('leisure', 'Loisirs du week-end (Voiture thermique)', ['commute'])).toBe(false);
    expect(promet('travel', 'Voyages longue distance (Avion)', [])).toBe(false);
    // La boucle du poste suffit, l'autre n'y est pour rien.
    expect(promet('commute', 'Trajet domicile-travail (Vélo)', ['commute'])).toBe(true);
    expect(promet('travel', 'Voyages longue distance (Avion)', ['extras'])).toBe(true);
    // Sans réponse du serveur, la promesse reste : seule une boucle connue arrêtée la retire.
    expect(promet('commute', 'Trajet domicile-travail (Vélo)', null)).toBe(true);
    // Et le résiduel ne promet jamais rien, boucle mensuelle ou pas.
    expect(promet('leisure', RESIDUEL, ['commute', 'extras'])).toBe(false);
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
  //
  // **La moitié « plan » de la décision n° 2** (28/09/2026, `v1-32` §2) : le plan garde l'engagée en
  // tête, la liste des pistes ne la déplace pas. Sa jumelle est « garde l'action engagée à son rang,
  // et son poste à sa place », dans `pistesParPoste` ci-dessous, qui dit l'inverse **exprès**. Un
  // passage qui « factoriserait » les deux ordres en un fait tomber l'une ou l'autre selon le sens :
  // si celle-ci tombe, ce n'est pas l'autre qu'il faut « corriger ».
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

  // Les groupes sortent dans l'ordre où leur poste **apparaît** au classement, jamais dans un ordre
  // à eux : le plan et la liste s'accordent sur le classement (décision n° 2, `v1-32` §2), et un tri
  // des groupes par poids ou par nom ferait dire à la liste un autre ordre que celui du plan.
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

  // **La moitié « liste » de la décision n° 2** (28/09/2026, `v1-32` §2) : l'ordre du rang toute la
  // saison, la ligne engagée à sa place. Ce test disait l'inverse jusqu'au 29/09/2026 — « met
  // l'action engagée en tête, et son poste avec elle » —, et c'est ce qui réordonnait la liste sous
  // le doigt : s'engager sur la cinquième piste la faisait passer première, son groupe avec elle.
  // C'est la planche A2 du canvas : « Regrouper deux sorties », cinquième, reste deuxième des
  // loisirs, et la liste ouvre toujours sur les voyages.
  //
  // Sa jumelle est « met l'action engagée en tête, quel que soit son rang », dans `pistesDuPlan`
  // ci-dessus, qui dit l'inverse **exprès** : le plan garde l'engagée en tête. Si l'une des deux
  // tombe, ce n'est pas l'autre qu'il faut « corriger ».
  it('garde l’action engagée à son rang, et son poste à sa place', () => {
    const groupes = grouper([
      action(1, 'travel'),
      action(2, 'travel'),
      action(4, 'leisure'),
      action(5, 'leisure', true),
      action(7, 'commute'),
    ]);
    expect(groupes.map((g) => g.poste)).toEqual(['travel', 'leisure', 'commute']);
    expect(groupes[1].pistes.map((a) => a.id)).toEqual(['a4', 'a5']);
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

  // Le même `nulls last` que le plan : les deux lisent un comparateur écrit une fois (`parRang`), et
  // ce test garde que la liste n'en reprend pas une copie qui ferait remonter un rang absent.
  it('range un rang absent en dernier, comme le plan', () => {
    const groupes = grouper([action(null, 'travel'), action(2, 'commute'), action(1, 'travel')]);
    expect(groupes.map((g) => g.poste)).toEqual(['travel', 'commute']);
    expect(groupes[0].pistes.map((a) => a.id)).toEqual(['a1', 'anull']);
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

/**
 * **Une ligne de l'écran des pistes** (`v1-32` §4.1, 29/09/2026) : quatre dérivations sorties de
 * l'écran, où l'annonce était composée deux fois et l'intro écrite en ternaire.
 *
 * **Éprouvé en le cassant, le 29/09/2026** (TESTING.md §1.1) — dix mutations de `plan.ts`, chacune
 * jouée seule sur un fichier égal au commit et restaurée depuis sa copie, et ce que chacune fait
 * tomber (sur 87 tests) :
 *   - M1, `pistesParPoste` reprend l'ordre du plan (l'ancien défaut) → « garde l'action engagée à
 *     son rang, et son poste à sa place », seul ;
 *   - M2, le plan perd l'engagée en tête (un seul ordre pour les deux) → « met l'action engagée en
 *     tête, quel que soit son rang », seul. M1 et M2 sont les deux moitiés de la décision n° 2 ;
 *   - M3, `engagee` décidée sur `engageeId === action.id` et non sur la ligne → trois cas : les deux
 *     lignes engagées dont l'identifiant relu n'est pas le leur (aucun, une autre), et la ligne libre
 *     que l'écran croit engagée. (La table disait « deux » ; rejouée à la contre-lecture du même
 *     soir, elle en fait tomber trois — la troisième est aussi celle de M4.) ;
 *   - M4, `aLaPlace` sans exclure la ligne elle-même → la ligne libre que l'écran croit engagée ;
 *   - M5, les deux libellés de la pastille intervertis → `libelleDuChoix` **et** les trois tests
 *     d'annonce, qui disent ce libellé : quatre, attendu ;
 *   - M6, le point final du titre gardé → « n'enchaîne pas deux points », seul ;
 *   - M7, le gain nul non filtré → « tait la partie chiffrée », seul ;
 *   - M8, l'intro engagée reprend l'ancienne variante → `introDesPistes`, seul ;
 *   - M9, les rangs nuls en tête dans `parRang` → les deux « rang absent en dernier », plan et liste ;
 *   - M10, la liste recopie le tri sans le `nulls last` → celui de la liste, seul.
 */
describe('etatDeLaPiste', () => {
  const piste = (id: string, engagee: boolean) => ({
    id,
    committed_at: engagee ? '2026-09-28T10:00:00Z' : null,
  });

  // La table entière : l'engagement de la ligne (deux valeurs) croisé avec l'identifiant engagé que
  // l'écran a relu (aucun, elle-même, une autre). Six cas, pas un de moins — une exclusion vérifiée
  // sur une paire de moins est la famille de défaut que ce dépôt a appris à chercher.
  it.each([
    [false, null, 'libre'],
    [false, 'a', 'libre'],
    [false, 'b', 'aLaPlace'],
    [true, null, 'engagee'],
    [true, 'a', 'engagee'],
    // **L'état relu gagne** : une ligne engagée entre-temps, alors que l'écran croit une autre
    // engagée, se rend engagée — la règle `committed_at === null` que l'écran tenait déjà.
    [true, 'b', 'engagee'],
  ] as const)('ligne engagée : %s, identifiant engagé : %s → %s', (engagee, engageeId, attendu) => {
    expect(etatDeLaPiste(piste('a', engagee), engageeId)).toBe(attendu);
  });
});

describe('libelleDuChoix', () => {
  // La décision n° 5 : le remplacement se dit sur ce qu'on touche, dans les mots du plan.
  it('dit « Choisir », ou « Choisir à la place » quand une autre est engagée, et rien sur l’engagée', () => {
    expect(libelleDuChoix('libre')).toBe('Choisir');
    expect(libelleDuChoix('aLaPlace')).toBe('Choisir à la place');
    expect(libelleDuChoix('engagee')).toBeNull();
  });
});

describe('annonceDeLaPiste', () => {
  const titre = 'Renoncer à un vol long-courrier cette année';

  // Les trois formes du HANDOFF, mot pour mot. Le séparateur des milliers s'écrit par son point de
  // code (`FRONT.md` §1.6) : collé en littéral, un échec afficherait deux chaînes identiques à l'œil.
  it('rend les trois formes du HANDOFF', () => {
    expect(annonceDeLaPiste({ titre, gainKg: 1601, etat: 'libre' })).toBe(
      'Renoncer à un vol long-courrier cette année. − 1\u00a0601 kg par an. Choisir.'
    );
    expect(annonceDeLaPiste({ titre, gainKg: 1601, etat: 'aLaPlace' })).toBe(
      'Renoncer à un vol long-courrier cette année. − 1\u00a0601 kg par an. Choisir à la place.'
    );
    expect(annonceDeLaPiste({ titre: 'Regrouper deux sorties en une seule, une fois sur cinq', gainKg: 67.4, etat: 'engagee' })).toBe(
      'Regrouper deux sorties en une seule, une fois sur cinq. − 67 kg par an. Action engagée.'
    );
  });

  // Le premier piège : le repli de l'écran finit par un point, et l'annonce en ajoute un.
  it('n’enchaîne pas deux points quand le titre en porte un', () => {
    expect(annonceDeLaPiste({ titre: 'Action à préciser.', gainKg: 36, etat: 'libre' })).toBe(
      'Action à préciser. − 36 kg par an. Choisir.'
    );
  });

  // Le second : sans gain, la partie chiffrée part en entier — jamais « null kg », ni « 0 kg ».
  it('tait la partie chiffrée quand le gain manque', () => {
    expect(annonceDeLaPiste({ titre, gainKg: null, etat: 'libre' })).toBe(
      'Renoncer à un vol long-courrier cette année. Choisir.'
    );
    expect(annonceDeLaPiste({ titre, gainKg: null, etat: 'engagee' })).toBe(
      'Renoncer à un vol long-courrier cette année. Action engagée.'
    );
  });
});

describe('introDesPistes', () => {
  // Les deux phrases des planches A1 et A2, mot pour mot.
  it('dit ce que le choix fait, selon qu’une action est engagée', () => {
    expect(introDesPistes(false)).toBe(
      'Par poste, du plus gros gain au plus petit. Une seule action engagée à la fois : en choisir une ici la met en tête de ton plan.'
    );
    expect(introDesPistes(true)).toBe(
      'Par poste, du plus gros gain au plus petit. Une seule action engagée à la fois : en choisir une ici remplace la tienne.'
    );
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
    // Les trois tues, nommées : `saison` est une reconduction qui a échoué à la frontière d'une
    // saison, `changement` est la décision de la personne, et `retrait` (C4.7) aussi — retirer un
    // bilan est un geste choisi, et la décision D2 de `v1-22` est de ne rien en annoncer. La liste des
    // cinq raisons vit dans le `check` de `plan_action_commitments_archive`, que les tests pgTAP
    // éprouvent de leur côté (`29`, `34`).
    for (const tue of ['saison', 'changement', 'retrait']) {
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

  // **« n’y est plus » est la prémisse de l'encart, et elle peut devenir fausse** (recette du
  // 01/10/2026, `v1-13` §19) : le contexte remis comme avant rend l'action au plan, et un appareil
  // neuf affichait l'encart au-dessus d'elle. L'appariement se fait sur le gabarit et non sur le
  // libellé, que l'archive fige (la troisième assertion).
  //
  // **Éprouvé en le cassant le 01/10/2026** (`TESTING.md` §1.1), deux mutations de la dérivation, ce
  // test seul tombant à chaque fois : `orphelin` rendu sans condition (« Expected: null », sur la
  // première assertion) ; puis l'appariement sur `action_text` au lieu du gabarit (la même). Depuis la
  // borne au cycle, ajoutée le même jour, la première fait aussi tomber le test suivant. L'appel de
  // l'écran est gardé par le parcours réel, étape « contexte — retiré puis remis ».
  const orphelin = {
    id: 'archive-1',
    action_template_id: 'gabarit-metro',
    plan_cycle_id: 'cycle-automne',
    action_text: 'Passer deux trajets sur cinq en métro ou en tram',
    released_reason: 'contexte',
  };
  const plan = (gabarits: string[], cycle = 'cycle-automne') => ({ cycle, gabarits });

  it('se tait quand l’action qu’il dit partie est revenue dans le plan', () => {
    expect(orphelinAAnnoncer(orphelin, plan(['gabarit-metro', 'gabarit-train']))).toBeNull();
    expect(orphelinAAnnoncer(orphelin, plan(['gabarit-covoiturage', 'gabarit-velo']))).toBe(orphelin);
    // Un gabarit reformulé depuis l'archive (C3.8) : même gabarit, autre libellé — revenu quand même.
    expect(
      orphelinAAnnoncer({ ...orphelin, action_text: 'Faire deux trajets sur cinq en métro' }, plan(['gabarit-metro']))
    ).toBeNull();
    // Un plan à zéro action ne peut rien avoir repris.
    expect(orphelinAAnnoncer(orphelin, plan([]))).toBe(orphelin);
    expect(orphelinAAnnoncer(null, plan(['gabarit-metro']))).toBeNull();
  });

  // **Borné à la saison affichée** (décision du 01/10/2026, #312) : une perte d'un autre cycle ne
  // s'annonce plus — ni un bilan de mars sur un téléphone neuf en décembre, ni un encart tu qui
  // reviendrait avec son ancienne cause. Une ligne dont le cycle a disparu (`on delete set null`) se
  // tait aussi.
  //
  // **Éprouvé en le cassant le 01/10/2026** : la condition sur le cycle retirée, ce test seul tombe,
  // sur sa première assertion (« Expected: null »).
  it('ne parle que d’une perte du cycle affiché', () => {
    expect(orphelinAAnnoncer(orphelin, plan(['gabarit-velo'], 'cycle-hiver'))).toBeNull();
    expect(orphelinAAnnoncer({ ...orphelin, plan_cycle_id: null }, plan(['gabarit-velo']))).toBeNull();
    expect(orphelinAAnnoncer(orphelin, plan(['gabarit-velo']))).toBe(orphelin);
  });
});

/**
 * **Les exclusions de l'écran du plan, sur toutes les combinaisons d'états** (`v1-27` §4,
 * 27/09/2026). Cinq booléens, et trois quantités prises de part et d'autre de leur seuil — dont
 * **un** plan à une seule action, sans quoi une borne écrite `<= 1` passerait : 384 états. Les
 * énumérer coûte moins qu'oublier une paire — c'est exactement ce qui s'est produit deux fois sur ces
 * cartes, la dernière fois dans la contre-lecture même qui corrigeait la première.
 *
 * **« Au plus une carte d'ouverture » n'est plus une assertion : c'est le type.** `carteDOuverture`
 * est une valeur unique, donc empiler deux cartes est devenu inexprimable — c'est ce que la
 * dérivation apporte de plus sûr, et un test qui « vérifierait » qu'il n'y en a jamais deux ne
 * pourrait pas tomber. Ce qui reste à épingler est qu'une carte due est bien rendue, et laquelle.
 *
 * **Éprouvé en le cassant, le 27/09/2026** (TESTING.md §1.1) — cinq mutations de `cartesDuPlan`, et
 * ce que chacune fait tomber :
 *   - la carte des deux lieux passée devant le premier plan → la préséance, et la paire épinglée
 *     nommément ;
 *   - la carte d'attente sans condition sur les cartes d'ouverture → son exclusion, et le seul cas
 *     où elle se rend ;
 *   - la carte d'attente sans condition sur les points → les deux mêmes ;
 *   - l'encart de contexte sans la condition sur les actions → « jamais sur un plan à zéro action »,
 *     et la partition, qui interdit l'encart sous la félicitation ;
 *   - la félicitation écrite `nombreDActions <= 1` → la partition félicitation / estimation — **elle
 *     ne tombait pas** tant que l'énumération ne prenait que zéro et trois actions.
 *
 * **Et deux de plus le 01/10/2026, sur l'intro et le trait** (audit P-5) :
 *   - l'intro sans condition (`intro: true`) → « ne dit le principe… » et le cas nommé du premier plan
 *     à zéro action, seuls ;
 *   - le trait rendu à la forme d'avant (`traitDeTemps: !premierPlan`) → « rend le trait… » et le même
 *     cas nommé, seuls.
 */
describe('cartesDuPlan', () => {
  type Etat = Parameters<typeof cartesDuPlan>[0];

  const tousLesEtats: Etat[] = [];
  for (let bits = 0; bits < 32; bits += 1) {
    const bit = (n: number) => (bits & (1 << n)) !== 0;
    for (const pointsAffiches of [0, 1]) {
      for (const nombreDActions of [0, 1, 4]) {
        for (const motsDuContexte of [0, 1]) {
          tousLesEtats.push({
            ouvertureDeSaison: bit(0),
            carteDuPremierPlan: bit(1),
            carteDesDeuxLieux: bit(2),
            attenteDisponible: bit(3),
            premierPlan: bit(4),
            pointsAffiches,
            nombreDActions,
            motsDuContexte,
          });
        }
      }
    }
  }

  it('énumère bien les 384 états, sans doublon', () => {
    expect(new Set(tousLesEtats.map((etat) => JSON.stringify(etat))).size).toBe(384);
  });

  it('rend une carte d’ouverture dès qu’une est due, et aucune sinon', () => {
    for (const etat of tousLesEtats) {
      const dues = [etat.ouvertureDeSaison, etat.carteDuPremierPlan, etat.carteDesDeuxLieux].filter(Boolean);
      const { carteDOuverture } = cartesDuPlan(etat);
      expect(carteDOuverture === null).toBe(dues.length === 0);
    }
  });

  it('fait passer la saison, puis le premier plan, puis les deux lieux (décidé le 27/09/2026)', () => {
    for (const etat of tousLesEtats) {
      const attendue = etat.ouvertureDeSaison
        ? 'saison'
        : etat.carteDuPremierPlan
          ? 'premierPlan'
          : etat.carteDesDeuxLieux
            ? 'deuxLieux'
            : null;
      expect(cartesDuPlan(etat).carteDOuverture).toBe(attendue);
    }
  });

  it('épingle nommément la paire que l’écran empilait : le premier plan passe devant les deux lieux', () => {
    // Un premier plan à zéro action (la barre arrive, et sa carte avec), puis un nouveau bilan dans
    // la même saison qui donne des actions : les deux cartes sont dues le même jour.
    const cartes = cartesDuPlan({
      ouvertureDeSaison: false,
      carteDuPremierPlan: true,
      carteDesDeuxLieux: true,
      pointsAffiches: 0,
      attenteDisponible: true,
      premierPlan: true,
      nombreDActions: 3,
      motsDuContexte: 2,
    });
    expect(cartes.carteDOuverture).toBe('premierPlan');
  });

  it('ne rend la carte d’attente ni avec une carte d’ouverture, ni sous un point', () => {
    for (const etat of tousLesEtats) {
      const cartes = cartesDuPlan(etat);
      if (cartes.carteDOuverture !== null) expect(cartes.carteDAttente).toBe(false);
      if (etat.pointsAffiches > 0) expect(cartes.carteDAttente).toBe(false);
      if (!etat.attenteDisponible) expect(cartes.carteDAttente).toBe(false);
    }
  });

  it('rend la carte d’attente dans le seul cas qui reste : rien d’autre à dire, et de quoi la dire', () => {
    for (const etat of tousLesEtats) {
      const rienDAutre =
        !etat.ouvertureDeSaison && !etat.carteDuPremierPlan && !etat.carteDesDeuxLieux && etat.pointsAffiches === 0;
      expect(cartesDuPlan(etat).carteDAttente).toBe(rienDAutre && etat.attenteDisponible);
    }
  });

  it('ne met jamais l’encart de contexte sur un plan à zéro action, ni sans rien à énumérer', () => {
    for (const etat of tousLesEtats) {
      expect(cartesDuPlan(etat).encartDeContexte).toBe(etat.nombreDActions > 0 && etat.motsDuContexte > 0);
    }
  });

  it('partage l’écran entre la félicitation et l’estimation : exactement une des deux', () => {
    for (const etat of tousLesEtats) {
      const { felicitation, estimation, encartDeContexte } = cartesDuPlan(etat);
      expect(felicitation).not.toBe(estimation);
      expect(felicitation).toBe(etat.nombreDActions === 0);
      if (felicitation) expect(encartDeContexte).toBe(false);
    }
  });

  it('fait passer les pistes avant le cap tant que dure le premier plan, et seulement alors', () => {
    for (const etat of tousLesEtats) {
      expect(cartesDuPlan(etat).pistesAvantLeCap).toBe(etat.premierPlan);
    }
  });

  // **La planche C du HANDOFF `v1-17`, enfin suivie** (audit P-5, 01/10/2026) : « Ton plan » sans
  // intro, et la carte du cap avec son trait. L'intro dit qu'on choisit une action, une seule — au-dessus
  // d'aucune action, elle contredisait la félicitation juste dessous.
  it('ne dit le principe d’une action par saison que sur un plan qui en porte', () => {
    for (const etat of tousLesEtats) {
      const { intro, felicitation } = cartesDuPlan(etat);
      expect(intro).toBe(etat.nombreDActions > 0);
      // Les deux ne se croisent jamais : « une action, une seule » au-dessus de « aucun changement
      // de mode ne te ferait gagner assez » était exactement le défaut.
      expect(intro && felicitation).toBe(false);
    }
  });

  it('rend le trait hors du premier plan, et au premier plan d’un plan à zéro action', () => {
    for (const etat of tousLesEtats) {
      expect(cartesDuPlan(etat).traitDeTemps).toBe(!etat.premierPlan || etat.nombreDActions === 0);
    }
  });

  // Nommément, les deux cas que la règle de C5.6 sépare : un premier plan à choisir n'a pas de temps
  // qui court, un premier plan sans rien à choisir en a un — c'est celui de tout cycliste.
  it.each([
    ['un premier plan à deux pistes : l’intro, sans trait', 2, false],
    ['un premier plan à zéro action : le trait, sans intro', 0, true],
  ])('%s', (_cas, nombreDActions, attendu) => {
    const cartes = cartesDuPlan({
      ouvertureDeSaison: false,
      carteDuPremierPlan: false,
      carteDesDeuxLieux: false,
      pointsAffiches: 0,
      attenteDisponible: true,
      premierPlan: true,
      nombreDActions,
      motsDuContexte: 2,
    });
    expect(cartes.traitDeTemps).toBe(attendu);
    expect(cartes.intro).toBe(!attendu);
  });
});

/**
 * **La carte engagée, amenée dans la fenêtre après la relecture — dans les deux sens** (audit P-1,
 * 01/10/2026). Une fenêtre de 788 px (900 de l'écran du parcours, moins la bande et la barre), une
 * marge de 16.
 *
 * Éprouvé en le cassant, le 01/10/2026 : la remontée retirée (`defilementPourMontrer` seul) → « remonte
 * jusqu'à une carte passée sous la bande », seul ; la marge oubliée en remontant (`return haut`) → la
 * même, seule.
 */
describe('defilementVersLaCarte', () => {
  const fenetre = { hauteurFenetre: 788, marge: 16 };

  it('ne bouge pas pour une carte déjà entière dans la fenêtre', () => {
    expect(defilementVersLaCarte({ haut: 120, bas: 500, ...fenetre })).toBe(0);
  });

  // Au premier plan, la relecture remet le cap devant les pistes : la carte qu'on vient d'engager
  // descend sous la barre d'onglets. Juste assez pour son bas, comme la liste.
  it('descend juste assez pour une carte passée sous la barre', () => {
    expect(defilementVersLaCarte({ haut: 700, bas: 1060, ...fenetre })).toBe(1060 + 16 - 788);
  });

  // Plus haute que la fenêtre : son titre gagne, il ne passe jamais sous la bande.
  it('garde le titre sous la bande quand la carte est plus haute que la fenêtre', () => {
    expect(defilementVersLaCarte({ haut: 300, bas: 1300, ...fenetre })).toBe(300 - 16);
  });

  // Revenu de la liste après un choix, l'action choisie passe en tête des cartes — au-dessus de
  // l'écran qu'on avait laissé défilé jusqu'au lien des pistes.
  it('remonte jusqu’à une carte passée sous la bande, la marge gardée', () => {
    expect(defilementVersLaCarte({ haut: -240, bas: 120, ...fenetre })).toBe(-240 - 16);
  });
});

/**
 * **Un onglet ramène à sa racine — et, déjà là, laisse la barre remonter la page** (audit T-14,
 * 01/10/2026).
 *
 * Éprouvé en le cassant, le 01/10/2026 : toujours `ramenerALaRacine` (l'état d'avant) → « laisse
 * faire… », et « ramène une pile que `toucherDOnglet` laisse ensuite faire » de `pileALaRacine`, qui
 * l'appelle ; la racine reconnue sur `index === 0` sans son nom → « ramène une pile ouverte par un
 * lien… », et « lit l'écran nommé… » de `pileDeLOnglet`, qui l'appelle ; l'écran de devant lu à
 * `routes[0]` sans l'index → « ramène depuis un écran empilé… », seul.
 */
describe('toucherDOnglet', () => {
  it('laisse faire la barre sur un onglet déjà à sa racine, ou dont la pile n’a jamais bougé', () => {
    expect(toucherDOnglet({ index: 0, routes: [{ name: 'index' }] })).toBe('laisserFaire');
    expect(toucherDOnglet(undefined)).toBe('laisserFaire');
  });

  it('ramène depuis un écran empilé sur la racine', () => {
    expect(toucherDOnglet({ index: 1, routes: [{ name: 'index' }, { name: 'pistes' }] })).toBe('ramenerALaRacine');
    // Une pile partielle — d'un lien — n'a pas d'index : l'écran de devant est le dernier.
    expect(toucherDOnglet({ routes: [{ name: 'index' }, { name: 'bilan' }] })).toBe('ramenerALaRacine');
  });

  // Ouverte sur `/plan/pistes`, la pile ne porte que les pistes : l'index vaut zéro, et ce n'est pas
  // la racine. La laisser faire garderait la liste au toucher de « Plan ».
  it('ramène une pile ouverte par un lien sur un écran qui n’est pas sa racine', () => {
    expect(toucherDOnglet({ index: 0, routes: [{ name: 'pistes' }] })).toBe('ramenerALaRacine');
  });
});

/**
 * **La pile d'un onglet, avant qu'elle ait bougé : l'écran que nomment ses paramètres** (audit T-14,
 * 01/10/2026). Le navigateur d'onglets ne porte le `state` d'une pile qu'à son premier changement ; une
 * pile ouverte sur un écran nommé — la restitution, que le questionnaire ouvre dans la pile du suivi —
 * n'a que ses paramètres. Relevé par le parcours réel : la lire « absente » laissait « Suivi » rouvrir la
 * restitution.
 *
 * Éprouvé en le cassant, le 01/10/2026 : les paramètres ignorés (`return onglet.state`) → « lit l'écran
 * nommé… », seul ; les paramètres préférés au `state` → « préfère la pile… », seul.
 */
describe('pileDeLOnglet', () => {
  it('lit l’écran nommé à l’ouverture quand la pile n’a pas encore de `state`', () => {
    const onglet = { params: { screen: 'bilan', params: { id: 'b1', nouveau: '1' } } };
    expect(pileDeLOnglet(onglet)).toEqual({ index: 0, routes: [{ name: 'bilan' }] });
    expect(toucherDOnglet(pileDeLOnglet(onglet))).toBe('ramenerALaRacine');
  });

  it('préfère la pile qui a bougé aux paramètres qui l’ont ouverte', () => {
    const pile = { index: 0, routes: [{ name: 'index' }] };
    expect(pileDeLOnglet({ state: pile, params: { screen: 'bilan' } })).toBe(pile);
  });

  it('ne sait rien d’un onglet sans `state` ni écran nommé', () => {
    expect(pileDeLOnglet({ params: {} })).toBeUndefined();
    expect(pileDeLOnglet(undefined)).toBeUndefined();
  });
});

/**
 * **Ramener un onglet à sa racine, c'est poser sa seule racine — la même, si elle y était** (audit
 * T-14, 01/10/2026). Le layout nommait la racine, ce qui l'empilait sous React Navigation 7 ; il pose
 * désormais cette pile dans l'état des onglets. La clé gardée est ce qui laisse l'écran du plan monté,
 * sans relecture, quand on revient des pistes.
 *
 * Éprouvé en le cassant, le 01/10/2026 : la racine toujours neuve (`[{ name: racine }]`) → « garde la
 * route… », seul ; la pile gardée telle quelle (`routes: [...pile.routes]`) → « garde la route… » et
 * « pose la racine sous une pile… », seuls.
 */
describe('pileALaRacine', () => {
  // Les pistes laissées ouvertes sur le plan : le plan revient, le même, et rien dessus.
  it('garde la route de la racine, clé comprise, et rien d’autre', () => {
    const pile = {
      index: 1,
      routes: [
        { name: 'index', key: 'index-1' },
        { name: 'pistes', key: 'pistes-2' },
      ],
    };
    expect(pileALaRacine(pile)).toEqual({ index: 0, routes: [{ name: 'index', key: 'index-1' }] });
  });

  // La restitution que le questionnaire ouvre seule dans la pile du suivi : la racine n'y est pas,
  // elle se pose neuve.
  it('pose la racine sous une pile qui ne la porte pas', () => {
    expect(pileALaRacine({ index: 0, routes: [{ name: 'bilan', key: 'bilan-1' }] })).toEqual({
      index: 0,
      routes: [{ name: 'index' }],
    });
    expect(pileALaRacine(undefined)).toEqual({ index: 0, routes: [{ name: 'index' }] });
  });

  it('ramène une pile que `toucherDOnglet` laisse ensuite faire', () => {
    const pile = { routes: [{ name: 'index', key: 'index-1' }, { name: 'bilan', key: 'bilan-2' }] };
    expect(toucherDOnglet(pileALaRacine(pile))).toBe('laisserFaire');
  });
});
