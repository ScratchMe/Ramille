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
import { demanderLaConnexion, demanderLeRattachement } from '@/lib/auth';
import { effacerLesMarquesLocales } from '@/lib/compte';
import {
  lireAdresseDuLien,
  lireFluxDuCode,
  memoriserAdresseDuLien,
  memoriserFluxDuCode,
} from '@/lib/connexion-prefs';
import {
  adresseSemblePlausible,
  messageDeLaDemande,
  messageDuRetourDeLien,
  motifRetourLien,
  suiteDeLaDemandeDeCode,
  type ContexteDuCode,
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
 * **Deux phases, et l'adresse déjà prise ne se dit plus** (arbitrage du 21/09/2026, `v1-28` §7.1).
 * L'écran portait une phase `deja-un-compte` qui l'annonçait — honnête, et un oracle : il répondait
 * « oui » ou « non » sur n'importe quelle adresse, sans plafond, depuis un écran qui s'atteint sans
 * bilan (vingt sondes d'affilée depuis une seule session anonyme, mesuré le 21/09/2026). Le canvas
 * proposait de tout taire, ce qui aurait fait **basculer de compte** quelqu'un qui s'est trompé
 * d'adresse, sans un mot et sans retour.
 *
 * Ce qui a été retenu est une troisième voie : une adresse prise reçoit un code de **connexion**, et
 * arrive sur la **même** saisie que l'adresse libre — même corps, même bouton, même pied, même
 * message de renvoi. Ce que la personne perd, elle le lit **avant** de taper : une phrase
 * conditionnelle (`consequenceDeLaSaisie`) dit que si un compte existait déjà à cette adresse, ce
 * code l'y ramène et le bilan de cet appareil ne l'y rejoindra pas. Vraie dans les deux branches,
 * donc montrable dans les deux, donc sans fuite — et la sortie reste : ne pas taper le code.
 *
 * Deux prix, tous deux assumés : le bouton a perdu son verbe (« Valider mon code », parce que
 * « Rattacher mon adresse » serait faux une fois sur deux), et le choix arrive **avant** de savoir
 * au lieu d'après. Ce qu'on gagne est que l'écran cesse de répondre à « telle adresse utilise-t-elle
 * Ramille ? ».
 */
export default function ConnexionEmail() {
  // `id` a disparu des paramètres lus : plus aucun écran ne le passe depuis que `/connexion` ne lit
  // plus le résultat du bilan, et le garder ici le faisait voyager `undefined` jusqu'à
  // `/connexion/retrouver` — un paramètre qui se lit « réservé » là où il est retiré. `source`, que
  // `/connexion` passe encore, n'est volontairement pas lu : la provenance de `retrouver` est la
  // porte d'ici (`'email'`), pas celle d'avant.
  const { motif: motifBrut, reprise } = useLocalSearchParams<{
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
  // **La phase porte le flux, et l'écran de collision a disparu** (arbitrage du 21/09/2026,
  // `v1-28` §7.1). Une adresse déjà prise ne mène plus à un écran qui le dit : elle reçoit un code
  // de **connexion** et arrive sur la même saisie, mot pour mot, que l'adresse libre. Le flux ne
  // sert donc plus qu'à deux choses invisibles — le `type` vérifié, et ce qu'on fait de la session
  // ouverte — et jamais à un mot de l'écran, sinon l'oracle se rouvrirait par le texte.
  const [phase, setPhase] = useState<
    { kind: 'saisie' } | { kind: 'code'; flux: ContexteDuCode }
  >({ kind: 'saisie' });

  // Deux raisons de relire l'adresse tapée sur cet appareil, et aucune ne passe par l'URL (une
  // adresse dans la barre d'adresse entre dans l'historique du navigateur et son autocomplétion) :
  // un lien périmé qui ramène ici, et la reprise depuis « Toi » quand l'onglet est parti avant la
  // saisie du code. Dans le second cas l'écran s'ouvre **directement** sur le code : celui qui est
  // déjà dans la messagerie vaut encore, et « Renvoyer un code » est là pour l'autre cas.
  useEffect(() => {
    if (!motif && !reprise) return;
    let annule = false;
    void Promise.all([lireAdresseDuLien(), lireFluxDuCode()]).then(([adresse, flux]) => {
      if (annule || !adresse) return;
      setEmail((actuelle) => (actuelle ? actuelle : adresse));
      // Pas de nouvel envoi : rien n'a échoué, on rouvre une saisie interrompue. **Le flux se relit
      // avec l'adresse** : depuis que cet écran peut envoyer l'un ou l'autre, rouvrir au hasard
      // ferait vérifier un code de connexion contre `email_change`, donc refuser un code valide.
      if (reprise && !motif) setPhase({ kind: 'code', flux });
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
      // **L'adresse a déjà un compte, et on ne le dit plus** (arbitrage du 21/09/2026). L'écran de
      // collision le disait, ce qui était honnête et offrait un choix — et faisait de cet écran un
      // oracle sans plafond sur n'importe quelle adresse (vingt sondes d'affilée depuis une seule
      // session anonyme, mesuré). On envoie donc un code de **connexion**, et la saisie qui suit est
      // celle de l'autre branche, mot pour mot. Ce que la personne perd, elle le lit avant de taper :
      // `consequenceDeLaSaisie` dit, au conditionnel, que ce code la ramènera à un compte que le
      // bilan de cet appareil ne rejoindra pas.
      const { error: erreurConnexion } = await demanderLaConnexion(email);
      // **Trié par la même liste blanche que le premier envoi**, et c'est ce qui empêche la fuite de
      // revenir par l'échec : une limite d'envoi et une panne de transport se disent, parce qu'elles
      // arrivent aussi sur une adresse libre et ne parlent jamais de l'adresse. Tout le reste mène à
      // la saisie. `otp_disabled` ne peut pas arriver ici — l'adresse existe, c'est ce qui nous a
      // amenés dans cette branche.
      if (suiteDeLaDemandeDeCode('connexion', erreurConnexion) === 'message') {
        setEnvoi(false);
        setMessage(messageDeLaDemande(erreurConnexion));
        return;
      }
      await memoriserFluxDuCode('connexion');
      setEnvoi(false);
      track('connexion_demande');
      setPhase({ kind: 'code', flux: 'connexion' });
      return;
    }

    await memoriserFluxDuCode('rattachement');
    setEnvoi(false);
    // **Une demande, pas un rattachement.** `connexion_success` n'est pas émis ici et ne l'a jamais
    // été depuis la correction du 11/09/2026 : il est émis par l'annonce de `/plan`, au constat de
    // la bascule. L'écart entre les deux **est** le taux de codes jamais tapés — c'est-à-dire la
    // mesure demandée le 20/09/2026, et elle ne tient que si ces deux émetteurs restent ce qu'ils
    // sont : retirer celui du plan ferait lire zéro succès par email.
    track('connexion_demande');
    setPhase({ kind: 'code', flux: 'rattachement' });
  };

  /**
   * Ce qu'on fait de la session ouverte — **et c'est la seule chose que le flux décide encore, avec
   * le `type` vérifié.** Les deux branches ne mènent pas au même endroit, et ça ne se voit pas :
   * l'écran de saisie est identique, la différence arrive après que le code a été tapé.
   */
  const codeAccepte = async (flux: ContexteDuCode) => {
    if (flux === 'connexion') {
      // **On vient de changer d'utilisateur**, comme sur `/connexion/retrouver` et pour la même
      // raison : les marques locales décrivent celui qu'on quitte — annonce de rattachement, étape
      // du premier parcours (qui décide de la barre d'onglets), brouillon, et l'adresse mémorisée
      // elle-même. La racine route ensuite vers le plan si le compte retrouvé porte un bilan
      // complété, vers l'onboarding sinon.
      await effacerLesMarquesLocales();
      router.replace('/');
      return;
    }
    // **On ne relit rien ici, et c'est un correctif.** Cette fonction attendait un
    // `lireEtatDuRattachement()` dont elle jetait le résultat : un aller-retour réseau inséré entre
    // le dernier chiffre et le plan, pendant lequel la personne regardait l'écran de code d'un
    // rattachement déjà réussi. `verifyOtp` a mis la session à jour en local, et c'est le plan qui
    // lit l'état, annonce le rattachement et compte le succès — lui seul en a besoin.
    router.replace('/plan');
  };

  if (phase.kind === 'code') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <SaisieDuCode
            // Le flux décide le `type` vérifié et l'envoi du renvoi. Rien d'autre : ni un mot, ni un
            // libellé, ni une carte — c'est `voix` qui gouverne tout ce qui se lit, et elle vaut
            // « parti » dans les deux branches parce qu'un code est bel et bien parti dans les deux.
            contexte={phase.flux}
            voix="parti"
            adresse={email.trim()}
            // **Un seul libellé pour les deux branches, et il a dû perdre son verbe.** Il disait
            // « Rattacher mon adresse », ce qui est faux quand l'adresse est déjà prise : rien n'est
            // rattaché, on rejoint un compte. En mettre un par branche aurait rouvert l'oracle sur
            // le bouton lui-même. C'est le second prix de l'arbitrage, après la phrase
            // conditionnelle — et le moins cher des deux.
            libelleBouton="Valider mon code"
            onOuverte={() => codeAccepte(phase.flux)}
            onAutreAdresse={() => {
              setMessage(null);
              setPhase({ kind: 'saisie' });
            }}
            renvoyer={phase.flux === 'connexion' ? demanderLaConnexion : demanderLeRattachement}
          />
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
              onPress={() => router.push({ pathname: '/connexion/retrouver', params: { source: 'email' } })}
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
