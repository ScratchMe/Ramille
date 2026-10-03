import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BandeHaute } from '@/components/bande-haute';
import { ThemedView } from '@/components/themed-view';

/**
 * Le cadre des deux piles d'onglet : la zone sûre du haut et la bande, rendues une fois par pile
 * (`v1-33` T-13, 03/10/2026).
 *
 * **Le défaut.** Chaque écran des deux onglets rendait lui-même `ThemedView`, `SafeAreaView` et
 * `BandeHaute`, état par état : seize fois pour quatre écrans. C'est ainsi que le chargement et
 * l'erreur de la restitution les avaient perdus (R-9) — la bande arrivait avec le contenu, d'un saut
 * de 52 px. Le layout de chaque pile (`(tabs)/plan/_layout.tsx`, `(tabs)/suivi/_layout.tsx`) pose
 * désormais ce cadre autour de sa `Stack`, et un écran ne rend plus que son contenu : un état ne peut
 * plus oublier la bande, et elle ne se recrée plus à chaque écran poussé dans la pile.
 *
 * **Sans bord bas** : la barre d'onglets porte le sien. La bande reste au-dessus de la pile, donc
 * immobile quand on pousse les pistes ou une restitution — c'est là que viendra le retour dont iOS
 * aura besoin, son créneau de gauche l'attend (`bande-haute.tsx`).
 */
export function CadreDOnglet({ children }: { children: ReactNode }) {
  return (
    <ThemedView style={styles.cadre}>
      <SafeAreaView style={styles.zone} edges={['top', 'left', 'right']}>
        <BandeHaute />
        {children}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  cadre: { flex: 1 },
  zone: { flex: 1 },
});
