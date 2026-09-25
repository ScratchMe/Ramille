import { fondDuChoix, type FondDuChoix } from '@/types/fond-du-choix';

// Le fond d'un choix (25/09/2026). La table est la règle entière, cas par cas : seize combinaisons,
// parce que c'est ce qui a été factorisé depuis quatre composants — une ligne qui manquerait ici
// serait un état qu'un des quatre peut rendre sans que rien ne le dise.
//
// **Ce que ce test ne garde pas, et qu'une mesure a vérifié une fois** : que les quatre composants
// l'appellent avec les bons arguments (`plein` depuis `selectedStyle`, `imbrique` depuis
// `nestedBackground`) — un test garde la fonction, jamais ses appels (`FRONT.md` §1.1). La
// factorisation du 25/09/2026 a donc été vérifiée deux fois : la dérivation contre les quatre
// ternaires qu'elle remplace, recopiés tels quels, sur les 40 combinaisons que leurs paramètres
// admettent — aucun écart ; puis **sur l'export**, où les 143 choix que rendent `/feedback` et les
// neuf étapes du questionnaire ont gardé, au repos comme sous le doigt, la couleur et la place qu'ils
// avaient avant.
//
// **Éprouvé en le cassant le 25/09/2026**, une mutation à la fois, l'état d'avant réécrit ensuite :
//
//   | Ce qu'on casse | Ce qui tombe |
//   |---|---|
//   | la puce pleine ne répond plus au doigt (`accentPressed` → `accent`) | la table (2 lignes) **et** « sous le doigt, le fond change toujours » |
//   | `imbrique` ignoré | la table (2 lignes) — seulement |
//   | un choix libre appuyé dans un encart garde le fond de la page | la table (2 lignes) **et** « sous le doigt… » |
//   | un choix coché appuyé prend la teinte neutre (`backgroundPressed`) | la table (2 lignes) — seulement |
//   | `plein` vrai par défaut | « sans précision… » — seulement |
//
// Deux lignes et non une, parce que chaque règle se lit dans les deux valeurs du critère qui ne la
// concerne pas (`imbrique` pour un choix coché, `plein` pour un choix libre) : c'est aussi ce qui
// épingle qu'il ne la concerne pas. Et la quatrième ne fait pas tomber l'invariant — la teinte neutre
// diffère bien du repos —, ce qui est la raison d'être de la table à côté de lui.
const CAS: [boolean, boolean, boolean, boolean, FondDuChoix][] = [
  // choisi, appuyé, plein, imbriqué → jeton
  [true, false, true, false, 'accent'],
  [true, true, true, false, 'accentPressed'],
  [true, false, true, true, 'accent'],
  [true, true, true, true, 'accentPressed'],
  [true, false, false, false, 'backgroundSelected'],
  [true, true, false, false, 'backgroundSelectedPressed'],
  [true, false, false, true, 'backgroundSelected'],
  [true, true, false, true, 'backgroundSelectedPressed'],
  [false, false, false, false, 'backgroundElement'],
  [false, true, false, false, 'backgroundPressed'],
  [false, false, false, true, 'background'],
  [false, true, false, true, 'backgroundPressed'],
  [false, false, true, false, 'backgroundElement'],
  [false, true, true, false, 'backgroundPressed'],
  [false, false, true, true, 'background'],
  [false, true, true, true, 'backgroundPressed'],
];

describe('fondDuChoix', () => {
  it.each(CAS)('choisi %s, appuyé %s, plein %s, imbriqué %s → %s', (choisi, appuye, plein, imbrique, attendu) => {
    expect(fondDuChoix({ choisi, appuye, plein, imbrique })).toBe(attendu);
  });

  it('sous le doigt, le fond change toujours — c’est ce qui dit que l’appui a été pris', () => {
    // La décision n° 6 du 24/09/2026 : rien ne répondait au toucher, et sur Android on ne savait pas
    // si le geste avait été pris. Un état où l'appui rendrait le fond du repos la défait en silence.
    for (const [choisi, , plein, imbrique] of CAS) {
      const repos = fondDuChoix({ choisi, appuye: false, plein, imbrique });
      const appuye = fondDuChoix({ choisi, appuye: true, plein, imbrique });
      expect(appuye).not.toBe(repos);
    }
  });

  it('sans précision, un choix est teinté et hors encart — les défauts de `ChoiceRow` et de la ligne de canal', () => {
    expect(fondDuChoix({ choisi: true, appuye: false })).toBe('backgroundSelected');
    expect(fondDuChoix({ choisi: false, appuye: false })).toBe('backgroundElement');
  });
});
