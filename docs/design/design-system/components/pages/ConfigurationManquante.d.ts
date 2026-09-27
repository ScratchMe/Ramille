/** Un problème de configuration — la forme du dépôt (`ProblemeConfiguration`). */
export type ProblemeConfiguration =
  | { type: 'manquante'; variable: 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_ANON_KEY' }
  | { type: 'url_avec_chemin'; variable: 'EXPO_PUBLIC_SUPABASE_URL'; valeur: string };
/** L'écran d'un build sans ses variables Supabase — pour qui l'a construit, pas pour qui l'utilise. */
export interface ConfigurationManquanteProps {
  problemes: ProblemeConfiguration[];
}
export declare function ConfigurationManquante(props: ConfigurationManquanteProps): JSX.Element;
