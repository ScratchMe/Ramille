// Suppression de compte et export des données (T12, RGPD art. 15/17/20).
// Réf. migration `supabase/migrations/20260905210000_suppression_et_export_compte.sql`.
//
// La suppression est un bloqueur Google Play : depuis 2023, toute app permettant de créer un
// compte doit offrir un chemin de suppression **dans l'app**. Ramille en crée un pour chaque
// visiteur dès l'ouverture (session anonyme), donc la règle s'applique même à quelqu'un qui ne
// s'est jamais inscrit.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Share } from 'react-native';

import { supabase } from '@/lib/supabase';
import { APP_NAME } from '@/constants/produit';
import { etatDuCompte, type EtatSuppression } from '@/types/compte-suppression';
import { etatDuRattachement, type EtatRattachement } from '@/types/compte';

export type CompteResult = { ok: true } | { ok: false; message: string };

/**
 * L'export porte son propre message, succès compris, parce que ce qui se passe n'est pas le
 * même geste d'un côté et de l'autre : sur web un fichier arrive dans les téléchargements,
 * sur natif une feuille de partage s'ouvre et c'est la personne qui décide de la suite.
 * Annoncer « Export généré. » dans les deux cas était faux dans le second — voir ci-dessous.
 */
export type ExportResult = { ok: true; message: string } | { ok: false; message: string };

export async function exportMyData(): Promise<ExportResult> {
  const { data, error } = await supabase.rpc('export_my_data');

  if (error || !data) {
    return { ok: false, message: 'L’export n’a pas pu être généré. Réessaie dans un instant.' };
  }

  const json = JSON.stringify(data, null, 2);
  const nom = `${APP_NAME.toLowerCase()}-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;

  if (Platform.OS === 'web') {
    // Téléchargement réel plutôt qu'une dépendance de plus : `react-native-web` tourne dans un
    // navigateur, un Blob et une ancre suffisent.
    try {
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = nom;
      lien.click();
      URL.revokeObjectURL(url);
      return { ok: true, message: 'Ton export est prêt : le fichier est dans tes téléchargements.' };
    } catch {
      return { ok: false, message: 'Le téléchargement a été bloqué par ton navigateur.' };
    }
  }

  // Sur natif, le JSON part en **texte** dans la feuille de partage, et c'est une dégradation
  // assumée pour l'instant : `expo-file-system` et `expo-sharing` avaient été écartés (« les
  // ajouter pour un écran ne se justifie pas », et v1-06 §4 les avait déjà écartés parce
  // qu'ils imposent un build EAS invérifiable). L'arrivée d'`expo-notifications` a rendu ce
  // build inévitable, donc le choix est rouvert (A5-18, A6-18) : écrire le JSON dans un
  // fichier du cache et le partager en `url` est la bonne forme, elle attend la dépendance.
  //
  // **Ce commentaire ne suffit pas à tenir la décision**, et c'est volontairement dit ici :
  // `docs/architecture/v1-06-partage-social.md` §4 continue d'énoncer le refus avec l'argument
  // du build invérifiable, qui est tombé. Tant que la puce datée du 10/09/2026 n'y est pas
  // versée (suivi de C1.10, voir aussi C1.11 qui touche déjà `package.json`), le prochain
  // lecteur de v1-06 §4 refermera ce choix sans savoir qu'il a été rouvert.
  //
  // En attendant, ce qui se corrige sans dépendance est l'annonce. **Sur Android — la seule
  // cible de la V1 — `Share.share` rend toujours `sharedAction`**, y compris quand la feuille
  // est refermée sans rien choisir (`dismissedAction` est un comportement iOS) : lire
  // `result.action` ne distinguerait donc rien ici. Le message ne dit donc que ce qui est vrai
  // dans tous les cas — la feuille s'est ouverte — et laisse la suite à la personne, au lieu
  // d'affirmer un export que personne n'a peut-être reçu.
  try {
    await Share.share({ message: json, title: nom });
    return {
      ok: true,
      message: 'La feuille de partage s’est ouverte : choisis où envoyer tes données.',
    };
  } catch {
    return { ok: false, message: 'Le partage a été interrompu.' };
  }
}

/**
 * Ce que la page web de suppression peut affirmer de la session courante.
 *
 * Le comptage des bilans n'est pas décoratif : sous RLS, `assessments` ne rend que les
 * lignes de la session, donc « zéro bilan » sur une session anonyme veut dire « ce n'est
 * pas un compte, c'est une session créée par l'ouverture de la page ». Sans ce test, la
 * page proposerait de supprimer un compte vide et confirmerait une suppression qui n'a rien
 * supprimé — l'échec le plus coûteux possible ici, parce qu'il est silencieux et que la
 * personne repart en croyant ses données effacées.
 */
/**
 * État du rattachement pour l'affichage — plus léger que `lireEtatDuCompte`, qui interroge
 * en plus `assessments` parce que la page de suppression a besoin de savoir si la session
 * porte quelque chose. Ici, non : on ne fait que dire ce qu'il en est.
 *
 * `getUser()` et non `getSession()` : la session en cache peut encore porter
 * `is_anonymous: true` juste après la confirmation de l'adresse, et c'est exactement
 * l'instant qu'on cherche à rendre visible.
 *
 * **Le prix de ce choix est un aller-retour réseau, et `error` est donc la moitié de la
 * réponse** (A6-8) : hors ligne, `getUser()` ne lève pas, il rend `{ user: null, error }`. Ne
 * lire que `data.user` ramenait cet échec à « pas de session », donc à l'état `local` — le plus
 * affirmatif de tous, celui qui propose de rattacher un compte à quelqu'un qui en a peut-être
 * déjà un. Les deux informations partent ensemble vers la dérivation, qui seule décide.
 *
 * Conséquence à connaître avant de la « corriger » : **l'absence totale de session tombe elle
 * aussi en `indisponible`**, parce que le SDK la signale comme une erreur
 * (`AuthSessionMissingError`) et non comme un utilisateur nul. C'est la bonne réponse ici —
 * chaque visiteur reçoit une session dès l'ouverture (`ensureSession`), donc ne pas en trouver
 * une veut dire que quelque chose a échoué, pas que la personne n'a pas de compte. Et l'ancien
 * repli offrait un bouton « Rattacher un compte » qui, sans session, ne pouvait rien rattacher.
 */
export async function lireEtatDuRattachement(): Promise<EtatRattachement> {
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;

  return etatDuRattachement({
    session: user ? { isAnonymous: user.is_anonymous === true, email: user.email ?? null } : null,
    lectureEnEchec: error !== null,
  });
}

export async function lireEtatDuCompte(): Promise<EtatSuppression> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return etatDuCompte(null);

  // Une seule ligne suffit à répondre « il y a quelque chose ».
  const { data } = await supabase.from('assessments').select('id').limit(1);

  return etatDuCompte({
    isAnonymous: user.is_anonymous === true,
    email: user.email ?? null,
    aDesDonnees: (data?.length ?? 0) > 0,
  });
}

/**
 * Tout ce que cet appareil garde du produit, effacé après une suppression de compte.
 *
 * **Le brouillon est la vraie raison de cette fonction** (A6-7). La suppression efface une ligne
 * d'`auth.users` et laisse la cascade faire le reste côté serveur, mais rien ne touchait
 * AsyncStorage : le brouillon de questionnaire — distances, zone d'habitation, motorisation, les
 * seules réponses de la personne dans le lot — survivait à un écran qui venait d'annoncer une
 * suppression définitive, et **repréremplissait** le questionnaire suivant (ordre brouillon >
 * dernier bilan > vide). Les autres clés sont des marques d'interface : les laisser
 * amputait durablement l'appareil de ses moments de renforcement (proposition de connexion plein
 * écran, feuille des rappels, annonce de rattachement), sans que rien ne le montre.
 *
 * **Le balayage se fait par préfixe, et c'est ce qui le garde juste dans le temps.** Une liste
 * écrite ici aurait oublié la clé suivante, du jour où quelqu'un en ajoute une ailleurs — le
 * même piège silencieux qu'une fonction de suppression qui énumérerait les tables. Le préfixe
 * `traceverte.` est commun à toutes (il est historique et se conserve : le renommer effacerait
 * les brouillons existants, cf. CLAUDE.md) et n'appartient qu'à nous : les clés de session du
 * SDK Supabase sont en `sb-…`, donc la déconnexion ci-dessous reste la seule à y toucher.
 *
 * Best-effort et **après** le succès du RPC : un AsyncStorage indisponible ne doit pas faire
 * échouer une suppression déjà effectuée côté serveur.
 */
const PREFIXE_CLES_LOCALES = 'traceverte.';

async function effacerLesMarquesLocales(): Promise<void> {
  try {
    const cles = await AsyncStorage.getAllKeys();
    const aEffacer = cles.filter((cle) => cle.startsWith(PREFIXE_CLES_LOCALES));
    if (aEffacer.length > 0) await AsyncStorage.multiRemove(aEffacer);
  } catch {
    // Au pire, un brouillon survit sur cet appareil — jamais un échec annoncé à tort.
  }
}

/**
 * Se déconnecter de cet appareil — C2.11, point 4 (arbitrage D17).
 *
 * **L'app n'avait aucune sortie.** Le seul `signOut` du produit était celui de la suppression de
 * compte : quelqu'un qui prête son téléphone, ou qui arrive sur un appareil partagé, n'avait le
 * choix qu'entre laisser sa session ouverte et supprimer son compte. Deux gestes très différents
 * présentés comme un seul.
 *
 * L'ordre est l'inverse de la suppression, et c'est voulu : **`signOut` d'abord, effacement
 * ensuite**. Effacer avant aurait laissé, si le `signOut` échouait, une session ouverte sans ses
 * marques locales — donc une personne toujours connectée à qui l'app reposerait la feuille des
 * rappels et le brouillon d'une autre. Ici le pire cas est l'inverse, et il est bénin : la session
 * est bien fermée, des marques traînent, et la prochaine session anonyme les relit comme les
 * siennes — ce qu'elle fait déjà aujourd'hui pour tout appareil jamais rattaché.
 *
 * Les données, elles, restent sur le compte : c'est exactement ce que l'écran dit, et c'est vrai —
 * tout ce qui compte vit en base, rattaché au `user_id`, et `/connexion/retrouver` y ramène.
 */
export async function seDeconnecterDeCetAppareil(): Promise<CompteResult> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { ok: false, message: 'La déconnexion n’a pas abouti. Réessaie dans un instant.' };
  }

  await effacerLesMarquesLocales();
  return { ok: true };
}

export async function deleteMyAccount(): Promise<CompteResult> {
  const { error } = await supabase.rpc('delete_my_account');

  if (error) {
    return { ok: false, message: 'La suppression n’a pas abouti. Réessaie dans un instant.' };
  }

  await effacerLesMarquesLocales();

  // La session pointe désormais sur un utilisateur qui n'existe plus : la fermer explicitement
  // évite que le client rejoue un jeton mort à la première requête suivante. L'échec du
  // signOut n'est pas bloquant — le compte, lui, est bien supprimé.
  await supabase.auth.signOut().catch(() => undefined);
  return { ok: true };
}
