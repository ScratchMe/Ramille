import React from 'react';
import { Button } from '../core/Button.jsx';
import { MessageInline } from '../core/MessageInline.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { ChampDeCode } from './ChampDeCode.jsx';
// Source : src/components/auth/saisie-du-code.tsx — l'écran « Regarde tes emails », le même pour ses trois hôtes :
// rattacher une adresse (`/connexion/email`), retrouver un compte (`/connexion/retrouver`), et la page de suppression.
//
// Ce que l'écran a le droit d'AFFIRMER suit la voix de l'hôte, jamais l'état de l'adresse :
// — `parti` : l'envoi est certain (« Un code à 8 chiffres vient de partir à … ») — sauf plafond de rattachement atteint,
//   où le serveur se tait pour ne rien révéler —, et une phrase conditionnelle dit, AVANT
//   la saisie, ce que le code fera si un compte existait déjà — vraie dans les deux cas, donc montrable dans les deux ;
// — `peut_etre` : l'envoi n'est certain que si un compte existe, et une carte dit que le code ne crée jamais de compte —
//   ni ne révèle si l'adresse en a un. Dire lequel des deux cas s'est produit reviendrait à dire qui utilise Ramille.
// Le code se vérifie de lui-même au huitième chiffre. « Renvoyer un code » et « Utiliser une autre adresse » sont des
// boutons, pas des liens : ils agissent dans l'écran. Le champ ne se vide qu'au renvoi, jamais sur un refus.
const LONGUEUR_DU_CODE = 8;
// `corpsDeLaSaisie` et `consequenceDeLaSaisie` (src/types/connexion.ts), recopiées. Le message d'un renvoi arrive par
// `message` : « Un nouveau code vient de partir. » en `parti`, au conditionnel en `peut_etre` (`messageDuRenvoi`).
const corps = (voix, adresse) => voix === 'parti'
  ? 'Un code à ' + LONGUEUR_DU_CODE + ' chiffres vient de partir à ' + adresse + '. Tape-le ici — il vaut une heure.'
  : 'Si un compte Ramille existe avec cette adresse, un code à ' + LONGUEUR_DU_CODE + ' chiffres vient d’y partir. Tape-le ici — il vaut une heure.';
const consequence = (voix) => voix === 'parti'
  ? 'S’il existait déjà un compte Ramille à cette adresse, ce code t’y ramène — et le bilan de cet appareil ne l’y rejoindra pas.'
  : null;
export function SaisieDuCode({ voix = 'parti', adresse, libelleBouton, codeInitial = '', message = null, occupe = false, onValider, onRenvoyer, onAutreAdresse }) {
  const [code, setCode] = React.useState(codeInitial);
  const plausible = code.length === LONGUEUR_DU_CODE;
  const centre = { textAlign: 'center' };
  const surSaisie = (valeur) => {
    setCode(valeur);
    if (valeur.length === LONGUEUR_DU_CODE && onValider) onValider(valeur);
  };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24, marginTop: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ThemedText type="screenTitle">Regarde tes emails</ThemedText>
        <ThemedText type="body" themeColor="textSecondary">{corps(voix, adresse)}</ThemedText>
        {consequence(voix) && <ThemedText type="body" themeColor="textSecondary">{consequence(voix)}</ThemedText>}
      </div>
      {voix === 'peut_etre' && (
        <div style={{ background: 'var(--color-background-selected)', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ThemedText type="small" weight={600}>Le code ne crée jamais de compte</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">S’il n’y en a pas à cette adresse, rien ne part et rien n’est créé. On ne dit pas non plus si l’adresse en a un — ce serait dire qui utilise Ramille.</ThemedText>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ChampDeCode value={code} onChangeText={surSaisie} />
        <MessageInline message={message} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 'auto' }}>
        <Button title={occupe ? 'Vérification…' : libelleBouton} onPress={() => onValider && onValider(code)} disabled={occupe || !plausible} />
        <TextLink label="Renvoyer un code" apparence="souligne" onPress={() => { setCode(''); if (onRenvoyer) onRenvoyer(); }} role="button" style={centre} containerStyle={{ alignItems: 'center' }} />
        <TextLink label="Utiliser une autre adresse" apparence="souligne" onPress={onAutreAdresse} role="button" style={centre} containerStyle={{ alignItems: 'center' }} />
        {voix === 'parti' && <ThemedText type="small" themeColor="textTertiary" style={centre}>Si tu quittes cet écran, ton adresse reste gardée ici : tu peux reprendre depuis « Toi ».</ThemedText>}
      </div>
    </div>
  );
}
