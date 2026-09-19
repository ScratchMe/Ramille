import { HYPOTHESES, METHODE_TITRE, sectionsDeMethode } from './methodologie';

// Le bloc « Comment ce chiffre est calculé » (C3.2).
//
// **La garde la plus importante de ce module n'est pas ici**, et il faut le savoir avant de
// croire cette suite complète : `HYPOTHESES` est un miroir tenu à la main des constantes de
// `recompute_assessment_results`, et ce qui vérifie l'égalité est
// `scripts/verifier-hypotheses-calcul.mjs`, lancé en CI. Le contrôle demande de lire les
// migrations, donc `fs` — et le `tsconfig.json` racine porte `"types": ["jest"]`, volontairement,
// pour que le code de l'app ne puisse pas atteindre les API de Node. Ajouter `"node"` pour un seul
// test ouvrirait `fs` à tout `src/`. Même arbitrage que les quatre gardes d'export.
//
// Ce que cette suite éprouve, c'est le **texte** : qu'il dise la source et le périmètre, qu'il
// assume ses hypothèses par écrit, et qu'il affiche chaque valeur au lieu de la réécrire à côté.

describe('HYPOTHESES', () => {
  // C3.4 a fait de cette moitié une question posée à l'écran, et une constante nommée du SQL
  // (`second_leg_share_default`) au lieu d'un `/ 2` écrit en clair dans les deux branches du
  // trajet domicile-travail. Elle est donc entrée dans la table du script de CI, qui est ce qui
  // garde l'égalité ; ce qui reste ici, c'est ce que le bloc affiche — la valeur appliquée à un
  // bilan qui n'a pas répondu, c'est-à-dire à tout bilan antérieur à la question.
  it('garde la moitié comme part du second mode quand elle n’a pas été demandée', () => {
    expect(HYPOTHESES.partDuSecondMode).toBe(0.5);
  });
});

describe('sectionsDeMethode', () => {
  const lignes = (date: string | null) => sectionsDeMethode(date).flatMap((s) => s.lignes);

  it('nomme la source et le périmètre', () => {
    const texte = lignes(null).join(' ');
    expect(texte).toContain('ADEME');
    expect(texte).toContain('Base Empreinte');
    expect(texte).toMatch(/fabrication/);
  });

  // **Le périmètre est la raison d'être du bloc.** Sans cette phrase, quelqu'un qui compare ce
  // total à celui d'un simulateur d'usage conclut que l'un des deux se trompe — et l'écart va
  // jusqu'au quintuple sur une voiture électrique. Un test dessus plutôt qu'une relecture, parce
  // que c'est la ligne qu'on raccourcit quand on trouve le bloc trop long.
  it('dit explicitement que ce total ne se compare pas à n’importe quel autre', () => {
    expect(lignes(null).join(' ')).toMatch(/ne se compare pas/);
  });

  it('date les facteurs quand la date du bilan est connue, et se tait sinon', () => {
    expect(lignes('2026-09-12T08:30:00Z').join(' ')).toMatch(/Facteurs figés au/);
    expect(lignes(null).join(' ')).not.toMatch(/Facteurs figés/);
  });

  // La règle de `carbon-reference.ts`, étendue aux constantes du calcul : une valeur est sourcée
  // ou donnée pour une hypothèse. Aucune de ces sept-là n'est publiée où que ce soit, donc le
  // texte doit le dire — sans quoi elles se lisent comme des mesures.
  it('assume par écrit que les distances et les fréquences sont des choix, pas des mesures', () => {
    expect(lignes(null).join(' ')).toMatch(/n’est publiée par une source/);
  });

  // **Aucun nombre écrit à la main dans le texte.** Chaque valeur affichée est interpolée depuis
  // `HYPOTHESES` : c'est ce qui fait qu'une constante modifiée change la phrase au lieu de la
  // laisser mentir. Le test le vérifie en cherchant chaque hypothèse dans le texte rendu.
  it('affiche chaque hypothèse, formatée à la française', () => {
    const texte = lignes(null).join(' ');
    expect(texte).toContain('45 semaines');
    expect(texte).toContain('52 semaines');
    expect(texte).toContain('0,25 sortie');
    expect(texte).toContain('15 km');
    expect(texte).toContain('1\u00a0500 km');
    expect(texte).toContain('9\u00a0000 km');
    expect(texte).toContain('800 km');
    expect(texte).toContain('700 km');
    expect(texte).toContain('50 %');
  });

  // Hermes peut être construit sans ICU complet : `toLocaleString('fr-FR')` rendrait « 1,500 »,
  // soit une virgule décimale au milieu d'une distance, dans le bloc qui explique d'où vient un
  // chiffre. Invisible en CI, visible sur l'appareil — même piège que `MOIS_FRANCAIS`.
  it('n’écrit jamais un séparateur de milliers en point ou en virgule', () => {
    const texte = lignes(null).join(' ');
    expect(texte).not.toMatch(/\d[.,]\d{3}\b/);
  });

  it('porte un titre stable pour le lien qui l’ouvre', () => {
    expect(METHODE_TITRE).toBe('Comment ce chiffre est calculé');
  });
});
