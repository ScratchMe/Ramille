import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleButton } from '@/components/auth/google-button';
import { MessageInline } from '@/components/message-inline';
import { Mascot } from '@/components/mascot';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useApresHydratation } from '@/hooks/use-apres-hydratation';
import { useTrackView } from '@/hooks/use-track-view';
import { track } from '@/lib/analytics';
import { linkGoogleIdentity } from '@/lib/auth';
import { lireEtatDuRattachement } from '@/lib/compte';
import { sourceConnexion } from '@/types/analytics';
import { PHRASE_SANS_COMPTE_SOUS_LA_SORTIE } from '@/types/compte';
import { identiteDejaRattachee, introDeLaConnexion } from '@/types/connexion';

// « Rattacher un compte » — **un détour, plus un interstitiel** (arbitrage du 20/09/2026).
//
// Cet écran s'interposait entre la restitution et le plan : « Voir ce que je peux faire » ouvrait
// une demande de compte. Trois choses le condamnaient — le bouton ne faisait pas ce qu'il disait,
// son titre (« Garde ce résultat ») était faux depuis que `v1-04` a mis le bilan en base, et la
// proposition arrivait avant qu'aucune des trois choses qu'un compte apporte n'existe dans
// l'expérience de la personne. Il reste, atteignable depuis « Toi », la bannière de la restitution
// et la feuille des rappels : c'est son titre qui était faux, pas son existence.
//
// **Ce qui est parti avec l'interposition** : le bloc « Ce qui est déjà enregistré » et sa lecture
// d'`assessment_results` (il répétait l'écran qu'on venait de quitter), « Continuer sans compte »
// (il n'y a plus rien à continuer), l'événement `connexion_dismiss` et la marque locale
// « proposition vue » — plus rien n'a besoin de survivre au déchargement de la page, puisque plus
// rien ne compte les passages.
export default function ConnexionProposition() {
  // `id` n'est plus passé par personne : cet écran ne lit plus le résultat du bilan.
  const { source } = useLocalSearchParams<{ source?: string }>();

  // **Le garde se dérive de la liste du type, il ne la recopie pas** (`sourceConnexion`). La
  // copie écrite ici à la main avait perdu `compte` en route : une arrivée depuis « Toi » —
  // quelqu'un qui vient chercher le rattachement hors de tout interstitiel, la provenance la
  // plus intéressante à mesurer — était enregistrée comme l'interstitiel post-bilan, et gonflait
  // exactement le chiffre auquel on voulait la comparer. Un paramètre absent ou inconnu retombe
  // sur `inconnue` : ce commentaire annonçait encore `resultat_transition` le 24/09/2026, repli
  // que `sourceConnexion` a quitté avec le retrait de l'interstitiel (PR #252, 21/09/2026) — son
  // en-tête dit pourquoi.
  const provenanceLue = sourceConnexion(source);
  useTrackView('connexion_view', { source: provenanceLue });

  // **Empilé depuis « Toi », cet écran n'est plus un interstitiel.** Sa seule sortie était
  // « Continuer sans compte », qui pose la marque « proposition vue », émet `connexion_dismiss` et
  // remplace la pile par `/plan` : quelqu'un qui ouvrait la connexion depuis « Toi » et changeait
  // d'avis était donc déposé sur le plan, sans retour, la proposition plein écran consommée au
  // passage et un refus d'interstitiel compté qui n'en était pas un (A6-21). La provenance se lit
  // par le même garde que la mesure — une seule dérivation, pas deux lectures du paramètre.
  //
  // **Mais l'écran ne l'affiche qu'une fois hydraté** (24/09/2026, `v1-29`). L'export statique ne
  // connaît pas la chaîne de requête : il rend l'écran d'une arrivée sans provenance (« Plus
  // tard », l'introduction générale). Ouvert directement sur `/connexion?source=compte`, le
  // navigateur rendait « Retour » dès son premier passage, React constatait l'écart et jetait la
  // page (erreur n° 418, relevée sur l'export ; `?source=rappels` le faisait sur l'introduction).
  // Le premier rendu reprend donc celui du HTML, et le suivant la vraie provenance — sans rendu
  // de transition partout où il n'y a pas d'hydratation, c'est-à-dire en arrivant depuis l'app
  // (`useApresHydratation`). La mesure, elle, n'attend pas : elle part après le montage et lit
  // l'URL.
  const apresHydratation = useApresHydratation();
  const provenance = apresHydratation ? provenanceLue : sourceConnexion(undefined);
  const vientDeCompte = provenance === 'compte';
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onGoogle = async () => {
    setGoogleLoading(true);
    setMessage(null);

    // **Plus rien à poser avant l'appel, et c'est le retrait de l'interstitiel qui l'a libéré**
    // (A6-20). Sur web, `linkIdentity` déclenche une redirection plein écran et rend la main
    // aussitôt : tout ce qui suivait s'exécutait pendant que le document se déchargeait, d'où une
    // marque « proposition vue » posée avant de savoir si l'appel aboutissait. Cette marque n'a
    // plus d'objet — rien ne compte les passages —, donc la course n'existe plus.
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
        router.push({ pathname: '/connexion/retrouver', params: { source: 'google' } });
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
              Ton bilan, d’un appareil à l’autre
            </ThemedText>
            {/* **Le corps se dérive de la provenance** (`introDeLaConnexion`), parce que les trois
                portes ne posent pas la même question : depuis la restitution ou « Toi », c'est
                « et si je change d'appareil ? » ; depuis la feuille des rappels, c'est « comment
                tu me fais signe ? », et le compte y est ce qui rend l'e-mail possible. */}
            <ThemedText themeColor="textSecondary" style={styles.body}>
              {introDeLaConnexion(provenance)}
            </ThemedText>
          </View>

          <View style={styles.options}>
            <GoogleButton onPress={onGoogle} loading={googleLoading} />
            <MessageInline message={message} />
            <TextLink
              label="Utiliser un email à la place"
              // **Aucun paramètre**, et c'est délibéré : `/connexion/email` ne lit ni `id` (plus
              // personne ne le passe depuis que cet écran ne lit plus le résultat du bilan) ni
              // `source` (la provenance qu'il transmet à « retrouver » est la porte d'ici, `email`).
              // En passer un que rien ne lit se lit « réservé » là où il est inutile.
              onPress={() => router.push('/connexion/email')}
              role="link"
              type="linkPrimary"
              style={styles.emailLink}
            />
          </View>

          {/* **Deux sorties, et aucune ne marque plus rien.** Depuis « Toi » on revient d'où l'on
              vient ; depuis la restitution ou la feuille, on reporte — on n'a rien refusé, il n'y
              a donc rien à compter ni à retenir. C'est ce que le retrait de l'interstitiel change
              ici : « Continuer sans compte » supposait une interposition à franchir. */}
          <View style={styles.skip}>
            <TextLink
              label={vientDeCompte ? 'Retour' : 'Plus tard'}
              // `canGoBack()` d'abord : `/connexion` est une vraie URL web, atteignable sans pile
              // derrière elle (favori, lien collé, démarrage à froid), et un `router.back()` nu ne
              // fait alors **rien** — la personne reste enfermée sur l'écran. Le repli est une
              // destination, pas un dépilement, et il diffère selon d'où l'on prétend revenir.
              onPress={() =>
                router.canGoBack()
                  ? router.back()
                  : router.replace(vientDeCompte ? '/compte' : '/plan')
              }
              role="link"
              type="small"
              themeColor="textTertiary"
            />
            {/* **Ce qu'on perd sans compte n'était dit que dans les pages légales** (C3.9,
                constat A1-11) : changer de téléphone perd tout, et la purge des sessions anonymes
                ferme le compte après trois mois d'inactivité
                (`purge_stale_anonymous_accounts`, fenêtre de 90 jours, comptée sur le dernier
                signe de vie et non sur la création). Elle est rendue pour **toutes** les
                provenances depuis le 20/09/2026, et c'est une conséquence du retrait de
                l'interstitiel : il la faisait lire à tout le monde au passage, en petit, sous un
                lien qu'on touche sans lire. **Elle est aussi sur « Toi » en état local depuis le
                21/09/2026** (`v1-28` §7.2) : ici elle n'atteignait que ceux qui envisageaient
                déjà un compte. Le texte n'a pas bougé — il sort seulement de l'écran, la clause
                et le délai venant de `src/types/compte.ts` pour que les deux endroits ne
                puissent pas diverger (règle §1.6 de FRONT.md). */}
            <ThemedText type="small" themeColor="textTertiary" style={styles.skipHint}>
              {PHRASE_SANS_COMPTE_SOUS_LA_SORTIE}
            </ThemedText>
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
  options: { gap: Spacing.three },
  emailLink: { textAlign: 'center' },
  skip: { marginTop: Spacing.two, alignItems: 'center', gap: 10 },
  skipHint: { textAlign: 'center' },
  legal: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.two },
});
