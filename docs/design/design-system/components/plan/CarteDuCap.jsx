import React from 'react';
import { ThemedText } from '../core/ThemedText.jsx';
import { ThemedView } from '../core/ThemedView.jsx';
import { TraitDeTemps } from './TraitDeTemps.jsx';
// Source : src/components/plan/carte-du-cap.tsx — la carte du cap de la saison : le cap en kilos PAR AN, une part
// (−20 %) du poste dominant et jamais de l'empreinte entière, puis la période et sa fin, puis le trait de temps et sa
// légende. Fond `backgroundSelected`, rayon `card`, chiffre en chasse fixe (`tabular-nums`).
//
// Elle se rend même sans cap — un profil sans émission sur son poste dominant : c'est l'endroit où la période se
// nomme. Le trait attend qu'il y ait quelque chose à mesurer (pas au tout premier plan, sauf sur un plan à zéro
// action), et sa légende part avec lui. Le chiffre, la phrase sur les pistes et la présence du trait sont dérivés
// dans le dépôt (`capDuCycle`, `phraseDesPistesSuffisantes`, `cartesDuPlan`) ; la carte les rend.
export function CarteDuCap({ capKg = null, chiffreLeCap = true, cadenceDeSaison = true, reductionPct = 20, posteEnMots, baselineEnMots = null, phraseDuCap = null, periodLabel, finDeLaPeriode = null, progression = null, traitDeTemps = true }) {
  const periode = cadenceDeSaison ? 'saison' : 'période';
  return (
    <ThemedView type="backgroundSelected" style={{ borderRadius: 18, padding: 20, gap: 6 }}>
      {capKg !== null && chiffreLeCap && (
        <>
          <ThemedText type="small" weight={600} themeColor="accentText">Ton cap pour cette {periode}</ThemedText>
          <ThemedText type="salient" style={{ fontVariantNumeric: 'tabular-nums' }}>− {capKg} kg</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            par an, soit − {Math.round(reductionPct)} % sur {posteEnMots}{baselineEnMots ? ` (${baselineEnMots} aujourd’hui)` : ''}
          </ThemedText>
          {phraseDuCap !== null && <ThemedText type="small" themeColor="textSecondary">{phraseDuCap}</ThemedText>}
        </>
      )}
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <ThemedText type="small" themeColor="textSecondary">{periodLabel}</ThemedText>
        {finDeLaPeriode && <ThemedText type="small" weight={600} themeColor="accentText">{finDeLaPeriode}</ThemedText>}
      </div>
      {progression !== null && traitDeTemps && (
        <>
          <TraitDeTemps progression={progression} />
          <ThemedText themeColor="textTertiary" style={{ fontSize: 12, lineHeight: '16px' }}>
            {cadenceDeSaison ? 'La saison avance' : 'La période avance'} ; le trait mesure le temps, pas toi.
          </ThemedText>
        </>
      )}
    </ThemedView>
  );
}
