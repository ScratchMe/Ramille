import {
  MASCOT_MIN_FACE_SIZE,
  mascotFaceGeometry,
  mascotSeasonGeometry,
  opticalScale,
  type MascotMood,
  type MascotSeasonElement,
} from './mascot';
import { SAISONS, type Saison } from './saison';

const MOODS: MascotMood[] = ['calm', 'happy', 'encouraging', 'thinking', 'resting'];

// Tailles réellement utilisées dans l'app (grep `<Mascot`), plus les bornes.
const USED_SIZES = [28, 36, 40, 44, 56];

// Un trait fin est mangé par l'antialiasing bien avant de disparaître : sous ~1,3px il ne
// reste qu'un gris pâle. C'est ce seuil, et pas la disparition pure, que le test défend.
const MIN_STROKE_PX = 1.3;
const MIN_EYE_DIAMETER_PX = 2.6;

const px = (units: number, size: number) => (units * size) / 100;

const tailles = (de: number, a: number) => Array.from({ length: a - de + 1 }, (_, i) => de + i);

describe('mascotFaceGeometry', () => {
  it('garde tous les traits du visage au-dessus du seuil de lisibilité', () => {
    for (const mood of MOODS) {
      for (let size = MASCOT_MIN_FACE_SIZE; size <= 96; size += 1) {
        const face = mascotFaceGeometry(mood, size);
        expect(px(face.mouthStrokeWidth, size)).toBeGreaterThanOrEqual(MIN_STROKE_PX);
        if (face.eyes === 'dots') {
          expect(px(face.eyeCircles[0].r * 2, size)).toBeGreaterThanOrEqual(MIN_EYE_DIAMETER_PX);
        } else {
          expect(px(face.eyeStrokeWidth, size)).toBeGreaterThanOrEqual(MIN_STROKE_PX);
        }
      }
    }
  });

  it("n'affiche pas de visage sous le plancher de lisibilité", () => {
    // Le cas historique : `size={22}` dans l'en-tête du questionnaire. Mieux vaut la feuille
    // seule qu'un visage réduit à une tache.
    for (const mood of MOODS) {
      expect(mascotFaceGeometry(mood, MASCOT_MIN_FACE_SIZE - 1).visible).toBe(false);
      expect(mascotFaceGeometry(mood, 16).visible).toBe(false);
      expect(mascotFaceGeometry(mood, MASCOT_MIN_FACE_SIZE).visible).toBe(true);
    }
  });

  it('ne grossit plus le visage une fois la taille nominale atteinte', () => {
    // Au-delà, le dessin est déjà lisible : le grossir donnerait deux mascottes différentes
    // selon l'écran.
    for (const mood of MOODS) {
      const nominal = mascotFaceGeometry(mood, 42);
      for (const size of [42, 56, 80, 120]) {
        expect(mascotFaceGeometry(mood, size)).toEqual(nominal);
      }
    }
    expect(opticalScale(42)).toBe(1);
    expect(opticalScale(120)).toBe(1);
  });

  it('grossit le visage de façon monotone quand la taille diminue', () => {
    let previous = 0;
    for (let size = 96; size >= MASCOT_MIN_FACE_SIZE; size -= 1) {
      const k = opticalScale(size);
      expect(k).toBeGreaterThanOrEqual(previous);
      previous = k;
    }
    expect(opticalScale(MASCOT_MIN_FACE_SIZE)).toBeGreaterThan(1);
  });

  it('garde les yeux et la bouche disjoints à toutes les tailles', () => {
    for (const mood of MOODS) {
      for (const size of USED_SIZES) {
        const face = mascotFaceGeometry(mood, size);
        // Un arc `happy` se courbe vers le haut : sa flèche négative ne descend pas sous
        // ses extrémités, seul le demi-trait le fait.
        const eyeBottom =
          face.eyes === 'dots'
            ? face.eyeCircles[0].cy + face.eyeCircles[0].r
            : face.eyeCircles[0].cy + Math.max(0, mascotArcDepth(face)) + face.eyeStrokeWidth / 2;
        const mouthTop = mouthTopY(face) - face.mouthStrokeWidth / 2;
        expect(eyeBottom).toBeLessThan(mouthTop);
      }
    }
  });

  it('garde les yeux et la bouche dans la silhouette de la feuille', () => {
    // Les joues, elles, ont le droit d'affleurer le bord : le composant les découpe par un
    // clipPath. Pas les yeux ni la bouche, qu'un rognage rendrait difformes.
    for (const mood of MOODS) {
      for (const size of USED_SIZES) {
        const face = mascotFaceGeometry(mood, size);
        const eye = face.eyeCircles[1];
        const eyeRight =
          face.eyes === 'dots' ? eye.cx + eye.r : eye.cx + arcHalfWidth(face) + face.eyeStrokeWidth / 2;
        expect(eyeRight).toBeLessThanOrEqual(leafRightEdgeAt(eye.cy));
        expect(mouthRightX(face) + face.mouthStrokeWidth / 2).toBeLessThanOrEqual(
          leafRightEdgeAt(mouthTopY(face))
        );
      }
    }
  });

  it('reste symétrique, au décalage de regard près', () => {
    // `thinking` porte la seule asymétrie assumée du visage : le regard est décalé d'une unité
    // sur le côté, ce qui le fait lire « elle réfléchit » plutôt que « elle fixe le plafond ».
    // Le test tolère donc un petit décalage commun aux deux yeux, mais rien d'autre : les
    // joues restent exactement symétriques, et les deux yeux gardent la même hauteur.
    for (const mood of MOODS) {
      for (const size of USED_SIZES) {
        const face = mascotFaceGeometry(mood, size);
        const centreDuRegard = (face.eyeCircles[0].cx + face.eyeCircles[1].cx) / 2;
        expect(Math.abs(centreDuRegard - 50)).toBeLessThanOrEqual(mood === 'thinking' ? 1.5 : 0.01);
        expect(face.blushCircles[0].cx + face.blushCircles[1].cx).toBeCloseTo(100, 5);
        expect(face.eyeCircles[0].cy).toBeCloseTo(face.eyeCircles[1].cy, 5);
      }
    }
  });
});

// --- helpers de lecture des chemins générés -------------------------------------------

function pathPoints(d: string): { x: number; y: number }[] {
  return [...d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));
}

function mouthTopY(face: ReturnType<typeof mascotFaceGeometry>): number {
  return pathPoints(face.mouthPath)[0].y;
}

function mouthRightX(face: ReturnType<typeof mascotFaceGeometry>): number {
  const points = pathPoints(face.mouthPath);
  return points[points.length - 1].x;
}

function arcHalfWidth(face: ReturnType<typeof mascotFaceGeometry>): number {
  const points = pathPoints(face.eyeArcs[0]);
  return (points[points.length - 1].x - points[0].x) / 2;
}

function mascotArcDepth(face: ReturnType<typeof mascotFaceGeometry>): number {
  const points = pathPoints(face.eyeArcs[0]);
  return (points[1].y - points[0].y) / 2;
}

// Bord droit de la silhouette (la cubique de LEAF_PATH) à une ordonnée donnée, par
// échantillonnage — plus sûr qu'une borne écrite à la main qui deviendrait fausse si la
// silhouette bougeait.
function leafRightEdgeAt(y: number): number {
  const bezier = (t: number, a: number, b: number, c: number, d: number) =>
    (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;
  let best = 0;
  for (let i = 0; i <= 2000; i += 1) {
    const t = i / 2000;
    if (Math.abs(bezier(t, 8, 26, 56, 92) - y) < 0.5) {
      best = Math.max(best, bezier(t, 50, 78, 84, 50));
    }
  }
  return best;
}

// Ce bloc est un garde-fou de non-régression du dessin, pas de la lisibilité : la
// compensation optique a été introduite en reparamétrant des chemins SVG qui étaient
// jusque-là écrits à la main. La conversion s'est trompée une fois (le point de contrôle
// d'une quadratique est à 2× la flèche voulue, ce qui avait doublé la courbure des yeux
// `happy`), et le calcul seul ne pouvait pas le voir — seul l'œil, puis ce test.
describe('mascotFaceGeometry — conformité au dessin d\'origine', () => {
  // `calm`, `happy` et `encouraging` viennent des chemins écrits à la main dans le composant
  // d'origine ; `thinking` et `resting` du canvas de design (docs/design/v1-08-mascotte,
  // Mascot.dc.html), qui fait référence pour elles. La bouche de `thinking` y est écrite
  // `M45,63 L55,63` : une quadratique de flèche nulle rend le même trait droit, et on ne
  // maintient qu'une seule construction.
  const ORIGINAL = {
    calm: { mouth: 'M42,62 Q50,68 58,62', eyeCircles: [{ cx: 39, cy: 50, r: 4.2 }, { cx: 61, cy: 50, r: 4.2 }] },
    happy: { mouth: 'M40,60 Q50,72 60,60', eyeArcs: ['M34,49 Q39,44 44,49', 'M56,49 Q61,44 66,49'] },
    encouraging: { mouth: 'M43,63 Q50,66 57,63', eyeArcs: ['M35,51 Q39,54 43,51', 'M57,51 Q61,54 65,51'] },
    thinking: { mouth: 'M45,63 Q50,63 55,63', eyeCircles: [{ cx: 38, cy: 47, r: 4.2 }, { cx: 60, cy: 47, r: 4.2 }] },
    resting: { mouth: 'M44,63 Q50,66 56,63', eyeArcs: ['M34,50 Q39,55 44,50', 'M56,50 Q61,55 66,50'] },
  };

  it('rend exactement les chemins historiques à taille nominale', () => {
    for (const mood of MOODS) {
      const face = mascotFaceGeometry(mood, 56);
      expect(face.mouthPath).toBe(ORIGINAL[mood].mouth);
      if (face.eyes === 'dots') {
        expect(face.eyeCircles).toEqual(
          (ORIGINAL[mood] as { eyeCircles: { cx: number; cy: number; r: number }[] }).eyeCircles
        );
      } else {
        expect(face.eyeArcs).toEqual((ORIGINAL[mood] as { eyeArcs: string[] }).eyeArcs);
      }
      expect(face.eyeStrokeWidth).toBe(3.4);
      expect(face.mouthStrokeWidth).toBe(3.2);
      expect(face.veinStrokeWidth).toBe(4);
    }
  });

  it('conserve les joues de chaque expression à taille nominale', () => {
    expect(mascotFaceGeometry('thinking', 56).blushCircles).toEqual([
      { cx: 33, cy: 61, r: 4.6 },
      { cx: 67, cy: 61, r: 4.6 },
    ]);
    expect(mascotFaceGeometry('resting', 56).blushCircles).toEqual([
      { cx: 33, cy: 60, r: 5 },
      { cx: 67, cy: 60, r: 5 },
    ]);
  });

  it('conserve les joues historiques à taille nominale', () => {
    expect(mascotFaceGeometry('calm', 56).blushCircles).toEqual([
      { cx: 33, cy: 60, r: 5 },
      { cx: 67, cy: 60, r: 5 },
    ]);
    expect(mascotFaceGeometry('happy', 56).blushCircles).toEqual([
      { cx: 33, cy: 59, r: 5.4 },
      { cx: 67, cy: 59, r: 5.4 },
    ]);
  });
});

// --- Les accessoires de saison (C2.13) --------------------------------------------------

const SAISONS_AVEC_ACCESSOIRE: Saison[] = ['hiver', 'printemps', 'ete'];

describe('mascotSeasonGeometry', () => {
  it('ne pose rien sous le plancher de lisibilité, ni sans saison', () => {
    // Même règle que le visage, et pour la même raison : la feuille seule reste la feuille
    // seule. Un bonnet sur une feuille sans visage n'est plus un bonnet, c'est une tache.
    for (const saison of SAISONS) {
      expect(mascotSeasonGeometry(saison, MASCOT_MIN_FACE_SIZE - 1)).toEqual([]);
      expect(mascotSeasonGeometry(saison, 16)).toEqual([]);
    }
    for (const size of USED_SIZES) {
      expect(mascotSeasonGeometry(null, size)).toEqual([]);
    }
  });

  it("rend un accessoire pour trois saisons, et rien pour l'automne", () => {
    // L'automne ne pose rien **par-dessus** le visage : il reprend ses joues, à l'intérieur du
    // groupe découpé (cf. `mascotFaceGeometry`). Une seconde couche de joues, non découpée
    // celle-là, se verrait au bord de la feuille — d'où la liste vide, qui n'est pas un oubli.
    for (const saison of SAISONS_AVEC_ACCESSOIRE) {
      expect(mascotSeasonGeometry(saison, MASCOT_MIN_FACE_SIZE).length).toBeGreaterThan(0);
    }
    for (const size of USED_SIZES) {
      expect(mascotSeasonGeometry('automne', size)).toEqual([]);
    }
  });

  it('garde chaque élément au-dessus du seuil de lisibilité', () => {
    for (const saison of SAISONS_AVEC_ACCESSOIRE) {
      for (let size = MASCOT_MIN_FACE_SIZE; size <= 96; size += 1) {
        for (const element of mascotSeasonGeometry(saison, size)) {
          if (element.forme === 'trait') {
            expect(px(element.epaisseur, size)).toBeGreaterThanOrEqual(MIN_STROKE_PX);
          }
          if (element.forme === 'cercle') {
            expect(px(element.r * 2, size)).toBeGreaterThanOrEqual(MIN_STROKE_PX);
          }
        }
      }
    }
  });

  it('garde chaque élément dans le viewBox, à toutes les tailles', () => {
    // Ce que le `clipPath` garantissait pour le visage, ce test le garantit pour l'accessoire,
    // qui n'est **pas** découpé : le pompon se porte au-dessus de la feuille et la goutte se
    // pose près de son bord. Ce qui reste interdit, c'est de sortir du viewBox — le bord du SVG
    // couperait alors le dessin sans que rien ne le signale, et c'est à `k` maximal (donc à la
    // plus petite taille) que le pompon en approche le plus.
    for (const saison of SAISONS_AVEC_ACCESSOIRE) {
      for (let size = MASCOT_MIN_FACE_SIZE; size <= 96; size += 1) {
        for (const boite of mascotSeasonGeometry(saison, size).map(boiteDeLelement)) {
          expect(boite.x0).toBeGreaterThanOrEqual(0);
          expect(boite.y0).toBeGreaterThanOrEqual(0);
          expect(boite.x1).toBeLessThanOrEqual(100);
          expect(boite.y1).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  // **Le test qui a fait déplacer la goutte de rosée.** À la position du canvas, son coin haut
  // arrivait à 0,29 unité du coin de la bouche de `happy` à `size={28}` — 0,08 px, c'est-à-dire
  // collés, et à la taille et à l'expression exactes de l'en-tête du questionnaire à la dernière
  // étape. Aucune assertion de boîte englobante ne l'aurait vu : les deux boîtes ne se croisent
  // pas, ce sont les formes qui se touchent. D'où la distance réelle, échantillonnée.
  it('ne touche ni les yeux ni la bouche, pour chacune des cinq expressions', () => {
    for (const saison of SAISONS_AVEC_ACCESSOIRE) {
      for (const mood of MOODS) {
        // Toutes les tailles jusqu'à la nominale, puis deux grandes : au-delà de 42 px `k` vaut
        // 1, donc la géométrie ne bouge plus (le test voisin l'épingle) et balayer 43 à 96
        // referait cinquante fois le même calcul — celui-ci est le plus cher de la suite.
        for (const size of [...tailles(MASCOT_MIN_FACE_SIZE, 42), 56, 96]) {
          const ecart = ecartAuVisage(mascotSeasonGeometry(saison, size), mood, size);
          expect(ecart).toBeGreaterThanOrEqual(ECART_MIN_UNITES);
          expect(px(ecart, size)).toBeGreaterThanOrEqual(MIN_STROKE_PX / 1.3);
        }
      }
    }
  });

  it('reste symétrique, la goutte exceptée', () => {
    // Le bonnet et le bourgeon sont centrés sur l'axe du visage ; la goutte ne l'est pas, et
    // c'est la seule asymétrie assumée du dessin — une goutte posée au milieu d'une feuille se
    // lirait comme une tache, pas comme de la rosée.
    for (const size of USED_SIZES) {
      for (const saison of ['hiver', 'printemps'] as const) {
        const elements = mascotSeasonGeometry(saison, size);
        const boites = elements.map(boiteDeLelement);
        // L'encombrement d'ensemble est centré sur l'axe…
        expect(
          Math.min(...boites.map((b) => b.x0)) + Math.max(...boites.map((b) => b.x1))
        ).toBeCloseTo(100, 5);
        // …et les cercles s'apparient deux à deux (les deux pétales latéraux du bourgeon), ce
        // que l'encombrement seul ne dirait pas : un pétale déplacé d'une unité et l'autre de
        // deux garderait la même boîte. C'est la règle de l'arrondi sur l'écart, vue de l'autre
        // côté.
        const abscisses = elements
          .filter((e) => e.forme === 'cercle')
          .map((e) => (e as { cx: number }).cx)
          .sort((a, b) => a - b);
        abscisses.forEach((cx, i) => {
          expect(cx + abscisses[abscisses.length - 1 - i]).toBeCloseTo(100, 5);
        });
      }
    }
  });

  it('ne grossit plus une fois la taille nominale atteinte', () => {
    for (const saison of SAISONS) {
      const nominal = mascotSeasonGeometry(saison, 42);
      for (const size of [42, 56, 80, 120]) {
        expect(mascotSeasonGeometry(saison, size)).toEqual(nominal);
      }
    }
  });
});

// Même nature que le bloc de conformité du visage : une transcription indépendante du canvas
// (`docs/design/v1-14-boucle-engagement/HANDOFF.md`, § Mascotte — accessoires de saison, repris
// en `v1-14` §7), pour qu'une retouche involontaire d'un chemin tombe ici et pas sur l'appareil.
describe('mascotSeasonGeometry — conformité au canvas', () => {
  const CANVAS = {
    calotte:
      'M31,34 C37,24 44,18 50,15 C56,18 63,24 69,34 C62,29 56,27 50,27 C44,27 38,29 31,34 Z',
    revers: 'M31,34 C38,29 44,27 50,27 C56,27 62,29 69,34',
    goutte:
      'M64,70 C64,66 67,62 67,62 C67,62 70,66 70,70 C70,71.8 68.6,73 67,73 C65.4,73 64,71.8 64,70 Z',
  };
  // Le seul écart de dessin du chantier, et il est mesuré : à sa place d'origine la goutte
  // chevauchait le bord de la silhouette (elle s'y lisait comme une éraflure du contour) et
  // touchait le coin de la bouche de `happy` à 28 px. Le dessin, lui, n'a pas bougé — d'où la
  // translation appliquée ici au chemin du canvas plutôt qu'un second littéral.
  const GOUTTE_DECALAGE = { dx: -6, dy: -37 };

  it('rend exactement les chemins du canvas à taille nominale', () => {
    expect(mascotSeasonGeometry('hiver', 56)).toEqual([
      { forme: 'aire', d: CANVAS.calotte, couleur: 'mascotWarm' },
      { forme: 'trait', d: CANVAS.revers, couleur: 'mascotAccessory', epaisseur: 4.4 },
      { forme: 'cercle', cx: 50, cy: 12, r: 5.6, couleur: 'mascotAccessory' },
      { forme: 'cercle', cx: 50, cy: 12, r: 3.9, couleur: 'mascotWarm' },
    ]);
    expect(mascotSeasonGeometry('printemps', 56)).toEqual([
      { forme: 'cercle', cx: 45.8, cy: 18.5, r: 3, couleur: 'mascotAccessory' },
      { forme: 'cercle', cx: 54.2, cy: 18.5, r: 3, couleur: 'mascotAccessory' },
      { forme: 'cercle', cx: 50, cy: 14, r: 3, couleur: 'mascotAccessory' },
      { forme: 'cercle', cx: 50, cy: 17.5, r: 1.8, couleur: 'mascotWarm' },
    ]);
    // Le reflet du canvas (un cercle de rayon 0,9 dans la goutte) n'est pas repris : 0,76 px de
    // diamètre, et sept niveaux de contraste au-dessus de la goutte — c'est la tache grise que
    // l'assertion de lisibilité ci-dessus refuse. La goutte est d'une seule pièce.
    expect(mascotSeasonGeometry('ete', 56)).toEqual([
      {
        forme: 'aire',
        d: translater(CANVAS.goutte, GOUTTE_DECALAGE.dx, GOUTTE_DECALAGE.dy),
        couleur: 'rosee',
        opacite: 0.85,
      },
    ]);
  });

  it('épaissit les traits et les rayons à petite taille, jamais les positions', () => {
    // La moitié du principe : à `size={28}` le trait du revers passe de 4,4 à 6,6 unités (donc
    // 1,85 px comme à taille nominale), pendant que la calotte reste exactement où elle est.
    const petit = mascotSeasonGeometry('hiver', MASCOT_MIN_FACE_SIZE);
    expect(petit[0]).toEqual({ forme: 'aire', d: CANVAS.calotte, couleur: 'mascotWarm' });
    expect(petit[1]).toMatchObject({ epaisseur: 6.6 });
    expect(petit[2]).toMatchObject({ cx: 50, cy: 12, r: 8.4 });
  });
});

describe("mascotFaceGeometry — les joues de l'automne", () => {
  it('ne change rien au visage, hors automne', () => {
    // L'invariant qui protège les quatre autres saisons : le visage est celui d'avant C2.13,
    // au centième près, qu'on lui passe une saison ou non.
    for (const mood of MOODS) {
      for (const size of USED_SIZES) {
        const sansSaison = mascotFaceGeometry(mood, size);
        for (const saison of ['hiver', 'printemps', 'ete'] as const) {
          expect(mascotFaceGeometry(mood, size, saison)).toEqual(sansSaison);
        }
        expect(mascotFaceGeometry(mood, size, null)).toEqual(sansSaison);
        expect(sansSaison.blushToken).toBe('accentMuted');
      }
    }
  });

  it('reprend les joues : rayon × 1,18, opacité + 0,25, ton chaud', () => {
    for (const mood of MOODS) {
      for (const size of USED_SIZES) {
        const nu = mascotFaceGeometry(mood, size);
        const automne = mascotFaceGeometry(mood, size, 'automne');
        expect(automne.blushToken).toBe('mascotWarm');
        expect(automne.blushOpacity).toBeCloseTo(Math.min(0.9, nu.blushOpacity + 0.25), 5);
        automne.blushCircles.forEach((joue, i) => {
          expect(joue.r).toBeCloseTo(nu.blushCircles[i].r * 1.18, 1);
          expect(joue.cx).toBe(nu.blushCircles[i].cx);
          expect(joue.cy).toBe(nu.blushCircles[i].cy);
        });
        // Rien d'autre ne bouge : ni les yeux, ni la bouche, ni la nervure.
        expect({ ...automne, blushCircles: [], blushOpacity: 0, blushToken: 'accentMuted' }).toEqual(
          { ...nu, blushCircles: [], blushOpacity: 0, blushToken: 'accentMuted' }
        );
      }
    }
  });

  it("n'atteint le plafond d'opacité avec aucune des cinq expressions", () => {
    // Le plafond de 0,9 est une garde, pas un réglage : la plus marquée des cinq (`happy`) monte
    // à 0,85. S'il se mettait à mordre, c'est que l'expression aurait changé de registre — des
    // joues opaques cessent d'être des joues.
    for (const mood of MOODS) {
      expect(mascotFaceGeometry(mood, 56, 'automne').blushOpacity).toBeLessThan(0.9);
    }
  });
});

// --- helpers de lecture des accessoires -------------------------------------------------

// Écart minimal toléré entre un accessoire et le visage, en unités de viewBox. La valeur vient
// du pire cas réel des trois accessoires (3,60 pour la goutte, 3,64 pour le bonnet, tous deux à
// `thinking` et 28 px), arrondi vers le bas : ce n'est pas un seuil choisi d'avance, c'est la
// marge dont on dispose, et la figer empêche qu'elle se réduise sans qu'on le sache.
const ECART_MIN_UNITES = 3.5;

function translater(d: string, dx: number, dy: number): string {
  return d.replace(
    /(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g,
    (_, x, y) => `${arrondi(Number(x) + dx)},${arrondi(Number(y) + dy)}`
  );
}

function arrondi(valeur: number): number {
  return Math.round(valeur * 100) / 100;
}

/** Points échantillonnés d'un chemin `M` + `C`/`Q`, pour mesurer une distance réelle. */
function echantillonner(d: string): [number, number][] {
  const points = pathPoints(d).map((p) => [p.x, p.y] as [number, number]);
  const sortie: [number, number][] = [points[0]];
  let courant = points[0];
  let i = 1;
  while (i < points.length) {
    const cubique = d.includes('C') && i + 2 < points.length + 1 && points[i + 2] !== undefined;
    const fin = cubique ? points[i + 2] : points[i + 1];
    const controles = cubique ? [points[i], points[i + 1]] : [points[i]];
    for (let n = 1; n <= 60; n += 1) {
      sortie.push(bezier(courant, controles, fin, n / 60));
    }
    courant = fin;
    i += cubique ? 3 : 2;
  }
  return sortie;
}

function bezier(
  p0: [number, number],
  controles: [number, number][],
  p1: [number, number],
  t: number
): [number, number] {
  const u = 1 - t;
  if (controles.length === 2) {
    const [c1, c2] = controles;
    return [0, 1].map(
      (axe) => u ** 3 * p0[axe] + 3 * u * u * t * c1[axe] + 3 * u * t * t * c2[axe] + t ** 3 * p1[axe]
    ) as [number, number];
  }
  const [c] = controles;
  return [0, 1].map((axe) => u * u * p0[axe] + 2 * u * t * c[axe] + t * t * p1[axe]) as [
    number,
    number,
  ];
}

/** Un élément, réduit à des disques : son centre et le rayon qui l'entoure. */
function disques(element: MascotSeasonElement): { p: [number, number]; r: number }[] {
  if (element.forme === 'cercle') return [{ p: [element.cx, element.cy], r: element.r }];
  const rayon = element.forme === 'trait' ? element.epaisseur / 2 : 0;
  return echantillonner(element.d).map((p) => ({ p, r: rayon }));
}

function boiteDeLelement(element: MascotSeasonElement) {
  const points = disques(element);
  return {
    x0: Math.min(...points.map((d) => d.p[0] - d.r)),
    y0: Math.min(...points.map((d) => d.p[1] - d.r)),
    x1: Math.max(...points.map((d) => d.p[0] + d.r)),
    y1: Math.max(...points.map((d) => d.p[1] + d.r)),
  };
}

/** Les yeux et la bouche, réduits aux mêmes disques — les joues sont exclues : elles ont le
 *  droit d'affleurer, et l'automne les reprend justement pour lui. */
function disquesDuVisage(mood: MascotMood, size: number) {
  const face = mascotFaceGeometry(mood, size);
  const sortie: { p: [number, number]; r: number }[] = [];
  if (face.eyes === 'dots') {
    for (const eye of face.eyeCircles) sortie.push({ p: [eye.cx, eye.cy], r: eye.r });
  } else {
    for (const arc of face.eyeArcs) {
      for (const p of echantillonner(arc)) sortie.push({ p, r: face.eyeStrokeWidth / 2 });
    }
  }
  for (const p of echantillonner(face.mouthPath)) {
    sortie.push({ p, r: face.mouthStrokeWidth / 2 });
  }
  return sortie;
}

function ecartAuVisage(
  accessoire: MascotSeasonElement[],
  mood: MascotMood,
  size: number
): number {
  const visage = disquesDuVisage(mood, size);
  let minimum = Number.POSITIVE_INFINITY;
  for (const element of accessoire) {
    for (const a of disques(element)) {
      for (const v of visage) {
        const d = Math.hypot(a.p[0] - v.p[0], a.p[1] - v.p[1]) - a.r - v.r;
        if (d < minimum) minimum = d;
      }
    }
  }
  return minimum;
}
