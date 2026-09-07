# Ramille — Increment v1-11 : navigation, action engagée, design system

**Date** : 07/09/2026. **Statut** : **les cinq lots sont livrés** (PR #71, #72, #73, #74, #75),
mergés le 07/09. Reste la vérification sur appareil, qui demande un build EAS — §7.

Le plan ci-dessous est conservé tel qu'il a été écrit *avant* l'implémentation, corrections
incluses : il vaut autant comme trace de ce qui a été prévu que de ce qui a résisté. Les cinq
écarts constatés en codant sont relevés en §7, et corrigés en place dans les sections
concernées.

**Origine** : premier test de l'app sur téléphone (build EAS du 07/09, `v1-10` §10). Deux
retours structurels : « je peine à saisir où je suis entre le bilan, le plan et le suivi », et
« je distingue mal l'action pour laquelle je me suis engagé ». Détail des retours en issues
[#69](https://github.com/ScratchMe/TraceVerte/issues/69) et
[#68](https://github.com/ScratchMe/TraceVerte/issues/68).

**Canvas** : https://claude.ai/code/artifact/c55de841-4c40-4a71-a381-c7092c98984b — sources et
argumentaire dans `docs/design/v1-11-navigation/README.md`. Les décisions ci-dessous en
découlent ; ce document dit **comment** les livrer, lot par lot, avec les fichiers, les tests
et les pièges.

---

## 1. Le modèle retenu, en cinq règles

1. **Deux lieux, pas trois : le présent et la trace.** Le **Plan** (`/plan`) est maintenant,
   cette saison — l'action engagée, le cap, le point de la semaine. Le **Suivi** (`/suivi`) est
   dans la durée — les bilans, les écarts, les points répondus. Une barre basse à deux onglets
   les porte, toujours visible sur ces deux écrans et leurs enfants.
2. **Le questionnaire est un flux, pas un lieu.** Plein écran, barre masquée. Il se termine
   sur le résultat, qui est *aussi* le détail d'un bilan ouvert depuis le suivi : **un seul
   écran, deux entrées** (`/suivi/bilan?id=…`). C'est ce qui a fait tomber « Bilan » comme
   destination — il n'avait aucun contenu propre.
3. **Le compte vit derrière une icône**, en haut à droite des deux onglets, vers `/compte`. Un
   onglet permanent contredirait « pas besoin de compte ».
4. **La règle d'arrivée ne change pas** : la racine envoie sur le plan dès qu'un bilan complété
   existe (`src/app/index.tsx`). Ce qui manquait n'était pas la page d'atterrissage mais la
   sortie visible vers le suivi.
5. **L'action engagée est le fait saillant du plan.** Bordure accent, fond teinté, étiquette
   en tête ; l'autre proposition s'efface (opacité) sans disparaître ni perdre son bouton.

Et trois partis pris **qu'aucun lot ne doit entamer** : aucune mécanique d'échec sur le suivi
(ni série, ni score, ni période manquée) ; jamais un chiffre dans la bouche de Ramille, jamais
la mascotte à côté d'un chiffre lourd ; les clés AsyncStorage `traceverte.*` restent telles
quelles.

---

## 2. Architecture de routes cible

Expo Router 57 embarque son propre navigateur d'onglets (`expo-router/build/react-navigation/
bottom-tabs`, importé par `layouts/Tabs.js`) : **aucune dépendance à ajouter**, `Tabs` s'importe
depuis `expo-router`. Un groupe `(tabs)` n'apparaît pas dans l'URL — `/plan` et `/suivi` ne
bougent pas.

```
src/app/
├── _layout.tsx                 racine : Stack headerShown:false (inchangé)
├── index.tsx                   → /plan ou /onboarding (inchangé)
├── (tabs)/
│   ├── _layout.tsx             <Tabs> — la barre à deux onglets (NOUVEAU)
│   ├── plan.tsx                ← déplacé depuis plan/index.tsx
│   └── suivi/
│       ├── _layout.tsx         Stack headerShown:false (NOUVEAU)
│       ├── index.tsx           ← déplacé depuis suivi.tsx
│       └── bilan.tsx           ← déplacé depuis bilan/resultat.tsx ; URL /suivi/bilan?id=…
├── bilan/
│   ├── index.tsx               questionnaire — hors (tabs), donc sans barre (inchangé)
│   └── resultat.tsx            DEVIENT une redirection vers /suivi/bilan (anciens liens)
├── compte/
│   ├── index.tsx               « Toi » — hors (tabs), pile plein écran (NOUVEAU)
│   └── suppression.tsx         page publique Play (inchangée)
├── connexion/*, onboarding/*, feedback.tsx, conditions.tsx, confidentialite.tsx, status.tsx
                                 tous hors (tabs), donc sans barre (inchangés)
```

| Route | Avant | Après | Barre |
| --- | --- | --- | --- |
| `/plan` | `plan/index.tsx` | `(tabs)/plan.tsx` | oui, Plan actif |
| `/suivi` | `suivi.tsx` | `(tabs)/suivi/index.tsx` | oui, Suivi actif |
| `/suivi/bilan?id=…` | — | `(tabs)/suivi/bilan.tsx` | oui, Suivi actif |
| `/bilan/resultat?id=…` | le résultat | redirection vers `/suivi/bilan` | — |
| `/compte` | — | `compte/index.tsx` | non |
| `/bilan` | questionnaire | inchangé | non |

**Pourquoi un paramètre de requête et pas `[id]`** : l'export statique (`web.output: static`)
exige `generateStaticParams` pour une route dynamique, sinon la page n'est pas produite et
Vercel répond 404 — exactement le piège silencieux de `cleanUrls`. `bilan/resultat.tsx` lit
déjà `?id=` ; on garde ce mécanisme. `suivi/bilan.html` sort en fichier plat, couvert par
`cleanUrls: true`.

**Pourquoi le résultat vit sous Suivi et pas hors des onglets** : une pile imbriquée dans un
onglet garde la barre visible avec cet onglet actif. C'est la seule façon d'avoir la barre sur
le résultat sans dupliquer un composant de barre.

---

## 3. Les lots, dans l'ordre

Cinq lots, une PR chacun, dans cet ordre. Le lot 0 est additif et sans effet visuel ; il
existe pour que les lots 1 à 3 s'écrivent avec les jetons plutôt que d'être migrés ensuite.
Le lot 4 est mécanique et peut traîner.

| Lot | Contenu | Taille | Dépend de | Livré |
| --- | --- | --- | --- | --- |
| 0 | Jetons de design (additifs) | petit | — | PR #71 |
| 1 | Action engagée sur le plan | petit | 0 | PR #72 |
| 2 | Barre à deux onglets, compte, résultat sous suivi | moyen | 0 | PR #73 |
| 3 | Flux : bilans ouvrables, point en tête, période calme, saison | moyen | 2 | PR #74 |
| 4 | Migration des écrans vers les jetons | mécanique | 0 | PR #75 |

### Lot 0 — Jetons de design (additif, zéro changement visuel)

**Objectif.** Nommer une fois les valeurs qui se répètent déjà en dur. Aujourd'hui `fontSize:
26` est déclaré dans 16 fichiers, `borderRadius: 18` dans 7, alors que `ThemedText` ne connaît
que 48 (`title`) et 32 (`subtitle`) — et que **les 32 usages de `type="title"` surchargent
tous la taille inline**. Le rôle d'en-tête accessible est porté par le type, la taille par
l'écran : c'est cette dissociation qu'on referme.

**Fichiers.**

`src/constants/theme.ts` — ajouter, sans rien retirer :

```ts
// Échelle typographique réellement en vigueur dans les écrans (relevé du 07/09, canvas
// v1-11 page Système). `title`/`subtitle` de ThemedText (48/32) sont les tailles du handoff
// initial ; aucun écran ne les affiche sans les surcharger.
export const TypeScale = {
  screen:  { fontSize: 26, lineHeight: 32, letterSpacing: -0.26 },  // titre d'écran
  salient: { fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },   // chiffre saillant (cap, écart)
  card:    { fontSize: 17, lineHeight: 24 },                         // titre de carte
  body:    { fontSize: 15, lineHeight: 22 },                         // corps d'écran
} as const;

export const Radius = { chip: 8, field: 16, card: 18, button: 27 } as const;
export const ControlHeight = { target: 44, button: 54, field: 56 } as const;
```

**Deux corrections apportées au moment d'écrire le code, contre le relevé réel** (livré ainsi
le 07/09) : le rayon des champs vaut **16 et non 14** — c'est la valeur la plus fréquente du
produit, douze usages — et l'échelle `label` à 13 px **n'existe nulle part** ; elle venait de
la page Système du canvas, pas du code. Elle n'est donc pas déclarée : inventer un jeton pour
une valeur que personne n'emploie, c'est fabriquer du vocabulaire mort. De même `ControlHeight.chip`
(46) n'existe pas — une puce se dimensionne par son padding, pas par une hauteur fixe.

`src/components/themed-text.tsx` — ajouter quatre `type` : `screenTitle` (TypeScale.screen,
600, **rôle header** comme `title`), `salient` (TypeScale.salient, 600), `cardTitle`
(TypeScale.card, 600), `body` (TypeScale.body, 500). Ne pas toucher `title`/`subtitle`/`small`
: le lot 4 migre, le lot 0 ajoute. `small` (14/20) est déjà l'« annexe » du canvas — pas de
doublon.

`src/components/button.tsx` et `src/components/bilan/chip.tsx` — remplacer les littéraux 54/27
et 8/22 par les jetons. Aucune valeur ne change.

`src/constants/theme.ts` — `BottomTabInset` n'est utilisé nulle part (vérifié) : le retirer,
le lot 2 n'en aura pas besoin (la barre n'est pas en surimpression, le navigateur réserve sa
hauteur).

**Tests.** Aucun nouveau test unitaire : des constantes n'ont rien à prouver. **Le critère
d'acceptation est la non-régression visuelle** : `expo export` avant et après, capture Playwright
des 18 pages à 390 dp, comparaison pixel à pixel via Pillow dans le scratchpad.

**Attention en lisant le résultat, vérifié le 07/09 : la capture n'est pas déterministe.** Le
rendu SVG de la mascotte varie d'une capture à l'autre — jusqu'à 56/255 d'écart sur environ
175 pixels, toujours dans son cadre. Trois pages sur dix-huit en portent une. **Le contrôle qui
tranche est de recapturer le même build deux fois** : ce qui bouge aussi entre deux captures
identiques est du bruit, ce qui ne bouge que d'un build à l'autre est une régression. Sans ce
contrôle, on conclut à une régression là où il n'y en a pas — ou pire, on prend l'habitude
d'ignorer trois pages.

**Pièges.** `type="title"` porte `accessibilityRole="header"` par défaut ; `screenTitle` doit
le porter aussi, sinon la migration du lot 4 ferait perdre la navigation de titre en titre au
lecteur d'écran — ce que l'audit T11 a mis du temps à obtenir.

### Lot 1 — L'action engagée se voit au premier regard

**Objectif.** Sur `/plan`, la carte de l'action engagée se distingue des propositions :
bordure 2 px accent, fond `backgroundTinted` (`#F3F8F4`), étiquette « TU T'Y ES ENGAGÉ »
précédée d'une coche dans un disque accent, puis l'intitulé, puis une ligne « Le mardi et le
jeudi · − 184 kg CO₂e par an ». Les autres cartes passent en opacité 0,72 tant qu'une action
est engagée, mais **gardent leur bouton** (« Choisir celle-ci à la place », qui existe déjà
dans `ActionCommitment`). Référence : canvas page Plan.

**Fichiers.**

`src/types/engagement.ts` (NOUVEAU, pur, testé) —
`libelleIntention(days: string[] | null, timing: string | null): string | null` qui rend « Le
mardi et le jeudi » / « Avant la fin du mois » à partir des colonnes `plan_actions.intention_days`
et `intention_timing`. Le code de formatage existe déjà quelque part dans
`src/components/plan/action-commitment.tsx` (bloc `committedBox`, l. 92-115) : **le déplacer**,
pas le dupliquer. Test : les jours dans l'ordre de la semaine quel que soit l'ordre de saisie,
un seul jour sans « et », les deux champs nuls → `null`.

`src/components/plan/action-card.tsx` (NOUVEAU) — extrait de `(tabs)/plan.tsx` la carte
(actuellement inline l. 246-289). Props : `action`, `engagee: boolean`, `estompee: boolean`,
`children` (le `ActionCommitment`). Rend l'en-tête coche + étiquette quand `engagee`. La coche
est un `Svg` de `react-native-svg` (déjà utilisé par les illustrations), 12 px dans un disque de
20 px. Style : `Radius.card`, padding 18, `borderWidth: engagee ? 2 : 1`, `borderColor: engagee ?
theme.accent : theme.border`, `backgroundColor: engagee ? theme.backgroundTinted : undefined`,
`opacity: estompee ? 0.72 : 1`.

`src/app/plan/index.tsx` (ou `(tabs)/plan.tsx` si le lot 2 est passé) — trier les actions
**engagée d'abord** puis par gain décroissant (le serveur trie déjà par gain :
`estimate_action_savings`), et passer `estompee={committedActionId !== null && committedActionId
!== action.id}`.

`src/components/plan/action-commitment.tsx` — l'état engagé ne rend plus que le lien « Changer
d'avis » (l'intention est remontée dans la carte). Le reste (sélecteur de jours, échéance) ne
bouge pas.

**Accessibilité.** La carte engagée annonce son état : `accessibilityLabel` recomposant
« Engagée : {intitulé}, {intention} » sur la `View` de la carte (un `Pressable` nu est légitime
quand la cible porte plusieurs textes — cf. CLAUDE.md, bannière de `resultat.tsx`).

**Tests.** `src/types/engagement.test.ts` (cf. ci-dessus). Pas de test pgTAP : rien ne change
en base.

**Acceptation.** Sur un compte avec une action engagée : la carte verte est en tête, l'autre
est estompée mais son bouton répond. Sur un compte sans engagement : deux cartes identiques,
chacune avec « Je m'y engage ». Vérifier sur téléphone **et** web (`opacity` sur
react-native-web est un vrai `opacity`, pas de piège connu).

**Pièges.** L'index unique partiel garantit une seule action engagée par cycle ; `otherActionCommitted`
existe déjà dans `ActionCommitment` — s'en servir, ne pas recalculer.

### Lot 2 — La barre à deux onglets, le compte, le résultat sous le suivi

**Objectif.** Rendre visible en permanence « où je suis » sur le plan et le suivi, y aller en
un geste, et sortir le compte du suivi.

**2.1 — La barre.** `src/app/(tabs)/_layout.tsx` :

```tsx
import { Tabs } from 'expo-router';
// Deux onglets, et pas trois : cf. v1-11 §1. Le compte n'est pas une destination.
export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: theme.accent,
      tabBarInactiveTintColor: theme.textTertiary,
      tabBarStyle: { borderTopColor: theme.border, backgroundColor: theme.background,
                     height: 56 + insets.bottom, paddingTop: 8, paddingBottom: insets.bottom + 12 },
      tabBarLabelStyle: { fontFamily: FontFamily.medium, fontSize: 12, lineHeight: 16 },
    }}>
      <Tabs.Screen name="plan"  options={{ title: 'Plan',  tabBarIcon: ({ focused, color }) => <OngletIcone nom="plan"  focused={focused} color={color} /> }} />
      <Tabs.Screen name="suivi" options={{ title: 'Suivi', tabBarIcon: ({ focused, color }) => <OngletIcone nom="suivi" focused={focused} color={color} /> }} />
    </Tabs>
  );
}
```

`insets` vient de `useSafeAreaInsets()` (`react-native-safe-area-context`, installé). Le
libellé actif en 600 : `tabBarLabelStyle` ne varie pas par état — passer par `tabBarLabel:
({ focused, color }) => <ThemedText weight={focused ? 600 : 500} …>`.

`src/components/onglet-icone.tsx` (NOUVEAU) — les deux icônes en `react-native-svg`, tracé
1,9 px sur grille 24, reprises du canvas (`Main.dc.html`) : Plan = coche + ligne de base, Suivi
= courbe montante + point. La pastille : `View` 56 × 30, rayon 15, fond `backgroundSelected`
quand `focused`, transparent sinon. **Aucune bibliothèque d'icônes** — `@expo/vector-icons`
n'est pas dans le projet et deux icônes ne justifient pas 3 Mo.

Le navigateur pose déjà `accessibilityRole="tab"` et `accessibilityState.selected` : rien à
ajouter, **vérifier** au lecteur d'écran (TalkBack) que « Plan, onglet, sélectionné » est
annoncé.

Web : la barre s'étire sur toute la largeur d'un écran de bureau. Acceptable en V1 (le web est
la surface publique, pas la surface d'usage — `v1-10` §2.E) ; si ça gêne, `tabBarStyle` peut
prendre `maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%'`.

**2.2 — Déplacements.** `git mv` pour garder l'historique :
`src/app/plan/index.tsx → src/app/(tabs)/plan.tsx` ; `src/app/suivi.tsx →
src/app/(tabs)/suivi/index.tsx` ; `src/app/bilan/resultat.tsx → src/app/(tabs)/suivi/bilan.tsx`.
Créer `src/app/(tabs)/suivi/_layout.tsx` : `<Stack screenOptions={{ headerShown: false }} />`.

Mettre à jour les navigations : `bilan/index.tsx` l. 176 → `router.replace({ pathname:
'/suivi/bilan', params: { id, nouveau: '1' } })` ; `plan` l. 341 « Revenir à mon bilan » →
`/suivi/bilan` ; `connexion/index.tsx` et `resultat` (goToPlan) inchangés sur `/plan`.

**Retirer** : « Voir mon suivi » du pied du plan (l. 329-338) et « Voir mon plan » du pied du
suivi (l. 337) — la barre les rend redondants. Garder « Revenir à mon bilan ».

**2.3 — L'ancien chemin.** `src/app/bilan/resultat.tsx` redevient un fichier de 15 lignes :
lit `id`, `router.replace({ pathname: '/suivi/bilan', params: { id } })`, rend un
`ActivityIndicator`. Raison : `/bilan/resultat` est cité dans `page-titles.ts`, dans le commentaire
d'en-tête d'`api/partage.ts` et potentiellement dans des favoris. Un lien mort silencieux est le
pire résultat possible d'un déplacement de fichier.

**2.4 — Le résultat, deux entrées.** Dans `(tabs)/suivi/bilan.tsx` : `const { id, nouveau } =
useLocalSearchParams<{ id: string; nouveau?: string }>()`. Quand `nouveau === '1'` (fin du
questionnaire) : comportement actuel, bouton « Voir ce que je peux faire », transition vers
`/connexion` si la proposition n'a pas été vue. Sinon (relecture depuis le suivi) : en-tête
avec retour (`TextLink` « Ton suivi », `router.back()`), titre « Bilan du 12 juin »
(`formatDate` existe dans `src/lib/format.ts`), **pas** de bouton vers le plan, **pas** de
transition connexion, partage conservé. Dériver ce mode dans une fonction pure
`modeResultat(params)` de `src/types/resultat.ts` (NOUVEAU, testé : `'1'` → `nouveau`, absent
ou autre → `relecture`).

**2.5 — Le compte.** `src/app/compte/index.tsx` (NOUVEAU, titre d'onglet « Toi — Ramille ») :
- session anonyme : phrase « Ton bilan reste sur cet appareil. Un compte le fait te suivre
  ailleurs. » + bouton « Rattacher un compte » → `/connexion` avec `source: 'compte'` ;
- compte rattaché : « Compte rattaché à {email} » (règle de `etatDuCompte`,
  `src/types/compte-suppression.ts` — l'adresse non confirmée n'est pas un compte rattaché) ;
- réglage des rappels (`src/lib/notification-prefs.ts`, aujourd'hui rendu dans `MonCompte`) ;
- `MonCompte` (export, suppression) déplacé tel quel depuis le suivi ;
- liens : « Nous faire un retour » → `/feedback`, « Confidentialité » et « Conditions ».

`src/components/compte-bouton.tsx` (NOUVEAU) : `Pressable` 44 × 44, `accessibilityRole="button"`,
`accessibilityLabel="Ton compte"`, icône personne en SVG (canvas), `router.push('/compte')`.
Posé en haut à droite de `(tabs)/plan.tsx` et `(tabs)/suivi/index.tsx`, au-dessus du titre.

`src/types/analytics.ts` : `connexion_view.source` gagne `'compte'` (type seul, la base ne
contraint pas la valeur) ; **nouvel événement `compte_view`** — et là la double inscription
s'applique (CLAUDE.md) : migration `insert into public.usage_event_types (name, description)
values ('compte_view', …)`, entrée dans `USAGE_EVENT_NAMES` et `UsageEventPropsByName`
(`never`), `useTrackView('compte_view')` dans l'écran, **et deux tests à mettre à jour** :
`src/types/analytics.test.ts` l. 15 (liste attendue) et `supabase/tests/database/12_usage_events.test.sql`
l. 145-150 (`bag_eq` sur les onze noms → douze, et le libellé « onze événements »).

**2.6 — Titres.** `src/constants/page-titles.ts` : ajouter `/compte` (« Toi — Ramille ») et
`/suivi/bilan` (« Ton bilan — Ramille ») ; garder `/bilan/resultat`. Le script
`verifier-titres-export.mjs` échoue en CI sur toute page sans titre — c'est voulu, il attrapera
un oubli.

**Tests.** `src/types/resultat.test.ts`. Mise à jour d'`analytics.test.ts` et de pgTAP `12`.
Export web : compter les pages (18 → 20 : `compte.html`, `suivi/bilan.html`) et vérifier que
`plan.html`, `suivi/index.html` existent bien sous ces noms — le groupe `(tabs)` ne doit
apparaître dans aucun chemin de `dist/`.

**Acceptation.** Sur téléphone : ouvrir l'app → plan avec la barre ; onglet Suivi → suivi ;
icône → compte, retour → onglet d'origine ; fin de questionnaire → résultat **avec la barre,
Suivi actif** ; « Refaire mon bilan » → questionnaire **sans barre**. Sur web : `/plan`,
`/suivi`, `/suivi/bilan?id=` et `/bilan/resultat?id=` (redirigé) répondent 200 en production.
Lien `ramille://` (email de connexion) → racine → plan avec la barre.

**Pièges.**
- Les routes typées (`experiments.typedRoutes`) régénèrent `.expo/types` à l'export ; `tsc` en
  CI passe sans ce dossier (il est ignoré et le typecheck est vert aujourd'hui avec
  `/connexion/retrouver`), mais un chemin mal orthographié ne sera **pas** attrapé par le
  typecheck — le script de titres et le test manuel le sont.
- `useTrackView('plan_view')`/`('suivi_view')` sont émis par montage d'écran. Avec des onglets,
  **un écran reste monté quand on change d'onglet** (react-navigation garde les onglets vivants)
  : `plan_view` ne sera émis qu'à la première ouverture du plan, pas à chaque retour sur
  l'onglet. C'est un changement de sens de l'entonnoir. Décider avant de livrer : soit on
  l'accepte et on le documente dans `v1-08`, soit on passe par `useFocusEffect` pour émettre à
  chaque focus. **Recommandation : `useFocusEffect`**, sinon le taux de retour sur le suivi —
  la question même que cet increment pose — devient invisible.
- Android, bouton retour matériel depuis `/plan` : quitte l'app. C'est le comportement attendu
  d'une racine à onglets, ne pas « corriger ».
- `Alert.alert` est proscrit dans les nouveaux écrans (issue #59) — état inline.

### Lot 3 — Les flux : bilans ouvrables, point en tête, période calme, saison

**Objectif.** Livrer les six flux du canvas qui ne sont pas déjà couverts par le lot 2.

**3.1 — Ouvrir un bilan passé (flux 3).** Dans `(tabs)/suivi/index.tsx`, la liste des bilans
devient une liste de lignes : `Pressable` `minHeight: 56`, rayon 16, bordure `theme.border`,
date en 15/22 600, sous-ligne « 2,4 t · domicile-travail » en 13/18 `textTertiary`, chevron SVG
à droite, `accessibilityRole="button"`, `accessibilityLabel` = « Bilan du 12 juin, 2,7 tonnes »
(recomposé, cf. CLAUDE.md). `onPress` → `router.push({ pathname: '/suivi/bilan', params: { id
} })`. Le `HistorySnapshot` de `src/types/suivi.ts` porte déjà `id` (l. 14). Le graphe
d'évolution existant reste au-dessus, inchangé.

**3.2 — Le point en tête du plan (flux 4).** Dans `(tabs)/plan.tsx`, déplacer le bloc
`checkins` (l. 316-326) **avant** la carte du cap : ordre = titre, `CheckinCard` en attente,
cap, actions. Ne rendre en tête que les check-ins `pending` ; un check-in répondu dans la
session affiche déjà la réplique de Ramille (`CheckinCard`, `answered`). Rien à changer dans
`CheckinCard`.

**3.3 — Période calme sur le plan (flux 6).** Quand aucun check-in n'est en attente et qu'un
cycle existe, une carte `backgroundElement` avec `Mascot mood="resting" size={40}`,
`RAMILLE.periodeCalme` et `RAMILLE.periodeCalmeDetail` — les répliques existent, ne pas en
écrire. Placée à l'emplacement du point (sous le titre). **Vigilance** : la carte du cap est
juste dessous avec « − 184 kg » ; la règle « jamais la mascotte à côté d'un chiffre lourd »
vise l'empreinte, pas une réduction, et `emptyActionsCard` du plan pose déjà la mascotte à cet
endroit. Si le rendu la fait paraître commenter le chiffre, la déplacer sous les actions.

Le suivi garde sa propre carte calme (l. 209-226) : elle porte un texte différent (« on ne
compte que les fois où tu as répondu ») qui n'a de sens que là.

**3.4 — L'invitation au changement de saison (flux 2).** `suggestRebilan`
(`REBILAN_SUGGESTION_DAYS`, dans `suivi`) : déplacer la constante et la dérivation dans
`src/types/suivi.ts` si elles n'y sont pas déjà (l. 9 du rendu les calcule à partir de
`daysSinceLatest`), et réutiliser dans le plan : carte `backgroundSelected` « Une nouvelle
saison a commencé. Ton bilan date de {n} mois. » + `TextLink` « Refaire mon bilan » → `/bilan`.
Même seuil, même lien que le suivi.

**Tests.** `src/types/suivi.test.ts` : la suggestion de re-bilan (seuil inclus/exclu). Pas de
pgTAP.

**Acceptation.** Un bilan de la liste s'ouvre en lecture avec retour ; un check-in en attente
est la première carte du plan ; sans check-in, le mot de Ramille prend sa place ; passé le
seuil, l'invitation apparaît sur le plan **et** sur le suivi.

### Lot 4 — Migration des écrans vers les jetons (mécanique)

**Objectif.** Que plus aucun écran ne redéclare une taille que `TypeScale` nomme. Relevé au
07/09 : `fontSize: 26` × 19 (16 fichiers, dont les 9 étapes du questionnaire), `fontSize: 30`
× 4, `fontSize: 17` × 4, `fontSize: 15` × 13, `borderRadius: 18` × 7.

**Méthode.** Fichier par fichier : `type="title" style={styles.title}` avec `title: { fontSize:
26, … }` → `type="screenTitle"` et suppression de l'entrée de style. Idem `salient`, `cardTitle`,
`body`. Puis les rayons et hauteurs. Commande de contrôle en fin de lot :

```
grep -rn "fontSize: 2[6]\b\|fontSize: 30\b\|fontSize: 17\b\|borderRadius: 18\b" src/app src/components
```

doit rendre zéro ligne (les tailles hors échelle — 44 du gros chiffre de résultat, 34 de
l'accroche — restent en dur : elles sont uniques, les nommer serait du bruit).

**Acceptation.** La même comparaison pixel à pixel qu'au lot 0 : zéro différence sur les 20
pages. C'est le seul garde-fou qui vaille pour un lot de 40 fichiers touchés.

**Pièges.** Le rôle `header` : après migration, `screenTitle` doit rester annoncé comme
en-tête. Vérifier au lecteur d'écran sur une page migrée, pas seulement lire le code.

---

## 4. Pièges transverses, à relire avant chaque PR

- **Export statique.** Jamais de route `[param]` (cf. §2). Toute nouvelle route sans enfants
  sort en fichier plat : `cleanUrls: true` la sert, ne pas y toucher.
- **Titres.** Toute nouvelle route → une entrée dans `page-titles.ts`, sinon la CI tombe.
- **Événements d'usage.** Un événement = migration + `analytics.ts` + émission + deux tests
  (`analytics.test.ts`, pgTAP `12`). Un événement déclaré et jamais émis se lit **zéro**.
- **React Compiler.** `react-hooks/set-state-in-effect` refuse un `setState` synchrone dans un
  effet — le motif validé est dans `src/app/index.tsx` (fonction asynchrone, écriture après
  `await`, relance par compteur).
- **`minWidth: 0`** sur tout enfant flex qui porte du texte (`react-native-web`), et padding
  réduit sur toute puce équirépartie (PR #67).
- **`Alert.alert`** proscrit (issue #59).
- **Mascotte** : cinq expressions, aucune négative ; ses phrases dans `mascotte.ts` seulement ;
  jamais un chiffre ; masquée aux lecteurs d'écran.
- **`TextLink`** pour tout texte cliquable ; un `Pressable` nu porte un `accessibilityLabel`
  recomposé.
- **Sur téléphone, un build EAS** par lot qui touche la navigation (0 et 4 se vérifient sur
  web). Depuis GitHub, en un clic (`v1-10` §10.7).

---

## 5. Hors de cet increment

Volontairement laissé de côté, avec l'issue qui le porte :

- Balayer l'onboarding au doigt — [#68](https://github.com/ScratchMe/TraceVerte/issues/68).
  À faire **après** le lot 2, pour rester cohérent avec la navigation générale.
- Instrumenter `/connexion/retrouver` — [#61](https://github.com/ScratchMe/TraceVerte/issues/61).
- Dire à l'écran que le compte est rattaché — [#62](https://github.com/ScratchMe/TraceVerte/issues/62).
  Le lot 2.5 en pose la base (`/compte` sait si le compte est rattaché) ; le bandeau sur le
  plan reste à faire.
- Collision Google — [#60](https://github.com/ScratchMe/TraceVerte/issues/60).
- Ne plus planter en silence sans configuration — [#65](https://github.com/ScratchMe/TraceVerte/issues/65).
- Dépendances Expo SDK 57 — [#58](https://github.com/ScratchMe/TraceVerte/issues/58). À faire
  avant le lot 2 si possible : un build natif de navigation sur un SDK en retard, c'est une
  variable de plus le jour où quelque chose casse.
- Le chantier E de `v1-10` (push) et la publication Play : ils viennent après, et le plan à
  deux onglets les accueille sans rien changer (le rappel ouvre `/plan`).

---

## 6. Séquencement et estimation

| Ordre | Lot | PR | Build EAS ? | Estimation |
| --- | --- | --- | --- | --- |
| 1 | 0 — jetons | une | non | une demi-journée |
| 2 | 1 — action engagée | une | oui (vérif. téléphone) | une demi-journée |
| 3 | 2 — barre, compte, résultat | une | **oui** | une à deux journées |
| 4 | 3 — flux | une | oui | une journée |
| 5 | 4 — migration | une | non | une demi-journée, mécanique |

Les lots 0 et 1 peuvent partir dès le feu vert. Le lot 2 est le cœur et le seul risqué :
déplacements de fichiers, nouvelle route, changement de sens d'un événement. Le lot 3 n'a de
sens qu'après lui. Le lot 4 se glisse n'importe où après le 0.

---

## 7. Ce que l'implémentation a corrigé

Cinq écarts entre ce plan et le code réel, tous constatés en écrivant. Ils sont corrigés en
place dans les sections ci-dessus ; ils sont rassemblés ici parce que **quatre d'entre eux
viennent d'avoir lu le canvas au lieu du code**, et que c'est la leçon à retenir pour le
prochain increment.

**1. `formatIntention` existait déjà.** Le lot 1 prévoyait de créer `src/types/engagement.ts`
pour formater « le mardi et le jeudi ». La fonction vivait dans `src/types/plan.ts`, testée.
Elle est réutilisée telle quelle, avec une mise en majuscule locale — la source est écrite pour
le milieu d'une phrase, pas pour une tête de ligne.

**2. Le rayon des champs vaut 16, pas 14.** Le 14 venait de la page Système du canvas, où je
l'avais dessiné de mémoire. Le relevé du code donne 16, douze usages — la valeur la plus
fréquente du produit.

**3. L'échelle `label` (13 px) n'existe nulle part.** Elle non plus ne venait pas du code. Elle
n'est pas déclarée : un jeton pour une valeur que personne n'emploie est du vocabulaire mort.
Idem `ControlHeight.chip` (46) — une puce se dimensionne par son padding.

**4. Une migration mécanique doit filtrer par valeur, jamais par nom de clé.** Le premier
passage du lot 4 remplaçait tout `style={styles.title}` par `type="screenTitle"` (26 px). Or
`styles.title` vaut 32 px dans la page 404, 34 dans l'accroche d'onboarding, 30 dans les pages
légales : sept titres auraient rétréci. Ce n'est pas la comparaison d'images qui l'a rattrapé,
mais **un scan des entrées de style devenues orphelines** — une entrée que plus personne ne
référence signale soit du code mort, soit une propriété perdue au passage. À refaire dans cet
ordre la prochaine fois : orphelines d'abord, pixels ensuite.

**5. Le piège de mesure était bien réel, et le plan l'avait vu.** `plan_view` / `suivi_view`
sont passés à `useTrackFocus` : dans une barre d'onglets, react-navigation garde l'écran monté
quand on change d'onglet, et l'événement ne serait parti qu'une fois par session. Le compteur
n'aurait pas chuté à zéro — ce qui se serait vu — il aurait donné un chiffre plausible et faux.

### Deux choses que le canvas avait raison de dire

L'onglet « Bilan » ne devait pas exister : le code l'a confirmé sèchement — l'écran de résultat
prend un identifiant de bilan, et **rien dans le suivi ne menait à un bilan passé**. La
destination n'avait aucun contenu propre. Et la barre à deux entrées, inhabituelle, s'est
révélée le bon compromis : le seul troisième candidat était le compte, et lui donner un onglet
permanent aurait contredit « pas besoin de compte ».

## 8. Ce qui reste, et qui demande un appareil

Rien de tout cela ne se vérifie sur l'export web :

- **Le retour matériel Android depuis `/plan`** doit quitter l'app. C'est le comportement
  attendu d'une racine à onglets ; ne pas le « corriger » par réflexe.
- **TalkBack** doit annoncer « Plan, onglet, sélectionné ». Les attributs viennent du
  navigateur, ils n'ont pas été entendus.
- **La carte de période calme** est posée au-dessus du cap de la saison, donc à deux blocs d'un
  chiffre en kilos. La règle « jamais la mascotte près d'un chiffre lourd » vise l'empreinte et
  non une réduction, et c'est la place que lui donne le canvas — mais si le rendu réel la fait
  paraître commenter le cap, elle descend sous les actions. Déplacement d'un bloc, pas une
  reprise.
- **Le lien de connexion par email** (`ramille://`) doit rouvrir l'app et aboutir sur le plan,
  barre comprise. Ce chemin n'a jamais été exercé faute d'app native jusqu'au 07/09.

## 9. Retours d'appareil du 07/09/2026 (builds lots 2 puis 3-4)

Quatre défauts relevés en usage réel, tous invisibles sur l'export web. Les trois premiers
viennent du build du lot 2, le quatrième de celui des lots 3 et 4.

### 9.1 La précision de mode tombait hors champ

Choisir « Voiture » n'ouvrait rien de visible : la question de motorisation se rendait **après
la liste entière**. Sur 390 × 844, avec neuf modes, elle tombait à **y = 774 px** pour un
conteneur de 684 — 242 px hors champ, sous le pied collant. La personne voyait un mode coché,
un « Suivant » grisé, et une liste qui semblait complète.

La question s'ouvre désormais **sous l'élément qui la déclenche**, à l'intérieur de la liste
(`src/components/bilan/precision-mode.tsx`, partagé par les quatre étapes concernées) :
mesurée à **y = 238** pour « Voiture (seul) », **y = 298** pour « Voiture (covoiturage) ».

Deux points qui ne sont pas des détails :

- **« Voiture (seul) » et « Voiture (covoiturage) » sont deux rangées**, et chacune ouvre sa
  propre précision. La condition porte donc sur la rangée cochée, pas sur `*_mode === 'voiture'`
  qui serait vrai pour les deux. Côté loisirs, où les deux options écrivent le même
  `leisure_mode`, c'est la clé locale `selectedKey` qui tranche — la valeur en base ne le peut
  pas.
- **Le deux-roues motorisé suit la même mécanique**, comme partout ailleurs dans le produit.

Le défilement automatique aurait été un pansement : il ne dit rien au retour sur l'étape, quand
la sélection est déjà faite.

### 9.2 Une bande haute qui ne défile pas

L'accès au compte défilait avec le contenu et disparaissait au premier geste. Une bande fixe
(`src/components/bande-haute.tsx`) le garde atteignable, sur les deux onglets **et** sur
`/suivi/bilan`, dans tous les états de l'écran — chargement et état vide compris, sinon la
chrome apparaît après le chargement et l'écran saute.

**Elle porte le nom, pas le visage.** La règle de la mascotte (« jamais à côté d'un chiffre
lourd ») interdit un visage en permanence au-dessus du cap de la saison ou de l'empreinte d'un
bilan. Le mot « Ramille » n'accompagne rien et ne commente rien.

Trois créneaux de largeur égale : le nom est centré sur l'écran et non sur ce qui reste, et le
créneau de gauche attend le bouton retour dont iOS aura besoin.

### 9.3 Un pied collant qui prenait un cinquième de l'écran

Sur `/suivi/bilan`, trois éléments empilés dans le pied fixe occupaient ~170 px sur 844, avec
une cassure franche au milieu du contenu. « Partager mon bilan » et « Refaire mon bilan » sont
passés dans le flux ; ne reste collé que le seul pas suivant — et **en relecture, plus rien
n'est collé**, puisqu'il n'y a plus de pas suivant à proposer. Le pied restant porte une
bordure fine plutôt qu'une rupture.

### 9.4 Le retour matériel rejouait l'onboarding, au premier lancement seulement

§8 demandait que le retour depuis `/plan` quitte l'app : c'est le cas — sauf au **tout premier
lancement**, où il remontait les quatre écrans d'onboarding un par un. Ils étaient empilés
(`push`) sous le questionnaire, et la racine ne route directement vers `/plan` qu'à partir du
deuxième lancement, ce qui explique que le défaut disparaisse ensuite.

La règle ne se tient pas en interceptant le bouton retour, mais en **n'accumulant pas
d'historique derrière un flux terminé** : quitter l'onboarding vide la pile
(`router.dismissAll()` puis `replace('/bilan')`, dans `onboarding/transition.tsx`).
L'onboarding ne se rejoue pas.

### 9.5 L'écran d'ouverture se vidait au lieu de s'annoncer

Au lancement, le splash natif (fond `#E4EFE8`, la mascotte — `app.json` →
`expo-splash-screen`) cédait la place à un fond **blanc** portant un `ActivityIndicator` de
16 px. Le produit s'annonçait, puis se vidait, et c'est le seul écran par lequel tout le monde
passe à chaque ouverture.

`src/components/ecran-lancement.tsx` le remplace : même fond que le splash
(`backgroundSelected` vaut exactement `#E4EFE8` en clair, et l'app est verrouillée en clair sur
natif), la mascotte à **168 px** — la taille qui lui donne la hauteur qu'elle a sur le splash,
puisque la silhouette occupe 84 % de sa boîte et que `imageWidth: 180` la rend à ~142 px — et
le nom sous elle.

L'animation tient en une phrase : la feuille se pose (elle monte de 14 px en se redressant de
7°, 520 ms), le nom apparaît avec elle, et à **380 ms elle passe de `calm` à `happy`**. Elle
arrive avec le visage même du splash et se réveille.

**Elle sourit, elle ne fait pas de clin d'œil** : ce serait une sixième expression, et la règle
du produit est qu'on n'en ajoute pas. Le mouvement suffit à donner vie à celles qui existent.
C'est par ailleurs le seul endroit où un visage peut occuper l'écran entier sans rien commenter
— il n'y a pas un chiffre dessus.

`expo.backgroundColor` passe à `#E4EFE8` dans la foulée : c'est la couleur de la vue racine
native, donc ce qui se voit entre le masquage du splash et la première image rendue par React.
Elle était blanche, ce qui remettait exactement le flash qu'on venait de retirer.

L'état d'échec du démarrage, lui, reste blanc et brut : c'est un message technique destiné à
être recopié, pas une surface de produit.

### 9.6 Le réveil se voyait à peine, et la coupe se voyait trop

Deux défauts de la première version du §9.5, relevés sur le build suivant.

**On ne voyait pas l'animation.** Une session déjà en cache répond en ~200 ms : l'écran
d'ouverture était payé — un temps d'arrêt à chaque lancement — sans être vu. La racine tient
donc un **plancher d'affichage** de 1450 ms (`DUREE_ANIMATION_LANCEMENT`, exporté par le
composant pour que le plancher suive l'animation) : l'animation dure ~1080 ms, et il reste
~400 ms de visage souriant avant la redirection. Ce n'est pas un délai ajouté au chargement —
un démarrage plus lent que ce plancher n'attend rien de plus. L'échec, lui, n'attend jamais.

**On voyait la coupe.** L'expression changeait par simple changement d'état, et le
remplacement des yeux (points → arcs) sautait à l'écran. Un fondu n'aurait fait que rendre le
saut mou. La feuille donne maintenant un petit à-coup — elle s'étire de 7 %, se tasse à 97,5 %,
revient — et **l'expression change au sommet de cet à-coup** : l'œil suit le mouvement, pas la
substitution. C'est le principe du clignement qui masque une coupe, en animation
traditionnelle. L'arrivée elle-même passe en `Easing.out(Easing.back)` : la feuille dépasse
légèrement puis se pose, au lieu d'un fondu linéaire.

### 9.7 Le dernier bandeau collant du plan

`/plan` gardait un bandeau collant de ~68 px pour un seul lien tertiaire, « Revenir à mon
bilan ». Le commentaire qui l'accompagnait défendait sa présence : le détail d'un bilan n'est
pas une destination de la barre, donc le lien doit exister. C'est juste — mais ça ne justifie
pas la **chrome permanente**. L'onglet Suivi mène au même contenu en un geste de plus, sur
l'écran où l'on revient le plus souvent, et une entrée permanente dans le bas de l'écran est
exactement la troisième destination que le modèle à deux onglets a refusée (§1).

Le bandeau disparaît, le lien reste — en fin de flux, sous le contenu, où il ne coûte rien.
Il s'appelle maintenant « Revoir mon bilan » : « revenir » supposait qu'on en venait, ce qui
n'est vrai qu'au premier passage.

Le bandeau de `/suivi` reste, lui : « Refaire mon bilan » est l'action de cet écran, pas un
raccourci vers un autre. Il perd sa hauteur inutile (bordure fine, moitié moins de marge
verticale, même traitement que le pied de `/suivi/bilan`) et surtout **il ne se rend plus du
tout quand il est vide** — la condition vivait à l'intérieur, et quand la proposition de
re-bilan s'affichait plus haut dans la page, il restait une bande vide de 48 px collée en bas.
