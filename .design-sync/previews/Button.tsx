import React from 'react';
import { Button, TextLink } from 'ramille-design-system';

/** Le bouton principal d'un flux : pleine largeur, accent, pied collant. */
export const Principal = () => <Button title="Continuer" />;

/** Secondaire sur surface élément — un choix qui n'est pas celui qu'on attend. */
export const Secondaire = () => <Button title="Revoir mon plan" variant="secondary" />;

/**
 * Désactivé = fond élément + texte tertiaire, jamais une opacité. Le libellé reste
 * le même : c'est ce qui manque qu'on dit à côté, pas le bouton qu'on renomme.
 */
export const Desactive = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <Button title="Suivant" disabled />
    <TextLink label="Renseigne la distance d'un aller" type="small" themeColor="textTertiary" align="center" />
  </div>
);

/** La rangée du questionnaire : Retour garde sa largeur, Suivant prend le reste. */
export const RangeeRetourSuivant = () => (
  <div style={{ display: 'flex', gap: 16 }}>
    <Button title="Retour" variant="secondary" style={{ width: 'auto' }} />
    <Button title="Suivant" flex />
  </div>
);
