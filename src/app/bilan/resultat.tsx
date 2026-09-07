import { Redirect, useLocalSearchParams } from 'expo-router';

// Ancienne adresse du résultat, conservée en redirection (v1-11 lot 2).
//
// L'écran vit désormais dans la pile de l'onglet Suivi (`/suivi/bilan`), pour que la barre
// reste visible quand on ouvre un bilan. Mais `/bilan/resultat` est cité dans
// `page-titles.ts`, dans l'en-tête d'`api/partage.ts`, dans les liens déjà partagés par des
// utilisateurs et dans leurs favoris. Un lien mort silencieux est le pire résultat possible
// d'un déplacement de fichier — surtout pour la boucle de partage, dont c'est la destination.
//
// Pas de `nouveau=1` : une arrivée par cette adresse est toujours une relecture.
export default function ResultatRedirection() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: '/suivi/bilan', params: { id } }} />;
}
