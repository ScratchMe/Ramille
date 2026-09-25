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
// restitution → plan → engagement → un point généré et répondu → suivi → « Toi » → suppression du
// compte.
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
// **Et neuf de plus le 25/09/2026**, sur les trois gardes de ce jour-là — les groupes nommés à chaque
// étape, les jours de l'engagement au clavier, la ligne de canal sur « Toi » —, un export chacune
// (cache Metro isolé, `--clear`, un marqueur de la mutation retrouvé dans le bundle), après un témoin
// qui passe de bout en bout. Chacune s'arrête à l'étape attendue, sur le message attendu :
//
//   | Ce qu'on casse | Où le parcours s'arrête, et sur quoi |
//   |---|---|
//   | P1 — la liste des modes (B1.4) sans `GroupeDeChoix` | « questionnaire — mode » : les neuf modes, « aucun groupe » ; la motorisation, qui garde le sien, n'est pas citée |
//   | P9 — la liste « Lequel ? » sans groupe | « questionnaire — second mode », au détour par « Oui » : les sept modes |
//   | P2 — `PrecisionMode` sans son propre groupe | « questionnaire — mode » : le groupe du mode coche deux cases, « Voiture (seul) » et « Thermique » |
//   | P3 — `Chip` sans `activableALaBarreDEspace` | « engagement » : Espace ne coche pas « mardi » |
//   | P4 — la répétition active | « engagement » : la barre maintenue n'a pas laissé « mardi » coché |
//   | P5 — Entrée prise aussi par le gestionnaire | « engagement » : Entrée n'a pas décoché « mardi » |
//   | P6 — `opacity` remise sur la ligne hors d'atteinte | « « Toi » » : « Par email » porte une opacité |
//   | P7 — son titre remis en texte | « « Toi » » : le titre n'est pas le texte tertiaire |
//   | P8 — `LigneDeCanal` sans `activableALaBarreDEspace` | « « Toi » » : Espace ne choisit pas « Sans rappel » |
//
// **P2 a d'abord PASSÉ l'étape du mode, et c'est elle qui a changé la garde.** Sa première version ne
// vérifiait que le groupe le plus proche, et son commentaire affirmait que cela suffisait : privée de
// son groupe, la motorisation tombe dans celui du mode, qui est bien le plus proche et bien nommé —
// elle n'était vue qu'aux longs trajets, où la précision n'est pas imbriquée. La règle qui la voit est
// sémantique : un `radiogroup` ne coche jamais deux cases. P4 dit aussi une chose que Jest ne pouvait
// pas dire : la répétition d'une touche maintenue arrive bien jusqu'au gestionnaire, à travers
// Chromium, React et react-native-web — sans quoi le garde de `repeat` ne garderait rien.
//
// **Et quatre de plus le même jour, sur les assertions que la livraison de `v1-29` avait ajoutées
// sans les éprouver** — l'étiquette du départage, la phrase du cap, la félicitation du résiduel —,
// relevées par la contre-lecture (`TESTING.md` §1.1). Un export chacune, avec `--clear` :
//
//   | Ce qu'on casse | Où le parcours s'arrête, et sur quoi |
//   |---|---|
//   | Q1 — `etiquetteDuPosteDominant` rend toujours l'étiquette générale | « restitution » : « Le plus régulier, presque à égalité avec tes voyages » n'apparaît jamais |
//   | Q2 — `phraseDesPistesSuffisantes` se tait toujours | « plan » : « Chacune des deux pistes proposées suffit à le franchir. » n'apparaît jamais |
//   | Q3 — la félicitation du résiduel promet le point | le cycliste, au plan : « la félicitation nomme ou promet le résiduel des sorties rares » |
//   | Q4 — le résiduel n'est plus reconnu (le poste est nommé) | le cycliste, au plan : « Tu fais déjà l’essentiel. » n'apparaît jamais |
//
// Q4 ne fait pas parler l'assertion négative, et c'est attendu : l'attente positive vient avant elle
// et tombe la première, le titre nommant le poste ne contenant pas « l’essentiel. ». La négative
// garde l'autre moitié, la promesse du point, et c'est Q3 qui le montre. (Q3 et Q4 ont été jouées
// sur le titre d'alors ; celui du 25/09/2026 a les siennes, ci-dessous.)
//
// **Et deux le 25/09/2026, sur l'arbitrage du résiduel des sorties rares** (`v1-29` §6.3) — le titre
// « Tu es déjà sous le repère 2050. » et la marche tue sur la restitution. Ce sont deux **appels**,
// que Jest ne voit pas : chaque dérivation a ses tests, mais un écran qui passerait le mauvais
// argument les laisserait tous verts. Un export chacune, `--clear`, le marqueur retrouvé dans le
// bundle, après un témoin passé de bout en bout :
//
//   | Ce qu'on casse | Où le parcours s'arrête, et sur quoi |
//   |---|---|
//   | R1 — la restitution passe `posteSuppose` à faux | « cycliste — restitution » : « la restitution propose encore une marche sur le résiduel des sorties rares » |
//   | R2 — le plan ne passe pas le total à la félicitation | « cycliste — … le plan sans action » : « Tu es déjà sous le repère 2050. » n'apparaît jamais |
//
// R2 a d'abord été jouée **avec R1 encore en place** — la sauvegarde du fichier avait échoué — et
// s'arrêtait donc à la restitution, sur le message de R1 : un résultat qui avait l'air d'une
// mutation attrapée et qui n'éprouvait rien du plan. Rejouée seule, elle tombe où elle doit.
//
// Usage : node scripts/verifier-parcours-reel.mjs [dist]

import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import { chromium } from 'playwright';

import { mesurerUnChoix } from './mesurer-un-choix.mjs';
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
 * Le pager de l'onboarding : ses pages hors champ sont `inert` et `aria-hidden`. Jusqu'au
 * 25/09/2026, l'état qui les cache suivait l'animation de défilement et non le clic — la page
 * qu'on quittait redevenait active le temps d'un demi-défilement —, et deux « Continuer » cliqués
 * trop vite touchaient deux fois la même page (mesuré le 20/09/2026 : la première passe a réussi,
 * la seconde a tourné en rond). Il suit désormais le clic (`enVol`, src/app/onboarding/index.tsx),
 * mais l'attente reste : le bouton de la page qui arrive glisse jusqu'à ce que le défilement soit
 * posé. On attend donc que le défilement soit posé sur la page attendue, puis on clique le bouton
 * qui est **dans la fenêtre**, pas le premier que l'arbre d'accessibilité rend.
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

/**
 * **Toute case d'option répond à un `radiogroup` nommé, toute case à cocher à un `group` nommé, et
 * aucun `radiogroup` ne coche deux cases** (25/09/2026, `v1-29`).
 *
 * Trois listes de modes du questionnaire n'avaient aucun groupe : « Voiture (seul) », atteint au
 * clavier ou au doigt, ne disait pas à quelle question il répond. Une précision qui s'ouvre sous un
 * mode vit **dans** le groupe de ce mode (`GroupeDeChoix` dit pourquoi), et c'est ce qui impose les
 * deux autres règles :
 * - **c'est le groupe le plus proche qui doit être nommé**, pas « un ancêtre » : une précision dont le
 *   groupe aurait perdu son nom trouverait sinon celui du mode ;
 * - **un `radiogroup` ne coche jamais plus d'une case.** Une précision privée de son propre groupe
 *   tombe dans celui du mode, qui devient son groupe le plus proche et qui est bien nommé : les deux
 *   premières règles passent, et seule celle-ci la voit — le mode et la motorisation cochés ensemble,
 *   comme deux réponses à la même question. **La première version de cette garde n'avait pas cette
 *   règle, et elle croyait n'en avoir pas besoin** : son commentaire affirmait que « le plus proche »
 *   suffisait. La mutation l'a démentie (en-tête, P2) — la motorisation n'était vue qu'aux longs
 *   trajets, là où elle n'est pas imbriquée.
 *
 * Appelée à chaque étape du questionnaire, sur la feuille d'engagement et sur « Toi » ; une page sans
 * aucun choix n'est pas un succès, c'est une mesure qui n'a pas eu lieu.
 */
async function verifierLesGroupes(ou) {
  const releve = await page.evaluate(() => {
    const choix = [...document.querySelectorAll('[role="radio"], [role="checkbox"]')];
    const fautifs = [];
    const cochesParGroupe = new Map();
    for (const element of choix) {
      const role = element.getAttribute('role');
      const attendu = role === 'radio' ? 'radiogroup' : 'group';
      const groupe = element.parentElement?.closest('[role="radiogroup"], [role="group"]') ?? null;
      const nom = groupe?.getAttribute('aria-label')?.trim() ?? '';
      const libelle = (element.getAttribute('aria-label') ?? element.textContent ?? '').trim();
      if (groupe === null || groupe.getAttribute('role') !== attendu || nom === '') {
        fautifs.push(
          `${role} « ${libelle} » — ` +
            (groupe === null ? 'aucun groupe' : `plus proche groupe : ${groupe.getAttribute('role')} « ${nom} »`)
        );
      } else if (role === 'radio' && element.getAttribute('aria-checked') === 'true') {
        cochesParGroupe.set(groupe, [...(cochesParGroupe.get(groupe) ?? []), libelle]);
      }
    }
    for (const [groupe, coches] of cochesParGroupe) {
      if (coches.length > 1) {
        fautifs.push(
          `radiogroup « ${groupe.getAttribute('aria-label')} » — ${coches.length} cases cochées à la fois` +
            ` (${coches.map((c) => `« ${c} »`).join(', ')}) : une précision privée de son propre groupe est` +
            ' tombée dans celui de l’option qu’elle précise'
        );
      }
    }
    return { total: choix.length, fautifs };
  });
  assurer(releve.total > 0, `${ou} : aucun choix à l'écran, les groupes n'ont pas pu être vérifiés`);
  assurer(
    releve.fautifs.length === 0,
    `${ou} : ${releve.fautifs.length} défaut(s) de groupe — une case d'option doit répondre à un` +
      ' radiogroup nommé qui n’en coche qu’une, une case à cocher à un group nommé, par GroupeDeChoix :' +
      `\n  ${releve.fautifs.join('\n  ')}`
  );
}

/** Le bouton qui quitte une étape du questionnaire — après avoir vérifié les groupes qu'elle rend. */
async function suivant(libelle = 'Suivant') {
  await verifierLesGroupes(`l'étape du questionnaire en cours (${etapeCourante})`);
  await bouton(libelle);
}

/**
 * Le texte tertiaire du thème clair, **lu dans `theme.ts`** plutôt que recopié — comme
 * `ControlHeight.target` dans `verifier-etats-export.mjs` : une ligne de canal hors d'atteinte porte
 * son titre dans cette couleur (25/09/2026).
 */
const TEXTE_TERTIAIRE = (() => {
  const source = readFileSync('src/constants/theme.ts', 'utf8');
  const hex = source.match(/light:\s*\{[^}]*?\btextTertiary:\s*'#([0-9A-Fa-f]{6})'/)?.[1];
  if (!hex) {
    console.error('`Colors.light.textTertiary` est introuvable dans src/constants/theme.ts : adapter le motif.');
    process.exit(2);
  }
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
})();

/** Le rapport de contraste WCAG entre deux couleurs CSS opaques (`rgb(…)`). */
function contraste(a, b) {
  const luminance = (css) => {
    const [r, g, bleu] = css.match(/\d+(\.\d+)?/g).map(Number);
    const canal = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(bleu);
  };
  const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (sombre + 0.05);
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
  await suivant();

  etape('questionnaire — jours et distance');
  await choisir('5');
  const distance = page.getByRole('textbox', { name: 'Distance pour un aller, en km' });
  await distance.waitFor({ state: 'visible', timeout: ATTENTE });
  await distance.fill('30');
  await suivant();

  etape('questionnaire — mode');
  await choisir('Voiture (seul)');
  await choisir('Thermique');
  await suivant();

  etape('questionnaire — second mode');
  // « Oui » d'abord, et seulement pour ouvrir la liste « Lequel ? » : c'est l'une des trois listes de
  // modes qui n'avaient pas de groupe (25/09/2026), et sans ce détour aucun des deux profils ne la
  // rendrait jamais. « Non » ensuite, la réponse du profil — il efface ce que « Oui » avait ouvert
  // (`normaliserReponses`), donc les chiffres attendus ne bougent pas.
  await choisir('Oui');
  await attendreTexte('Lequel ?');
  await verifierLesGroupes('la liste « Lequel ? » du second mode');
  await choisir('Non');
  await suivant();

  etape('questionnaire — sorties');
  await choisir('Une fois par semaine');
  await suivant();
  await choisir('Voiture (seul)');
  await choisir('Thermique');
  await choisir('15 à 30 km');
  await suivant();

  etape('questionnaire — vols');
  await choisir('2'); // le total : 2 vols dans l'année
  await choisir('1', { dernier: true }); // dont 1 court — la seconde série, rendue après le total
  await attendreTexte('1 vol long-courrier sera compté.');
  await suivant();

  etape('questionnaire — longs trajets');
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en train' }).getByRole('radio', { name: '0', exact: true }).click();
  // C4.4 : la troisième série, cliquée à zéro. Elle vaut déjà zéro par défaut, donc ce clic
  // n'existe que pour qu'un compteur qui disparaîtrait de l'écran fasse échouer le parcours.
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en autocar' }).getByRole('radio', { name: '0', exact: true }).click();
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en voiture' }).getByRole('radio', { name: '2', exact: true }).click();
  await choisir('Thermique');
  await choisir('2 personnes');
  await suivant();

  etape('questionnaire — contexte');
  await choisir('Périurbain');
  await choisir('Limité');
  await choisir('1');
  await choisir(/^Un jour/, { exact: false });
  await suivant('Voir mon bilan');

  // ── 3. La restitution, et la base derrière ───────────────────────────────────────────────────
  etape('restitution');
  await page.waitForURL(/\/suivi\/bilan/, { timeout: 45_000 });
  await attendreTexte('4,2 t CO₂e');
  // **Ce profil est le cas d'égalité du départage** (24/09/2026, `v1-29`) : voyages 2,0 t,
  // domicile-travail 1,9 t, et le serveur retient le plus régulier à 5 % près. L'étiquette disait
  // « Le déplacement qui pèse le plus » au-dessus de barres qui montrent l'inverse ; elle le dit
  // maintenant (`etiquetteDuPosteDominant`), et seul ce parcours la voit rendue depuis de vrais
  // chiffres serveur.
  await attendreTexte('Le plus régulier, presque à égalité avec tes voyages');
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
  // Le cap est annuel, comme les gains des pistes, et les deux premières le franchissent chacune
  // (619 et 1 601 kg contre 384) : la carte du cap le dit tant que rien n'est engagé (24/09/2026,
  // `v1-29`, `phraseDesPistesSuffisantes`).
  await attendreTexte('Chacune des deux pistes proposées suffit à le franchir.');
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
  await verifierLesGroupes('la feuille d’engagement');

  // **« mardi » se coche au clavier, et c'est la seule case à cocher du produit** (25/09/2026).
  // react-native-web n'active par Espace qu'un bouton : depuis que les jours sont des `checkbox`, Espace
  // n'y cochait plus rien et faisait défiler le plan (`src/lib/barre-d-espace.ts`). Trois gestes, et
  // chacun garde une moitié différente de la règle — c'est une case à cocher qui les rend visibles, là
  // où une case d'option cochée deux fois reste cochée :
  //   - Espace coche, et **rien ne défile** — la page retenue par `preventDefault()` ;
  //   - Entrée décoche : react-native-web l'active déjà, et si notre gestionnaire la prenait aussi, la
  //     case basculerait deux fois et resterait cochée ;
  //   - une barre d'espace **maintenue** coche une fois : le navigateur répète `keydown`, et chaque
  //     répétition la ferait basculer.
  // La case finit cochée : c'est la réponse du profil, que la base relit juste après.
  const mardi = page.getByRole('checkbox', { name: 'mardi', exact: true });
  await mardi.focus();
  const avantEspace = await mardi.evaluate(mesurerUnChoix);
  assurer(
    avantEspace.etat === 'false' && avantEspace.focus && avantEspace.peutDefiler,
    `la mesure de « mardi » ne peut pas se prendre (${JSON.stringify(avantEspace)}) : il faut une case` +
      ' décochée, qui a le focus, sous une page qui peut encore défiler'
  );
  await page.keyboard.press('Space');
  await page.waitForTimeout(600); // le défilement du navigateur est animé
  const apresEspace = await mardi.evaluate(mesurerUnChoix);
  assurer(apresEspace.etat === 'true', 'Espace ne coche pas « mardi » : react-native-web ne gère Espace que sur un bouton');
  assurer(
    apresEspace.positions === avantEspace.positions,
    `Espace sur « mardi » fait défiler le plan (${avantEspace.positions} → ${apresEspace.positions} px)`
  );
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  assurer(
    (await mardi.getAttribute('aria-checked')) === 'false',
    'Entrée n’a pas décoché « mardi » : la case a basculé deux fois, Entrée est prise deux fois'
  );
  await page.keyboard.down('Space');
  await page.keyboard.down('Space'); // la répétition d'une touche maintenue (`repeat`)
  await page.keyboard.up('Space');
  await page.waitForTimeout(300);
  assurer(
    (await mardi.getAttribute('aria-checked')) === 'true',
    'une barre d’espace maintenue n’a pas laissé « mardi » coché : la répétition a basculé la case'
  );
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

  // ── 8 bis. « Toi » : la ligne de canal, hors d'atteinte et au clavier ────────────────────────
  //
  // **Le seul endroit de ce parcours où une ligne de canal se rend** (25/09/2026) : la feuille des
  // rappels ne s'ouvre sur web qu'avec une adresse rattachée, et ce profil n'en a pas.
  // Deux choses s'y vérifient, qu'aucune autre garde ne voyait :
  //   - **la ligne hors d'atteinte le dit par son texte, jamais par une opacité** (kit, `readme.md`,
  //     puce « États ») : sans compte, « Par email » est désactivée, jamais cochée — la préférence en
  //     base vaut pourtant `email` —, sans opacité, son titre en texte tertiaire et son détail, la
  //     phrase qui dit pourquoi, lisible. Sous l'opacité de 0,6 qu'elle portait, il tombait à 3,2:1 ;
  //   - **Espace choisit une ligne**, comme les autres choix, et le choix atteint la base.
  etape('« Toi » — la ligne de canal');
  for (const icone of await page.getByRole('button', { name: 'Ton compte', exact: true }).all()) {
    if (await icone.isVisible()) {
      await icone.click();
      break;
    }
  }
  await page.waitForURL(/\/compte/, { timeout: ATTENTE });
  const lesRappels = page.getByRole('radiogroup', { name: 'Les rappels', exact: true });
  await lesRappels.waitFor({ state: 'visible', timeout: ATTENTE });
  await verifierLesGroupes('« Toi »');

  const horsDAtteinte = await lesRappels.getByRole('radio', { name: /^Par email\./ }).evaluate((ligne) => {
    let opacite = 1;
    for (let n = ligne; n; n = n.parentElement) opacite *= Number(getComputedStyle(n).opacity);
    const [titre, detail] = [...ligne.querySelectorAll('div')].filter((e) => e.childElementCount === 0 && e.textContent.trim());
    return {
      desactivee: ligne.getAttribute('aria-disabled'),
      cochee: ligne.getAttribute('aria-checked'),
      opacite,
      fond: getComputedStyle(ligne).backgroundColor,
      titre: titre ? getComputedStyle(titre).color : null,
      detail: detail ? getComputedStyle(detail).color : null,
    };
  });
  assurer(
    horsDAtteinte.desactivee === 'true' && horsDAtteinte.cochee === 'false',
    `« Par email », sans compte, doit être désactivée et jamais cochée : ${JSON.stringify(horsDAtteinte)}`
  );
  assurer(
    horsDAtteinte.opacite === 1,
    `« Par email » hors d’atteinte porte une opacité de ${horsDAtteinte.opacite} : le kit l’interdit, et sous 0,6` +
      ' le détail qui dit pourquoi tombait à 3,2:1'
  );
  assurer(
    horsDAtteinte.titre === TEXTE_TERTIAIRE,
    `le titre de « Par email » hors d’atteinte est en ${horsDAtteinte.titre}, attendu le texte tertiaire ${TEXTE_TERTIAIRE}`
  );
  const lisibilite = contraste(horsDAtteinte.detail, horsDAtteinte.fond);
  assurer(
    lisibilite >= 4.5,
    `le détail de « Par email » hors d’atteinte ne tient que ${lisibilite.toFixed(2)}:1 sur son fond, sous 4,5:1`
  );

  const sansRappel = lesRappels.getByRole('radio', { name: /^Sans rappel\./ });
  await sansRappel.focus();
  assurer((await sansRappel.getAttribute('aria-checked')) === 'false', '« Sans rappel » est déjà cochée avant l’appui');
  await page.keyboard.press('Space');
  await page.waitForFunction(
    () => document.querySelector('[role="radio"][aria-label^="Sans rappel"]')?.getAttribute('aria-checked') === 'true',
    undefined,
    { timeout: ATTENTE }
  ).catch(() => {});
  assurer(
    (await sansRappel.getAttribute('aria-checked')) === 'true',
    'Espace ne choisit pas « Sans rappel » : la ligne de canal doit décomposer activableALaBarreDEspace'
  );
  // L'écriture part après la coche (optimiste, `choisirLeCanal`) : on relit la base jusqu'à la voir.
  let canalEnBase = null;
  const limiteDuCanal = Date.now() + ATTENTE;
  while (canalEnBase !== 'none' && Date.now() < limiteDuCanal) {
    const [profil] = await lire(`profiles?select=reminder_channel&id=eq.${userId}`, jeton);
    canalEnBase = profil?.reminder_channel ?? null;
    if (canalEnBase !== 'none') await page.waitForTimeout(200);
  }
  assurer(canalEnBase === 'none', `la préférence choisie à la barre d’espace n’a pas atteint la base : ${canalEnBase}`);

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
  await suivant();
  await choisir('3');
  const distanceVelo = page.getByRole('textbox', { name: 'Distance pour un aller, en km' });
  await distanceVelo.waitFor({ state: 'visible', timeout: ATTENTE });
  await distanceVelo.fill('5');
  await suivant();
  // **Le vélo ouvre sa propre révélation depuis C4.4** — ce commentaire disait l'inverse jusqu'au
  // 21/09/2026, et c'est le genre de phrase qui survit à ce qu'elle décrit. « Mécanique » garde
  // le facteur d'avant le chantier (0,000170), donc les chiffres de ce profil ne bougent pas :
  // c'est la réponse qui isole la nouveauté de l'écran de celle du calcul.
  await choisir('Vélo');
  await choisir('Mécanique');
  await suivant();
  await choisir('Non');
  await suivant();
  // « Rarement » fait disparaître les questions de détail des sorties : l'étape suivante est celle
  // des vols, et non le mode ni la tranche de distance.
  await choisir(/^Rarement/, { exact: false });
  await suivant();
  await choisir('0'); // aucun vol — et à zéro, la question « combien sont courts ? » ne se pose pas
  await suivant();
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en train' }).getByRole('radio', { name: '0', exact: true }).click();
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en autocar' }).getByRole('radio', { name: '0', exact: true }).click();
  await page.getByRole('radiogroup', { name: 'Trajets longue distance en voiture' }).getByRole('radio', { name: '0', exact: true }).click();
  await suivant();
  await choisir('Urbain dense');
  await choisir('Bon');
  await choisir('0');
  await choisir(/^Aucun/, { exact: false });
  await suivant('Voir mon bilan');

  etape('cycliste — restitution, puis le plan sans action');
  await page.waitForURL(/\/suivi\/bilan/, { timeout: 45_000 });
  // **Le second profil traverse l'autre branche du formateur**, et c'est une raison de plus de
  // l'écrire : le premier rend des tonnes (« 4,2 t »), celui-ci des kilos. Le seuil vit dans
  // `valeurEtUnite` (`src/lib/format.ts`) et aucun parcours ne le franchissait — seule l'assertion
  // en base aurait tenu si l'écran s'était mis à dire « 0,0 t ».
  await attendreTexte(`${ATTENDU_SOBRE.totalKg} kg CO₂e`);
  assurer(!(await barreVisible()), 'la barre d’onglets est visible sur la restitution du cycliste (C5.7)');
  // **La marche se tait sur le résiduel des sorties rares** (arbitrage du 25/09/2026, `v1-29` §6.3).
  // Ce profil recevait « S’il te reste de l’envie : 2 kg CO₂e de moins sur l’année sur tes sorties du
  // week-end » — des sorties qu'il n'a pas déclarées, et un plan vide pour les franchir. Le début de
  // la phrase reste, et il s'attend d'abord : sans lui, l'absence qui suit passerait sur un palier
  // qui ne se rend plus du tout.
  await attendreTexte('Tu es déjà sous le repère transport 2050.');
  const texteDeLaRestitution = await page.evaluate(() => document.body.innerText);
  assurer(
    !/S’il te reste de l’envie/.test(texteDeLaRestitution),
    'la restitution propose encore une marche sur le résiduel des sorties rares (palierNote)'
  );
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

  // La félicitation, et non un écran vide : le plan à zéro action dit pourquoi il est vide. Elle nomme
  // le poste depuis le 24/09/2026 (`v1-29`) — **sauf ici**, et ce profil est exactement le cas : le
  // poste de son cycle est le résiduel des sorties rares (11 kg, contre moins d'un kilo de vélo), que
  // le calcul suppose et que la personne n'a pas déclaré. D'où le titre sans poste, et aucune promesse
  // de point : la boucle mensuelle n'est pas générée sans base déclarée
  // (`felicitationDuPlanSansAction`).
  //
  // **Et depuis l'arbitrage du 25/09/2026, le titre dit pourquoi le plan est vide** : « Tu es déjà
  // sous le repère 2050. », ce que la restitution vient de dire — à « transport » près, et c'est ce
  // qui empêche l'attente ci-dessous de se satisfaire de la restitution restée montée sous le plan.
  // Le titre est conditionné au total que l'écran relit : une lecture qui ne le ramènerait plus le
  // ferait retomber sur « Tu fais déjà l’essentiel. », et c'est ici que ça se verrait.
  await attendreTexte('Tu es déjà sous le repère 2050.');
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
  // Le titre et la promesse, et eux seuls : `innerText` lit aussi la restitution restée montée sous
  // le plan dans la pile, où « tes sorties du week-end » est légitime — une première version qui
  // cherchait ces trois mots dans toute la page tombait pour cette raison-là, et pas pour la bonne.
  assurer(
    !/Tu fais déjà l’essentiel sur/.test(texteDuPlan) && !/Le point reste là/.test(texteDuPlan),
    'la félicitation nomme ou promet le résiduel des sorties rares (felicitationDuPlanSansAction)'
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
      `l'ordre attendu, engagement (les jours au clavier), point répondu, suivi, « Toi » et sa ligne de ` +
      `canal, compte supprimé — puis le cycliste, ${ATTENDU_SOBRE.totalKg} kg et un plan à zéro action, ` +
      `barre d'onglets venue sans « Compris ». Chaque choix rendu répond à son groupe nommé.`
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
