import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { cadreDuChamp, SANS_ANNEAU_DE_L_INPUT } from '@/components/auth/text-field';
import { ThemedText } from '@/components/themed-text';
import { ControlHeight, FontFamily, Radius, Spacing, Stroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { chiffresDuCode, LONGUEUR_DU_CODE } from '@/types/connexion';

/**
 * Le champ du code reçu par email — **un seul champ, jamais huit cases.**
 *
 * Huit cases séparées coûteraient huit champs à un lecteur d'écran, un composant qui gère le
 * focus à la frappe et au collé, et n'apporteraient rien qu'un champ centré ne rende. Le kit
 * écrit d'ailleurs de `TextField` qu'il est « en pratique le seul champ texte du produit » : il y
 * en a deux à partir d'aujourd'hui, et celui-ci reprend sa boîte — hauteur, rayon, fond, bordure
 * d'accent dès qu'un chiffre est là ou que le champ a le focus (`cadreDuChamp`) — pour que ce soit
 * visiblement la même famille. Le contour au
 * repos aussi : `fieldBorder` depuis le 24/09/2026, là où le champ vide ne tranchait qu'à 1,14:1
 * (cf. `TextField`).
 *
 * **La normalisation n'est pas ici mais dans `chiffresDuCode`** (module pur, testé) : une espace
 * collée avec le code est retirée et non refusée, un collé trop long garde ses chiffres utiles, et
 * un collé qui porte d'autres chiffres garde la suite de huit — pas les huit premiers (01/10/2026).
 * Faire ce travail dans le composant le rendrait invérifiable par la suite Jest.
 *
 * La taille des chiffres (24/30, interlettrage 6) est hors échelle typographique et reste en dur
 * ici, comme les autres tailles uniques du produit : c'est un écart assumé au design system, et il
 * vit là où il sert. Les chiffres sont **tabulaires** depuis le 24/09/2026 (`v1-29`) : de même
 * chasse, les huit chiffres centrés ne se déplacent plus d'un demi-caractère à chaque frappe, et se
 * comparent colonne à colonne avec ceux de l'e-mail.
 */
export function ChampDeCode({
  value,
  onChangeText,
  label = 'Code reçu par email',
  // **La seconde phrase prévient que le code part seul** (arbitrage du 27/09/2026, `v1-29` §6.3) :
  // au dernier chiffre, la vérification change l'écran sans geste de plus, ce que WCAG 3.2.2 demande
  // d'annoncer avant la saisie. Elle est ici parce que ce texte est aussi l'`accessibilityHint` —
  // lu en entrant dans le champ, donc avant, et pas seulement vu.
  helperText = `${LONGUEUR_DU_CODE} chiffres, sans espace. Il est vérifié dès le dernier chiffre.`,
}: {
  value: string;
  onChangeText: (code: string) => void;
  label?: string;
  helperText?: string;
}) {
  const theme = useTheme();
  // Le focus passe la bordure à l'accent, et l'anneau du navigateur suit le cadre (`cadreDuChamp`).
  const [focus, setFocus] = useState(false);

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textTertiary">
        {label}
      </ThemedText>
      <View
        style={[
          styles.box,
          { backgroundColor: theme.backgroundElement },
          cadreDuChamp(theme, { rempli: value.length > 0, focus }),
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
          // **Pas de `maxLength`, et c'est un correctif** (mesuré au navigateur le 21/09/2026). La
          // limite s'applique à la saisie **brute**, avant que `chiffresDuCode` n'ait retiré quoi que
          // ce soit : un collé de « 847 924 69 » était tronqué à huit caractères, donc « 847 924 »,
          // donc **six** chiffres — bouton inerte, aucun message, et rien pour comprendre. Collé
          // depuis une messagerie, « code : 84792469 » n'en gardait qu'**un**. La frappe, elle,
          // marchait (chaque espace est rejeté avant d'atteindre la limite), ce qui rendait le défaut
          // invisible à qui tape. La troncature vit dans `chiffresDuCode`, qui la fait sur les
          // chiffres et non sur les caractères — donc la limite du DOM n'ajoutait rien, et retirait.
          // Posés sans rien en attendre : aucune plateforme de la V1 ne remplit un code reçu par
          // e-mail. Ils ne coûtent rien et servent le jour où l'une le fera.
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={[styles.input, { color: theme.text }, SANS_ANNEAU_DE_L_INPUT]}
        />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {helperText}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  box: {
    justifyContent: 'center',
    height: ControlHeight.field,
    borderRadius: Radius.field,
    borderWidth: Stroke.field,
    paddingHorizontal: 18,
  },
  // En Spline Sans, comme `TextField` (24/09/2026) : sans `fontFamily`, les huit chiffres sortaient dans
  // la police du système, et `tabular-nums` s'appliquait à elle plutôt qu'à la nôtre.
  input: {
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: 6,
    textAlign: 'center',
    fontFamily: FontFamily.regular,
    fontVariant: ['tabular-nums'],
  },
});
