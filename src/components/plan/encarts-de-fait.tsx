import { StyleSheet, View } from 'react-native';

import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { phraseDeLOrphelin } from '@/types/plan';
import { basculeDeSaison } from '@/types/saison';

// Les trois encarts de fait du plan, sortis de l'écran à l'étape 7b de `v1-35` (25/10/2026). L'écran
// décide s'ils se rendent ; ils disent ce qu'ils ont à dire.

/**
 * Un fait, pas une félicitation : ni mascotte (elle ne commente pas l'état du
 * compte), ni exclamation, ni action à faire.
 */
export function EncartDuRattachement({ adresse }: { adresse: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.encartDeFait}>
      <ThemedText type="small" themeColor="textSecondary">
        {adresse
          ? `Ton compte est rattaché à ${adresse}. Ton bilan te suit d’un appareil à l’autre.`
          : 'Ton compte est rattaché. Ton bilan te suit d’un appareil à l’autre.'}
      </ThemedText>
    </ThemedView>
  );
}

/**
 * **Ce qu'un recalcul a emporté, dit une fois** (C2.2, `v1-14` §5 ; étendu par C6.4). Avant, le
 * `delete from plan_actions` de la génération effaçait l'engagement, ses jours et son
 * intention sans un mot — le geste le plus engageant du produit annulé par le second
 * geste le plus encouragé. Il est maintenant archivé, et cet encart est l'endroit où la
 * personne l'apprend.
 *
 * Discret, et sans mascotte : c'est un fait sur ses données, pas un commentaire. Le
 * bouton écrit la marque locale, qui porte l'identifiant de la ligne — un second
 * re-bilan pourra donc le dire à son tour.
 */
export function EncartDeLOrphelin({
  orphelin,
  onCompris,
}: {
  orphelin: { released_reason: string; action_text: string };
  /** Écrit la marque locale et retire l'encart — l'écran s'en charge. */
  onCompris: () => void;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.encartDeFait}>
      <ThemedText type="small" themeColor="textSecondary">
        {phraseDeLOrphelin(orphelin.released_reason, orphelin.action_text)}
      </ThemedText>
      {/* **Le même « Compris » que celui des cartes d'ouverture** (audit P-12, 01/10/2026) :
          petit, 600, `accentText`. Il était le `TextLink` par défaut — 16 px, `text`, sans
          soulignement —, et les deux s'empilaient à 200 px l'un de l'autre sur le même
          écran : un même geste, deux apparences. */}
      <TextLink
        label="Compris"
        apparence="action"
        onPress={onCompris}
      />
    </ThemedView>
  );
}

/**
 * **Une période terminée se dit, elle ne se masque pas** (C2.2). Retomber sur l'écran
 * d'attente ferait disparaître l'action engagée et les jours choisis — ce qui a eu lieu
 * n'a pas à s'effacer parce que le cron n'est pas encore passé.
 *
 * **La phrase nomme la saison depuis C2.8**, et celle du **jour** : le cycle suivant peut
 * ne pas exister encore — le cron nocturne ne passe qu'une fois par nuit — alors que le
 * calendrier, lui, a bien tourné. La seconde phrase reste, et elle est ce qui empêche
 * « Voir la saison » d'avoir l'air mort : entre minuit et le passage du cron, relire ne
 * trouve rien de plus, et la personne sait pourquoi. Jamais une carte remplacée sous les
 * yeux — c'est un lien, pas une bascule automatique.
 */
export function EncartDuCycleRevolu({
  cadence,
  aujourdhui,
  relectureDemandee,
  onRelire,
}: {
  cadence: string;
  aujourdhui: Date;
  /** Une relance demandée tourne encore (audit P-8) : le lien reste inactif jusqu'à sa fin. */
  relectureDemandee: boolean;
  onRelire: () => void;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.encartDeFait}>
      <ThemedText type="small" themeColor="textSecondary">
        {basculeDeSaison(cadence, aujourdhui)} Ton prochain plan arrive ; en
        attendant, voici où tu en étais.
      </ThemedText>
      <View aria-busy={relectureDemandee}>
        <TextLink
          label="Voir la saison"
          apparence="action"
          onPress={onRelire}
          disabled={relectureDemandee}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // **Les trois encarts de fait** — l'engagement qu'un recalcul a emporté, la période révolue (C2.2),
  // et le rattachement du compte depuis le 01/10/2026 (audit P-12) : le même gabarit discret, parce
  // qu'ils disent la même sorte de chose — un fait sur l'état du plan, jamais une injonction. Le
  // rattachement était teinté `backgroundSelected` en `accentText`, l'accent que le système réserve au
  // dominant et à l'actionnable : il se lisait comme un succès.
  encartDeFait: {
    borderRadius: Radius.field,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
});
