import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { OnboardingDots } from '@/components/onboarding-dots';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { type TitreFocalisable } from '@/lib/focus';
import { BILAN_SECTION_LABEL, BILAN_STEP_ORDER } from '@/types/bilan';

// Les mêmes libellés qu'en tête du questionnaire (C2.6 ; la restitution, elle, nomme des postes —
// `POSTE_LABEL` —, pas des sections) : l'annonce
// et ce qu'on trouve ensuite doivent porter le même nom, sans quoi la personne croit avoir
// changé de sujet.
//
// **Ils sont lus à la source, plus recopiés** (01/10/2026, `v1-33`, Q-15). Le commentaire ci-dessus
// l'affirmait déjà, et c'était faux pour deux sections sur quatre : « Trajet domicile-travail » et
// « Ton contexte de mobilité » là où l'en-tête dit « Domicile-travail » et « Contexte de mobilité ».
// `BILAN_SECTION_LABEL` donne un libellé par **étape** ; les sections sont ses valeurs distinctes,
// dans l'ordre du questionnaire — l'ordre d'insertion d'un `Set` —, et le numéro est celui de la
// section dans cette suite. Une section renommée ou ajoutée dans le questionnaire change l'annonce sans
// qu'on y touche.
const SECTIONS = [...new Set(BILAN_STEP_ORDER.map((etape) => BILAN_SECTION_LABEL[etape]))].map(
  (libelle, i) => `${i + 1} — ${libelle}`
);

// Étape 4/4 de l'onboarding, rendue par le pager de `src/app/onboarding/index.tsx`.
//
// C'était une route à part entière jusqu'au 07/09/2026 ; les quatre étapes vivent maintenant
// dans un seul écran qui se balaie au doigt (issue #68). Le contenu n'a pas bougé.
//
// Onboarding — Transition bilan. La durée est annoncée avant l'entrée dans le
// bilan : la friction est assumée, pas dissimulée (handoff design).
export function EtapeTransition({
  onPrecedent,
  titre,
}: {
  /** Revenir à la page d'avant — le « Retour » du pied, à côté de « Commencer ». */
  onPrecedent: () => void;
  /** De quoi recevoir le focus quand le pager arrive sur cette page (`src/lib/focus.ts`). */
  titre?: TitreFocalisable;
}) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText type="display" {...titre}>
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
          <View style={styles.boutons}>
            <Button title="Retour" variant="secondary" onPress={() => onPrecedent()} />
            {/* **« Commencer » et non plus « Commencer mon bilan »** (27/09/2026, `v1-29` §6.3) : à côté
                de « Retour », le libellé du handoff (168 px) passait sur deux lignes sous 390 px de
                large — 151 px de place à 360. Le titre juste au-dessus dit déjà « On passe à ton
                bilan ». */}
            <Button
              title="Commencer"
              flex
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
          </View>
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
  body: { fontSize: 16, lineHeight: 24 },
  durationBlock: { borderRadius: Radius.card, padding: Spacing.four, gap: 2 },
  duration: { fontSize: 24, lineHeight: 30 },
  sections: { gap: 10 },
  suite: { lineHeight: 20 },
  legal: { textAlign: 'center' },
  legalCible: { marginTop: -Spacing.four },
  footer: { gap: Spacing.five },
  boutons: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
});
