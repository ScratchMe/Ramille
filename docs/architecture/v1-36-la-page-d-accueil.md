# v1-36 — La page d'accueil du web : partir de l'été 2026

> **Décidée et construite le 31/10/2026.** Remplace la page d'accueil de l'étape 5 de
> [`v1-35`](v1-35-l-audit-en-chantiers.md) (23/10/2026), qui disait la fiche Play et le film. Ce document dit
> pourquoi, ce qui a été décidé avec la personne qui pilote, et ce qui a été décidé sans elle parce que c'était
> technique. La page vit dans `src/components/accueil/`, ses textes dans `src/constants/accueil.ts`, ses faits
> dans `src/constants/climat.ts`.

## 1. La demande

La personne qui pilote, le 31/10/2026, après être retournée voir la page : « c'est quand même tristounet ». Deux
reproches. **L'interface** : on doit pouvoir faire mieux et plus fluide. **Le marketing**, surtout : la page allait
tout de suite à la mesure de l'empreinte carbone des transports, donc seuls des gens déjà sensibilisés
comprenaient et se lançaient — alors que Ramille veut faire prendre conscience autant que faire changer. Sa
direction : **se raccrocher à ce qu'on commence à vivre du réchauffement** — la canicule de l'été, la sécheresse,
les incendies —, puis « tu veux agir ? Tu le peux », puis l'empreinte des trajets, pas à pas. Mesurer la page, et
toute liberté sur le motion design, dans la page ou en refaisant les films.

## 2. Ce qui a été décidé, et avec qui

**La promesse — avec la personne qui pilote, le 31/10/2026.** Trois formulations lui ont été proposées : « Ta part,
un trajet à la fois » (recommandée), « Sauver la planète, pas à pas » (la sienne) et « Protéger nos étés ». Le piège
de la deuxième a été dit avant le choix : un public peu sensibilisé sait qu'un trajet ne sauve pas la planète, et
une page qui promet plus que ce qu'elle tient perd ce public-là, précisément — et Ramille promet toujours ce qui
est vrai (le « au moins » des kilos évités, `v1-35` étape 6a). **Réponse : un mélange de la première et de la
troisième.** D'où le titre, « Que l'été 2026 reste une exception. », les faits de Météo-France, et la bascule :
« Tu ne peux pas arrêter une canicule. Tu peux changer un trajet. »

**Un écart assumé avec le handoff de design.** `docs/design/spec-fonctionnelle-app-carbone-transport-v1.md` §4
écrit : « Éviter une entrée par la peur pure […] le registre anxiogène climatique tend à paralyser plutôt qu'à
mobiliser », et « pas de mise en scène de l'urgence climatique, pas de vocabulaire catastrophiste ». La page entre
désormais par l'été 2026 — c'est la décision de la personne qui pilote. Elle la tient **sans la peur pure** que la
spécification refusait : des faits datés et sourcés, dits sans qualificatif (« le plus chaud jamais mesuré »,
« 53 jours », jamais « catastrophique » ni « alarmant ») ; un visiteur jamais laissé sur le constat — la phrase
qui suit le titre propose déjà d'y contribuer, pas à pas, et le premier bouton est dans le même écran ; et, dans les figures, la chaleur qui se lit à la durée, pas à la couleur — la scène du haut la peint, elle, du
seul ton chaud du kit, sans rouge ni orange. Le handoff est figé et ne se réécrit pas ; l'écart vit
ici.

**Le reste a été construit sans elle, puis montré** — l'ordre des bandes, les figures, le mouvement, les libellés,
la barre d'appel, la mesure. Une vidéo de la page sur téléphone, son haut sur ordinateur et la page entière lui
ont été envoyés le 31/10/2026 ; sa réponse : « Ah, là je crois que ça marche mieux, oui ». Chaque choix est écrit
ci-dessous pour pouvoir être rouvert, en particulier le libellé du bouton (§3), la barre d'appel (§3) et l'échelle
des étés, qui ajoute aux faits vécus une projection vers 2050 et 2100 (§3).

**Le même soir, la scène de l'été** (demande de la personne qui pilote, une fois la page en ligne) : « C'est peut-être
un peu anxiogène, mais franchement le ton change vite, donc ça va. Juste je pense qu'une représentation visuelle, une
petite animation de deux personnages humains (homme et femme) qui ont trop chaud avec un soleil qui chauffe, pour
faciliter la remémoration de ce que cet été a été pour nous tous. Un petit peu : vous vous souvenez de comment vous
l'avez vécu ? Vous voulez contribuer à améliorer les choses ? On est là pour vous accompagner pas à pas. » D'où, en
tête : la scène (`SceneDeLEte`), puis « Tu te souviens de cette chaleur ? », le titre, et un chapeau qui propose d'y
contribuer et dit que Ramille accompagne, pas à pas. Trois choix faits en l'écrivant, à rouvrir s'il le faut :
**le tutoiement**, celui de tout le produit ; **« cette chaleur », et non « cet été »**, que `FRONT.md` interdit
parce que la page sera encore lue l'été prochain — la question montre la scène, et le titre la date ; **la bande des
92 jours descend sous « 53 jours de vague de chaleur »**, où elle illustre le chiffre qu'elle dessine, pour que le
haut tienne encore dans le premier écran d'un téléphone. Une vidéo de l'arrivée sur téléphone et le haut sur
téléphone et sur ordinateur — la scène à droite du texte, le titre ramené de 64 à 52 pour tenir sur sa colonne —
lui ont été envoyés avec ces trois choix ; sa réponse : « C'est parfait comme ça ».

**La scène est annoncée au lecteur d'écran, par exception** : une image nommée (« Une femme et un homme accablés
par la chaleur, sous un soleil qui chauffe, sur une terre sèche. »), là où `FRONT.md` §1.4 masque les
illustrations, qui accompagnent un texte qui dit déjà tout. Celle-ci, la question qui suit la désigne : masquée,
« Tu te souviens de cette chaleur ? » resterait sans objet pour qui ne la voit pas. L'exception est écrite dans
`FRONT.md` §1.4 et §2.4.

## 3. La page, bande par bande

Des bandes pleine largeur, une colonne de 560 de large (1 040 pour le haut sur un grand écran, la scène à droite du
texte ; 800 pour le film). Sur un téléphone de 390 × 844, la scène, la question, le titre, le chapeau et le premier
bouton tiennent dans le premier écran (mesuré sur l'export le 31/10/2026, le bouton à 640 du haut) ; sur un 360 × 640, le bouton passe sous le pli, et la barre d'appel n'y paraît
qu'une fois le haut dépassé.

| Bande | Ce qu'elle dit | D'où ça vient |
|---|---|---|
| **Le haut** | Le nom de Ramille, **sans son visage** (en haut, la scène est celle des gens ; Ramille parle plus bas, `FRONT-MASCOTTE.md`) ; **la scène de l'été** — une femme et un homme qui ont trop chaud, un soleil qui chauffe, une terre sèche — ; « Tu te souviens de cette chaleur ? » ; **« Que l'été 2026 reste une exception. »** ; « Le plus chaud jamais mesuré en France depuis 1900, d'après Météo-France. Tu veux contribuer à ce que ça change ? Ramille t'accompagne, pas à pas, en commençant par tes trajets : en France, le premier poste de notre empreinte carbone. » ; le bouton, « Ton bilan prend 5 minutes environ. Pas de compte à créer pour commencer. », « J'ai déjà un compte » | Météo-France p. 4 et 5 ; SDES 2017 ; la scène, la demande du 31/10/2026 (§2) |
| **L'été en nombres** | « 53 jours de vague de chaleur » ; trois vagues, plus d'un jour sur deux, loin devant 2022 et ses 33 jours ; la bande de l'été et sa légende, « Un trait par jour… » ; trois faits — jusqu'à 72 départements en vigilance rouge le même jour, en juin (un maximum, p. 7), près de 40 % de pluie en moins, la saison des feux la plus sévère jamais enregistrée ; la source, en lien | Météo-France p. 4 et 11 |
| **L'échelle des étés** | « Aujourd'hui, un été sur 100. À +4 °C, une chaleur ordinaire. » ; quasi impossible sans le changement climatique ; aujourd'hui, +2,7 °C vers 2050, +4 °C vers 2100, où **ses températures** seraient celles d'un été ordinaire — Météo-France le dit de la chaleur, pas de la pluie, et la page ne dit pas plus ; « Arriver à +4 °C, ou s'arrêter avant : c'est ce que décident les émissions de la planète, les nôtres comprises. » — le bilan parle d'émissions « au niveau planétaire » | Météo-France p. 15 à 17, la trajectoire de réchauffement de référence pour l'adaptation (TRACC) qu'il cite |
| **Nos trajets** | « Et nos trajets ? » ; le transport, premier poste : 2,8 t sur 9,5 t ; la barre des cinq postes | `carbon-reference.ts` (SDES 2017) |
| **Ce qui est à notre portée** | **« Tu ne peux pas arrêter une canicule. Tu peux changer un trajet. »** ; ce que fait Ramille, en une phrase ; Ramille dit sa présentation ; un bouton, sans la durée | La seule bande sans chiffre, et la seule où paraît le visage de Ramille : elle ne se tient jamais près d'un chiffre lourd (`FRONT-MASCOTTE.md`) |
| **Comment ça marche** | La description courte de la fiche Play ; ses trois temps, numérotés et reliés par un trait ; son premier paragraphe | La fiche Play, mot pour mot (§6) |
| **Sans compte, sans publicité** et **Ce que Ramille n'est pas** | Les garanties et les limites de la fiche | La fiche Play |
| **Le film** | « Le fil de Ramille », sa ligne et sa version texte | Inchangés (`v1-35` étape 5) |
| **La fin** | « Commence par tes trajets. » ; un bouton | — |
| **Le pied** | L'éditeur, le contact, les trois pages publiques, en vrais liens | Inchangé |

**La date se garde** : la page écrit « l'été 2026 », jamais « cet été » — un fait daté ne se périme pas. Au bilan
de l'été 2027, la question se repose : garder 2026, ou raconter le suivant (`climat.ts` le rappelle).

**Le bouton : « Voir ce que pèsent mes trajets »**, et non plus « Découvrir mon impact » sur cette page : après un
récit qui parle de chaleur et d'émissions, « mon impact » restait abstrait ; le libellé dit ce qu'on obtient, avec
les mots du titre de la bande des trajets. Sous lui, la durée — « 5 minutes environ », celle que le film annonce —
et « Pas de compte à créer pour commencer. ». « Découvrir mon impact » reste sur la première page de l'onboarding,
que la page d'accueil saute.

**Une barre d'appel en bas de l'écran**, entre le moment où la bande du haut sort de l'écran et celui où la bande de
la fin y entre : un bouton toujours à portée, sans remonter. Elle ne prend jamais le focus ; au clavier, la tabulation
qui va au bout de la page amène la bande de la fin, dont le bouton est le même. Le défilement garde sous lui une
marge (`scrollPaddingBottom`), pour qu'un élément focalisé ne s'arrête pas dessous.

**Le film finit encore sur « Découvrir mon impact »**, l'ancien libellé : il ne se réexporte qu'à la publication sur
Play, avec son badge (`docs/communication/le-fil-de-ramille/README.md`), et le libellé du bouton suivra ce jour-là
(§7).

## 4. Le mouvement

**Une exception écrite à « un enchaînement tient sous 300 ms »** (le skill `mouvement`), autorisée par la personne
qui pilote (« Tu as aussi le droit d'intégrer directement le motion design sur le site web ») et bornée : **seules
les trois figures, le trait des trois temps et la scène de l'été bougent, et leur mouvement dit ce qui se passe** —
la chaleur arrive sur la scène (le soleil grandit, l'air tremble, elle s'évente, il s'éponge, la sueur perle, une
goutte tombe : 3,1 s en tout, sous les cinq secondes de WCAG 2.2.2 au-delà desquelles il faudrait un bouton
d'arrêt, `finDuMouvement`, testée), la bande se remplit dans
l'ordre de l'été (`Mouvement.recit`, 1,2 s en tout), le trait de l'échelle descend d'un repère à l'autre et la barre
se remplit poste par poste (`Mouvement.trace`, 600 ms), les trois temps de Ramille se relient. **Le texte ne bouge
pas**, les trois faits de l'été compris.

**La scène est la seule à ne pas passer par reanimated** : un dessin SVG du navigateur et ses images clés en CSS
(`scene-de-l-ete.web.tsx`), comme le film est une balise `<video>` — la page n'existe que sur le web, et un dessin de
cette finesse en vues React Native coûterait plus qu'il ne rapporte. Elle suit les mêmes règles par le même chemin :
son état vient d'`etatDuRecit`, décidé au rendu, et la feuille de style ne fait que le lire ; chaque animation finit
sur l'image posée, comparée image par image à la scène posée le 31/10/2026 (aucun écart visible, quelques pixels
d'anticrénelage).

Les règles qui tiennent : **une fois, quand la figure paraît** — l'observateur est posé sur la figure, pas sur son
titre, et il attend qu'un tiers en soit à l'écran (`useVuUneFois`, `intersectionRatio`) —, et non au chargement, où
elle se jouerait hors de l'écran ; **posé dès la première image sous « réduire les animations »** (`styleDuRecit`,
décidé au rendu par `etatDuRecit`, testée) ; jamais un compteur qui défile ; rien ne retient le focus ; rien ne boucle. La
barre d'appel entre comme la barre d'onglets et s'en va d'un coup. Les jetons sont dans `theme.ts` et recopiés dans
`docs/design/design-system/tokens/mouvement.css` (`FRONT-MOUVEMENT.md` §2.12).

**Les films ne sont pas refaits.** Le motion design est dans la page — il se joue sans qu'on lance rien, il se lit
au lecteur d'écran, il ne pèse que quelques kilo-octets et il se mesure. Le film reste plus bas, pour qui veut voir
l'app. Refaire un film qui ouvre sur l'été 2026 reste possible (`docs/communication/le-fil-de-ramille/`, une
fonction du temps) : une décision à part.

## 5. La mesure

**Le trou** : depuis le 23/10/2026, la page d'accueil n'ouvre pas de session, et `usage_events` n'en accepte que
d'une session — une visite qui s'arrêtait à la page ne se mesurait pas, et l'entonnoir du web commençait au bouton
(`MESURE.md` §2). Refaire une page pour convertir sans savoir combien la lisent, ni jusqu'où, ni quel bouton sert,
c'était la refaire à l'aveugle.

**Un compteur par jour, sans rien qui désigne personne** (`20261031143323_les_visites_de_l_accueil.sql`) : la table
`visites_de_l_accueil` porte un jour (heure de Paris), un événement et un nombre — ni identifiant, ni adresse IP, ni
appareil, ni heure, ni cookie. Une fonction, `compter_sur_l_accueil`, ouverte à `anon` — et à `authenticated`, pour qui revient avec une session sans bilan —, ajoute un. Ce n'est ni un
outil tiers ni une donnée personnelle ; la page de confidentialité le dit depuis le 31/10/2026, et le registre
(fiche 5) aussi. **Choisi plutôt qu'un outil d'audience** (Vercel Web Analytics, ou un tiers) : un tiers rendait
fausses trois phrases publiques (« aucun outil de mesure d'audience tierce ») et rouvrait l'analyse d'impact
(`registre-des-traitements.md` §8). **En échange**, quiconque a la clé publishable peut gonfler un compteur : la
table reste bornée, et rien d'autre ne s'en trouve faussé.

**Appliquée en production le 31/10/2026, avant la fusion** — sans quoi la page déployée aurait appelé une fonction
absente, en silence (le compteur avale ses erreurs). Le fichier, écrit sous `20261031120000`, a pris la version
enregistrée ; relue après application : privilèges conformes, empreinte de la fonction égale à la stack locale,
alertes de la base attendues (registre d'exploitation, journal des migrations et §8.7).

**Ce qui se compte** (`EVENEMENTS_DE_L_ACCUEIL`, `src/types/analytics.ts`, miroir du `check`) : `vue` — la page s'est
affichée ; `lu_ete`, `lu_echelle`, `lu_trajets`, `lu_agir`, `lu_comment`, `lu_fin` — la section a paru à l'écran,
une fois par affichage ; `clic_haut`, `clic_agir`, `clic_fin`, `clic_collant` — un bouton vers l'onboarding, par
emplacement ; `film_lance`. « J'ai déjà un compte » ne se compte pas ici : `retrouver_view` le compte déjà, avec sa
porte `accueil` (`MESURE.md` §1 : on n'instrumente jamais ce que le schéma enregistre déjà).

**Comment la lire** : `analytics.accueil_par_jour` (registre d'exploitation §8.5 quinquies). Le **taux de clic** est
`clics / vues` ; la **profondeur de lecture**, `lu_* / vues`, section par section ; l'emplacement qui convertit,
`clic_*`. La suite de l'entonnoir est dans `usage_events`, à partir de `onboarding_step_view` `contexte`. Ce ne sont
pas des visites suivies : une visite qui touche deux boutons compte deux clics, et un rechargement compte une vue de
plus.

## 6. Ce qui ne change pas

- **Ce que fait Ramille reste la fiche Play, mot pour mot** : la description courte, le premier paragraphe, les trois
  temps, les garanties et les limites, que `accueil.test.ts` compare à `docs/exploitation/fiche-google-play.md` §2.1.
  Le récit, lui, est écrit pour la page, et ses chiffres viennent de `climat.ts` et de `carbon-reference.ts`.
- **La lire n'ouvre pas de session** ; chaque bouton l'ouvre au geste (`allerVers`), puis mène à la deuxième page de
  l'onboarding ; un refus du captcha garde son écran.
- **Le film** ne se lance jamais seul ; **le pied** porte de vrais liens ; **la page n'existe que sur le web**.

## 7. Ce qui reste ouvert

- **Le HTML exporté reste l'écran de lancement** (`v1-35` §4) : un robot qui n'exécute pas de JavaScript ne lit que
  le titre et la description de la page, que `page-titles.ts` réécrit le 31/10/2026 dans le sens du récit.
- **La fiche Play garde sa description** : elle présente l'app à qui l'a déjà trouvée. La reprendre dans le sens du
  récit est une décision de la personne qui pilote, à prendre avant la publication.
- **Aucun essai A/B** : au volume d'avant le lancement, il ne départagerait rien. La table porte de quoi l'ajouter
  (un événement de plus par variante) le jour où le trafic le permet.
- **La page n'a été vue que filmée** : une recette web l'attend, sur un téléphone et sur un ordinateur
  (`v1-13` §11.W.14). Le relevé image par image du mouvement (`TESTING-GARDES.md` §2.14) ne la couvre pas encore ;
  la décision de l'état de chaque figure est testée (`etatDuRecit`), le dessin, non.
- **Le film finit sur « Découvrir mon impact »** : le libellé suivra à sa réexportation, à la publication sur Play.
- **Ce qui compte une section, l'observateur, ne se compte pas lui-même** : un navigateur sans
  `IntersectionObserver` compte toutes les sections d'emblée (registre d'exploitation §8.5 quinquies).
