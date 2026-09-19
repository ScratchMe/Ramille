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

/**
 * Ce que la carte de cap du plan a le droit de chiffrer (C3.8 §3, resserré par C5.3).
 *
 * **Il ne reste qu'un champ, et les deux qui sont partis ne sont pas un allègement.**
 *
 * `intro` décrivait les cartes posées juste dessous — « Deux actions pour ton trajet
 * domicile-travail » — en taisant les neuf autres. Elle est remplacée par une ligne fixe qui dit le
 * **principe** : une action à la fois. Décrire ce qu'on voit n'apprend rien ; dire pourquoi il n'y
 * en a qu'une répond à la seule question que la personne se pose devant deux cartes.
 *
 * `noteDuCap` — « Le cap porte sur tes voyages ; cette action porte ailleurs. » — énonçait une
 * **règle que rien n'applique** : le cap est une quantité à atteindre, et aucun endroit du produit
 * ne vérifie d'où vient la réduction. Elle était rare tant que le poste dominant remplissait les
 * deux premières cartes ; **le classement de C5.1 l'aurait réveillée sur la plupart des plans**,
 * puisque les meilleurs leviers viennent souvent d'ailleurs. Une phrase fausse qui ne se voyait
 * pas allait devenir une phrase fausse qu'on voit (relecture du 16/09/2026).
 */
export type CadreDuPlan = {
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
};

/**
 * Ce que la carte de cap a le droit de chiffrer, dérivé plutôt qu'écrit dans le rendu.
 *
 * La dérivation garde sa forme et son test alors qu'elle ne rend plus qu'un booléen, parce que ce
 * booléen porte **deux causes distinctes** qu'il ne faut pas réunir dans un `||` — l'une d'elles
 * deviendrait inéprouvable, la première suffisant toujours à faire passer l'assertion.
 */
export function cadreDuPlan({
  postesEnAvant,
  nombreDActions,
}: {
  /** Le `poste` de chaque action mise en avant, dans l'ordre où elle s'affiche. */
  postesEnAvant: (string | null)[];
  /** Le nombre total d'actions du plan. */
  nombreDActions: number;
}): CadreDuPlan {
  // Un plan **sans action** n'a pas de cap à chiffrer : c'est le cas de C2.5, devenu courant.
  if (nombreDActions === 0) {
    return { chiffreLeCap: false };
  }

  // Un plan qui a des actions mais n'en met **aucune en avant** garde son cap : les actions sont
  // là, sur l'écran des pistes. La branche est inatteignable aujourd'hui (`pistesDuPlan` remplit
  // toujours `enAvant` dès qu'il y a une action), et c'est justement pourquoi elle se tranche ici :
  // le jour où elle cesserait de l'être, la cumuler avec la précédente effacerait le cap d'un plan
  // qui en a un.
  if (postesEnAvant.length === 0) {
    return { chiffreLeCap: true };
  }

  return { chiffreLeCap: true };
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
 * L'ordre commun aux deux surfaces — le plan et l'écran des pistes.
 *
 * **L'action engagée passe toujours devant** : c'est la réponse à « qu'est-ce que je fais en ce
 * moment ? », elle n'a pas à être cherchée. Le reste suit le `rank` du serveur, qui porte déjà le
 * bon ordre — la meilleure piste du poste dominant en tête, puis gain décroissant (C5.1) — et qui
 * est figé à la génération. Un `rank` nul (aucune migration n'en produit, mais la colonne
 * l'autorise) passe en dernier plutôt que de remonter en tête par accident, comme le `nulls last`
 * du serveur.
 *
 * Écrit une fois parce que deux copies divergeraient : le jour où l'une des deux change, les deux
 * écrans ne s'accorderaient plus sur ce qui vient en premier, et rien ne le signalerait. La
 * fonction est générique parce que la forme d'une ligne `plan_actions` appartient à l'écran : elle
 * ne demande que les deux champs dont l'ordre dépend.
 *
 * Le bloc qui précédait celui-ci décrivait « les trois rangs » du plan, que C5.2 a retirés en
 * sortant l'exhaustivité sur son écran : il était resté, orphelin, au-dessus de cette fonction.
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
 * Où poser un écart dans la liste des lignes simples, quand certaines sont rendues en carte.
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
 *
 * **Le paramètre est « rendue en carte », et non « ouverte au toucher »** (contre-lecture du lot 5,
 * 17/09/2026). C5.2 lui passait le seul ensemble des lignes dépliées, alors que l'écran des pistes
 * rendait **aussi** en carte l'action engagée, qu'on ne déplie pas : la frontière sous cette
 * carte-là n'était donc pas vue, et la ligne suivante venait s'y coller — le défaut 13.5 recréé sur
 * l'écran neuf. Une carte est une carte, quelle que soit la raison pour laquelle elle en est une.
 *
 * **Le cas qui avait motivé cette formulation n'existe plus, et le contrat reste le bon** (#234,
 * 19/09/2026) : la planche A2 rend l'action engagée en **ligne**, donc l'appelant ne lui passe plus
 * aujourd'hui que les lignes dépliées. Garder « rendue en carte » plutôt que de renommer en
 * « ouverte » est délibéré — c'est ce qui rend la fonction juste pour la prochaine raison d'en
 * fabriquer une, et la raison précédente a été payée une fois.
 */
export function separationsDesLignes(ids: string[], enCarte: ReadonlySet<string>): boolean[] {
  return ids.map(
    (id, rang) => rang > 0 && (enCarte.has(id) || enCarte.has(ids[rang - 1]))
  );
}

/**
 * Quelles lignes portent le **filet** qui les sépare (planche A2 du canvas `v1-17`).
 *
 * **C'est lui qui structure l'écran, et il avait été oublié à la livraison de C5.2.** Sans filet,
 * onze lignes de la même taille et de la même couleur forment un pavé continu : c'est toute la
 * plainte « aucune emphase, dur de voir qu'il y a différentes catégories » de la recette du
 * 18/09/2026. Les têtes de groupe avaient été montées d'un cran pour compenser — on avait donc pris
 * la moitié qui console et laissé celle qui découpe.
 *
 * Deux exclusions, et chacune répare une fausseté visible :
 * - **une ligne rendue en carte n'en porte pas** : la carte a sa propre bordure, et un filet sous
 *   elle dessinerait un second bord à deux pixels du premier ;
 * - **la dernière ligne d'un groupe non plus** : un filet y annoncerait une ligne de plus, alors
 *   que ce qui suit est la tête du groupe suivant — ou rien.
 *
 * Elle est écrite ici et non dans l'écran pour la même raison que sa voisine : c'est une dérivation
 * d'affichage, donc elle se teste (`FRONT.md` §1.1).
 */
export function filetsDesLignes(ids: string[], enCarte: ReadonlySet<string>): boolean[] {
  return ids.map((id, rang) => !enCarte.has(id) && rang < ids.length - 1);
}

// ── L'engagement qu'un recalcul a emporté (C2.2, étendu par C6.4) ──────────────────────────────

/**
 * Les deux raisons de libération qu'un écran a le droit d'annoncer.
 *
 * **La règle est « effet de bord non choisi », et elle n'a pas bougé** — c'est le périmètre qui
 * s'est élargi. `saison` est une reconduction qui a échoué à la frontière d'une saison, `changement`
 * est la décision de la personne elle-même : les apprendre à quelqu'un serait au mieux inutile, au
 * pire condescendant. `rebilan` et, depuis C6.4, `contexte` sont deux gestes dont la perte de
 * l'engagement n'était **pas** le but — on refait un bilan pour corriger une réponse, on corrige
 * son contexte parce qu'on a déménagé.
 *
 * Elle est exportée parce que la **requête** du plan doit filtrer exactement sur ces deux valeurs :
 * une liste écrite deux fois se désaccorderait au premier ajout, et la moitié fautive serait celle
 * qui ne dit rien — un encart muet ne se remarque pas.
 */
export const RAISONS_ANNONCABLES = ['rebilan', 'contexte'] as const;

export type RaisonAnnoncable = (typeof RAISONS_ANNONCABLES)[number];

export function estRaisonAnnoncable(raison: string): raison is RaisonAnnoncable {
  return (RAISONS_ANNONCABLES as readonly string[]).includes(raison);
}

/**
 * Ce que l'encart orphelin dit, selon ce qui a emporté l'engagement.
 *
 * **La phrase nommait le nouveau bilan, et il n'y en a pas toujours un** : depuis C6.4, corriger
 * son contexte reconstruit le plan sans qu'aucun bilan ne soit resoumis. « Ton plan a changé avec
 * ton nouveau bilan » serait alors faux sur le seul point qui aide à comprendre — la cause. Le
 * reste de la phrase ne bouge pas : l'action reste dans le suivi, et c'est ce qui la distingue
 * d'une disparition.
 *
 * Le repli sur `rebilan` n'est pas atteignable par une valeur hors liste — la requête filtre sur
 * `RAISONS_ANNONCABLES` — mais il évite qu'un élargissement futur de ce filtre sorte une phrase
 * vide plutôt qu'une phrase imparfaite.
 */
export function phraseDeLOrphelin(raison: string, actionText: string): string {
  const cause =
    raison === 'contexte' ? 'avec tes nouvelles réponses de contexte' : 'avec ton nouveau bilan';
  return `Ton plan a changé ${cause}. « ${actionText} » n’y est plus ; elle reste dans ton suivi.`;
}

// ── L'encart de contexte du plan (C5.5, écarts 9 et 10) ────────────────────────────────────────

/**
 * Les réponses du contexte B4, telles que l'encart les lit.
 *
 * `teletravail` peut être nul sans que rien ne soit cassé : la question ne se pose pas sans trajet
 * régulier ni en dessous de deux jours de trajet (C5.4, `teletravailSePose`).
 */
export type ReponsesDeContexte = {
  zone_type: string | null;
  tc_access: string | null;
  household_vehicles: string | null;
  teletravail: string | null;
};

/**
 * Chaque réponse du contexte en mots, pour la phrase de l'encart.
 *
 * **Une table et non des ternaires** : quatre colonnes, douze valeurs, et la moindre faute de frappe
 * y sortirait une phrase bancale sur l'écran le plus lu du produit. Elle est épinglée par un test
 * qui la parcourt plutôt que de nommer les valeurs une par une — celle qu'on ajoutera demain
 * traverserait une liste.
 */
const MOTS_DU_CONTEXTE: Record<keyof ReponsesDeContexte, Record<string, string>> = {
  zone_type: {
    urbain_dense: 'zone urbaine dense',
    periurbain: 'zone périurbaine',
    rural: 'zone rurale',
  },
  tc_access: {
    bon: 'bon accès aux transports en commun',
    limite: 'accès limité aux transports en commun',
    inexistant: 'pas de transports en commun',
  },
  household_vehicles: {
    '0': 'pas de véhicule dans le foyer',
    '1': 'un véhicule dans le foyer',
    '2_plus': 'deux véhicules ou plus dans le foyer',
  },
  teletravail: {
    aucun: 'pas de télétravail possible',
    un_jour: 'un jour de télétravail possible',
    deux_ou_plus: 'au moins deux jours de télétravail possibles',
  },
};

/**
 * Ce que l'encart énumère, dans l'ordre de l'étape « Contexte ».
 *
 * **Il ne nomme jamais l'action écartée ni son gain**, et c'est la contrainte du chantier, pas un
 * oubli : ce serait la liste des portes fermées pour la personne qui a répondu juste, et un prix
 * affiché sur une réponse pour les autres — c'est-à-dire apprendre à répondre haut. L'encart dit
 * sur quoi le plan s'appuie, la porte permet de corriger, et rien de plus.
 *
 * **Une valeur absente ou inconnue ne sort pas.** Le télétravail manque légitimement (la question
 * ne se pose pas partout, C5.4) ; les trois autres manquent seulement sur un bilan d'avant leur
 * colonne, et une phrase à trou serait pire qu'un segment de moins. Une valeur hors table ne peut
 * venir que d'une migration qui aurait ajouté une réponse sans passer ici — auquel cas on tait ce
 * qu'on ne sait pas dire plutôt que d'écrire un identifiant technique.
 */
export function motsDuContexte(reponses: ReponsesDeContexte): string[] {
  const ordre: (keyof ReponsesDeContexte)[] = [
    'zone_type',
    'tc_access',
    'household_vehicles',
    'teletravail',
  ];

  return ordre
    .map((colonne) => {
      const valeur = reponses[colonne];
      return valeur !== null ? (MOTS_DU_CONTEXTE[colonne][valeur] ?? null) : null;
    })
    .filter((mot): mot is string => mot !== null);
}
