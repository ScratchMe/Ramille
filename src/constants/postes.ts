/**
 * Le vocabulaire d'un poste — un seul endroit, quatre registres (C2.6).
 *
 * ## Le défaut que ce fichier existe pour fermer
 *
 * Le même poste portait trois noms selon l'écran. La restitution disait « Tes loisirs du
 * week-end », la liste du suivi « Loisirs du week-end », et la question du point, l'email, le
 * push, le sous-titre du plan et le cap collaient après une préposition le libellé **snapshoté**
 * de la base — « Trajet domicile-travail (Voiture thermique) », mode compris. Ça donnait « Une
 * action liée à Trajet domicile-travail (Voiture thermique). » et « soit − 20 % de trajet
 * domicile-travail (voiture seul) », là où les maquettes écrivent « pour ton trajet
 * domicile-travail ».
 *
 * ## Pourquoi quatre registres et non un
 *
 * Ce n'est pas de la duplication, c'est de la grammaire, et les confondre casse une phrase sur
 * deux :
 *
 *  - **`POSTE_LABEL`** — l'étiquette nue, en tête de ligne ou de colonne : « Trajet
 *    domicile-travail ». Ni article ni possessif, parce qu'elle n'est dans aucune phrase.
 *  - **`POSTE_SUBJECT`** — le sujet d'une phrase de restitution : « Tes voyages longue distance
 *    pèsent le plus. » Majuscule, possessif, forme **longue** : le poste y est le propos, on peut
 *    prendre le temps de le nommer entièrement.
 *  - **`POSTE_EN_PHRASE`** — le même, en milieu de phrase (minuscule). Un test épingle qu'il est
 *    `POSTE_SUBJECT` à la majuscule près, pour que les deux ne divergent pas.
 *  - **`FORME_INSERABLE`** — ce qui se glisse après une préposition : « pour ton trajet
 *    domicile-travail », « − 20 % sur tes voyages ». Forme **courte**, et c'est tout l'intérêt :
 *    « pour tes voyages longue distance » et « pour tes loisirs du week-end » alourdissent une
 *    question déjà longue, alors que « pour tes voyages » et « pour tes sorties du week-end »
 *    se lisent d'un trait.
 *
 * **Ne pas fusionner `FORME_INSERABLE` et `POSTE_EN_PHRASE`.** Elles se ressemblent assez pour
 * qu'on soit tenté ; les unifier rallonge chaque question du point d'un « longue distance » ou
 * change « sorties » en « loisirs » dans la copie validée du canvas (`v1-14` §3.2, brief §140).
 * Un test épingle qu'elles diffèrent bien sur `leisure` et `travel`.
 *
 * ## La jumelle SQL
 *
 * `public.poste_inserable(poste)` porte la même table côté serveur, pour `enqueue_checkin_reminders`
 * et la question du point. Elle est écrite deux fois parce qu'un rappel part sans que le client
 * soit là — même motif que la table de vérité des rappels (`src/types/rappels.ts` /
 * `reminder_channel_for`), et même règle : **toucher à l'une sans l'autre est le défaut que cette
 * paire existe pour attraper.** Les deux sont épinglées, ici et en pgTAP.
 */

/** Les trois postes du bilan, tels que la base les nomme (`assessment_results.dominant_poste`). */
export const POSTES = ['commute', 'leisure', 'travel'] as const;

export type Poste = (typeof POSTES)[number];

/** Les deux boucles d'engagement (`engagement_checkins.loop_type`). */
export type LoopType = 'commute' | 'extras';

/** L'étiquette nue : répartition du bilan, liste du suivi, en-tête du questionnaire, partage. */
export const POSTE_LABEL: Record<string, string> = {
  commute: 'Trajet domicile-travail',
  leisure: 'Loisirs du week-end',
  travel: 'Voyages longue distance',
};

/**
 * Le poste en sujet de phrase.
 *
 * « Trajets loisirs » / « Voyages » seuls ne distinguaient pas les deux postes (retour
 * utilisateur du 03/09/2026) : ce sont deux postes bien distincts du bilan (B2 « Week-ends et
 * loisirs » vs B3 « Voyages sur l'année »). Même wording que les libellés persistés côté
 * serveur, cf. `20260903120000_precise_poste_labels.sql`.
 */
export const POSTE_SUBJECT: Record<string, string> = {
  commute: 'Ton trajet domicile-travail',
  leisure: 'Tes loisirs du week-end',
  travel: 'Tes voyages longue distance',
};

/** Les mêmes, en milieu de phrase. Un seul vocabulaire, deux casses. */
export const POSTE_EN_PHRASE: Record<string, string> = {
  commute: 'ton trajet domicile-travail',
  leisure: 'tes loisirs du week-end',
  travel: 'tes voyages longue distance',
};

/**
 * La forme courte, celle qui suit une préposition. Copie du canvas v1-14 (§3.2) et du brief.
 *
 * `travel` perd « longue distance » et `leisure` devient « sorties » : dans « as-tu changé de
 * mode de transport pour … ? », la forme longue fait une question de trente mots.
 */
export const FORME_INSERABLE: Record<string, string> = {
  commute: 'ton trajet domicile-travail',
  leisure: 'tes sorties du week-end',
  travel: 'tes voyages',
};

/**
 * La forme insérable d'un poste — « pour {formeInserable(poste)} ».
 *
 * `loopType` sert de **repli**, pas de substitut : la boucle `extras` couvre indifféremment les
 * loisirs ou les voyages (celui des deux qui pèse le plus, même départage que la décision
 * dominante du bilan), donc elle ne suffit pas à nommer le poste. Quand le poste est connu, il
 * gagne toujours ; `loopType` ne sert qu'aux lignes anciennes où il manque.
 *
 * Le repli d'`extras` est « tes sorties du week-end » et non une formule neutre : c'est le poste
 * le plus fréquent des deux, et une phrase vague (« pour ce poste ») serait pire qu'un libellé
 * légèrement décalé sur un cas résiduel.
 */
export function formeInserable(
  poste: string | null | undefined,
  loopType?: LoopType | null
): string {
  const direct = poste ? FORME_INSERABLE[poste] : undefined;
  if (direct) return direct;
  if (loopType === 'commute') return FORME_INSERABLE.commute;
  return FORME_INSERABLE.leisure;
}

/**
 * Le poste est-il le **résiduel des sorties rares** — un poste que le calcul suppose, et que la
 * personne n'a pas déclaré ?
 *
 * Quelqu'un qui sort « rarement » le week-end se voit compter quinze kilomètres une semaine sur
 * quatre (D5, spec §5). Chez un cycliste sans voyage, ce résiduel devient le poste dominant, donc
 * celui du plan — et tout ce qui le nomme félicite ou sollicite la personne sur des sorties qu'elle
 * a dit ne presque pas faire. Le serveur le marque dans les deux libellés qu'il fige
 * (`dominant_poste_label` et `extras_poste_label` : « Loisirs du week-end (occasionnels) », épinglé
 * par les tests `01` et `20`) ; c'est ce marqueur qu'on lit, faute d'une colonne qui le dise.
 *
 * **Une seule lecture pour deux écrans** (25/09/2026, `v1-29` §6.3) : la félicitation du plan et la
 * marche de la restitution. Écrit deux fois, le test du marqueur aurait pu diverger entre l'écran
 * qui tait le poste et celui qui le proposait encore. Le marqueur n'est lu que sur les sorties : un
 * autre poste qui le porterait resterait nommé.
 */
export function estLeResiduelDesSortiesRares(
  poste: string | null | undefined,
  libelle: string | null | undefined
): boolean {
  return poste === 'leisure' && (libelle ?? '').includes('(occasionnels)');
}

/**
 * L'étiquette nue d'un poste, avec un repli explicite sur le libellé snapshoté.
 *
 * Le repli est le second argument et non une chaîne vide : `dominant_poste` peut porter une
 * valeur qu'aucune de ces tables ne connaît (un poste ajouté côté serveur avant que le client
 * ne soit déployé), et un vide muet à l'écran serait pire qu'un libellé un peu long.
 */
export function posteLabel(poste: string | null | undefined, repli: string): string {
  return (poste ? POSTE_LABEL[poste] : undefined) ?? repli;
}
