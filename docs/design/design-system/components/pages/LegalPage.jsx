import React from 'react';
import { SortieDuDetour } from '../navigation/SortieDuDetour.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/legal/legal-page.tsx — le gabarit des deux pages légales (confidentialité, conditions) : date de
// mise à jour, titre, introduction, sections faites de paragraphes, de puces (un tiret cadratin tertiaire) ou de
// définitions. Une mesure de lecture de 480 au plus, centrée. Les titres de section sont des en-têtes de niveau 2 en
// 18/26 — un `subtitle` en porterait le rôle mais aussi les 32 px. Ce sont les seules surfaces publiques du produit, lues
// hors app et sans session : d'où leur pied, avec un vrai lien vers l'éditeur (une ancre, pas un bouton). Deux sorties
// (`v1-33` T-10) : en haut, au-dessus de la date, et à la fin, pour qui a tout lu.
const EDITOR_NAME = 'Antoine Berthaud';
const EDITOR_CV_URL = 'https://cv.antoine.berthaud.me/';
const corps = { fontSize: 15, lineHeight: '23px' };
function Bloc({ block }) {
  if (block.kind === 'paragraph') return <ThemedText themeColor="textSecondary" style={corps}>{block.text}</ThemedText>;
  if (block.kind === 'bullets') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {block.items.map((item) => (
          <div key={item} style={{ display: 'flex', gap: 8 }}>
            <ThemedText themeColor="textTertiary" style={corps}>—</ThemedText>
            <ThemedText themeColor="textSecondary" style={{ ...corps, flex: 1 }}>{item}</ThemedText>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {block.items.map((item) => (
        <div key={item.term} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ThemedText type="small" weight={600}>{item.term}</ThemedText>
          <ThemedText themeColor="textSecondary" style={corps}>{item.text}</ThemedText>
        </div>
      ))}
    </div>
  );
}
export function LegalPage({ title, updatedAt, intro, sections = [], onRetour }) {
  return (
    <div style={{ padding: '24px 24px 64px', background: 'var(--color-background)' }}>
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <SortieDuDetour label="Retour" onPress={onRetour} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ThemedText type="small" themeColor="textTertiary">Dernière mise à jour : {updatedAt}</ThemedText>
          <ThemedText type="title" weight={600} style={{ fontSize: 30, lineHeight: '36px', letterSpacing: '-0.3px' }}>{title}</ThemedText>
          <ThemedText themeColor="textSecondary" style={{ fontSize: 16, lineHeight: '24px' }}>{intro}</ThemedText>
        </div>
        {sections.map((section) => (
          <div key={section.heading} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ThemedText weight={600} accessibilityRole="header" style={{ fontSize: 18, lineHeight: '26px' }}>{section.heading}</ThemedText>
            {section.blocks.map((block, i) => <Bloc key={i} block={block} />)}
          </div>
        ))}
        <SortieDuDetour label="Retour" onPress={onRetour} />
        <div style={{ marginTop: 32 }}>
          <ThemedText type="small" themeColor="textTertiary">
            Un projet personnel d’<a href={EDITOR_CV_URL} target="_blank" rel="noopener" style={{ color: 'inherit', textDecoration: 'underline' }}>{EDITOR_NAME}</a>.
          </ThemedText>
        </div>
      </div>
    </div>
  );
}
