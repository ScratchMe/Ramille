# MESURE.md — l'usage, les cohortes et le canal de retour

> **Quand ouvrir ce fichier.** Ajouter, émettre ou lire un événement d'usage, ou une valeur de
> propriété · toucher à la purge des sessions anonymes, aux compteurs de cohortes ou aux vues
> `analytics.*` de l'administration · toucher au canal de retour (`feedback`).
>
> Il n'est **pas** chargé automatiquement — seul `CLAUDE.md` l'est. Sa table de déclencheurs dit
> quand venir ici ; une règle sortie sans dire *quand* aller la chercher est une règle enterrée.

Ce fichier est l'un des cinq fichiers de sujet sortis de la section Architecture de `CLAUDE.md` le
01/10/2026 — `BILAN.md`, `PLAN.md`, `BOUCLE.md`, `COMPTE.md`, `MESURE.md`. `CLAUDE.md` pesait alors
177 Ko, dont 144 pour l'architecture, chargés à chaque session pour des briques qu'on ne touche
qu'une à la fois. Les paragraphes sont venus **tels quels**, à leurs renvois et à quelques faits périmés près, regroupés par thème ; quand
l'un d'eux dit « `CLAUDE.md` a écrit… », c'est là que l'erreur avait été écrite. Tout ici est
propre à Ramille : les leçons qui voyagent vivent dans les fichiers d'outil (`SUPABASE.md`,
`TESTING.md`, `EXPO.md`, `VERCEL.md`) et dans `FRONT.md` §1.

Où lire chaque vue, et ce qui doit alerter : `docs/exploitation/README.md` §8.

---

## 1. Les événements d'usage

**Mesure d'usage** (`usage_events`, issue #30, cf. `v1-08-mesure-usage.md`) : **on n'instrumente
jamais ce que le schéma enregistre déjà.** Pas d'événement `bilan_submit` (c'est
`assessments.submitted_at`), `checkin_answer` (c'est `engagement_checkins.response`) ni
`feedback_submit` — dupliquer un fait garantit deux chiffres divergents le jour où l'un des
chemins échoue, et un test pgTAP interdit de les réintroduire. Les axes de segmentation
(`zone_type`, `tc_access`, poste dominant, cadence) sont **déjà en base** : c'est ce qui a écarté
PostHog. La liste des événements vit dans `public.usage_event_types` avec une clé étrangère
depuis `usage_events` — **ajouter un événement impose une ligne par migration ET une entrée dans
`src/types/analytics.ts`**, sinon l'insert est rejeté et l'événement perdu en silence (même
mécanique que `emission_factor_sources`). Un événement déclaré mais qu'aucun code n'émet doit
être retiré : il ne se lit pas « pas encore instrumenté », il se lit **zéro**. **Et un événement
ajouté impose de relire le formulaire « Sécurité des données » de Play**
(`docs/exploitation/fiche-google-play.md` §5) : un événement neuf peut collecter ce que la
déclaration publiée ne nomme pas, et rien ne le signale.

**La même règle vaut pour une valeur de propriété, et elle est plus discrète** : la base ne valide
pas les valeurs de `props` — `check_usage_event_props` ne compte que des clés et des longueurs, celle
des nombres comprise depuis le 05/10/2026 (32 caractères : un nombre de 131 000 chiffres faisait d'un
événement 400 Ko, passe avant le lancement) —, donc rien n'arrête la dérive. `connexion_view` déclarait cinq provenances dont deux qu'aucun écran
n'émettait plus, et une sixième (`compte`) que l'écran de connexion réécrivait en
`resultat_transition` faute de la reconnaître : la provenance la plus intéressante à mesurer
gonflait exactement le chiffre auquel on voulait la comparer. D'où `SOURCES_CONNEXION`
(`src/types/analytics.ts`) — **une seule liste**, qui donne le type *et* le garde
d'appartenance — et le fait que les valeurs attendues soient écrites dans la description du
référentiel, seul endroit où la base peut les porter.

**`connexion_limite` est le seul événement qui signale un refus d'un tiers** (06/10/2026, `v1-27`
§12.40) : le plafond horaire d'e-mails de Supabase est vérifié avant le hook d'envoi et ne laisse
aucune ligne en base, donc il ne double aucun fait du schéma. Il porte l'écran (`ECRANS_DE_LA_LIMITE`)
et jamais l'adresse, et l'alerte d'exploitation le compte à partir de trois — le même code d'erreur sert
à la minute d'une adresse, et une personne qui redemande trop vite ne doit pas faire partir d'e-mail.

**`app_error` peut arriver en retard, et le dit** (02/10/2026) : une panne survenue sans session, sans
réseau ou pendant une panne passagère du serveur attend sur l'appareil et part plus tard, avec `differee` et `retard_h`
(`docs/exploitation/remontee-erreurs.md` §3 bis). C'est le seul événement qui attend : les autres
s'émettent après la session, la règle ci-dessous.

**Deux mesures valent d'être connues, parce qu'elles étaient fausses d'une façon qui ne se voit
pas dans un chiffre** (11/09/2026) :
- **`app_open` part après la résolution d'`ensureSession()`, jamais au montage du layout**, et
  porte `props.origine` (`demarrage` / `retour`). `track()` renonce quand aucune session n'existe
  encore : émis au rendu, l'événement était perdu précisément sur les premiers lancements — ceux
  où la session se crée — soit un biais systématique contre les nouveaux venus, une ligne en base
  pour six vues d'étape d'onboarding. Et le second chemin n'existait pas du tout : le layout n'est
  monté qu'une fois par chargement du bundle, or le chemin nominal de la boucle d'engagement est
  une app en arrière-plan que la notification ramène devant. `retour` n'existe que sur natif.
  C'est aussi ce qui rend vraie la phrase sur laquelle `purge_stale_anonymous_accounts()` fonde sa
  fenêtre de 90 jours. **Et quand le montage finit sans session** — un refus du captcha ou une coupure
  à la création, un jeton expiré hors ligne, une session refusée —, le `demarrage` se rattrape à la
  première session obtenue ensuite, une fois (`rattraperLOuverture`, 04/10/2026).
- **`connexion_demande` est l'intention, `connexion_success` le fait constaté.** L'écran email
  émettait `connexion_success` juste après `updateUser({ email })`, que `etatDuRattachement`
  classe pourtant en `a_confirmer` : `is_anonymous` ne bascule qu'au clic du lien reçu — à la saisie du code depuis le 20/09/2026. Le chemin
  Google, lui, n'émettait qu'après une identité liée — les deux branches ne mesuraient pas le même
  fait, et leur comparaison était faussée du taux d'emails jamais confirmés, c'est-à-dire du
  chiffre qu'on voulait lire. L'écart entre les deux **était** ce taux, puis ne l'a plus été du
  21/09 au 02/10/2026 : une adresse déjà prise sur `/connexion/email` émettait `connexion_demande`
  pour un code de **connexion**, et le plan constatait un compte retrouvé par code comme un
  rattachement. **Depuis le 02/10/2026** (`v1-27` §12.28), `connexion_demande` porte `flux`
  (`rattachement` | `connexion`), et le plan ne compte plus un rattachement constaté après une
  reconnexion (`traceverte.session_retrouvee.v1`). Le taux se lit donc entre les demandes
  `flux = rattachement` et les succès par email ; une demande **sans** `flux` est d'avant, et peut
  être l'une ou l'autre.

## 2. Ce que la purge et la suppression laissent : des compteurs, et quatre vues

**Ce que la purge et la suppression laissent derrière elles : des compteurs, rien d'autre** (lot 6,
livré avec C4.7, `20260927230611_les_cohortes_avant_la_purge.sql`). La cascade efface tout ce qu'une
personne a fait, donc toute mesure de forme cohorte doit être écrite **avant** : la purge incrémente
`public.purges_par_cohorte` (semaine d'arrivée, étape la plus loin, tranche de semaines tenues, état
des rappels au départ) **dans sa propre transaction, après sa garde de volume et avant son
`delete`** ; `delete_my_account` incrémente `suppressions_de_compte_par_mois` après son `delete`,
seulement si une ligne est partie. **Un compteur qui échoue n'arrête jamais une suppression** : il
vit dans une sous-transaction, et son échec se consigne (`purge_runs.detail`, un avertissement pour
`delete_my_account`) pendant que la suppression passe — la page de confidentialité promet
l'effacement, et une écriture d'analyse ne doit pas pouvoir le suspendre. La première version
faisait l'inverse (« si le compteur échoue, rien n'est supprimé »), et c'était la suspendre pour
toujours, sans alerte, dès qu'une valeur nouvelle de `regime_de_rappel` sortait du `check` —
contre-lecture du 27/09/2026. Cinq choses à ne pas défaire :

- **aucun identifiant et aucun segment**, par décision (27/09/2026) : à nos volumes, une ligne
  découpée par zone ou par poste décrirait une personne que la page de confidentialité promet
  d'effacer. Le fichier `36` balaie les colonnes par type et n'admet que `date`, `integer` et un
  `text` fermé par un `check`. À nos volumes, une ligne peut ne compter qu'une personne : elle n'en
  porte rien qui la désigne, et c'est ce que la page promet — pas davantage ;
- **ces tables n'ont aucune clé étrangère**, et c'est ce qui les fait survivre : c'est la
  contrepartie exacte de la règle « jamais rattacher une table à `profiles` autrement qu'en
  cascade », qui vaut pour les données d'une personne et jamais pour un agrégat ;
- **`cohorte_de(uuid)` est la seule dérivation**, et l'étape est « la plus loin **dans l'ordre** »
  (a ouvert < bilan soumis < engagée < a répondu), pas le plus long préfixe : on peut répondre au
  point générique sans s'être engagé. « A soumis un bilan » s'écrit `status <> 'in_progress'`, pour
  qu'un bilan retiré (C4.7) compte comme soumis ;
- **le signe de vie des rappels a une seule définition, `dernier_signe_de_vie`**, que
  `regime_de_rappel` appelle depuis C4.2 et que les cohortes lisent — celui de la purge reste le
  sien, plus large (tous les événements, les bilans, les retours). Une assertion du `36` exige que
  le corps installé du régime **appelle** la fonction — elle acceptait aussi l'expression recopiée
  tant que la factorisation n'était pas faite. Ce qu'elle ne voit toujours pas, et qu'il ne faut pas
  croire gardé : une retouche de `v_depuis` **après** l'appel. C'est une inclusion, pas une égalité ;
- **les valeurs que rend `regime_de_rappel` doivent toutes figurer dans le `check` de
  `rappels_au_depart`** : une valeur nouvelle ferait échouer chaque compte, donc perdre chaque
  cohorte. Une assertion du `36` lit les littéraux `return` du corps installé et les compare au
  `check`.

**Et ce que le lot 6 lit, il le lit dans quatre vues, sans définition nouvelle** (29/09/2026,
`20260929210541_les_vues_de_l_administration.sql`, `docs/exploitation/README.md` §8.5 ter) :
l'entonnoir et la rétention par cohorte, les états des rappels, les départs par mois. Chaque notion y
garde sa dérivation — `cohorte_de`, `dernier_signe_de_vie`, `regime_de_rappel` sur la boucle que
rend `boucle_de_la_personne` —, et une vue qui en écrirait une seconde ferait deux échelles qui
divergent. **Une exception, nommée des deux côtés** : la rétention lit le signe de vie semaine par
semaine, ce qu'un `max` ne sait pas faire, donc elle recopie les deux sources de
`dernier_signe_de_vie` — une source ajoutée à l'une s'ajoute à l'autre. Trois choses à ne pas
« simplifier » : la boucle retenue est celle qui **tourne encore**, pas celle qui a existé (sans quoi
qui a arrêté sa boucle reste actif pour toujours) ; la rétention divise par **toute** la cohorte
d'arrivée, purgés compris (sans eux, la purge fait paraître une cohorte plus fidèle en vieillissant) ;
et ni l'activation ni un taux de churn ne sont calculés — la première est une décision de produit,
le second demanderait un effectif passé que le régime ne sait pas reconstruire.

## 3. Le canal de retour

**Canal de retour** (`feedback`, issue #29) : la seule table où un client écrit du texte
libre. Comme chaque visiteur reçoit une session anonyme dès l'ouverture, ouvrir l'INSERT à
`authenticated` revient à l'ouvrir à quiconque sait appeler l'API — d'où le trigger
`enforce_feedback_rate_limit` (dix par 24 h et par utilisateur) et les bornes de longueur.
**Et soixante par heure pour tout le projet, depuis le 04/10/2026** (`20261004201217`, plan
anti-abus) : une session neuve repartait à zéro, et des comptes en masse écrivaient sans fin. Le
trigger est `security definer` pour compter les retours des autres, et répond `RM002` avec une
phrase pour la personne (« Réessaie un peu plus tard. », choisie par la personne qui pilote). Les
événements d'usage ont le même étage : 6 000 par heure pour tout le projet, dont 300 pannes
(`app_error`), en plus des 500 par jour et par compte. **Ces plafonds ne refusent que les comptes nés
depuis moins de vingt-quatre heures** : un `app_open` refusé serait un signe de vie perdu, que
lisent le régime des rappels et la purge, et le flot vient de sessions neuves.
**Et la table est insert-only côté client, ce que le schéma ne disait pas encore le 20/09/2026** :
une policy `DELETE` owner-scoped traînait, sans justification dans sa migration et sans qu'aucun
écran l'emprunte, alors que le trigger compte les lignes **vivantes** — dix retours, on efface, on
recommence. Elle est partie ; l'effacement reste garanti là où il est promis, par la cascade de la
suppression de compte et par la purge à 90 jours.
**Attention en écrivant des tests dessus** : une assertion sur la contrainte de longueur peut
passer sans rien éprouver de **deux** façons, et les deux se sont produites — `TESTING-PGTAP.md` §2.5,
qui dit aussi pourquoi un fichier pgTAP se rejoue en séquence entière.
