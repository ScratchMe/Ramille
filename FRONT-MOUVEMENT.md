# FRONT-MOUVEMENT.md — ce qui bouge, et ce qui ne bouge jamais

> **Quand ouvrir ce fichier.** Faire bouger quelque chose — une transition, une animation, une
> hauteur qui change, un fondu — et lire avec lui le skill `/mouvement`
> (`.claude/skills/mouvement/SKILL.md`) · toucher à « réduire les animations » · poser un focus près
> d'une entrée animée · poser une découpe permanente (`overflow: hidden`), qui peut couper l'anneau
> de focus.
>
> Il n'est **pas** chargé automatiquement — seul `CLAUDE.md` l'est. Sa table de déclencheurs dit
> quand venir ici ; une règle sortie sans dire *quand* aller la chercher est une règle enterrée.

Ce fichier a été sorti de `FRONT.md` le 01/10/2026, qui pesait 102 Ko — avec `FRONT-MASCOTTE.md`,
`FRONT-QUESTIONNAIRE.md`, `FRONT-SESSION.md` et `FRONT-SUIVI.md`. Ses sections y sont venues
**telles quelles**, à leurs renvois près,, et **gardent leur numéro** : il reste unique dans la famille, donc un renvoi «
`FRONT.md` §2.x » écrit avant cette date — dans un commentaire du code, un document daté — se
retrouve ici, et la table en tête de `FRONT.md` dit où vit chaque numéro. Tout ici est propre à
Ramille ; ce qui voyage est en `FRONT.md` §1, et la garde image par image en `TESTING-GARDES.md`
§2.14.

---

## 2. Propre à Ramille

### 2.12 Le mouvement

Décidé le 27/09/2026 (`docs/architecture/v1-30-les-transitions.md`, qui dit aussi ce qui reste à
faire) ; le skill `/mouvement` en porte les règles de travail, et c'est lui qu'on appelle avant de
toucher une animation. Ce qui suit est ce qu'un écran doit savoir.

- **Ce qui bouge** : les feuilles du bas (le voile se fond sur place, la feuille monte et redescend),
  la barre d'onglets qui arrive au sortir du premier parcours, l'étape du questionnaire et son rail,
  ce qui s'ouvre sous un choix, ce qui change de hauteur, le passage d'un onglet à l'autre. Et ce
  qui bougeait déjà : la mascotte, l'écran de lancement, l'entrée d'une carte d'ouverture.
- **Un défilement est celui de la plateforme** (`scrollTo({ animated })`, `v1-31`) : ni durée ni
  courbe à régler, et **posé sous la préférence** (`animated: !animationsReduites`) — le défilement
  compte parmi ce qui s'anime. Rien n'attend sa fin, qui ne s'annonce pas sur web (`EXPO.md` §1.5),
  et le focus part avant lui, au geste. Les deux défilements du questionnaire et leurs règles :
  `FRONT-QUESTIONNAIRE.md` §2.6. **Le plan défile depuis le 01/10/2026** (`v1-33` P-1 et P-2), deux
  fois, et jamais à chaque retour : à l'ouverture du sélecteur, juste assez pour que « C'est noté »
  finisse au-dessus de la barre (`defilementPourMontrer`) ; après la relecture d'un engagement pris
  sur l'écran ou ramené de la liste, jusqu'à la carte engagée, où qu'elle soit
  (`defilementVersLaCarte`). Le focus va à son bloc avec le rendu qui retire « C'est noté », avant le
  défilement, qu'il ne fait pas lui-même.
- **Ce qui ne bouge jamais** : l'état pressé (une teinte immédiate, `v1-29` décision n° 6), un
  chiffre (jamais un compteur qui défile — il afficherait des valeurs fausses en chemin), une
  navigation de pile (« standard plateforme »), et le focus, qui part au geste et jamais à la fin
  d'une animation. **Même quand sa cible entre encore**, découpée ou transparente : sur la liste des
  pistes, la question reçoit le focus pendant que sa carte grandit. Un délai jusqu'à la fin de
  l'entrée y a été écrit le 29/09/2026 pour ménager TalkBack, puis retiré le jour même — il
  retardait l'annonce que la règle protège. Si Android refuse un jour le focus sur un nœud qui
  entre, la parade touche l'entrée, pas le moment du focus (`v1-13` §11.24).
- **Tout passe par `src/lib/mouvement.tsx`** — `styleDEntree`, `Apparition`, `Depliage`,
  `HauteurSuivie`, `SansApparitionAuMontage` — et par les jetons `Mouvement` de
  `src/constants/theme.ts`. Une durée écrite en dur dans un écran est un réglage de plus à tenir
  d'accord ; ce qui décide d'une animation (un sens, une arrivée) est une dérivation de
  `src/types/mouvement.ts`, testée.
- **Jamais `entering`, `exiting` ni `LinearTransition` de reanimated** : sur web, le premier masque
  l'élément une image et lui fait perdre le focus, le deuxième le recopie hors du défilement, le
  troisième étire un bloc qui change de taille au lieu de le déplacer (`EXPO.md` §1.5, mesures en
  `v1-30` §3.2). Ce qui entre passe par une CSS animation de reanimated ; ce qui change de taille,
  par `Depliage` ou `HauteurSuivie`, qui suivent la vraie mise en page.
- **« Réduire les animations » pose tout, dès la première image — en ne lançant rien.**
  `Animated`, les CSS animations et transitions de reanimated et le `Modal` de react-native-web
  l'ignorent ; `withTiming` la lit, mais ce n'est pas une défense : laissé jouer sous la préférence,
  `Depliage` ne s'ouvre pas du tout (`v1-30` §4.2). Chaque usage dit donc ce qu'il devient sous
  elle, et le décide **au rendu** : un état posé remis en place dans un effet arrive parfois après
  la première image (la barre d'onglets, relevée par le parcours réel). La préférence n'est lue
  qu'au démarrage.
- **Ce qui est déjà là quand l'écran arrive ne s'ouvre pas sous les yeux** : un contenu enveloppé
  dans `SansApparitionAuMontage` est posé au montage, et seul ce qui monte ensuite s'anime — une
  précision rouverte par un brouillon, un point déjà répondu. **Hors de ce fournisseur, rien ne
  s'anime** : on ne sait pas si l'écran vient de monter. De même, une étape du questionnaire qui
  arrive d'un autre écran (« Repartir de mon dernier bilan », le retour après un échec) se pose :
  le sens ne se calcule que d'une étape à l'autre.
- **Une hauteur nulle n'est pas un contenu vide** : sur web, la pile masque l'écran recouvert
  (`display: none`), où `onLayout` rend zéro. `HauteurSuivie` l'ignore ; tenue, elle faisait
  regrandir la carte du point sous les yeux à chaque retour sur le plan. Toute mesure prise dans
  `onLayout` pour animer pose la même question.
- **Toucher le voile ferme la feuille, comme le retour** (01/10/2026, `v1-33` T-7) : même `fermer()`,
  donc même sortie animée et même `onFerme` — la feuille des rappels se marque vue comme sur un
  retour. La place au-dessus de la feuille est en `pointerEvents: 'box-none'` ; le voile n'est ni un
  arrêt de tabulation ni un nœud du lecteur d'écran. **La poignée ne se tire toujours pas** : un
  glissé se juge au doigt, sur appareil.
- **Une feuille qui redescend peut encore recevoir un choix** : la fermeture part au geste de
  retour, et un choix validé après un `await` arrive pendant la sortie — ou juste après. `fermer(apres)`
  remplace alors le rappel en attente, ou l'appelle aussitôt si la sortie est finie — ignoré, le
  choix partait en base sans que l'écran le reçoive.
- **« Chargement… » attend 300 ms avant de se dire** (`useChargementVisible`), pour ne plus
  clignoter une image avant un contenu rapide — **sauf** après « Réessayer », où c'est la seule
  preuve que le geste a été pris (`FRONT.md` §1.2).
- **Un `gap` que le parent donnait à ses enfants se reprend** quand `HauteurSuivie` les enveloppe
  (`styleDuContenu`) : ils sont désormais les enfants de ce bloc, et l'écart disparaissait sans bruit
  sur la carte du point.
- **Tenir une hauteur, c'est découper ce qui dépasse — et l'anneau de focus dépasse.** Le navigateur
  le dessine hors de l'élément ; `HauteurSuivie` découpe donc quatre pixels plus large que son
  contenu (`MARGE_DE_DECOUPE`, rendus à la mise en page par une marge négative). Toute nouvelle
  découpe permanente (`overflow: hidden` qui ne s'en va pas à la fin d'une animation) pose la même
  question : un contrôle au bord de la zone découpée perd son anneau, en silence.
- **Une animation se juge image par image** — les deux gardes (`verifier-etats-export.mjs`, section
  J, et `verifier-parcours-reel.mjs`) relèvent chaque image par `scripts/relever-par-image.mjs`,
  avec et sans la préférence (`TESTING-GARDES.md` §2.14) — **et sur l'appareil** : sur Android, seul lui
  dit si c'est fluide.
