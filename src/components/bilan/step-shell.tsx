import { useEffect, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, findNodeHandle, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressHeader } from '@/components/bilan/progress-header';
import { Button } from '@/components/button';
import { MessageInline } from '@/components/message-inline';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';

// Coquille commune à tous les écrans du questionnaire : en-tête de progression, contenu
// scrollable, footer Retour/Suivant. `onBack` absent = rien derrière, donc pas de bouton
// Retour — et ce contrat est désormais vrai : l'écran passait toujours un `onBack`, donc le
// bouton était toujours rendu, y compris au premier lancement où l'onboarding entre par
// `dismissAll()` + `replace('/bilan')` pour ne rien laisser derrière. Le bouton ne faisait
// alors rien, et c'était le premier signal que l'app donnait (audit A2-21).
export function StepShell({
  section,
  step,
  total,
  children,
  onBack,
  onNext,
  nextLabel = 'Suivant',
  nextDisabled,
  notice,
  motDeRamille,
  message,
  detail,
  manque,
}: {
  section: string;
  step: number;
  total: number;
  children: ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  /** Bandeau discret sous l'en-tête (ex. « réponses pré-remplies » lors d'un re-bilan). */
  notice?: string;
  /**
   * Un mot de Ramille à l'entrée d'une section (C3.9). **Rendu sans `RamilleDit`, et c'est
   * voulu** : son visage est déjà là, dans l'en-tête juste au-dessus, à trois centimètres. Un
   * second `Mascot` ferait deux Ramille sur le même écran. La règle que cette exception ne touche
   * pas est la vraie : la phrase vient de `RAMILLE` et n'est jamais écrite dans un écran.
   */
  motDeRamille?: string | null;
  /** Échec de la dernière tentative, affiché juste au-dessus des boutons — là où l'action a
   *  été déclenchée, et dans la zone collante, donc sans avoir à faire défiler. Une phrase du
   *  produit, en français : la cause technique passe par `detail`. */
  message?: string | null;
  /** Cause technique du dernier échec, présentée comme un bloc à recopier. Séparée du
   *  message parce que le message la concaténait : selon la panne, la personne lisait « Ton
   *  bilan n'a pas pu être enregistré. Network request failed » ou une violation de
   *  contrainte Postgres entière, nom de table compris — au terme de cinq minutes de saisie,
   *  en anglais, dans la voix du produit (audit A2-16). Même couple que l'écran de démarrage. */
  detail?: string | null;
  /** Ce qu'il reste à renseigner sur l'étape, quand « Suivant » est inactif. Texte calme et
   *  non annoncé comme une alerte : ce n'est pas un échec, juste ce qui manque. */
  manque?: string | null;
}) {
  // **Le focus suit l'étape, sinon la question suivante n'est jamais annoncée.** Passer à l'étape
  // d'après laisse le focus sur « Suivant » : à TalkBack comme au clavier sur web, on entend le
  // bouton qu'on vient d'actionner et rien de la question qui vient de s'afficher. C'est le seul
  // point de C1.9 qui porte sur le parcours que son « Fait quand » demande de traverser.
  //
  // La cible est le **conteneur du contenu**, pas le titre : celui-ci vit dans `children`, que
  // cette coquille ne possède pas. Déplacer le focus sur le conteneur fait reprendre la lecture à
  // son premier descendant, c'est-à-dire au titre de l'étape.
  const contenu = useRef<View>(null);
  const premierRendu = useRef(true);

  useEffect(() => {
    // Pas au montage : personne n'a encore agi, et sur web un `focus()` au chargement provoque un
    // saut de défilement pour tout le monde, y compris qui n'utilise pas de lecteur d'écran.
    if (premierRendu.current) {
      premierRendu.current = false;
      return;
    }
    const cible = contenu.current;
    if (!cible) return;

    if (Platform.OS === 'web') {
      // `tabIndex={-1}` ci-dessous rend le nœud focalisable sans l'ajouter à l'ordre de
      // tabulation : on peut lui donner le focus par programme, on ne l'atteint pas à la touche.
      (cible as unknown as { focus?: () => void }).focus?.();
      return;
    }
    const handle = findNodeHandle(cible);
    if (handle !== null) AccessibilityInfo.setAccessibilityFocus(handle);
  }, [step]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBlock}>
          <ProgressHeader section={section} step={step} total={total} />
          {notice && (
            <ThemedView type="backgroundSelected" style={styles.notice}>
              <ThemedText type="small" themeColor="accentText">
                {notice}
              </ThemedText>
            </ThemedView>
          )}
          {motDeRamille && (
            <ThemedText type="small" themeColor="textTertiary" style={styles.motDeRamille}>
              {motDeRamille}
            </ThemedText>
          )}
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View ref={contenu} {...(Platform.OS === 'web' ? { tabIndex: -1 } : null)}>
            {children}
          </View>
        </ScrollView>
        <View style={styles.footerBlock}>
          <MessageInline message={message ?? null} />
          {/* Volontairement brut : ce texte est destiné à être recopié, pas lu comme du
              produit. Ni la voix de Ramille ni un ton rassurant n'ont leur place ici — ce
              qu'il faut, c'est la cause exacte. */}
          {detail && (
            <ThemedText type="code" themeColor="textTertiary" style={styles.detail}>
              {detail}
            </ThemedText>
          )}
          {/* **Un bouton grisé ne dit pas pourquoi.** Sur l'étape loisirs, la précision du
              mode se déplie au-dessus de la tranche de distance et la pousse hors champ : on
              voit une étape qu'on croit finie et un « Suivant » inactif, sans rien qui
              indique qu'il reste un champ plus bas (retour d'appareil du 07/09/2026). Le
              manque se dit donc là où se prend la décision d'avancer, dans la zone collante.
              Pas de `role="alert"` : ce n'est pas un échec, et l'annoncer à chaque frappe
              rendrait le lecteur d'écran inutilisable. */}
          {manque && (
            <ThemedText type="small" themeColor="textTertiary">
              Il manque encore {manque}.
            </ThemedText>
          )}
          <View style={styles.footer}>
            {onBack && <Button title="Retour" variant="secondary" onPress={onBack} />}
            <Button title={nextLabel} onPress={onNext} disabled={nextDisabled} flex />
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  headerBlock: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, gap: Spacing.three },
  notice: { borderRadius: Radius.notice, paddingVertical: 10, paddingHorizontal: Spacing.three },
  motDeRamille: { lineHeight: 20 },
  scrollContent: { padding: Spacing.four, gap: Spacing.five, flexGrow: 1 },
  // Le padding vit sur le bloc, pas sur la rangée : le message doit être aligné sur les
  // boutons et non collé au bord.
  footerBlock: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.four, gap: Spacing.two },
  detail: { lineHeight: 18 },
  footer: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
});
