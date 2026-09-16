# Canvas — le plan : ce qu'il montre, et ce qu'il tait

Sources du canvas livré le 16/09/2026 par la session Claude Design, en réponse à **deux briefs** :
`BRIEF.md` (v1-17, la densité du plan et le tout premier parcours, constat 13.3 de la recette web,
issue #198) et [`../v1-18-question-qui-restreint/BRIEF.md`](../v1-18-question-qui-restreint/BRIEF.md)
(v1-18, une réponse du questionnaire qui restreint sans le dire, constat 13.1, issue #197). Le
document d'implémentation qui en découlera est à écrire dans `docs/architecture/` ; ce README dit ce
qu'il y a dans le dossier et ce qui a été retenu.

Le livrable est conservé tel quel : `HANDOFF.md` (planche par planche, copy définitive, la page
Écarts, où ça se touche), `Canvas.dc.html` (le canvas, qui ne référence que `support.js`),
`support.js` (le runtime des `.dc.html`) et `captures/` (une PNG 2× par planche, thème clair, état
initial — le plus court chemin pour voir une planche sans navigateur).

## Pourquoi un seul dossier pour deux briefs

v1-18 §6 l'autorisait : si la restriction doit se dire **sur le plan** plutôt qu'en amont, les deux
briefs dessinent le même écran. C'est ce que le canvas a tranché — la restriction se dit avant comme
une règle (l'intro de l'étape), après comme une prémisse (un encart sur le plan, avec la porte pour
corriger), jamais au moment de répondre avec l'enjeu sous la puce. Le seul cas où le mot de la réponse
ne disait pas ce que le produit en ferait (« Parfois ») se corrige dans la question elle-même. Les
planches du plan servent donc les deux briefs, et deux dossiers auraient porté deux fois le même écran.

## Ce que le canvas contient

Cinq groupes de planches (A à E), puis deux pages. Planches 390 px de large, valeurs relevées du dépôt,
thème clair et sombre. Les écrans qui défilent sont dessinés en entier, le cadre est allongé. A2 et D
sont cliquables.

| Planche | Capture | Rôle |
| --- | --- | --- |
| A1 — Le plan · le meilleur levier hors du poste dominant | `A1-plan-levier-hors-dominant.png` | le nouveau classement, l'intro qui nomme les postes, la note sous le cap, la porte « Voir toutes les pistes · 11 », l'encart de contexte |
| A2 — Toutes les pistes · l'écran | `A2-toutes-les-pistes.png` | l'écran de la pile du plan, groupé par poste, en lignes qui s'ouvrent en carte |
| A3 — Toutes les pistes · une ligne ouverte | `A3-toutes-les-pistes-ligne-ouverte.png` | la carte ouverte avec « Réduire », la ligne engagée |
| B1 — Le tout premier plan | `B1-premier-plan.png` | la carte « TON PREMIER PLAN » à la place de la carte d'attente, Ramille dessous, pas de trait de temps |
| B2 — Le plan de retour | `B2-plan-de-retour.png` | le point de la semaine, l'action engagée avec son premier pas, la seconde carte estompée |
| C — Le plan à zéro action | `C-plan-zero-action.png` | inchangé, et pourquoi rien de neuf ne s'y rend |
| D — L'étape « Contexte de mobilité » | `D-etape-contexte.png` | l'intro qui dit la règle, la question du télétravail en jours |
| E — Les sept conditions | `E-sept-conditions.png` | question par question, ce qu'une réponse écarte et où ça se dit |
| Écarts | `Ecarts.png` | seize lignes avant / après, apport, prix, où |
| Système | `Systeme.png` | aucun jeton ajouté, cinq motifs réemployés |

## Ce qui a été retenu

- **Le classement** : la meilleure piste du poste dominant d'abord, puis toutes les autres du plus gros
  gain au plus petit. Une migration du `row_number()` ; `pistesDuPlan` ne change pas.
- **Deux cartes sur le plan, toutes les pistes sur un écran de la pile du plan**, groupées par poste,
  en lignes qui s'ouvrent en carte et se referment. Plus de cartes estompées automatiques, plus de
  « Replier » : le retour est celui de la plateforme.
- **Le premier plan** montre la même chose ; son ouverture est une carte qui dit la règle du jeu, et le
  trait de temps attend le premier engagement.
- **La restriction** se dit dans l'intro de l'étape et dans un encart du plan, sans jamais nommer
  l'action écartée ni son gain. La question du télétravail demande un nombre de jours sur les jours
  de trajet déclarés ; « Parfois » disparaît, le seuil de C3.8 ne bouge pas.
- **Zone, transports en commun, véhicules** : inchangées, dites par l'encart.
- **Le plan à zéro action** : inchangé, et rien de ce canvas ne s'y rend.

Ce que les briefs listaient et qui n'est pas dessiné : la planche « trois états de la question du
télétravail » (v1-18 §8.2) — la forme retenue ne réagit pas au choix, ses trois états sont trois
puces, visibles en D.

## Ce que le canvas ne fait pas

Aucun jeton, aucune taille, aucun rayon nouveau. Aucun onglet de plus, aucune route dynamique. Aucun
tri qui se réordonne selon l'usage. Aucune hiérarchie qui retire la permission. Aucun pourcentage ni
gain à côté d'une puce du questionnaire, aucune phrase d'aide sous les questions, aucune question de
plus. Aucun chiffre dans la bouche de Ramille — les nombres du plan sont en voix produit, et elle se
tient sous la carte du premier plan, hors du cadre. Aucune couleur sans son pendant sombre.

## Ce que l'implémentation corrigera par rapport au canvas

À consigner ici au fil des chantiers, comme `v1-14-boucle-engagement/README.md` le fait : le dépôt
gagne, le canvas ne se réécrit pas. Deux points déjà connus au moment de livrer :

1. **Les gains des lignes 7 à 11 sont des valeurs de démonstration**, cohérentes avec le calcul mais
   pas relevées en base ; les six premiers sont ceux du brief.
2. **La question du télétravail à un jour de trajet** : le canvas la fait disparaître (aucun gabarit
   ne peut s'appliquer) ; si l'implémentation préfère la poser quand même, la réponse doit rester
   sans effet plutôt que promettre une piste.
