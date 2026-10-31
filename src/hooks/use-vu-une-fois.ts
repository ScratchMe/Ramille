// « Cette section a paru à l'écran » — une fois, et pour de bon (`v1-36` §4 et §5, 31/10/2026).
//
// Deux usages sur la page d'accueil du web : compter jusqu'où on la lit (`compterSurLAccueil`), et lancer le
// mouvement d'une section au moment où elle arrive sous les yeux plutôt qu'au chargement, où il se jouerait
// hors de l'écran. **Une fois** : une section qui sort puis revient ne rejoue rien et ne recompte rien.
//
// **Sur le web, un `IntersectionObserver`** sur la vue elle-même : react-native-web rend la `ref` d'une
// `View` en son nœud DOM. **Sans lui** — natif, où la page n'existe pas, ou un environnement de test sans
// cette API —, la section est réputée vue tout de suite : rien n'attend un événement qui ne viendra pas, et
// ce qu'elle montre est posé.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { View } from 'react-native';

/** La part de la section qui doit être à l'écran : le tiers, assez pour que le mouvement se voie. */
const PART_VISIBLE = 0.33;

export function useVuUneFois(quandVu?: () => void): {
  /** À poser en `ref` de la vue qui compte : un rappel de ref, pas un objet. */
  attacher: (vue: View | null) => void;
  vu: boolean;
} {
  const [vu, setVu] = useState(() => typeof IntersectionObserver === 'undefined');
  const observateur = useRef<IntersectionObserver | null>(null);
  // Le dernier rappel reçu, sans recréer l'observateur à chaque rendu : la page en passe un neuf à chaque fois.
  const rappel = useRef(quandVu);
  useEffect(() => {
    rappel.current = quandVu;
  });
  const dejaSignale = useRef(false);

  const signaler = useCallback(() => {
    if (dejaSignale.current) return;
    dejaSignale.current = true;
    setVu(true);
    rappel.current?.();
  }, []);

  const attacher = useCallback(
    (vue: View | null) => {
      observateur.current?.disconnect();
      observateur.current = null;
      if (vue === null || dejaSignale.current) return;
      if (typeof IntersectionObserver === 'undefined') {
        signaler();
        return;
      }
      const noeud = vue as unknown as Element;
      const o = new IntersectionObserver(
        (entrees) => {
          if (!entrees.some((entree) => entree.isIntersecting)) return;
          o.disconnect();
          signaler();
        },
        { threshold: PART_VISIBLE }
      );
      o.observe(noeud);
      observateur.current = o;
    },
    [signaler]
  );

  return { attacher, vu };
}
