import React from 'react';
import { ChampDuPlafond } from 'ramille-design-system';

type Props = React.ComponentProps<typeof ChampDuPlafond>;

// Sous les puces d'une étape, à la largeur d'un téléphone : 390 moins ses deux marges de 24.
const Champ = ({ depart, ...props }: Omit<Props, 'valeur' | 'onChange'> & { depart: number | null }) => {
  const [valeur, setValeur] = React.useState<number | null>(depart);
  return (
    <div style={{ maxWidth: 342 }}>
      {/* Les props en clair, et non `{...props}` : `props-check.py` saute une balise qui étale ses props. */}
      <ChampDuPlafond unite={props.unite} label={props.label} marque={props.marque} valeur={valeur} onChange={setValeur} />
    </div>
  );
};

/** « 10+ » vient d'être touché, sous les vols : le champ s'ouvre vide, et l'étape le réclame. */
export const Vide = () => <Champ depart={null} unite="vols" label="Nombre de vols sur une année" />;

/**
 * « Suivant » touché, le champ toujours vide : son intitulé se marque, et la coquille écrit « Il manque encore le
 * nombre de vols. » au-dessus des boutons.
 */
export const Reclame = () => <Champ depart={null} marque unite="vols" label="Nombre de vols sur une année" />;

/** Un compte saisi, sous les trajets en voiture : l'unité est le nom compté, « trajets ». */
export const Saisi = () => <Champ depart={24} unite="trajets" label="Nombre de trajets en voiture sur une année" />;

/** Au-delà de cinquante, une ligne de relecture — jamais un blocage : ce qu'on attrape, c'est 250 pour 25. */
export const ARelire = () => <Champ depart={250} unite="vols" label="Nombre de vols sur une année" />;
