import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleButton } from '@/components/auth/google-button';
import { MessageInline } from '@/components/message-inline';
import { Mascot } from '@/components/mascot';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { markConnexionProposalSeen } from '@/lib/connexion-prefs';
import { useTrackView } from '@/hooks/use-track-view';
import { formatTonnes } from '@/lib/format';
import { track } from '@/lib/analytics';
import { linkGoogleIdentity } from '@/lib/auth';
import { lireEtatDuRattachement } from '@/lib/compte';
import { sourceConnexion } from '@/types/analytics';
import { identiteDejaRattachee } from '@/types/connexion';
import { supabase } from '@/lib/supabase';

type Recap = { total_co2_kg_year: number; dominant_poste_label: string } | null;

// "Connexion — proposition après bilan" — plein écran, jamais une pop-up (cf. annotation
// design) : affichée une seule fois, juste après que l'utilisateur ait vu sa restitution
// (cf. bilan/resultat.tsx, qui route ici tant que la proposition n'a pas été vue/déclinée).
export default function ConnexionProposition() {
  const { id, source } = useLocalSearchParams<{ id: string; source?: string }>();

  // **Le garde se dérive de la liste du type, il ne la recopie pas** (`sourceConnexion`). La
  // copie écrite ici à la main avait perdu `compte` en route : une arrivée depuis « Toi » —
  // quelqu'un qui vient chercher le rattachement hors de tout interstitiel, la provenance la
  // plus intéressante à mesurer — était enregistrée comme l'interstitiel post-bilan, et gonflait
  // exactement le chiffre auquel on voulait la comparer. Un paramètre absent ou inconnu retombe
  // sur `resultat_transition`, le chemin historique : mieux compté là que perdu.
  useTrackView('connexion_view', { source: sourceConnexion(source) });

  // **Empilé depuis « Toi », cet écran n'est plus un interstitiel.** Sa seule sortie était
  // « Continuer sans compte », qui pose la marque « proposition vue », émet `connexion_dismiss` et
  // remplace la pile par `/plan` : quelqu'un qui ouvrait la connexion depuis « Toi » et changeait
  // d'avis était donc déposé sur le plan, sans retour, la proposition plein écran consommée au
  // passage et un refus d'interstitiel compté qui n'en était pas un (A6-21). La provenance se lit
  // par le même garde que la mesure — une seule dérivation, pas deux lectures du paramètre.
  const vientDeCompte = sourceConnexion(source) === 'compte';
  const [recap, setRecap] = useState<Recap>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('assessment_results')
      .select('total_co2_kg_year, dominant_poste_label')
      .eq('assessment_id', id)
      .single()
      .then(({ data }) => setRecap(data));
  }, [id]);

  const dismiss = async () => {
    track('connexion_dismiss');
    await markConnexionProposalSeen();
    router.replace('/plan');
  };

  const onGoogle = async () => {
    setGoogleLoading(true);
    setMessage(null);

    // **Sur web, la marque se pose avant l'appel** (A6-20). `linkIdentity` y déclenche une
    // redirection plein écran et rend la main aussitôt : tout ce qui suit s'exécute pendant que
    // le document se décharge, et le retour d'OAuth atterrit directement sur `/plan` sans
    // repasser par ici. Ce qui doit survivre au départ de la page est donc écrit maintenant ; le
    // constat du rattachement, lui, est laissé au plan, qui voit la bascule d'`is_anonymous`.
    //
    // Poser la marque avant de savoir si l'appel aboutit la pose parfois pour rien (liaison
    // désactivée, réseau coupé) : le coût est que l'interstitiel plein écran ne se rejoue pas, la
    // bannière discrète restant là. C'est moins cher que la mesure perdue, et de toute façon la
    // proposition ne se rejoue pas après un rattachement réussi.
    if (Platform.OS === 'web') await markConnexionProposalSeen();

    const resultat = await linkGoogleIdentity();

    // La page s'en va vers Google : le bouton reste en attente plutôt que de redevenir inerte
    // sous les yeux de quelqu'un qui vient d'appuyer.
    if (resultat.issue === 'redirection') return;

    setGoogleLoading(false);

    // **Une annulation n'est ni un échec ni une réussite.** C'est le défaut d'origine (A6-1) :
    // la fenêtre refermée rendait `{ error: null }`, donc l'écran fêtait un rattachement qui
    // n'avait pas eu lieu, posait la marque et déposait la personne sur le plan sans compte. On
    // ne marque rien, on n'émet rien, on ne bouge pas — un mot neutre, sans blocage, comme la
    // spec le demande à cet endroit.
    if (resultat.issue === 'annulation') {
      setMessage('Tu peux réessayer quand tu veux.');
      return;
    }

    if (resultat.issue === 'echec') {
      // **L'identité Google déjà prise n'est pas un échec, c'est un aiguillage** (#60) :
      // quelqu'un qui a un compte Ramille, change d'appareil, refait un bilan sans passer par
      // « J'ai déjà un compte », puis tape « Continuer avec Google ». Le chemin email était
      // couvert depuis #57 (`email_exists`), pas celui-là — il affichait le message brut de
      // Supabase, en anglais, sans rien à faire ensuite. `/connexion/retrouver` sait déjà
      // tout dire : la collision, le choix entre retrouver et garder ce bilan, et l'envoi du
      // lien. L'adresse Google en est une, le geste est le même.
      if (identiteDejaRattachee(resultat.error)) {
        router.push({ pathname: '/connexion/retrouver', params: { id, source: 'google' } });
        return;
      }
      // Le message de Supabase est repris tel quel : il est en anglais et technique, mais
      // c'est le seul indice disponible sur ce qui a échoué, et un texte rassurant à la
      // place laisserait la personne sans rien pour comprendre ni pour nous le rapporter.
      setMessage(`La connexion avec Google n’a pas abouti. ${resultat.error.message}`);
      return;
    }

    // Une session est ouverte ; reste à **constater** qu'elle est liée avant de la compter.
    // `lireEtatDuRattachement` fait exactement ce test (`is_anonymous === false`) et il vaut
    // mieux qu'un raisonnement local : l'écran ne peut pas savoir ce que les jetons portent.
    //
    // **Ici, et pas dans l'annonce de `/plan`** : côté Google l'identité est liée dans ce geste
    // même, donc ce constat *est* le fait — c'est la branche email qui n'en a pas et que le plan
    // couvre (v1-13 C1.2). Déplacer cet appel là-bas compterait deux fois les rattachements
    // Google, puisque le plan est la destination de la ligne suivante.
    //
    // Une lecture qui échoue ne fait rien inventer : ni ligne de mesure, ni marque. La
    // navigation, elle, a lieu quand même — la session est ouverte, et laisser quelqu'un sur un
    // écran qui a marché serait pire qu'une ligne manquante.
    const etat = await lireEtatDuRattachement().catch(() => null);
    if (etat?.kind === 'rattache') {
      track('connexion_success', { method: 'google' });
      await markConnexionProposalSeen();
    }
    router.replace('/plan');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Marque visible avant le bouton Google : un utilisateur qui vient d'arriver sur
              son bilan doit reconnaître que c'est bien Ramille qui lui propose de se
              connecter, pas un tiers — le bouton Google lui-même reste non personnalisé
              (cf. spec-uiux §5, "respecter le branding standard Google"). Mascotte plutôt
              que le logo abstrait seul (cf. mascot.tsx) : même rôle de marque de confiance,
              plus chaleureux. */}
          <Mascot mood="calm" size={44} style={styles.logo} />
          <View style={styles.textBlock}>
            <ThemedText type="title" weight={600} style={styles.title}>
              Garde ce résultat et suis ta progression
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.body}>
              Ton bilan est calculé. Avec un compte, il te suit d&apos;un appareil à l&apos;autre et
              tu retrouves ton historique de points mensuels.
            </ThemedText>
          </View>

          {recap && (
            <ThemedView type="backgroundSelected" style={styles.recapCard}>
              <ThemedText weight={600} themeColor="accentText" type="small">
                Ce qui est déjà enregistré
              </ThemedText>
              <ThemedText type="body" themeColor="textSecondary">
                {formatTonnes(recap.total_co2_kg_year)} par an · {recap.dominant_poste_label} identifié comme
                poste principal
              </ThemedText>
            </ThemedView>
          )}

          <View style={styles.options}>
            <GoogleButton onPress={onGoogle} loading={googleLoading} />
            <MessageInline message={message} />
            <TextLink
              label="Utiliser un email à la place"
              onPress={() => router.push({ pathname: '/connexion/email', params: { id } })}
              role="link"
              type="linkPrimary"
              style={styles.emailLink}
            />
          </View>

          {/* Deux sorties qui ne disent pas la même chose, et une seule à la fois. Depuis « Toi »,
              on revient d'où l'on vient : rien n'est décliné, donc rien n'est marqué ni compté.
              Depuis la restitution, c'est l'interstitiel qu'on passe, et le produit dit ce que
              ça implique. */}
          <View style={styles.skip}>
            {vientDeCompte ? (
              <TextLink
                label="Retour"
                // `canGoBack()` d'abord : `/connexion?source=compte` est une vraie URL web,
                // atteignable sans pile derrière elle (favori, lien collé, démarrage à froid), et
                // un `router.back()` nu ne fait alors **rien** — la personne reste enfermée sur
                // l'écran. Le repli va sur « Toi », l'écran d'où cette sortie prétend revenir :
                // c'est une destination, pas un dépilement. Même garde que
                // `connexion/retrouver.tsx` et `connexion/email.tsx`.
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/compte'))}
                role="link"
                type="small"
                themeColor="textTertiary"
              />
            ) : (
              <>
                {/* Pas de `hint` ici : il reprenait mot pour mot le paragraphe ci-dessous, et un
                    lecteur d'écran annonçait donc la phrase deux fois de suite (A6-22). Le `hint`
                    de `TextLink` est fait pour les intitulés ambigus hors contexte, pas pour
                    doubler un texte déjà présent — et les deux copies avaient déjà divergé d'un
                    point final. Le paragraphe visible reste : il rassure au moment précis où
                    quelqu'un renonce à un compte. */}
                <TextLink
                  label="Continuer sans compte"
                  onPress={dismiss}
                  type="small"
                  themeColor="textTertiary"
                />
                <ThemedText type="code" themeColor="textTertiary" style={styles.skipHint}>
                  Ton résultat reste accessible sur cet appareil.
                </ThemedText>
              </>
            )}
          </View>

          {/* Les deux pages légales sont accessibles là où quelqu'un s'apprête à créer un
              compte — c'est le moment où elles l'engagent. Leurs URL publiques sont aussi
              exigées par l'écran de consentement Google OAuth et par la fiche Play Store. */}
          <View style={styles.legal}>
            <TextLink
              label="Confidentialité"
              onPress={() => router.push('/confidentialite')}
              role="link"
              type="code"
              themeColor="textTertiary"
            />
            <ThemedText type="code" themeColor="textTertiary">
              ·
            </ThemedText>
            <TextLink
              label="Conditions d’utilisation"
              onPress={() => router.push('/conditions')}
              role="link"
              type="code"
              themeColor="textTertiary"
            />
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.four },
  logo: { marginBottom: Spacing.one },
  textBlock: { gap: Spacing.two },
  title: { fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  body: { fontSize: 16, lineHeight: 24 },
  recapCard: { borderRadius: Radius.card, padding: 18, gap: 8 },
  options: { gap: Spacing.three },
  emailLink: { textAlign: 'center' },
  skip: { marginTop: Spacing.two, alignItems: 'center', gap: 10 },
  skipHint: { textAlign: 'center' },
  legal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.two },
});
