// Géométrie du visage de la mascotte — logique pure, testée (cf. mascot.test.ts).
// Séparée de `src/components/mascot.tsx` pour la même raison que `src/types/bilan.ts` :
// un module importé par un test ne doit tirer ni React Native ni `@/lib/supabase`.
//
// Pourquoi une géométrie calculée plutôt que des chemins SVG figés : le visage est dessiné
// dans un viewBox 0 0 100 100, donc une unité vaut `size / 100` pixels à l'écran. Aux
// valeurs nominales (trait de 3,2 unités), la bouche mesurait 0,70 px de large à `size={22}`
// dans l'en-tête du questionnaire — l'antialiasing la réduisait à un gris uniforme. Le
// visage était donc invisible exactement là où il sert le plus (les neuf étapes du bilan).
//
// La compensation optique ci-dessous est le principe classique des jeux d'icônes : à petite
// taille on ne réduit pas le dessin proportionnellement, on épaissit les traits. Les tailles
// (rayons, épaisseurs, courbures) grandissent d'un facteur k, les **positions** seulement de
// 20 % de ce facteur — la feuille se rétrécit vers le bas, et un écartement proportionnel
// poussait l'œil `happy` hors de la silhouette dès 28px (le test l'a attrapé). Les joues, les
// plus excentrées, ne s'écartent pas du tout et ne grossissent qu'au rythme des positions.
const NOMINAL_SIZE = 42;

// En dessous, aucune compensation ne suffit — deux yeux et une bouche ne tiennent pas dans
// les ~34 unités de large du visage. On rend alors la feuille seule (même arbitrage que le
// favicon, cf. mascot.tsx), plutôt qu'un visage réduit à une tache.
export const MASCOT_MIN_FACE_SIZE = 28;

// Plafond du grossissement : au-delà, les joues sortent de la silhouette et les yeux
// touchent la bouche.
const MAX_OPTICAL_SCALE = 1.5;

// Part du grossissement répercutée sur les positions (écartement des yeux, hauteur de la
// bouche) plutôt que sur les seules épaisseurs.
const POSITION_SHARE = 0.2;

// Centre optique du visage dans le viewBox — point fixe de l'homothétie.
const FACE_CENTER_Y = 58;
const FACE_AXIS_X = 50;

export type MascotMood = 'calm' | 'happy' | 'encouraging' | 'thinking' | 'resting';

type EyeShape = 'dots' | 'happy' | 'soft';

// Valeurs nominales, telles que dessinées à `size >= 42`. Toute retouche de l'expression se
// fait ici : les variantes petites tailles en sont dérivées, jamais redessinées à part.
const NOMINAL_FACE: Record<
  MascotMood,
  {
    eyes: EyeShape;
    eyeSpread: number; // demi-écartement des yeux, depuis l'axe
    // Décalage horizontal du regard. Seul `thinking` s'en sert : le regard levé est aussi
    // légèrement porté de côté, ce qui suffit à le lire comme « elle réfléchit » plutôt que
    // « elle fixe le plafond ». C'est la seule asymétrie assumée du visage.
    eyeShiftX: number;
    eyeY: number;
    eyeRadius: number; // yeux `dots`
    eyeArcHalfWidth: number; // yeux `happy` / `soft`
    eyeArcDepth: number; // signé : négatif = arc vers le haut (^^), positif = vers le bas
    mouthHalfWidth: number;
    mouthY: number;
    mouthDepth: number;
    blushSpread: number;
    blushY: number;
    blushRadius: number;
    blushOpacity: number;
  }
> = {
  calm: {
    eyes: 'dots',
    eyeSpread: 11,
    eyeShiftX: 0,
    eyeY: 50,
    eyeRadius: 4.2,
    eyeArcHalfWidth: 5,
    eyeArcDepth: 0,
    mouthHalfWidth: 8,
    mouthY: 62,
    mouthDepth: 3,
    blushSpread: 17,
    blushY: 60,
    blushRadius: 5,
    blushOpacity: 0.55,
  },
  happy: {
    eyes: 'happy',
    eyeSpread: 11,
    eyeShiftX: 0,
    eyeY: 49,
    eyeRadius: 4.2,
    eyeArcHalfWidth: 5,
    eyeArcDepth: -2.5,
    mouthHalfWidth: 10,
    mouthY: 60,
    mouthDepth: 6,
    blushSpread: 17,
    blushY: 59,
    blushRadius: 5.4,
    blushOpacity: 0.6,
  },
  encouraging: {
    eyes: 'soft',
    eyeSpread: 11,
    eyeShiftX: 0,
    eyeY: 51,
    eyeRadius: 4.2,
    eyeArcHalfWidth: 4,
    eyeArcDepth: 1.5,
    mouthHalfWidth: 7,
    mouthY: 63,
    mouthDepth: 1.5,
    blushSpread: 17,
    blushY: 60,
    blushRadius: 5,
    blushOpacity: 0.55,
  },
  // Attente du calcul du bilan — le seul moment où le produit fait patienter. Regard levé et
  // porté de côté, bouche neutre : elle réfléchit, elle ne se réjouit pas d'un chiffre qu'elle
  // n'a pas encore. Joues plus discrètes que partout ailleurs, pour la même raison.
  thinking: {
    eyes: 'dots',
    eyeSpread: 11,
    eyeShiftX: -1,
    eyeY: 47,
    eyeRadius: 4.2,
    eyeArcHalfWidth: 5,
    eyeArcDepth: 0,
    mouthHalfWidth: 5,
    // Flèche nulle : la bouche est un trait droit. Une quadratique sans déflexion rend
    // exactement la même chose qu'un segment, on garde donc une seule construction.
    mouthY: 63,
    mouthDepth: 0,
    blushSpread: 17,
    blushY: 61,
    blushRadius: 4.6,
    blushOpacity: 0.4,
  },
  // Périodes calmes du suivi : « rien à faire cette semaine » n'est pas un échec, et le visage
  // ne doit pas le présenter comme une attente déçue. Yeux clos, paisible — arcs plus larges et
  // plus creusés que `encouraging`, qui a les yeux mi-clos et non fermés.
  resting: {
    eyes: 'soft',
    eyeSpread: 11,
    eyeShiftX: 0,
    eyeY: 50,
    eyeRadius: 4.2,
    eyeArcHalfWidth: 5,
    eyeArcDepth: 2.5,
    mouthHalfWidth: 6,
    mouthY: 63,
    mouthDepth: 1.5,
    blushSpread: 17,
    blushY: 60,
    blushRadius: 5,
    blushOpacity: 0.5,
  },
};

const NOMINAL_STROKE_EYE = 3.4;
const NOMINAL_STROKE_MOUTH = 3.2;
const NOMINAL_STROKE_VEIN = 4;

export type MascotFaceGeometry = {
  /** Le visage est-il assez grand pour être lisible ? Sinon : feuille seule. */
  visible: boolean;
  eyes: EyeShape;
  /** Cercles des yeux (variante `dots`). */
  eyeCircles: { cx: number; cy: number; r: number }[];
  /** Arcs des yeux (variantes `happy` / `soft`). */
  eyeArcs: string[];
  eyeStrokeWidth: number;
  mouthPath: string;
  mouthStrokeWidth: number;
  blushCircles: { cx: number; cy: number; r: number }[];
  blushOpacity: number;
  veinStrokeWidth: number;
};

/** Facteur de compensation optique appliqué aux épaisseurs et aux rayons. */
export function opticalScale(size: number): number {
  if (size >= NOMINAL_SIZE) return 1;
  return Math.min(NOMINAL_SIZE / Math.max(size, 1), MAX_OPTICAL_SCALE);
}

function quadratic(cx: number, halfWidth: number, y: number, depth: number): string {
  // Une quadratique passe par (P0 + 2C + P2) / 4 en son milieu : le point de contrôle doit
  // donc être placé à 2× la flèche voulue pour que la courbe l'atteigne réellement.
  const control = y + depth * 2;
  return `M${round(cx - halfWidth)},${round(y)} Q${round(cx)},${round(control)} ${round(cx + halfWidth)},${round(y)}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// Arrondir `50 + offset` et `50 - offset` séparément casse la symétrie du visage d'un
// centième (36,49 / 63,52). On arrondit donc l'écart, jamais la coordonnée absolue.
function mirrored(offset: number, side: -1 | 1): number {
  return FACE_AXIS_X + side * round(offset);
}

export function mascotFaceGeometry(mood: MascotMood, size: number): MascotFaceGeometry {
  const face = NOMINAL_FACE[mood];
  const k = opticalScale(size);
  const kPos = 1 + (k - 1) * POSITION_SHARE;

  const eyeY = FACE_CENTER_Y + (face.eyeY - FACE_CENTER_Y) * kPos;
  const mouthY = FACE_CENTER_Y + (face.mouthY - FACE_CENTER_Y) * kPos;
  const blushY = FACE_CENTER_Y + (face.blushY - FACE_CENTER_Y) * kPos;
  const eyeSpread = face.eyeSpread * kPos;
  const eyeShiftX = face.eyeShiftX * kPos;
  const blushSpread = face.blushSpread;

  const sides: (-1 | 1)[] = [-1, 1];

  return {
    visible: size >= MASCOT_MIN_FACE_SIZE,
    eyes: face.eyes,
    eyeCircles: sides.map((side) => ({
      cx: round(mirrored(eyeSpread, side) + eyeShiftX),
      cy: round(eyeY),
      r: round(face.eyeRadius * k),
    })),
    eyeArcs: sides.map((side) =>
      quadratic(
        mirrored(eyeSpread, side) + eyeShiftX,
        face.eyeArcHalfWidth * k,
        eyeY,
        face.eyeArcDepth * k
      )
    ),
    eyeStrokeWidth: round(NOMINAL_STROKE_EYE * k),
    mouthPath: quadratic(FACE_AXIS_X, face.mouthHalfWidth * k, mouthY, face.mouthDepth * k),
    mouthStrokeWidth: round(NOMINAL_STROKE_MOUTH * k),
    blushCircles: sides.map((side) => ({
      cx: mirrored(blushSpread, side),
      cy: round(blushY),
      r: round(face.blushRadius * kPos),
    })),
    blushOpacity: face.blushOpacity,
    veinStrokeWidth: round(NOMINAL_STROKE_VEIN * k),
  };
}
