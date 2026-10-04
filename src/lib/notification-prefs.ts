// Le canal de rappel — `profiles.reminder_channel` et les jetons d'appareil.
// Réf. docs/architecture/v1-12-rappels.md §3 et §6.4.
//
// Ce fichier ne décide rien : il lit l'état et écrit la préférence. **La règle vit dans
// `src/types/rappels.ts`** (module pur, testé), avec son pendant SQL `reminder_channel_for()`.
//
// Le rappel reste en opt-out — il n'est pas une promotion, c'est le mécanisme même de la
// brique 4 — mais il n'est plus réservé aux comptes rattachés : un jeton d'appareil suffit
// pour la notification, donc le réglage s'ouvre aussi aux sessions anonymes.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';
import { estPanneDeTransport, type ErreurAuth } from '@/types/connexion';
import { genreDeLEchec, type GenreDEchec } from '@/types/lecture-en-echec';
import {
  reponseALaVeilleDe,
  type CanalPrefere,
  type EtatDesRappels,
  type FenetreDeLaVeille,
  type ReponseALaVeille,
} from '@/types/rappels';

export type ReminderPrefs = EtatDesRappels & {
  /** L'adresse à afficher sur la ligne « Par email », quand elle est utilisable. */
  email: string | null;
  /**
   * La réponse au mot de la veille (C4.2), `null` quand on ne sait pas — lecture en échec ou valeur
   * inconnue. L'écran se tait alors : ne pas savoir n'est ni « jamais proposé » ni « oui ».
   */
  reponseALaVeille: ReponseALaVeille | null;
};

/**
 * Les réglages de rappel de la personne, ou **`null` quand on ne les a pas lus** — pas de session,
 * le profil ou le jeton de cet appareil illisibles.
 *
 * **Plus aucune valeur par défaut sur un échec** (01/10/2026, audit T-6, `FRONT.md` §1.2). Le
 * profil se lisait sans regarder son erreur, et le canal retombait sur « Par email » : « Toi »
 * l'affichait coché comme s'il était lu, à quelqu'un qui avait choisi la notification ou « Sans
 * rappel » — et en le « corrigeant », la personne écrivait un choix qu'elle croyait rétablir.
 * L'absence de session rendait de même un canal « aucun » que personne n'a choisi, et un jeton
 * illisible un « pas actif sur ce téléphone » que rien n'a constaté.
 *
 * **`null` et non une levée ni `{ ok }`, à cause des deux appelants** : « Toi » et le plan rangent
 * déjà ce qu'ils lisent ici dans un état `ReminderPrefs | null` où `null` veut dire « on ne sait
 * pas » — rien ne s'affiche, et la feuille des rappels ne s'ouvre pas. Une levée ferait tomber le
 * plan sur son écran d'erreur plein écran pour une lecture secondaire ; et c'est déjà la forme de
 * `lireLaFenetreDuMotDeLaVeille`, juste en dessous.
 *
 * La colonne `reminder_channel` est `not null` (défaut `email` en base) : une ligne lue porte
 * toujours le choix de la personne, et l'écran n'a plus de repli à inventer.
 */
export async function loadReminderPrefs(): Promise<ReminderPrefs | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Un compte rattaché **et** confirmé : les deux, jamais l'un sans l'autre — on n'écrit
  // jamais à une adresse seulement déclarée (v1-07 §3.1).
  const emailPossible = !user.is_anonymous && !!user.email && !!user.email_confirmed_at;

  const [profil, jetonActif] = await Promise.all([
    supabase.from('profiles').select('reminder_channel, mot_de_la_veille').eq('id', user.id).maybeSingle(),
    leJetonDeCetAppareilEstActif(),
  ]);

  // Le profil existe dès l'inscription (`handle_new_user`) : une lecture qui ne le rend pas est un
  // échec au même titre qu'une erreur — une session dont le compte n'existe plus, par exemple.
  if (profil.error || !profil.data || jetonActif === null) return null;

  return {
    prefere: profil.data.reminder_channel as CanalPrefere,
    jetonActif,
    emailPossible,
    email: emailPossible ? (user.email ?? null) : null,
    reponseALaVeille: reponseALaVeilleDe(profil.data.mot_de_la_veille),
  };
}

/**
 * La réponse à l'opt-in du mot de la veille (C4.2). Jamais `jamais_propose` : une réponse ne se
 * retire pas, la base le refuse (`garder_la_reponse_au_mot_de_la_veille`) — c'est ce qui garantit
 * qu'un refus n'est pas reproposé. Rend `null` si l'écriture a abouti, le genre de l'échec sinon
 * (comme `setReminderChannel`, ci-dessous).
 */
export async function setMotDeLaVeille(
  reponse: Exclude<ReponseALaVeille, 'jamais_propose'>
): Promise<GenreDEchec | null> {
  const {
    data: { user },
    error: erreurDeSession,
  } = await supabase.auth.getUser();
  if (!user) return genreDeLaSessionManquante(erreurDeSession);

  const { error, status } = await supabase.from('profiles').update({ mot_de_la_veille: reponse }).eq('id', user.id);

  return error ? genreDeLEchec(status) : null;
}

/**
 * La fenêtre des dix semaines, telle que l'envoi la calcule (RPC `fenetre_du_mot_de_la_veille`).
 * `null` sur un échec : l'écran ne propose alors rien, et le réglage ne dit que la règle.
 */
export async function lireLaFenetreDuMotDeLaVeille(): Promise<FenetreDeLaVeille | null> {
  const { data, error } = await supabase.rpc('fenetre_du_mot_de_la_veille');
  if (error || !data || data.length === 0) return null;
  const [ligne] = data;
  return { actionDeTrajet: ligne.action_de_trajet === true, dernierSoir: ligne.dernier_soir ?? null };
}

/**
 * L'enregistrement du jeton en cours, que la lecture du jeton attend (`v1-33` T-12, 03/10/2026).
 *
 * `enregistrerLeJeton` (`src/lib/rappels.ts`) réinscrit le jeton quand la permission est accordée,
 * ou le désinscrit et efface sa marque sinon ; le démarrage le lance (`_layout.tsx`), la feuille des
 * rappels et « Toi » aussi. Rien ne garantissait qu'une lecture partie au même moment le lise après :
 * elle pouvait trouver la marque d'avant, et la carte d'attente promettait alors « Par notification
 * sur ce téléphone » à qui venait de les couper — ou les taisait à qui venait de les rouvrir. Le
 * risque est devenu réel quand la lecture du plan s'est mise à partir pendant l'écran de lancement,
 * au moment même où le démarrage enregistre le jeton. Un échec de l'enregistrement ne bloque rien :
 * la lecture lit alors ce qui est là.
 */
let enregistrementDuJeton: Promise<unknown> = Promise.resolve();

/** Posé par `enregistrerLeJeton` : la prochaine lecture du jeton attend qu'il ait fini. */
export function suivreLEnregistrementDuJeton(enregistrement: Promise<unknown>): void {
  enregistrementDuJeton = enregistrement.then(
    () => undefined,
    () => undefined
  );
}

/**
 * **Le jeton de cet appareil, pas un jeton de cette personne.** `push_tokens` en porte
 * plusieurs par compte (unicité sur le jeton, jamais sur l'utilisateur) et la RLS ne borne
 * qu'à la personne : une requête qui se contentait de `disabled_at is null` rendait vrai dès
 * qu'un *autre* téléphone était inscrit, et l'écran affirmait alors « sur ce téléphone » à qui
 * n'avait rien autorisé ici (A9-19).
 *
 * Sans jeton mémorisé, la réponse est « non » : l'appareil n'a rien enregistré, ou l'a fait
 * avant que cette marque n'existe — et le prochain lancement la posera. **Une lecture en échec, elle,
 * rend `null`** (01/10/2026) : « pas actif sur ce téléphone » serait un constat que rien n'a fait.
 */
async function leJetonDeCetAppareilEstActif(): Promise<boolean | null> {
  await enregistrementDuJeton;
  const jeton = await lireLeJetonDeCetAppareil();
  if (!jeton) return false;

  const { data, error } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('token', jeton)
    .is('disabled_at', null)
    .maybeSingle();

  if (error) return null;
  return !!data;
}

/**
 * **`null` quand le choix est enregistré, le genre de l'échec sinon** (02/10/2026, `v1-33` §9) : les
 * deux écrans qui l'appellent disaient « Vérifie ta connexion » à toute erreur, et un booléen ne leur
 * laissait pas le choix. La phrase vient de `messageDEcriture` ; l'appelant remet le réglage en place
 * sur un échec.
 */
export async function setReminderChannel(canal: CanalPrefere): Promise<GenreDEchec | null> {
  const {
    data: { user },
    error: erreurDeSession,
  } = await supabase.auth.getUser();
  if (!user) return genreDeLaSessionManquante(erreurDeSession);

  const { error, status } = await supabase
    .from('profiles')
    .update({ reminder_channel: canal })
    .eq('id', user.id);

  return error ? genreDeLEchec(status) : null;
}

/**
 * `getUser()` interroge le serveur : hors ligne, il rend une erreur de transport d'`auth-js`, que
 * `estPanneDeTransport` reconnaît (`src/types/connexion.ts`). Toute autre absence d'utilisateur — une
 * session qui manque — ne tient pas au réseau.
 */
function genreDeLaSessionManquante(erreur: ErreurAuth): GenreDEchec {
  return estPanneDeTransport(erreur) ? 'horsLigne' : 'serveur';
}

// La feuille de proposition ne s'ouvre qu'une fois par appareil (v1-12 §6.1). Marque locale,
// même mécanique et même préfixe historique que les autres clés AsyncStorage — les renommer
// effacerait des états existants (CLAUDE.md).
const FEUILLE_KEY = 'traceverte.rappels_proposes.v1';

export async function aDejaVuLaFeuilleDeRappel(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(FEUILLE_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function marquerFeuilleDeRappelVue(): Promise<void> {
  try {
    await AsyncStorage.setItem(FEUILLE_KEY, '1');
  } catch {
    // best-effort : au pire la feuille réapparaît au prochain engagement.
  }
}

// La question du mot de la veille ne se pose qu'une fois par appareil, qu'elle vienne dans la
// feuille entière ou seule, au premier engagement de trajet où elle peut être posée (C4.2,
// arbitrage du 27/09/2026 — `ouvertureDeLaFeuille`). Même préfixe historique, donc balayée avec
// les autres.
//
// **Une lecture en échec se lit « déjà posée »**, à l'inverse de la marque de la feuille juste
// au-dessus, et c'est voulu : la feuille est ce qui ouvre les rappels, la perdre coûterait le canal ;
// la question de la veille reste dans « Toi », et « une fois, jamais plus » est la décision.
const VEILLE_KEY = 'traceverte.veille_proposee.v1';

export async function aDejaProposeLaVeille(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(VEILLE_KEY)) === '1';
  } catch {
    return true;
  }
}

export async function marquerLaVeilleProposee(): Promise<void> {
  try {
    await AsyncStorage.setItem(VEILLE_KEY, '1');
  } catch {
    // best-effort : au pire la question revient une fois de plus, au prochain engagement de trajet.
  }
}

// Le jeton que **cet** appareil a enregistré, retenu ici parce que rien en base ne permet de
// le reconnaître : `push_tokens` est owner-scoped, donc une lecture rend les jetons de tous
// les appareils de la personne sans dire lequel est celui-ci. C'est la seule chose qui rende
// vraies deux phrases du produit — « sur ce téléphone » dans le réglage, et « ne désactive que
// le sien » dans `enregistrerLeJeton()`.
//
// Même préfixe historique `traceverte.` que les autres clés locales (CLAUDE.md dit pourquoi il
// ne se renomme pas), donc elle part avec la suppression de compte, qui balaie par préfixe.
// Le préfixe est compté nulle part exprès : une phrase qui dénombre les clés devient fausse à
// la prochaine, en silence — c'est déjà arrivé deux fois.
const JETON_KEY = 'traceverte.jeton_appareil.v1';

export async function lireLeJetonDeCetAppareil(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(JETON_KEY);
  } catch {
    return null;
  }
}

/** `null` efface la marque : l'appareil n'a plus de jeton à lui. */
export async function memoriserLeJetonDeCetAppareil(jeton: string | null): Promise<void> {
  try {
    if (jeton === null) await AsyncStorage.removeItem(JETON_KEY);
    else await AsyncStorage.setItem(JETON_KEY, jeton);
  } catch {
    // best-effort : au pire l'appareil se croira sans jeton jusqu'au prochain enregistrement.
  }
}

/**
 * Désactive le jeton de cet appareil côté serveur, tant que la session qui le possède est encore là, et
 * efface sa marque si le serveur l'a fait. Sans jeton connu (web, ou aucune inscription), rien.
 *
 * Deux appelants. `enregistrerLeJeton()` (`src/lib/rappels.ts`), quand la permission n'est plus
 * accordée — on ne désactive que le jeton qu'on a soi-même enregistré (A4-6). Et **« Me déconnecter »**
 * (04/10/2026, revue finale avant la production) : la déconnexion efface la marque locale du jeton
 * avec les autres ; sans ce geste avant elle, la ligne restait active au nom du compte quitté. Avec
 * la permission accordée, la session anonyme suivante reprend le jeton et rien ne se voit ; mais si
 * elle est coupée, plus rien sur l'appareil ne sait quel jeton désactiver, et le compte ne retombe
 * jamais sur le rappel par e-mail — le serveur continue d'envoyer dans le vide.
 *
 * **La raison enregistrée ne distingue pas les deux** : `unregister_push_token` écrit
 * `disabled_reason = 'permission retirée'`, y compris pour une déconnexion. C'est assumé — ce que la
 * raison sert à dire, c'est que cet appareil ne reçoit plus pour ce compte, et c'est vrai dans les deux
 * cas ; la distinguer demanderait un argument de plus au RPC pour un journal que rien ne trie.
 *
 * Au mieux de ce qui est possible : hors ligne, l'appel échoue et la déconnexion se fait quand même —
 * c'est la situation d'avant, pas une régression.
 */
export async function desinscrireLeJetonDeCetAppareil(): Promise<void> {
  const connu = await lireLeJetonDeCetAppareil();
  if (!connu) return;
  const { error } = await supabase.rpc('unregister_push_token', { p_token: connu });
  if (!error) await memoriserLeJetonDeCetAppareil(null);
}
