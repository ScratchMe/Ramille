# TraceVerte — Architecture technique V1 (increment 11 — carte de bilan partageable)

**Périmètre** : premier levier de croissance du produit (« comment toucher un maximum de
monde ? »), décidé le 04/09/2026 à l'issue d'une réflexion produit sur les growth loops,
l'engagement et la gamification. Amende `spec-fonctionnelle-app-carbone-transport-v1.md` §2
(Non-goals) — voir le bandeau de révision dans ce document.

## 1. Contexte stratégique : ce qui a été tranché le 04/09/2026

Question posée : comment toucher un maximum de monde et créer de l'engagement, sachant que la
spec V1 exclut explicitement toute **mécanique sociale de comparaison** (§2, raison : risque
de honte comparative pour les profils captifs de la voiture — rural, pas d'alternative) et
tout **streak/points/badges** (raison : motivation extrinsèque fragile, un streak raté sur un
sujet chargé émotionnellement pousse à l'abandon). Pistes envisagées en vrac : growth loops,
esprit de compétition entre amis/famille (qui émet le moins), un jeu façon "cookie clicker"
dont la monnaie serait le nombre de pas (plafonné à 10 000/jour, 100 000/semaine) pour
encourager la marche plutôt que la voiture.

**Décisions actées** :
- Le non-goal **"aucune comparaison ou classement entre utilisateurs"** reste ferme et
  non négociable — même raison qu'à l'origine (honte comparative). Aucune fonctionnalité de
  classement/compétition entre utilisateurs ne sera construite sur cette base.
- Le non-goal sur les mécaniques de jeu est **révisé, pas supprimé** : des mécaniques de
  **progression ou de récompense non comparatives** (l'utilisateur vs son propre historique,
  jamais vs d'autres utilisateurs) redeviennent envisageables au cas par cas. Voir le bandeau
  de révision dans `spec-fonctionnelle-app-carbone-transport-v1.md` §2.
- Premier levier concret retenu, construit dans cet increment : une **carte de résultat
  partageable**. Chaque utilisateur partage volontairement **son propre** résultat (ce qu'il
  voit déjà sur son écran de restitution) — jamais un classement, jamais une comparaison avec
  d'autres utilisateurs.
- Le jeu "pas = monnaie" (cookie clicker thématisé marche/vélo) est **explicitement mis de
  côté comme projet à part**, hors roadmap de ce repo — à explorer séparément si l'idée revient,
  pas une tâche de ce backlog.
- Quatre autres axes identifiés pendant cette réflexion, non construits ici, suivis comme
  issues GitHub sur ce repo (pas de fichier ROADMAP dédié) : automatisation de la synchronisation
  des facteurs d'émission ADEME, insistance sur la trajectoire 2050 (vs. seule comparaison à la
  moyenne française) sur l'écran de restitution, canal de feedback utilisateur, tracking
  d'usage/segmentation.

## 2. Architecture de la carte de partage

Bouton **"Partager mon bilan"** sur `/bilan/resultat` (`shareResult()`) → partage natif
(`Share` de React Native, zéro nouvelle dépendance) d'un lien vers `/api/partage`.

**Aucune lecture serveur** : les chiffres transitent uniquement par les paramètres de l'URL
— exactement ce que l'utilisateur voit déjà sur son propre écran (`total`, `poste`, `percent`)
— pas de nouvelle table, pas de nouvelle policy RLS, pas de traçabilité d'un lien de partage
vers un compte utilisateur.

Deux **Vercel Functions** dans `api/` (dossier détecté automatiquement par la plateforme,
indépendamment de l'export statique Expo — cf. leurs commentaires d'en-tête pour le détail
courant, ce document couvre le "pourquoi" architectural) :

- **`api/partage.ts`** (runtime **Edge**) — sert le HTML de la page de destination avec les
  balises Open Graph (`og:image`, `twitter:card`…), pour que les apps de messagerie (WhatsApp,
  iMessage…) affichent un vrai aperçu visuel avant même que le destinataire clique. Léger
  (aucune dépendance lourde) : le runtime Edge lui convient bien, latence minimale.
- **`api/share-card.ts`** (runtime **Node.js**) — génère l'image de la carte à la volée
  (`satori` pour la mise en page + rendu SVG, `@resvg/resvg-wasm` pour la rasterisation
  PNG). **Pas** en runtime Edge : voir §3:1 ci-dessous — le bundle de rendu d'image est trop
  lourd pour les Edge Functions du plan Hobby de ce projet.

**Poste dominant expliqué, pas juste nommé** (retour utilisateur du 04/09/2026, après premier
envoi en prod) : `dominant_poste_label` seul (ex. "Voyages longue distance (Avion
long-courrier)") ne dit pas qu'il s'agit du poste dominant, ni ce qu'il représente dans
l'empreinte totale — pas d'intérêt réel sans ce contexte pour qui reçoit le lien. La carte
affiche donc "Poste principal — X %" (X = `dominant_poste_co2_kg_year / total_co2_kg_year`,
même calcul que le bloc "Le déplacement qui pèse le plus" déjà affiché à l'écran de résultat)
au-dessus du libellé. Deux variantes de libellé coexistent dans `bilan/resultat.tsx`,
délibérément différentes :
- `dominantHeadline()` — 2ᵉ personne ("Tes voyages longue distance…"), affichée à l'écran,
  adressée à l'utilisateur qui consulte son propre bilan.
- `dominantShareLabel()` — neutre, sans pronom ("Voyages longue distance en avion
  long-courrier"), transmise à `/api/partage` : ce texte est lu par les destinataires du lien
  partagé, pas par l'utilisateur qui partage — un "Tes voyages…" y serait mal adressé.

## 3. Runtime Node.js des Vercel Functions : cinq écueils rencontrés, dans l'ordre

Le chemin de `api/share-card.ts` de "ne build pas" à "fonctionne en production" est passé par
cinq bugs distincts, empilés, chacun masquant le suivant — aucun visible sans les vrais logs
runtime Vercel (`vercel logs <deploymentId> --token=<personal access token> --scope=<team> -f
-x --json` ; obtenir un token personnel a été nécessaire ici, le Vercel connecté par défaut à
la session de développement n'avait pas accès à ce projet, et l'authentification interactive
par device code n'était pas complétable depuis cet environnement — sans ces logs, chaque
étape ne renvoyait qu'un `FUNCTION_INVOCATION_FAILED`/`FUNCTION_INVOCATION_TIMEOUT` générique,
sans détail exploitable). Documenté ici pour ne pas redécouvrir ces cinq points un par un sur
une prochaine Vercel Function Node.js de ce projet :

1. **Taille du bundle Edge** — `@vercel/og` (Satori + `resvg.wasm` + `yoga.wasm` + police par
   défaut, ~2,4 Mo non compressés) dépasse la limite des Edge Functions du plan Hobby. Une
   fonction de rendu d'image doit tourner en runtime **Node.js**, pas Edge, sur ce plan.
2. **Type de module** — Vercel compile `api/*.ts` en ESM (`module: ESNext` dans
   `api/tsconfig.json`), mais Node charge un `.js` comme CommonJS par défaut tant que le
   `package.json` le plus proche ne déclare pas `"type": "module"` — la racine du repo ne le
   fait pas (Metro/Expo suppose CommonJS). `api/package.json` (`{"type": "module"}`) scope ce
   réglage au seul dossier `api/`, sans toucher au reste du repo. Sans lui : `SyntaxError:
   Cannot use import statement outside a module`, silencieux côté client
   (`FUNCTION_INVOCATION_FAILED` sans détail).
3. **Asset non tracé par le bundler** — une dépendance transitive (ex. `harfbuzzjs`, utilisé
   par `satori` pour le rendu du texte) qui charge un binaire (`.wasm`) via un mécanisme interne
   non détecté par le tracing de fichiers de la Function (`@vercel/nft`) se retrouve absent du
   bundle déployé (`ENOENT` au runtime, alors que tout fonctionne en local où le binaire est
   simplement présent sur disque). Un binaire qu'**on** charge nous-mêmes via un
   `fs.readFileSync(path.join(process.cwd(), ...))` littéral est correctement tracé et inclus
   — c'est le cas d'un asset chargé *en interne* par une dépendance qui pose problème. Fix :
   `vercel.json` → `functions["<chemin>"].includeFiles`, l'option documentée par Vercel pour
   forcer l'inclusion d'un fichier que le tracing automatique rate.
4. **`request.url` relatif en Node.js** — contrairement au runtime Edge où `request.url` est
   toujours une URL absolue, en Function **Node.js** c'est un chemin relatif (path + query,
   sans protocole/host) : `new URL(request.url)` lève `TypeError: Invalid URL`. Toujours parser
   avec une base factice : `new URL(request.url, 'http://localhost')`.
5. **Export par défaut vs export nommé** — en runtime Node.js (contrairement à Edge, toujours
   fetch-style), un `export default function handler(request) { return new Response(...) }`
   est traité par Vercel comme l'ancienne signature `(req, res) => void` : le retour `Response`
   est **silencieusement ignoré**, la requête reste en attente jusqu'au timeout
   (`FUNCTION_INVOCATION_TIMEOUT`) au lieu d'échouer immédiatement — le bug le plus trompeur des
   cinq, parce que le code s'exécute correctement jusqu'au bout sans lever d'erreur. Fix :
   `export async function GET(request: Request): Promise<Response>`, la convention que Vercel
   reconnaît explicitement comme fetch-style, quel que soit le runtime.

**Effet de bord positif du point 1** (Node.js plutôt qu'Edge, et l'abandon de `@vercel/og` qui
en a découlé) : la police par défaut de Satori/`@vercel/og` n'a pas le glyphe unicode ₂
(indice, utilisé partout dans l'app pour "CO₂e") — tofu sur l'image générée. La réécriture en
`satori`+`@resvg/resvg-wasm` direct charge la police **Spline Sans** de l'app elle-même
(`@expo-google-fonts/spline-sans`, copiée dans `api/fonts/` — pas importée depuis
`node_modules`, pour ne pas dépendre de sa structure interne), qui a ce glyphe : rendu final
plus cohérent visuellement que prévu au départ, et plus rapide (§4).

Au-delà de ces cinq bugs, une Function Node.js avec un cold start lourd (deux runtimes WASM à
charger — `resvg` + `harfbuzz` — plus police et rendu) peut dépasser le timeout par défaut du
plan Hobby (10s) : `vercel.json` → `functions["api/share-card.ts"].maxDuration` relevé à 30s.
En pratique, une fois chaud, l'endpoint répond en ~0,5-1s.

## 4. Choix technique écarté : capture native

Alternative envisagée pour générer l'image : capture côté client (`react-native-view-shot` +
`expo-sharing`) de l'écran de résultat. Écartée : nécessite un nouveau build EAS pour tester
sur Android, invalidable dans un environnement de développement sans émulateur/device.
L'approche par Vercel Function retenue est vérifiable de bout en bout (HTML + image réelle)
sans device, sur le déploiement preview de chaque pull request.

**Révision du 11/09/2026 — l'argument du build invérifiable est tombé, et il ne vaut plus pour
l'export de données.** `expo-notifications` (v1-12) a imposé un build EAS : la dépendance native
n'est donc plus un coût qu'on évite, c'est un coût déjà payé. Ce qui change, et ce qui ne change
pas :

- **La carte de partage reste une Vercel Function, et ce choix n'est pas rouvert.** Son second
  argument n'a jamais été le build : l'image doit être servie à un *destinataire* qui n'a pas
  l'app — `facebookexternalhit` et ses pareils récupèrent une URL, pas une capture d'écran de
  notre téléphone. Une capture native ne peut pas rendre ce service.
- **L'export de données, lui, était adossé à ce refus et n'aurait pas dû l'être** (constats
  A5-18 et A6-18, chantier C1.10). `exportMyData` (`src/lib/compte.ts`) passe le JSON en **texte**
  dans la feuille de partage Android faute d'`expo-file-system` et d'`expo-sharing`. La bonne
  forme — écrire le fichier dans le cache, le partager en `url` — attend ces deux dépendances, et
  plus rien ne s'y oppose. En attendant, seule l'annonce a été corrigée : sur Android
  `Share.share` rend toujours `sharedAction`, même feuille refermée sans rien choisir, donc
  l'écran dit que la feuille s'est ouverte et jamais que l'export est parti.

Le chantier qui ajoutera ces deux dépendances devra rouvrir cette §4 plutôt que la contourner :
c'est ici, et non dans un commentaire de `src/lib/compte.ts`, que le prochain lecteur viendra
chercher si la question est tranchée.
