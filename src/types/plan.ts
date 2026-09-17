// Logique pure de l'engagement sur une action du plan (étape 6b, v1-07 §3.3 point 2).
// Séparée des requêtes, comme `src/types/bilan.ts` et `src/types/suivi.ts` : un module importé
// par un test ne doit tirer ni React Native ni `@/lib/supabase`.
//
// L'intention d'implémentation prend deux formes selon le poste, et ce n'est pas cosmétique :
// un trajet domicile-travail a un rythme hebdomadaire (« le mardi et le jeudi »), un trajet
// loisir ou un voyage n'en a pas — lui demander un jour de la semaine produirait une intention
// que personne ne peut tenir. Les deux formes s'excluent, et la base le vérifie
// (`plan_actions_engagement_coherent`).

/**
 * La forme insérable du poste (C2.6) est définie dans `@/constants/postes` — le vocabulaire d'un
 * poste y tient en un seul endroit, avec ses quatre registres et la raison de chacun. Réexportée
 * ici parce que c'est le module que l'écran du plan et la carte de point importent déjà ;
 * **la définition et son commentaire sont là-bas.**
 */
import { formeInserable } from '@/constants/postes';

export { formeInserable };

export type IntentionTiming =
  | 'ce_mois'
  | 'le_mois_prochain'
  | 'prochaine_occasion'
  | 'au_prochain_voyage'
  | 'avant_le_prochain_bilan';

/** 1 = lundi … 7 = dimanche, comme ISO 8601 et comme la contrainte SQL. */
export type IntentionDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const INTENTION_DAYS: { value: IntentionDay; short: string; long: string }[] = [
  { value: 1, short: 'L', long: 'lundi' },
  { value: 2, short: 'M', long: 'mardi' },
  { value: 3, short: 'M', long: 'mercredi' },
  { value: 4, short: 'J', long: 'jeudi' },
  { value: 5, short: 'V', long: 'vendredi' },
  { value: 6, short: 'S', long: 'samedi' },
  { value: 7, short: 'D', long: 'dimanche' },
];

/**
 * Les échéances des **sorties** : elles se pensent au calendrier du mois, parce qu'une sortie du
 * week-end se décide dans le mois où elle tombe.
 */
export const INTENTION_TIMINGS_LOISIRS: { value: IntentionTiming; label: string }[] = [
  { value: 'ce_mois', label: 'Ce mois-ci' },
  { value: 'le_mois_prochain', label: 'Le mois prochain' },
  { value: 'prochaine_occasion', label: 'À ma prochaine occasion' },
];

/**
 * Les échéances des **voyages** (C3.8 §4), et ce ne sont pas les mêmes.
 *
 * « Ce mois-ci » n'est pas une échéance pour un vol : on ne renonce pas à un long-courrier au
 * calendrier du mois, on le décide quand le projet se présente — ou avant le prochain bilan, qui
 * est le seul rendez-vous que le produit donne. Proposer les trois échéances des sorties sur un
 * voyage revenait à demander un engagement au mois sur une décision annuelle, c'est-à-dire à
 * choisir entre « faux » et « À ma prochaine occasion », la seule des trois qui tenait.
 */
export const INTENTION_TIMINGS_VOYAGES: { value: IntentionTiming; label: string }[] = [
  { value: 'au_prochain_voyage', label: 'À mon prochain projet de voyage' },
  { value: 'avant_le_prochain_bilan', label: 'Avant mon prochain bilan' },
];

/**
 * Toutes les échéances, pour la **relecture** seule : `formatIntentionTiming` doit savoir rendre
 * une valeur quel que soit le poste qui l'a écrite, y compris celle d'un engagement archivé dont
 * on ne connaît plus le gabarit.
 */
export const INTENTION_TIMINGS: { value: IntentionTiming; label: string }[] = [
  ...INTENTION_TIMINGS_LOISIRS,
  ...INTENTION_TIMINGS_VOYAGES,
];

/**
 * Le poste décide de la forme d'intention proposée. `commute` est le seul poste au rythme
 * hebdomadaire ; loisirs et voyages se pensent en échéance.
 */
export function intentionKindForPoste(poste: string | null): 'days' | 'timing' {
  return poste === 'commute' ? 'days' : 'timing';
}

/**
 * Et le poste décide aussi **lesquelles** — les sorties et les voyages n'ont pas le même horizon.
 *
 * Le repli est celui des sorties : un poste inconnu (un gabarit à venir, une ligne relue d'une
 * version antérieure) reçoit les trois échéances générales plutôt qu'aucune, sans quoi la feuille
 * d'engagement s'ouvrirait sur une liste vide et « C'est noté » resterait inactif sans dire
 * pourquoi.
 */
export function intentionTimingsForPoste(
  poste: string | null
): { value: IntentionTiming; label: string }[] {
  return poste === 'travel' ? INTENTION_TIMINGS_VOYAGES : INTENTION_TIMINGS_LOISIRS;
}

/**
 * « le mardi et le jeudi » — l'intention telle qu'elle sera relue par la personne, pas une
 * liste de cases cochées. C'est la formulation qui fait le levier, donc elle est rendue en
 * toutes lettres et pas en initiales.
 */
export function formatIntentionDays(days: number[] | null | undefined): string | null {
  if (!days || days.length === 0) return null;

  const noms = [...days]
    .sort((a, b) => a - b)
    .map((d) => INTENTION_DAYS.find((j) => j.value === d)?.long)
    .filter((nom): nom is string => nom !== undefined);

  if (noms.length === 0) return null;
  if (noms.length === 7) return 'tous les jours';

  // L'article se répète devant chaque jour : « le lundi, le mardi et le mercredi ». Le
  // factoriser donnerait « le lundi, mardi et le mercredi », qui boite.
  const avecArticle = noms.map((nom) => `le ${nom}`);
  if (avecArticle.length === 1) return avecArticle[0];

  return `${avecArticle.slice(0, -1).join(', ')} et ${avecArticle[avecArticle.length - 1]}`;
}

export function formatIntentionTiming(timing: string | null | undefined): string | null {
  return INTENTION_TIMINGS.find((t) => t.value === timing)?.label.toLowerCase() ?? null;
}

/** Phrase complète de rappel, quelle que soit la forme de l'intention. */
export function formatIntention(
  days: number[] | null | undefined,
  timing: string | null | undefined
): string | null {
  return formatIntentionDays(days) ?? formatIntentionTiming(timing);
}

/**
 * Une intention est valide si elle porte exactement une des deux formes — miroir de la
 * contrainte `plan_actions_engagement_coherent`. Vérifié côté client pour ne pas envoyer un
 * appel que la base refusera, jamais à sa place.
 */
export function isIntentionComplete(
  kind: 'days' | 'timing',
  days: IntentionDay[],
  timing: IntentionTiming | null
): boolean {
  return kind === 'days' ? days.length > 0 : timing !== null;
}

// ── Ce que le plan annonce, et ce que son cap mesure (C3.8 §3) ─────────────────────────────

/** Les nombres que l'intro du plan peut avoir à dire, en lettres. */
const ACTIONS_EN_LETTRES = ['aucune', 'une', 'deux', 'trois', 'quatre'];

function enLettres(n: number): string {
  return ACTIONS_EN_LETTRES[n] ?? String(n);
}

function accorde(n: number, mot: string): string {
  return `${enLettres(n)} ${mot}${n > 1 ? 's' : ''}`;
}

/** Ce que l'en-tête du plan annonce, et ce que sa carte de cap a le droit de chiffrer. */
export type CadreDuPlan = {
  /** La phrase d'intro, ou `null` quand il n'y a rien à annoncer. */
  intro: string | null;
  /**
   * Le cap se chiffre-t-il ? Non quand le plan ne porte **aucune** action.
   *
   * C'est le cas de bord que C2.5 a rendu courant : depuis que les gabarits de loisirs sont
   * refusés aux sorties rares, **tout cycliste et tout profil sédentaire** a un plan à zéro
   * action — vérifié sur le distant. La carte du cap ne dépendait que de `capKg !== null`, donc
   * « − 11 kg, soit − 20 % sur tes sorties du week-end » s'affichait juste **au-dessus** de « Tu
   * fais déjà l'essentiel sur ce poste ». Le commentaire du cap dit lui-même pourquoi il existe :
   * qu'on voie qu'en cumulant deux actions on l'atteint. Sans action, il n'a plus d'objet, et son
   * chiffre y est de surcroît dérivé d'un résiduel de calcul de 15 km.
   *
   * La carte, elle, se rend toujours : elle est depuis C2.8 l'endroit où la période se nomme.
   */
  chiffreLeCap: boolean;
  /**
   * La note qui suit le cap quand les actions mises en avant ne portent pas toutes sur le poste
   * qu'il mesure, ou `null`.
   *
   * Le cap reste celui du poste dominant — c'est ce que le serveur a calculé, et le recalculer sur
   * le total côté client ferait deux définitions d'un même chiffre. Ce qui change est la phrase :
   * sans elle, l'écran pose un cap sur un poste et aligne dessous des gains d'un autre, en invitant
   * à les cumuler.
   */
  noteDuCap: string | null;
};

/**
 * Ce que l'écran du plan dit de lui-même, dérivé plutôt qu'écrit dans le rendu.
 *
 * **Le plan peut déborder de son poste dominant**, et l'écran l'ignorait : quand le poste dominant
 * n'a plus rien à proposer, `generate_plan_cycle_for_user` complète avec d'autres postes, et
 * l'intro écrivait quand même « Deux actions pour ton trajet domicile-travail » au-dessus d'actions
 * qui n'en étaient pas (constat A8-14). Le `poste` de chaque action est déjà sélectionné par la
 * requête de l'écran : il suffisait de le lire.
 */
export function cadreDuPlan({
  postesEnAvant,
  posteDuCycle,
  nombreDActions,
}: {
  /** Le `poste` de chaque action mise en avant, dans l'ordre où elle s'affiche. */
  postesEnAvant: (string | null)[];
  /** Le poste que le cycle — et donc le cap — mesure. */
  posteDuCycle: string | null;
  /** Le nombre total d'actions du plan, pistes dépliées comprises. */
  nombreDActions: number;
}): CadreDuPlan {
  // **Deux causes, deux branches** — les réunir dans un seul `||` rendait la seconde
  // inéprouvable, la première suffisant toujours à faire passer l'assertion, et leur faisait dire
  // la même chose alors qu'elles disent l'inverse.
  //
  // Un plan **sans action** n'a pas de cap à chiffrer : c'est le cas de C2.5, devenu courant.
  if (nombreDActions === 0) {
    return { intro: null, chiffreLeCap: false, noteDuCap: null };
  }

  // Un plan qui a des actions mais n'en met **aucune en avant** n'a pas d'intro à écrire — elle
  // nomme les postes de ce qui est devant — mais son cap garde tout son objet : les actions sont
  // là, derrière le lien des pistes. La branche est inatteignable aujourd'hui (`pistesDuPlan`
  // remplit toujours `enAvant` dès qu'il y a une action), et c'est justement pourquoi elle se
  // tranche ici : le jour où elle cesserait de l'être, la cumuler avec la précédente effacerait
  // le cap d'un plan qui en a un.
  if (postesEnAvant.length === 0) {
    return { intro: null, chiffreLeCap: true, noteDuCap: null };
  }

  const poste = formeInserable(posteDuCycle);
  const surLeDominant = postesEnAvant.filter((p) => p === posteDuCycle).length;
  const ailleurs = postesEnAvant.length - surLeDominant;

  if (ailleurs === 0) {
    return {
      intro: `${capitale(accorde(postesEnAvant.length, 'action'))} pour ${poste}.`,
      chiffreLeCap: true,
      noteDuCap: null,
    };
  }

  const note = `Le cap porte sur ${poste} ; ${ailleurs > 1 ? 'ces actions portent' : 'cette action porte'} ailleurs.`;

  // Aucune sur le poste dominant : la phrase du canvas (planche F2), qui dit d'emblée que le plan
  // est allé chercher ailleurs plutôt que de le laisser découvrir carte par carte.
  if (surLeDominant === 0) {
    return {
      intro: `${capitale(accorde(postesEnAvant.length, 'action'))}, sur d’autres postes que ${poste}.`,
      chiffreLeCap: true,
      noteDuCap: note,
    };
  }

  return {
    // « dont une **action** ailleurs » répétait le nom à quatre mots de distance : le nombre seul
    // le reprend, comme en français courant.
    intro: `${capitale(accorde(postesEnAvant.length, 'action'))}, dont ${enLettres(ailleurs)} ailleurs que sur ${poste}.`,
    chiffreLeCap: true,
    noteDuCap: note,
  };
}

function capitale(texte: string): string {
  return `${texte.charAt(0).toUpperCase()}${texte.slice(1)}`;
}

// ── Ce que le plan met en avant, et ce qu'il garde derrière un lien (C4.6) ──────────────────

/**
 * Combien d'actions le plan présente d'emblée.
 *
 * Deux, comme la spec §6 (« 1 à 2 actions suggérées ») — mais **c'est un choix d'écran, et il ne
 * vivait pas à l'écran** : `generate_plan_cycle_for_user` jetait tout le reste avec un `limit 2`
 * avant même de l'écrire, alors que l'estimateur rend déjà toutes les actions dont le gain atteint
 * 5 kg/an. L'autonomie de la personne s'exerçait donc sur deux leviers et les autres restaient
 * invisibles (constat A13-18, arbitrage D18 du 10/09/2026).
 */
export const ACTIONS_EN_AVANT = 2;

export type PistesDuPlan<T> = {
  /** Les cartes pleines du plan, et rien d'autre depuis C5.2. */
  enAvant: T[];
  /** Ce que le lien annonce : combien de pistes attendent sur l'écran dédié. */
  masquees: number;
};

/**
 * L'ordre d'affichage du plan et ses trois rangs (C4.6, planches F1 et F2).
 *
 * **L'action engagée passe toujours devant** : c'est la réponse à « qu'est-ce que je fais en ce
 * moment ? », elle n'a pas à être cherchée. Le reste suit le `rank` du serveur, qui porte déjà le
 * bon ordre — poste dominant d'abord, puis gain décroissant — et qui est figé à la génération. Un
 * `rank` nul (aucune migration n'en produit, mais la colonne l'autorise) passe en dernier plutôt que
 * de remonter en tête par accident, comme le `nulls last` du serveur.
 *
 * La fonction est générique parce que la forme d'une ligne `plan_actions` appartient à l'écran :
 * elle ne demande que les deux champs dont l'ordre dépend.
 */
/**
 * L'ordre commun aux deux surfaces — le plan et l'écran des pistes.
 *
 * Écrit une fois parce que deux copies divergeraient : le jour où l'une des deux change, les deux
 * écrans ne s'accorderaient plus sur ce qui vient en premier, et rien ne le signalerait.
 */
function ordonnerLesPistes<T extends { committed_at: string | null; rank: number | null }>(
  actions: T[]
): T[] {
  return [...actions].sort((a, b) => {
    const engagement = Number(b.committed_at !== null) - Number(a.committed_at !== null);
    if (engagement !== 0) return engagement;
    // `Infinity` plutôt que 0 : un rang absent va au bout, il ne se glisse pas en tête.
    return (a.rank ?? Infinity) - (b.rank ?? Infinity);
  });
}

export function pistesDuPlan<T extends { committed_at: string | null; rank: number | null }>(
  actions: T[]
): PistesDuPlan<T> {
  const ordonnees = ordonnerLesPistes(actions);

  return {
    enAvant: ordonnees.slice(0, ACTIONS_EN_AVANT),
    masquees: Math.max(0, ordonnees.length - ACTIONS_EN_AVANT),
  };
}

/**
 * Les pistes de l'écran « Toutes les pistes », groupées par poste (C5.2, écart 3).
 *
 * **Le groupement est un fait d'écran, pas un classement de plus.** L'ordre des actions ne bouge
 * pas — c'est toujours le `rank` du serveur, qui porte déjà la meilleure piste du poste dominant en
 * tête depuis C5.1 — et les groupes sortent **dans l'ordre où leur poste apparaît pour la première
 * fois**. Trier les groupes autrement (par poids du poste, par nom) rendrait la tête de liste
 * différente de la première carte du plan, et les deux écrans se contrediraient sur ce qui compte
 * le plus.
 *
 * Ici il n'y a **pas de rang** : toutes les pistes sont au même niveau, chacune ouvrable. C'est ce
 * que le lot 5 change — le plan insiste sur deux, cet écran-ci présente tout, et aucune des deux
 * surfaces ne cache un levier derrière une hiérarchie qu'on ne peut pas franchir (`v1-16` §5).
 */
export function pistesParPoste<T extends { committed_at: string | null; rank: number | null }>(
  actions: T[],
  posteDe: (action: T) => string | null
): { poste: string | null; pistes: T[] }[] {
  const ordonnees = ordonnerLesPistes(actions);
  const groupes: { poste: string | null; pistes: T[] }[] = [];

  for (const action of ordonnees) {
    const poste = posteDe(action);
    const existant = groupes.find((g) => g.poste === poste);
    if (existant) existant.pistes.push(action);
    else groupes.push({ poste, pistes: [action] });
  }

  return groupes;
}

/**
 * Où poser un écart dans la liste des lignes simples, quand certaines sont dépliées en carte.
 *
 * **13.5 de la recette web du 16/09/2026** : deux lignes dépliées côte à côte se touchaient. Le
 * conteneur porte `gap: 0` — juste pour des lignes, qui se lisent serrées et portent chacune leurs
 * 44 px de cible tactile — mais `ActionCard` n'a aucune marge extérieure, donc une ligne devenue
 * carte héritait de ce zéro.
 *
 * La règle : **un écart à chaque frontière dont au moins un des deux voisins est une carte**, et
 * l'écart est porté par le second des deux. Deux conséquences qu'il ne faut pas défaire :
 *
 *  - **une seule marge, en haut.** En Yoga les marges ne fusionnent pas, contrairement à CSS : une
 *    `marginVertical` sur chaque carte donnerait le double entre deux cartes voisines ;
 *  - **rien au conteneur.** Un `gap` y aurait séparé les lignes **fermées**, qu'on ne peut pas
 *    resserrer en retour sans passer sous les 44 px que leur `paddingVertical` tient depuis
 *    `v1-16` §5.
 *
 * Sortie de l'écran pour être éprouvable : l'espacement est exactement le genre de règle qu'aucune
 * assertion ne portait, et c'est pour ça que la CI n'a rien vu.
 */
export function separationsDesLignes(ids: string[], ouvertes: ReadonlySet<string>): boolean[] {
  return ids.map(
    (id, rang) => rang > 0 && (ouvertes.has(id) || ouvertes.has(ids[rang - 1]))
  );
}
