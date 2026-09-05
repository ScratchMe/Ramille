import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Enveloppe HTML de l'export statique web — appliquée à la génération, jamais côté client.
 *
 * Sa seule raison d'être : `lang`. Le gabarit par défaut d'Expo Router annonce `lang="en"`,
 * ce qui, sur un produit dont l'interface est exclusivement française, fait lire tout le
 * texte à un lecteur d'écran avec la phonétique anglaise — et donne au passage un mauvais
 * signal de langue aux moteurs de recherche sur les deux pages légales, les seules surfaces
 * publiques.
 *
 * Le reste reproduit le gabarit par défaut : le retirer casserait le défilement web
 * (`ScrollViewStyleReset`) ou la mise à l'échelle mobile (viewport).
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
