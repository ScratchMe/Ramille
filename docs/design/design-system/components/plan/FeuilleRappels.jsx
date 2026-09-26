import React from 'react';
import { Button } from '../core/Button.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { RamilleDit } from '../mascotte/RamilleDit.jsx';
import { MessageInline } from '../core/MessageInline.jsx';
import { FeuilleDuBas } from '../core/FeuilleDuBas.jsx';
import { GroupeDeChoix } from '../forms/GroupeDeChoix.jsx';
import { LigneDeCanal } from '../forms/LigneDeCanal.jsx';
// Source : src/components/plan/feuille-rappels.tsx, dans le cadre de src/components/feuille-du-bas.tsx — poignée 40×4,
// « Les rappels » nomme le dialogue sans s'afficher (`enTete={false}`), Ramille 44, choix du canal, bouton, sortie.
// `libelleBouton` (src/types/rappels.ts) : le bouton n'annonce un dialogue système que s'il va s'en ouvrir un.
const libelleBouton = (canal, permission) =>
  canal === 'none' ? 'Continuer sans rappel' : canal === 'email' ? 'C’est bon' : permission === 'demandable' ? 'Autoriser les notifications' : 'C’est bon';
export function FeuilleRappels({ boucle = 'hebdo', permission = 'demandable', lignes, canal = 'push', onCanal, boutonLabel, onValider, onFerme, erreur, voile = true, style }) {
  const DETAIL_NOTIFICATION = {
    accordee: 'Le matin où la question s’ouvre.',
    demandable: 'À activer en une fois.',
    fermee: 'Coupées dans les réglages du téléphone — c’est là que ça se rouvre.',
  };
  const ligneRamille = boucle === 'hebdo'
    ? 'Je te laisse mener ton action. Lundi, je reviens te demander si tu l’as faite.'
    : 'Je te laisse mener ton action. Au début du mois prochain, je reviens te demander si tu l’as faite.';
  const question = 'Comment tu préfères que je te fasse signe ?';
  // `lignesDeReglage` (src/types/rappels.ts), sur un appareil sans compte : l'email n'y est pas choisissable.
  const items = lignes || [
    { canal: 'push', titre: 'Par notification sur ce téléphone', detail: DETAIL_NOTIFICATION[permission], lienVersLesReglages: permission === 'fermee' },
    { canal: 'email', titre: 'Par email', detail: 'Rattache un compte pour l’activer.', choisissable: false, porteVersLeCompte: true },
    { canal: 'none', titre: 'Sans rappel', detail: 'On se retrouve dans l’app, à chaque point.' },
  ];
  const lien = (label) => <TextLink label={label} role="link" type="small" weight={600} themeColor="accentText" containerStyle={{ alignSelf: 'flex-start', padding: '0 24px' }} />;
  // Le cadre est `FeuilleDuBas` : « Les rappels » nomme le dialogue sans s'afficher (`enTete={false}`) — ni le
  // canvas ni aucune décision ne portaient d'en-tête visible.
  return (
    <FeuilleDuBas titre="Les rappels" enTete={false} onFerme={onFerme} voile={voile} style={style}>
      <RamilleDit ligne={ligneRamille} mood="calm" size={44} themeColor="text" style={{ alignItems: 'flex-start' }} />
      <ThemedText type="body" themeColor="textSecondary">{question}</ThemedText>
      <GroupeDeChoix question={question} style={{ gap: 8 }}>
        {items.map((l) => (
          <React.Fragment key={l.canal}>
            <LigneDeCanal ligne={{ ...l, choisi: canal === l.canal }} onChoisir={onCanal} />
            {l.lienVersLesReglages && lien('Ouvrir les réglages du téléphone')}
            {l.porteVersLeCompte && lien('Rattacher un compte')}
          </React.Fragment>
        ))}
      </GroupeDeChoix>
      <MessageInline message={erreur || null} />
      <Button title={boutonLabel || libelleBouton(canal, permission)} onPress={onValider} />
      <ThemedText type="small" themeColor="textTertiary" style={{ textAlign: 'center' }}>Tu pourras changer d’avis dans « Toi ».</ThemedText>
    </FeuilleDuBas>
  );
}
