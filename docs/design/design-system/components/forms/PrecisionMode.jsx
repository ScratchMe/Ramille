import React from 'react';
import { GroupeDeChoix } from './GroupeDeChoix.jsx';
import { IntituleDuChamp, useAncreDuChamp } from './IntituleDuChamp.jsx';
import { ModeListItem } from './ModeListItem.jsx';
// Source : src/components/bilan/precision-mode.tsx — une question de précision et ses réponses en rangées : l'intitulé
// (small, `textSecondary`), 8, puis les réponses à 4 l'une de l'autre, sur le fond de la page (`nestedBackground`).
// Elle ne dessine pas de boîte : elle se pose dans `BoiteDePrecision`, sous le choix qui la déclenche — jamais après
// la liste. Les réponses sont un groupe nommé par la question, posé DANS celui du choix : chaque réponse répond au
// groupe le plus proche, donc « Hybride » à « Quelle motorisation ? », jamais au mode.
//
// `champ` est ce qu'elle renseigne : « Il manque encore … » y mène (focus sur la réponse cochée, ou la première), et
// en marque l'intitulé en `accentText` 600.
export function PrecisionMode({ champ, question, options, valeur, onChange }) {
  const { bloc, marque } = useAncreDuChamp(champ);
  return (
    <div ref={bloc} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <IntituleDuChamp type="small" themeColor="textSecondary" marque={marque}>{question}</IntituleDuChamp>
      <GroupeDeChoix question={question} style={{ gap: 4 }}>
        {options.map((o) => <ModeListItem key={o.value} label={o.label} selected={valeur === o.value} onPress={() => onChange && onChange(o.value)} nestedBackground />)}
      </GroupeDeChoix>
    </div>
  );
}
