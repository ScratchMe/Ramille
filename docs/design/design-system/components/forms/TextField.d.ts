/** Champ de saisie labellisé — 56/16. Une adresse email, en pratique : le produit n’a pas de mot de passe. */
export interface TextFieldProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  /** `email-address` pour une adresse : le champ l'annonce, et le remplissage automatique s'en déduit. */
  keyboardType?: 'default' | 'email-address';
  /** Ce que le navigateur ou le système peut proposer de remplir ; déduit du clavier quand rien n'est dit. */
  autoComplete?: string;
  /** Action à droite dans le champ. */
  rightActionLabel?: string;
  onRightAction?: () => void;
  placeholder?: string;
  /** Message de validation, ton neutre : ce qui est attendu. */
  helperText?: string;
}
export declare function TextField(props: TextFieldProps): JSX.Element;
