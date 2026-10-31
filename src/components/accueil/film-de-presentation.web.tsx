// Le film de présentation sur la page d'accueil du web — une balise `<video>` du navigateur, qu'aucun
// composant React Native ne rend. Le pendant natif, `film-de-presentation.tsx`, ne rend rien : la page
// d'accueil n'existe que sur le web.
//
// **Rien ne se lance seul** : pas de lecture automatique, pas de boucle. Le film a sa musique, et « réduire
// les animations » ne doit rien mettre en mouvement (`FRONT-MOUVEMENT.md`) ; la personne le démarre avec
// les contrôles du navigateur, qui portent aussi le son, le plein écran et la reprise. `preload="none"` :
// rien ne se télécharge avant qu'on le demande, l'affiche suffit à le montrer — une visite qui ne regarde
// pas le film ne coûte que l'image.
//
// **Le format se choisit une fois, à l'arrivée** : le 4:5 sur un écran étroit, le 16:9 au-delà. Tourner le
// téléphone ensuite ne change pas de source, ce qui couperait la lecture en cours.
//
// **Son lancement se compte** (`compterSurLAccueil`, `v1-36` §5) : une fois par affichage de la page,
// sans rien qui désigne personne.
import { useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import { FILM, LARGEUR_DU_FILM_ETROIT } from '@/constants/accueil';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { compterSurLAccueil } from '@/lib/visites-de-l-accueil';

export function FilmDePresentation() {
  const theme = useTheme();
  const [source] = useState(() =>
    Dimensions.get('window').width < LARGEUR_DU_FILM_ETROIT ? FILM.sources.etroit : FILM.sources.large
  );

  return (
    <View style={[styles.cadre, { aspectRatio: source.rapport, backgroundColor: theme.backgroundElement }]}>
      <video
        controls
        playsInline
        preload="none"
        poster={source.affiche}
        aria-label={FILM.titre}
        onPlay={() => compterSurLAccueil('film_lance')}
        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', borderRadius: Radius.card }}
      >
        <source src={source.video} type="video/mp4" />
      </video>
    </View>
  );
}

const styles = StyleSheet.create({
  // **Pas de découpe sur le cadre** : l'arrondi est porté par la vidéo elle-même. Un `overflow: hidden`
  // ici couperait l'anneau de focus de la vidéo, que le navigateur dessine hors d'elle
  // (`FRONT-MOUVEMENT.md`, « Tenir une hauteur, c'est découper ce qui dépasse »).
  cadre: { width: '100%', borderRadius: Radius.card },
});
