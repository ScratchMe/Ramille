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
