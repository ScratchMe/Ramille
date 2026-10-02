/**
 * La file d'attente locale des erreurs — `docs/exploitation/remontee-erreurs.md` §3 bis, 02/10/2026.
 *
 * Module **pur** : la file se lit, s'allonge et se vide ici ; le stockage et l'envoi vivent dans
 * `src/lib/analytics.ts`.
 *
 * ## Le défaut
 *
 * `app_error` s'écrit dans `usage_events`, qui exige une session. Deux classes de pannes ne laissaient
 * donc **aucune trace** : une exception pendant les premiers instants, avant qu'`ensureSession()` ait
 * abouti, et une panne sur un appareil hors ligne — `track()` avalait l'échec sans le garder. Le
 * registre le disait : « l'absence d'événement `app_error` ne prouve rien ». Et c'est précisément sur
 * ces deux cas que la phase de test fermé sur Play, à quinze personnes, a besoin de savoir.
 *
 * ## La règle
 *
 * Une erreur qui ne peut pas partir — **pas de session, ou pas de réponse** — se garde sur l'appareil, et
 * part au prochain démarrage qui a une session, ou, sur natif, au prochain retour au premier plan compté
 * comme une ouverture (cinq minutes derrière au moins, `DELAI_NOUVELLE_OUVERTURE_MS`). Elle part alors avec deux
 * propriétés de plus : `differee`, parce que l'horodatage de la ligne est celui du serveur à l'envoi
 * (`usage_events_stamp_time`), et `retard_h`, l'écart en heures entre la panne et l'envoi.
 *
 * Trois bornes, et chacune a sa raison :
 *
 *   * **vingt erreurs au plus**, les plus récentes : une boucle de pannes ne remplit ni le stockage ni le
 *     garde-fou de volume d'`usage_events` (500 lignes par jour et par personne) ;
 *   * **trente jours au plus** : une panne d'il y a un mois ne dit plus rien de la version en service ;
 *   * **un refus vide la file, une panne du serveur la garde** : rejouer une ligne que la base refuse — une
 *     propriété hors des bornes — la referait refuser à chaque démarrage, pour toujours, et le garde-fou
 *     de volume répond lui aussi par un refus (`check_violation`, un 400). Mais un 5xx, un 429 ou un 408
 *     sont passagers, et un incident Supabase est précisément le moment où les pannes comptent : avec un
 *     envoi **sans réponse** (`status === 0`), ce sont eux qui gardent (`suiteDeLEnvoi`). Une panne du
 *     serveur qui durerait coûte un insert par démarrage, borné par les trente jours.
 *
 * Ce qui reste hors d'atteinte : la panne de configuration (pas de client, donc pas d'envoi possible, et
 * un build qui ne se répare pas tout seul), et la panne où notre code ne tourne plus du tout.
 */
import { APP_ERROR_CATEGORIES, type AppErrorCategory } from '@/types/analytics';

export type ErreurEnAttente = { category: AppErrorCategory; route: string; noteeLe: number };

/**
 * Où la file vit sur l'appareil. **Sous le préfixe commun** : les départs voulus — suppression du compte,
 * déconnexion — l'effacent avec le reste. **Mais l'arrivée d'un autre compte ne la balaie pas**
 * (`effacerLesMarquesDuCompte`, `src/lib/marques-locales.ts`) : une panne est un fait de l'appareil, pas
 * une marque du compte, et le cas où une session est remplacée par une autre — un jeton refusé, puis une
 * session neuve — est justement celui où la file a des pannes à rendre.
 */
export const CLE_DE_LA_FILE = 'traceverte.erreurs_en_attente.v1';

export const TAILLE_DE_LA_FILE = 20;
export const AGE_MAXIMAL_MS = 30 * 24 * 3600 * 1000;

/** La file allongée d'une erreur — les plus récentes gardées au-delà de la taille. */
export function enfiler(file: readonly ErreurEnAttente[], erreur: ErreurEnAttente): ErreurEnAttente[] {
  return [...file, erreur].slice(-TAILLE_DE_LA_FILE);
}

/**
 * La file telle que le stockage la rend — **illisible, elle est vide** : une file abîmée ne doit ni
 * lever au démarrage ni faire partir une ligne mal formée. Les erreurs trop vieilles en sortent.
 */
export function lireLaFile(brut: string | null, maintenant: number): ErreurEnAttente[] {
  if (!brut) return [];
  let valeur: unknown;
  try {
    valeur = JSON.parse(brut);
  } catch {
    return [];
  }
  if (!Array.isArray(valeur)) return [];
  return valeur
    .filter(
      (e): e is ErreurEnAttente =>
        typeof e === 'object' &&
        e !== null &&
        (APP_ERROR_CATEGORIES as readonly string[]).includes((e as ErreurEnAttente).category) &&
        typeof (e as ErreurEnAttente).route === 'string' &&
        typeof (e as ErreurEnAttente).noteeLe === 'number' &&
        Number.isFinite((e as ErreurEnAttente).noteeLe)
    )
    .filter((e) => maintenant - e.noteeLe <= AGE_MAXIMAL_MS)
    .slice(-TAILLE_DE_LA_FILE);
}

/** Les propriétés de l'événement envoyé en différé. */
export function propsDifferees(
  erreur: ErreurEnAttente,
  maintenant: number
): { category: AppErrorCategory; route: string; differee: true; retard_h: number } {
  return {
    category: erreur.category,
    route: erreur.route,
    differee: true,
    retard_h: Math.max(0, Math.round((maintenant - erreur.noteeLe) / 3_600_000)),
  };
}

/**
 * Ce qu'on fait de la file après un envoi : la **garder** si la requête n'a pas eu de réponse ou si le
 * serveur est en panne passagère, la **vider** sinon — réussie ou refusée (voir l'en-tête).
 */
export function suiteDeLEnvoi(status: number, erreur: unknown): 'vider' | 'garder' {
  if (!erreur) return 'vider';
  return status === 0 || status === 408 || status === 429 || status >= 500 ? 'garder' : 'vider';
}

/** Une erreur est-elle celle-là ? — pour retirer de la file ce qui vient de partir, et rien d'autre. */
export function memeErreur(a: ErreurEnAttente, b: ErreurEnAttente): boolean {
  return a.noteeLe === b.noteeLe && a.route === b.route && a.category === b.category;
}
