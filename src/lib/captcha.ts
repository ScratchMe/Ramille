// Le jeton du captcha Turnstile (Cloudflare), que Supabase Auth exige, une fois la protection
// activée, des deux appels qui créent quelque chose sans session permanente : la session anonyme
// (`signInAnonymously`) et la demande d'un code de connexion (`signInWithOtp`). Les autres appels
// d'auth du produit — `updateUser`, `verifyOtp`, `linkIdentity` — n'en portent pas : Supabase ne
// le leur demande pas. Plan anti-abus, `v1-27` §12.35 ; le widget et sa clé de site sont au
// registre d'exploitation, §3.11.
//
// **Sans clé de site, aucun jeton, et c'est voulu** : en local, en CI et dans le parcours réel, la
// stack Supabase n'a pas de captcha, et le widget refuserait de toute façon un nom d'hôte qu'il ne
// connaît pas (`110200`). La clé n'est posée que dans l'environnement de production de Vercel.
//
// **Sur natif, aucun jeton non plus, pour l'instant** : le widget ne vit que dans une page web, et
// l'app Android n'a pas encore la vue web qui l'accueillera — elle arrive avec un build. D'où
// l'ordre d'activation du registre : la protection ne s'active dans Supabase qu'une fois le web
// déployé **et** ce build installé, sans quoi chaque nouvelle installation Android buterait sur
// sa première session.
//
// **Un jeton qui ne vient pas n'arrête rien ici** : au plus trente secondes après — deux minutes à
// partir du moment où Cloudflare demande de cocher —, l'appel part sans, et c'est Supabase qui
// tranche : avant l'activation il passe, après il est refusé (`400 captcha_failed`, reconnu par
// `estRefusDuCaptcha`), et la racine pose l'écran du refus. Un bloqueur de publicité qui coupe
// `challenges.cloudflare.com` coûte donc la session une fois la protection active, et seulement à
// ce moment-là.

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';

/** Lue dans un `const`, jamais dans un objet : sans quoi Expo ne la remplace pas dans le bundle. */
const CLE_DE_SITE = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY;

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/**
 * Le temps laissé au widget pour rendre un jeton sans rien demander à la personne. Au-delà, l'appel
 * part sans. Quand Cloudflare demande de cocher, `DELAI_POUR_COCHER_MS` prend le relais à partir de
 * la demande — un relais et non une suppression : à la contre-lecture de la PR #359, la demande
 * arrêtait tout compte, et la racine, qui attend la session, laissait sur l'écran de lancement, sans
 * fin, le visiteur qui ne cochait pas.
 */
export const DELAI_MAXIMAL_MS = 30_000;

/**
 * Le temps laissé pour cocher, une fois que Cloudflare l'a demandé : un humain est alors devant
 * l'écran, prêt à agir, et trente secondes le pressaient (décision de la personne qui pilote,
 * 04/10/2026). Il remplace le plafond du dessus à partir de la demande, sans le supprimer : le
 * visiteur qui laisse la case de côté n'attend pas sans fin.
 */
export const DELAI_POUR_COCHER_MS = 120_000;

/** La phrase de la carte qui entoure la case — validée par la personne qui pilote le 04/10/2026. */
export const PHRASE_DE_LA_CASE = 'Une dernière vérification : coche la case ci-dessous.';

/** Ce que le jeton sert à ouvrir — l'`action` du widget, lisible dans l'analyse de Cloudflare. */
export type UsageDuCaptcha = 'session_anonyme' | 'code_de_connexion';

type OptionsDuWidget = {
  sitekey: string;
  action: UsageDuCaptcha;
  language: string;
  appearance: 'interaction-only';
  theme: 'light';
  retry: 'never';
  callback: (jeton: string) => void;
  'error-callback': () => boolean;
  'before-interactive-callback': () => void;
};

type Turnstile = {
  render(conteneur: HTMLElement, options: OptionsDuWidget): string | null | undefined;
  remove(id: string): void;
};

function turnstileCharge(): Turnstile | undefined {
  return (globalThis as { turnstile?: Turnstile }).turnstile;
}

let chargement: Promise<Turnstile> | null = null;
let balise: { remove(): void } | null = null;

/**
 * Le script se charge une fois par page, et se recharge si le premier essai a échoué — ou s'il n'a
 * pas abouti au plafond : un chargement qui pend, gardé, ferait attendre chaque appel suivant pour
 * rien jusqu'au rechargement de la page.
 */
function oublierLeChargement() {
  chargement = null;
  balise?.remove();
  balise = null;
}

function chargerTurnstile(): Promise<Turnstile> {
  const deja = turnstileCharge();
  if (deja) return Promise.resolve(deja);
  chargement ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement('script');
    balise = script;
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => {
      const charge = turnstileCharge();
      if (charge) resolve(charge);
      else reject(new Error('Le script du captcha s’est chargé sans rien déclarer.'));
    };
    script.onerror = () => reject(new Error('Le script du captcha n’a pas pu se charger.'));
    document.head.appendChild(script);
  }).catch((erreur: unknown) => {
    oublierLeChargement();
    throw erreur;
  });
  return chargement;
}

/**
 * Un jeton neuf, par un widget créé pour l'occasion et retiré aussitôt : un jeton ne sert qu'une
 * fois et vit cinq minutes, donc on n'en garde aucun d'avance.
 *
 * Le widget ne se montre que si Cloudflare demande de cocher (`interaction-only`) : la plupart des
 * visiteurs ne voient rien. Les autres voient la case au milieu d'une carte du produit, avec une
 * phrase, quel que soit l'écran (`demanderLaCase`).
 */
function jetonSurLeWeb(cle: string, usage: UsageDuCaptcha): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    // Un voile plein écran, transparent et traversable tant que Cloudflare ne demande rien : le
    // widget y rend invisible (`interaction-only`), et la page reste utilisable.
    const voile = document.createElement('div');
    voile.setAttribute('data-captcha', usage);
    Object.assign(voile.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '1000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: `${Spacing.three}px`,
      pointerEvents: 'none',
    });
    const carte = document.createElement('div');
    const phrase = document.createElement('p');
    phrase.textContent = PHRASE_DE_LA_CASE;
    Object.assign(phrase.style, { display: 'none', margin: '0', textAlign: 'center' });
    const hote = document.createElement('div');
    carte.appendChild(phrase);
    carte.appendChild(hote);
    voile.appendChild(carte);
    document.body.appendChild(voile);

    let turnstile: Turnstile | undefined;
    let id: string | null | undefined;
    let fini = false;
    const finir = () => {
      fini = true;
      clearTimeout(minuterie);
      if (turnstile && id) {
        try {
          turnstile.remove(id);
        } catch {
          // Le widget est déjà parti : il n'y a plus rien à retirer.
        }
      }
      voile.remove();
    };
    const echouer = (raison: string) => {
      if (fini) return;
      finir();
      reject(new Error(raison));
    };
    const plafond = (delai: number) =>
      setTimeout(() => {
        if (!turnstile) oublierLeChargement();
        echouer('Le captcha n’a rendu aucun jeton à temps.');
      }, delai);
    // Le compte part avant le chargement du script, pas après : un script qui ne répond jamais —
    // un réseau qui le retient, un bloqueur qui le laisse pendre — ne doit pas suspendre la session.
    let minuterie = plafond(DELAI_MAXIMAL_MS);

    /**
     * Cloudflare demande de cocher : la case cesse d'être seule au bord de l'écran. Une carte aux
     * couleurs du produit (la palette claire, que le web force — `useTheme`) l'entoure avec une
     * phrase, sur un voile qui retient l'attention, et le délai passe à `DELAI_POUR_COCHER_MS`. Le
     * focus va à la carte, pour que la phrase soit lue avant la case.
     */
    const demanderLaCase = () => {
      if (fini) return;
      clearTimeout(minuterie);
      minuterie = plafond(DELAI_POUR_COCHER_MS);
      const couleurs = Colors.light;
      Object.assign(voile.style, { pointerEvents: 'auto', background: 'rgba(19, 22, 18, 0.4)' });
      Object.assign(carte.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: `${Spacing.three}px`,
        maxWidth: '360px',
        padding: `${Spacing.four}px`,
        borderRadius: `${Radius.card}px`,
        border: `1px solid ${couleurs.border}`,
        background: couleurs.background,
        // Le focus ne va à la carte que pour faire lire la phrase avant la case : elle n'est pas un
        // contrôle, et l'anneau du navigateur l'entourait d'un trait noir épais.
        outline: 'none',
      });
      Object.assign(phrase.style, {
        display: 'block',
        color: couleurs.text,
        fontFamily: FontFamily.medium,
        fontSize: '17px',
        lineHeight: '24px',
      });
      carte.setAttribute('role', 'dialog');
      carte.setAttribute('aria-label', PHRASE_DE_LA_CASE);
      carte.setAttribute('tabindex', '-1');
      carte.focus?.();
    };

    chargerTurnstile()
      .then((charge) => {
        if (fini) return;
        turnstile = charge;
        id = charge.render(hote, {
          sitekey: cle,
          action: usage,
          language: 'fr',
          appearance: 'interaction-only',
          theme: 'light',
          retry: 'never',
          callback: (jeton) => {
            if (fini) return;
            finir();
            resolve(jeton);
          },
          'error-callback': () => {
            echouer('Le captcha a échoué.');
            // Rendre `true` dit au widget que l'erreur est prise en charge : il ne la relance pas
            // dans la console.
            return true;
          },
          'before-interactive-callback': demanderLaCase,
        });
      })
      .catch(() => echouer('Le script du captcha n’a pas pu se charger.'));
  });
}

/** Le dernier appel en cours : le suivant ne pose son widget qu'une fois celui-ci terminé. */
let file: Promise<unknown> = Promise.resolve();

/**
 * Le jeton à joindre à `signInAnonymously` ou à `signInWithOtp` (`options.captchaToken`), ou
 * `undefined` quand il n'y en a pas — pas de clé, pas de web, ou un widget qui n'a rien rendu.
 * Ne lève jamais : un captcha en panne ne doit pas casser un appel que Supabase accepterait.
 *
 * `cleDeSite` n'est là que pour les tests : le produit lit toujours celle de l'environnement.
 */
export async function jetonDuCaptcha(
  usage: UsageDuCaptcha,
  cleDeSite: string | undefined = CLE_DE_SITE,
): Promise<string | undefined> {
  const cle = cleDeSite?.trim();
  // Pas de `document` : natif, ou rendu statique de l'export. `Platform` n'apprendrait rien de plus.
  if (!cle || typeof document === 'undefined') return undefined;
  // **Un widget à la fois** : deux appels simultanés — la session du démarrage et une demande de
  // code — posaient deux cases au même endroit, celle du dessus masquant l'autre. Le second attend
  // le premier, et le plafond borne l'attente.
  const tour = file.then(() => jetonSurLeWeb(cle, usage));
  file = tour.catch(() => undefined);
  try {
    return await tour;
  } catch {
    return undefined;
  }
}
