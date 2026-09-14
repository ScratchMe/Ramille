import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { MessageInline } from '@/components/message-inline';
import { RamilleDit } from '@/components/ramille-dit';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { deleteMyAccount, exportMyData } from '@/lib/compte';
import { APP_NAME } from '@/constants/produit';
import { RAMILLE } from '@/constants/mascotte';

// Section « Mes données » de l'écran « Toi » (`src/app/compte/index.tsx`) — droit d'accès, de
// portabilité et à l'effacement (RGPD art. 15, 20, 17), et **bloqueur Google Play** pour la
// suppression (T12). Elle vivait au bas de /suivi jusqu'à v1-11 §2.5 ; c'est cet écran-là que
// nomment les instructions de `/confidentialite`, de `/conditions` et de la page publique
// `/compte/suppression`, et ces textes doivent bouger ensemble. Ils désignent le chemin par les
// mots que le produit prononce — « Ton compte » (l'`accessibilityLabel` de `CompteBouton`), puis
// l'écran « Toi », puis cette section — et non par une paraphrase comme « icône de compte », qui
// n'existe nulle part à l'écran ni au lecteur d'écran.
//
// Trois partis pris de forme :
//
//   - **la confirmation est un état de composant, jamais un `Alert`.** Sur web, `Alert.alert`
//     retombe sur `window.alert()`, qui n'invoque pas fiablement `onPress` : la suppression ne
//     partirait jamais. Même piège que sur les écrans de connexion (cf. CLAUDE.md).
//   - **aucune tentative de retenir la personne.** Pas de « es-tu sûr de perdre tes 3 bilans ? »,
//     pas de bouton « Rester » mis en avant. On dit ce qui sera supprimé parce que c'est une
//     information utile, et on s'arrête là. Un produit qui rend le départ pénible ne mérite pas
//     la confiance qu'il demande par ailleurs.
//   - **ce que l'export promet dépend de la plateforme.** Sur web, un vrai fichier JSON arrive
//     dans les téléchargements ; sur natif, le JSON part en texte dans la feuille de partage
//     (cf. `src/lib/compte.ts`, où la dégradation et sa sortie sont expliquées). Promettre un
//     fichier des deux côtés, puis annoncer « Export généré. » quand la feuille a peut-être été
//     refermée sans rien choisir, affirmait deux fois un résultat qu'on n'a pas (A5-18, A6-18).
//     Le message de succès vient donc de `exportMyData`, seul endroit qui sait ce qui s'est
//     vraiment passé.
export function MonCompte() {
  const [confirmation, setConfirmation] = useState(false);
  const [busy, setBusy] = useState<'export' | 'suppression' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // **La suppression a maintenant un après, et c'est un revirement assumé** (C3.10, point 3,
  // constat A6-19). Le commentaire d'origine défendait l'absence d'écran : « on repart de zéro,
  // sans écran intermédiaire qui annoncerait une suppression déjà faite ». L'argument confond deux
  // choses — annoncer la suppression **avant** (ce serait mentir) et la confirmer **après** (ce
  // dont la personne a besoin). En l'état, on venait de supprimer son compte et on se retrouvait
  // sur l'accueil de l'onboarding sans un mot : rien ne disait que ça avait marché, et l'écran
  // d'arrivée est précisément celui de quelqu'un qui n'a jamais rien fait.
  //
  // La page web `/compte/suppression` le disait déjà, avec la même phrase et le même mot de
  // Ramille. Deux chemins vers le même acte qui ne le reconnaissent pas pareil, c'est le genre
  // d'asymétrie que ce dépôt traque ailleurs.
  const [supprime, setSupprime] = useState(false);

  const exporter = async () => {
    setBusy('export');
    setMessage(null);
    const result = await exportMyData();
    setBusy(null);
    setMessage(result.message);
  };

  const supprimer = async () => {
    setBusy('suppression');
    setMessage(null);
    const result = await deleteMyAccount();
    if (!result.ok) {
      setBusy(null);
      setMessage(result.message);
      return;
    }
    // Pas de navigation ici : c'est « Revenir au début » qui la déclenche, quand la personne a lu.
    // La racine recréera alors une session anonyme et renverra vers l'onboarding.
    setBusy(null);
    setSupprime(true);
  };

  // L'état terminal remplace la carte entière : ce qu'elle proposait — exporter, supprimer — n'a
  // plus d'objet, et le laisser affiché sous un « C'est fait » inviterait à recommencer.
  if (supprime) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText weight={600} type="small">
          C’est fait.
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Ton compte et tout ce qui s’y rattachait — bilans, plan, points de suivi, retours — ont
          été supprimés définitivement.
        </ThemedText>
        <RamilleDit ligne={RAMILLE.auRevoir} mood="calm" size={44} tilt={-7} />
        <Button title="Revenir au début" onPress={() => router.replace('/')} />
      </ThemedView>
    );
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText weight={600} type="small">
        Mes données
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary">
        {Platform.OS === 'web'
          ? `Tu peux récupérer l’intégralité de ce que ${APP_NAME} sait de toi, dans un fichier JSON, ou tout supprimer définitivement.`
          : `Tu peux récupérer l’intégralité de ce que ${APP_NAME} sait de toi, au format JSON : il part dans l’application que tu choisis. Pour un fichier à conserver, ouvre ${APP_NAME} dans un navigateur. Tu peux aussi tout supprimer définitivement.`}
      </ThemedText>

      <View style={styles.actions}>
        <Button
          title={
            busy === 'export'
              ? 'Génération…'
              : Platform.OS === 'web'
                ? 'Télécharger mes données'
                : 'Exporter mes données'
          }
          variant="secondary"
          onPress={exporter}
          disabled={busy !== null}
        />

        {!confirmation ? (
          <TextLink
            label="Supprimer mon compte"
            hint="Demande une confirmation avant de supprimer quoi que ce soit"
            onPress={() => setConfirmation(true)}
            disabled={busy !== null}
            type="small"
            themeColor="textTertiary"
            style={styles.link}
          />
        ) : (
          <View style={styles.confirmation}>
            <ThemedText type="small" themeColor="textSecondary">
              Tes bilans, ton plan, tes points de suivi et tes retours seront supprimés
              définitivement. Cette action est irréversible.
            </ThemedText>
            <View style={styles.confirmationActions}>
              <TextLink
                label="Annuler"
                onPress={() => setConfirmation(false)}
                disabled={busy !== null}
                type="small"
                themeColor="textTertiary"
                style={styles.link}
              />
              <Button
                title={busy === 'suppression' ? 'Suppression…' : 'Supprimer définitivement'}
                onPress={supprimer}
                disabled={busy !== null}
                flex
              />
            </View>
          </View>
        )}
      </View>

      {/* **`MessageInline` et non un `ThemedText` nu** (A5-16) : le texte qui apparaît dans la
          page n'est annoncé par aucun lecteur d'écran, contrairement à la boîte système qu'il a
          remplacée — le composant existe pour porter ce `role="alert"` / `accessibilityLiveRegion`
          au même endroit pour tout le monde. Ici l'échec de la suppression exigée par Google Play
          et celui de l'export RGPD étaient donc muets pour qui ne voit pas l'écran.

          **Le succès y passe aussi, et c'est voulu** : sur natif, le message d'`exportMyData` est
          le seul retour de l'export — la feuille de partage s'est ouverte, rien d'autre ne le dit.
          Il reste en `polite` : c'est une nouvelle, pas une urgence, et `assertive` couperait la
          parole au lecteur d'écran en plein geste. */}
      <MessageInline message={message} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, padding: Spacing.four, gap: Spacing.two },
  actions: { gap: Spacing.three, marginTop: Spacing.two },
  confirmation: { gap: Spacing.three },
  confirmationActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  link: { textDecorationLine: 'underline' },
});
