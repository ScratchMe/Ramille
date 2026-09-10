import React from 'react';
import { Button } from '../core/Button.jsx';
import { ChoiceRow } from '../forms/ChoiceRow.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { RamilleDit } from '../mascotte/RamilleDit.jsx';
import { MessageInline } from '../core/MessageInline.jsx';
// Source : src/components/plan/feuille-rappels.tsx — feuille basse, poignée 40×4, Ramille 44, choix du canal, bouton, sortie.
export function FeuilleRappels({ boucle = 'hebdo', lignes, canal, onCanal, boutonLabel, onValider, erreur, style }) {
  const ligneRamille = boucle === 'hebdo' ? 'Je te laisse mener ton action. Lundi, je reviens te demander si tu l’as faite.' : 'Je te laisse mener ton action. Au début du mois prochain, je reviens te demander si tu l’as faite.';
  const items = lignes || [
    { canal: 'push', titre: 'Une notification', detail: 'Sur ce téléphone, le lundi matin.' },
    { canal: 'email', titre: 'Un email', detail: 'À l’adresse de ton compte.' },
    { canal: 'aucun', titre: 'Rien', detail: 'On se retrouve ici lundi.' },
  ];
  return (
    <div style={{ background: 'var(--color-background)', borderTop: '1px solid var(--color-border)', borderRadius: '18px 18px 0 0', padding: '8px 24px 64px', display: 'flex', flexDirection: 'column', gap: 16, ...style }}>
      <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--color-border)', alignSelf: 'center', marginBottom: 8 }} />
      <RamilleDit ligne={ligneRamille} mood="calm" size={44} themeColor="text" />
      <ThemedText type="body" themeColor="textSecondary">Comment tu préfères que je te fasse signe ?</ThemedText>
      <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((l) => <ChoiceRow key={l.canal} label={l.titre} detail={l.detail} selected={canal === l.canal} disabled={l.choisissable === false} onPress={() => onCanal && onCanal(l.canal)} />)}
      </div>
      <MessageInline message={erreur || null} />
      <Button title={boutonLabel || (canal === 'push' ? 'Activer les notifications' : 'C’est noté')} onPress={onValider} />
      <ThemedText type="small" themeColor="textTertiary" style={{ textAlign: 'center' }}>Tu pourras changer d’avis dans « Toi ».</ThemedText>
    </div>
  );
}
