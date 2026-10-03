import React from 'react';
import { ThemedText } from './ThemedText.jsx';
// Source : src/components/ligne-d-attente.tsx — « Chargement de ton … », une forme (body, gris secondaire) et un
// délai : muette 300 ms, sauf après « Réessayer » ou sur une page ouverte à froid (`immediate`). Le kit, sans
// horloge, la rend dite — `visible={false}` montre l'écran pendant le délai.
export function LigneDAttente({ children, visible = true }) {
  if (!visible) return null;
  return <ThemedText type="body" themeColor="textSecondary">{children}</ThemedText>;
}
