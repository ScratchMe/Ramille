# Ramille — ce qu'est le produit, ce qui est livré, et ce qui vient

**Découpé de `CLAUDE.md` le 15/09/2026.** **Statut** : document **vivant**, à mettre à jour à
chaque increment livré — à la différence des `v1-0N`, qui sont des décisions datées qu'on ne
réécrit pas.

**Pourquoi il existe.** `CLAUDE.md` portait tout : les règles qu'on ne peut pas se permettre de
casser **et** l'état du monde. Les deux ne se lisent pas au même moment — une règle se lit avant de
toucher une ligne, un état de livraison avant de décider quoi faire — et les mélanger noyait les
premières dans les secondes. Ce fichier prend l'état du monde ; `CLAUDE.md` garde les règles, les
mécaniques de travail, et renvoie ici.

**Ce qui n'est pas parti** : les trois règles de nommage et de langue, restées dans `CLAUDE.md`
parce qu'elles se cassent sans qu'on ait rien à décider.

---

## 1. Ce qu'est Ramille

Une app de sensibilisation à l'empreinte carbone des transports, pour la France.

**Les trois règles qui vont avec — le français partout, le nom qui ne doit pas revenir, Play
seulement — ne sont pas répétées ici, et c'est délibéré :** elles vivent dans `CLAUDE.md`, qui
est le fichier lu à chaque session. Deux copies d'une règle finissent par diverger, et c'est la
copie qu'on ne lit pas qui a raison le jour où ça compte. L'histoire complète du renommage est en
`v1-09-renommage-ramille.md` ; ce qu'il faut en retenir sans la lire est dans `CLAUDE.md`.

Un point que `CLAUDE.md` ne porte pas, parce qu'il n'est pas une règle : **Ramille est aussi le nom
de la mascotte**. Produit et personnage ne font qu'un, ce qui explique pourquoi sa voix est cadrée
aussi strictement que le reste du produit.

Cinq briques dans l'ordre de priorité de la spec §11 : Bilan initial (2) > Onboarding (1) >
Connexion (5) > Boucle mensuelle (4) > Plan de réduction (3). Cet ordre est aujourd'hui
historique — les cinq sont livrées — mais il explique le niveau de soin, que la spec §3 donne
brique par brique : copy et framing travaillés sur 1 et 2, « fonctionnel simple » sur 3 et 4,
soin sur le **placement et le message** pour 5. La connexion a son écart assumé (`v1-04` §1,
session anonyme dès l'ouverture) : reprendre l'ordre de la spec ne remet pas son découpage.

## 2. Les increments livrés

**Le dernier increment livré est `v1-11-navigation-et-design-system.md`** (07/09/2026, cinq
lots) : **barre à deux onglets Plan / Suivi**, le questionnaire et le compte hors de la barre,
résultat sous le suivi (`/suivi/bilan?id=`, deux entrées dérivées dans `src/types/resultat.ts`,
`/bilan/resultat` conservée en redirection), action engagée saillante, et les jetons
`TypeScale`/`Radius`/`ControlHeight` que les écrans consomment au lieu de redéclarer une taille.
Son canvas est `docs/design/v1-11-navigation/`, ses écarts d'implémentation sa §7. **Trois des
quatre puces de sa §8 restent à vérifier sur appareil** : l'annonce TalkBack « Plan, onglet,
sélectionné » ; le placement de la **carte d'attente** du plan, posée au-dessus du cap de la
saison — la règle « jamais la mascotte près d'un chiffre lourd » vise l'empreinte et non une
réduction, mais si le rendu réel la fait paraître commenter le cap, elle descend sous les actions
(déplacement d'un bloc ; la puce visait la carte de période calme, remplacée par celle-ci en
`v1-12` §6.3) ; et le **lien de connexion `ramille://`**, repris au §2.3 avec ce qui le distingue
du lien du rappel.
Le **retour matériel Android** n'est plus à vérifier : vérifié le 09/09/2026, il quitte bien
l'app depuis `/plan` — c'est le comportement attendu d'une racine à onglets, et il ne doit pas
être « corrigé » par quelqu'un qui le prendrait pour une navigation manquante.

L'increment précédent, `v1-10-connexion-et-rappels.md` (06/09/2026), est livré pour ses
chantiers A à D, F **et E** ; il ne reste que G (renommage GitHub). Il portait la connexion
par lien sans mot de passe, les rappels par push, et deux correctifs livrés qui les
conditionnaient — l'étalement du pic d'envoi du lundi, et la purge des sessions anonymes qui
supprimait sur l'**âge** du compte alors que `v1-04` §3 décrit une purge sur l'**inactivité**
(corrigée, `v1-10` §2.B). Son compagnon design est `docs/design/v1-10-retrouver-son-compte/`.

**Le chantier E est livré, et vérifié sur appareil le 09/09/2026** : `v1-12-rappels.md` en est
le document, avec son canvas cliquable `docs/design/v1-12-rappels/`. Le rappel part par
**notification, par email, ou pas du tout** ; le canal se résout en un seul endroit (§3) ; le
jeton d'appareil suit la personne par RPC ; la feuille des rappels s'ouvre **une fois par
appareil** après « C'est noté », et la carte d'attente du plan a remplacé « Rien à rattraper ».
Les trois branches ont été parcourues en conditions réelles — notification reçue, email reçu,
lien du rappel ouvrant l'app et non le navigateur, réponse refermant le point (§8.1).

**Ce qui a été vérifié là, c'est le lien du rappel, pas celui de la connexion**, et les
confondre ferait croire qu'un chemin a été éprouvé alors qu'il ne l'a pas été. Le lien du
rappel pointe `https://www.ramille.fr/plan` et s'ouvre dans l'app par `assetlinks.json`. Le lien
de connexion, lui, arrive en `ramille://` depuis une messagerie, remonte par `Linking.useURL()`
dans `_layout.tsx`, et doit aboutir sur le plan barre comprise : **ce chemin n'a jamais été
exercé sur appareil** (`v1-11` §8, dernière puce), alors que c'est le seul accès à un compte
existant depuis un téléphone neuf.

## 3. La feuille de route courante

**Feuille de route courante : `v1-13-audit-et-chantiers.md`** (audit du 09/09/2026, 283 constats
contre-vérifiés, 54 chantiers ordonnés en cinq lots, les dix-huit arbitrages rendus le 10/09/2026 en §1, une
issue GitHub par chantier — #99 à #151 et #153 — et **le plan de livraison en huit vagues en §2.3**, dont
l'issue de suivi #154 est la vue cochable ; inventaire complet en `docs/audit/2026-09-09-inventaire.md`).
**Les sept premières vagues sont livrées, et avec elles les lots 0 à 3 en entier** — l'audit du
09/09/2026 n'a plus de chantier ouvert hors du lot 4. Le lot 0 (sécurité et exploitation) est parti
le 10/09/2026, le lot 1 (bugs silencieux et textes faux, puis écrans d'onglets) le 11/09/2026, puis
la vague 4 (lot 2, socle et serveur de la boucle d'engagement : saison côté client, forme insérable
du poste, période écoulée, qui reçoit quelle boucle, engagement qui survit, lien du rappel ouvert
ailleurs, rappels qui s'espacent) et la vague 5 (lot 2, **le point** : il connaît l'action engagée,
accepte une troisième réponse, reste affiché le temps de la période, porte le signal « deux fois de
suite » et varie ses répliques) le même jour. **Le jalon « publiable sur Play » est atteint côté
code** ; ce qui reste avant de publier n'est pas du code mais les vérifications de la §11 et la
checklist de `docs/exploitation/README.md`.

**La vague 6** (lot 2, la saison et le suivi) porte le jalon « la boucle existe d'une saison à
l'autre ». Son relevé de fichiers du 13/09/2026 a démenti la colonne « Parallèle ? » pour la
quatrième fois — un seul chantier y était réellement disjoint (C2.13) —, d'où l'ordre
**C2.8 → C2.7 → C3.1 → C4.6 → C2.13 → C3.9** : C2.8 (la saison a une fin et un début), C2.7 (le
suivi dans la durée : l'écart par poste, les décisions saison après saison, les points groupés, la
restitution d'un re-bilan), C3.1 (la mobilité contrainte est lue par la restitution), C4.6 (toutes
les pistes, le premier pas, le remplacement explicite), C2.13 (la mascotte porte la saison) et C3.9
(onboarding et compte : ce que le produit promet).

**La vague 7** (14/09/2026, lot 3 restant) : d'où vient le chiffre (C3.2), ce que le palier mesure
(C3.11), les deux écrans du questionnaire (C3.3), la lisibilité du questionnaire (C3.7), le ton et
la carte de partage (C3.10), les trois questions que le calcul se posait tout seul (C3.4 + C3.5 +
C3.6, une seule migration), le plan qui cesse de proposer l'impossible (C3.8) et les tests qui
manquaient (C3.12). Sa contre-lecture, le 14/09/2026, a corrigé un défaut de calcul qu'elle avait
elle-même introduit — le gain d'une substitution sur un long trajet se ramène à la personne comme sa
base — et rendu éprouvable une garde de `cadreDuPlan` qui ne l'était pas.

La suite est la vague 8 (lot 4), dont chaque chantier commence par **une page de décision**
(`v1-1N`) et non par du code : C4.1 (point quantitatif), C4.2 (coup de pouce la veille), C4.3
(déplacements professionnels), C4.4 (VAE, RER, autocar), C4.7 (retirer un bilan erroné) et C4.8
(comparaison à un an) — C4.6 ayant été avancé dans la vague 6, **C4.9 fermé le 15/09/2026 par son
expérience**, sans une ligne de code (elle a écarté l'hypothèse qui justifiait le chantier, et la
condition de réouverture est écrite en `v1-13` §7), et **C4.5 livré le 15/09/2026** — sa page de
décision `v1-15-hors-ligne.md` écrite puis exécutée le même jour ; les sept règles qui en sortent
sont dans `CLAUDE.md`, section Architecture.

**La première recette sur appareil a eu lieu le 14/09/2026, et elle verse cinq constats dans cette
vague-là** (`v1-13` §12, une issue chacun, tous repris dans le tableau de §2.3 — c'est là qu'on les
retrouve, pas seulement dans le compte rendu de séance). Deux d'entre eux ne sont pas des idées
d'increment mais des **défauts en production**, et il faut les connaître avant de toucher aux écrans
qu'ils concernent :

- **Hors ligne et à froid, la racine était un mur** (§12.5) — **et c'était `C4.5`, livré le
  15/09/2026.** Mode avion, app complètement fermée puis rouverte : « Le démarrage a échoué ».
  `src/app/index.tsx` levait quand la lecture d'`assessments` échouait **et** qu'il n'y avait pas de
  brouillon — or le brouillon est effacé à la soumission, donc toute personne ayant déjà soumis un
  bilan avait une app inutilisable au démarrage sans réseau, questionnaire compris, et tout le soin
  décrit dans `CLAUDE.md` sur les écrans hors ligne vivait **derrière** ce mur sans jamais être
  atteint à froid. Ce qui l'a refermé y est décrit aussi, au paragraphe C4.5 ; le raisonnement de C1.4 n'a
  **pas** été défait au passage — aucun écran ne s'est mis à dire « tu n'as rien ».
- **Le bouton « Se désabonner » de Gmail n'apparaît pas** (§12.6) — **et c'était `C4.9`, fermé le
  15/09/2026 par son expérience.** Un message avec les deux en-têtes n'a pas fait apparaître le
  bouton : l'en-tête manquant n'était pas la cause, donc il n'y avait rien à construire. Détail et
  condition de réouverture en `v1-13` §7, et la règle d'en-tête `List-Unsubscribe` dans `CLAUDE.md`.

Les trois autres étaient des décisions d'écran, **livrées le 15/09/2026** et tranchées dans
`v1-16-trois-decisions-decran.md` : le placement de la taille du covoiturage du trajet quotidien
(§12.2), le binaire du second mode qui n'avait pas d'état « pas encore répondu » (§12.3), et les
actions que le plan affichait sans qu'on puisse les choisir (§12.4, qui rouvrait C4.6). **Les cinq
constats de la recette sont donc clos**, et ce qu'il en reste n'est plus un constat mais une
vérification : §11.16.

## 4. Le canvas du lot 2, le design system, et le plan qui précède

**Le lot 2 a son canvas Claude Design, livré le 10/09/2026** : `docs/design/v1-14-boucle-engagement/`
(brief, HANDOFF du designer, captures, README qui consigne ce que l'implémentation corrige par rapport au
canvas) et son document d'implémentation **`v1-14-boucle-engagement.md`** — la copie (§3, seule source
des nouvelles répliques de Ramille et des textes produit), la base (§4), les composants et leur chantier
propriétaire (§5), les quatre jetons de couleur (§6), les accessoires de saison de la mascotte (§7), les
écarts assumés par rapport au canvas (§10). Un chantier du lot 2 lit v1-14 avant v1-13 pour sa partie
écran. Le **design system** formalisé à cette occasion vit dans `docs/design/design-system/` et
s'invoque comme skill (`ramille-design`, `.claude/skills/ramille-design/SKILL.md`) ; c'est une
photographie du dépôt, pas une source de vérité — en cas d'écart, le code et `CLAUDE.md` gagnent, et son
catalogue reprend des écrans du handoff V1 qui n'existent plus (mot de passe). Le plan précédent, `v1-07-audit-facteurs-et-suivi.md`
§4 — audit du 04/09/2026, 7 étapes (facteurs d'émission faux → boucle d'engagement cassée → suivi
dans la durée qui manque) — est entièrement livré. Son §1 corrige deux erreurs de chiffre documentées ailleurs
comme des choix assumés : l'API Impact CO2 **distingue bien** court/moyen/long-courrier (la
valeur du mode avion dépend du paramètre `km` de la requête, contrairement à ce qu'affirme le
commentaire du seed initial), et le poste voyages en train était calculé au facteur TER. Son §2
liste les défauts vérifiés (T1-T13) auxquels les autres documents renvoient.

## 5. Backlog — identifié, non planifié

**Backlog / idées identifiées mais non planifiées** : pas de fichier ROADMAP dédié — suivi via
les GitHub Issues de ce repo (ex. #27-30 : synchronisation automatique des facteurs ADEME,
trajectoire 2050 sur l'écran de restitution, canal de feedback utilisateur, tracking
d'usage/segmentation). Le jeu "pas = monnaie" évoqué le 04/09/2026 est explicitement hors
roadmap de ce repo (projet à part, voir `v1-06-partage-social.md` §1).
