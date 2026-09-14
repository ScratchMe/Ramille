// « Comment ce chiffre est calculé » — le bloc dépliable sous le total de la restitution (C3.2).
//
// ## Pourquoi ce texte existe
//
// Rien sous le total ne disait d'où il vient. Ce n'est pas un manque de transparence de
// principe : c'est ce qui rend le chiffre **incomparable** à celui d'un autre outil sans que
// personne puisse s'en rendre compte. Tous les facteurs du produit portent l'ACV complète —
// usage **et** fabrication — là où la plupart des simulateurs grand public ne comptent que
// l'usage. L'écart va de 29 % sur une voiture thermique à **457 % sur une électrique**, et il
// fait afficher un vélo non nul là où ailleurs il vaut zéro. Quelqu'un qui compare deux
// résultats sans savoir ça conclut que l'un des deux se trompe.
//
// ## Deux règles d'écriture
//
// **Chaque ligne est sourcée ou explicitement donnée pour une hypothèse.** C'est la règle de
// `carbon-reference.ts`, étendue ici aux constantes du calcul : les distances de référence, les
// fréquences et les 45 semaines ne sont publiées nulle part — ce sont des choix de produit, et
// les écrire « à peu près » les ferait passer pour des mesures. Le mot « on suppose » est donc
// dans le texte, pas dans un commentaire.
//
// **Le texte vit ici et jamais dans l'écran.** Même raison que `carbon-reference.ts` : ces
// phrases portent la crédibilité du produit, et une phrase de crédibilité écrite au milieu d'un
// `<View>` finit par diverger de la valeur qu'elle décrit. Les constantes citées plus bas sont
// celles de `recompute_assessment_results` ; les toucher impose de reprendre ce fichier, et ce
// qui garde l'égalité est `scripts/verifier-hypotheses-calcul.mjs`, lancé en CI.

import { formatDate } from '@/types/suivi';

/** Une section du bloc : un intitulé, et les lignes qui le composent. */
export type SectionDeMethode = {
  titre: string;
  lignes: string[];
};

/** Libellé du lien qui ouvre et referme le bloc. */
export const METHODE_TITRE = 'Comment ce chiffre est calculé';

/**
 * Les constantes du calcul, dans les unités où le SQL les écrit.
 *
 * Miroir tenu à la main de `recompute_assessment_results` — même nature que `MODE_IDS` dans
 * `src/types/resultat.ts`, et même limite : rien ne vérifie la correspondance côté base. Ce qui
 * la garde ici, c'est que le texte affiché est **dérivé** de ces valeurs plutôt que réécrit à
 * côté d'elles : une constante modifiée change la phrase, elle ne la laisse pas mentir.
 */
export const HYPOTHESES = {
  /** Semaines travaillées par an. Congés, jours fériés et absences retirés de 52. */
  semainesDomicileTravail: 45,
  /** Semaines par an pour les loisirs — l'année entière, eux ne s'arrêtent pas. */
  semainesLoisirs: 52,
  /** Sorties par semaine selon la fréquence déclarée. */
  sortiesParSemaine: { rarement: 0.25, hebdomadaire: 1, plusieurs: 3 },
  /** Distance d'une sortie quand la personne répond « rarement » et ne donne rien d'autre. */
  distanceSortieParDefautKm: 15,
  /** Distance retenue pour un vol court ou moyen-courrier. */
  volCourtKm: 1500,
  /** Distance retenue pour un vol long-courrier. */
  volLongKm: 9000,
  /** Distance retenue pour un trajet en train de plus de 300 km. */
  trainLongKm: 800,
  /** Distance retenue pour un long trajet en voiture. */
  voitureLongKm: 700,
  /**
   * Part du trajet domicile-travail attribuée au second mode **quand elle n'a pas été
   * demandée** — c'est-à-dire à tout bilan antérieur à C3.4, qui a fait de cette moitié une
   * question à trois puces au lieu d'une hypothèse appliquée à tout le monde.
   */
  partDuSecondMode: 0.5,
} as const;

/**
 * Écrit un nombre à la française : virgule décimale, espace insécable fine pour les milliers
 * (« 0,25 », « 45 », « 1 500 »).
 *
 * Écrit à la main plutôt que par `toLocaleString('fr-FR')`, pour la raison qui vaut déjà pour
 * `MOIS_FRANCAIS` : Hermes peut être construit sans ICU complet et rendrait alors « 0.25 » — un
 * point décimal au milieu d'un texte qui explique d'où vient un chiffre, donc exactement là où
 * il se remarque. Invisible en CI, visible sur l'appareil.
 */
function nombre(valeur: number): string {
  const [entier, decimales] = String(valeur).split('.');
  const groupe = entier.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  return decimales ? `${groupe},${decimales}` : groupe;
}

/**
 * Les sections du bloc, dans l'ordre où elles se lisent.
 *
 * `dateDuBilan` est la date de **soumission**, qui est aussi celle à laquelle les facteurs sont
 * figés : `public.emission_factor(mode, date)` borne le facteur à cette date-là, précisément pour
 * qu'un bilan reste reproductible après une mise à jour du référentiel ADEME (`v1-01` §3). La
 * ligne disparaît quand la date est inconnue plutôt que d'annoncer « aujourd'hui », qui serait
 * faux pour toute relecture.
 */
export function sectionsDeMethode(dateDuBilan: string | null): SectionDeMethode[] {
  const h = HYPOTHESES;

  const versionDesFacteurs = dateDuBilan
    ? [`Facteurs figés au ${formatDate(dateDuBilan)}, la date de ce bilan : une mise à jour du référentiel ne réécrit pas un résultat déjà rendu.`]
    : [];

  return [
    {
      titre: 'D’où viennent les facteurs',
      lignes: [
        'ADEME, Base Empreinte — interrogée via l’API Impact CO2 de l’ADEME.',
        ...versionDesFacteurs,
      ],
    },
    {
      titre: 'Ce que le chiffre inclut',
      lignes: [
        'L’usage et la fabrication : le carburant ou l’électricité, mais aussi ce qu’a coûté la construction du véhicule, ramenée au kilomètre.',
        'C’est pour ça qu’un vélo n’est pas à zéro ici, et qu’une voiture électrique y pèse plus lourd que dans un simulateur qui ne compte que l’usage — l’écart peut aller du simple au quintuple.',
        'Conséquence à garder en tête : ce total ne se compare pas à celui d’un outil qui ne dit pas s’il compte la fabrication.',
      ],
    },
    {
      titre: 'Ce qu’on suppose, faute de te le demander',
      lignes: [
        `Ton trajet domicile-travail compte ${nombre(h.semainesDomicileTravail)} semaines par an — 52 moins les congés, les jours fériés et les absences.`,
        `Un second mode déclaré sans sa part du trajet en prend la moitié (${nombre(h.partDuSecondMode * 100)} %) : c'était le cas de tous les bilans faits avant qu'on pose la question.`,
        `« Rarement » vaut ${nombre(h.sortiesParSemaine.rarement)} sortie par semaine, « une fois par semaine » ${nombre(h.sortiesParSemaine.hebdomadaire)}, « plusieurs fois » ${nombre(h.sortiesParSemaine.plusieurs)} — sur ${nombre(h.semainesLoisirs)} semaines.`,
        `Sans distance déclarée, une sortie compte ${nombre(h.distanceSortieParDefautKm)} km.`,
        `Un vol compte ${nombre(h.volCourtKm)} km s’il est court ou moyen-courrier, ${nombre(h.volLongKm)} km s’il est long-courrier — un aller, pas un aller-retour.`,
        `Un trajet en train de plus de 300 km compte ${nombre(h.trainLongKm)} km, un long trajet en voiture ${nombre(h.voitureLongKm)} km.`,
        'Aucune de ces valeurs n’est publiée par une source : ce sont des ordres de grandeur choisis pour ce bilan, pas des mesures.',
      ],
    },
  ];
}
