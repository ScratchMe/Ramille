import {
  MASCOT_MIN_FACE_SIZE,
  mascotFaceGeometry,
  opticalScale,
  type MascotMood,
} from './mascot';

const MOODS: MascotMood[] = ['calm', 'happy', 'encouraging', 'thinking', 'resting'];

// Tailles réellement utilisées dans l'app (grep `<Mascot`), plus les bornes.
const USED_SIZES = [28, 36, 40, 44, 56];

// Un trait fin est mangé par l'antialiasing bien avant de disparaître : sous ~1,3px il ne
// reste qu'un gris pâle. C'est ce seuil, et pas la disparition pure, que le test défend.
const MIN_STROKE_PX = 1.3;
const MIN_EYE_DIAMETER_PX = 2.6;

const px = (units: number, size: number) => (units * size) / 100;

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
