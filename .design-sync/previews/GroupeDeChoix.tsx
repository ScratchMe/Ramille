import React from 'react';
import { GroupeDeChoix, Chip, ModeListItem, PrecisionMode, ThemedText } from 'ramille-design-system';

const Question = ({ children }: { children: string }) => (
  <ThemedText type="small" themeColor="textSecondary">{children}</ThemedText>
);

/**
 * Le nombre de jours du trajet : un `radiogroup` en grille de quatre colonnes au plus. La
 * question s'écrit une fois — le texte au-dessus, et le nom du groupe.
 */
export const JoursEnGrille = () => {
  const [jours, setJours] = React.useState(4);
  const question = 'Ce trajet, tu le fais combien de jours par semaine ?';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Question>{question}</Question>
      <GroupeDeChoix question={question} colonnes={4}>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <Chip key={n} label={String(n)} role="radio" selected={n === jours} onPress={() => setJours(n)} flex radius={14} accessibilityLabel={`${n} jours par semaine`} />
        ))}
      </GroupeDeChoix>
    </div>
  );
};

/**
 * Les jours de l'engagement se cumulent : un `group` de cases à cocher (`cumulable`), où chaque
 * jour reste un arrêt de tabulation.
 */
export const JoursQuiSeCumulent = () => {
  const [jours, setJours] = React.useState<number[]>([2, 4]);
  const JOURS = [[1, 'L', 'lundi'], [2, 'M', 'mardi'], [3, 'M', 'mercredi'], [4, 'J', 'jeudi'], [5, 'V', 'vendredi'], [6, 'S', 'samedi'], [7, 'D', 'dimanche']] as const;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--color-background-element)', borderRadius: 16, padding: 16 }}>
      <Question>Quels jours ?</Question>
      <GroupeDeChoix question="Quels jours ?" cumulable colonnes={4}>
        {JOURS.map(([v, initiale, jour]) => (
          <Chip key={v} label={initiale} accessibilityLabel={jour} role="checkbox" selected={jours.includes(v)} onPress={() => setJours((j) => (j.includes(v) ? j.filter((x) => x !== v) : [...j, v]))} radius={14} nestedBackground />
        ))}
      </GroupeDeChoix>
    </div>
  );
};

/**
 * Une précision est son propre groupe, posé DANS celui du mode : « Hybride » répond à « Quelle
 * motorisation ? », jamais au mode — et les flèches de l'un ne cochent rien dans l'autre.
 */
export const PrecisionImbriquee = () => {
  const [mode, setMode] = React.useState('voiture');
  const [moteur, setMoteur] = React.useState('thermique');
  const question = 'Quel est ton mode de transport principal pour ce trajet ?';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Question>{question}</Question>
      <GroupeDeChoix question={question} style={{ gap: 8 }}>
        <ModeListItem label="Voiture (seul)" selected={mode === 'voiture'} onPress={() => setMode('voiture')} />
        {mode === 'voiture' && (
          <PrecisionMode
            question="Quelle motorisation ?"
            options={[
              { value: 'thermique', label: 'Thermique' },
              { value: 'hybride', label: 'Hybride' },
              { value: 'hybride_rechargeable', label: 'Hybride rechargeable' },
              { value: 'electrique', label: 'Électrique' },
            ]}
            valeur={moteur}
            onChange={setMoteur}
          />
        )}
        <ModeListItem label="Bus" selected={mode === 'bus'} onPress={() => setMode('bus')} />
        <ModeListItem label="Vélo" selected={mode === 'velo'} onPress={() => setMode('velo')} />
      </GroupeDeChoix>
    </div>
  );
};
