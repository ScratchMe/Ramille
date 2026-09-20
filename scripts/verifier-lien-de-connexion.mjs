// Le lien de connexion, joué de bout en bout — le seul chemin du produit vers un compte existant.
//
// **Ce chemin n'était gardé par rien**, et c'est le plus coûteux à casser : quelqu'un qui change
// d'appareil, qui réinstalle, ou qui arrive sur `/compte/suppression` depuis un navigateur neuf n'a
// que lui. Jest ne voit pas partir un e-mail, pgTAP ne voit pas GoTrue, et le parcours réel ne joue
// que la session anonyme. Le collecteur d'e-mails local (`[local_smtp]` dans `supabase/config.toml`)
// a été allumé le 20/09/2026 précisément pour que ce script existe.
//
// **Ce qu'il éprouve, et pourquoi ces trois-là.** Le 20/09/2026, le flux est passé de `implicit` à
// `pkce` (revue de sécurité, `v1-27` §12.9). Le passage a trois conséquences observables, et **une
// seule est un chemin heureux** :
//
//   1. **Le lien ouvert là où il a été demandé ouvre la session.** C'est le produit. S'il casse,
//      plus personne ne retrouve son compte, et rien d'autre ne le dirait.
//   2. **Le lien ouvert ailleurs échoue en le DISANT.** C'est le piège du chantier :
//      `_isPKCECallback` d'`auth-js` rend **faux** quand le vérifieur manque, donc le SDK ne tente
//      rien et ne lève rien — la personne atterrit sur l'accueil, déconnectée, sans un mot, son
//      lien encore valable dans la barre d'adresse. La branche `code` du layout racine existe pour
//      rattraper ce silence, et c'est elle que l'assertion 2 garde.
//   3. **Une session injectée par l'URL n'est plus acceptée.** C'est la faille que le chantier
//      ferme : en implicite, `#access_token=…&refresh_token=…` suffisait à faire basculer l'app sur
//      le compte de qui avait posé le lien. L'assertion 3 utilise de **vrais jetons valides** d'un
//      second compte — un faux jeton prouverait seulement qu'un faux jeton ne marche pas.
//
// **Éprouvé en le cassant, le 20/09/2026** (TESTING.md §1.1) — trois mutations, chacune suivie d'un
// export (le code part dans le bundle) et remise par l'opération inverse :
//   - `flowType: 'pkce'` retiré de `src/lib/supabase.ts` (retour au défaut implicite) → les
//     assertions **2 et 3** tombent : le lien s'ouvre dans n'importe quel navigateur, et une URL
//     portant des jetons fait basculer la victime sur le compte de l'attaquant (mesuré :
//     `05b1f277…` → `a7b84d72…`). **Il a fallu deux corrections pour que la 3 puisse tomber**, et
//     les deux étaient des défauts de ce fichier, pas du produit :
//       a) elle relisait « une » session au lieu d'attendre un **changement**, donc ramenait
//          l'ancienne avant qu'`auth-js` n'ait fini de traiter le fragment ;
//       b) et surtout, elle injectait **pendant que l'app se routait encore**. La racine redirige
//          côté client vers `/onboarding` ou `/plan`, et cette redirection emporte la navigation
//          lancée en même temps, fragment compris : l'attaque n'avait tout simplement pas lieu.
//     Une garde dont le succès est une **absence** doit laisser à l'attaque le temps *et* les
//     conditions de réussir. Sans (b), le flux implicite remis, ce script restait vert sur la
//     faille qu'il existe pour voir ;
//   - `if (params.code) return 'code';` retiré de `lireRetourDeLien` → l'assertion **2** tombe : le
//     lien ouvert ailleurs redevient muet ;
//   - `exchangeCodeForSession` remplacé par `setSession` dans `createSessionFromUrl` → l'assertion
//     **1** tombe sur natif. *Non rejouée ici* : ce script est web, et `createSessionFromUrl` n'y
//     est appelée que par la branche native. C'est écrit plutôt que passé sous silence — la
//     couverture s'arrête là, et `RECETTE.md` porte le pas sur appareil.
//
// ── Comment il tourne ────────────────────────────────────────────────────────────────────────────
//
// Mêmes prérequis que `verifier-parcours-reel.mjs` — une stack locale complète et un export web
// construit avec l'URL et la clé de CETTE stack — plus une contrainte à lui : **il sert sur le port
// 3000**. L'app calcule son `redirectTo` depuis `window.location.origin`, et GoTrue n'accepte que
// les origines de sa liste, dont `site_url = http://127.0.0.1:3000`. Sur un autre port, le lien
// retomberait sur la Site URL sans rien dire, et le script éprouverait autre chose.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import { chromium } from 'playwright';

import { servirExport } from './servir-export.mjs';

const API = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOITE = process.env.SUPABASE_INBUCKET_URL ?? 'http://127.0.0.1:54324';
const PORT = 3000;

if (!API || !ANON || !SERVICE) {
  console.error(
    'Il manque EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY.\n' +
      '`supabase status -o env` les donne ; TESTING.md §2.6 décrit la mise en route.',
  );
  process.exit(1);
}

const ecarts = [];
let etape = 'démarrage';
function verifier(condition, message) {
  if (!condition) ecarts.push(`[${etape}] ${message}`);
}

/** Un compte existant, adresse confirmée — `sendAccountAccessLink` refuse d'en créer un. */
async function creerUnCompte(adresse) {
  const reponse = await fetch(`${API}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adresse, email_confirm: true }),
  });
  const corps = await reponse.json();
  if (!reponse.ok || !corps.id) throw new Error(`Création du compte ${adresse} : ${JSON.stringify(corps)}`);
  return corps.id;
}

/**
 * Les messages reçus par cette adresse, les plus récents d'abord.
 *
 * **C'est l'API de Mailpit**, et pas celle d'Inbucket : le CLI Supabase a changé de collecteur,
 * et les deux répondent sur le même port avec des routes différentes (`/api/v1/search` ici,
 * `/api/v1/mailbox/<nom>` là-bas). `supabase status -o env` publie encore la variable sous le
 * nom `INBUCKET_URL` **et** sous `MAILPIT_URL`, ce qui est exactement le genre de détail qui
 * fait chercher ailleurs — relevé le 20/09/2026, la première version de ce script prenait des
 * 404 pour une boîte vide.
 */
async function messagesDe(adresse) {
  const reponse = await fetch(`${BOITE}/api/v1/search?query=${encodeURIComponent(`to:${adresse}`)}`);
  if (!reponse.ok) return [];
  return (await reponse.json()).messages ?? [];
}

/**
 * Le dernier lien reçu par cette adresse.
 *
 * On relit jusqu'à ce que le message arrive : GoTrue répond avant que le SMTP ait fini, et
 * attendre une durée fixe serait soit trop long soit intermittent.
 */
async function dernierLienRecu(adresse, depuis = 0) {
  for (let essai = 0; essai < 60; essai += 1) {
    const liste = await messagesDe(adresse);
    if (liste.length > depuis) {
      const message = await fetch(`${BOITE}/api/v1/message/${liste[0].ID}`).then((r) => r.json());
      const corps = `${message.HTML ?? ''}${message.Text ?? ''}`;
      const lien = corps
        .replace(/&amp;/g, '&')
        .match(/https?:\/\/[^\s"'<>]+/g)
        ?.find((u) => u.includes('/auth/v1/verify'));
      if (lien) return lien;
      throw new Error(`Message reçu sans lien de vérification : ${corps.slice(0, 300)}`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Aucun e-mail reçu pour ${adresse} après 30 s.`);
}

async function compterLesMessages(adresse) {
  return (await messagesDe(adresse)).length;
}

/** L'identifiant de l'utilisateur dont la page porte la session, ou `null`. */
async function utilisateurDeLaPage(page, essais = 40) {
  return page.evaluate(async (tours) => {
    for (let i = 0; i < tours; i += 1) {
      for (let k = 0; k < localStorage.length; k += 1) {
        const cle = localStorage.key(k);
        if (!cle || !cle.startsWith('sb-') || !cle.endsWith('-auth-token')) continue;
        try {
          const brut = JSON.parse(localStorage.getItem(cle) ?? 'null');
          if (brut?.user?.id) return { id: brut.user.id, anonyme: !!brut.user.is_anonymous };
        } catch {
          /* une valeur illisible n'est pas une session */
        }
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    return null;
  }, essais);
}

/**
 * La session de la page une fois qu'elle a **changé**, ou celle d'avant si elle ne change pas.
 *
 * Pour la seule assertion dont le succès est une **absence** : une injection qui échoue ne
 * produit aucun événement à attendre, donc la seule façon honnête de l'affirmer est de laisser
 * passer le temps qu'elle aurait mis à réussir.
 */
async function attendreUnChangementDeSession(page, idAvant, ms = 8000) {
  const fin = Date.now() + ms;
  let vu = null;
  while (Date.now() < fin) {
    vu = await utilisateurDeLaPage(page, 1);
    if (vu && vu.id !== idAvant) return vu;
    await new Promise((r) => setTimeout(r, 250));
  }
  return vu;
}

/**
 * Demande un lien depuis l'écran du produit, et rend le lien reçu.
 *
 * **Par l'écran et pas par l'API**, et c'est tout l'intérêt : c'est le client qui fabrique le
 * défi PKCE et range le vérifieur dans son stockage. Un appel direct à `/auth/v1/otp` produirait
 * un lien implicite, donc éprouverait le flux qu'on vient justement de quitter.
 *
 * Le champ se désigne par son nom accessible (`accessibilityLabel` → `aria-label`), comme dans
 * `verifier-parcours-reel.mjs` : c'est le seul nom qui ne dépend pas de la mise en page.
 */
async function demanderUnLien(page, base, adresse) {
  const avant = await compterLesMessages(adresse);
  await page.goto(`${base}/connexion/retrouver?source=onboarding`, { waitUntil: 'domcontentloaded' });
  const champ = page.getByRole('textbox', { name: 'Adresse email du compte' });
  await champ.waitFor({ state: 'visible', timeout: 20000 });
  await champ.fill(adresse);
  await page.getByRole('button', { name: 'Recevoir le lien', exact: true }).click();
  return dernierLienRecu(adresse, avant);
}

const dist = path.join(import.meta.dirname, '..', 'dist');
if (!fs.existsSync(dist)) {
  console.error('`dist/` est absent : lancer `npx expo export --platform web --clear` d’abord.');
  process.exit(1);
}

const serveur = await servirExport(dist, PORT);
const navigateur = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const marque = Date.now().toString(36);

try {
  // ── 1. Le lien ouvert LÀ OÙ il a été demandé ouvre la session ────────────────────────────────
  etape = 'lien ouvert au bon endroit';
  const adresseA = `pkce-a-${marque}@test.local`;
  const idA = await creerUnCompte(adresseA);

  const contexteA = await navigateur.newContext({ viewport: { width: 420, height: 900 }, locale: 'fr-FR' });
  const pageA = await contexteA.newPage();
  const lienA = await demanderUnLien(pageA, serveur.base, adresseA);
  await pageA.goto(lienA, { waitUntil: 'domcontentloaded' });
  await pageA.waitForLoadState('networkidle').catch(() => {});

  const sessionA = await utilisateurDeLaPage(pageA);
  verifier(sessionA !== null, 'aucune session après avoir ouvert le lien dans le contexte qui l’a demandé');
  verifier(
    sessionA?.id === idA,
    `la session ouverte porte ${sessionA?.id ?? 'rien'}, attendu le compte qui a demandé le lien (${idA})`,
  );
  verifier(sessionA?.anonyme === false, 'la session ouverte est encore anonyme : le lien n’a pas rattaché le compte');

  // ── 2. Le même lien, ouvert AILLEURS, échoue en le disant ────────────────────────────────────
  etape = 'lien ouvert ailleurs';
  const lienA2 = await demanderUnLien(pageA, serveur.base, adresseA);

  const contexteB = await navigateur.newContext({ viewport: { width: 420, height: 900 }, locale: 'fr-FR' });
  const pageB = await contexteB.newPage();
  await pageB.goto(lienA2, { waitUntil: 'domcontentloaded' });
  await pageB.waitForLoadState('networkidle').catch(() => {});

  const sessionB = await utilisateurDeLaPage(pageB);
  verifier(
    sessionB === null || sessionB.id !== idA,
    'un lien ouvert dans un autre navigateur a quand même ouvert la session : le vérifieur PKCE ne sert à rien',
  );

  // Le silence est le vrai défaut : sans la branche `code` du layout, la personne verrait l'accueil.
  const texteB = await pageB.locator('body').innerText();
  verifier(
    /ouvrir là où tu l’as demandé|ouvrir la où tu l'as demandé/i.test(texteB),
    `rien ne dit à la personne que son lien doit s’ouvrir ailleurs — texte vu : « ${texteB.replace(/\s+/g, ' ').slice(0, 220)} »`,
  );

  // ── 3. Une session injectée par l'URL n'est plus acceptée ────────────────────────────────────
  //
  // De **vrais** jetons, obtenus comme un attaquant les obtiendrait : il ouvre sa propre session
  // et lit son stockage. Un jeton fabriqué ne prouverait que le refus d'un jeton fabriqué.
  etape = 'session injectée par l’URL';
  const adresseC = `pkce-c-${marque}@test.local`;
  const idC = await creerUnCompte(adresseC);

  const contexteC = await navigateur.newContext({ viewport: { width: 420, height: 900 }, locale: 'fr-FR' });
  const pageC = await contexteC.newPage();
  const lienC = await demanderUnLien(pageC, serveur.base, adresseC);
  await pageC.goto(lienC, { waitUntil: 'domcontentloaded' });
  await pageC.waitForLoadState('networkidle').catch(() => {});

  const jetonsC = await pageC.evaluate(() => {
    for (let k = 0; k < localStorage.length; k += 1) {
      const cle = localStorage.key(k);
      if (!cle || !cle.startsWith('sb-') || !cle.endsWith('-auth-token')) continue;
      const brut = JSON.parse(localStorage.getItem(cle) ?? 'null');
      if (brut?.access_token && brut?.refresh_token) {
        return { access_token: brut.access_token, refresh_token: brut.refresh_token };
      }
    }
    return null;
  });
  verifier(jetonsC !== null, 'impossible de lire les jetons du compte témoin : l’assertion d’injection ne prouve rien');

  if (jetonsC) {
    const contexteD = await navigateur.newContext({ viewport: { width: 420, height: 900 }, locale: 'fr-FR' });
    const pageD = await contexteD.newPage();
    // La victime ouvre l'app une première fois : elle a sa propre session anonyme, c'est elle
    // qu'on ne doit pas perdre.
    //
    // **On attend que l'app ait fini de se router avant d'injecter**, et ce n'est pas de la
    // prudence : la racine redirige côté client vers `/onboarding` ou `/plan`, et une navigation
    // lancée pendant ce trajet est **emportée par la redirection**, fragment compris. Mesuré le
    // 20/09/2026 : l'assertion d'injection restait verte même avec le flux implicite remis,
    // parce que l'attaque n'avait tout simplement pas lieu. Une garde qui passe faute d'attaque
    // est pire qu'une garde absente — elle dit le contraire de ce qu'elle mesure.
    await pageD.goto(`${serveur.base}/`, { waitUntil: 'domcontentloaded' });
    await pageD.waitForURL((u) => new URL(u).pathname !== '/', { timeout: 20000 }).catch(() => {});
    await pageD.waitForLoadState('networkidle').catch(() => {});
    const avantD = await utilisateurDeLaPage(pageD);
    verifier(avantD !== null, 'la victime n’a pas de session de départ : le scénario d’injection ne veut rien dire');

    await pageD.goto(
      `${serveur.base}/#access_token=${jetonsC.access_token}&refresh_token=${jetonsC.refresh_token}&token_type=bearer&expires_in=3600&type=magiclink`,
      { waitUntil: 'domcontentloaded' },
    );
    await pageD.waitForLoadState('networkidle').catch(() => {});

    // **On attend un CHANGEMENT, on ne relit pas « une » session** — voir l'en-tête : appelée
    // juste après la navigation, la lecture ramenait l'ancienne session et l'assertion passait
    // pour la mauvaise raison, faille grande ouverte.
    const apresD = await attendreUnChangementDeSession(pageD, avantD?.id ?? null);
    // `TRACE_LIEN=1` imprime les trois identifiants et l'URL finale. C'est ce qui a permis de
    // voir que l'injection n'avait pas lieu, là où la seule lecture des assertions disait
    // « tout va bien » — on le garde pour la prochaine fois.
    if (process.env.TRACE_LIEN) {
      console.log(`   [trace] idC=${idC} avantD=${avantD?.id} apresD=${apresD?.id} url=${pageD.url().slice(0, 90)}`);
    }
    verifier(
      apresD?.id !== idC,
      'une URL portant des jetons a fait basculer l’app sur le compte de quelqu’un d’autre — la faille est ouverte',
    );
    verifier(
      apresD?.id === avantD?.id,
      `la session de la personne a changé sans son geste (${avantD?.id ?? 'rien'} → ${apresD?.id ?? 'rien'})`,
    );
    await contexteD.close();
  }

  await contexteA.close();
  await contexteB.close();
  await contexteC.close();
} catch (erreur) {
  ecarts.push(`[${etape}] exception : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
} finally {
  await navigateur.close();
  serveur.fermer();
}

if (ecarts.length > 0) {
  console.error('Le lien de connexion ne fait pas ce qu’il promet :\n');
  for (const ecart of ecarts) console.error(`  - ${ecart}`);
  console.error(
    `\nLes trois assertions ne se remplacent pas : la 1 est le produit, la 2 est le silence que\n` +
      `PKCE introduit, la 3 est la faille qu'il ferme. Détail en tête de ce fichier.\n` +
      `Dossier temporaire pour les captures : ${os.tmpdir()}`,
  );
  process.exit(1);
}

console.log(
  'Lien de connexion : ouvert au bon endroit il ouvre la session, ouvert ailleurs il le dit, ' +
    'et une URL portant des jetons valides ne fait plus basculer de compte.',
);
