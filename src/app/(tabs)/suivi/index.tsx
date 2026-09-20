import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BandeHaute } from '@/components/bande-haute';
import { Button } from '@/components/button';
import { EmptyStateIllustration } from '@/components/illustrations/empty-state-illustration';
import { Mascot } from '@/components/mascot';
import { MessageInline } from '@/components/message-inline';
import { RamilleDit } from '@/components/ramille-dit';
import { EcartParPoste } from '@/components/suivi/ecart-par-poste';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useRafraichirAuRetour } from '@/hooks/use-rafraichir-au-retour';
import { useTheme } from '@/hooks/use-theme';
import { useTrackFocus } from '@/hooks/use-track-focus';
import {
  loadAnsweredCheckins,
  loadAssessmentHistory,
  loadDecisionsEngagees,
} from '@/lib/bilan-history';
import { POSTE_LABEL } from '@/types/resultat';
import { formatIntention } from '@/types/plan';
import {
  daysSince,
  phraseDuRegimeDeRebilan,
  regimeDeRebilan,
  titreDuRebilan,
  ecartParPoste,
  estUneBaisse,
  formatDate,
  libelleDeReponse,
  libellePeriodeAffiche,
  pointsParSaison,
  variationNote,
  type AssessmentSnapshot,
  type CheckinRecord,
  type DecisionDeSaison,
} from '@/types/suivi';
import { formatTonnes } from '@/lib/format';
import { FRANCE_AVERAGE_TRANSPORT_T } from '@/constants/carbon-reference';
import { showsTarget2050 } from '@/types/palier';
import { RAMILLE } from '@/constants/mascotte';

// Écran « Mon suivi » — la brique qui manquait pour que le produit accompagne réellement
// dans la durée (v1-07 §3.2). Jusqu'ici on répondait à un check-in, la carte disparaissait,
// et il ne restait rien : aucun écran ne montrait l'historique des bilans, alors que
// `assessments` en supporte plusieurs depuis l'increment 6 et que `engagement_checkins`
// conserve chaque réponse.
//
// Deux règles de fond, qui ne sont pas négociables ici :
//
//  1. **Soi vs soi, jamais vs les autres.** Le non-goal de la spec §2 sur la comparaison
//     entre utilisateurs reste ferme (risque de honte comparative pour les profils captifs
//     de la voiture). Rien sur cet écran ne mentionne un autre utilisateur.
//  2. **Aucune mécanique d'échec.** Pas de streak, pas de série cassée, pas de score. Une
//     période sans réponse n'apparaît pas comme un manquement — elle n'apparaît pas du tout
//     (les check-ins non répondus sont clos en `expired` côté serveur et jamais lus ici).
//     Ce qui est compté, ce sont les fois où la personne a répondu, pas celles où elle a
//     laissé passer. La révision du 04/09/2026 (v1-06 §1) rouvre les mécaniques de
//     progression **non comparatives** ; elle ne rouvre pas les mécaniques punitives.

// Les libellés de poste et la date viennent tous deux d'un module pur et partagé : les trois
// mêmes étiquettes étaient déclarées ici ET dans la restitution (`@/types/resultat`), et
// `formatDate` y est maintenant aussi, parce que la relecture d'un bilan doit porter
// exactement la date que cette liste affiche (A3-15).

// Les deux boucles de la brique 4, elles, n'existent que sur cet écran.
const LOOP_LABEL: Record<CheckinRecord['loopType'], string> = {
  commute: 'Domicile-travail',
  extras: 'Loisirs et voyages',
};

/**
 * Combien de points un groupe de saison montre avant « Voir tout » (C2.7, point 5).
 *
 * Cinq et non huit, et surtout **pas en silence** : la borne d'avant coupait la liste sous un
 * compteur global qui annonçait plus de points qu'elle n'en affichait, donc l'en-tête et la liste ne
 * comptaient pas la même chose. Chaque groupe porte désormais son propre total, et le lien dit qu'il
 * y a plus à voir.
 */
const POINTS_VISIBLES = 5;

type LoadState =
  | { status: 'loading' }
  | { status: 'empty' }
  /**
   * Rien n'a pu être lu : on le dit, on ne prétend pas que la personne n'a rien.
   *
   * **Cet état ne s'atteint que depuis `loading`** : `ok` comme `empty` viennent d'une lecture
   * qui a réussi, et l'écran d'erreur plein écran ne vaut que quand rien n'a jamais pu être lu.
   */
  | { status: 'erreur' }
  | {
      status: 'ok';
      history: AssessmentSnapshot[];
      checkins: CheckinRecord[];
      /**
       * Ce que la personne a décidé, saison après saison (C2.7, point 4).
       *
       * **`null` veut dire « pas lu », jamais « rien décidé ».** Un tableau vide sur échec de lecture
       * ferait disparaître la carte, donc affirmerait que la personne n'a jamais rien engagé — la
       * même faute que le tableau vide de A5-2, sur une carte de moins. La lecture est secondaire :
       * son échec ne remplace pas l'écran, il allume la ligne de relecture.
       */
      decisions: DecisionDeSaison[] | null;
    };

export default function Suivi() {
  // **Émis au focus et non au montage** : dans une barre d'onglets, react-navigation garde
  // l'écran monté quand on passe à l'autre. Avec `useTrackView`, l'événement ne partirait
  // qu'à la première ouverture de la session — et le taux de retour, qui est la question
  // même que la navigation pose, deviendrait invisible (v1-11 §2, piège relevé au plan).
  useTrackFocus('suivi_view');

  const theme = useTheme();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  // **Hors du `LoadState`, et pas par commodité** : la dernière relecture peut échouer au-dessus
  // de `ok` comme de `empty`. Porté par la variante `ok` seule, le drapeau obligeait le repli à
  // écraser l'état vide, qui perdait alors son « Faire mon bilan » — la seule entrée du
  // questionnaire sur cet onglet, alors que le questionnaire se remplit très bien hors ligne.
  const [relectureEnEchec, setRelectureEnEchec] = useState(false);

  // Même idiome que l'autre onglet (`plan.tsx`, `refreshKey` / `rafraichir` et le nettoyage de
  // l'effet de chargement), délibérément — on cite les noms et non des numéros de ligne, qui se
  // périment au premier commit suivant : une clé qu'on
  // incrémente, l'effet qui la porte en dépendance, et le garde `cancelled` posé dans son
  // nettoyage. Deux rafraîchissements peuvent se chevaucher — revenir sur l'onglet puis
  // ramener l'app au premier plan en déclenche deux à quelques millisecondes d'écart — et rien
  // ne garantit que les réponses reviennent dans l'ordre où elles sont parties : chaque
  // nouvelle clé démonte l'effet précédent, donc seul le dernier chargement lancé écrit.
  const [cle, setCle] = useState(0);

  // Stable, et ce n'est pas du confort : `useRafraichirAuRetour` relance ce rappel à chaque
  // fois que son effet de focus se réabonne, donc un rappel recréé à chaque rendu ferait
  // tourner chargement et rendu l'un dans l'autre sans fin.
  const rafraichir = useCallback(() => setCle((precedente) => precedente + 1), []);

  // Les saisons dépliées, par libellé — local à l'écran, comme `pistesDepliees` le sera sur le plan.
  // Rien à persister : c'est un geste de lecture, pas une préférence.
  const [groupesDeplies, setGroupesDeplies] = useState<string[]>([]);
  const basculerLeGroupe = (libelle: string) =>
    setGroupesDeplies((deplies) =>
      deplies.includes(libelle) ? deplies.filter((l) => l !== libelle) : [...deplies, libelle]
    );

  useEffect(() => {
    let cancelled = false;

    // Le repli, extrait parce qu'il sert à deux endroits : la lecture qui rend `{ ok: false }` et
    // la promesse qui rejette. Même forme que `plan.tsx`, et pour la même raison — une promesse
    // rejetée laisserait l'écran sur « Chargement de ton suivi… » pour toujours, c'est-à-dire le
    // même mensonge par omission que celui qu'on vient de corriger, en plus muet.
    const echecDeLecture = () => {
      if (cancelled) return;
      setRelectureEnEchec(true);
      // `empty` est dérivé d'une lecture **réussie** au même titre que `ok` : seul `loading`
      // n'a jamais rien su, et c'est le seul que l'écran d'erreur plein écran remplace.
      setState((precedent) => (precedent.status === 'loading' ? { status: 'erreur' } : precedent));
    };

    (async () => {
      let bilans;
      let points;
      let decisions;
      try {
        [bilans, points, decisions] = await Promise.all([
          loadAssessmentHistory(),
          loadAnsweredCheckins(),
          loadDecisionsEngagees(),
        ]);
      } catch (erreur) {
        console.error('Le suivi n’a pas pu être relu :', erreur);
        echecDeLecture();
        return;
      }

      if (cancelled) return;

      // **Une lecture en échec n'est pas un historique vide** (A5-2). Les deux fonctions
      // rendaient `[]` sur erreur et cet écran le traduisait en « Ton suivi commence au premier
      // bilan » : hors ligne, quelqu'un qui a douze bilans lisait que le sien n'existe pas — et
      // la lecture a lieu à chaque retour d'onglet et à chaque retour au premier plan, plus
      // seulement au montage. Elles disent maintenant laquelle des deux choses est vraie, et
      // c'est ici qu'on en tire deux états distincts.
      //
      // Un écran déjà rempli n'est jamais remplacé par l'erreur : ce qu'il montre reste vrai,
      // seulement plus tout à fait à jour. Il le dit en une ligne au lieu de tout effacer — le
      // retour au premier plan hors ligne, sinon, balaierait à chaque fois un suivi juste.
      if (!bilans.ok || !points.ok) {
        echecDeLecture();
        return;
      }

      // On ne repasse pas par « Chargement… » en revenant : l'écran garde ce qu'il montrait
      // jusqu'à l'arrivée des données.
      setState(
        bilans.data.length === 0
          ? { status: 'empty' }
          : {
              status: 'ok',
              history: bilans.data,
              checkins: points.data,
              // Lecture secondaire : son échec laisse `null` — donc pas de carte plutôt qu'une carte
              // vide — et se dit dans la ligne de relecture, comme sur le plan.
              decisions: decisions.ok ? decisions.data : null,
            }
      );
      setRelectureEnEchec(!decisions.ok);
    })();

    return () => {
      // Chargement dépassé ou écran démonté : on le périme plutôt que de le laisser écrire.
      cancelled = true;
    };
  }, [cle]);

  // **Le « Oui » donné sur le plan et le bilan qu'on vient de refaire apparaissent ici, et
  // c'est le moment de renforcement le plus fort du produit.** Sans ça l'écran ne chargeait
  // qu'une fois par lancement : react-navigation le garde monté d'un onglet à l'autre, et
  // l'app survit à l'arrière-plan (règle posée après le test d'appareil du 09/09/2026).
  useRafraichirAuRetour(rafraichir);

  // **Le seul retour visible du bouton de l'écran d'erreur.** `rafraichir` n'incrémente qu'une
  // clé : l'effet relit, échoue, et le repli laisse rigoureusement le même écran — hors ligne,
  // donc dans le seul cas où cet écran existe, le bouton a l'air mort. Repasser par
  // « Chargement… » dit que le geste a été pris. Surtout pas dans `rafraichir` lui-même, qui
  // est aussi le rappel de `useRafraichirAuRetour` : il ferait clignoter « Chargement de ton
  // suivi… » à chaque retour au premier plan.
  const reessayerDepuisLErreur = () => {
    setState({ status: 'loading' });
    rafraichir();
  };

  // Ce qui est affiché reste vrai, mais date. La ligne vaut au-dessus des deux écrans issus
  // d'une lecture réussie — le suivi et l'état vide — et le lien relance la même lecture que le
  // retour sur l'onglet.
  const banniereRelecture = (centree = false) =>
    relectureEnEchec ? (
      <View style={[styles.relecture, centree && styles.relectureCentree]}>
        <MessageInline message="Ton suivi n’a pas pu être relu à l’instant : ce que tu vois peut avoir changé depuis. Vérifie ta connexion." />
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
            <ThemedText themeColor="textSecondary">Chargement de ton suivi…</ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // L'écran ne sait rien : il le dit, et il ne propose surtout pas de faire un bilan — c'est
  // l'invitation qui transforme « je n'ai pas pu lire » en « tu n'as rien ».
  if (state.status === 'erreur') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <BandeHaute />
          <View style={styles.centered}>
            <MessageInline
              message="Ton suivi n’a pas pu être relu. Vérifie ta connexion."
              style={styles.erreurTexte}
            />
            <Button title="Réessayer" onPress={reessayerDepuisLErreur} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (state.status === 'empty') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <BandeHaute />
          <View style={styles.emptySafeArea}>
            {banniereRelecture(true)}
            <EmptyStateIllustration style={styles.emptyIllustration} />
            <ThemedText type="screenTitle">
              Ton suivi commence au premier bilan
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
              C’est lui qui donne le point de départ. Ensuite, tu verras ton empreinte évoluer
              dans le temps. Environ 5 minutes.
            </ThemedText>
            <Button title="Faire mon bilan" onPress={() => router.push('/bilan')} style={styles.emptyButton} />
            {/* **Le même lien que sur l'état sans bilan du plan** (C2.11) : un appareil neuf n'a que
                ces deux écrans, et l'un comme l'autre n'offrait que « Faire mon bilan » — donc
                l'invitation à refaire de zéro ce que la personne a déjà fait ailleurs. Son bilan,
                son plan et ses points sont rattachés à son compte, pas à l'appareil. */}
            <TextLink
              label="J’ai déjà un compte"
              onPress={() =>
                router.push({ pathname: '/connexion/retrouver', params: { source: 'suivi_vide' } })
              }
            />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const { history, checkins, decisions } = state;
  const latest = history[history.length - 1];
  const previous = history.length > 1 ? history[history.length - 2] : null;
  const first = history[0];

  // Échelle commune à toutes les barres : la comparaison n'a de sens que si les bilans
  // partagent le même repère.
  const maxKg = Math.max(...history.map((snapshot) => snapshot.totalKg), 1);
  // `reponse === 'oui'` et non une valeur truthy : depuis C2.4 il y a trois réponses, et
  // « pas de trajet » n'est pas un changement (elle compte en revanche dans « N points de suivi »,
  // ci-dessous — on compte les fois où la personne a répondu, jamais celles qu'elle a laissées
  // passer).
  const answeredYes = checkins.filter((checkin) => checkin.reponse === 'oui').length;
  // **Deux régimes et non un booléen** (C6.3, `v1-19` postulats 3 et 4) : on propose à la première
  // bascule de saison, on ré-insiste à la deuxième — et la seconde phrase dit **pourquoi**, faute
  // de quoi ce ne serait qu'un rappel de plus, ce que la spec §7 interdit.
  const regimeRebilan = regimeDeRebilan(latest.submittedAt);
  const phraseRebilan = phraseDuRegimeDeRebilan(regimeRebilan);
  const titreRebilan = titreDuRebilan(regimeRebilan, daysSince(latest.submittedAt));
  // Les points par saison (C2.7, point 5) : l'en-tête d'un groupe porte son **vrai** total, et la
  // troncature devient visible et réversible. La liste était coupée à huit en silence sous un
  // compteur global qui en annonçait davantage.
  const groupes = pointsParSaison(checkins);
  // L'écart par poste : il n'a de sens qu'avec un bilan précédent, et il se compare poste à poste.
  const ecarts = previous ? ecartParPoste(previous, latest) : null;
  // **« Je vois la différence. » ne se dit que sur une baisse réelle** : au-dessus d'une hausse, ou
  // d'un écart qui tient dans l'imprécision des facteurs, la phrase serait fausse — et c'est le
  // genre de fausseté qu'on ne remarque que quand elle s'adresse à soi.
  const baisse = previous !== null && estUneBaisse(previous.totalKg, latest.totalKg);
  // Le repère 2050 ne se nomme qu'en dessous de la moyenne française, exactement comme sur la
  // restitution : même dérivation, donc les deux écrans ne peuvent pas se contredire là-dessus.
  //
  // **Ce que cet écran fait et que la restitution ne fait pas, et c'est assumé** (14/09/2026) : il
  // nomme la moyenne française dans sa phrase même pour un profil en mobilité contrainte, à qui
  // C3.1 retire la barre de comparaison. Les deux ne portent pas la même chose — la barre est un
  // score, avec un bon et un mauvais côté, et c'est le mauvais côté qui n'a rien à dire à quelqu'un
  // qui vient de déclarer n'avoir aucun transport en commun. La phrase, elle, ne se rend **que** sous
  // la moyenne, donc uniquement du bon côté : elle informe au lieu de classer. Faire remonter
  // `mobility_constrained` jusqu'ici pour la taire reviendrait à cacher à ce profil la seule
  // comparaison qui lui soit favorable.
  const horizon2050 = showsTarget2050(latest.totalKg, FRANCE_AVERAGE_TRANSPORT_T * 1000);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Hors du ScrollView : la bande ne défile pas (cf. bande-haute.tsx). */}
        <BandeHaute />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Le dire coûte une ligne, et c'est la seule façon de ne pas laisser croire qu'un
              « Oui » donné à l'instant a été enregistré ici. */}
          {banniereRelecture()}
          <View style={styles.intro}>
            <ThemedText type="screenTitle">
              Ton suivi
            </ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              {history.length === 1
                ? 'Ton point de départ. Refais ton bilan quand tes habitudes changent : tu verras l’écart ici.'
                : `${history.length} bilans depuis le ${formatDate(first.submittedAt)}.`}
            </ThemedText>
          </View>

          {/* Évolution de l'empreinte — le cœur de l'écran. Chaque bilan est un point de
              l'histoire de la personne, jamais un classement. */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText weight={600} type="small">
              Ton empreinte transport, bilan après bilan
            </ThemedText>
            <View style={styles.bars}>
              {history.map((snapshot, index) => (
                // Chaque bilan s'ouvre en relecture (v1-11 flux 3) : l'écran de résultat prend
                // déjà un identifiant, seul le lien manquait — une entrée de l'historique
                // qu'on ne peut pas ouvrir est une impasse.
                //
                // `Pressable` nu et non `TextLink` : la cible porte trois textes et une barre,
                // et le libellé annoncé doit les recomposer (cf. CLAUDE.md).
                <Pressable
                  key={snapshot.assessmentId}
                  onPress={() =>
                    router.push({ pathname: '/suivi/bilan', params: { id: snapshot.assessmentId } })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Bilan du ${formatDate(snapshot.submittedAt)}, ${formatTonnes(snapshot.totalKg)}`}
                  accessibilityHint="Ouvre le détail de ce bilan"
                  style={styles.historyRow}
                >
                  <View style={styles.historyHeader}>
                    <ThemedText
                      type="small"
                      weight={index === history.length - 1 ? 600 : 400}
                      themeColor={index === history.length - 1 ? 'text' : 'textSecondary'}
                    >
                      {formatDate(snapshot.submittedAt)}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      weight={index === history.length - 1 ? 600 : 400}
                      themeColor={index === history.length - 1 ? 'text' : 'textSecondary'}
                    >
                      {formatTonnes(snapshot.totalKg)}
                    </ThemedText>
                  </View>
                  <View style={[styles.barRail, { backgroundColor: theme.border }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max((snapshot.totalKg / maxKg) * 100, 3)}%`,
                          backgroundColor: index === history.length - 1 ? theme.accent : theme.accentMuted,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText type="small" themeColor="textTertiary">
                    Poste principal : {POSTE_LABEL[snapshot.dominantPoste] ?? snapshot.dominantLabel}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            {previous && (
              <ThemedText type="small" themeColor="textSecondary">
                {variationNote(previous.totalKg, latest.totalKg)}
              </ThemedText>
            )}
            {/* **L'horizon 2050, en mots et seulement sous la moyenne** (C2.7, point 7). Le suivi ne
                le mentionnait nulle part, alors que c'est le seul écran qui montre une trajectoire.
                Au-dessus de la moyenne, l'écart est un gouffre que rien ne rattrape et le nommer
                découragerait (`showsTarget2050`) ; en dessous, il tombe à un facteur deux à quatre et
                redevient crédible. En mots, sans barre et **sans compter les paliers restants** — la
                clause de fin est celle de `palierNote`, pour que les deux écrans parlent d'une voix. */}
            {horizon2050 && (
              <ThemedText type="small" themeColor="textTertiary">
                Tu es sous la moyenne française : à partir de là, le repère 2050 se joue palier après
                palier.
              </ThemedText>
            )}
          </ThemedView>

          {/* **L'écart par poste** (C2.7, point 3, planche D1). Le suivi ne montrait que le total :
              un effort tenu tout l'hiver sur le trajet quotidien disparaissait derrière un vol de
              l'été, et rien ne le disait. La comparaison est **poste à poste** — le poste dominant
              peut changer d'un bilan à l'autre, et c'est le plus souvent une réussite. */}
          {ecarts !== null && ecarts.length > 0 && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText weight={600} type="small">
                Par poste
              </ThemedText>
              <EcartParPoste ecarts={ecarts} />
            </ThemedView>
          )}

          {/* **Ce que la personne a décidé, saison après saison** (C2.7, point 4). Le suivi ne lisait
              jamais `plan_cycles` ni `plan_actions` : le seul choix personnel que le produit demande
              — une action, des jours — ne laissait aucune trace passé la saison.

              **Jamais un statut tenu / pas tenu**, et jamais un chiffre présenté comme un résultat
              obtenu : le produit ne sait pas si l'action a été menée, seulement ce que la personne a
              répondu aux points, qui vivent dans leur propre carte. C'est une liste de décisions.

              `decisions === null` veut dire « pas lu » : la carte ne s'affiche pas, plutôt que
              d'affirmer que rien n'a jamais été engagé. */}
          {decisions !== null && decisions.length > 0 && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText weight={600} type="small">
                Ce que tu as décidé, saison après saison
              </ThemedText>
              <View style={styles.decisions}>
                {decisions.map((decision, index) => (
                  <View
                    key={decision.cycleId}
                    style={[
                      styles.decisionRow,
                      index > 0 && { borderTopWidth: 1, borderTopColor: theme.border },
                    ]}
                  >
                    <ThemedText type="small" themeColor="textSecondary">
                      {decision.periodLabel}
                    </ThemedText>
                    <ThemedText type="small" weight={600}>
                      {decision.actionText}
                    </ThemedText>
                    {formatIntention(decision.intentionDays, decision.intentionTiming) && (
                      <ThemedText type="small" themeColor="textTertiary">
                        {formatIntention(decision.intentionDays, decision.intentionTiming)}
                      </ThemedText>
                    )}
                  </View>
                ))}
              </View>
            </ThemedView>
          )}

          {/* Période calme : la personne a des bilans mais aucun point de suivi répondu. Jusqu'ici
              l'écran ne montrait rien du tout à cet endroit, ce qui se lit comme un manque —
              alors que c'est exactement le contraire qu'il faut dire. Yeux clos, registre
              paisible (canvas docs/design/v1-08-mascotte, artboard « États calmes »).

              La maquette annonçait « ton prochain point arrive lundi » : on ne le dit pas, la
              cadence dépend de la boucle (hebdomadaire pour le domicile-travail, mensuelle pour
              les extras) et une date fausse serait pire que pas de date. C'est ce qui distingue
              cette carte de celle du plan, qui *peut* nommer le jour parce qu'elle sait de
              quelle boucle il s'agit (v1-12 §6.2). */}
          {checkins.length === 0 && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <View style={styles.checkinsHeader}>
                <Mascot mood="resting" size={40} />
                <View style={styles.checkinsHeaderText}>
                  <ThemedText weight={600}>{RAMILLE.suiviSansPoint}</ThemedText>
                </View>
              </View>
              <ThemedText type="small" themeColor="textTertiary">
                Une période sans réponse ne se voit pas ici : on ne compte que les fois où tu as
                répondu, jamais celles où tu as laissé passer.
              </ThemedText>
            </ThemedView>
          )}

          {/* **Ce que la personne a fait, jamais ce qu'elle a manqué** — et depuis C2.7, groupé par
              saison (point 5, planche D2).

              Trois choses réparées ici. La liste était coupée à **huit en silence**, sous un
              compteur global qui en annonçait davantage : chaque groupe porte maintenant son vrai
              total, et la troncature est visible et réversible. L'écran affirmait « Tu réponds
              régulièrement : c'est déjà ça qui compte. » **dès le premier point** — une phrase
              fausse, et condescendante quand elle est vraie. Et une mascotte souriante trônait
              au-dessus de ce qui peut être une colonne de « Pas cette fois » : le canvas l'a
              retirée, elle revient en bas de l'écran, `calm`, et seulement quand il y a une
              différence à voir.

              **Les trois libellés sont au même niveau typographique** : un « Changement fait » en
              accent au-dessus d'un « Pas cette fois » en tertiaire classait les réponses, alors que
              la troisième n'est pas un échec et que la seconde n'en est pas un non plus. La
              reconnaissance vit dans le compteur et dans le mot de Ramille, pas dans la couleur
              d'une ligne. */}
          {checkins.length > 0 && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText weight={600} type="small">
                Tes points
              </ThemedText>
              <ThemedText weight={600}>
                {answeredYes === 0
                  ? `${checkins.length} point${checkins.length > 1 ? 's' : ''} répondu${checkins.length > 1 ? 's' : ''}`
                  : `${answeredYes} fois où tu as changé quelque chose`}
              </ThemedText>
              {/* Voix produit, et une attribution plutôt qu'un encouragement : ce n'est pas le
                  produit qui a fait le trajet. */}
              {answeredYes > 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  Ces fois-là, c’est toi qui as choisi le trajet.
                </ThemedText>
              )}
              {groupes.map((groupe) => {
                const deplie = groupesDeplies.includes(groupe.libelle);
                const visibles = deplie ? groupe.points : groupe.points.slice(0, POINTS_VISIBLES);
                return (
                  <View key={groupe.libelle} style={styles.groupe}>
                    <View style={styles.groupeEntete}>
                      <ThemedText type="small" weight={600}>
                        {groupe.libelle}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textTertiary">
                        {groupe.points.length} point{groupe.points.length > 1 ? 's' : ''}
                      </ThemedText>
                    </View>
                    <View style={styles.checkinList}>
                      {visibles.map((checkin) => (
                        <View key={checkin.id} style={styles.checkinRow}>
                          <ThemedText
                            type="small"
                            themeColor="textSecondary"
                            style={styles.checkinPeriod}
                          >
                            {LOOP_LABEL[checkin.loopType]} ·{' '}
                            {libellePeriodeAffiche(checkin.periodLabel, checkin.periodStart)}
                          </ThemedText>
                          <ThemedText type="small" weight={600} themeColor="textSecondary">
                            {libelleDeReponse(checkin.reponse)}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                    {groupe.points.length > POINTS_VISIBLES && (
                      <TextLink
                        label={deplie ? 'Replier' : 'Voir tout'}
                        onPress={() => basculerLeGroupe(groupe.libelle)}
                        type="small"
                        weight={600}
                        themeColor="accentText"
                      />
                    )}
                  </View>
                );
              })}
            </ThemedView>
          )}

          {/* **Elle ne se dit que sur une baisse réelle** (C2.7, point 1). Posée en bas et non au
              sommet de la carte des points : elle constate un écart entre deux bilans, pas une
              colonne de réponses — et jamais collée au total, qui est un chiffre lourd. Elle ne dit
              ni le pourcentage ni les kilos ; les deux sont au-dessus, en voix produit. */}
          {baisse && (
            <RamilleDit ligne={RAMILLE.suiviDifference} mood="calm" size={36} themeColor="text" />
          )}

          {phraseRebilan !== null && (
            <ThemedView type="backgroundElement" style={styles.card}>
              {/* **Le titre dit ce qui a déclenché la carte, et pas toujours l'âge** (contre-lecture
                  du 19/09/2026). Il disait l'âge en toutes circonstances, par la dérivation partagée
                  avec le plan — ce qui était juste tant que le déclencheur tenait à 182 jours. Depuis
                  que C6.3 compte en **bascules de saison**, un bilan de la veille d'une bascule se
                  propose : le titre annonçait alors « Ton dernier bilan a moins d'un mois » au-dessus
                  d'une invitation à en refaire un. `titreDuRebilan` donne à chaque régime ce qu'il
                  peut dire de vrai, et l'âge ne revient qu'à partir de deux bascules, où il vaut au
                  moins trois mois. */}
              <ThemedText weight={600} type="small">
                {titreRebilan}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {phraseRebilan}
              </ThemedText>
              {/* **« Refaire » laissait croire à un écrasement** (C6.1, `v1-19` D1). Aucun bilan
                  n'est jamais effacé : chaque soumission est une ligne de plus, l'historique
                  ci-dessus les montre toutes, et `emission_factor(mode_id, date)` garde chacune
                  reproductible aux facteurs de sa date. Le texte juste au-dessus disait déjà la
                  bonne chose — une actualisation — pendant que le bouton disait l'inverse, à deux
                  lignes d'écart. */}
              <Button title="Faire un nouveau bilan" onPress={() => router.push('/bilan')} />
            </ThemedView>
          )}

        </ScrollView>

        {/* **Le pied a porté un lien vers le questionnaire, il n'en porte plus** (C6.1,
            `v1-19` D2). Il ne se rendait que sous `!suggestRebilan` : le produit proposait donc un
            nouveau bilan **précisément quand il avait décidé de ne pas le suggérer**, et les deux
            régimes se complétaient pour qu'il y ait toujours une offre à l'écran. Ce n'était pas un
            rythme, c'était une offre permanente sous deux formes.

            **Le rendre inconditionnel n'aurait rien réglé** — c'est l'erreur qu'a rattrapée la
            contre-lecture de ce chantier : le lien aurait toujours été là, et deux fois quand la
            carte s'affiche. Ce qui manquait n'était pas la symétrie, c'était le silence : le suivi
            se regarde sans qu'on y propose quoi que ce soit, et l'insistance vient de la carte
            ci-dessus **quand elle a une raison de venir**.

            **Le chemin, lui, ne disparaît pas** (`v1-19` D6 n'impose rien) : la restitution d'un
            bilan porte « Faire un nouveau bilan » en permanence, à un toucher d'ici, et c'est sa
            place — on y a justement un bilan sous les yeux. Le canal de retour et le compte avaient
            déjà rejoint l'écran « Toi » (v1-11 §2.5) ; ce lien parti, le bandeau n'a plus rien à
            porter et s'en va avec, styles compris. */}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  // Largeur maximale du contenu, comme les pages légales et les écrans de compte (A5-21).
  // Sur un écran large, les barres de 14 px s'étiraient sur toute la fenêtre et les lignes de
  // point de suivi mettaient la période et le « Oui » aux deux extrémités. Le pied, hors du
  // `ScrollView`, n'en a pas besoin : il ne porte qu'un lien déjà centré.
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  // Le corps d'un état plein écran, comme les états vides voisins : `MessageInline` rend du
  // « small » par défaut, ce qui se lit comme une note sous un bouton — pas comme la seule
  // phrase de l'écran.
  //
  // 16/24, c'est la taille du `default` de `ThemedText`, pas `TypeScale.body` (15/22) : deux
  // valeurs nues, recopiées à l'identique sur l'onglet voisin (`plan.tsx`). L'endroit où les
  // factoriser est un `type` sur `MessageInline`, qui n'appartient pas à ce chantier — le
  // prochain passage visuel saura quoi faire de ces deux lignes.
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
  intro: { gap: Spacing.two },
  card: { borderRadius: 20, padding: 20, gap: 14 },
  bars: { gap: Spacing.three },
  historyRow: { gap: 6 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  barRail: { height: 14, borderRadius: 7, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 7 },
  checkinsHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  checkinsHeaderText: { flex: 1, gap: 2 },
  // Les décisions : une ligne par saison, séparées par un filet — pas une carte chacune, la liste
  // se lit d'un bloc.
  decisions: { gap: 0 },
  decisionRow: { paddingVertical: Spacing.two, gap: 2 },
  // Un groupe de points : son en-tête, sa liste, son lien.
  groupe: { gap: Spacing.two, marginTop: Spacing.two },
  groupeEntete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: Spacing.two },
  checkinList: { gap: Spacing.two },
  checkinRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  checkinPeriod: { flex: 1 },
  emptySafeArea: { flex: 1, padding: Spacing.four, justifyContent: 'center', gap: Spacing.three },
  emptyIllustration: { height: 140 },
  emptyBody: { fontSize: 16, lineHeight: 24 },
  emptyButton: { marginTop: 12 },
});
