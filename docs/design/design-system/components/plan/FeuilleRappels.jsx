import React from 'react';
import { Button } from '../core/Button.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { RamilleDit } from '../mascotte/RamilleDit.jsx';
import { MessageInline } from '../core/MessageInline.jsx';
// Source : src/components/plan/feuille-rappels.tsx, dans le cadre de src/components/feuille-du-bas.tsx — poignée 40×4,
// titre « Les rappels » qui nomme le dialogue, Ramille 44, choix du canal, bouton, sortie.
// `libelleBouton` (src/types/rappels.ts) : le bouton n'annonce un dialogue système que s'il va s'en ouvrir un.
const libelleBouton = (canal, permission) =>
  canal === 'none' ? 'Continuer sans rappel' : canal === 'email' ? 'C’est bon' : permission === 'demandable' ? 'Autoriser les notifications' : 'C’est bon';
export function FeuilleRappels({ boucle = 'hebdo', permission = 'demandable', lignes, canal = 'push', onCanal, boutonLabel, onValider, erreur, style }) {
  const DETAIL_NOTIFICATION = {
    accordee: 'Le matin où la question s’ouvre.',
    demandable: 'À activer en une fois.',
    fermee: 'Coupées dans les réglages du téléphone — c’est là que ça se rouvre.',
  };
  // La ligne de canal est `LigneDeCanal` dans le dépôt (src/components/ligne-de-canal.tsx), absente du kit : elle est
  // rendue ici comme dans `ChoixDeRappel.jsx`, à l'identique. Une ligne hors d'atteinte ne paraît jamais choisie
  // (`paraitChoisie`) ; son opacité de 0,6 contredit la règle du readme — contradiction ouverte, `v1-29` §5.
  const ligneDeCanal = (l, coche, onChoisir) => (
    <button type="button" role="radio" aria-checked={coche} aria-label={l.titre + '. ' + l.detail} disabled={l.choisissable === false} onClick={() => l.choisissable !== false && onChoisir && onChoisir(l.canal)} data-appui="fond"
      style={{ '--teinte-appuyee': coche ? 'var(--color-background-selected-pressed)' : 'var(--color-background-pressed)', width: '100%', textAlign: 'left', padding: '16px 24px', borderRadius: 16, border: '1.5px solid ' + (coche ? 'var(--color-accent)' : 'transparent'), background: coche ? 'var(--color-background-selected)' : 'var(--color-background-element)', opacity: l.choisissable === false ? 0.6 : 1, color: 'var(--color-text)', fontFamily: 'var(--font-sans)', cursor: l.choisissable === false ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <ThemedText weight={coche ? 600 : 400} style={{ fontSize: 16, lineHeight: '22px' }}>{l.titre}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{l.detail}</ThemedText>
    </button>
  );
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
  return (
    <div role="dialog" aria-label="Les rappels" style={{ background: 'var(--color-background)', borderTop: '1px solid var(--color-border)', borderRadius: '18px 18px 0 0', padding: '8px 24px 64px', display: 'flex', flexDirection: 'column', gap: 16, ...style }}>
      <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--color-border)', alignSelf: 'center', marginBottom: 8 }} />
      <ThemedText type="cardTitle" accessibilityRole="header">Les rappels</ThemedText>
      <RamilleDit ligne={ligneRamille} mood="calm" size={44} themeColor="text" style={{ alignItems: 'flex-start' }} />
      <ThemedText type="body" themeColor="textSecondary">{question}</ThemedText>
      <div role="radiogroup" aria-label={question} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((l) => (
          <React.Fragment key={l.canal}>
            {ligneDeCanal(l, canal === l.canal && l.choisissable !== false, onCanal)}
            {l.lienVersLesReglages && lien('Ouvrir les réglages du téléphone')}
            {l.porteVersLeCompte && lien('Rattacher un compte')}
          </React.Fragment>
        ))}
      </div>
      <MessageInline message={erreur || null} />
      <Button title={boutonLabel || libelleBouton(canal, permission)} onPress={onValider} />
      <ThemedText type="small" themeColor="textTertiary" style={{ textAlign: 'center' }}>Tu pourras changer d’avis dans « Toi ».</ThemedText>
    </div>
  );
}
