# Canvas — la boucle d'engagement, d'une saison à l'autre

Sources du canvas livré le 10/09/2026 par la session Claude Design, en réponse au brief
`BRIEF.md` (lot 2 du plan `docs/architecture/v1-13-audit-et-chantiers.md`). Le document
d'implémentation qui en découle est `docs/architecture/v1-14-boucle-engagement.md` : c'est lui
que les chantiers lisent ; ce README dit ce qu'il y a dans le dossier et ce qui a été retenu.

Le livrable du designer est conservé tel quel : `HANDOFF.md` (son README, avec la géométrie
exacte des accessoires et la table des jetons), `Canvas.dc.html` (le canvas, renommé depuis
« v1-14 Boucle d'engagement.dc.html » ; il ne référence que `support.js`), `Mascotte.dc.html`
(la mascotte avec accessoires, props `mood`, `size`, `tilt`, `season`), `support.js` (le runtime
des `.dc.html`) et `captures/` (une PNG 2× par planche, thème clair, état initial des
prototypes — le plus court chemin pour voir une planche sans navigateur). Le **design system**
formalisé à cette occasion vit à part, dans `docs/design/design-system/`, et s'invoque comme
skill Claude Code (`ramille-design`, `.claude/skills/ramille-design/SKILL.md`).

## Ce que le canvas contient

Sept moments (A à G), dans l'ordre où une personne les rencontre, puis trois pages. Planches
390 × 844, valeurs relevées du dépôt, thème sombre sur toutes les planches. A et B sont
cliquables (répondre, rejouer le point, rejouer l'ouverture) ; B3, E et G défilent dans le cadre.

| Planche | Capture | Rôle |
| --- | --- | --- |
| A1 — Point avec engagement | `A1-point-avec-engagement.png` | la question qui nomme l'action et les jours, trois réponses, la carte qui reste, le second renforcement |
| A2a — Sans engagement · déjà à vélo | `A2a-sans-engagement-deja-a-velo.png` | la question générique sur la forme insérable ; la question de maintien et son « Non » neutre |
| A2b — Voyages · question d'occasion | `A2b-voyages-question-occasion.png` | la question mensuelle pour « un vol en moins », la notification |
| A3 — Retours de Ramille et notification | `A3-retours-ramille-notification.png` | les variantes par issue (D12), la notification hebdomadaire |
| B1 — Fin de saison | `B1-fin-de-saison.png` | la carte du cap avec sa fin et le trait de temps, la carte de re-bilan |
| B2 — Ouverture de saison | `B2-ouverture-de-saison.png` | la carte d'ouverture, Ramille dessous, l'action reconduite, l'ancienne action en mémoire |
| B3 — Bascule, cadence de repli, engagement orphelin | `B3-bascule-repli-orphelin.png` | le bandeau « pendant que tu étais là », la carte sans nom de saison, l'engagement orphelin, la question figée |
| D1 — Suivi · bilans et décisions | `D1-suivi-bilans-decisions.png` | l'écart par poste, « ce que tu as décidé, saison après saison » |
| D2 — Suivi · points par saison | `D2-suivi-points-par-saison.png` | les points groupés, trois libellés, l'attribution, Ramille en bas |
| E — Restitution d'un re-bilan | `E-restitution-re-bilan.png` | la barre-contour du bilan précédent, la variation, la variante mobilité contrainte |
| F1 — L'action engagée et le premier pas | `F1-action-engagee-premier-pas.png` | le bloc « Premier pas », le lien « Voir d'autres pistes · N » |
| F2 — Voir d'autres pistes, dépliées | `F2-autres-pistes-depliees.png` | deux cartes estompées puis des lignes simples, « Replier » |
| G — La reprise | `G-reprise.png` | le questionnaire à moitié rempli ; le plan ouvert depuis un rappel sur un appareil neuf |
| Saisons — accessoires | `C-saisons-accessoires.png` | les quatre accessoires, les cinq expressions avec le bonnet, les tailles, le thème sombre |
| Écarts | `Ecarts.png` | dix-sept lignes avant / après, apport, prix, où |
| Système | `Systeme.png` | quatre jetons ajoutés, cinq motifs sans jeton |

## Ce qui a été retenu

Le mandat du brief (§2) autorisait le canvas à faire évoluer le design existant. Il l'a fait
avec retenue : **quatre jetons de couleur** (`mascotInk`, `mascotVein`, `mascotAccessory`,
`mascotWarm`, tous dans les deux thèmes), **aucune taille, aucun rayon, aucune hauteur nouvelle**,
et cinq motifs qui se composent avec l'existant (barre-contour, carte de saison, réponse
tertiaire, étiquette composée, trait de temps). Deux composants nouveaux (`CarteDeSaison`,
`EcartParPoste`), deux états nouveaux sur des composants existants (`CheckinCard` répondue et à
trois réponses, `ActionCard` reconduite et avec premier pas). Les dix-sept écarts sont repris un
à un dans `v1-14` §2, chacun rattaché au chantier qui le livre.

Ce que le canvas a tranché parmi les questions ouvertes du brief (§10) :

- **La personne déjà à vélo reçoit une question de maintien**, pas l'absence de point : elle
  renforce l'identité (« le vélo reste ton trajet »).
- **La question mensuelle des voyages porte sur l'occasion**, pas sur un changement de mode.
- **Ramille se tient sous la carte d'ouverture**, hors du cadre qui porte les deux nombres.
- **Quatre accessoires, deux marqués (hiver, automne) et deux très discrets (printemps, été)** ;
  si quatre sont trop, printemps et été peuvent rester nus.
- **Quand la saison change pendant que le plan est ouvert**, un bandeau discret le dit ; la carte
  ne se remplace pas sous les yeux.

## Ce que l'implémentation corrige par rapport au canvas

Consigné ici pour que personne ne « corrige » le code vers le canvas.

1. **Le jeton du ton chaud s'appelle `mascotWarm`**, comme dans `HANDOFF.md` et
   `design-system/tokens/colors.css` — la page Système le nomme `mascotBlushAutumn`, trop étroit
   puisqu'il sert aussi à la calotte du bonnet.
2. **La question mensuelle interroge le mois écoulé** (D2). La planche A2b écrit « Ce mois-ci,
   as-tu eu un déplacement… » sous « Point du mois · septembre » et une notification du 1er
   octobre : c'est le mois précédent qu'elle vise. La copie retenue nomme le mois — « En
   septembre, as-tu eu un déplacement où tu as choisi autre chose que l'avion ? », notification
   « Tes voyages : en septembre, as-tu choisi autre chose que l'avion ? » — et la troisième
   réponse devient « Pas de voyage en septembre ».
3. **« Weekend et loisirs » (planche G, en-tête du questionnaire) s'écrit « Loisirs du
   week-end »** : C2.6 unifie le libellé de chaque poste, et l'en-tête du questionnaire le suit.
4. **La réponse au point vit dans `response_kind` (`oui` / `non` / `sans_objet`)**, pas dans le
   `answered: boolean | string | null` du kit — le kit est cosmétique, le schéma est celui de
   C2.4.
5. **Le kit `design-system/` est une photographie du dépôt au 10/09/2026, pas une source de
   vérité.** Son catalogue de 38 écrans reprend le handoff V1, avec des écrans à mot de passe
   qui n'existent plus (v1-10 §2.D) et un « Check-in manqué » que le produit ne montre jamais ;
   l'exemple « Le mot de passe doit contenir au moins 8 caractères » de son readme n'a pas
   d'équivalent. En cas d'écart, le code et CLAUDE.md gagnent ; le kit se met à jour, jamais
   l'inverse.
6. **Le compte des écrans de la reprise se dérive** (« Quatre écrans déjà remplis. Il en reste
   cinq, en comptant celui-ci. ») de `isStepVisible` : le total dépend des réponses, il ne
   s'écrit pas en dur.
7. **Ramille a quatre répliques de « pas de trajet » et non deux**, indexées sur le **poste**
   (C2.4). Le canvas oppose « Pas de trajet … » (hebdomadaire) à « Pas de voyage … » (mensuelle) ;
   depuis C2.6 la boucle mensuelle couvre les voyages **et** les sorties du week-end, donc
   « Pas de voyage, pas de question. » tomberait sur quelqu'un qui vient d'appuyer sur « Pas de
   sortie en septembre ». Les variantes suivent le poste, comme le libellé du bouton.
8. **Le pied de la carte répondue écrit le mois en entier** (« Prochain point : lundi
   21 septembre. ») : abréger demanderait une quatrième liste de mots français tenue à la main,
   pour quatre caractères sur une ligne en petit tertiaire.

Une phrase reste à valider par le titulaire : « Le refaire prend cinq minutes » sur la carte de
re-bilan (B1) promet une durée que le produit ne promettait pas ailleurs (« quelques minutes »
dans l'onboarding).

## Ce que le canvas ne fait pas

Aucune sixième expression, aucune saison qui change l'humeur, aucun accessoire sous 28 px ni sur
la carte de partage. Aucune streak, série, badge, jauge de progression vers 2050, comparaison
entre personnes. Aucun chiffre dans la bouche de Ramille — les deux nombres de la carte
d'ouverture sont en voix produit, et elle se tient dessous. Aucune couleur sans son pendant
sombre. Aucun composant natif nouveau : les transitions se font avec Reanimated, et seule la
mascotte (C2.13) impose un build.
