import React from 'react';
import { Button } from '../core/Button.jsx';
import { MessageInline } from '../core/MessageInline.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { RamilleDit } from '../mascotte/RamilleDit.jsx';
// Source : src/components/checkin-card.tsx — carte rayon 18 padding 18 gap 10 ; question 16/23/600 ; « Non » et
// « Oui » au même poids (deux secondaires `onPanel`), le troisième choix en lien ; l'accent tombe une fois répondu.
// **La réponse se corrige jusqu'au point suivant** (02/10/2026, `v1-33` §6) : la carte répondue porte « Modifier ma
// réponse », qui rouvre les trois réponses sous « Ta réponse : oui. » (`reponseEnPlace`), avec « Annuler ». Dans le dépôt,
// la carte n'est affichée que le temps de la période interrogée — la borne même que le RPC vérifie.
const RETOURS = {
  oui: { mood: 'happy', ligne: 'Bien joué — chaque changement compte.' },
  non: { mood: 'encouraging', ligne: 'Pas cette fois-ci. Rien d’obligatoire, on se repose la question au prochain point.' },
  sans_objet: { mood: 'calm', ligne: 'Pas de trajet, pas de question. On se retrouve lundi.' },
};
export function CheckinCard({ periodLabel, question, emphasize = true, answered = null, onAnswer, sansObjet = 'Pas de trajet la semaine dernière', actionQuittee = null, refus = null, erreur = null, retour, renforcement = null, pied, correction = false, reponseEnPlace = null, onModify, onCancel }) {
  // `true` / `false` : la forme d'avant la troisième réponse, que `ui_kits/ramille/` passe encore.
  const reponse = answered === true ? 'oui' : answered === false ? 'non' : answered;
  // L'accent désigne la question à regarder d'abord — celle de l'engagement quand deux points sont ouverts, celle du
  // poste dominant sinon (`accentDesPoints`, décidé par l'écran) ; une question refermée n'a plus rien à désigner.
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
      {reponse === null || correction ? (
        <>
          <ThemedText weight={600} style={{ fontSize: 16, lineHeight: '23px' }}>{question}</ThemedText>
          {/* La réponse en place, dans les mots des boutons : ils n'ont pas d'état « choisi », et c'est voulu. */}
          {correction && reponseEnPlace && <ThemedText type="small" themeColor="textTertiary">{reponseEnPlace}</ThemedText>}
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
              {/* Souligné au repos, comme « Annuler » et « Changer d'avis » (01/10/2026, audit P-7). */}
              <TextLink label={sansObjet} onPress={() => onAnswer && onAnswer('sans_objet')} type="small" themeColor="textTertiary" containerStyle={{ alignItems: 'center' }} style={{ textDecoration: 'underline' }} />
              {/* Une panne, pas un refus : les boutons restent, il n'y a qu'à recommencer. */}
              <MessageInline message={erreur} />
            </>
          )}
          {correction && (
            <TextLink label="Annuler" onPress={() => onCancel && onCancel()} type="small" themeColor="textTertiary" containerStyle={{ alignItems: 'center' }} style={{ textDecoration: 'underline' }} />
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
          <TextLink label="Modifier ma réponse" onPress={() => onModify && onModify()} type="small" themeColor="textTertiary" style={{ textDecoration: 'underline' }} />
        </>
      )}
    </div>
  );
}
