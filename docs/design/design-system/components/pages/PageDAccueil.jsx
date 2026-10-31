import React from 'react';
import { ThemedText } from '../core/ThemedText.jsx';
import { Button } from '../core/Button.jsx';
import { TextLink } from '../core/TextLink.jsx';
import { Mascot } from '../mascotte/Mascot.jsx';
import { RamilleDit } from '../mascotte/RamilleDit.jsx';
import { FilmDePresentation } from './FilmDePresentation.jsx';
import { BandeDeLEte, EchelleDesEtes, PartDuTransport } from './BandeDeLEte.jsx';
// Source : src/components/accueil/page-d-accueil.tsx — la page d'accueil du web, à la racine du site, pour qui n'a ni
// bilan ni questionnaire en cours (31/10/2026, `v1-36`). Un récit, puis ce que fait Ramille : l'été 2026 d'après
// Météo-France (titre « Que l'été 2026 reste une exception. », la bande de l'été, le premier bouton), ses chiffres et sa
// source, l'échelle des étés, la part du transport, « Tu ne peux pas arrêter une canicule. Tu peux changer un trajet. »
// avec Ramille — la seule bande sans chiffre —, comment ça marche (la fiche Play, mot pour mot, les trois temps reliés
// par un trait), les garanties et les limites, le film, le dernier bouton, le pied. Des bandes pleine largeur, une
// colonne de 560 (800 pour le haut sur un grand écran, et pour le film). Une barre d'appel en bas de l'écran entre le
// premier bouton et le dernier. Chaque bouton ouvre la session au geste, puis l'onboarding à sa deuxième page.
const corps = { fontSize: 16, lineHeight: '25px' };
const titreDeSection = { fontSize: 24, lineHeight: '30px', letterSpacing: '-0.3px' };
const Bande = ({ fond, children, largeur = 560 }) => (
  <div style={{ background: fond ? `var(--color-${fond})` : 'var(--color-background)', padding: '48px 16px' }}>
    <div style={{ width: '100%', maxWidth: largeur, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>{children}</div>
  </div>
);
const Appel = ({ onPress }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <Button title="Voir ce que pèsent mes trajets" onPress={onPress} />
    <ThemedText type="small" themeColor="textTertiary" style={{ textAlign: 'center' }}>Ton bilan prend 5 minutes environ. Pas de compte à créer pour commencer.</ThemedText>
  </div>
);
export function PageDAccueil({ sections = [], onCommencer, onDejaUnCompte }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Bande>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mascot mood="calm" size={40} tilt={-7} />
          <ThemedText weight={600} style={{ fontSize: 18, lineHeight: '24px' }}>Ramille</ThemedText>
        </div>
        <ThemedText type="small" weight={600} themeColor="accentText" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>Été 2026, d’après Météo-France</ThemedText>
        <ThemedText type="title" weight={700} style={{ fontSize: 36, lineHeight: '42px', letterSpacing: '-0.8px' }}>Que l’été 2026 reste une exception.</ThemedText>
        <BandeDeLEte />
        <ThemedText themeColor="textSecondary" style={{ fontSize: 17, lineHeight: '26px' }}>Le plus chaud jamais mesuré en France, depuis 1900. La suite dépend de ce que nous émettons — et en France, le transport est le premier poste de notre empreinte carbone.</ThemedText>
        <Appel onPress={onCommencer} />
        <TextLink label="J’ai déjà un compte" apparence="souligne" role="link" align="center" onPress={onDejaUnCompte} />
      </Bande>
      <Bande fond="background-element-2">
        <ThemedText type="subtitle" style={titreDeSection}>53 jours de vague de chaleur</ThemedText>
        <ThemedText themeColor="textSecondary" style={corps}>Trois vagues, de la mi-juin à la mi-août : plus d’un jour sur deux. Loin devant l’été 2022 et ses 33 jours.</ThemedText>
      </Bande>
      <Bande>
        <ThemedText type="subtitle" style={titreDeSection}>Aujourd’hui, un été sur 100. À +4 °C, un été ordinaire.</ThemedText>
        <EchelleDesEtes />
      </Bande>
      <Bande fond="background-element-2">
        <ThemedText type="subtitle" style={titreDeSection}>Et nos trajets ?</ThemedText>
        <PartDuTransport />
      </Bande>
      <Bande fond="background-tinted">
        <ThemedText type="subtitle" style={{ fontSize: 28, lineHeight: '34px', letterSpacing: '-0.5px' }}>Tu ne peux pas arrêter une canicule. Tu peux changer un trajet.</ThemedText>
        <RamilleDit ligne="Moi, c’est Ramille. Je serai là à chaque saison, à ton rythme." mood="encouraging" size={48} tilt={-6} />
        <Appel onPress={onCommencer} />
      </Bande>
      <Bande>
        <ThemedText type="subtitle" style={titreDeSection}>Comment ça marche</ThemedText>
        {sections.map((s) => (
          <div key={s.titre} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <ThemedText weight={600} accessibilityRole="header" style={{ fontSize: 18, lineHeight: '26px' }}>{s.titre}</ThemedText>
            <ThemedText themeColor="textSecondary" style={corps}>{s.texte}</ThemedText>
          </div>
        ))}
      </Bande>
      <Bande largeur={800}>
        <ThemedText type="subtitle" style={titreDeSection}>Le fil de Ramille</ThemedText>
        <FilmDePresentation />
      </Bande>
      <Bande fond="background-tinted">
        <ThemedText type="subtitle" style={titreDeSection}>Commence par tes trajets.</ThemedText>
        <Appel onPress={onCommencer} />
      </Bande>
    </div>
  );
}
