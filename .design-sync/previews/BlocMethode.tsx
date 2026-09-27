import React from 'react';
import { BlocMethode } from 'ramille-design-system';

/** Replié, sous le total : c'est ainsi qu'il s'ouvre toujours dans le produit. */
export const Replie = () => <BlocMethode dateDuBilan="2026-09-14T09:30:00Z" />;

/** Déplié : les trois sections, le texte du dépôt. */
export const Deplie = () => <BlocMethode dateDuBilan="2026-09-14T09:30:00Z" ouvertAuDepart />;
