// Le parcours réel, joué de bout en bout contre une vraie stack Supabase — à chaque PR.
//
// **Le trou que ce script bouche, mesuré le 20/09/2026** : 15 143 lignes d'écrans et de composants
// (`src/app`, `src/components`, `src/hooks`) et 1 216 lignes d'entrée-sortie (`src/lib` : les
// requêtes, les RPC) n'étaient gardées par rien d'autre que la recette sur appareil. La CI prouvait
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
// **Ce qu'il ne fait pas, et ce n'est pas un oubli** : il ne couvre ni les exclusions de cartes ni
// les états d'erreur — c'est le travail des dérivations de `src/types` et de
// `verifier-etats-export.mjs`. Un parcours qui voudrait tout voir serait fragile, et un garde-fou
// fragile finit ignoré.
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
// **Éprouvé en le cassant, le 20/09/2026** (TESTING.md §1.1), trois mutations sur l'arbre de travail,
// chacune suivie d'un export (le code est dans le bundle) et remise en place par l'opération inverse :
//   - le filtre du plan écrit de mémoire (`STATUT_DE_BILAN.complete` → `'complete'`) → s'arrête à
//     l'étape « plan », le bilan introuvable pour l'écran ;
//   - un RPC au mauvais nom (`commit_plan_action` → `commit_plan_actions`)     → s'arrête à
//     « engagement », sur un `PGRST202` que le journal imprime en clair ;
//   - la réponse au point vers un RPC au mauvais nom (`repondre_au_checkin`)    → s'arrête à
//     « point », les deux boutons restant à l'écran.
// Ce sont les trois familles que rien d'autre ne voyait : un filtre, un nom, un argument de RPC.
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
    ['Passer deux trajets sur cinq en train ou en RER', 619],
    ['Renoncer à un vol long-courrier cette année', 1601],
    ['Faire ce trajet à deux au moins un jour sur deux', 480],
    ['Travailler depuis chez toi un jour par semaine', 384],
    ['Renoncer à un vol court ou moyen-courrier cette année', 277],
    ['Remplacer un aller-retour en avion par le train', 273],
    ['Regrouper deux sorties en une seule, une fois sur cinq', 67],
    // L'apostrophe droite est celle du référentiel (`action_text` est sa clé naturelle), pas celle
    // de la recette, qui l'écrit typographique.
    ["Faire un de tes longs trajets en train plutôt qu'en voiture", 48],
  ],
};

// ── Outils ───────────────────────────────────────────────────────────────────────────────────────
class Ecart extends Error {}
function assurer(condition, message) {
  if (!condition) throw new Ecart(message);
}

const { base, fermer } = await servirExport(DIST);
const navigateur = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const contexte = await navigateur.newContext({ viewport: { width: 420, height: 900 }, locale: 'fr-FR' });
const page = await contexte.newPage();
const exceptions = [];
page.on('pageerror', (erreur) => exceptions.push(String(erreur)));
// Ce que l'app dit et ce que le réseau refuse : sur un échec, c'est ce qu'on lit en premier — une
// requête en 401 ou en 42501 explique plus qu'une capture d'écran.
const journal = [];
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') journal.push(`[console.${message.type()}] ${message.text()}`);
});
page.on('requestfailed', (requete) => journal.push(`[réseau] ${requete.method()} ${requete.url()} — ${requete.failure()?.errorText}`));
page.on('response', async (reponse) => {
  if (reponse.status() < 400) return;
  const corps = await reponse.text().catch(() => '');
  journal.push(`[réseau] ${reponse.request().method()} ${reponse.url()} → HTTP ${reponse.status()} ${corps.slice(0, 200)}`);
});

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
async function attendreTexte(motif) {
  await page.getByText(motif).first().waitFor({ state: 'visible', timeout: ATTENTE });
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

  // ── 4. La transition imposée vers le compte, refusée ────────────────────────────────────────
  etape('proposition de compte');
  await bouton('Voir ce que je peux faire');
  await page.waitForURL(/\/connexion\?.*source=resultat_transition/, { timeout: ATTENTE });
  await attendreTexte('4,2 t CO₂e par an · Trajet domicile-travail (Voiture thermique) identifié comme poste principal');
  await (await controle('Continuer sans compte')).click();

  // ── 5. Le plan : les huit pistes, le cap, la carte du premier plan ──────────────────────────
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

  assurer(exceptions.length === 0, `exceptions dans la page :\n${exceptions.join('\n')}`);
  console.log(
    `Parcours réel joué de bout en bout : bilan ${ATTENDU.totalKg} kg, ${ATTENDU.pistes.length} pistes dans ` +
      `l'ordre attendu, engagement, point répondu, suivi, compte supprimé.`
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
