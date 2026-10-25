import { StyleSheet, View } from 'react-native';

import { MessageInline } from '@/components/message-inline';
import { TextLink } from '@/components/text-link';
import { Spacing } from '@/constants/theme';
import { phraseDeLaLectureEnEchec, type GenreDEchec } from '@/types/lecture-en-echec';

/**
 * **Ce qui est affiché reste vrai, mais date.** La ligne vaut au-dessus des trois écrans issus d'une
 * lecture réussie — le plan, « en préparation » et « pas encore de bilan » — et le lien relance la même
 * lecture que le retour sur l'onglet. Elle porte aussi le refus qui demande une relecture (le
 * remplacement refusé, le plan qui a changé entre-temps). Rien à dire : rien de rendu.
 *
 * Sortie de l'écran du plan à l'étape 7b de `v1-35`.
 */
export function BanniereDeRelecture({
  relectureEnEchec,
  refusDeRemplacement,
  relectureDemandee,
  onRelire,
  centree = false,
}: {
  /** Le genre de l'échec de la dernière relecture (D19), ou `null`. */
  relectureEnEchec: GenreDEchec | null;
  refusDeRemplacement: string | null;
  relectureDemandee: boolean;
  onRelire: () => void;
  /** Au-dessus d'un écran centré, elle a besoin de son propre air sous elle. */
  centree?: boolean;
}) {
  if (relectureEnEchec === null && !refusDeRemplacement) return null;
  return (
    <View style={[styles.relecture, centree && styles.relectureCentree]}>
      {refusDeRemplacement && <MessageInline message={refusDeRemplacement} />}
      {relectureEnEchec !== null && (
        <>
          {/* Le genre décide de la phrase (D19) : la connexion ne se nomme qu'hors ligne. */}
          <MessageInline message={phraseDeLaLectureEnEchec('relectureDuPlan', relectureEnEchec)} />
          {/* Inactif, et dit occupé, tant que la relecture qu'il a demandée tourne (audit P-8) : la
              teinte tertiaire est celle d'un lien qui n'agit pas — un état se dit par le texte,
              jamais par une opacité (`FRONT.md` §1.4). */}
          <View aria-busy={relectureDemandee}>
            <TextLink
              label="Réessayer"
              apparence="action"
              onPress={onRelire}
              disabled={relectureDemandee}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  relecture: { gap: Spacing.one },
  // La même ligne au-dessus d'un écran centré : elle a besoin de son propre air sous elle.
  relectureCentree: { alignItems: 'center', marginBottom: Spacing.four },
});
