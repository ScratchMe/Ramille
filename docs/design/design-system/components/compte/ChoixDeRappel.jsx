import React from 'react';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/compte/choix-de-rappel.tsx — bloc « Les rappels » sur « Toi » : l'en-tête, puis un
// `radiogroup` nommé par lui, qui ne porte que les lignes.
const TITRE = 'Les rappels';
export function ChoixDeRappel({ lignes, canal, permission = 'demandable', onChoisir }) {
  const DETAIL_NOTIFICATION = {
    accordee: 'Le matin où la question s’ouvre.',
    demandable: 'À activer en une fois.',
    fermee: 'Coupées dans les réglages du téléphone — c’est là que ça se rouvre.',
  };
  // La ligne de canal est `LigneDeCanal` dans le dépôt (src/components/ligne-de-canal.tsx), absente du kit : elle est
  // rendue ici comme dans `FeuilleRappels.jsx`, à l'identique. Une ligne hors d'atteinte ne paraît jamais choisie
  // (`paraitChoisie`) ; son opacité de 0,6 contredit la règle du readme — contradiction ouverte, `v1-29` §5.
  const ligneDeCanal = (l, coche, onChoisir) => (
    <button type="button" role="radio" aria-checked={coche} aria-label={l.titre + '. ' + l.detail} disabled={l.choisissable === false} onClick={() => l.choisissable !== false && onChoisir && onChoisir(l.canal)} data-appui="fond"
      style={{ '--teinte-appuyee': coche ? 'var(--color-background-selected-pressed)' : 'var(--color-background-pressed)', width: '100%', textAlign: 'left', padding: '16px 24px', borderRadius: 16, border: '1.5px solid ' + (coche ? 'var(--color-accent)' : 'transparent'), background: coche ? 'var(--color-background-selected)' : 'var(--color-background-element)', opacity: l.choisissable === false ? 0.6 : 1, color: 'var(--color-text)', fontFamily: 'var(--font-sans)', cursor: l.choisissable === false ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <ThemedText weight={coche ? 600 : 400} style={{ fontSize: 16, lineHeight: '22px' }}>{l.titre}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{l.detail}</ThemedText>
    </button>
  );
  // `lignesDeReglage` (src/types/rappels.ts) sur un appareil sans compte. Sur web, la ligne « notification »
  // n'existe pas plutôt que d'être grisée.
  const items = lignes || [
    { canal: 'push', titre: 'Par notification sur ce téléphone', detail: DETAIL_NOTIFICATION[permission], lienVersLesReglages: permission === 'fermee' },
    { canal: 'email', titre: 'Par email', detail: 'Rattache un compte pour l’activer.', choisissable: false },
    { canal: 'none', titre: 'Sans rappel', detail: 'On se retrouve dans l’app, à chaque point.' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <ThemedText type="cardTitle">{TITRE}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">Un mot à chaque point de suivi, jamais plus.</ThemedText>
      </div>
      <div role="radiogroup" aria-label={TITRE} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((l) => (
          <React.Fragment key={l.canal}>
            {ligneDeCanal(l, canal === l.canal && l.choisissable !== false, onChoisir)}
            {l.lienVersLesReglages && <TextLink label="Ouvrir les réglages du téléphone" role="link" type="small" weight={600} themeColor="accentText" containerStyle={{ alignSelf: 'flex-start', padding: '0 24px' }} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
