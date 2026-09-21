import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/auth/text-field';
import { TextLink } from '@/components/text-link';
import { MessageInline } from '@/components/message-inline';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SaisieDuCode } from '@/components/auth/saisie-du-code';
import { Radius, Spacing } from '@/constants/theme';
import { demanderLaConnexion } from '@/lib/auth';
import { effacerLesMarquesLocales, lireEtatDuCompte } from '@/lib/compte';
import { lireAdresseDuLien, memoriserAdresseDuLien } from '@/lib/connexion-prefs';
import {
  adresseSemblePlausible,
  messageDeLaDemande,
  messageDuRetourDeLien,
  motifRetourLien,
  suiteDeLaDemandeDeCode,
} from '@/types/connexion';
import { track } from '@/lib/analytics';
import { sourceRetrouver } from '@/types/analytics';

// "Retrouver mon compte" — l'écran qui manquait (docs/design/v1-10-retrouver-son-compte) :
// jusqu'à v1-10, le produit n'avait aucun chemin vers un compte *existant*. Sur un nouvel
// appareil, la personne reçoit une session anonyme vide qui n'est pas son compte, et tout
// `src/lib/auth.ts` rattache une identité à cette session-là. D'où un code à usage unique
// envoyé à l'adresse du compte (`demanderLaConnexion`, `shouldCreateUser: false`) — le même
// geste qu'un compte Google, qui porte lui aussi une adresse.
//
// **C'était un lien jusqu'au 20/09/2026, et le code règle un échec qui n'était pas rattrapable** :
// en PKCE, un lien ne vaut que dans le navigateur qui l'a demandé, donc le bilan fait sur un
// ordinateur et l'e-mail lu sur un téléphone ne pouvaient pas se rejoindre. Le code ne sait pas
// d'où il vient — il n'y a plus d'« ici ».
//
// Cet écran a remplacé « Mot de passe oublié », qui faisait déjà ce travail par effet de bord
// (un lien de réinitialisation reconnecte) sous un mauvais nom. Le mot de passe a disparu
// avec lui (v1-10 §2.D).
//
// Quatre états, jamais un Alert (window.alert() n'invoque pas onPress sur web) :
//   - `collision` : cet appareil porte déjà un bilan anonyme. Supabase ne fusionne pas deux
//     utilisateurs ; on le dit et on laisse choisir (canvas, « ce qui a été écarté ») ;
//   - `saisie` : l'adresse ;
//   - `code` : la saisie du code — même écran que l'adresse ait un compte ou non ;
//   - `chargement` : le temps de savoir s'il y a collision.
type Phase = 'chargement' | 'collision' | 'saisie' | 'code';

/**
 * Un paramètre d'URL vient de l'extérieur : on ne le relaie pas tel quel dans une mesure — d'où
 * `sourceRetrouver`, qui **dérive** le garde de la liste déclarée au lieu de la recopier.
 *
 * **Ce commentaire décrivait un manque qui a été comblé**, et il l'a décrit un jour de trop : il
 * disait que la porte `lien` était « émise sans être déclarée », donc comptée comme l'accueil de
 * l'onboarding, et donnait la ligne à ajouter le jour où la liste l'accueillerait. Elle l'accueille
 * depuis le 20/09/2026 — avec `rappel`, `plan_vide`, `suivi_vide` et `session_refusee`, les quatre
 * autres portes muettes trouvées le même jour —, et le garde les rend toutes. Relevé en
 * contre-lisant le chantier du code, et c'est la famille de défaut que cette relecture cherche :
 * **une phrase qui décrit ce que le code faisait avant.**
 *
 * La règle qu'il énonçait, elle, reste vraie et vaut d'être gardée : les deux côtés s'ajoutent
 * ensemble ou pas du tout — une valeur émise et non déclarée ne passe pas le typecheck, une valeur
 * déclarée que rien n'émet se lit **zéro** (CLAUDE.md).
 */
/**
 * Sortir d'ici sans cul-de-sac.
 *
 * Le layout racine ouvre cet écran en `replace` quand une URL entrante porte un lien mort : au
 * démarrage à froid, `/` était la seule entrée de pile, donc après le remplacement `canGoBack()`
 * est faux et un `router.back()` nu **ne fait rien du tout**. Les deux sorties de l'écran étaient
 * exactement ça : quelqu'un qui clique un lien expiré restait enfermé sur l'écran où on venait de
 * le déposer, la phase « envoyé » ne menant nulle part non plus. La racine sait toujours où
 * envoyer la personne (plan si un bilan est complété, onboarding sinon).
 */
function revenirOuRacine() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function RetrouverMonCompte() {
  // `email` prérempli quand on arrive de /connexion/email après un `email_exists`. `source`
  // dit par quelle porte on est entré — l'accueil de l'onboarding ou l'écran email — et c'est
  // la moitié de ce qu'on cherche à savoir : combien de personnes changent d'appareil **avant**
  // de refaire un bilan, la porte qui doit rendre la collision rare (v1-10 §2.D).
  // **Pas de `email` ici**, et l'absence est délibérée : plus aucun appelant n'en passe, et le
  // déclarer se lirait « réservé » quand c'est « retiré » — l'adresse de quelqu'un n'a rien à
  // faire dans une barre d'adresse. Elle se relit en local, plus bas.
  const params = useLocalSearchParams<{ source?: string; motif?: string }>();

  // **`motif` est la seule surface où un lien mort se voit.** Le layout racine ouvre cet écran
  // quand l'URL entrante porte un échec au lieu de jetons (A1-6, A6-6) ; il relit le paramètre par
  // son garde plutôt que de le croire, et le message part dans un `MessageInline` — en `collision`
  // comme en `saisie`, puisque c'est la collision qui s'affiche en premier neuf fois sur dix, et
  // qu'il se garde d'une phase à l'autre jusqu'à la tentative suivante, qui l'efface.
  const motif = motifRetourLien(params.motif);
  const [phase, setPhase] = useState<Phase>('chargement');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(
    motif ? messageDuRetourDeLien(motif) : null
  );

  useEffect(() => {
    let annule = false;
    lireEtatDuCompte()
      .then((etat) => {
        if (annule) return;
        const collision = etat.kind === 'anonyme-avec-donnees';
        setPhase(collision ? 'collision' : 'saisie');
        // **L'affichage se mesure ici, pas au montage.** L'écran ne sait pas encore, en
        // arrivant, s'il y a collision — et c'est ce booléen qui porte toute la valeur de la
        // mesure. `useTrackView` émettrait trop tôt, avec la moitié de l'information.
        track('retrouver_view', { source: sourceRetrouver(params.source), collision });
      })
      .catch(() => {
        if (!annule) setPhase('saisie');
      });
    return () => {
      annule = true;
    };
    // Volontairement au montage seul : `params.source` ne change pas pendant la vie de l'écran.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Arrivée par un lien qui n'a pas marché, **ou** renvoyée ici par `/connexion/email` sur une
  // adresse déjà prise : l'adresse est celle qu'on a demandée ou saisie depuis cet appareil,
  // relue en local et jamais déduite d'une réponse serveur (non-divulgation, cf.
  // `src/lib/connexion-prefs.ts`). Sans elle, une expiration ou une collision se paie d'une
  // ressaisie. Ne s'écrit que sur un champ encore vide : une frappe en cours passe avant.
  //
  // **Le second cas passait l'adresse en paramètre d'URL** — donc dans la barre d'adresse, dans
  // l'historique du navigateur et dans les journaux d'accès. Le mécanisme local existait déjà à
  // dix lignes de là ; c'est son garde qui l'écartait de ce chemin-là.
  useEffect(() => {
    if (!motif && params.source !== 'email') return;
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

  const envoyerLeLien = async () => {
    setMessage(null);
    if (!adresseSemblePlausible(email)) {
      setMessage('Cette adresse semble incomplète.');
      return;
    }
    setBusy(true);
    // Émis à la demande, pas au résultat : la réponse est volontairement la même que l'adresse
    // ait un compte ou non, et compter les envois « réussis » reviendrait à enregistrer une
    // information que l'écran refuse d'afficher.
    track('retrouver_send');
    const { error } = await demanderLaConnexion(email);
    setBusy(false);
    // Gardée avant toute lecture du retour, pour la même raison que la réponse est unique : on
    // ne sait pas — et on ne veut pas savoir — si un code est parti. Ce qui est sûr, c'est que
    // cette adresse est celle que la personne vient de taper sur cet appareil.
    await memoriserAdresseDuLien(email);

    // **La demande n'a pas abouti : « Regarde tes emails » serait faux, et l'attente sans
    // fin** (A6-12). C'est le pire endroit du produit pour un échec muet — le seul chemin vers
    // un compte existant. Le tri reste une liste blanche (`suiteDeLaDemandeDeCode`) : limite
    // d'envoi et panne de transport se disent, et **tout le reste mène à l'écran de code**, y
    // compris le 422 d'une adresse inconnue.
    if (suiteDeLaDemandeDeCode('connexion', error) === 'message') {
      setMessage(messageDeLaDemande(error));
      return;
    }
    setPhase('code');
  };

  if (phase === 'chargement') {
    return <ThemedView style={styles.container} />;
  }

  if (phase === 'collision') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <View style={styles.textBlock}>
              <ThemedText type="screenTitle">
                Cet appareil porte déjà un bilan
              </ThemedText>
              <ThemedText type="body" themeColor="textSecondary">
                Tu as répondu au questionnaire ici, sans compte. En retrouvant le tien, c&apos;est
                son historique qui s&apos;ouvre — ce bilan-ci ne le rejoindra pas.
              </ThemedText>
              <ThemedText type="body" themeColor="textSecondary">
                On peut le refaire ensemble après, ça va vite.
              </ThemedText>
              {/* **Le motif s'affiche ici aussi, et c'est le cas le plus fréquent.** Un appareil
                  qui a demandé un code porte presque toujours un bilan anonyme : `collision` est
                  donc aussi l'écran que voit la personne dont un lien parti avant le 20/09/2026
                  revient mort — et sans
                  cette ligne rien ne lui disait pourquoi l'app s'était ouverte là — exactement le
                  silence que le paramètre existe pour supprimer. */}
              <MessageInline message={message} />
            </View>
          </View>
          <View style={styles.footer}>
            <Button title="Retrouver mon compte" onPress={() => setPhase('saisie')} />
            <Button
              title="Garder ce bilan sur cet appareil"
              variant="secondary"
              onPress={revenirOuRacine}
            />
            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
              Garder ce bilan te laisse sans compte : il restera sur cet appareil, et là seulement.
            </ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (phase === 'code') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <SaisieDuCode
            contexte="connexion"
            adresse={email.trim()}
            libelleBouton="Retrouver mon compte"
            onOuverte={async () => {
              // **On change d'utilisateur ici**, et les marques locales décrivent celui qu'on
              // quitte : annonce de rattachement, étape du premier parcours (qui décide de la
              // barre d'onglets), brouillon. Le retour de lien ne les balayait pas — le défaut
              // relevé par le canvas v1-21 (`v1-27` §12.12) —, le chemin par code le fait.
              await effacerLesMarquesLocales();
              // La racine route vers le plan si le compte retrouvé porte un bilan complété, vers
              // l'onboarding sinon.
              router.replace('/');
            }}
            onAutreAdresse={() => {
              setMessage(null);
              setPhase('saisie');
            }}
            renvoyer={demanderLaConnexion}
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
            <ThemedText type="screenTitle">
              Retrouver mon compte
            </ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              Indique l&apos;adresse de ton compte : un code à taper ici te reconnecte, avec tes
              bilans et ton plan.
            </ThemedText>
          </View>
          <View style={styles.fields}>
            <TextField
              label="Adresse email du compte"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              placeholder="toi@exemple.fr"
            />
            <MessageInline message={message} />
            <Button
              title={busy ? 'Envoi…' : 'Recevoir un code'}
              onPress={envoyerLeLien}
              disabled={busy || !adresseSemblePlausible(email)}
            />
          </View>
          {/* Pas décorative : le mécanisme marche pour un compte Google, mais quelqu'un qui
              n'a jamais tapé de mot de passe ne pensera pas à chercher une « adresse email ».
              Sans cette carte, la moitié des gens concernés se croient exclus. */}
          <ThemedView type="backgroundSelected" style={styles.card}>
            <ThemedText type="small" weight={600}>
              Ton compte est un compte Google ?
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              C&apos;est la même adresse — celle de ton compte Google. Pas besoin de mot de passe :
              le code suffit.
            </ThemedText>
          </ThemedView>
        </View>
        <View style={styles.footer}>
          <ThemedText type="small" themeColor="textTertiary" style={styles.hint}>
            Tu n&apos;as jamais créé de compte ? Reviens en arrière : tout est accessible sans.
          </ThemedText>
          <TextLink
            label="Retour"
            onPress={revenirOuRacine}
            role="link"
            type="small"
            themeColor="textTertiary"
            style={styles.hint}
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
  fields: { gap: Spacing.three },
  card: { borderRadius: Radius.card, padding: 20, gap: 8 },
  footer: { gap: Spacing.three },
  hint: { textAlign: 'center' },
});
