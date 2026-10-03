import React from 'react';
import { Button } from '../core/Button.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { RamilleDit } from '../mascotte/RamilleDit.jsx';
// Source : src/components/plan/carte-douverture.tsx — la carte d'ouverture du plan, pour ses TROIS usages : une
// nouvelle saison, le tout premier plan, et l'arrivée des deux lieux (Plan et Suivi). Un seul cadre — filet `border`,
// fond `backgroundTinted`, étiquette 13/18/700, titre `screenTitle` de niveau 2, corps `body` —, et ce qui change est
// du contenu, dérivé dans le dépôt (`src/types/saison.ts`, `src/types/premier-parcours.ts`).
//
// Ramille est DESSOUS et hors du cadre : la carte peut porter deux nombres (points répondus, changements), et elle
// ne se tient jamais près d'un chiffre qu'on commente. Sa ligne et son visage sont passés par l'appelant, sans
// défaut : « On repart pour une saison. » au premier plan dirait la seule phrase qui n'y est pas vraie.
//
// Elle entre en glissant depuis le bas, 320 ms (`data-entree`, base.css), sauf si l'on a demandé moins d'animations.
export function CarteDOuverture({ ouverture, sorties = [], ligne, visage, onSortie }) {
  return (
    <div data-entree="glisse" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--color-background-tinted)', border: '1px solid var(--color-border)', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <ThemedText themeColor="accentText" weight={700} style={{ fontSize: 13, lineHeight: '18px', letterSpacing: '0.3px' }}>{ouverture.etiquette}</ThemedText>
        {/* Niveau 2 : la carte est une section de l'écran du plan, dont « Ton plan » est le titre de niveau 1. */}
        <ThemedText type="screenTitle" headingLevel={2}>{ouverture.titre}</ThemedText>
        {/* Sans point répondu sur la période écoulée, pas de corps du tout : « 0 point répondu » nommerait les manqués. */}
        {ouverture.corps && <ThemedText type="body" themeColor="textSecondary">{ouverture.corps}</ThemedText>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          {sorties.map((s) =>
            s.forme === 'lien'
              ? <TextLink key={s.cle} label={s.label} apparence="action" onPress={() => onSortie && onSortie(s.cle)} />
              // `onPanel` : sur la carte teintée, un secondaire gris s'y confondait.
              : <Button key={s.cle} title={s.label} variant={s.forme === 'primaire' ? 'primary' : 'secondary'} onPanel onPress={() => onSortie && onSortie(s.cle)} />
          )}
        </div>
      </div>
      <RamilleDit ligne={ligne} mood={visage} size={44} tilt={-5} themeColor="text" style={{ padding: '0 4px' }} />
    </div>
  );
}
