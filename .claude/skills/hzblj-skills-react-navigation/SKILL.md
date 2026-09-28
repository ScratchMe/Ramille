---
name: hzblj-skills-react-navigation
description: >-
  React Navigation setup, typed routes, navigator structure, deep linking, and navigation actions. Use when building or modifying navigation in React Native. Triggers on: React Navigation, navigation, typed routes, navigator, stack navigator, tab navigator, deep linking, useNavigation, screen options.
disable-model-invocation: true
---

# Navigation (React Navigation)

## Setup

- Use `@react-navigation/native` with `@react-navigation/native-stack` as default.
- Wrap app root in `NavigationContainer`.
- Define navigators in dedicated `navigation/` folder.
- One file per navigator (`RootNavigator.tsx`, `TabNavigator.tsx`, `AuthNavigator.tsx`).

## Typed Routes

- Define `RootStackParamList` type for every navigator.
- Every route must have explicitly typed params (or `undefined` if none).
- Use typed `useNavigation` and `useRoute` hooks everywhere.
- Never pass untyped route params.

```ts
type RootStackParamList = {
  Home: undefined
  Profile: { userId: string }
  Settings: undefined
}

type ProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'Profile'>
```

```ts
const useAppNavigation = () => {
  return useNavigation<NativeStackNavigationProp<RootStackParamList>>()
}
```

## Navigator Structure

- Use nested navigators for logical grouping (Auth stack, Main tabs, Modal stack).
- Keep nesting shallow - max 3 levels.
- Tab navigator inside root stack, not the other way around.

```
RootStack
├── AuthStack (Login, Register, ForgotPassword)
├── MainTabs
│   ├── HomeStack
│   ├── SearchStack
│   └── ProfileStack
└── Modal screens (presented over tabs)
```

## Screen Options

- Define `screenOptions` on the navigator level for shared config.
- Override per-screen only when necessary.
- Use `headerShown: false` when building custom headers.
- Respect platform conventions (iOS large titles, Android material appbar).

## Deep Linking

- Define `linking` config on `NavigationContainer`.
- Map every route to a URL path.
- Handle nested navigators in linking config.
- Test deep links on both platforms.

```ts
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['myapp://', 'https://myapp.com'],
  config: {
    screens: {
      Home: '',
      Profile: 'profile/:userId',
      Settings: 'settings',
    },
  },
}
```

## Navigation Actions

- Use `navigation.navigate()` for standard transitions.
- Use `navigation.push()` when you want to add to stack even if screen exists.
- Use `navigation.replace()` after auth flow (no back to login).
- Use `CommonActions.reset()` sparingly and only for auth state changes.

## Rules

- Never store navigation state manually - let React Navigation handle it.
- Do not call navigation actions outside of React components or hooks.
- Avoid passing complex objects as route params - pass IDs and fetch data on screen.
- Keep route param types serializable (string, number, boolean).

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
