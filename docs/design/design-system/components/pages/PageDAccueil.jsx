import React from 'react';
import { ThemedText } from '../core/ThemedText.jsx';
import { Button } from '../core/Button.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { Mascot } from '../mascotte/Mascot.jsx';
import { FilmDePresentation } from './FilmDePresentation.jsx';
// Source : src/components/accueil/page-d-accueil.tsx — la page d'accueil du web, à la racine du site, pour qui n'a ni
// bilan ni questionnaire en cours (23/10/2026, étape 5 de `v1-35`). L'équivalent de la fiche Play, avec le film : ses
// textes sont ceux de la fiche, mot pour mot (`src/constants/accueil.ts`, comparés par un test). Mascotte et nom en tête,
// l'accroche de l'onboarding en titre, « Découvrir mon impact », « Pas de compte à créer pour commencer. » puis « J'ai déjà
// un compte » ; le film, sa ligne et sa version texte repliée ; les sections de la fiche ; un second bouton ; le pied
// (l'éditeur, le contact, les trois pages publiques). Une colonne de 480 pour le texte, de 800 pour le film. Aucun chiffre.
const corps = { fontSize: 15, lineHeight: '23px' };
const titreDeSection = { fontSize: 18, lineHeight: '26px' };
const colonne = { width: '100%', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 };
export function PageDAccueil({ sections = [], filmEnTexte = [], onCommencer, onDejaUnCompte }) {
  const [ouvert, setOuvert] = React.useState(false);
  return (
    <div style={{ padding: '32px 16px', background: 'var(--color-background)', display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={colonne}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mascot mood="calm" size={40} tilt={-7} />
          <ThemedText weight={600} style={{ fontSize: 18, lineHeight: '24px' }}>Ramille</ThemedText>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ThemedText type="title" weight={600} style={{ fontSize: 32, lineHeight: '38px', letterSpacing: '-0.3px' }}>Comprendre tes trajets, sans te juger.</ThemedText>
          <ThemedText themeColor="textSecondary" style={{ fontSize: 17, lineHeight: '25px' }}>Calcule l’empreinte carbone de tes trajets et change une habitude à la fois.</ThemedText>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button title="Découvrir mon impact" onPress={onCommencer} />
          <ThemedText type="small" themeColor="textTertiary" style={{ textAlign: 'center' }}>Pas de compte à créer pour commencer.</ThemedText>
          <TextLink label="J’ai déjà un compte" apparence="souligne" role="link" align="center" onPress={onDejaUnCompte} />
        </div>
      </div>
      <div style={{ ...colonne, maxWidth: 800, gap: 16 }}>
        <ThemedText weight={600} accessibilityRole="header" style={titreDeSection}>Ramille en une minute et demie</ThemedText>
        <FilmDePresentation />
        <ThemedText themeColor="textSecondary" style={corps}>Sur Android, Ramille te fait signe par notification ; sur le web, par email.</ThemedText>
        <TextLink label="Le film en texte" apparence="souligne" expanded={ouvert} onPress={() => setOuvert(!ouvert)} />
        {ouvert ? filmEnTexte.map((p) => (
          <div key={p.chapitre} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ThemedText type="small" weight={600}>{p.chapitre}</ThemedText>
            <ThemedText themeColor="textSecondary" style={corps}>{p.texte}</ThemedText>
          </div>
        )) : null}
      </div>
      <div style={colonne}>
        {sections.map((s) => (
          <div key={s.titre} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ThemedText weight={600} accessibilityRole="header" style={titreDeSection}>{s.titre}</ThemedText>
            <ThemedText themeColor="textSecondary" style={corps}>{s.texte}</ThemedText>
          </div>
        ))}
        <Button title="Découvrir mon impact" onPress={onCommencer} />
      </div>
    </div>
  );
}
