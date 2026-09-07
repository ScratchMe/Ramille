import {
  decrireProbleme,
  lireConfigurationSupabase,
  urlPorteUnChemin,
  VARIABLES_SUPABASE,
} from './configuration';

const URL_VALIDE = 'https://nuugfepfsypqgvsvyzht.supabase.co';
const CLE = 'sb_publishable_exemple';

describe('lireConfigurationSupabase', () => {
  it('accepte une configuration complète', () => {
    const config = lireConfigurationSupabase({
      EXPO_PUBLIC_SUPABASE_URL: URL_VALIDE,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: CLE,
    });
    expect(config).toEqual({ complete: true, url: URL_VALIDE, anonKey: CLE });
  });

  it('signale une variable absente', () => {
    const config = lireConfigurationSupabase({
      EXPO_PUBLIC_SUPABASE_URL: URL_VALIDE,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: undefined,
    });
    expect(config).toEqual({
      complete: false,
      problemes: [{ type: 'manquante', variable: 'EXPO_PUBLIC_SUPABASE_ANON_KEY' }],
    });
  });

  // `EXPO_PUBLIC_SUPABASE_URL=` est l'erreur de .env la plus courante, et elle est
  // indiscernable d'une variable non déclarée à l'usage.
  it.each(['', '   ', '\n'])('traite une valeur blanche (%j) comme absente', (valeur) => {
    const config = lireConfigurationSupabase({
      EXPO_PUBLIC_SUPABASE_URL: valeur,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: CLE,
    });
    expect(config.complete).toBe(false);
    expect(config.complete === false && config.problemes).toEqual([
      { type: 'manquante', variable: 'EXPO_PUBLIC_SUPABASE_URL' },
    ]);
  });

  it('liste les deux variables dans l’ordre où on les renseigne', () => {
    const config = lireConfigurationSupabase({
      EXPO_PUBLIC_SUPABASE_URL: undefined,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: undefined,
    });
    expect(config.complete === false && config.problemes.map((p) => p.variable)).toEqual([
      ...VARIABLES_SUPABASE,
    ]);
  });

  // Le cas qui a coûté un cycle de build le 07/09/2026 : l'URL de l'API REST collée à la
  // place de celle du projet. Les deux variables sont renseignées, rien ne manque — et
  // pourtant chaque requête part vers /rest/v1/auth/v1/signup.
  it('refuse une URL qui porte un chemin', () => {
    const config = lireConfigurationSupabase({
      EXPO_PUBLIC_SUPABASE_URL: `${URL_VALIDE}/rest/v1`,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: CLE,
    });
    expect(config).toEqual({
      complete: false,
      problemes: [
        {
          type: 'url_avec_chemin',
          variable: 'EXPO_PUBLIC_SUPABASE_URL',
          valeur: `${URL_VALIDE}/rest/v1`,
        },
      ],
    });
  });

  it('nettoie les blancs autour des valeurs', () => {
    const config = lireConfigurationSupabase({
      EXPO_PUBLIC_SUPABASE_URL: `  ${URL_VALIDE}\n`,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: ` ${CLE} `,
    });
    expect(config).toEqual({ complete: true, url: URL_VALIDE, anonKey: CLE });
  });
});

describe('urlPorteUnChemin', () => {
  it.each([URL_VALIDE, `${URL_VALIDE}/`, 'http://localhost:54321'])('accepte %s', (url) => {
    expect(urlPorteUnChemin(url)).toBe(false);
  });

  it.each([`${URL_VALIDE}/rest/v1`, `${URL_VALIDE}/auth/v1`, `${URL_VALIDE}/rest/v1/`])(
    'refuse %s',
    (url) => {
      expect(urlPorteUnChemin(url)).toBe(true);
    }
  );
});

describe('decrireProbleme', () => {
  it('nomme la variable en cause', () => {
    expect(decrireProbleme({ type: 'manquante', variable: 'EXPO_PUBLIC_SUPABASE_URL' })).toContain(
      'EXPO_PUBLIC_SUPABASE_URL'
    );
  });

  it('donne la valeur fautive et la règle, pour l’URL avec chemin', () => {
    const message = decrireProbleme({
      type: 'url_avec_chemin',
      variable: 'EXPO_PUBLIC_SUPABASE_URL',
      valeur: `${URL_VALIDE}/rest/v1`,
    });
    expect(message).toContain('/rest/v1');
    expect(message).toContain('s’arrête au domaine');
  });
});
