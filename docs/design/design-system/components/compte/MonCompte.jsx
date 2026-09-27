import React from 'react';
import { Button } from '../core/Button.jsx';
import { MessageInline } from '../core/MessageInline.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { RamilleDit } from '../mascotte/RamilleDit.jsx';
// Source : src/components/compte/mon-compte.tsx — carte blanche cernée (filet `border`), rayon 18, padding 24 ; export,
// suppression avec confirmation en état. Blanche et non grise, pour son bouton : sur un panneau gris, le bouton
// secondaire, gris lui aussi, perdait sa forme et se lisait comme du texte. Le libellé de l'export est celui du web
// (« Télécharger ») ; sur natif, le fichier part par la feuille de partage et le bouton dit « Exporter ».
export function MonCompte({ confirmation = false, occupe = null, supprime = false, onExporter, onDemanderSuppression, onAnnuler, onSupprimer, onRevenir, message }) {
  const SOULIGNE = { textDecoration: 'underline' };
  const carte = { background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: 18, padding: 24, display: 'flex', flexDirection: 'column', gap: 8 };
  // Après la suppression, la carte dit que c'est fait, ce qui est parti, et laisse Ramille dire au revoir — sans
  // retenir personne. Le seul geste est de revenir au début, où une session neuve et vide attend.
  if (supprime) {
    return (
      <div style={carte}>
        <ThemedText type="small" weight={600}>C’est fait.</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">Ton compte et tout ce qui s’y rattachait — bilans, plan, points de suivi, retours — ont été supprimés définitivement.</ThemedText>
        <RamilleDit ligne="Merci du temps passé ici. Si tu reviens, on repart de zéro, tranquillement." mood="calm" size={44} tilt={-7} />
        <Button title="Revenir au début" onPress={onRevenir} />
      </div>
    );
  }
  // Pendant un export ou une suppression, tout se désactive, et le bouton qui travaille le dit.
  const inactif = occupe !== null;
  return (
    <div style={carte}>
      <ThemedText type="small" weight={600} accessibilityRole="header">Mes données</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">Tu peux récupérer l’intégralité de ce que Ramille sait de toi, dans un fichier JSON, ou tout supprimer définitivement.</ThemedText>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
        <Button title={occupe === 'export' ? 'Génération…' : 'Télécharger mes données'} variant="secondary" onPress={onExporter} disabled={inactif} />
        {!confirmation ? (
          <TextLink label="Supprimer mon compte" hint="Demande une confirmation avant de supprimer quoi que ce soit" onPress={onDemanderSuppression} disabled={inactif} type="small" themeColor="textTertiary" style={SOULIGNE} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ThemedText type="small" themeColor="textSecondary">Tes bilans, ton plan, tes points de suivi et tes retours seront supprimés définitivement. Cette action est irréversible.</ThemedText>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <TextLink label="Annuler" onPress={onAnnuler} disabled={inactif} type="small" themeColor="textTertiary" style={SOULIGNE} />
              <Button title={occupe === 'suppression' ? 'Suppression…' : 'Supprimer définitivement'} onPress={onSupprimer} disabled={inactif} flex />
            </div>
          </div>
        )}
      </div>
      <MessageInline message={message || null} />
    </div>
  );
}
