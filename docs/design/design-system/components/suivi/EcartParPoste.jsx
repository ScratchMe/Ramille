import React from 'react';
import { ThemedText } from '../core/ThemedText.jsx';
import { BarreContour } from './BarreContour.jsx';
// Source : src/components/suivi/ecart-par-poste.tsx — l'écart entre deux bilans, poste par poste, dans le suivi. Par
// poste : le libellé, le couple « avant → maintenant » en chiffres tabulaires, la barre en contour (le bilan précédent)
// puis la barre pleine (celui-ci). Trois règles :
// — l'échelle est COMMUNE aux six barres : une échelle par poste rendrait 40 kg aussi long que 2 t ;
// — l'accent suit le poste DOMINANT du bilan courant, celui sur lequel le plan travaille — pas forcément le plus lourd ;
// — aucune hiérarchie morale : ni flèche, ni couleur de réussite ou d'échec. Deux nombres, deux barres.
const HAUTEUR = 10;
const LIBELLES = { commute: 'Trajet domicile-travail', leisure: 'Loisirs du week-end', travel: 'Voyages longue distance' };
const EN_PHRASE = { commute: 'ton trajet domicile-travail', leisure: 'tes loisirs du week-end', travel: 'tes voyages longue distance' };
// `nomDuPoste` (src/constants/postes.ts) : le résiduel des sorties rares s'appelle « loisirs occasionnels ».
const libelle = (poste, occasionnels) => (poste === 'leisure' && occasionnels ? 'Loisirs occasionnels' : LIBELLES[poste]);
const enPhrase = (poste, occasionnels) => (poste === 'leisure' && occasionnels ? 'tes loisirs occasionnels' : EN_PHRASE[poste]);
// `formatTonnesNu` (src/lib/format.ts) : en kilos sous la tonne, en tonnes à une décimale au-delà.
const tonnes = (kg) => (Math.round(kg) < 1000 ? Math.round(kg) + ' kg' : (kg / 1000).toFixed(1).replace('.', ',') + ' t');
// `legendeDeLEcart` (src/types/suivi.ts) : la légende nomme le poste qui porte l'accent — sans quoi l'information
// n'existerait qu'en couleur, sous des barres masquées au lecteur d'écran.
const legende = (ecarts, occasionnels) => {
  const formes = 'Contour : bilan précédent · plein : ce bilan';
  const dominant = ecarts.find((e) => e.dominant);
  return dominant ? formes + ' · accent : ' + enPhrase(dominant.poste, occasionnels) + ', le poste sur lequel ton plan travaille' : formes;
};
export function EcartParPoste({ ecarts = [], loisirsOccasionnels = false }) {
  const maxKg = Math.max(...ecarts.flatMap((e) => [e.precedentKg, e.courantKg]), 1);
  // Un poste non nul garde au moins 3 % de barre : sinon il disparaîtrait à côté d'un poste de plusieurs tonnes.
  const part = (kg) => Math.max((kg / maxKg) * 100, kg > 0 ? 3 : 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {ecarts.map((e) => (
        <div key={e.poste} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <ThemedText type="small" themeColor="textSecondary" style={{ flexShrink: 1, minWidth: 0 }}>{libelle(e.poste, loisirsOccasionnels)}</ThemedText>
            <ThemedText type="small" weight={600} style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{tonnes(e.precedentKg)} → {tonnes(e.courantKg)}</ThemedText>
          </div>
          <BarreContour percent={part(e.precedentKg)} hauteur={HAUTEUR} />
          <div aria-hidden="true" style={{ width: '100%', height: HAUTEUR }}>
            <div style={{ height: '100%', borderRadius: HAUTEUR / 2, width: part(e.courantKg) + '%', background: e.dominant ? 'var(--color-accent)' : 'var(--color-accent-muted)' }} />
          </div>
        </div>
      ))}
      <ThemedText themeColor="textTertiary" style={{ fontSize: 12, lineHeight: '16px' }}>{legende(ecarts, loisirsOccasionnels)}</ThemedText>
    </div>
  );
}
