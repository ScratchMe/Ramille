import React from 'react';
import { Button } from '../core/Button.jsx';
import { Chip } from '../forms/Chip.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/plan/action-commitment.tsx — trois états : bouton « Je m'y engage », sélecteur d'intention, lien « Changer d'avis ».
const DAYS = [['L','Lundi'],['M','Mardi'],['M','Mercredi'],['J','Jeudi'],['V','Vendredi'],['S','Samedi'],['D','Dimanche']];
const TIMINGS = [['ce_mois','Ce mois-ci'],['mois_prochain','Le mois prochain'],['occasion','À ma prochaine occasion']];
export function ActionCommitment({ kind = 'days', state = 'idle', days = [], timing = null, otherActionCommitted, onEngage, onPick, onToggleDay, onTiming, onCancel, onSubmit, onRelease }) {
  if (state === 'committed') return <div style={{ marginTop: 16 }}><TextLink label="Changer d’avis" onPress={onRelease} type="small" themeColor="textTertiary" underline /></div>;
  if (state === 'idle') return <div style={{ marginTop: 16 }}><Button title={otherActionCommitted ? 'Choisir celle-ci à la place' : 'Je m’y engage'} variant="secondary" onPress={onPick || onEngage} /></div>;
  const complete = kind === 'days' ? days.length > 0 : !!timing;
  return (
    <div style={{ marginTop: 16, background: 'var(--color-background-element)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ThemedText type="small" themeColor="textTertiary">{kind === 'days' ? 'Quels jours ?' : 'Quand ?'}</ThemedText>
      {kind === 'days'
        ? <div style={{ display: 'flex', gap: 6 }}>{DAYS.map(([s, l], i) => <Chip key={i} label={s} ariaLabel={l} selected={days.includes(i)} onPress={() => onToggleDay && onToggleDay(i)} flex radius={14} />)}</div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{TIMINGS.map(([v, l]) => <Chip key={v} label={l} selected={timing === v} onPress={() => onTiming && onTiming(v)} radius={16} selectedStyle="outline" />)}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <TextLink label="Annuler" onPress={onCancel} type="small" themeColor="textTertiary" underline />
        <Button title="C’est noté" onPress={onSubmit} disabled={!complete} flex />
      </div>
    </div>
  );
}
