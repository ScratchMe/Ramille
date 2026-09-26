import React from 'react';
import { ThemedText } from './ThemedText.jsx';
// Source : src/components/feuille-du-bas.tsx — le cadre d'une feuille du bas : le voile, la feuille, sa poignée
// et son titre. Ce qui reste à chaque feuille est son contenu (`FeuilleRappels`, et dans le dépôt la feuille
// « Nouveau bilan »).
//
// Le titre est obligatoire, et c'est lui qui nomme le dialogue ; avec `enTete={false}`, il ne s'affiche pas et
// continue de le nommer. L'en-tête affiché est de niveau 2 : la feuille s'ouvre par-dessus un écran qui porte
// déjà son titre. Le geste de retour — Échap sur web — referme toujours (`onFerme`) : une feuille qu'on ne peut
// pas fermer n'est plus une proposition.
//
// Dans le dépôt, la feuille est une fenêtre `Modal` qui recouvre l'écran. Le kit la rend en place, dans son
// voile (`voile`, vrai par défaut) : un calque fixe sortirait du cadre de la maquette. Posée au bas d'un écran
// de maquette, elle s'y lit comme dans l'app ; `voile={false}` rend la feuille seule.
export function FeuilleDuBas({ titre, enTete = true, onFerme, voile = true, style, children }) {
  const feuille = (
    <div
      role="dialog"
      aria-label={titre}
      onKeyDown={(e) => { if (e.key === 'Escape' && onFerme) onFerme(); }}
      style={{
        background: 'var(--color-background)',
        borderTop: '1px solid var(--color-border)',
        borderRadius: '18px 18px 0 0',
        padding: '8px 24px 64px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        ...(voile ? {} : style),
      }}
    >
      <div aria-hidden="true" style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--color-border)', alignSelf: 'center', marginBottom: 8 }} />
      {enTete && <ThemedText type="cardTitle" accessibilityRole="header">{titre}</ThemedText>}
      {children}
    </div>
  );
  if (!voile) return feuille;
  // Le voile est l'une des deux seules transparences du produit (`--color-scrim`) ; un appui dessus ne referme
  // pas — c'est le geste de retour qui le fait, comme dans le dépôt.
  return (
    <div style={{ background: 'var(--color-scrim)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingTop: 24, ...style }}>
      {feuille}
    </div>
  );
}
