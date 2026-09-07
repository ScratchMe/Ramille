import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TextField } from '@/components/auth/text-field';
import { Button } from '@/components/button';
import { RamilleDit } from '@/components/ramille-dit';
import { TextLink } from '@/components/text-link';
import { MessageInline } from '@/components/message-inline';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CONTACT_EMAIL } from '@/constants/editeur';
import { RAMILLE } from '@/constants/mascotte';
import { APP_NAME } from '@/constants/produit';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { APP_URL } from '@/lib/app-url';
import { sendAccountAccessLink } from '@/lib/auth';
import { deleteMyAccount, lireEtatDuCompte } from '@/lib/compte';
import { type EtatSuppression } from '@/types/compte-suppression';
import { adresseSemblePlausible, estLimiteDEnvoi } from '@/types/connexion';

// Page publique de suppression de compte — **exigée par Google Play** en plus du chemin
// dans l'app : la fiche réclame une URL atteignable depuis un navigateur, par quelqu'un qui
// a déjà désinstallé l'application. C'est ce dernier point qui commande toute la mécanique
// ci-dessous.
//
// Le problème, propre au modèle d'auth de Ramille : cette personne arrive dans un navigateur
// où `ensureSession` vient de créer une session anonyme **vide**, qui n'est pas son compte.
// Aucune des fonctions d'auth existantes ne pouvait l'aider — elles rattachent toutes une
// identité à la session courante. D'où `sendAccountAccessLink`, premier chemin du produit
// vers un compte *déjà existant*, et `shouldCreateUser: false` pour qu'une page de
// suppression ne puisse jamais fabriquer un compte.
//
// Trois états, dérivés dans `src/types/compte-suppression.ts` et testés là-bas :
//   - `rattache` : on sait à qui appartient le compte, on le nomme et on le supprime ;
//   - `anonyme-avec-donnees` : pas de compte, mais un bilan bien réel attaché à ce
//     navigateur — c'est la personne, et ses données méritent le même bouton ;
//   - `inconnu` : rien d'identifiable, on envoie un lien à l'adresse du compte.
//
// La confirmation est un état de composant et jamais un `Alert` : sur web, `Alert.alert`
// retombe sur `window.alert()`, qui n'invoque pas fiablement `onPress` — la suppression ne
// partirait jamais (cf. CLAUDE.md).
type Phase =
  | { kind: 'chargement' }
  | { kind: 'pret'; etat: EtatSuppression; confirme: boolean }
  | { kind: 'lien-envoye' }
  | { kind: 'supprime' };

export default function SuppressionCompte() {
  const [phase, setPhase] = useState<Phase>({ kind: 'chargement' });
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    lireEtatDuCompte()
      .then((etat) => {
        if (!annule) setPhase({ kind: 'pret', etat, confirme: false });
      })
      .catch(() => {
        if (!annule) setPhase({ kind: 'pret', etat: { kind: 'inconnu' }, confirme: false });
      });
    return () => {
      annule = true;
    };
  }, []);

  const envoyerLeLien = async () => {
    setMessage(null);
    if (!adresseSemblePlausible(email)) {
      setMessage('Cette adresse semble incomplète.');
      return;
    }
    setBusy(true);
    // Le lien ramène ici : au retour, la session est celle du compte et l'écran passe de
    // lui-même en « rattaché ».
    const { error } = await sendAccountAccessLink(email, `${APP_URL}/compte/suppression`);
    setBusy(false);

    // Un seul cas mérite un message distinct : la limite d'envoi, où réessayer tout de suite
    // ne servirait à rien (cf. `estLimiteDEnvoi`, partagée avec `/connexion/retrouver`).
    if (estLimiteDEnvoi(error)) {
      setMessage('Trop de demandes coup sur coup. Réessaie dans quelques minutes.');
      return;
    }

    // Tout le reste mène au même écran, y compris l'échec. Une adresse sans compte renvoie un
    // 422 `otp_disabled` (« Signups not allowed for otp ») — c'est la preuve que
    // `shouldCreateUser: false` a fait son travail, pas une panne : le surfacer dirait à
    // n'importe qui si telle adresse a un compte Ramille.
    setPhase({ kind: 'lien-envoye' });
  };

  const supprimer = async () => {
    setBusy(true);
    setMessage(null);
    const result = await deleteMyAccount();
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setPhase({ kind: 'supprime' });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.page}>
            <ThemedText type="small" themeColor="textTertiary">
              {APP_NAME}
            </ThemedText>
            <ThemedText type="title" weight={600} style={styles.titre}>
              Supprimer mon compte
            </ThemedText>

            {phase.kind === 'chargement' && (
              <ThemedText themeColor="textSecondary" style={styles.corps}>
                Un instant, on regarde à quel compte ce navigateur est rattaché.
              </ThemedText>
            )}

            {phase.kind === 'pret' && phase.etat.kind === 'inconnu' && (
              <>
                <ThemedText themeColor="textSecondary" style={styles.corps}>
                  Ce navigateur n’est rattaché à aucun compte. Indique l’adresse de ton compte :
                  on t’envoie un lien qui te ramènera ici, connecté, pour confirmer la
                  suppression.
                </ThemedText>
                <View style={styles.bloc}>
                  <TextField
                    label="Adresse email du compte"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    placeholder="toi@exemple.fr"
                  />
                  <Button
                    title={busy ? 'Envoi…' : 'Recevoir le lien'}
                    onPress={envoyerLeLien}
                    disabled={busy}
                  />
                </View>
                <ThemedText type="small" themeColor="textTertiary" style={styles.corps}>
                  Si tu as encore l’application, c’est plus direct : écran « Mon suivi »,
                  section « Mes données ».
                </ThemedText>
              </>
            )}

            {phase.kind === 'pret' && phase.etat.kind === 'anonyme-avec-donnees' && (
              <>
                <ThemedText themeColor="textSecondary" style={styles.corps}>
                  Ce navigateur porte un bilan qui n’a jamais été rattaché à un compte. Il
                  n’existe donc nulle part ailleurs — et tu peux l’effacer ici.
                </ThemedText>
                {renduSuppression(phase.confirme)}
              </>
            )}

            {phase.kind === 'pret' && phase.etat.kind === 'rattache' && (
              <>
                <ThemedText themeColor="textSecondary" style={styles.corps}>
                  {phase.etat.email
                    ? `Tu es connecté au compte ${phase.etat.email}.`
                    : 'Tu es connecté à ton compte.'}
                </ThemedText>
                {renduSuppression(phase.confirme)}
              </>
            )}

            {phase.kind === 'lien-envoye' && (
              <>
                <ThemedText themeColor="textSecondary" style={styles.corps}>
                  Si un compte {APP_NAME} existe avec cette adresse, un lien vient d’y être
                  envoyé. Ouvre-le depuis ce navigateur : tu reviendras sur cette page,
                  connecté, et la suppression se fera en un geste.
                </ThemedText>
                <ThemedText type="small" themeColor="textTertiary" style={styles.corps}>
                  Le lien ne crée jamais de compte : s’il n’y en a pas à cette adresse, rien ne
                  part et rien n’est créé.
                </ThemedText>
              </>
            )}

            {phase.kind === 'supprime' && (
              <>
                <ThemedText themeColor="textSecondary" style={styles.corps}>
                  C’est fait. Ton compte et tout ce qui s’y rattachait — bilans, plan, points de
                  suivi, retours — ont été supprimés définitivement.
                </ThemedText>
                <RamilleDit ligne={RAMILLE.auRevoir} mood="calm" size={44} tilt={-7} />
              </>
            )}

            <MessageInline message={message} style={styles.corps} />

            <ThemedText type="small" themeColor="textTertiary" style={styles.pied}>
              Une question, ou un blocage ? Écris à {CONTACT_EMAIL}.
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );

  function renduSuppression(confirme: boolean) {
    if (!confirme) {
      return (
        <View style={styles.bloc}>
          <ThemedText type="small" themeColor="textSecondary">
            Tes bilans, ton plan, tes points de suivi et tes retours seront supprimés
            définitivement. Cette action est irréversible.
          </ThemedText>
          <Button
            title="Supprimer mon compte"
            onPress={() => setPhase((p) => (p.kind === 'pret' ? { ...p, confirme: true } : p))}
            disabled={busy}
          />
        </View>
      );
    }
    return (
      <View style={styles.bloc}>
        <ThemedText type="small" themeColor="textSecondary">
          Dernière étape : confirme, et tout part.
        </ThemedText>
        <View style={styles.actions}>
          <TextLink
            label="Annuler"
            onPress={() => setPhase((p) => (p.kind === 'pret' ? { ...p, confirme: false } : p))}
            disabled={busy}
            type="small"
            themeColor="textTertiary"
          />
          <Button
            title={busy ? 'Suppression…' : 'Supprimer définitivement'}
            onPress={supprimer}
            disabled={busy}
            flex
          />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: Spacing.four, paddingBottom: Spacing.six },
  page: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  titre: { fontSize: 32, lineHeight: 38, letterSpacing: -0.64 },
  corps: { fontSize: 16, lineHeight: 24 },
  bloc: { gap: Spacing.three },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  pied: { marginTop: Spacing.four },
});
