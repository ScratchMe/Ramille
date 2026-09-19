import { formatIntention } from '@/types/plan';

/**
 * Ce qu'un nouveau bilan fait à l'engagement en cours (C6.2, `v1-19` D3 et D4).
 *
 * **Le fait, relu dans la définition vivante de `generate_plan_cycle_for_user` le 19/09/2026** — et
 * il dit l'inverse de ce que la première version de ce module affirmait. La fonction **capture**
 * l'engagement, régénère le cycle, puis le **repose** sur la ligne du nouveau plan qui porte le même
 * gabarit :
 *
 * ```sql
 * update public.plan_actions
 *    set committed_at = v_eng.committed_at, intention_days = …, intention_timing = …
 *  where plan_cycle_id = v_cycle_id and action_template_id = v_eng.action_template_id;
 * if not found then perform public.archiver_engagement(… v_raison); end if;
 * ```
 *
 * L'engagement n'est donc archivé — et perdu — **que si son gabarit n'est plus proposé** par le plan
 * recalculé. C'est le cas minoritaire : il faut que les réponses aient changé au point de rendre
 * l'action impossible ou sans objet.
 *
 * **D'où venait l'erreur** : `CLAUDE.md` écrit « le re-bilan **reprend** l'engagement, le changement
 * de saison le reconduit », et « reprend » a été lu comme « le lui retire » là où le code dit « le
 * récupère et le repose ». La feuille annonçait donc une perte certaine à quelqu'un qui, dans le cas
 * courant, garde son action. Mesurer la fonction plutôt que lire sa description aurait coûté une
 * requête.
 *
 * **Le seuil reste la période, jamais un nombre de jours.** C'est ce que la base sait déjà
 * (`plan_cycles.period_start` / `period_end`) : à la bascule de saison le cycle est neuf, donc
 * l'engagement est *reconduit* par un autre chemin et il n'y a rien à annoncer.
 *
 * **Et on annonce sans refuser.** Le produit dit déjà la perte *après coup*, par l'encart orphelin
 * du plan filtré sur `released_reason = 'rebilan'` ; ce module la dit **avant**, au conditionnel,
 * qui est la seule forme vraie.
 */
export type EngagementEnCours = {
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
 * L'engagement de la période courante, ou `null` s'il n'y en a pas.
 *
 * **Le nom dit ce que la fonction calcule, et plus ce qu'on croyait qu'il adviendrait** : elle
 * s'appelait `engagementLibereParUnNouveauBilan`, ce qui affirmait une perte que le serveur ne
 * produit pas. Elle rend l'engagement **exposé au recalcul**, dont le sort dépend de ce que le
 * nouveau plan proposera.
 *
 * **Les bornes se comparent en chaînes**, jamais en `Date` : `period_end` est une date de calendrier
 * en `YYYY-MM-DD`, et `new Date('2026-11-30')` est minuit **UTC**, donc le 29 à l'ouest de
 * Greenwich. L'ordre lexicographique d'un `YYYY-MM-DD` est son ordre chronologique — c'est l'idiome
 * que `mois_francais` et sa jumelle suivent déjà pour la même raison.
 *
 * `period_end` est **inclus** : le dernier jour d'une saison est encore dans la saison.
 */
export function engagementDeLaPeriodeCourante(
  cycle: CyclePourRebilan | null,
  aujourdHui: string
): EngagementEnCours | null {
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
 * Ce que l'avertissement dit qu'il va se passer.
 *
 * **La phrase est au conditionnel parce que le serveur l'est.** Elle affirmait une perte ; elle dit
 * désormais la règle exacte — l'action reste engagée si le plan recalculé la propose encore, et on
 * en choisit une autre sinon. C'est la seule formulation qui soit vraie dans les deux cas, et elle
 * ne fait peur ni à tort ni par omission.
 *
 * **Deux formes et non une seule à trous, et la seconde est défensive** — il faut le dire, sinon un
 * prochain passage la prendra pour du code mort et la retirera. La base garantit qu'une action
 * engagée porte une intention : `plan_actions_engagement_coherent` exige, dès que `committed_at` est
 * posé, **exactement une** des deux formes. Ce que la base ne garantit pas, c'est que le client
 * sache la **lire** : `formatIntentionTiming` cherche la valeur dans `INTENTION_TIMINGS`, donc une
 * échéance ajoutée côté SQL et pas côté TypeScript rendrait `null` — le piège de
 * `complement_de_maintien` et d'`emission_factor_sources`, déjà payé deux fois ici.
 *
 * Le point final du libellé part avant la composition : les gabarits en portent un, et sans ça la
 * phrase enchaîne deux ponctuations.
 */
export function phraseDeLEngagementRecalcule(engagement: EngagementEnCours): string {
  const action = engagement.action.replace(/\.$/, '');

  if (engagement.intention === null) {
    return `L’action que tu suis — ${action} — reste engagée si ton nouveau plan la propose encore. Sinon, tu en choisiras une autre.`;
  }
  return `L’action que tu suis — ${action} — et le moment que tu avais choisi restent engagés si ton nouveau plan propose encore cette action. Sinon, tu en choisiras une autre.`;
}
