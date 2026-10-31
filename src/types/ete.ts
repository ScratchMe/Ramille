// Le calendrier de l'été que dessine la page d'accueil du web (`CalendrierDeLEte`,
// `src/components/accueil/recit-de-l-ete.tsx`) : un carré par jour, plein les jours de vague de chaleur.
//
// **Une dérivation pure, donc testée** (`TESTING.md` §2.1) : elle décide de ce que la page montre, et c'est
// elle qui vérifie que les bornes recopiées du bilan de Météo-France rendent bien ses 53 jours.

/** Un jour du calendrier, ou une case vide avant le premier jour du mois (le mois commence un lundi). */
export type CaseDuCalendrier = {
  jour: number;
  date: string;
  enVague: boolean;
  rangDansLesVagues: number | null;
} | null;

export type MoisDuCalendrier = { nom: string; cases: CaseDuCalendrier[] };

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

/** Une date ISO (`AAAA-MM-JJ`) en jour UTC : le calendrier ne dépend d'aucun fuseau. */
function enJour(iso: string): Date {
  const [annee, mois, jour] = iso.split('-').map(Number);
  return new Date(Date.UTC(annee, mois - 1, jour));
}

function enIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Les jours d'une période, bornes comprises. */
export function joursDe(debut: string, fin: string): string[] {
  const jours: string[] = [];
  for (let d = enJour(debut); d <= enJour(fin); d = new Date(d.getTime() + 86_400_000)) jours.push(enIso(d));
  return jours;
}

/**
 * Les mois de la saison, chacun en semaines qui commencent le lundi : des cases vides avant le premier
 * jour, puis un jour par case. Chaque jour de vague porte son rang dans l'ordre du calendrier — le
 * premier jour de la première vague vaut 0 —, que l'apparition échelonnée lit pour remplir l'été dans
 * l'ordre où il a été vécu.
 */
export function calendrierDeLaSaison(
  saison: { debut: string; fin: string },
  vagues: readonly { debut: string; fin: string }[]
): MoisDuCalendrier[] {
  const enVague = new Set(vagues.flatMap((vague) => joursDe(vague.debut, vague.fin)));
  const mois: MoisDuCalendrier[] = [];
  let rang = 0;
  for (const iso of joursDe(saison.debut, saison.fin)) {
    const date = enJour(iso);
    if (date.getUTCDate() === 1 || mois.length === 0) {
      // Lundi = 0 : `getUTCDay` compte depuis le dimanche.
      const decalage = (date.getUTCDay() + 6) % 7;
      mois.push({
        nom: NOMS_DES_MOIS[date.getUTCMonth()],
        cases: Array<CaseDuCalendrier>(decalage).fill(null),
      });
    }
    const vague = enVague.has(iso);
    mois[mois.length - 1].cases.push({
      jour: date.getUTCDate(),
      date: iso,
      enVague: vague,
      rangDansLesVagues: vague ? rang++ : null,
    });
  }
  return mois;
}

/** Le nombre de jours d'une saison, et combien en vague de chaleur. */
export function compteDeLaSaison(mois: readonly MoisDuCalendrier[]): {
  jours: number;
  enVague: number;
} {
  const jours = mois.flatMap((m) => m.cases).filter((c) => c !== null);
  return {
    jours: jours.length,
    enVague: jours.filter((c) => c.enVague).length,
  };
}
