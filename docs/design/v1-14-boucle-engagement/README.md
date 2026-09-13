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
9. **« Pas de trajet la semaine dernière »**, et non « cette semaine » (planche A1). Le point
   interroge la semaine **écoulée** depuis C2.3 ; la question ouvre par « La semaine dernière » et la
   moitié mensuelle de la même ligne du canvas nomme déjà le mois écoulé. Le bouton nommait la semaine
   qui commence, dont le point ne demande rien.

10. **La carte d'ouverture ne prend pas la place d'un point en attente** (C2.8). Le canvas la pose
    « à la place du point » ; le lien du rappel pointe `/plan`, donc masquer la question revient à
    faire ouvrir une notification sur un écran qui ne la porte pas — le défaut trouvé sur appareil
    le 09/09/2026 (`v1-12` §8.1). Elle se pose au-dessus du titre du plan et remplace la **carte
    d'attente** : Ramille parle déjà sous la carte d'ouverture.
11. **Le récapitulatif ne nomme aucun poste** (C2.8) : « … changé quelque chose. » et non « … sur
    ton trajet ». Le décompte porte sur les deux boucles, donc nommer le trajet serait faux pour
    quelqu'un dont les changements sont des voyages. Et il **ne dit jamais zéro** : sans point
    répondu, la phrase disparaît ; sans changement, sa seconde moitié tombe.
12. **La carte d'ouverture a deux états que le canvas ne dessine pas** (C2.8) : rien d'engagé
    (« Choisir une action »), et un plan sans action (« Compris » seul) — ce dernier étant le cas de
    tout cycliste et de tout profil sédentaire depuis C2.5. Une action et une seule : « Choisir une
    autre » disparaît, elle ne mènerait nulle part.
13. **La puce « Cadence : Automne 2026 » quitte le plan** (C2.8). Le canvas nomme la période dans la
    carte du cap, sur un écran qui ne porte pas la puce ; garder les deux nommerait la période à deux
    endroits — et « Cadence : … » le disait dans un vocabulaire de réglage. La carte du cap se rend
    donc même quand il n'y a pas de cap à dire.

14. **« 2,1 t → 1,7 t » et « 0,3 t de moins » s'écrivent sans « CO₂e »** (C2.7), ce que le canvas
    montre et que le formateur du dépôt n'offrait pas : le nom du gaz appartient au chiffre qui se
    tient seul. D'où `formatTonnesNu`, qui partage la bascule kilos/tonnes de `formatTonnes`.
15. **« Je vois la différence. » ne se dit que sur une baisse réelle** (C2.7). Le canvas la pose sans
    condition ; au-dessus d'une hausse, ou d'un écart qui tient dans l'imprécision des facteurs, elle
    serait fausse — et c'est la personne concernée qui le verrait la première.
16. **« Le palier que tu visais est derrière toi. » n'est dit que quand il est prouvable** (C2.7) :
    le cap visé à l'époque est perdu quand les deux bilans tombent dans la même période, le cycle
    étant réécrit à chaque soumission.
17. **« Toi » devient « Toi, aujourd'hui » seulement quand la barre d'avant est là** (C2.7), et
    l'échelle des barres inclut le bilan précédent — sans quoi sa barre dépasse la carte exactement
    dans le cas d'un re-bilan réussi.

18. **La phrase de mobilité contrainte se rend en plus de la comparaison, pas à sa place** (C3.1) :
    `comparisonNote` ne parle qu'en relecture — en sortie de questionnaire, c'est la phrase du palier
    qui occupe cette ligne —, donc la loger là seul aurait fait qu'un profil concerné ne la voie
    jamais à l'endroit où la barre vient d'être retirée.

19. **Le premier pas ne nomme aucun jour** (C4.6) : le canvas écrit « Repère un itinéraire cyclable
    pour mardi. », or le jour vient de l'intention que la personne choisit **après** l'engagement, et
    le gabarit ne le connaît pas. Il dit donc « avant ton premier jour ».
20. **Les lignes simples des pistes ne portent pas de bouton** (C4.6) : c'est la hiérarchie que la
    borne à quatre cartes installe — au-delà, on dit ce qui existe sans le mettre au même rang.

21. **Les accessoires de saison ne sont pas découpés par la silhouette** (C2.13), seules les joues
    d'automne le sont — elles seules sont dans le visage. Un pompon découpé devient une lentille : il dépasse la
    pointe de la feuille par construction, et d'autant plus à petite taille.
22. **La goutte de rosée est remontée en haut à droite de la feuille** (C2.13), translatée de
    (−6, −37). À sa place d'origine elle chevauche le bord de la silhouette et s'y lit comme une
    éraflure du contour ; et son coin arrivait à 0,08 px du coin de la bouche de `happy` à 28 px,
    la taille et l'expression exactes de l'en-tête du questionnaire à la dernière étape. Le dessin
    lui-même est inchangé — le test applique la translation au chemin du canvas.
23. **Le reflet dans la goutte n'est pas repris** (C2.13) : 0,76 px de diamètre et sept niveaux de
    contraste au-dessus de la goutte, donc invisible et non discret. Le grossir ne le sauverait
    pas, et l'éclaircir percerait un trou dans une goutte de six unités.

La phrase de durée est tranchée : « Le refaire prend **quelques minutes** », et non « cinq minutes »
comme l'écrit B1. Le produit promet « environ 5 minutes » pour le **premier** bilan (transition de
l'onboarding, états vides du plan et du suivi) ; un re-bilan est plus rapide, ses réponses étant
préremplies, donc reprendre la même durée serait la surestimer. Le titulaire peut revenir dessus,
mais pas vers « cinq minutes » sans revoir les trois autres surfaces.

## Ce que le canvas ne fait pas

Aucune sixième expression, aucune saison qui change l'humeur, aucun accessoire sous 28 px ni sur
la carte de partage. Aucune streak, série, badge, jauge de progression vers 2050, comparaison
entre personnes. Aucun chiffre dans la bouche de Ramille — les deux nombres de la carte
d'ouverture sont en voix produit, et elle se tient dessous. Aucune couleur sans son pendant
sombre. Aucun composant natif nouveau : les transitions se font avec Reanimated, et seule la
mascotte (C2.13) impose un build.
