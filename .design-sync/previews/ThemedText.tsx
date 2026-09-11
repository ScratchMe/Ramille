import React from 'react';
import { ThemedText } from 'ramille-design-system';

const Colonne = ({ children }: { children?: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>{children}</div>
);

/**
 * L'échelle complète, dans l'ordre où un écran la traverse : titre d'écran,
 * chiffre saillant, titre de carte, corps, secondaire, mono.
 */
export const Echelle = () => (
  <Colonne>
    <ThemedText type="screenTitle">Ton plan</ThemedText>
    <ThemedText type="salient">− 184 kg</ThemedText>
    <ThemedText type="cardTitle">Faire deux trajets à vélo</ThemedText>
    <ThemedText type="body" themeColor="textSecondary">Deux actions liées à ton trajet domicile-travail.</ThemedText>
    <ThemedText type="small" themeColor="textTertiary">par an · 7 % de ton empreinte</ThemedText>
    <ThemedText type="code" themeColor="textTertiary">source ADEME · ACV complète</ThemedText>
  </Colonne>
);

/**
 * Les trois niveaux de texte et l'accent. L'accent marque ce qui est dominant ou
 * actionnable — jamais un verdict, d'où l'absence de rouge et d'orange.
 */
export const Couleurs = () => (
  <Colonne>
    <ThemedText themeColor="text">Ton bilan du 8 septembre</ThemedText>
    <ThemedText themeColor="textSecondary">Tes voyages pèsent le plus dans ton empreinte.</ThemedText>
    <ThemedText themeColor="textTertiary">Bilan précédent · 11 juin</ThemedText>
    <ThemedText themeColor="accentText" weight={600}>Tes réponses du dernier bilan sont pré-remplies.</ThemedText>
  </Colonne>
);

/**
 * Un paragraphe d'onboarding : corps en 400, deux phrases courtes et factuelles.
 * Le produit dit des faits chiffrés sans les qualifier.
 */
export const Paragraphe = () => (
  <Colonne>
    <ThemedText type="subtitle" as="h1" style={{ fontSize: 34, lineHeight: '40px' }}>
      Tes trajets, en kilos
    </ThemedText>
    <ThemedText type="body" weight={400} themeColor="textSecondary" as="p">
      Neuf étapes, quatre minutes. On part de tes trajets d'une semaine ordinaire et de tes
      déplacements de l'année, puis on met un chiffre dessus.
    </ThemedText>
    <ThemedText type="body" weight={400} themeColor="textSecondary" as="p">
      Les facteurs viennent de la base Empreinte de l'ADEME, fabrication comprise.
    </ThemedText>
  </Colonne>
);
