import { Stack } from 'expo-router';
import { createContext, useContext, useMemo, useRef } from 'react';

// Pile de l'onglet Plan : l'écran lui-même, et la liste complète des pistes (`plan/pistes`).
// Même forme que `suivi/_layout.tsx`, et pour la même raison — une pile imbriquée dans un
// onglet garde la barre visible avec cet onglet actif, ce qui est la seule façon d'avoir la
// barre sur l'écran des pistes sans dupliquer un composant de barre.

/**
 * Ce qu'un engagement pris sur l'écran des pistes laisse au plan (C5.2, décidé en `v1-17` §7.3).
 *
 * **Un drapeau local, jamais `?engagee=1`.** Trois raisons, et la première est la plus forte : ce
 * n'est pas un booléen qui doit voyager mais le **poste**, parce que la feuille des rappels promet
 * un contact *sur l'action qu'on vient d'engager* (`boucleDeLAction`, constat n°1 de la recette du
 * 14/09/2026 — quelqu'un qui a un trajet domicile-travail et s'engage sur un vol s'entendait
 * promettre le lundi). Un paramètre d'URL porterait donc une valeur publique de plus à valider, et
 * une valeur fautive recréerait à la main le défaut qu'on vient de corriger. Ensuite : les deux
 * paramètres d'URL du produit (`?rappel=1`, `?nouveau=1`) existent parce que leur émetteur est
 * **hors** de l'app, alors qu'ici les deux écrans sont dans le même processus et la même pile. Et
 * sur web, il s'écrirait dans la barre d'adresse — rechargeable, partageable, ouvrant une cérémonie
 * sans engagement derrière.
 *
 * **Il se consomme une fois, et c'est structurel** : `useRafraichirAuRetour` écoute le focus *et* le
 * retour de l'app au premier plan, donc un drapeau qui resterait posé rouvrirait la feuille à chaque
 * aller-retour.
 *
 * Une `ref` et non un `useState` : le déposer ne doit pas déclencher de rendu sur l'écran qu'on
 * quitte, et le plan le lit dans un effet, pas pendant son rendu.
 */
type EngagementPris = { poste: string | null };

type Passage = {
  /** Déposé par l'écran des pistes **avant** `router.back()`, jamais après ni sous condition. */
  deposer: (engagement: EngagementPris) => void;
  /** Lu-et-effacé par le plan, au focus. Rend `null` s'il n'y a rien à reprendre. */
  reprendre: () => EngagementPris | null;
};

const PassageDEngagement = createContext<Passage | null>(null);

/**
 * Le passage entre les deux écrans de la pile.
 *
 * **La cérémonie ne s'ouvre qu'une fois par appareil** (`aDejaVuLaFeuilleDeRappel`), donc la
 * manquer la seule fois où elle compte — le tout premier engagement — la perd pour de bon. C'est
 * mot pour mot le défaut corrigé le 14/09/2026, où une garde sur `boucle` l'empêchait sur un échec
 * de lecture secondaire. D'où les deux règles écrites dans les commentaires de `deposer` et de
 * `reprendre`, et le fait que le plan lise ce passage **sans attendre son rechargement**.
 */
export function usePassageDEngagement(): Passage {
  const passage = useContext(PassageDEngagement);
  if (passage === null) {
    throw new Error('usePassageDEngagement doit être appelé dans la pile du plan.');
  }
  return passage;
}

export default function PlanLayout() {
  const enAttente = useRef<EngagementPris | null>(null);

  const passage = useMemo<Passage>(
    () => ({
      deposer: (engagement) => {
        enAttente.current = engagement;
      },
      reprendre: () => {
        const engagement = enAttente.current;
        enAttente.current = null;
        return engagement;
      },
    }),
    []
  );

  return (
    <PassageDEngagement.Provider value={passage}>
      <Stack screenOptions={{ headerShown: false }} />
    </PassageDEngagement.Provider>
  );
}
