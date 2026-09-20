import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { DUREE_ANIMATION_LANCEMENT, EcranLancement } from '@/components/ecran-lancement';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { loadBilanDraft } from '@/lib/bilan-draft';
import { aDejaVuUnBilan, marquerQuIlYAUnBilan } from '@/lib/marque-de-bilan';
import { ensureSession, supabase } from '@/lib/supabase';
import { STATUT_DE_BILAN } from '@/types/bilan';
import { estPanneDeTransport, type ErreurAuth } from '@/types/connexion';
import { destinationDuDemarrage, lireLeBilan, type LectureDuBilan } from '@/types/demarrage';
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
        // **Une création de session qui échoue par coupure de transport n'est pas un refus** (C4.5).
        // `ensureSession()` ne lève que sur l'échec de la **création** — les trois autres états
        // sortent sans rien faire (C2.11) — et c'est le cas de l'installation neuve hors ligne. On
        // ne lève donc pas, et on n'interroge pas la base non plus : sans session, la requête
        // partirait en `anon`, qui n'a aucun privilège sur `assessments`, et le `42501` se lirait
        // « erreur serveur » alors que c'est le réseau.
        let coupureALaSession = false;
        try {
          await ensureSession();
        } catch (erreurDeSession) {
          if (!estPanneDeTransport(erreurDeSession as ErreurAuth)) throw erreurDeSession;
          coupureALaSession = true;
        }

        // **Le brouillon se lit ici, en parallèle** (C3.9, constat A1-10). Quelqu'un qui a
        // interrompu son questionnaire repartait de la racine, donc de l'onboarding : quatre
        // écrans de présentation, « Commencer mon bilan », et il atterrissait sans un mot à
        // l'étape 5. Les quatre écrans ne lui apprenaient rien — il les avait déjà vus, c'est
        // comme ça qu'il est arrivé au questionnaire la première fois.
        //
        // En parallèle et non à la suite : les deux lectures locales ne coûtent rien, et les
        // enchaîner derrière l'aller-retour serveur retarderait le démarrage de tout le monde.
        const [reponse, brouillon, marqueDeBilan] = await Promise.all([
          coupureALaSession
            ? null
            : supabase
                .from('assessments')
                .select('id')
                .eq('status', STATUT_DE_BILAN.complete)
                .limit(1)
                .maybeSingle(),
          // Un échec de lecture locale ne doit pas emporter le démarrage : sans brouillon on
          // route comme avant, ce qui est exactement le comportement d'avant ce chantier.
          loadBilanDraft().catch(() => null),
          // La marque « cet appareil a vu un bilan complété » (C4.5). Elle rend `false` sur un
          // stockage indisponible, donc elle ne promet jamais rien qu'on ne puisse tenir.
          aDejaVuUnBilan(),
        ]);

        // **Toute la décision vit dans `src/types/demarrage.ts`**, qui est pur et testé sur la table
        // de `v1-15` §6 — et non ici, en cascade de `if`, où trois versions successives de ce fichier
        // ont écrit trois raisonnements différents. Ce qui reste ici est de la plomberie.
        const lecture: LectureDuBilan =
          reponse === null
            ? { etat: 'coupure' }
            : lireLeBilan({
                aUnBilan: reponse.data !== null,
                enErreur: reponse.error !== null,
                status: reponse.status,
              });

        // **La marque se pose sur une lecture réussie, et seulement là.** C'est ce qui l'empêche de
        // devenir une seconde source de vérité : elle n'est relue qu'au prochain démarrage, et
        // seulement si celui-là ne peut rien lire. Sans attendre — elle ne sert à rien tout de suite.
        if (lecture.etat === 'lue' && lecture.bilanComplete) void marquerQuIlYAUnBilan();

        const destination = destinationDuDemarrage(lecture, {
          brouillon: brouillon !== null,
          marqueDeBilan,
        });

        // **L'écran technique reste, et il reste pour les erreurs serveur** : son registre
        // développeur est une décision explicite, et son message brut est fait pour être recopié.
        // On relance l'erreur telle quelle plutôt que d'en fabriquer une, pour que `decrireErreur`
        // dise exactement ce que PostgREST a dit. Et avant le plancher d'affichage : l'échec
        // n'attend jamais.
        //
        // Le repli de ce `??` est inatteignable par construction — `echec` ne sort que de
        // `lecture.etat === 'erreur'`, qui implique une réponse porteuse d'une erreur. Il est en
        // français au cas où une quatrième forme de lecture le rendrait un jour atteignable.
        if (destination.vers === 'echec') {
          throw reponse?.error ?? new Error('Le serveur a refusé la lecture du bilan.');
        }

        if (annule) return;
        // **Plancher d'affichage, pas délai ajouté.** Une session déjà en cache répond en
        // ~200 ms : l'écran d'ouverture était payé — un temps d'arrêt à chaque lancement —
        // sans jamais être vu. On complète jusqu'à la fin de l'animation, et un démarrage
        // plus lent que ça n'attend rien de plus. L'échec, lui, n'attend jamais : mieux vaut
        // le dire tout de suite.
        const reste = DUREE_ANIMATION_LANCEMENT - (Date.now() - depart);
        if (reste > 0) await new Promise((resoudre) => setTimeout(resoudre, reste));
        if (annule) return;
        // Les trois destinations que la dérivation peut rendre ici. Pourquoi l'une plutôt qu'une
        // autre est écrit là-bas, pas ici — y compris les deux règles qui se lisent mal de loin :
        // le brouillon ne détourne pas quelqu'un qui a un bilan complété (C3.9), et il passe en
        // revanche devant la marque hors ligne, parce que le questionnaire se remplit sans réseau
        // et le plan non.
        if (destination.vers === 'plan') {
          router.replace('/plan');
        } else if (destination.vers === 'reprise') {
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
