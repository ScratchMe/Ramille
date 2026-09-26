import React from 'react';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/ligne-de-canal.tsx — une ligne du choix du canal de rappel (« Par notification sur ce
// téléphone », « Par email », « Sans rappel »), rendue au même endroit pour ses deux écrans : le réglage de
// « Toi » (`ChoixDeRappel`) et la feuille ouverte après « C’est noté » (`FeuilleRappels`). Ce qui se rend SOUS
// la ligne — le lien des réglages du téléphone, la porte vers le compte — reste à l'écran qui l'emploie.
//
// `radio` et non `button` : c'est le seul rôle qui annonce « sélectionné ». Le libellé annoncé recompose ce que
// l'œil lit sur deux lignes : le titre seul ne dirait pas qu'un canal est hors d'atteinte, ni pourquoi.

// `paraitChoisie` (src/types/ligne-de-canal.ts) : une ligne hors d'atteinte ne paraît jamais choisie, même si
// c'est la préférence enregistrée — ce qui paraît coché est ce qui partira vraiment.
const paraitChoisie = (ligne) => ligne.choisi === true && ligne.choisissable !== false;

export function LigneDeCanal({ ligne, onChoisir, occupe = false }) {
  const coche = paraitChoisie(ligne);
  const choisissable = ligne.choisissable !== false;
  // `occupe` : un enregistrement est en cours, aucune ligne ne se choisit le temps qu'il aboutisse. Il ne change
  // rien à l'aspect — griser toutes les lignes à chaque choix les ferait clignoter.
  const desactivee = !choisissable || occupe;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={coche}
      aria-label={ligne.titre + '. ' + ligne.detail}
      disabled={desactivee}
      onClick={() => choisissable && onChoisir && onChoisir(ligne.canal)}
      data-appui="fond"
      style={{
        '--teinte-appuyee': coche ? 'var(--color-background-selected-pressed)' : 'var(--color-background-pressed)',
        width: '100%',
        textAlign: 'left',
        padding: '16px 24px',
        borderRadius: 16,
        border: '1.5px solid ' + (coche ? 'var(--color-accent)' : 'transparent'),
        background: coche ? 'var(--color-background-selected)' : 'var(--color-background-element)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-sans)',
        cursor: desactivee ? 'default' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {/* Hors d'atteinte, la ligne le dit par son texte, jamais par une opacité : le titre passe en tertiaire
          (5,28:1 sur le fond des éléments), le détail — la phrase qui dit pourquoi — reste en secondaire. */}
      <ThemedText weight={coche ? 600 : 400} themeColor={choisissable ? 'text' : 'textTertiary'} style={{ fontSize: 16, lineHeight: '22px' }}>{ligne.titre}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{ligne.detail}</ThemedText>
    </button>
  );
}
