// Un groupe de cases d'option au clavier (25/09/2026, `v1-29` §6.4) — les trois décisions que
// `src/lib/groupe-au-clavier.ts` applique au navigateur. Le geste lui-même, à travers react-native-web
// et avec une précision imbriquée, est éprouvé par `scripts/verifier-etats-export.mjs` (section I) :
// ce fichier garde les branches que l'export ne provoque pas à coup sûr — les modificateurs, les
// options désactivées, la boucle aux deux bouts, un groupe sans option choisissable, et une touche
// venue d'un contrôle qui n'est pas une option du groupe — le choix du canal en porte, « Rattacher un
// compte » et le lien des réglages du téléphone, mais dans « Toi » et dans la feuille des rappels,
// qui demandent une session.
//
// **Éprouvé en le cassant le 25/09/2026**, une mutation à la fois, l'état d'avant réécrit ensuite :
//
//   | Ce qu'on casse | Ce qui tombe |
//   |---|---|
//   | les modificateurs ignorés | « une flèche accompagnée d'un modificateur… » — seulement |
//   | `ArrowRight` oubliée | « droite avance, gauche recule » — seulement |
//   | la boucle retirée (on s'arrête au bout) | « boucle du dernier au premier… » **et** « saute les options désactivées, bout du groupe compris » |
//   | les désactivées non sautées | « saute les options désactivées… » **et** « rien quand toutes les autres… » |
//   | une cochée désactivée gardée pour arrêt | « une cochée désactivée n'est pas l'arrêt » **et** « aucun arrêt quand rien ne peut être choisi » |
//   | l'arrêt toujours sur la première | « l'arrêt est l'option cochée » — seulement |
//   | `effetDeLaFleche` retient une touche venue d'ailleurs (`courante` à -1) | « une touche venue d'ailleurs n'est pas retenue » — seulement |
//   | `effetDeLaFleche` ne retient pas une flèche sans voisine | « une flèche est retenue même sans voisine » — seulement |
import {
  arretDeTabulation,
  effetDeLaFleche,
  optionVoisine,
  sensDeLaTouche,
  type OptionDuGroupe,
} from '@/types/groupe-au-clavier';

const libre: OptionDuGroupe = { cochee: false, desactivee: false };
const cochee: OptionDuGroupe = { cochee: true, desactivee: false };
const desactivee: OptionDuGroupe = { cochee: false, desactivee: true };

describe('sensDeLaTouche', () => {
  it('bas avance, haut recule', () => {
    expect(sensDeLaTouche({ key: 'ArrowDown' })).toBe(1);
    expect(sensDeLaTouche({ key: 'ArrowUp' })).toBe(-1);
  });

  it('droite avance, gauche recule — une grille se parcourt dans l’ordre de lecture', () => {
    expect(sensDeLaTouche({ key: 'ArrowRight' })).toBe(1);
    expect(sensDeLaTouche({ key: 'ArrowLeft' })).toBe(-1);
  });

  it('une autre touche ne déplace rien — Entrée et Espace restent aux options', () => {
    for (const key of ['Enter', ' ', 'Tab', 'Home', 'a']) expect(sensDeLaTouche({ key })).toBeNull();
  });

  it('une flèche accompagnée d’un modificateur ne déplace rien — Alt + gauche est le retour du navigateur', () => {
    for (const modificateur of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'] as const) {
      expect(sensDeLaTouche({ key: 'ArrowLeft', [modificateur]: true })).toBeNull();
    }
  });
});

describe('optionVoisine', () => {
  it('avance et recule d’une option', () => {
    const options = [libre, cochee, libre];
    expect(optionVoisine(options, 1, 1)).toBe(2);
    expect(optionVoisine(options, 1, -1)).toBe(0);
  });

  it('boucle du dernier au premier, et du premier au dernier', () => {
    const options = [libre, libre, libre];
    expect(optionVoisine(options, 2, 1)).toBe(0);
    expect(optionVoisine(options, 0, -1)).toBe(2);
  });

  it('saute les options désactivées, bout du groupe compris', () => {
    const options = [desactivee, cochee, desactivee, libre, desactivee];
    expect(optionVoisine(options, 1, 1)).toBe(3);
    expect(optionVoisine(options, 3, 1)).toBe(1);
    expect(optionVoisine(options, 1, -1)).toBe(3);
  });

  it('rien quand toutes les autres options sont désactivées, ni quand l’option courante est seule', () => {
    expect(optionVoisine([desactivee, cochee, desactivee], 1, 1)).toBeNull();
    expect(optionVoisine([cochee], 0, -1)).toBeNull();
  });

  it('rien quand l’option courante n’est pas du groupe', () => {
    expect(optionVoisine([libre, libre], -1, 1)).toBeNull();
    expect(optionVoisine([libre, libre], 2, -1)).toBeNull();
  });
});

describe('effetDeLaFleche', () => {
  it('une flèche depuis une option la retient et désigne la voisine', () => {
    expect(effetDeLaFleche({ key: 'ArrowDown' }, [cochee, libre], 0)).toEqual({ retenir: true, vers: 1 });
  });

  it('une flèche est retenue même sans voisine à atteindre — la page ne défile pas sous le choix', () => {
    expect(effetDeLaFleche({ key: 'ArrowDown' }, [cochee, desactivee], 0)).toEqual({ retenir: true, vers: null });
  });

  it('une touche venue d’ailleurs n’est pas retenue — une option d’un autre groupe, un bouton posé dans celui-ci', () => {
    expect(effetDeLaFleche({ key: 'ArrowDown' }, [cochee, libre], -1)).toEqual({ retenir: false });
  });

  it('une touche qui ne déplace rien n’est pas retenue', () => {
    expect(effetDeLaFleche({ key: 'Enter' }, [cochee, libre], 0)).toEqual({ retenir: false });
    expect(effetDeLaFleche({ key: 'ArrowDown', altKey: true }, [cochee, libre], 0)).toEqual({ retenir: false });
  });
});

describe('arretDeTabulation', () => {
  it('l’arrêt est l’option cochée, où qu’elle soit', () => {
    expect(arretDeTabulation([libre, libre, cochee])).toBe(2);
  });

  it('sans option cochée, la première qu’on peut choisir', () => {
    expect(arretDeTabulation([libre, libre])).toBe(0);
    expect(arretDeTabulation([desactivee, libre, libre])).toBe(1);
  });

  it('une cochée désactivée n’est pas l’arrêt — le groupe sortirait de la tabulation', () => {
    expect(arretDeTabulation([libre, { cochee: true, desactivee: true }])).toBe(0);
  });

  it('aucun arrêt quand rien ne peut être choisi — le temps d’un enregistrement', () => {
    expect(arretDeTabulation([desactivee, { cochee: true, desactivee: true }])).toBeNull();
    expect(arretDeTabulation([])).toBeNull();
  });
});
