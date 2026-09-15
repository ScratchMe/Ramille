# v1-15 — Hors ligne : la racine cesse d'être un mur

**Date** : 15/09/2026. **Statut** : page de décision écrite avant tout code — c'est la règle du
lot 4 (`v1-13` §7) — puis **livrée le même jour** (§11, qui porte les deux écarts au plan).
**Chantier** : C4.5, [#147](https://github.com/ScratchMe/TraceVerte/issues/147),
requalifié par la recette sur appareil du 14/09/2026
([#180](https://github.com/ScratchMe/TraceVerte/issues/180), `v1-13` §12.5).
**Constats** : A1-5, A10-9, A6-15.

**Ce que ce document tranche** : comment la racine se comporte sans réseau, ce qu'on persiste
localement pour y arriver, et ce qu'on ne persiste pas. **Ce qu'il ne tranche pas** : l'instantané du
plan, reporté avec sa raison en §7. La copie neuve, elle, n'a finalement pas lieu d'exister — aucune
phrase n'a été écrite, cf. §6.

---

## 1. Le fait

Mode avion, app **complètement fermée** puis rouverte : « Le démarrage a échoué », suivi du
`Unable to resolve host …` d'Android, en anglais. Aucune des trois destinations de la racine n'est
atteinte, et **rien de l'app n'est utilisable**.

La branche qui lève est dans `src/app/index.tsx` :

```ts
if (error && !brouillon) throw error;
```

Le brouillon de questionnaire est effacé à la soumission. Donc ce mur vaut pour **toute personne
ayant déjà soumis un bilan** — c'est-à-dire pour tous les comptes que le produit veut garder, et
seulement pour eux. Quelqu'un qui n'a jamais fini son questionnaire passe, parce que son brouillon
le sauve.

Deux précisions relevées en écrivant le constat, qui évitent de chercher au mauvais endroit :

- **ce n'est pas `ensureSession()` qui lève.** Un jeton stocké dont le rafraîchissement n'aboutit
  pas rend l'état `indisponible` (C2.11, `src/types/session.ts`) et la fonction sort sans rien
  créer — ce qui est exactement le bon comportement. C'est la lecture PostgREST qui échoue ensuite.
  Sur une **installation neuve** hors ligne, en revanche, c'est `signInAnonymously()` qui lève :
  même écran, autre cause, et le correctif doit couvrir les deux ;
- **la racine interroge la base même quand la session est `indisponible`**, et si le réseau revenait
  entre les deux appels la requête partirait sans session. Elle rendrait alors `42501`, pas zéro
  ligne, parce qu'`anon` n'a **aucun** privilège sur `assessments` (relevé le 14/09/2026). Le chemin
  « zéro ligne → `/onboarding` » n'existe donc pas, et c'est le `grant` explicite qui le ferme, pas
  la racine. Ne pas accorder `select` à `anon` sur cette table en croyant réparer autre chose.

## 2. La moitié « session expirée » est déjà livrée : le chantier se réduit

Le titre de C4.5 dit « Hors-ligne : ouvrir sur le dernier plan connu ; **session expirée** », et
A6-15 est l'un de ses trois constats. **Cette moitié est faite.** C2.11 a livré `src/types/session.ts`
(quatre états, dont `refusee` et `indisponible` distingués) et l'écran `SessionRefusee`, une surcouche
du `Stack` qui propose de retrouver son compte ou de commencer. La contre-vérification d'A6-15 disait
d'ailleurs que le reste à faire était « étroit », et c'est ce qui a été fait.

Ce qu'il faut en retenir pour la suite : **C4.5 ne porte plus que l'hors-ligne**, et la distinction
`refusee` / `indisponible` dont il a besoin existe déjà. Il consomme un socle, il ne le construit pas.

## 3. Ce que le mur cache, et qui est déjà écrit

Tout le soin de C1.4 vit **derrière** cette racine et n'est jamais atteint à froid : les lectures qui
rendent `{ ok: true, data } | { ok: false }` plutôt que « erreur → tableau vide », la ligne de
relecture logée à côté du `LoadState` et jamais dans sa variante `ok`, l'écran d'erreur atteignable
seulement depuis `loading`, et les états vides qui restent des affirmations sur les données de la
personne. Ce chantier ne réécrit rien de cela : il ouvre la porte pour qu'on y arrive.

Et une chose que le mur cache aussi : **le questionnaire se remplit très bien sans réseau**
(brouillon AsyncStorage). Sa seule entrée est l'état vide d'un onglet ou l'onboarding, donc derrière
la racine. C'est la perte la plus absurde du défaut — la seule chose qui marche hors ligne est la
seule qu'on ne peut pas atteindre.

---

## 4. Décision 1 — reconnaître la coupure réseau au **type**, jamais au message

**Décidé.** L'écran technique actuel reste, et il reste **pour les erreurs serveur** : son registre
développeur est une décision explicite (commentaire de `index.tsx`, en-tête de
`configuration-manquante.tsx`), et le message brut y est destiné à être recopié. La coupure réseau
devient un **second** état, en français, sans jeton technique.

**La distinction ne se fait pas sur le libellé de l'exception.** « Network request failed », « Failed
to fetch », « Unable to resolve host … » varient selon la plateforme, la version et la langue du
système : reconnaître au message refabriquerait exactement le piège que ce dépôt documente pour
`over_email_send_rate_limit` et pour `PGRST303`.

**Et elle ne se fait pas non plus sur l'absence de `code`** — c'est le critère que cette page
proposait avant d'avoir lu le SDK, et il est faux. Relu le 15/09/2026 dans `@supabase/postgrest-js`
2.116.0 : le `catch` du transport rend bien une erreur sans `code`
(`{ message, details, hint, code: '' }`), mais il rend **aussi** `status: 0` — et surtout **trois
autres chemins** du même paquet rendent une erreur sans `code` en portant un statut bien réel : un
corps non-JSON sur une réponse 2xx, un corps d'erreur illisible, un 404 au corps vide. Un critère
fondé sur le `code` classerait ces trois-là « pas de connexion » devant un serveur qui a
parfaitement répondu. Le discriminant est donc **`status === 0`**, et il tient parce que `status`
vit sur `PostgrestResponseBase` : il arrive jusqu'à l'appelant, ce qui n'était pas garanti avant de
le vérifier.

C'est la leçon de `PGRST303` prise par l'autre bout : là-bas un code seul ne suffisait pas à
distinguer deux causes, ici l'absence d'un code ne suffit pas à en nommer une. Le mauvais critère
est rendu **inexprimable** plutôt qu'interdit — `lireLeBilan` ne reçoit pas de `code` du tout — et
une assertion dit pourquoi, pour que personne ne l'ajoute.

**La coupure a deux points d'entrée, et le second s'est révélé à l'écriture.** `ensureSession()` lève
sur l'échec de la **création** d'une session — les trois autres états sortent sans rien faire
(C2.11) — et c'est précisément le cas de l'installation neuve hors ligne. La racine ne relance donc
plus cette erreur quand `estPanneDeTransport` la reconnaît : elle note la coupure et **n'interroge
pas la base non plus**. Sans session, la requête partirait en `anon`, qui n'a aucun privilège sur
`assessments` (§1), et le `42501` se lirait « erreur serveur » là où c'est le réseau — l'écran
technique en anglais pour une panne de wifi, c'est-à-dire le défaut que ce chantier ferme, atteint
par un autre chemin.

**Où ça vit** : `src/types/demarrage.ts`, module **pur** et testé, qui porte les deux dérivations —
`lireLeBilan` (lue / coupure / erreur) et `destinationDuDemarrage` (la table de §6). Attention au
nom : `estPanneDeTransport` est déjà pris dans `src/types/connexion.ts` et traite les erreurs
d'`auth-js`, reconnues par leur `name` — c'est une autre famille, un autre test, et les confondre
ferait passer l'un pour l'autre. Les deux se côtoient d'ailleurs dans la racine, chacune sur la
sienne : celle de `connexion.ts` sur l'échec d'`ensureSession()`, celle de `demarrage.ts` sur la
réponse PostgREST.

## 5. Décision 2 — la marque locale, et ce qu'elle autorise

**Décidé.** On persiste **un fait, pas des données** : « cet appareil a vu un bilan complété ».
Une clé AsyncStorage, `traceverte.a_un_bilan.v1`.

**Le préfixe historique `traceverte.` n'est pas négociable.** C'est par ce préfixe que
`src/lib/compte.ts` balaie les marques locales à la suppression de compte. Une clé écrite sous un
autre préfixe survivrait à la suppression, et l'app router**ait** ensuite vers un plan qui n'existe
plus, en promettant quelque chose à quelqu'un qui vient de tout effacer. Le balayage est par préfixe
précisément pour ne pas avoir à tenir une liste à jour ; en sortir, c'est le casser.

**Écrite** quand une lecture **réussie** trouve un bilan complété — donc à la racine, et à la
soumission. Pas besoin de rattrapage : le premier lancement en ligne de n'importe quel compte
existant la pose.

**Et voici la vraie raison de cette marque, qui n'est pas le routage.** Sans elle, l'app ne peut rien
dire de vrai sur la personne hors ligne : c'est tout le raisonnement de C1.4, et c'est pourquoi la
racine préfère aujourd'hui lever plutôt que de router vers `/onboarding` en disant « tu n'as rien ».
Avec elle, une phrase devient honnête. A1-5 en proposait une :

> « Pas de connexion pour l'instant. Ton bilan et ton plan t'attendent, on réessaie dès que ça
> revient. »

Cette phrase **affirme** quelque chose sur les données de la personne. Elle est interdite aujourd'hui
et elle devient juste dès que la marque est là. **La marque n'est pas un cache : c'est ce qui autorise
une phrase.** Formulation exacte à reprendre avec le canvas ; elle ne porte aucun chiffre, donc elle
ne heurte pas les règles de la mascotte — à condition de ne pas coller Ramille à côté d'un total.

**La propriété qui rend tout ça robuste : la marque n'est consultée qu'en repli, jamais comme source
de vérité.** Si la lecture réussit, c'est elle qui décide, toujours. La marque ne parle que dans la
branche où l'on ne sait rien. Une marque fausse ne peut donc pas contredire le serveur — au pire elle
oriente mal quelqu'un pendant une panne de réseau, et la §9 dit ce que ça coûte.

## 6. Décision 3 — l'autre branche est `/onboarding`, et le questionnaire redevient atteignable

**Décidé, et c'est le point que j'avais d'abord manqué.** J'ai commencé par vouloir ajouter une entrée
au questionnaire sur l'écran d'erreur du plan. C'est une mauvaise idée : C1.4 a **délibérément retiré**
« Faire mon bilan » de cet écran — « les deux replis d'avant affirmaient quelque chose sur les données
de la personne ». Y revenir serait défaire une décision réfléchie pour contourner un problème qui se
résout ailleurs.

Le repli correct pour un appareil **sans** marque est `/onboarding`, et pour trois raisons :

- l'onboarding **n'affirme rien** sur les données de la personne. C'est une présentation du produit,
  pas un constat sur son compte. La raison qui interdit « Faire mon bilan » sur un écran d'erreur ne
  s'y applique pas ;
- il **marche hors ligne** de bout en bout, et il mène au questionnaire, qui marche aussi. Le trou
  décrit en §3 se referme sans toucher à un seul écran d'onglet ;
- il porte **« J'ai déjà un compte »** sur son accueil (C3.9, `v1-10` §2.D). C'est exactement le
  recours dont a besoin le seul cas où l'absence de marque est trompeuse : un téléphone neuf, ou un
  stockage local vidé, chez quelqu'un qui a bien un compte. Le lien ne marchera pas sans réseau, mais
  il est là, il se voit, et il dit à la personne que ce chemin existe.

La racine se réduit donc à :

| Lecture | Marque | Destination |
|---|---|---|
| réussie | — | inchangé : `/plan`, `/bilan?reprise=1` ou `/onboarding` |
| échouée, **coupure réseau**, brouillon | — | `/bilan?reprise=1` — inchangé, et déjà le cas |
| échouée, **coupure réseau** | présente | `/plan` |
| échouée, **coupure réseau** | absente | `/onboarding` |
| échouée, **erreur serveur** | — | l'écran technique actuel, message brut compris |

Hors ligne, **le brouillon passe devant la marque**, à l'inverse de la règle en ligne où un bilan
complété gagne sur un questionnaire commencé (C3.9). Ce n'est pas une incohérence : le questionnaire
se remplit sans réseau, le plan non. Router vers le plan retirerait à la personne la seule chose
qu'elle pouvait faire — et c'est déjà ce que la racine fait aujourd'hui, donc l'inverser serait une
régression. Une assertion le dit.

**Le bandeau doux de §5 n'a pas été écrit, et c'est une simplification, pas un oubli.** La phrase que
§5 autorise devait vivre sur `/plan`, où la lecture vient d'échouer — donc sur l'écran
`erreur_reseau`, qui existe depuis C1.4 et dit déjà « Ton plan n'a pas pu être relu. Vérifie ta
connexion. », avec un « Réessayer » et la barre d'onglets intacte. C'est en français, ça n'affirme
rien de faux, et ça ne parle pas des données de la personne : superposer un second bandeau aurait
fait deux messages de réseau sur le même écran. Ce que la marque autorise reste acquis — c'est elle
qui rend cet écran-là atteignable au lieu de l'écran technique — mais elle n'a pas eu besoin d'une
phrase de plus pour le faire. Corollaire à tenir : **aucun drapeau `horsLigne` ne descend de la
racine vers le plan.** Il serait la seule chose à devoir rester juste entre deux écrans, pour une
information que l'onglet relit lui-même à chaque retour.

**Une seule ligne de l'ancien raisonnement tombe**, et il faut le dire franchement : le commentaire
qui explique aujourd'hui pourquoi on s'arrête plutôt que de router vers `/onboarding` cesse d'être
vrai le jour où la marque existe. Il ne se supprime pas, il se réécrit — c'est lui qui portera la
raison pour laquelle la distinction est désormais possible.

## 7. Décision 4 — l'instantané du plan : **reporté**, et ce n'est pas de la paresse

**Décidé : on ne le fait pas dans ce chantier.** C4.5 promettait « un instantané du dernier plan »
pour ouvrir l'app en lecture. Trois raisons de le sortir du périmètre, dont la dernière est la vraie :

- **la contre-vérification d'A1-5 le dit elle-même** : « l'instantané local du plan est le vrai
  correctif de fond mais dépasse l'effort *moyen* annoncé » ;
- **il ne répare pas ce qui fait mal.** Le défaut est que rien n'est atteignable ; §5 et §6 le
  referment. L'instantané ajoute du confort par-dessus une app qui marche déjà ;
- **il crée un troisième endroit où vivent les chiffres de la personne.** Tout ce dépôt repose sur
  l'inverse : `assessment_results` **fige** le résultat, `plan_actions` fige les gains, et rien n'est
  recalculé à la volée côté client. Un instantané local est une seconde copie de ces nombres, qui
  vieillit, qu'aucune migration ne suit, et qui affichera un cap périmé le jour où le serveur en a
  changé. Ce n'est pas impossible à faire correctement — il faut un horodatage, une péremption, et
  une phrase qui dise que c'est une photo — mais c'est **sa propre décision**, pas une annexe de
  celle-ci.

À rouvrir comme chantier distinct si l'usage le demande. Le noter ici évite qu'il revienne par la
porte de derrière au milieu d'une implémentation.

## 8. Décision 5 — le réessai au retour de connectivité : **reporté aussi**

A1-5 recommandait « avec réessai automatique au retour de connectivité ». Reporté, pour une raison
simple : `useRafraichirAuRetour` fait déjà l'essentiel. Les deux onglets relisent au focus **et** au
retour de l'app au premier plan, donc quelqu'un qui retrouve du réseau et rouvre l'app voit son plan.
Ce qui manquerait est le cas « l'app reste ouverte, immobile, et le réseau revient » — un écouteur de
connectivité, donc une dépendance de plus et un chemin de plus à éprouver, pour un gain que le geste
naturel (revenir sur l'app) couvre déjà. À rouvrir si la recette montre le contraire.

## 9. Le risque de la sauvegarde restaurée, et son coût exact

`allowBackup` est **absent** d'`app.json` (vérifié le 15/09/2026), donc vrai par défaut sur Android :
la marque revient sur un appareil restauré depuis une sauvegarde, où elle peut être fausse.

Le coût, précisément : un **visiteur réellement neuf** sur un appareil restauré, **hors ligne**,
serait envoyé vers `/plan` au lieu de l'onboarding. Il y verrait l'écran d'erreur du plan avec son
« Réessayer », au lieu d'une présentation qu'il pouvait parcourir et d'un questionnaire qu'il pouvait
remplir. C'est étroit — trois conditions simultanées — mais ce n'est pas nul, et c'est la seule
situation où la marque nuit.

Trois façons d'y répondre, et je recommande la troisième :

1. **`allowBackup: false`** — règle le problème et en crée un plus gros : le brouillon de
   questionnaire, la marque d'ouverture de saison et le jeton d'appareil cesseraient tous de survivre
   à un changement de téléphone. Non.
2. **Attacher la marque à l'identifiant d'utilisateur observé**, et ne la croire que si la session
   courante porte le même. Correct, mais hors ligne on n'a souvent pas d'identifiant — un
   rafraîchissement qui n'aboutit pas ne rend aucune session (C2.11). La garde serait donc muette
   précisément quand on en a besoin.
3. **Accepter la marque fausse et rendre son erreur bénigne.** C'est déjà presque le cas : le seul
   coût est un écran d'erreur au lieu d'un onboarding, et un « Réessayer » qui ne mène nulle part sans
   réseau. Il suffit que cet écran ne soit pas un cul-de-sac. **À trancher avec le canvas** :
   l'écran d'erreur du plan gagne-t-il une sortie vers l'onboarding ? Elle n'affirmerait rien sur les
   données de la personne si elle est formulée comme un fait sur le **produit** — « Découvrir Ramille »
   plutôt que « Faire mon bilan » — ce qui est précisément la distinction que C1.4 fait. Si la réponse
   est non, on garde le coût : il est petit, et il est écrit ici.

---

## 10. Ce que ce chantier ne répare pas

- **`/suivi` hors ligne reste un écran d'erreur**, et c'est juste : il n'a rien à montrer sans
  lecture, et lui inventer un repli serait la faute de C1.4.
- **Le message technique reste en anglais pour les erreurs serveur.** C'est voulu (§4).
- **Rien ne devient consultable hors ligne** au-delà du questionnaire : voir §7.
- **§11.5 devient faisable**, elle n'est pas faite. Le parcours écran par écran en mode avion reste à
  jouer sur appareil après ce chantier — c'est même lui qui dira si les deux phrases neuves tiennent.

## 11. Plan d'exécution

**Livré le 15/09/2026**, dans cet ordre. Les deux écarts au plan initial sont le critère de §4
(`status === 0` et non l'absence de `code`) et le bandeau de §6, qui n'a pas eu lieu d'être écrit ;
les deux sont consignés dans leur section.

1. **Lire le SDK** et trancher la forme de la coupure réseau (§4). Rien d'autre ne commence avant —
   et c'est ce qui a évité d'écrire le mauvais critère, puis de bâtir un test qui l'aurait consacré.
2. **La dérivation pure**, `src/types/demarrage.ts` avec son test : coupure réseau ou non, et la
   destination de la racine à partir du triplet (lecture, marque, brouillon). La table de §6 est
   écrite pour être un test, et elle l'est devenue ligne par ligne.
3. **La marque**, `src/lib/marque-de-bilan.ts` avec son test qui double AsyncStorage — comme
   `bilan-draft`, `connexion-prefs` et `saison-prefs` (§Tests de CLAUDE.md). Le balayage par préfixe
   de `src/lib/compte.ts` y est **rejoué** plutôt que lu : `getAllKeys`, filtre sur `traceverte.`,
   `multiRemove`, puis on vérifie que la marque a disparu. Ce que l'assertion prouve est que la clé
   **tombe** sous ce balayage ; que `compte.ts` le fasse bien reste son propre code.
4. **La racine**, qui ne fait que consommer les deux. Son commentaire est réécrit (§6), et elle a
   gagné le second point d'entrée de la coupure (§4, avant-dernière puce). La marque s'écrit aussi
   **à la soumission du questionnaire** : celui-ci mène à la restitution puis au plan sans repasser
   par la racine, donc sans cette ligne la marque n'existerait qu'au prochain lancement en ligne, et
   quelqu'un qui soumet son premier bilan puis rouvre l'app sans réseau retomberait sur l'onboarding.
5. **Le bandeau** : sans objet, cf. §6.
6. **`?rappel=1` traverse toujours, vérifié.** Le paramètre n'est lu qu'à un seul endroit
   (`src/app/(tabs)/plan.tsx`, `vientDUnRappel`) et uniquement dans la branche `no_assessment`. Le
   lien du rappel arrive **directement** sur `/plan`, jamais par la racine, donc la nouvelle route
   vers `/plan` ne peut pas lui retirer sa chaîne de requête ; et les deux ne se rencontrent pas non
   plus par accident, cette route n'existant que sur une coupure, où le plan résout `erreur_reseau`
   et non `no_assessment`. Rien à écrire, donc — mais il fallait le regarder : la conclusion n'est
   pas « ça n'a pas de raison de casser », c'est que les deux chemins ne se croisent nulle part.

## 12. Ce qu'il ne faut pas casser

- **Le préfixe `traceverte.`** de la clé (§5). Une marque qui survit à une suppression de compte est
  une promesse faite à quelqu'un qui a tout effacé.
- **La marque n'est jamais consultée quand la lecture a réussi.** Le jour où elle le sera, elle
  deviendra une seconde source de vérité — et fausse.
- **L'écran technique et son message brut** pour les erreurs serveur (§4).
- **Aucun repli sur `/suivi`**, ni retour de « Faire mon bilan » sur un écran d'erreur, sauf décision
  explicite en §9 point 3.
- **`anon` n'obtient pas `select` sur `assessments`** (§1, troisième puce).
