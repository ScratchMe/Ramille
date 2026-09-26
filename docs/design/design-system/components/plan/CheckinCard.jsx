import React from 'react';
import { Button } from '../core/Button.jsx';
import { MessageInline } from '../core/MessageInline.jsx';
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
export function CheckinCard({ periodLabel, question, emphasize = true, answered = null, onAnswer, sansObjet = 'Pas de trajet la semaine dernière', actionQuittee = null, refus = null, erreur = null, retour, renforcement = null, pied }) {
  // `true` / `false` : la forme d'avant la troisième réponse, que `ui_kits/ramille/` passe encore.
  const reponse = answered === true ? 'oui' : answered === false ? 'non' : answered;
  // L'accent désigne la question du poste dominant ; une question refermée n'a plus rien à désigner.
  const accent = emphasize && reponse === null;
  const mot = retour || RETOURS[reponse] || RETOURS.oui;
  // La réplique prend le focus quand elle remplace les boutons — sur une réponse donnée ici, jamais au montage :
  // une carte déjà répondue qu'on retrouve n'a volé le focus à personne.
  const replique = React.useRef(null);
  const reponseAuMontage = React.useRef(reponse);
  React.useEffect(() => {
    if (reponse !== null && reponse !== reponseAuMontage.current && replique.current) replique.current.focus({ preventScroll: true });
  }, [reponse]);
  return (
    <div style={{ background: accent ? 'var(--color-background-selected)' : 'var(--color-background-element)', borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ThemedText type="small" weight={600} themeColor={accent ? 'accentText' : 'textTertiary'}>{periodLabel}</ThemedText>
      {reponse === null ? (
        <>
          <ThemedText weight={600} style={{ fontSize: 16, lineHeight: '23px' }}>{question}</ThemedText>
          {/* La question est figée à sa génération : changer d'action ensuite ne la réécrit pas, et la carte le dit. */}
          {actionQuittee && <ThemedText type="small" themeColor="textTertiary">Cette question porte sur l’action que tu suivais alors : {actionQuittee}.</ThemedText>}
          {refus ? (
            // Le point n'accepte plus de réponse : la question reste lisible, les boutons partent.
            <MessageInline message={refus} />
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button title="Non" variant="secondary" onPanel flex onPress={() => onAnswer && onAnswer('non')} />
                <Button title="Oui" variant="secondary" onPanel flex onPress={() => onAnswer && onAnswer('oui')} />
              </div>
              <TextLink label={sansObjet} onPress={() => onAnswer && onAnswer('sans_objet')} type="small" themeColor="textTertiary" containerStyle={{ alignItems: 'center' }} />
              {/* Une panne, pas un refus : les boutons restent, il n'y a qu'à recommencer. */}
              <MessageInline message={erreur} />
            </>
          )}
        </>
      ) : (
        <>
          <div ref={replique} tabIndex={-1}>
            <RamilleDit mood={mot.mood} ligne={mot.ligne} />
          </div>
          {/* Le second renforcement : voix du produit, pas de Ramille — il constate un fait sur deux périodes, et
              elle ne compte jamais. Une fois, jamais au-delà de deux, jamais un badge. */}
          {renforcement && <ThemedText type="body">{renforcement}</ThemedText>}
          {pied && <ThemedText type="small" themeColor="textTertiary">{pied}</ThemedText>}
        </>
      )}
    </div>
  );
}
