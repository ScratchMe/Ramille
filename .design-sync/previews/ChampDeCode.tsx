import React from 'react';
import { ChampDeCode } from 'ramille-design-system';

/** Vide : contour `fieldBorder`. Taper ou coller un code — seuls les chiffres restent, huit au plus. */
export const Vide = () => {
  const [code, setCode] = React.useState('');
  return <ChampDeCode value={code} onChangeText={setCode} />;
};

/** En cours de saisie : le contour passe à l'accent, le code se lit en grand et espacé. */
export const EnSaisie = () => <ChampDeCode value="4817" />;

/** Complet : huit chiffres tabulaires. */
export const Complet = () => <ChampDeCode value="48172093" />;
