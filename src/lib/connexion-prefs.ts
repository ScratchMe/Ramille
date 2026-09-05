// Marque locale "l'utilisateur a déjà vu/décliné la proposition de connexion plein écran"
// — au premier passage sur la restitution après un bilan, cette proposition s'affiche en
// plein écran (cf. maquette "Connexion — proposition après bilan") ; aux passages
// suivants, elle laisse place à un bandeau discret ("Bilan anonyme — relance douce") plutôt
// que de réinterrompre l'utilisateur à chaque retour. Device-local (AsyncStorage), même
// rationale que src/lib/bilan-draft.ts.
import AsyncStorage from '@react-native-async-storage/async-storage';

// Préfixe historique conservé au renommage en Ramille, comme DRAFT_KEY dans bilan-draft.ts.
const SEEN_KEY = 'traceverte.connexion_proposal_seen.v1';

export async function hasSeenConnexionProposal(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SEEN_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markConnexionProposalSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_KEY, '1');
  } catch {
    // best-effort : au pire la proposition plein écran réapparaît une fois de plus.
  }
}
