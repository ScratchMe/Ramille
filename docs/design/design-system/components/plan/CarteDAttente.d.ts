/** Ramille dit l'attente : le jour où elle revient, le canal en détail, et la porte s'il y en a une. */
export interface CarteDAttenteProps {
  /** Sa ligne, toujours issue de `RAMILLE` (`attenteIciHebdo`, `attenteSigneMensuel`, `attenteSansBoucle`…). */
  ligne: string;
  /** Ce qui précise le canal — du produit, pas d'elle. */
  detail: string | null;
  /** La porte, ou `null` quand il n'y a rien à ouvrir. */
  porte: { libelle: string; onPress: () => void } | null;
}
export declare function CarteDAttente(props: CarteDAttenteProps): JSX.Element;

/** Sur quoi le plan s'appuie — jamais l'action écartée ni son gain. */
export interface EncartDeContexteProps {
  /** `motsDuContexte` : « zone urbaine dense », « bon accès aux transports en commun »… Rien à énumérer : pas d'encart. */
  mots: string[];
  onModifier: () => void;
}
export declare function EncartDeContexte(props: EncartDeContexteProps): JSX.Element;

/** Un plan à zéro action : quelqu'un qui fait déjà l'essentiel. */
export interface CarteDeFelicitationProps {
  /** `felicitationDuPlanSansAction` : le titre nomme le poste. */
  titre: string;
  /** Un point viendra-t-il ? Sans boucle, la carte ne le promet pas. */
  promettreLePoint: boolean;
}
export declare function CarteDeFelicitation(props: CarteDeFelicitationProps): JSX.Element;

/** La proposition de re-bilan, en fin d'écran. */
export interface CarteDuRebilanProps {
  /** `titreDuRebilan` : « Une saison a passé depuis ton dernier bilan. » */
  titre: string;
  onFaire: () => void;
}
export declare function CarteDuRebilan(props: CarteDuRebilanProps): JSX.Element;
