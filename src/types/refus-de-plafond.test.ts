/**
 * Un plafond atteint se reconnaît à son code et se dit pour ce qu'il est (22/10/2026).
 *
 * La base refuse une écriture quand un plafond par compte et par jour est atteint, en `RM002`. Les
 * engagements (trente archivages) et les bilans (dix) tombaient dans « … Réessaie dans un instant. »,
 * la phrase d'une panne : fausse d'un refus qui dure jusqu'au lendemain. Ce fichier garde la
 * reconnaissance, qui ne lit **jamais le message** (une migration peut le reformuler), et le registre
 * des deux phrases. Ce que fait chaque appelant de la reconnaissance est gardé là où il vit :
 * `src/lib/plan-engagement.test.ts`, `src/types/soumission.test.ts`, et les écrans
 * (`src/components/plan/action-commitment.test.tsx`, `src/tests/ecrans/plafond-de-bilans.test.tsx`).
 *
 * Éprouvé en le cassant le 22/10/2026 (`TESTING.md` §1.1), le fichier restauré depuis une copie après
 * chaque mutation :
 *   - la reconnaissance lue au message (`erreur.message` contenant « Reviens demain ») au lieu du code →
 *     « reconnaît le plafond à son code » et « ne le reconnaît jamais à son message », ensemble ;
 *   - la reconnaissance étendue à toute la classe `RM` (`startsWith('RM')`) → « ne prend pas pour un
 *     plafond », seul : `RM001`, le refus de remplacement, est le premier des codes voisins ;
 *   - « Réessaie demain. » remplacé par « Réessaie dans un instant. » dans `TROP_DE_BILANS` → « dit la
 *     suite à attendre » et « ne dit ni chiffre » (le mot « instant »), et « épingle les deux phrases » ;
 *     dans `TROP_DE_CHANGEMENTS_D_ENGAGEMENT`, de même ;
 *   - un chiffre ajouté à une phrase (« trente ») n'est pas un chiffre : « ne dit ni chiffre » ne le voit
 *     pas, et « épingle les deux phrases » le voit seul — c'est pour cela que les deux gardes coexistent.
 */
import {
  CODE_REFUS_DE_PLAFOND,
  estUnRefusDePlafond,
  TROP_DE_BILANS,
  TROP_DE_CHANGEMENTS_D_ENGAGEMENT,
} from '@/types/refus-de-plafond';

const PHRASE_DU_SERVEUR = 'Tu as commencé beaucoup de bilans aujourd’hui. Reviens demain.';

describe('estUnRefusDePlafond', () => {
  it('reconnaît le plafond à son code, quelle que soit la phrase du serveur', () => {
    expect(estUnRefusDePlafond({ code: CODE_REFUS_DE_PLAFOND, message: PHRASE_DU_SERVEUR })).toBe(true);
    // Une migration qui reformule le message ne change rien.
    expect(estUnRefusDePlafond({ code: CODE_REFUS_DE_PLAFOND, message: 'Une autre phrase.' })).toBe(true);
    expect(estUnRefusDePlafond({ code: CODE_REFUS_DE_PLAFOND })).toBe(true);
  });

  // La même phrase sous un autre code n'est pas un plafond : c'est le message qui n'est pas lu.
  it('ne le reconnaît jamais à son message', () => {
    expect(estUnRefusDePlafond({ code: '23514', message: PHRASE_DU_SERVEUR })).toBe(false);
    expect(estUnRefusDePlafond({ code: 'XX000', message: PHRASE_DU_SERVEUR })).toBe(false);
    expect(estUnRefusDePlafond({ message: PHRASE_DU_SERVEUR })).toBe(false);
    expect(estUnRefusDePlafond(new Error(PHRASE_DU_SERVEUR))).toBe(false);
    expect(estUnRefusDePlafond(PHRASE_DU_SERVEUR)).toBe(false);
  });

  // Les codes voisins de la classe `RM` disent autre chose (`RM001` : une autre action est engagée,
  // `RM003` : les préconditions du contexte, `RM006` : un bilan qui ne se retire pas, `RM007` : l'écriture
  // directe d'un retrait), et une panne ne porte pas le sien.
  it('ne prend pas pour un plafond un autre refus du produit, une contrainte ni une panne', () => {
    for (const code of ['RM001', 'RM003', 'RM004', 'RM006', 'RM007', 'RM00', 'RM0022', 'rm002', '23514', '42501', 'P0002', 'PGRST116', 'XX000', '']) {
      expect(estUnRefusDePlafond({ code })).toBe(false);
    }
  });

  it('ne lève sur rien et rend faux pour ce qui n’est pas une erreur de la base', () => {
    for (const erreur of [null, undefined, 0, 502, true, '', 'RM002', [], { code: 2 }, { code: null }, { code: ['RM002'] }]) {
      expect(estUnRefusDePlafond(erreur)).toBe(false);
    }
  });

  // L'erreur d'une coupure réseau n'a pas de code : elle garde la phrase d'une panne.
  it('laisse à la phrase d’une panne l’échec qui n’a jamais atteint Postgres', () => {
    expect(estUnRefusDePlafond(new TypeError('Network request failed'))).toBe(false);
    expect(estUnRefusDePlafond({ message: 'Failed to fetch' })).toBe(false);
  });

  // Le code est celui que la base lève (`20261005170000`, test pgTAP `51`) : la valeur est épinglée une
  // fois, pour qu'une retouche de la constante ne passe pas inaperçue sous des assertions qui l'importent.
  it('épingle le SQLSTATE que la base lève', () => {
    expect(CODE_REFUS_DE_PLAFOND).toBe('RM002');
  });
});

describe('les phrases d’un plafond atteint', () => {
  const phrases = { TROP_DE_BILANS, TROP_DE_CHANGEMENTS_D_ENGAGEMENT };

  it.each(Object.entries(phrases))('%s dit ce qui n’a pas été enregistré', (_nom, phrase) => {
    expect(phrase).toMatch(/^Ton (choix|bilan) n’a pas été enregistré/);
  });

  // Le refus dure jusqu'à vingt-quatre heures après la première écriture de la fenêtre : « Réessaie dans
  // un instant » serait faux. « Réessaie demain » est l'arrondi qu'a gardé la personne qui pilote le
  // 19/10/2026 pour le plafond des corrections du contexte, et ces phrases en prennent la forme.
  it.each(Object.entries(phrases))('%s dit la suite à attendre : demain', (_nom, phrase) => {
    expect(phrase.endsWith(' Réessaie demain.')).toBe(true);
    expect(phrase.split('Réessaie')).toHaveLength(2);
  });

  // Ni la limite (un réglage du serveur, que le client ne connaît pas), ni la panne, ni la connexion, ni
  // un retour immédiat — et aucune ponctuation de reproche.
  it.each(Object.entries(phrases))('%s ne dit ni chiffre, ni plafond, ni serveur, ni connexion, ni instant', (_nom, phrase) => {
    expect(phrase).not.toMatch(/\d/);
    expect(phrase).not.toMatch(/plafond|limite|maximum|trop|serveur|connexion|instant|tout de suite|maintenant|!/i);
  });

  it('épingle les deux phrases, mot pour mot', () => {
    expect(TROP_DE_CHANGEMENTS_D_ENGAGEMENT).toBe(
      'Ton choix n’a pas été enregistré : ton engagement a déjà changé de nombreuses fois aujourd’hui. Réessaie demain.'
    );
    expect(TROP_DE_BILANS).toBe(
      'Ton bilan n’a pas été enregistré : tu as déjà commencé de nombreux bilans aujourd’hui. Tes réponses sont conservées. Réessaie demain.'
    );
  });

  // Un bilan refusé à la création n'a rien écrit côté serveur, et le brouillon reste sur l'appareil : la
  // phrase le dit, comme celle de toute panne de la soumission. Ce n'est pas le cas d'un engagement, qui
  // n'a pas de brouillon — la phrase ne promet rien qu'elle ne garde.
  it('ne promet des réponses conservées que pour le bilan', () => {
    expect(TROP_DE_BILANS).toContain('Tes réponses sont conservées.');
    expect(TROP_DE_CHANGEMENTS_D_ENGAGEMENT).not.toContain('conservé');
  });
});
