# FRONT-QUESTIONNAIRE.md — l'écran du questionnaire : ce qu'une réponse efface, et comment on saisit

> **Quand ouvrir ce fichier.** Toucher à un écran ou à une étape du questionnaire · ce qu'une
> réponse efface ou réclame · une saisie, une puce, un « Suivant » · la navigation entre étapes. Le
> préremplissage et la voix de Ramille à l'entrée des sections sont en `FRONT-SESSION.md` §2.9. Ce
> que la base fait de ces réponses est dans `BILAN.md`.
>
> Il n'est **pas** chargé automatiquement — seul `CLAUDE.md` l'est. Sa table de déclencheurs dit
> quand venir ici ; une règle sortie sans dire *quand* aller la chercher est une règle enterrée.

Ce fichier a été sorti de `FRONT.md` le 01/10/2026, qui pesait 102 Ko — avec `FRONT-MASCOTTE.md`,
`FRONT-SESSION.md`, `FRONT-SUIVI.md` et `FRONT-MOUVEMENT.md`. Ses sections y sont venues **telles
quelles**, à leurs renvois près,, et **gardent leur numéro** : il reste unique dans la famille, donc un renvoi « `FRONT.md`
§2.x » écrit avant cette date — dans un commentaire du code, un document daté — se retrouve ici, et
la table en tête de `FRONT.md` dit où vit chaque numéro. Tout ici est propre à Ramille ; ce qui
voyage est en `FRONT.md` §1.

---

## 2. Propre à Ramille

### 2.6 Le questionnaire : ce qu'une réponse efface, et comment on saisit

- **Une réponse rendue impossible par une autre réponse s'efface dans `normaliserReponses`, et
  nulle part ailleurs** (`src/types/bilan.ts`, appliquée après chaque `update` du questionnaire et
  à la relecture d'un brouillon). Trois écrans tenaient trois listes de remises à zéro, qui
  divergeaient déjà : changer le mode principal effaçait la motorisation sans regarder si le
  **second** mode était encore une voiture ; « Non » à B1.1 oubliait le type de deux-roues ; et
  choisir comme mode principal celui déjà pris en second laissait les deux jambes sur « voiture »,
  la ligne n'apparaissant plus nulle part et la moitié du trajet étant facturée au tarif solo.
  Deux règles : la fonction est **idempotente** (elle s'applique aussi à un brouillon écrit avant
  ces règles), et ce qui décide d'effacer un champ est **ce que le calcul lit encore**, pas ce que
  l'écran affiche — la branche « rarement » des loisirs en est l'exemple, commentée sur place.
  **Et depuis `v1-16` §4, elle écrit `false` ou `null` selon ce qu'elle veut dire** : `false` quand
  la question ne s'applique plus (pas de trajet régulier), `null` quand elle est **à reposer** — un
  retour en arrière qui rend le second mode identique au mode principal répondait « Non » à la
  place de la personne. Les confondre, c'est refaire le défaut de `v1-13` §12.3 par une autre porte.
- **Une question à laquelle personne n'a répondu ne vaut pas « Non »** (recette du 14/09/2026,
  `v1-16` §4). `commute_second_mode_used` est `boolean | null` côté client, `null` valant « pas
  encore répondu », et `manqueDeLEtape` le refuse : le défaut était `false`, donc « Non » arrivait
  coché sur un questionnaire vierge et l'étape se traversait sans qu'on décide — or « Non »
  **sous-estime** un trajet intermodal, sur le poste qui décide du poste dominant donc du plan.
  C'est la quatrième occurrence du motif de C3.4 / C3.5 / C3.6, restée en place parce qu'elle
  préexistait à la règle. **La colonne, elle, reste `not null`, et ce n'est pas un raccourci** :
  `null` décrit un questionnaire en cours, jamais un bilan soumis, et la rendre nullable
  réimporterait l'ambiguïté en base — la branche du calcul est
  `if a.commute_second_mode_used and a.commute_second_mode is not null`, où `null` se comporte
  **exactement comme `false`**. D'où un `?? false` à l'insert, inatteignable par construction et
  écrit quand même, le typecheck étant le seul garde qui voie cette dérive.
- **Une précision s'ouvre sous l'option qu'elle décrit, et la dernière exception est tombée**
  (`v1-16` §3). La taille du covoiturage du trajet quotidien vivait en tête de l'écran **suivant**,
  alors que ses deux jumelles de C3.5 (sorties, longs trajets) s'ouvrent sous l'option choisie :
  trois fois la même question, deux motifs. Elle est désormais sous « Voiture (covoiturage) » de
  B1.4, par `PrecisionChiffres`, après la motorisation — les deux précisions décrivent la même
  voiture. Le seul écart qui reste est la distance ouverte des loisirs, et sa raison est écrite sur
  place : une rangée de puces n'a pas d'élément sous lequel se glisser.
- **Ce qui manque se dit au toucher du « Suivant », jamais d'office** (29/09/2026, `v1-31`,
  décision 1). Rien ne s'écrit à l'arrivée : la question est déjà en titre, et rien ne change sous le
  doigt pendant qu'on répond. Le « Suivant » d'une étape incomplète est gris et **demande** (`FRONT.md` §2.4) :
  la ligne « Il manque encore … » apparaît au-dessus de lui — un lien, `accentText` 600, jamais une
  alerte —, l'intitulé de ce qui manque passe en `accentText` 600, le focus s'y pose (l'option cochée
  du groupe, ou sa première : `optionCible`) et l'écran y défile s'il le faut. La demande tient
  jusqu'à ce que l'étape soit complète, retombe alors et en changeant d'étape ; tant qu'elle court,
  la ligne et la marque **suivent ce qui manque maintenant** (`v1-31` §2.9). Quatre choses à ne pas
  défaire :
  - **`manqueDeLEtape` rend un champ et sa phrase** (`{ champ, phrase }`), et le champ est ce qui
    mène : chaque étape enregistre une ancre par champ qu'elle pose (`useAncreDuChamp`,
    `src/components/bilan/ancre-du-champ.tsx`). Ajouter un champ à une étape en demande donc
    **trois** : sa ligne dans `CHAMPS_DE_L_ETAPE`, sa branche et sa phrase dans `manqueDeLEtape`, son
    ancre à l'écran. Les deux premières sont gardées par `bilan.test.ts` ; la troisième ne l'est que
    par un avertissement de développement — un champ réclamé sans ancre ne se tait pas, la ligne
    s'affiche et le focus retombe sur l'étape, et c'est la forme neuve du défaut de C5.4 (une
    question absente, mais réclamée) ;
  - **la question principale ne se marque jamais** (`seMarque`) : elle est en titre, et le titre qui
    changerait de couleur ne dirait rien de plus. Le titre lit pourtant la marque comme tout
    intitulé, pour qu'une `seMarque` fautive se voie ;
  - **une étape à deux champs de saisie en même place** (la distance du trajet, en kilomètres ou en
    tranche) n'a qu'**un** champ logique, `distance_du_trajet` : la phrase ne peut pas dire lequel
    des deux, et l'ancre suit celui qui est à l'écran ;
  - **la demande ne coche rien, même à Entrée maintenue** : `FRONT.md` §2.4.
- **Les modes se rangent en trois familles**, motorisés, collectifs, actifs (`MODES_PAR_FAMILLE`,
  `enFamilles`, `src/constants/transport-modes.ts`), séparées de 16, des rangées de 48 à 4 d'écart.
  L'ordre vit dans cette liste, **jamais dans les clés de `TRANSPORT_MODE_LABELS`**, dont l'ordre est
  un accident d'écriture. « Lequel ? » l'itère ; les listes de B1.4 et B2.2 restent **littérales**,
  tenues d'accord avec elle par `transport-modes.test.ts` — et elles doivent le rester : la section H
  de `verifier-etats-export.mjs` lit dans la source le premier libellé de `LEISURE_MODE_CHOICES_MORE`,
  le premier mode que « Voir les autres modes » révèle. Le changer ne demande donc rien à la garde ; en
  faire une liste dérivée la ferait tomber sur « motif introuvable ».
- **Une précision vit dans une boîte, et la boîte dans le groupe de son mode**
  (`BoiteDePrecision`, `v1-31` §2.2) : une boîte par choix, qui porte toutes ses précisions — la
  motorisation **et** le nombre de personnes d'une même voiture, « Lequel ? » **et** sa part —, et
  chaque précision y reste **un `radiogroup` nommé à elle**, à l'intérieur de celui des modes.
  `PrecisionMode` et `PrecisionChiffres` ne dessinent plus de boîte : deux façons d'en dessiner une
  divergent, et le défilement doit savoir qui annonce l'ouverture.
- **Deux défilements, et aucun autre** (`decalagePourMontrer`, `src/types/demande.ts`) :
  - **vers ce qui manque**, au toucher : le minimum pour que la question soit entière, 16 au-dessus
    du pied ; une question sortie par le haut redescend jusqu'à 24 sous l'en-tête. La ligne qui
    apparaît rétrécit la zone : le défilement attend la mise en page suivante, où la hauteur du pied
    est **mesurée** — une police agrandie la change ;
  - **à l'ouverture** de ce qui s'ouvre sous un choix — une précision, « Lequel ? », la distance
    d'une sortie —, le minimum pour qu'elle finisse 16 au-dessus du pied, **jamais au point de faire
    passer le choix qui l'a ouverte à moins de 8 du bord** (`ChoixOuvrant` porte cette borne), et
    jamais vers le haut. Seulement après une **réponse donnée sur l'étape** : `update` les compte, et
    ni le préremplissage d'un re-bilan ni un brouillon relu n'y passent — une précision qu'ils font
    apparaître ne fait rien défiler. « Voir les autres modes » ne défile pas : ce qu'il révèle est
    sous le doigt.
- **Un filet en haut du pied dit qu'il y a une suite** (`suiteSousLePied`, `v1-31`, décision 3) :
  le trait de la bande haute (`border`, un filet), quand le contenu continue dessous au-delà de sa
  marge basse de 24. Il ne dit pas ce qui manque. Relu au défilement, à la taille du contenu et à
  celle de la zone ; sans animation. La marge basse du contenu et `MARGE_BASSE_DU_CONTENU` se
  retouchent ensemble.
- **Deux précisions de plus depuis C4.4, et une asymétrie d'effacement qui n'est pas évidente.**
  « Train » ouvre TER / RER ou Transilien / Intercités, « Vélo » ouvre mécanique / à assistance,
  sur les trois écrans qui posent un mode — on ne prend pas le même train pour aller travailler et
  pour partir en week-end. Un champ par **poste** et non par jambe, comme la motorisation, parce
  que B1.7 exclut le mode déjà choisi en B1.4. Ce qu'il ne faut pas uniformiser :
  `normaliserReponses` efface ces deux réponses sur des loisirs « rarement », **là où la
  motorisation reste** — une motorisation décrit le véhicule qu'on possède encore et rend le
  résiduel plus juste, un type de train décrit un trajet qu'on ne déclare plus. Et ce n'est pas
  théorique : le résiduel de « rarement » vaut `train` quand le foyer n'a pas de voiture, donc un
  type survivant y serait lu et un bilan resoumis à l'identique changerait de total. La
  trottinette, elle, ne reçoit **aucune** question — une question dont une seule réponse existe
  n'en est pas une.
- **La virgule est un séparateur décimal, et la traiter comme un caractère à jeter coûtait un
  facteur dix.** Le champ de distance filtrait tout ce qui n'était pas un chiffre : « 3,5 » ne
  donnait ni erreur ni refus, il donnait **35**. Le clavier numérique d'Android propose une
  virgule, et l'erreur porte sur le poste le plus lourd de la majorité des bilans, multiplié par
  deux fois le nombre de jours et par quarante-cinq semaines. D'où `nettoyerSaisieNumerique` /
  `saisieVersNombre` / `afficherNombreSaisi` (`src/types/bilan.ts`) : la virgule est **conservée
  telle quelle** sous les doigts de la personne, la conversion se fait à part, et un second
  séparateur est ignoré sans jeter ses chiffres. Et un « 0 » saisi n'est pas une distance — la
  colonne porte `check (commute_distance_km > 0)`, donc la complétude de l'étape et l'insert
  lisent la **même** définition, `distanceDomicileTravailKm`.
- **Le retour matériel d'Android recule d'une étape** (`useRetourVersLaPhasePrecedente`, 01/10/2026,
  `v1-33` Q-4) : la même action que « Retour » quand une étape visible est derrière ; `null` sur la
  première étape et sur l'écran de reprise, où le retour passe à la navigation ; et **pendant le
  calcul, l'appui est consommé sans rien faire** — le laisser passer reculerait la pile sous une
  soumission qui continue. Une feuille ouverte garde son retour (`EXPO.md` §1.7). L'onboarding passe
  par le même crochet.
- **Une indication se lit avant les réponses**, entre le titre et les choix — B1.1 l'avait après
  (`v1-33` Q-10). **Et le lien « Ton mode n'est pas dans la liste ? » se rend sous la liste qu'il
  complète** (Q-8) : sous « Lequel ? » sur B1.6, et seulement sur « Oui » ; sous les modes et « Voir
  les autres modes » sur les loisirs ; à 8, hors du bloc où mène « Il manque encore … ».
- **Une forme par fonction** (`v1-33` Q-12, T-20) : deux séries de nombres prennent la même forme
  (la pilule, pour les vols), et le tableau rayon / style est dans la fiche de `Chip` du kit. Le
  sous-titre d'une question sous le titre d'étape lit `TypeScale.question` (22/28).
- **Le champ de distance vide ne montre rien dedans** (01/10/2026, `v1-33` D8) : le « 0 » gris se
  lisait comme une valeur, la seule que le champ refuse. L'intitulé et « km » disent ce qu'on attend,
  le contour au repos dit qu'il y a un champ. Ne pas remettre de placeholder (`numeric-field.test.tsx`).
