// L'été que dessine la page d'accueil du web (`BandeDeLEte`, `src/components/accueil/recit-de-l-ete.tsx`) : un
// trait par jour, plein les jours de vague de chaleur, et les mois sous la bande.
//
// **Une dérivation pure, donc testée** (`TESTING.md` §2.1) : elle décide de ce que la page montre — et de ce que le
// lecteur d'écran entend à la place —, et c'est elle qui vérifie que les bornes recopiées du bilan de Météo-France
// rendent bien ses 53 jours.

/** Un jour de la saison. Le rang ordonne les jours de vague dans l'été, que la bande remplit dans cet ordre. */
export type JourDeLaSaison = { date: string; enVague: boolean; rangDansLesVagues: number | null };

export type MoisDeLaSaison = { nom: string; jours: JourDeLaSaison[] };

const NOMS_DES_MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const;

/** Une date ISO (`AAAA-MM-JJ`) en jour UTC : la saison ne dépend d'aucun fuseau. */
function enJour(iso: string): Date {
  const [annee, mois, jour] = iso.split('-').map(Number);
  return new Date(Date.UTC(annee, mois - 1, jour));
}

/** Les jours d'une période, bornes comprises. */
export function joursDe(debut: string, fin: string): string[] {
  const jours: string[] = [];
  for (let d = enJour(debut); d <= enJour(fin); d = new Date(d.getTime() + 86_400_000)) {
    jours.push(d.toISOString().slice(0, 10));
  }
  return jours;
}

/**
 * Les mois de la saison, chacun avec ses jours. Chaque jour de vague porte son rang dans l'été — le premier jour
 * de la première vague vaut 0 —, que l'apparition échelonnée lit pour remplir la bande dans l'ordre où l'été a été
 * vécu.
 */
export function moisDeLaSaison(
  saison: { debut: string; fin: string },
  vagues: readonly { debut: string; fin: string }[]
): MoisDeLaSaison[] {
  const enVague = new Set(vagues.flatMap((vague) => joursDe(vague.debut, vague.fin)));
  const mois: MoisDeLaSaison[] = [];
  let rang = 0;
  for (const date of joursDe(saison.debut, saison.fin)) {
    const jour = enJour(date);
    if (jour.getUTCDate() === 1 || mois.length === 0)
      mois.push({ nom: NOMS_DES_MOIS[jour.getUTCMonth()], jours: [] });
    const vague = enVague.has(date);
    mois[mois.length - 1].jours.push({ date, enVague: vague, rangDansLesVagues: vague ? rang++ : null });
  }
  return mois;
}

/** Le nombre de jours d'une saison, et combien en vague de chaleur. */
export function compteDeLaSaison(mois: readonly MoisDeLaSaison[]): { jours: number; enVague: number } {
  const jours = mois.flatMap((m) => m.jours);
  return { jours: jours.length, enVague: jours.filter((j) => j.enVague).length };
}

/** « le 17 juin », « le 1er juillet » : un jour du calendrier, en mots. */
function enMots(iso: string): string {
  const jour = enJour(iso);
  const quantieme = jour.getUTCDate() === 1 ? '1er' : String(jour.getUTCDate());
  return `${quantieme} ${NOMS_DES_MOIS[jour.getUTCMonth()]}`;
}

/**
 * Une période en mots, « du 17 au 30 juin » ou « du 28 juillet au 19 août » : le mois ne se répète pas quand les
 * deux bornes le partagent.
 */
export function periodeEnMots(debut: string, fin: string): string {
  const [jourDeDebut, moisDeDebut] = enMots(debut).split(' ');
  const finEnMots = enMots(fin);
  return finEnMots.endsWith(` ${moisDeDebut}`)
    ? `du ${jourDeDebut} au ${finEnMots}`
    : `du ${enMots(debut)} au ${finEnMots}`;
}
