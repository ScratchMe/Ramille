import {
  SplineSans_400Regular,
  SplineSans_500Medium,
  SplineSans_600SemiBold,
  SplineSans_700Bold,
  useFonts,
} from '@expo-google-fonts/spline-sans';
import * as Linking from 'expo-linking';
import {
  DefaultTheme,
  Stack,
  ThemeProvider,
  router,
  usePathname,
  type ErrorBoundaryProps,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { ConfigurationManquante } from '@/components/configuration-manquante';
import { ErreurInattendue } from '@/components/erreur-inattendue';
import { RetourDeNotification } from '@/components/retour-de-notification';
import { SessionRefusee } from '@/components/session-refusee';
import { TitreDePage } from '@/components/titre-de-page';
import { useTrackView } from '@/hooks/use-track-view';
import { track } from '@/lib/analytics';
import { createSessionFromUrl } from '@/lib/auth';
import { lireEtatDuRattachement } from '@/lib/compte';
import {
  afficherLesNotificationsAuPremierPlan,
  enregistrerLeJeton,
  estNatif,
  preparerLeCanalAndroid,
} from '@/lib/rappels';
import { configurationSupabase, ensureSession, etatDeLaSession, supabase } from '@/lib/supabase';
import { appErrorCategory, SEJOUR_INITIAL, suivreLEtatDeLApp } from '@/types/analytics';
import { estVerifieurManquant, lireRetourDeLien, type MotifRetourLien } from '@/types/connexion';

SplashScreen.preventAutoHideAsync();

// Hors du composant : le gestionnaire est global à l'app, et l'installer à chaque rendu ne
// servirait à rien. Sans lui, un rappel reçu app ouverte disparaît sans laisser de trace —
// or c'est le moment où la personne peut y répondre en un geste.
if (estNatif) afficherLesNotificationsAuPremierPlan();

// Une ouverture par chargement du bundle, et le garde vit **hors du composant**. C'est ce que
// `useTrackView` offrait avec son `useRef` et qu'on perd en émettant depuis un `.then` : en
// développement, React remonte les effets (Fast Refresh, StrictMode) et chaque remontée
// recompterait une ouverture — dans la même base que la production, puisque le développement
// courant tape sur le projet distant. Le biais serait homogène, donc invisible dans les chiffres.
let ouvertureDejaComptee = false;

// **Le jeton d'appareil appartient à la personne connectée, pas à l'appareil.**
// `register_push_token` le *reprend* à son propriétaire précédent (v1-12 §5.3), et il n'y avait
// aucun appel ailleurs qu'au démarrage : le lien de `/connexion/retrouver` ouvre la session d'un
// utilisateur **différent** de la session anonyme qui venait d'enregistrer le jeton sur ce
// téléphone, si bien que l'appareil restait inscrit au nom de celui qu'on vient de quitter — et
// recevait ses rappels jusqu'au prochain démarrage à froid (A4-7).
//
// Un enregistrement par utilisateur, et le garde vit **hors du composant** comme
// `ouvertureDejaComptee` : `onAuthStateChange` émet aussi à chaque rafraîchissement de jeton,
// c'est-à-dire toutes les heures, et sans garde cela ferait un appel RPC par heure pour rien.
let utilisateurDuJeton: string | null = null;

// **Le garde ne se valide qu'après coup.** Posé avant l'appel, il retenait un enregistrement
// qui n'avait pas eu lieu : pas de réseau au moment du `setSession`, RPC en erreur, et
// l'appareil restait inscrit au nom de celui qu'on vient de quitter jusqu'au prochain démarrage
// à froid — c'est-à-dire exactement A4-7, que ce code existe pour corriger. Il est quand même
// posé **pendant** l'appel, pour que deux émissions rapprochées d'`onAuthStateChange` ne
// lancent pas deux RPC concurrents ; seul un échec le rend à son propriétaire précédent, et la
// tentative suivante repart.
async function enregistrerLeJetonPour(utilisateur: string | null): Promise<void> {
  if (utilisateur === null || utilisateur === utilisateurDuJeton) return;
  const precedent = utilisateurDuJeton;
  utilisateurDuJeton = utilisateur;
  try {
    await enregistrerLeJeton();
  } catch (error) {
    utilisateurDuJeton = precedent;
    console.error('Le jeton d’appareil n’a pas pu être enregistré :', error);
  }
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SplineSans_400Regular,
    SplineSans_500Medium,
    SplineSans_600SemiBold,
    SplineSans_700Bold,
  });

  /**
   * Le jeton stocké a été refusé (C2.11). Posé par le démarrage ci-dessous, et **abaissé par les
   * deux gestes de l'écran avant qu'ils ne naviguent** — ce n'est pas optionnel, c'est ce qui rend
   * les boutons vivants. `SessionRefusee` est une **surcouche** du `Stack`, pas un remplacement
   * (il n'aurait sinon aucune route où aller) : un `router.replace` seul naviguerait *dessous*
   * pendant que la surcouche resterait au-dessus, cachant la destination. Retirer les
   * `setSessionRefusee(false)` en croyant les simplifier rendrait les deux boutons inertes — la
   * panne même que cette surcouche existe pour éviter.
   *
   * Rien ne le repose à vrai ensuite : `ensureSession` ne tourne qu'une fois par chargement du
   * bundle, et rien dans cette session ne peut rendre ce jeton valide.
   */
  const [sessionRefusee, setSessionRefusee] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Fire-and-forget : la session anonyme n'a pas besoin d'exister avant le premier
  // rendu (rien à l'écran ne la lit tout de suite), seulement avant la première écriture
  // bilan — re-garantie à ce moment-là de toute façon (cf. ensureSession).
  //
  // **`app_open` part ici, après la session, et plus au montage.** `track()` renonce quand
  // aucune session n'existe encore : émis au rendu du layout, l'événement était **perdu**
  // exactement sur les premiers lancements — ceux où `ensureSession()` fait encore son
  // aller-retour de création de compte — et ne partait que sur les suivants, où la session est
  // en cache. Ce n'était donc pas une perte occasionnelle, comme l'affirmait le commentaire
  // d'avant, mais un biais systématique contre les nouveaux venus : une seule ligne en base
  // pour six vues d'étape d'onboarding (v1-13, préambule ; la contre-vérification d'A1-3 du
  // 09/09 comptait zéro). Le dénominateur de tous les entonnoirs ne comptait donc presque
  // aucune arrivée.
  //
  // **`origine` n'est pas un ornement** : c'est ce qui garde les deux chemins d'émission
  // distinguables — ce démarrage-ci, et le retour au premier plan de l'écoute ci-dessous.
  // Fondus en lignes identiques, on ne pourrait ni vérifier que le second fonctionne (un
  // rappel ouvert doit écrire une ligne), ni comparer une série d'avant le 11/09/2026, où
  // seuls les démarrages comptaient, à une série d'après. La base ne contraint pas les valeurs
  // de `props` (`check_usage_event_props` ne regarde que les clés et les longueurs) : une
  // dimension ne coûte donc aucune ligne de référentiel, seulement la description à tenir.
  //
  // Le jeton d'appareil suit la session, donc **après** elle : `register_push_token` reprend
  // le jeton à son propriétaire précédent, ce qui est exactement le cas d'un appareil dont la
  // session anonyme vient de devenir un compte (v1-12 §5.3). Silencieux dans les deux sens :
  // ni la réussite ni l'échec ne regardent l'utilisateur, et la carte d'attente du plan dit
  // déjà, elle, si les notifications sont coupées.
  useEffect(() => {
    if (!configurationSupabase.complete) return;
    ensureSession()
      .then((session) => {
        // **Un jeton refusé s'affiche, il ne se contourne pas** (C2.11). `ensureSession` n'ouvre
        // plus de session anonyme dans ce cas, donc sans cet écran l'app resterait sans session du
        // tout — et chaque onglet dirait « tu n'as rien » à quelqu'un qui a tout. La panne de
        // transport, elle, n'affiche rien : elle n'est pas de la faute de la personne et le
        // prochain lancement réessaie.
        if (etatDeLaSession() === 'refusee') setSessionRefusee(true);

        if (!ouvertureDejaComptee) {
          ouvertureDejaComptee = true;
          track('app_open', { origine: 'demarrage' });
        }
        void preparerLeCanalAndroid();
        return enregistrerLeJetonPour(session?.user.id ?? null);
      })
      .catch((error) => {
        console.error('ensureSession() a échoué au démarrage :', error);
      });
  }, []);

  // **Une ouverture, c'est aussi un retour au premier plan.** Le layout racine n'est monté
  // qu'une fois par chargement du bundle : sans cette écoute, `app_open` ne compte pas des
  // ouvertures mais des démarrages à froid. Or le chemin nominal de la boucle d'engagement est
  // une app en arrière-plan que la notification ramène devant — le même défaut que
  // `useRafraichirAuRetour` corrige pour les données des onglets, et sur natif, où le rappel
  // hebdomadaire est le déclencheur principal, c'est le chemin majoritaire.
  //
  // C'est aussi ce qui rend vraie la phrase sur laquelle `purge_stale_anonymous_accounts()`
  // fonde sa fenêtre de 90 jours (« `app_open` est émis à chaque ouverture », migration
  // 20260907093000) : une session anonyme qui revient chaque semaine par le rappel, lit son
  // plan et ne répond pas au point écrit désormais un signe de vie, là où elle redevenait
  // supprimable, bilan compris.
  //
  // **Le retour ne compte que sur natif, et ce n'est pas de la prudence de plateforme.**
  // `AppState` existe bien sur web — react-native-web le dérive de `document.visibilityState`,
  // l'écoute fonctionnerait — mais il n'y mesure pas la même chose : un onglet laissé derrière
  // une demi-journée puis réaffiché écrirait une ouverture alors qu'aucune app n'a été ouverte,
  // et `app_open` dépasserait franchement le nombre de chargements de page sans rien dans la
  // série pour le signaler. Sur web, chaque chargement de page recharge le bundle et émet déjà
  // son `demarrage` : il n'y a rien à rattraper. Et la cible de la V1 est Google Play, donc
  // c'est là que le chemin du rappel compte.
  useEffect(() => {
    if (!configurationSupabase.complete || !estNatif) return;

    // La règle — dater le départ une seule fois, et ne compter que les séjours assez longs —
    // vit dans `suivreLEtatDeLApp` (`src/types/analytics.ts`) avec ses tests. Elle a été écrite
    // ici, en variable mutable, et rien ne l'éprouvait : son piège iOS (`inactive` traversé à
    // l'aller **et** au retour) fait perdre la totalité du chemin du rappel, en silence.
    let sejour = SEJOUR_INITIAL;

    const abonnement = AppState.addEventListener('change', (etat) => {
      const suite = suivreLEtatDeLApp(sejour, etat, Date.now());
      sejour = suite.sejour;
      if (suite.ouverture) track('app_open', { origine: 'retour' });
    });

    // `?.` et pas un appel sec, bien que l'effet sorte désormais hors natif : la garde coûte un
    // caractère et couvre le jour où ce code serait réutilisé ailleurs. C'est le layout racine —
    // l'endroit où une exception n'a plus personne au-dessus d'elle.
    return () => abonnement?.remove();
  }, []);

  // **Le jeton se réenregistre à chaque changement d'utilisateur**, et cette écoute est ce qui
  // couvre tous les `setSession` réussis sans avoir à y penser appel par appel : le lien de
  // connexion traité juste en dessous, le retour Google natif de `/connexion`, et le passage d'une
  // session anonyme à un compte. Voir `enregistrerLeJetonPour` pour le pourquoi du garde.
  //
  // **Le rappel reste synchrone** (`void`, jamais `async`) : le SDK déconseille une fonction
  // asynchrone ici, parce qu'un rafraîchissement déclenché depuis un `TOKEN_REFRESHED` attend une
  // promesse qui attend le retour du rappel. Le garde met ce cas hors de portée — un
  // rafraîchissement ne change pas d'utilisateur, donc il sort avant de toucher au réseau — et
  // l'écriture ne part pas dans le fil du rappel.
  useEffect(() => {
    if (!configurationSupabase.complete) return;
    const { data } = supabase.auth.onAuthStateChange((_evenement, session) => {
      void enregistrerLeJetonPour(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Lien de connexion par email ouvert depuis la messagerie du téléphone : il revient par le
  // scheme `ramille://` avec les jetons dans le fragment, et personne n'attend cette URL —
  // contrairement au retour Google, qui passe par `openAuthSessionAsync`. Sur web,
  // `detectSessionInUrl` ouvre la session tout seul. Une fois la session ouverte, la racine route
  // vers le plan ou l'onboarding selon ce que porte le compte retrouvé.
  //
  // **Un lien qui ne marche plus ne produisait rien du tout** (A1-6, A6-6) : la garde ne
  // reconnaissait que `access_token=`, alors que Supabase renvoie l'expiration dans le même
  // fragment sous une autre forme (`error=access_denied&error_code=otp_expired`). La personne avait
  // fait le bon geste, se retrouvait sur l'écran d'où elle venait, et rien ne lui disait qu'il
  // fallait redemander un lien — sur le **seul** chemin du produit vers un compte existant.
  // L'échec s'affiche donc là où on en redemande un, avec de quoi dire lequel des deux échecs
  // c'était.
  //
  // **Deux liens différents finissent ici, et ils ne mènent pas au même écran.** Ils portent le
  // même `error_code=otp_expired` : celui de `sendAccountAccessLink`, qui cherche un compte
  // existant, et celui de confirmation de `linkEmail`, qui rattache une adresse à la session
  // anonyme courante. Envoyer la seconde personne sur `/connexion/retrouver` lui montrerait
  // l'écran de collision — « ce bilan-ci ne le rejoindra pas », faux pour elle — puis un
  // formulaire dont le seul appel est `shouldCreateUser: false` : son adresse n'ayant pas encore
  // de compte confirmé, **aucun lien ne partirait jamais**, et le 422 `otp_disabled` est traité
  // comme un succès. L'état du rattachement les distingue sans ambiguïté (`a_confirmer`), et
  // `/connexion/email` sait, lui, renvoyer une demande.
  //
  // **Sur web, seul le chemin d'arrivée sépare les retours, et il est fiable** : les deux
  // `redirectTo` sont écrits par l'app elle-même — `${APP_URL}/` pour les liens (`connexion/email`
  // et `connexion/retrouver`), `origin + /plan` pour le consentement Google, qui revient en
  // `…/plan#error=access_denied` et n'a rien à voir avec un lien à redemander. On ne traite donc
  // sur web que les échecs arrivés sur `/`, et les jetons jamais (`detectSessionInUrl` s'en
  // charge, et l'erreur, elle, laisse le fragment en place). Reste dehors le lien demandé depuis
  // `/compte/suppression`, qui revient sur son propre chemin : c'est à cette page de le dire, pas
  // à celle qui reconnecte.
  //
  // **La navigation ne part jamais du rendu courant.** Le corps d'une fonction `async` tourne
  // synchronement jusqu'à son premier `await` : la branche `erreur` — le cas principal, un lien
  // mort — n'en avait aucun et naviguait donc pendant l'effet de montage, au démarrage à froid,
  // avant que la pile ne soit montée (le genre d'appel qui a déjà coûté un cycle, cf. le
  // commentaire de `src/app/index.tsx`). D'où l'attente explicite en tête, et le garde `annule`
  // qui couvre un démontage entre-temps.
  //
  // **`replace`, et les écrans d'arrivée savent sortir sans `back()`.** Au démarrage à froid, la
  // seule entrée de pile est `/`, donc remplacer rend `canGoBack()` faux — or les sorties de
  // `/connexion/retrouver` (« Garder ce bilan sur cet appareil », « Retour ») et de
  // `/connexion/email` (« Revenir aux autres options ») étaient des `router.back()` nus : la
  // personne se retrouvait enfermée sur l'écran où on venait de la déposer. C'est réparé de leur
  // côté (repli sur la racine), et pas ici en `push` : `src/app/index.tsx` reste monté sous un
  // écran empilé et termine son propre démarrage par un `router.replace('/plan')` au bout de
  // ~1,45 s, qui remplace la **route focalisée** — c'est-à-dire l'écran qu'on vient de pousser.
  // Le lien mort s'afficherait une seconde puis disparaîtrait, ce qui est pire que le cul-de-sac.
  // En `replace`, la racine est démontée, son `annule` coupe la suite, et rien ne vient par
  // derrière.
  const urlEntrante = Linking.useURL();
  useEffect(() => {
    if (!configurationSupabase.complete || !urlEntrante) return;
    const retour = lireRetourDeLien(urlEntrante);
    if (retour === 'aucun') return;
    // **Sur web, `auth-js` tient le chemin nominal et c'est son silence qu'on rattrape.** Il
    // échange le `code` pendant son initialisation, puis le retire de l'URL ; mais son
    // `_isPKCECallback` rend **faux** quand le vérifieur manque — c'est-à-dire quand le lien a
    // été ouvert dans un autre navigateur —, donc il ne tente rien et ne lève rien. La personne
    // atterrirait sur l'accueil, déconnectée, sans un mot, avec son lien encore valable dans la
    // barre d'adresse. D'où l'ajout de `code` à cette porte : la branche plus bas ne parle que
    // si le code est **toujours là** après l'initialisation.
    if (
      Platform.OS === 'web' &&
      ((retour !== 'erreur' && retour !== 'code') || window.location.pathname !== '/')
    ) {
      return;
    }

    let annule = false;
    // `.catch` et pas une promesse nue : c'est le layout racine, où un rejet non rattrapé n'a
    // personne au-dessus de lui.
    void (async () => {
      // Rendre la main avant toute navigation, dans **toutes** les branches : voir ci-dessus.
      await new Promise<void>((resoudre) => {
        setTimeout(resoudre, 0);
      });
      if (annule) return;

      // Valeur du cas `erreur`, où le lien est revenu porteur d'un échec et où il n'y a rien à
      // tenter ; les branches ci-dessous la corrigent selon ce qui a échoué.
      let motif: MotifRetourLien = 'lien_expire';

      // **Un lien qui porte des jetons n'est plus un lien de ce produit** (PKCE, 20/09/2026).
      // C'est la forme qu'un lien **injecté** porte : le scheme `ramille` est BROWSABLE, donc
      // n'importe quelle page web du téléphone pouvait ouvrir `ramille://x#access_token=…` et
      // faire basculer l'app sur le compte de quelqu'un d'autre. On ne tente donc même pas
      // l'échange, et le message dit la seule chose vraie et utile : ce lien ne vient pas d'ici.
      if (retour === 'jetons') {
        motif = 'lien_ouvert_ailleurs';
      } else if (retour === 'code' && Platform.OS === 'web') {
        // `getSession()` attend `initializePromise` (vérifié dans le code d'`auth-js`), donc
        // après cette ligne l'échange a eu lieu ou n'aura pas lieu — pas de course à arbitrer.
        // Le signal est le `code` lui-même : `auth-js` le retire de l'URL quand il réussit.
        await supabase.auth.getSession();
        if (annule) return;
        if (!window.location.search.includes('code=')) return;
        motif = 'lien_ouvert_ailleurs';
      } else if (retour === 'code') {
        const { error } = await createSessionFromUrl(urlEntrante);
        if (annule) return;
        if (!error) {
          router.replace('/');
          return;
        }
        // **Deux échecs très différents sous une même branche.** Le vérifieur manquant est le
        // seul échec *attendu* du flux PKCE — le lien est valable, il a juste été ouvert
        // ailleurs —, et lui dire « vérifie ta connexion » ferait redemander un lien à l'infini.
        // Le reste est une vraie panne : redemander un lien n'y changera rien tant que le réseau
        // ne répond pas, et l'écran le dit autrement.
        console.error('Le lien de connexion n’a pas pu ouvrir de session :', error);
        motif = estVerifieurManquant(error) ? 'lien_ouvert_ailleurs' : 'session_non_ouverte';
      }

      // Une lecture qui échoue retombe sur l'écran qui reconnecte : c'est le cas majoritaire, et
      // c'est celui qui ne ferme aucune porte.
      const etat = await lireEtatDuRattachement().catch(() => null);
      if (annule) return;
      if (etat?.kind === 'a_confirmer') {
        router.replace({ pathname: '/connexion/email', params: { motif } });
        return;
      }
      router.replace({ pathname: '/connexion/retrouver', params: { motif, source: 'lien' } });
    })().catch((error) => {
      console.error('Le retour du lien de connexion n’a pas pu être traité :', error);
    });

    return () => {
      annule = true;
    };
  }, [urlEntrante]);

  // Ne jamais bloquer tout l'arbre sur le chargement de la police : sur le rendu
  // statique web (expo export), useFonts ne résout jamais pendant la génération —
  // un early-return ici ferait exporter des pages vides (vérifié : le HTML statique
  // ne contenait que des marqueurs Suspense, contenu réel présent seulement après
  // hydratation côté client). Le texte s'affiche avec le fallback système puis bascule
  // sur Spline Sans dès que le chargement aboutit, natif comme web.
  //
  // `DefaultTheme` en dur, et pas selon `prefers-color-scheme` : le produit n'a pas de mode
  // sombre validé (cf. `src/hooks/use-theme.ts`, qui force le clair sur web pour la même
  // raison). Laisser `DarkTheme` ici donnerait des chromes de navigation sombres autour d'une
  // palette claire — la moitié de l'écran dans l'autre variante. Les deux décisions vont
  // ensemble : rétablir le sombre demande de toucher ces deux endroits, jamais un seul.
  return (
    <ThemeProvider value={DefaultTheme}>
      <TitreDePage />
      {/* **Monté seulement en natif, et c'est structurel** : ce composant appelle un hook
          d'`expo-notifications` qui n'existe pas sur web, et une exception au rendu ici
          emporte tout l'arbre — page blanche sur toutes les routes. Voir son en-tête. */}
      {estNatif && <RetourDeNotification />}
      {/* **Avant la pile, pas à l'intérieur.** Chaque écran importe `@/lib/supabase` : rendre
          l'écran d'erreur comme une route de plus le ferait précéder par le chargement d'un
          module qui, justement, ne peut pas fonctionner. Ici, aucune route n'est montée —
          l'app s'arrête net, et elle le dit. */}
      {configurationSupabase.complete ? (
        <>
          <Stack screenOptions={{ headerShown: false }} />
          {/* **Posé par-dessus le navigateur, qui reste monté** : les deux gestes de cet écran sont
              des navigations, et un écran rendu *à la place* du `Stack` n'aurait eu aucune route où
              aller. Le drapeau se lève avant de partir, sinon la surcouche masquerait la
              destination. */}
          {sessionRefusee && (
            <SessionRefusee
              onRetrouver={() => {
                setSessionRefusee(false);
                // `session_refusee` et non le repli muet sur `onboarding` : c'est un état de
                // panne (un jeton refusé), et le compter comme une découverte mêlerait un
                // incident à une intention.
                router.replace({ pathname: '/connexion/retrouver', params: { source: 'session_refusee' } });
              }}
              onCommencer={() => {
                setSessionRefusee(false);
                router.replace('/onboarding');
              }}
            />
          )}
        </>
      ) : (
        <ConfigurationManquante problemes={configurationSupabase.problemes} />
      )}
    </ThemeProvider>
  );
}

// ── Filet d'erreur ─────────────────────────────────────────────────────────────────────
// **Le nom de cet export est imposé** : Expo Router cherche `ErrorBoundary` dans un fichier de
// route et enveloppe le composant de cette route dans un `Try`. Exporté depuis le layout
// racine, il couvre donc tout l'arbre — y compris le layout lui-même. Et c'est le seul `Try` de
// l'arbre : Expo Router 57 n'en monte aucun de lui-même (`build/useScreens.js` ne le fait que
// pour une route qui exporte un `ErrorBoundary`), si bien que sans cet export une exception de
// rendu ne donne pas l'écran de secours de la bibliothèque mais une **page blanche** — la panne
// du 08/09/2026. Son écran anglais (« Something went wrong ») reste néanmoins refusé par
// `scripts/verifier-rendu-export.mjs` : il n'a pas à pouvoir apparaître, et il redeviendrait
// atteignable le jour où ce boundary disparaît.
//
// **Aucune API de module natif ici, et c'est structurel.** C'est le composant qui reste quand
// tout le reste est tombé : un hook d'`expo-notifications` appelé au rendu à cet endroit
// relèverait une exception dans le gestionnaire d'exceptions, et la page blanche du 08/09/2026
// reviendrait — avec, cette fois, plus personne pour l'attraper. Les deux seuls hooks utilisés
// ci-dessous lisent l'un le store de navigation, l'autre une mesure d'usage qui n'échoue jamais.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  // Le store de navigation est global à l'app, pas un contexte de l'arbre tombé, et
  // `getRouteInfo()` retombe sur une valeur par défaut quand rien n'est encore monté : lire la
  // route ici ne peut pas lever. Cette valeur par défaut vaut `/`, donc une panne très précoce
  // se lit comme une panne sur la racine — indiscernable d'une vraie, et c'est dit tel quel dans
  // `docs/exploitation/remontee-erreurs.md` §2.
  const route = usePathname();

  // Remontée minimale, et volontairement pauvre : une catégorie dérivée du type de l'exception
  // et la route, jamais le message ni la pile (cf. `src/types/analytics.ts`). Son défaut est
  // connu et assumé — `track()` renonce sans session, or une panne au démarrage est justement
  // le moment où la session peut manquer. C'est un filet partiel, pas une garantie :
  // `docs/exploitation/remontee-erreurs.md` dit ce qu'il faudrait pour aller plus loin.
  useTrackView('app_error', { category: appErrorCategory(error), route });

  // `retry` rend une promesse qu'un bouton n'attend pas.
  return <ErreurInattendue erreur={error} reessayer={() => void retry()} />;
}
