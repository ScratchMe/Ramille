/**
 * Le contexte B4, éditable hors du questionnaire (C6.4) — et depuis `v1-34` (02/10/2026), ce qui passe
 * près de chez soi à la place de l'accès aux transports.
 *
 * Éprouvé en le cassant le 03/10/2026 (`TESTING.md` §1.1), chacune faisant tomber la sienne :
 *   - `basculerTransport` qui garde « rien de tout ça » quand on coche une autre puce → « une autre
 *     puce retire “rien de tout ça” », seul ;
 *   - `basculerTransport` qui rend `[]` au lieu de `null` quand plus rien n'est coché → « plus rien de
 *     coché, plus de réponse », seul ;
 *   - `transportsRanges` qui garde l'ordre des touchers (`[...new Set(…)]`) → « range dans l'ordre des
 *     puces », « coche et décoche une puce » et « ne voit rien quand seul l'ordre change » — trois, parce
 *     que la bascule et la comparaison rangent toutes deux par elle ;
 *   - `lireLeContexte` qui accepte « rien de tout ça » combiné → « refuse une réponse incohérente »,
 *     seul.
 */
import {
  basculerTransport,
  CHOIX_DE_TRANSPORTS,
  CHOIX_DE_VEHICULES,
  CHOIX_DE_ZONE,
  contexteAChange,
  contexteEstComplet,
  lireLeContexte,
  phraseDuCalculDuContexte,
  transportsRanges,
  type ChoixDeContexte,
} from '@/types/contexte';
import { REPONSES_FREQUENCE_DES_LOISIRS } from '@/types/bilan';

const choix = (surcharge: Partial<ChoixDeContexte> = {}): ChoixDeContexte => ({
  zone_type: 'periurbain',
  transports_proches: ['bus', 'train'],
  household_vehicles: '1',
  teletravail: 'un_jour',
  ...surcharge,
});

describe('les trois listes de puces', () => {
  // **Miroirs des `check` du schéma**, comme `PARTS_DU_SECOND_MODE` et `OCCUPATIONS_LONG_TRAJET` :
  // rien ne peut lire ces bornes depuis TypeScript, et une valeur hors bornes ne serait refusée
  // qu'à l'appel du RPC, en anglais. Ces listes sont aussi comparées à la base en CI
  // (`scripts/verifier-miroirs-de-check.mjs`), qui est la garde qui compte : celle-ci ne garde que
  // l'ordre des puces, que la base ne connaît pas.
  it('portent les valeurs que la base accepte, dans l’ordre de l’écran', () => {
    expect(CHOIX_DE_ZONE.map((c) => c.value)).toEqual(['urbain_dense', 'periurbain', 'rural']);
    expect(CHOIX_DE_TRANSPORTS.map((c) => c.value)).toEqual(['metro_tram', 'rer', 'train', 'bus', 'aucun']);
    expect(CHOIX_DE_VEHICULES.map((c) => c.value)).toEqual(['0', '1', '2_plus']);
  });

  it('donnent un libellé à chacune', () => {
    for (const liste of [CHOIX_DE_ZONE, CHOIX_DE_TRANSPORTS, CHOIX_DE_VEHICULES]) {
      for (const option of liste) {
        expect(option.label.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('transportsRanges', () => {
  // La jumelle de `public.transports_ranges`, que le déclencheur applique à chaque écriture.
  it('range dans l’ordre des puces, sans doublon', () => {
    expect(transportsRanges(['bus', 'metro_tram', 'bus', 'rer'])).toEqual(['metro_tram', 'rer', 'bus']);
  });
});

describe('basculerTransport', () => {
  it('coche et décoche une puce, en gardant l’ordre des puces', () => {
    expect(basculerTransport(null, 'bus')).toEqual(['bus']);
    expect(basculerTransport(['bus'], 'metro_tram')).toEqual(['metro_tram', 'bus']);
    expect(basculerTransport(['metro_tram', 'bus'], 'metro_tram')).toEqual(['bus']);
  });

  it('« rien de tout ça » retire tout le reste', () => {
    expect(basculerTransport(['metro_tram', 'bus'], 'aucun')).toEqual(['aucun']);
  });

  it('une autre puce retire « rien de tout ça »', () => {
    expect(basculerTransport(['aucun'], 'train')).toEqual(['train']);
  });

  // La base refuse le tableau vide, et une question sans réponse doit se voir comme telle :
  // `manqueDeLEtape` et `contexteEstComplet` lisent `null`.
  it('plus rien de coché, plus de réponse', () => {
    expect(basculerTransport(['bus'], 'bus')).toBeNull();
    expect(basculerTransport(['aucun'], 'aucun')).toBeNull();
  });
});

describe('lireLeContexte', () => {
  it('rend les quatre réponses quand elles sont connues, la réponse aux transports rangée', () => {
    expect(
      lireLeContexte({
        zone_type: 'rural',
        transports_proches: ['train', 'bus'],
        household_vehicles: '2_plus',
        teletravail: 'deux_ou_plus',
      })
    ).toEqual({
      zone_type: 'rural',
      transports_proches: ['train', 'bus'],
      household_vehicles: '2_plus',
      teletravail: 'deux_ou_plus',
    });
  });

  // Entière ou pas du tout : la question est à reposer plutôt qu'à corriger à moitié.
  it('refuse une réponse incohérente, inconnue ou vide', () => {
    const transports = (lus: string[] | null) =>
      lireLeContexte({ zone_type: 'rural', transports_proches: lus, household_vehicles: '1', teletravail: null })
        .transports_proches;
    expect(transports(['aucun', 'bus'])).toBeNull();
    expect(transports(['bus', 'tgv'])).toBeNull();
    expect(transports([])).toBeNull();
    expect(transports(null)).toBeNull();
  });

  it('ramène une valeur inconnue à `null` plutôt que de la propager', () => {
    // Le seul cas de production est un bilan d'avant la colonne ; une valeur hors liste ne peut
    // venir que d'une migration qui aurait ajouté une réponse sans passer par ce module. Dans les
    // deux cas on repose la question — envoyer la chaîne au RPC la ferait refuser par le `check`,
    // en anglais et après coup.
    expect(
      lireLeContexte({
        zone_type: 'montagne',
        transports_proches: null,
        household_vehicles: '3',
        teletravail: 'parfois',
      })
    ).toEqual({ zone_type: null, transports_proches: null, household_vehicles: null, teletravail: null });
  });
});

describe('contexteEstComplet', () => {
  it('exige les trois réponses posées à tout le monde', () => {
    expect(contexteEstComplet(choix({ zone_type: null }), true)).toBe(false);
    expect(contexteEstComplet(choix({ transports_proches: null }), true)).toBe(false);
    expect(contexteEstComplet(choix({ transports_proches: [] }), true)).toBe(false);
    expect(contexteEstComplet(choix({ household_vehicles: null }), true)).toBe(false);
  });

  it('exige le télétravail seulement quand la question se pose', () => {
    expect(contexteEstComplet(choix({ teletravail: null }), true)).toBe(false);
    expect(contexteEstComplet(choix({ teletravail: null }), false)).toBe(true);
  });

  it('accepte un contexte entier', () => {
    expect(contexteEstComplet(choix(), true)).toBe(true);
  });
});

describe('contexteAChange', () => {
  it('ne voit rien quand les quatre valeurs sont identiques', () => {
    expect(contexteAChange(choix(), choix())).toBe(false);
  });

  // **La jumelle du `is not distinct from` du RPC**, qui sort sans rien toucher dans ce cas. Les
  // quatre colonnes sont éprouvées une par une : en oublier une ferait promettre à l'écran un
  // enregistrement que le serveur n'effectuerait pas — et c'est la moitié silencieuse du défaut.
  it.each([
    ['zone_type', { zone_type: 'rural' as const }],
    ['transports_proches', { transports_proches: ['metro_tram' as const] }],
    ['household_vehicles', { household_vehicles: '0' as const }],
    ['teletravail', { teletravail: 'aucun' as const }],
  ])('voit un changement sur %s', (_colonne, patch) => {
    expect(contexteAChange(choix(), choix(patch))).toBe(true);
  });

  it('voit aussi une réponse qui disparaît', () => {
    expect(contexteAChange(choix(), choix({ teletravail: null }))).toBe(true);
  });

  // Le RPC compare la réponse rangée à la réponse stockée, rangée par le déclencheur : l'écran doit
  // conclure pareil, sans quoi il annoncerait un enregistrement que le serveur jugerait inutile.
  it('ne voit rien quand seul l’ordre des puces change', () => {
    expect(contexteAChange(choix({ transports_proches: ['bus', 'train'] }), choix({ transports_proches: ['train', 'bus'] }))).toBe(false);
  });
});

describe('phraseDuCalculDuContexte', () => {
  // **La phrase fixe était fausse pour le profil où l'écart est le plus grand** (C6.4). Mesuré sur
  // la base le 19/09/2026, par le RPC lui-même : un profil « sorties rares » passe de 10,88 kg à
  // 55,56 kg quand le foyer gagne un véhicule — le résiduel de sorties bascule du train à la
  // voiture. Sur les six bilans à sorties hebdomadaires, le même basculement vaut 1,2 %.
  it('dit l’exception à qui sort rarement', () => {
    const phrase = phraseDuCalculDuContexte('rarely');
    expect(phrase).toContain('véhicules du foyer');
    expect(phrase).not.toContain('n’entrent pas');
  });

  it('dit la règle à tous les autres', () => {
    const autres = REPONSES_FREQUENCE_DES_LOISIRS.map((r) => r.value).filter((f) => f !== 'rarely');
    expect(autres).toHaveLength(3); // « Deux ou trois fois par mois » comprise (02/10/2026, `v1-33` D5)
    for (const frequence of [...autres, null]) {
      expect(phraseDuCalculDuContexte(frequence)).toBe(
        'Elles n’entrent pas dans le calcul de ton bilan.'
      );
    }
  });
});
