import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { Linking, Platform, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { GroupeDeChoix } from '@/components/bilan/groupe-de-choix';
import { FeuilleDuBas } from '@/components/feuille-du-bas';
import { LigneDeCanal } from '@/components/ligne-de-canal';
import { MessageInline } from '@/components/message-inline';
import { RamilleDit } from '@/components/ramille-dit';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { RAMILLE } from '@/constants/mascotte';
import { Spacing } from '@/constants/theme';
import { demanderLaPermission, enregistrerLeJeton } from '@/lib/rappels';
import { setReminderChannel, marquerFeuilleDeRappelVue, type ReminderPrefs } from '@/lib/notification-prefs';
import {
  canalPreselectionne,
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
 *
 * **Elle porte un titre depuis le 24/09/2026, « Les rappels »** — le nom du réglage de « Toi », où la
 * dernière ligne renvoie. Sur web, la fenêtre s'annonçait en dialogue **sans nom** (audit
 * d'accessibilité, 1.3.1) ; le cadre partagé (`FeuilleDuBas`) nomme le dialogue par son titre, et
 * celui-ci ne pouvait pas être la ligne de Ramille, qui change avec la boucle.
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
  const plateforme = Platform.OS === 'web' ? 'web' : 'natif';

  // Présélection dérivée, jamais une ligne grisée : la préférence si elle est choisissable,
  // la notification sinon sur natif (`canalPreselectionne`, module pur et testé). Calculée une
  // fois à l'ouverture — la feuille ne reste pas assez longtemps pour que l'état bouge sous
  // elle, et la recalculer écraserait le choix qui vient d'être fait.
  const [canal, setCanal] = useState<CanalPrefere>(() =>
    canalPreselectionne({ ...prefs, plateforme, permission })
  );
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const lignes = lignesDeReglage({ ...prefs, prefere: canal, plateforme, permission });

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
    //
    // `jetonActif` ne prend que ce que l'enregistrement a **vraiment** obtenu : une permission
    // accordée dont le jeton n'a pas pu s'inscrire (pas de réseau, pas d'identifiants FCM,
    // simulateur) laissait la carte d'attente promettre une notification qui ne partirait
    // jamais. Avec le booléen, elle bascule d'elle-même sur la bonne ligne du §3.
    let jetonActif = prefs.jetonActif;
    if (canal === 'push' && permission !== 'fermee') {
      const apres = await demanderLaPermission();
      jetonActif = apres === 'accordee' ? await enregistrerLeJeton() : false;
    }

    await marquerFeuilleDeRappelVue();
    setOccupe(false);
    onFerme(canal, jetonActif);
  };

  return (
    <FeuilleDuBas
      titre="Les rappels"
      // Le geste de retour ferme la feuille sans rien choisir : refuser de la fermer serait
      // transformer une proposition en passage obligé.
      onFerme={() => {
        void marquerFeuilleDeRappelVue();
        onFerme(prefs.prefere, prefs.jetonActif);
      }}
    >
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

      {/* Le rôle `radiogroup` ne porte que sur ce bloc, **nommé par la question de Ramille** qui le
          précède (24/09/2026) : il s'annonçait sans nom. Le lien des réglages y entre, parce
          qu'il appartient à la ligne « notification » : rendu après le groupe, il tombait
          sous « Sans rappel » et se lisait comme appartenant à ce choix-là (canvas
          `Main.dc.html` / `Toi.dc.html` : il suit la rangée atténuée). Il n'est pas un
          `radio` et rien ne le compte comme une option. */}
      <GroupeDeChoix question={RAMILLE.choixCanal} style={styles.lignes}>
        {lignes.map((ligne) => (
          <Fragment key={ligne.canal}>
            <LigneDeCanal ligne={ligne} onChoisir={setCanal} occupe={occupe} />

            {/* Le seul état où la phrase appelle un geste hors de l'app : les notifications
                sont fermées pour de bon côté système, et rien ici ne peut les rouvrir. */}
            {ligne.lienVersLesReglages && (
              <TextLink
                label="Ouvrir les réglages du téléphone"
                onPress={() => void Linking.openSettings()}
                role="link"
                type="small"
                weight={600}
                themeColor="accentText"
                containerStyle={styles.reglages}
              />
            )}

            {/* **La porte qui manquait, et c'est le seul ajout de produit du 20/09/2026.**
                Cette feuille demande « comment te faire signe ? » et grisait « Par email »
                avec « Rattache un compte pour l'activer » — sans rien à toucher. C'était le
                seul écran du produit qui pose la question à laquelle le compte répond, et le
                seul où on ne le proposait pas. Même forme, même place et même raison que le
                lien des réglages juste au-dessus : rendu **dans** la boucle, parce que
                détaché il se lirait comme appartenant à « Sans rappel ».

                Le `Modal` doit être refermé avant de naviguer — sur natif, une route poussée
                sous un `Modal` ouvert reste dessous. On ne change donc pas la préférence : on
                rend celle qui est déjà là, et la personne revient à une feuille qu'elle a
                déjà vue. Ce qu'elle trouve au retour est juste sans rien réécrire, la
                préférence en base valant `email` par défaut. */}
            {ligne.porteVersLeCompte && (
              <TextLink
                label="Rattacher un compte"
                onPress={() => {
                  void marquerFeuilleDeRappelVue();
                  onFerme(prefs.prefere, prefs.jetonActif);
                  router.push({ pathname: '/connexion', params: { source: 'rappels' } });
                }}
                role="link"
                type="small"
                weight={600}
                themeColor="accentText"
                containerStyle={styles.reglages}
              />
            )}
          </Fragment>
        ))}
      </GroupeDeChoix>

      <MessageInline message={erreur} />

      <Button title={libelleBouton(canal, permission)} onPress={valider} disabled={occupe} />

      <ThemedText type="small" themeColor="textTertiary" style={styles.sortie}>
        Tu pourras changer d’avis dans « Toi ».
      </ThemedText>
    </FeuilleDuBas>
  );
}

const styles = StyleSheet.create({
  mot: { alignItems: 'flex-start' },
  lignes: { gap: Spacing.two },
  reglages: { alignSelf: 'flex-start', paddingHorizontal: Spacing.four },
  sortie: { textAlign: 'center' },
});
