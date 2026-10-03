import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { faceAuClavier } from '@/types/face-au-clavier';

/**
 * Ce qui doit rester au-dessus du clavier : le champ qu'on remplit, et le pied qui porte « Suivant »
 * ou « Envoyer » (03/10/2026, ligne 01.3 de la recette du build d'octobre ; la règle, `faceAuClavier`).
 *
 * Se pose **dans** la zone sûre, autour de tout ce qu'elle contient : le rembourrage se compte alors
 * depuis le bas de la zone, et la barre de navigation d'Android n'est pas comptée deux fois. Sur le
 * web, il ne rend que ses enfants.
 */
export function AuDessusDuClavier({ children }: { children: ReactNode }) {
  const comportement = faceAuClavier(Platform.OS);
  if (comportement === null) return <>{children}</>;
  return (
    <KeyboardAvoidingView behavior={comportement} style={styles.cadre}>
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  cadre: { flex: 1 },
});
