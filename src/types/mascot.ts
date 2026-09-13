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
//
// **Les accessoires de saison (C2.13) vivent ici pour la même raison**, et se lisent dans la
// seconde moitié du fichier : `mascotSeasonGeometry` rend la liste ordonnée de ce qui se dessine
// après le visage (bonnet, bourgeon, goutte de rosée), et l'automne — qui ne pose rien par-dessus
// mais reprend les joues du visage — est traité par `mascotFaceGeometry` lui-même.
//
// L'import de `Saison` est **un import de type**, effacé à la compilation : le module garde ses
// zéro dépendance à l'exécution, alors que `@/types/saison` en tire trois (checkin, mascotte,
// postes). Ne pas le transformer en import de valeur pour aller y chercher `saisonDe` : la saison
// du jour se résout dans le composant, pas dans la géométrie, sans quoi cette fonction pure
// dépendrait de l'horloge.
import type { Saison } from '@/types/saison';

const NOMINAL_SIZE = 42;

// En dessous, aucune compensation ne suffit — deux yeux et une bouche ne tiennent pas dans
// les ~34 unités de large du visage, joues et nervure comprises. On rend alors la feuille
// seule plutôt qu'un visage réduit à une tache. Le favicon y arrive à 16 px, mais en
// abandonnant joues et nervure (cf. assets/images/favicon-mark.svg) : un dessin figé peut
// se simplifier, ce composant doit rester le même visage à toutes ses tailles.
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
  /**
   * La couleur des joues, **nommée et non résolue** : ce module reste pur, donc il ne peut pas
   * importer `Colors` (qui tire `react-native`). `accentMuted` partout, sauf en automne où les
   * joues passent au ton chaud — c'est le seul endroit où une saison change le visage.
   */
  blushToken: MascotColorToken;
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

export function mascotFaceGeometry(
  mood: MascotMood,
  size: number,
  /**
   * La saison, quand elle touche au visage — c'est-à-dire l'automne et lui seul.
   *
   * Le défaut `null` est ce qui garantit l'invariant du test : hors automne, la géométrie rendue
   * est **strictement identique** à celle d'avant C2.13, saison passée ou non. Les trois autres
   * saisons ne posent rien sur le visage, elles ajoutent une couche par-dessus
   * (`mascotSeasonGeometry`).
   */
  saison: Saison | null = null
): MascotFaceGeometry {
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
  const automne = saison === 'automne';

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
      // Un seul arrondi, à la fin : arrondir avant de multiplier par le facteur d'automne
      // ferait deux rayons différents pour la même joue selon l'ordre des opérations.
      r: round(face.blushRadius * kPos * (automne ? JOUES_AUTOMNE_FACTEUR : 1)),
    })),
    blushOpacity: automne
      ? Math.min(JOUES_OPACITE_MAX, face.blushOpacity + JOUES_AUTOMNE_SURPLUS)
      : face.blushOpacity,
    blushToken: automne ? 'mascotWarm' : 'accentMuted',
    veinStrokeWidth: round(NOMINAL_STROKE_VEIN * k),
  };
}

// --- Les accessoires de saison -----------------------------------------------------------
//
// C2.13 : la saison est l'unité de temps du produit (le cap, le cycle, l'ouverture et la
// clôture de C2.8), et rien ne la rendait visible sans un chiffre ni une date. Un bonnet en
// hiver, des joues chaudes en automne : « le temps passe et je suis toujours là », dit sans
// compter — le seul registre que Ramille s'autorise.
//
// Trois règles qui expliquent la forme de ce qui suit :
//
//   1. **Les positions sont fixes, les épaisseurs et les rayons suivent `k`.** Même
//      compensation optique que le visage, et pour la même raison : sans elle, à `size={28}`, le
//      trait du revers mesurerait 1,2 px et le pompon 1,6 px de rayon. Les positions, elles, ne
//      bougent pas — un bonnet qui se décentre à petite taille cesse d'être un bonnet.
//   2. **Les chemins des trois accessoires sont des constantes, et c'est voulu.** La règle
//      « jamais de chemin SVG figé » vise le *composant* : ce qui doit rester calculé, c'est ce
//      qui dépend de la taille. La calotte du bonnet et la goutte de rosée ne dépendent que de
//      la silhouette, qui ne bouge pas. Elles vivent donc ici, comme données rendues par cette
//      fonction, et jamais dans `mascot.tsx`.
//   3. **L'accessoire n'est PAS découpé par le `clipPath` de la feuille**, à la différence du
//      visage. Ce n'est pas un oubli : le clip existe parce que des joues qui flottent hors du
//      vert se lisent comme un bug, alors qu'un bonnet se porte *sur* la tête. Le pompon dépasse
//      la pointe de la feuille par construction, et d'autant plus que `k` grandit — découper le
//      rognerait en lentille. Ce que le clip garantissait, un test le garantit autrement : chaque
//      élément reste dans le `viewBox`, donc rien n'est coupé par le bord du SVG à `k` maximal.
//
// L'automne n'est pas dans cette liste : il ne pose rien par-dessus le visage, il **reprend les
// joues** (rayon × 1,18, opacité + 0,25, ton chaud). Le traitement est donc dans
// `mascotFaceGeometry`, à l'intérieur du groupe découpé, et `mascotSeasonGeometry('automne', …)`
// rend une liste vide. Deux couches de joues — l'une découpée, l'autre non — se verraient au
// bord de la feuille.
//
// Géométrie exacte : `docs/design/v1-14-boucle-engagement/HANDOFF.md` (§ Mascotte — accessoires
// de saison) et `docs/architecture/v1-14-boucle-engagement.md` §7, tous deux transcrits dans le
// test de conformité.

/**
 * Les couleurs que la géométrie peut **nommer**, ce module ne pouvant pas les résoudre : importer
 * `@/constants/theme` y tirerait `react-native`, ce que la suite de logique pure interdit.
 * `mascot.tsx` fait la correspondance.
 *
 * Les trois premiers sont des jetons de `Colors` (`v1-14` §6). `rosee` n'en est pas un, et c'est
 * délibéré : la goutte est blanche dans les deux thèmes, parce que la feuille reste verte dans les
 * deux et qu'une goutte ne se lit comme de l'eau qu'en étant plus claire que ce sur quoi elle
 * repose. Une entrée de `Colors` laisserait croire que les deux valeurs peuvent diverger.
 */
export type MascotColorToken = 'accentMuted' | 'mascotAccessory' | 'mascotWarm' | 'rosee';

/**
 * Un élément d'accessoire, dans l'ordre où il se dessine.
 *
 * Une seule liste ordonnée plutôt qu'un champ par forme : le bonnet superpose quatre éléments
 * (calotte, revers, pompon, cœur du pompon) et l'ordre *est* le dessin. Deux tableaux séparés
 * obligeraient le composant à connaître cet ordre, c'est-à-dire à le redéclarer.
 */
export type MascotSeasonElement =
  | { forme: 'aire'; d: string; couleur: MascotColorToken; opacite?: number }
  | { forme: 'trait'; d: string; couleur: MascotColorToken; epaisseur: number }
  | { forme: 'cercle'; cx: number; cy: number; r: number; couleur: MascotColorToken };

// Hiver — le bonnet. Calotte dans le ton chaud, revers clair, pompon du ton chaud cerné de clair
// (il se lit ainsi sur fond blanc comme sur fond sombre). Le cerne est fin par construction —
// (5,6 − 3,9) × k, soit 0,71 px à toute taille sous la nominale : il se lit comme un halo et non
// comme un anneau. Si la relecture sur appareil le veut plus net, c'est le rayon **extérieur**
// qu'on ouvre, jamais le cœur qu'on rétrécit.
const BONNET_CALOTTE =
  'M31,34 C37,24 44,18 50,15 C56,18 63,24 69,34 C62,29 56,27 50,27 C44,27 38,29 31,34 Z';
const BONNET_REVERS = 'M31,34 C38,29 44,27 50,27 C56,27 62,29 69,34';
const BONNET_REVERS_TRAIT = 4.4;
const POMPON_Y = 12;
const POMPON_RAYON = 5.6;
const POMPON_COEUR_RAYON = 3.9;

// Printemps — le bourgeon : trois pétales clairs au sommet, dans le prolongement de la nervure,
// et un cœur chaud. Le plus discret des quatre.
const BOURGEON_PETALE_RAYON = 3;
const BOURGEON_PETALE_ECART = 4.2;
const BOURGEON_PETALES_Y = 18.5;
const BOURGEON_SOMMET_Y = 14;
const BOURGEON_COEUR_Y = 17.5;
const BOURGEON_COEUR_RAYON = 1.8;

// Été — la goutte de rosée, posée sur le haut de la feuille, à droite de la nervure.
//
// **Le canvas la plaçait en bas à droite, et c'est le seul écart de dessin de ce chantier**
// (`docs/design/v1-14-boucle-engagement/README.md`). Deux mesures l'imposent, et aucune ne se
// voit à la lecture du chemin :
//   - à `M64,70` la goutte chevauche le bord de la silhouette (les deux tiers en dehors) : au
//     rendu elle ne se lit pas comme une goutte mais comme une éraflure du contour de la feuille,
//     à toutes les tailles ;
//   - son coin haut arrivait à **0,29 unité** du coin de la bouche de `happy` à `size={28}`,
//     soit 0,08 px — c'est-à-dire collés, et `happy` à 28 px est exactement ce que rend
//     l'en-tête du questionnaire à la dernière étape.
// Déplacée de (−6, −37), elle est franchement sur la feuille, à 3,6 unités du visage au pire cas
// (la même marge que le bonnet), et le dessin lui-même n'a pas bougé d'un centième — le test
// reconstruit le chemin du canvas et lui applique la translation, donc une retouche du dessin
// tombe comme avant.
const ROSEE =
  'M58,33 C58,29 61,25 61,25 C61,25 64,29 64,33 C64,34.8 62.6,36 61,36 C59.4,36 58,34.8 58,33 Z';
const ROSEE_OPACITE = 0.85;
// **Le reflet du canvas n'est pas repris**, et c'est le second écart de ce chantier. Il était
// tenu par deux valeurs qui le rendaient invisible et non discret : un rayon de 0,9 unité, soit
// 0,76 px de diamètre à toute taille — exactement la tache grise que ce module existe pour
// éviter — et une couleur (#E4EFE8) sept niveaux au-dessus de ce que rend la goutte elle-même
// par-dessus le vert (#DDE9E3). Le grossir ne le sauverait pas : c'est le contraste qui manque,
// et l'augmenter percerait un trou dans une goutte de six unités. La goutte est donc d'une
// seule pièce, et le test de lisibilité des accessoires refuserait de toute façon sa réintroduction.

// Automne — les joues du visage, reprises par `mascotFaceGeometry`.
const JOUES_AUTOMNE_FACTEUR = 1.18;
const JOUES_AUTOMNE_SURPLUS = 0.25;
// Plafond de sûreté : aucune des cinq expressions ne l'atteint aujourd'hui (la plus marquée,
// `happy`, monte à 0,85). Il garde le jour où une expression partirait de plus haut — des joues
// opaques cesseraient d'être des joues.
const JOUES_OPACITE_MAX = 0.9;

/**
 * Ce que la saison ajoute **par-dessus** le visage, dans l'ordre du dessin.
 *
 * Rend une liste vide dans trois cas, et les trois comptent : sous `MASCOT_MIN_FACE_SIZE` (la
 * feuille seule reste la feuille seule — un bonnet sur une feuille sans visage est une tache),
 * sans saison (`null`, pour une capture ou un test), et en automne (qui reprend les joues du
 * visage au lieu de poser un accessoire).
 */
export function mascotSeasonGeometry(saison: Saison | null, size: number): MascotSeasonElement[] {
  if (saison === null || size < MASCOT_MIN_FACE_SIZE) return [];
  const k = opticalScale(size);

  switch (saison) {
    case 'hiver':
      return [
        { forme: 'aire', d: BONNET_CALOTTE, couleur: 'mascotWarm' },
        {
          forme: 'trait',
          d: BONNET_REVERS,
          couleur: 'mascotAccessory',
          epaisseur: round(BONNET_REVERS_TRAIT * k),
        },
        {
          forme: 'cercle',
          cx: FACE_AXIS_X,
          cy: POMPON_Y,
          r: round(POMPON_RAYON * k),
          couleur: 'mascotAccessory',
        },
        {
          forme: 'cercle',
          cx: FACE_AXIS_X,
          cy: POMPON_Y,
          r: round(POMPON_COEUR_RAYON * k),
          couleur: 'mascotWarm',
        },
      ];
    case 'printemps':
      return [
        ...([-1, 1] as const).map((side) => ({
          forme: 'cercle' as const,
          // Symétrie par l'écart et non par la coordonnée, comme les yeux et les joues : arrondir
          // `50 ± 4,2` séparément décentrerait le bourgeon d'un centième.
          cx: mirrored(BOURGEON_PETALE_ECART, side),
          cy: BOURGEON_PETALES_Y,
          r: round(BOURGEON_PETALE_RAYON * k),
          couleur: 'mascotAccessory' as const,
        })),
        {
          forme: 'cercle',
          cx: FACE_AXIS_X,
          cy: BOURGEON_SOMMET_Y,
          r: round(BOURGEON_PETALE_RAYON * k),
          couleur: 'mascotAccessory',
        },
        {
          forme: 'cercle',
          cx: FACE_AXIS_X,
          cy: BOURGEON_COEUR_Y,
          r: round(BOURGEON_COEUR_RAYON * k),
          couleur: 'mascotWarm',
        },
      ];
    case 'ete':
      return [{ forme: 'aire', d: ROSEE, couleur: 'rosee', opacite: ROSEE_OPACITE }];
    case 'automne':
      return [];
  }
}
