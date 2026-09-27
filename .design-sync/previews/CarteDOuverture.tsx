import React from 'react';
import { CarteDOuverture } from 'ramille-design-system';

/**
 * La bascule de saison : ce que la saison écoulée a donné, sans jamais dire zéro ni nommer un
 * poste, puis la reconduction. Ramille dessous, hors du cadre.
 */
export const NouvelleSaison = () => (
  <CarteDOuverture
    ouverture={{
      etiquette: 'NOUVELLE SAISON',
      titre: 'L’automne commence.',
      corps: 'Cet été : 11 points répondus, 4 fois où tu as changé quelque chose.',
    }}
    sorties={[
      { cle: 'reprendre', label: 'Reprendre la même action', forme: 'primaire' },
      { cle: 'choisir_une_autre', label: 'Choisir une autre', forme: 'secondaire' },
    ]}
    ligne="On repart pour une saison."
    visage="happy"
  />
);

/** Le tout premier plan : la règle du jeu, et rien d'autre qu'un « Compris ». */
export const PremierPlan = () => (
  <CarteDOuverture
    ouverture={{
      etiquette: 'TON PREMIER PLAN',
      titre: 'Une action pour l’automne.',
      corps:
        'Choisis-en une, et dis quand. Ensuite, un point régulier te demandera si tu l’as faite — rien d’autre à suivre.',
    }}
    sorties={[{ cle: 'compris', label: 'Compris', forme: 'lien' }]}
    ligne="Prends celle qui te ressemble."
    visage="happy"
  />
);

/** L'arrivée des deux lieux, une fois : ce que chacun porte. */
export const DeuxLieux = () => (
  <CarteDOuverture
    ouverture={{
      etiquette: 'PLAN ET SUIVI',
      titre: 'Deux endroits, pas plus.',
      corps:
        'Ici, ton plan : l’action en cours, le point régulier, ton cap. En bas, ton suivi : tes bilans et tes réponses, saison après saison.',
    }}
    sorties={[{ cle: 'compris', label: 'Compris', forme: 'lien' }]}
    ligne="Je note tes réponses dans ton suivi, au fil des saisons."
    visage="calm"
  />
);

/** Une saison sans point répondu : pas de corps du tout, et rien n'était engagé. */
export const SansRecapitulatif = () => (
  <CarteDOuverture
    ouverture={{ etiquette: 'NOUVELLE SAISON', titre: 'L’hiver commence.', corps: null }}
    sorties={[{ cle: 'choisir', label: 'Choisir une action', forme: 'primaire' }]}
    ligne="On repart pour une saison."
    visage="happy"
  />
);
