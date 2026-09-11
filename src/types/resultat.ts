/**
 * Le résultat d'un bilan a **deux entrées, et un seul écran** (v1-11 §1).
 *
 * En fin de questionnaire, c'est l'aboutissement : on propose la suite (le plan) et, la
 * première fois, on propose de rattacher un compte. Ouvert depuis le suivi, c'est la relecture
 * d'un instantané : ni suite ni proposition, mais un retour — sinon l'écran pousserait vers un
 * plan qu'on a déjà, et redemanderait un compte à chaque consultation de son historique.
 *
 * Dérivé ici plutôt que dans l'écran pour la raison habituelle : c'est une règle, elle se
 * teste, et elle ne doit pas se réinventer si une troisième entrée apparaît un jour.
 *
 * **Toute la voix de la restitution a rejoint ce module le 11/09/2026** (A3-17) : les
 * prépositions de mode, les sujets de poste, les trois phrases (titre du poste dominant,
 * comparaison, palier) et l'URL de partage vivaient dans l'écran, donc dans un fichier qui
 * importe `@/lib/supabase` — ce que la convention du dépôt interdit à un module testé. C'est
 * ce qui avait laissé coexister quatre défauts (A3-6, A3-9, A3-10, A3-14) qu'une assertion
 * d'une ligne aurait chacun attrapés. Ici, rien n'importe le client Supabase ni React Native :
 * tout se teste.
 */
import {
  FRANCE_AVERAGE_TRANSPORT_T,
  TARGET_2050_TRANSPORT_T,
  formatTonnesShort,
} from '@/constants/carbon-reference';
import { formatTonnes } from '@/lib/format';
import type { Palier } from '@/types/palier';

export type ModeResultat = 'nouveau' | 'relecture';

/**
 * `nouveau` seulement sur le paramètre explicite posé par le questionnaire à sa dernière
 * étape. Tout le reste — un lien partagé, un favori, une entrée du suivi, un paramètre
 * absent — est une relecture. Le défaut penche vers le mode le plus sobre : se tromper en
 * relecture ne fait rien perdre, alors que se tromper en « nouveau » relancerait une
 * proposition de compte à quelqu'un qui consulte simplement son historique.
 */
export function modeResultat(nouveau: string | undefined): ModeResultat {
  return nouveau === '1' ? 'nouveau' : 'relecture';
}

/**
 * Ce que l'écran lit d'un résultat pour écrire ses phrases. Forme structurelle plutôt que la
 * ligne complète d'`assessment_results` : ce module ne doit connaître ni le client Supabase
 * ni le reste du schéma, et la ligne réelle satisfait ce contrat par construction — si une de
 * ces colonnes disparaissait, c'est l'appel dans l'écran qui ne compilerait plus.
 */
export type ResultatBilan = {
  total_co2_kg_year: number;
  dominant_poste: string;
  dominant_poste_label: string;
  dominant_poste_mode: string | null;
  dominant_poste_co2_kg_year: number;
};

/**
 * Les identifiants de `public.transport_modes`, **relevés en base à la main le 11/09/2026**.
 *
 * C'est un miroir tenu à la main, et il faut lire exactement ce que la garde de type couvre :
 * `MODE_PREPOSITION` étant un `Record` sur cette liste, elle garantit la cohérence **interne**
 * au fichier — un identifiant ajouté ici sans préposition ne compile pas, et un test parcourt
 * la liste plutôt que d'énumérer les cas à la main. Elle ne garantit **rien** sur la
 * correspondance avec la base : ajouter un mode au produit, c'est une migration SQL, et un
 * mode résolu côté serveur (les quatre deux-roues de `20260905200000`, les quatre
 * motorisations, le TGV) ne traverse aucun fichier TypeScript. Le `Record` ne se déclenche que
 * si on a déjà pensé à venir ici — c'est très exactement le chemin qui a produit A3-6, où les
 * quatre deux-roues motorisés manquaient alors que `recompute_assessment_results` passe par
 * `resolve_mode` et qu'ils peuvent parfaitement être le `dominant_poste_mode`.
 *
 * La garde qui manque est donc côté SQL : une assertion pgTAP épinglant la liste exacte des
 * identifiants de `public.transport_modes`, sur le modèle de « tout mode a une source » — une
 * migration qui ajoute un mode tomberait alors en CI et nommerait ce fichier. À écrire (cf.
 * `v1-13`, reste du chantier C1.8).
 *
 * Tous ne sont pas sélectionnables dans le questionnaire — `train_longue_distance` (le TGV du
 * poste voyages, B3.3) ne l'est pas, et les quatre motorisations de voiture et les quatre
 * deux-roues sont résolus côté serveur à partir d'un mode générique et d'une réponse de suivi.
 * Ils arrivent tous ici par `dominant_poste_mode`, d'où une liste plus large que
 * `src/constants/transport-modes.ts`.
 */
export const MODE_IDS = [
  'voiture',
  'voiture_thermique',
  'voiture_hybride',
  'voiture_hybride_rechargeable',
  'voiture_electrique',
  'deux_roues_motorise',
  'deux_roues_scooter_thermique',
  'deux_roues_scooter_electrique',
  'deux_roues_moto_petite',
  'deux_roues_moto_grosse',
  'bus',
  'metro_tram',
  'train',
  'train_longue_distance',
  'velo',
  'marche',
  'trottinette',
  'avion_court_moyen_courrier',
  'avion_long_courrier',
] as const;

export type ModeId = (typeof MODE_IDS)[number];

/**
 * « Tes voyages » seul ne dit pas de quoi il s'agit — on précise toujours le mode réel
 * (`dominant_poste_mode`, déjà en base) plutôt que le seul nom du poste.
 *
 * Le vocabulaire des quatre deux-roues suit celui du questionnaire
 * (`TWO_WHEELER_TYPE_OPTIONS`) : c'est là que la personne a répondu, elle doit se reconnaître.
 * Et c'est le cas où nommer le mode compte le plus — une grosse moto émet 0,2147 kg/km, une
 * fois et demie une voiture thermique.
 */
export const MODE_PREPOSITION: Record<ModeId, string> = {
  voiture: 'en voiture',
  voiture_thermique: 'en voiture thermique',
  voiture_electrique: 'en voiture électrique',
  voiture_hybride: 'en voiture hybride',
  voiture_hybride_rechargeable: 'en voiture hybride rechargeable',
  deux_roues_motorise: 'en deux-roues motorisé',
  deux_roues_scooter_thermique: 'en scooter thermique',
  deux_roues_scooter_electrique: 'en scooter électrique',
  deux_roues_moto_petite: 'en moto de petite cylindrée',
  deux_roues_moto_grosse: 'en moto de grosse cylindrée',
  train: 'en train',
  // Mode du poste voyages uniquement (B3.3, trajets > 300 km) — jamais sélectionnable dans
  // les listes du questionnaire, cf. migration 20260904140000.
  train_longue_distance: 'en TGV',
  bus: 'en bus',
  metro_tram: 'en métro ou tram',
  velo: 'à vélo',
  marche: 'à pied',
  trottinette: 'en trottinette',
  avion_court_moyen_courrier: 'en avion (court/moyen-courrier)',
  avion_long_courrier: 'en avion long-courrier',
};

/**
 * La préposition d'un mode, ou rien. `dominant_poste_mode` vient de la base en `string | null`
 * (un bilan soumis avant les migrations de motorisation n'en porte pas) : la recherche se fait
 * donc sur une chaîne quelconque. Un mode inconnu rend `undefined`, que les appelants
 * traduisent en « pas de préposition » — jamais une chaîne vide à l'écran.
 */
export function prepositionDuMode(modeId: string | null | undefined): string | undefined {
  if (!modeId) return undefined;
  return (MODE_PREPOSITION as Record<string, string | undefined>)[modeId];
}

/**
 * « Trajets loisirs »/« Voyages » seuls ne distinguent pas les deux postes (retour
 * utilisateur du 03/09/2026) : ce sont deux postes bien distincts du bilan (B2 « Week-ends et
 * loisirs » vs B3 « Voyages sur l'année »). Même wording que les libellés persistés côté
 * serveur, cf. migration `20260903120000_precise_poste_labels.sql`.
 */
export const POSTE_SUBJECT: Record<string, string> = {
  commute: 'Ton trajet domicile-travail',
  leisure: 'Tes loisirs du week-end',
  travel: 'Tes voyages longue distance',
};

/** Les mêmes postes en étiquette neutre : répartition du bilan, liste du suivi, partage. */
export const POSTE_LABEL: Record<string, string> = {
  commute: 'Trajet domicile-travail',
  leisure: 'Loisirs du week-end',
  travel: 'Voyages longue distance',
};

/**
 * Les mêmes, en milieu de phrase. Un seul vocabulaire, deux casses : un test épingle que
 * cette table est `POSTE_SUBJECT` à la majuscule près, pour qu'elles ne divergent pas.
 */
export const POSTE_EN_PHRASE: Record<string, string> = {
  commute: 'ton trajet domicile-travail',
  leisure: 'tes loisirs du week-end',
  travel: 'tes voyages longue distance',
};

/**
 * Un bilan sans aucune émission — atteignable, et c'est le profil que le produit veut
 * reconnaître plutôt que coiffer d'un « Le déplacement qui pèse le plus » (A3-14).
 *
 * Plus rare que le commentaire d'origine de l'écran ne le disait : depuis le passage aux
 * facteurs ACV (`20260905100000_facteurs_acv_complete.sql`), `marche` est le **seul** mode à
 * facteur nul — le vélo ne l'est plus, fabrication comprise. Il faut donc un profil marche
 * uniquement, zéro loisir et zéro voyage.
 */
export function bilanSansEmissions(results: ResultatBilan): boolean {
  return results.total_co2_kg_year <= 0;
}

/**
 * La part d'un poste dans le total, en pourcentage. Rend 0 quand le total est nul plutôt que
 * `NaN` : toutes les parts se divisent par le total, et ce garde-fou n'existait qu'à un des
 * deux endroits qui le calculaient (A3-12).
 */
export function partDuTotal(kg: number, totalKg: number): number {
  if (totalKg <= 0) return 0;
  return (kg / totalKg) * 100;
}

/** La part du poste dominant, arrondie — affichée à l'écran et transmise à la carte de partage. */
export function pourcentageDominant(results: ResultatBilan): number {
  return Math.round(partDuTotal(results.dominant_poste_co2_kg_year, results.total_co2_kg_year));
}

/** Le titre du poste dominant, adressé à la personne : « Tes voyages longue distance en TGV ». */
export function dominantHeadline(results: ResultatBilan): string {
  const subject = POSTE_SUBJECT[results.dominant_poste] ?? results.dominant_poste_label;
  const preposition = prepositionDuMode(results.dominant_poste_mode);
  return preposition ? `${subject} ${preposition}` : subject;
}

/**
 * Variante neutre de `dominantHeadline` (sans « Tes »/« Ton ») pour la carte de partage : lue
 * par les destinataires du lien, pas adressée à la personne qui partage — cf.
 * `v1-06-partage-social.md` §2. `dominant_poste_label` seul (ex. « Voyages longue distance
 * (Avion long-courrier) ») ne dit pas qu'il s'agit du poste dominant ; combiné au pourcentage
 * sur la carte, il prend son sens (retour utilisateur du 04/09/2026).
 */
export function dominantShareLabel(results: ResultatBilan): string {
  const posteLabel = POSTE_LABEL[results.dominant_poste] ?? results.dominant_poste_label;
  const preposition = prepositionDuMode(results.dominant_poste_mode);
  return preposition ? `${posteLabel} ${preposition}` : posteLabel;
}

/**
 * L'adresse de partage : `/api/partage` (Vercel Edge Function, hors export statique Expo)
 * plutôt qu'un lien direct vers la restitution, pour que l'aperçu affiché par les apps de
 * messagerie montre une vraie image de résultat et pas une page vide.
 *
 * Les chiffres transmis sont ceux que la personne voit déjà à l'écran — aucune nouvelle
 * lecture serveur, aucune exposition au-delà de ce qu'elle choisit de partager. Le total garde
 * le dixième de tonne : c'est la forme que les deux fonctions `api/` parsent.
 */
export function urlDePartage(results: ResultatBilan, appUrl: string): string {
  const params = new URLSearchParams({
    total: (results.total_co2_kg_year / 1000).toFixed(1),
    poste: dominantShareLabel(results),
    percent: String(pourcentageDominant(results)),
  });
  return `${appUrl}/api/partage?${params.toString()}`;
}

/**
 * « Tu es à 150 % de la moyenne française » était un jugement déguisé en fait : un score, avec
 * un bon et un mauvais côté, servi à quelqu'un qui n'a parfois aucune alternative (rural, pas
 * de transports en commun). La spec demande de contextualiser « sans ton culpabilisant » (§5)
 * et de ne pas traiter ces profils en mauvais élèves (§2). Les barres au-dessus montrent déjà
 * l'écart : la phrase se contente de le nommer et d'ouvrir sur la suite. Cf. v1-07 §3.5.
 *
 * **Elle nomme le poste au lieu de le désigner par sa position** (A3-10). Elle disait
 * « celui du haut » alors que la répartition est dans la carte précédente et suit l'ordre fixe
 * du questionnaire (B1 → B2 → B3) : pour quelqu'un dont le poste dominant est le long-courrier,
 * la phrase envoyait regarder la mauvaise ligne, au moment même où le produit essaie de rendre
 * la décision dominante mémorable. Sans la préposition de mode, qui alourdirait la phrase.
 */
export function comparisonNote(results: ResultatBilan): string {
  const totalT = results.total_co2_kg_year / 1000;

  if (totalT <= TARGET_2050_TRANSPORT_T) {
    return 'Tu es déjà sous la part transport compatible avec 2050.';
  }
  if (totalT <= FRANCE_AVERAGE_TRANSPORT_T) {
    return 'Tu es en dessous de la moyenne française. Il reste du chemin jusqu’à 2050, comme pour tout le monde.';
  }
  const poste = POSTE_EN_PHRASE[results.dominant_poste] ?? results.dominant_poste_label;
  return (
    `La moyenne française est de ${formatTonnesShort(FRANCE_AVERAGE_TRANSPORT_T)}. ` +
    `L’essentiel se joue sur un seul poste : ${poste}.`
  );
}

/**
 * La phrase qui accompagne le palier. Elle nomme la marche et situe 2050 comme un horizon,
 * jamais comme une mesure de l'écart : c'est précisément ce que la barre faisait, et ce que la
 * spec §4 demande d'éviter (« le registre anxiogène tend à paralyser plutôt qu'à mobiliser »).
 *
 * Aucune formulation d'échec : on ne dit pas combien de paliers restent. « Il t'en reste 15 »
 * est une autre façon d'écrire le gouffre.
 *
 * **Elle n'est rendue qu'en mode `nouveau`** (A3-3, A3-9, A13-14), et les deux dernières
 * branches en dépendent : le cap vient du cycle de plan **courant**, il n'appartient pas au
 * bilan qu'on relit, et « le plan qui suit » ne suit rien quand on consulte son historique —
 * l'écran n'y propose plus que « Revenir à mon suivi ». La relecture affiche `comparisonNote`,
 * qui ne promet rien.
 */
export function palierNote(palier: Palier, repereVisible: boolean): string {
  const reduction = formatTonnes(palier.reductionKg);

  // Déjà sous le repère. Le registre bascule : ce n'est plus une marche à franchir mais une
  // marge qui profite ailleurs. Rien n'est demandé, rien n'est attendu — et surtout aucune
  // formulation qui ferait d'un profil déjà sobre quelqu'un qui n'en fait pas encore assez.
  if (palier.beyondTarget2050) {
    return (
      `Tu es déjà sous le repère transport 2050. Ce que tu n’émets pas laisse de la marge ` +
      `ailleurs — pour tes autres postes, ou pour ceux dont les déplacements sont contraints. ` +
      `S’il te reste de l’envie : ${reduction} de moins sur l’année.`
    );
  }

  // Le palier tombe pile sur le repère : la barre porte alors son vrai nom, et la phrase dit
  // ce qu'il faut pour l'atteindre.
  if (palier.isTarget2050) {
    return `Le repère 2050 est à ta portée : ${reduction} de moins sur l’année, et tu y es.`;
  }

  if (repereVisible) {
    // Le repère est déjà sur l'écran : la phrase n'a pas à le rappeler, elle nomme la marche.
    return `Une marche à ${reduction} de moins sur l’année. Le plan qui suit propose de quoi la franchir.`;
  }
  return `Une marche à ${reduction} de moins sur l’année. Le plan qui suit propose de quoi la franchir ; 2050 se joue palier après palier.`;
}
