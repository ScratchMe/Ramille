// Ce que la page d'accueil du web compte, sans session et sans identifiant (`v1-36` §5, 31/10/2026) :
// un nombre par jour et par événement, dans `visites_de_l_accueil`, par `compter_sur_l_accueil`.
//
// **Les règles de `track()`** (`src/lib/analytics.ts`) : ne lève jamais, ne bloque jamais, et personne
// n'attend le résultat — la fonction rend `void`. Une mesure qui casse la page qu'elle observe est pire
// que pas de mesure.
//
// **Une fois par affichage** : une section qui sort de l'écran puis y revient ne compte qu'une fois, et un
// bouton touché deux fois aussi. L'ensemble vit dans le module, donc il dure le temps de l'onglet ; la page
// d'accueil ne se rend qu'une fois par chargement, et un retour sur elle (« Retour » depuis une page
// publique, une déconnexion) recompte, ce qui est juste : c'est un nouvel affichage.
import { supabase } from '@/lib/supabase';
import type { EvenementDeLAccueil } from '@/types/analytics';

const dejaComptes = new Set<EvenementDeLAccueil>();

/** Oublie ce qui a été compté : un nouvel affichage de la page recommence. */
export function nouvelAffichageDeLAccueil(): void {
  dejaComptes.clear();
}

export function compterSurLAccueil(evenement: EvenementDeLAccueil): void {
  if (dejaComptes.has(evenement)) return;
  dejaComptes.add(evenement);
  void (async () => {
    try {
      const { error } = await supabase.rpc('compter_sur_l_accueil', {
        p_evenement: evenement,
      });
      if (error && __DEV__) console.warn('[accueil] compteur refusé', evenement, error.message);
    } catch (erreur) {
      if (__DEV__) console.warn('[accueil] compteur injoignable', evenement, erreur);
    }
  })();
}
