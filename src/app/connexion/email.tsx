import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { SaisieDuCode } from '@/components/auth/saisie-du-code';
import { TextField } from '@/components/auth/text-field';
import { TextLink } from '@/components/text-link';
import { MessageInline } from '@/components/message-inline';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { demanderLeRattachement } from '@/lib/auth';
import { lireEtatDuRattachement } from '@/lib/compte';
import { lireAdresseDuLien, memoriserAdresseDuLien } from '@/lib/connexion-prefs';
import {
  adresseSemblePlausible,
  messageDeLaDemande,
  messageDuRetourDeLien,
  motifRetourLien,
  suiteDeLaDemandeDeCode,
} from '@/types/connexion';

/**
 * Sortir d'ici sans cul-de-sac — même raison et même repli que dans `/connexion/retrouver` : le
 * layout racine ouvre cet écran en `replace` quand un lien parti avant le 20/09/2026 revient
 * périmé, et la pile peut alors n'avoir aucune entrée derrière. Un `router.back()` nu n'y fait
 * rien.
 */
function revenirOuRacine() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * « Rattacher mon adresse » — une adresse, puis un code.
 *
 * **Le lien a disparu des deux e-mails du produit le 20/09/2026**, et dans celui-ci il était la
 * faille : un `GET /auth/v1/verify` confirme l'adresse côté serveur avant toute redirection, donc
 * n'importe qui recevant cet e-mail rattachait son adresse au compte d'un inconnu d'un seul clic.
 * Le code ne referme pas cette porte — il n'est lié ni à la session ni au client qui l'a demandé
 * (mesuré) — il en relève le prix : un réflexe devient une démarche. La dette est en `v1-27` §12.12.
 *
 * Trois phases, et la deuxième est partagée avec deux autres écrans (`SaisieDuCode`).
 *
 * **Ce que ce chantier ne change PAS, et c'est délibéré** : l'adresse déjà prise se dit toujours
 * **avant** (phase `deja-un-compte`), comme aujourd'hui. Le canvas propose de vérifier d'abord et
 * de ne le dire qu'après — ce serait refermer un oracle gratuit, puisque cet écran s'atteint depuis
 * « Toi » sans bilan et qu'un `email_exists` n'envoie rien, donc n'est plafonné par rien —, mais
 * c'est un arbitrage de produit (§10.3 du canvas) : la personne qui voulait garder le bilan de cet
 * appareil sans rejoindre son ancien compte l'apprendrait après cinq minutes de réponses. Tant
 * qu'il n'est pas rendu, l'écran garde le constat avant ; seule sa phrase change, le lien qu'elle
 * promettait n'existant plus.
 */
export default function ConnexionEmail() {
  const { id, motif: motifBrut, reprise } = useLocalSearchParams<{
    id?: string;
    motif?: string;
    reprise?: string;
  }>();

  // **Un lien parti avant le passage au code peut encore revenir**, et le layout racine dépose son
  // motif ici : cet écran est celui de quelqu'un dont la session est `a_confirmer`, là où
  // `/connexion/retrouver` ne sait chercher qu'un compte existant. On le relit par son garde
  // plutôt que de croire un paramètre d'URL.
  const motif = motifRetourLien(motifBrut);
  const [email, setEmail] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(
    motif ? messageDuRetourDeLien(motif) : null
  );
  const [phase, setPhase] = useState<'saisie' | 'code' | 'deja-un-compte'>('saisie');

  // Deux raisons de relire l'adresse tapée sur cet appareil, et aucune ne passe par l'URL (une
  // adresse dans la barre d'adresse entre dans l'historique du navigateur et son autocomplétion) :
  // un lien périmé qui ramène ici, et la reprise depuis « Toi » quand l'onglet est parti avant la
  // saisie du code. Dans le second cas l'écran s'ouvre **directement** sur le code : celui qui est
  // déjà dans la messagerie vaut encore, et « Renvoyer un code » est là pour l'autre cas.
  useEffect(() => {
    if (!motif && !reprise) return;
    let annule = false;
    void lireAdresseDuLien().then((adresse) => {
      if (annule || !adresse) return;
      setEmail((actuelle) => (actuelle ? actuelle : adresse));
      // Pas de nouvel envoi : rien n'a échoué, on rouvre une saisie interrompue.
      if (reprise && !motif) setPhase('code');
    });
    return () => {
      annule = true;
    };
    // Volontairement au montage seul : les paramètres d'URL ne changent pas ici.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const valide = adresseSemblePlausible(email);

  const demander = async () => {
    if (!valide || envoi) return;
    setMessage(null);
    setEnvoi(true);
    // Mémorisée **avant** l'appel : c'est l'adresse que la personne a tapée ici, jamais une
    // déduction d'une réponse de l'API — prérenseigner depuis le serveur dirait qui utilise
    // Ramille. Et elle doit être là même si l'envoi échoue, pour la reprise depuis « Toi ».
    await memoriserAdresseDuLien(email);
    const { error } = await demanderLeRattachement(email);

    const suite = suiteDeLaDemandeDeCode('rattachement', error);
    if (suite === 'message') {
      setEnvoi(false);
      setMessage(messageDeLaDemande(error));
      return;
    }

    if (suite === 'bascule') {
      // L'adresse a déjà un compte : la personne est au mauvais écran, pas en erreur. On le dit
      // et on l'envoie vers « retrouver » avec l'adresse déjà mémorisée (elle l'est plus haut,
      // avant l'appel, donc rien à faire ici).
      setEnvoi(false);
      setPhase('deja-un-compte');
      return;
    }

    setEnvoi(false);
    // **Une demande, pas un rattachement.** `connexion_success` n'est pas émis ici et ne l'a jamais
    // été depuis la correction du 11/09/2026 : il est émis par l'annonce de `/plan`, au constat de
    // la bascule. L'écart entre les deux **est** le taux de codes jamais tapés — c'est-à-dire la
    // mesure demandée le 20/09/2026, et elle ne tient que si ces deux émetteurs restent ce qu'ils
    // sont : retirer celui du plan ferait lire zéro succès par email.
    track('connexion_demande');
    setPhase('code');
  };

  const codeAccepte = async () => {
    // Le plan annonce le rattachement et compte le succès ; si la lecture échoue on y va quand
    // même — la session est ouverte, l'annonce se refermera au passage suivant.
    await lireEtatDuRattachement().catch(() => null);
    router.replace('/plan');
  };

  if (phase === 'code') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <SaisieDuCode
            contexte="rattachement"
            adresse={email.trim()}
            libelleBouton="Rattacher mon adresse"
            onOuverte={codeAccepte}
            onAutreAdresse={() => {
              setMessage(null);
              setPhase('saisie');
            }}
            renvoyer={demanderLeRattachement}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (phase === 'deja-un-compte') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centre}>
            <ThemedText type="screenTitle">Cette adresse a déjà un compte</ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              Le bilan que tu viens de faire ne peut pas le rejoindre, mais tu peux retrouver ton
              compte : un code reçu par email t’y ramène.
            </ThemedText>
            <Button
              title="Retrouver mon compte"
              // **L'adresse ne passe pas par l'URL**, elle est relue en local à l'arrivée
              // (`lireAdresseDuLien`). Un paramètre `email=` s'écrit dans la barre d'adresse sur
              // web, donc dans l'historique du navigateur et son autocomplétion — sur un poste
              // partagé, c'est le chemin par lequel une adresse se retrouve devant quelqu'un
              // d'autre — et dans les journaux d'accès dès qu'on recharge ou met en favori.
              onPress={() => router.replace({ pathname: '/connexion/retrouver', params: { source: 'email' } })}
              style={styles.bouton}
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
            <ThemedText type="screenTitle">Rattacher mon adresse</ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              Une adresse, puis un code reçu par email — pas de mot de passe. Ton bilan reste le
              tien.
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
            title={envoi ? 'Envoi…' : 'Recevoir un code'}
            onPress={() => void demander()}
            disabled={!valide || envoi}
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
  centre: { flex: 1, justifyContent: 'center', gap: Spacing.three },
  bouton: { marginTop: Spacing.two },
});
