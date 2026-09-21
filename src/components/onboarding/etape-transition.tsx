import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { OnboardingDots } from '@/components/onboarding-dots';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { track } from '@/lib/analytics';

// Les mêmes libellés qu'en tête du questionnaire et que dans la restitution (C2.6) : l'annonce
// et ce qu'on trouve ensuite doivent porter le même nom, sans quoi la personne croit avoir
// changé de sujet.
const SECTIONS = [
  '1 — Trajet domicile-travail',
  '2 — Loisirs du week-end',
  '3 — Voyages longue distance',
  '4 — Ton contexte de mobilité',
];

// Étape 4/4 de l'onboarding, rendue par le pager de `src/app/onboarding/index.tsx`.
//
// C'était une route à part entière jusqu'au 07/09/2026 ; les quatre étapes vivent maintenant
// dans un seul écran qui se balaie au doigt (issue #68). Le contenu n'a pas bougé.
//
// Onboarding — Transition bilan. La durée est annoncée avant l'entrée dans le
// bilan : la friction est assumée, pas dissimulée (handoff design).
export function EtapeTransition() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText type="title" weight={600} style={styles.title}>
            On passe à ton bilan
          </ThemedText>
          <ThemedText weight={400} themeColor="textSecondary" style={styles.body}>
            Quelques questions sur tes déplacements habituels. Tu peux t’arrêter et
            reprendre plus tard, tes réponses sont conservées.
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.durationBlock}>
            <ThemedText type="small" themeColor="textTertiary">
              Temps estimé
            </ThemedText>
            <ThemedText weight={600} style={styles.duration}>
              environ 5 minutes
            </ThemedText>
          </ThemedView>
          <View style={styles.sections}>
            {SECTIONS.map((section) => (
              <ThemedText type="body" key={section} weight={400} themeColor="textSecondary">
                {section}
              </ThemedText>
            ))}
          </View>
          {/* **Ce qui vient après le bilan n'était annoncé nulle part** (C3.9, constat A1-11) :
              l'onboarding présentait un questionnaire et s'arrêtait là, alors que le produit est
              une boucle qui dure des saisons. La phrase tient en une ligne et **ne fait pas un
              cinquième écran** — l'ajout d'une étape coûterait plus en abandon qu'il ne rapporte
              en clarté. Elle ne promet pas de rythme chiffré : « de temps en temps » est vrai
              pour les deux boucles, hebdomadaire comme mensuelle. */}
          <ThemedText type="small" themeColor="textTertiary" style={styles.suite}>
            Ensuite : une action à ton rythme, et un point de temps en temps pour voir ce qui a
            changé.
          </ThemedText>
        </View>
        <View style={styles.footer}>
          <Button
            title="Commencer mon bilan"
            onPress={() => {
              // Fin de l'onboarding : la colonne `profiles.onboarding_completed_at` a été
              // supprimée le 05/09/2026 (20260905180000_supprimer_colonnes_mortes_profiles.sql),
              // parce qu'aucun code ne l'écrivait. Le franchissement ne se lit donc que dans cet
              // événement — il n'y a pas de repli en base sur lequel se rabattre.
              track('onboarding_complete');
              // **On vide la pile en quittant l'onboarding, on n'empile pas le questionnaire
              // par-dessus.** Sans cela, au tout premier lancement, le retour matériel Android
              // depuis `/plan` remontait les quatre écrans d'onboarding un par un au lieu de
              // quitter l'app (retour d'appareil du 07/09/2026) — et seulement au premier
              // lancement, puisque ensuite la racine route directement vers `/plan`. La règle
              // de `v1-11` §8 (le retour depuis le plan quitte l'app) ne se tient pas en
              // interceptant le bouton retour, mais en n'accumulant pas d'historique derrière
              // un flux terminé : l'onboarding ne se rejoue pas.
              if (router.canDismiss()) router.dismissAll();
              router.replace('/bilan');
            }}
          />
          <OnboardingDots total={4} activeIndex={3} />
          {/* Le second accès aux pages légales, au dernier écran avant la première écriture
              serveur : c'est le moment où « tes réponses sont conservées » cesse d'être une
              promesse et devient une ligne en base. */}
          <TextLink
            label="Ce qu’on enregistre, et pourquoi"
            onPress={() => router.push('/confidentialite')}
            role="link"
            type="small"
            weight={600}
            themeColor="textTertiary"
            style={styles.legal}
            containerStyle={styles.legalCible}
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center', gap: Spacing.three },
  title: { fontSize: 32, lineHeight: 38, letterSpacing: -0.64 },
  body: { fontSize: 16, lineHeight: 24 },
  durationBlock: { borderRadius: 20, padding: Spacing.four, gap: 2 },
  duration: { fontSize: 24, lineHeight: 30 },
  sections: { gap: 10 },
  suite: { lineHeight: 20 },
  legal: { textAlign: 'center' },
  legalCible: { marginTop: -Spacing.four },
  footer: { gap: Spacing.five },
});
