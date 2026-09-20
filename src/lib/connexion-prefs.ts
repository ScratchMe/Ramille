// Marques locales des écrans de compte — device-local (AsyncStorage), même rationale que
// `src/lib/bilan-draft.ts`, et toutes sous le préfixe historique `traceverte.` qui permet à
// `src/lib/compte.ts` de les balayer d'un geste.
//
// **Une quatrième marque vivait ici jusqu'au 20/09/2026 : « proposition de connexion vue ».** Elle
// existait pour que l'interstitiel de compte ne se rejoue pas à chaque restitution. L'interstitiel
// est retiré (arbitrage du même jour), donc plus rien ne compte les passages : une ligne qu'on ne
// touche pas ne s'use pas. La clé `traceverte.connexion_proposal_seen.v1` peut rester sur les
// appareils qui l'ont écrite — plus personne ne la lit, et le balayage par préfixe l'emporte au
// premier changement de compte.
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Marque locale « on a déjà dit que le re-bilan avait emporté l'engagement » (C2.2).
//
// Quand un nouveau bilan change le poste dominant, le gabarit engagé peut disparaître du plan.
// Le serveur l'archive (`plan_action_commitments_archive`, raison `rebilan`) et l'écran du plan
// le dit — **une fois**. C'est une nouvelle, pas un état : la laisser en tête du plan
// indéfiniment ferait d'un fait ponctuel un reproche permanent, et l'engagement relâché se
// retrouve de toute façon dans le suivi.
//
// La marque porte l'identifiant de la ligne d'archive, et pas un simple « vu » : un second
// re-bilan qui relâche un second engagement doit pouvoir le dire à son tour.
const ENGAGEMENT_ORPHELIN_KEY = 'traceverte.engagement_orphelin_vu.v1';

export async function aVuEngagementOrphelin(archiveId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENGAGEMENT_ORPHELIN_KEY)) === archiveId;
  } catch {
    return false;
  }
}

export async function marquerEngagementOrphelinVu(archiveId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ENGAGEMENT_ORPHELIN_KEY, archiveId);
  } catch {
    // best-effort : au pire l'encart réapparaît une fois de plus.
  }
}
