import React from 'react';
import { Button } from '../core/Button.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/compte/mon-compte.tsx — carte élément rayon 18 padding 24 ; export, suppression avec confirmation en état.
export function MonCompte({ confirmation = false, onExporter, onDemanderSuppression, onAnnuler, onSupprimer, message }) {
  return (
    <div style={{ background: 'var(--color-background-element)', borderRadius: 18, padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <ThemedText type="small" weight={600}>Mes données</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">Tu peux récupérer l’intégralité de ce que Ramille sait de toi, dans un fichier JSON, ou tout supprimer définitivement.</ThemedText>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
        <Button title="Télécharger mes données" variant="secondary" onPress={onExporter} />
        {!confirmation ? (
          <TextLink label="Supprimer mon compte" onPress={onDemanderSuppression} type="small" themeColor="textTertiary" underline />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ThemedText type="small" themeColor="textSecondary">Tes bilans, ton plan, tes points de suivi et tes retours seront supprimés définitivement. Cette action est irréversible.</ThemedText>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <TextLink label="Annuler" onPress={onAnnuler} type="small" themeColor="textTertiary" underline />
              <Button title="Supprimer définitivement" onPress={onSupprimer} flex />
            </div>
          </div>
        )}
      </div>
      {message && <ThemedText type="small" themeColor="textSecondary">{message}</ThemedText>}
    </div>
  );
}
