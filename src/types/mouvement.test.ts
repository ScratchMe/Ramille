import { BILAN_STEP_ORDER } from '@/types/bilan';
import {
  animationDesOnglets,
  barreArrive,
  decalageDEntree,
  defilementPourMontrer,
  delaiEchelonne,
  etatDuRecit,
  dureeSelonLaPreference,
  finDuMouvement,
  hauteurSAnime,
  sensDuPassage,
} from '@/types/mouvement';

// Ce qui décide d'une animation (27/09/2026, `v1-30` §4.3). Chaque fonction est petite, et chacune
// porte une moitié qu'on casserait en simplifiant : le `null` du montage pour le sens, le passage
// strict de masquée à visible pour la barre.
//
// **Ce que ce test ne garde pas** : que les écrans les appellent avec les bons arguments — un test
// garde la fonction, jamais ses appels (`FRONT.md` §1.1). Ce sont les gardes de l'export et du
// parcours réel qui regardent ce qui bouge vraiment (`v1-30` §5).
//
// **Éprouvé en le cassant le 27/09/2026**, une mutation à la fois, l'état d'avant réécrit ensuite :
//
//   | Ce qu'on casse | Ce qui tombe |
//   |---|---|
//   | le sens lu à l'envers (`arrivee < depart`) | « avancer vient de la droite » et « un saut dit d'où il vient » |
//   | plus de `null` sur place (`de === vers` retiré) | « au montage, aucun sens » — seulement |
//   | une étape hors de l'ordre prise pour la première | « une étape qu'on ne sait pas placer n'a pas de côté » — seulement |
//   | le décalage d'un recul positif | « reculer vient de la gauche » — seulement |
//   | la barre qui glisse dès qu'elle est visible (`apres` seul) | « au démarrage, la barre est posée » — seulement |
//   | les onglets en fondu même sous la préférence | « sous la préférence, aucun fondu » — seulement |
//   | la durée gardée sous la préférence | « sous la préférence, la durée est nulle » — seulement |

describe('sensDuPassage', () => {
  test('avancer vient de la droite, reculer de la gauche', () => {
    expect(sensDuPassage('commute_has_trip', 'commute_days_distance', BILAN_STEP_ORDER)).toBe('avant');
    expect(sensDuPassage('commute_days_distance', 'commute_has_trip', BILAN_STEP_ORDER)).toBe('arriere');
    expect(decalageDEntree('avant', 8)).toBe(8);
  });

  test('un saut dit d’où il vient, quel que soit le nombre d’étapes franchies', () => {
    // Un saut de plusieurs étapes, dans un sens puis dans l'autre. (« Repartir de mon dernier bilan »
    // n'en est pas un : l'étape arrive d'un autre écran, et se pose — `src/app/bilan/index.tsx`.)
    expect(sensDuPassage('context', 'commute_has_trip', BILAN_STEP_ORDER)).toBe('arriere');
    expect(sensDuPassage('commute_has_trip', 'context', BILAN_STEP_ORDER)).toBe('avant');
  });

  test('au montage, aucun sens : la première étape ne glisse pas', () => {
    expect(sensDuPassage(null, 'commute_has_trip', BILAN_STEP_ORDER)).toBeNull();
    expect(sensDuPassage('context', 'context', BILAN_STEP_ORDER)).toBeNull();
    expect(decalageDEntree(null, 8)).toBe(0);
  });

  test('une étape qu’on ne sait pas placer n’a pas de côté', () => {
    expect(sensDuPassage('inconnue', 'context', ['commute_has_trip', 'context'])).toBeNull();
    expect(sensDuPassage('context', 'inconnue', ['commute_has_trip', 'context'])).toBeNull();
  });
});

describe('decalageDEntree', () => {
  test('reculer vient de la gauche', () => {
    expect(decalageDEntree('arriere', 8)).toBe(-8);
  });
});

describe('barreArrive', () => {
  test('la barre glisse quand elle passe de masquée à visible', () => {
    expect(barreArrive(false, true)).toBe(true);
  });

  test('au démarrage, la barre est posée : l’état d’avant est inconnu', () => {
    expect(barreArrive(null, true)).toBe(false);
    expect(barreArrive(true, true)).toBe(false);
  });

  test('une barre qui disparaît ne s’anime pas', () => {
    expect(barreArrive(true, false)).toBe(false);
    expect(barreArrive(false, false)).toBe(false);
    expect(barreArrive(null, false)).toBe(false);
  });
});

describe('ce que la bibliothèque ne coupe pas d’elle-même', () => {
  test('les onglets passent en fondu', () => {
    expect(animationDesOnglets(false)).toBe('fade');
  });

  test('sous la préférence, aucun fondu entre les onglets', () => {
    expect(animationDesOnglets(true)).toBe('none');
  });

  test('la durée est gardée sans la préférence', () => {
    expect(dureeSelonLaPreference(250, false)).toBe(250);
  });

  test('sous la préférence, la durée est nulle', () => {
    expect(dureeSelonLaPreference(250, true)).toBe(0);
  });
});

/**
 * **Une hauteur ne s'anime pas sur Android** (03/10/2026, recette du build d'octobre, lignes 01.4 à
 * 01.8). Ce test garde le calcul, pas l'appel : que `Depliage` et `HauteurSuivie` le lisent, et que
 * l'écran des pistes défile tout de suite là où rien ne grandit, seul un téléphone le montre — les
 * gardes de l'export ne jouent que le web.
 *
 * **Éprouvé en le cassant le 03/10/2026**, une mutation sur un fichier égal au commit, restauré depuis
 * sa copie : la fonction qui rend toujours `true` fait tomber « pose sur Android » — seulement.
 */
describe('hauteurSAnime', () => {
  it('pose sur Android', () => {
    expect(hauteurSAnime('android')).toBe(false);
  });

  it('anime sur le web, où ses gardes la relèvent image par image', () => {
    expect(hauteurSAnime('web')).toBe(true);
  });
});

/**
 * **Le défilement jusqu'à « C'est noté »** (29/09/2026, `v1-32` §4.4, planche B2) : juste assez pour
 * montrer le bas de la carte ouverte, jamais au point de faire passer son titre sous la bande.
 *
 * Ce test garde le calcul, pas l'appel : que l'écran mesure la **carte** et non son `HauteurSuivie`,
 * qu'il attende le repli d'une carte ouverte au-dessus, et qu'il ne défile pas en chemin sous la
 * préférence, c'est le parcours réel qui le regarde, image par image.
 *
 * **Éprouvé en le cassant le 29/09/2026**, une mutation à la fois sur un fichier égal au commit,
 * restauré depuis sa copie :
 *
 *   | Ce qu'on casse | Ce qui tombe |
 *   |---|---|
 *   | le haut n'arrête plus rien | « arrête le haut sous le bord » et « ne remonte jamais » |
 *   | la marge oubliée en bas | « défile juste assez » — seulement |
 *   | la marge oubliée en haut | « arrête le haut sous le bord » et « ne remonte jamais » |
 *   | plus de plancher à zéro | « ne défile pas quand le bas est déjà dans la fenêtre » et « ne remonte jamais » |
 */
describe('defilementPourMontrer', () => {
  const fenetre = { hauteurFenetre: 700, marge: 16 };

  test('ne défile pas quand le bas est déjà dans la fenêtre, marge comprise', () => {
    expect(defilementPourMontrer({ ...fenetre, haut: 100, bas: 684 })).toBe(0);
    expect(defilementPourMontrer({ ...fenetre, haut: 100, bas: 300 })).toBe(0);
  });

  test('défile juste assez pour montrer le bas, marge comprise', () => {
    expect(defilementPourMontrer({ ...fenetre, haut: 400, bas: 800 })).toBe(116);
  });

  // Une carte plus haute que ce qui reste : le titre s'arrête sous le bord, à la marge, et le bas
  // attend le doigt — B2 interdit que le titre passe sous la bande.
  test('arrête le haut sous le bord quand le bloc ne tient pas', () => {
    expect(defilementPourMontrer({ ...fenetre, haut: 200, bas: 1200 })).toBe(184);
  });

  // Une ligne touchée alors qu'elle dépassait déjà du haut : ouvrir vers le bas ne remonte jamais
  // la page, et ne défile pas non plus plus loin.
  test('ne remonte jamais la page, et ne descend pas quand le haut est déjà au bord', () => {
    expect(defilementPourMontrer({ ...fenetre, haut: 10, bas: 900 })).toBe(0);
    expect(defilementPourMontrer({ ...fenetre, haut: -40, bas: 900 })).toBe(0);
  });
});

// Le remplissage échelonné du récit de la page d'accueil (`v1-36` §4). Éprouvé en le cassant, le
// 31/10/2026 : l'étendue prise sans retrancher la durée de chacun (`total` au lieu de `total - duree`) fait
// tomber les quatre ; la borne retirée fait tomber « un rang hors de la série », seul.
describe('delaiEchelonne', () => {
  it('le premier part tout de suite, et le dernier finit à l’heure, sa durée comprise', () => {
    expect(delaiEchelonne(0, 53, 1200, 200)).toBe(0);
    expect(delaiEchelonne(52, 53, 1200, 200) + 200).toBe(1200);
  });

  it('les rangs se répartissent également', () => {
    expect(delaiEchelonne(26, 53, 1200, 200)).toBe(500);
  });

  it('un rang hors de la série est borné, jamais négatif ni au-delà du dernier', () => {
    expect(delaiEchelonne(-3, 53, 1200, 200)).toBe(0);
    expect(delaiEchelonne(80, 53, 1200, 200)).toBe(1000);
  });

  it('un seul élément, ou une durée plus longue que le total, part sans délai', () => {
    expect(delaiEchelonne(0, 1, 1200, 200)).toBe(0);
    expect(delaiEchelonne(5, 10, 100, 200)).toBe(0);
  });
});

// L'état d'une figure du récit (`v1-36` §4). Éprouvé en le cassant, le 31/10/2026 : la préférence lue après
// `vu` (`if (etat.vu) return 'animee'` d'abord) fait tomber « sous la préférence, posée » ; l'état de départ
// remplacé par `posee` fait tomber « avant de paraître ».
describe('etatDuRecit', () => {
  it('sous la préférence, posée, que la figure ait paru ou non', () => {
    expect(etatDuRecit({ vu: false, reduit: true })).toBe('posee');
    expect(etatDuRecit({ vu: true, reduit: true })).toBe('posee');
  });

  it('avant de paraître, l’état de départ ; une fois parue, l’animation', () => {
    expect(etatDuRecit({ vu: false, reduit: false })).toBe('depart');
    expect(etatDuRecit({ vu: true, reduit: false })).toBe('animee');
  });
});

// Quand une scène s'arrête (`v1-36` §4, la scène de l'été). Éprouvé en le cassant, le 31/10/2026 : la répétition
// oubliée (`g.delai + g.duree`) fait tomber « un geste qui se répète » et « un geste sans fin » ; le départ oublié
// (`g.duree * g.fois`) fait tomber « la fin du dernier geste » et « un geste qui se répète ».
describe('finDuMouvement', () => {
  const geste = { element: 'e', images: 'i', courbe: 'douce' } as const;

  it('la fin du dernier geste, pas du plus long', () => {
    expect(
      finDuMouvement([
        { ...geste, duree: 1400, delai: 0, fois: 1 },
        { ...geste, duree: 1000, delai: 2100, fois: 1 },
      ])
    ).toBe(3100);
  });

  it('un geste qui se répète compte chacune de ses fois', () => {
    expect(finDuMouvement([{ ...geste, duree: 550, delai: 600, fois: 4 }])).toBe(2800);
  });

  it('un geste sans fin rend l’infini, et une scène vide s’arrête tout de suite', () => {
    expect(finDuMouvement([{ ...geste, duree: 500, delai: 0, fois: Infinity }])).toBe(Infinity);
    expect(finDuMouvement([])).toBe(0);
  });
});
