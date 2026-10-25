import React from 'react';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
import { ThemedView } from '../core/ThemedView.jsx';
import { Mascot } from '../mascotte/Mascot.jsx';
// Source : src/components/plan/cartes-du-plan.tsx — quatre cartes du plan, rayon `card`, padding 20 :
//   - CarteDAttente : Ramille dit l'attente, pas le vide — le jour où elle revient (« On se retrouve ici lundi. »),
//     visage `resting` ; le détail sous sa ligne est du produit, pas d'elle, et la porte (« Rattacher un compte »…) se
//     rend SOUS la ligne qui l'appelle, en lien et jamais la carte entière en bouton ;
//   - EncartDeContexte : sur quoi le plan s'appuie (zone, transports, véhicules, télétravail), sans jamais nommer
//     l'action écartée ni son gain, et la porte « Modifier ces réponses » ;
//   - CarteDeFelicitation : un plan à zéro action n'est pas un échec, c'est quelqu'un qui fait déjà l'essentiel ;
//   - CarteDuRebilan : une proposition, jamais un rappel insistant — elle ferme l'écran.
export function CarteDAttente({ ligne, detail = null, porte = null }) {
  return (
    <ThemedView type="backgroundElement" style={{ borderRadius: 18, padding: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Mascot mood="resting" size={40} />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: 2 }}>
          <ThemedText weight={600}>{ligne}</ThemedText>
          {detail && <ThemedText type="small" themeColor="textSecondary">{detail}</ThemedText>}
          {porte && (
            <TextLink label={porte.libelle} apparence="action" onPress={porte.onPress} role="link" hint="Ouvre l’écran « Toi »." containerStyle={{ alignSelf: 'flex-start' }} />
          )}
        </div>
      </div>
    </ThemedView>
  );
}
export function EncartDeContexte({ mots = [], onModifier }) {
  return (
    <ThemedView type="backgroundElement" style={{ borderRadius: 18, padding: 20, gap: 8 }}>
      <ThemedText type="small" themeColor="textSecondary">
        Ton plan tient compte de ton contexte : {mots.join(', ')}. Ce qui ne tient pas avec ces réponses n’est pas proposé.
      </ThemedText>
      <TextLink label="Modifier ces réponses" apparence="action" onPress={onModifier} role="link" containerStyle={{ alignSelf: 'flex-start' }} />
    </ThemedView>
  );
}
export function CarteDeFelicitation({ titre, promettreLePoint = true }) {
  return (
    <ThemedView type="backgroundElement" style={{ borderRadius: 18, padding: 20, gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Mascot mood="happy" size={36} />
        <ThemedText type="cardTitle" style={{ flex: 1, minWidth: 0 }}>{titre}</ThemedText>
      </div>
      <ThemedText type="body" themeColor="textSecondary">
        Aucun changement de mode ne te ferait gagner assez pour valoir la peine d’être proposé.
        {promettreLePoint ? ' Le point reste là si tu veux garder un œil dessus.' : ''}
      </ThemedText>
    </ThemedView>
  );
}
export function CarteDuRebilan({ titre, onFaire }) {
  return (
    <ThemedView type="backgroundElement" style={{ borderRadius: 18, padding: 20, gap: 8 }}>
      <ThemedText type="small" themeColor="textSecondary">
        {titre} En faire un nouveau prend quelques minutes ; ton plan s’ajuste.
      </ThemedText>
      <TextLink label="Faire un nouveau bilan" apparence="action" onPress={onFaire} role="link" />
    </ThemedView>
  );
}
