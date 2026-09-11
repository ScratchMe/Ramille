import React from 'react';
import { BandeHaute } from 'ramille-design-system';

const Cadre = ({ children }: { children?: React.ReactNode }) => (
  <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>{children}</div>
);

/**
 * 52 px, le nom centré, l'icône compte à droite dans une cible de 44. **Le nom, pas le
 * visage** : la mascotte n'est pas un logo d'en-tête.
 */
export const SurLesDeuxOnglets = () => <Cadre><BandeHaute /></Cadre>;

/** Au-dessus du contenu d'un onglet, pour voir la hairline basse jouer son rôle. */
export const AuDessusDuContenu = () => (
  <Cadre>
    <BandeHaute />
    <div style={{ padding: 24, background: 'var(--color-background)' }}>
      <span style={{ fontSize: 26, lineHeight: '32px', fontWeight: 600, letterSpacing: '-0.26px' }}>Ton plan</span>
    </div>
  </Cadre>
);
