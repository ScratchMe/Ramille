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
// Le rattachement passe par la boîte de réception : la personne y lit son code, le tape, et arrive
// sur `/plan` (jusqu'au 20/09/2026 c'était un lien cliqué dans la messagerie, donc un retour dans
// l'app depuis l'extérieur). Sans cette marque, il n'y avait aucune surface pour lui dire que ça
// avait marché (issue #62) — et avec une marque, l'annonce se fait **une
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

// La dernière adresse saisie depuis cet appareil.
//
// **Ce commentaire disait « l'adresse du dernier lien demandé », et « elle existe pour un seul cas :
// un lien qui ne marche plus »** — le mécanisme d'avant le 20/09/2026, où l'unique usage était de ne
// pas faire retaper son adresse à quelqu'un qui revenait d'un lien expiré. Les liens sont partis ;
// le cas principal est devenu la **reprise de la saisie du code** (`/connexion/email?reprise=1`,
// ouverte depuis « Toi » quand l'onglet est parti avant que le code soit tapé) et son équivalent sur
// `/connexion/retrouver`, où l'adresse arrive d'ici plutôt que d'un paramètre d'URL. Le lien périmé
// reste servi, comme filet pour un e-mail parti avant le changement. Relevé au second passage de
// contre-lecture, le 21/09/2026.
//
// Le nom de la clé garde le mot « lien » et ne se « corrige » pas : la renommer effacerait le
// préremplissage sur chaque appareil qui l'a écrite, pour un mot que personne ne lit — même
// raisonnement que le préfixe `traceverte.` lui-même.
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

// Le flux dans lequel le dernier code a été demandé depuis cet appareil — `rattachement` ou
// `connexion`.
//
// **Il existe parce que l'écran de rattachement peut désormais envoyer l'un OU l'autre** (arbitrage
// du 21/09/2026, `v1-28` §7.1) : une adresse libre reçoit un code de rattachement, une adresse déjà
// prise un code de connexion, et l'écran ne dit pas laquelle. Or les deux codes ne se vérifient pas
// avec le même `type` — un code émis pour l'un et présenté à l'autre rend `403 otp_expired`
// (mesuré le 20/09/2026). Sans cette marque, la reprise depuis « Toi » (`?reprise=1`) rouvrirait
// donc la saisie avec le mauvais type, et refuserait un code parfaitement valide.
//
// Deux choses qu'elle n'est pas. Ce n'est pas une divulgation : elle ne dit rien que la personne
// n'ait tapé elle-même, et elle ne vit que sur son appareil. Et ce n'est pas une source de vérité :
// une valeur illisible ou inconnue retombe sur `rattachement`, qui est le flux de cet écran depuis
// toujours — au pire un code est refusé et « Renvoyer un code » repart du bon pied.
const FLUX_KEY = 'traceverte.dernier_flux_de_code.v1';

export type FluxMemorise = 'rattachement' | 'connexion';

export async function memoriserFluxDuCode(flux: FluxMemorise): Promise<void> {
  try {
    await AsyncStorage.setItem(FLUX_KEY, flux);
  } catch {
    // best-effort : au pire la reprise repart sur le rattachement, et le renvoi rattrape.
  }
}

export async function lireFluxDuCode(): Promise<FluxMemorise> {
  try {
    return (await AsyncStorage.getItem(FLUX_KEY)) === 'connexion' ? 'connexion' : 'rattachement';
  } catch {
    return 'rattachement';
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
