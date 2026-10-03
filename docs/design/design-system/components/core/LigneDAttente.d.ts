/**
 * La ligne « Chargement de ton … » d'un écran — `body`, `textSecondary`, une seule forme (`v1-33` T-9).
 *
 * Dans le dépôt, elle porte son délai : muette pendant 300 ms (`DELAI_AVANT_CHARGEMENT`), sauf quand la personne a
 * demandé ce chargement (`demandee`, un « Réessayer ») ou sur une page ouverte à froid dont le HTML statique doit la
 * porter (`immediate`, la restitution seule). Le kit n'a pas d'horloge : `visible` dit si le délai est passé.
 */
export interface LigneDAttenteProps {
  /** « Chargement de ton plan… » — ce qui se charge, nommé. */
  children: string;
  /** Dans le dépôt : un « Réessayer » de la personne, dit tout de suite. */
  demandee?: boolean;
  /** Dans le dépôt : une page ouverte à froid, dont le HTML statique porte la ligne. */
  immediate?: boolean;
  /** Kit seulement : le délai est-il passé ? Faux montre l'écran vide qu'on voit pendant les 300 premières ms. */
  visible?: boolean;
}
export declare function LigneDAttente(props: LigneDAttenteProps): JSX.Element | null;
