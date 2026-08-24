import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

import type { Database } from '@/lib/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY doivent être définies (voir .env.example).'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // AsyncStorage n'a pas de sens sur web (session gérée par le navigateur) ; le SDK
    // Supabase gère déjà le fallback web via localStorage quand storage est omis.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// Chaque visiteur a besoin d'un `user_id` réel dès l'entrée dans l'app (RLS owner-scoped
// sur tout ce qui touche au bilan) — cf. docs/architecture/v1-04-authentification.md.
// Idempotent : ne crée une session anonyme que si aucune session (anonyme ou non)
// n'existe déjà. Appelée au démarrage (_layout.tsx, en fire-and-forget) et re-vérifiée
// avant toute écriture bilan pour couvrir un démarrage à froid trop rapide ou un
// deep-link direct vers /bilan.
export async function ensureSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}
