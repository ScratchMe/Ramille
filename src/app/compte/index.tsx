import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { MonCompte } from '@/components/compte/mon-compte';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CONTACT_EMAIL } from '@/constants/editeur';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTrackView } from '@/hooks/use-track-view';
import { lireEtatDuCompte } from '@/lib/compte';
import { loadReminderPrefs, setReminderPrefs, type ReminderPrefs } from '@/lib/notification-prefs';
import { type EtatSuppression } from '@/types/compte-suppression';

// « Toi » — tout ce qui touche au compte, sorti de /suivi (v1-11 §2.5).
//
// Il vivait au bas du suivi, avec cette justification : « /suivi est la seule surface qui
// parle du compte dans la durée, un écran de plus serait un écran de plus à trouver ». Elle
// tombe avec la barre d'onglets : le compte a maintenant une porte visible depuis les deux
// lieux, et le suivi retrouve son sujet — les bilans et les points répondus.
//
// Cet écran vit **hors du groupe (tabs)** : il s'ouvre par-dessus, sans barre. C'est un
// détour, pas un troisième lieu.
export default function Compte() {
  useTrackView('compte_view');

  const theme = useTheme();
  const [etat, setEtat] = useState<EtatSuppression | null>(null);
  const [rappels, setRappels] = useState<ReminderPrefs | null>(null);

  useEffect(() => {
    let annule = false;
    lireEtatDuCompte()
      .then((e) => !annule && setEtat(e))
      .catch(() => !annule && setEtat({ kind: 'inconnu' }));
    loadReminderPrefs()
      .then((p) => !annule && setRappels(p))
      .catch(() => undefined);
    return () => {
      annule = true;
    };
  }, []);

  const basculerRappels = async (valeur: boolean) => {
    setRappels((p) => (p ? { ...p, enabled: valeur } : p));
    await setReminderPrefs(valeur);
  };

  const rattache = etat?.kind === 'rattache';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.contenu} showsVerticalScrollIndicator={false}>
          <View style={styles.page}>
            <TextLink
              label="Retour"
              onPress={() => router.back()}
              role="link"
              type="small"
              themeColor="textTertiary"
              containerStyle={styles.retour}
            />
            <ThemedText type="screenTitle">Toi</ThemedText>

            {/* `etatDuCompte` distingue une adresse écrite d'une adresse confirmée : entre
                `updateUser({ email })` et le clic de confirmation, la ligne porte déjà
                l'adresse alors que le compte n'est pas rattaché. */}
            {rattache ? (
              <ThemedText type="body" themeColor="textSecondary">
                {etat.email
                  ? `Ton compte est rattaché à ${etat.email}. Ton bilan te suit d’un appareil à l’autre.`
                  : 'Ton compte est rattaché. Ton bilan te suit d’un appareil à l’autre.'}
              </ThemedText>
            ) : (
              <>
                <ThemedText type="body" themeColor="textSecondary">
                  Ton bilan reste sur cet appareil. Un compte le fait te suivre ailleurs.
                </ThemedText>
                <Button
                  title="Rattacher un compte"
                  onPress={() => router.push({ pathname: '/connexion', params: { source: 'compte' } })}
                  style={styles.bouton}
                />
              </>
            )}

            {rappels?.canReceive && (
              <View style={[styles.ligne, { borderBottomColor: theme.border }]}>
                <View style={styles.ligneTexte}>
                  <ThemedText weight={600} type="small">
                    Rappels par email
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Un mot à chaque point de suivi, jamais plus.
                  </ThemedText>
                </View>
                <Switch
                  value={rappels.enabled}
                  onValueChange={basculerRappels}
                  accessibilityLabel="Recevoir les rappels par email"
                />
              </View>
            )}

            <MonCompte />

            <View style={styles.liens}>
              <TextLink
                label="Un retour à nous faire ?"
                onPress={() => router.push('/feedback')}
                role="link"
                type="small"
                weight={600}
                themeColor="accentText"
              />
              <TextLink
                label="Confidentialité"
                onPress={() => router.push('/confidentialite')}
                role="link"
                type="small"
                themeColor="textTertiary"
              />
              <TextLink
                label="Conditions d’utilisation"
                onPress={() => router.push('/conditions')}
                role="link"
                type="small"
                themeColor="textTertiary"
              />
              <ThemedText type="code" themeColor="textTertiary" style={styles.contact}>
                Une question ? Écris à {CONTACT_EMAIL}.
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  contenu: { padding: Spacing.four, paddingBottom: Spacing.six },
  page: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  retour: { alignSelf: 'flex-start' },
  bouton: { marginTop: Spacing.one },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  ligneTexte: { flex: 1, minWidth: 0, gap: 2 },
  liens: { gap: Spacing.one, marginTop: Spacing.two },
  contact: { marginTop: Spacing.two },
});
