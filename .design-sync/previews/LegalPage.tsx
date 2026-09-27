import React from 'react';
import { LegalPage } from 'ramille-design-system';

/** La page de confidentialité, une section de puces : le texte vient de la page du dépôt. */
export const Confidentialite = () => (
  <LegalPage
    title="Politique de confidentialité"
    updatedAt="25 septembre 2026"
    intro="Ramille collecte le strict nécessaire pour estimer l’empreinte carbone de tes déplacements et t’accompagner dans la durée. Cette page dit précisément quoi, pourquoi, pendant combien de temps, et ce que tu peux exiger."
    sections={[
      {
        heading: 'Ce que nous ne collectons pas',
        blocks: [
          { kind: 'paragraph', text: 'Cette liste n’est pas une intention, c’est une description du produit tel qu’il est construit.' },
          {
            kind: 'bullets',
            items: [
              'Aucune revente, location ou cession de tes données à qui que ce soit.',
              'Aucune comparaison entre utilisateurs. Ton bilan n’est jamais rapproché de celui de quelqu’un d’autre, ni classé.',
            ],
          },
        ],
      },
    ]}
  />
);
