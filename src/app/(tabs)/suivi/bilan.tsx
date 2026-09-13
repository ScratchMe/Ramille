import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BandeHaute } from '@/components/bande-haute';
import { Button } from '@/components/button';
import { MessageInline } from '@/components/message-inline';
import { RamilleDit } from '@/components/ramille-dit';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTrackView } from '@/hooks/use-track-view';
import {
  POSTE_LABEL,
  bilanSansEmissions,
  comparisonNote,
  dominantHeadline,
  modeResultat,
  montreMoyenneFrancaise,
  NOTE_MOBILITE_CONTRAINTE,
  palierNote,
  partDuTotal,
  pourcentageDominant,
  urlDePartage,
} from '@/types/resultat';
import { BarreContour } from '@/components/suivi/barre-contour';
import { formatDate, variationDepuisLeBilanPrecedent } from '@/types/suivi';
import { MOIS_FRANCAIS } from '@/types/checkin';
import {
  loadBilanPrecedent,
  loadCycleCouvrant,
  type BilanPrecedent,
} from '@/lib/bilan-history';
import { track } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { APP_URL } from '@/lib/app-url';
import {
  CARBON_SOURCE_LABEL,
  FRANCE_AVERAGE_TRANSPORT_T,
  TARGET_2050_TRANSPORT_T,
  formatTonnesShort,
} from '@/constants/carbon-reference';
import { formatTonnes } from '@/lib/format';
import { nextPalier, palierEstDerriere, showsTarget2050 } from '@/types/palier';
import { hasSeenConnexionProposal } from '@/lib/connexion-prefs';
import { etatDeLaProposition, type EtatProposition } from '@/types/connexion';
import type { Database } from '@/lib/database.types';
import { RAMILLE } from '@/constants/mascotte';
import { APP_NAME } from '@/constants/produit';

type AssessmentResults = Database['public']['Tables']['assessment_results']['Row'];

// **Toute la voix de cet écran vit désormais dans `src/types/resultat.ts`** — prépositions de
// mode, sujets de poste, titre du poste dominant, phrase de comparaison, phrase du palier,
// adresse de partage. Elles étaient ici, donc dans un fichier qui importe `@/lib/supabase`,
// donc hors de portée des tests : quatre défauts y avaient coexisté (A3-6, A3-9, A3-10, A3-14),
// chacun à une assertion près. Ne rien redéclarer ici.
//
// Seul reste ce qui est propre au rendu : quelle colonne de `assessment_results` alimente
// quelle barre. Le libellé, lui, vient de `POSTE_LABEL` — il est aussi celui de la liste du
// suivi et celui de la carte de partage.
const POSTE_BREAKDOWN: {
  key: 'commute' | 'leisure' | 'travel';
  co2Key: 'commute_co2_kg_year' | 'leisure_co2_kg_year' | 'travel_co2_kg_year';
}[] = [
  { key: 'commute', co2Key: 'commute_co2_kg_year' },
  { key: 'leisure', co2Key: 'leisure_co2_kg_year' },
  { key: 'travel', co2Key: 'travel_co2_kg_year' },
];

type LoadState =
  | { status: 'loading' }
  // **L'état d'erreur ne porte plus de message.** Il en portait un, alimenté par
  // `error?.message` : du texte de PostgREST, en anglais, affiché seul au milieu d'un écran sans
  // sortie, au moment précis où la personne vient chercher son résultat. Et une erreur Postgres
  // cite volontiers la valeur qui l'a déclenchée — c'est-à-dire une de ses réponses. L'écran dit
  // donc une phrase fixe et propose deux sorties ; la cause technique reste dans la console, où
  // elle est utile à qui peut la lire (C1.1, A2-15, A3-5).
  | { status: 'error' }
  // `capKg` vient du cycle de plan, généré par `compute_assessment_results` au moment de la
  // soumission : il existe donc déjà quand cet écran s'affiche. `null` si le plan n'a rien
  // trouvé à proposer — ou si l'on relit un ancien bilan, auquel cas le cap du cycle courant ne
  // lui appartient pas (cf. le chargement). On ne montre alors pas de palier.
  //
  // `submittedAt` est la date de **soumission** du bilan, pas le `computed_at` du résultat :
  // c'est celle que la liste du suivi affiche, et un recalcul côté serveur ferait diverger les
  // deux écrans (A3-15).
  | {
      status: 'ok';
      results: AssessmentResults;
      capKg: number | null;
      submittedAt: string | null;
      /**
       * Le bilan précédent, quand la restitution sort du questionnaire (C2.7, point 2).
       *
       * **C'est la question à laquelle cet écran ne répondait pas.** Une restitution de re-bilan
       * était identique à celle du premier : le seul écran atteint en sortant du questionnaire ne
       * disait pas « est-ce que ça a bougé ? », alors que c'est la raison même d'un re-bilan.
       *
       * `null` couvre trois situations qu'il n'y a pas lieu de distinguer à l'écran : premier bilan,
       * relecture d'un ancien, ou lecture qui n'a pas abouti. Dans les trois cas la barre et la
       * phrase ne s'affichent pas — la restitution reste entière sans elles.
       */
      precedent: BilanPrecedent | null;
      /**
       * Le palier visé au bilan précédent est-il derrière ? Faux tant qu'on ne peut pas le prouver
       * — notamment quand les deux bilans tombent dans la même période, le cycle ayant alors été
       * réécrit et l'ancien cap perdu (cf. `palierEstDerriere`).
       */
      palierFranchi: boolean;
    };

// Ce que le partage a donné, quand il y a quelque chose à en dire. Le chemin système ne dit
// jamais rien — la feuille du téléphone ou du navigateur a déjà tout montré ; seul le repli
// presse-papier a besoin d'une confirmation sur place, sans quoi appuyer ne produit rien de
// visible.
//
// **Trois issues et non deux, et la troisième n'est pas un raffinement.** Un presse-papier
// absent de la page (contexte non sécurisé, navigateur ancien) et un `writeText` refusé
// donnaient le même « Réessaie dans un instant » : dans le premier cas, réessayer ne peut pas
// marcher — l'API n'apparaîtra jamais — et comme le lien n'est montré nulle part, la personne
// n'avait plus aucun moyen de partager son bilan. L'écran dit donc ce qui est vrai et donne le
// lien à copier à la main ; « réessaie » ne reste que là où c'est vrai.
type EtatPartage =
  | { statut: 'inactif' }
  | { statut: 'copie' }
  | { statut: 'echec' }
  | { statut: 'indisponible'; lien: string };

// Le partage système est absent de Firefox partout et de Chrome desktop hors Windows/ChromeOS :
// `Share.share` y rejette avec « Share is not supported in this browser ». On le constate
// **avant** d'appeler le partage plutôt que sur son rejet, parce que la copie qui suit a besoin
// du geste de l'utilisateur : repartir d'un rejet la fait sortir de la fenêtre d'activation que
// le navigateur accorde à ce geste.
function partageSystemeDisponible(): boolean {
  if (Platform.OS !== 'web') return true;
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

// Le résultat distingue « cette page n'a pas de presse-papier » de « l'écriture a été
// refusée » : les deux se disent autrement à l'écran (cf. `EtatPartage`). `navigator.clipboard`
// est absent hors contexte sécurisé — un déterminisme, pas un aléa.
async function copierDansLePressePapier(
  lien: string
): Promise<'copie' | 'echec' | 'indisponible'> {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.clipboard) {
    return 'indisponible';
  }
  try {
    await navigator.clipboard.writeText(lien);
    return 'copie';
  } catch {
    // Permission refusée, geste hors fenêtre d'activation : celui-là peut aboutir au coup
    // suivant, donc c'est le seul cas où l'écran invite à réessayer.
    return 'echec';
  }
}

// Anonyme et pas encore proposé un compte : au clic sur le CTA, on passe d'abord par la
// proposition plein écran (cf. maquette "Connexion — proposition après bilan", qui
// apparaît explicitement *après* avoir vu ce résultat). Anonyme et déjà décliné une fois :
// bandeau discret ("Bilan anonyme — relance douce") plutôt que de réinterrompre à chaque
// retour, le CTA va alors directement au plan.
export default function BilanResultat() {
  const theme = useTheme();
  // Deux entrées, un seul écran (cf. `src/types/resultat.ts`) : la fin du questionnaire pose
  // `nouveau=1`, une ouverture depuis le suivi ne pose rien.
  const { id, nouveau } = useLocalSearchParams<{ id: string; nouveau?: string }>();
  const mode = modeResultat(nouveau);

  // **Après le mode, et pas avant.** L'écran le connaissait déjà et l'événement partait sans :
  // l'entonnoir « bilan soumis → résultat vu → plan vu » additionnait donc les premières lectures
  // et les consultations d'historique, si bien que plus le suivi dans la durée fonctionne, plus
  // la conversion vers le plan paraît chuter. `useTrackView` fige ses props au premier rendu,
  // donc un seul déplacement suffit — et il reste le bon hook ici : cet écran est poussé sur une
  // pile à chaque ouverture, le passer à `useTrackFocus` recompterait un retour de pile.
  useTrackView('resultat_view', { mode });

  const [state, setState] = useState<LoadState>(
    id ? { status: 'loading' } : { status: 'error' }
  );
  // **Le compteur est ce qui rend « Réessayer » autre chose qu'un bouton mort.** Repasser l'état à
  // `loading` ne relance rien : l'effet de chargement ne dépend que de `id`, qui n'a pas changé.
  // L'écran basculait alors sur la branche « Calcul de ton bilan… », sans bouton ni lien, pour
  // toujours — en échange de la seule sortie qu'il avait. Même mécanique que `refreshKey` dans
  // `src/app/(tabs)/plan.tsx`.
  const [tentative, setTentative] = useState(0);
  const reessayer = () => {
    // **Sans `id`, il n'y a rien à relire**, et repasser en `loading` enfermerait sur « Chargement
    // de ton bilan… » — sans bouton ni lien, pour toujours : l'effet sort aussitôt sur `!id`, donc
    // rien ne ferait jamais repartir l'écran. C'est atteignable par une URL tapée, un favori
    // tronqué, ou l'ancienne adresse `/bilan/resultat` sans paramètre, que la redirection propage
    // telle quelle. L'écran d'erreur garde ainsi ses deux sorties.
    if (!id) return;
    setState({ status: 'loading' });
    setTentative((n) => n + 1);
  };
  // **Un état à quatre valeurs, pas un booléen optimiste** (A3-20). `proposalSeen` démarrait à
  // `true` et n'était corrigé qu'après un aller-retour réseau (`getUser()`) suivi d'une lecture
  // AsyncStorage : quelqu'un qui appuie vite sur le bouton, ou dont le réseau traîne, passait
  // droit au plan — et comme la même variable pilotait la bannière de repli, il ne voyait ni
  // l'interstitiel **ni** la bannière, c'est-à-dire plus aucune occasion de garder son bilan.
  // `getSession()` suffit et supprime l'aller-retour : c'est le cache local, et la seule chose
  // qu'on lui demande est `is_anonymous` (cf. `src/lib/analytics.ts`, même lecture).
  const [propositionLue, setPropositionLue] = useState<EtatProposition>('inconnu');
  // La relecture n'est pas un état à tenir à jour, c'est une propriété de l'entrée dans l'écran :
  // elle se dérive du rendu, là où l'écrire depuis l'effet serait un `setState` synchrone que le
  // React Compiler refuse (`react-hooks/set-state-in-effect`).
  const proposition: EtatProposition = mode === 'relecture' ? 'autre' : propositionLue;
  const [partage, setPartage] = useState<EtatPartage>({ statut: 'inactif' });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('assessment_results')
        .select('*')
        .eq('assessment_id', id)
        .single();

      if (cancelled) return;
      if (error || !data) {
        console.error('Le résultat du bilan n’a pas pu être lu :', error);
        setState({ status: 'error' });
        return;
      }

      // **Pas de palier en relecture** (A3-3, A13-14). Le cap appartient au cycle de plan
      // **courant** : le retrancher d'un bilan de l'an dernier donne une marche qui n'est pas la
      // sienne, et la phrase qui l'accompagne promet « le plan qui suit » alors que rien ne suit
      // — l'écran n'offre alors que « Revenir à mon suivi ». On ne lit donc pas le cycle, et on
      // lit la date à la place : c'est elle qui manque à un bilan relu (A3-15).
      if (mode === 'relecture') {
        // La date de **soumission**, jamais le `computed_at` du résultat : une reprise de calcul
        // en masse (correction de facteur) déplacerait le second, et cet écran daterait alors le
        // bilan autrement que la liste du suivi, d'où il est ouvert.
        //
        // Une lecture à part, dont l'échec est toléré — comme celle du cycle ci-dessous. La date
        // est une précision, le résultat est l'écran : une requête de plus ne doit pas pouvoir
        // transformer un bilan lisible en « Ton bilan n'a pas pu être affiché », **ni retarder
        // son affichage**. D'où l'écran rendu d'abord, la date posée ensuite : sur une connexion
        // qui traîne, attendre la seconde requête laissait « Chargement de ton bilan… » alors que
        // le résultat était déjà en main, et c'est le chemin le plus fréquent de cet écran.
        // **Pas de comparaison en relecture**, pour la même raison qu'il n'y a pas de palier : la
        // barre « ton bilan précédent » répond à « est-ce que ça a bougé depuis ? », question qui
        // n'a pas de sens quand on ouvre un bilan de l'an dernier depuis la liste du suivi — c'est
        // le suivi lui-même qui montre l'évolution.
        setState({
          status: 'ok',
          results: data,
          capKg: null,
          submittedAt: null,
          precedent: null,
          palierFranchi: false,
        });

        const { data: bilan, error: erreurDate } = await supabase
          .from('assessments')
          .select('submitted_at')
          .eq('id', id)
          .maybeSingle();

        if (cancelled) return;
        // Tracé comme les deux autres lectures : sans ça, une date refusée par la RLS serait
        // indistinguable d'un bilan sans `submitted_at`.
        if (erreurDate) console.error('La date du bilan n’a pas pu être lue :', erreurDate);
        setState((precedent) =>
          precedent.status === 'ok' ? { ...precedent, submittedAt: bilan?.submitted_at ?? null } : precedent,
        );
        return;
      }

      // Le cap de la saison en cours. Le palier n'est pas un nouveau chiffre : c'est celui que
      // `/plan` affiche déjà, figé à la génération du cycle. Son absence n'est pas une erreur —
      // l'écran se contente alors de ne pas proposer de marche.
      const { data: cycle } = await supabase
        .from('plan_cycles')
        // `id` depuis C2.7 : il sert à savoir si le cycle qui couvrait le bilan précédent est
        // **celui-ci**, auquel cas son cap a été réécrit à la soumission et le palier alors visé
        // n'est plus connaissable (cf. `palierEstDerriere`).
        .select('id, baseline_co2_kg_year, target_reduction_pct')
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      const capKg =
        cycle?.baseline_co2_kg_year != null
          ? (cycle.baseline_co2_kg_year * cycle.target_reduction_pct) / 100
          : null;

      // La date ne sert qu'en relecture : après le questionnaire, c'est aujourd'hui.
      setState({
        status: 'ok',
        results: data,
        capKg,
        submittedAt: null,
        precedent: null,
        palierFranchi: false,
      });

      // **La comparaison arrive en second temps, et l'écran ne l'attend pas** (C2.7, point 2). Même
      // raison que la date en relecture : c'est le chemin le plus fréquent de cet écran, et sur une
      // connexion qui traîne, attendre deux requêtes de plus laisserait « Chargement de ton bilan… »
      // alors que le résultat est déjà en main. Les deux lectures sont tolérantes à l'échec — la
      // restitution reste entière sans la barre du bilan précédent.
      const lecture = await loadBilanPrecedent(data.assessment_id);
      if (cancelled || !lecture.ok || lecture.data === null) return;
      const precedent = lecture.data;

      // Le cycle qui couvrait le bilan précédent, pour savoir quel palier était visé alors. S'il
      // s'agit du cycle courant, la soumission d'aujourd'hui l'a réécrit : le cap affiché à l'époque
      // n'existe plus, et on ne prétend pas le connaître.
      const cycleAlors = await loadCycleCouvrant(precedent.submittedAt.slice(0, 10));
      if (cancelled) return;
      const capAlorsKg =
        cycleAlors && cycle && cycleAlors.cycleId !== cycle.id ? cycleAlors.capKg : null;

      setState((etat) =>
        etat.status === 'ok'
          ? {
              ...etat,
              precedent,
              palierFranchi: palierEstDerriere({
                precedentKg: precedent.totalKg,
                courantKg: data.total_co2_kg_year,
                capAlorsKg,
                target2050Kg: TARGET_2050_TRANSPORT_T * 1000,
              }),
            }
          : etat
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [id, mode, tentative]);

  useEffect(() => {
    // En relecture, aucune proposition de compte : redemander à chaque consultation de son
    // historique serait du harcèlement, pas une invitation. Rien à écrire, la dérivation du
    // rendu s'en charge.
    //
    // **Après le bilan, pas avant.** Le bouton n'est rendu qu'à `ok`, donc rien n'est gagné à
    // lire plus tôt — et surtout, un bilan lu veut dire une session lisible (la ligne est
    // protégée par une policy owner-scoped) : lancée au montage, la lecture pouvait tomber sur
    // une session pas encore écrite et laisser `inconnu` collé, donc le bouton désactivé.
    if (mode === 'relecture' || state.status !== 'ok') return;
    let annule = false;
    (async () => {
      // **Le repli n'enferme pas.** `inconnu` désactive le bouton, et cet effet ne dépend que de
      // `[mode, state.status]` : rien ne le relance. Une lecture qui lève, ou une session que le
      // cache ne rend pas, laissait donc « Voir ce que je peux faire » désactivé **pour de bon**,
      // sans un mot — la seule sortie de l'écran fermée, ce qui est plus grave que le booléen
      // optimiste d'A3-20 qu'on corrige ici. `anonyme-jamais-proposee` est le repli sûr : il passe
      // par l'interstitiel, qui porte lui-même « Continuer sans compte » et mène au plan.
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (annule) return;
        if (!session) {
          setPropositionLue('anonyme-jamais-proposee');
          return;
        }
        const estAnonyme = session.user.is_anonymous === true;
        const dejaProposee = estAnonyme ? await hasSeenConnexionProposal() : false;
        if (annule) return;
        setPropositionLue(etatDeLaProposition({ estAnonyme, dejaProposee }));
      } catch (erreur) {
        console.error('L’état de la proposition de compte n’a pas pu être lu :', erreur);
        if (!annule) setPropositionLue('anonyme-jamais-proposee');
      }
    })();
    return () => {
      annule = true;
    };
  }, [mode, state.status]);

  const goToPlan = () => {
    // `inconnu` n'arrive pas ici — le bouton est désactivé tant qu'on ne sait pas —, et le test
    // reste : sans lui, la première valeur lue déciderait du routage par défaut.
    if (proposition === 'inconnu') return;
    if (proposition === 'anonyme-jamais-proposee') {
      router.push({ pathname: '/connexion', params: { id, source: 'resultat_transition' } });
      return;
    }
    router.push('/plan');
  };

  // Boucle de croissance (décision produit du 04/09/2026) : un lien vers /api/partage
  // (Vercel Edge Function, hors export statique Expo — cf. son commentaire d'en-tête) plutôt
  // qu'un lien direct vers /bilan/resultat, pour que l'aperçu affiché par les apps de
  // messagerie (WhatsApp, iMessage…) montre une vraie image de résultat, pas une page vide.
  // Chiffres transmis uniquement via l'URL (ce que l'utilisateur voit déjà à l'écran) —
  // aucune nouvelle lecture serveur, aucune exposition de données au-delà de ce qu'il choisit
  // explicitement de partager.
  //
  // **Deux défauts corrigés ici, et le second était invisible à cause du premier.** Le rejet de
  // `Share.share` était avalé dans un `.catch(() => {})` : sur les navigateurs sans partage
  // système, appuyer ne faisait rien, sans un mot ni un lien à copier. Et `resultat_share` partait
  // **avant** l'appel, donc la mesure du seul levier de croissance du produit comptait aussi bien
  // ces partages impossibles que les feuilles refermées sans rien envoyer — le cas majoritaire,
  // puisque la V1 vise Google Play. L'événement ne part plus que sur une issue aboutie.
  const partagerLeBilan = async () => {
    if (state.status !== 'ok') return;
    setPartage({ statut: 'inactif' });

    // L'adresse se construit dans `urlDePartage` (module pur, testé) : la part du poste
    // dominant y passe par le même garde-fou que l'affichage, qui manquait ici — un bilan à
    // zéro envoyait « NaN » dans l'URL (A3-12).
    const { results } = state;
    const shareUrl = urlDePartage(results, APP_URL);
    const message = `Mon empreinte transport : ${formatTonnes(results.total_co2_kg_year)} par an. Fais la tienne sur ${APP_NAME} : ${shareUrl}`;

    if (partageSystemeDisponible()) {
      try {
        // `Share.share` rend un `ShareAction` sur natif et **rien du tout** sur web, où
        // `navigator.share` résout sans valeur : le type doit accepter les deux, sinon la
        // lecture de `action` lève sur le chemin web.
        const issue: { action?: string } | undefined = await Share.share({ message, url: shareUrl });
        // Une feuille refermée rend `dismissedAction` : rien n'a été envoyé, rien n'est compté.
        // Sur web, une promesse tenue ne peut venir que d'un partage abouti — `navigator.share`
        // rejette en `AbortError` quand on renonce.
        //
        // **Plafond d'Android, et il ne se contourne pas** : la plateforme résout *toujours* en
        // `sharedAction`, annulation comprise (doc de `Share.share`). Sur la cible de la V1, ce
        // chiffre se lit donc « partages ouverts », pas « partages envoyés ». Rien à corriger
        // ici : l'information n'existe pas côté système.
        if (issue?.action !== 'dismissedAction') track('resultat_share');
      } catch {
        // Geste interrompu (`AbortError`) ou partage refusé par le navigateur : rien à compter,
        // et rien à dire non plus — c'est la personne qui a renoncé.
      }
      return;
    }

    // Repli : l'adresse dans le presse-papier, et on le dit sur place. Pas d'`Alert` (proscrit,
    // cf. CLAUDE.md), et surtout pas de silence. Le lien est gardé dans l'état quand le
    // presse-papier n'existe pas : c'est la seule façon de partager qui reste à la personne.
    const issue = await copierDansLePressePapier(shareUrl);
    if (issue === 'copie') track('resultat_share');
    setPartage(
      issue === 'indisponible' ? { statut: 'indisponible', lien: shareUrl } : { statut: issue }
    );
  };

  if (state.status === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          {/* « Calcul de ton bilan… » était faux dans les deux entrées de l'écran : le calcul a
              lieu côté serveur à la soumission, et `assessment_results` fige le résultat — cet
              écran ne fait que le relire, y compris juste après le questionnaire (A3-16). */}
          <ThemedText themeColor="textSecondary">Chargement de ton bilan…</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // Deux sorties plutôt qu'un message et rien. « Réessayer » relance la lecture — c'est le bon
  // conseil, la cause la plus fréquente étant une coupure réseau ; le suivi est la sortie qui
  // marche dans tous les cas, et l'écran y est poussé depuis lui.
  //
  // La mascotte n'apparaît pas ici : elle n'est pas là pour accompagner une panne, et ce serait
  // commenter. Le texte dit ce qui s'est passé et ce qu'on peut faire.
  if (state.status === 'error') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedText themeColor="textSecondary" style={styles.erreurTexte}>
            Ton bilan n’a pas pu être affiché. Il n’est pas perdu, réessaie dans un instant.
          </ThemedText>
          <Button title="Réessayer" onPress={reessayer} style={styles.erreurBouton} />
          <TextLink label="Revenir à mon suivi" onPress={() => router.replace('/suivi')} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const { results, capKg, submittedAt, precedent, palierFranchi } = state;
  const totalT = results.total_co2_kg_year / 1000;

  // Le palier remplace la barre « Repère 2050 » : mettre 15,8 t à côté de 0,6 t affichait un
  // rapport de 1 à 26 qu'aucune formulation ne rattrape. 2050 reste, en mots, sous les barres.
  // En relecture, `capKg` est nul par construction (cf. le chargement) : rien à proposer, le
  // cap n'appartient pas au bilan qu'on relit.
  const palier = nextPalier(results.total_co2_kg_year, capKg, TARGET_2050_TRANSPORT_T * 1000);
  // Le repère 2050 revient dès qu'on passe sous la moyenne : au-dessus il est un gouffre, en
  // dessous un horizon crédible. Cf. `showsTarget2050`.
  const montreRepere2050 = showsTarget2050(results.total_co2_kg_year, FRANCE_AVERAGE_TRANSPORT_T * 1000);

  // Un total nul est atteignable, mais plus rarement que ce commentaire ne l'a longtemps dit :
  // depuis le passage aux facteurs ACV, `marche` est le **seul** mode à facteur nul — le vélo
  // ne l'est plus, fabrication comprise (un test pgTAP l'épingle). Il faut donc un profil
  // marche uniquement, zéro loisir et zéro voyage. C'est le profil que le produit félicite, et
  // il tombait jusqu'ici sur un « NaN % » : toutes les parts se divisent par le total.
  // Cf. v1-07 T8, A3-14.
  const hasEmissions = !bilanSansEmissions(results);
  const shareOfTotal = (kg: number) => partDuTotal(kg, results.total_co2_kg_year);
  const dominantPercent = pourcentageDominant(results);

  // **La moyenne française n'est pas montrée à qui n'a pas le choix** (C3.1).
  // `assessment_results.mobility_constrained` était calculée et lue par aucun écran : la barre
  // s'affichait donc à quelqu'un qui vient de déclarer n'avoir aucun transport en commun, et une
  // moyenne dont il ne peut pas s'approcher est un score avec un mauvais côté, pas un repère.
  // **Rien d'autre n'est masqué** : le repère 2050, le palier et la répartition par poste restent.
  const montreMoyenne = montreMoyenneFrancaise(results);

  // **L'échelle inclut le bilan précédent depuis C2.7**, sans quoi sa barre dépasserait la carte
  // exactement dans le cas le plus fréquent d'un re-bilan réussi : le précédent est plus lourd que
  // l'actuel, et c'est bien ce qu'on vient montrer. Et elle **exclut** la moyenne quand sa barre ne
  // se rend pas (C3.1) : sinon toutes les barres restantes seraient raccourcies par un repère absent
  // de l'écran.
  const precedentT = precedent ? precedent.totalKg / 1000 : 0;
  const domain =
    Math.max(totalT, precedentT, montreMoyenne ? FRANCE_AVERAGE_TRANSPORT_T : 0) / 0.85;
  const barPercent = (value: number) => Math.max((value / domain) * 100, 3);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Même bande que les deux onglets : elle ne défile pas, et c'est là que viendra le
            bouton retour dont iOS aura besoin sur cet écran de détail. */}
        <BandeHaute />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {proposition === 'anonyme-deja-proposee' && (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/connexion', params: { id, source: 'resultat_cta' } })
              }
              // La bannière porte deux textes mais un seul geste : sans libellé explicite, un
              // lecteur d'écran les annoncerait l'un après l'autre sans dire qu'il s'agit d'une
              // seule cible. Le libellé les recompose en une phrase.
              accessibilityRole="link"
              accessibilityLabel="Ce bilan n’est enregistré que sur cet appareil. Le garder en créant un compte."
              style={[styles.banner, { backgroundColor: theme.backgroundElement }]}
            >
              <ThemedText type="small" themeColor="textSecondary" style={styles.bannerText}>
                Ce bilan n&apos;est enregistré que sur cet appareil.
              </ThemedText>
              <ThemedText type="small" weight={600} themeColor="accentText">
                Le garder
              </ThemedText>
            </Pressable>
          )}

          <View style={styles.enTete}>
            <ThemedText type="small" themeColor="textTertiary">
              Ton bilan transport
            </ThemedText>
            {/* **La date, en relecture seulement** (A3-15). Rien ne distinguait à l'écran un
                bilan d'aujourd'hui d'un bilan d'il y a un an : mêmes cartes, mêmes barres, même
                « Estimation annuelle » — sur le seul écran du produit qui matérialise le passé.
                Après le questionnaire elle n'apprendrait rien, c'est aujourd'hui. */}
            {mode === 'relecture' && submittedAt && (
              <ThemedText type="small" themeColor="textTertiary">
                Bilan du {formatDate(submittedAt)}
              </ThemedText>
            )}
          </View>

          <ThemedView type="backgroundSelected" style={styles.dominantCard}>
            {hasEmissions ? (
              <>
                <ThemedText weight={600} themeColor="accentText" style={styles.dominantLabel}>
                  Le déplacement qui pèse le plus
                </ThemedText>
                <ThemedText type="subtitle" weight={600} style={styles.dominantHeadline}>
                  {dominantHeadline(results)}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.dominantBody}>
                  {`${formatTonnes(results.dominant_poste_co2_kg_year)} par an, soit ${dominantPercent} % de ton empreinte transport.`}
                </ThemedText>
              </>
            ) : (
              // **Profil sans émission : tout le haut de carte change** (A3-14). Le SQL force
              // `dominant_poste = 'commute'` par défaut quand le total est nul, si bien que le
              // seul écran de félicitation du produit s'ouvrait sur « Le déplacement qui pèse le
              // plus / Ton trajet domicile-travail » — une désignation de coupable qui n'existe
              // pas, contredite deux lignes plus bas par la mascotte. Intitulé neutre, et plus
              // de `dominantHeadline` du tout.
              //
              // La phrase est à elle (A3-13) : elle vivait ici, à la deuxième personne, donc
              // hors du test qui garde sa voix. Aucun chiffre n'est affiché dans cette branche,
              // donc la mascotte n'est jamais à côté d'un chiffre lourd.
              <>
                <ThemedText weight={600} themeColor="accentText" style={styles.dominantLabel}>
                  Ton bilan
                </ThemedText>
                <RamilleDit ligne={RAMILLE.bilanQuasiNul} mood="happy" size={36} />
              </>
            )}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.compareCard}>
            <ThemedText weight={600} type="small">
              Répartition par poste
            </ThemedText>
            <View style={styles.bars}>
              {POSTE_BREAKDOWN.map((poste) => {
                // **Pas de poste mis en avant quand il n'y a rien à peser** (A3-14) : le SQL
                // désigne `commute` par défaut sur un total nul, et la répartition mettait donc
                // en gras et en accent un poste à « 0 kg CO₂e », juste sous une carte qui vient
                // de dire qu'il n'y a presque rien à compter.
                const dominant = hasEmissions && poste.key === results.dominant_poste;
                return (
                  <CompareRow
                    key={poste.key}
                    label={POSTE_LABEL[poste.key]}
                    value={formatTonnes(results[poste.co2Key])}
                    percent={Math.max(shareOfTotal(results[poste.co2Key]), 3)}
                    bold={dominant}
                    accentColor={dominant ? theme.accent : theme.accentMuted}
                  />
                );
              })}
            </View>
          </ThemedView>

          <View style={styles.totalBlock}>
            <ThemedText type="small" themeColor="textTertiary">
              Estimation annuelle, tous déplacements
            </ThemedText>
            {/* **Le jeton, pas une recopie** (A3-22). Le chiffre le plus important du produit
                redéclarait 26 / 32 à la main, c'est-à-dire exactement `TypeScale.screen` — le
                jeton des *titres d'écran*. `salient` est celui des chiffres saillants (le cap de
                la saison, l'écart entre deux bilans) : il vaut 30, et la hiérarchie tient
                puisque la décision dominante reste au-dessus, à 32. */}
            <ThemedText type="salient">{formatTonnes(results.total_co2_kg_year)}</ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.compareCard}>
            <ThemedText weight={600} type="small">
              Où tu te situes
            </ThemedText>
            {/* **Deux registres dans la même carte, et c'est délibéré** (A5-3, A10-3). Les deux
                lignes de repère — la moyenne française, le repère 2050 — restent au dixième de
                tonne : c'est l'échelle de comparaison, elle ne descend jamais sous la tonne et
                une unité unique est ce qui rend les barres lisibles entre elles. Les deux lignes
                qui sont **les chiffres de la personne** passent, elles, par `formatTonnes` sous
                la tonne : sans ça, un profil sobre lisait « Toi — 0,0 t » et « Ton prochain
                palier — 0,0 t », deux libellés chiffrés identiques sur deux barres de longueurs
                différentes, trente pixels sous un total qui disait « 40 kg CO₂e ». */}
            <View style={styles.bars}>
              {/* **Le bilan précédent, en contour, au-dessus du sien** (C2.7, point 2, planche E).
                  La restitution d'un re-bilan était identique à celle du premier : le seul écran
                  atteint en sortant du questionnaire ne répondait pas à « est-ce que ça a bougé ? ».

                  En contour et non en barre pleine atténuée : deux pleins se lisent comme deux
                  résultats, et celui d'aujourd'hui doit rester le sien. Le mois nomme la barre — sur
                  deux bilans de la même année, « ton bilan précédent » seul ne situe rien. */}
              {precedent && (
                <CompareRow
                  label={`Ton bilan précédent · ${formatMois(precedent.submittedAt)}`}
                  value={
                    precedentT < 1 ? formatTonnes(precedent.totalKg) : formatTonnesShort(precedentT)
                  }
                  percent={barPercent(precedentT)}
                  contour
                  accentColor={theme.accentMuted}
                />
              )}
              <CompareRow
                // « Toi, aujourd'hui » dès qu'il y a une barre d'avant : « Toi » seul, au-dessus de
                // « ton bilan précédent », laisserait les deux barres se disputer le même sujet.
                label={precedent ? 'Toi, aujourd’hui' : 'Toi'}
                value={totalT < 1 ? formatTonnes(results.total_co2_kg_year) : formatTonnesShort(totalT)}
                percent={barPercent(totalT)}
                bold
                accentColor={theme.accent}
              />
              {/* Le palier vient juste après « Toi », avant la moyenne : la comparaison qui
                  compte est celle entre où l'on est et où l'on va, pas avec le pays. Rendu à
                  la troisième place, la paire se lisait comme deux repères sans rapport, et
                  pour une empreinte élevée les deux barres presque identiques donnaient
                  l'impression que la marche ne servait à rien. */}
              {/* Quand le palier tombe pile sur le repère, la barre porte son vrai nom :
                  l'appeler « ton prochain palier » sous-vendrait ce que c'est — l'objectif
                  final, pas une étape de plus. */}
              {palier && (
                <CompareRow
                  label={palier.isTarget2050 ? 'Repère transport 2050' : 'Ton prochain palier'}
                  value={
                    // Quand le palier **est** le repère 2050, cette ligne est un repère et non un
                    // chiffre de la personne : elle reste en tonnes, comme la ligne homonyme plus
                    // bas, faute de quoi la même valeur s'écrirait de deux façons selon la branche.
                    !palier.isTarget2050 && palier.targetKg < 1000
                      ? formatTonnes(palier.targetKg)
                      : formatTonnesShort(palier.targetKg / 1000)
                  }
                  percent={barPercent(palier.targetKg / 1000)}
                  accentColor={theme.accentText}
                />
              )}
              {montreMoyenne && (
                <CompareRow
                  label="Moyenne en France"
                  value={formatTonnesShort(FRANCE_AVERAGE_TRANSPORT_T)}
                  percent={barPercent(FRANCE_AVERAGE_TRANSPORT_T)}
                  accentColor={theme.accentMuted}
                />
              )}
              {/* Sauf quand le palier EST le repère : il porte déjà son nom juste au-dessus,
                  deux barres de même valeur n'apprendraient rien. */}
              {(montreRepere2050 || !palier) && !palier?.isTarget2050 && (
                <CompareRow
                  label="Repère transport 2050"
                  value={formatTonnesShort(TARGET_2050_TRANSPORT_T)}
                  percent={barPercent(TARGET_2050_TRANSPORT_T)}
                  accentColor={theme.accentMuted}
                />
              )}
            </View>
            {/* **Ce que le re-bilan a changé, en écart absolu** (C2.7, point 2). En kilos ou en
                tonnes et jamais en pourcentage : les barres juste au-dessus sont en tonnes, et
                « 8 % de moins » ne se rattache à rien de ce qu'on y voit.

                La seconde phrase ne s'ajoute que quand elle est **prouvable** : le palier visé se
                recalcule depuis le cap qui était en vigueur à l'époque, et ce cap est perdu quand les
                deux bilans tombent dans la même période (le cycle est réécrit à chaque soumission).
                On ne dit alors rien plutôt que de l'affirmer avec le cap d'aujourd'hui, qui est plus
                petit et rendrait la phrase trop facile. */}
            {precedent && (
              <ThemedText type="small" themeColor="textSecondary">
                {variationDepuisLeBilanPrecedent(precedent, results.total_co2_kg_year)}
                {palierFranchi ? ' Le palier que tu visais est derrière toi.' : ''}
              </ThemedText>
            )}
            {/* **La phrase qui remplace la comparaison** (C3.1). Rendue à part et non à la place de
                `comparisonNote` : celle-ci ne parle qu'en **relecture** (en mode `nouveau` c'est
                `palierNote` qui la remplace), donc la loger dedans seul aurait fait qu'un profil en
                mobilité contrainte ne la voie jamais à la sortie du questionnaire — c'est-à-dire à
                l'endroit précis où la barre vient d'être retirée. `comparisonNote` y renonce aussi de
                son côté, et le garde sur `palier` est ce qui empêche la relecture de la dire **deux
                fois** — une branche par chemin, jamais les deux en même temps. */}
            {!montreMoyenne && palier !== null && (
              <ThemedText type="small" themeColor="textSecondary">
                {NOTE_MOBILITE_CONTRAINTE}
              </ThemedText>
            )}
            {/* En relecture il n'y a jamais de palier, donc c'est toujours `comparisonNote` qui
                parle — et elle ne promet aucun plan. */}
            <ThemedText type="small" themeColor="textSecondary">
              {palier ? palierNote(palier, montreRepere2050) : comparisonNote(results)}
            </ThemedText>
            <ThemedText type="code" themeColor="textTertiary">
              {CARBON_SOURCE_LABEL}
            </ThemedText>
          </ThemedView>
          {/* Actions secondaires dans le flux, et non collées en bas — retour d'appareil du
              07/09/2026. Trois éléments empilés dans un pied fixe occupaient ~170 px sur
              844 : un cinquième de l'écran retiré à la restitution, et une cassure franche
              au milieu du contenu. Ce qui reste collé, c'est le seul pas suivant. */}
          <View style={styles.actionsSecondaires}>
            <TextLink
              label="Partager mon bilan"
              onPress={() => void partagerLeBilan()}
              type="small"
              weight={600}
              themeColor="accentText"
              style={styles.editLink}
            />
            {/* Annoncé par un lecteur d'écran (région vivante de `MessageInline`) : le repli
                presse-papier n'a aucune autre trace à l'écran. Le lien, quand il s'affiche,
                vient juste après cette annonce. */}
            <MessageInline
              message={
                partage.statut === 'copie'
                  ? 'Lien copié. Tu peux le coller où tu veux.'
                  : partage.statut === 'echec'
                    ? 'La copie n’a pas abouti. Réessaie dans un instant.'
                    : partage.statut === 'indisponible'
                      ? 'Ce navigateur ne donne pas accès au presse-papier. Voici ton lien, à copier à la main :'
                      : null
              }
              style={styles.editLink}
            />
            {partage.statut === 'indisponible' && (
              <ThemedText
                type="code"
                themeColor="textSecondary"
                selectable
                style={styles.lienPartage}
              >
                {partage.lien}
              </ThemedText>
            )}
            {/* « Modifier mes réponses » promettait une édition, alors que le questionnaire
                insère toujours un nouveau bilan — et repartait d'écrans vides. Le
                préremplissage (v1-07 T7) rend l'action peu coûteuse ; le libellé dit
                maintenant ce qu'elle fait vraiment. */}
            <TextLink
              label="Refaire mon bilan"
              onPress={() => router.push('/bilan')}
              role="link"
              type="small"
              themeColor="textTertiary"
              style={styles.editLink}
            />
            {/* En relecture on ne pousse vers rien : la personne consulte, elle a déjà son
                plan à un onglet de là — donc rien de collé en bas non plus. */}
            {mode !== 'nouveau' && (
              <TextLink
                label="Revenir à mon suivi"
                // **Une destination, pas un dépilement.** `router.back()` ramenait à l'écran
                // précédent, qui n'est pas toujours le suivi : « Revoir mon bilan » ouvre
                // cette page depuis le plan, et le lien renvoyait donc… au plan (retour
                // d'appareil du 07/09/2026). Un lien qui nomme sa destination doit y aller.
                onPress={() => router.replace('/suivi')}
                role="link"
                type="small"
                weight={600}
                themeColor="accentText"
                style={styles.editLink}
              />
            )}
          </View>
        </ScrollView>

        {mode === 'nouveau' && (
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            {/* Désactivé tant que la session n'est pas lue : appuyer avant que la proposition
                de compte soit connue faisait sauter l'interstitiel comme la bannière (A3-20). */}
            <Button
              title="Voir ce que je peux faire"
              onPress={goToPlan}
              disabled={proposition === 'inconnu'}
              // Le pied est hors du `ScrollView`, donc la largeur maximale du contenu ne
              // l'atteint pas : sans ça, le bouton s'étirerait sur toute la fenêtre pendant que
              // les barres au-dessus sont bornées à 800 px (A5-21). Le filet, lui, reste pleine
              // largeur : c'est la séparation du pied, pas une limite de contenu.
              style={styles.footerBouton}
            />
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

/**
 * `contour` rend la barre en `BarreContour` au lieu d'une barre pleine (C2.7).
 *
 * Une prop ici plutôt qu'un second composant : c'est l'**en-tête** qui doit rester identique entre
 * les lignes — même taille, même couleur, même alignement — et deux composants divergeraient sur ce
 * point au premier ajustement. Seul le corps de la barre change.
 */
function CompareRow({
  label,
  value,
  percent,
  bold,
  contour,
  accentColor,
}: {
  label: string;
  value: string;
  percent: number;
  bold?: boolean;
  contour?: boolean;
  accentColor: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.compareRow}>
      <View style={styles.compareHeader}>
        <ThemedText weight={bold ? 600 : 400} type="small" themeColor={bold ? 'text' : 'textSecondary'}>
          {label}
        </ThemedText>
        <ThemedText weight={bold ? 600 : 400} type="small" themeColor={bold ? 'text' : 'textSecondary'}>
          {value}
        </ThemedText>
      </View>
      {contour ? (
        <BarreContour percent={percent} hauteur={14} />
      ) : (
        <View style={[styles.barRail, { backgroundColor: theme.border }]}>
          <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: accentColor }]} />
        </View>
      )}
    </View>
  );
}

/**
 * Le mois d'un horodatage, en français — « mars ».
 *
 * `MOIS_FRANCAIS` et non `toLocaleDateString` : Hermes peut être construit sans ICU complet et
 * rendrait un mois en anglais, invisible en CI et visible sur l'appareil (piège de `moisFrancais`,
 * `src/types/checkin.ts`). Lu en heure **locale**, comme la date affichée par `formatDate`.
 */
function formatMois(iso: string): string {
  return MOIS_FRANCAIS[new Date(iso).getMonth()] ?? 'précédent';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // L'écran d'erreur tient dans le conteneur centré : la phrase a besoin de gouttières (sinon
  // elle touche les bords sur un téléphone étroit) et d'air sous elle.
  erreurTexte: { textAlign: 'center', paddingHorizontal: Spacing.four, marginBottom: Spacing.four },
  erreurBouton: { marginBottom: Spacing.three },
  // Largeur maximale du contenu, comme les pages légales et les écrans de compte (A5-21).
  // L'app est déployée sur le web : sans borne, les barres de comparaison — moyenne française,
  // repère 2050 — s'étirent sur toute la fenêtre, et c'est précisément là qu'un étirement
  // fausse la lecture visuelle du rapport entre deux valeurs.
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderRadius: Radius.field,
    paddingVertical: 14,
    paddingHorizontal: Spacing.three,
  },
  bannerText: { flex: 1 },
  enTete: { gap: Spacing.half },
  dominantCard: { borderRadius: 24, padding: 22, gap: 10 },
  dominantLabel: { fontSize: 14, lineHeight: 20 },
  dominantHeadline: { fontSize: 32, lineHeight: 38, letterSpacing: -0.64 },
  dominantBody: { fontSize: 16, lineHeight: 24 },
  totalBlock: { gap: 4 },
  compareCard: { borderRadius: 20, padding: 20, gap: 14 },
  bars: { gap: 8 },
  compareRow: { gap: 8 },
  compareHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  barRail: { height: 14, borderRadius: 7, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 7 },
  // Un seul bouton, une bordure fine plutôt qu'une rupture nette : le pied ne pèse plus que
  // sa propre hauteur, et se lit comme posé sur le contenu au lieu de le trancher.
  footer: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  footerBouton: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  actionsSecondaires: { gap: Spacing.three, alignItems: 'stretch', paddingTop: Spacing.two },
  editLink: { textAlign: 'center' },
  // Le lien de repli : centré comme le message qui l'introduit, et assez aéré pour être
  // recopié à la main sur plusieurs lignes.
  lienPartage: { textAlign: 'center', lineHeight: 20 },
});
