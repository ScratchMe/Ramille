import React from 'react';
import { Button } from '../core/Button.jsx';
import { Chip } from '../forms/Chip.jsx';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/plan/action-commitment.tsx — trois états : bouton « Je m'y engage », sélecteur d'intention, lien « Changer d'avis ».
// Les jours se comptent de 1 (lundi) à 7 (dimanche), comme `INTENTION_DAYS` (src/types/plan.ts) — le kit les
// comptait de 0 jusqu'au 26/09/2026, donc `days={[1, 3]}` y voulait dire mardi et jeudi, et lundi et mercredi
// dans le dépôt.
const DAYS = [[1, 'L', 'lundi'], [2, 'M', 'mardi'], [3, 'M', 'mercredi'], [4, 'J', 'jeudi'], [5, 'V', 'vendredi'], [6, 'S', 'samedi'], [7, 'D', 'dimanche']];
// Les échéances dépendent du poste (`intentionTimingsForPoste`) : « Ce mois-ci » n'est pas une échéance pour un
// vol. Les valeurs sont celles du dépôt, que la base enregistre.
const TIMINGS_LOISIRS = [['ce_mois', 'Ce mois-ci'], ['le_mois_prochain', 'Le mois prochain'], ['prochaine_occasion', 'À ma prochaine occasion']];
const TIMINGS_VOYAGES = [['au_prochain_voyage', 'À mon prochain projet de voyage'], ['avant_le_prochain_bilan', 'Avant mon prochain bilan']];
const SOULIGNE = { textDecoration: 'underline' };
export function ActionCommitment({ kind = 'days', poste = 'leisure', state = 'idle', days = [], timing = null, otherActionCommitted, onEngage, onPick, onToggleDay, onTiming, onCancel, onSubmit, onRelease }) {
  if (state === 'committed') return <div style={{ marginTop: 16 }}><TextLink label="Changer d’avis" hint="Libère cette action ; tu pourras en choisir une autre" onPress={onRelease} type="small" themeColor="textTertiary" style={SOULIGNE} /></div>;
  if (state === 'idle') return <div style={{ marginTop: 16 }}><Button title={otherActionCommitted ? 'Choisir celle-ci à la place' : 'Je m’y engage'} variant="secondary" onPress={onPick || onEngage} /></div>;
  const complete = kind === 'days' ? days.length > 0 : !!timing;
  // La question, écrite une fois : le texte au-dessus des puces et le nom de leur groupe.
  const question = kind === 'days' ? 'Quels jours ?' : 'Quand ?';
  const timings = poste === 'travel' ? TIMINGS_VOYAGES : TIMINGS_LOISIRS;
  return (
    <div style={{ marginTop: 16, background: 'var(--color-background-element)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ThemedText type="small" themeColor="textTertiary">{question}</ThemedText>
      {kind === 'days'
        // Les jours se cumulent : des `checkbox` dans un `group`, sur quatre colonnes au plus — trois quand une
        // cible de 48 n'y tiendrait plus.
        ? <GroupeDeChoix question={question} cumulable colonnes={4}>
            {DAYS.map(([v, s, l]) => <Chip key={v} label={s} accessibilityLabel={l} role="checkbox" selected={days.includes(v)} onPress={() => onToggleDay && onToggleDay(v)} radius={14} nestedBackground />)}
          </GroupeDeChoix>
        : <GroupeDeChoix question={question} style={{ gap: 8 }}>
            {timings.map(([v, l]) => <Chip key={v} label={l} role="radio" selected={timing === v} onPress={() => onTiming && onTiming(v)} radius={16} selectedStyle="outline" nestedBackground />)}
          </GroupeDeChoix>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <TextLink label="Annuler" onPress={onCancel} type="small" themeColor="textTertiary" style={SOULIGNE} />
        <Button title="C’est noté" onPress={onSubmit} disabled={!complete} flex />
      </div>
    </div>
  );
}
