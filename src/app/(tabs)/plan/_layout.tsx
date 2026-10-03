import { Stack } from 'expo-router';
import { createContext, useContext, useMemo, useRef } from 'react';

import { CadreDOnglet } from '@/components/cadre-d-onglet';
import type { EngagementPris } from '@/types/rappels';

// Pile de l'onglet Plan : l'écran lui-même, et la liste complète des pistes (`plan/pistes`).
// Même forme que `suivi/_layout.tsx`, et pour la même raison — une pile imbriquée dans un
// onglet garde la barre visible avec cet onglet actif, ce qui est la seule façon d'avoir la
// barre sur l'écran des pistes sans dupliquer un composant de barre. La bande haute et la zone sûre
// sont posées ici, autour de la pile, et non dans chaque écran (`CadreDOnglet`, `v1-33` T-13).

/**
 * Ce qu'un engagement pris sur l'écran des pistes laisse au plan (C5.2, décidé en `v1-17` §7.3) : un
 * `EngagementPris` (`src/types/rappels.ts`).
 *
 * **Un drapeau local, jamais `?engagee=1`.** Trois raisons, et la première est la plus forte : ce
 * n'est pas un booléen qui doit voyager mais le **poste** — et depuis le 02/10/2026 l'**échéance**
 * (`v1-33` D14) —, parce que la feuille des rappels promet un contact *sur l'action qu'on vient
 * d'engager* (`boucleDeLAction`, constat n°1 de la recette du 14/09/2026 — quelqu'un qui a un trajet
 * domicile-travail et s'engage sur un vol s'entendait promettre le lundi), et nomme son mois pour
 * « Le mois prochain » (`ligneDAttenteDeLaFeuille`). Un paramètre d'URL porterait donc une valeur publique de plus à valider, et
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

type Passage = {
  /** Déposé par l'écran des pistes **avant** d'en revenir (`revenirOu`), jamais après ni sous
   * condition. */
  deposer: (engagement: EngagementPris) => void;
  /** Lu-et-effacé par le plan, au focus. Rend `null` s'il n'y a rien à reprendre. */
  reprendre: () => EngagementPris | null;
  /**
   * Lu-et-effacé par le plan **à son focus, sans attendre ses préférences** : un engagement vient
   * d'être pris sur la liste, et la carte engagée sera amenée dans la fenêtre à la lecture qui suit
   * (audit P-1, 01/10/2026). **Séparé de `reprendre`, et c'est le point** : la feuille des rappels
   * attend que les préférences soient lues (`useReprendreLEngagement`), donc sur une pile neuve elle
   * ne reprend le passage qu'**après** la première lecture — la carte, elle, doit se montrer à cette
   * lecture-là, pas à une suivante qui viendrait au prochain retour sur le plan.
   */
  aMontrer: () => boolean;
};

const PassageDEngagement = createContext<Passage | null>(null);

/**
 * Le passage entre les deux écrans de la pile.
 *
 * **La cérémonie ne s'ouvre qu'une fois par appareil** (`aDejaVuLaFeuilleDeRappel`), donc la
 * manquer la seule fois où elle compte — le tout premier engagement — la perd pour de bon. C'est
 * mot pour mot le défaut corrigé le 14/09/2026, où une garde sur `boucle` l'empêchait sur un échec
 * de lecture secondaire. D'où les deux règles écrites dans les commentaires de `deposer` et de
 * `reprendre`, et le fait que le plan lise ce passage **sans attendre son rechargement** — mais
 * jamais avant d'avoir lu ses préférences une première fois (`useReprendreLEngagement`).
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
  const aMontrer = useRef(false);

  const passage = useMemo<Passage>(
    () => ({
      deposer: (engagement) => {
        enAttente.current = engagement;
        aMontrer.current = true;
      },
      reprendre: () => {
        const engagement = enAttente.current;
        enAttente.current = null;
        return engagement;
      },
      aMontrer: () => {
        const montrer = aMontrer.current;
        aMontrer.current = false;
        return montrer;
      },
    }),
    []
  );

  return (
    <PassageDEngagement.Provider value={passage}>
      <CadreDOnglet>
        <Stack screenOptions={{ headerShown: false }} />
      </CadreDOnglet>
    </PassageDEngagement.Provider>
  );
}
