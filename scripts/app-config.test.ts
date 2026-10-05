/// <reference types="node" />
/**
 * Garde des variables d'un build distribué (`app.config.js`, 04/10/2026).
 *
 * Le fichier est la configuration qu'EAS évalue au build : rien dans la CI ne l'exécute, et un
 * refus qu'on réécrirait de travers ne se verrait qu'au build suivant — ou pire, ne se verrait
 * pas, et l'AAB partirait sans Firebase. Ce test le charge donc **tel quel** et l'appelle avec de
 * faux environnements, comme le CLI le ferait.
 *
 * Non-vacuité, mesurée le 04/10/2026 en cassant la garde trois fois (chaque mutation remise en
 * place avant la suivante) : ne plus exiger `GOOGLE_SERVICES_JSON` fait tomber 2 tests ; retirer
 * `preview` des profils distribués en fait tomber 1 ; ne plus regarder `EAS_BUILD` (refuser
 * aussi en local) en fait tomber 1.
 *
 * Et depuis le 05/10/2026 (v1-27 §12.39), la garde de la clé legacy : retirer le refus de la clé
 * `eyJ…` fait tomber 1 test ; l'étendre à un build local (sans `EAS_BUILD`) en fait tomber 1.
 */

type Configuration = { android?: Record<string, unknown>; name?: string };
type FabriqueDeConfiguration = (entree: { config: Configuration }) => Configuration;

const VARIABLES = [
  'EAS_BUILD',
  'EAS_BUILD_PROFILE',
  'GOOGLE_SERVICES_JSON',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
] as const;

const COMPLET = {
  GOOGLE_SERVICES_JSON: '/home/expo/workingdir/google-services.json',
  EXPO_PUBLIC_SUPABASE_URL: 'https://exemple.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'cle-publique',
};

const sauvegarde: Partial<Record<(typeof VARIABLES)[number], string | undefined>> = {};

beforeEach(() => {
  for (const nom of VARIABLES) {
    sauvegarde[nom] = process.env[nom];
    delete process.env[nom];
  }
});

afterEach(() => {
  for (const nom of VARIABLES) {
    if (sauvegarde[nom] === undefined) delete process.env[nom];
    else process.env[nom] = sauvegarde[nom];
  }
});

function evaluer(env: Partial<Record<(typeof VARIABLES)[number], string>>): Configuration {
  Object.assign(process.env, env);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fabrique: FabriqueDeConfiguration = require('../app.config.js');
  return fabrique({ config: { name: 'Ramille', android: { package: 'fr.ramille.app' } } });
}

describe('app.config.js — un build distribué refuse ce qui lui manque', () => {
  it('branche google-services.json quand la variable est là', () => {
    const config = evaluer({ EAS_BUILD: 'true', EAS_BUILD_PROFILE: 'production', ...COMPLET });
    expect(config.android).toEqual({
      package: 'fr.ramille.app',
      googleServicesFile: COMPLET.GOOGLE_SERVICES_JSON,
    });
  });

  it('refuse un build de production sans GOOGLE_SERVICES_JSON, et nomme la variable', () => {
    const { GOOGLE_SERVICES_JSON: _absente, ...sansFirebase } = COMPLET;
    expect(() => evaluer({ EAS_BUILD: 'true', EAS_BUILD_PROFILE: 'production', ...sansFirebase })).toThrow(
      /GOOGLE_SERVICES_JSON/
    );
  });

  it('refuse aussi un build preview : la recette doit recevoir les notifications', () => {
    const { GOOGLE_SERVICES_JSON: _absente, ...sansFirebase } = COMPLET;
    expect(() => evaluer({ EAS_BUILD: 'true', EAS_BUILD_PROFILE: 'preview', ...sansFirebase })).toThrow(
      /GOOGLE_SERVICES_JSON/
    );
  });

  it('refuse un build sans la configuration Supabase, figée au build', () => {
    expect(() =>
      evaluer({
        EAS_BUILD: 'true',
        EAS_BUILD_PROFILE: 'production',
        GOOGLE_SERVICES_JSON: COMPLET.GOOGLE_SERVICES_JSON,
      })
    ).toThrow(/EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it('refuse un build distribué qui embarque encore la clé legacy (JWT, préfixe eyJ)', () => {
    expect(() =>
      evaluer({
        EAS_BUILD: 'true',
        EAS_BUILD_PROFILE: 'production',
        GOOGLE_SERVICES_JSON: COMPLET.GOOGLE_SERVICES_JSON,
        EXPO_PUBLIC_SUPABASE_URL: COMPLET.EXPO_PUBLIC_SUPABASE_URL,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.charge.utile',
      })
    ).toThrow(/clé legacy/);
  });

  it('laisse passer un build distribué avec la clé publishable', () => {
    const config = evaluer({
      EAS_BUILD: 'true',
      EAS_BUILD_PROFILE: 'production',
      GOOGLE_SERVICES_JSON: COMPLET.GOOGLE_SERVICES_JSON,
      EXPO_PUBLIC_SUPABASE_URL: COMPLET.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_xxxxxxxxxxxxxxxxxxxxxx',
    });
    expect(config.android).toEqual({
      package: 'fr.ramille.app',
      googleServicesFile: COMPLET.GOOGLE_SERVICES_JSON,
    });
  });

  it('ne regarde pas la forme de la clé hors du builder (build local)', () => {
    const config = evaluer({
      EAS_BUILD_PROFILE: 'production',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.charge.utile',
    });
    expect(config.android).toEqual({ package: 'fr.ramille.app' });
  });

  it('laisse passer un build development, qui n’est pas distribué', () => {
    const config = evaluer({ EAS_BUILD: 'true', EAS_BUILD_PROFILE: 'development' });
    expect(config.android).toEqual({ package: 'fr.ramille.app' });
  });

  it('laisse passer la configuration lue en local, hors du builder', () => {
    const config = evaluer({ EAS_BUILD_PROFILE: 'production' });
    expect(config.android).toEqual({ package: 'fr.ramille.app' });
  });
});
