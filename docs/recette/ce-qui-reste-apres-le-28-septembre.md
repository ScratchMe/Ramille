# Recette web — ce qui reste après la séance du 28 septembre

> **Écrite le 28/09/2026**, le soir de la séance jouée par l'agent sur
> [`le-compte-et-les-modes.md`](le-compte-et-les-modes.md) (`v1-13` §15). Elle ne rejoue rien de ce
> qui est revenu conforme : elle ne porte que **ce que cette séance a laissé** — les correctifs à
> revoir sur la production, les lignes qu'on ne pouvait pas jouer en une soirée, et les jugements
> qui reviennent à la personne qui pilote. **Jouée le : ………**
>
> À jouer **dans un navigateur**, sur `https://www.ramille.fr`, **une fois la PR des correctifs de la
> séance fusionnée et déployée** — avant, le bloc 01 ne trouverait que les défauts d'hier. **Et sur
> deux jours** : le bloc 02 a besoin de deux bilans de **dates différentes**, parce que le suivi ne
> garde qu'un bilan par jour (c'est ce qui a fait tomber trois lignes le 28/09, `RECETTE.md` §1.9).

## Pourquoi cette séance, et ce qu'elle ne fait pas

Cinq défauts ont été corrigés le soir même, et deux décisions de produit ont changé ce que l'écran
doit montrer. **Aucun de ces correctifs n'a été vu sur la production** : ils sont gardés par Jest et
par le parcours réel, contre une stack locale. Cette séance les regarde là où la personne les verra.

| | Sujet | D'où ça vient |
|---|---|---|
| 1 | « Retour » sans rien derrière — les pistes, les pages légales, « Toi », `/contexte`, `/feedback` | H1 (`v1-13` §15) |
| 2 | Un renvoi de code refusé garde les chiffres | H2 |
| 3 | Pas de barre « Ton prochain palier » pour qui sort rarement | 10.2, décidé le 28/09 |
| 4 | Un bilan refait le même jour ne se compare à rien | H4, décidé le 28/09 |
| 5 | « Toi » après la suppression du compte | H5 |
| 6 | Le suivi et la restitution sur deux jours, et la légende de l'écart par poste | 10.9 et 11.W.7, pas jouables en une soirée |
| 7 | Les jugements qui reviennent à la personne qui pilote | 12.2, 11.W.9 |

**Elle ne rejoue pas le reste** : les 82 lignes conformes du 28/09 sont comptées en `v1-13` §15 et
consignées une à une dans la base de l'artefact de la feuille précédente, et le parcours réel rejoue
le chemin nominal à chaque PR.

## Qui la joue

**L'agent peut jouer les blocs 00 à 02 et 04**, comme le 28/09 (`RECETTE.md` §1.9 et §2.6), avec les
alias `…+ramille-p3@gmail.com` et `…+ramille-p4@gmail.com` — jamais une adresse qu'on ne contrôle
pas. **Le bloc 03 revient à la personne qui pilote** : ce sont des jugements, et l'agent y laisse les
lignes muettes avec son avis et ses captures.

## Trois précautions qui décident du résultat

- **C'est la production.** Les comptes créés sont réels et les e-mails partent vraiment. Supprimer
  les comptes à la fin (bloc 04), et régler les rappels sur **« Sans rappel »** pour tout compte gardé
  d'un jour sur l'autre — sans quoi un vrai rappel partirait (`RECETTE.md` §2.3).
- **Deux navigateurs, ou deux contextes sans stockage partagé**, comme la feuille précédente : les
  fenêtres privées de Chrome partagent leur stockage entre elles.
- **Une minute entre deux codes pour la même adresse** : c'est la limite du distant, et la ligne
  01.8 **s'en sert**.

## Comment consigner

Trois états, **jamais deux** : **conforme**, **écart**, **non joué**. Une case laissée vide est
*muette*, et se lit « non joué ». Et **noter ce qui a été vu, pas son interprétation**.

## Les profils

On reprend les deux profils de [`le-compte-et-les-modes.md`](le-compte-et-les-modes.md), **saisis à
la lettre** — leurs tableaux sont là-bas, avec ce qu'ils rendent :

- **le profil 1** (le rouleur du RER) : **2,5 t**, **dix pistes**, et le lien « Voir toutes les pistes
  · 10 » — c'est lui qu'il faut pour l'écran des pistes ;
- **le profil 2** (le cycliste qui sort rarement) : **58 kg**, poste dominant « loisirs
  occasionnels », **aucune action** ; puis, au bloc 02, le même en **Voiture (seul) → Thermique**,
  **570 kg** environ.

Les facteurs ADEME se resynchronisent le **1er octobre** : les kilos peuvent glisser de quelques
unités, pas doubler, et les rangs ne bougent pas.

---

## Bloc 00 — Avant de commencer

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 00.1 | Ouvrir `https://www.ramille.fr/status` | « OK — N modes de transport en base » | |
| 00.2 | Vérifier que les correctifs sont servis : ouvrir `https://www.ramille.fr/conditions` dans une fenêtre neuve et toucher **« Retour »** | On quitte la page (vers l'accueil). **Si rien ne se passe, la PR n'est pas encore déployée : arrêter là** et revenir plus tard — tout le bloc 01 le supposerait | |

## Bloc 01 — Les correctifs du 28 septembre (jour 1)

> Chaque ligne regarde un défaut **trouvé le 28/09 et corrigé le même soir**, jamais vu sur la
> production depuis. Le plus coûteux était H1 : sur le web, chaque écran est une vraie adresse, et un
> « Retour » qui dépile une pile vide **ne fait rien du tout** — la personne reste enfermée.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 01.1 | **Navigateur A**, fenêtre neuve : saisir le **profil 1** jusqu'au plan, puis « Compris » | Le plan, « Voir toutes les pistes · 10 » | |
| 01.2 | Ouvrir **par son adresse** `https://www.ramille.fr/plan/pistes`, puis **« Retour au plan »** | On arrive sur **le plan**. Le 28/09, le lien ne faisait rien | |
| 01.3 | De nouveau `/plan/pistes` par son adresse, **recharger** (F5), puis toucher **« Choisir »** sur une ligne, une échéance, **« C'est noté »** *(« Je m'y engage » a disparu de ce chemin le 29/09/2026 : la carte s'ouvre sur la question, `v1-32`)* | On arrive sur **le plan**, l'action en tête sous « TON ENGAGEMENT ». Le 28/09, on restait sur les pistes | |
| 01.4 | Ouvrir par leur adresse, chacune dans l'onglet courant : `/contexte`, puis « Retour » ; `/feedback`, puis « Annuler » ; `/compte`, puis « Retour » | À chaque fois **on quitte l'écran** : le plan pour `/contexte`, l'accueil ou le plan (la racine décide) pour les deux autres | |
| 01.5 | `/confidentialite` et `/conditions` par leur adresse, puis « Retour » | On quitte la page | |
| 01.6 | « Toi » → « Rattacher un compte » → « Utiliser un email à la place » → `…+ramille-p3@gmail.com` → « Recevoir un code » | L'écran « Regarde tes emails », champ « Code reçu par email » | |
| 01.7 | **Sans attendre**, taper **sept** chiffres au hasard dans le champ (pas huit : au huitième il se vérifie) | Les sept chiffres dans le champ | |
| 01.8 | **Moins d'une minute après l'envoi**, « Renvoyer un code » | **« Trop de demandes coup sur coup. Réessaie dans quelques minutes. »** — et **les sept chiffres sont toujours là**. Le 28/09, le champ se vidait alors qu'aucun code n'était parti | |
| 01.9 | Attendre la minute, « Renvoyer un code » | **« Un nouveau code vient de partir. »**, et **le champ est vide** : l'ancien code ne vaut plus | |
| 01.10 | Taper le code reçu | « Ton compte est rattaché à … » | |
| 01.11 | **Navigateur B**, fenêtre neuve : saisir le **profil 2** | La restitution : 58 kg, « Tes loisirs occasionnels », « Tu es déjà sous le repère transport 2050. » | |
| 01.12 | Dans « Où tu te situes » | **Trois barres seulement** : « Toi », « Moyenne en France », « Repère transport 2050 ». **Pas de « Ton prochain palier »** (décision du 28/09 : il chiffrait une marche sur des sorties non déclarées) | |
| 01.13 | « Voir ce que je peux faire », « Compris » sur « Deux endroits, pas plus. », puis **« Revoir mon bilan » → « Faire un nouveau bilan »**, et soumettre **à l'identique** | La restitution du second bilan **ne compare rien** : ni « Ton bilan précédent · septembre », ni « Stable par rapport à ton bilan de septembre. » — la phrase qu'un bilan identique ferait sortir si la comparaison revenait. Un bilan refait le même jour est une correction (décision du 28/09) | |
| 01.14 | Le suivi | **Un seul bilan**, celui du jour | |
| 01.15 | « Toi » : rattacher le profil 2 à `…+ramille-p4@gmail.com` (le code), puis régler les rappels sur **« Sans rappel »** | Le compte est rattaché. **On le garde pour le bloc 02** | |
| 01.16 | **Navigateur A** (profil 1) : « Toi » → « Supprimer mon compte » → « Supprimer définitivement » | Sous le titre « Toi », la carte « C'est fait. » et « Revenir au début ». **Ni l'adresse, ni « Me déconnecter de cet appareil », ni les rappels, ni « Mon contexte de mobilité », ni « Un retour à nous faire ? »**, ni « Retour » en haut. Restent en bas « Confidentialité », « Conditions d’utilisation » et l'adresse de contact. Le 28/09, tout restait affiché au-dessus du compte supprimé | |
| 01.17 | « Revenir au début » | L'accueil de l'onboarding | |

## Bloc 02 — Deux jours (jour 2, ou n'importe quel jour suivant)

> **Ce bloc se joue un autre jour que le bloc 01**, heure de Paris : c'est la condition même de ce
> qu'il regarde. Joué le même jour, il reproduirait les trois lignes tombées le 28/09.

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 02.1 | Se reconnecter au profil 2 si besoin : `/connexion/retrouver`, `…+ramille-p4@gmail.com`, le code | Le plan du profil 2, sans action | |
| 02.2 | « Revoir mon bilan » → « Faire un nouveau bilan » : tout pareil, sauf le mode du trajet → **Voiture (seul)** → **Thermique** ; soumettre | La restitution dit **570 kg** environ, et **cette fois compare** : « Ton bilan précédent · septembre » (ou le mois du bloc 01) et « … de plus que ton bilan de septembre. Une année n'est pas l'autre. » | |
| 02.3 | Le suivi | **Deux** bilans, à deux dates. L'entrée du premier dit **« Poste principal : Loisirs occasionnels »** | |
| 02.4 | L'écart par poste, sous les deux bilans | La légende : « Contour : bilan précédent · plein : ce bilan · accent : **ton trajet domicile-travail, ton poste principal** ». **Jamais « le poste sur lequel ton plan travaille »** (la ligne 10.9 du 28/09) | |

## Bloc 03 — Ce qui revient à la personne qui pilote

> **Des jugements, pas des conformités.** Si l'agent a joué la séance, ces lignes sont **muettes**
> dans la feuille, avec son avis et ses captures à côté : c'est ici qu'on tranche.

| # | Ce qu'on regarde | La question | Constat |
|---|---|---|---|
| 03.1 | **La question du point mensuel** du bloc 12 de la feuille précédente, joué le 1er octobre — sur ses captures, le compte de ce profil étant supprimé ensuite (14.3) : les boutons « Oui » et « Non » | Ont-ils **le même poids visuel** — ni l'un vert plein et l'autre gris, ni l'un plus grand ? (`v1-29`, décision n° 2) | |
| 03.2 | **L'e-mail « Cette adresse vient d'être saisie dans Ramille »** (celui du 01.6) | Relu **à la place de quelqu'un qui n'a rien demandé** : est-il clair en deux secondes que ça ne parle pas d'un compte à soi, et qu'il n'y a rien à faire ? (`v1-13` §11.W.9) | |
| 03.3 | **Le code à huit chiffres**, de la messagerie vers l'app | Se recopie-t-il sans effort — pas coupé par un retour à la ligne, pas collé avec une espace, lisible en petit ? | |

## Bloc 04 — Refermer la séance

| # | Ce qu'on fait | Ce qu'on doit voir | Constat |
|---|---|---|---|
| 04.1 | Supprimer le compte du profil 2 depuis « Toi » | Comme au 01.16 | |
| 04.2 | `/connexion/retrouver` avec `…+ramille-p3` puis `…+ramille-p4` (une minute d'écart) | L'écran ne dit rien, et c'est voulu. **Aucun e-mail n'arrive** : les deux comptes n'existent plus | |

## Ce qui ne se joue pas ici

- **Le retour hors ligne après le retrait du seul bilan** (ligne 09.10 du 28/09) : au web, recharger
  réseau coupé rend la page d'erreur du navigateur. C'est `v1-13` §11.23, sur appareil.
- **L'écran du mode** (ligne 02.10) : jugé pénible le 28/09, il part en brief de design
  ([#289](https://github.com/ScratchMe/Ramille/issues/289),
  [`v1-31`](../design/v1-31-l-ecran-du-mode/BRIEF.md)) ; le jugement au doigt (§11.19) se rendra sur
  ce qui en sortira.
- **Le mot de la veille, les notifications, TalkBack** : `v1-13` §11, après le build du 1er octobre.
- **L'oracle d'adresse au réseau** : un 422 dans la console sur une adresse prise, c'est **attendu**
  et documenté (`v1-28` §7.1) — pas un écart.

## Ce que cette séance ne prouve pas

- **Qu'aucun autre « Retour » ne dépile une pile vide** : le balayage du 28/09 a corrigé tous ceux
  qu'il a trouvés, et les écrans suivants devront passer par `revenirOu` (`src/lib/navigation.ts`,
  règle en `FRONT.md` §2.8) pour que ça reste vrai.
- **Le bloc 12 de la feuille précédente**, programmé le 1er octobre après 8 h : s'il n'a pas pu se
  jouer ce jour-là, il se rejoue tel qu'il est écrit là-bas, **avec le mois qui aura été interrogé**.

## Où atterrissent les constats

Dans `docs/architecture/v1-13-audit-et-chantiers.md`, **une section par séance**, sur le modèle des
§14 et §15 : ce que la séance a trouvé, une issue par constat, et l'accrochage à une vague. Les lignes
de §11 et de §11.W qui auraient été jouées le disent en tête de leur case.
