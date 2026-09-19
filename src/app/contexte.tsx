import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ChampsDeContexte } from '@/components/bilan/champs-de-contexte';
import { MessageInline } from '@/components/message-inline';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  enregistrerLeContexte,
  lireLeContexteCourant,
  type ContexteCourant,
} from '@/lib/contexte';
import { teletravailSePose } from '@/types/bilan';
import {
  contexteAChange,
  contexteEstComplet,
  phraseDuCalculDuContexte,
  type ChoixDeContexte,
} from '@/types/contexte';

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
 * étant celles qui supposaient un métro.
 *
 * **Et il peut coûter l'action engagée.** Si le gabarit suivi n'est plus proposé, le serveur
 * l'archive en `contexte`, et l'encart orphelin du plan l'annonce ensuite avec cette raison — d'où
 * la phrase de pied, qui prévient **avant**. On ne refuse pas pour autant : le produit annonce, il
 * ne marchande pas (le raisonnement de la feuille de re-bilan, C6.2).
 */

type Etat =
  | { statut: 'chargement' }
  | { statut: 'erreur' }
  | { statut: 'sans_bilan' }
  | { statut: 'pret'; depart: ContexteCourant };

export default function Contexte() {
  const theme = useTheme();
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
      setEtat({ statut: lecture.etat === 'sans_bilan' ? 'sans_bilan' : 'erreur' });
    })();

    return () => {
      annule = true;
    };
  }, []);

  const modifier = useCallback((patch: Partial<ChoixDeContexte>) => {
    setMessage(null);
    setChoix((courant) => (courant === null ? courant : { ...courant, ...patch }));
  }, []);

  if (etat.statut === 'chargement') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centre}>
          <ActivityIndicator color={theme.accent} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (etat.statut === 'erreur' || etat.statut === 'sans_bilan') {
    // **Deux états, deux phrases, et surtout deux vérités différentes.** Une lecture en échec ne
    // dit rien des données de la personne (C1.4) : on parle de la connexion, jamais de son bilan.
    // L'absence de bilan, elle, est un fait connu, et la porte qui va avec est le questionnaire.
    const panne = etat.statut === 'erreur';
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.vide}>
            <ThemedText type="screenTitle">Ton contexte de mobilité</ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              {panne
                ? 'Tes réponses n’ont pas pu être lues. Vérifie ta connexion et réessaie.'
                : 'Ces réponses font partie de ton bilan. Tu pourras les corriger ici une fois ton premier bilan fait.'}
            </ThemedText>
            <Button
              title={panne ? 'Réessayer' : 'Faire mon bilan'}
              onPress={() => {
                if (panne) {
                  setEtat({ statut: 'chargement' });
                  void lireLeContexteCourant().then((lecture) => {
                    if (lecture.etat === 'ok') {
                      setEtat({ statut: 'pret', depart: lecture.contexte });
                      setChoix(lecture.contexte.choix);
                      return;
                    }
                    setEtat({ statut: lecture.etat === 'sans_bilan' ? 'sans_bilan' : 'erreur' });
                  });
                  return;
                }
                router.push('/bilan');
              }}
            />
            <TextLink
              label="Retour"
              onPress={() => router.back()}
              type="small"
              weight={600}
              themeColor="accentText"
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

  const enregistrer = async () => {
    if (enCours.current || !complet || !aChange) return;
    enCours.current = true;
    setEnregistrement(true);
    setMessage(null);

    const resultat = await enregistrerLeContexte(courant);

    enCours.current = false;
    setEnregistrement(false);

    if (resultat.ok) {
      router.back();
      return;
    }
    setMessage(resultat.message);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.intro}>
            <ThemedText type="screenTitle">Ton contexte de mobilité</ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              Ton plan ne propose que ce qui tient avec ces réponses.{' '}
              {phraseDuCalculDuContexte(etat.depart.leisure_frequency)}
            </ThemedText>
          </View>

          <ChampsDeContexte choix={courant} trajet={etat.depart.trajet} update={modifier} />

          {/* **Elle dit les deux effets, et le second est celui qui coûte.** Le premier rassure —
              on ne refait pas un bilan, le suivi ne gagne pas d'entrée — et le second prévient que
              l'action suivie peut disparaître du plan recalculé. La formulation est au
              conditionnel pour la même raison que la feuille de re-bilan (C6.2) : le serveur
              **repose** l'engagement sur le gabarit s'il est encore proposé, donc annoncer une
              perte certaine serait faux dans le cas courant. */}
          <ThemedText type="small" themeColor="textTertiary">
            Enregistrer met ton plan à jour ; ton bilan n’est pas refait. Si l’action que tu suis
            n’y tient plus, tu en choisiras une autre.
          </ThemedText>

          <MessageInline message={message} />

          <Button
            title={enregistrement ? 'Enregistrement…' : 'Enregistrer'}
            onPress={() => void enregistrer()}
            disabled={!complet || !aChange || enregistrement}
          />

          <TextLink
            label="Retour"
            onPress={() => router.back()}
            type="small"
            weight={600}
            themeColor="accentText"
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
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.four },
  intro: { gap: Spacing.two },
  vide: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  retour: { textAlign: 'center' },
});
