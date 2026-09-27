/** Ce que dit une carte d'ouverture — dérivé dans le dépôt, jamais écrit dans l'écran. */
export interface ContenuDOuverture {
  /** « NOUVELLE SAISON », « TON PREMIER PLAN », « PLAN ET SUIVI ». */
  etiquette: string;
  titre: string;
  /** `null` : pas de corps du tout — jamais « 0 point répondu ». */
  corps: string | null;
}
export interface SortieDOuverture {
  cle: 'reprendre' | 'choisir_une_autre' | 'choisir' | 'compris';
  label: string;
  /** `primaire` et `secondaire` sont des `Button`, `lien` un `TextLink`. */
  forme: 'primaire' | 'secondaire' | 'lien';
}
/** La carte d'ouverture du plan : nouvelle saison, premier plan, ou arrivée des deux lieux. Ramille dessous, hors du cadre. */
export interface CarteDOuvertureProps {
  ouverture: ContenuDOuverture;
  sorties: SortieDOuverture[];
  /** Ce que Ramille dit sous le cadre — sans valeur par défaut. */
  ligne: string;
  /** `happy` pour ce qui commence, `calm` pour ce qui s'explique. */
  visage: 'happy' | 'calm';
  onSortie?: (cle: SortieDOuverture['cle']) => void;
}
export declare function CarteDOuverture(props: CarteDOuvertureProps): JSX.Element;
