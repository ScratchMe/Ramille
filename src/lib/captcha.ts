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
// **Un jeton qui ne vient pas n'arrête rien ici** : l'appel part sans, et c'est Supabase qui
// tranche — avant l'activation il passe, après il est refusé comme toute session qui ne s'ouvre
// pas. Un bloqueur de publicité qui coupe `challenges.cloudflare.com` coûte donc la session une
// fois la protection active, et seulement à ce moment-là.

/** Lue dans un `const`, jamais dans un objet : sans quoi Expo ne la remplace pas dans le bundle. */
const CLE_DE_SITE = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY;

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/**
 * Le temps laissé au widget pour rendre un jeton sans rien demander à la personne. Au-delà, l'appel
 * part sans. Le compte s'arrête dès que le widget demande une interaction : on ne presse pas
 * quelqu'un qui coche la case.
 */
export const DELAI_SANS_INTERACTION_MS = 20_000;

/** Ce que le jeton sert à ouvrir — l'`action` du widget, lisible dans l'analyse de Cloudflare. */
export type UsageDuCaptcha = 'session_anonyme' | 'code_de_connexion';

type OptionsDuWidget = {
  sitekey: string;
  action: UsageDuCaptcha;
  language: string;
  appearance: 'interaction-only';
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

/** Le script se charge une fois par page, et se recharge si le premier essai a échoué. */
function chargerTurnstile(): Promise<Turnstile> {
  const deja = turnstileCharge();
  if (deja) return Promise.resolve(deja);
  chargement ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement('script');
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
    chargement = null;
    throw erreur;
  });
  return chargement;
}

/**
 * Un jeton neuf, par un widget créé pour l'occasion et retiré aussitôt : un jeton ne sert qu'une
 * fois et vit cinq minutes, donc on n'en garde aucun d'avance.
 *
 * Le conteneur est fixé en bas de l'écran et reste vide tant que le widget ne demande rien
 * (`interaction-only`) : la plupart des visiteurs ne le voient jamais, et ceux à qui Cloudflare
 * demande de cocher la case la trouvent là, quel que soit l'écran.
 */
function jetonSurLeWeb(cle: string, usage: UsageDuCaptcha): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const conteneur = document.createElement('div');
    conteneur.setAttribute('data-captcha', usage);
    Object.assign(conteneur.style, {
      position: 'fixed',
      left: '50%',
      bottom: '16px',
      transform: 'translateX(-50%)',
      zIndex: '1000',
    });
    document.body.appendChild(conteneur);

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
      conteneur.remove();
    };
    const echouer = (raison: string) => {
      if (fini) return;
      finir();
      reject(new Error(raison));
    };
    // Le compte part avant le chargement du script, pas après : un script qui ne répond jamais —
    // un réseau qui le retient, un bloqueur qui le laisse pendre — ne doit pas suspendre la session.
    const minuterie = setTimeout(() => echouer('Le captcha n’a rendu aucun jeton à temps.'), DELAI_SANS_INTERACTION_MS);

    chargerTurnstile()
      .then((charge) => {
        if (fini) return;
        turnstile = charge;
        id = charge.render(conteneur, {
          sitekey: cle,
          action: usage,
          language: 'fr',
          appearance: 'interaction-only',
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
          'before-interactive-callback': () => clearTimeout(minuterie),
        });
      })
      .catch(() => echouer('Le script du captcha n’a pas pu se charger.'));
  });
}

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
  try {
    return await jetonSurLeWeb(cle, usage);
  } catch {
    return undefined;
  }
}
