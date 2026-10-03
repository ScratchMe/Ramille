import React from 'react';
import { LigneDeCanal } from '../forms/LigneDeCanal.jsx';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/compte/choix-de-rappel.tsx — bloc « Les rappels » sur « Toi » : l'en-tête, puis un
// `radiogroup` nommé par lui, qui ne porte que les lignes.
const TITRE = 'Les rappels';
// Le mot de la veille (C4.2) — `TITRE_DE_LA_VEILLE`, `GROUPE_DE_LA_VEILLE` et `sousTitreDesRappels`
// (src/types/rappels.ts). Le sous-titre est un plafond dérivé de ce que la personne a demandé.
const TITRE_DE_LA_VEILLE = 'Un mot la veille de tes jours de trajet';
const GROUPE_DE_LA_VEILLE = 'Le mot de la veille';
const sousTitre = (canal, veille) =>
  canal === 'push' && veille && veille.coche
    ? 'Un mot à chaque point de suivi, et la veille de tes jours de trajet — jamais plus.'
    : 'Un mot à chaque point de suivi, jamais plus.';

// `CaseDeLaVeille` (interne à src/components/compte/choix-de-rappel.tsx) : une `checkbox`, de la famille des
// lignes de canal — même fond, même bordure d'accent quand elle est cochée, jamais une opacité.
function CaseDeLaVeille({ coche, detail, onBasculer }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={coche}
      aria-label={TITRE_DE_LA_VEILLE + '. ' + detail}
      onClick={() => onBasculer && onBasculer(coche)}
      data-appui="fond"
      style={{
        '--teinte-appuyee': coche ? 'var(--color-background-selected-pressed)' : 'var(--color-background-pressed)',
        width: '100%',
        textAlign: 'left',
        padding: '16px 24px',
        borderRadius: 16,
        border: '1.5px solid ' + (coche ? 'var(--color-accent)' : 'transparent'),
        background: coche ? 'var(--color-background-selected)' : 'var(--color-background-element)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-sans)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <ThemedText weight={coche ? 600 : 400} style={{ fontSize: 16, lineHeight: '22px' }}>{TITRE_DE_LA_VEILLE}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{detail}</ThemedText>
    </button>
  );
}

export function ChoixDeRappel({ lignes, canal, permission = 'demandable', onChoisir, veille, onBasculerLaVeille }) {
  const DETAIL_NOTIFICATION = {
    accordee: 'Le matin où la question s’ouvre.',
    demandable: 'À activer en une fois.',
    fermee: 'Coupées dans les réglages du téléphone — c’est là que ça se rouvre.',
  };
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
        <ThemedText type="cardTitle" accessibilityRole="header">{TITRE}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{sousTitre(canal, veille)}</ThemedText>
      </div>
      {/* Le groupe ne porte que les lignes, nommé par l'en-tête ; la ligne est `LigneDeCanal`, la même que dans
          la feuille des rappels. */}
      <GroupeDeChoix question={TITRE} style={{ gap: 8 }}>
        {items.map((l) => (
          <React.Fragment key={l.canal}>
            <LigneDeCanal ligne={{ ...l, choisi: canal === l.canal }} onChoisir={onChoisir} />
            {l.lienVersLesReglages && <TextLink label="Ouvrir les réglages du téléphone" apparence="action" role="link" containerStyle={{ alignSelf: 'flex-start', padding: '0 24px' }} />}
            {/* Le mot de la veille précise « Par notification » : il se rend sous elle, en retrait, dans son propre
                groupe — il n'existe qu'en notification (D3 de `v1-25`). */}
            {l.canal === 'push' && veille && (
              <GroupeDeChoix question={GROUPE_DE_LA_VEILLE} cumulable style={{ marginLeft: 16 }}>
                <CaseDeLaVeille coche={veille.coche} detail={veille.detail} onBasculer={onBasculerLaVeille} />
              </GroupeDeChoix>
            )}
          </React.Fragment>
        ))}
      </GroupeDeChoix>
    </div>
  );
}
