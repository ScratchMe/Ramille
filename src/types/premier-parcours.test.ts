import { RAMILLE } from '@/constants/mascotte';
import {
  etatDuPremierParcours,
  ouvertureDesDeuxLieux,
  ouvreUnPremierParcours,
  SORTIE_DES_DEUX_LIEUX,
  type EtapeDuPremierParcours,
} from '@/types/premier-parcours';

describe('etatDuPremierParcours', () => {
  // La table en entier, quatre lignes : c'est une machine à trois états plus l'absence, et chaque
  // ligne décide de deux choses. L'écrire en toutes lettres vaut mieux qu'un test par cas — ce
  // qu'on veut voir d'un coup d'œil, c'est qu'aucune combinaison n'a été oubliée.
  const table: [EtapeDuPremierParcours | null, boolean, boolean][] = [
    // étape, barre visible, carte des deux lieux
    [null, true, false],
    ['questionnaire', false, false],
    ['barre', true, true],
    ['fait', true, false],
  ];

  it.each(table)('%p → barre %p, carte %p', (etape, barreVisible, carteDesDeuxLieux) => {
    expect(etatDuPremierParcours(etape)).toEqual({ barreVisible, carteDesDeuxLieux });
  });

  // **Le cas qu'il ne faut pas rater**, et il vaut une assertion à lui : appareil neuf d'un compte
  // existant, session retrouvée par lien, installation d'avant ce chantier. La marque autorise une
  // absence de barre, elle ne la présume pas — et `null` couvre aussi le temps de la lecture, qui
  // ne doit rien faire disparaître.
  it('sans marque, la barre est là', () => {
    expect(etatDuPremierParcours(null).barreVisible).toBe(true);
  });

  // Une seule étape masque la barre, et c'est celle où le parcours est en cours. Le jour où une
  // quatrième étape s'ajoute, cette assertion dit s'il faut décider quelque chose pour elle.
  it('ne masque la barre que pendant le questionnaire et le premier plan', () => {
    const masquees = (['questionnaire', 'barre', 'fait'] as const).filter(
      (etape) => !etatDuPremierParcours(etape).barreVisible
    );
    expect(masquees).toEqual(['questionnaire']);
  });
});

// Les quatre plans possibles : deux faits indépendants, l'action et la boucle.
const PLANS = [
  { actions: true, boucle: true },
  { actions: false, boucle: true },
  { actions: true, boucle: false },
  { actions: false, boucle: false },
];

describe('la carte des deux lieux', () => {
  // Elle décrit le produit, pas ce plan-ci : un chiffre ou un nom de poste en ferait une seconde
  // description des cartes posées dessous — le défaut que C5.3 vient de retirer de l'intro.
  it('ne chiffre rien et ne nomme aucun poste, quel que soit le plan', () => {
    for (const plan of PLANS) {
      const { ouverture } = ouvertureDesDeuxLieux(plan);
      const texte = [ouverture.etiquette, ouverture.titre, ouverture.corps].join(' ');
      expect({ plan, texte }).not.toEqual({ plan, texte: expect.stringMatching(/\d/) });
      expect({ plan, texte }).not.toEqual({
        plan,
        texte: expect.stringMatching(/trajet|voyage|sortie|loisir|domicile/i),
      });
    }
  });

  // Elle nomme les **deux** lieux et où ils sont : c'est tout son objet, et une reformulation qui
  // perdrait « en bas » perdrait la seule indication de navigation de la carte.
  it('nomme les deux lieux et où les trouver, quel que soit le plan', () => {
    for (const plan of PLANS) {
      const { corps } = ouvertureDesDeuxLieux(plan).ouverture;
      expect({ plan, corps }).toEqual({ plan, corps: expect.stringMatching(/ton plan/i) });
      expect({ plan, corps }).toEqual({ plan, corps: expect.stringMatching(/ton suivi/i) });
      expect({ plan, corps }).toEqual({ plan, corps: expect.stringMatching(/en bas/i) });
    }
  });

  // Le plan nominal garde la carte d'origine, au caractère près : la décision du 30/09/2026 retire
  // ce qui est faux, elle ne réécrit pas ce qui est vrai.
  it('le plan à actions et à point garde la carte d’origine', () => {
    expect(ouvertureDesDeuxLieux({ actions: true, boucle: true })).toEqual({
      ouverture: {
        etiquette: 'PLAN ET SUIVI',
        titre: 'Deux endroits, pas plus.',
        corps:
          'Ici, ton plan : l’action en cours, le point régulier, ton cap. En bas, ton suivi : tes bilans et tes réponses, saison après saison.',
      },
      ligne: RAMILLE.planEtSuivi,
    });
  });

  // **Décision du 30/09/2026** (`v1-27` §12.23) : elle ne décrit que ce que le plan porte. Les deux
  // textes sont ceux que la personne qui pilote a validés, mot pour mot.
  it('au cycliste, dont le plan n’a pas d’action, elle ne promet pas d’action', () => {
    const { ouverture, ligne } = ouvertureDesDeuxLieux({ actions: false, boucle: true });
    expect(ouverture.corps).toBe(
      'Ici, ton plan : le point régulier et ton cap. En bas, ton suivi : tes bilans et tes réponses, saison après saison.'
    );
    expect(ligne).toBe(RAMILLE.planEtSuivi);
  });

  it('sans boucle ni action, elle ne promet ni action, ni point, ni réponse', () => {
    const { ouverture, ligne } = ouvertureDesDeuxLieux({ actions: false, boucle: false });
    expect(ouverture.corps).toBe('Ici, ton plan : ton cap. En bas, ton suivi : tes bilans, saison après saison.');
    expect(ligne).toBe(RAMILLE.planEtSuiviSansPoint);
  });

  // L'invariant, écrit sur les deux faits et non sur les phrases : chaque promesse n'apparaît que si
  // son fait est là — y compris pour la combinaison qu'on ne rencontre pas (des actions sans boucle).
  //
  // Éprouvé en le cassant, le 30/09/2026 (TESTING.md §1.1), une mutation à la fois :
  //   - « le point régulier » toujours présent → cet invariant et « sans boucle ni action… » ;
  //   - la ligne de Ramille qui suit les actions au lieu de la boucle → cet invariant et « au
  //     cycliste… » — et non le plan sans boucle, où les deux faits sont faux ensemble : c'est le
  //     cycliste qui les sépare ;
  //   - le suivi qui garde « et tes réponses » sans boucle → cet invariant et « sans boucle ni
  //     action… ».
  it('chaque promesse suit son fait, et seulement lui', () => {
    for (const plan of PLANS) {
      const { ouverture, ligne } = ouvertureDesDeuxLieux(plan);
      // Le corps d'une carte d'ouverture peut être nul (celui de la saison) ; celui-ci ne l'est
      // jamais, et une chaîne vide ferait tomber l'assertion du cap.
      const corps = ouverture.corps ?? '';
      expect({ plan, action: /l’action en cours/.test(corps) }).toEqual({ plan, action: plan.actions });
      expect({ plan, point: /point régulier/.test(corps) }).toEqual({ plan, point: plan.boucle });
      expect({ plan, reponses: /réponses/.test(`${corps} ${ligne}`) }).toEqual({
        plan,
        reponses: plan.boucle,
      });
      expect({ plan, cap: /ton cap/.test(corps) }).toEqual({ plan, cap: true });
    }
  });

  it('n’a qu’une sortie, et c’est « Compris »', () => {
    expect(SORTIE_DES_DEUX_LIEUX).toEqual([{ cle: 'compris', label: 'Compris', forme: 'lien' }]);
  });
});

// Décision du 27/09/2026 : retirer son seul bilan efface la marque de bilan, et le
// bilan suivant ne doit pas faire recommencer un parcours que l'appareil a déjà vu.
//
// Éprouvé le 27/09/2026 : la règle d'avant (`!aDejaVuUnBilan` seul) fait tomber le second test, et
// lui seul.
describe('ouvreUnPremierParcours', () => {
  it('ouvre un premier parcours sur un appareil qui n’a vu ni bilan ni parcours', () => {
    expect(ouvreUnPremierParcours(false, null)).toBe(true);
  });

  it('ne le rouvre pas après le retrait du seul bilan : le parcours a déjà été vu ici', () => {
    expect(ouvreUnPremierParcours(false, 'fait')).toBe(false);
    expect(ouvreUnPremierParcours(false, 'barre')).toBe(false);
    expect(ouvreUnPremierParcours(false, 'questionnaire')).toBe(false);
  });

  it('ne l’ouvre jamais quand un bilan a déjà été vu ici — le re-bilan', () => {
    expect(ouvreUnPremierParcours(true, null)).toBe(false);
    expect(ouvreUnPremierParcours(true, 'fait')).toBe(false);
  });
});
