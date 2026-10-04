/**
 * La carte du captcha Turnstile quand Cloudflare demande de cocher : un voile, une carte aux couleurs du
 * produit, la phrase « Une dernière vérification : coche la case ci-dessous. » et la case de Cloudflare.
 *
 * Dans le dépôt, le composant ne prend aucune propriété : monté une fois à la racine, il pose la vue web
 * que `src/lib/captcha.ts` lui demande, et ne se montre que si Cloudflare demande de cocher.
 */
export interface CaptchaNatifProps {
  /** Kit seulement : la carte est-elle montrée ? Faux rend l'état ordinaire, où rien ne se voit. */
  visible?: boolean;
}
export declare function CaptchaNatif(props: CaptchaNatifProps): JSX.Element | null;
