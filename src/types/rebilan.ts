import { formatIntention } from '@/types/plan';

/**
 * Ce qu'un nouveau bilan coûte à l'engagement en cours (C6.2, `v1-19` D3 et D4).
 *
 * **Le fait** : un nouveau bilan soumis dans la **même période** que le cycle courant ne crée pas
 * de second cycle — `generate_plan_cycle_for_user` reconstruit celui qui existe, et la reprise de
 * l'engagement passe par `archiver_engagement` avec `released_reason = 'rebilan'` (C2.2).
 * `committed_at`, `intention_days` et `intention_timing` repartent. Quelqu'un qui voulait seulement
 * corriger une réponse ressort sans action engagée, et c'est arrivé en recette le 18/09/2026
 * (`v1-13` §14.6).
 *
 * **Le seuil est une période, jamais un nombre de jours.** C'est ce que la base sait déjà
 * (`plan_cycles.period_start` / `period_end`) **et** exactement la condition sous laquelle la perte
 * se produit : à la bascule de saison le cycle est neuf, donc l'engagement est *reconduit* et rien
 * ne se perd. Un seuil en jours serait un second calendrier à tenir d'accord avec le premier, et il
 * se tromperait aux bornes.
 *
 * **On avertit, on ne refuse pas.** Le produit annonce déjà cet effet *après coup* — l'encart
 * orphelin du plan lit l'archive filtrée sur `rebilan`. Il ne s'agit pas d'inventer un mécanisme
 * mais de le dire avant.
 */
export type EngagementLibere = {
  /** Le libellé de l'action engagée, figé sur le gabarit. */
  action: string;
  /** « le mardi et le jeudi », « ce mois-ci »… ou `null` si la ligne n'en porte pas. */
  intention: string | null;
};

/** Ce que l'écran lit d'un cycle de plan pour trancher. */
export type CyclePourRebilan = {
  period_start: string;
  period_end: string;
  actions: {
    committed_at: string | null;
    intention_days: number[] | null;
    intention_timing: string | null;
    action_templates: { action_text: string } | null;
  }[];
};

/**
 * La date du jour au calendrier **local**, en `YYYY-MM-DD`.
 *
 * Local et non UTC parce que la question posée est calendaire et humaine — « la saison est-elle
 * encore en cours ? » —, la même que celle de `saisonDe` (`src/types/saison.ts`), et non celle du
 * `date_trunc` des générateurs de points, qui est en UTC et dont `debutDePeriodeInterrogee` est la
 * jumelle. Les deux conventions cohabitent dans le produit et **les aligner casserait l'une des
 * deux** ; ce qui décide, c'est ce que la borne comparée signifie.
 *
 * Composée à partir de `getFullYear` / `getMonth` / `getDate` et jamais d'un `toISOString`, qui
 * rendrait la date UTC — donc la veille pour tout le fuseau français entre minuit et 2 h.
 */
export function dateCalendaire(maintenant: Date): string {
  const mois = String(maintenant.getMonth() + 1).padStart(2, '0');
  const jour = String(maintenant.getDate()).padStart(2, '0');
  return `${maintenant.getFullYear()}-${mois}-${jour}`;
}

/**
 * L'engagement qu'un nouveau bilan libérerait, ou `null` s'il n'y a rien à perdre.
 *
 * **Les bornes se comparent en chaînes**, jamais en `Date` : `period_end` est une date de calendrier
 * en `YYYY-MM-DD`, et `new Date('2026-11-30')` est minuit **UTC**, donc le 29 à l'ouest de
 * Greenwich. L'ordre lexicographique d'un `YYYY-MM-DD` est son ordre chronologique — c'est l'idiome
 * que `mois_francais` et sa jumelle suivent déjà pour la même raison.
 *
 * `period_end` est **inclus** : le dernier jour d'une saison est encore dans la saison.
 */
export function engagementLibereParUnNouveauBilan(
  cycle: CyclePourRebilan | null,
  aujourdHui: string
): EngagementLibere | null {
  if (cycle === null) return null;
  if (aujourdHui < cycle.period_start || aujourdHui > cycle.period_end) return null;

  const engagee = cycle.actions.find((a) => a.committed_at !== null);
  if (engagee === undefined) return null;

  return {
    // Le repli est celui des cartes du plan, pour qu'une ligne sans gabarit n'affiche pas un tiret
    // au milieu d'une phrase.
    action: engagee.action_templates?.action_text ?? 'Action à préciser.',
    intention: formatIntention(engagee.intention_days, engagee.intention_timing),
  };
}

/**
 * Ce que l'avertissement dit qu'on perd.
 *
 * **Deux formes et non une seule à trous, et la seconde est défensive** — il faut le dire, sinon
 * un prochain passage la prendra pour du code mort et la retirera. La base garantit qu'une action
 * engagée porte une intention : `plan_actions_engagement_coherent` exige, dès que `committed_at`
 * est posé, **exactement une** des deux formes. Ce que la base ne garantit pas, c'est que le client
 * sache la **lire** : `formatIntentionTiming` cherche la valeur dans `INTENTION_TIMINGS`, donc une
 * échéance ajoutée côté SQL et pas côté TypeScript rendrait `null` — le piège de
 * `complement_de_maintien` et d'`emission_factor_sources`, déjà payé deux fois ici.
 * Écrire « et le moment que tu avais choisi — ­— » serait alors la fausseté lisible que ce dépôt
 * retire ailleurs.
 *
 * Le point final du libellé part avant la composition : les gabarits en portent un, et sans ça la
 * phrase enchaîne deux ponctuations.
 */
export function phraseDeLEngagementLibere(engagement: EngagementLibere): string {
  const action = engagement.action.replace(/\.$/, '');

  if (engagement.intention === null) {
    return `L’action que tu suis — ${action} — ne sera plus engagée.`;
  }
  return `L’action que tu suis — ${action} — et le moment que tu avais choisi — ${engagement.intention} — ne seront plus engagés.`;
}
