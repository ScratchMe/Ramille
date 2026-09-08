// Configuration d'app dynamique — elle **étend** `app.json`, qui reste la source de tout le
// reste (Expo lit les deux et fusionne, le statique d'abord).
//
// Son unique rôle : brancher `google-services.json` sans le mettre dans le dépôt. Le fichier
// est déposé sur expo.dev en variable d'environnement de type **fichier**
// (`GOOGLE_SERVICES_JSON`), et EAS le matérialise sur le disque du builder en passant son
// chemin ici. Sans lui, l'app se construit et tourne — mais aucune notification n'arrive, et
// rien ne le dit (v1-12 §5.2).
//
// Rien à voir avec le piège `EXPO_PUBLIC_*` du CLAUDE.md : cette configuration est lue au
// moment du build par le CLI, jamais repliée dans le bundle par Babel.
module.exports = ({ config }) => {
  const cheminGoogleServices = process.env.GOOGLE_SERVICES_JSON;

  return {
    ...config,
    android: {
      ...config.android,
      ...(cheminGoogleServices ? { googleServicesFile: cheminGoogleServices } : {}),
    },
  };
};
