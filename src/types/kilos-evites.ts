// Ce qu'un « oui » au point a évité, au moins — étape 6a de
// `docs/architecture/v1-35-l-audit-en-chantiers.md`, décidée le 24/10/2026. Module pur, testé :
// `src/types/kilos-evites.test.ts`.
//
// **Le client additionne, il ne calcule rien.** Le gain d'une fois est calculé par
// `estimate_action_savings`, figé sur l'action du plan puis sur le point à sa génération
// (`engagement_checkins.committed_saving_kg_once`), comme la question du point. Ce module en fait la
// somme et la phrase — recalculer un gain ici, c'est la seconde implémentation que `PLAN.md` §1
// interdit.
//
// **Un « oui » se compte au moins une fois**, décision de la personne qui pilote : un aller, une
// journée de télétravail, un aller pour une sortie faite autrement ou une sortie regroupée, un voyage
// que sa question nomme — la plus petite chose qu'il veut dire. Le chiffre est
// donc toujours vrai, et un bilan refait ne le dément jamais. Il ne se retranche de rien : ce n'est pas
// l'« empreinte vivante » que `v1-23` §3.2 refuse, c'est un minimum, séparé du bilan.

import { formatAuMoins } from '@/lib/format';
import { type ReponseDuPoint, STATUT_DU_POINT } from '@/types/checkin';

/** Une réponse donnée sur l'écran, et ce que la ligne portait au moment du geste (`responded_at`). */
export type GesteSurLePoint = { reponse: ReponseDuPoint; ligneAvant: string | null };

/**
 * Les points tels que l'écran les sait, réponses données ici comprises.
 *
 * Le plan lit ses points une fois par visite ; une réponse donnée sur sa carte ne le relit pas. Sans
 * ceci, la carte dirait « Au moins 2,2 kg CO₂e évités. » au-dessus d'un total de la saison qui ne le
 * compte pas encore — ou, en début de saison, sous une carte d'ouverture dont le récapitulatif l'ignore :
 * la dernière semaine et le dernier mois d'une saison se répondent dans la suivante, et ils comptent dans
 * la saison qu'ils interrogent — la carte d'ouverture tant qu'elle est là (quinze jours au plus, refermée
 * d'un geste), le suivi ensuite —, jamais dans le total de celle qui commence. **La règle est celle de la carte** (`checkin-card.tsx`) : le geste vaut tant que
 * la ligne porte ce qu'elle portait au geste, et la ligne relue l'emporte ensuite — une correction
 * faite sur un autre appareil n'est donc pas masquée par un geste plus ancien.
 */
export function avecLesGestes<
  P extends { id: string; status: string; response_kind: string | null; responded_at: string | null },
>(points: readonly P[], gestes: Readonly<Record<string, GesteSurLePoint>>): P[] {
  return points.map((point) => {
    const geste = gestes[point.id];
    if (!geste || point.responded_at !== geste.ligneAvant) return point;
    return { ...point, status: STATUT_DU_POINT.repondu, response_kind: geste.reponse };
  });
}

/** Un point, réduit à ce que le compte des kilos regarde. */
export type PointEnKilos = {
  reponse: ReponseDuPoint | null;
  /** `committed_saving_kg_once` : nul quand le point ne porte pas d'action, ou d'avant l'étape 6a. */
  gainDUneFois: number | null;
};

/**
 * Les kilos évités par des points, au centième exact.
 *
 * Seul un « oui » compte : un « non » et un « pas de trajet » n'évitent rien, et **jamais un nombre
 * négatif ni un manque** — le produit compte ce qui a été fait. La somme passe par des centièmes
 * entiers, pour qu'une saison de douze « oui » à 2,29 kg fasse 27,48 et pas 27,479999.
 *
 * L'appelant choisit les points — une saison, une période — : ce module ne connaît pas les bornes.
 */
export function kilosEvites(points: readonly PointEnKilos[]): number {
  let centiemes = 0;
  for (const point of points) {
    if (point.reponse !== 'oui' || point.gainDUneFois === null || !(point.gainDUneFois > 0)) continue;
    centiemes += Math.round(point.gainDUneFois * 100);
  }
  return centiemes / 100;
}

/**
 * « au moins 27 kg CO₂e évités » — en minuscule, pour entrer dans une phrase.
 *
 * **L'accord suit le nombre écrit et son unité** : « 1,4 kg CO₂e évité », « 2 kg CO₂e évités »,
 * « 1,6 t CO₂e évitée » — la tonne est féminine, et un seul « oui » sur un vol long-courrier la passe.
 * Le singulier vaut sous deux, la règle du français pour un nombre décimal.
 *
 * `null` quand il n'y a rien à dire — aucun « oui » qui porte un gain, ou un minimum nul à la
 * précision affichée. Jamais « au moins 0 kg ».
 */
export function kilosEvitesEnMots(kg: number): string | null {
  const minimum = formatAuMoins(kg);
  if (minimum === null) return null;
  const pluriel = minimum.valeur >= 2;
  const participe =
    minimum.unite === 't' ? (pluriel ? 'évitées' : 'évitée') : pluriel ? 'évités' : 'évité';
  return `au moins ${minimum.texte} ${participe}`;
}

/**
 * Une phrase entière : « Au moins 27 kg CO₂e évités. » — le total d'une saison écoulée, que la carte
 * d'ouverture ajoute à son récapitulatif, et la ligne d'un « oui ». `null` quand il n'y a rien à dire.
 */
export function phraseDesKilos(kg: number): string | null {
  const enMots = kilosEvitesEnMots(kg);
  return enMots === null ? null : `${majuscule(enMots)}.`;
}

/**
 * La ligne sous la réplique d'un « oui » : « Au moins 2,2 kg CO₂e évités. »
 *
 * **Voix produit et non celle de Ramille**, comme « Deuxième semaine de suite » juste au-dessus :
 * elle ne dit jamais de nombre (`FRONT-MASCOTTE.md` §2.3). La réponse vient de la carte — l'état local
 * pendant l'aller-retour, puis la ligne relue —, pour que la phrase arrive avec le geste.
 *
 * Elle ne nomme pas la période : la carte la porte en tête (« Semaine du 13/10 », « Septembre 2026 »),
 * et c'est elle que la question interroge (`BOUCLE.md` §2).
 */
export function phraseDuOui(reponse: ReponseDuPoint | null, gainDUneFois: number | null): string | null {
  return phraseDesKilos(kilosEvites([{ reponse, gainDUneFois }]));
}

/**
 * La ligne d'un groupe de saison du suivi : « Au moins 27 kg CO₂e évités, d’après tes réponses. »
 *
 * Le groupe porte déjà le nom de la saison ; « d’après tes réponses » dit d'où vient le chiffre, à
 * côté de l'historique des bilans, qui sont, eux, des mesures complètes.
 */
export function phraseDuGroupe(points: readonly PointEnKilos[]): string | null {
  const enMots = kilosEvitesEnMots(kilosEvites(points));
  return enMots === null ? null : `${majuscule(enMots)}, d’après tes réponses.`;
}

function majuscule(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}
