import { Stack } from 'expo-router';

// Pile de l'onglet Suivi : l'écran lui-même, et le détail d'un bilan (`suivi/bilan`). Une
// pile imbriquée dans un onglet garde la barre visible avec cet onglet actif — c'est la seule
// façon d'avoir la barre sur le résultat sans dupliquer un composant de barre.
export default function SuiviLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
