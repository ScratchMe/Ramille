/** « Ton mode n’est pas dans la liste ? Dis-le-nous. » — le lien discret sous une liste de modes du questionnaire, vers le canal de retour. */
export interface MissingModeLinkProps {
  /**
   * La liste d’où vient le retour, telle que l’étape la nomme (« B1.4 mode domicile-travail »). Elle part avec le
   * retour, dans la catégorie `mode_manquant`, et ne s’affiche jamais. Dans le dépôt, le lien ouvre le formulaire
   * de retour ; le kit n’a pas de navigation, le lien n’y ouvre rien.
   */
  context: string;
}
export declare function MissingModeLink(props: MissingModeLinkProps): JSX.Element;
