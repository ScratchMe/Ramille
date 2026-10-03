import React from 'react';
import { Button } from '../core/Button.jsx';
import { Chip } from '../forms/Chip.jsx';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/plan/action-commitment.tsx — trois états : bouton « Je m'y engage », sélecteur d'intention, et
// la carte engagée, qui porte deux liens : « Modifier les jours » (ou « Modifier l'échéance ») et « Changer d'avis ». Le
// premier rouvre le sélecteur **prérempli**, sans libérer l'action (`v1-33` D15, 02/10/2026) : c'est `state="picking"`
// avec les jours ou l'échéance en place — une échéance relative au mois qu'elle vise ; dans le dépôt, il se referme à la
// lecture qui rend l'intention envoyée (une lecture en échec le rend actif), sans feuille des rappels.
// `relecture` (01/10/2026, audit P-1) : « C'est noté » a abouti et l'écran relit le plan — le sélecteur reste, son
// bouton inactif, jusqu'à la carte engagée ; dans le dépôt, c'est `lectures` qui le dit.
// `demande` (01/10/2026, D13 de `v1-33`) : « C'est noté » a été touché sur une intention incomplète. Il n'est pas
// inactif mais en attente (`Button.enAttente`) : son toucher fait apparaître sous les choix ce qui manque — « Choisis
// au moins un jour. » ou « Choisis une échéance. » (`ceQuiManqueALIntention`, src/types/plan.ts) —, en `accentText`
// 600, et porte le focus sur le premier choix. Dans le dépôt, la ligne retombe dès que l'intention est complète.
// `surLeChoix` (29/09/2026, `v1-32`) ouvre d'emblée le sélecteur — sur « Toutes les pistes », où « Choisir » vient de
// le dire —, et `onAnnuler` rend alors la main à l'appelant. Dans le dépôt, le focus va à la question quand le
// sélecteur s'ouvre, et revient au bouton quand « Annuler » le referme sur le plan : rien de ça ne se dessine.
// Les jours se comptent de 1 (lundi) à 7 (dimanche), comme `INTENTION_DAYS` (src/types/plan.ts) — le kit les
// comptait de 0 jusqu'au 26/09/2026, donc `days={[1, 3]}` y voulait dire mardi et jeudi, et lundi et mercredi
// dans le dépôt.
const DAYS = [[1, 'L', 'lundi'], [2, 'M', 'mardi'], [3, 'M', 'mercredi'], [4, 'J', 'jeudi'], [5, 'V', 'vendredi'], [6, 'S', 'samedi'], [7, 'D', 'dimanche']];
// Les échéances dépendent du poste (`intentionTimingsForPoste`) : « Ce mois-ci » n'est pas une échéance pour un
// vol. Les valeurs sont celles du dépôt, que la base enregistre.
const TIMINGS_LOISIRS = [['ce_mois', 'Ce mois-ci'], ['le_mois_prochain', 'Le mois prochain'], ['prochaine_occasion', 'À ma prochaine occasion']];
const TIMINGS_VOYAGES = [['au_prochain_voyage', 'À mon prochain projet de voyage'], ['avant_le_prochain_bilan', 'Avant mon prochain bilan']];
export function ActionCommitment({ kind = 'days', poste = 'leisure', state: etatDemande = 'idle', days = [], timing = null, otherActionCommitted, surLeChoix = false, onAnnuler, relecture = false, demande = false, onEngage, onPick, onToggleDay, onTiming, onCancel, onSubmit, onRelease, onModify }) {
  const state = surLeChoix && etatDemande === 'idle' ? 'picking' : etatDemande;
  if (state === 'committed') return (
    <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 24 }}>
      <TextLink label={kind === 'days' ? 'Modifier les jours' : 'Modifier l’échéance'} apparence="souligne" hint="Rouvre le choix, sans libérer cette action" onPress={onModify} />
      <TextLink label="Changer d’avis" apparence="souligne" hint="Libère cette action ; tu pourras en choisir une autre" onPress={onRelease} />
    </div>
  );
  if (state === 'idle') return <div style={{ marginTop: 16 }}><Button title={otherActionCommitted ? 'Choisir celle-ci à la place' : 'Je m’y engage'} variant="secondary" onPress={onPick || onEngage} /></div>;
  const complete = kind === 'days' ? days.length > 0 : !!timing;
  // Ce qui manque, mot pour mot (`ceQuiManqueALIntention`), et seulement tant qu'il manque quelque chose.
  const manque = complete ? null : kind === 'days' ? 'Choisis au moins un jour.' : 'Choisis une échéance.';
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
            {DAYS.map(([v, s, l]) => <Chip key={v} label={s} accessibilityLabel={l} role="checkbox" selected={days.includes(v)} onPress={() => onToggleDay && onToggleDay(v)} radius={14} nestedBackground flex />)}
          </GroupeDeChoix>
        : <GroupeDeChoix question={question} style={{ gap: 8 }}>
            {timings.map(([v, l]) => <Chip key={v} label={l} role="radio" selected={timing === v} onPress={() => onTiming && onTiming(v)} radius={16 /* Radius.field */} selectedStyle="outline" nestedBackground />)}
          </GroupeDeChoix>}
      {demande && manque && <ThemedText type="small" weight={600} themeColor="accentText">{manque}</ThemedText>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <TextLink label="Annuler" apparence="souligne" onPress={onAnnuler || onCancel} />
        {/* Posé sur l'encart (03/10/2026, brief de l'étape du contexte §4.5) : grisé, il en prenait le gris. */}
        <Button title="C’est noté" onPress={onSubmit} enAttente={!complete} disabled={relecture} flex onPanel />
      </div>
    </div>
  );
}
