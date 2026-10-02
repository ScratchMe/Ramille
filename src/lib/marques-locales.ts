// Les marques locales de cet appareil : leur balayage, et le compte qui en est propriétaire.
//
// Ce module n'importe pas le client Supabase, et c'est ce qui lui permet d'être appelé par lui
// (`src/lib/supabase.ts`, à chaque session vue) comme par les départs voulus (`src/lib/compte.ts`).
// La décision de balayer est pure et vit dans `src/types/marques-locales.ts`.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { conciliationDesMarques, type SiProprietaireInconnu } from '@/types/marques-locales';

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
 * SDK Supabase sont en `sb-…`, donc la déconnexion reste la seule à y toucher.
 *
 * Best-effort et **après** le succès du RPC : un AsyncStorage indisponible ne doit pas faire
 * échouer une suppression déjà effectuée côté serveur.
 *
 * **Ses appelants** : les deux sorties de cet appareil (suppression de compte et déconnexion,
 * `src/lib/compte.ts`), « Commencer un bilan sur cet appareil » depuis l'écran de reconnexion, et
 * depuis le 02/10/2026 l'arrivée d'une session d'un **autre** compte que le propriétaire des marques
 * (`concilierLesMarques`, ci-dessous) — dont la reconnexion par code, qui balayait sans condition
 * jusque-là. Ce qui part avec, et qu'il faut savoir : le brouillon de questionnaire. C'est le bon
 * choix quand on change de compte — le brouillon appartenait à l'autre session — et c'est déjà ce que
 * fait la déconnexion.
 *
 * Déplacée ici depuis `src/lib/compte.ts` le 02/10/2026 : le client Supabase l'appelle désormais, et
 * `compte.ts` importe le client.
 */
const PREFIXE_CLES_LOCALES = 'traceverte.';

export async function effacerLesMarquesLocales(): Promise<void> {
  try {
    const cles = await AsyncStorage.getAllKeys();
    const aEffacer = cles.filter((cle) => cle.startsWith(PREFIXE_CLES_LOCALES));
    if (aEffacer.length > 0) await AsyncStorage.multiRemove(aEffacer);
  } catch {
    // Au pire, un brouillon survit sur cet appareil — jamais un échec annoncé à tort.
  }
}

/**
 * L'identifiant du compte dont les marques sont les marques — [#319](https://github.com/ScratchMe/Ramille/issues/319).
 *
 * **Sous le préfixe commun, et c'est voulu** : un départ voulu balaie aussi le propriétaire, donc la
 * session suivante arrive sans propriétaire noté et le devient sans rien effacer — ce qui est juste,
 * le départ ayant déjà tout effacé.
 */
const PROPRIETAIRE_KEY = 'traceverte.proprietaire_des_marques.v1';

async function lireLeProprietaire(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PROPRIETAIRE_KEY);
  } catch {
    // Illisible se traite comme inconnu : l'arrivée ordinaire note, la reconnexion balaie.
    return null;
  }
}

async function noterLeProprietaire(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PROPRIETAIRE_KEY, userId);
  } catch {
    // Best-effort : au pire, la prochaine session vue le notera.
  }
}

/**
 * Les conciliations passent **une par une**. Une session qui change se voit deux fois presque en même
 * temps — par l'écoute d'`auth-js` et par `ensureSession()` ou une reconnexion — et deux balayages
 * entrelacés pourraient effacer ce que l'autre vient d'écrire, la marque du compte rattaché comprise.
 * En file, la seconde lit le propriétaire que la première a noté, et ne fait plus rien.
 */
let file: Promise<void> = Promise.resolve();

/**
 * Une session est là : si elle n'est pas celle du propriétaire des marques, elle les balaie, puis
 * devient leur propriétaire (`conciliationDesMarques`). Rend quand c'est fait : un appelant qui va lire
 * une marque juste après l'attend.
 */
export function concilierLesMarques(userId: string, siInconnu: SiProprietaireInconnu): Promise<void> {
  const tour = file.then(async () => {
    const decision = conciliationDesMarques(await lireLeProprietaire(), userId, siInconnu);
    if (decision === 'rien') return;
    if (decision === 'balayer') await effacerLesMarquesLocales();
    await noterLeProprietaire(userId);
  });
  // Un tour qui lève ne doit pas bloquer les suivants : chacune de ses étapes est déjà best-effort.
  file = tour.catch(() => undefined);
  return file;
}
