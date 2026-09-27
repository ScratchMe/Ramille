/** Le champ du code à huit chiffres reçu par email — il ne garde que les chiffres, et s'arrête à huit. */
export interface ChampDeCodeProps {
  /** Les chiffres saisis, huit au plus. */
  value: string;
  /** Reçoit la saisie déjà nettoyée : chiffres seulement, coupée à huit. */
  onChangeText?: (code: string) => void;
  /** « Code reçu par email » par défaut. */
  label?: string;
  /** « 8 chiffres, sans espace. » par défaut. */
  helperText?: string;
}
export declare function ChampDeCode(props: ChampDeCodeProps): JSX.Element;
