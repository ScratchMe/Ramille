import { Stack } from 'expo-router';

import { CadreDOnglet } from '@/components/cadre-d-onglet';

// Pile de l'onglet Suivi : l'écran lui-même, et le détail d'un bilan (`suivi/bilan`). Une
// pile imbriquée dans un onglet garde la barre visible avec cet onglet actif — c'est la seule
// façon d'avoir la barre sur le résultat sans dupliquer un composant de barre. La bande haute et
// la zone sûre sont posées ici, autour de la pile, et non dans chaque écran (`CadreDOnglet`,
// `v1-33` T-13).
export default function SuiviLayout() {
  return (
    <CadreDOnglet>
      <Stack screenOptions={{ headerShown: false }} />
    </CadreDOnglet>
  );
}
