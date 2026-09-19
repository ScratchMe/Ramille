# v1-25 — Le mot de la veille, et les quatre garanties qu'il touche

> **Page de décision du chantier C4.2** ([#144](https://github.com/ScratchMe/Ramille/issues/144)),
> cinquième des six du lot 4. Écrite le 19/09/2026. Elle porte l'arbitrage **D10**.

## 1. D'où ça vient

Constat A13-11. Le rappel du produit est **rétrospectif** : il arrive après la période et demande
ce qui s'est passé. La recherche sur les intentions d'implémentation place le signal utile au
moment de la **décision** — la veille au soir du jour qu'on s'est fixé.

La proposition de la fiche : un opt-in distinct (« Un mot la veille de mes jours ? »), une ligne de
Ramille sans chiffre, uniquement pendant les ~10 premières semaines d'un engagement, jamais après
un refus, dans une table à part ou une ligne d'outbox sans `checkin_id`.

L'arbitrage **D10** a été rendu le 10/09/2026 : « **increment à instruire**, opt-in, borné dans le
temps. Pas avant C2.1 et C2.2. » Les deux dépendances sont livrées depuis le 11/09.

## 2. L'état des lieux, relevé le 19/09/2026

`notification_outbox` porte dix-huit colonnes et, surtout, **`UNIQUE (checkin_id)`** avec une clé
étrangère `ON DELETE CASCADE` vers `engagement_checkins`. C'est la garantie anti-relance de la spec
§7, et elle est **structurelle** : un point, un message, jamais deux, quel que soit le canal et le
nombre de passages du cron. Le repli push → email est une *mise à jour de la même ligne*.

La préférence de canal vit dans `profiles.reminder_channel` — **une seule colonne**, trois valeurs
(`push` / `email` / `none`), résolue en un seul endroit, `reminder_channel_for()`, dont la table de
vérité est écrite deux fois et épinglée des deux côtés.

Et `regime_de_rappel(user_id, loop_type)` rend `normal` / `espace` / `silence` en comptant les
points clos `expired` depuis le dernier signe de vie : quatre sans réponse font passer à **au plus
un message par mois calendaire, tous canaux et toutes boucles confondus** ; huit font taire.

## 3. Ce que le mot de la veille touche, et c'est plus que ça n'en a l'air

### 3.1 Il ne peut pas s'accrocher à un point, et ce n'est pas une contrainte de table

La fiche dit « ligne d'outbox sans `checkin_id` (l'`unique(checkin_id)` actuel l'interdit) ». C'est
vrai, et la raison profonde est ailleurs : **depuis C2.3, le point interroge la période écoulée**.
Le point du lundi porte un `period_start` de la semaine **précédente**. Un mot envoyé le lundi soir
pour un engagement du mardi concerne une semaine dont **aucun point n'existe encore** — il sera
généré le lundi suivant.

Le mot de la veille n'est donc pas une variante du rappel : il est piloté par l'**engagement**
(`plan_actions.committed_at`, `intention_days`, que C2.2 rend stables), pas par le point. Le dire
ainsi évite de chercher à le faire entrer dans une table qui n'est pas la sienne.

### 3.2 Il multiplie le volume par trois, et le produit a passé un chantier à le réduire

Aujourd'hui : **un** message par période. « Le mardi et le jeudi » ferait **deux** mots de plus par
semaine — trois messages au lieu d'un.

Et C2.9 tout entier (`20260912170000_rappels_qui_s_espacent.sql`) existe pour que le produit se
taise devant quelqu'un qui ne répond plus. Son plafond compte les lignes d'outbox par mois
calendaire : **une table à part passerait à côté de ce plafond**, donc quelqu'un qui a cessé de
répondre depuis quatre périodes continuerait de recevoir deux mots par semaine. C'est le piège le
plus net de ce chantier, et il est silencieux — rien ne lèverait, rien ne serait rouge, le produit
deviendrait simplement insistant avec les gens qui l'ont quitté.

### 3.3 C'est une fonctionnalité push, et le produit a deux canaux

« La veille au soir » n'a de sens qu'en notification. Un email à 22 h arrive le lendemain matin,
c'est-à-dire le jour même — donc une autre fonctionnalité. Or `reminder_channel_for()` est le seul
endroit où le canal se résout, sa table de vérité est écrite deux fois, et la préférence **ne se
dégrade jamais d'elle-même** (un `push` sans jeton part par email sans rien réécrire).

Un message qui n'existe que sur un canal casse cette symétrie : il faut décider ce qu'il advient de
quelqu'un qui a choisi l'email, et « rien » est une réponse acceptable **à condition d'être dite**.

### 3.4 « Dix semaines » se remet à zéro, et il faut le vouloir

La borne proposée court depuis `committed_at`. Mais `commit_plan_action` repose `committed_at` à
chaque nouvel engagement — « Choisir une autre action » en est un. Quelqu'un qui change d'action
toutes les huit semaines recevrait le mot de la veille **indéfiniment**, sans qu'aucune règle n'ait
été enfreinte.

## 4. Les décisions à prendre

### D1 — Où vit le mot, et sous quel plafond

**Recommandation : une ligne de `notification_outbox` avec `checkin_id` nul**, et non une table à
part. Deux raisons, dont une seule compte vraiment :

- c'est ce qui le fait tomber **automatiquement** sous le plafond de `regime_de_rappel` (§3.2), sous
  la purge de rétention, sous le journal `reminder_send_runs` et sous le jeton de désinscription —
  quatre mécanismes qu'une table à part obligerait à rebrancher un par un, et dont l'oubli est
  silencieux ;
- `UNIQUE (checkin_id)` accepte plusieurs `NULL` en PostgreSQL, donc la contrainte n'a pas à bouger.

**Ce qu'on casse si on se trompe** : une table à part rend le mot de la veille invisible à tout ce
qui protège la personne du produit.

Une conséquence à assumer : il faut alors **une autre clé d'idempotence** — `unique(user_id, date,
genre)` par exemple —, sans quoi deux passages du cron dans la même soirée enverraient deux mots.
La garantie de la spec §7 ne doit pas être perdue en changeant de porte.

### D2 — Le second opt-in, et son troisième état

**Recommandation : une colonne à part sur `profiles`, à trois états** (`jamais_propose` / `oui` /
`refuse`), et non un booléen. La fiche demande « jamais après un refus » : un booléen ne distingue
pas « a dit non » de « n'a pas encore été proposé », donc on reproposerait à quelqu'un qui a
refusé. C'est exactement la leçon de C5.7 sur la barre d'onglets — « deux marques booléennes ne
distinguent pas *ça vient de finir* de *il n'y en a jamais eu* ».

**Et il ne se confond pas avec `reminder_channel`** : quelqu'un peut vouloir le rappel du lundi
sans vouloir un mot le mardi soir. Mais `reminder_channel = 'none'` doit **éteindre les deux** —
une personne qui a coupé les rappels et continue de recevoir des mots aurait raison de se sentir
trahie.

### D3 — Le canal, et ce qu'on dit à qui a choisi l'email

**Recommandation : push uniquement, et on ne le propose pas à qui est en email.** La question ne se
pose alors jamais sous une forme trompeuse : l'opt-in n'apparaît que là où il peut être tenu.
Corollaire : la préférence ne se dégradant jamais d'elle-même, quelqu'un qui perd son jeton push
bascule en email pour le rappel du lundi — et son mot de la veille **cesse silencieusement**. Il
faut décider si c'est acceptable (recommandation : oui, et la feuille de réglage le dit).

### D4 — La borne des dix semaines, et ce qui la remet à zéro

**Recommandation : compter depuis le premier engagement du cycle et non depuis le dernier
`committed_at`** — donc une date posée une fois par cycle, que « choisir une autre action » ne
rouvre pas. La borne mesure « la personne débute », pas « l'engagement est neuf ».

**Ce qu'on casse si on se trompe** : en comptant depuis `committed_at`, on offre une boucle
d'insistance infinie à qui change souvent d'avis — c'est-à-dire précisément à qui cherche encore, et
qu'on voulait aider.

### D5 — Ce que le mot dit

**Recommandation : une ligne de Ramille, sans chiffre, sans nommer l'action.** « Demain, c'est un
de tes jours. » Nommer l'action rappellerait un engagement au lieu d'accompagner une décision, et la
chiffrer mettrait Ramille à côté d'un nombre, ce qu'elle ne fait jamais.

**Et cela rouvre « un mot par point, jamais plus »** (`v1-12` §2.1). Cette règle n'est pas cassée
par le mot de la veille — il n'est pas attaché à un point — mais elle est **contournée**, et le
document qui la porte doit le dire plutôt que de laisser croire qu'elle tient toujours seule.

## 5. Ce qu'il ne faut pas casser

- **`UNIQUE (checkin_id)` est la garantie anti-relance de la spec §7.** Elle ne bouge pas ; le mot
  de la veille passe à côté par un `NULL`, et se donne **sa propre** clé d'idempotence.
- **Le plafond de `regime_de_rappel` compte sur `created_at` de la boîte d'envoi et non sur
  `sent_at`**, sinon la décroissance ne s'applique pas tant que l'expéditeur n'est pas configuré.
- **`send_pending_reminders` marque `sent` AVANT l'appel HTTP**, pour qu'un message remis au
  fournisseur ne reparte jamais. Une seconde catégorie de message ne doit pas inverser cet ordre.
- **`public.reminder_send_runs` reçoit une ligne par canal à chaque passage**, y compris une nuit
  où rien n'attend : zéro ligne veut dire « le passage n'a pas eu lieu ». Un second cron doit
  écrire dans le même journal, aux mêmes conditions.
- **Le lien du rappel porte `?rappel=1` et le chemin ne doit pas bouger** (C2.11) : `assetlinks.json`
  ne revendique nommément que `/plan`, et ce périmètre étroit est voulu.
- **Le jeton de désinscription est écrit explicitement dans l'`insert`**, jamais laissé au défaut de
  la colonne — sinon le lien imprimé dans le corps ne correspond pas à la ligne.

## 6. Ce que cette page demande

Cinq décisions, dont **D1 et D2 changent le schéma** et doivent être prises avant la migration. D3,
D4 et D5 peuvent se trancher en cours de route, mais D4 a un coût visible s'il est mal pris.

**Effort : grand**, et il est concentré dans ce que le chantier touche plutôt que dans ce qu'il
ajoute : quatre garanties de la boucle de rappels passent par là.
