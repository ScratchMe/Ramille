import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Platform, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ContexteDesAncres,
  useMarqueDuChamp,
  type AncreDuChamp,
  type AncresDeLEtape,
} from '@/components/bilan/ancre-du-champ';
import { ProgressHeader } from '@/components/bilan/progress-header';
import { Button } from '@/components/button';
import { MessageInline } from '@/components/message-inline';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { donnerLeFocus } from '@/lib/focus';
import {
  Apparition,
  SansApparitionAuMontage,
  styleDEntree,
  SuiviDesOuvertures,
  type Ouverture,
} from '@/lib/mouvement';
import {
  QUESTION_PRINCIPALE,
  seMarque,
  type BilanStepId,
  type CeQuiManque,
  type ChampDuBilan,
} from '@/types/bilan';
import { decalagePourMontrer, suiteSousLePied } from '@/types/demande';
import type { Sens } from '@/types/mouvement';

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
  // **Le titre reçoit la marque de sa question comme tout intitulé, et c'est `seMarque` seule qui l'en
  // empêche** (`v1-31` §2.3) : la question de l'étape ne se recolore jamais, puisqu'elle est déjà en
  // titre. La lire ici plutôt que de n'y rien brancher garde la garde vivante — un titre sans marque
  // ne changerait pas de couleur même sous une `seMarque` fautive, et rien ne le verrait.
  const marque = useMarqueDuChamp(useContext(ContexteDesAncres)?.principale ?? null);
  return (
    // `ThemedText` ne déclare pas `ref` et le transmet tel quel à son `Text` : même recours que
    // `TitreFocalisable` (`src/lib/focus.ts`).
    <ThemedText type="screenTitle" themeColor={marque ? 'accentText' : undefined} {...{ ref: titre }}>
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
  notice,
  motDeRamille,
  message,
  detail,
  manque,
  entree,
  reponsesDonnees,
}: {
  section: string;
  step: number;
  total: number;
  children: ReactNode;
  onBack?: () => void;
  onNext: () => void;
  /** Le nom du bouton, qui ne change jamais selon ce qui manque : « Suivant », ou « Voir mon bilan » à
   *  la dernière étape. Un nom qui suivrait les réponses ferait réannoncer le bouton à chaque choix. */
  nextLabel?: string;
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
  /** Ce qu'il reste à renseigner sur l'étape (`manqueDeLEtape`) : le champ, pour y mener, et la phrase,
   *  dite sous « Il manque encore … » au toucher du « Suivant » en attente. */
  manque?: CeQuiManque | null;
  /**
   * L'étape qui s'affiche, et le côté d'où elle arrive (27/09/2026, `v1-30` §5.6). À chaque
   * nouvelle `cle`, le contenu entre en fondu depuis `Mouvement.deplacement` pixels de ce côté ;
   * sans `sens` (le montage, la reprise d'un brouillon, le retour après un échec), il est posé.
   */
  entree: { cle: BilanStepId; sens: Sens | null };
  /**
   * Le nombre de réponses données au doigt ou au clavier depuis l'ouverture du questionnaire — une par
   * `update`. Une ouverture ne fait défiler l'écran que si elle suit l'une d'elles (`v1-31` §2.7).
   */
  reponsesDonnees: number;
}) {
  // **L'étape entre dans le sens du parcours** (27/09/2026, `v1-30` §5.6) : de la droite en
  // avançant, de la gauche en revenant — l'« axe partagé » d'un parcours par étapes. Une animation
  // CSS de reanimated sur une vue qui prend l'étape pour clé : elle joue dès la première image. Ni
  // une valeur partagée remise à zéro dans un effet — l'effet part après l'affichage, donc l'étape se
  // montrait posée une image avant de repartir —, ni `entering`, qui sur web masque l'étape le temps
  // d'une image, et le focus avec (`src/lib/mouvement.tsx`). L'ancienne étape s'en va d'un coup : une
  // sortie s'efface, elle ne se met pas en scène. Sous « réduire les animations », l'étape est posée.
  // La clé fait aussi remonter le contenu d'une étape à l'autre, là où React gardait l'état d'un
  // composant que deux étapes rendaient à la même place.
  const theme = useTheme();
  const animationsReduites = useReducedMotion();
  const styleDeLEtape = styleDEntree(entree.sens, animationsReduites);

  // **Le focus suit l'étape, sinon la question suivante n'est jamais annoncée.** Passer à l'étape
  // d'après laisse le focus sur « Suivant » : à TalkBack comme au clavier sur web, on entend le
  // bouton qu'on vient d'actionner et rien de la question qui vient de s'afficher. Sur web, c'était
  // pire tant que le « Suivant » d'une étape incomplète était désactivé — le cas d'un premier
  // questionnaire : un bouton désactivé perd le focus, qui tombait sur le document (relevé le
  // 25/09/2026). Il ne l'est plus depuis `v1-31` (il est « en attente »), mais la règle tient pour la
  // première raison. C'est le seul point de C1.9 qui porte sur le parcours que son « Fait quand »
  // demande de traverser.
  //
  // **La cible n'est pas la même sur web et sur natif, et c'est la source de React Native qui l'a
  // décidé** (25/09/2026). Sur web, c'est le **conteneur du contenu** : `tabIndex={-1}` le rend
  // focalisable, et la lecture reprend à son premier descendant, le titre de l'étape — vérifié sur
  // l'export, et inchangé. Sur natif, ce même conteneur ne reçoit **rien**, et ne recevait rien
  // avant le 24/09 non plus — l'ancienne voie (`setAccessibilityFocus`) aboutit au même appel,
  // `BridgelessUIManager` retrouvant le nœud par son numéro :
  //   - jusqu'au 29/09/2026, il ne portait aucune propriété (ni style, ni `accessible`, ni
  //     `collapsable={false}`), donc Fabric l'aplatissait — aucune vue native n'était créée pour lui
  //     (`ViewShadowNode::initialize`, où rien ne lui donne le trait `FormsView`). RN 0.86 n'a plus
  //     que cette architecture. **Il porte désormais `collapsable={false}` et un `onLayout`**
  //     (`v1-31` §4.7 : les mesures du défilement se prennent relativement à lui), donc une vue est
  //     montée — et le point suivant dit pourquoi ça ne change rien au focus ;
  //   - l'événement part pourtant avec son numéro (`FabricMountingManager::sendAccessibilityEvent`
  //     transmet `shadowView.tag`, sans chercher d'ancêtre monté), `SurfaceMountingManager` ne trouve
  //     aucune vue et lève `RetryableMountingLayerException`, que `SendAccessibilityEventMountItem`
  //     avale en exception douce : ni plantage, ni focus, ni trace à l'écran.
  // `collapsable={false}` monte une vue, mais pas un nœud d'accessibilité : sans `accessible`
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
    // **Seulement après un passage d'une étape à l'autre** (29/09/2026, relevé en écrivant `v1-31`) :
    // un brouillon relu, ou la porte `?etape=`, changent d'étape **après** le montage, et sans ce test
    // le focus sautait sur l'étape sans que personne ait touché à rien — l'anneau de focus apparaissait
    // autour de la question à l'ouverture. Ces arrivées-là n'ont pas de sens (`entree.sens`), et le
    // focus ne part jamais au montage (`FRONT.md` §2.4).
    if (entree.sens === null) return;
    // `tabIndex={-1}` ci-dessous rend le conteneur focalisable sur web sans l'ajouter à l'ordre de
    // tabulation : on peut lui donner le focus par programme, on ne l'atteint pas à la touche. Le
    // mécanisme vit dans `donnerLeFocus` depuis que deux écrans de plus s'en servent (24/09/2026).
    // L'effet part après le rendu de la nouvelle étape : son titre a déjà pris la référence.
    donnerLeFocus(Platform.OS === 'web' ? contenu.current : titre.current);
    // Le sens se lit à l'instant du changement d'étape, qui est la seule dépendance voulue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // **Ce qui manque se dit au toucher, jamais d'office** (29/09/2026, `v1-31`, décision 1). Rien ne
  // s'écrit à l'arrivée — la question est déjà en titre —, rien ne change sous le doigt pendant qu'on
  // répond. Le « Suivant » gris répond : il **demande**, et la demande tient jusqu'à ce que l'étape
  // soit complète. Elle retombe alors, et un nouveau manque (un autre mode choisi) ne se dit qu'au
  // prochain toucher ; elle retombe aussi en changeant d'étape. Tant qu'elle court, la ligne et la
  // marque **suivent ce qui manque maintenant** (`v1-31` §2.9) : une ligne qui nommerait une précision
  // qu'un changement de mode vient de fermer serait fausse. Le focus et le défilement, eux, ne partent
  // qu'au geste.
  //
  // L'état retient l'étape où la demande a été faite ; il retombe au rendu — jamais dans un effet, qui
  // laisserait une image de trop — dès qu'il ne décrit plus l'écran.
  const [demande, setDemande] = useState<BilanStepId | null>(null);
  const demandeActive = demande !== null && demande === entree.cle && manque != null;
  if (demande !== null && !demandeActive) setDemande(null);

  // Les ancres que les étapes enregistrent (`useAncreDuChamp`) : où mène ce qui manque.
  const ancres = useRef(new Map<ChampDuBilan, AncreDuChamp>());
  const enregistrer = useCallback((champ: ChampDuBilan, ancre: AncreDuChamp) => {
    ancres.current.set(champ, ancre);
    return () => {
      if (ancres.current.get(champ) === ancre) ancres.current.delete(champ);
    };
  }, []);
  const principale = QUESTION_PRINCIPALE[entree.cle];
  const marque = demandeActive && manque && seMarque(entree.cle, manque.champ) ? manque.champ : null;
  const contexteDesAncres: AncresDeLEtape = { enregistrer, marque, principale };

  /**
   * Mener à ce qui manque — au toucher du « Suivant » en attente, ou de la ligne qui le dit. Le focus
   * part **au geste**, avant tout défilement (skill `/mouvement`) : sur l'option cochée du groupe, ou
   * sa première ; sur un champ de saisie, qui reçoit aussi son `focus()` sur natif pour que le clavier
   * s'ouvre. Rien n'est annoncé comme une alerte : ce n'est pas un échec, et le focus qui part vers la
   * question fait déjà l'annonce — son groupe s'annonce par sa question.
   */
  const mener = () => {
    if (manque == null) return;
    setDemande(entree.cle);
    const ancre = ancres.current.get(manque.champ);
    const cible = ancre?.cible.current ?? null;
    if (!ancre || cible === null) {
      // **Un champ demandé sans ancre ne se tait pas** (`v1-31` §2.5) : la ligne s'affiche quand même,
      // et le focus retombe sur la cible d'une nouvelle étape. C'est la forme neuve du défaut de C5.4 —
      // une question absente de l'écran, mais réclamée —, et l'avertissement la nomme.
      if (__DEV__) {
        console.warn(`StepShell : « ${manque.champ} » manque, mais aucune ancre ne le porte sur ${entree.cle}.`);
      }
      donnerLeFocus(Platform.OS === 'web' ? contenu.current : titre.current);
      return;
    }
    donnerLeFocus(cible);
    if (Platform.OS !== 'web' && ancre.saisie) (cible as { focus?: () => void }).focus?.();
    // Puis l'écran y défile s'il le faut — le minimum, 16 au-dessus du pied.
    if (demandeActive) montrerLAncre(ancre);
    else defilementEnAttente.current = { ancre, etape: entree.cle };
  };

  const suivant = () => {
    if (manque == null) onNext();
    else mener();
  };

  // La zone a changé de hauteur — la ligne vient d'apparaître : le défilement vers ce qui manque part.
  const miseEnPageDeLaZone = (evenement: LayoutChangeEvent) => {
    zone.current.hauteur = evenement.nativeEvent.layout.height;
    relireLaSuite();
    const enAttente = defilementEnAttente.current;
    defilementEnAttente.current = null;
    // Une demande faite sur une autre étape n'a plus rien à montrer ici.
    if (enAttente && enAttente.etape === entree.cle) montrerLAncre(enAttente.ancre);
  };


  // **La zone qui défile, suivie** (29/09/2026, `v1-31` §4.7) : son décalage et sa hauteur visible,
  // et la place du contenu dans ce qui défile. `contenu` est dans un conteneur rembourré de 24
  // (`scrollContent`), donc une mesure relative à lui se décale d'autant, et c'est à la mesure de rendre
  // des coordonnées de contenu justes. Il porte `collapsable={false}` : sur natif, une vue sans aucune
  // propriété est aplatie, et mesurer relativement à un nœud qui n'existe pas ne rend rien.
  const zone = useRef({ decalage: 0, hauteur: 0, hautDuContenu: 0, hauteurDuContenu: 0 });

  // **Le filet du pied** (29/09/2026, `v1-31`, décision 3) : le trait de la bande haute, en haut du
  // pied, quand le contenu continue dessous au-delà de sa marge basse (`suiteSousLePied`). Il ne dit pas
  // ce qui manque ; il dit qu'il y a une suite. Relu à chaque défilement, à chaque changement de taille
  // du contenu, et quand la zone change de hauteur — la ligne qui apparaît la rétrécit. Sans animation.
  const [suite, setSuite] = useState(false);
  const relireLaSuite = () =>
    setSuite(
      suiteSousLePied({
        decalage: zone.current.decalage,
        hauteurZone: zone.current.hauteur,
        hauteurContenu: zone.current.hauteurDuContenu,
      })
    );
  /** Le défilement de la plateforme : `scrollTo` ne prend ni durée ni courbe, et sous « réduire les
   *  animations » il se pose. Rien n'attend sa fin, qui ne s'annonce pas sur web (`EXPO.md` §1.5). */
  const defiler = (y: number) => defilement.current?.scrollTo({ y, animated: !animationsReduites });
  const mesurer = (noeud: View | null | undefined, rappel: (haut: number, hauteur: number) => void) => {
    const repere = contenu.current;
    if (!noeud || !repere) return;
    noeud.measureLayout(repere, (_x, y, _largeur, hauteur) => rappel(y + zone.current.hautDuContenu, hauteur));
  };

  /** Défiler le minimum pour que ce qui manque soit entier dans la zone (`decalagePourMontrer`). */
  const montrerLAncre = (ancre: AncreDuChamp) =>
    mesurer(ancre.bloc.current, (haut, hauteur) => {
      const y = decalagePourMontrer({
        decalage: zone.current.decalage,
        hauteurZone: zone.current.hauteur,
        haut,
        bas: haut + hauteur,
      });
      if (y !== null) defiler(y);
    });
  // **La hauteur du pied se mesure, elle ne se suppose pas** (`v1-31` §2.6). Au premier geste, la ligne
  // apparaît et la zone rétrécit — de 56 à la taille de police normale, davantage au-delà : le
  // défilement attend la mise en page qui suit, où la zone a sa nouvelle hauteur. À un geste suivant,
  // la ligne est déjà là et rien ne change de taille : il part aussitôt.
  const defilementEnAttente = useRef<{ ancre: AncreDuChamp; etape: BilanStepId } | null>(null);

  // **Une ouverture ne se suit que si elle suit une réponse donnée sur l'étape** (`v1-31` §2.7). « Monter
  // après son écran » ne suffit pas : le préremplissage d'un re-bilan arrive après le montage, et sur
  // une étape ouverte par `?etape=`, une précision qu'il fait apparaître ferait défiler l'écran sans
  // que personne ait touché à rien. `reponsesDonnees` compte les réponses données au doigt ou au
  // clavier — TalkBack compris, qui active un choix sans le toucher ; la première ouverture qui suit
  // l'en consomme, et un changement d'étape aussi.
  //
  // Retenu dans l'état et non dans une référence, pour que le changement d'étape le remette à jour au
  // rendu — le motif de la demande.
  const [reponsesVues, setReponsesVues] = useState({ etape: entree.cle, reponses: reponsesDonnees });
  if (reponsesVues.etape !== entree.cle) setReponsesVues({ etape: entree.cle, reponses: reponsesDonnees });
  const suivreLOuverture = ({ depli, hauteur, borne }: Ouverture) => {
    if (reponsesVues.etape !== entree.cle || reponsesDonnees === reponsesVues.reponses) return;
    setReponsesVues({ etape: entree.cle, reponses: reponsesDonnees });
    mesurer(depli, (hautDuDepli) => {
      // Le haut du choix qui l'a ouverte (`ChoixOuvrant`) ne passe jamais au-dessus du bord.
      const montrer = (hautDuChoix: number) => {
        const y = decalagePourMontrer({
          decalage: zone.current.decalage,
          hauteurZone: zone.current.hauteur,
          haut: hautDuChoix,
          bas: hautDuDepli + hauteur,
          ouverture: true,
        });
        if (y !== null) defiler(y);
      };
      if (borne) mesurer(borne, montrer);
      else montrer(hautDuDepli);
    });
  };

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
        <ScrollView
          ref={defilement}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(evenement) => {
            zone.current.decalage = evenement.nativeEvent.contentOffset.y;
            relireLaSuite();
          }}
          onContentSizeChange={(_largeur, hauteur) => {
            zone.current.hauteurDuContenu = hauteur;
            relireLaSuite();
          }}
          onLayout={miseEnPageDeLaZone}
        >
          <View
            ref={contenu}
            collapsable={false}
            onLayout={(evenement) => {
              zone.current.hautDuContenu = evenement.nativeEvent.layout.y;
            }}
            {...(Platform.OS === 'web' ? { tabIndex: -1 } : null)}
          >
            <Animated.View key={entree.cle} style={styleDeLEtape}>
              {/* Ce que l'étape montre en arrivant n'a pas d'apparition à soi — une précision déjà
                  ouverte entre avec l'étape ; ce qui s'ouvre ensuite apparaît (`src/lib/mouvement.tsx`). */}
              <SansApparitionAuMontage>
                <ContexteDesAncres.Provider value={contexteDesAncres}>
                  <SuiviDesOuvertures value={suivreLOuverture}>
                    <TitreDeLEtape.Provider value={titre}>{children}</TitreDeLEtape.Provider>
                  </SuiviDesOuvertures>
                </ContexteDesAncres.Provider>
              </SansApparitionAuMontage>
            </Animated.View>
          </View>
        </ScrollView>
        {/* Le pied a son propre `SansApparitionAuMontage` : il est hors de celui du contenu, et une
            `Apparition` sans fournisseur se pose sans jouer (« dans le doute, on pose »). La ligne ne
            s'y rend jamais au montage — la demande part d'un geste —, donc elle entre en fondu. */}
        <SansApparitionAuMontage>
          <View style={styles.footerBlock}>
            {/* En position absolue : rien ne bouge quand il apparaît. */}
            {suite && <View style={[styles.filet, { backgroundColor: theme.border }]} />}
            <MessageInline message={message ?? null} />
            {/* Volontairement brut : ce texte est destiné à être recopié, pas lu comme du
                produit. Ni la voix de Ramille ni un ton rassurant n'ont leur place ici — ce
                qu'il faut, c'est la cause exacte. */}
            {detail && (
              <ThemedText type="code" themeColor="textTertiary" style={styles.detail}>
                {detail}
              </ThemedText>
            )}
            {/* **Un bouton grisé ne dit pas pourquoi.** Sur l'étape loisirs, la précision du mode se
                déplie au-dessus de la tranche de distance et la pousse hors champ : on voit une étape
                qu'on croit finie et un « Suivant » gris, sans rien qui indique qu'il reste un champ plus
                bas (retour d'appareil du 07/09/2026). Le manque se dit donc là où se prend la décision
                d'avancer, dans la zone collante — **au toucher, et c'est un lien** (`v1-31`) : il mène
                à la même question que le « Suivant » qu'on vient de toucher. Il s'écrivait d'office, en
                gris, collé au bouton, et ne menait nulle part. Pas de `role="alert"` : ce n'est pas un
                échec, et le focus qui part vers la question fait déjà l'annonce. */}
            {demandeActive && manque && (
              <Apparition>
                <TextLink
                  label={`Il manque encore ${manque.phrase}.`}
                  onPress={mener}
                  type="small"
                  weight={600}
                  themeColor="accentText"
                />
              </Apparition>
            )}
            <View style={styles.footer}>
              {onBack && <Button title="Retour" variant="secondary" onPress={onBack} />}
              {/* **Un bouton ordinaire, jamais `disabled`** (29/09/2026, `v1-31` §2.4) : sur une étape
                  incomplète, il garde l'apparence du désactivé (`enAttente`) et n'avance pas — c'est
                  ici, et non plus son `disabled`, qui tient la porte ; `handleNext` la tient une
                  seconde fois. */}
              <Button title={nextLabel} onPress={suivant} enAttente={manque != null} flex />
            </View>
          </View>
        </SansApparitionAuMontage>
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
  // Sa marge basse est celle que le filet ne compte pas comme une suite (`MARGE_BASSE_DU_CONTENU`,
  // `src/types/demande.ts`) : les deux se retouchent ensemble.
  scrollContent: { padding: Spacing.four, gap: Spacing.five, flexGrow: 1 },
  // Le padding vit sur le bloc, pas sur la rangée : le message doit être aligné sur les
  // boutons et non collé au bord.
  footerBlock: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.four, gap: Spacing.two },
  detail: { lineHeight: 18 },
  footer: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  // Le trait de la bande haute des onglets (`bande-haute.tsx`) : un cheveu, couleur `border`, pleine
  // largeur.
  filet: { position: 'absolute', top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth },
});
