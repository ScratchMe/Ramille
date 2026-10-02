import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { cadreDuChamp, SANS_ANNEAU_DE_L_INPUT } from '@/components/cadre-du-champ';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ControlHeight, FontFamily, Radius, Spacing, Stroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Champ labellisé des écrans de connexion (adresse email) — rayon 16, fond teinté,
// bordure accent quand le champ a le focus, du contenu ou une action associée (mot de
// passe), pour rester proche de la maquette sans dupliquer un style par écran (`cadreDuChamp`).
//
// **Au repos, le contour est `fieldBorder`, et non plus transparent** (24/09/2026, `v1-29`, audit
// d'accessibilité 1.4.11). Vide, le champ n'était qu'un fond `backgroundElement` à 1,14:1 sur le
// blanc : on ne voyait pas où taper, sur l'écran de la suppression de compte que Google Play exige
// comme sur les deux de la connexion. `fieldBorder` tient 3,45:1 sur le blanc et 3,04:1 sur le fond
// du champ ; l'accent marque le champ rempli, et depuis le 01/10/2026 le focus (`cadreDuChamp`).
export function TextField({
  label,
  value,
  onChangeText,
  secureTextEntry,
  rightActionLabel,
  onRightAction,
  keyboardType,
  autoCapitalize = 'none',
  placeholder,
  helperText,
  autoComplete,
  onSubmitEditing,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  rightActionLabel?: string;
  onRightAction?: () => void;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  placeholder?: string;
  helperText?: string;
  /**
   * Ce que le navigateur ou le système peut proposer de remplir. **Déduit du clavier quand
   * l'appelant ne dit rien** : un champ d'adresse (`email-address`) reçoit `email`.
   */
  autoComplete?: TextInputProps['autoComplete'];
  /**
   * L'envoi de l'écran, **branché sur la touche d'action du clavier** — et sur Entrée côté web, que
   * react-native-web traduit en `onSubmitEditing` sur un champ d'une ligne (01/10/2026, audit T-3).
   * Les trois écrans qui demandent une adresse y passent « Recevoir un code » : sans elle, Entrée
   * n'envoyait rien (mesuré, zéro requête), et il fallait fermer le clavier pour atteindre un bouton
   * posé jusqu'à 468 px plus bas.
   *
   * Quand il est là, la touche dit **« Envoyer »** (`enterKeyHint="send"`) et non « OK » ou
   * « Aller » : elle fait partir un e-mail, c'est le mot juste, et c'est le seul geste que les trois
   * appelants y branchent. Un quatrième dont l'action ne serait pas un envoi devra la passer en prop.
   * Et le champ **garde le clavier et le focus** (`blurOnSubmit={false}`, lu par React Native comme
   * par react-native-web) : sur une adresse incomplète, la phrase arrive sous un champ qu'on corrige
   * sans le retoucher ; sur un envoi réussi, l'écran du code le remplace.
   */
  onSubmitEditing?: () => void;
}) {
  const theme = useTheme();
  const [focus, setFocus] = useState(false);
  const accented = value.length > 0 || !!rightActionLabel;
  // **Le clavier dit déjà que c'est une adresse, et c'est lui qui décide** (24/09/2026, audit
  // d'accessibilité 1.3.5) : sans valeur, react-native-web écrivait `autocomplete="on"`, et ni le
  // navigateur ni un gestionnaire de mots de passe ne savaient qu'il s'agit d'une adresse — sur les
  // trois écrans qui en demandent une, dont `/compte/suppression`. La déduire ici plutôt que de
  // l'écrire dans chaque écran, c'est qu'un quatrième champ d'adresse l'aura sans y penser.
  const remplissage = autoComplete ?? (keyboardType === 'email-address' ? 'email' : undefined);
  // Une adresse ne se corrige pas en mots : sans ceci, le clavier proposait de remplacer
  // « camille.martin » par « Camille Martin » (01/10/2026, audit T-3).
  const adresse = keyboardType === 'email-address';

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textTertiary">
        {label}
      </ThemedText>
      <View
        style={[
          styles.box,
          { backgroundColor: theme.backgroundElement },
          cadreDuChamp(theme, { rempli: accented, focus }),
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          // Le libellé au-dessus est un frère dans l'arbre, pas un `<label for>` : sans cette
          // ligne, le champ s'annonce sans nom.
          accessibilityLabel={label}
          accessibilityHint={helperText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoComplete={remplissage}
          autoCapitalize={autoCapitalize}
          autoCorrect={adresse ? false : undefined}
          onSubmitEditing={onSubmitEditing ? () => onSubmitEditing() : undefined}
          enterKeyHint={onSubmitEditing ? 'send' : undefined}
          blurOnSubmit={onSubmitEditing ? false : undefined}
          placeholder={placeholder}
          placeholderTextColor={theme.textTertiary}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={[styles.input, { color: theme.text }, SANS_ANNEAU_DE_L_INPUT]}
        />
        {rightActionLabel && (
          <TextLink
            label={rightActionLabel}
            onPress={() => onRightAction?.()}
            type="small"
            weight={600}
            themeColor="accentText"
          />
        )}
      </View>
      {helperText && (
        <ThemedText type="small" themeColor="textSecondary">
          {helperText}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: ControlHeight.field,
    borderRadius: Radius.field,
    borderWidth: Stroke.field,
    paddingHorizontal: 18,
  },
  // **Le texte saisi est en Spline Sans** (24/09/2026, `v1-29`) : sans `fontFamily`, le champ prenait
  // la police du système — Arial ou Helvetica sur web, Roboto sur Android — au milieu d'un écran tout
  // en Spline Sans. Graisse normale, celle que le kit donne au champ (`TextField.jsx`, `--font-sans`).
  input: { flex: 1, minWidth: 0, fontSize: 16, fontFamily: FontFamily.regular },
});
