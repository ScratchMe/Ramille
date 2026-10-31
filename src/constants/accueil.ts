// Les textes de la page d'accueil du web (`src/components/accueil/page-d-accueil.tsx`).
//
// **Deux parties, et deux règles** (`docs/architecture/v1-36-la-page-d-accueil.md`, 31/10/2026) :
//
// - **le récit** (`RECIT`), écrit pour la page : il part de l'été 2026 tel que Météo-France l'a mesuré,
//   montre la part du transport dans notre empreinte, puis ce qu'on peut faire — décidé avec la personne
//   qui pilote le 31/10/2026, « Que l'été 2026 reste une exception », un mélange de deux promesses
//   proposées : les faits de l'été, puis « Tu ne peux pas arrêter une canicule. Tu peux changer un
//   trajet. ». Ses chiffres viennent de `climat.ts` et de `carbon-reference.ts`, jamais d'ici ;
// - **ce que fait Ramille** (`ACCUEIL`), qui reste la description de la fiche Play, mot pour mot
//   (`docs/exploitation/fiche-google-play.md` §2.1) : chaque phrase y a sa ligne dans la table « Ce que
//   chaque phrase engage », et `accueil.test.ts` compare les deux. La page d'avant l'était tout entière
//   (étape 5 de `v1-35`, 23/10/2026) ; elle allait trop vite à la mesure de l'empreinte, et ne parlait
//   qu'à qui était déjà sensibilisé.
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
import { FAITS_DE_L_ETE } from '@/constants/climat';
import { APP_NAME } from '@/constants/produit';

const enDegres = (valeur: number) => `+${String(valeur).replace('.', ',')} °C`;

/**
 * **Le récit**, dans l'ordre de la page. Chaque phrase sur l'été reprend le bilan de Météo-France
 * (`SOURCE_DE_L_ETE`), page citée dans `climat.ts` ; la page cite la source sous les chiffres. Aucun
 * vocabulaire de catastrophe, aucune injonction : des faits datés, puis ce qui est à notre portée.
 */
export const RECIT = {
  surtitre: 'Été 2026, d’après Météo-France',
  titre: 'Que l’été 2026 reste une exception.',
  chapeau:
    'Le plus chaud jamais mesuré en France, depuis 1900. La suite dépend de ce que nous émettons — et en ' +
    'France, le transport est le premier poste de notre empreinte carbone.',
  bouton: 'Voir ce que pèsent mes trajets',
  duree: 'Ton bilan prend 5 minutes environ.',
  ete: {
    titre: `${FAITS_DE_L_ETE.joursDeVagueDeChaleur} jours de vague de chaleur`,
    texte:
      'Trois vagues, de la mi-juin à la mi-août : plus d’un jour sur deux. Loin devant l’été 2022 et ses ' +
      `${FAITS_DE_L_ETE.joursDeVagueDeChaleur2022} jours.`,
    legende: 'Un carré par jour, du 1er juin au 31 août. En plein, les jours de vague de chaleur.',
    faits: [
      `${FAITS_DE_L_ETE.departementsEnVigilanceRouge} départements en vigilance rouge canicule, en juin.`,
      `Près de ${FAITS_DE_L_ETE.deficitDePluiePct} % de pluie en moins qu’un été normal.`,
      'La saison des feux de forêt la plus sévère jamais enregistrée.',
    ],
  },
  echelle: {
    titre: `Aujourd’hui, un été sur ${FAITS_DE_L_ETE.uneChanceSur}. À ${enDegres(FAITS_DE_L_ETE.ordinaireDansUneFranceAC)}, un été ordinaire.`,
    texte:
      'Selon Météo-France, l’été 2026 aurait été quasi impossible sans le changement climatique. Dans le ' +
      `climat actuel, un tel été a une chance sur ${FAITS_DE_L_ETE.uneChanceSur} de se produire. Dans une ` +
      `France à ${enDegres(FAITS_DE_L_ETE.ordinaireDansUneFranceAC)}, il serait ordinaire.`,
    reperes: [
      { libelle: 'Aujourd’hui', detail: `Un été comme 2026 : une chance sur ${FAITS_DE_L_ETE.uneChanceSur}.` },
      { libelle: enDegres(FAITS_DE_L_ETE.franceA2050C), detail: 'La France vers 2050.' },
      {
        libelle: enDegres(FAITS_DE_L_ETE.ordinaireDansUneFranceAC),
        detail: 'La France vers 2100. Un été comme 2026 y serait ordinaire.',
      },
    ],
    note:
      `${enDegres(FAITS_DE_L_ETE.franceA2050C)} et ${enDegres(FAITS_DE_L_ETE.ordinaireDansUneFranceAC)} : la ` +
      'trajectoire de réchauffement sur laquelle la France prépare son adaptation.',
    suite: `Arriver à ${enDegres(FAITS_DE_L_ETE.ordinaireDansUneFranceAC)}, ou s’arrêter avant : c’est ce que décident nos émissions.`,
  },
  trajets: {
    titre: 'Et nos trajets ?',
    /** Les repères viennent de `carbon-reference.ts`, mis en mots par la page (`FRONT.md` §2.1). */
    texte: (transport: string, total: string) =>
      `En France, le transport est le premier poste de notre empreinte carbone : ${transport} CO₂e par ` +
      `personne et par an, sur ${total}.`,
  },
  agir: {
    titre: 'Tu ne peux pas arrêter une canicule. Tu peux changer un trajet.',
    texte:
      `${APP_NAME} t’aide à voir ce que pèsent tes trajets, puis à en changer un, à ton rythme. Une habitude ` +
      'à la fois, sans te juger.',
  },
  comment: { titre: 'Comment ça marche' },
  fin: {
    titre: 'Commence par tes trajets.',
    texte: 'Cinq minutes pour voir ce qu’ils pèsent. Puis une action, celle que tu choisis, quand tu veux.',
  },
} as const;

/** Ce que la fiche Play dit, découpé comme la page le montre. */
export const ACCUEIL = {
  /** La description courte de la fiche Play. */
  chapeau: 'Calcule l’empreinte carbone de tes trajets et change une habitude à la fois.',
  /** La phrase de l'onboarding qui répond à « J'ai déjà un compte », posée au-dessus de lui. */
  sansCompte: 'Pas de compte à créer pour commencer.',
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
