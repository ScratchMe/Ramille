import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { ensureSession, supabase } from '@/lib/supabase';

// Racine de l'app — jamais un écran visible en pratique (redirection immédiate dès que la
// session est prête) : remplace l'ancien smoke-test Supabase qui vivait ici (déplacé vers
// /status) et servait jusqu'ici de landing par défaut, y compris après un retour d'auth
// Google sur web (redirectTo non explicite -> Supabase revient sur le Site URL configuré,
// c'est-à-dire cette racine). Décide entre onboarding et plan selon qu'un bilan complété
// existe déjà pour la session courante (anonyme ou rattachée) : un utilisateur qui vient de
// se connecter ou qui revient sur l'app doit retomber sur son plan, pas repartir de zéro.
//
// **L'échec est un état de l'écran, jamais un silence.** Cet effet n'avait pas de `catch`,
// et ça a coûté un cycle de build complet le 07/09 : `getSession()` échouait sur Android
// (module natif AsyncStorage en désaccord de version avec le SDK), la promesse était rejetée
// sans que personne l'écoute, et l'app restait sur son indicateur de chargement — sans
// message, sans requête réseau, donc sans trace nulle part. Une redirection qui n'aboutit
// pas doit se voir : c'est le seul écran par lequel tout le monde passe.
export default function Index() {
  const theme = useTheme();
  const [echec, setEchec] = useState<string | null>(null);

  // Le `setState` d'échec vit **après** un `await`, dans une fonction asynchrone : une
  // écriture synchrone depuis le corps d'un effet déclencherait une cascade de rendus, que
  // le React Compiler (activé dans `app.json`) refuse — `react-hooks/set-state-in-effect`.
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    let annule = false;

    (async () => {
      try {
        await ensureSession();
        const { data, error } = await supabase
          .from('assessments')
          .select('id')
          .eq('status', 'completed')
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (annule) return;
        router.replace(data ? '/plan' : '/onboarding');
      } catch (erreur) {
        console.error('Démarrage impossible :', erreur);
        if (annule) return;
        setEchec(erreur instanceof Error ? erreur.message : String(erreur));
      }
    })();

    return () => {
      annule = true;
    };
  }, [tentative]);

  // Gestionnaire d'événement : ici l'écriture synchrone est légitime, et l'incrément de
  // `tentative` relance l'effet.
  const reessayer = () => {
    setEchec(null);
    setTentative((n) => n + 1);
  };

  if (echec !== null) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.bloc}>
            <ThemedText type="title" weight={600} style={styles.titre}>
              Le démarrage a échoué
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.corps}>
              Vérifie ta connexion et réessaie. Si ça se reproduit, cette précision aidera à
              comprendre :
            </ThemedText>
            {/* Message technique, volontairement brut : il est destiné à être recopié, pas
                lu comme du produit. Ni la voix de Ramille ni un ton rassurant n'ont leur
                place ici — ce qu'il faut, c'est la cause exacte. */}
            <ThemedText type="code" themeColor="textTertiary" style={styles.detail}>
              {echec}
            </ThemedText>
            <Button title="Réessayer" onPress={reessayer} style={styles.bouton} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeAreaCentre}>
        <ActivityIndicator color={theme.textTertiary} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeAreaCentre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeArea: { flex: 1, justifyContent: 'center', padding: 24 },
  bloc: { gap: 16 },
  titre: { fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },
  corps: { fontSize: 15, lineHeight: 22 },
  detail: { fontSize: 12, lineHeight: 18 },
  bouton: { marginTop: 8 },
});
