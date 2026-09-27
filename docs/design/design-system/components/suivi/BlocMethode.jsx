import React from 'react';
import { TextLink } from '../core/TextLink.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/suivi/bloc-methode.tsx — « Comment ce chiffre est calculé », le bloc dépliable sous le total
// de la restitution. REPLIÉ par défaut : qui sort du questionnaire veut son chiffre, pas une méthodologie ; le besoin
// arrive quand on compare ce total à celui d'un autre simulateur. Le libellé ne devient jamais « Replier » : c'est le
// titre du contenu, et l'état se dit par `aria-expanded`.
//
// Le texte vit dans le dépôt (`src/constants/methodologie.ts`, `sectionsDeMethode`) ; il est recopié ici, valeurs
// comprises, avec l'espace insécable des milliers. Un écart entre les deux se corrige ici.
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const formatDate = (iso) => {
  const d = new Date(iso);
  return String(d.getDate()).padStart(2, '0') + ' ' + MOIS[d.getMonth()] + ' ' + d.getFullYear();
};
const sectionsDeMethode = (dateDuBilan) => [
  {
    titre: 'D’où viennent les facteurs',
    lignes: [
      'ADEME, Base Empreinte — interrogée via l’API Impact CO2 de l’ADEME.',
      ...(dateDuBilan ? ['Facteurs figés au ' + formatDate(dateDuBilan) + ', la date de ce bilan : une mise à jour du référentiel ne réécrit pas un résultat déjà rendu.'] : []),
    ],
  },
  {
    titre: 'Ce que le chiffre inclut',
    lignes: [
      'L’usage et la fabrication : le carburant ou l’électricité, mais aussi ce qu’a coûté la construction du véhicule, ramenée au kilomètre.',
      'C’est pour ça qu’un vélo n’est pas à zéro ici, et qu’une voiture électrique y pèse plus lourd que dans un simulateur qui ne compte que l’usage — l’écart peut aller du simple au quintuple.',
      'Conséquence à garder en tête : ce total ne se compare pas à celui d’un outil qui ne dit pas s’il compte la fabrication.',
    ],
  },
  {
    titre: 'Ce qu’on suppose, faute de te le demander',
    lignes: [
      'Ton trajet domicile-travail compte 45 semaines par an — 52 moins les congés, les jours fériés et les absences.',
      'Un second mode déclaré sans sa part du trajet en prend la moitié (50 %) : c’était le cas de tous les bilans faits avant qu’on pose la question.',
      '« Rarement » vaut 0,25 sortie par semaine, « une fois par semaine » 1, « plusieurs fois » 3 — sur 52 semaines.',
      'Sans distance déclarée, une sortie compte 15 km.',
      'Un vol compte 1 500 km s’il est court ou moyen-courrier, 9 000 km s’il est long-courrier — un aller, pas un aller-retour.',
      'Un trajet en train de plus de 300 km compte 800 km, un long trajet en autocar 700 km, en voiture 700 km.',
      'Aucune de ces valeurs n’est publiée par une source : ce sont des ordres de grandeur choisis pour ce bilan, pas des mesures.',
    ],
  },
];
export function BlocMethode({ dateDuBilan = null, ouvertAuDepart = false }) {
  const [ouvert, setOuvert] = React.useState(ouvertAuDepart);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <TextLink label="Comment ce chiffre est calculé" onPress={() => setOuvert((v) => !v)} expanded={ouvert} type="small" weight={600} themeColor="textSecondary" containerStyle={{ alignItems: 'flex-start' }} />
      {ouvert && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sectionsDeMethode(dateDuBilan).map((section) => (
            <div key={section.titre} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <ThemedText type="small" weight={600} themeColor="textSecondary">{section.titre}</ThemedText>
              {section.lignes.map((ligne) => <ThemedText key={ligne} type="small" themeColor="textTertiary">{ligne}</ThemedText>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
