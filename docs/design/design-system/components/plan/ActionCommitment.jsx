import React from 'react';
import { Button } from '../core/Button.jsx';
import { Chip } from '../forms/Chip.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/plan/action-commitment.tsx — trois états : bouton « Je m'y engage », sélecteur d'intention, lien « Changer d'avis ».
const DAYS = [['L','lundi'],['M','mardi'],['M','mercredi'],['J','jeudi'],['V','vendredi'],['S','samedi'],['D','dimanche']];
const TIMINGS = [['ce_mois','Ce mois-ci'],['mois_prochain','Le mois prochain'],['occasion','À ma prochaine occasion']];
const SOULIGNE = { textDecoration: 'underline' };
export function ActionCommitment({ kind = 'days', state = 'idle', days = [], timing = null, otherActionCommitted, onEngage, onPick, onToggleDay, onTiming, onCancel, onSubmit, onRelease }) {
  if (state === 'committed') return <div style={{ marginTop: 16 }}><TextLink label="Changer d’avis" hint="Libère cette action ; tu pourras en choisir une autre" onPress={onRelease} type="small" themeColor="textTertiary" style={SOULIGNE} /></div>;
  if (state === 'idle') return <div style={{ marginTop: 16 }}><Button title={otherActionCommitted ? 'Choisir celle-ci à la place' : 'Je m’y engage'} variant="secondary" onPress={onPick || onEngage} /></div>;
  const complete = kind === 'days' ? days.length > 0 : !!timing;
  // La question, écrite une fois : le texte au-dessus des puces et le nom de leur groupe.
  const question = kind === 'days' ? 'Quels jours ?' : 'Quand ?';
  return (
    <div style={{ marginTop: 16, background: 'var(--color-background-element)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ThemedText type="small" themeColor="textTertiary">{question}</ThemedText>
      {kind === 'days'
        // Les jours se cumulent : des `checkbox` dans un `group`, en grille de quatre colonnes au plus —
        // une cellule ne descend jamais sous 48 + 8, donc la grille passe seule à trois colonnes quand
        // quatre n'y tiennent plus (`GroupeDeChoix colonnes={4}` dans le dépôt).
        ? <div role="group" aria-label={question} style={{ display: 'flex', flexWrap: 'wrap', rowGap: 8, margin: '0 -4px' }}>
            {DAYS.map(([s, l], i) => <div key={i} style={{ width: '25%', minWidth: 56, padding: '0 4px', display: 'flex', flexDirection: 'column' }}><Chip label={s} accessibilityLabel={l} role="checkbox" selected={days.includes(i)} onPress={() => onToggleDay && onToggleDay(i)} radius={14} nestedBackground /></div>)}
          </div>
        : <div role="radiogroup" aria-label={question} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{TIMINGS.map(([v, l]) => <Chip key={v} label={l} role="radio" selected={timing === v} onPress={() => onTiming && onTiming(v)} radius={16} selectedStyle="outline" nestedBackground />)}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <TextLink label="Annuler" onPress={onCancel} type="small" themeColor="textTertiary" style={SOULIGNE} />
        <Button title="C’est noté" onPress={onSubmit} disabled={!complete} flex />
      </div>
    </div>
  );
}
