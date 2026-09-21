import { APP_NAME } from '@/constants/produit';
import type { BilanStepId } from '@/types/bilan';

/**
 * Ramille — la mascotte, et tout ce qu'elle dit.
 *
 * Elle porte le nom du produit : décision du 05/09/2026, produit et personnage ne font qu'un
 * (cf. docs/architecture/v1-09-renommage-ramille.md). Un test épingle l'égalité pour qu'elle
 * ne dérive pas par inadvertance ; si un jour on la sépare, c'est ici et dans ce test.
 *
 * Ses phrases vivent toutes ici, pas dans les écrans, pour la même raison que les repères
 * chiffrés vivent dans carbon-reference.ts : une voix qui se déclare à dix endroits finit par
 * se contredire au onzième. Quatre règles, découlant de ce qui est déjà acté sur la mascotte
 * (aucune expression négative, jamais à côté d'un chiffre lourd, le produit ne commente pas) :
 *
 *   1. Elle parle à la première personne, court, en tutoyant.
 *   2. **Jamais un nombre dans sa bouche.** Les chiffres restent au produit ; elle accompagne.
 *      Un test refuse tout chiffre dans ces lignes — c'est aussi ce qui garantit qu'elle ne
 *      commente jamais une empreinte.
 *   3. Jamais « tu devrais », « il faut ». Toujours une porte ouverte, jamais une injonction.
 *   4. **Jamais un accord qui genre la personne** (C3.10, arbitrage D15, constat A12-4). Le
 *      produit tutoie sans rien savoir de qui lit : « Merci d'être passé » choisit un genre à sa
 *      place, et la moitié des gens le lisent comme une erreur sur eux. La règle vise les
 *      participes et adjectifs accordés avec « tu » — se relire n'y suffit pas, parce que la
 *      forme fautive est la forme naturelle : on la choisit sans y penser. D'où un test qui
 *      balaie les participes fréquents. Il exclut « engagée », qui s'accorde avec « action » et
 *      non avec la personne — un accord grammatical n'est pas un accord qui genre.
 *
 * Les répliques de check-in d'origine sont celles des maquettes validées (canvas
 * docs/design/v1-08-mascotte) : on ne les réécrit pas, on les rattache à elle. **Des variantes s'y
 * ajoutent** depuis la décision D12 du 10/09/2026 (C2.12, tableaux de `v1-14` §3.1) : l'originale
 * reste en première position, et `variantePourLaPeriode` en choisit une **par période** — jamais au
 * hasard, sinon la phrase changerait à chaque rendu et d'un appareil à l'autre.
 *
 * **Une exception, et une seule** : « Rien à rattraper. » a été retirée le 07/09/2026 sur un
 * retour d'usage explicite — la phrase se lisait comme une attente déçue la première fois
 * qu'on la voyait, alors qu'elle devait dire le contraire. Ramille dit maintenant l'attente
 * (v1-12 §6.3). Le rythme du produit étant fixe — le lundi, le premier du mois — elle peut
 * nommer le jour sans jamais compter, ce qui est la seule façon de tenir la règle 2 tout en
 * disant quand elle revient.
 */
export const MASCOT_NAME = APP_NAME;

export const RAMILLE = {
  /** Onboarding, première apparition — la promesse d'accompagnement, dite par celle qui la tient. */
  presentation: `Moi, c’est ${MASCOT_NAME}. Je serai là à chaque saison, à ton rythme.`,

  /** Attente du calcul du bilan — son seul moment de réflexion. */
  calcul: 'Je calcule ton bilan…',

  /**
   * **Check-in répondu oui — quatre variantes par boucle** (C2.12, décision D12 du 10/09/2026,
   * `v1-14` §3.1).
   *
   * Avec les deux boucles, une personne reçoit environ soixante-quatre questions par an et
   * n'entendait que deux phrases en retour. La répétition stricte de la **question** est utile (le
   * contexte doit rester stable d'une période à l'autre, c'est tout le travail de C2.1) ; celle de la
   * **réponse** s'use. Le titulaire a tranché en sachant que l'usure n'est pas mesurable —
   * `checkin_answer` est interdit comme événement d'usage (v1-08) : c'est un choix de ton, pas une
   * optimisation.
   *
   * **La réplique d'origine reste en première position et n'est pas modifiée** : elle vient des
   * maquettes validées. Les variantes s'y ajoutent, et `variantePourLaPeriode`
   * (`src/types/checkin.ts`) en choisit une par **période** — jamais un tirage au hasard, qui ferait
   * changer la phrase à chaque rendu et d'un appareil à l'autre.
   *
   * Deux tableaux parce que la boucle mensuelle ne revient pas lundi. `mensuel[1]` dit « Une fois
   * autrement » là où le canvas écrit « Un voyage autrement » : cette boucle couvre aussi les sorties
   * du week-end depuis C2.6 (écart consigné en `v1-14` §10).
   */
  checkinOui: {
    hebdo: [
      'Bien joué — chaque changement compte.',
      'Un trajet autrement. Je le note ici.',
      'C’est fait, et ça compte. À lundi.',
      'Tu as fait autrement. Je vois la différence.',
    ],
    mensuel: [
      'Bien joué — chaque changement compte.',
      'Une fois autrement. Je le note ici.',
      'C’est fait, et ça compte. Au début du mois prochain.',
      'Tu as fait autrement. Je vois la différence.',
    ],
  },

  /**
   * Check-in répondu non — trois variantes par boucle (C2.12). Une relance, jamais une déception :
   * aucune des trois ne dit de regret, et aucune ne promet autre chose que la prochaine question.
   */
  checkinNon: {
    hebdo: [
      'Pas cette fois-ci. Rien d’obligatoire, on se repose la question au prochain point.',
      'Ça arrive. Lundi, je te repose la question, tranquillement.',
      'Une semaine sans, ce n’est pas un retour en arrière.',
    ],
    mensuel: [
      'Pas cette fois-ci. Rien d’obligatoire, on se repose la question au prochain point.',
      'Ça arrive. Au début du mois prochain, je te repose la question, tranquillement.',
      'Un mois sans, ce n’est pas un retour en arrière.',
    ],
  },

  /**
   * **La troisième réponse : « pas de trajet cette période »** (C2.4, v1-14 §3.1).
   *
   * Une semaine de congés n'est pas un « Non ». La réplique dit donc une attente, pas une relance :
   * il n'y a rien à consoler, rien à encourager, et surtout rien à reprocher — c'est exactement la
   * raison d'être du troisième choix. Visage `calm`, comme `maintienNon`.
   *
   * **Quatre variantes et non deux, et c'est un écart au canvas** (consigné en `v1-14` §10). Le
   * canvas en écrit deux, indexées sur la boucle — « Pas de trajet … » pour l'hebdomadaire, « Pas
   * de voyage … » pour la mensuelle — mais la boucle mensuelle couvre **deux** postes depuis C2.6 :
   * les voyages et les sorties du week-end. Répondre « Pas de voyage, pas de question. » à
   * quelqu'un qui vient d'appuyer sur « Pas de sortie en septembre » serait la même fausseté
   * lisible que C2.6 a retirée ailleurs. Les variantes sont donc indexées sur le **poste**, comme
   * le libellé du bouton, et `autre` ferme la liste pour un point d'avant C2.6 qui n'en porte pas.
   *
   * Le jour de retour est nommé sans jamais compter — le rythme du produit est fixe (le lundi, le
   * premier du mois), ce qui est la seule façon de tenir la règle « jamais un nombre » tout en
   * disant quand elle revient.
   */
  checkinSansObjet: {
    commute: [
      'Pas de trajet, pas de question. On se retrouve lundi.',
      'Semaine sans trajet. Je reviens lundi, comme d’habitude.',
    ],
    leisure: [
      'Pas de sortie, pas de question. On se retrouve au début du mois prochain.',
      'Mois sans sortie. Je reviens au début du mois prochain, comme d’habitude.',
    ],
    travel: [
      'Pas de voyage, pas de question. On se retrouve au début du mois prochain.',
      'Mois sans voyage. Je reviens au début du mois prochain, comme d’habitude.',
    ],
    autre: [
      'Pas de déplacement, pas de question. On se retrouve au prochain point.',
      'Période sans déplacement. Je reviens au prochain point, comme d’habitude.',
    ],
  },

  /**
   * **Le « Non » d'une question de maintien, et la raison d'un second tableau** (C2.5, v1-14 §3.1).
   *
   * Quand le trajet se fait déjà à vélo, à pied ou en trottinette, le point ne demande pas si
   * quelque chose a changé mais si l'habitude a tenu. Son « Non » ne décrit donc aucun manquement
   * — une semaine en voiture ne défait pas une année de vélo — et `checkinNon` (« Pas cette
   * fois-ci. Rien d'obligatoire… ») y serait une consolation d'échec là où il n'y a pas d'échec.
   * C'est exactement ce que le chantier existe pour retirer : la recevoir cinquante-deux fois par
   * an, juste sous un écran qui dit « Tu fais déjà l'essentiel », était le défaut A13-3.
   *
   * Le mode est nommé parce que c'est lui qui porte l'identité qu'on renforce — « le vélo reste
   * ton trajet » ne vaut pas « ce trajet reste le tien ». Le canvas n'a écrit que les deux
   * premières variantes ; `trottinette` et `autre` sont ajoutées parce que la catégorie
   * `velo_marche` compte plusieurs modes en base et qu'un mode inattendu ne doit pas retomber sur
   * `checkinNon` (écart consigné en `v1-14` §10).
   *
   * **Il n'y a pas de variante pour le vélo à assistance**, ajouté à la catégorie par C4.4 : il
   * reçoit celle du vélo, parce que la phrase nomme l'identité qu'on renforce et que personne ne
   * dit « le vélo électrique reste ton trajet ». C'est `varianteDeMaintien`
   * (`src/types/checkin.ts`) qui fait cette correspondance, et elle a remplacé la liste de modes
   * que la réplique recopiait en ternaire — une liste écrite là aurait dû être retouchée ici
   * aussi, sans que rien ne le dise.
   */
  maintienNon: {
    velo: 'Noté. Le vélo reste ton trajet ; une semaine autrement n’y change rien.',
    marche: 'Noté. La marche reste ton trajet ; une semaine autrement n’y change rien.',
    trottinette: 'Noté. La trottinette reste ton trajet ; une semaine autrement n’y change rien.',
    autre: 'Noté. Ce trajet-là reste le tien ; une semaine autrement n’y change rien.',
  },

  /**
   * Restitution, profil sans aucune émission — le seul moment de félicitation de tout l'écran,
   * et le seul endroit où elle a quelque chose à ajouter au texte.
   *
   * La phrase vivait dans l'écran, à la deuxième personne et hors de portée du test (A3-13) :
   * « Tes déplacements n'émettent quasiment rien. » Elle est dans sa voix maintenant. Aucun
   * chiffre n'est affiché dans cette branche de la carte, donc la règle « jamais à côté d'un
   * chiffre lourd » est tenue sans condition.
   */
  bilanQuasiNul: 'Je ne vois presque rien à compter chez toi — c’est rare.',

  /**
   * Le suivi, **quand l'empreinte a baissé d'un bilan à l'autre** (C2.7, `v1-14` §3.1).
   *
   * Le seul moment du produit où quelque chose que la personne a changé se voit dans un chiffre — et
   * il passait sans un mot. Elle ne dit ni le pourcentage ni les kilos : les deux sont juste
   * au-dessus, en voix produit, et c'est ce qui lui permet d'être là sans commenter une empreinte.
   *
   * **Elle ne s'affiche que sur une baisse réelle** (`estUneBaisse`, `src/types/suivi.ts`) : « Je
   * vois la différence. » au-dessus d'une hausse, ou d'un écart qui tient dans l'imprécision des
   * facteurs, serait une fausseté lisible. Visage `calm` et non `happy` — la carte des points
   * portait un sourire au-dessus d'une colonne de « Non », et le canvas l'a retiré.
   */
  suiviDifference: 'Je vois la différence.',

  /**
   * /suivi, quand la personne a des bilans mais aucun point répondu. Contexte différent de
   * la carte d'attente du plan : ici il n'y a rien à annoncer — ni jour, ni canal —, la
   * cadence dépend de la boucle et une date fausse serait pire que pas de date.
   */
  suiviSansPoint: 'Je note tes réponses ici, au fil des saisons.',

  /**
   * **L'ouverture d'une saison** (C2.8, `v1-14` §3.1) — sous la carte qui porte les deux nombres,
   * et hors de son cadre.
   *
   * Elle ne dit ni combien de points ont été répondus, ni combien de fois quelque chose a changé :
   * ces deux chiffres sont dans la carte, en voix produit. Elle annonce le départ, c'est tout — et
   * c'est ce qui fait qu'elle n'a pas l'air de commenter un bilan de saison.
   *
   * La même phrase en cadence de repli (`v1-14` §3.1, « idem ») : « une saison » y est une façon de
   * parler et non le nom du cycle, et c'est le seul endroit du produit où l'écart est sans
   * conséquence — le mécanisme est dormant, et aucun chiffre ni aucune date ne dépend de ce mot.
   */
  ouvertureSaison: 'On repart pour une saison.',

  /**
   * Sous la carte « Ton premier plan » (C5.6), hors du cadre comme sous la carte d'ouverture de
   * saison — et pour la même raison : ce qui est dans le cadre explique la règle du jeu, elle ne
   * fait que donner le critère de choix.
   *
   * **Le critère est la ressemblance, pas le gain**, alors que les deux cartes posées dessous sont
   * classées par gain depuis C5.1. Ce n'est pas une contradiction : le classement dit l'insistance,
   * et le produit ne choisit jamais à la place de la personne — « Prends la première » serait
   * exactement l'injonction que les trois règles de voix lui interdisent.
   */
  premierPlan: 'Prends celle qui te ressemble.',

  /**
   * Sous la carte « Plan et Suivi » (C5.7), au moment où la barre d'onglets arrive.
   *
   * **La jumelle de `suiviSansPoint`, et l'écart entre les deux est la déixis** : celle-ci se dit
   * sur le plan, donc elle nomme le suivi (« dans ton suivi ») ; l'autre se dit **dans** le suivi,
   * donc elle dit « ici ». Les unifier obligerait l'une des deux à désigner de travers l'endroit où
   * elle est lue.
   *
   * Visage `calm` et non `happy` : la carte explique où sont les choses, elle ne fête rien.
   */
  planEtSuivi: 'Je note tes réponses dans ton suivi, au fil des saisons.',

  /**
   * Juste après « C'est noté », sur la feuille : ce qui va se passer, avant de demander quoi
   * que ce soit. Deux variantes selon la boucle qui concerne la personne — jamais un nombre
   * de jours, toujours le jour lui-même.
   */
  engagementAttenteHebdo: 'Je te laisse mener ton action. Lundi, je reviens te demander si tu l’as faite.',
  engagementAttenteMensuel:
    'Je te laisse mener ton action. Au début du mois prochain, je reviens te demander si tu l’as faite.',

  /** La question de la feuille — le choix du canal vient après, et il est du produit. */
  choixCanal: 'Comment tu préfères que je te fasse signe ?',

  /** Carte d'attente du plan, quand un rappel partira : elle s'engage, et elle tient. */
  attenteSigneHebdo: 'Je te fais signe lundi.',
  attenteSigneMensuel: 'Je te fais signe au début du mois prochain.',

  /**
   * Carte d'attente du plan, sans rappel. Ce n'est pas une punition : elle revient *ici* de
   * toute façon, c'est l'app qui porte le rendez-vous quand aucun canal ne le porte.
   */
  attenteIciHebdo: 'On se retrouve ici lundi.',
  attenteIciMensuel: 'On se retrouve ici au début du mois prochain.',

  /** Suppression de compte effectuée : on ne retient pas, on salue. */
  auRevoir: 'Merci du temps passé ici. Si tu reviens, on repart de zéro, tranquillement.',

  /**
   * Page 404 — la seule page qu'on atteint sans l'avoir voulu : elle rend la main.
   *
   * **Elle ne redit pas que la page n'existe pas** (C3.9, constat A2-24) : le titre de l'écran
   * le dit déjà, deux lignes plus haut, et Ramille le répétait mot pour mot. Elle ne porte que
   * la sortie — ce qui est toujours là, et le fait qu'on y retourne.
   */
  introuvable: 'Ton bilan et ton plan, eux, sont toujours là — je te ramène.',

  /**
   * **Un mot à l'entrée de chaque section du questionnaire** — quatre, pas neuf (C3.9, constat
   * A13-15).
   *
   * Le questionnaire demande des ordres de grandeur et ne le dit qu'une fois, dans l'onboarding,
   * cinq écrans plus tôt : au troisième champ, la personne se demande si « environ trente
   * kilomètres » est une réponse acceptable, et la précision qu'elle croit devoir donner est ce
   * qui fait abandonner. Ramille le redit à chaque changement de sujet, là où le doute revient.
   *
   * **Quatre et non neuf** : à chaque étape, ce serait du papier peint au troisième écran — la
   * même usure que les variantes de C2.12 traitent ailleurs. Les clés sont les **premières
   * étapes** de chacune des quatre sections, et ces quatre-là sont toujours visibles (les sauts
   * du questionnaire ne portent que sur des étapes qui les suivent).
   */
  entreeDeSection: {
    commute_has_trip: 'À peu près, c’est déjà bien. Je ne vérifie rien, et personne ne relit.',
    leisure_frequency: 'Pense à une semaine ordinaire, pas à la meilleure ni à la pire.',
    flights: 'De mémoire, sans aller chercher. C’est l’ordre de grandeur qui compte.',
    context: 'Ce qui est possible là où tu vis change ce que je te proposerai ensuite.',
  } satisfies Record<
    Extract<BilanStepId, 'commute_has_trip' | 'leisure_frequency' | 'flights' | 'context'>,
    string
  >,
} as const;
