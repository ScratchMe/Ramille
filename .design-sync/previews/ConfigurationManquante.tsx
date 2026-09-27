import React from 'react';
import { ConfigurationManquante } from 'ramille-design-system';

/** Une clé absente et une URL avec un chemin : chaque ligne nomme la variable, en chasse fixe. */
export const DeuxProblemes = () => (
  <ConfigurationManquante
    problemes={[
      { type: 'manquante', variable: 'EXPO_PUBLIC_SUPABASE_ANON_KEY' },
      { type: 'url_avec_chemin', variable: 'EXPO_PUBLIC_SUPABASE_URL', valeur: 'https://exemple.supabase.co/rest/v1' },
    ]}
  />
);
