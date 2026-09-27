import { useEffect, useState } from 'react';

/**
 * Combien de temps un chargement reste muet avant de se dire (27/09/2026, `v1-30` §5.8).
 *
 * Relevé image par image sur l'export : au premier passage sur un onglet, « Chargement de ton
 * suivi… » s'affichait **une image** avant le contenu — un clignotement qui ne disait rien, sinon
 * que l'écran n'était pas prêt. En dessous de ce seuil, l'écran reste vide et le contenu arrive
 * seul ; au-delà, la phrase dit que le geste a été pris, comme avant.
 */
export const DELAI_AVANT_CHARGEMENT = 300;

/**
 * Vrai une fois que `actif` est resté vrai pendant `delai` millisecondes, et faux dès qu'il ne l'est
 * plus. Un chargement qui se relance repart de zéro : il n'hérite pas du temps d'un chargement
 * précédent.
 */
export function useApresUnDelai(actif: boolean, delai: number): boolean {
  const [ecoule, setEcoule] = useState(false);

  useEffect(() => {
    if (!actif) return;
    const minuteur = setTimeout(() => setEcoule(true), delai);
    return () => {
      clearTimeout(minuteur);
      setEcoule(false);
    };
  }, [actif, delai]);

  return actif && ecoule;
}
