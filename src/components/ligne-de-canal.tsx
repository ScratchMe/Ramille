import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Stroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { activableALaBarreDEspace } from '@/lib/barre-d-espace';
import { fondDuChoix } from '@/types/fond-du-choix';
import { paraitChoisie } from '@/types/ligne-de-canal';
import type { CanalPrefere, LigneDeReglage } from '@/types/rappels';

/**
 * Une ligne du choix du canal de rappel — « Par notification », « Par email », « Sans rappel » —,
 * **rendue au même endroit pour ses deux écrans** : le réglage de « Toi » (`ChoixDeRappel`) et la
 * feuille ouverte après « C'est noté » (`FeuilleRappels`), 24/09/2026, `v1-29`.
 *
 * Les deux la recopiaient à la ligne près, alors que la dérivation qui la nourrit
 * (`lignesDeReglage`) était déjà partagée : deux rendus d'une même dérivation divergent au premier
 * ajustement de l'un, sans que rien ne le dise. Ce qui reste chez chaque écran est ce qui se rend
 * **sous** la ligne — le lien des réglages du téléphone, la porte vers le compte — et ce qu'on
 * fait du choix.
 *
 * `radio` et non `button` : c'est le seul rôle qui annonce « sélectionné » (règle T11). Le libellé
 * annoncé recompose ce que l'œil lit sur deux lignes : le titre seul ne dirait pas qu'un canal est
 * hors d'atteinte, ni pourquoi.
 *
 * **Une ligne hors d'atteinte le dit par son texte, jamais par une opacité** (25/09/2026). Elle
 * portait `opacity: 0.6`, ce que le kit interdit en toutes lettres (`readme.md`, puce « États » :
 * désactivé = fond élément + texte tertiaire, jamais une opacité) — et l'opacité s'appliquait à la
 * ligne entière, donc au **détail**, la seule phrase qui dit *pourquoi* le canal est hors d'atteinte
 * (« Rattache un compte pour l’activer. ») : 3,23 à 3,30:1 selon le fond de la page, sous le seuil
 * de 4,5. Désormais le titre passe en `textTertiary` (5,28:1 sur le fond des éléments), le détail
 * garde `textSecondary` (9,39:1), et le fond est celui d'un choix libre au repos. `occupe` ne change
 * rien à l'aspect : c'est un état de quelques centaines de millisecondes, le temps d'enregistrer, et
 * griser toutes les lignes à chaque choix les ferait clignoter.
 */
export function LigneDeCanal({
  ligne,
  onChoisir,
  occupe = false,
}: {
  ligne: LigneDeReglage;
  onChoisir: (canal: CanalPrefere) => void;
  /** Un enregistrement est en cours : aucune ligne ne se choisit le temps qu'il aboutisse. */
  occupe?: boolean;
}) {
  const theme = useTheme();
  // **Ce que la ligne montre choisi n'est pas `ligne.choisi`** : une ligne désactivée ne se rend
  // jamais comme choisie (`paraitChoisie`, qui dit pourquoi). Fond, bordure, graisse et état annoncé
  // lisent tous cette valeur-là, pour qu'ils ne puissent pas se contredire.
  const coche = paraitChoisie(ligne);
  // Écrits une fois pour le toucher, le clavier et l'état annoncé.
  const choisir = () => ligne.choisissable && onChoisir(ligne.canal);
  const desactivee = !ligne.choisissable || occupe;

  return (
    <Pressable
      onPress={choisir}
      // Espace choisit la ligne sur web, ce que react-native-web ne fait que pour un bouton — et
      // jamais sur une ligne désactivée (`src/lib/barre-d-espace.ts`).
      {...activableALaBarreDEspace(choisir, desactivee)}
      // `disabled` porte l'inactivité **des deux côtés** : `Pressable` de react-native-web en tire
      // `aria-disabled`, React Native le range dans l'état que TalkBack annonce. Une ligne hors
      // d'atteinte s'annonce donc « désactivée » en plus de dire pourquoi.
      disabled={desactivee}
      accessibilityRole="radio"
      accessibilityLabel={`${ligne.titre}. ${ligne.detail}`}
      // `aria-checked`, le seul état que le web reçoive (cf. `chip.tsx`).
      aria-checked={coche}
      // Sous le doigt, la surface prend sa teinte appuyée, sans animation (décision n° 6, `v1-29`).
      // Une ligne désactivée ne s'appuie pas : `Pressable` ne passe jamais à `pressed`. Le fond est
      // celui de tous les choix (`fondDuChoix`).
      style={({ pressed }) => [
        styles.ligne,
        {
          backgroundColor: theme[fondDuChoix({ choisi: coche, appuye: pressed })],
          borderColor: coche ? theme.accent : 'transparent',
        },
      ]}
    >
      <ThemedText
        weight={coche ? 600 : 400}
        themeColor={ligne.choisissable ? 'text' : 'textTertiary'}
        style={styles.titre}
      >
        {ligne.titre}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {ligne.detail}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ligne: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.field,
    borderWidth: Stroke.selected,
    gap: 2,
  },
  titre: { fontSize: 16, lineHeight: 22 },
});
