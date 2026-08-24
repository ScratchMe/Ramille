import {
  SplineSans_400Regular,
  SplineSans_500Medium,
  SplineSans_600SemiBold,
  SplineSans_700Bold,
  useFonts,
} from '@expo-google-fonts/spline-sans';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { ensureSession } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    SplineSans_400Regular,
    SplineSans_500Medium,
    SplineSans_600SemiBold,
    SplineSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Fire-and-forget : la session anonyme n'a pas besoin d'exister avant le premier
  // rendu (rien à l'écran ne la lit tout de suite), seulement avant la première écriture
  // bilan — re-garantie à ce moment-là de toute façon (cf. ensureSession).
  useEffect(() => {
    ensureSession().catch((error) => {
      console.error('ensureSession() a échoué au démarrage :', error);
    });
  }, []);

  // Ne jamais bloquer tout l'arbre sur le chargement de la police : sur le rendu
  // statique web (expo export), useFonts ne résout jamais pendant la génération —
  // un early-return ici ferait exporter des pages vides (vérifié : le HTML statique
  // ne contenait que des marqueurs Suspense, contenu réel présent seulement après
  // hydratation côté client). Le texte s'affiche avec le fallback système puis bascule
  // sur Spline Sans dès que le chargement aboutit, natif comme web.
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
