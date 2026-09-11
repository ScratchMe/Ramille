import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BandeHaute } from '@/components/bande-haute';
import { Button } from '@/components/button';
import { CheckinCard, type EngagementCheckin } from '@/components/checkin-card';
import { EmptyStateIllustration } from '@/components/illustrations/empty-state-illustration';
import { Mascot } from '@/components/mascot';
import { MessageInline } from '@/components/message-inline';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { RAMILLE } from '@/constants/mascotte';
import { formatTonnes } from '@/lib/format';
import { useRafraichirAuRetour } from '@/hooks/use-rafraichir-au-retour';
import { useTrackFocus } from '@/hooks/use-track-focus';
import { track } from '@/lib/analytics';
import { ActionCard } from '@/components/plan/action-card';
import { ActionCommitment } from '@/components/plan/action-commitment';
import { FeuilleRappels } from '@/components/plan/feuille-rappels';
import { formatIntention, formeInserable } from '@/types/plan';
import { daysSince, REBILAN_SUGGESTION_DAYS } from '@/types/suivi';
import {
  aVuEngagementOrphelin,
  aVuRattachementAnnonce,
  marquerEngagementOrphelinVu,
  marquerRattachementAnnonce,
} from '@/lib/connexion-prefs';
import { lireEtatDuRattachement } from '@/lib/compte';
import {
  aDejaVuLaFeuilleDeRappel,
  loadReminderPrefs,
  type ReminderPrefs,
} from '@/lib/notification-prefs';
import { lirePermission } from '@/lib/rappels';
import { supabase } from '@/lib/supabase';
import {
  carteAttente,
  doitProposerLaFeuille,
  type Boucle,
  type CanalPrefere,
  type Permission,
} from '@/types/rappels';

type PlanAction = {
  id: string;
  saving_kg_year: number | null;
  saving_share_percent: number | null;
  detail_text: string | null;
  rank: number | null;
  committed_at: string | null;
  intention_days: number[] | null;
  intention_timing: string | null;
  /** Le cycle d'où l'engagement a été reconduit (C2.2) — ce qui porte « · RECONDUIT ». */
  carried_over_from: string | null;
  action_templates: { action_text: string; poste: string | null } | null;
};

type PlanCycle = {
  id: string;
  period_label: string;
  /** La fin de la période, lue pour dire qu'un cycle est révolu plutôt que le montrer à jour (C2.2). */
  period_end: string;
  trip_label: string;
  /** `commute` | `leisure` | `travel`, snapshoté à la génération (C2.6). */
  poste: string | null;
  baseline_co2_kg_year: number | null;
  target_reduction_pct: number;
  plan_actions: PlanAction[];
};

/**
 * L'engagement qu'un re-bilan a emporté (C2.2), lu dans `plan_action_commitments_archive`.
 *
 * Le plan le dit **une fois** : c'est une nouvelle, pas un état. La marque d'annonce vit en
 * AsyncStorage et porte l'identifiant de la ligne, pour qu'un second re-bilan puisse le dire à
 * son tour.
 */
type EngagementOrphelin = { id: string; action_text: string };

// Une seule question vivante par boucle, la plus récente. La requête est déjà triée par
// `period_start` décroissant, donc le premier vu de chaque `loop_type` est le bon.
//
// `period_start` n'est plus ajouté ici : il fait partie d'`EngagementCheckin` depuis C2.3, parce
// que c'est lui qui nomme le mois dans la question de la boucle mensuelle.
function keepLatestPerLoop(checkins: EngagementCheckin[]): EngagementCheckin[] {
  const seen = new Set<EngagementCheckin['loop_type']>();
  return checkins.filter((checkin) => {
    if (seen.has(checkin.loop_type)) return false;
    seen.add(checkin.loop_type);
    return true;
  });
}

/**
 * Par quel chemin ce compte a-t-il été rattaché ? Lu sur les **identités** de la session, jamais
 * déduit de la présence d'une adresse : Google en fournit une aussi, et prendre « email » par
 * défaut rangerait tous les comptes Google du mauvais côté. Sert à ne pas compter deux fois un
 * rattachement Google, que `/connexion` émet déjà au retour de `linkIdentity()`.
 *
 * `null` quand la lecture échoue : une méthode inventée fausserait la seule comparaison que
 * `connexion_success` permet, donc on préfère ne rien compter et réessayer au passage suivant.
 */
async function methodeDuRattachement(): Promise<'google' | 'email' | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return (data.user.identities ?? []).some((identite) => identite.provider === 'google')
    ? 'google'
    : 'email';
}

type LoadState =
  | { status: 'loading' }
  // Aucun bilan complété — écran "État vide" de la maquette.
  | { status: 'no_assessment' }
  // **Rien n'a pu être lu, et c'est autre chose que « rien à afficher »** (A4-1). L'erreur des
  // requêtes était purement ignorée : hors ligne, `assessment === null` menait à
  // `no_assessment`, donc à « Ton bilan n'est pas encore fait » et à un bouton pour le refaire,
  // à quelqu'un qui en a un. Un état vide est une affirmation sur les données de la personne.
  //
  // **Cet état ne s'atteint que depuis `loading`** : les trois autres viennent d'une lecture
  // qui a réussi, et l'écran d'erreur plein écran ne vaut que quand rien n'a jamais pu être lu.
  // La relecture en échec se dit à côté (`relectureEnEchec`), sans rien effacer.
  | { status: 'erreur_reseau' }
  // Bilan complété mais plan_cycles pas encore généré — ne devrait plus arriver en
  // pratique (compute_assessment_results le génère désormais immédiatement, cf.
  // migration 20260824190000), gardé comme filet pour les bilans complétés avant elle
  // et pas encore repris par le cron quotidien.
  | { status: 'pending'; assessmentId: string }
  | {
      status: 'ok';
      cycle: PlanCycle;
      assessmentId: string;
      /** Date du dernier bilan complété — sert la proposition de re-bilan. */
      assessmentDate: string | null;
      checkins: EngagementCheckin[];
    };

// B "Plan de réduction". Depuis l'étape 6a (v1-07 §3.3), chaque action porte son gain estimé,
// figé à la génération du cycle : `plan_actions.saving_kg_year` et `.saving_share_percent`.
// L'écran ne calcule donc rien — il affiche ce que `estimate_action_savings` a arrêté au
// moment du bilan, pour qu'un chiffre montré ne bouge pas sous les yeux de la personne au gré
// d'une mise à jour ADEME.
//
// Le cap de la saison (`target_reduction_pct`, -20 %) était stocké depuis l'increment 3 et
// lu par aucun écran (T10 de l'audit). Il est affiché ici, avec l'objectif qu'il implique.
//
// Deux formulations à ne pas durcir : le gain est une **estimation** déclarative fondée sur
// des moyennes ADEME, jamais une mesure ; et un plan sans action n'est pas un échec mais le
// signe que la personne fait déjà l'essentiel — l'état correspondant la félicite au lieu de
// lui présenter une liste vide.
export default function Plan() {
  // **Émis au focus et non au montage** : dans une barre d'onglets, react-navigation garde
  // l'écran monté quand on passe à l'autre. Avec `useTrackView`, l'événement ne partirait
  // qu'à la première ouverture de la session — et le taux de retour, qui est la question
  // même que la navigation pose, deviendrait invisible (v1-11 §2, piège relevé au plan).
  useTrackFocus('plan_view');

  const [state, setState] = useState<LoadState>({ status: 'loading' });
  // **Hors du `LoadState`, et pas par commodité** : la dernière relecture peut échouer
  // au-dessus de n'importe quel écran issu d'une lecture réussie — le plan, mais aussi
  // « en préparation » et « pas encore de bilan ». Porté par la variante `ok` seule, le drapeau
  // obligeait le repli à écraser les deux autres, qui perdaient alors leurs sorties : « Revoir
  // mon bilan » depuis `pending`, et « Faire mon bilan » depuis `no_assessment` — le
  // questionnaire, lui, se remplit très bien hors ligne (brouillon AsyncStorage).
  const [relectureEnEchec, setRelectureEnEchec] = useState(false);
  // Recharge après un engagement : le RPC libère aussi l'action précédente, donc l'état à
  // jour ne se déduit pas de l'action qu'on vient de toucher — il faut relire le cycle.
  const [refreshKey, setRefreshKey] = useState(0);
  const rafraichir = useCallback(() => setRefreshKey((cle) => cle + 1), []);

  // **Le plan est la destination du rappel, il doit donc être à jour quand on y arrive.**
  // Sans ça il ne se chargeait qu'une fois par lancement : appuyer sur une notification avec
  // l'app en arrière-plan ramenait sur un plan sans la question qui venait de s'ouvrir — la
  // promesse rompue à l'endroit exact où elle se tient (09/09/2026, vérifié sur appareil).
  useRafraichirAuRetour(rafraichir);
  // Annonce du rattachement : `null` tant qu'on ne sait pas, une adresse (ou la chaîne vide
  // quand Google ne la remonte pas) quand il y a quelque chose à dire.
  const [rattachement, setRattachement] = useState<string | null>(null);
  // Les rappels : ce que la carte d'attente affiche, et ce que la feuille présélectionne.
  // `null` tant qu'on ne sait pas — mieux vaut ne rien dire qu'annoncer un canal faux.
  const [rappels, setRappels] = useState<ReminderPrefs | null>(null);
  // `null` tant qu'on ne sait pas : le jour que Ramille nomme vient du libellé du poste
  // domicile-travail, et une valeur par défaut nommerait le mauvais rythme (cf. le chargement).
  const [boucle, setBoucle] = useState<Boucle | null>(null);
  const [permission, setPermission] = useState<Permission>('fermee');
  /**
   * L'engagement qu'un re-bilan a emporté, tant qu'il n'a pas été annoncé sur cet appareil (C2.2).
   *
   * Logé **à côté** du `LoadState` et jamais dans sa variante `ok`, comme la ligne de relecture :
   * un drapeau dans `LoadState.ok` détruirait `pending`, `no_assessment` et `empty` — donc
   * « Revoir mon bilan » et « Faire mon bilan » — au premier repli.
   */
  const [orphelin, setOrphelin] = useState<EngagementOrphelin | null>(null);

  /**
   * Le lien du rappel porte `?rappel=1` (C2.11). Il ne sert qu'à l'état sans bilan : quand il y a un
   * plan à montrer, il n'y a rien à expliquer — la personne est au bon endroit.
   */
  const { rappel } = useLocalSearchParams<{ rappel?: string }>();
  const vientDUnRappel = rappel === '1';
  const [feuilleOuverte, setFeuilleOuverte] = useState(false);

  // **La confirmation se termine hors de l'app** : la personne clique le lien reçu par email
  // et revient ici, `is_anonymous` passé à `false`. Rien ne le lui disait (issue #62) — la
  // boucle ouverte par « Vérifie tes emails » ne se refermait nulle part. On l'annonce une
  // seule fois : c'est une nouvelle, pas un état permanent en tête du plan. Qui veut le
  // revoir le trouve sur « Toi ».
  //
  // **C'est aussi le seul endroit qui peut constater un rattachement par email, donc c'est ici
  // que part `connexion_success`** (v1-13 C1.2). L'écran email l'émettait juste après
  // `updateUser({ email })`, où rien n'est encore rattaché : `etatDuRattachement` classe cet
  // instant en `a_confirmer`, et `is_anonymous` ne bascule qu'au clic du lien. Il n'y porte plus
  // que `connexion_demande`, l'intention — l'écart entre les deux **est** le taux d'emails jamais
  // confirmés, c'est-à-dire le chiffre cherché.
  //
  // Deux précautions qui font que ce chiffre veut dire quelque chose :
  //
  // — **Google n'est émis ici que sur web**, où l'écran de connexion ne peut pas le faire : sa
  //   redirection plein écran emporte la page avant la ligne suivante, et le retour d'OAuth
  //   atterrit ici sans repasser par lui. Sur natif, `/connexion` constate la session liée dans le
  //   geste même et l'émet là-bas ; le compter une seconde fois doublerait exactement la branche à
  //   laquelle on compare l'email. La méthode se lit donc sur les identités de la session, jamais
  //   sur la présence d'une adresse — Google en fournit une aussi.
  // — **L'émission partage la marque d'annonce, et ce n'est pas un raccourci.** Sans garde,
  //   l'événement repartirait à chaque passage sur le plan et ne compterait plus des
  //   rattachements mais des ouvertures d'onglet par quelqu'un de connecté : le taux de
  //   conversion, seule chose que cet événement sert à lire, deviendrait un ratio de fréquence
  //   d'usage. La marque est écrite dans la même foulée que l'annonce, donc « déjà annoncé »
  //   vaut « déjà compté ».
  //
  // `refreshKey` en dépendance, et pas un tableau vide : le retour de la messagerie est
  // exactement le cas d'un écran d'onglet que react-navigation garde monté (v1-12 §8.1). Avec
  // `[]`, la bascule survenue après le premier passage n'était vue qu'au lancement suivant —
  // l'annonce arrivait en retard et l'événement avec elle. La marque empêche le doublon.
  useEffect(() => {
    let annule = false;

    (async () => {
      if (await aVuRattachementAnnonce()) return;
      const etat = await lireEtatDuRattachement().catch(() => null);
      if (annule || etat?.kind !== 'rattache') return;
      const methode = await methodeDuRattachement().catch(() => null);
      if (annule) return;
      setRattachement(etat.email ?? '');
      // Méthode indéterminée : on n'écrit ni l'événement ni la marque — le passage suivant
      // reprendra les deux, et l'annonce ci-dessus est déjà à l'écran en attendant.
      if (methode === null) return;
      // **Sur web, Google se compte ici aussi, et c'est la seule façon de le compter.**
      // `/connexion` l'émet au retour de `linkIdentity()` — mais sur web cet appel déclenche une
      // redirection plein écran et rend la main avant elle : la ligne de mesure partait pendant
      // le déchargement du document et n'arrivait jamais, et le retour d'OAuth atterrit
      // directement ici sans repasser par l'écran de connexion (A6-20). Le rattachement Google
      // sur web n'était donc jamais compté, ce qui se lit comme une conversion plus faible sur
      // web que sur natif, sans cause visible. Sur natif, l'écran de connexion constate la
      // session liée dans le geste même : le compter une seconde fois doublerait exactement la
      // branche à laquelle on compare l'email.
      if (methode === 'email' || Platform.OS === 'web') {
        track('connexion_success', { method: methode });
      }
      await marquerRattachementAnnonce();
    })();

    return () => {
      annule = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;

    // **Une lecture qui échoue n'est ni « pas de bilan » ni « plan en préparation ».** Les deux
    // replis disaient la même chose à quelqu'un dans le métro : que ses données n'existent pas.
    //
    // Un écran déjà rempli n'est jamais remplacé par l'erreur : ce qu'il montre reste vrai,
    // seulement plus tout à fait à jour. Ce chargement tourne à chaque retour au premier plan
    // (`useRafraichirAuRetour`), et le plan est la destination du rappel — le remplacer par un
    // écran d'erreur à chaque ouverture hors ligne coûterait plus que la ligne qui le dit.
    const echecDeLecture = () => {
      if (cancelled) return;
      setRelectureEnEchec(true);
      // `pending` et `no_assessment` sont dérivés d'une lecture **réussie** au même titre que
      // `ok` : seul `loading` n'a jamais rien su, et c'est le seul que l'écran d'erreur plein
      // écran remplace.
      setState((precedent) =>
        precedent.status === 'loading' ? { status: 'erreur_reseau' } : precedent
      );
    };

    (async () => {
      try {
        // Le lien "Revenir à mon bilan" pointe vers la restitution du dernier bilan
        // complété (elle-même donne accès à "Modifier mes réponses") — il faut donc son
        // id systématiquement, pas seulement dans le cas filet ci-dessous.
        const { data: assessment, error: erreurBilan } = await supabase
          .from('assessments')
          .select('id, submitted_at')
          .eq('status', 'completed')
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (erreurBilan) {
          echecDeLecture();
          return;
        }

        if (!assessment) {
          setState({ status: 'no_assessment' });
          // Une lecture qui aboutit efface la ligne de relecture, y compris sur les deux
          // sorties anticipées : sans ça, elle survivrait à l'échec précédent au-dessus d'un
          // écran pourtant à jour.
          setRelectureEnEchec(false);
          return;
        }

        const { data: cycle, error: cycleError } = await supabase
          .from('plan_cycles')
          .select(
            // Chaîne littérale d'un seul tenant, volontairement longue : supabase-js infère le
            // type du résultat en analysant ce littéral au niveau des types. Une concaténation
            // lui rend un `string` opaque et le typage du retour est perdu.
            //
            // **`plan_actions!plan_actions_plan_cycle_id_fkey` est obligatoire depuis C2.2**, et
            // ce n'est pas une précaution de typage : `carried_over_from` est une **seconde** clé
            // étrangère de `plan_actions` vers `plan_cycles`, donc PostgREST ne sait plus laquelle
            // suivre et refuse la requête (« more than one relationship was found »). Sans le
            // nom de la clé, l'écran du plan ne charge plus du tout. Le typecheck l'attrape —
            // c'est le seul garde qui le fait, la chaîne étant analysée au niveau des types.
            'id, period_label, period_end, trip_label, poste, baseline_co2_kg_year, target_reduction_pct, plan_actions!plan_actions_plan_cycle_id_fkey(id, saving_kg_year, saving_share_percent, detail_text, rank, committed_at, intention_days, intention_timing, carried_over_from, action_templates(action_text, poste))'
          )
          .order('period_start', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        // **Le cycle manquant et le cycle illisible ne sont plus le même état.** Les deux
        // tombaient sur « Ton plan est en cours de préparation », qui est une affirmation :
        // elle dit qu'il n'y a rien à montrer *encore*, donc qu'il suffit d'attendre. Hors
        // ligne, il n'y a rien à attendre. `pending` reste le filet du cas légitime — un bilan
        // complété avant que le calcul ne génère le plan, que le cron rattrape.
        if (cycleError) {
          echecDeLecture();
          return;
        }

        if (!cycle) {
          setState({ status: 'pending', assessmentId: assessment.id });
          setRelectureEnEchec(false);
          return;
        }

        // Check-ins en attente (boucle hebdo domicile-travail + boucle mensuelle extras,
        // cf. generate_commute_checkins/generate_extras_checkins). Les périodes révolues sont
        // clôturées côté serveur en `expired` (migration 20260904180000) : sans ça, un
        // utilisateur absent huit semaines retrouvait huit cartes identiques.
        //
        // Le `keepLatestPerLoop` ci-dessous est une ceinture en plus de cette bretelle : si un
        // passage de cron était manqué, la table pourrait de nouveau porter deux périodes en
        // attente pour une même boucle. On n'affiche jamais qu'une question vivante par boucle,
        // la plus récente — une pile de rappels est le contraire de ce que cette boucle promet.
        //
        // Une erreur ici compte autant que les deux autres : sans les points, la carte d'attente
        // prend leur place et Ramille dit qu'il n'y a rien à rattraper le jour où la question
        // est justement ouverte.
        const { data: checkins, error: erreurCheckins } = await supabase
          .from('engagement_checkins')
          .select('id, loop_type, period_label, trip_label, poste, period_start, question_kind, mode')
          .eq('status', 'pending')
          .order('period_start', { ascending: false });

        if (cancelled) return;

        if (erreurCheckins) {
          echecDeLecture();
          return;
        }

        // Quelle boucle concerne cette personne, donc quel jour Ramille peut nommer : le point
        // du lundi n'est généré que si un poste domicile-travail existe (v1-12 §3). C'est le
        // prochain contact qui compte, pas l'action engagée.
        //
        // **L'engagement qu'un re-bilan a emporté** se lit dans la même fournée (C2.2). Le filtre
        // porte sur la raison : `saison` et `changement` n'ont rien à annoncer — l'une est une
        // reconduction qui a échoué à la frontière d'une saison, l'autre est la décision de la
        // personne elle-même, qu'il serait absurde de lui apprendre. Seul `rebilan` est un effet
        // de bord qu'elle n'a pas choisi.
        const [{ data: resultat, error: erreurResultat }, { data: orphelins }, prefs, etatPermission] =
          await Promise.all([
            supabase
              .from('assessment_results')
              .select('commute_poste_label')
              .eq('assessment_id', assessment.id)
              .maybeSingle(),
            supabase
              .from('plan_action_commitments_archive')
              .select('id, action_text')
              .eq('released_reason', 'rebilan')
              .order('released_at', { ascending: false })
              .limit(1),
            loadReminderPrefs(),
            lirePermission(),
          ]);

        if (cancelled) return;

        // **La boucle ne se devine pas sur un échec de lecture.** C'était la seule des quatre
        // lectures dont l'`error` restait ignorée, et le repli n'était pas neutre : sans
        // libellé, `boucle` valait `mensuel`, donc la carte d'attente nommait « le 1er du
        // mois » à quelqu'un dont le point s'ouvre le lundi. On préfère ne pas la nommer du
        // tout — `boucle` reste `null`, la carte ne s'affiche pas — plutôt que de remplacer
        // tout le plan par un écran d'erreur pour une lecture secondaire. La ligne de relecture
        // dit que l'écran n'est pas tout à fait à jour.
        if (!erreurResultat) setBoucle(resultat?.commute_poste_label ? 'hebdo' : 'mensuel');
        setRappels(prefs);
        setPermission(etatPermission);

        // L'encart n'apparaît que si la marque locale ne porte pas déjà cet identifiant. Une
        // lecture en échec laisse simplement `orphelin` à `null` : mieux vaut ne rien dire qu'une
        // nouvelle inventée.
        const orphelin = orphelins?.[0] ?? null;
        setOrphelin(orphelin && !(await aVuEngagementOrphelin(orphelin.id)) ? orphelin : null);

        setState({
          status: 'ok',
          cycle: cycle as PlanCycle,
          assessmentId: assessment.id,
          assessmentDate: assessment.submitted_at,
          checkins: keepLatestPerLoop((checkins as EngagementCheckin[] | null) ?? []),
        });
        // Écrit une seule fois, après le `setState` : le plan est à jour, sauf si la lecture
        // secondaire ci-dessus a échoué.
        setRelectureEnEchec(Boolean(erreurResultat));
      } catch {
        // Une promesse rejetée — `loadReminderPrefs` ou `lirePermission`, qui touchent un
        // module natif et ne rendent pas d'erreur mais lèvent — laissait l'écran sur
        // « Chargement de ton plan… » pour toujours : le même mensonge par omission, en plus
        // muet. Même leçon que la racine de l'app (07/09/2026).
        echecDeLecture();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // Appelée quand un engagement vient d'être pris — jamais quand on en change ni quand on
  // le libère. La feuille ne s'ouvre qu'une fois par appareil : c'est une cérémonie pour la
  // première fois, pas un péage à chaque action.
  const proposerLesRappels = async () => {
    if (!rappels) return;
    const dejaProposee = await aDejaVuLaFeuilleDeRappel();
    if (
      !doitProposerLaFeuille({
        plateforme: Platform.OS === 'web' ? 'web' : 'natif',
        emailPossible: rappels.emailPossible,
        dejaProposee,
      })
    ) {
      return;
    }
    track('rappels_view');
    setFeuilleOuverte(true);
  };

  // À la fermeture, on met à jour l'état local plutôt que de relire la base : la carte
  // d'attente doit refléter le choix immédiatement, et le serveur a déjà été écrit.
  // Dérivée à chaque rendu plutôt que stockée : elle ne dépend que de l'état des rappels et
  // de la boucle, et un second état à tenir en phase serait un état de trop.
  // La permission part avec le reste (A4-15) : sans elle, la carte accusait les réglages du
  // téléphone dès qu'un jeton manquait, y compris quand l'enregistrement venait d'échouer pour
  // une autre raison. C'est un fait de l'appareil, déjà lu par le chargement ci-dessus.
  const attente = rappels && boucle ? carteAttente({ ...rappels, boucle, permission, plateforme: Platform.OS === 'web' ? 'web' : 'natif' }) : null;

  const fermerLaFeuille = (canal: CanalPrefere, jetonActif: boolean) => {
    setFeuilleOuverte(false);
    setRappels((p) => (p ? { ...p, prefere: canal, jetonActif } : p));
    void lirePermission().then(setPermission);
  };

  // **Le seul retour visible du bouton de l'écran d'erreur.** `rafraichir` n'incrémente qu'une
  // clé : l'effet relit, échoue, et `echecDeLecture` laisse rigoureusement le même écran —
  // hors ligne, donc dans le seul cas où cet écran existe, le bouton a l'air mort. Repasser par
  // « Chargement… » dit que le geste a été pris.
  //
  // Et surtout pas dans `rafraichir` lui-même, qui est aussi le rappel de
  // `useRafraichirAuRetour` et celui de l'engagement : y remettre `loading` ferait clignoter
  // « Chargement de ton plan… » à chaque retour au premier plan, c'est-à-dire à chaque arrivée
  // par notification.
  const reessayerDepuisLErreur = () => {
    setState({ status: 'loading' });
    rafraichir();
  };

  // Ce qui est affiché reste vrai, mais date. La ligne vaut au-dessus des trois écrans issus
  // d'une lecture réussie — le plan, « en préparation » et « pas encore de bilan » — et le lien
  // relance la même lecture que le retour sur l'onglet.
  const banniereRelecture = (centree = false) =>
    relectureEnEchec ? (
      <View style={[styles.relecture, centree && styles.relectureCentree]}>
        <MessageInline message="Ton plan n’a pas pu être relu à l’instant : ce que tu vois peut avoir changé depuis. Vérifie ta connexion." />
        <TextLink
          label="Réessayer"
          onPress={rafraichir}
          type="small"
          weight={600}
          themeColor="accentText"
        />
      </View>
    ) : null;

  if (state.status === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <BandeHaute />
          <View style={styles.centered}>
            <ThemedText themeColor="textSecondary">Chargement de ton plan…</ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (state.status === 'no_assessment') {
    // **Venir d'un rappel et n'avoir aucun bilan ici ne veut pas dire « pas de bilan »** (C2.11,
    // constat C-2). L'email ne porte que `/plan` : ouvert sur un ordinateur ou un téléphone neuf, il
    // tombe sur la session anonyme vide que l'app vient de créer, et cet écran répondait « Ton bilan
    // n'est pas encore fait » — avec pour seul bouton « Faire mon bilan » — à quelqu'un qui a un
    // bilan, un plan et des points, juste pas sur cet appareil. La consigne de désinscription du
    // même email (« depuis Toi ») réglait alors la préférence d'une session qui n'est personne.
    //
    // Le paramètre ne change pas le **chemin** : `assetlinks.json` ne revendique que `/plan`, et son
    // périmètre est volontairement étroit (les pages légales et la suppression de compte doivent
    // rester atteignables sans l'app). Une autre route aurait donc fait ouvrir le lien dans le
    // navigateur sur Android.
    if (vientDUnRappel) {
      return (
        <ThemedView style={styles.container}>
          <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <BandeHaute />
            <View style={styles.emptySafeArea}>
              {banniereRelecture(true)}
              {/* Aucun chiffre sur cet écran : la mascotte peut l'occuper sans rien commenter
                  (règle de `src/constants/mascotte.ts`). Elle ne parle pas pour autant — les deux
                  phrases sont de la voix produit. */}
              <View style={styles.rappelMascotte}>
                <Mascot mood="calm" size={72} tilt={-6} />
              </View>
              <ThemedText type="screenTitle">Ce rappel concerne un compte</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
                Retrouve-le ici. Ton bilan, ton plan et tes points sont rattachés à ce compte, pas à
                cet appareil.
              </ThemedText>
              <Button
                title="J’ai déjà un compte"
                onPress={() => router.push('/connexion/retrouver')}
                style={styles.emptyButton}
              />
              <TextLink
                label="Commencer un bilan sur cet appareil"
                onPress={() => router.push('/bilan')}
              />
            </View>
          </SafeAreaView>
        </ThemedView>
      );
    }

    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <BandeHaute />
          <View style={styles.emptySafeArea}>
            {banniereRelecture(true)}
            <EmptyStateIllustration style={styles.emptyIllustration} />
            <ThemedText type="screenTitle">
              Ton bilan n&apos;est pas encore fait
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
              Sans bilan, on ne peut pas savoir quel déplacement compte le plus pour toi. Environ 5
              minutes.
            </ThemedText>
            <Button title="Faire mon bilan" onPress={() => router.push('/bilan')} style={styles.emptyButton} />
            {/* **Le chemin vers un compte existant manquait ici**, et c'est le seul écran qu'un
                appareil neuf montre : sans ce lien, quelqu'un qui a un compte n'avait que
                « Faire mon bilan », c'est-à-dire l'invitation à refaire ce qu'il a déjà fait. Même
                lien que l'accueil de l'onboarding, et même libellé. */}
            <TextLink
              label="J’ai déjà un compte"
              onPress={() => router.push('/connexion/retrouver')}
            />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // L'écran ne sait rien : il le dit, et il ne propose surtout ni de faire un bilan ni
  // d'attendre — les deux replis d'avant affirmaient quelque chose sur les données de la
  // personne. « Réessayer » relance exactement la lecture que le retour sur l'onglet relance.
  if (state.status === 'erreur_reseau') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <BandeHaute />
          <View style={styles.centered}>
            <MessageInline
              message="Ton plan n’a pas pu être relu. Vérifie ta connexion."
              style={styles.erreurTexte}
            />
            <Button title="Réessayer" onPress={reessayerDepuisLErreur} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // **Cet état était un cul-de-sac, et c'est là qu'atterrissait le bilan fantôme** (A2-2, A3-5) :
  // une phrase, aucun bouton, et rien qui en sorte — ni le retour matériel (on est sur l'onglet
  // racine, il quitte l'app), ni le temps (le cron nocturne ne peut pas générer un plan sans
  // réponses). La personne voyait un plan « en préparation » pour toujours.
  //
  // Deux sorties, et les deux sont vraies maintenant. « Réessayer » a un sens depuis que le plan
  // peut manquer pour une raison passagère : la garde de C1.1 rend le bilan même quand la
  // génération du plan échoue, donc relire peut trouver le cycle que le cron a rattrapé depuis.
  // « Revoir mon bilan » est la sortie qui marche dans tous les cas — le résultat, lui, est bien
  // là, et c'est ce que la personne est venue chercher.
  if (state.status === 'pending') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <BandeHaute />
          <View style={styles.centered}>
            {banniereRelecture(true)}
            <ThemedText themeColor="textSecondary" style={styles.attenteTexte}>
              Ton plan est en cours de préparation, reviens dans un instant.
            </ThemedText>
            <Button title="Réessayer" onPress={rafraichir} style={styles.attenteBouton} />
            <TextLink
              label="Revoir mon bilan"
              onPress={() => router.push({ pathname: '/suivi/bilan', params: { id: state.assessmentId } })}
            />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const { cycle, assessmentId, assessmentDate, checkins } = state;
  const actionsCount = cycle.plan_actions.length;
  const committedActionId = cycle.plan_actions.find((a) => a.committed_at !== null)?.id ?? null;
  // Copie avant tri : `sort` mute, et `cycle` vient du state.
  const actionsOrdonnees = [...cycle.plan_actions].sort(
    (a, b) => Number(b.committed_at !== null) - Number(a.committed_at !== null)
  );
  const baselineKg = cycle.baseline_co2_kg_year;
  // Le cap est une part de la baseline du poste dominant, pas du total : c'est sur ce poste
  // que le plan porte, et annoncer -20 % de l'empreinte entière serait une promesse fausse.
  // Même seuil et même lien que sur le suivi : une seule règle, deux endroits où la
  // rencontrer. Le plan est celui où l'on revient le plus souvent — c'est donc là qu'une
  // proposition de re-bilan a le plus de chances d'être vue, alors qu'elle n'existait que
  // sur le suivi.
  const bilanAncien = assessmentDate !== null && daysSince(assessmentDate) >= REBILAN_SUGGESTION_DAYS;

  const capKg =
    baselineKg !== null && baselineKg > 0
      ? Math.round((baselineKg * cycle.target_reduction_pct) / 100)
      : null;

  // **Le cycle affiché peut être révolu, et l'écran le disait à personne** (C2.2). Le cron
  // nocturne construit le cycle de la saison courante, mais il peut ne pas être passé — et un
  // cycle périmé présenté comme courant fait croire qu'on travaille encore sur une période
  // terminée. On le **dit** plutôt que de retomber sur l'écran d'attente : l'action engagée, les
  // jours choisis et le cap restent à l'écran, parce qu'ils ont eu lieu.
  //
  // La comparaison est en chaînes `YYYY-MM-DD` et non en `Date` : `period_end` vient de Postgres
  // en date nue, et `new Date('2026-11-30')` est minuit UTC — donc la veille, à l'ouest de
  // Greenwich, ce qui ferait annoncer une saison révolue un jour trop tôt.
  const aujourdhui = new Date();
  const dateDuJour = `${aujourdhui.getFullYear()}-${String(aujourdhui.getMonth() + 1).padStart(2, '0')}-${String(aujourdhui.getDate()).padStart(2, '0')}`;
  const cyclePerime = cycle.period_end < dateDuJour;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Hors du ScrollView : la bande ne défile pas (cf. bande-haute.tsx). */}
        <BandeHaute />

        {/* Rendue par-dessus le plan plutôt que dans le flux : elle arrive après un geste
            (« C'est noté ») et doit se lire comme un moment, pas comme un encart de plus. */}
        {feuilleOuverte && rappels && boucle && (
          <FeuilleRappels
            prefs={rappels}
            boucle={boucle}
            permission={permission}
            onFerme={fermerLaFeuille}
          />
        )}

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Sans cette ligne, une question ouverte depuis et un engagement pris ailleurs
              manqueraient à l'écran sans que rien ne le dise. */}
          {banniereRelecture()}
          {/* Un fait, pas une félicitation : ni mascotte (elle ne commente pas l'état du
              compte), ni exclamation, ni action à faire. */}
          {rattachement !== null && (
            <ThemedView type="backgroundSelected" style={styles.rattachement}>
              <ThemedText type="small" themeColor="accentText">
                {rattachement
                  ? `Ton compte est rattaché à ${rattachement}. Ton bilan te suit d’un appareil à l’autre.`
                  : 'Ton compte est rattaché. Ton bilan te suit d’un appareil à l’autre.'}
              </ThemedText>
            </ThemedView>
          )}
          {/* **Ce que le re-bilan a emporté, dit une fois** (C2.2, `v1-14` §5). Avant, le
              `delete from plan_actions` de la génération effaçait l'engagement, ses jours et son
              intention sans un mot — le geste le plus engageant du produit annulé par le second
              geste le plus encouragé. Il est maintenant archivé, et cet encart est l'endroit où la
              personne l'apprend.

              Discret, et sans mascotte : c'est un fait sur ses données, pas un commentaire. Le
              bouton écrit la marque locale, qui porte l'identifiant de la ligne — un second
              re-bilan pourra donc le dire à son tour. */}
          {orphelin !== null && (
            <ThemedView type="backgroundElement" style={styles.orphelin}>
              <ThemedText type="small" themeColor="textSecondary">
                Ton plan a changé avec ton nouveau bilan. « {orphelin.action_text} » n’y est plus ;
                elle reste dans ton suivi.
              </ThemedText>
              <TextLink
                label="Compris"
                onPress={() => {
                  void marquerEngagementOrphelinVu(orphelin.id);
                  setOrphelin(null);
                }}
              />
            </ThemedView>
          )}

          {/* **Une période terminée se dit, elle ne se masque pas** (C2.2). Retomber sur l'écran
              d'attente ferait disparaître l'action engagée et les jours choisis — ce qui a eu lieu
              n'a pas à s'effacer parce que le cron n'est pas encore passé. */}
          {cyclePerime && (
            <ThemedView type="backgroundElement" style={styles.orphelin}>
              <ThemedText type="small" themeColor="textSecondary">
                Cette période est terminée. Ton prochain plan arrive ; en attendant, voici où tu en
                étais.
              </ThemedText>
            </ThemedView>
          )}

          <View style={styles.intro}>
            <ThemedText type="screenTitle">
              Ton plan
            </ThemedText>
            {/* **Quand il n'y a rien à alléger, on n'écrit rien ici** (C2.6) : la carte de
                félicitation juste en dessous le dit déjà, et « Rien à alléger sur … » sonnait
                comme un constat d'échec posé sous le titre de l'écran.

                Le poste est nommé par sa forme insérable et non par `trip_label`, qui porte le
                mode entre parenthèses — « Une action liée à Trajet domicile-travail (Voiture
                thermique). » était une phrase que personne n'a écrite. */}
            {actionsCount > 0 && (
              <ThemedText type="body" themeColor="textSecondary">
                {actionsCount > 1 ? 'Deux actions' : 'Une action'} pour{' '}
                {formeInserable(cycle.poste)}.
              </ThemedText>
            )}
            <ThemedView type="backgroundElement" style={styles.cadenceChip}>
              <ThemedText type="small" weight={600}>
                Cadence : {cycle.period_label}
              </ThemedText>
            </ThemedView>
          </View>

          {/* **Le point de la semaine passe en tête** (v1-11 flux 4) : répondre à un rappel est
              la raison de revenir la plus fréquente, et la question vivait sous les actions,
              après le cap — il fallait faire défiler pour la trouver. Une question qu'on ne
              voit pas est une question à laquelle on ne répond pas. */}
          {checkins.length > 0 && (
            <View style={styles.checkins}>
              {checkins.map((checkin) => (
                <CheckinCard
                  key={checkin.id}
                  checkin={checkin}
                  emphasize={checkin.trip_label === cycle.trip_label}
                />
              ))}
            </View>
          )}

          {/* **Ramille dit l'attente, pas le vide** (v1-12 §6.2). « Rien à rattraper. »
              vivait ici et se lisait comme une attente déçue la première fois qu'on la
              voyait — retour d'appareil du 07/09. Elle nomme maintenant le jour où elle
              revient, ce que le rythme fixe du produit (lundi, premier du mois) lui permet
              de faire sans jamais compter.

              Le détail sous sa phrase est **du produit, pas d'elle** : une adresse peut
              porter un chiffre, et elle n'en dit jamais.

              Posée **au-dessus** du cap et non à côté : la règle « jamais la mascotte près
              d'un chiffre lourd » vise l'empreinte, mais un cap en kilos juste sous son
              visage donnerait l'impression qu'elle le commente. */}
          {checkins.length === 0 && attente && (
            <ThemedView type="backgroundElement" style={styles.calmeCard}>
              <View style={styles.calmeRow}>
                <Mascot mood="resting" size={40} />
                <View style={styles.calmeTexte}>
                  <ThemedText weight={600}>{RAMILLE[attente.cle]}</ThemedText>
                  {attente.detail && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {attente.detail}
                    </ThemedText>
                  )}
                </View>
              </View>
            </ThemedView>
          )}

          {/* Le cap de la saison (T10). Affiché en kg parce que c'est l'unité des actions
              juste en dessous : la personne doit pouvoir voir d'un coup d'œil qu'en cumulant
              deux actions elle l'atteint — ou ne l'atteint pas, ce qui est une information
              tout aussi utile et jamais présentée comme un échec. */}
          {capKg !== null && (
            <ThemedView type="backgroundSelected" style={styles.capCard}>
              <ThemedText type="small" weight={600} themeColor="accentText">
                Ton cap pour cette période
              </ThemedText>
              <ThemedText type="salient">
                − {capKg} kg
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                soit − {Math.round(cycle.target_reduction_pct)} % sur {formeInserable(cycle.poste)}
                {baselineKg !== null ? ` (${formatTonnes(baselineKg)} aujourd’hui)` : ''}
              </ThemedText>
            </ThemedView>
          )}

          {/* L'action engagée passe en tête : c'est la réponse à « qu'est-ce que je fais en ce
              moment ? », elle n'a pas à être cherchée. Le reste garde l'ordre du serveur, qui
              trie déjà par gain décroissant (`estimate_action_savings`). */}
          <View style={styles.actions}>
            {actionsOrdonnees.map((action) => (
              <ActionCard
                key={action.id}
                titre={action.action_templates?.action_text ?? 'Action à préciser.'}
                gainKg={action.saving_kg_year}
                partPercent={action.saving_share_percent}
                detail={action.detail_text}
                intention={formatIntention(action.intention_days, action.intention_timing)}
                engagee={action.committed_at !== null}
                reconduite={action.carried_over_from !== null}
                estompee={committedActionId !== null && committedActionId !== action.id}
              >
                {/* Étape 6b : choisir une action et y attacher une intention. Une seule à la
                    fois par cycle — s'engager sur les deux revient à ne s'engager sur aucune,
                    et la base le garantit par un index unique partiel. */}
                <ActionCommitment
                  onEngage={proposerLesRappels}
                  actionId={action.id}
                  poste={action.action_templates?.poste ?? null}
                  committed={action.committed_at !== null}
                  intentionDays={action.intention_days}
                  intentionTiming={action.intention_timing}
                  otherActionCommitted={
                    committedActionId !== null && committedActionId !== action.id
                  }
                  onChanged={() => setRefreshKey((key) => key + 1)}
                />
              </ActionCard>
            ))}
          </View>

          {/* Profil qui n'a plus rien à céder sur son poste dominant. Le pire accueil
              possible serait une liste vide : c'est la personne qui fait déjà le plus
              d'efforts. Même principe que le T8 de l'audit sur la restitution. */}
          {actionsCount === 0 && (
            <ThemedView type="backgroundElement" style={styles.emptyActionsCard}>
              <View style={styles.praiseRow}>
                <Mascot mood="happy" size={36} />
                <ThemedText type="cardTitle" style={styles.praiseText}>
                  Tu fais déjà l’essentiel sur ce poste.
                </ThemedText>
              </View>
              <ThemedText type="body" themeColor="textSecondary">
                Aucun changement de mode ne te ferait gagner assez pour valoir la peine d’être
                proposé. Le check-in reste là si tu veux garder un œil dessus.
              </ThemedText>
            </ThemedView>
          )}

          {/* La provenance du chiffre, à l'endroit où il engage le plus. Le produit vise un
              registre institutionnel : une estimation présentée comme une mesure serait le
              premier endroit où la crédibilité se casse. */}
          {actionsCount > 0 && (
            <ThemedText type="code" themeColor="textTertiary" style={styles.disclaimer}>
              Estimations sur la base des facteurs ADEME et de tes réponses. Un ordre de
              grandeur pour choisir, pas une mesure.
            </ThemedText>
          )}

          {/* La proposition de re-bilan ferme l'écran (v1-11 flux 2). Elle apparaît au plus
              deux fois par an : la faire passer devant la question de la semaine ou devant
              l'action engagée inverserait l'urgence. « Une proposition, jamais un rappel
              insistant » — même règle que sur le suivi, même seuil, même lien. */}
          {bilanAncien && (
            <ThemedView type="backgroundSelected" style={styles.rebilanCard}>
              <ThemedText type="small" weight={600}>
                Une nouvelle saison a commencé
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Ton bilan date d’un moment. Le refaire prend moins de temps que la première
                fois : tes réponses sont préremplies.
              </ThemedText>
              <TextLink
                label="Refaire mon bilan"
                onPress={() => router.push('/bilan')}
                role="link"
                type="small"
                weight={600}
                themeColor="accentText"
              />
            </ThemedView>
          )}

          {/* « Voir mon suivi » a disparu : la barre le porte, et un lien qui double un onglet
              apprend à ne pas se servir de la barre. Le renvoi vers le bilan reste — ce n'est
              pas une destination de la barre, c'est le détail d'une entrée du suivi.
              **Mais il ne vaut pas un bandeau collant** (retour d'appareil du 07/09/2026) :
              il occupait ~68 px en permanence sur l'écran où l'on revient le plus souvent,
              pour un geste que l'onglet Suivi économise à peine — une entrée permanente dans
              la chrome, soit exactement la troisième destination que le modèle à deux onglets
              a refusée. En fin de flux, il ne coûte rien. */}
          <TextLink
            label="Revoir mon bilan"
            onPress={() => router.push({ pathname: '/suivi/bilan', params: { id: assessmentId } })}
            role="link"
            type="small"
            themeColor="textTertiary"
            style={styles.lienBilan}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  // La phrase au-dessus des deux sorties : centrée comme le conteneur, mais elle a besoin de
  // son propre espace sous elle, sinon le bouton la touche.
  attenteTexte: { textAlign: 'center', paddingHorizontal: Spacing.four, marginBottom: Spacing.four },
  attenteBouton: { marginBottom: Spacing.three },
  // Le corps d'un état plein écran, comme les états vides voisins : `MessageInline` rend du
  // « small » par défaut, ce qui se lit comme une note sous un bouton — pas comme la seule
  // phrase de l'écran.
  //
  // 16/24, c'est la taille du `default` de `ThemedText`, pas `TypeScale.body` (15/22) : deux
  // valeurs nues, recopiées à l'identique sur l'onglet voisin (`suivi/index.tsx`). L'endroit
  // où les factoriser est un `type` sur `MessageInline`, qui n'appartient pas à ce chantier —
  // le prochain passage visuel saura quoi faire de ces deux lignes.
  erreurTexte: {
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
    fontSize: 16,
    lineHeight: 24,
  },
  relecture: { gap: Spacing.one },
  // La même ligne au-dessus d'un écran centré : elle a besoin de son propre air sous elle.
  relectureCentree: { alignItems: 'center', marginBottom: Spacing.four },
  // Largeur maximale du contenu, comme les pages légales et les écrans de compte (A5-21).
  // L'app est déployée sur le web, et sans borne la carte du cap comme les cartes d'action
  // s'étirent sur toute la fenêtre : le titre et le gain se retrouvent aux deux extrémités de
  // l'écran, ce qui casse l'appariement visuel que ces cartes existent pour porter.
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  intro: { gap: Spacing.two },
  rattachement: { borderRadius: Radius.field, paddingVertical: 12, paddingHorizontal: Spacing.three },
  // Les deux encarts de C2.2 : le même gabarit discret, parce qu'ils disent la même sorte de
  // chose — un fait sur l'état du plan, jamais une injonction.
  orphelin: {
    borderRadius: Radius.field,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  cadenceChip: { alignSelf: 'flex-start', borderRadius: Radius.chip, paddingVertical: 6, paddingHorizontal: 12, marginTop: 4 },
  capCard: { borderRadius: Radius.card, padding: 20, gap: 6 },
  actions: { gap: Spacing.two + 2 },
  emptyActionsCard: { borderRadius: Radius.card, padding: 20, gap: 8 },
  praiseRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  praiseText: { flex: 1, minWidth: 0 },
  disclaimer: { lineHeight: 18 },
  checkins: { gap: Spacing.two + 2 },
  calmeCard: { borderRadius: Radius.card, padding: 20 },
  rebilanCard: { borderRadius: Radius.card, padding: 20, gap: Spacing.two },
  calmeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  calmeTexte: { flex: 1, minWidth: 0, gap: 2 },
  lienBilan: { textAlign: 'center' },
  emptySafeArea: { flex: 1, padding: Spacing.four, justifyContent: 'center', gap: Spacing.three },
  // La mascotte prend la place de l'illustration d'état vide : centrée comme elle l'était.
  rappelMascotte: { alignItems: 'center' },
  emptyIllustration: { height: 140 },
  emptyBody: { fontSize: 16, lineHeight: 24 },
  emptyButton: { marginTop: 12 },
});
