// Le chemin du compte, joué en entier contre une vraie stack et de vrais e-mails.
//
// **Depuis le 20/09/2026 le produit n'envoie plus de lien, mais un code à huit chiffres**, et ce
// script a changé de sujet avec lui (il s'appelait `verifier-lien-de-connexion.mjs`). Le
// remplacement n'est pas cosmétique : dans l'e-mail de rattachement, le lien ÉTAIT la faille — un
// `GET /auth/v1/verify` confirme l'adresse côté serveur avant toute redirection, donc n'importe qui
// recevant cet e-mail rattachait son adresse au compte d'un inconnu d'un seul clic, et le passage en
// PKCE n'y changeait rien (il protège la session, pas la confirmation).
//
// ── Ce que chaque assertion garde, et pourquoi aucune ne remplace une autre ───────────────────────
//
//   1. **Le rattachement par code marche**, du champ d'adresse jusqu'à une session non anonyme
//      portant l'adresse — **en passant par la reprise depuis « Toi »**, c'est-à-dire en quittant
//      l'écran de code entre l'envoi et la saisie. C'est le produit : s'il tombe, plus personne ne
//      peut se rattacher ; et si la reprise tombe, une adresse reste en attente sans moyen de la
//      confirmer, ce qui est un cul-de-sac.
//   2. **La reconnexion par code depuis un navigateur NEUF marche.** C'est le cas que le lien ne
//      pouvait pas faire — en PKCE il ne valait que dans le navigateur qui l'avait demandé, donc un
//      bilan fait sur un ordinateur et un e-mail lu sur un téléphone ne se rejoignaient jamais.
//   3. **Un code de rattachement ne vaut pas dans le flux de connexion.** Mesuré à l'API
//      (`403 otp_expired` dans les deux sens) et gardé ici à l'écran : c'est ce qui rend sûr de
//      montrer le même écran de code dans les deux contextes.
//   4. **Aucun des deux e-mails ne porte de lien.** L'assertion la plus courte et la seule qui
//      ferme §4.3 par construction : tant qu'un lien y est, un clic confirme.
//   5. **Une URL portant des jetons valides ne fait pas basculer la session.** Elle ne concerne pas
//      le code : elle garde PKCE, que le scheme `ramille://` expose encore (il est BROWSABLE, donc
//      n'importe quelle page web du téléphone peut l'ouvrir). Le chemin reste, comme filet.
//   6. **Les deux branches de `/connexion/email` sont indistinguables à l'écran** (arbitrage du
//      21/09/2026, `v1-28` §7.1). L'écran envoie un code que l'adresse soit libre ou déjà prise, au
//      lieu d'annoncer « cette adresse a déjà un compte ». Le mécanisme ne suffit pas : si un seul
//      mot suivait la branche, l'oracle se rouvrirait par le texte. On compare donc les textes
//      visibles, adresse masquée — puis on vérifie que la branche « prise » ramène bien au compte
//      **existant**, sans quoi l'écran serait indistinguable et ne mènerait nulle part.
//
// ── Ce qu'il ne peut pas garder, et il faut le savoir ─────────────────────────────────────────────
//
// **Le code est un porteur.** Mesuré le 20/09/2026 : un `POST /auth/v1/verify` avec le jeton et
// AUCUNE session confirme l'adresse et rend une session complète sur le compte du demandeur. Le
// code n'est donc pas un jumeau du vérifieur PKCE — il ne referme pas §4.3, il en relève le prix
// (un clic devient huit chiffres à recopier dans une app qu'il faut trouver). Aucune assertion ne
// peut prétendre le contraire, et la dette est consignée en `v1-27` §12.12.
//
// ── Les mutations qui le font tomber, datées (TESTING.md §1.1) ────────────────────────────────────
//
// Jouées le 20/09/2026 :
//   - `verifierLeCode` envoie toujours `type: 'email'` → l'assertion **1** tombe (le rattachement
//     n'aboutit pas) et la **3** aussi (les deux flux se croisent).
//   - `{{ .Token }}` remplacé par `{{ .ConfirmationURL }}` dans un gabarit de
//     `supabase/templates/` → l'assertion **4** tombe, et celle du flux correspondant avec elle.
//   - `suiteDeLaDemandeDeCode` rend `message` sur `otp_disabled` → l'assertion **2** tombe : l'écran
//     de code ne s'ouvre plus, donc la non-divulgation devient visible de l'extérieur.
//   - `flowType: 'pkce'` retiré de `src/lib/supabase.ts` → l'assertion **5** tombe.
//   - le champ de code reprend un `maxLength` → l'assertion **1** tombe sur le collé, en nommant le
//     nombre de chiffres retenus (mutation jouée le 21/09/2026, après que la revue a trouvé le
//     défaut : le collé perdait des chiffres là où la frappe passait).
//   - `verifierLeCode` relit `session.email` au lieu de l'adresse en attente → rien ne tombe ici,
//     c'est `src/types/compte.test.ts` qui le garde ; noté pour qu'on ne cherche pas ici.
//   - la reprise de `/connexion/email?reprise=1` n'ouvre plus la saisie → l'assertion **1** tombe
//     sur sa branche de reprise, et c'est un cul-de-sac qu'elle garde : une adresse en attente sans
//     moyen de la confirmer.
//
// Jouées le 21/09/2026, sur l'assertion 6 :
//   - `corpsDeLaSaisie` ou `messageDuRenvoi` reprend un paramètre de **flux** au lieu de la voix →
//     l'assertion **6** tombe en imprimant les deux textes côte à côte, donc en nommant le mot qui
//     trahit.
//   - `consequenceDeLaSaisie` rend `null` en voix `parti` → la seconde moitié de **6** tombe : la
//     personne basculerait de compte sans avoir été prévenue.
//   - la branche `bascule` de `/connexion/email` remise sur l'écran de collision → **6** tombe dès
//     le premier `waitFor` du champ de code, sur l'adresse prise.
//
// **Et une mutation qui ne fait rien tomber**, à connaître avant de croire une garde verte :
// modifier un gabarit de `supabase/templates/` **sans redémarrer la stack**. GoTrue les inline au
// démarrage du conteneur, donc l'e-mail envoyé ne change pas. Il faut `supabase stop && start` pour
// que l'assertion 4 soit réellement éprouvée — mesuré le 20/09/2026, en jouant justement cette
// mutation et en la croyant d'abord inoffensive.
//
// **Et un piège du harnais lui-même** : restaurer la source après une mutation ne suffit pas, il
// faut **reconstruire l'export**. Sans ça, `dist/` porte encore la mutation précédente et une
// assertion tombe pour une raison qui n'a rien à voir (relevé le même jour, sur l'assertion 5).
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
 * Le dernier e-mail reçu par cette adresse : son code, et s'il porte un lien.
 *
 * On relit jusqu'à ce que le message arrive : GoTrue répond avant que le SMTP ait fini, et
 * attendre une durée fixe serait soit trop long soit intermittent.
 *
 * **Le lien est relevé pour pouvoir affirmer son absence.** C'est l'assertion 4, et elle est la
 * seule qui ferme §4.3 par construction — un gabarit qui reprendrait `{{ .ConfirmationURL }}`
 * rouvrirait la porte sans rien casser d'autre.
 */
async function dernierCourrielRecu(adresse, depuis = 0) {
  for (let essai = 0; essai < 60; essai += 1) {
    const liste = await messagesDe(adresse);
    if (liste.length > depuis) {
      const message = await fetch(`${BOITE}/api/v1/message/${liste[0].ID}`).then((r) => r.json());
      const corps = `${message.HTML ?? ''}${message.Text ?? ''}`;
      const lien = corps
        .replace(/&amp;/g, '&')
        .match(/https?:\/\/[^\s"'<>]+/g)
        ?.find((u) => u.includes('/auth/v1/verify'));
      // Le gabarit met le code dans un paragraphe à interlettrage 6 ; le repli sur « huit chiffres
      // isolés » garde l'assertion vivante si le style change, et refuse un code plus court —
      // c'est `mailer_otp_length` des deux côtés qui décide, et rien ici ne peut le vérifier.
      const code =
        corps.match(/letter-spacing:6px[^>]*>\s*(\d{4,10})\s*</)?.[1] ??
        corps.match(/\b(\d{8})\b/)?.[1] ??
        null;
      if (!code) throw new Error(`Message reçu sans code : ${corps.slice(0, 300)}`);
      return { code, lien: lien ?? null, sujet: message.Subject ?? '' };
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
 * Demande un code **depuis l'écran du produit**, et rend l'e-mail reçu.
 *
 * Par l'écran et pas par l'API : c'est le seul moyen d'éprouver ce que la personne traverse — le
 * garde d'adresse, le libellé du bouton, la phase qui s'ouvre. Deux hôtes, deux champs, et le
 * champ se désigne par son nom accessible (`accessibilityLabel` → `aria-label`), comme dans
 * `verifier-parcours-reel.mjs` : c'est le seul nom qui ne dépend pas de la mise en page.
 *
 * **Une adresse par appel, jamais deux codes pour la même à moins d'une minute** : le distant
 * porte `smtp_max_frequency = 60`, et `supabase/config.toml` l'a rejoint le 20/09/2026 — un
 * second envoi rapproché répond `over_email_send_rate_limit`, c'est-à-dire un échec que la
 * production opposerait aussi.
 */
async function demanderUnCode(page, base, adresse, flux) {
  const avant = await compterLesMessages(adresse);
  const chemin =
    flux === 'rattachement' ? '/connexion/email' : '/connexion/retrouver?source=onboarding';
  const nomDuChamp = flux === 'rattachement' ? 'Email' : 'Adresse email du compte';
  await page.goto(`${base}${chemin}`, { waitUntil: 'domcontentloaded' });
  const champ = page.getByRole('textbox', { name: nomDuChamp });
  await champ.waitFor({ state: 'visible', timeout: 20000 });
  await champ.fill(adresse);
  await page.getByRole('button', { name: 'Recevoir un code', exact: true }).click();
  return dernierCourrielRecu(adresse, avant);
}

/**
 * La session de la page une fois qu'elle n'est plus anonyme.
 *
 * **`attendreUnChangementDeSession` ne convient pas au rattachement**, et s'en servir était un
 * défaut de cette garde : le rattachement garde le **même** `user_id`, donc il n'y a aucun
 * identifiant à voir changer. Appelée avec `null` pour repère, sa boucle rendait dès la première
 * lecture — n'importe quel identifiant diffère de `null` —, donc l'attente était **inerte** et
 * l'assertion ne passait que grâce au `networkidle` qui la précède (relevé en revue le 21/09/2026).
 * Ce qui bascule au rattachement est `is_anonymous` : c'est lui qu'on attend.
 */
async function attendreUneSessionPermanente(page, ms = 12000) {
  const fin = Date.now() + ms;
  let vu = null;
  while (Date.now() < fin) {
    vu = await utilisateurDeLaPage(page, 1);
    if (vu && vu.anonyme === false) return vu;
    await new Promise((r) => setTimeout(r, 250));
  }
  return vu;
}

/**
 * Colle le code sur l'écran de saisie et valide.
 *
 * **Un collé et non une frappe, et ce n'est pas un détail de confort.** `fill` écrit la valeur du
 * DOM et contourne tout ce que le navigateur applique à une saisie ; `insertText` produit **un
 * seul** événement d'entrée, c'est-à-dire exactement ce qu'un collé produit. La différence a caché
 * un vrai défaut jusqu'au 21/09/2026 : le champ portait un `maxLength`, qui tronque la saisie
 * **brute** avant que la dérivation n'ait retiré les espaces — donc un collé de « 847 924 69 » ne
 * laissait que six chiffres, bouton inerte et aucun message, tandis que la frappe marchait (chaque
 * espace est rejeté avant d'atteindre la limite). `avecEspaces` rejoue le cas de la messagerie.
 */
async function taperLeCode(page, code, libelleBouton, { avecEspaces = false } = {}) {
  const champ = page.getByRole('textbox', { name: /Code reçu par email/ });
  await champ.waitFor({ state: 'visible', timeout: 20000 });
  await champ.click();
  const colle = avecEspaces ? code.replace(/(\d{3})(\d{3})(\d{2})/, '$1 $2 $3') : code;
  await page.keyboard.insertText(colle);
  const retenu = await champ.inputValue();
  verifier(
    retenu.length === code.length,
    `le champ n'a gardé que ${retenu.length} chiffres d'un collé de « ${colle} » — un code recopié depuis une messagerie ne peut pas être saisi`
  );
  // Le dernier chiffre déclenche la vérification tout seul ; le bouton est là pour qui colle ou
  // corrige, et le toucher deux fois est sans effet (verrou en `ref`). On le touche quand il est
  // encore actif, sinon la vérification automatique a déjà pris la main.
  const bouton = page.getByRole('button', { name: new RegExp(libelleBouton), exact: false });
  await bouton.click({ timeout: 4000 }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
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
  // ── 1. Le rattachement par code, du champ d'adresse à la session permanente ──────────────────
  etape = 'rattachement par code';
  const adresseA = `code-a-${marque}@test.local`;

  const contexteA = await navigateur.newContext({ viewport: { width: 420, height: 900 }, locale: 'fr-FR' });
  const pageA = await contexteA.newPage();
  const courrielA = await demanderUnCode(pageA, serveur.base, adresseA, 'rattachement');
  const anonymeA = await utilisateurDeLaPage(pageA);
  verifier(anonymeA?.anonyme === true, 'la session de départ n’est pas anonyme : le rattachement n’éprouve rien');

  // **La reprise depuis « Toi », jouée dans le même souffle** — parce que c'est le cas où l'écran
  // de code a le plus de chances d'avoir disparu : sur web, aller chercher le code dans sa
  // messagerie peut emporter l'onglet. L'écran de rattachement relit l'adresse en local et
  // s'ouvre **directement** sur la saisie, sans renvoyer de code (celui qui est déjà dans la boîte
  // vaut encore, et le distant n'accepte de toute façon qu'un envoi par minute et par adresse).
  //
  // Sans cette assertion, la phrase du pied de l'écran de code — « ton adresse reste gardée ici :
  // tu peux reprendre depuis “Toi” » — serait une promesse que rien ne garde, et son échec est un
  // cul-de-sac : une adresse en attente, aucun moyen de la confirmer.
  await pageA.goto(`${serveur.base}/connexion/email?reprise=1`, { waitUntil: 'domcontentloaded' });
  const champRepris = pageA.getByRole('textbox', { name: /Code reçu par email/ });
  const repriseOuverte = await champRepris
    .waitFor({ state: 'visible', timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  verifier(
    repriseOuverte,
    'la reprise depuis « Toi » n’ouvre pas la saisie du code : l’adresse reste en attente sans moyen de la confirmer',
  );

  // Collé **avec des espaces**, comme une messagerie le rend : c'est la forme qui a échoué.
  await taperLeCode(pageA, courrielA.code, 'Valider mon code', { avecEspaces: true });
  const sessionA = await attendreUneSessionPermanente(pageA);
  verifier(sessionA !== null, 'aucune session après avoir tapé le code de rattachement');
  verifier(
    sessionA?.id === anonymeA?.id,
    `le rattachement a changé de compte (${anonymeA?.id ?? 'rien'} → ${sessionA?.id ?? 'rien'}) : le bilan déjà en base est perdu`,
  );
  verifier(
    sessionA?.anonyme === false,
    'la session est encore anonyme après le code : l’adresse n’a pas été confirmée',
  );

  // La base a le dernier mot : c'est elle qui porte l'adresse, pas le stockage du navigateur.
  const rattache = await fetch(`${API}/auth/v1/admin/users/${anonymeA?.id}`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  }).then((r) => r.json());
  verifier(
    rattache?.email === adresseA,
    `la base ne porte pas l’adresse rattachée : ${rattache?.email ?? 'rien'} au lieu de ${adresseA}`,
  );

  // ── 2. La reconnexion par code depuis un navigateur NEUF ─────────────────────────────────────
  //
  // C'est le cas que le lien ne pouvait pas faire : en PKCE il ne valait que dans le navigateur
  // qui l'avait demandé, donc le bilan fait sur un ordinateur et l'e-mail lu sur un téléphone ne
  // se rejoignaient jamais. Un compte confirmé d'avance, comme quelqu'un qui revient.
  etape = 'reconnexion depuis un navigateur neuf';
  const adresseB = `code-b-${marque}@test.local`;
  const idB = await creerUnCompte(adresseB);

  const contexteB = await navigateur.newContext({ viewport: { width: 420, height: 900 }, locale: 'fr-FR' });
  const pageB = await contexteB.newPage();
  const courrielB = await demanderUnCode(pageB, serveur.base, adresseB, 'connexion');
  const avantB = await utilisateurDeLaPage(pageB);
  await taperLeCode(pageB, courrielB.code, 'Retrouver mon compte');
  const apresB = await attendreUnChangementDeSession(pageB, avantB?.id ?? null, 12000);
  verifier(
    apresB?.id === idB,
    `le code n’a pas rouvert le compte : ${apresB?.id ?? 'rien'} au lieu de ${idB}`,
  );
  verifier(apresB?.anonyme === false, 'la session rouverte est anonyme : ce n’est pas le compte');

  // ── 3. Un code de rattachement ne vaut pas dans le flux de connexion ─────────────────────────
  //
  // Mesuré à l'API dans les deux sens (`403 otp_expired`), gardé ici **à l'écran** : c'est ce qui
  // rend sûr de montrer le même écran de code dans les deux contextes, et donc de ne rien
  // divulguer sur l'adresse.
  etape = 'les deux flux ne se croisent pas';
  const adresseC = `code-c-${marque}@test.local`;

  const contexteC = await navigateur.newContext({ viewport: { width: 420, height: 900 }, locale: 'fr-FR' });
  const pageC = await contexteC.newPage();
  const courrielC = await demanderUnCode(pageC, serveur.base, adresseC, 'rattachement');
  const avantC = await utilisateurDeLaPage(pageC);

  // Le même code, présenté au flux qui n'est pas le sien, sur un navigateur neuf.
  const contexteD = await navigateur.newContext({ viewport: { width: 420, height: 900 }, locale: 'fr-FR' });
  const pageD = await contexteD.newPage();
  await pageD.goto(`${serveur.base}/connexion/retrouver?source=onboarding`, { waitUntil: 'domcontentloaded' });
  const champD = pageD.getByRole('textbox', { name: 'Adresse email du compte' });
  await champD.waitFor({ state: 'visible', timeout: 20000 });
  await champD.fill(adresseC);
  await pageD.getByRole('button', { name: 'Recevoir un code', exact: true }).click();
  const avantD = await utilisateurDeLaPage(pageD);

  // **La non-divulgation, nommée plutôt que subie.** Cette adresse n'a aucun compte confirmé :
  // `signInWithOtp` répond `422 otp_disabled` et rien ne part. L'écran doit quand même ouvrir la
  // saisie du code — sinon il dit de l'extérieur si telle adresse utilise Ramille, ce que la règle
  // interdit. Sans cette assertion, le défaut se manifestait par un timeout trois lignes plus bas,
  // c'est-à-dire par un message qui ne nomme pas la promesse cassée (relevé en mutant
  // `suiteDeLaDemandeDeCode` le 20/09/2026).
  const champDuCode = pageD.getByRole('textbox', { name: /Code reçu par email/ });
  const saisieOuverte = await champDuCode
    .waitFor({ state: 'visible', timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  if (!saisieOuverte) {
    const vu = await pageD.locator('body').innerText();
    verifier(
      false,
      `une adresse sans compte n’ouvre pas la saisie du code : l’écran dit si l’adresse existe — texte vu : « ${vu.replace(/\s+/g, ' ').slice(0, 200)} »`,
    );
  }

  await taperLeCode(pageD, courrielC.code, 'Retrouver mon compte');
  const apresD = await attendreUnChangementDeSession(pageD, avantD?.id ?? null, 6000);
  verifier(
    apresD?.id === avantD?.id,
    `un code de rattachement a ouvert une session dans le flux de connexion (${avantD?.id ?? 'rien'} → ${apresD?.id ?? 'rien'})`,
  );
  verifier(
    apresD?.id !== avantC?.id,
    'le code de rattachement a livré la session de celui qui l’avait demandé, à quelqu’un d’autre',
  );
  const texteD = await pageD.locator('body').innerText();
  verifier(
    /ce code ne marche pas/i.test(texteD),
    `le refus n’est pas dit à la personne — texte vu : « ${texteD.replace(/\s+/g, ' ').slice(0, 200)} »`,
  );

  // ── 4. Aucun des deux e-mails ne porte de lien ───────────────────────────────────────────────
  //
  // L'assertion la plus courte du fichier, et la seule qui ferme §4.3 par construction : tant
  // qu'un lien est dans l'e-mail de rattachement, un clic confirme l'adresse côté serveur — même
  // depuis un navigateur incapable de finir l'échange, et donc même chez quelqu'un qui n'a rien
  // demandé.
  etape = 'aucun lien dans les e-mails';
  verifier(
    courrielA.lien === null,
    `l’e-mail de rattachement porte encore un lien de vérification : ${courrielA.lien?.slice(0, 90)}`,
  );
  verifier(
    courrielB.lien === null,
    `l’e-mail de reconnexion porte encore un lien de vérification : ${courrielB.lien?.slice(0, 90)}`,
  );
  verifier(
    courrielA.code.length === 8 && courrielB.code.length === 8,
    `un code ne fait pas huit chiffres (${courrielA.code.length} et ${courrielB.code.length}) : mailer_otp_length a bougé d’un côté sans l’autre`,
  );

  // ── 5. Une session injectée par l'URL n'est plus acceptée ────────────────────────────────────
  //
  // Elle ne concerne pas le code : elle garde PKCE, que le scheme `ramille://` expose encore (il
  // est BROWSABLE, donc n'importe quelle page web du téléphone peut l'ouvrir). Les jetons sont de
  // **vrais** jetons, obtenus comme un attaquant les obtiendrait : il ouvre sa propre session et
  // lit son stockage. Un jeton fabriqué ne prouverait que le refus d'un jeton fabriqué — et c'est
  // la session du compte B, rouverte par code à l'assertion 2, qui les fournit.
  etape = 'session injectée par l’URL';
  const idC = idB;

  const jetonsC = await pageB.evaluate(() => {
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
    const contexteE = await navigateur.newContext({ viewport: { width: 420, height: 900 }, locale: 'fr-FR' });
    const pageE = await contexteE.newPage();
    // La victime ouvre l'app une première fois : elle a sa propre session anonyme, c'est elle
    // qu'on ne doit pas perdre.
    //
    // **On attend que l'app ait fini de se router avant d'injecter**, et ce n'est pas de la
    // prudence : la racine redirige côté client vers `/onboarding` ou `/plan`, et une navigation
    // lancée pendant ce trajet est **emportée par la redirection**, fragment compris. Mesuré le
    // 20/09/2026 : l'assertion d'injection restait verte même avec le flux implicite remis,
    // parce que l'attaque n'avait tout simplement pas lieu. Une garde qui passe faute d'attaque
    // est pire qu'une garde absente — elle dit le contraire de ce qu'elle mesure.
    await pageE.goto(`${serveur.base}/`, { waitUntil: 'domcontentloaded' });
    await pageE.waitForURL((u) => new URL(u).pathname !== '/', { timeout: 20000 }).catch(() => {});
    await pageE.waitForLoadState('networkidle').catch(() => {});
    const avantE = await utilisateurDeLaPage(pageE);
    verifier(avantE !== null, 'la victime n’a pas de session de départ : le scénario d’injection ne veut rien dire');

    await pageE.goto(
      `${serveur.base}/#access_token=${jetonsC.access_token}&refresh_token=${jetonsC.refresh_token}&token_type=bearer&expires_in=3600&type=magiclink`,
      { waitUntil: 'domcontentloaded' },
    );
    await pageE.waitForLoadState('networkidle').catch(() => {});

    // **On attend un CHANGEMENT, on ne relit pas « une » session** — voir l'en-tête : appelée
    // juste après la navigation, la lecture ramenait l'ancienne session et l'assertion passait
    // pour la mauvaise raison, faille grande ouverte.
    const apresE = await attendreUnChangementDeSession(pageE, avantE?.id ?? null);
    // `TRACE_LIEN=1` imprime les trois identifiants et l'URL finale. C'est ce qui a permis de
    // voir que l'injection n'avait pas lieu, là où la seule lecture des assertions disait
    // « tout va bien » — on le garde pour la prochaine fois.
    if (process.env.TRACE_LIEN) {
      console.log(`   [trace] idC=${idC} avantE=${avantE?.id} apresE=${apresE?.id} url=${pageE.url().slice(0, 90)}`);
    }
    verifier(
      apresE?.id !== idC,
      'une URL portant des jetons a fait basculer l’app sur le compte de quelqu’un d’autre — la faille est ouverte',
    );
    verifier(
      apresE?.id === avantE?.id,
      `la session de la personne a changé sans son geste (${avantE?.id ?? 'rien'} → ${apresE?.id ?? 'rien'})`,
    );
    await contexteE.close();
  }

  // ── 6. Les deux branches de /connexion/email sont indistinguables ────────────────────────────
  //
  // **C'est l'assertion de l'arbitrage du 21/09/2026** (`v1-28` §7.1). L'écran envoie désormais un
  // code dans les deux cas — rattachement si l'adresse est libre, connexion si elle est prise — au
  // lieu d'annoncer « cette adresse a déjà un compte ». Le mécanisme ne suffit pas : si **un seul
  // mot** de l'écran suivait la branche, l'oracle qu'on ferme par l'envoi se rouvrirait par le
  // texte, et c'est exactement le piège que ce chantier avait à éviter.
  //
  // On compare donc les **textes visibles** des deux écrans, l'adresse masquée. Une adresse dédiée
  // est créée par l'API d'administration plutôt que de réutiliser celle du flux 1 : celle-là a déjà
  // reçu un e-mail, et `smtp_max_frequency` (60 s) ferait échouer le second envoi pour une raison
  // étrangère — le genre de faux rouge qui coûte une heure.
  etape = 'les deux branches ne se distinguent pas';
  const adresseF = `code-f-${marque}@test.local`;
  const idF = await creerUnCompte(adresseF);
  const adresseLibre = `code-g-${marque}@test.local`;

  const texteDeLaSaisie = async (page, adresse) => {
    await page.getByRole('textbox', { name: /Code reçu par email/ }).waitFor({ state: 'visible', timeout: 20000 });
    const brut = await page.locator('body').innerText();
    // L'adresse elle-même diffère forcément : c'est celle que la personne a tapée, pas une réponse
    // du serveur. On la masque pour comparer tout le reste.
    return brut.replace(new RegExp(adresse, 'g'), '<adresse>').trim();
  };

  const contexteF = await navigateur.newContext({ viewport: { width: 420, height: 900 }, locale: 'fr-FR' });
  const pageF = await contexteF.newPage();
  const courrielF = await demanderUnCode(pageF, serveur.base, adresseF, 'rattachement');
  const ecranPris = await texteDeLaSaisie(pageF, adresseF);

  const contexteG = await navigateur.newContext({ viewport: { width: 420, height: 900 }, locale: 'fr-FR' });
  const pageG = await contexteG.newPage();
  await demanderUnCode(pageG, serveur.base, adresseLibre, 'rattachement');
  const ecranLibre = await texteDeLaSaisie(pageG, adresseLibre);

  verifier(
    ecranPris === ecranLibre,
    `l’écran de code trahit si l’adresse a un compte — l’oracle est rouvert par le texte.\n` +
      `      adresse prise : ${JSON.stringify(ecranPris.slice(0, 240))}\n` +
      `      adresse libre : ${JSON.stringify(ecranLibre.slice(0, 240))}`,
  );
  verifier(
    ecranPris.includes('S’il existait déjà un compte'),
    'la phrase conditionnelle a disparu : la personne bascule de compte sans avoir été prévenue',
  );

  // Et la branche prise fait bien ce qu'elle promet : le code ramène au compte EXISTANT, pas à un
  // nouveau. Sans cette moitié, l'écran pourrait être indistinguable et ne mener nulle part.
  await taperLeCode(pageF, courrielF.code, 'Valider mon code');
  const sessionF = await attendreUneSessionPermanente(pageF);
  verifier(
    sessionF?.id === idF,
    `le code d’une adresse déjà prise n’a pas ramené à son compte (${sessionF?.id ?? 'rien'} au lieu de ${idF})`,
  );

  await contexteF.close();
  await contexteG.close();

  await contexteA.close();
  await contexteB.close();
  await contexteC.close();
  await contexteD.close();
} catch (erreur) {
  ecarts.push(`[${etape}] exception : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
} finally {
  await navigateur.close();
  serveur.fermer();
}

if (ecarts.length > 0) {
  console.error('Le chemin du compte ne fait pas ce qu’il promet :\n');
  for (const ecart of ecarts) console.error(`  - ${ecart}`);
  console.error(
    `\nLes six assertions ne se remplacent pas : 1 et 2 sont le produit (rattacher, retrouver),\n` +
      `3 est ce qui rend sûr de montrer le même écran dans les deux flux, 4 est la faille fermée par\n` +
      `construction, 5 garde PKCE, et 6 garde que l'écran de code ne trahit pas si l'adresse a un\n` +
      `compte. Détail en tête de ce fichier.\n` +
      `Dossier temporaire pour les captures : ${os.tmpdir()}`,
  );
  process.exit(1);
}

console.log(
  'Chemin du compte : le code rattache une adresse et rouvre un compte depuis un navigateur neuf, ' +
    'un code d’un flux ne vaut pas dans l’autre, aucun e-mail ne porte de lien, ' +
    'une URL portant des jetons valides ne fait pas basculer de compte, ' +
    'et l’écran de code ne dit pas si l’adresse a déjà un compte.',
);
