/** « Comment ce chiffre est calculé » — replié par défaut, sous le total de la restitution. */
export interface BlocMethodeProps {
  /** La date du bilan (ISO) : les facteurs y sont figés, et la première section le dit. */
  dateDuBilan?: string | null;
  /** Pour une maquette : le bloc s'ouvre déplié. Dans le produit, il s'ouvre toujours replié. */
  ouvertAuDepart?: boolean;
}
export declare function BlocMethode(props: BlocMethodeProps): JSX.Element;
