# Le fil de Ramille — le film de présentation

**Statut** : validé par la personne qui pilote le 03/10/2026, **repris le 23/10/2026** pour le jour de
sa diffusion — l'écran du plan et l'étape des loisirs suivent de nouveau l'app (« Ce que le film a
repris de l'app le 23/10/2026 », plus bas) —, et **destiné à la page d'accueil du site web**, décidé le
22/10/2026 (« Décidé le 23/10/2026 », en fin de document). **Pas encore diffusé** : la page d'accueil se
construit dans l'app (étape 5 de `docs/architecture/v1-35-l-audit-en-chantiers.md`), et le badge de
Google Play viendra à la publication. Ce qui a été décidé, et ce qu'il reste à faire, est en fin de
document. Le 4:5, les chiffres recalculés et les trois jours du covoiturage, venus après le 03/10/2026,
ont été validés le même jour.

## Ce que c'est

Un motion design d'une minute vingt-six, en musique, pour faire comprendre Ramille et donner
envie de faire son bilan, en trois formats tirés de la même source : **16:9** (la fiche Google
Play), **9:16** (les Stories, Reels, Shorts et TikTok) et **4:5** (les fils d'Instagram, de Facebook
et de LinkedIn). Le 4:5 a été ajouté le 03/10/2026, sur une question de la personne qui pilote : posté
dans un fil, le 9:16 y est recadré au centre et ses titres sortent du cadre, et le 16:9 y reste
petit. **Depuis le 23/10/2026, le 16:9 et le 4:5 ont aussi une version pour le web**, plus légère,
versionnée dans `public/film/` : la page d'accueil du site les sert (« Les fichiers », plus bas).

**L'idée tient en un trait.** Le logo le dit déjà : la nervure de la feuille est un itinéraire
tracé jusqu'à un point d'arrivée (commentaire de `assets/images/logo-mark.svg`). Le film prend ce
trait au mot : il dessine un trajet, se tend pour devenir l'empreinte moyenne en France, se
replie en nervure, la feuille se dessine autour et devient Ramille ; il revient pour traverser
les saisons, et finit en un point d'arrivée qui s'étire et devient le bouton « Découvrir mon
impact ».

| Temps | Chapitre | Ce qu'il dit | La musique |
|---|---|---|---|
| 0:00 | Tes trajets | Chaque jour, tu te déplaces. Lequel pèse le plus ? | Nappe et marimba ; une cloche par station |
| 0:08 | Ce qu'ils pèsent | Le transport, premier poste de l'empreinte : 2,8 t CO₂e (SDES, 2017) | La basse entre |
| 0:18 | Ramille | Le logo, puis le visage ; « Comprendre tes trajets, sans te juger. » | Un souffle monte ; le rythme entre avec le visage (0:24) |
| 0:28 | Ton bilan | Quatre des neuf étapes, le calcul, la restitution | Le rythme ; la mélodie alterne deux motifs de quatre mesures |
| 0:40 | Ton plan | Deux pistes en tête, on en choisit une, trois jours, « C'est noté » : elle passe en tête | Une cloche à l'engagement |
| 0:50 | Le point | La notification du lundi, un « Oui » puis un « Non » ; pas de score, pas de série, aucun classement | Une cloche par réponse ; sans batterie sous le manifeste (1:02), une cloche par ligne |
| 1:09 | Au fil des saisons | La mascotte porte les quatre saisons, sur un an | Le rythme revient ; une cloche par saison |
| 1:16 | À toi | ramille.fr · Pas de compte à créer pour commencer | Un accent sur le bouton (1:19), l'accord final |

**Le rythme a été repris le 03/10/2026**, sur deux retours de la personne qui pilote. Le premier :
la version de 51 secondes ne laissait pas le temps de lire — le manifeste passait en moins de deux
secondes —, avait des à-coups, et n'avait pas de son. Le second : la musique sautait — c'était la
page, qui recalait le son dès qu'il prenait du retard, donc à peu près chaque seconde ; c'est
désormais le son qui donne l'horloge, et l'image qui le suit —, et la fin du 9:16 était trop serrée.
La contre-lecture de cette reprise a encore allongé le point de deux mesures : **chaque texte de la
scène et chaque réplique de Ramille restent posés au moins deux secondes et demie**, mesurés par
`verifier.mjs` ; l'aplat du manifeste tient près de sept secondes, ses quatre lignes ensemble près
de trois. Tout s'enchaîne en fondu, rien ne rebondit, et seule Ramille respire, du souffle qu'elle a
dans l'app. Chaque point de synchronisation tombe sur une double croche de la musique, et le visage,
le bouton et la fin sur une barre de mesure (2,4 s).

Le scénario plan par plan, avec ce qu'on voit et ce qui est écrit, est rendu sous le film par la
page elle-même : c'est aussi sa version texte.

## Les fichiers

- **`film.html`** — la source unique. C'est la page publiée en artefact, donc un fragment sans
  `<html>` ni `<head>` : le service d'artefacts l'enveloppe, et **le MP3 se publie à côté d'elle**
  (le champ `files` de la publication) — sans lui, la page affiche « Son indisponible ». Le film est
  une **fonction pure du temps** (`rendre(t)`), sans bibliothèque : la lecture, la frise, les
  chapitres et l'export ne font que choisir un instant, et `verifier.mjs` vérifie que l'ordre des
  sauts n'y change rien. Ce qu'il mesure de sa propre mise en page, il le mesure dans un état de
  référence, jamais au premier passage.
  **Il se compose à taille fixe** (1600 × 900 px, 900 × 1600, ou 900 × 1125 pour le 4:5) et se met
  à l'échelle d'un bloc : le 16:9 débordait à la taille d'un lecteur, parce qu'il se recomposait à
  chaque taille et qu'à très petite taille sa mise en page ne suivait plus la proportion. Ses **points de
  synchronisation** sont dans son bloc JSON `temps-du-film`, que la musique lit aussi. Ce qui
  s'accroche à l'un d'eux en dérive, jusqu'au doigt qui donne une réponse — le commentaire de la
  table `T` dit quoi ; le reste se compte en absolu, chapitre par chapitre.
- **`musique.py`** et **`musique.mp3`** — la musique, originale : le script la compose et la rend
  (`pip install numpy scipy`, et `ffmpeg`), le MP3 est ce que la page joue. Elle est déterministe,
  donc le même script rend le même fichier, et elle n'emprunte rien à personne. **Sa forme se
  déduit du bloc JSON** — l'entrée du rythme, la respiration du manifeste, la reprise et la fin —,
  et le script refuse de se rendre si une coupe quitte la grille. Ses niveaux ont été
  réglés à la mesure — part d'aigus et niveau de chaque piste, attaque à chaque rendez-vous — faute
  de pouvoir l'écouter dans l'environnement où elle a été écrite. **Jugée à l'oreille le 03/10/2026
  par la personne qui pilote : elle convient.** Elle se remplacerait sans toucher au film.
- **`exporter.mjs`** — l'export vidéo, image par image et en musique (Playwright, déjà dans les
  dépendances de développement, et `ffmpeg`). Ses MP4 s'écrivent dans le dossier temporaire du
  système, jamais dans le dépôt : ils se régénèrent après toute retouche, en quelques minutes
  par format (CRF 18 : 6,4 Mo en 16:9, 6,1 Mo en 4:5). **Ce sont les masters** : les versions du web, versionnées
  elles, en sont tirées (`public/film/`, ci-dessous). Spline Sans y est servie par les fichiers du kit, et l'export refuse de partir
  si l'une des quatre graisses manque ; la chasse fixe, absente du dépôt, prend celle du système sur
  les trois lignes qui l'emploient.
- **`public/film/`** (hors de ce dossier) — **les versions du web, versionnées**, parce que le site les
  sert : la page d'accueil de ramille.fr (décision du 22/10/2026). Quatre fichiers, 7,2 Mo en tout :
  `le-fil-de-ramille-16x9.mp4` (1920 × 1080, 3,6 Mo) et `le-fil-de-ramille-4x5.mp4` (1080 × 1350,
  3,4 Mo), chacun avec son **affiche** `.jpg` de 72 et de 78 Ko, tirée du film à **27,2 s** — le chapitre
  « Ramille », une fois les mots posés : la mascotte qui sourit, son nom, sa réplique et « Comprendre tes
  trajets, sans te juger. », sans aucun chiffre à côté d'elle (`FRONT-MASCOTTE.md` §2.3), et lisible
  sans le film. Chaque vidéo est du H.264 High 4.1 en `yuv420p`, `faststart`, de 87,4 s à 30 i/s, avec
  la musique en AAC à 96 kbit/s ; elles sont **sous les 4 Mo**. **Pleine définition plutôt que 1280 × 720
  et 864 × 1080** : à CRF 24 les deux tiennent déjà sous 4 Mo, et la plus petite ligne du film, la source
  en chasse fixe à 18 px en 1080p, y reste aussi nette que sur le master (SSIM de 0,9994 et de 0,9992) ;
  à 720p elle est molle. Ces fichiers **ne s'éditent pas, ils se régénèrent**, de leurs masters (les
  exports de `exporter.mjs`, que `os.tmpdir()` désigne : `/tmp` sous Linux), avec `ffmpeg`, après toute
  retouche du film — **rien dans la CI ne compare ces MP4 à `film.html`** :

  ```bash
  node docs/communication/le-fil-de-ramille/exporter.mjs paysage       # → /tmp/le-fil-de-ramille-16x9.mp4
  node docs/communication/le-fil-de-ramille/exporter.mjs quatre-cinq   # → /tmp/le-fil-de-ramille-4x5.mp4
  # Puis, pour chaque format F (16x9, 4x5) : la vidéo, et son affiche à 27,2 s.
  ffmpeg -y -i /tmp/le-fil-de-ramille-F.mp4 -c:v libx264 -preset slow -crf 24 -profile:v high -level 4.1 \
    -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart \
    -fflags +bitexact -flags:v +bitexact -flags:a +bitexact -map_metadata -1 public/film/le-fil-de-ramille-F.mp4
  ffmpeg -y -ss 27.2 -i /tmp/le-fil-de-ramille-F.mp4 -frames:v 1 -q:v 2 -fflags +bitexact public/film/le-fil-de-ramille-F.jpg
  ```

  Les options `bitexact` rendent la commande déterministe : rejouée sur le même master, avec le même
  `ffmpeg` (6.1.1 le 23/10/2026), elle rend les mêmes octets — vérifié sur les deux vidéos. Les essais du
  23/10/2026, en bref — 16:9 : 1080p CRF 22 4,04 Mo, **24 3,61 Mo**, 26 3,26 Mo, 30 2,75 Mo, 720p CRF 22 2,96 Mo, 26 2,46 Mo, 28 2,28 Mo ;
  4:5 : 1080 × 1350 CRF 22 3,82 Mo, **24 3,42 Mo**, 26 3,09 Mo, 30 2,60 Mo, 864 × 1080 CRF 22 3,23 Mo,
  26 2,64 Mo, 28 2,42 Mo. Le CRF 22 aurait tenu sous 5 Mo ; le 24 garde 1,4 Mo de marge pour une page
  d'accueil, sans que le texte le plus petit s'en ressente.
- **`verifier.mjs`** — chaque quart de seconde, dans les trois formats, à la taille de l'export et
  à trois tailles de lecteur : rien ne déborde ni ne se chevauche, aucune étiquette ne touche le
  trait, le cadre ne coupe ni un appui ni ce que le téléphone doit montrer, et le doigt tombe sur sa
  cible. À l'export, en plus : le temps de lire chaque texte de la scène, chaque réplique de Ramille
  et la notification ; le doigt immobile pendant un appui ; la pureté de l'image (un aller-retour
  de format, puis une passe dans le désordre). À relancer après toute retouche du film ; chaque
  contrôle, hors le relais des erreurs de la page, a été éprouvé en cassant ce qu'il garde, et
  l'en-tête dit comment.
- **`profil-d-exemple.sql`** — le profil d'exemple passé par le vrai calcul, sur la stack locale et
  dans une transaction annulée : il rend les chiffres que le film recopie. À rejouer quand le calcul
  ou le référentiel des facteurs change, avant tout export destiné à être diffusé.
- **`lecture.mjs`** — le film joué pour de vrai, en musique, ce qu'aucune image rendue à un instant
  ne voit : le son ne saute pas et avance, tel quel comme avec une latence simulée ; l'image le
  suit, même quand il va 3 % plus vite qu'elle ; la lecture tient 60 images par seconde sur la
  machine qui la joue ; le bouton du son coupe et relance ; « réduire les animations » ouvre les
  chapitres posés. C'est la garde du « son qui saute » entendu le 03/10/2026 : remettre l'ancienne
  boucle de lecture la fait tomber, 47 sauts en 15 s avec la latence simulée. Chacun de ses
  contrôles a été éprouvé en cassant ce qu'il garde, et l'en-tête dit comment.

## Ce que le film reprend de l'app, et d'où

Rien n'y est inventé : quand l'app change, le film doit suivre, et **aucune garde ne vérifie ses
textes** (`verifier.mjs` voit la mise en page et le temps, pas ce qui est écrit) — c'est à relire
avant chaque diffusion. Il **suit l'app au 23/10/2026** (fin de cette section) ; il ne montre pas, en
revanche, les lignes d'aide que l'app pose sous certains titres (« Sport, sorties, visites à la
famille. », « Un aller-retour compte pour deux vols. »), ce qu'il ne faisait pas non plus le 03/10/2026.

- **Les répliques de Ramille** sont recopiées mot pour mot de `RAMILLE`
  (`src/constants/mascotte.ts`) : `presentation`, `calcul`, `checkinOui`, `checkinNon`,
  `planEtSuivi`. Elle ne dit jamais un nombre et ne se tient jamais près d'un chiffre lourd
  (`FRONT-MASCOTTE.md` §2.3) : elle ne se pose sur aucune carte qui porte un chiffre, et la carte
  du point passe sous le titre du plan, en tête, comme dans `plan/index.tsx`.
- **Les textes d'écran** sont ceux de l'app : l'accroche et « Pas de compte à créer pour
  commencer. » (`src/components/onboarding/etape-accroche.tsx`), « Tes réponses restent privées »
  (`src/components/onboarding/etape-reassurance.tsx`), les questions du questionnaire (dont
  `src/components/bilan/steps/commute-has-trip.tsx`), les réponses des loisirs
  (`REPONSES_FREQUENCE_DES_LOISIRS`, `src/types/bilan.ts`), l'en-tête « Étape N sur M »
  (`src/components/bilan/progress-header.tsx`), les libellés de « Où tu te situes »
  (`suivi/bilan.tsx`), les gabarits d'actions et la question du point qui nomme les jours choisis
  (`supabase/migrations/20260912190000_point_connait_laction.sql`), la ligne du gain
  (`ligneDuGain`, `src/types/plan.ts`), l'en-tête « Semaine du » et le libellé de la troisième
  réponse (`libelleSansObjet`, `src/types/checkin.ts`).
- **Ce que l'écran fait, il le fait comme l'app** : deux pistes en avant et le lien vers les autres
  (`ACTIONS_EN_AVANT`), l'action engagée qui remonte en tête, les sept jours à initiale, « Oui » et
  « Non » au même poids (`src/components/checkin-card.tsx`), l'en-tête qui ne sourit qu'à la
  dernière étape — le film n'en montre que quatre sur neuf, donc il ne sourit pas.
- **La mascotte** est dessinée par un portage de `mascotFaceGeometry` et `mascotSeasonGeometry`
  (`src/types/mascot.ts`), compensation optique comprise, aux tailles de l'app : 28 dp dans
  l'en-tête, 72 au calcul, 40 dans une réplique. Son souffle reprend `src/components/mascot.tsx` ;
  ses expressions et ses saisons passent de l'une à l'autre en fondu.
- **Le mouvement** prend à `.claude/skills/mouvement/SKILL.md` ce qui vaut pour un film : la
  sortie douce pour ce qui entre et ce qui sort, une sortie plus rapide qu'une entrée, rien qui
  rebondisse. Ses durées, elles, sont celles d'un film et non d'une interface. L'à-coup de l'écran
  de lancement n'y est plus : il se lisait comme une saccade. **Aucun chiffre ne défile** (les
  barres arrivent à leur longueur juste), aucune célébration. Sous « réduire les animations », rien
  ne se lance seul : les chapitres s'ouvrent posés, le film et sa musique ne jouent que sur demande,
  et le son se coupe d'un bouton.
- **Les chiffres de référence** viennent de `src/constants/carbon-reference.ts`, avec leur source
  à l'écran : la moyenne française et sa répartition en cinq postes (SDES, 2017), et le repère
  transport 2050, qui est une **dérivation** de la cible de 2 t de l'ADEME — d'où le mot
  « transport » dans son libellé. **Le bilan, le palier et les gains du plan sont ceux d'un profil
  d'exemple**, et l'image le dit (« Écrans de l'app · profil d'exemple ») — mais **ce sont les
  chiffres que l'app rend pour ce profil** : `profil-d-exemple.sql` le passe par le vrai calcul, sur
  la stack locale, et imprime tout ce que le film recopie — le bilan, le palier, la largeur de
  chaque barre, les pistes dans l'ordre du plan et leurs gains. Leur forme est celle des écrans :
  `formatTonnes`, `formatTonnesShort`, `ligneDuGain`. **Quand le calcul change, on le rejoue, et le
  film suit** ; les chiffres du 23/10/2026 sont à la dernière puce de cette section.
- **Ce que le film a repris de l'app le 23/10/2026** (ancienne section « Ce qui ne suit plus l'app »,
  écrite le 03/10/2026 après la contre-lecture, et le 22/10/2026 pour les loisirs). Le jour de la
  diffusion est arrivé avec la décision de le mettre sur la page d'accueil du web (décision n° 9 : on
  n'alignait pas avant). Comparé à `src/components/plan/action-commitment.tsx`, `action-card.tsx`,
  `carte-de-piste.tsx`, `src/components/button.tsx`, `src/components/bilan/chip.tsx`,
  `groupe-de-choix.tsx` et `text-link.tsx` — **l'app fait foi** : elle avait encore changé depuis la
  liste du 03/10/2026 (la carte de l'action engagée, l'estompage, le lien « Voir toutes les pistes »,
  la hauteur du point), et le film en a suivi plus que cette liste.
  - **L'écran du plan.**
    - **Le choix des jours** remplace « Je m'y engage » (le bouton se replie pendant que l'encart se
      déplie), dans un encart gris : « Quels jours ? » en petit, les jours sur **quatre colonnes** (L M M J
      / V S D), chacun avec sa **case** de 18 et une seule graisse, cochés en vert plein, sur fond blanc
      quand ils ne le sont pas ; « Annuler » à côté de « C'est noté », **en attente** — blanc, à filet,
      encre tertiaire — tant qu'aucun jour n'est choisi, puis vert plein dès le lundi coché.
    - **« Je m'y engage » et « Choisir celle-ci à la place »** sont des boutons secondaires pleine
      largeur (54 dp, fond gris, texte noir en 500) ; « Oui » et « Non » du point, qui sont le même
      composant posé sur une carte teintée, prennent les mêmes mesures (ils étaient à 46, en 600).
    - **La carte d'une piste** : le titre en 17/24, le gain **seul** sur sa ligne en 20/26 (« − 412 kg
      CO₂e »), « par an · 20 % de ton empreinte » dessous en encre secondaire, puis le détail « Sur tes
      5 trajets par semaine. » ; 20 de marge, 10 entre deux cartes, 24 de marge d'écran.
    - **La carte engagée** : la coche et « TON ENGAGEMENT » en tête, **« PREMIER PAS · Demande autour de
      toi qui fait le même trajet, avant de choisir un jour. »** dans un creux blanc, et **les liens
      « Modifier les jours » et « Changer d'avis »** à la place du bouton ; la carte de l'autre piste
      garde son cadre estompé et « Choisir celle-ci à la place ».
    - **Le lien « Voir toutes les pistes · 9 »** est un lien d'action : accent, 600, centré, sans
      soulignement au repos. Il était souligné et à gauche.
    - **Le point** : la carte prend 18 de marge et 10 entre ses éléments, la question 16/23, les deux
      liens (« Pas de trajet la semaine dernière », « Modifier ma réponse ») sont **soulignés en encre
      tertiaire** et non en vert — le premier centré, le second à gauche —, et la réplique de Ramille est
      en encre secondaire. La carte **suit la hauteur de ce qu'elle montre** (`HauteurSuivie`) : elle
      se resserre sur la réplique, puis reprend celle de la question.
    - **Le plan défile deux fois.** Une première pour que « Je m'y engage » arrive sous le doigt — la
      carte d'une piste est plus haute que ce que le film simplifiait, et le téléphone du 16:9 est coupé
      par le bas : c'est propre au film —, puis, comme l'app (`onOuvert`), le temps du choix pour que
      « C'est noté » finisse dans le cadre. Les appuis du doigt se sont recalés d'eux-mêmes (ils lisent la
      cible là où elle est rendue), et `verifier.mjs` le confirme.
    - **Le nombre du lien est 9 et non 10**, et c'est le calcul qui a changé, pas le film : depuis la
      migration du 19/10/2026, « Remplacer un aller-retour en avion par le train » ne se propose qu'à
      qui a déclaré deux vols, et le profil d'exemple en déclare un. `profil-d-exemple.sql` imprime
      désormais ce nombre (`nombre_de_pistes`).
  - **L'étape des loisirs** (étape 3 de `docs/architecture/v1-35-l-audit-en-chantiers.md`) : la question
    « À quelle fréquence fais-tu des trajets pour tes loisirs, le week-end comme en semaine ? »
    (`src/components/bilan/steps/leisure-frequency.tsx`), les **cinq** réponses de
    `REPONSES_FREQUENCE_DES_LOISIRS` (la dernière, « Presque tous les jours »), et le poste qui s'appelle
    **« Loisirs »** — en tête de section et dans la répartition de la restitution. Le titre tient sur
    **quatre lignes** dans les trois formats (trois avant) et la cinquième rangée allonge l'étape ; le
    téléphone ne déborde pas, `verifier.mjs` le confirme. **« week-end » reste d'un bloc** dans le film
    (`white-space: nowrap`) : le film compose ses titres de question à 22 dp (`TypeScale.question`) là où
    l'app pose `screenTitle`, 26/32 (`TitreDEtape`) — un écart d'avant le 03/10/2026, qui n'est pas repris
    ici —, et à 22 dp la ligne coupait « week- » / « end ». L'app, à 26 dp, ne le coupe pas de 320 à 412 de
    large et le coupe à 430 (`v1-27` §12.42). **Gardés tels quels**, parce qu'ils restent vrais et que les
    changer serait un choix de communication : le sous-titre « Chez toi, au travail, le week-end, en
    vacances. » (le scénario sous le film) et l'étiquette « Le week-end » de la frise du début.
  - **Les chiffres n'ont pas bougé** : `profil-d-exemple.sql` rejoué le 23/10/2026 rend le bilan 2 089 kg
    (2,1 t), le domicile-travail 1 280 kg (1,3 t), les loisirs 333 kg, les voyages 476 kg, le palier
    1 833 kg (1,8 t), les barres de 61,28 / 15,93 / 22,79 % et de 63,43 / 55,65 / 85 / 18,21 %, les deux
    pistes à − 412 kg (20 %) et − 320 kg (15 %), « Sur tes 5 trajets par semaine. » pour toutes les deux.
    La réponse de loisirs du profil, « Une fois par semaine » (`weekly`), est toujours admise.

## Décidé le 03/10/2026

La personne qui pilote a validé le film, retenu les trois recommandations de la proposition, jugé
la musique et gardé le profil d'exemple :
« Toutes tes recos sont OK, la musique me va, on peut garder le profil d'exemple utilisé. Et à
date, on maintient pas de score, pas de série, pas de classement. »

1. **Où il sert.** Le 16:9 en vidéo de la fiche Google Play, le 9:16 pour les Stories, Reels,
   Shorts et TikTok, et un **4:5** (1080 × 1350) pour les fils d'Instagram, de Facebook et de
   LinkedIn — décidé et composé le même jour. **Pas dans l'app pour l'instant** :
   l'onboarding dit déjà tout cela en quatre écrans, et une étape de plus coûte plus en abandon
   qu'elle ne rapporte en clarté (commentaire de `src/components/onboarding/etape-transition.tsx`).
   **Pas sur ramille.fr non plus, pour l'instant** (décidé le même jour, sur une seconde question) :
   la recommandation le portait sans voir que ramille.fr *est* l'app, dont le premier écran est
   l'onboarding. Y mettre le film, ce serait soit une étape de plus — ce qu'on vient d'écarter —,
   soit un emplacement à créer ; et l'intégrer depuis YouTube demanderait d'ouvrir la politique de
   sécurité du site (`frame-src`, `vercel.json`) et une ligne dans la page de confidentialité, quand
   un MP4 servi par le site serait un poids de plus à mesurer (`VERCEL.md`). C'est ce qu'il faudra
   rouvrir si la question revient. **Rouverte le 22/10/2026** : le film va sur la page d'accueil du
   site web (« Décidé le 23/10/2026 », plus bas) ; les deux paragraphes qui précèdent disent ce que la
   décision du 03/10/2026 écartait, et pourquoi.
2. **Quand.** À la publication sur Google Play, **avec le badge du store en fin de film** : le film
   montre l'app Android (la notification du lundi), alors que sa fin renvoie aujourd'hui à
   ramille.fr seul. Diffusé avant, il ferait une promesse que la personne qui suit l'appel ne
   verrait pas tenue. Ce geste est une ligne de la checklist de publication
   (`docs/exploitation/README.md` §4), pour qu'il ne s'oublie pas. « Gratuit » n'est écrit nulle
   part, faute de l'avoir décidé.
3. **« Pas de score. Pas de série. Aucun classement. » est maintenu** — et devient une promesse
   publique. « Aucun classement » est un non-goal ferme ; celui des mécaniques de jeu a été
   **révisé, pas supprimé**, et une progression non comparative y redevient envisageable
   (`docs/architecture/v1-06-partage-social.md` §1). **Le jour où ce chantier s'ouvre, le film se
   retouche avec lui** ; `docs/architecture/produit.md` §5 le rappelle à qui l'ouvrira.
4. **La musique** convient telle quelle. Elle se retouche dans `musique.py` (tempo, instruments,
   niveaux), sur la grille que le script vérifie ; une piste sous licence ne se verserait pas dans
   un dépôt public sans vérifier qu'elle le permet.
5. **Le profil d'exemple est gardé, et ses chiffres sont ceux de l'estimateur** (décidé le même
   jour, sur une seconde question) : la fiche Play pose qu'« aucune capture ne doit montrer un
   chiffre inventé » (`docs/exploitation/fiche-google-play.md` §2.3), et c'est là que va le 16:9.
   Le profil est resté le même — les réponses que le film montre, les autres choisies pour un
   périurbain qui va au travail en voiture —, et ses chiffres sont devenus ceux que l'app rend :
   **fait le 03/10/2026** par `profil-d-exemple.sql` (la proposition montrait 1,9 t, 1,7 t, 430 et
   300 kg, écrits à la main ; le calcul rend 2,1 t, 1,8 t, 412 et 320 kg).

6. **Le 4:5 convient** (regardé le même jour, après sa composition).
7. **Trois jours pour le covoiturage, le lundi, le mercredi et le vendredi** (même jour, sur une
   question de la contre-lecture). L'action mise en avant dit « au moins un jour sur deux », et le
   film en choisissait deux sur cinq : un spectateur attentif y lisait une contradiction, dans un
   film qui veut montrer une app précise. La question du point se lit désormais comme l'app la
   compose (`jours_francais`) : « Lundi ou mercredi ou vendredi, as-tu fait ce trajet à deux ? ». Les
   chiffres ne bougent pas : le gain est celui de l'action, pas des jours choisis. Écartée : un profil
   à quatre jours par semaine, où deux jours auraient fait un sur deux — le covoiturage y sort des
   deux pistes mises en avant, et l'histoire du film ne serait plus celle de l'app.

8. **En 16:9, « Pas de compte à créer pour commencer » descend** (même jour) : la note collait au
   bouton ; elle prend l'écart qui sépare l'accroche du bouton.
9. **L'écran du plan s'aligne sur l'app le jour de la diffusion, pas avant** (même jour, sur la
   contre-lecture qui a relevé ses écarts) : l'app changeait encore ce composant ces jours-là, et le
   film se réexporte de toute façon ce jour-là pour le badge. Les vidéos du 03/10/2026 gardent donc
   l'écran simplifié ; elles ne se diffusent pas. Écarté : aligner tout de suite, au risque de le
   refaire au prochain changement de l'app. **Fait le 23/10/2026**, le jour où le film a reçu sa
   place sur la page d'accueil (« Ce que le film a repris de l'app le 23/10/2026 »).

**Les MP4 de `exporter.mjs` ne sont pas versionnés** : il les rend depuis la source, en quelques
minutes par format, dans le dossier temporaire du système — c'est l'export du jour de la
diffusion, badge compris, qui comptera. **Seules les deux versions du web le sont**, dans
`public/film/` : plus légères, elles sont servies par le site, donc elles voyagent avec lui (« Les
fichiers », plus haut).

## Décidé le 23/10/2026

La personne qui pilote a placé le film sur la page d'accueil du site web (22/10/2026), puis, le
23/10/2026, tranché deux points et confirmé un troisième. Les quatre se lisent ici, en phrases
simples.

1. **Le film va sur la page d'accueil de ramille.fr** (décision du 22/10/2026, qui **rouvre la
   décision n° 1** du 03/10/2026). La page d'accueil est la racine du site web, et **seulement du web** :
   le film n'entre pas dans l'app (la décision n° 1 reste vraie sur ce point), qui garde son
   onboarding. C'est l'étape 5 de `docs/architecture/v1-35-l-audit-en-chantiers.md`. Il s'y sert depuis
   le site même, en MP4 (16:9 et 4:5, `public/film/`, avec leur affiche), et non depuis YouTube : la
   politique de sécurité du site (`frame-src`) n'a pas à s'ouvrir. Les fichiers alourdissent le
   déploiement statique (7,2 Mo pour les quatre), pas les fonctions que `VERCEL.md` §1.2 mesure, et ne
   se téléchargent qu'à la demande (`preload="none"`, l'affiche seule sinon).
2. **Sous le film, la page dit : « Sur Android, Ramille te fait signe par notification ; sur le web,
   par email. »** (décision du 23/10/2026 ; « email » s'écrit comme la ligne du canal, « Par email »). Le film montre la notification Android du lundi, et sur le
   web le rappel n'arrive que par e-mail, avec un compte (étape 4 de `v1-35`, livrée le 23/10/2026) : sans
   cette phrase, quelqu'un qui regarde le film sur le web attendrait une notification qui ne viendra
   pas. Le film, lui, ne change pas : il montre l'app Android.
3. **« Pas de série » est gardé, à côté de la phrase « Deuxième semaine de suite que tu fais ce trajet
   autrement. » de l'app** (décision du 23/10/2026). Cette phrase (`phraseDeSecondRenforcement`,
   `src/types/checkin.ts`) **ne se dit qu'une fois**, au deuxième « oui » consécutif ; elle **ne
   compte rien** et **ne se perd pas**. Elle n'est donc pas une série au sens du manifeste du film,
   et les deux se tiennent.
   **La question se rouvre à l'étape 6a de `v1-35`** (le progrès visible), qui pourrait compter les
   « oui » : si elle les compte, « Pas de série » cesse d'être vrai, et le film se retouche avec elle
   (rappel déjà écrit en décision n° 3 et en `docs/architecture/produit.md` §5).
4. **Le badge de Google Play viendra à la publication, comme prévu** : la décision n° 2 est inchangée
   pour la fiche Play et les réseaux.
