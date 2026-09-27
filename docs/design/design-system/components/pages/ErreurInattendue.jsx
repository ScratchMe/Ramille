import React from 'react';
import { Button } from '../core/Button.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/erreur-inattendue.tsx — le dernier filet quand un écran lève : un titre qui dit le fait, une
// ligne qui invite à réessayer, la cause technique en chasse fixe et sélectionnable (à recopier, pas à lire comme du
// produit), et « Réessayer ». Défilable et centré : un détail long ne doit pas pousser le bouton hors de l'écran.
// `decrireErreur` (src/types/erreur.ts), recopiée : « Nom : message » pour une erreur, sinon le texte, borné à 600.
const DETAIL_MAX = 600;
const decrireErreur = (e) => {
  if (e instanceof Error) return (e.message ? e.name + ' : ' + e.message : e.name).slice(0, DETAIL_MAX);
  if (typeof e === 'string') return e.slice(0, DETAIL_MAX);
  try {
    const json = JSON.stringify(e);
    if (typeof json === 'string') return json.slice(0, DETAIL_MAX);
  } catch (ignoree) { /* le filet du filet */ }
  return String(e).slice(0, DETAIL_MAX);
};
export function ErreurInattendue({ erreur, reessayer }) {
  return (
    <div style={{ minHeight: 480, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24, background: 'var(--color-background)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ThemedText type="screenTitle">L’écran n’a pas pu s’afficher</ThemedText>
        <ThemedText type="body" themeColor="textSecondary">Réessaie. Si ça se reproduit, cette précision aidera à comprendre :</ThemedText>
        <ThemedText type="code" themeColor="textTertiary" style={{ fontSize: 12, lineHeight: '18px', userSelect: 'text', wordBreak: 'break-word' }}>{decrireErreur(erreur)}</ThemedText>
        <Button title="Réessayer" onPress={reessayer} style={{ marginTop: 8 }} />
      </div>
    </div>
  );
}
