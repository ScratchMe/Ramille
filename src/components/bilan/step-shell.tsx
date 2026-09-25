import { createContext, useContext, useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressHeader } from '@/components/bilan/progress-header';
import { Button } from '@/components/button';
import { MessageInline } from '@/components/message-inline';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { donnerLeFocus } from '@/lib/focus';

// Coquille commune à tous les écrans du questionnaire : en-tête de progression, contenu
// scrollable, footer Retour/Suivant. `onBack` absent = rien derrière, donc pas de bouton
// Retour — et ce contrat est désormais vrai : l'écran passait toujours un `onBack`, donc le
// bouton était toujours rendu, y compris au premier lancement où l'onboarding entre par
// `dismissAll()` + `replace('/bilan')` pour ne rien laisser derrière. Le bouton ne faisait
// alors rien, et c'était le premier signal que l'app donnait (audit A2-21).

// La référence du titre de l'étape affichée, que `StepShell` possède et que l'étape remplit par
// `TitreDEtape` : le titre vit dans `children`, que la coquille ne rend pas elle-même.
const TitreDeLEtape = createContext<RefObject<unknown> | null>(null);

/**
 * Le titre d'une étape du questionnaire — la question elle-même. C'est lui que `StepShell` rend au
 * lecteur d'écran quand on passe d'une étape à l'autre sur natif (voir son commentaire), donc **toute
 * étape pose sa question par ce composant** et non par un `ThemedText` : une étape qui l'oublierait ne
 * casserait rien de visible, et TalkBack resterait muet sur sa question.
 */
export function TitreDEtape({ children }: { children: ReactNode }) {
  const titre = useContext(TitreDeLEtape);
  return (
    // `ThemedText` ne déclare pas `ref` et le transmet tel quel à son `Text` : même recours que
    // `TitreFocalisable` (`src/lib/focus.ts`).
    <ThemedText type="screenTitle" {...{ ref: titre }}>
      {children}
    </ThemedText>
  );
}

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
  // bouton qu'on vient d'actionner et rien de la question qui vient de s'afficher. Sur web, c'est
  // pire quand le « Suivant » de l'étape qui arrive est inactif — le cas d'un premier questionnaire :
  // un bouton désactivé perd le focus, qui tombe sur le document (relevé le 25/09/2026). C'est le
  // seul point de C1.9 qui porte sur le parcours que son « Fait quand » demande de traverser.
  //
  // **La cible n'est pas la même sur web et sur natif, et c'est la source de React Native qui l'a
  // décidé** (25/09/2026). Sur web, c'est le **conteneur du contenu** : `tabIndex={-1}` le rend
  // focalisable, et la lecture reprend à son premier descendant, le titre de l'étape — vérifié sur
  // l'export, et inchangé. Sur natif, ce même conteneur ne reçoit **rien**, et ne recevait rien
  // avant le 24/09 non plus — l'ancienne voie (`setAccessibilityFocus`) aboutit au même appel,
  // `BridgelessUIManager` retrouvant le nœud par son numéro :
  //   - il ne porte aucune propriété (ni style, ni `accessible`, ni `collapsable={false}`), donc
  //     Fabric l'aplatit — aucune vue native n'est créée pour lui (`ViewShadowNode::initialize`, où
  //     rien ne lui donne le trait `FormsView`). RN 0.86 n'a plus que cette architecture ;
  //   - l'événement part pourtant avec son numéro (`FabricMountingManager::sendAccessibilityEvent`
  //     transmet `shadowView.tag`, sans chercher d'ancêtre monté), `SurfaceMountingManager` ne trouve
  //     aucune vue et lève `RetryableMountingLayerException`, que `SendAccessibilityEventMountItem`
  //     avale en exception douce : ni plantage, ni focus, ni trace à l'écran.
  // `collapsable={false}` monterait une vue, mais pas un nœud d'accessibilité : sans `accessible`
  // elle n'est pas focalisable (`ReactViewManager.setAccessible` ne fait que poser `isFocusable`), et
  // sans rôle RN ne lui pose aucun délégué (`ReactAccessibilityDelegate.setDelegate`). Ce que TalkBack
  // ferait d'un focus demandé sur elle ne se lit dans aucune source du dépôt. Et `accessible`
  // fusionnerait l'étape entière en un seul nœud.
  // Reste le **titre** : un `Text` forme toujours une vue (`ParagraphShadowNode` hérite de
  // `FormsView`), un `TextView` que TalkBack lit, avec le rôle d'en-tête que `ThemedText` lui donne —
  // la cible que l'onboarding vise déjà. Il vit dans `children`, d'où `TitreDEtape`.
  const contenu = useRef<View>(null);
  const titre = useRef<unknown>(null);
  const defilement = useRef<ScrollView>(null);
  const premierRendu = useRef(true);

  useEffect(() => {
    // Pas au montage : personne n'a encore agi. (Sur web, un `focus()` au chargement faisait aussi
    // sauter le défilement pour tout le monde ; `donnerLeFocus` le pose désormais sans défiler, mais
    // la règle tient pour la première raison.)
    if (premierRendu.current) {
      premierRendu.current = false;
      return;
    }
    // **La nouvelle étape s'ouvre par le haut** (24/09/2026, relevé en mesurant le focus). Cette
    // coquille reste montée d'une étape à l'autre, donc sa `ScrollView` gardait le défilement de la
    // précédente : qui était descendu jusqu'au bas d'une étape arrivait sur la suivante au même
    // décalage, le titre de la question hors de l'écran. Le focus ne rattrapait rien — le conteneur
    // étant en partie visible, le navigateur ne défilait pas pour lui (mesuré à 360 × 440 : décalage
    // inchangé, titre invisible), et il se pose maintenant sans défiler du tout. Sans animation : on
    // change de question, on ne la parcourt pas.
    defilement.current?.scrollTo({ y: 0, animated: false });
    // `tabIndex={-1}` ci-dessous rend le conteneur focalisable sur web sans l'ajouter à l'ordre de
    // tabulation : on peut lui donner le focus par programme, on ne l'atteint pas à la touche. Le
    // mécanisme vit dans `donnerLeFocus` depuis que deux écrans de plus s'en servent (24/09/2026).
    // L'effet part après le rendu de la nouvelle étape : son titre a déjà pris la référence.
    donnerLeFocus(Platform.OS === 'web' ? contenu.current : titre.current);
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
        <ScrollView ref={defilement} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View ref={contenu} {...(Platform.OS === 'web' ? { tabIndex: -1 } : null)}>
            <TitreDeLEtape.Provider value={titre}>{children}</TitreDeLEtape.Provider>
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
