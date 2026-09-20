import { makeRedirectUri } from 'expo-auth-session';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/auth/text-field';
import { TextLink } from '@/components/text-link';
import { MessageInline } from '@/components/message-inline';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { APP_URL } from '@/lib/app-url';
import { linkEmail } from '@/lib/auth';
import {
  lireAdresseDuLien,
  markConnexionProposalSeen,
  memoriserAdresseDuLien,
} from '@/lib/connexion-prefs';
import {
  adresseDejaRattachee,
  adresseSemblePlausible,
  estLimiteDEnvoi,
  messageDuRetourDeLien,
  motifRetourLien,
} from '@/types/connexion';

/**
 * Sortir d'ici sans cul-de-sac — même raison et même repli que dans `/connexion/retrouver` : le
 * layout racine ouvre cet écran en `replace` quand le lien de confirmation de `linkEmail` revient
 * périmé, et la pile peut alors n'avoir aucune entrée derrière. Un `router.back()` nu n'y fait
 * rien.
 */
function revenirOuRacine() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

// "Connexion — email" — lie l'adresse à la session anonyme en cours (cf. src/lib/auth.ts) :
// toujours le cas "créer mon compte" ici, jamais une connexion à un compte existant, qui
// passe par /connexion/retrouver. Une adresse, rien d'autre : le mot de passe a disparu avec
// v1-10 §2.D — il n'a jamais servi, et la confirmation par email faisait déjà tout le travail.
export default function ConnexionEmail() {
  const { id, motif: motifBrut } = useLocalSearchParams<{ id: string; motif?: string }>();

  // **Le lien de confirmation expiré revient ici, et pas sur « retrouver ».** Les deux liens du
  // produit portent le même `error_code=otp_expired`, mais celui-ci appartient à quelqu'un qui
  // rattachait une adresse à cette session : `/connexion/retrouver` ne sait que chercher un
  // compte **existant** (`shouldCreateUser: false`), donc aucun lien n'en serait jamais reparti.
  // Le layout racine distingue les deux par l'état du rattachement et dépose le motif ici ; on le
  // relit par son garde plutôt que de croire un paramètre d'URL.
  const motif = motifRetourLien(motifBrut);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(
    motif ? messageDuRetourDeLien(motif) : null
  );
  // États inline plutôt qu'un Alert.alert avec callback sur le bouton : sur web,
  // react-native-web retombe sur window.alert(), qui n'invoque pas onPress.
  const [phase, setPhase] = useState<'saisie' | 'envoye' | 'deja-un-compte'>('saisie');

  // Relancer la demande ne doit pas se payer d'une ressaisie : l'adresse est celle tapée sur cet
  // appareil, relue en local et jamais déduite d'une réponse serveur (même règle que
  // `/connexion/retrouver`). Ne s'écrit que sur un champ encore vide, une frappe en cours passe
  // avant.
  useEffect(() => {
    if (!motif) return;
    let annule = false;
    void lireAdresseDuLien().then((adresse) => {
      if (annule || !adresse) return;
      setEmail((actuelle) => (actuelle ? actuelle : adresse));
    });
    return () => {
      annule = true;
    };
    // Volontairement au montage seul : les paramètres d'URL ne changent pas ici.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const valid = adresseSemblePlausible(email);

  const onSubmit = async () => {
    if (!valid || submitting) return;
    setMessage(null);
    setSubmitting(true);
    // **Le lien de confirmation doit revenir dans l'app, pas dans le navigateur.** Sans
    // `redirectTo`, il retombe sur la Site URL du tableau de bord : sur natif il s'ouvre alors
    // hors de Ramille, la personne y revient à la main, sans aucune URL entrante — et plus rien
    // ne peut lui annoncer que son compte est rattaché (A6-5). Même valeur que
    // `/connexion/retrouver`, donc déjà présente dans les Redirect URLs autorisées.
    const redirectTo = Platform.OS === 'web' ? `${APP_URL}/` : makeRedirectUri();
    const { error } = await linkEmail(email, redirectTo);
    setSubmitting(false);

    // L'adresse a déjà un compte : la personne est au mauvais écran, pas en erreur. On le
    // dit et on l'envoie vers « retrouver » avec l'adresse déjà saisie.
    if (adresseDejaRattachee(error)) {
      // Mémorisée **ici aussi**, et pas seulement sur le chemin nominal plus bas : c'est ce qui
      // permet à « Retrouver mon compte » de repartir avec l'adresse déjà saisie sans la faire
      // voyager dans l'URL. Voir le commentaire du bouton.
      await memoriserAdresseDuLien(email);
      setPhase('deja-un-compte');
      return;
    }
    if (estLimiteDEnvoi(error)) {
      setMessage('Trop de demandes coup sur coup. Réessaie dans quelques minutes.');
      return;
    }
    if (error) {
      setMessage('L’envoi n’a pas abouti. Vérifie l’adresse et réessaie.');
      return;
    }

    // **Une demande, pas un rattachement**, et c'est tout ce que cet écran peut constater.
    // `connexion_success` partait d'ici, avec pour justification que « le rattachement est
    // effectif » — alors que le modèle de données dit le contraire : `etatDuRattachement` classe
    // cet instant en `a_confirmer`, et `is_anonymous` ne bascule qu'au clic du lien reçu dans la
    // messagerie. Le chemin Google, lui, n'émet l'événement qu'après une session réellement liée.
    // Comparer les deux, la seule chose que `connexion_success` permet, revenait donc à comparer
    // une intention à un fait — l'écart étant exactement le taux d'emails jamais confirmés,
    // c'est-à-dire le chiffre cherché. Il est maintenant lisible : `connexion_demande` ici,
    // `connexion_success` au constat de la bascule — émis par l'annonce de rattachement de
    // `/plan`, le seul écran que la personne traverse **après** avoir cliqué le lien reçu dans
    // sa messagerie (v1-13 C1.2). Les deux émetteurs vont ensemble : retirer celui du plan
    // ferait lire `method: 'email'` **zéro**, ce qui est pire qu'un chiffre mal daté.
    track('connexion_demande');
    // Gardée pour le seul cas où elle sert : si ce lien-là n'est plus valable au moment du clic,
    // le layout racine rouvre **cet** écran avec l'adresse déjà là plutôt qu'à retaper (c'est la
    // session courante qui est `a_confirmer`, donc la demande se relance ici).
    await memoriserAdresseDuLien(email);
    await markConnexionProposalSeen();
    setPhase('envoye');
  };

  if (phase === 'envoye') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <ThemedText type="screenTitle">
              Vérifie tes emails
            </ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              Un lien de confirmation vient d&apos;être envoyé à {email.trim()}. Ton bilan reste
              accessible en attendant.
            </ThemedText>
            <Button title="Continuer" onPress={() => router.replace('/plan')} style={styles.continueButton} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (phase === 'deja-un-compte') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <ThemedText type="screenTitle">
              Cette adresse a déjà un compte
            </ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              Le bilan que tu viens de faire ne peut pas le rejoindre, mais tu peux retrouver ton
              compte : on t&apos;envoie un lien qui te reconnecte ici.
            </ThemedText>
            <Button
              title="Retrouver mon compte"
              // **L'adresse ne passe pas par l'URL**, elle est relue en local à l'arrivée
              // (`lireAdresseDuLien`, mécanisme déjà en place pour le lien expiré). Un paramètre
              // `email=` s'écrit dans la barre d'adresse sur web, donc dans l'historique du
              // navigateur et son autocomplétion — sur un poste partagé, c'est le chemin par
              // lequel une adresse se retrouve devant quelqu'un d'autre — et dans les journaux
              // d'accès dès qu'on recharge ou met en favori. C'était la seule donnée personnelle
              // du produit à sortir dans une URL : tout le reste est un uuid ou un mot d'un
              // vocabulaire fermé. Les deux sorties de `src/lib/compte.ts` balaient la marque
              // locale ; elles ne peuvent rien contre un historique de navigateur.
              onPress={() => router.replace({ pathname: '/connexion/retrouver', params: { source: 'email' } })}
              style={styles.continueButton}
            />
            <TextLink
              label="Garder ce bilan sans compte"
              onPress={() => router.replace('/plan')}
              type="small"
              themeColor="textTertiary"
              style={styles.backLink}
            />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.textBlock}>
            <ThemedText type="screenTitle">
              Continuer avec un email
            </ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              Une adresse, rien de plus — pas de mot de passe. Ton bilan est rattaché
              automatiquement.
            </ThemedText>
          </View>

          <View style={styles.fields}>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              placeholder="camille@exemple.fr"
            />
            <MessageInline message={message} />
            <TextLink
              label="J’ai déjà un compte"
              onPress={() => router.push({ pathname: '/connexion/retrouver', params: { id, source: 'email' } })}
              role="link"
              type="linkPrimary"
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title={submitting ? 'Envoi…' : 'Recevoir le lien'}
            onPress={onSubmit}
            disabled={!valid || submitting}
          />
          <TextLink
            label="Revenir aux autres options"
            onPress={revenirOuRacine}
            role="link"
            type="small"
            themeColor="textTertiary"
            style={styles.backLink}
          />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four, justifyContent: 'space-between' },
  content: { gap: Spacing.four, marginTop: Spacing.two },
  textBlock: { gap: 10 },
  fields: { gap: Spacing.four },
  footer: { gap: Spacing.four },
  backLink: { textAlign: 'center' },
  centered: { flex: 1, justifyContent: 'center', gap: Spacing.three },
  continueButton: { marginTop: Spacing.two },
});
