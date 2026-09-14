import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { decrireErreur } from '@/types/erreur';

// Écran rendu quand une exception de rendu remonte jusqu'à l'`ErrorBoundary` du layout racine
// (chantier C0.4, constat C-1). Sans lui, rien ne rattrape l'exception : Expo Router 57 ne monte
// un `Try` que là où une route exporte un `ErrorBoundary` (`build/useScreens.js`), donc l'arbre
// React tombe et la page reste blanche — c'est la panne du 08/09/2026. L'écran de secours de la
// bibliothèque, « Something went wrong » en anglais sur fond noir, est ce qu'on obtiendrait en
// l'exportant à la place de celui-ci : le seul moment où le produit parlerait une autre langue
// serait celui où il est déjà en panne.
//
// **Aucune mascotte ici, et ce n'est pas un oubli.** Ramille accompagne, elle ne commente pas
// une panne : il n'y a rien d'encourageant à dire à quelqu'un dont l'écran vient de tomber, et
// un visage à côté d'un message technique se lit comme de la désinvolture. Le registre est
// exactement celui de l'échec de démarrage de `src/app/index.tsx` : une phrase humaine, le
// détail technique brut en dessous, un bouton.
//
// **Le titre est recopié dans `scripts/verifier-rendu-export.mjs`** (liste `ECRANS_DE_PANNE`) :
// la garde de rendu échoue si une route exportée l'affiche. Changer ce titre sans aller le
// changer là-bas ne casse rien — c'est pire, ça rend le contrôle aveugle.

export type ErreurInattendueProps = {
  /** Ce qui a été jeté. `ErrorBoundaryProps` l'annonce en `Error`, mais React transmet ce
   *  qu'il a reçu — une chaîne, un objet sans `message`, `undefined`. Cet écran est le dernier
   *  filet : il ne doit jamais échouer à son tour, d'où `unknown` et la normalisation. */
  erreur: unknown;
  /** Relance le rendu de l'arbre. Côté Expo Router, `retry` rend une promesse ; l'appelant
   *  l'ignore, un bouton n'attend pas. */
  reessayer: () => void;
};

export function ErreurInattendue({ erreur, reessayer }: ErreurInattendueProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Défilable, et pour une raison précise : ce bloc technique n'a pas de hauteur
            prévisible (cf. `DETAIL_MAX`), et sans défilement un détail long pousserait
            « Réessayer » hors de l'écran pendant que le titre sortirait par le haut — le
            dernier filet deviendrait une impasse. `ConfigurationManquante` porte le même
            `ScrollView` pour cette raison ; ici le `flexGrow: 1` + `justifyContent` du
            conteneur gardent en plus le centrage quand le texte est court. */}
        <ScrollView contentContainerStyle={styles.contenu}>
          <View style={styles.bloc}>
            {/* Annoncé comme en-tête par son `type`, pas par un attribut recopié à côté. */}
            <ThemedText type="screenTitle">L’écran n’a pas pu s’afficher</ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              Réessaie. Si ça se reproduit, cette précision aidera à comprendre :
            </ThemedText>
            {/* Message technique, volontairement brut et sélectionnable : il est destiné à être
                recopié, pas lu comme du produit. Ce qu'il faut ici, c'est la cause exacte. */}
            <ThemedText
              type="code"
              themeColor="textTertiary"
              style={styles.detail}
              selectable
            >
              {decrireErreur(erreur)}
            </ThemedText>
            {/* `Button` porte la cible tactile (hauteur 54, au-delà des 44 px de
                `ControlHeight.target`) et le rôle `button` avec le libellé visible. */}
            <Button title="Réessayer" onPress={reessayer} style={styles.bouton} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  contenu: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  bloc: { gap: 16 },
  detail: { fontSize: 12, lineHeight: 18 },
  bouton: { marginTop: 8 },
});
