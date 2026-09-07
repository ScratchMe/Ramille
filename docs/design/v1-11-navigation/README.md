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

Cinq pages. La direction a été tranchée le 07/09 après une première version à trois options
et trois lieux : **la barre basse (A), à deux onglets**. Les artboards de la page Navigation
sont cliquables — le sentiment de « où je suis » ne se voit pas sur une image fixe.

| Page | Artboard | Rôle |
| --- | --- | --- |
| Navigation | `Main.dc.html` | Plan / Suivi, compte derrière l’icône — cliquable |
| Flux | `Flux1` à `Flux6.dc.html` | les six flux, écran par écran |
| Plan | `PlanComparaison.dc.html` | l’action engagée, avant et proposé — validé |
| Système | `Systeme.dc.html` | relevé du vocabulaire visuel — validé |
| Écartées | `OptionB.dc.html`, `OptionC.dc.html` | les deux directions non retenues, pour mémoire |

Les valeurs viennent du code réel (`src/constants/theme.ts`, `button.tsx`, `chip.tsx`,
`plan/index.tsx`, `checkin-card.tsx`, `mascotte.ts`) : Spline Sans, accent `#1F6F4A`, bouton
54 / rayon 27, carte rayon 18, échelle 4/8/16/24/32, libellés « Oui » / « Non » du check-in et
répliques de Ramille mot pour mot. Rien n'est arrondi à une grille. Les mini-écrans des flux
sont à 230 × 498 (390 × 844 × 0,59), typographie réduite en proportion, générés par un script
plutôt qu'écrits à la main pour que les six restent cohérents entre eux.

## Le modèle retenu : le présent et la trace

- **Plan** = maintenant, cette saison. L'action engagée, le cap, le point de la semaine à
  répondre — en tête quand il est en attente, c'est la raison de revenir la plus fréquente.
- **Suivi** = dans la durée. Les bilans comme instantanés qu'on peut ouvrir, les écarts, les
  points répondus. Jamais les points laissés passer.
- **Le questionnaire n'est pas un lieu, c'est un flux.** Plein écran, barre masquée, entré
  depuis le suivi (« Refaire mon bilan ») ou depuis un état vide. Il se termine sur le
  résultat, qui est *aussi* le détail d'un bilan ouvert depuis le suivi : un seul écran, deux
  entrées. C'est ce qui a fait tomber « Bilan » comme destination — il n'avait aucun contenu
  propre.
- **Le compte** vit derrière une icône en haut à droite des deux écrans. Un onglet permanent
  contredirait « pas besoin de compte ».

**La règle d'arrivée ne change pas** : la racine envoie sur le plan dès qu'un bilan existe
(`src/app/index.tsx`). Ce qui manquait n'était pas la page d'atterrissage mais la sortie
visible vers le suivi.

## Les six flux

1. **Fin du questionnaire** — la barre apparaît au résultat, premier moment où la personne a
   quelque chose dans les deux onglets. Onglet Suivi actif ; le bouton emmène au plan.
2. **Refaire un bilan** — depuis le suivi, ou depuis le plan au changement de saison.
   Questionnaire prérempli ; la nouvelle entrée en tête du suivi.
3. **Ouvrir un bilan passé** — l'écran de résultat prend déjà un `id` ; seul le lien manque.
4. **Répondre à un check-in** — le rappel ouvre le plan, point en tête ; répondu, Ramille dit
   un mot et le plan reprend sa forme.
5. **Reconnexion sur un nouvel appareil** — le chemin de v1-10, qui aboutit au plan par la
   même règle que tout le monde.
6. **Période calme** — le plan le dit par un mot de Ramille et garde l'action engagée ; le
   suivi ne montre aucun trou.

## Ce qui a été écarté, et pourquoi

- **B — segment en tête** : se lit comme un filtre, vit loin du pouce sur un grand téléphone.
- **C — fil de saison** : suggère un ordre obligatoire et vieillit mal au troisième mois.
- **Trois lieux** (la première version de A) : « Bilan » n'était que la fin d'un flux ou le
  détail d'une entrée du suivi.
- **Un troisième onglet pour meubler** : une barre à deux entrées est inhabituelle, mais le
  seul candidat était le compte, et lui donner un onglet permanent contredit la promesse.

## Ce que le canvas ne fait pas

Il ne propose **aucune nouvelle couleur ni taille**. La page Système est un relevé de ce qui
existe : le travail utile n'est pas d'inventer des valeurs mais de nommer celles qui se
répètent déjà en dur dans les écrans (26/32, 30/36, 17/24, rayons 8/14/18/27, hauteurs 46/54)
alors que `ThemedText` ne connaît que 48/32/16/14.

Il ne touche pas non plus aux partis pris acquis : aucune mécanique d'échec sur le suivi (ni
série, ni score, ni période manquée), aucun chiffre dans la bouche de Ramille, et pas de
mascotte à côté d'un chiffre lourd.
