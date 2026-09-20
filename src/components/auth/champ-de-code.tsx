import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ControlHeight, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { chiffresDuCode, LONGUEUR_DU_CODE } from '@/types/connexion';

/**
 * Le champ du code reçu par email — **un seul champ, jamais huit cases.**
 *
 * Huit cases séparées coûteraient huit champs à un lecteur d'écran, un composant qui gère le
 * focus à la frappe et au collé, et n'apporteraient rien qu'un champ centré ne rende. Le kit
 * écrit d'ailleurs de `TextField` qu'il est « en pratique le seul champ texte du produit » : il y
 * en a deux à partir d'aujourd'hui, et celui-ci reprend sa boîte — hauteur, rayon, fond, bordure
 * d'accent dès qu'un chiffre est là — pour que ce soit visiblement la même famille.
 *
 * **La normalisation n'est pas ici mais dans `chiffresDuCode`** (module pur, testé) : une espace
 * collée avec le code est retirée et non refusée, et un collé trop long garde ses chiffres utiles.
 * Faire ce travail dans le composant le rendrait invérifiable par la suite Jest.
 *
 * La taille des chiffres (24/30, interlettrage 6) est hors échelle typographique et reste en dur
 * ici, comme les autres tailles uniques du produit : c'est un écart assumé au design system, et il
 * vit là où il sert.
 */
export function ChampDeCode({
  value,
  onChangeText,
  label = 'Code reçu par email',
  helperText = `${LONGUEUR_DU_CODE} chiffres, sans espace.`,
}: {
  value: string;
  onChangeText: (code: string) => void;
  label?: string;
  helperText?: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textTertiary">
        {label}
      </ThemedText>
      <View
        style={[
          styles.box,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: value.length > 0 ? theme.accent : 'transparent',
          },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={(saisie) => onChangeText(chiffresDuCode(saisie))}
          // Le libellé au-dessus est un frère dans l'arbre, pas un `<label for>` — même raison
          // que dans `TextField`. Il dit la longueur, parce que c'est ce qu'on ne peut pas voir.
          accessibilityLabel={`${label}, ${LONGUEUR_DU_CODE} chiffres`}
          accessibilityHint={helperText}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={LONGUEUR_DU_CODE}
          // Posés sans rien en attendre : aucune plateforme de la V1 ne remplit un code reçu par
          // e-mail. Ils ne coûtent rien et servent le jour où l'une le fera.
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          style={[styles.input, { color: theme.text }]}
        />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {helperText}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  box: {
    justifyContent: 'center',
    height: ControlHeight.field,
    borderRadius: Radius.field,
    borderWidth: 1.5,
    paddingHorizontal: 18,
  },
  input: { fontSize: 24, lineHeight: 30, letterSpacing: 6, textAlign: 'center' },
});
