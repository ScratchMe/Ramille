# Le fil de Ramille — le film de présentation

**Statut** : proposition du 03/10/2026, pas encore diffusée. Ce qui reste à décider est en fin de
document et revient à la personne qui pilote : c'est ce qu'on montre du produit.

## Ce que c'est

Un motion design de 51 secondes pour faire comprendre Ramille et donner envie de faire son bilan,
en deux formats tirés de la même source : **16:9** (un écran, une page web, une fiche de store) et
**9:16** (un téléphone, les réseaux).

**L'idée tient en un trait.** Le logo le dit déjà : la nervure de la feuille est un itinéraire
tracé jusqu'à un point d'arrivée (commentaire de `assets/images/logo-mark.svg`). Le film prend ce
trait au mot : il dessine un trajet, se tend pour devenir l'empreinte moyenne en France, se
replie en nervure, la feuille se dessine autour et devient Ramille ; il revient pour traverser
les saisons, et finit en un point d'arrivée qui s'étire et devient le bouton « Découvrir mon
impact ».

| Temps | Chapitre | Ce qu'il dit |
|---|---|---|
| 0:00 | Tes trajets | Chaque jour, tu te déplaces. Lequel pèse le plus ? |
| 0:06 | Ce qu'ils pèsent | Le transport, premier poste de l'empreinte : 2,8 t CO₂e (SDES, 2017) |
| 0:12 | Ramille | Le logo, puis le visage ; « Comprendre tes trajets, sans te juger. » |
| 0:18 | Ton bilan | Quatre des neuf étapes, le calcul, la restitution |
| 0:26 | Ton plan | Deux pistes en tête, on en choisit une, deux jours, « C'est noté » : elle passe en tête |
| 0:33 | Le point | La notification du lundi, un « Oui » puis un « Non » ; pas de score, pas de série |
| 0:40 | Au fil des saisons | La mascotte porte les quatre saisons, sur un an |
| 0:45 | À toi | ramille.fr · Pas de compte à créer pour commencer |

Le scénario plan par plan, avec ce qu'on voit et ce qui est écrit, est rendu sous le film par la
page elle-même : c'est aussi sa version texte.

## Les fichiers

- **`film.html`** — la source unique. C'est la page publiée en artefact, donc un fragment sans
  `<html>` ni `<head>` : le service d'artefacts l'enveloppe. Le film est une **fonction pure du
  temps** (`rendre(t)`), sans bibliothèque : la lecture, la frise, les chapitres et l'export ne
  font que choisir un instant.
- **`exporter.mjs`** — l'export vidéo, image par image (Playwright, déjà dans les dépendances de
  développement, et `ffmpeg`). Les MP4 s'écrivent dans le dossier temporaire du système, jamais
  dans le dépôt : ils se régénèrent après toute retouche, en un peu plus d'une minute par format
  (75 s mesurées le 03/10/2026). Spline Sans y est servie par les fichiers du kit, et l'export
  refuse de partir si l'une des quatre graisses manque ; la chasse fixe, absente du dépôt, prend
  celle du système sur les trois lignes qui l'emploient.

## Ce que le film reprend de l'app, et d'où

Rien n'y est inventé : quand l'app change, le film doit suivre, et **aucune garde ne le vérifie** —
c'est à relire avant chaque diffusion.

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
  l'en-tête, 72 au calcul, 40 dans une réplique. Son à-coup reprend
  `src/components/ecran-lancement.tsx` ; son souffle, `src/components/mascot.tsx`.
- **Le mouvement** suit `.claude/skills/mouvement/SKILL.md` : la sortie douce pour ce qui entre et
  ce qui sort, une sortie plus rapide qu'une entrée, les mots d'un titre en moins de 300 ms, et le
  dépassement réservé à l'arrivée de Ramille, qui reprend l'écran de lancement — les accessoires
  de saison, les arrêts et les points apparaissent en fondu. Le tracé du trait et ses
  métamorphoses suivent leurs propres courbes, qui n'ont pas d'équivalent dans l'app. **Aucun
  chiffre ne défile** (les barres arrivent à leur longueur juste), aucune célébration, aucun son.
  Sous « réduire les animations », rien ne se lance seul : les chapitres s'ouvrent posés et le film
  ne joue que sur demande.
- **Les chiffres de référence** viennent de `src/constants/carbon-reference.ts`, avec leur source
  à l'écran : la moyenne française et sa répartition en cinq postes (SDES, 2017), et le repère
  transport 2050, qui est une **dérivation** de la cible de 2 t de l'ADEME — d'où le mot
  « transport » dans son libellé. **Le bilan (1,9 t), le palier (1,7 t) et les gains du plan (430
  et 300 kg) sont un profil d'exemple**, et l'image le dit (« Écrans de l'app · profil
  d'exemple ») : ils n'ont pas été recalculés par l'estimateur.

## À trancher avant de diffuser

1. **Où il sert d'abord.** Recommandation : le 16:9 en vidéo de la fiche Google Play et sur
   ramille.fr, le 9:16 pour les réseaux — **pas dans l'app pour l'instant**. L'onboarding dit déjà
   tout cela en quatre écrans, et on a refusé d'y ajouter un cinquième parce qu'une étape de plus
   coûte plus en abandon qu'elle ne rapporte en clarté (commentaire de
   `src/components/onboarding/etape-transition.tsx`). Ce qu'on casse si on se trompe : des
   abandons avant le bilan.
2. **Quand le diffuser, et ce que dit la fin.** Le film montre l'app Android : la notification du
   lundi, « Ramille te fait signe lundi ». Sur le web, il n'y a pas de notification, et le rappel
   par e-mail demande un compte ; sans canal, l'app dit « On se retrouve ici lundi. ». Or la fin
   renvoie à ramille.fr seul, l'app n'étant pas encore sur Google Play. Recommandation : diffuser
   à la publication sur Play, avec le badge du store en fin de film. Ce qu'on casse si on diffuse
   avant : une promesse que la personne qui suit l'appel ne verra pas tenue. « Gratuit » n'est
   écrit nulle part, faute de l'avoir décidé.
3. **« Pas de score. Pas de série. » devient une promesse publique.** « Aucun classement » est un
   non-goal ferme ; celui des mécaniques de jeu a été **révisé, pas supprimé**, et une progression
   non comparative y redevient envisageable (`docs/architecture/v1-06-partage-social.md` §1).
   Recommandation : garder les trois phrases si ce chantier n'est pas prévu, sinon ne garder
   qu'« Aucun classement ». Ce qu'on casse si on se trompe : un film qui contredit le produit le
   jour où cette porte s'ouvre.
4. **Le son.** La page est muette. La règle « aucun son » est celle de l'app ; pour une vidéo
   diffusée ailleurs, une musique sans voix suffirait (le texte est à l'écran), une voix
   imposerait de réécrire le rythme du film autour d'elle.
5. **Le profil d'exemple.** Le garder tel quel, ou le remplacer par un profil de recette calculé
   par la base, pour que les kilos affichés soient ceux que l'estimateur rendrait vraiment.
