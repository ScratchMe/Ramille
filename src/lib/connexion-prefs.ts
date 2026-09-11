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

// Marque locale « on a déjà annoncé que le compte est rattaché ».
//
// Le rattachement se termine hors de l'app : la personne clique le lien de confirmation dans
// sa messagerie et revient sur `/plan`. Sans cette marque, il n'y avait aucune surface pour
// lui dire que ça avait marché (issue #62) — et avec une marque, l'annonce se fait **une
// seule fois** : c'est une nouvelle, pas un état permanent à afficher en tête du plan. Qui
// veut le revoir le trouve sur « Toi ».
const RATTACHEMENT_KEY = 'traceverte.rattachement_annonce.v1';

export async function aVuRattachementAnnonce(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(RATTACHEMENT_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function marquerRattachementAnnonce(): Promise<void> {
  try {
    await AsyncStorage.setItem(RATTACHEMENT_KEY, '1');
  } catch {
    // best-effort : au pire l'annonce réapparaît une fois.
  }
}

// L'adresse du dernier lien demandé depuis cet appareil.
//
// Elle existe pour un seul cas : un lien qui ne marche plus. La personne a fait le bon geste,
// revient dans l'app, et l'écran lui dit d'en redemander un — lui faire retaper son adresse à
// ce moment-là, c'est la faire payer une expiration qui n'est pas de son fait.
//
// **Une préférence locale, jamais une déduction serveur** : prérenseigner depuis une réponse de
// l'API dirait qui utilise Ramille, ce que la règle de non-divulgation interdit (cf.
// `src/types/connexion.ts`). Ici on ne relit que ce que la personne a tapé sur cet appareil.
// Effacée avec le reste par la suppression de compte, d'où le préfixe commun.
const ADRESSE_KEY = 'traceverte.derniere_adresse_lien.v1';

export async function memoriserAdresseDuLien(email: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ADRESSE_KEY, email.trim());
  } catch {
    // best-effort : au pire l'adresse est à retaper.
  }
}

export async function lireAdresseDuLien(): Promise<string | null> {
  try {
    return (await AsyncStorage.getItem(ADRESSE_KEY)) || null;
  } catch {
    return null;
  }
}
