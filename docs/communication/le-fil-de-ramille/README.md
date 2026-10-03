# Le fil de Ramille — le film de présentation

**Statut** : proposition du 03/10/2026, pas encore diffusée. Ce qui reste à décider est en fin de
document et revient à la personne qui pilote : c'est ce qu'on montre du produit.

## Ce que c'est

Un motion design de 51 secondes pour faire comprendre Ramille et donner envie de faire son bilan,
en deux formats tirés de la même source : **16:9** (un écran, une page web, une fiche de store) et
**9:16** (un téléphone, les réseaux).

**L'idée tient en un trait.** Le logo le dit déjà : la nervure de la feuille est un itinéraire
tracé jusqu'à un point d'arrivée (commentaire de `assets/images/logo-mark.svg`). Le film prend ce
trait au mot : il dessine un trajet, se tend pour devenir l'empreinte moyenne d'un Français, se
replie en nervure, la feuille se dessine autour et devient Ramille ; il revient pour traverser
les saisons, et finit en un point d'arrivée qui s'étire et devient le bouton « Découvrir mon
impact ».

| Temps | Chapitre | Ce qu'il dit |
|---|---|---|
| 0:00 | Tes trajets | Chaque jour, tu te déplaces. Lequel pèse le plus ? |
| 0:06 | Ce qu'ils pèsent | Le transport, premier poste de l'empreinte : 2,8 t CO₂e (SDES, 2017) |
| 0:12 | Ramille | Le logo, puis le visage ; « Comprendre tes trajets, sans te juger. » |
| 0:18 | Ton bilan | Quatre vraies questions, le calcul, la restitution |
| 0:26 | Ton plan | Trois pistes, on en choisit une, deux jours, « C'est noté » |
| 0:33 | Le point | La notification du lundi, un « Oui » puis un « Non » ; pas de score, pas de série |
| 0:40 | Au fil des saisons | Les quatre accessoires de la mascotte, sur un an |
| 0:45 | À toi | ramille.fr · Pas de compte à créer pour commencer |

Le scénario plan par plan, avec ce qu'on voit et ce qui est écrit, est rendu sous le film par la
page elle-même : c'est aussi sa version texte.

## Les fichiers

- **`film.html`** — la source unique. C'est la page publiée en artefact, donc un fragment sans
  `<html>` ni `<head>` : le service d'artefacts l'enveloppe. Le film est une **fonction pure du
  temps** (`rendre(t)`), sans bibliothèque : la lecture, la frise, les chapitres et l'export ne
  font que choisir un instant.
- **`exporter.mjs`** — l'export vidéo, image par image (Playwright, déjà dans les dépendances de
  développement, et `ffmpeg`). Les MP4 ne sont pas versionnés : ils se régénèrent après toute
  retouche, en un peu plus d'une minute par format (75 s mesurées le 03/10/2026).

## Ce que le film reprend de l'app, et d'où

Rien n'y est inventé : quand l'app change, le film doit suivre, et **aucune garde ne le vérifie** —
c'est à relire avant chaque diffusion.

- **Les répliques de Ramille** sont recopiées mot pour mot de `RAMILLE`
  (`src/constants/mascotte.ts`) : `presentation`, `calcul`, `checkinOui`, `checkinNon`,
  `suiviSansPoint`. Elle ne dit jamais un nombre et ne se tient jamais près d'un chiffre lourd
  (`FRONT-MASCOTTE.md` §2.3) : elle ne se pose sur aucune carte qui porte un chiffre, et la carte
  du point passe sous le titre du plan, en tête, comme dans `src/app/(tabs)/plan/index.tsx`.
- **Les textes d'écran** sont ceux de l'app : l'accroche et « Pas de compte à créer pour
  commencer. » (`src/components/onboarding/etape-accroche.tsx`), « Tes réponses restent privées »
  (`src/components/onboarding/etape-reassurance.tsx`), les questions du questionnaire
  (`src/components/bilan/steps/`), les gabarits d'actions des migrations, la question du point et
  le libellé de sa troisième réponse (`libelleSansObjet`, `src/types/checkin.ts`).
- **La mascotte** est dessinée par un portage de `mascotFaceGeometry` et `mascotSeasonGeometry`
  (`src/types/mascot.ts`), compensation optique comprise — l'en-tête du questionnaire la rend à
  28 dp, comme l'app, et elle y sourit à la dernière étape. Son arrivée et son à-coup reprennent
  `src/components/ecran-lancement.tsx` ; son souffle, `src/components/mascot.tsx`.
- **Le mouvement** suit `.claude/skills/mouvement/SKILL.md` : la sortie douce partout, une sortie
  plus rapide qu'une entrée, des enchaînements sous 300 ms, le dépassement réservé à l'arrivée de
  Ramille, **aucun chiffre qui défile** (les barres arrivent à leur longueur juste), aucune
  célébration, aucun son. Sous « réduire les animations », rien ne se lance seul : les chapitres
  s'ouvrent posés et le film ne joue que sur demande.
- **Les deux seuls chiffres réels** viennent de `src/constants/carbon-reference.ts` (SDES 2017,
  ADEME pour 2050), avec leur source à l'écran. **Le bilan (1,9 t) et les gains du plan (430, 300 et
  240 kg) sont un profil d'exemple**, et l'image le dit (« Écrans de l'app · profil d'exemple ») —
  ils n'ont pas été recalculés par l'estimateur.

## À trancher avant de diffuser

1. **Où il sert d'abord.** Recommandation : le 16:9 en vidéo de la fiche Google Play et sur
   ramille.fr, le 9:16 pour les réseaux — **pas dans l'app pour l'instant**. L'onboarding dit déjà
   tout cela en quatre écrans, et on a refusé d'y ajouter un cinquième parce qu'une étape de plus
   coûte plus en abandon qu'elle ne rapporte en clarté (commentaire de
   `src/components/onboarding/etape-transition.tsx`). Ce qu'on casse si on se trompe : des
   abandons avant le bilan, qui est le seul moment où le produit a quelque chose à montrer.
2. **Le son.** La page est muette ; la règle « aucun son » vaut pour l'app, pas pour une
   publicité. Une musique sans voix suffit (le texte est à l'écran) ; une voix imposerait de
   réécrire le rythme du film autour d'elle.
3. **La fin.** Elle dit ramille.fr seulement : l'app n'est pas encore sur Google Play. Le badge du
   store s'ajoute le jour de la publication. « Gratuit » n'est écrit nulle part, faute de l'avoir
   décidé.
4. **Le profil d'exemple.** Le garder tel quel, ou le remplacer par un profil de recette calculé
   par la base, pour que les kilos affichés soient ceux que l'estimateur rendrait vraiment.
