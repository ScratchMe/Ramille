// Le parcours réel, joué de bout en bout contre une vraie stack Supabase — à chaque PR.
//
// **Le trou que ce script bouche, mesuré le 20/09/2026** : 15 147 lignes d'écrans et de composants
// (`src/app`, `src/components`, `src/hooks`) et 1 485 lignes d'entrée-sortie — **les fichiers de
// `src/lib` qui importent le client Supabase**, pas `src/lib` entier, qui en compte 3 307 — n'étaient
// gardées par rien d'autre que la recette sur appareil. Le second chiffre a d'abord été écrit
// « 1 216 » sous la définition « `src/lib` », ce qui était faux des deux côtés : c'est la définition
// qui compte, pas le nombre, et une mesure dont on ne peut pas redire la définition ne se vérifie
// plus (relevé en contre-lisant la journée). La CI prouvait
// que l'export web *démarre* et affiche quelques états sans réseau ; elle ne prouvait pas qu'une
// seule requête ramène les bonnes lignes, qu'un seul RPC part avec les bons arguments, ni que le
// plan montre les bonnes pistes. Un `.eq('status', 'complete')` serait passé vert.
//
// Ce script prend le chemin nominal, et lui seul : onboarding → questionnaire → soumission →
// restitution → plan → engagement → un point généré et répondu → suivi → suppression du compte.
// Il joue le **profil de `docs/recette/premier-parcours-web.md`**, dont les chiffres ont été mesurés
// (4 231 kg, huit pistes dans un ordre précis, un cap de 384 kg) — sur la base construite depuis
// `supabase/migrations/`, ces chiffres ne dépendent d'aucune synchronisation de facteurs. Après
// chaque écriture, il relit la base **comme la personne** (PostgREST, sous sa session, donc sous la
// RLS), et une fois comme le serveur (le générateur de points, que seul le cron appelle).
//
// **Puis un second profil, et ce n'est pas un doublon** (20/09/2026) : un **cycliste dont le plan ne
// porte aucune action**. Depuis C2.5 ce n'est pas un cas de bord — tout cycliste et tout profil
// sédentaire y tombe —, et c'est surtout le seul chemin où la carte « Ton premier plan » ne se rend
// **jamais**, puisqu'elle demande une action. Donc le seul où la barre d'onglets doit arriver
// autrement : au premier affichage du plan, avec la carte « Plan et Suivi ». Trois branches d'écran
// basculent entre les deux profils, et aucune n'était jouée : la félicitation à la place des cartes,
// le cap qui **ne chiffre pas** (`cadreDuPlan`, C5.3), et l'absence de l'encart de contexte comme du
// lien vers les pistes. Il tourne dans un **contexte de navigateur neuf**, parce que « premier » veut
// dire premier **sur cet appareil** (C5.7) et que les marques vivent dans le stockage.
//
// **Ce qu'il ne fait pas, et ce n'est pas un oubli** : il ne couvre ni les états d'erreur — c'est le
// travail de `verifier-etats-export.mjs` — ni les exclusions de cartes en général, qui restent aux
// dérivations de `src/types` et au chantier D (`v1-27` §4). Ce que le second profil en éprouve est
// la seule combinaison que le produit rend aujourd'hui sans qu'on la choisisse. Un parcours qui
// voudrait tout voir serait fragile, et un garde-fou fragile finit ignoré.
//
// ── Comment il tourne ────────────────────────────────────────────────────────────────────────────
//
// Il lui faut une stack locale complète (`supabase start`, pas seulement `db start` : la session
// anonyme vient de GoTrue, les lectures de PostgREST), un export web construit **avec l'URL et la
// clé de cette stack**, et les trois variables ci-dessous — `supabase status -o env` les donne.
// En CI : le travail « Parcours réel » de ci.yml. En local : TESTING.md §2.6.
//
//   EXPO_PUBLIC_SUPABASE_URL       l'API de la stack (http://127.0.0.1:54321)
//   EXPO_PUBLIC_SUPABASE_ANON_KEY  sa clé anon — celle que l'app embarque
//   SUPABASE_SERVICE_ROLE_KEY      sa clé service_role — pour appeler le générateur de points, que
//                                  ni anon ni authenticated ne peuvent appeler (et c'est voulu)
//
// Sur un échec, la page est capturée dans le dossier temporaire (le chemin est imprimé) et le texte
// visible l'est aussi, avec les requêtes refusées : c'est ce qu'on regarde en premier, avant le code.
//
// **Éprouvé en le cassant, le 20/09/2026** (TESTING.md §1.1), sept mutations sur l'arbre de travail,
// chacune suivie d'un export (le code est dans le bundle) et remise en place par l'opération inverse.
//
// Sur le premier profil, les trois familles que rien d'autre ne voyait — un filtre, un nom, un
// argument de RPC :
//   - le filtre du plan écrit de mémoire (`STATUT_DE_BILAN.complete` → `'complete'`) → s'arrête à
//     l'étape « plan », le bilan introuvable pour l'écran ;
//   - un RPC au mauvais nom (`commit_plan_action` → `commit_plan_actions`)     → s'arrête à
//     « engagement », sur un `PGRST202` que le journal imprime en clair ;
//   - la réponse au point vers un RPC au mauvais nom (`repondre_au_checkin`)    → s'arrête à
//     « point », les deux boutons restant à l'écran.
//
// Sur le second, les trois branches qu'il existe pour garder :
//   - la carte « Ton premier plan » rendue malgré un plan à zéro action (la garde
//     `cycle.plan_actions.length > 0` retirée) → « la carte “Ton premier plan” se rend sur un plan
//     à zéro action ». **Et c'est cette mutation qui a fixé l'ordre des assertions** : elle empêche
//     aussi la barre d'arriver, donc tant que l'attente de la barre venait en premier, l'échec se
//     lisait « Timeout 20000ms exceeded » sans nommer la cause ;
//   - le cap qui chiffre quand même (la garde `nombreDActions === 0` de `cadreDuPlan` neutralisée)
//     → « le cap du plan à zéro action annonce un chiffre » ;
//   - la félicitation reformulée → « “Tu fais déjà l'essentiel sur ce poste.” n'est jamais apparu à
//     l'écran ». Cette phrase-là est le second apport de la mutation : `attendreTexte` rendait un
//     délai dépassé anonyme, elle nomme désormais le texte attendu, pour tous ses appels.
//
// Et une septième, le soir même, parce que l'assertion des kilos avait été ajoutée **sans** la
// sienne — relevé en contre-lisant la contre-lecture, et c'est précisément ce que §1.1 interdit :
//   - le seuil de `valeurEtUnite` (`src/lib/format.ts`) : `kilos < 1000` → `kilos < 10` → « « 11 kg
//     CO₂e » n'est jamais apparu à l'écran », et **rien d'autre** : à 4 231 kg le premier profil
//     reste en tonnes, donc il traverse le parcours entier avant que le cycliste ne tombe. C'est ce
//     qui rend la mutation concluante — une qui aurait fait rougir les deux profils n'aurait pas
//     dit laquelle des deux branches du formateur est gardée ici.
//
// **Et deux mutations de plus le 21/09/2026**, sur l'assertion « aucun écran de compte ne
// s'interpose » — celle que la veille avait ajoutée aux deux profils, et qui était une tautologie
// sur le premier avant d'être réparée :
//   - l'interstitiel remis (`goToPlan` → `router.push('/connexion?source=resultat_transition')`, et
//     rien derrière, comme le vrai défaut qui gardait l'écran) → l'assertion du **cycliste** tombe
//     en nommant l'URL traversée. Elle demande de neutraliser les deux assertions du premier profil,
//     qui parlent d'abord — sans quoi le parcours s'arrête avant le second ;
//   - et la **réciproque**, qui est la vraie leçon : le guetteur de navigations remis **après** le
//     toucher (l'ordre que ce fichier portait avant le correctif) fait **passer** l'assertion
//     négative en silence sous la même mutation, seule celle du destinataire parlant — et elle parle
//     d'un délai, pas de la promesse cassée. C'est la démonstration qu'une assertion négative n'est
//     gardée que si son guetteur est armé **avant** le geste.
//
// Deux mutations ont échoué à produire la condition, et c'est utile à savoir avant de les rejouer :
// un interstitiel **fugitif** obtenu par `setTimeout(… , 400)` avorte les requêtes du plan et fait
// échouer le parcours pour une raison étrangère ; et un `push` suivi d'un `replace` **dans le même
// tick** ne produit aucune navigation — expo-router les fusionne, donc `framenavigated` ne voit rien.
//
// Usage : node scripts/verifier-parcours-reel.mjs [dist]

import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import { chromium } from 'playwright';

import { servirExport } from './servir-export.mjs';

const DIST = process.argv[2] ?? 'dist';
const API = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ATTENTE = 20_000;
// Dans le dossier temporaire et pas dans le dépôt : une capture à la racine aurait demandé une ligne
// de `.gitignore`, et toucher ce fichier fait construire Vercel (scripts/vercel-ignorer-le-build.sh).
const CAPTURE = path.join(os.tmpdir(), 'ramille-parcours-reel-echec.png');

if (!API || !ANON || !SERVICE) {
  console.error(
    'Il manque EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY : ' +
      'ce script a besoin de la stack locale (`supabase status -o env` les donne).'
  );
  process.exit(2);
}

// ── Le profil de la recette, et ce qu'il rend ────────────────────────────────────────────────────
// Recopié de docs/recette/premier-parcours-web.md, « Le profil à saisir, et les chiffres qu'il
// rend ». Toute réponse changée change ces chiffres et une ligne de plus ou de moins dans le plan.
const ATTENDU = {
  totalKg: 4231,
  dominantKg: 1920,
  capKg: 384,
  pistes: [
    ['Passer deux trajets sur cinq en train', 619],
    ['Renoncer à un vol long-courrier cette année', 1601],
    ['Faire ce trajet à deux au moins un jour sur deux', 480],
    ['Travailler depuis chez toi un jour par semaine', 384],
    ['Renoncer à un vol court ou moyen-courrier cette année', 277],
    ['Remplacer un aller-retour en avion par le train', 273],
    // **Deux lignes de plus depuis C4.4**, et elles ne sont pas du décor : ce profil fait ses
    // sorties à 22,5 km, c'est-à-dire au-dessus de ce qu'un vélo mécanique tient (15 km) et dans
    // la fenêtre du VAE ; et il déclare deux longs trajets en voiture à deux, où l'autocar gagne
    // encore 47 %. Aucune des deux n'existait, donc aucune n'était proposée.
    ['Faire une sortie sur trois à vélo à assistance électrique', 101],
    ['Regrouper deux sorties en une seule, une fois sur cinq', 67],
    // L'apostrophe droite est celle du référentiel (`action_text` est sa clé naturelle), pas celle
    // de la recette, qui l'écrit typographique.
    ["Faire un de tes longs trajets en train plutôt qu'en voiture", 48],
    ["Faire un de tes longs trajets en autocar plutôt qu'en voiture", 23],
  ],
};

/**
 * Le second profil — le cycliste — et ce qu'il rend.
 *
 * Mesuré le 20/09/2026 sur la stack locale, comme le premier : trois jours de vélo sur 5 km, des
 * sorties rares, aucun voyage, pas de véhicule au foyer. Ce qui compte ici n'est pas le total mais
 * le **zéro** qui le suit : c'est lui qui fait basculer trois branches d'écran à la fois.
 */
const ATTENDU_SOBRE = { totalKg: 11 };

// ── Outils ───────────────────────────────────────────────────────────────────────────────────────
class Ecart extends Error {}
function assurer(condition, message) {
  if (!condition) throw new Ecart(message);
}

const { base, fermer } = await servirExport(DIST);
const navigateur = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const exceptions = [];
// Ce que l'app dit et ce que le réseau refuse : sur un échec, c'est ce qu'on lit en premier — une
// requête en 401 ou en 42501 explique plus qu'une capture d'écran.
const journal = [];

/**
 * Un onglet neuf dans un contexte neuf.
 *
 * Le second profil en demande un : les marques du premier parcours (`traceverte.*`) vivent dans le
 * stockage, et « premier » veut dire **premier sur cet appareil** (C5.7). Rejouer dans le même
 * contexte éprouverait un appareil qui a déjà tout vu, c'est-à-dire pas ce qu'on vient voir.
 */
async function nouvelOnglet() {
  const contexte = await navigateur.newContext({ viewport: { width: 420, height: 900 }, locale: 'fr-FR' });
  const onglet = await contexte.newPage();
  onglet.on('pageerror', (erreur) => exceptions.push(String(erreur)));
  onglet.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') journal.push(`[console.${message.type()}] ${message.text()}`);
  });
  onglet.on('requestfailed', (requete) => journal.push(`[réseau] ${requete.method()} ${requete.url()} — ${requete.failure()?.errorText}`));
  onglet.on('response', async (reponse) => {
    if (reponse.status() < 400) return;
    const corps = await reponse.text().catch(() => '');
    journal.push(`[réseau] ${reponse.request().method()} ${reponse.url()} → HTTP ${reponse.status()} ${corps.slice(0, 200)}`);
  });
  return onglet;
}

let page = await nouvelOnglet();

let etapeCourante = 'démarrage';
function etape(nom) {
  etapeCourante = nom;
  console.log(`— ${nom}`);
}

/** Le premier contrôle accessible portant ce nom, quel que soit son rôle : les puces du
 *  questionnaire sont tantôt des `radio`, tantôt des `checkbox`, tantôt encore des `button`. */
async function controle(nom, { exact = true, dernier = false } = {}) {
  for (const role of ['radio', 'checkbox', 'button', 'link']) {
    const candidats = page.getByRole(role, { name: nom, exact });
    if ((await candidats.count()) > 0) return dernier ? candidats.last() : candidats.first();
  }
  throw new Ecart(`aucun contrôle nommé « ${nom} » sur l'écran`);
}
async function choisir(nom, options) {
  await (await controle(nom, options)).click();
}
async function bouton(nom) {
  const b = page.getByRole('button', { name: nom, exact: true }).first();
  await b.waitFor({ state: 'visible', timeout: ATTENTE });
  await b.click();
}
/**
 * Le pager de l'onboarding : ses pages hors champ sont `inert` et `aria-hidden`, mais l'état qui
 * les cache suit l'animation de défilement, pas le clic. Deux « Continuer » cliqués trop vite
 * touchent deux fois la même page (mesuré le 20/09/2026 : la première passe a réussi, la seconde
 * a tourné en rond). On attend donc que le défilement soit posé sur la page attendue, puis on
 * cliqué le bouton qui est **dans la fenêtre**, pas le premier que l'arbre d'accessibilité rend.
 */
async function boutonDuPager(nom, indexDePage) {
  await page.waitForFunction(
    (i) => {
      const pager = [...document.querySelectorAll('div')].find(
        (d) => d.clientWidth > 300 && d.scrollWidth > d.clientWidth * 1.5
      );
      return pager !== undefined && Math.abs(pager.scrollLeft - i * pager.clientWidth) < 2;
    },
    indexDePage,
    { timeout: ATTENTE }
  );
  const largeur = page.viewportSize()?.width ?? 420;
  const limite = Date.now() + ATTENTE;
  while (Date.now() < limite) {
    for (const candidat of await page.getByRole('button', { name: nom, exact: true }).all()) {
      const boite = await candidat.boundingBox();
      if (boite && boite.x >= 0 && boite.x + boite.width <= largeur + 1) {
        await candidat.click();
        return;
      }
    }
    await page.waitForTimeout(100);
  }
  throw new Ecart(`« ${nom} » n'est jamais entré dans la fenêtre du pager (page ${indexDePage})`);
}
/** La barre d'onglets est-elle **visible** ? Masquée, elle reste dans le DOM (`display: 'none'`),
 *  donc compter ses libellés ne dit rien : c'est la visibilité de « Suivi » qui répond. */
async function barreVisible() {
  for (const libelle of await page.getByText('Suivi', { exact: true }).all()) {
    if (await libelle.isVisible()) return true;
  }
  return false;
}
/**
 * Attendre un texte — et, s'il ne vient pas, **dire lequel**.
 *
 * Sans cette enveloppe, une phrase disparue rend un `locator.waitFor: Timeout 20000ms exceeded`
 * qui ne nomme rien : il faut alors retrouver dans le script la ligne où l'on en était. Mesuré en
 * cassant une phrase de l'écran (mutation 3 du second profil, 20/09/2026).
 */
async function attendreTexte(motif) {
  try {
    await page.getByText(motif).first().waitFor({ state: 'visible', timeout: ATTENTE });
  } catch {
    throw new Ecart(`« ${motif} » n'est jamais apparu à l'écran`);
  }
}

/** La session que l'app a ouverte, lue là où le SDK la range (`sb-<ref>-auth-token`). */
async function session() {
  const brut = await page.evaluate(() => {
    for (const cle of Object.keys(localStorage)) {
      if (cle.startsWith('sb-') && cle.endsWith('-auth-token')) return localStorage.getItem(cle);
    }
    return null;
  });
  assurer(brut, 'aucune session Supabase dans le stockage du navigateur');
  const s = JSON.parse(brut);
  return { jeton: s.access_token, userId: s.user.id };
}
/** Une lecture PostgREST **comme la personne** — sous sa session, donc sous la RLS. */
async function lire(chemin, jeton) {
  const reponse = await fetch(`${API}/rest/v1/${chemin}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${jeton}` },
  });
  if (!reponse.ok) throw new Ecart(`lecture ${chemin} : HTTP ${reponse.status} ${await reponse.text()}`);
  return reponse.json();
}
async function rpc(nom, jeton, corps = {}) {
  const reponse = await fetch(`${API}/rest/v1/rpc/${nom}`, {
    method: 'POST',
    headers: { apikey: jeton === SERVICE ? SERVICE : ANON, Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
  if (!reponse.ok) throw new Ecart(`rpc ${nom} : HTTP ${reponse.status} ${await reponse.text()}`);
}

try {
  // ── 1. L'onboarding, jusqu'au questionnaire ──────────────────────────────────────────────────
  etape('onboarding');
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForURL(/\/onboarding/, { timeout: ATTENTE });
  await boutonDuPager('Découvrir mon impact', 0);
  await boutonDuPager('Continuer', 1);
  await boutonDuPager('Continuer', 2);
  await boutonDuPager('Commencer mon bilan', 3);
  await page.waitForURL(/\/bilan/, { timeout: ATTENTE });

  // ── 2. Le questionnaire, réponse par réponse ────────────────────────────────────────────────
  etape('questionnaire — trajet régulier');
  await choisir('Oui');
  await bouton('Suivant');

  etape('questionnaire — jours et distance');
  await choisir('5');
  const distance = page.getByRole('textbox', { name: 'Distance pour un aller, en km' });
  await distance.waitFor({ state: 'visible', timeout: ATTENTE });
  await distance.fill('30');
  await bouton('Suivant');

  etape('questionnaire — mode');
  await choisir('Voiture (seul)');
  await choisir('Thermique');
  await bouton('Suivant');

  etape('questionnaire — second mode');
  await choisir('Non');
  await bouton('Suivant');

  etape('questionnaire — sorties');
  await choisir('Une fois par semaine');
  await bouton('Suivant');
  await choisir('Voiture (seul)');
  await choisir('Thermique');
  await choisir('15 à 30 km');
  await bouton('Suivant');

  etape('questionnaire — vols');
  await choisir('2'); // le total : 2 vols dans l'année
  await choisir('1', { dernier: true }); // dont 1 court — la seconde série, rendue après le total
  await attendreTexte('1 vol long-courrier sera compté.');
  await bouton('Suivant');

  etape('questionnaire — longs trajets');
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en train' }).getByRole('radio', { name: '0', exact: true }).click();
  // C4.4 : la troisième série, cliquée à zéro. Elle vaut déjà zéro par défaut, donc ce clic
  // n'existe que pour qu'un compteur qui disparaîtrait de l'écran fasse échouer le parcours.
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en autocar' }).getByRole('radio', { name: '0', exact: true }).click();
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en voiture' }).getByRole('radio', { name: '2', exact: true }).click();
  await choisir('Thermique');
  await choisir('2 personnes');
  await bouton('Suivant');

  etape('questionnaire — contexte');
  await choisir('Périurbain');
  await choisir('Limité');
  await choisir('1');
  await choisir(/^Un jour/, { exact: false });
  await bouton('Voir mon bilan');

  // ── 3. La restitution, et la base derrière ───────────────────────────────────────────────────
  etape('restitution');
  await page.waitForURL(/\/suivi\/bilan/, { timeout: 45_000 });
  await attendreTexte('4,2 t CO₂e');
  assurer(!(await barreVisible()), 'la barre d’onglets est visible sur la restitution du premier bilan (C5.7)');
  const { jeton, userId } = await session();
  const bilans = await lire('assessments?select=id,status', jeton);
  assurer(bilans.length === 1 && bilans[0].status === 'completed', `bilans lus : ${JSON.stringify(bilans)}`);
  const [resultat] = await lire('assessment_results?select=total_co2_kg_year,dominant_poste_co2_kg_year', jeton);
  assurer(resultat, 'aucun assessment_results lisible');
  assurer(
    Math.round(resultat.total_co2_kg_year) === ATTENDU.totalKg,
    `total ${resultat.total_co2_kg_year} kg, attendu ${ATTENDU.totalKg}`
  );
  assurer(
    Math.round(resultat.dominant_poste_co2_kg_year) === ATTENDU.dominantKg,
    `poste dominant ${resultat.dominant_poste_co2_kg_year} kg, attendu ${ATTENDU.dominantKg}`
  );

  // ── 4. La restitution mène au plan, et à rien d'autre ───────────────────────────────────────
  //
  // **C'est la garde de l'arbitrage du 20/09/2026.** Le bouton passait par un écran de compte
  // (`/connexion?source=resultat_transition`), qu'il fallait refuser par « Continuer sans compte »
  // pour atteindre le plan : le bouton ne faisait pas ce qu'il disait, au moment exact où la
  // personne vient de comprendre son chiffre. Ce qui reste est la bannière en tête du contenu, et
  // elle se rend **dès le premier passage** — c'est ce que la ligne vérifiée juste avant garde.
  //
  // L'assertion la plus importante des trois est la négative : on affirme qu'aucun écran de compte
  // ne s'interpose. Sans elle, remettre l'interposition laisserait la suite verte (le plan est
  // atteint, une redirection plus loin).
  etape('la restitution mène au plan');
  await attendreTexte('Ce bilan n’est accessible que depuis cet appareil.');
  // **L'assertion négative se lit sur les navigations, pas sur l'URL d'arrivée**, et c'est un
  // correctif : elle testait `page.url()` **après** `waitForURL(/\/plan/)`, donc elle ne pouvait
  // pas tomber — un écran de compte qui s'interpose fait expirer l'attente, et le message parle
  // alors d'un délai et non de la promesse cassée. Une tautologie dont le commentaire affirmait
  // qu'elle était « la plus importante des trois » (relevé en revue le 21/09/2026). En écoutant les
  // navigations, on peut affirmer qu'aucun écran de compte n'a été traversé, même fugitivement.
  const visitees = [];
  const noter = (frame) => {
    if (frame === page.mainFrame()) visitees.push(frame.url());
  };
  page.on('framenavigated', noter);
  await bouton('Voir ce que je peux faire');
  await page.waitForURL(/\/plan/, { timeout: ATTENTE }).catch(() => {});
  page.off('framenavigated', noter);
  assurer(
    !visitees.some((u) => /\/connexion/.test(u)),
    `un écran de compte s'est interposé entre la restitution et le plan : ${visitees.join(' → ') || '(aucune navigation vue)'}`
  );
  assurer(/\/plan/.test(page.url()), `« Voir ce que je peux faire » n'a pas mené au plan : ${page.url()}`);

  // ── 5. Le plan : les dix pistes, le cap, la carte du premier plan ───────────────────────────
  etape('plan');
  await page.waitForURL(/\/plan/, { timeout: ATTENTE });
  await attendreTexte(ATTENDU.pistes[0][0]);
  await attendreTexte(ATTENDU.pistes[1][0]);
  // Deux cartes pleines, puis la porte vers l’écran « Toutes les pistes » (C5.2), qui compte tout.
  await attendreTexte(`Voir toutes les pistes · ${ATTENDU.pistes.length}`);
  await attendreTexte(new RegExp(`−\\s?${ATTENDU.capKg}\\s?kg`)); // « − 384 kg », le signe moins typographique
  const pistes = await lire(
    'plan_actions?select=rank,saving_kg_year,committed_at,action_templates(action_text)&order=rank',
    jeton
  );
  assurer(pistes.length === ATTENDU.pistes.length, `${pistes.length} pistes figées, attendu ${ATTENDU.pistes.length}`);
  ATTENDU.pistes.forEach(([texte, gain], i) => {
    assurer(
      pistes[i].action_templates.action_text === texte && Math.round(pistes[i].saving_kg_year) === gain,
      `piste ${i + 1} : « ${pistes[i].action_templates.action_text} » (${Math.round(pistes[i].saving_kg_year)} kg), ` +
        `attendu « ${texte} » (${gain} kg)`
    );
  });
  assurer(pistes.every((p) => p.committed_at === null), 'une piste est déjà engagée avant tout geste');

  etape('plan — « Compris » fait venir la barre');
  assurer(!(await barreVisible()), 'la barre d’onglets est là avant « Compris » (C5.7)');
  await page.getByText('Compris', { exact: true }).click();
  await page.waitForFunction(
    () => [...document.querySelectorAll('*')].some((e) => e.textContent === 'Suivi' && e.getClientRects().length > 0),
    undefined,
    { timeout: ATTENTE }
  );

  // ── 6. L'engagement sur la première piste ───────────────────────────────────────────────────
  etape('engagement');
  await bouton('Je m’y engage');
  await choisir('mardi');
  await choisir('jeudi');
  await bouton('C’est noté');
  await page.waitForFunction(
    () => document.body.innerText.includes('Changer d’avis'),
    undefined,
    { timeout: ATTENTE }
  );
  const [engagee] = await lire('plan_actions?select=rank,committed_at,intention_days&rank=eq.1', jeton);
  assurer(engagee && engagee.committed_at !== null, 'la piste 1 n’est pas engagée en base');
  assurer(JSON.stringify(engagee.intention_days) === '[2,4]', `jours engagés ${JSON.stringify(engagee.intention_days)}, attendu [2,4]`);

  // ── 7. Un point généré comme le cron le ferait, puis répondu ────────────────────────────────
  etape('point — génération (service_role) puis réponse');
  await rpc('generate_commute_checkins', SERVICE);
  const [point] = await lire('engagement_checkins?select=id,status,question_kind,committed_question', jeton);
  assurer(point && point.status === 'pending', `point lu : ${JSON.stringify(point)}`);
  assurer(point.question_kind === 'engagement', `genre du point ${point.question_kind}, attendu engagement`);
  assurer(
    /^Mardi ou jeudi, /.test(point.committed_question ?? ''),
    `question figée « ${point.committed_question} », attendue sur « Mardi ou jeudi, … »`
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await attendreTexte(point.committed_question);
  await bouton('Oui');
  // Répondu, la carte range ses deux boutons ; le pied daté vient avec le rafraîchissement suivant,
  // et ce qui compte se lit en base.
  await page.getByRole('button', { name: 'Oui', exact: true }).waitFor({ state: 'hidden', timeout: ATTENTE });
  const [repondu] = await lire('engagement_checkins?select=status,response_kind,response', jeton);
  assurer(
    repondu.status === 'answered' && repondu.response_kind === 'oui' && repondu.response === true,
    `réponse enregistrée : ${JSON.stringify(repondu)}`
  );

  // ── 8. Le suivi ────────────────────────────────────────────────────────────────────────────
  etape('suivi');
  for (const libelle of await page.getByText('Suivi', { exact: true }).all()) {
    if (await libelle.isVisible()) {
      await libelle.click();
      break;
    }
  }
  await page.waitForURL(/\/suivi$/, { timeout: ATTENTE });
  await page.getByLabel(/^Bilan du .*4,2 t CO₂e$/).first().waitFor({ state: 'visible', timeout: ATTENTE });

  // ── 9. La suppression du compte, et rien derrière ──────────────────────────────────────────
  etape('suppression du compte');
  await rpc('delete_my_account', jeton);
  for (const table of ['profiles?select=id&id=eq.', 'assessments?select=id&user_id=eq.', 'engagement_checkins?select=id&user_id=eq.']) {
    const restes = await lire(`${table}${userId}`, SERVICE);
    assurer(restes.length === 0, `${table.split('?')[0]} garde ${restes.length} ligne(s) après la suppression`);
  }

  // ── 10. Le second profil : le cycliste, dont le plan ne porte aucune action ─────────────────
  //
  // **Ce n'est pas un cas de bord** : depuis C2.5, tout cycliste et tout profil sédentaire y tombe.
  // Et c'est le seul chemin où la carte « Ton premier plan » ne se rend **jamais** — elle demande un
  // plan à au moins une action —, donc le seul où la barre d'onglets doit arriver autrement : au
  // premier affichage du plan, avec la carte « Plan et Suivi ». Le premier profil ne l'exerce pas,
  // et rien d'autre ne le faisait.
  etape('cycliste — onboarding et questionnaire');
  await page.context().close();
  page = await nouvelOnglet();
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForURL(/\/onboarding/, { timeout: ATTENTE });
  await boutonDuPager('Découvrir mon impact', 0);
  await boutonDuPager('Continuer', 1);
  await boutonDuPager('Continuer', 2);
  await boutonDuPager('Commencer mon bilan', 3);
  await page.waitForURL(/\/bilan/, { timeout: ATTENTE });

  await choisir('Oui');
  await bouton('Suivant');
  await choisir('3');
  const distanceVelo = page.getByRole('textbox', { name: 'Distance pour un aller, en km' });
  await distanceVelo.waitFor({ state: 'visible', timeout: ATTENTE });
  await distanceVelo.fill('5');
  await bouton('Suivant');
  // **Le vélo ouvre sa propre révélation depuis C4.4** — ce commentaire disait l'inverse jusqu'au
  // 21/09/2026, et c'est le genre de phrase qui survit à ce qu'elle décrit. « Mécanique » garde
  // le facteur d'avant le chantier (0,000170), donc les chiffres de ce profil ne bougent pas :
  // c'est la réponse qui isole la nouveauté de l'écran de celle du calcul.
  await choisir('Vélo');
  await choisir('Mécanique');
  await bouton('Suivant');
  await choisir('Non');
  await bouton('Suivant');
  // « Rarement » fait disparaître les questions de détail des sorties : l'étape suivante est celle
  // des vols, et non le mode ni la tranche de distance.
  await choisir(/^Rarement/, { exact: false });
  await bouton('Suivant');
  await choisir('0'); // aucun vol — et à zéro, la question « combien sont courts ? » ne se pose pas
  await bouton('Suivant');
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en train' }).getByRole('radio', { name: '0', exact: true }).click();
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en autocar' }).getByRole('radio', { name: '0', exact: true }).click();
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en voiture' }).getByRole('radio', { name: '0', exact: true }).click();
  await bouton('Suivant');
  await choisir('Urbain dense');
  await choisir('Bon');
  await choisir('0');
  await choisir(/^Aucun/, { exact: false });
  await bouton('Voir mon bilan');

  etape('cycliste — restitution, puis le plan sans action');
  await page.waitForURL(/\/suivi\/bilan/, { timeout: 45_000 });
  // **Le second profil traverse l'autre branche du formateur**, et c'est une raison de plus de
  // l'écrire : le premier rend des tonnes (« 4,2 t »), celui-ci des kilos. Le seuil vit dans
  // `valeurEtUnite` (`src/lib/format.ts`) et aucun parcours ne le franchissait — seule l'assertion
  // en base aurait tenu si l'écran s'était mis à dire « 0,0 t ».
  await attendreTexte(`${ATTENDU_SOBRE.totalKg} kg CO₂e`);
  assurer(!(await barreVisible()), 'la barre d’onglets est visible sur la restitution du cycliste (C5.7)');
  const sobre = await session();
  const [resultatSobre] = await lire('assessment_results?select=total_co2_kg_year,dominant_poste_co2_kg_year', sobre.jeton);
  assurer(resultatSobre, 'aucun assessment_results lisible pour le cycliste');
  assurer(
    Math.round(resultatSobre.total_co2_kg_year) === ATTENDU_SOBRE.totalKg,
    `total du cycliste ${resultatSobre.total_co2_kg_year} kg, attendu ${ATTENDU_SOBRE.totalKg}`
  );

  // **La réponse à une révélation imbriquée atteint-elle la colonne ?** Écrit le 21/09/2026 après
  // un défaut que rien n'a vu : la soumission énumérait les colonnes à la main, et les cinq
  // réponses neuves de C4.4 n'y figuraient pas — posées, normalisées, affichées, jamais écrites.
  // Ni le typecheck (une colonne neuve est `optional` dans `Insert`) ni le total de ce profil ne
  // pouvaient le dire : « mécanique » et « pas de réponse » résolvent tous deux vers `velo`, donc
  // les chiffres étaient identiques. **C'est le seul endroit du parcours où une réponse neuve
  // porte une valeur que le défaut de la colonne ne donne pas**, donc la seule assertion qui
  // pouvait attraper cette famille-là. Une réponse ajoutée au questionnaire mérite la sienne ici.
  const [reponsesSobres] = await lire(
    'assessment_answers?select=commute_velo_type,coach_long_trips_per_year',
    sobre.jeton
  );
  assurer(
    reponsesSobres?.commute_velo_type === 'mecanique',
    `le type de vélo répondu n'est pas arrivé en base : ${JSON.stringify(reponsesSobres)}`
  );

  // Comme sur le premier profil : plus aucun écran de compte entre la restitution et le plan
  // (arbitrage du 20/09/2026). Le second profil le rejoue parce que c'est le seul chemin où la
  // carte « Ton premier plan » ne se rend jamais — donc le seul où la barre d'onglets arrive
  // autrement, et le seul qui pourrait masquer une interposition revenue.
  //
  // **L'écoute s'arme AVANT le toucher, et ici elle ne l'était pas** : la version écrite en
  // corrigeant la tautologie du premier profil posait le guetteur après `bouton(…)`, donc après le
  // geste qui déclenche la navigation — un interstitiel traversé pendant le clic n'entrait dans
  // aucune liste, et l'assertion redevenait incapable de tomber par l'autre bout. Le premier profil
  // l'avait bien ; le second non, et c'est exactement la famille « une exclusion vérifiée sur une
  // paire de moins » que la contre-lecture cherche (relevé au second passage, 21/09/2026).
  const visiteesCycliste = [];
  const noterCycliste = (frame) => {
    if (frame === page.mainFrame()) visiteesCycliste.push(frame.url());
  };
  page.on('framenavigated', noterCycliste);
  await bouton('Voir ce que je peux faire');
  await page.waitForURL(/\/plan/, { timeout: ATTENTE }).catch(() => {});
  page.off('framenavigated', noterCycliste);
  assurer(
    !visiteesCycliste.some((u) => /\/connexion/.test(u)),
    `un écran de compte s'est interposé entre la restitution et le plan : ${visiteesCycliste.join(' → ') || '(aucune navigation vue)'}`
  );
  assurer(/\/plan/.test(page.url()), `« Voir ce que je peux faire » n'a pas mené au plan : ${page.url()}`);

  // Le plan est vide d'actions **en base** : c'est ce qui rend vrai tout le reste de ce bloc.
  const pistesSobres = await lire('plan_actions?select=rank', sobre.jeton);
  assurer(pistesSobres.length === 0, `${pistesSobres.length} piste(s) figée(s) pour le cycliste, attendu 0`);
  const cyclesSobres = await lire('plan_cycles?select=id', sobre.jeton);
  assurer(cyclesSobres.length === 1, `${cyclesSobres.length} cycle(s) de plan, attendu 1`);

  // La félicitation, et non un écran vide : le plan à zéro action dit pourquoi il est vide.
  await attendreTexte('Tu fais déjà l’essentiel sur ce poste.');
  // Le cap se rend quand même — c'est lui qui nomme la période depuis C2.8 — mais sans chiffrer.
  await attendreTexte(/Automne 2026/);

  // **Ce qui ne doit PAS être là se lit avant d'attendre la barre**, et l'ordre n'est pas du
  // confort : rendre la carte du premier plan sur ce plan-là empêche aussi la barre d'arriver
  // (fermer la carte est ce qui la fait venir), donc l'attente de la barre tomberait la première
  // et rendrait un délai dépassé là où l'assertion nomme la cause. Mesuré en le cassant.
  const texteDuPlan = await page.evaluate(() => document.body.innerText);
  assurer(
    !texteDuPlan.includes('TON PREMIER PLAN') && !texteDuPlan.includes('Une action pour'),
    'la carte « Ton premier plan » se rend sur un plan à zéro action (C5.6)'
  );
  assurer(
    !/Voir toutes les pistes/.test(texteDuPlan),
    'le plan à zéro action propose encore « Voir toutes les pistes »'
  );
  assurer(
    !/Ton plan tient compte de ton contexte/.test(texteDuPlan),
    'l’encart de contexte se rend sur un plan à zéro action (C5.5)'
  );
  assurer(
    !/−\s?\d+\s?kg/.test(texteDuPlan),
    `le cap du plan à zéro action annonce un chiffre (cadreDuPlan, C5.3) : ${texteDuPlan.slice(0, 400)}`
  );

  // La barre arrive **sans** qu'on ait rien refermé : c'est la moitié de C5.7 que le premier
  // profil ne joue pas, puisque lui passe par « Compris ».
  await page.waitForFunction(
    () => [...document.querySelectorAll('*')].some((e) => e.textContent === 'Suivi' && e.getClientRects().length > 0),
    undefined,
    { timeout: ATTENTE }
  );
  await attendreTexte('Deux endroits, pas plus.');

  await rpc('delete_my_account', sobre.jeton);

  assurer(exceptions.length === 0, `exceptions dans la page :\n${exceptions.join('\n')}`);
  console.log(
    `Parcours réel joué de bout en bout : bilan ${ATTENDU.totalKg} kg, ${ATTENDU.pistes.length} pistes dans ` +
      `l'ordre attendu, engagement, point répondu, suivi, compte supprimé — puis le cycliste, ` +
      `${ATTENDU_SOBRE.totalKg} kg et un plan à zéro action, barre d'onglets venue sans « Compris ».`
  );
} catch (erreur) {
  try {
    await page.screenshot({ path: CAPTURE, fullPage: true });
  } catch {
    /* la capture est un confort, pas le verdict */
  }
  const texte = await page.evaluate(() => document.body.innerText).catch(() => '(page illisible)');
  console.error(
    `Le parcours réel s'est arrêté à l'étape « ${etapeCourante} » (${page.url()}).\n` +
      `${erreur instanceof Ecart ? erreur.message : erreur instanceof Error ? erreur.stack : String(erreur)}\n\n` +
      `Capture : ${CAPTURE}\n` +
      (exceptions.length ? `Exceptions dans la page :\n${exceptions.join('\n')}\n` : '') +
      (journal.length ? `Console et réseau :\n${journal.slice(-25).join('\n')}\n` : '') +
      `Texte visible :\n${texte.slice(0, 1500)}`
  );
  process.exitCode = 1;
} finally {
  await navigateur.close();
  fermer();
}
