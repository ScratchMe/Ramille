import { Fragment, useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { GroupeDeChoix } from '@/components/bilan/groupe-de-choix';
import { LigneDeCanal } from '@/components/ligne-de-canal';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Stroke } from '@/constants/theme';
import { useRafraichirAuRetour } from '@/hooks/use-rafraichir-au-retour';
import { useTheme } from '@/hooks/use-theme';
import { activableALaBarreDEspace } from '@/lib/barre-d-espace';
import type { ReminderPrefs } from '@/lib/notification-prefs';
import { enregistrerLeJeton, lirePermission } from '@/lib/rappels';
import { fondDuChoix } from '@/types/fond-du-choix';
import {
  affichageDeLaVeille,
  GROUPE_DE_LA_VEILLE,
  lignesDeReglage,
  sousTitreDesRappels,
  TITRE_DE_LA_VEILLE,
  type CanalPrefere,
  type FenetreDeLaVeille,
  type Permission,
} from '@/types/rappels';

/** Le titre du bloc, écrit une fois : l'en-tête affiché et le nom du groupe de lignes. */
const TITRE = 'Les rappels';

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
 * La ligne elle-même est `LigneDeCanal`, partagée avec la feuille des rappels : `radio` et non
 * `button`, c'est le seul rôle qui annonce « sélectionné » (règle T11).
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
  fenetre,
  onChoisir,
  onChoisirLaVeille,
}: {
  prefs: ReminderPrefs;
  /** La fenêtre du mot de la veille (C4.2), `null` quand on ne l'a pas lue. */
  fenetre: FenetreDeLaVeille | null;
  onChoisir: (canal: CanalPrefere) => void;
  /** Cocher ou décocher le mot de la veille : jamais `jamais_propose`, une réponse ne se retire pas. */
  onChoisirLaVeille: (reponse: 'oui' | 'refuse') => void;
}) {
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

  const plateforme = Platform.OS === 'web' ? 'web' : 'natif';
  const lignes = lignesDeReglage({ ...prefs, plateforme, permission });

  // Le mot de la veille (C4.2) : rien, une proposition ou le réglage — la dérivation décide, l'écran
  // rend. Les deux formes se rendent ici de la même façon, une case à cocher : dans « Toi », la
  // proposition n'est que le réglage d'une personne qui n'a pas encore répondu.
  const veille = affichageDeLaVeille({ ...prefs, plateforme, reponse: prefs.reponseALaVeille, fenetre });

  return (
    <View style={styles.bloc}>
      <View style={styles.entete}>
        {/* **Un en-tête de section** (01/10/2026, audit T-15), comme « Mes données » : la page parcourue
            titre par titre sautait « Les rappels ». Niveau 2, déduit du type par `ThemedText` — l'écran
            porte déjà son titre, « Toi ». */}
        <ThemedText weight={600} type="cardTitle" accessibilityRole="header">
          {TITRE}
        </ThemedText>
        {/* Un plafond, dérivé de ce que la personne a demandé : « jamais plus » serait faux pour qui
            reçoit aussi le mot de la veille (`sousTitreDesRappels`). */}
        <ThemedText type="small" themeColor="textSecondary">
          {sousTitreDesRappels({ prefere: prefs.prefere, reponse: prefs.reponseALaVeille })}
        </ThemedText>
      </View>

      {/* Le rôle `radiogroup` ne porte que sur le bloc des lignes : l'en-tête n'est pas un
          choix, et l'y inclure ferait annoncer une option qui n'en est pas une. Il le **nomme**
          en revanche (24/09/2026) : le groupe s'annonçait sans nom. Le lien des
          réglages, lui, vit à l'intérieur — il appartient à la ligne « notification », et le
          détacher d'elle était le défaut (voir son commentaire). */}
      <GroupeDeChoix question={TITRE} style={styles.lignes}>
        {lignes.map((ligne) => (
          <Fragment key={ligne.canal}>
            <LigneDeCanal ligne={ligne} onChoisir={onChoisir} />

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

            {/* **Le mot de la veille précise « Par notification »**, et se rend donc sous elle,
                dans son propre groupe posé dans celui des canaux — la forme des révélations
                imbriquées (`GroupeDeChoix`) : la case répond au groupe le plus proche, le sien. Il
                n'existe qu'en notification (D3), donc pas ailleurs. */}
            {ligne.canal === 'push' && veille.kind !== 'rien' && (
              <GroupeDeChoix question={GROUPE_DE_LA_VEILLE} cumulable style={styles.veille}>
                <CaseDeLaVeille
                  coche={veille.kind === 'reglage' && veille.coche}
                  detail={veille.detail}
                  onBasculer={(coche) => onChoisirLaVeille(coche ? 'refuse' : 'oui')}
                />
              </GroupeDeChoix>
            )}
          </Fragment>
        ))}
      </GroupeDeChoix>
    </View>
  );
}

/**
 * La case du mot de la veille — une `checkbox`, seul rôle qui annonce coché ou non, avec la forme
 * d'une ligne de canal (fond et bordure de `fondDuChoix`, pas d'opacité) : elle précise la ligne
 * juste au-dessus et doit se lire comme de la même famille. Espace la coche sur web
 * (`activableALaBarreDEspace`), et le libellé annoncé recompose le titre et le détail — le détail
 * porte la date, ou la raison d'une pause.
 *
 * Non exportée : elle n'a qu'un rendeur, et un composant de plus dans `src/components/` demanderait
 * sa fiche au kit de design.
 */
function CaseDeLaVeille({
  coche,
  detail,
  onBasculer,
}: {
  coche: boolean;
  detail: string;
  onBasculer: (coche: boolean) => void;
}) {
  const theme = useTheme();
  const basculer = () => onBasculer(coche);

  return (
    <Pressable
      onPress={basculer}
      {...activableALaBarreDEspace(basculer)}
      accessibilityRole="checkbox"
      accessibilityLabel={`${TITRE_DE_LA_VEILLE}. ${detail}`}
      aria-checked={coche}
      style={({ pressed }) => [
        styles.case,
        {
          backgroundColor: theme[fondDuChoix({ choisi: coche, appuye: pressed })],
          borderColor: coche ? theme.accent : 'transparent',
        },
      ]}
    >
      <ThemedText weight={coche ? 600 : 400} style={styles.titreDeLaCase}>
        {TITRE_DE_LA_VEILLE}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {detail}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bloc: { gap: Spacing.two },
  entete: { gap: 2 },
  lignes: { gap: Spacing.two },
  reglages: { alignSelf: 'flex-start', paddingHorizontal: Spacing.four },
  // En retrait de la ligne qu'elle précise, du même pas que `PrecisionMode` sous un mode du
  // questionnaire.
  veille: { marginLeft: Spacing.three },
  case: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.field,
    borderWidth: Stroke.selected,
    gap: 2,
  },
  titreDeLaCase: { fontSize: 16, lineHeight: 22 },
});
