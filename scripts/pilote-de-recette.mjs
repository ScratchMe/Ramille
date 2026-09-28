#!/usr/bin/env node
// Le pilote d'une recette web jouée par l'agent — deux navigateurs gardés ouverts d'une commande à
// l'autre, pilotés par HTTP local (RECETTE.md §1.9 et §2.6).
//
//   node scripts/pilote-de-recette.mjs [dossier-des-captures]     # en arrière-plan
//   curl -s --noproxy '*' -X POST --data-binary @etape.js http://127.0.0.1:47123/
//
// **Pourquoi un serveur et pas un script par étape.** Une séance de recette dure une heure et
// s'interrompt : on attend un e-mail, une minute de limite d'envoi, une décision. Un script par
// étape perdrait les sessions entre deux appels ; ici chaque « fenêtre » est un contexte de
// navigateur qui vit jusqu'à l'arrêt du pilote. Deux navigateurs, A et B, parce que les feuilles de
// Ramille en demandent deux (RECETTE.md §2.3 et la feuille elle-même) — et, contrairement aux fenêtres
// privées d'un Chrome réel, deux contextes ne partagent **jamais** leur stockage.
//
// Le corps de chaque requête est le corps d'une fonction `async (S) => { … }`, et ce qu'elle rend
// revient en JSON, avec les erreurs de console de la page. `S` porte :
//   - `S.nouvelle(nom, 'A' | 'B')` — une fenêtre neuve, qui ferme d'abord les autres fenêtres du même
//     navigateur, comme la feuille le demande ;
//   - `S.page(nom)`, `S.texte(nom)` — la page, et son texte visible ;
//   - `S.shot(nom, fichier)` — une capture de la fenêtre, dans le dossier des captures ;
//   - `S.attendre(ms)` — une attente côté pilote, pour la minute de limite d'envoi par exemple.
// Tout ce qu'une étape ajoute à `S` (une fonction d'aide, un repère) reste pour les suivantes.
//
// **Deux prérequis de l'environnement d'agent, et le premier ne se voit qu'à l'usage :**
//   - le magasin de certificats du Chromium (`sql:$HOME/.pki/nssdb`) doit connaître l'autorité du
//     proxy de sortie, sans quoi chaque page rend `ERR_CERT_AUTHORITY_INVALID` alors que `curl`
//     passe — il était **vide** le 28/09/2026 malgré ce qu'annonce le README du proxy ;
//   - Chromium est celui de l'image (`/opt/pw-browsers/chromium`), le Playwright du dépôt en
//     réclamant un autre.
// La marche à suivre est en RECETTE.md §2.6. On ne coupe jamais la vérification TLS pour avancer.
//
// **L'arrêter** : par l'identifiant de la tâche d'arrière-plan. Surtout pas par `pkill -f` sur son
// nom, qui tue le shell qui le lance (CLAUDE.md, « Lire un échec avant d'y répondre »).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const CAPTURES = path.resolve(process.argv[2] ?? 'captures-de-recette');
const PORT = 47123;
const CHROMIUM = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';

fs.mkdirSync(CAPTURES, { recursive: true });

const proxy = process.env.HTTPS_PROXY ? new URL(process.env.HTTPS_PROXY) : null;
const lancer = () =>
  chromium.launch({
    executablePath: fs.existsSync(CHROMIUM) ? CHROMIUM : undefined,
    proxy: proxy ? { server: `${proxy.protocol}//${proxy.host}` } : undefined,
  });

const S = {
  A: await lancer(),
  B: await lancer(),
  fenetres: {},
  journal: [],
  async nouvelle(nom, navigateur, { viewport = { width: 412, height: 915 } } = {}) {
    for (const [autre, fenetre] of Object.entries(this.fenetres)) {
      if (fenetre.navigateur === navigateur) {
        await fenetre.contexte.close();
        delete this.fenetres[autre];
      }
    }
    const contexte = await this[navigateur].newContext({
      viewport,
      locale: 'fr-FR',
      timezoneId: 'Europe/Paris',
      acceptDownloads: true,
    });
    const page = await contexte.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error') this.journal.push(`[${nom}] console : ${m.text().slice(0, 300)}`);
    });
    page.on('pageerror', (e) => this.journal.push(`[${nom}] erreur : ${String(e).slice(0, 300)}`));
    this.fenetres[nom] = { contexte, page, navigateur };
    return page;
  },
  page(nom) {
    return this.fenetres[nom].page;
  },
  async texte(nom) {
    return (await this.page(nom).innerText('body')).replace(/\n{2,}/g, '\n');
  },
  async shot(nom, fichier) {
    const chemin = path.join(CAPTURES, `${fichier}.png`);
    await this.page(nom).screenshot({ path: chemin });
    return chemin;
  },
  attendre: (ms) => new Promise((fin) => setTimeout(fin, ms)),
};

const FonctionAsynchrone = Object.getPrototypeOf(async () => {}).constructor;

http
  .createServer((requete, reponse) => {
    let corps = '';
    requete.on('data', (morceau) => (corps += morceau));
    requete.on('end', async () => {
      S.journal = [];
      try {
        const resultat = await new FonctionAsynchrone('S', corps)(S);
        reponse.end(JSON.stringify({ ok: true, resultat, journal: S.journal }, null, 1));
      } catch (erreur) {
        reponse.end(JSON.stringify({ ok: false, erreur: String(erreur).slice(0, 2000), journal: S.journal }, null, 1));
      }
    });
  })
  .listen(PORT, '127.0.0.1', () => console.log(`pilote prêt sur 127.0.0.1:${PORT}, captures dans ${CAPTURES}`));
