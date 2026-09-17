import { Tabs } from 'expo-router';
import { type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OngletIcone } from '@/components/onglet-icone';
import { ThemedText } from '@/components/themed-text';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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

  return (
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
          borderTopWidth: 1,
          // La hauteur inclut l'encoche du bas : le navigateur réserve la place, la barre
          // n'est jamais en surimpression du contenu (c'est pourquoi `BottomTabInset`, qui
          // servait à compenser à la main, a été retiré au lot 0).
          height: 60 + insets.bottom,
          paddingTop: Spacing.two,
          paddingBottom: insets.bottom + 12,
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
