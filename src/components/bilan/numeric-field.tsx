import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ControlHeight, FontFamily, Radius, Spacing, Stroke, TypeScale } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { afficherNombreSaisi, nettoyerSaisieNumerique, saisieVersNombre } from '@/types/bilan';

// Champ numérique encadré (B1.2/B1.3 "Quelle distance pour un aller ?").
//
// **La maquette lui donnait une bordure accent permanente, et il suit désormais la règle des deux
// autres champs** (24/09/2026, `v1-29`) : `fieldBorder` au repos, l'accent une fois un nombre saisi.
// L'accent marque ce qui est choisi ou rempli ; sur un champ vide, il disait « rempli » d'un champ
// qui ne l'était pas, et c'était le seul champ du produit à le faire. Le contour au repos reste
// visible — 3,45:1 sur le blanc —, ce qui est tout ce que l'accent permanent achetait.
export function NumericField({
  value,
  onChange,
  unit,
  label,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  unit: string;
  /** Ce que le champ demande. L'unité affichée à droite n'est pas un label : « km » seul ne
   *  dit pas ce qu'on saisit, et un lecteur d'écran n'a que ça à annoncer sans elle. */
  label: string;
}) {
  const theme = useTheme();

  // La chaîne saisie est gardée telle quelle pendant la frappe. Reformater à chaque touche
  // depuis la valeur numérique réécrirait « 3, » en « 3 » : la décimale deviendrait
  // impossible à saisir, et on aurait remplacé un défaut par un autre.
  const [saisie, setSaisie] = useState(() => afficherNombreSaisi(value));
  // Une valeur qui change **hors frappe** (préremplissage d'un re-bilan, bascule vers les
  // tranches) doit se voir dans le champ. C'est le motif documenté de React pour ajuster un
  // état sur un changement de prop : la comparaison se fait au rendu, pas dans un effet, donc
  // le champ n'affiche jamais une valeur périmée le temps d'un aller-retour.
  const [valeurConnue, setValeurConnue] = useState(value);
  if (value !== valeurConnue) {
    setValeurConnue(value);
    setSaisie(afficherNombreSaisi(value));
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundElement, borderColor: saisie.length > 0 ? theme.accent : theme.fieldBorder },
      ]}
    >
      <TextInput
        value={saisie}
        onChangeText={(texte) => {
          const nettoye = nettoyerSaisieNumerique(texte);
          const valeur = saisieVersNombre(nettoye);
          setSaisie(nettoye);
          setValeurConnue(valeur);
          onChange(valeur);
        }}
        // `decimal-pad` et non `number-pad` : le clavier doit porter le séparateur décimal
        // qu'on accepte désormais, sinon la virgule reste hors de portée sur mobile.
        keyboardType="decimal-pad"
        accessibilityLabel={`${label}, en ${unit}`}
        placeholder="0"
        placeholderTextColor={theme.textTertiary}
        style={[styles.input, { color: theme.text }]}
      />
      <ThemedText themeColor="textTertiary" style={styles.unit}>
        {unit}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: ControlHeight.numeric,
    borderRadius: Radius.field,
    borderWidth: Stroke.field,
    paddingHorizontal: 20,
  },
  // `minWidth: 0` est nécessaire sur web : un <input> a une largeur intrinsèque que
  // flexbox ne réduit pas automatiquement (contrairement à RN natif), donc sans ça le
  // champ refuse de rétrécir et pousse "km" à cheval sur son bord droit.
  //
  // `tabular-nums` (24/09/2026, `v1-29`) : Spline Sans porte des chiffres de largeurs inégales — un
  // « 1 » plus étroit qu'un « 8 » —, donc le nombre se tassait et s'élargissait à chaque frappe, en
  // 28 px. Des chiffres de même chasse le laissent en place. La police les porte (`tnum`).
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 28,
    fontFamily: FontFamily.semibold,
    fontVariant: ['tabular-nums'],
    padding: 0,
  },
  unit: { ...TypeScale.card, flexShrink: 0 },
});
