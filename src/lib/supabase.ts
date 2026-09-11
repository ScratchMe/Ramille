import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

import type { Database } from '@/lib/database.types';
import { decrireProbleme, lireConfigurationSupabase } from '@/types/configuration';
import {
  doitOuvrirUneSessionAnonyme,
  etatDeSession,
  type EtatDeSession,
} from '@/types/session';
import { uneSeuleFois } from '@/types/une-seule-fois';

/**
 * **Ces deux `const` ne sont pas du confort, et il ne faut pas les replier dans l'appel
 * ci-dessous.** `babel-preset-expo` remplace `process.env.EXPO_PUBLIC_X` par sa valeur
 * littérale — sauf quand l'accès est écrit directement comme valeur d'une propriété d'objet
 * dont la clé porte ce même nom, où il rend `void 0`. Vérifié en A/B le 07/09/2026, `.env`
 * inchangé entre les deux exports :
 *
 *   { EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL }
 *     → bundle : EXPO_PUBLIC_SUPABASE_URL:void 0
 *   const urlBrute = process.env.EXPO_PUBLIC_SUPABASE_URL; { EXPO_PUBLIC_SUPABASE_URL: urlBrute }
 *     → bundle : EXPO_PUBLIC_SUPABASE_URL:"https://…"
 *
 * Le typecheck passe, les tests passent, l'export réussit — et l'app affiche
 * « Configuration manquante » à tout le monde, `.env` parfaitement rempli compris.
 * `scripts/verifier-configuration-export.mjs` garde ce point en CI.
 *
 * Et l'accès reste écrit en toutes lettres : une lecture dynamique (`env[nom]`) n'est jamais
 * remplacée du tout.
 */
const urlBrute = process.env.EXPO_PUBLIC_SUPABASE_URL;
const cleBrute = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const configurationSupabase = lireConfigurationSupabase({
  EXPO_PUBLIC_SUPABASE_URL: urlBrute,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: cleBrute,
});

/**
 * **Ce module ne lève plus au chargement, il lève à la première utilisation.** Le contrat ne
 * change pas d'un pouce — aucun écran ne fonctionne sans configuration, aucune requête ne
 * part vers un client à moitié construit — mais l'exception ne se déclenche plus avant le
 * premier rendu. C'est ce qui permet au layout racine d'afficher `ConfigurationManquante` au
 * lieu de laisser l'app s'ouvrir et se refermer sans un mot (issue #65).
 *
 * Le mandataire lève sur **n'importe quel** accès, y compris une simple lecture de
 * propriété : il n'existe aucun usage inoffensif d'un client qu'on ne peut pas construire.
 */
function clientAbsent(): SupabaseClient<Database> {
  const cause =
    configurationSupabase.complete === false
      ? configurationSupabase.problemes.map(decrireProbleme).join(' ')
      : '';
  return new Proxy({} as SupabaseClient<Database>, {
    get() {
      throw new Error(`Configuration Supabase incomplète — ${cause} (voir .env.example).`);
    },
  });
}

export const supabase = configurationSupabase.complete
  ? createClient<Database>(configurationSupabase.url, configurationSupabase.anonKey, {
      auth: {
        // AsyncStorage n'a pas de sens sur web (session gérée par le navigateur) ; le SDK
        // Supabase gère déjà le fallback web via localStorage quand storage est omis.
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : clientAbsent();

// Chaque visiteur a besoin d'un `user_id` réel dès l'entrée dans l'app (RLS owner-scoped
// sur tout ce qui touche au bilan) — cf. docs/architecture/v1-04-authentification.md.
// Idempotent : ne crée une session anonyme que si aucune session (anonyme ou non)
// n'existe déjà. Appelée au démarrage (_layout.tsx, en fire-and-forget) et re-vérifiée
// avant toute écriture bilan pour couvrir un démarrage à froid trop rapide ou un
// deep-link direct vers /bilan.
//
// **L'enveloppe `uneSeuleFois` n'est pas du confort, elle empêche un second compte anonyme.**
// Le corps ci-dessous lit puis écrit : deux appels lancés dans le même rendu — celui du layout
// racine et celui de la racine de l'app — lisent tous les deux « pas de session » avant que
// l'un des deux n'ait écrit, et créent chacun leur compte. Six des treize comptes de la base
// étaient dans ce cas le 10/09/2026 (v1-13 C1.2). Le contrat ne change pas : seules les
// promesses en vol sont partagées, donc un appel tardif relit bien l'état courant — voir
// `src/types/une-seule-fois.ts`, qui porte le détail et les tests.
// **« Pas de session » recouvre trois situations, et une seule appelle une création** (C2.11). La
// dérivation vit dans `src/types/session.ts`, avec ses tests et la raison de chaque branche ; ici on
// ne fait que l'appliquer. Le cas qui coûtait le plus cher : un jeton **refusé** faisait créer une
// session anonyme **vide** à quelqu'un qui a un compte, et l'app lui répondait « Ton bilan n'est pas
// encore fait » alors que son bilan, son plan et ses points étaient intacts côté serveur.
//
// Le retour est donc une session **ou `null`**, et jamais une exception pour ces deux cas : un refus
// et une panne ne sont pas des pannes de programme, ce sont des états que l'app doit savoir
// afficher. `etatDeLaSession` dit lequel, pour les écrans qui ont besoin de le distinguer.
let dernierEtatDeSession: EtatDeSession = 'absente';

/**
 * Le dernier état observé par `ensureSession()`. Lu par le layout racine pour afficher l'écran de
 * reconnexion sur un jeton refusé — et **seulement** dans ce cas : une panne de transport ne se
 * reproche pas à la personne.
 */
export function etatDeLaSession(): EtatDeSession {
  return dernierEtatDeSession;
}

export const ensureSession = uneSeuleFois(async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  dernierEtatDeSession = etatDeSession(Boolean(session), error);

  if (session) return session;
  if (!doitOuvrirUneSessionAnonyme(dernierEtatDeSession)) return null;

  const { data, error: erreurCreation } = await supabase.auth.signInAnonymously();
  if (erreurCreation) throw erreurCreation;
  dernierEtatDeSession = 'presente';
  return data.session;
});
