import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { DUREE_ANIMATION_LANCEMENT, EcranLancement } from '@/components/ecran-lancement';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { loadBilanDraft } from '@/lib/bilan-draft';
import { ensureSession, supabase } from '@/lib/supabase';
import { decrireErreur } from '@/types/erreur';

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
  const [echec, setEchec] = useState<string | null>(null);

  // Le `setState` d'échec vit **après** un `await`, dans une fonction asynchrone : une
  // écriture synchrone depuis le corps d'un effet déclencherait une cascade de rendus, que
  // le React Compiler (activé dans `app.json`) refuse — `react-hooks/set-state-in-effect`.
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    let annule = false;
    const depart = Date.now();

    (async () => {
      try {
        await ensureSession();
        // **Le brouillon se lit ici, en parallèle** (C3.9, constat A1-13). Quelqu'un qui a
        // interrompu son questionnaire repartait de la racine, donc de l'onboarding : quatre
        // écrans de présentation, « Commencer mon bilan », et il atterrissait sans un mot à
        // l'étape 5. Les quatre écrans ne lui apprenaient rien — il les avait déjà vus, c'est
        // comme ça qu'il est arrivé au questionnaire la première fois.
        //
        // En parallèle et non à la suite : la lecture locale ne coûte rien, et l'enchaîner
        // derrière l'aller-retour serveur retarderait le démarrage de tout le monde pour un
        // cas minoritaire.
        const [{ data, error }, brouillon] = await Promise.all([
          supabase.from('assessments').select('id').eq('status', 'completed').limit(1).maybeSingle(),
          // Un échec de lecture locale ne doit pas emporter le démarrage : sans brouillon on
          // route comme avant, ce qui est exactement le comportement d'avant ce chantier.
          loadBilanDraft().catch(() => null),
        ]);
        // **Un échec de lecture n'empêche pas de reprendre un questionnaire commencé**
        // (contre-lecture de la vague 6, 14/09/2026). La racine conditionnait ses trois
        // destinations à la réussite de cette requête, dont une seule a besoin : le brouillon vit en
        // AsyncStorage et l'écran de reprise ne demande rien au réseau. Quelqu'un qui avait
        // interrompu sa saisie dans le métro tombait donc sur « Le démarrage a échoué ».
        //
        // **Et on s'arrête là, sans router vers `/onboarding` faute de mieux.** Le brouillon est une
        // preuve locale ; son absence n'en est pas une. Sans lui on ne sait pas distinguer un
        // visiteur neuf d'un compte existant dont la lecture a échoué, et envoyer le second à
        // l'onboarding lui dirait « tu n'as rien » — exactement ce qu'aucun écran de ce produit ne
        // dit sur un échec de lecture. `ensureSession()` ne rapporte pas si elle a créé ou restauré
        // la session, donc la distinction n'est pas disponible ici ; l'écran d'échec et son
        // « Réessayer » restent la réponse honnête.
        if (error && !brouillon) throw error;
        if (annule) return;
        // **Plancher d'affichage, pas délai ajouté.** Une session déjà en cache répond en
        // ~200 ms : l'écran d'ouverture était payé — un temps d'arrêt à chaque lancement —
        // sans jamais être vu. On complète jusqu'à la fin de l'animation, et un démarrage
        // plus lent que ça n'attend rien de plus. L'échec, lui, n'attend jamais : mieux vaut
        // le dire tout de suite.
        const reste = DUREE_ANIMATION_LANCEMENT - (Date.now() - depart);
        if (reste > 0) await new Promise((resoudre) => setTimeout(resoudre, reste));
        if (annule) return;
        // **Le brouillon ne détourne le démarrage que sans bilan complété.** Qui en a un a le
        // plan pour maison, et un re-bilan commencé ne doit pas s'emparer de l'ouverture de
        // l'app : le questionnaire se reprend depuis le suivi, pas à la place du plan.
        if (data && !error) {
          router.replace('/plan');
        } else if (brouillon) {
          router.replace({ pathname: '/bilan', params: { reprise: '1' } });
        } else {
          router.replace('/onboarding');
        }
      } catch (erreur) {
        console.error('Démarrage impossible :', erreur);
        if (annule) return;
        setEchec(decrireErreur(erreur));
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
            <ThemedText type="screenTitle">
              Le démarrage a échoué
            </ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
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

  return <EcranLancement />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'center', padding: 24 },
  bloc: { gap: 16 },
  detail: { fontSize: 12, lineHeight: 18 },
  bouton: { marginTop: 8 },
});
