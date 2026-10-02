import React from 'react';
import { IntituleDuChamp } from './IntituleDuChamp.jsx';
import { NumericField } from './NumericField.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/bilan/champ-du-plafond.tsx — le champ qu'ouvre la puce « 10+ » d'un compte : les vols, et
// chaque série des longs trajets (`v1-33` §6, 02/10/2026). « 10+ » enregistrait 10 : vingt vols comptaient pour dix.
// Elle ouvre « Environ combien, sur une année ? », **réclamé** comme la distance sous « Plus de 30 km », dont il reprend
// le tour et la place : sous la rangée de puces, à 16, l'écart dans le dépli. Un compte et non une mesure : le champ
// est `entier`, et son unité est le nom compté (« vols », « trajets »). Au-delà de cinquante, une ligne de relecture
// en `small` `textSecondary` — jamais un blocage, jamais une alerte : soixante vols par an existent, ce qu'on attrape
// est le 250 tapé au lieu de 25. Dans le dépôt, il s'ouvre dans un `Depliage` suivi à l'ouverture ; rien ne se dessine.

// `COMPTE_A_RELIRE` (src/types/bilan.ts), recopiée.
const COMPTE_A_RELIRE = 50;

export function ChampDuPlafond({ marque = false, valeur = null, onChange, unite = 'vols', label = 'Nombre de vols sur une année' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
      <IntituleDuChamp type="small" themeColor="textTertiary" marque={marque}>Environ combien, sur une année ?</IntituleDuChamp>
      <NumericField value={valeur} onChange={onChange} unit={unite} label={label} entier />
      {valeur !== null && valeur > COMPTE_A_RELIRE && (
        <ThemedText type="small" themeColor="textSecondary">C’est beaucoup pour une année : vérifie le chiffre.</ThemedText>
      )}
    </div>
  );
}
