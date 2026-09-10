/** Champ de saisie labellisé (email, mot de passe) — 56/16. */
export interface TextFieldProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  type?: 'text' | 'email' | 'password';
  /** Action à droite dans le champ (« Afficher »). */
  rightActionLabel?: string;
  onRightAction?: () => void;
  placeholder?: string;
  /** Message de validation, ton neutre : ce qui est attendu. */
  helperText?: string;
}
export declare function TextField(props: TextFieldProps): JSX.Element;
