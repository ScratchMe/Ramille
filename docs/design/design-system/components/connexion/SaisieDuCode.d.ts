/** « Regarde tes emails » — la saisie du code, la même pour ses trois hôtes ; ce qu'elle affirme suit la voix de l'hôte. */
/**
 * @startingPoint section="Ramille" subtitle="Saisie du code de connexion" viewport="390x844"
 */
export interface SaisieDuCodeProps {
  /**
   * Ce que l'écran a le droit d'affirmer — une propriété de l'hôte, jamais de l'adresse : `parti` (l'envoi est certain, sauf
   * plafond de rattachement atteint, où le serveur se tait : rattacher une adresse) ou `peut_etre` (il ne l'est que si un compte existe : retrouver un compte, page de suppression).
   */
  voix: 'parti' | 'peut_etre';
  /**
   * L'écran arrive sous le doigt (« Recevoir un code » vient d'être touché) : son titre prend le focus. Faux quand
   * l'hôte s'ouvre directement sur le code, sans geste — la reprise depuis « Toi ». Le kit ne déplace pas le focus.
   */
  apresUnGeste?: boolean;
  /** L'adresse saisie à l'étape précédente. */
  adresse: string;
  /** « Valider mon code », « Retrouver mon compte », « Ouvrir ma session ». */
  libelleBouton: string;
  /** Pour une maquette : un code déjà saisi. */
  codeInitial?: string;
  /** Le retour d'une vérification ou d'un renvoi, par `MessageInline`. */
  message?: string | null;
  /** Une vérification est en cours : « Vérification… », et le bouton est inactif. */
  occupe?: boolean;
  /** Au huitième chiffre, ou sur le bouton. Dans le dépôt, le code part à Supabase avec le `type` de l'hôte. */
  onValider?: (code: string) => void;
  /** « Renvoyer un code » — vide le champ ; le message du renvoi suit la voix. */
  onRenvoyer?: () => void;
  onAutreAdresse?: () => void;
}
export declare function SaisieDuCode(props: SaisieDuCodeProps): JSX.Element;
