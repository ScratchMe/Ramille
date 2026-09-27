import React from 'react';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/configuration-manquante.tsx — l'écran d'un build sans ses variables Supabase. Il ne s'adresse
// pas à la personne qui utilise l'app mais à qui l'a construite : chaque ligne nomme la variable en cause, en chasse
// fixe (des clés à recopier au caractère près), puis ce qu'il faut faire en développement et sur un build EAS.
// `decrireProbleme` (src/types/configuration.ts), recopiée.
const decrire = (p) => p.type === 'manquante'
  ? p.variable + ' n’est pas définie.'
  : p.variable + ' comporte un chemin (' + p.valeur + '). L’URL d’un projet Supabase s’arrête au domaine, sans /rest/v1 ni rien après.';
export function ConfigurationManquante({ problemes = [] }) {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, background: 'var(--color-background)' }}>
      <ThemedText type="screenTitle">Configuration manquante</ThemedText>
      <ThemedText type="body" themeColor="textSecondary">L’app ne peut pas démarrer sans sa connexion à Supabase.</ThemedText>
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {problemes.map((p, i) => <ThemedText key={p.type + '-' + p.variable + '-' + i} type="code" themeColor="text" style={{ fontSize: 12, lineHeight: '18px' }}>{decrire(p)}</ThemedText>)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ThemedText type="cardTitle" weight={600}>En développement</ThemedText>
        <ThemedText type="body" themeColor="textSecondary">Copie .env.example vers .env, renseigne les deux valeurs, puis relance le serveur — les variables sont lues au démarrage du bundler, pas à chaud.</ThemedText>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ThemedText type="cardTitle" weight={600}>Sur un build EAS</ThemedText>
        <ThemedText type="body" themeColor="textSecondary">Les variables se déclarent sur expo.dev, dans l’environnement du profil de build (store → production, developmentClient → development, sinon preview). Le .env local n’est pas envoyé à EAS, et les valeurs sont figées dans le bundle au moment du build : il faut en relancer un.</ThemedText>
      </div>
    </div>
  );
}
