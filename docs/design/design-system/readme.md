# Ramille — design system

Ramille est une app Android-first (web = surface publique) de sensibilisation à l'empreinte carbone des transports : un questionnaire en neuf étapes → une restitution → un plan (une action engagée par saison, avec une intention) → un point régulier → un suivi. Deux objectifs : provoquer une prise de conscience, soutenir un changement d'habitude dans la durée. Deux onglets, **Plan** et **Suivi** ; pas de compte nécessaire. La mascotte s'appelle Ramille aussi : produit et personnage ne font qu'un.

## Sources
- Dépôt : `ScratchMe/Ramille` (React Native / Expo, branche `main`) — jetons `src/constants/theme.ts`, composants `src/components/**`, voix `src/constants/mascotte.ts`, géométrie `src/types/mascot.ts`.
- Canvas antérieurs : `docs/design/v1-07` … `v1-12` (dont `v1-11-navigation/Systeme.dc.html`, `v1-08-mascotte/Expressions.dc.html`).
- Handoff V1 : `design_handoff_traceverte_v1/` (38 écrans, README détaillé).
- Brief v1-14 : `uploads/BRIEF.md` (boucle d'engagement, d'une saison à l'autre).
- Aucun fichier Figma. Spline Sans est versionnée en `assets/fonts/` (SIL OFL 1.1) — cf. Caveats.

## Contenu — fondamentaux
- **Français, tutoiement, phrases courtes**, factuelles. Le produit dit des faits chiffrés, sans qualifier : « 0,6 t au-dessus de la moyenne en France », jamais « c'est trop ».
- **Aucun jugement, aucune mécanique d'échec** : pas de streak, série, score, badge, période manquée. Une période sans réponse n'apparaît pas. « Changer d'avis » libère sans rien compter.
- **La voix de Ramille** (première personne, courte, tutoiement) : jamais un nombre dans sa bouche, jamais « tu devrais » / « il faut », jamais un accord qui genre (« Tu t'y es engagé » → « Ton engagement »). Exemples : « Bien joué — chaque changement compte. » · « Pas cette fois-ci. Rien d'obligatoire, on se repose la question au prochain point. » · « Je te fais signe lundi. » · « Je note tes réponses ici, au fil des saisons. » Le rythme est fixe, elle nomme donc le jour sans compter.
- Le produit parle en voix neutre pour les chiffres (« Ton cap pour cette période », « Ton bilan précédent »). Les libellés d'écran sont des phrases de titre en casse de phrase (« Ton plan », « Où tu te situes »).
- Les échecs techniques se disent dans la page, ton neutre, ce qui est attendu plutôt que ce qui est faux, et sans jamais affirmer un fait sur les données de la personne : « Cette adresse semble incomplète. » · « L'envoi n'a pas abouti. Vérifie l'adresse et réessaie. » · « Ton bilan n'a pas pu être affiché. Il n'est pas perdu, réessaie dans un instant. » Hors ligne, on ne dit jamais « tu n'as rien » — c'est une affirmation sur ses données, pas un constat de lecture.
- Le repère 2050 s'appelle **« Repère »**, jamais « Objectif » ; n'apparaît que sous la moyenne française ; jamais le nombre de paliers restants.
- Pas d'emoji. Pas de point d'exclamation en dehors d'une réplique de Ramille.

## Fondations visuelles
- **Couleurs** : un seul accent vert forêt `#1F6F4A` (texte sur teinte `#14563A`, atténué `#A9C8B6`, teinte `#E4EFE8`), neutres tièdes (`#F0F1EC`, `#F6F8F3`, `#F3F8F4`, bordure `#DDE0D9`), trois niveaux de texte (`#131612` / `#39403B` / `#5E655F`). L'accent marque **ce qui est dominant ou actionnable**, jamais un verdict. Pas de rouge, pas d'orange, pas d'icône d'alerte. Thème sombre : `Colors.dark` (accent `#3D9B6F`, fond `#000000`) — chaque jeton existe dans les deux thèmes (`tokens/colors.css`, `[data-theme="dark"]`).
- **Typographie** : Spline Sans seule (400/500/600/700). Échelle relevée : display 32/38 (−0,64), screen 26/32 (−0,26), salient 30/36 (−0,6) — un chiffre, jamais un titre —, card 17/24, body 15/22, label 13/18 (+0,3, capitales), default 16/24, small 14/20, code mono 12 — la chasse fixe pour les sources et les codes techniques seulement, jamais pour une phrase adressée à la personne. Titres 600, corps 500 (400 pour les longs paragraphes d'onboarding). Uniques : accroche 34/40, nom du lancement 30/38 ; trois titres à 30/36 (connexion, contexte de l'onboarding, pages légales). Le total de la restitution est en `salient` depuis le 11/09/2026 (A3-22) ; le « 48/52 » qu'écrivait ce kit n'a jamais existé. Espace insécable avant `? ! : ;` et dans les guillemets, posée au rendu par `ThemedText`.
- **Espacement** : 2 / 4 / 8 / 16 / 24 / 32 / 64. Padding d'écran 24 ; gap de contenu 16–32 ; cartes padding 18–24.
- **Rayons** : encadré 12, puce et ligne de mode 14, champ 16, carte 18, pilule 22, bouton 27 (= hauteur 54 / 2). Cadre de présentation 40–44. Le rayon 8 de l'ancienne puce « Cadence » a disparu avec elle.
- **Hauteurs** : cible **48** minimum (Material ; c'était 44 jusqu'au 24/09/2026), bouton 54, champ 56, champ numérique 64, bande haute 52, barre d'onglets 60 + encoche. Traits : 1 (neutre), 1,5 (choisi), 2 (engagé).
- **Fonds** : blanc, aplats de neutres tièdes. Pas de dégradé, pas d'image de fond, pas de glassmorphisme, pas de texture. Les illustrations manquantes sont des placeholders rayés 135° (`#E4EFE8`/`#F3F8F4`) avec légende mono.
- **Cartes** : deux registres. Neutre : fond `backgroundElement` sans bordure (panneau) ou bordure 1 px `border` sur blanc (action). Saillante : bordure accent 2 px + fond `backgroundTinted` + étiquette majuscule 13/18/700 précédée d'une pastille-coche 20 px (action engagée). Teintée `backgroundSelected` uniquement pour la décision dominante et le point de suivi.
- **Sélection** : fond `backgroundSelected` + bordure 1,5 px accent + poids 600. Non sélectionné : `backgroundElement`, bordure transparente, 400.
- **Ombres** : quasi aucune. Seul le bouton Google porte `0 1px 2px rgba(19,22,18,0.06)`. Le cadre de présentation porte `0 24px 60px rgba(19,22,18,0.10)` (hors app).
- **Barres de progression / comparaison** : rail `border`, remplissage accent, contexte `accentMuted` ; hauteur 6 (progression), 12–22 (comparaison), rayon = moitié.
- **Bande haute** : 52 px, nom centré 17/24/600 — un repère, pas un titre : il n'est pas annoncé en en-tête —, icône compte 22 dans une cible 48 à droite, bordure basse hairline. **Le nom, pas le visage.**
- **Barre d'onglets** : deux entrées de 48 px au moins, icônes trait 1,9 sur grille 24, pastille 56×30 **`accent` pleine, icône `onAccent`** sur l'actif (6,12:1 ; la pastille `backgroundSelected` ne ressortait qu'à 1,18:1), libellé 12/16 (600 actif).
- **Transparence / flou** : jamais, sauf le scrim de feuille `rgba(19,22,18,0.42)`. L'action estompée l'est **par son cadre** (filet `backgroundElement`), plus par l'opacité, qui faisait tomber son texte à 3,25:1.
- **Animation** : rare et signifiante. Souffle de la mascotte (scale 1,035, 1400 ms sinus, aller-retour) ; écran de lancement : arrivée 560 ms easeOutBack(1,4), à-coup 110/130/190 ms, nom 420 ms easeOutCubic ; l'expression change au sommet de l'à-coup. Aucune célébration, confetti, son. Feuilles : glissement natif. Navigations : standard plateforme.
- **États** : pressé = **teinte immédiate, sans animation** (`accentPressed` sur l'accent, `backgroundPressed` sur une surface neutre, `backgroundSelectedPressed` sur une surface choisie ; un lien texte se souligne) ; désactivé = fond élément + texte tertiaire, jamais une opacité, et jamais l'air choisi ; champ au repos = bordure `fieldBorder` `#858C86` (un fond seul ne ressort qu'à 1,14:1) ; focus = bordure accent 1,5 px sur les champs.
- **Mise en page** : flux plein écran (onboarding, bilan, connexion) sans bande ; onglets avec bande haute + barre basse ; **pied collant** hors défilement pour le bouton principal. Contenu max 800 sur web.
- **Mascotte** : feuille du logo + visage calculé (viewBox 100), 5 expressions (`calm`, `happy`, `encouraging`, `thinking`, `resting`), inclinaison ±12°, nominal 42, minimum 28 (en dessous : feuille seule), encre du visage fixe `#131612` dans les deux thèmes. Jamais à côté d'un chiffre lourd (total, kilos d'une action, cap). Masquée aux lecteurs d'écran.

## Iconographie
- **Pas de bibliothèque d'icônes** : trois tracés seulement, dessinés dans le dépôt — onglet Plan (coche + ligne), onglet Suivi (courbe + point), compte (buste). Grille 24, trait 1,9, arrondi. La coche de l'action engagée (trait 3, blanc sur pastille accent 20 px) est le quatrième.
- Aucun SVG d'illustration final : trois emplacements sont des placeholders à produire (onboarding 1 et 3, état vide). Le dépôt contient des illustrations vectorielles génériques (`src/components/illustrations/*`) non copiées ici.
- Pas d'emoji, pas de caractères unicode utilisés comme icônes (sauf « − » typographique pour les kilos évités et « · » séparateur).
- Marques copiées : `assets/images/logo-mark.svg`, `mascot-mark.svg`, `favicon-mark.svg`, `icon.png`, `splash-icon.png`, `google-oauth-logo.png` (référence du logo Google — le bouton officiel n'est jamais redessiné).

## Composants (inventaire = le dépôt)
core/ ThemedText · Button · TextLink · MessageInline · OnboardingDots
forms/ Chip · ChoiceRow · ModeListItem · PrecisionMode · NumericField · TextField · GoogleButton
mascotte/ Mascot · RamilleDit · CalculEnCours · EcranLancement
navigation/ CompteBouton · BandeHaute · OngletIcone · BarreOnglets · ProgressHeader · StepShell
plan/ CheckinCard · ActionCard · ActionCommitment · FeuilleRappels
compte/ ChoixDeRappel · MonCompte

Non portés (infrastructure sans UI) : ThemedView, TitreDePage, RetourDeNotification, ConfigurationManquante, MissingModeLink (rendu en ThemedText code dans le kit).

**Ajouts intentionnels** : `BarreOnglets` (le dépôt la compose dans `(tabs)/_layout.tsx` via expo-router) ; prop `accessory` sur `Mascot` (préparation des accessoires de saison) — **le dépôt les a livrés depuis (C2.13, 13/09/2026) et la prop s'y appelle `saison`**, avec pour défaut la saison du jour, donc c'est le nom du kit qui est le delta ; jetons `--color-mascot-ink` / `--color-mascot-vein` / `--color-mascot-warm`, qui **existent désormais dans `Colors`** (avec `mascotAccessory` en quatrième), le composant les lisant encore sur la seule palette claire.

## Index
- `styles.css` → `assets/fonts/fonts.css`, `tokens/colors.css`, `typography.css`, `spacing.css`, `base.css`
- `base.css` — la seule feuille du kit : police, fond et encre de la page, `box-sizing`, anneau
  de focus, motif des placeholders. Les composants portent tout le reste en styles en ligne ;
  chaque carte réécrivait ces déclarations à la main dans un `<style>` local.
- `guidelines/*.html` — 14 cartes de fondations (Colors, Type, Spacing, Brand)
- `components/<groupe>/` — .jsx + .d.ts + .prompt.md + une carte par groupe ; `components/loader.js` = repli quand `_ds_bundle.js` n'est pas compilé
- `ui_kits/ramille/` — kit cliquable (6 écrans, thème sombre) + catalogue des 38 écrans V1
- `assets/images/` — marques ; `assets/fonts/` — Spline Sans 400/500/600/700 (.ttf, SIL OFL 1.1)
- `design_handoff_traceverte_v1/` — handoff V1 (référence)
- `SKILL.md` — invocation Claude Code
- `github.md` — dépôt source et carte des écrans

## Caveats
- Spline Sans : les quatre graisses sont désormais versionnées en `assets/fonts/` (224 Ko, SIL OFL 1.1,
  reprises de `@expo-google-fonts/spline-sans` que le dépôt utilise déjà) et déclarées en `@font-face`
  local par `assets/fonts/fonts.css`. L'`@import` Google Fonts de `tokens/fonts.css` a disparu avec le
  fichier : une police de marque servie par un tiers se dégrade en silence en police système partout
  où cet hôte n'est pas joignable, et rien en aval ne le signale. L'app, elle, continue de la charger
  via `@expo-google-fonts` — c'est le kit qui devient autonome, pas le dépôt qui change.
- Les cartes de composants chargent React/Babel depuis unpkg et `_ds_bundle.js` ; sans bundle compilé, `components/loader.js` transpile les sources à la volée.
- Le kit reprend les valeurs chiffrées des maquettes (3,4 t, 2,8 t SDES, 0,6 t, 184 kg) — à confirmer côté produit.
