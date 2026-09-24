import { Fragment, useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Stroke } from '@/constants/theme';
import { useRafraichirAuRetour } from '@/hooks/use-rafraichir-au-retour';
import { useTheme } from '@/hooks/use-theme';
import type { ReminderPrefs } from '@/lib/notification-prefs';
import { enregistrerLeJeton, lirePermission } from '@/lib/rappels';
import { lignesDeReglage, type CanalPrefere, type Permission } from '@/types/rappels';

/**
 * Le réglage du canal de rappel sur « Toi » (canvas `docs/design/v1-12-rappels/Toi.dc.html`).
 *
 * Il remplace l'interrupteur « Rappels par email », qui n'apparaissait qu'avec un compte
 * rattaché : **le push n'a pas besoin de compte**, donc ce bloc s'affiche pour tout le
 * monde, sessions anonymes comprises.
 *
 * Trois règles portées par `lignesDeReglage` (module pur, testé), pas par cet écran :
 * les indisponibilités disent *pourquoi* ; la notification reste choisissable même après un
 * refus système, parce que la préférence ne se dégrade pas et que rouvrir les notifications
 * dans les réglages du téléphone suffit à la faire repartir ; et sur web la ligne
 * notification n'existe pas du tout plutôt que d'être grisée sans explication.
 *
 * `radio` et non `button` : c'est le seul rôle qui annonce « sélectionné » (règle T11).
 *
 * **La permission système est lue ici**, et pas reçue en accessoire : c'est un fait de
 * l'appareil, pas une donnée de compte, et seul ce bloc s'en sert. Elle est relue au retour de
 * l'app au premier plan — le lien ci-dessous envoie précisément dans les réglages du téléphone,
 * et revenir sur un texte qui dit encore « coupées » serait la seule chose que la personne
 * pourrait lire comme un échec de son geste.
 *
 * **Et le texte ne suffit pas : le retour doit réparer.** Quand la permission tombe, le
 * lancement suivant désactive le jeton de cet appareil (`enregistrerLeJeton`). Rouvrir les
 * notifications dans les réglages ne le réinscrit pas : `enregistrerLeJeton` n'est appelée
 * qu'au démarrage et au changement d'utilisateur. Sans la réinscription ci-dessous, la ligne
 * repasserait à « Le matin où la question s'ouvre. » pendant que `push_tokens` porte toujours
 * un `disabled_at` — le serveur retomberait sur l'email, ou sur rien, jusqu'au prochain
 * démarrage à froid. C'est la « petite trahison » d'A4-8, réintroduite par la porte qu'on
 * vient d'ouvrir.
 */
export function ChoixDeRappel({
  prefs,
  onChoisir,
}: {
  prefs: ReminderPrefs;
  onChoisir: (canal: CanalPrefere) => void;
}) {
  const theme = useTheme();

  // Point de départ `demandable` : c'est l'état neutre, le seul qui ne promette pas une
  // notification qui marche ni n'accuse un réglage que personne n'a touché, le temps que la
  // vraie valeur arrive (elle est locale, donc au rendu suivant).
  const [permission, setPermission] = useState<Permission>('demandable');

  const relireLaPermission = useCallback(() => {
    void lirePermission()
      .then(async (etat) => {
        setPermission(etat);
        if (etat === 'accordee') await enregistrerLeJeton();
      })
      .catch(() => undefined);
  }, []);

  useEffect(relireLaPermission, [relireLaPermission]);
  useRafraichirAuRetour(relireLaPermission);

  const lignes = lignesDeReglage({
    ...prefs,
    plateforme: Platform.OS === 'web' ? 'web' : 'natif',
    permission,
  });

  return (
    <View style={styles.bloc}>
      <View style={styles.entete}>
        <ThemedText weight={600} type="cardTitle">
          Les rappels
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Un mot à chaque point de suivi, jamais plus.
        </ThemedText>
      </View>

      {/* Le rôle `radiogroup` ne porte que sur le bloc des lignes : l'en-tête n'est pas un
          choix, et l'y inclure ferait annoncer une option qui n'en est pas une. Le lien des
          réglages, lui, vit à l'intérieur — il appartient à la ligne « notification », et le
          détacher d'elle était le défaut (voir son commentaire). */}
      <View style={styles.lignes} accessibilityRole="radiogroup">
        {lignes.map((ligne) => (
          <Fragment key={ligne.canal}>
            <Pressable
              onPress={() => ligne.choisissable && onChoisir(ligne.canal)}
              disabled={!ligne.choisissable}
              accessibilityRole="radio"
              // Le libellé annoncé recompose ce que l'œil lit sur deux lignes : le titre seul ne
              // dirait pas qu'un canal est hors d'atteinte, ni pourquoi.
              accessibilityLabel={`${ligne.titre}. ${ligne.detail}`}
              // `aria-checked`, le seul état que le web reçoive (cf. `chip.tsx`) ; l'inactivité
              // passe par `disabled`, dont `Pressable` tire `aria-disabled`.
              aria-checked={ligne.choisi}
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

            {/* Le lien du canvas, dans le seul état où il mène quelque part : les notifications
                sont fermées côté système, et c'est là-bas que ça se rouvre. Le dire sans donner
                la porte laisse chercher un réglage à trois niveaux de menu.

                **Il est rendu dans la boucle, juste sous la ligne qui le porte** (canvas
                `Toi.dc.html` : il suit la rangée atténuée et précède « Par email »). Posé après
                le groupe, il tombait sous « Sans rappel » et se lisait comme appartenant à ce
                choix-là. Il entre donc dans le `radiogroup`, ce qui est le moindre mal : ce
                n'est pas un `radio` et rien ne le compte comme une option, alors qu'un lien
                détaché de sa phrase ne désigne plus rien. */}
              {/* **`porteVersLeCompte` n'est volontairement PAS rendue ici**, et il faut le dire :
                  `lignesDeReglage` la pose à `true` sur la ligne « Par email » sans adresse, et la
                  feuille des rappels (`feuille-rappels.tsx`) la rend — ce composant non. La raison
                  est la place : sur « Toi », le bouton « Rattacher un compte » de la section compte
                  est cent pixels plus haut, et deux portes identiques sur un écran calme n'en valent
                  pas une. Sans cette note, l'écart entre les deux rendeurs d'une même dérivation se
                  lit comme un oubli — il a d'ailleurs été relevé comme tel en revue le 21/09/2026. */}

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
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloc: { gap: Spacing.two },
  entete: { gap: 2 },
  lignes: { gap: Spacing.two },
  ligne: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.field,
    borderWidth: Stroke.selected,
    gap: 2,
  },
  titre: { fontSize: 16, lineHeight: 22 },
  reglages: { alignSelf: 'flex-start', paddingHorizontal: Spacing.four },
});
