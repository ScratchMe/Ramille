/**
 * Fusionne les appels **concurrents** d'une fabrique asynchrone en un seul — module pur, sans
 * import de `@/lib/supabase` (règle du CLAUDE.md), donc testable.
 *
 * ## Le défaut qu'elle corrige
 *
 * `ensureSession()` fait un « lis puis écris » : elle demande la session en cache, et n'ouvre une
 * session anonyme que s'il n'y en a pas. Deux appels lancés dans le même rendu — le layout racine
 * et la racine de l'app — lisent donc tous les deux `null` avant que l'un des deux n'ait écrit, et
 * **deux comptes anonymes** sont créés ; le second écrase le premier dans le stockage. Six des
 * treize comptes de la base avaient été créés moins de trois secondes après le précédent
 * (vérifié le 10/09/2026, v1-13 C1.2). Rien ne le signalait : l'app marche parfaitement, elle
 * laisse juste un compte orphelin derrière elle — qui consomme le quota de créations anonymes de
 * Supabase, gonfle d'un facteur proche de deux toute statistique de « nouveaux visiteurs », et
 * peut recevoir le jeton d'appareil à la place du compte gagnant.
 *
 * ## Ce qu'elle garantit, et ce qu'elle ne change pas
 *
 * Seules les promesses **en vol** sont partagées : dès qu'une promesse est terminée, la suivante
 * rappelle la fabrique. Le contrat des appelants est donc inchangé — `ensureSession()` reste une
 * vérification, pas un cache : un appel tardif relit bien l'état courant (c'est ce dont dépend la
 * re-vérification avant l'écriture du bilan). Et un échec relâche la mémoïsation, sans quoi une
 * coupure réseau au démarrage condamnerait toute l'app jusqu'au prochain lancement.
 *
 * La fabrique est supposée asynchrone : une exception levée de façon synchrone remonte telle
 * quelle, sans rien mémoïser.
 */
export function uneSeuleFois<T>(fabrique: () => Promise<T>): () => Promise<T> {
  let enCours: Promise<T> | null = null;
  // Une génération plutôt qu'une comparaison de promesses : elle dit sans ambiguïté « c'est bien
  // mon appel qui se termine », et un appel relancé entre-temps ne se voit pas relâché par le
  // précédent.
  let generation = 0;

  return () => {
    if (enCours) return enCours;

    const mienne = ++generation;
    const relacher = () => {
      if (generation === mienne) enCours = null;
    };

    enCours = fabrique().then(
      (valeur) => {
        relacher();
        return valeur;
      },
      (erreur) => {
        relacher();
        throw erreur;
      }
    );
    return enCours;
  };
}
