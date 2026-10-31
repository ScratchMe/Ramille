import React from 'react';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/accueil/recit-de-l-ete.tsx — les trois figures du récit de la page d'accueil du web
// (31/10/2026, `v1-36`) : `BandeDeLEte` (l'été 2026, un trait par jour, pleins les 53 jours de vague de chaleur, d'après
// Météo-France), `EchelleDesEtes` (aujourd'hui, +2,7 °C, +4 °C, et ce qu'un été comme 2026 y devient) et `PartDuTransport`
// (les cinq postes de l'empreinte moyenne en une barre, le transport en tête et dans l'accent, SDES 2017). Des données,
// pas des illustrations : chaque figure porte sa phrase entière pour le lecteur d'écran. L'encre pour la chaleur, ni
// rouge ni orange. Dans l'app, chacune se dessine quand elle paraît (`--motion-recit`, `--motion-trace`) ; ici, posée.
// Les valeurs sont recopiées ici pour dessiner la fiche : la source reste `climat.ts` et `carbon-reference.ts`.
const VAGUES = [['2026-06-17', '2026-06-30'], ['2026-07-04', '2026-07-19'], ['2026-07-28', '2026-08-19']];
function joursDeLEte() {
  const jours = [];
  for (let d = new Date(Date.UTC(2026, 5, 1)); d <= new Date(Date.UTC(2026, 7, 31)); d = new Date(d.getTime() + 864e5)) {
    const iso = d.toISOString().slice(0, 10);
    jours.push({ iso, enVague: VAGUES.some(([a, b]) => iso >= a && iso <= b) });
  }
  return jours;
}
export function BandeDeLEte({ grande = false }) {
  const jours = joursDeLEte();
  return (
    <div role="img" aria-label="L’été 2026, du 1er juin au 31 août : 53 jours de vague de chaleur sur 92." style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div aria-hidden style={{ display: 'flex', height: grande ? 112 : 72, gap: grande ? 2 : 1 }}>
        {jours.map((j) => (
          <div key={j.iso} style={{ flex: 1, borderRadius: 1, background: j.enVague ? 'var(--color-text)' : 'var(--color-border)' }} />
        ))}
      </div>
      <div aria-hidden style={{ display: 'flex' }}>
        {[['juin', 30], ['juillet', 31], ['août', 31]].map(([nom, n]) => (
          <div key={nom} style={{ flex: n, borderLeft: '1px solid var(--color-border)', paddingLeft: 4, paddingTop: 2 }}>
            <ThemedText type="small" themeColor="textTertiary">{nom}</ThemedText>
          </div>
        ))}
      </div>
    </div>
  );
}
export function EchelleDesEtes({ reperes = [
  { libelle: 'Aujourd’hui', detail: 'Un été comme 2026 : une chance sur 100.' },
  { libelle: '+2,7 °C', detail: 'La France vers 2050.' },
  { libelle: '+4 °C', detail: 'La France vers 2100. Les températures de l’été 2026 y seraient ordinaires.' },
] }) {
  return (
    <div>
      {reperes.map((r, i) => {
        const dernier = i === reperes.length - 1;
        return (
          <div key={r.libelle} style={{ display: 'flex', gap: 16 }}>
            <div aria-hidden style={{ width: 18, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, boxSizing: 'border-box', border: '2px solid var(--color-accent)', marginTop: 4, background: dernier ? 'var(--color-accent)' : 'var(--color-background)' }} />
              {dernier ? null : <div style={{ flex: 1, width: 2, margin: '4px 0', background: 'var(--color-accent)' }} />}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: dernier ? 0 : 32 }}>
              <ThemedText weight={600} style={{ fontSize: 20, lineHeight: '26px' }}>{r.libelle}</ThemedText>
              <ThemedText themeColor="textSecondary" style={{ fontSize: 16, lineHeight: '25px' }}>{r.detail}</ThemedText>
            </div>
          </div>
        );
      })}
    </div>
  );
}
const POSTES = [['transport', 'Transport', 2.8], ['logement', 'Logement', 2.2], ['alimentation', 'Alimentation', 2.1], ['services', 'Services', 1.5], ['equipements', 'Équipements', 0.9]];
const t = (v) => `${v.toFixed(1).replace('.', ',')} t`;
export function PartDuTransport() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div role="img" aria-label={POSTES.map(([, l, v]) => `${l} : ${t(v)}`).join(', ')} style={{ display: 'flex', height: 22, gap: 2 }}>
        {POSTES.map(([cle, , v], i) => (
          <div key={cle} aria-hidden style={{ flex: v, background: cle === 'transport' ? 'var(--color-accent)' : 'var(--color-accent-muted)', borderRadius: i === 0 ? '14px 0 0 14px' : i === POSTES.length - 1 ? '0 14px 14px 0' : 0 }} />
        ))}
      </div>
      <div aria-hidden style={{ display: 'flex', flexWrap: 'wrap', columnGap: 16, rowGap: 4 }}>
        {POSTES.map(([cle, l, v]) => (
          <ThemedText key={cle} type="small" weight={cle === 'transport' ? 600 : 400} themeColor={cle === 'transport' ? 'accentText' : 'textSecondary'}>{`${l} ${t(v)}`}</ThemedText>
        ))}
        <ThemedText type="small" themeColor="textTertiary">Total 9,5 t</ThemedText>
      </div>
    </div>
  );
}
