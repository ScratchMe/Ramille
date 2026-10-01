import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BandeHaute } from '@/components/bande-haute';
import { Button } from '@/components/button';
import { MessageInline } from '@/components/message-inline';
import { RamilleDit } from '@/components/ramille-dit';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TitreDArrivee } from '@/components/titre-d-arrivee';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useApresHydratation } from '@/hooks/use-apres-hydratation';
import { useTheme } from '@/hooks/use-theme';
import { useTrackView } from '@/hooks/use-track-view';
import {
  POSTE_LABEL,
  bilanSansEmissions,
  comparisonNote,
  dominantHeadline,
  etiquetteDuPosteDominant,
  modeResultat,
  montreMoyenneFrancaise,
  NOTE_MOBILITE_CONTRAINTE,
  palierNote,
  partDuTotal,
  pourcentageDominant,
  urlDePartage,
  equivalenceNote,
} from '@/types/resultat';
import { BarreContour } from '@/components/suivi/barre-contour';
import { BlocMethode } from '@/components/suivi/bloc-methode';
import {
  FORME_INSERABLE,
  estLeResiduelDesSortiesRares,
  loisirsSontLeResiduel,
  nomDuPoste,
} from '@/constants/postes';
import {
  formatDate,
  moisLocalDe,
  precedentDeLaRestitution,
  variationDepuisLeBilanPrecedent,
  type BilanPrecedent,
} from '@/types/suivi';
import { loadCycleCouvrant, loadCycleCourant, loadFrequenceDesLoisirs } from '@/lib/bilan-history';
import { track } from '@/lib/analytics';
import { effacerLaMarqueDeBilan } from '@/lib/marque-de-bilan';
import { lireLEngagementEnCours } from '@/lib/engagement-en-cours';
import { lireLesBilansValides, retirerLeBilan } from '@/lib/retrait-du-bilan';
import type { EngagementEnCours } from '@/types/rebilan';
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
import { etatDeLaBanniere, type EtatDeLaBanniere } from '@/types/connexion';
import {
  apresLeRetrait,
  BILAN_RETIRE,
  confirmationDuRetrait,
  INDICE_DU_RETRAIT,
  lectureDuStatut,
  LIEN_DU_RETRAIT,
  placeDuBilan,
  RETRAIT_ECHOUE,
  type PlaceDuBilan,
} from '@/types/retrait-du-bilan';
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
// quelle barre. Le libellé, lui, vient de `nomDuPoste` — le même que la liste du suivi et la
// carte de partage, résiduel des sorties rares compris.
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
  // **Un bilan retiré (C4.7, D4 de `v1-22`)** : l'adresse le dit, sans son chiffre, avec une sortie
  // vers le suivi. Deux arrivées, un seul état — juste après le geste, et plus tard par un favori ou
  // un lien. `vientDeRetirer` ne sert qu'au focus : un état qui arrive sous le doigt le prend, un
  // écran qu'on ouvre ne le vole à personne (`TitreDArrivee`).
  | { status: 'retire'; submittedAt: string | null; vientDeRetirer: boolean }
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
      /**
       * La place de ce bilan parmi les bilans valides (C4.7), lue au chargement **pour décider si le
       * lien se rend**, et pour rien d'autre. `null` quand elle n'a pas pu être lue — le lien ne se
       * rend pas, plutôt que de proposer une confirmation dont on ne sait pas quelle phrase est vraie.
       * Ce que la confirmation dit se relit au toucher (`ouvrirLaConfirmation`).
       */
      place: PlaceDuBilan | null;
      /**
       * La fréquence des loisirs déclarée, pour nommer le résiduel des sorties rares (arbitrage du
       * 27/09/2026, `v1-29` §6.3). `null` quand elle n'a pas pu être lue : `loisirsSontLeResiduel`
       * retombe alors sur les libellés figés. **Dans l'état, et plus à côté** (audit R-4) : lue par un
       * effet à part, elle pouvait renommer « Loisirs du week-end » en « Loisirs occasionnels » sous
       * les yeux, une fois l'écran rendu.
       */
      frequenceDesLoisirs: string | null;
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

// **« Voir ce que je peux faire » mène au plan, toujours** (arbitrage du 20/09/2026). Cet écran
// routait vers l'interstitiel de compte tant que la proposition n'avait pas été vue : le bouton ne
// faisait donc pas ce qu'il disait, au moment exact où la personne vient de comprendre son chiffre.
// Ce qui reste est une ligne en tête du contenu — la bannière qui existait déjà pour les passages
// suivants, rendue **dès le premier** puisque plus rien ne s'interpose avant elle.
//
// Elle ne se rend pas en relecture, et c'était déjà le cas : le suivi est l'histoire de la
// personne, pas un endroit où relancer.
const CHARGEMENT: LoadState = { status: 'loading' };

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

  // **Avant l'hydratation, l'écran rend ce que contient le HTML statique** (24/09/2026, `v1-29`).
  // L'export rend `/suivi/bilan` sans chaîne de requête, donc sans `id` : il servait l'écran
  // d'erreur, pendant que le navigateur, qui lit l'URL, rendait le chargement — React le constatait
  // à l'hydratation (erreur n° 418) et refaisait la page. Et quiconque ouvrait un bilan depuis un
  // lien lisait « n'a pas pu être affiché » le temps que l'app démarre. Le chargement n'affirme
  // rien, donc c'est lui que rendent le HTML et le rendu d'hydratation (`FRONT.md` §1.3,
  // `EXPO.md` §2.2) ; l'état lu prend le relais au rendu suivant.
  const apresHydratation = useApresHydratation();
  const [stateLu, setState] = useState<LoadState>(
    id ? { status: 'loading' } : { status: 'error' }
  );
  const state: LoadState = apresHydratation ? stateLu : CHARGEMENT;
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
  const [banniereLue, setBanniereLue] = useState<EtatDeLaBanniere>('inconnu');
  // La relecture n'est pas un état à tenir à jour, c'est une propriété de l'entrée dans l'écran :
  // elle se dérive du rendu, là où l'écrire depuis l'effet serait un `setState` synchrone que le
  // React Compiler refuse (`react-hooks/set-state-in-effect`).
  const banniere: EtatDeLaBanniere = mode === 'relecture' ? 'autre' : banniereLue;
  const [partage, setPartage] = useState<EtatPartage>({ statut: 'inactif' });
  // **Retirer ce bilan** (C4.7, D4 de `v1-22`) : une confirmation dans la page, jamais un `Alert` —
  // sur web il retombe sur `window.alert()`, qui n'invoque pas fiablement `onPress` (la forme de
  // « Supprimer mon compte », `MonCompte`). Le verrou vit dans une `ref` et pas dans l'état, qui ne
  // vaut `true` qu'au rendu suivant : sans lui, deux appuis rapprochés enverraient deux appels, et le
  // second rendrait « déjà retiré » juste après que le premier a réussi — la raison du verrou de la
  // soumission du questionnaire.
  //
  // **Ce que la confirmation dit se lit au toucher du lien, pas au chargement** (contre-lecture du
  // 27/09/2026). La restitution reste montée dans la pile du suivi : on change d'action depuis
  // l'onglet Plan, on soumet un nouveau bilan, on revient — et une place ou un engagement lus au
  // chargement feraient dire « ton plan repartira de ton bilan précédent » à un bilan devenu
  // `ancien`, ou nommer une action quittée. `null` : la confirmation est fermée.
  const [confirmationOuverte, setConfirmationOuverte] = useState<{
    place: PlaceDuBilan;
    engagement: EngagementEnCours | null;
  } | null>(null);
  const [lectureDeLaConfirmation, setLectureDeLaConfirmation] = useState(false);
  const [retraitEnCours, setRetraitEnCours] = useState(false);
  const [messageDuRetrait, setMessageDuRetrait] = useState<string | null>(null);
  const verrouDuRetrait = useRef(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      // **Toutes les lectures partent ensemble, au montage** (01/10/2026, audit R-4). L'écran
      // enchaînait le résultat, puis le cycle de plan, rendait, puis relisait la liste des bilans pour
      // trouver le précédent, puis le cycle d'alors, et rendait une seconde fois : deux allers-retours
      // avant le premier rendu, quatre avant la comparaison — et la barre « Ton bilan précédent »
      // s'insérait au-dessus de « Toi » une fois l'écran lu, toutes les barres changeant de longueur.
      // C'est pourtant « est-ce que ça a bougé ? », la raison même d'un re-bilan. Un seul aller-retour
      // désormais, puis un second qui ne fait qu'ajouter une phrase.
      //
      // **Le statut arrive avec le résultat, dans la même lecture** (C4.7). C'est la seule lecture
      // **d'affichage** qui ne filtre pas sur `completed` — elle lit un bilan par son identifiant,
      // c'est-à-dire par l'adresse qui circule — donc la seule à l'écran qui ne devient pas juste
      // toute seule quand un bilan est retiré. (`lireEtatDuCompte` lit aussi tous les statuts, et il
      // le doit : un bilan retiré reste une donnée à supprimer.) Embarqué plutôt que lu à côté : une
      // lecture de plus pourrait échouer seule, et l'écran ne saurait plus s'il a le droit de montrer
      // le chiffre.
      //
      // **Les trois autres sont tolérantes, et le restent en partant ensemble** : leur échec ôte ce
      // qu'elles portent, jamais l'écran. Les bilans valides décident du lien du retrait et du bilan
      // précédent — en échec, ni lien ni comparaison ; le cycle courant porte le palier — en échec,
      // pas de marche ; la fréquence des loisirs nomme le résiduel des sorties rares — en échec, les
      // libellés figés. Chacune rend son échec sans lever (PostgREST le rend comme une valeur) ; le
      // `.catch` garde la règle si un jour l'une d'elles levait, sans quoi `Promise.all` la ferait
      // tomber avec le reste, et l'écran avec elle.
      let lectures;
      try {
        lectures = await Promise.all([
          supabase
            .from('assessment_results')
            .select('*, assessments(status, submitted_at)')
            .eq('assessment_id', id)
            .single(),
          lireLesBilansValides().catch((): { ok: false } => ({ ok: false })),
          // **Pas de cycle en relecture** : voir plus bas, le palier n'appartient qu'au bilan qu'on
          // vient de soumettre.
          mode === 'relecture' ? null : loadCycleCourant().catch(() => null),
          loadFrequenceDesLoisirs(id).catch(() => null),
        ]);
      } catch (erreur) {
        // Seule la lecture du résultat peut arriver ici : sans elle, rien à montrer — l'écran
        // d'erreur, et pas « Chargement de ton bilan… » pour toujours.
        if (cancelled) return;
        console.error('Le résultat du bilan n’a pas pu être lu :', erreur);
        setState({ status: 'error' });
        return;
      }
      const [{ data: lu, error }, bilansValides, cycle, frequenceDesLoisirs] = lectures;

      if (cancelled) return;
      if (error || !lu) {
        console.error('Le résultat du bilan n’a pas pu être lu :', error);
        setState({ status: 'error' });
        return;
      }

      const { assessments: bilan, ...data } = lu;
      const statut = lectureDuStatut(bilan?.status);
      if (statut === 'retire') {
        setState({ status: 'retire', submittedAt: bilan?.submitted_at ?? null, vientDeRetirer: false });
        return;
      }
      if (statut === 'illisible') {
        console.error('Le statut du bilan n’a pas pu être qualifié :', bilan?.status);
        setState({ status: 'error' });
        return;
      }
      const place = bilansValides.ok
        ? placeDuBilan(id, bilansValides.data.map((valide) => valide.id))
        : null;

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
        // **Elle arrive avec le résultat depuis C4.7**, dans la lecture qui porte le statut. Elle
        // était lue à part, après l'affichage, pour qu'une requête de plus ne puisse ni retarder
        // l'écran ni le faire échouer ; embarquée, elle ne coûte plus de requête du tout, et il n'y a
        // plus rien à tolérer à part.
        // **Pas de comparaison en relecture**, pour la même raison qu'il n'y a pas de palier : la
        // barre « ton bilan précédent » répond à « est-ce que ça a bougé depuis ? », question qui
        // n'a pas de sens quand on ouvre un bilan de l'an dernier depuis la liste du suivi — c'est
        // le suivi lui-même qui montre l'évolution.
        setState({
          status: 'ok',
          results: data,
          capKg: null,
          submittedAt: bilan?.submitted_at ?? null,
          precedent: null,
          palierFranchi: false,
          place,
          frequenceDesLoisirs,
        });
        return;
      }

      // Le cap de la saison en cours. Le palier n'est pas un nouveau chiffre : c'est celui que
      // `/plan` affiche déjà, figé à la génération du cycle. Son absence n'est pas une erreur —
      // l'écran se contente alors de ne pas proposer de marche.
      const capKg = cycle?.capKg ?? null;
      // **Le bilan précédent, dans la même lecture que la place** : la liste des bilans valides, du
      // plus récent au plus ancien, est exactement celle que relisait `loadBilanPrecedent`. Sans elle
      // (lecture en échec), pas de comparaison — la restitution reste entière sans la barre.
      const precedent = bilansValides.ok
        ? precedentDeLaRestitution(bilansValides.data, data.assessment_id)
        : null;

      // La date ne sert qu'en relecture : après le questionnaire, c'est aujourd'hui.
      setState({
        status: 'ok',
        results: data,
        capKg,
        submittedAt: null,
        precedent,
        palierFranchi: false,
        place,
        frequenceDesLoisirs,
      });

      // **Seul le cycle d'alors arrive en second temps**, et il n'ajoute qu'une phrase : « Le palier
      // que tu visais est derrière toi. » Il dépend de la date du précédent, donc il ne peut pas
      // partir avec le reste ; tolérant comme lui — sans cycle d'alors, on ne prétend rien.
      //
      // Le cycle qui couvrait le bilan précédent, pour savoir quel palier était visé alors. S'il
      // s'agit du cycle courant, la soumission d'aujourd'hui l'a réécrit : le cap affiché à l'époque
      // n'existe plus, et on ne prétend pas le connaître.
      if (precedent === null) return;
      const cycleAlors = await loadCycleCouvrant(precedent.submittedAt.slice(0, 10));
      if (cancelled) return;
      const capAlorsKg =
        cycleAlors && cycle && cycleAlors.cycleId !== cycle.cycleId ? cycleAlors.capKg : null;
      const palierFranchi = palierEstDerriere({
        precedentKg: precedent.totalKg,
        courantKg: data.total_co2_kg_year,
        capAlorsKg,
        target2050Kg: TARGET_2050_TRANSPORT_T * 1000,
      });
      if (!palierFranchi) return;

      setState((etat) => (etat.status === 'ok' ? { ...etat, palierFranchi } : etat));
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
      // **Le repli ne dit rien plutôt que d'affirmer.** `inconnu` ne rend pas la bannière, et cet
      // effet ne dépend que de `[mode, state.status]` : rien ne le relance. Une lecture qui lève
      // laisse donc la ligne absente — ce qui coûte une invitation, jamais une phrase fausse.
      // C'est l'inverse du défaut d'A3-20, où le booléen optimiste sautait la proposition ; et le
      // bouton, lui, ne dépend plus de cette lecture du tout, puisqu'il va au plan dans tous les
      // cas. La seule sortie de l'écran ne peut donc plus se fermer.
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (annule) return;
        if (!session) return;
        // `new_email` est posé par `updateUser({ email })` et retiré à la vérification du code :
        // il dit « le geste est commencé » sans aucun appel réseau de plus. Lui reproposer le
        // départ du chemin qu'elle vient de prendre se lirait comme un échec.
        setBanniereLue(
          etatDeLaBanniere({
            estAnonyme: session.user.is_anonymous === true,
            adresseAConfirmer: Boolean(session.user.new_email),
          })
        );
      } catch (erreur) {
        console.error('L’état de la session n’a pas pu être lu :', erreur);
      }
    })();
    return () => {
      annule = true;
    };
  }, [mode, state.status]);

  // **Le plan, toujours.** C'est tout ce que ce bouton fait depuis le 20/09/2026, et c'est
  // l'arbitrage : la prise de conscience du chiffre est ce que l'app existe pour produire, et la
  // risquer pour un compte demandé trop tôt était le mauvais échange. La provenance
  // `resultat_transition` de `connexion_view` n'est donc plus émise par personne — elle reste
  // déclarée pour que l'historique d'avant le retrait se lise (`src/types/analytics.ts`).
  const goToPlan = () => router.push('/plan');

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

  const ouvrirLaConfirmation = async () => {
    if (!id || state.status !== 'ok' || verrouDuRetrait.current) return;
    verrouDuRetrait.current = true;
    setLectureDeLaConfirmation(true);
    setMessageDuRetrait(null);

    const [bilansValides, lectureDeLEngagement] = await Promise.all([
      lireLesBilansValides(),
      lireLEngagementEnCours(),
    ]);

    verrouDuRetrait.current = false;
    setLectureDeLaConfirmation(false);
    // **Sans place relue, pas de confirmation** (seconde contre-lecture du 27/09/2026) : retomber sur
    // celle du chargement rendait la phrase périmée que cette relecture existe pour éviter — « ton
    // plan repartira de ton bilan précédent » à un bilan devenu `ancien`. La règle est celle du
    // chargement : une confirmation dont on ne sait pas quelle phrase est vraie ne se propose pas.
    // Le lien reste, et le message dit de réessayer.
    if (!bilansValides.ok) {
      setMessageDuRetrait(RETRAIT_ECHOUE);
      return;
    }
    // Et si le bilan n'est plus parmi les valides (retiré depuis un autre appareil), on relit
    // l'écran, qui montre l'état « retiré » : le chemin `etat_change` de `retirer`, atteint plus tôt.
    const place = placeDuBilan(id, bilansValides.data.map((valide) => valide.id));
    if (place === null) {
      reessayer();
      return;
    }
    // L'engagement, lui, n'a pas de repli : un échec le tait, la tolérance de la feuille « Nouveau
    // bilan », qui lit la même chose. Retenir le geste pour une phrase serait pire que la taire.
    setConfirmationOuverte({
      place,
      engagement: lectureDeLEngagement.ok ? lectureDeLEngagement.data : null,
    });
  };

  const retirer = async () => {
    if (!id || state.status !== 'ok' || verrouDuRetrait.current) return;
    // La date que l'état « retiré » affichera : celle que l'écran porte déjà, donc nulle juste après
    // le questionnaire — c'est aujourd'hui, comme la restitution qu'on quitte ne la disait pas.
    const { submittedAt } = state;
    verrouDuRetrait.current = true;
    setRetraitEnCours(true);
    setMessageDuRetrait(null);

    const issue = await retirerLeBilan(id);

    verrouDuRetrait.current = false;
    setRetraitEnCours(false);
    if (issue.genre === 'echec') {
      setMessageDuRetrait(RETRAIT_ECHOUE);
      return;
    }
    setConfirmationOuverte(null);
    // **Le serveur a refusé parce que le bilan n'est plus complété** — un second appareil, un double
    // appui. On relit plutôt que de parler de réseau : la relecture montre l'état « retiré », qui est
    // la vérité, et la personne n'a pas à deviner ce qui s'est passé.
    if (issue.genre === 'etat_change') {
      reessayer();
      return;
    }
    // **Plus aucun bilan valide : la racine, et la marque locale effacée d'abord** (D3). La racine ne
    // trouve plus de bilan complété et route vers l'onboarding — ou la reprise d'un questionnaire
    // commencé. Sans l'effacement, une réouverture hors ligne lirait la marque et enverrait au plan
    // d'un compte qui n'a plus de bilan (C4.5).
    if (apresLeRetrait(issue.restants) === 'racine') {
      await effacerLaMarqueDeBilan();
      router.replace('/');
      return;
    }
    setState({ status: 'retire', submittedAt, vientDeRetirer: true });
  };

  // **Le chargement et l'erreur gardent le cadre de l'écran prêt** (01/10/2026, audit R-9) : la même
  // `SafeAreaView` sans bord bas, la bande haute, puis une zone centrée — la forme de
  // `suivi/index.tsx`. Ils n'avaient qu'un texte centré : la bande arrivait avec le contenu, d'un
  // saut de 52 px, et la ligne se posait plus haut que celle du suivi. À la sortie du questionnaire,
  // trois mises en page se suivaient pour une seule arrivée.
  //
  // **La ligne reste immédiate** : cet écran n'attend pas le délai de `useChargementVisible`, et
  // c'est décidé (`v1-30` §5.8) — le HTML statique la porte, et la garde D de
  // `verifier-etats-export.mjs` la lit.
  if (state.status === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <BandeHaute />
          <View style={styles.centered}>
            {/* « Calcul de ton bilan… » était faux dans les deux entrées de l'écran : le calcul a
                lieu côté serveur à la soumission, et `assessment_results` fige le résultat — cet
                écran ne fait que le relire, y compris juste après le questionnaire (A3-16). */}
            <ThemedText themeColor="textSecondary">Chargement de ton bilan…</ThemedText>
          </View>
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
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <BandeHaute />
          <View style={styles.centered}>
            <ThemedText themeColor="textSecondary" style={styles.erreurTexte}>
              Ton bilan n’a pas pu être affiché. Il n’est pas perdu, réessaie dans un instant.
            </ThemedText>
            <Button title="Réessayer" onPress={reessayer} style={styles.erreurBouton} />
            <TextLink
              label="Revenir à mon suivi"
              onPress={() => router.replace('/suivi')}
              role="link"
            />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // **L'adresse d'un bilan retiré dit qu'il a été retiré** (D4) : ni chiffre, ni barre, ni partage —
  // seulement le fait, et la sortie vers le suivi. La mascotte n'y est pas : il n'y a rien à
  // accompagner, et un visage à côté d'un geste de retrait le commenterait.
  if (state.status === 'retire') {
    const titre = (
      <ThemedText type="screenTitle" style={styles.retireTitre}>
        {BILAN_RETIRE.titre}
      </ThemedText>
    );
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <BandeHaute />
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.enTete}>
              <ThemedText type="small" themeColor="textTertiary">
                Ton bilan transport
              </ThemedText>
              {state.submittedAt && (
                <ThemedText type="small" themeColor="textTertiary">
                  Bilan du {formatDate(state.submittedAt)}
                </ThemedText>
              )}
            </View>
            {/* Le focus sur le titre **seulement quand l'état arrive sous le doigt** : le bouton
                pressé vient de disparaître avec la restitution, et le focus avec lui. Ouvert par un
                favori, l'écran ne le vole à personne (`TitreDArrivee`). */}
            {state.vientDeRetirer ? <TitreDArrivee>{titre}</TitreDArrivee> : titre}
            <ThemedText themeColor="textSecondary">{BILAN_RETIRE.corps}</ThemedText>
            <TextLink
              label={BILAN_RETIRE.sortie}
              // Une destination, pas un dépilement — la règle de « Revenir à mon suivi » plus bas.
              onPress={() => router.replace('/suivi')}
              role="link"
              type="small"
              weight={600}
              themeColor="accentText"
              style={styles.editLink}
            />
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const { results, capKg, submittedAt, precedent, palierFranchi, place, frequenceDesLoisirs } = state;
  const confirmation =
    confirmationOuverte === null
      ? null
      : confirmationDuRetrait(confirmationOuverte.place, confirmationOuverte.engagement);
  const totalT = results.total_co2_kg_year / 1000;

  // Le palier remplace la barre « Repère 2050 » : mettre 15,8 t à côté de 0,6 t affichait un
  // rapport de 1 à 26 qu'aucune formulation ne rattrape. 2050 reste, en mots, sous les barres.
  // En relecture, `capKg` est nul par construction (cf. le chargement) : rien à proposer, le
  // cap n'appartient pas au bilan qu'on relit.
  const palier = nextPalier(results.total_co2_kg_year, capKg, TARGET_2050_TRANSPORT_T * 1000);
  // **Le poste que la marche nomme** (C3.11). Le cap vaut 20 % de `baseline_co2_kg_year`, qui est
  // le poste dominant et non le total : sans le nommer, la phrase se lit comme une marche sur
  // l'empreinte entière. Repli sur le libellé snapshoté si le poste sortait un jour de la liste.
  const posteDeLaMarche = FORME_INSERABLE[results.dominant_poste] ?? results.dominant_poste_label;
  // Le résiduel des sorties rares : un poste que le calcul suppose et que la personne n'a pas
  // déclaré. La marche s'y tait (`palierNote`, arbitrage du 25/09/2026) — même lecture que la
  // félicitation du plan qui suit, pour que les deux écrans le reconnaissent d'un seul critère.
  const posteSuppose = estLeResiduelDesSortiesRares(results.dominant_poste, results.dominant_poste_label);
  const loisirsOccasionnels = loisirsSontLeResiduel({ ...results, leisure_frequency: frequenceDesLoisirs });
  const equivalenceDeLaMarche = palier ? equivalenceNote(palier) : null;
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

  // **La condition de rendu du repère 2050 vit ici, pas dans le JSX**, parce que l'échelle doit la
  // lire aussi : c'est le défaut que C3.1 a introduit sans le voir. En retirant la moyenne française
  // du domaine, elle a laissé la barre du repère dépasser son rail dès que le total passe sous
  // 0,510 t (0,85 × 0,6 t) — elle se rendait pleine, coupée par l'`overflow: hidden` du rail, et
  // seulement pour un profil en mobilité contrainte, c'est-à-dire celui pour qui ce chantier existe.
  // Deux endroits qui décident séparément ce que l'échelle contient finissent toujours par se
  // contredire ; le palier, lui, n'a pas besoin d'y entrer (`targetKg <= totalKg` par construction).
  const montreBarreRepere2050 = (montreRepere2050 || !palier) && !palier?.isTarget2050;
  const domain =
    Math.max(
      totalT,
      precedentT,
      montreMoyenne ? FRANCE_AVERAGE_TRANSPORT_T : 0,
      montreBarreRepere2050 ? TARGET_2050_TRANSPORT_T : 0
    ) / 0.85;
  const barPercent = (value: number) => Math.max((value / domain) * 100, 3);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Même bande que les deux onglets : elle ne défile pas, et c'est là que viendra le
            bouton retour dont iOS aura besoin sur cet écran de détail. */}
        <BandeHaute />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {banniere === 'anonyme' && (
            <Pressable
              // Sans `id` : `/connexion` ne lit plus le résultat du bilan.
              onPress={() => router.push({ pathname: '/connexion', params: { source: 'resultat_cta' } })}
              // La bannière porte deux textes mais un seul geste : sans libellé explicite, un
              // lecteur d'écran les annoncerait l'un après l'autre sans dire qu'il s'agit d'une
              // seule cible. Le libellé les recompose en une phrase.
              accessibilityRole="link"
              // « Le garder » supposait qu'il pouvait se perdre là où il est déjà en base, et
              // « enregistré » disait la mauvaise chose : ce qui est vrai, c'est qu'il n'est
              // accessible que d'ici. Un fait, pas une menace — et l'action dit ce qu'elle fait.
              accessibilityLabel="Ce bilan n’est accessible que depuis cet appareil. Le retrouver ailleurs, en rattachant un compte."
              // La surface répond au doigt (24/09/2026, `v1-29`) : la teinte `backgroundPressed`,
              // tout de suite et sans animation — rien ne disait que le geste avait été pris.
              style={({ pressed }) => [
                styles.banner,
                { backgroundColor: pressed ? theme.backgroundPressed : theme.backgroundElement },
              ]}
            >
              <ThemedText type="small" themeColor="textSecondary" style={styles.bannerText}>
                Ce bilan n’est accessible que depuis cet appareil.
              </ThemedText>
              <ThemedText type="small" weight={600} themeColor="accentText">
                Le retrouver ailleurs
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
                {/* **« Le déplacement qui pèse le plus » était faux quand le départage joue**
                    (24/09/2026, `v1-29`) : à 5 % près le serveur retient le poste le plus régulier,
                    et le profil de la recette voyait le domicile-travail (1,9 t) coiffé de cette
                    étiquette au-dessus d'une barre de voyages à 2,0 t. L'étiquette se dérive des
                    mêmes kilos que les barres ci-dessous — rien n'est recalculé ici. */}
                <ThemedText type="small" weight={600} themeColor="accentText">
                  {etiquetteDuPosteDominant(results)}
                </ThemedText>
                {/* **Le type `display`, et plus un `subtitle` surchargé** (24/09/2026, `v1-29`) :
                    32/38/−0,64 y était recopié à la main. Il s'annonce en en-tête de **niveau 1**, le
                    défaut du type, et c'est juste ici : l'écran n'en a pas d'autre — « Ramille », dans
                    la bande haute, n'est plus un en-tête depuis le 24/09/2026, et les intitulés des
                    cartes n'en sont pas. C'est le titre de ce qu'on vient lire. */}
                <ThemedText type="display">{dominantHeadline(results)}</ThemedText>
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
                <ThemedText type="small" weight={600} themeColor="accentText">
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
                    label={nomDuPoste(poste.key, 'label', loisirsOccasionnels) ?? POSTE_LABEL[poste.key]}
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
            <ThemedText type="salient" style={styles.chiffres}>
              {formatTonnes(results.total_co2_kg_year)}
            </ThemedText>
            {/* **La question « d'où vient ce chiffre ? » se pose ici et nulle part ailleurs**
                (C3.2). Sous le total, replié, parce que c'est le moment où elle naît — et parce
                que ce total ne se compare à aucun autre simulateur sans savoir qu'il compte la
                fabrication. La date passée est celle de **soumission** : c'est elle qui fige les
                facteurs (`emission_factor(mode, date)`), donc elle qui date la méthode. */}
            <BlocMethode dateDuBilan={submittedAt} />
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
                  label={`Ton bilan précédent · ${moisLocalDe(precedent.submittedAt) ?? 'précédent'}`}
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
              {/* **Et elle se tait sur le résiduel des sorties rares**, comme la phrase (recette du
                  28/09/2026, constat 10.2, décidé le même jour). La phrase ne proposait plus rien
                  depuis le 25/09, et la barre montrait encore « Ton prochain palier — 47 kg » : 20 %
                  d'un poste que le calcul suppose et que la personne n'a pas déclaré. */}
              {/* **Le remplissage des repères, et plus `accentText`** (01/10/2026, audit R-8). La barre
                  du palier était la plus foncée de la carte, plus que « Toi » (1,42:1 entre les deux
                  verts, sur des longueurs voisines) : ce qui ressortait était la marche, pas la
                  personne. Le kit ne connaît que deux remplissages — l'accent pour ce qui est à soi,
                  `accentMuted` pour le contexte —, et aucun document ne demande au palier de ressortir
                  par la couleur : sa place juste sous « Toi » et son libellé le distinguent. */}
              {palier && !posteSuppose && (
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
                  accentColor={theme.accentMuted}
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
              {montreBarreRepere2050 && (
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
                petit et rendrait la phrase trop facile.

                **En `body`, pas en `small`** (01/10/2026, audit R-10) : c'est ce que la planche E du
                canvas validé demande (`v1-14` §5, « la phrase de variation sous les barres en
                `body` »), et c'est le pic d'un re-bilan — elle était la ligne la moins saillante de
                la carte, au rang de la source. Les autres phrases de la carte restent en `small`. */}
            {precedent && (
              <ThemedText type="body" themeColor="textSecondary">
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
              {palier
                ? palierNote(palier, montreRepere2050, posteDeLaMarche, posteSuppose)
                : comparisonNote(results)}
            </ThemedText>
            {/* L'ordre de grandeur de la marche, sur sa propre ligne (C3.2). Il disparaît sous un
                vol entier : « 0,3 vol » n'est pas un ordre de grandeur. Et sur le résiduel des
                sorties rares, comme la barre et la phrase : il n'y atteint jamais un vol (la marche y
                reste d'une dizaine de kilos), mais la règle s'écrit plutôt que de tenir par ordre de
                grandeur (contre-lecture du 28/09/2026). */}
            {palier && !posteSuppose && equivalenceDeLaMarche && (
              <ThemedText type="small" themeColor="textTertiary">
                {equivalenceDeLaMarche}
              </ThemedText>
            )}
            {/* **La chasse fixe reste, et c'est la seule place qui lui revient ici** (24/09/2026,
                `v1-29`, décision n° 10) : c'est une source, pas une phrase adressée à la personne. */}
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
            {/* En chasse fixe, et c'est voulu (24/09/2026, `v1-29`) : ce n'est pas une phrase mais une
                adresse à recopier à la main, où la chasse fixe départage « l » de « 1 » et « O » de
                « 0 ». La phrase qui l'introduit, juste au-dessus, est en Spline Sans. */}
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
            {/* **Le libellé se corrige une seconde fois, et dans la même direction** (C6.1,
                `v1-19` D1). « Modifier mes réponses » promettait une édition alors que le
                questionnaire insère toujours un nouveau bilan ; « Refaire » a le défaut inverse et
                aussi faux — il laisse croire qu'on efface celui qu'on regarde. Un nouveau bilan
                s'**ajoute** : la ligne d'aujourd'hui reste, et c'est même ce qui permet à cet écran
                d'exister pour chacune d'elles. Le préremplissage (v1-07 T7) rend l'action peu
                coûteuse ; le libellé dit enfin ce qu'elle fait. */}
            <TextLink
              label="Faire un nouveau bilan"
              onPress={() => router.push('/bilan')}
              role="link"
              type="small"
              themeColor="textTertiary"
              style={styles.editLink}
            />
            {/* **Le seul endroit où un chiffre se conteste** (C3.9, constat A6-9). La restitution
                affiche une empreinte calculée à partir de moyennes nationales et de réponses
                approchées : quelqu'un qui connaît son trajet mieux que nous doit pouvoir le dire
                là où il lit le résultat, pas dans un écran de retour qu'il faudrait aller
                chercher. La catégorie est **préremplie et modifiable** — c'est la personne qui
                sait si c'est un chiffre, un mode manquant ou autre chose. Le contexte part avec :
                sans l'identifiant du bilan, un retour sur un chiffre n'est pas exploitable. */}
            <TextLink
              label="Un chiffre me semble faux"
              onPress={() =>
                router.push({
                  pathname: '/feedback',
                  // **Le nom de l'écran, pas l'identifiant du bilan** (corrigé le 14/09/2026). Le
                  // commentaire de `/feedback`, la phrase qu'il affiche et la politique de
                  // confidentialité disent tous les trois « le contexte est le nom de l'écran
                  // d'origine, rien de plus » : y glisser un uuid rendait les trois faux d'un coup,
                  // pour une information qui ne manque pas — le bilan d'une personne se retrouve par
                  // son compte et la date de son retour.
                  params: { kind: 'chiffre', context: 'restitution du bilan' },
                })
              }
              role="link"
              type="small"
              themeColor="textTertiary"
              style={styles.editLink}
            />
            {/* **Le geste de retrait vit ici, sur la restitution du bilan concerné** (C4.7, D4 de
                `v1-22`) : c'est le seul écran où l'on voit le chiffre qui choque, donc le seul où le
                geste a un sens — et pas dans l'historique, où il serait à portée de pouce sans rien
                à côté. Juste après « Un chiffre me semble faux », son voisin : l'un conteste le
                calcul, l'autre retire la réponse.

                La confirmation reprend la forme de « Supprimer mon compte » (`MonCompte`) : le lien
                s'efface, un encart dit ce qui va se passer, « Annuler » et le bouton plein. Ce qu'il
                dit dépend de la place du bilan (`confirmationDuRetrait`), relue au toucher ; quand
                elle n'a pas pu être lue au chargement, le lien ne se rend pas du tout. */}
            {place !== null &&
              (confirmation !== null ? (
                <ThemedView type="backgroundElement" style={styles.confirmation}>
                  {/* Le lien pressé vient de disparaître : le focus va à ce qui le remplace (`FRONT.md`
                      §2.4), et le lecteur d'écran lit la question avant ses deux réponses. */}
                  <TitreDArrivee>
                    <ThemedText type="small" weight={600}>
                      {confirmation.titre}
                    </ThemedText>
                  </TitreDArrivee>
                  <ThemedText type="small" themeColor="textSecondary">
                    {confirmation.corps}
                  </ThemedText>
                  {confirmation.engagement !== null && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {confirmation.engagement}
                    </ThemedText>
                  )}
                  <View style={styles.confirmationActions}>
                    <TextLink
                      label={confirmation.annuler}
                      onPress={() => {
                        setConfirmationOuverte(null);
                        setMessageDuRetrait(null);
                      }}
                      disabled={retraitEnCours}
                      type="small"
                      themeColor="textTertiary"
                      style={styles.lienSouligne}
                    />
                    <Button
                      title={retraitEnCours ? confirmation.enCours : confirmation.confirmer}
                      onPress={() => void retirer()}
                      disabled={retraitEnCours}
                      flex
                    />
                  </View>
                  <MessageInline message={messageDuRetrait} />
                </ThemedView>
              ) : (
                <>
                  <TextLink
                    label={LIEN_DU_RETRAIT}
                    hint={INDICE_DU_RETRAIT}
                    onPress={() => void ouvrirLaConfirmation()}
                    disabled={lectureDeLaConfirmation}
                    type="small"
                    themeColor="textTertiary"
                    style={styles.editLink}
                  />
                  {/* La relecture au toucher a échoué : la confirmation ne s'ouvre pas, et on le dit
                      ici, sous le lien, puisque l'encart qui porte d'ordinaire ce message n'existe pas. */}
                  <MessageInline message={messageDuRetrait} />
                </>
              ))}
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
            {/* Plus jamais désactivé pour une raison de compte : il mène au plan, et le plan
                n'attend rien de la session. La garde d'A3-20 protégeait un routage qui n'existe
                plus. */}
            <Button
              title="Voir ce que je peux faire"
              onPress={goToPlan}
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
        <ThemedText
          weight={bold ? 600 : 400}
          type="small"
          themeColor={bold ? 'text' : 'textSecondary'}
          style={styles.compareLabel}
        >
          {label}
        </ThemedText>
        <ThemedText
          weight={bold ? 600 : 400}
          type="small"
          themeColor={bold ? 'text' : 'textSecondary'}
          style={styles.chiffres}
        >
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

// **`formatMois` a été supprimée le 14/09/2026.** C'était une seconde dérivation du mois local,
// rendue sur le même écran que `moisLocalDe` (`src/types/suivi.ts`), et aucune assertion ne
// distinguait la lecture locale de la lecture UTC que les deux commentaires revendiquaient. Une
// seule dérivation désormais, dans le module pur où elle est testée — avec la raison qui vaut pour
// les deux : `MOIS_FRANCAIS` et non `toLocaleDateString`, Hermes pouvant être construit sans ICU
// complet et rendre un mois en anglais, invisible en CI et visible sur l'appareil.

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
  dominantBody: { fontSize: 16, lineHeight: 24 },
  totalBlock: { gap: 4 },
  // **Chiffres tabulaires** (24/09/2026, `v1-29`) : le total, et la colonne de valeurs des barres
  // qui s'alignent à droite d'une ligne à l'autre. Spline Sans porte la fonction `tnum`.
  chiffres: { fontVariant: ['tabular-nums'] },
  compareCard: { borderRadius: 20, padding: 20, gap: 14 },
  bars: { gap: 8 },
  compareRow: { gap: 8 },
  compareHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  // **Le libellé cède, la valeur jamais** (24/09/2026, audit d'accessibilité de `v1-29`, 1.4.4) :
  // sans `flexShrink`, rien ne dit au libellé de laisser la place, et à 200 % de taille de texte un
  // libellé long peut tasser la valeur ou la pousser hors de la ligne — relevé par l'audit, pas
  // mesuré sur appareil. C'est la règle d'`EcartParPoste` : la valeur porte l'information, le
  // libellé se comprend sur deux lignes.
  compareLabel: { flexShrink: 1, minWidth: 0 },
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
  // La confirmation du retrait : l'encart des cartes de l'écran, et la rangée de « Supprimer mon
  // compte » — « Annuler » souligné à gauche, le bouton plein qui prend le reste (`MonCompte`).
  confirmation: { borderRadius: 20, padding: 20, gap: Spacing.three },
  confirmationActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  lienSouligne: { textDecorationLine: 'underline' },
  retireTitre: { marginTop: Spacing.two },
});
