import React from 'react';
import { Button } from '../core/Button.jsx';
import { LigneDAttente } from '../core/LigneDAttente.jsx';
import { MessageInline } from '../core/MessageInline.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { ThemedView } from '../core/ThemedView.jsx';
import { EmptyStateIllustration } from '../illustrations/EmptyStateIllustration.jsx';
import { Mascot } from '../mascotte/Mascot.jsx';
// Source : src/components/plan/plan-sans-plan.tsx — l'écran du plan quand il n'y a pas de plan à montrer, en quatre
// états : la lecture qui tourne (« Chargement de ton plan… », muette 300 ms sauf après « Réessayer ») ; pas de bilan —
// deux écrans, dont celui d'un rappel ouvert sur un appareil où la personne n'est pas connectée, qui ne lui dit pas
// qu'elle n'a pas de bilan ; rien de lu (la connexion ne se nomme qu'hors ligne) ; et le plan pas encore généré, avec
// ses deux sorties. Un état vide est une affirmation sur les données de la personne : un échec de lecture ne le
// devient jamais.
const ECHEC = {
  horsLigne: 'Ton plan n’a pas pu être relu. Vérifie ta connexion.',
  serveur: 'Ton plan n’a pas pu être relu. Réessaie dans un instant.',
};
const CENTRE = { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 };
const VIDE = { flex: 1, padding: 24, justifyContent: 'center', gap: 16 };
export function PlanSansPlan({ etat = { status: 'loading' }, banniere = null, vientDUnRappel = false, relectureDemandee = false, onRelire, onReessayer }) {
  if (etat.status === 'loading') {
    return (
      <ThemedView style={{ flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', ...CENTRE }}>
          <LigneDAttente>Chargement de ton plan…</LigneDAttente>
        </div>
      </ThemedView>
    );
  }
  if (etat.status === 'no_assessment') {
    return (
      <ThemedView style={{ flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', ...VIDE }}>
          {banniere}
          {vientDUnRappel ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}><Mascot mood="calm" size={72} tilt={-6} /></div>
              <ThemedText type="screenTitle">Ce rappel concerne un compte</ThemedText>
              <ThemedText themeColor="textSecondary" style={{ fontSize: 16, lineHeight: '24px' }}>
                Retrouve-le ici. Ton bilan, ton plan et tes points sont rattachés à ce compte, pas à cet appareil.
              </ThemedText>
              <Button title="J’ai déjà un compte" style={{ marginTop: 12 }} />
              <TextLink label="Commencer un bilan sur cet appareil" apparence="action" role="link" />
            </>
          ) : (
            <>
              <EmptyStateIllustration style={{ height: 140 }} />
              <ThemedText type="screenTitle">Ton bilan n’est pas encore fait</ThemedText>
              <ThemedText themeColor="textSecondary" style={{ fontSize: 16, lineHeight: '24px' }}>
                Sans bilan, on ne peut pas savoir quel déplacement compte le plus pour toi. Environ 5 minutes.
              </ThemedText>
              <Button title="Faire mon bilan" style={{ marginTop: 12 }} />
              <TextLink label="J’ai déjà un compte" apparence="action" role="link" />
            </>
          )}
        </div>
      </ThemedView>
    );
  }
  if (etat.status === 'erreur_reseau') {
    return (
      <ThemedView style={{ flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', ...CENTRE }}>
          <MessageInline message={ECHEC[etat.genre]} style={{ textAlign: 'center', padding: '0 24px', marginBottom: 24, fontSize: 16, lineHeight: '24px' }} />
          <Button title="Réessayer" onPress={onReessayer} />
        </div>
      </ThemedView>
    );
  }
  return (
    <ThemedView style={{ flex: 1 }}>
      <div style={{ display: 'flex', flexDirection: 'column', ...CENTRE }}>
        {banniere}
        <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', padding: '0 24px', marginBottom: 24 }}>
          Ton plan est en cours de préparation, reviens dans un instant.
        </ThemedText>
        <div aria-busy={relectureDemandee} style={{ marginBottom: 16 }}>
          <Button title="Réessayer" onPress={onRelire} disabled={relectureDemandee} />
        </div>
        <TextLink label="Revoir mon bilan" apparence="action" role="link" />
      </div>
    </ThemedView>
  );
}
