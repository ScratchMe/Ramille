import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContexteDesAncres, type AncreDuChamp, type AncresDeLEtape } from '@/components/bilan/ancre-du-champ';
import { Button } from '@/components/button';
import { ChampsDeContexte } from '@/components/bilan/champs-de-contexte';
import { MessageInline } from '@/components/message-inline';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useChargementVisible } from '@/hooks/use-apres-un-delai';
import { donnerLeFocus } from '@/lib/focus';
import { revenirOu } from '@/lib/navigation';
import {
  enregistrerLeContexte,
  lireLeContexteCourant,
  type ContexteCourant,
} from '@/lib/contexte';
import {
  EMPTY_BILAN_ANSWERS,
  manqueDeLEtape,
  RIEN_HORS_COLONNES,
  teletravailSePose,
  type ChampDuBilan,
} from '@/types/bilan';
import {
  contexteAChange,
  contexteEstComplet,
  phraseDuCalculDuContexte,
  type ChoixDeContexte,
} from '@/types/contexte';
import { decalagePourMontrer } from '@/types/demande';
import { phraseDeLaLectureEnEchec, type GenreDEchec } from '@/types/lecture-en-echec';

/**
 * Corriger son contexte de mobilité sans refaire de bilan (C6.4, #232, `v1-19` D5).
 *
 * **Le défaut que cet écran ferme.** « Modifier ces réponses », sur l'encart du plan, rouvrait le
 * questionnaire à l'étape « Contexte » — et en sortir **resoumettait un bilan entier** (constat
 * 07.4 de la recette du 18/09/2026). Corriger « j'ai déménagé en zone rurale » n'est pas refaire un
 * bilan : ça ne change rien à ce que la personne déclare de ses trajets, et ça ne devrait pas
 * ajouter une entrée dans son suivi.
 *
 * **Hors du groupe `(tabs)`, et c'est la règle qui décide** : une route posée dans le groupe se
 * voit donner un onglet, et le produit n'en a que deux. C'est un détour, comme `/compte` et
 * `/feedback`.
 *
 * **Ce que l'enregistrement fait vraiment** — mesuré sur la base le 19/09/2026, pas déduit : il
 * remet `assessment_results` d'accord avec les réponses (donc `mobility_constrained`, et le
 * résiduel des sorties rares) puis reconstruit le plan de la période courante. `submitted_at` ne
 * bouge pas, aucune ligne n'est ajoutée à `assessments`. Sur un profil réel, passer en « rural,
 * pas de transports en commun » a fait tomber le plan de onze à huit actions — les trois écartées
 * étant celles qui supposaient un métro. (Depuis `v1-34`, le 03/10/2026, c'est la réponse « Rien de
 * tout ça » qui les écarte, et la zone n'en écarte plus aucune.)
 *
 * **Et il peut coûter l'action engagée.** Si le gabarit suivi n'est plus proposé, le serveur
 * l'archive en `contexte`, et l'encart orphelin du plan l'annonce ensuite avec cette raison — d'où
 * la phrase de pied, qui prévient **avant**. On ne refuse pas pour autant : le produit annonce, il
 * ne marchande pas (le raisonnement de la feuille de re-bilan, C6.2).
 */

type Etat =
  // `relance` : ce chargement est un « Réessayer » de la personne, et il se dit tout de suite.
  | { statut: 'chargement'; relance?: true }
  // Le genre de l'échec (D19, 01/10/2026) : la phrase ne parle de connexion qu'hors ligne.
  | { statut: 'erreur'; genre: GenreDEchec }
  | { statut: 'sans_bilan' }
  | { statut: 'pret'; depart: ContexteCourant };

export default function Contexte() {
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });
  const [choix, setChoix] = useState<ChoixDeContexte | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Le verrou vit dans une `ref` et non dans l'état d'affichage, qui ne vaut `true` qu'au rendu
  // suivant — la leçon de la double soumission du bilan (C1.1).
  const enCours = useRef(false);

  useEffect(() => {
    let annule = false;

    void (async () => {
      const lecture = await lireLeContexteCourant();
      if (annule) return;

      if (lecture.etat === 'ok') {
        setEtat({ statut: 'pret', depart: lecture.contexte });
        setChoix(lecture.contexte.choix);
        return;
      }
      setEtat(lecture.etat === 'sans_bilan' ? { statut: 'sans_bilan' } : { statut: 'erreur', genre: lecture.genre });
    })();

    return () => {
      annule = true;
    };
  }, []);

  const modifier = useCallback((patch: Partial<ChoixDeContexte>) => {
    setMessage(null);
    setChoix((courant) => (courant === null ? courant : { ...courant, ...patch }));
  }, []);

  /**
   * **« Chargement… » comme sur les onglets, et un « Retour » atteignable pendant** (audit P-13,
   * 01/10/2026). L'écran rendait une roue seule, tout de suite, sans un mot ni une sortie : hors
   * ligne, quelques secondes muettes et rien à toucher. La phrase attend `DELAI_AVANT_CHARGEMENT`
   * pour ne pas clignoter avant un contenu rapide — sauf après « Réessayer », où elle est la seule
   * preuve que le geste a été pris (`useChargementVisible`, `FRONT.md` §1.2) ; le « Retour », lui,
   * est là d'emblée.
   */
  const chargementVisible = useChargementVisible(
    etat.statut === 'chargement',
    etat.statut === 'chargement' && etat.relance === true
  );

  /**
   * **Les ancres des quatre questions, que l'écran fournit lui-même** (audit P-13) — celles que
   * `ChampsDeContexte` enregistrait déjà, et que rien ne lisait hors du questionnaire. « Enregistrer »
   * sur un contexte incomplet y mène, comme le « Suivant » en attente d'une étape (`StepShell`).
   */
  const ancres = useRef(new Map<ChampDuBilan, AncreDuChamp>());
  const enregistrerLAncre = useCallback((champ: ChampDuBilan, ancre: AncreDuChamp) => {
    ancres.current.set(champ, ancre);
    return () => {
      if (ancres.current.get(champ) === ancre) ancres.current.delete(champ);
    };
  }, []);
  /**
   * La demande de ce qui manque, posée au toucher d'« Enregistrer » sur un contexte incomplet. Elle
   * marque l'intitulé et dit la ligne tant qu'il manque quelque chose, et retombe **au rendu** dès que
   * le contexte est complet — la règle de la demande de `StepShell`.
   */
  const [demande, setDemande] = useState(false);

  /** Le défilement de la zone, suivi pour mener à ce qui manque — celui de la plateforme. */
  const animationsReduites = useReducedMotion();
  const defilement = useRef<ScrollView>(null);
  const zone = useRef({ decalage: 0, hauteur: 0 });
  const surDefilement = useCallback((evenement: NativeSyntheticEvent<NativeScrollEvent>) => {
    zone.current.decalage = evenement.nativeEvent.contentOffset.y;
  }, []);

  if (etat.statut === 'chargement') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.vide}>
            {chargementVisible && (
              <ThemedText type="body" themeColor="textSecondary">
                Chargement de ton contexte…
              </ThemedText>
            )}
            {/* Le « Retour » de l'écran d'échec, à la même place : la lecture ne dit encore rien du
                bilan, donc le repli sans pile est la racine, comme là-bas. */}
            <TextLink
              label="Retour"
              apparence="action"
              onPress={() => revenirOu('/')}
              role="link"
            />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (etat.statut === 'erreur' || etat.statut === 'sans_bilan') {
    // **Deux états, deux phrases, et surtout deux vérités différentes.** Une lecture en échec ne
    // dit rien des données de la personne (C1.4) : on parle de la lecture, jamais de son bilan — et de
    // la connexion seulement hors ligne (D19, 01/10/2026, `phraseDeLaLectureEnEchec`). L'absence de
    // bilan, elle, est un fait connu, et la porte qui va avec est le questionnaire.
    const panne = etat.statut === 'erreur' ? etat.genre : null;
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.vide}>
            <ThemedText type="screenTitle">Ton contexte de mobilité</ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              {panne !== null
                ? phraseDeLaLectureEnEchec('contexte', panne)
                : 'Ces réponses font partie de ton bilan. Tu pourras les corriger ici une fois ton premier bilan fait.'}
            </ThemedText>
            <Button
              title={panne !== null ? 'Réessayer' : 'Faire mon bilan'}
              onPress={() => {
                if (panne !== null) {
                  setEtat({ statut: 'chargement', relance: true });
                  void lireLeContexteCourant().then((lecture) => {
                    if (lecture.etat === 'ok') {
                      setEtat({ statut: 'pret', depart: lecture.contexte });
                      setChoix(lecture.contexte.choix);
                      return;
                    }
                    setEtat(
                      lecture.etat === 'sans_bilan' ? { statut: 'sans_bilan' } : { statut: 'erreur', genre: lecture.genre }
                    );
                  });
                  return;
                }
                router.push('/bilan');
              }}
            />
            {/* `link` : il quitte l'écran, comme les « Retour » de « Toi », des pages légales et
                des pistes (contre-lecture du 25/09/2026). Sans pile, le repli est la racine et
                non le plan : sans bilan, elle mène à l'onboarding, là où le plan n'aurait qu'un
                état vide à montrer (contre-lecture du 28/09/2026). */}
            <TextLink
              label="Retour"
              apparence="action"
              onPress={() => revenirOu('/')}
              role="link"
            />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const courant = choix ?? etat.depart.choix;
  const sePose = teletravailSePose(etat.depart.trajet);
  const complet = contexteEstComplet(courant, sePose);
  const aChange = contexteAChange(etat.depart.choix, courant);

  // Ce qui manque, nommé par la phrase que l'étape « Contexte » du questionnaire dit déjà — les
  // mêmes quatre questions, le même ordre (`manqueDeLEtape`). Le télétravail s'y gouverne par les
  // mêmes deux colonnes de trajet que `contexteEstComplet` : le prédicat ne se recopie pas.
  const manque = complet
    ? null
    : // L'étape du contexte ne lit pas les longs trajets : rien hors des colonnes ne la concerne.
      manqueDeLEtape('context', { ...EMPTY_BILAN_ANSWERS, ...etat.depart.trajet, ...courant }, RIEN_HORS_COLONNES);
  if (demande && manque === null) setDemande(false);
  const contexteDesAncres: AncresDeLEtape = {
    enregistrer: enregistrerLAncre,
    marque: demande && manque !== null ? manque.champ : null,
    // Le titre de cet écran n'est pas l'une des quatre questions : aucune ne s'y confond.
    principale: null,
  };

  /**
   * **Mener à ce qui manque** — au toucher d'« Enregistrer » en attente, ou de la ligne qui le dit.
   * Le focus part **au geste**, sur la réponse cochée de la question ou sa première (`optionCible`),
   * puis la zone défile juste assez, si elle le doit (`decalagePourMontrer`) : le défilement de la
   * plateforme, posé sous « réduire les animations », que rien n'attend.
   */
  const mener = () => {
    if (manque === null) return;
    setDemande(true);
    const ancre = ancres.current.get(manque.champ);
    donnerLeFocus(ancre?.cible.current ?? null);
    const bloc = ancre?.bloc.current ?? null;
    const ecran = defilement.current?.getNativeScrollRef();
    if (!bloc || !ecran) return;
    ecran.measureInWindow((_x, hautDeLaZone) => {
      bloc.measureInWindow((_bx, hautDuBloc, _largeur, hauteurDuBloc) => {
        const haut = hautDuBloc - hautDeLaZone + zone.current.decalage;
        const y = decalagePourMontrer({
          decalage: zone.current.decalage,
          hauteurZone: zone.current.hauteur,
          haut,
          bas: haut + hauteurDuBloc,
        });
        if (y !== null) defilement.current?.scrollTo({ y, animated: !animationsReduites });
      });
    });
  };

  const enregistrer = async () => {
    if (enCours.current || !complet || !aChange) return;
    enCours.current = true;
    setEnregistrement(true);
    setMessage(null);

    const resultat = await enregistrerLeContexte(courant);

    enCours.current = false;
    setEnregistrement(false);

    if (resultat.ok) {
      revenirOu('/plan');
      return;
    }
    setMessage(resultat.message);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          ref={defilement}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={surDefilement}
          scrollEventThrottle={16}
          onLayout={(evenement) => {
            zone.current.hauteur = evenement.nativeEvent.layout.height;
          }}
        >
          <View style={styles.intro}>
            <ThemedText type="screenTitle">Ton contexte de mobilité</ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              Ton plan ne propose que ce qui tient avec ces réponses.{' '}
              {phraseDuCalculDuContexte(etat.depart.leisure_frequency)}
            </ThemedText>
          </View>

          <ContexteDesAncres.Provider value={contexteDesAncres}>
            <ChampsDeContexte choix={courant} trajet={etat.depart.trajet} update={modifier} />
          </ContexteDesAncres.Provider>

          {/* **Elle dit les deux effets, et le second est celui qui coûte.** Le premier rassure —
              on ne refait pas un bilan, le suivi ne gagne pas d'entrée — et le second prévient que
              l'action suivie peut disparaître du plan recalculé. La formulation est au
              conditionnel pour la même raison que la feuille de re-bilan (C6.2) : le serveur
              **repose** l'engagement sur le gabarit s'il est encore proposé, donc annoncer une
              perte certaine serait faux dans le cas courant. **Et sa fin ne promet pas de choix**
              (décision du 27/09/2026, alignée sur `phraseDeLEngagementRecalcule`) : « tu en
              choisiras une autre » était faux quand le contexte vide le plan — répondre « Rien de
              tout ça » retire toutes les actions de transport en commun (`v1-34`), et peut ne
              laisser aucune action. */}
          <ThemedText type="small" themeColor="textTertiary">
            Enregistrer met ton plan à jour ; ton bilan n’est pas refait. Si ton nouveau plan ne
            propose plus l’action que tu suis, elle ne sera plus engagée.
          </ThemedText>

          <MessageInline message={message} />

          {/* **La ligne du questionnaire, mot pour mot** (audit P-13) : « Il manque encore » et la
              phrase de la question, celles que l'étape « Contexte » dit déjà. Elle ne s'écrit qu'au
              toucher, jamais d'office — la question est déjà à l'écran —, et c'est un lien : elle mène
              là où le bouton vient de mener. */}
          {demande && manque !== null && (
            <TextLink
              label={`Il manque encore ${manque.phrase}.`}
              apparence="action"
              onPress={mener}
            />
          )}

          {/* **Incomplet, il est en attente ; inchangé, il est inactif** (audit P-13, 01/10/2026). Il
              était `disabled` dans les deux cas, sans dire pourquoi — le commentaire de
              `contexteEstComplet` dit éviter exactement cela. Incomplet, il agit : il mène à ce qui
              manque (`enAttente`, `FRONT.md` §2.4) ; un contexte complet qui n'a pas bougé n'a, lui,
              rien à enregistrer. `complet` garde l'appel au RPC, ici et dans `enregistrer`. */}
          <Button
            title={enregistrement ? 'Enregistrement…' : 'Enregistrer'}
            onPress={() => (complet ? void enregistrer() : mener())}
            enAttente={!complet}
            disabled={(complet && !aChange) || enregistrement}
          />

          <TextLink
            label="Retour"
            apparence="action"
            onPress={() => revenirOu('/plan')}
            role="link"
            style={styles.retour}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.four },
  intro: { gap: Spacing.two },
  vide: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  retour: { textAlign: 'center' },
});
