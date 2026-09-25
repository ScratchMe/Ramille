import React from 'react';
import { Button } from '../core/Button.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { RamilleDit } from '../mascotte/RamilleDit.jsx';
// Source : src/components/checkin-card.tsx — carte rayon 18 padding 18 gap 10 ; question 16/23/600 ; « Non » et
// « Oui » au même poids (deux secondaires `onPanel`), le troisième choix en lien ; l'accent tombe une fois répondu.
const RETOURS = {
  oui: { mood: 'happy', ligne: 'Bien joué — chaque changement compte.' },
  non: { mood: 'encouraging', ligne: 'Pas cette fois-ci. Rien d’obligatoire, on se repose la question au prochain point.' },
  sans_objet: { mood: 'calm', ligne: 'Pas de trajet, pas de question. On se retrouve lundi.' },
};
export function CheckinCard({ periodLabel, question, emphasize = true, answered = null, onAnswer, sansObjet = 'Pas de trajet la semaine dernière', retour, pied }) {
  // `true` / `false` : la forme d'avant la troisième réponse, que `ui_kits/ramille/` passe encore.
  const reponse = answered === true ? 'oui' : answered === false ? 'non' : answered;
  // L'accent désigne la question du poste dominant ; une question refermée n'a plus rien à désigner.
  const accent = emphasize && reponse === null;
  const mot = retour || RETOURS[reponse] || RETOURS.oui;
  return (
    <div style={{ background: accent ? 'var(--color-background-selected)' : 'var(--color-background-element)', borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ThemedText type="small" weight={600} themeColor={accent ? 'accentText' : 'textTertiary'}>{periodLabel}</ThemedText>
      {reponse === null ? (
        <>
          <ThemedText weight={600} style={{ fontSize: 16, lineHeight: '23px' }}>{question}</ThemedText>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button title="Non" variant="secondary" onPanel flex onPress={() => onAnswer && onAnswer('non')} />
            <Button title="Oui" variant="secondary" onPanel flex onPress={() => onAnswer && onAnswer('oui')} />
          </div>
          <TextLink label={sansObjet} onPress={() => onAnswer && onAnswer('sans_objet')} type="small" themeColor="textTertiary" containerStyle={{ alignItems: 'center' }} />
        </>
      ) : (
        <>
          <RamilleDit mood={mot.mood} ligne={mot.ligne} />
          {pied && <ThemedText type="small" themeColor="textTertiary">{pied}</ThemedText>}
        </>
      )}
    </div>
  );
}
