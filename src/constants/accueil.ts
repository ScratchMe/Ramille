// Les textes de la page d'accueil du web (`src/components/accueil/page-d-accueil.tsx`, étape 5 de
// `docs/architecture/v1-35-l-audit-en-chantiers.md`, 23/10/2026).
//
// **Rien n'y est écrit pour l'occasion.** La personne qui pilote a demandé « l'équivalent de la fiche
// Play, qui donne envie, avec le film » : le corps de la page est la description de la fiche
// (`docs/exploitation/fiche-google-play.md` §2.1), mot pour mot, et chaque phrase y a sa ligne dans la
// table « Ce que chaque phrase engage » — ce qui la rend vraie aujourd'hui, et ce qu'il faut revoir
// quand le produit change. `accueil.test.ts` compare les deux : une phrase changée ici sans la fiche, ou
// dans la fiche sans ici, fait rougir la suite. L'accroche et la ligne sous le bouton sont celles de
// l'onboarding (`src/components/onboarding/etape-accroche.tsx`), la description courte celle de Play.
//
// **Deux phrases n'ont pas de jumelle dans la fiche** : la ligne sous le film, décidée par la personne qui
// pilote le 23/10/2026 (le film montre la notification d'Android, et sur le web le rappel n'arrive que par
// email, avec un compte — `RAMILLE.signeSurLeWebParEmail` le dit au premier engagement) ; et le titre du
// film, qui est son nom (« Le fil de Ramille », son README).
import {
  CONSUMPTION_POSTES,
  CONSUMPTION_POSTES_TOTAL_T,
  formatTonnesShort,
  TARGET_2050_TRANSPORT_T,
} from '@/constants/carbon-reference';
import { APP_NAME } from '@/constants/produit';

/** Ce que la fiche Play dit, découpé comme la page le montre. */
export const ACCUEIL = {
  /** L'accroche de l'onboarding, le titre de la page. */
  titre: 'Comprendre tes trajets, sans te juger.',
  /** La description courte de la fiche Play. */
  chapeau: 'Calcule l’empreinte carbone de tes trajets et change une habitude à la fois.',
  /** La phrase de l'onboarding qui répond à « J'ai déjà un compte », posée au-dessus de lui. */
  sansCompte: 'Pas de compte à créer pour commencer.',
  bouton: 'Découvrir mon impact',
  dejaUnCompte: 'J’ai déjà un compte',
  /** Le premier paragraphe de la description complète. */
  introduction:
    `${APP_NAME} calcule l’empreinte carbone de tes déplacements à partir de ce que tu déclares : ton trajet ` +
    'domicile-travail, tes loisirs et tes voyages. Les calculs reposent sur les facteurs d’émission de ' +
    'l’ADEME, fabrication des véhicules comprise.',
  sections: [
    {
      titre: 'Ton bilan',
      texte:
        'Un questionnaire court sur tes habitudes, sans géolocalisation. Tu obtiens ton total annuel, sa ' +
        'répartition par poste et le poste sur lequel tu as le plus de prise. Ton résultat est situé par ' +
        'rapport à des repères nationaux, jamais par rapport aux autres utilisateurs.',
    },
    {
      titre: 'Ton plan',
      texte:
        `${APP_NAME} te propose des actions chiffrées en kilos de CO₂ par an, adaptées à ce que tu déclares ` +
        'de ta zone et de tes transports : pas de métro proposé à la campagne. Tu en choisis une, et tu ' +
        'fixes toi-même quand tu la fais.',
    },
    {
      titre: 'Ton suivi',
      texte:
        'Selon ce que tu déclares, une question revient chaque semaine pour ton trajet, ou chaque mois pour ' +
        'tes sorties et tes voyages, pour voir si ça tient. Tu choisis le rappel : par notification, par ' +
        'email si tu as un compte, ou aucun. Si tu ne reviens plus, les rappels s’espacent puis ' +
        's’arrêtent. Le plan se renouvelle à chaque saison, et tu refais ton bilan quand ta vie change.',
    },
  ],
  garanties: {
    titre: 'Sans compte, sans publicité',
    points: [
      'Ton bilan, ton plan et ton suivi se font sans compte. Un compte, par email ou avec Google et sans ' +
        'mot de passe, sert à retrouver ton suivi sur un autre appareil et à recevoir tes rappels par email.',
      'Aucune publicité, aucun traceur publicitaire, aucune revente de données.',
      'Aucun classement ni comparaison entre utilisateurs.',
      'Tes réponses et ton compte sont hébergés dans l’Union européenne. Tu peux récupérer tes données ou ' +
        'supprimer ton compte depuis l’application.',
    ],
  },
  limites: {
    titre: `Ce que ${APP_NAME} n’est pas`,
    texte:
      'Le résultat est une estimation fondée sur des moyennes nationales. Ce n’est ni une mesure de tes ' +
      'émissions réelles, ni un bilan carbone certifié.',
  },
  /** La dernière ligne de la fiche, sans l'adresse, que la page rend en lien. */
  editeur: `${APP_NAME} est un projet personnel, sans but lucratif, conçu en France. Une question : `,
} as const;

/** Le film de présentation (`docs/communication/le-fil-de-ramille/`), servi par le site. */
export const FILM = {
  /** Le nom du film (`docs/communication/le-fil-de-ramille/README.md`), qui ne dépend pas de sa durée. */
  titre: `Le fil de ${APP_NAME}`,
  /**
   * **Sous le film, où le rappel arrive** (décidé le 23/10/2026). Le film montre la notification du
   * lundi sur un téléphone Android ; quelqu'un qui le regarde ici commencera sur le web, où il n'y a pas
   * de notification, et où l'email demande un compte. « par email » s'écrit comme la ligne du canal
   * (« Par email », `src/types/rappels.ts`).
   */
  ouArriveLeRappel: `Sur Android, ${APP_NAME} te fait signe par notification ; sur le web, par email.`,
  /** Les deux formats exportés pour le web : le 4:5 pour un écran étroit, le 16:9 au-delà. */
  sources: {
    large: { video: '/film/le-fil-de-ramille-16x9.mp4', affiche: '/film/le-fil-de-ramille-16x9.jpg', rapport: 16 / 9 },
    etroit: { video: '/film/le-fil-de-ramille-4x5.mp4', affiche: '/film/le-fil-de-ramille-4x5.jpg', rapport: 4 / 5 },
  },
} as const;

/**
 * La largeur d'écran sous laquelle le film passe au 4:5. Le 16:9 se compose à 1 600 px de large : sur
 * un téléphone tenu droit (360 à 430 px), ses textes tombent sous la taille d'une note, et le 4:5 a été
 * fait pour ces écrans (le README du film, « Ce que c'est »).
 */
export const LARGEUR_DU_FILM_ETROIT = 600;

/**
 * **Le film en texte** : ce qu'il montre et ce qu'il écrit, chapitre par chapitre, pour qui ne le voit pas
 * ou ne le lance pas. Recopié du film (`docs/communication/le-fil-de-ramille/film.html`) : quand le film
 * change, cette version change avec lui — aucune garde ne compare les deux, comme aucune ne compare les
 * textes du film à ceux de l'app (le README du film le dit).
 *
 * **Les repères nationaux viennent de `carbon-reference.ts`, pas d'une recopie** (`FRONT.md` §2.1, contre-
 * lecture du 23/10/2026) : un repère ne s'écrit jamais en dur dans un écran. Les chiffres du **profil
 * d'exemple** — son bilan, ses postes, ses gains — restent écrits : ce sont ceux que le calcul rend pour ce
 * profil (`profil-d-exemple.sql`), recopiés dans le film, et rien dans l'app ne les porte.
 */
const [TRANSPORT, LOGEMENT, ALIMENTATION, SERVICES, EQUIPEMENTS] = CONSUMPTION_POSTES;
const tonnes = (valeur: number) => formatTonnesShort(valeur);
export const FILM_EN_TEXTE: readonly { chapitre: string; texte: string }[] = [
  {
    chapitre: 'Tes trajets',
    texte:
      'Un trait dessine un trajet qui passe chez toi, au travail, le week-end, en vacances. « Chaque jour, tu te ' +
      'déplaces. Lequel pèse le plus ? »',
  },
  {
    chapitre: 'Ce qu’ils pèsent',
    texte:
      `« En France, le transport est le premier poste de l’empreinte carbone » : ${tonnes(TRANSPORT.valueT)} CO₂e ` +
      `par personne et par an, en moyenne, devant le logement (${tonnes(LOGEMENT.valueT)}), l’alimentation ` +
      `(${tonnes(ALIMENTATION.valueT)}), les services (${tonnes(SERVICES.valueT)}) et les équipements ` +
      `(${tonnes(EQUIPEMENTS.valueT)}). Source : SDES, données 2017 ; l’empreinte moyenne, tous postes, est de ` +
      `${tonnes(CONSUMPTION_POSTES_TOTAL_T)}. « Et les tiens, ils pèsent combien ? »`,
  },
  {
    chapitre: APP_NAME,
    texte:
      `Le trait devient une feuille, puis le visage de ${APP_NAME}, qui dit : « Moi, c’est ${APP_NAME}. Je serai là à ` +
      'chaque saison, à ton rythme. » Et dessous : « Comprendre tes trajets, sans te juger. »',
  },
  {
    chapitre: 'Ton bilan',
    texte:
      '« Ton bilan, en 5 minutes environ. Quelques questions sur tes déplacements habituels. » Le téléphone montre ' +
      'quatre des neuf étapes — le trajet régulier, son mode, les loisirs, les vols —, puis le résultat d’un profil ' +
      'd’exemple, calculé par l’app : 2,1 t CO₂e par an, dont 1,3 t pour le trajet domicile-travail, 333 kg pour ' +
      'les loisirs et 476 kg pour les voyages longue distance ; le prochain palier à 1,8 t, la moyenne en France à ' +
      `${tonnes(TRANSPORT.valueT)}, le repère transport 2050 à ${tonnes(TARGET_2050_TRANSPORT_T)}. « Tu vois quel ` +
      'déplacement pèse le plus. Et où tu te situes, entre la moyenne française et le repère 2050. »',
  },
  {
    chapitre: 'Ton plan',
    texte:
      '« Puis une action, à ton rythme. Ton plan ne propose que ce qui tient avec tes réponses. » Deux pistes en ' +
      'tête : passer deux trajets sur cinq en train (− 412 kg CO₂e par an), et faire ce trajet à deux au moins un ' +
      'jour sur deux (− 320 kg). On choisit la seconde, puis ses jours, lundi, mercredi et vendredi, et « C’est ' +
      'noté » : elle passe en tête, avec son premier pas. « Tu choisis tes jours. ' +
      `${APP_NAME} te fait signe lundi. »`,
  },
  {
    chapitre: 'Le point',
    texte:
      'Lundi, une notification : « Ton point de la semaine ». « Un point, de temps en temps. Une seule question, ' +
      'sur ton action » : « Lundi ou mercredi ou vendredi, as-tu fait ce trajet à deux ? » Une semaine, « Oui » : ' +
      '« Bien joué — chaque changement compte. » La suivante, « Non » : « Pas cette fois-ci. Rien d’obligatoire, on ' +
      'se repose la question au prochain point. » « Oui, non, ou pas de trajet. Aucune réponse n’est un échec. ' +
      'Pas de score. Pas de série. Aucun classement. Tes réponses restent privées. »',
  },
  {
    chapitre: 'Au fil des saisons',
    texte:
      `« Saison après saison, tu vois ce qui a changé. » ${APP_NAME} porte l’automne, l’hiver, le printemps et ` +
      'l’été, et dit : « Je note tes réponses dans ton suivi, au fil des saisons. »',
  },
  {
    chapitre: 'À toi',
    texte:
      `${APP_NAME}. « Comprendre tes trajets, sans te juger. » « Découvrir mon impact », sur ramille.fr. « Pas de ` +
      'compte à créer pour commencer. »',
  },
];
