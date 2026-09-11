import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BandeHaute } from '@/components/bande-haute';
import { Button } from '@/components/button';
import { Mascot } from '@/components/mascot';
import { MessageInline } from '@/components/message-inline';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTrackView } from '@/hooks/use-track-view';
import { modeResultat } from '@/types/resultat';
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
import { nextPalier, showsTarget2050, type Palier } from '@/types/palier';
import { hasSeenConnexionProposal } from '@/lib/connexion-prefs';
import { etatDeLaProposition, type EtatProposition } from '@/types/connexion';
import type { Database } from '@/lib/database.types';
import { APP_NAME } from '@/constants/produit';

type AssessmentResults = Database['public']['Tables']['assessment_results']['Row'];


// "Tes voyages" seul ne dit pas de quoi il s'agit — on précise toujours le mode réel
// (`dominant_poste_mode`, déjà en base) plutôt que le seul nom du poste. Table tenue à jour
// avec `transport_modes` (cf. seed) ; un mode absent ou inconnu retombe sur le libellé
// backend `dominant_poste_label`, jamais un texte vide.
const MODE_PREPOSITION: Partial<Record<string, string>> = {
  voiture: 'en voiture',
  voiture_thermique: 'en voiture thermique',
  voiture_electrique: 'en voiture électrique',
  voiture_hybride: 'en voiture hybride',
  voiture_hybride_rechargeable: 'en voiture hybride rechargeable',
  train: 'en train',
  // Mode du poste voyages uniquement (B3.3, trajets > 300 km) — jamais sélectionnable dans
  // les listes du questionnaire, cf. migration 20260904140000.
  train_longue_distance: 'en TGV',
  bus: 'en bus',
  metro_tram: 'en métro ou tram',
  velo: 'à vélo',
  marche: 'à pied',
  trottinette: 'en trottinette',
  deux_roues_motorise: 'en deux-roues motorisé',
  avion_court_moyen_courrier: 'en avion (court/moyen-courrier)',
  avion_long_courrier: 'en avion long-courrier',
};

// "Trajets loisirs"/"Voyages" seuls ne distinguent pas les deux postes (retour
// utilisateur du 03/09/2026) : ce sont deux postes bien distincts du bilan (B2 "Week-ends
// et loisirs" vs B3 "Voyages sur l'année", cf. onboarding/transition.tsx) — même wording
// que les libellés persistés côté serveur, cf. migration 20260903120000_precise_poste_labels.sql.
const POSTE_SUBJECT: Record<string, string> = {
  commute: 'Ton trajet domicile-travail',
  leisure: 'Tes loisirs du week-end',
  travel: 'Tes voyages longue distance',
};

const POSTE_BREAKDOWN: {
  key: 'commute' | 'leisure' | 'travel';
  label: string;
  co2Key: 'commute_co2_kg_year' | 'leisure_co2_kg_year' | 'travel_co2_kg_year';
}[] = [
  { key: 'commute', label: 'Trajet domicile-travail', co2Key: 'commute_co2_kg_year' },
  { key: 'leisure', label: 'Loisirs du week-end', co2Key: 'leisure_co2_kg_year' },
  { key: 'travel', label: 'Voyages longue distance', co2Key: 'travel_co2_kg_year' },
];

function dominantHeadline(results: AssessmentResults): string {
  const subject = POSTE_SUBJECT[results.dominant_poste] ?? results.dominant_poste_label;
  const preposition = results.dominant_poste_mode ? MODE_PREPOSITION[results.dominant_poste_mode] : undefined;
  return preposition ? `${subject} ${preposition}` : subject;
}

// Variante neutre de dominantHeadline (sans "Tes"/"Ton") pour la carte de partage : lue par
// les destinataires du lien, pas adressée à l'utilisateur qui partage — cf. partagerLeBilan
// ci-dessous. dominant_poste_label seul (ex. "Voyages longue distance (Avion long-courrier)")
// ne dit pas qu'il s'agit du poste dominant ; combiné à dominantPercent sur la carte, le
// pourcentage lui donne un sens (retour utilisateur du 04/09/2026).
function dominantShareLabel(results: AssessmentResults): string {
  const posteLabel = POSTE_BREAKDOWN.find((p) => p.key === results.dominant_poste)?.label ?? results.dominant_poste_label;
  const preposition = results.dominant_poste_mode ? MODE_PREPOSITION[results.dominant_poste_mode] : undefined;
  return preposition ? `${posteLabel} ${preposition}` : posteLabel;
}

// « Tu es à 150 % de la moyenne française » était un jugement déguisé en fait : un score, avec
// un bon et un mauvais côté, servi à quelqu'un qui n'a parfois aucune alternative (rural, pas
// de transports en commun). La spec demande de contextualiser « sans ton culpabilisant » (§5)
// et de ne pas traiter ces profils en mauvais élèves (§2). Les barres au-dessus montrent déjà
// l'écart : la phrase se contente de le nommer et d'ouvrir sur la suite. Cf. v1-07 §3.5.
function comparisonNote(totalT: number): string {
  if (totalT <= TARGET_2050_TRANSPORT_T) {
    return 'Tu es déjà sous la part transport compatible avec 2050.';
  }
  if (totalT <= FRANCE_AVERAGE_TRANSPORT_T) {
    return 'Tu es en dessous de la moyenne française. Il reste du chemin jusqu’à 2050, comme pour tout le monde.';
  }
  return `La moyenne française est de ${formatTonnesShort(FRANCE_AVERAGE_TRANSPORT_T)}. L’essentiel se joue sur un seul poste, celui du haut.`;
}

// La phrase qui accompagne le palier. Elle nomme la marche et situe 2050 comme un horizon,
// jamais comme une mesure de l'écart : c'est précisément ce que la barre faisait, et ce que la
// spec §4 demande d'éviter (« le registre anxiogène tend à paralyser plutôt qu'à mobiliser »).
//
// Aucune formulation d'échec : on ne dit pas combien de paliers restent. « Il t'en reste 15 »
// est une autre façon d'écrire le gouffre.
function palierNote(palier: Palier, repereVisible: boolean): string {
  const reduction = formatTonnes(palier.reductionKg);

  // Déjà sous le repère. Le registre bascule : ce n'est plus une marche à franchir mais une
  // marge qui profite ailleurs. Rien n'est demandé, rien n'est attendu — et surtout aucune
  // formulation qui ferait d'un profil déjà sobre quelqu'un qui n'en fait pas encore assez.
  if (palier.beyondTarget2050) {
    return (
      `Tu es déjà sous le repère transport 2050. Ce que tu n’émets pas laisse de la marge ` +
      `ailleurs — pour tes autres postes, ou pour ceux dont les déplacements sont contraints. ` +
      `S’il te reste de l’envie : ${reduction} de moins sur l’année.`
    );
  }

  // Le palier tombe pile sur le repère : la barre porte alors son vrai nom, et la phrase dit
  // ce qu'il faut pour l'atteindre.
  if (palier.isTarget2050) {
    return `Le repère 2050 est à ta portée : ${reduction} de moins sur l’année, et tu y es.`;
  }

  if (repereVisible) {
    // Le repère est déjà sur l'écran : la phrase n'a pas à le rappeler, elle nomme la marche.
    return `Une marche à ${reduction} de moins sur l’année. Le plan qui suit propose de quoi la franchir.`;
  }
  return `Une marche à ${reduction} de moins sur l’année. Le plan qui suit propose de quoi la franchir ; 2050 se joue palier après palier.`;
}

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
  // trouvé à proposer — on ne montre alors pas de palier.
  | { status: 'ok'; results: AssessmentResults; capKg: number | null };

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

      // Le cap de la saison en cours. Le palier n'est pas un nouveau chiffre : c'est celui que
      // `/plan` affiche déjà, figé à la génération du cycle. Son absence n'est pas une erreur —
      // l'écran se contente alors de ne pas proposer de marche.
      const { data: cycle } = await supabase
        .from('plan_cycles')
        .select('baseline_co2_kg_year, target_reduction_pct')
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      const capKg =
        cycle?.baseline_co2_kg_year != null
          ? (cycle.baseline_co2_kg_year * cycle.target_reduction_pct) / 100
          : null;

      setState({ status: 'ok', results: data, capKg });
    })();

    return () => {
      cancelled = true;
    };
  }, [id, tentative]);

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

    const { results } = state;
    const totalTonnes = (results.total_co2_kg_year / 1000).toFixed(1);
    const percent = String(Math.round((results.dominant_poste_co2_kg_year / results.total_co2_kg_year) * 100));
    const params = new URLSearchParams({ total: totalTonnes, poste: dominantShareLabel(results), percent });
    const shareUrl = `${APP_URL}/api/partage?${params.toString()}`;
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
          <ThemedText themeColor="textSecondary">Calcul de ton bilan…</ThemedText>
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

  const { results, capKg } = state;
  const totalT = results.total_co2_kg_year / 1000;

  // Le palier remplace la barre « Repère 2050 » : mettre 15,8 t à côté de 0,6 t affichait un
  // rapport de 1 à 26 qu'aucune formulation ne rattrape. 2050 reste, en mots, sous les barres.
  const palier = nextPalier(results.total_co2_kg_year, capKg, TARGET_2050_TRANSPORT_T * 1000);
  // Le repère 2050 revient dès qu'on passe sous la moyenne : au-dessus il est un gouffre, en
  // dessous un horizon crédible. Cf. `showsTarget2050`.
  const montreRepere2050 = showsTarget2050(results.total_co2_kg_year, FRANCE_AVERAGE_TRANSPORT_T * 1000);

  // Un total nul est atteignable — quelqu'un qui n'a que du vélo ou de la marche, sans avion
  // ni trajet longue distance. C'est le profil que le produit devrait féliciter, et il
  // tombait jusqu'ici sur un « NaN % » : toutes les parts se divisent par le total.
  // Cf. v1-07 T8.
  const hasEmissions = results.total_co2_kg_year > 0;
  const shareOfTotal = (kg: number) => (hasEmissions ? (kg / results.total_co2_kg_year) * 100 : 0);
  const dominantPercent = Math.round(shareOfTotal(results.dominant_poste_co2_kg_year));

  const domain = Math.max(totalT, FRANCE_AVERAGE_TRANSPORT_T) / 0.85;
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

          <ThemedText type="small" themeColor="textTertiary">
            Ton bilan transport
          </ThemedText>

          <ThemedView type="backgroundSelected" style={styles.dominantCard}>
            <ThemedText weight={600} themeColor="accentText" style={styles.dominantLabel}>
              Le déplacement qui pèse le plus
            </ThemedText>
            <ThemedText type="subtitle" weight={600} style={styles.dominantHeadline}>
              {dominantHeadline(results)}
            </ThemedText>
            {hasEmissions ? (
              <ThemedText themeColor="textSecondary" style={styles.dominantBody}>
                {`${formatTonnes(results.dominant_poste_co2_kg_year)} par an, soit ${dominantPercent} % de ton empreinte transport.`}
              </ThemedText>
            ) : (
              // Profil quasi nul (100 % vélo/marche, aucun trajet longue distance) : c'est le
              // seul endroit de la restitution qui est une félicitation, et le seul où la
              // mascotte a quelque chose à ajouter au texte.
              <View style={styles.dominantPraise}>
                <Mascot mood="happy" size={36} />
                <ThemedText themeColor="textSecondary" style={styles.dominantPraiseText}>
                  Tes déplacements n’émettent quasiment rien. C’est rare, et c’est une bonne
                  nouvelle.
                </ThemedText>
              </View>
            )}
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.compareCard}>
            <ThemedText weight={600} type="small">
              Répartition par poste
            </ThemedText>
            <View style={styles.bars}>
              {POSTE_BREAKDOWN.map((poste) => (
                <CompareRow
                  key={poste.key}
                  label={poste.label}
                  value={formatTonnes(results[poste.co2Key])}
                  percent={Math.max(shareOfTotal(results[poste.co2Key]), 3)}
                  bold={poste.key === results.dominant_poste}
                  accentColor={poste.key === results.dominant_poste ? theme.accent : theme.accentMuted}
                />
              ))}
            </View>
          </ThemedView>

          <View style={styles.totalBlock}>
            <ThemedText type="small" themeColor="textTertiary">
              Estimation annuelle, tous déplacements
            </ThemedText>
            <ThemedText weight={600} style={styles.totalValue}>
              {formatTonnes(results.total_co2_kg_year)}
            </ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.compareCard}>
            <ThemedText weight={600} type="small">
              Où tu te situes
            </ThemedText>
            <View style={styles.bars}>
              <CompareRow label="Toi" value={formatTonnesShort(totalT)} percent={barPercent(totalT)} bold accentColor={theme.accent} />
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
                  value={formatTonnesShort(palier.targetKg / 1000)}
                  percent={barPercent(palier.targetKg / 1000)}
                  accentColor={theme.accentText}
                />
              )}
              <CompareRow
                label="Moyenne en France"
                value={formatTonnesShort(FRANCE_AVERAGE_TRANSPORT_T)}
                percent={barPercent(FRANCE_AVERAGE_TRANSPORT_T)}
                accentColor={theme.accentMuted}
              />
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
            <ThemedText type="small" themeColor="textSecondary">
              {palier ? palierNote(palier, montreRepere2050) : comparisonNote(totalT)}
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
            />
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function CompareRow({
  label,
  value,
  percent,
  bold,
  accentColor,
}: {
  label: string;
  value: string;
  percent: number;
  bold?: boolean;
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
      <View style={[styles.barRail, { backgroundColor: theme.border }]}>
        <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: accentColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // L'écran d'erreur tient dans le conteneur centré : la phrase a besoin de gouttières (sinon
  // elle touche les bords sur un téléphone étroit) et d'air sous elle.
  erreurTexte: { textAlign: 'center', paddingHorizontal: Spacing.four, marginBottom: Spacing.four },
  erreurBouton: { marginBottom: Spacing.three },
  scrollContent: { padding: Spacing.four, gap: Spacing.four },
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
  dominantCard: { borderRadius: 24, padding: 22, gap: 10 },
  dominantLabel: { fontSize: 14, lineHeight: 20 },
  dominantHeadline: { fontSize: 32, lineHeight: 38, letterSpacing: -0.64 },
  dominantPraise: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dominantPraiseText: { flex: 1, minWidth: 0 },
  dominantBody: { fontSize: 16, lineHeight: 24 },
  totalBlock: { gap: 4 },
  totalValue: { fontSize: 26, lineHeight: 32 },
  compareCard: { borderRadius: 20, padding: 20, gap: 14 },
  bars: { gap: 8 },
  compareRow: { gap: 8 },
  compareHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  barRail: { height: 14, borderRadius: 7, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 7 },
  // Un seul bouton, une bordure fine plutôt qu'une rupture nette : le pied ne pèse plus que
  // sa propre hauteur, et se lit comme posé sur le contenu au lieu de le trancher.
  footer: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  actionsSecondaires: { gap: Spacing.three, alignItems: 'stretch', paddingTop: Spacing.two },
  editLink: { textAlign: 'center' },
  // Le lien de repli : centré comme le message qui l'introduit, et assez aéré pour être
  // recopié à la main sur plusieurs lignes.
  lienPartage: { textAlign: 'center', lineHeight: 20 },
});
