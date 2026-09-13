import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BandeHaute } from '@/components/bande-haute';
import { Button } from '@/components/button';
import { EmptyStateIllustration } from '@/components/illustrations/empty-state-illustration';
import { Mascot } from '@/components/mascot';
import { MessageInline } from '@/components/message-inline';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useRafraichirAuRetour } from '@/hooks/use-rafraichir-au-retour';
import { useTheme } from '@/hooks/use-theme';
import { useTrackFocus } from '@/hooks/use-track-focus';
import { loadAnsweredCheckins, loadAssessmentHistory } from '@/lib/bilan-history';
import { POSTE_LABEL } from '@/types/resultat';
import {
  daysSince,
  formatDate,
  libelleDeReponse,
  libellePeriodeAffiche,
  REBILAN_SUGGESTION_DAYS,
  ancienneteEnMots,
  variationNote,
  type AssessmentSnapshot,
  type CheckinRecord,
} from '@/types/suivi';
import { formatTonnes } from '@/lib/format';
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

  // Même idiome que l'autre onglet (`plan.tsx:134-135, 217-218`), délibérément : une clé qu'on
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
      try {
        [bilans, points] = await Promise.all([loadAssessmentHistory(), loadAnsweredCheckins()]);
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
          : { status: 'ok', history: bilans.data, checkins: points.data }
      );
      setRelectureEnEchec(false);
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
              onPress={() => router.push('/connexion/retrouver')}
            />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const { history, checkins } = state;
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
  const daysSinceLatest = daysSince(latest.submittedAt);
  const suggestRebilan = daysSinceLatest >= REBILAN_SUGGESTION_DAYS;

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
          </ThemedView>

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

          {/* Ce que la personne a fait, jamais ce qu'elle a manqué. */}
          {checkins.length > 0 && (
            <ThemedView type="backgroundSelected" style={styles.card}>
              <View style={styles.checkinsHeader}>
                <Mascot mood="happy" size={40} />
                <View style={styles.checkinsHeaderText}>
                  <ThemedText weight={600}>
                    {answeredYes === 0
                      ? `${checkins.length} point${checkins.length > 1 ? 's' : ''} de suivi`
                      : `${answeredYes} fois où tu as changé quelque chose`}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {answeredYes === 0
                      ? 'Tu réponds régulièrement : c’est déjà ça qui compte.'
                      : 'Chaque fois compte, même isolée.'}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.checkinList}>
                {checkins.slice(0, 8).map((checkin) => (
                  <View key={checkin.id} style={styles.checkinRow}>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.checkinPeriod}>
                      {LOOP_LABEL[checkin.loopType]} ·{' '}
                      {libellePeriodeAffiche(checkin.periodLabel, checkin.periodStart)}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      weight={600}
                      themeColor={checkin.reponse === 'oui' ? 'accentText' : 'textTertiary'}
                    >
                      {libelleDeReponse(checkin.reponse)}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </ThemedView>
          )}

          {suggestRebilan && (
            <ThemedView type="backgroundElement" style={styles.card}>
              {/* **L'âge par la dérivation partagée, en mots** (C2.8). Le mois se calculait ici,
                  en chiffres, tandis que le plan disait « Ton bilan date d'un moment » : deux écrans
                  qui comptent chacun de leur côté finissent par annoncer six mois d'un côté et cinq
                  de l'autre. En mots parce que c'est un ordre de grandeur, pas une mesure. */}
              <ThemedText weight={600} type="small">
                Ton dernier bilan a {ancienneteEnMots(daysSinceLatest)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Le refaire prend moins de temps que la première fois : tes réponses sont
                pré-remplies, tu ne modifies que ce qui a changé.
              </ThemedText>
              <Button title="Refaire mon bilan" onPress={() => router.push('/bilan')} />
            </ThemedView>
          )}

        </ScrollView>

        {/* Le bandeau ne se rend que s'il porte quelque chose : la condition vivait à
            l'intérieur, et quand la proposition de re-bilan s'affichait plus haut, il restait
            une bande vide de 48 px collée en bas. Et il ne porte plus que sa hauteur, avec un
            filet plutôt qu'une rupture — même traitement que le pied de `/suivi/bilan`.
            Le canal de retour et le compte ont rejoint l'écran « Toi » (v1-11 §2.5) : le
            suivi retrouve son sujet — les bilans et les points répondus. */}
        {!suggestRebilan && (
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TextLink
              label="Refaire mon bilan"
              onPress={() => router.push('/bilan')}
              role="link"
              type="small"
              weight={600}
              themeColor="accentText"
              style={styles.footerLink}
            />
          </View>
        )}
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
  checkinList: { gap: Spacing.two },
  checkinRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  checkinPeriod: { flex: 1 },
  footer: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  footerLink: { textAlign: 'center' },
  emptySafeArea: { flex: 1, padding: Spacing.four, justifyContent: 'center', gap: Spacing.three },
  emptyIllustration: { height: 140 },
  emptyBody: { fontSize: 16, lineHeight: 24 },
  emptyButton: { marginTop: 12 },
});
