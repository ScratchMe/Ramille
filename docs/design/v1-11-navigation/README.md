# Canvas — navigation et vocabulaire visuel

Sources du canvas publié le 07/09/2026, après le premier test de l'app sur téléphone.

Artifact : https://claude.ai/code/artifact/c55de841-4c40-4a71-a381-c7092c98984b

## Pourquoi ce canvas existe

Deux retours du test sur appareil, dont un structurel :

> « Je peine à vraiment saisir où je suis entre le bilan, le plan et le suivi. »

> « Quand je revois mon plan, il est difficile de distinguer d'un coup d'œil l'action pour
> laquelle je me suis engagé. »

Le produit n'a **aucune navigation persistante** : chaque écran est atteint par une poussée
depuis un autre, et rien ne représente « les trois lieux du produit et où je suis ». Sur web
la barre d'URL le dit ; sur mobile, rien. C'est d'autant plus coûteux que la promesse est
l'accompagnement dans la durée — quelqu'un qui revient au troisième mois arrive sur son plan
sans savoir que son suivi existe. Détail en issue #69.

## Ce que le canvas contient

Trois pages. Les artboards de la page **Navigation** sont cliquables : c'est le seul moyen de
juger une navigation, le sentiment de « où je suis » ne se voit pas sur une image fixe.

| Page | Artboard | Rôle |
| --- | --- | --- |
| Navigation | `Main.dc.html` | A — barre d'onglets basse |
| Navigation | `OptionB.dc.html` | B — segment en tête |
| Navigation | `OptionC.dc.html` | C — fil de saison |
| Plan | `PlanComparaison.dc.html` | l'action engagée, avant et proposé |
| Système | `Systeme.dc.html` | relevé du vocabulaire visuel en vigueur |

Les trois options portent **le même contenu**, pour que la comparaison porte sur la
navigation et non sur les écrans. Les valeurs viennent du code réel (`src/constants/theme.ts`,
`button.tsx`, `chip.tsx`, `plan/index.tsx`) : Spline Sans, accent `#1F6F4A`, bouton 54 /
rayon 27, carte rayon 18, échelle 4/8/16/24/32. Rien n'est arrondi à une grille.

## Les trois directions, et leur coût

- **A — barre d'onglets basse.** La convention Android, atteignable au pouce, toujours
  visible. Coût : 76 px pris en bas de chaque écran, et le questionnaire devra la masquer.
- **B — segment en tête.** Libère le bas de l'écran, garde la marque visible. Coût : loin du
  pouce sur un grand téléphone, et un segment se lit comme un filtre plutôt que comme une
  navigation.
- **C — fil de saison.** La navigation raconte le parcours (bilan → plan → suivi) ancré dans
  la saison en cours, plutôt que trois lieux de rang égal. Seule des trois à porter la
  promesse d'accompagnement. Coût : elle suggère un ordre obligatoire, et vieillit mal au
  troisième mois, quand on revient sans vouloir refaire son bilan.

## Une décision prise en dessinant, à valider

**L'onglet « Bilan » mène au résultat, pas au questionnaire.** Un onglet permanent vers les
neuf étapes inviterait à tout recommencer — l'inverse exact du suivi dans la durée. C'est le
seul écart au vocabulaire existant que ce canvas introduit de lui-même.

## Ce que le canvas ne fait pas

Il ne propose **aucune nouvelle couleur ni taille**. La page Système est un relevé de ce qui
existe : le travail utile n'est pas d'inventer des valeurs mais de nommer celles qui se
répètent déjà en dur dans les écrans. Les tailles 26/32, 30/36 et 17/24, les rayons 8, 14, 18
et 27 et les hauteurs 46 et 54 sont redéclarées écran par écran, alors que `ThemedText` ne
connaît que 48/32/16/14.

Il ne touche pas non plus aux partis pris acquis : aucune mécanique d'échec sur le suivi (ni
série, ni score, ni période manquée), aucun chiffre dans la bouche de Ramille, et pas de
mascotte à côté d'un chiffre lourd.
