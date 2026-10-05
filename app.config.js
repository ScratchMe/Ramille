// Configuration d'app dynamique — elle **étend** `app.json`, qui reste la source de tout le
// reste (Expo lit les deux et fusionne, le statique d'abord).
//
// Son premier rôle : brancher `google-services.json` sans le mettre dans le dépôt. Le fichier
// est déposé sur expo.dev en variable d'environnement de type **fichier**
// (`GOOGLE_SERVICES_JSON`), et EAS le matérialise sur le disque du builder en passant son
// chemin ici. Sans lui, l'app se construit et tourne — mais aucune notification n'arrive, et
// rien ne le dit (v1-12 §5.2).
//
// Rien à voir avec le piège `EXPO_PUBLIC_*` du CLAUDE.md : cette configuration est lue au
// moment du build par le CLI, jamais repliée dans le bundle par Babel.
//
// **Son second rôle, depuis le 04/10/2026 : refuser un build distribué auquel il manque une
// variable** (revue finale avant la production). Le branchement était silencieux — sans la
// variable, `googleServicesFile` était simplement omis —, et aucun build `production` n'avait
// encore dépassé la lecture de la configuration : les builds réussis étaient tous des `preview`.
// Un AAB sans Firebase passe l'examen de Play et n'enregistre aucun jeton de notification ; un
// build sans `EXPO_PUBLIC_SUPABASE_*` affiche « Configuration manquante » à tout le monde, et
// ses valeurs sont figées au build. Les deux se découvraient chez la personne. Le refus ne vaut
// que sur le builder d'EAS (`EAS_BUILD`) et pour les profils distribués : un `expo start` local,
// ou un build `development`, n'en a pas besoin.
const PROFILS_DISTRIBUES = ['preview', 'production'];
const VARIABLES_EXIGEES = ['GOOGLE_SERVICES_JSON', 'EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];

function variablesManquantes(env) {
  if (env.EAS_BUILD !== 'true' || !PROFILS_DISTRIBUES.includes(env.EAS_BUILD_PROFILE)) return [];
  return VARIABLES_EXIGEES.filter((nom) => !env[nom]);
}

// **Troisième rôle, depuis la seconde passe de sécurité (v1-27 §12.39) : refuser un build distribué
// qui embarquerait l'ancienne clé `anon` HS256** (un JWT, qui commence par `eyJ`). On veut révoquer
// cette clé — le secret symétrique qui la signe a vécu dans les variables Vercel, et qui le connaît
// forge un jeton `authenticated` pour n'importe quel compte (constat 4 du rapport). La révocation ne
// peut se faire qu'une fois que plus aucune app ne la présente : l'app embarque la clé
// `sb_publishable_…` sur le web, mais l'APK du 05/10 portait encore le JWT. Cette garde fait échouer
// le build tant que `EXPO_PUBLIC_SUPABASE_ANON_KEY` d'EAS n'est pas passé à la clé publishable, pour
// que le build du 07/10 soit le premier à ne plus porter le JWT. Même esprit que le refus ci-dessus :
// seulement sur le builder d'EAS, seulement pour les profils distribués.
function cleAnonLegacy(env) {
  if (env.EAS_BUILD !== 'true' || !PROFILS_DISTRIBUES.includes(env.EAS_BUILD_PROFILE)) return false;
  return (env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').startsWith('eyJ');
}

module.exports = ({ config }) => {
  const manquantes = variablesManquantes(process.env);
  if (manquantes.length > 0) {
    const plusieurs = manquantes.length > 1;
    throw new Error(
      `Build « ${process.env.EAS_BUILD_PROFILE} » refusé : ${manquantes.join(', ')} ` +
        `${plusieurs ? 'manquent' : 'manque'} dans l’environnement EAS de ce profil (expo.dev →` +
        ` projet → Environment variables). Sans ${plusieurs ? 'elles' : 'elle'}, l’app se construit` +
        ' mais ne reçoit aucune notification, ou démarre sans configuration' +
        ' (docs/exploitation/README.md §3.3).'
    );
  }

  if (cleAnonLegacy(process.env)) {
    throw new Error(
      `Build « ${process.env.EAS_BUILD_PROFILE} » refusé : EXPO_PUBLIC_SUPABASE_ANON_KEY est encore` +
        ' une clé legacy (JWT, préfixe « eyJ »). Remplace-la par la clé publishable (préfixe' +
        ' « sb_publishable_ ») dans l’environnement EAS de ce profil (expo.dev → projet →' +
        ' Environment variables), pour qu’on puisse révoquer l’ancienne clé HS256 (v1-27 §12.39,' +
        ' docs/exploitation/README.md §3.1).'
    );
  }

  const cheminGoogleServices = process.env.GOOGLE_SERVICES_JSON;

  return {
    ...config,
    android: {
      ...config.android,
      ...(cheminGoogleServices ? { googleServicesFile: cheminGoogleServices } : {}),
    },
  };
};
