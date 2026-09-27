import React from 'react';
import { FeuilleDuBas, ThemedText, Button, TextLink } from 'ramille-design-system';

/**
 * La feuille du nouveau bilan, qui affiche son titre : il nomme aussi le dialogue. Le cadre porte
 * le voile, la poignée et les marges ; le contenu est celui de la feuille.
 */
export const AvecTitre = () => (
  <FeuilleDuBas titre="Ton plan va être recalculé">
    <ThemedText type="body" themeColor="textSecondary">
      L’action que tu suis — Faire un trajet sur cinq à vélo — et le moment que tu avais choisi restent engagés si ton nouveau plan propose encore cette action. Sinon, tu en choisiras une autre.
    </ThemedText>
    <ThemedText type="small" themeColor="textTertiary">
      Rien ne presse : une habitude met du temps à prendre. Si tes trajets n’ont pas changé, ton bilan actuel est toujours juste.
    </ThemedText>
    <Button title="Soumettre mon bilan" />
    <TextLink label="Pas maintenant" type="small" weight={600} themeColor="accentText" style={{ textAlign: 'center' }} />
  </FeuilleDuBas>
);

/**
 * Nommer n'oblige pas à afficher : `enTete={false}` quand le canvas ne dessine pas d'en-tête — la
 * feuille des rappels. Le titre nomme toujours le dialogue.
 */
export const SansEnTete = () => (
  <FeuilleDuBas titre="Les rappels" enTete={false}>
    <ThemedText type="body" themeColor="textSecondary">Comment tu préfères que je te fasse signe ?</ThemedText>
    <Button title="Autoriser les notifications" />
  </FeuilleDuBas>
);
