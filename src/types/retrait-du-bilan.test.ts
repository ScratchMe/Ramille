// Retirer un bilan (C4.7, `v1-22`) — ce que la restitution dit et décide autour du geste.
//
// **Éprouvé en le cassant, le 27/09/2026** (TESTING.md §1.1), une mutation à la fois, remise en
// place par l'opération inverse :
//   - `placeDuBilan` compare au DERNIER de la liste au lieu du premier → 2 tests (« dernier » et
//     « ancien » s'échangent, et l'ordre inversé ne change plus rien) ;
//   - `placeDuBilan` rend `seul` sans vérifier l'appartenance → 1 test (un bilan absent de la liste) ;
//   - le corps d'`ancien` remplacé par celui de `dernier` → 1 test (le plan « repartirait » alors
//     qu'il ne bouge pas) ;
//   - le corps de `seul` dit « ton plan » → 1 test ;
//   - `lectureDuStatut` affiche par défaut → 1 test (un statut inconnu montrerait son chiffre) ;
//   - `issueDuRetrait` lit `RM006` au message plutôt qu'au code → 1 test ;
//   - `apresLeRetrait` reste sur place quand le nombre est inconnu → 1 test.
import {
  apresLeRetrait,
  BILAN_RETIRE,
  CODE_BILAN_NON_RETIRABLE,
  confirmationDuRetrait,
  INDICE_DU_RETRAIT,
  issueDuRetrait,
  lectureDuStatut,
  LIEN_DU_RETRAIT,
  placeDuBilan,
  RETRAIT_ECHOUE,
  type PlaceDuBilan,
} from '@/types/retrait-du-bilan';

const PLACES: PlaceDuBilan[] = ['seul', 'dernier', 'ancien'];

describe('la place du bilan parmi les bilans valides', () => {
  it('le seul bilan valide', () => {
    expect(placeDuBilan('a', ['a'])).toBe('seul');
  });

  it('le plus récent, quand il en reste d’autres — celui qui porte le plan', () => {
    expect(placeDuBilan('c', ['c', 'b', 'a'])).toBe('dernier');
  });

  it('un plus ancien : un bilan plus récent porte le plan', () => {
    expect(placeDuBilan('a', ['c', 'b', 'a'])).toBe('ancien');
    expect(placeDuBilan('b', ['c', 'b', 'a'])).toBe('ancien');
  });

  // **L'ordre est le contrat**, porté par le nom du paramètre : c'est celui de
  // `generate_plan_cycle_for_user`, qui bâtit le plan sur le dernier bilan valide.
  it('lit la liste du plus récent au plus ancien, et l’ordre change la réponse', () => {
    expect(placeDuBilan('a', ['a', 'b'])).toBe('dernier');
    expect(placeDuBilan('a', ['b', 'a'])).toBe('ancien');
  });

  // Un bilan en cours ou déjà retiré n'est pas dans la liste : l'écran ne propose alors rien, plutôt
  // qu'une confirmation dont il ne sait pas quelle phrase est vraie.
  it('rend null pour un bilan qui n’est pas valide, ou une liste vide', () => {
    expect(placeDuBilan('x', ['a', 'b'])).toBeNull();
    expect(placeDuBilan('x', ['a'])).toBeNull();
    expect(placeDuBilan('a', [])).toBeNull();
  });
});

describe('la confirmation', () => {
  it('ne parle pas de plan quand c’est le seul bilan — il n’y en aura plus', () => {
    const { corps } = confirmationDuRetrait('seul');
    expect(corps).not.toMatch(/plan/i);
    expect(corps).toContain('seul bilan');
    // « tu repartiras d'un nouveau bilan » et non « de l'accueil » : la racine peut aussi mener à la
    // reprise d'un questionnaire commencé.
    expect(corps).toContain('tu repartiras d’un nouveau bilan');
    expect(corps).not.toMatch(/accueil|onboarding/i);
  });

  it('dit que le plan repart du bilan précédent quand le bilan retiré le portait', () => {
    const { corps } = confirmationDuRetrait('dernier');
    expect(corps).toContain('ton plan repartira de ton bilan précédent');
  });

  it('ne promet aucun changement de plan quand un bilan plus récent le porte', () => {
    const { corps } = confirmationDuRetrait('ancien');
    expect(corps).toContain('Ton plan ne change pas');
    expect(corps).not.toMatch(/repartira/);
  });

  it('dit dans les trois cas que le bilan quitte le suivi — c’est vrai des trois', () => {
    for (const place of PLACES) {
      expect(confirmationDuRetrait(place).corps).toContain('n’apparaîtra plus dans ton suivi');
    }
  });

  it('garde les mêmes boutons et le même titre dans les trois cas', () => {
    for (const place of PLACES) {
      const { titre, confirmer, enCours, annuler } = confirmationDuRetrait(place);
      expect({ titre, confirmer, enCours, annuler }).toEqual({
        titre: 'Retirer ce bilan ?',
        confirmer: 'Retirer ce bilan',
        enCours: 'Retrait…',
        annuler: 'Annuler',
      });
    }
  });
});

describe('ce que la restitution fait du statut', () => {
  it('affiche un bilan complété', () => {
    expect(lectureDuStatut('completed')).toBe('afficher');
  });

  it('reconnaît un bilan retiré, dont elle ne montre pas le chiffre', () => {
    expect(lectureDuStatut('withdrawn')).toBe('retire');
  });

  // Un statut qu'on ne sait pas qualifier n'affiche jamais son chiffre par défaut.
  it('n’affiche ni un bilan en cours, ni un statut absent ou inconnu', () => {
    expect(lectureDuStatut('in_progress')).toBe('illisible');
    expect(lectureDuStatut(null)).toBe('illisible');
    expect(lectureDuStatut(undefined)).toBe('illisible');
    expect(lectureDuStatut('archived')).toBe('illisible');
  });
});

describe('l’issue de l’appel', () => {
  it('reconnaît au code le refus d’un bilan qui n’est plus complété', () => {
    expect(issueDuRetrait({ erreur: { code: CODE_BILAN_NON_RETIRABLE }, donnees: null })).toEqual({
      genre: 'etat_change',
    });
  });

  // Au code et jamais au message : un message qui dirait « RM006 » ne reconnaît rien.
  it('ne lit pas le message, et classe tout autre refus en échec', () => {
    expect(issueDuRetrait({ erreur: { code: 'P0002' }, donnees: null })).toEqual({ genre: 'echec' });
    expect(
      issueDuRetrait({ erreur: { code: null, message: 'RM006' } as { code: null }, donnees: null })
    ).toEqual({ genre: 'echec' });
    expect(issueDuRetrait({ erreur: {}, donnees: null })).toEqual({ genre: 'echec' });
  });

  it('rend le nombre de bilans valides qui restent', () => {
    expect(issueDuRetrait({ erreur: null, donnees: 0 })).toEqual({ genre: 'retire', restants: 0 });
    expect(issueDuRetrait({ erreur: null, donnees: 2 })).toEqual({ genre: 'retire', restants: 2 });
  });

  it('ne devine pas un nombre qu’il ne sait pas lire', () => {
    for (const donnees of [null, undefined, -1, 1.5, '1', {}]) {
      expect(issueDuRetrait({ erreur: null, donnees })).toEqual({ genre: 'retire', restants: null });
    }
  });
});

describe('après le retrait', () => {
  it('rejoint la racine quand il ne reste aucun bilan valide (D3)', () => {
    expect(apresLeRetrait(0)).toBe('racine');
  });

  it('reste sur la restitution quand il en reste', () => {
    expect(apresLeRetrait(1)).toBe('sur_place');
    expect(apresLeRetrait(3)).toBe('sur_place');
  });

  // La racine relit le serveur et route juste dans les deux cas ; rester sur place garderait la
  // marque locale, qui promettrait un plan hors ligne à quelqu'un qui n'a peut-être plus de bilan.
  it('rejoint la racine quand le nombre est inconnu', () => {
    expect(apresLeRetrait(null)).toBe('racine');
  });
});

describe('les phrases', () => {
  const toutes = [
    LIEN_DU_RETRAIT,
    INDICE_DU_RETRAIT,
    RETRAIT_ECHOUE,
    BILAN_RETIRE.titre,
    BILAN_RETIRE.corps,
    BILAN_RETIRE.sortie,
    ...PLACES.flatMap((place) => Object.values(confirmationDuRetrait(place))),
  ];

  it('le lien porte le libellé décidé (D4) : ce que la personne pense, pas une destruction', () => {
    expect(LIEN_DU_RETRAIT).toBe('Ce bilan ne me ressemble pas');
    expect(LIEN_DU_RETRAIT).not.toMatch(/supprim/i);
  });

  // L'adresse d'un bilan retiré peut s'ouvrir quand il ne reste plus aucun bilan : son état ne peut
  // donc pas parler d'un plan.
  it('l’état « retiré » ne parle pas de plan, et ne dit pas le chiffre', () => {
    expect(`${BILAN_RETIRE.titre} ${BILAN_RETIRE.corps}`).not.toMatch(/plan/i);
  });

  it('aucune ne porte de chiffre ni d’apostrophe droite', () => {
    for (const phrase of toutes) {
      expect(phrase).not.toMatch(/\d/);
      expect(phrase).not.toContain("'");
    }
  });
});
