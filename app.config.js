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

module.exports = ({ config }) => {
  const manquantes = variablesManquantes(process.env);
  if (manquantes.length > 0) {
    throw new Error(
      `Build « ${process.env.EAS_BUILD_PROFILE} » refusé : ${manquantes.join(', ')} manque dans` +
        ' l’environnement EAS de ce profil (expo.dev → projet → Environment variables). Sans elle,' +
        ' l’app se construit mais ne reçoit aucune notification, ou démarre sans configuration' +
        ' (docs/exploitation/README.md §3.3).'
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
