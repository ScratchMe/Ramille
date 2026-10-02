import type { Ref } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { IntituleDuChamp } from '@/components/bilan/ancre-du-champ';
import { NumericField } from '@/components/bilan/numeric-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { Depliage } from '@/lib/mouvement';
import { COMPTE_MAXIMUM, compteARelire } from '@/types/bilan';

/**
 * Le champ qu'ouvre la puce « 10+ » d'un compte — les vols, et chaque série des longs trajets (`v1-33`
 * §6, décidé le 01/10/2026, précisé le 02/10/2026 avec la personne qui pilote).
 *
 * « 10+ » enregistrait 10 : vingt vols comptaient pour dix, chez ceux qui émettent le plus. Elle ouvre
 * désormais « Environ combien, sur une année ? », **réclamé** comme la distance sous « Plus de 30 km »
 * (`plafondChoisi`, `manqueDeLEtape`), dont ce champ reprend le tour et la place : sous la rangée de
 * puces, qui revient à la ligne et n'a donc pas d'élément sous lequel se glisser. Un compte et non une
 * mesure : `entier`. Écrit une fois pour ses quatre usages — quatre recopies divergeraient à la
 * première retouche du libellé.
 *
 * **Au-delà de cinquante, une ligne de relecture, jamais un blocage** (`compteARelire`) : soixante vols
 * par an existent ; ce qu'on attrape, c'est le 250 tapé au lieu de 25. Pas de `role="alert"` : ce n'est
 * pas un échec — le motif de la distance domicile-travail.
 *
 * À placer dans le `ChoixOuvrant` des puces qui l'ouvrent, pour le défilement à l'ouverture.
 */
export function ChampDuPlafond({
  refDuBloc,
  refDuChamp,
  marque,
  valeur,
  onChange,
  unite,
  label,
}: {
  /** Le bloc où mène « Il manque encore … » (`useAncreDuChamp`), et le champ qui reçoit le focus. */
  refDuBloc: Ref<View>;
  refDuChamp: Ref<TextInput>;
  /** L'intitulé est-il celui qui manque ? */
  marque: boolean;
  valeur: number | null;
  onChange: (valeur: number | null) => void;
  /** L'unité affichée à droite du nombre : « vols » ou « trajets ». */
  unite: string;
  /** Ce que le champ compte, pour qui ne voit pas l'intitulé au-dessus : « Nombre de vols sur une année ». */
  label: string;
}) {
  return (
    <Depliage suivieALOuverture style={styles.depli}>
      <View ref={refDuBloc} style={styles.champ}>
        <IntituleDuChamp type="small" themeColor="textTertiary" marque={marque}>
          Environ combien, sur une année ?
        </IntituleDuChamp>
        {/* Borné à la colonne, un `smallint` : au-delà, l'insert échouerait sans dire où (`COMPTE_MAXIMUM`). */}
        <NumericField
          ref={refDuChamp}
          value={valeur}
          onChange={(nombre) => onChange(nombre === null ? null : Math.min(nombre, COMPTE_MAXIMUM))}
          unit={unite}
          label={label}
          entier
        />
        {compteARelire(valeur) && (
          <ThemedText type="small" themeColor="textSecondary">
            C’est beaucoup pour une année : vérifie le chiffre.
          </ThemedText>
        )}
      </View>
    </Depliage>
  );
}

const styles = StyleSheet.create({
  // L'écart aux puces est **dans** le dépli : il s'ouvre avec le champ au lieu d'apparaître d'un coup
  // au-dessus — la règle de `BoiteDePrecision` et des séries des longs trajets.
  depli: { marginTop: Spacing.three },
  // L'écart de la distance sous « Plus de 30 km » (`leisure-detail.tsx`).
  champ: { gap: Spacing.two },
});
