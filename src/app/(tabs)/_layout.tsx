import { Tabs } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OngletIcone } from '@/components/onglet-icone';
import { ThemedText } from '@/components/themed-text';
import { ControlHeight, FontFamily, Spacing, Stroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { lireLePremierParcours, noterLePremierParcours } from '@/lib/premier-parcours';
import { etatDuPremierParcours, type EtapeDuPremierParcours } from '@/types/premier-parcours';

/**
 * Le premier parcours, partagé entre la barre et l'écran du plan (C5.7).
 *
 * **Le layout le détient, parce que c'est lui qui rend la barre.** L'étape vit en AsyncStorage,
 * mais un écran qui la réécrirait dans son coin laisserait le layout afficher l'état d'avant
 * jusqu'au prochain montage — c'est-à-dire que la barre n'arriverait pas au moment où la carte du
 * premier plan se referme, qui est exactement le moment que ce chantier existe pour produire.
 *
 * Le questionnaire, lui, n'est **pas** dans ce groupe et n'a donc pas ce contexte : il écrit
 * directement la marque, et le layout la lira à son montage — ce qui est le bon ordre, puisqu'il
 * est monté après (la sortie du questionnaire mène à la restitution, qui est ici).
 */
type PremierParcours = {
  etape: EtapeDuPremierParcours | null;
  /** La carte du premier plan vient de se refermer : la barre arrive, et se nomme. */
  laBarreArrive: () => void;
  /** Le « Compris » de la carte des deux lieux : plus rien ne se réexplique. */
  lesDeuxLieuxSontVus: () => void;
};

const ContexteDuPremierParcours = createContext<PremierParcours | null>(null);

export function usePremierParcours(): PremierParcours {
  const parcours = useContext(ContexteDuPremierParcours);
  if (parcours === null) {
    throw new Error('usePremierParcours doit être appelé dans le groupe des onglets.');
  }
  return parcours;
}

// Les deux lieux du produit — v1-11 §1, canvas `docs/design/v1-11-navigation/`.
//
// **Deux onglets et pas trois.** Le Plan est le présent (l'action engagée, le point de la
// semaine) ; le Suivi est la trace (les bilans, les écarts). « Bilan » n'a jamais été un
// troisième lieu : c'est la dernière page d'un flux, ou le détail d'une entrée du suivi — d'où
// `suivi/bilan`, dans la pile de cet onglet, qui garde la barre visible.
//
// Le compte n'est pas un onglet non plus, alors que ce serait le candidat naturel pour
// atteindre les trois destinations que recommandent les guides Android : un onglet permanent
// « Compte » contredirait la promesse « pas besoin de compte ». Il vit derrière une icône
// (`CompteBouton`), et une barre à deux entrées est un moindre mal.
//
// Ce que la barre n'atteint pas, volontairement : le questionnaire, l'onboarding, la
// connexion, les pages légales. Ce sont des flux ou des surfaces publiques, pas des lieux —
// ils vivent hors de ce groupe et s'affichent donc en plein écran.
export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // **L'étape démarre à `null`, et ce n'est pas un repli commode** : `null` recouvre « pas encore
  // lue » et « aucun premier parcours ici », et les deux veulent la barre. Démarrer à l'inverse la
  // ferait disparaître une fraction de seconde à chaque ouverture pour tout le monde — et sur web à
  // chaque chargement de page, le rendu statique ne connaissant aucun stockage (`EXPO.md` §2.2).
  const [etape, setEtape] = useState<EtapeDuPremierParcours | null>(null);
  // Lue par les transitions, qui ne doivent pas se redéclarer à chaque rendu : l'écran du plan les
  // passe en dépendance de son effet de chargement, et une fonction recréée à chaque rendu y
  // relancerait la lecture en boucle (la règle déjà écrite pour `useRafraichirAuRetour`).
  const etapeLue = useRef<EtapeDuPremierParcours | null>(null);

  useEffect(() => {
    let annule = false;
    void lireLePremierParcours().then((lue) => {
      if (annule) return;
      etapeLue.current = lue;
      setEtape(lue);
    });
    return () => {
      annule = true;
    };
  }, []);

  // Une transition, et une seule à la fois : `depuis` est la garde. Sans elle, un « Compris » sur la
  // carte du premier plan d'un **second** appareil — où la barre a toujours été là — ferait
  // apparaître la carte des deux lieux à quelqu'un qui ne les a jamais perdus de vue.
  const avancer = useCallback((depuis: EtapeDuPremierParcours, vers: EtapeDuPremierParcours) => {
    if (etapeLue.current !== depuis) return;
    etapeLue.current = vers;
    setEtape(vers);
    void noterLePremierParcours(vers);
  }, []);

  const laBarreArrive = useCallback(() => avancer('questionnaire', 'barre'), [avancer]);
  const lesDeuxLieuxSontVus = useCallback(() => avancer('barre', 'fait'), [avancer]);

  const { barreVisible } = etatDuPremierParcours(etape);

  return (
    <ContexteDuPremierParcours.Provider value={{ etape, laBarreArrive, lesDeuxLieuxSontVus }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        // **La barre garde la disposition du kit à toutes les largeurs** (13.7, recette web du
        // 16/09/2026). Sans cette ligne, react-navigation bascule seul en disposition
        // horizontale au-delà de 768 px de large (`shouldUseHorizontalLabels`) : le libellé
        // passe **à côté** de l'icône, et la pastille d'`OngletIcone` — dimensionnée pour le
        // slot de l'icône — se retrouve à côté du libellé au lieu d'être au-dessus. Elle ne se
        // lit alors plus comme appartenant au couple, qui est tout ce qu'elle est censée dire
        // sur une barre à deux entrées.
        //
        // Ce n'est pas une décision d'écran neuve : `BarreOnglets` du design system est en
        // `flexDirection: 'column'` sans condition, et le canvas `v1-11-navigation` ne dessine
        // qu'une barre. Le basculement venait d'un défaut de bibliothèque que personne n'avait
        // choisi. Et **on n'englobe surtout pas l'icône et le libellé ensemble** : ce serait
        // casser le motif Material 3 sur la cible réelle, qui est un téléphone Android.
        //
        // **Mesuré des deux façons, le 16/09/2026**, sur l'export statique servi en local et lu
        // par Playwright : avec la ligne, le libellé « Plan » est à 25 px **sous** l'icône à 1280
        // comme à 390 px de large ; sans elle, à 1280, il passe à 27 px **à côté** — même y, x
        // décalé. C'est la mesure qui dit que la ligne sert, pas la lecture du code de la
        // bibliothèque.
        tabBarLabelPosition: 'below-icon',
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          borderTopWidth: Stroke.hairline,
          // La hauteur inclut l'encoche du bas : le navigateur réserve la place, la barre
          // n'est jamais en surimpression du contenu (c'est pourquoi `BottomTabInset`, qui
          // servait à compenser à la main, a été retiré au lot 0).
          //
          // **Chaque onglet est une cible d'au moins `ControlHeight.target`** (48, décision du
          // 24/09/2026, `v1-29`), et c'est la barre qui la lui donne : l'onglet reçoit sa hauteur
          // moins le filet du haut et les deux marges. Avec 8 et 12, il ne lui restait que
          // **39 px** — mesuré sur l'export le 24/09/2026, et non les 40 de l'audit, qui oubliait
          // le filet : la boîte se compte bordure comprise, sur web (`border-box`) comme en Yoga.
          // Deux marges de `Spacing.one` lui en laissent 51 à hauteur de barre inchangée.
          //
          // Ce que ça déplace à l'écran : l'onglet empile la pastille et le libellé **depuis son
          // haut** (`justifyContent: 'flex-start'` de react-navigation), donc le couple remonte de
          // 4 px, et le libellé, qui débordait de l'onglet jusqu'à 2 px du bas de la barre, en
          // garde 6. `scripts/verifier-etats-export.mjs` mesure la hauteur de chaque onglet sur
          // l'export — c'est elle, et non ce calcul, qui dit que la cible tient.
          height: ControlHeight.tabBar + insets.bottom,
          paddingTop: Spacing.one,
          paddingBottom: insets.bottom + Spacing.one,
          // **Un lieu n'apparaît que quand il a quelque chose à montrer** (C5.7). La barre est
          // masquée de la soumission du premier questionnaire à la fermeture de la carte « Ton
          // premier plan » : jusque-là, chaque écran n'a qu'un geste, et proposer deux lieux avant
          // qu'il y ait quoi que ce soit à suivre était offrir une porte sur une pièce vide.
          //
          // `display: 'none'` plutôt qu'un rendu conditionnel de la barre : c'est ce que le canvas
          // décrit, et c'est la seule forme qui laisse intact tout ce que `tabBarStyle` porte déjà —
          // la hauteur qui inclut l'encoche, et la disposition verticale du libellé mesurée en 13.7.
          //
          // **Et elle ne laisse pas de bande vide, ce qui se mesure et ne se raisonne pas** : le
          // navigateur d'onglets passe aussi sa hauteur aux écrans par contexte. Relevé le
          // 17/09/2026 sur l'export statique lu par Playwright, en 390 × 844 : les deux enfants du
          // conteneur en colonne valent `[784, 60]` barre visible et `[844, 0]` barre masquée —
          // l'écran reprend la hauteur entière. Aucun écran ne compense à la main
          // (`useBottomTabBarHeight` n'est lu nulle part), ce qui est la seule chose qui aurait pu
          // laisser la bande. `EXPO.md` §1.7.
          //
          // **L'entrée glissée du canvas (320 ms depuis le bas) n'est pas rendue**, et c'est un
          // écart assumé : elle demanderait de rendre la barre soi-même en enveloppant
          // `BottomTabBar` dans un `Animated.View`, donc de dépendre de `@react-navigation/bottom-tabs`
          // — un paquet qu'`expo-router` embarque sans l'exposer, et qui n'est pas une dépendance de
          // ce dépôt. Ajouter une dépendance pour une animation d'entrée n'est pas un échange que ce
          // projet fait. Écart consigné en `v1-17` §9.
          display: barreVisible ? 'flex' : 'none',
        },
      }}
    >
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ focused, color }) => <OngletIcone nom="plan" focused={focused} color={color} />,
          tabBarLabel: ({ focused, color }) => <Libelle texte="Plan" focused={focused} color={color} />,
        }}
        // Depuis C5.2 le plan est une pile lui aussi, donc il lui faut la même garde que Suivi,
        // pour la même raison : un onglet est un lieu, pas un signet. Sans elle, avoir ouvert
        // « Toutes les pistes » ferait rouvrir les pistes au prochain toucher sur « Plan ».
        listeners={({ navigation }) => ({
          tabPress: (evenement) => {
            evenement.preventDefault();
            navigation.navigate('plan', { screen: 'index' });
          },
        })}
      />
      <Tabs.Screen
        name="suivi"
        options={{
          title: 'Suivi',
          tabBarIcon: ({ focused, color }) => <OngletIcone nom="suivi" focused={focused} color={color} />,
          tabBarLabel: ({ focused, color }) => <Libelle texte="Suivi" focused={focused} color={color} />,
        }}
        // **L'onglet ramène toujours à la racine de sa pile.** Par défaut, une pile imbriquée
        // dans un onglet garde son sommet d'une visite à l'autre : après avoir ouvert un
        // bilan, toucher « Suivi » rouvrait ce bilan au lieu du suivi (retour d'appareil du
        // 07/09/2026). Un onglet est un lieu, pas un signet — d'autant qu'avec un seul bilan
        // en base, on n'atteignait plus jamais le vrai écran de suivi.
        listeners={({ navigation }) => ({
          tabPress: (evenement) => {
            evenement.preventDefault();
            navigation.navigate('suivi', { screen: 'index' });
          },
        })}
      />
    </Tabs>
    </ContexteDuPremierParcours.Provider>
  );
}

// `tabBarLabelStyle` ne varie pas selon l'état : pour que l'onglet actif soit en 600, il faut
// rendre le libellé soi-même. Et `ThemedText` porte la police par poids, indispensable sur
// Android où `fontWeight` est ignoré sur une police custom chargée par fichiers (cf. theme.ts).
function Libelle({ texte, focused, color }: { texte: string; focused: boolean; color: ColorValue }) {
  return (
    <ThemedText
      weight={focused ? 600 : 500}
      style={{ fontSize: 12, lineHeight: 16, color, fontFamily: focused ? FontFamily.semibold : FontFamily.medium }}
    >
      {texte}
    </ThemedText>
  );
}
