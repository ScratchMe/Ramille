import React from 'react';
import { MessageInline } from '../core/MessageInline.jsx';
import { TextLink } from '../core/TextLink.jsx';
// Source : src/components/plan/banniere-de-relecture.tsx — la ligne qui dit que ce qu'on voit date : la dernière
// relecture du plan a échoué, ou un choix a été refusé (remplacement refusé, plan changé entre-temps). La phrase suit le
// genre de l'échec : la connexion ne se nomme qu'hors ligne (D19). « Réessayer » relance la même lecture que le retour
// sur l'onglet, inactif et dit occupé tant qu'elle tourne — un état se dit par le texte, jamais par une opacité.
// Rien à dire : rien de rendu. Au-dessus d'un écran centré (« en préparation », « pas encore de bilan »), elle se centre.
const PHRASES = {
  horsLigne: 'Ton plan n’a pas pu être relu à l’instant : ce que tu vois peut avoir changé depuis. Vérifie ta connexion.',
  serveur: 'Ton plan n’a pas pu être relu à l’instant : ce que tu vois peut avoir changé depuis.',
};
export function BanniereDeRelecture({ relectureEnEchec = null, refusDeRemplacement = null, relectureDemandee = false, onRelire, centree = false }) {
  if (relectureEnEchec === null && !refusDeRemplacement) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...(centree ? { alignItems: 'center', marginBottom: 24 } : {}) }}>
      {refusDeRemplacement && <MessageInline message={refusDeRemplacement} />}
      {relectureEnEchec !== null && (
        <>
          <MessageInline message={PHRASES[relectureEnEchec]} />
          <div aria-busy={relectureDemandee}>
            <TextLink label="Réessayer" apparence="action" onPress={onRelire} disabled={relectureDemandee} />
          </div>
        </>
      )}
    </div>
  );
}
