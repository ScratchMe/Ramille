import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { MessageInline } from '@/components/message-inline';
import { RamilleDit } from '@/components/ramille-dit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { RAMILLE } from '@/constants/mascotte';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { demanderLaPermission, enregistrerLeJeton } from '@/lib/rappels';
import { setReminderChannel, marquerFeuilleDeRappelVue, type ReminderPrefs } from '@/lib/notification-prefs';
import {
  libelleBouton,
  lignesDeReglage,
  type Boucle,
  type CanalPrefere,
  type Permission,
} from '@/types/rappels';

/**
 * La feuille — le moment où Ramille explique comment le suivi va se passer, et demande la
 * permission de prévenir. Juste après « C'est noté », une fois par appareil.
 * Canvas : `docs/design/v1-12-rappels/Main.dc.html` (direction B), v1-12 §6.1.
 *
 * **Pourquoi une feuille à elle et pas un encart sous la carte d'action.** Les cartes du plan
 * portent des kilos, le cap aussi ; la règle « jamais la mascotte à côté d'un chiffre lourd »
 * y interdisait le visage. Ici il n'y a aucun chiffre, donc Ramille peut parler en personne —
 * et il y a la place de dire ce qui va se passer **avant** de demander quoi que ce soit.
 *
 * **La demande est en deux temps, et ce n'est pas un luxe.** Sur Android 13 et plus, le
 * dialogue système ne s'affiche plus jamais après deux refus. Un « non » ici ne coûte rien ;
 * un « non » au système ferme le canal pour de bon. D'où le libellé du bouton, qui n'annonce
 * un dialogue que s'il va vraiment s'en ouvrir un.
 */
export function FeuilleRappels({
  prefs,
  boucle,
  permission,
  onFerme,
}: {
  prefs: ReminderPrefs;
  boucle: Boucle;
  permission: Permission;
  /** Le canal retenu, pour que le plan rafraîchisse sa carte d'attente sans relire la base. */
  onFerme: (canal: CanalPrefere, jetonActif: boolean) => void;
}) {
  const theme = useTheme();

  // Présélection : ce que la personne a déjà, ou la notification quand elle est possible.
  const [canal, setCanal] = useState<CanalPrefere>(
    Platform.OS === 'web' ? 'email' : prefs.prefere
  );
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const lignes = lignesDeReglage({
    ...prefs,
    prefere: canal,
    plateforme: Platform.OS === 'web' ? 'web' : 'natif',
  });

  const valider = async () => {
    setOccupe(true);
    setErreur(null);

    const ok = await setReminderChannel(canal);
    if (!ok) {
      setOccupe(false);
      setErreur('Ton choix n’a pas été enregistré. Vérifie ta connexion et réessaie.');
      return;
    }

    // Le dialogue système, seulement si la personne a dit oui chez nous.
    let jetonActif = prefs.jetonActif;
    if (canal === 'push' && permission !== 'fermee') {
      const apres = await demanderLaPermission();
      if (apres === 'accordee') {
        await enregistrerLeJeton();
        jetonActif = true;
      }
    }

    await marquerFeuilleDeRappelVue();
    setOccupe(false);
    onFerme(canal, jetonActif);
  };

  return (
    <Modal
      visible
      animationType="slide"
      transparent
      // Le geste de retour ferme la feuille sans rien choisir : refuser de la fermer serait
      // transformer une proposition en passage obligé.
      onRequestClose={() => {
        void marquerFeuilleDeRappelVue();
        onFerme(prefs.prefere, prefs.jetonActif);
      }}
    >
      <View style={styles.fond}>
        <ThemedView style={[styles.feuille, { borderColor: theme.border }]}>
          <View style={[styles.poignee, { backgroundColor: theme.border }]} />

          <RamilleDit
            ligne={boucle === 'hebdo' ? RAMILLE.engagementAttenteHebdo : RAMILLE.engagementAttenteMensuel}
            mood="calm"
            size={44}
            themeColor="text"
            style={styles.mot}
          />

          <ThemedText type="body" themeColor="textSecondary">
            {RAMILLE.choixCanal}
          </ThemedText>

          <View style={styles.lignes} accessibilityRole="radiogroup">
            {lignes.map((ligne) => (
              <Pressable
                key={ligne.canal}
                onPress={() => ligne.choisissable && setCanal(ligne.canal)}
                disabled={!ligne.choisissable || occupe}
                accessibilityRole="radio"
                accessibilityLabel={`${ligne.titre}. ${ligne.detail}`}
                accessibilityState={{
                  selected: ligne.choisi,
                  checked: ligne.choisi,
                  disabled: !ligne.choisissable,
                }}
                style={[
                  styles.ligne,
                  {
                    backgroundColor: ligne.choisi ? theme.backgroundSelected : theme.backgroundElement,
                    borderColor: ligne.choisi ? theme.accent : 'transparent',
                    opacity: ligne.choisissable ? 1 : 0.6,
                  },
                ]}
              >
                <ThemedText weight={ligne.choisi ? 600 : 400} style={styles.titre}>
                  {ligne.titre}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {ligne.detail}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <MessageInline message={erreur} />

          <Button title={libelleBouton(canal, permission)} onPress={valider} disabled={occupe} />

          <ThemedText type="small" themeColor="textTertiary" style={styles.sortie}>
            Tu pourras changer d’avis dans « Toi ».
          </ThemedText>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(19, 22, 18, 0.42)' },
  feuille: {
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  poignee: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.two },
  mot: { alignItems: 'flex-start' },
  lignes: { gap: Spacing.two },
  ligne: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.field,
    borderWidth: 1.5,
    gap: 2,
  },
  titre: { fontSize: 16, lineHeight: 22 },
  sortie: { textAlign: 'center' },
});
