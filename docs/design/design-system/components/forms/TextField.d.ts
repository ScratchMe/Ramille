/** Champ de saisie labellisé — 56/16. Une adresse email, en pratique : le produit n’a pas de mot de passe. */
export interface TextFieldProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  /** Pas de `'password'` : le produit n’en a pas, et l’offrir ici ferait construire un écran
   *  qui n’existe pas. Le seul accès à un compte est un lien à usage unique par email. */
  type?: 'text' | 'email';
  /** Action à droite dans le champ (« Afficher »). */
  rightActionLabel?: string;
  onRightAction?: () => void;
  placeholder?: string;
  /** Message de validation, ton neutre : ce qui est attendu. */
  helperText?: string;
}
export declare function TextField(props: TextFieldProps): JSX.Element;
