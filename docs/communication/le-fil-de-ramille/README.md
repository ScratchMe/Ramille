# Le fil de Ramille — le film de présentation

**Statut** : validé par la personne qui pilote le 03/10/2026, **pas encore diffusé** — il attend la
publication sur Google Play. Ce qui a été décidé, et ce qu'il reste à faire ce jour-là, est en fin
de document.

## Ce que c'est

Un motion design d'une minute vingt-six, en musique, pour faire comprendre Ramille et donner
envie de faire son bilan, en deux formats tirés de la même source : **16:9** (un écran, une page
web, une fiche de store) et **9:16** (un téléphone, les réseaux).

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
| 0:40 | Ton plan | Deux pistes en tête, on en choisit une, deux jours, « C'est noté » : elle passe en tête | Une cloche à l'engagement |
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
  **Il se compose à taille fixe** (1600 × 900 px, ou 900 × 1600) et se met à l'échelle d'un bloc :
  le 16:9 débordait à la taille d'un lecteur, parce qu'il se recomposait à chaque taille et qu'à
  très petite taille sa mise en page ne suivait plus la proportion. Ses **points de
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
  dépendances de développement, et `ffmpeg`). Les MP4 s'écrivent dans le dossier temporaire du
  système, jamais dans le dépôt : ils se régénèrent après toute retouche, en un peu plus d'une
  minute par format. Spline Sans y est servie par les fichiers du kit, et l'export refuse de partir
  si l'une des quatre graisses manque ; la chasse fixe, absente du dépôt, prend celle du système sur
  les trois lignes qui l'emploient.
- **`verifier.mjs`** — chaque quart de seconde, dans les deux formats, à la taille de l'export et
  à trois tailles de lecteur : rien ne déborde ni ne se chevauche, aucune étiquette ne touche le
  trait, le cadre ne coupe ni un appui ni ce que le téléphone doit montrer, et le doigt tombe sur sa
  cible. À l'export, en plus : le temps de lire chaque texte de la scène, chaque réplique de Ramille
  et la notification ; le doigt immobile pendant un appui ; la pureté de l'image (un aller-retour
  de format, puis une passe dans le désordre). À relancer après toute retouche du film ; chaque
  contrôle, hors le relais des erreurs de la page, a été éprouvé en cassant ce qu'il garde, et
  l'en-tête dit comment.
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
avant chaque diffusion.

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
  « transport » dans son libellé. **Le bilan (1,9 t), le palier (1,7 t) et les gains du plan (430
  et 300 kg) sont un profil d'exemple**, et l'image le dit (« Écrans de l'app · profil
  d'exemple ») : ils n'ont pas été recalculés par l'estimateur.

## Décidé le 03/10/2026

La personne qui pilote a validé le film, retenu les trois recommandations de la proposition, jugé
la musique et gardé le profil d'exemple :
« Toutes tes recos sont OK, la musique me va, on peut garder le profil d'exemple utilisé. Et à
date, on maintient pas de score, pas de série, pas de classement. »

1. **Où il sert.** Le 16:9 en vidéo de la fiche Google Play, le 9:16 pour les Stories, Reels,
   Shorts et TikTok, et un **4:5** (1080 × 1350) pour les fils d'Instagram, de Facebook et de
   LinkedIn — décidé le même jour, et composé à part. **Pas dans l'app pour l'instant** :
   l'onboarding dit déjà tout cela en quatre écrans, et une étape de plus coûte plus en abandon
   qu'elle ne rapporte en clarté (commentaire de `src/components/onboarding/etape-transition.tsx`).
   **Pas sur ramille.fr non plus, pour l'instant** (décidé le même jour, sur une seconde question) :
   la recommandation le portait sans voir que ramille.fr *est* l'app, dont le premier écran est
   l'onboarding. Y mettre le film, ce serait soit une étape de plus — ce qu'on vient d'écarter —,
   soit un emplacement à créer ; et l'intégrer depuis YouTube demanderait d'ouvrir la politique de
   sécurité du site (`frame-src`, `vercel.json`) et une ligne dans la page de confidentialité, quand
   un MP4 servi par le site serait un poids de plus à mesurer (`VERCEL.md`). C'est ce qu'il faudra
   rouvrir si la question revient.
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
5. **Le profil d'exemple est gardé** (1,9 t, le palier de 1,7 t, 430 et 300 kg) : il n'a pas été
   recalculé par l'estimateur, et l'image le dit (« Écrans de l'app · profil d'exemple »).
   **Ses chiffres seront recalculés par l'estimateur** (décidé le même jour, sur une seconde
   question) : la fiche Play pose qu'« aucune capture ne doit montrer un chiffre inventé »
   (`docs/exploitation/fiche-google-play.md` §2.3), et c'est là que va le 16:9. Le profil reste le
   même — les réponses que le film montre —, ses chiffres deviennent ceux que l'app rendrait. Ce
   recalcul passe avant tout export destiné à être diffusé.

**Les MP4 ne sont pas versionnés** : `exporter.mjs` les rend depuis la source, en un peu plus d'une
minute par format — c'est l'export du jour de la diffusion, badge compris, qui comptera.
