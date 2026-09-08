import {
  SplineSans_400Regular,
  SplineSans_500Medium,
  SplineSans_600SemiBold,
  SplineSans_700Bold,
  useFonts,
} from '@expo-google-fonts/spline-sans';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { ConfigurationManquante } from '@/components/configuration-manquante';
import { TitreDePage } from '@/components/titre-de-page';
import { useTrackView } from '@/hooks/use-track-view';
import { createSessionFromUrl } from '@/lib/auth';
import {
  afficherLesNotificationsAuPremierPlan,
  enregistrerLeJeton,
  estNatif,
  preparerLeCanalAndroid,
} from '@/lib/rappels';
import { configurationSupabase, ensureSession } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

// Hors du composant : le gestionnaire est global à l'app, et l'installer à chaque rendu ne
// servirait à rien. Sans lui, un rappel reçu app ouverte disparaît sans laisser de trace —
// or c'est le moment où la personne peut y répondre en un geste.
if (estNatif) afficherLesNotificationsAuPremierPlan();

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
  //
  // Le jeton d'appareil suit la session, donc **après** elle : `register_push_token` reprend
  // le jeton à son propriétaire précédent, ce qui est exactement le cas d'un appareil dont la
  // session anonyme vient de devenir un compte (v1-12 §5.3). Silencieux dans les deux sens :
  // ni la réussite ni l'échec ne regardent l'utilisateur, et la carte d'attente du plan dit
  // déjà, elle, si les notifications sont coupées.
  useEffect(() => {
    if (!configurationSupabase.complete) return;
    ensureSession()
      .then(() => {
        void preparerLeCanalAndroid();
        return enregistrerLeJeton();
      })
      .catch((error) => {
        console.error('ensureSession() a échoué au démarrage :', error);
      });
  }, []);

  // Lien de connexion par email ouvert depuis la messagerie du téléphone : il revient par le
  // scheme `ramille://` avec les jetons dans le fragment, et personne n'attend cette URL —
  // contrairement au retour Google, qui passe par `openAuthSessionAsync`. Sur web,
  // `detectSessionInUrl` s'en charge et ce hook ne fait rien. Une fois la session ouverte, la
  // racine route vers le plan ou l'onboarding selon ce que porte le compte retrouvé.
  const urlEntrante = Linking.useURL();
  useEffect(() => {
    if (!configurationSupabase.complete) return;
    if (Platform.OS === 'web' || !urlEntrante || !urlEntrante.includes('access_token=')) return;
    createSessionFromUrl(urlEntrante).then(({ error }) => {
      if (error) {
        console.error('Le lien de connexion n’a pas pu ouvrir de session :', error);
        return;
      }
      router.replace('/');
    });
  }, [urlEntrante]);

  // Appuyer sur un rappel ouvre l'app. Dans le cas courant il n'y a **rien à faire** : la
  // racine route déjà vers le plan dès qu'un bilan existe, et le point y est en tête (v1-11
  // flux 4). Ce hook ne sert qu'au cas où l'app était déjà ouverte ailleurs — sur « Toi »,
  // dans le questionnaire — où personne ne ramènerait au plan sans lui.
  //
  // `useLastNotificationResponse` plutôt qu'un listener : il couvre aussi le démarrage à
  // froid, où l'événement est déjà passé quand l'écouteur s'installerait.
  const reponseNotification = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!estNatif || !reponseNotification) return;
    const cible = reponseNotification.notification.request.content.data?.url;
    if (cible === '/plan') router.navigate('/plan');
  }, [reponseNotification]);

  // Dénominateur de tous les entonnoirs. Émis après `ensureSession()` dans l'ordre des
  // effets, mais sans dépendre de lui : si la session n'est pas encore là, `track` renonce
  // et l'événement est perdu — un défaut assumé, préférable à une file d'attente.
  useTrackView('app_open');

  // Ne jamais bloquer tout l'arbre sur le chargement de la police : sur le rendu
  // statique web (expo export), useFonts ne résout jamais pendant la génération —
  // un early-return ici ferait exporter des pages vides (vérifié : le HTML statique
  // ne contenait que des marqueurs Suspense, contenu réel présent seulement après
  // hydratation côté client). Le texte s'affiche avec le fallback système puis bascule
  // sur Spline Sans dès que le chargement aboutit, natif comme web.
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <TitreDePage />
      {/* **Avant la pile, pas à l'intérieur.** Chaque écran importe `@/lib/supabase` : rendre
          l'écran d'erreur comme une route de plus le ferait précéder par le chargement d'un
          module qui, justement, ne peut pas fonctionner. Ici, aucune route n'est montée —
          l'app s'arrête net, et elle le dit. */}
      {configurationSupabase.complete ? (
        <Stack screenOptions={{ headerShown: false }} />
      ) : (
        <ConfigurationManquante problemes={configurationSupabase.problemes} />
      )}
    </ThemeProvider>
  );
}
