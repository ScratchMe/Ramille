// Refuse un export web qui se construit parfaitement mais ne s'affiche pas.
//
// **Le trou que ce script bouche.** Les deux autres gardes lisent le HTML produit : elles
// vérifient qu'il existe et qu'il porte un titre. Aucune ne l'exécute. Le 08/09/2026, un hook
// natif appelé sans condition dans le layout racine (`useLastNotificationResponse`, absent du
// module web) a levé pendant le rendu et fait tomber tout l'arbre React : page blanche sur
// **toutes** les routes, pages légales comprises — pendant que la CI était verte, les vingt
// pages sorties avec leur titre et le HTML servi en 200. Rien, nulle part, ne pouvait le voir.
//
// La classe de défaut se reproduira : chaque module natif qui entre dans le projet apporte des
// méthodes absentes de sa version web, et une exception au rendu du layout racine n'a aucun
// effet local — elle emporte l'app entière.
//
// Trois vérifications par route, et la première est la plus importante :
//
//   1. **La page affiche quelque chose de reconnaissable.** C'est ce qui attrape la page
//      blanche quelle que soit la cause, sans dépendre de la façon dont React classe l'erreur.
//   2. **Aucun écran de panne.** Depuis le chantier C0.4, `src/app/_layout.tsx` exporte un
//      `ErrorBoundary` : une exception de rendu n'efface plus la page, elle affiche un écran.
//      C'est un progrès pour la personne qui l'utilise et une perte pour ce garde-fou — React
//      ne signale plus en `pageerror` ce qu'un boundary a rattrapé. Reconnaître les deux écrans
//      de panne (le nôtre, et celui d'Expo Router qui reste en anglais) rend au contrôle la
//      rigueur qu'il avait avant, sans renoncer au filet.
//   3. **Aucune exception non rattrapée**, hors erreurs d'hydratation (voir plus bas).
//
// S'y ajoutent deux contrôles sur `vercel.json`, parce que ce script **reproduit** la façon dont
// Vercel sert l'export (cf. `resoudre()` plus bas) et qu'un garde-fou qui ne sert pas comme la
// production teste autre chose : `cleanUrls` doit être là, et chaque fichier listé en
// `functions[*].includeFiles` doit exister. Ce second point est le seul contrôle du dépôt qui
// regarde l'empaquetage des Vercel Functions — `hb.wasm` y est désigné par un chemin en dur vers
// une dépendance transitive de `satori`, et sa disparition ne produit **aucune** erreur de build :
// l'échec arrive à l'exécution, en `ENOENT` derrière un `FUNCTION_INVOCATION_FAILED` générique.
//
// Ce qui n'est PAS vérifié ici, volontairement : le réseau. L'export de CI est construit avec
// une configuration Supabase factice, donc chaque page échoue à joindre la base — les erreurs
// de console sont attendues et ne font pas échouer ce contrôle. On teste le rendu, pas les
// données.
//
// Lancé en CI après `expo export`, cf. .github/workflows/ci.yml.
import { existsSync, readFileSync } from 'node:fs';

import { chromium } from 'playwright';

import { servirExport } from './servir-export.mjs';

const DIST = process.argv[2] ?? 'dist';

// Un marqueur par route : un fragment de texte qui doit figurer dans la page. Choisis dans du
// contenu stable — un titre de section, une phrase de Ramille — jamais un libellé décoratif qui
// bougera au prochain ajustement de copie.
//
// **Le marqueur ne prouve pas que l'app a démarré**, et c'est important pour la suite : l'export
// pré-rend le corps de chaque page, donc le texte est là avant que le bundle ne s'exécute. Il dit
// que la page rend le bon contenu ; c'est l'attente d'hydratation, plus bas, qui ouvre la fenêtre
// où une exception au montage peut être vue.
//
// `marqueur: null` là où le contenu **dépend du réseau** : la racine ouvre une session avant
// de router, et l'export de CI est construit avec une configuration Supabase factice — elle y
// affiche donc son écran d'échec de démarrage, ce qui est le comportement correct. Y épingler
// un texte reviendrait soit à figer une copie d'erreur, soit à faire échouer la CI pour une
// raison étrangère au rendu. La page doit seulement ne pas être vide, et c'est bien ce que ce
// garde-fou protège.
const ROUTES = [
  { chemin: '/', marqueur: null },
  { chemin: '/onboarding', marqueur: 'Moi, c’est Ramille' },
  { chemin: '/confidentialite', marqueur: 'Politique de confidentialité' },
  { chemin: '/conditions', marqueur: 'Conditions d’utilisation' },
  // Surface publique exigée par Google Play : elle doit s'afficher sans l'app et sans compte.
  { chemin: '/compte/suppression', marqueur: 'Supprimer mon compte' },
  // La sortie des rappels (C2.9), ouverte depuis une messagerie, sans session et parfois sans
  // l'app. Le marqueur est son titre visible, présent dans les quatre états : ouverte sans jeton —
  // ce que fait l'export — elle n'appelle rien, donc le rendu ne dépend pas du réseau.
  { chemin: '/rappels/stop', marqueur: 'Ne plus recevoir de rappels' },
  // Les écrans d'application, tous sans marqueur. La panne du 08/09/2026 était dans le layout
  // racine, donc les cinq routes ci-dessus la voyaient toutes — mais une exception confinée à
  // `(tabs)/_layout.tsx` ou à un écran d'onglet n'apparaîtrait sur aucune d'elles. Ces six-là
  // dépendent du réseau (l'export de CI porte une configuration Supabase factice) : seul « la
  // page n'est pas vide et ne lève pas » est vérifiable, et c'est précisément ce qui manque.
  { chemin: '/plan', marqueur: null },
  { chemin: '/suivi', marqueur: null },
  { chemin: '/suivi/bilan', marqueur: null },
  { chemin: '/bilan', marqueur: null },
  { chemin: '/compte', marqueur: null },
  { chemin: '/feedback', marqueur: null },
];

// Les deux écrans de panne, qu'aucune route ne doit afficher.
//
// `Something went wrong` est l'écran de secours d'Expo Router — en anglais, sur fond noir.
// Depuis C0.4, plus rien ne devrait l'afficher : notre `Try` est le seul de l'arbre (Expo Router
// 57 n'en monte un que là où une route exporte un `ErrorBoundary`), et une exception levée
// au-dessus de lui ne rend pas cet écran mais une page blanche — que le contrôle de page vide
// attrape. On garde la chaîne parce qu'elle redevient atteignable le jour où notre boundary
// disparaît, où une route est rendue hors de notre layout, ou si Expo Router monte à nouveau son
// propre filet. Le produit ne parle français qu'en français, y compris en panne.
//
// Le second est le titre de `src/components/erreur-inattendue.tsx`. **Les deux textes sont
// couplés à la main** : changer ce titre sans venir ici rendrait le contrôle aveugle, d'où le
// renvoi inverse écrit dans l'en-tête du composant.
const ECRANS_DE_PANNE = [
  { texte: 'Something went wrong', quoi: 'l’écran de secours d’Expo Router (en anglais)' },
  { texte: 'L’écran n’a pas pu s’afficher', quoi: 'l’écran d’erreur du produit' },
];

// Les erreurs d'hydratation sont signalées, jamais bloquantes. React reprend la main en
// rendant côté client : la page **s'affiche**, ce que le marqueur ci-dessus vérifie de toute
// façon. Les faire échouer ici rendrait le garde-fou inutilisable pour une raison qui n'a rien
// à voir avec ce qu'il protège — et il en existe une, connue, sur les pages légales : `APP_URL`
// vaut l'origine réelle côté client et le domaine de production côté serveur.
const HYDRATATION = /Minified React error #(418|421|422|423|425)\b|hydrat/i;

// Plafond d'attente par route, et repos ensuite — cf. leur usage plus bas. Six secondes, et pas
// une seconde et demie : c'est la fenêtre pendant laquelle une exception levée dans un effet, ou
// dans un écran monté après coup, peut encore arriver. Le repos se paie **par route**, donc le
// contrôle entier coûte à peu près six secondes fois la longueur de `ROUTES` — le compte ne
// s'écrit pas ici, il deviendrait faux à la route suivante et en silence (relevé le 17/09/2026 :
// il disait onze pour douze).
const ATTENTE_MAX = 20_000;
const REPOS = 6_000;

// Le serveur est celui de `servir-export.mjs` — extrait le 17/09/2026, quand le garde-fou des
// **états** a eu besoin du même. Sa `resoudre()` reproduit `cleanUrls`, et deux copies qui
// divergeraient feraient qu'un des deux scripts ne sert pas comme la production.
const { base, fermer } = await servirExport(DIST);

const echecs = [];
const avertissements = [];

// ── Ce que ce script reproduit de la production ────────────────────────────────────────────
// `cleanUrls` d'abord : sans lui, Vercel sert les routes en répertoire (`plan/index.html`) et
// renvoie 404 sur les routes en fichier plat (`suivi.html`) — la moitié de l'app, en silence.
// `resoudre()` ci-dessus sert les deux formes exprès, donc ce script ne verrait **pas** la panne
// que la disparition de `cleanUrls` provoquerait : il faut la lire dans le fichier.
const configVercel = JSON.parse(readFileSync('vercel.json', 'utf8'));

if (configVercel.cleanUrls !== true) {
  echecs.push(
    'vercel.json ne porte plus `cleanUrls: true`. Les routes sans enfants (/suivi,' +
      ' /confidentialite, /feedback, /suivi/bilan…) repasseraient en 404 en production, et ce' +
      ' garde-fou ne le verrait pas : il sert les deux formes de chemin exprès.',
  );
}

// Puis les assets des Functions. Un chemin littéral vers une dépendance transitive (aujourd'hui
// `node_modules/harfbuzzjs/hb.wasm`, tiré par `satori`) n'est vérifié par personne : ni le build
// Vercel, ni le typecheck. Les motifs glob sont ignorés — `includeFiles` en accepte, et ce
// contrôle ne sait pas les résoudre ; il le dit plutôt que d'échouer à tort.
for (const [fonction, options] of Object.entries(configVercel.functions ?? {})) {
  const declares = [options?.includeFiles ?? []].flat();
  for (const fichier of declares) {
    if (/[*?{[]/.test(fichier)) {
      avertissements.push(`vercel.json : includeFiles « ${fichier} » est un motif, non vérifié.`);
    } else if (!existsSync(fichier)) {
      echecs.push(
        `vercel.json : \`${fonction}\`.includeFiles désigne « ${fichier} », qui n’existe pas.` +
          ' La Function se déploierait sans cet asset et échouerait à l’exécution en ENOENT,' +
          ' derrière un FUNCTION_INVOCATION_FAILED sans détail côté client.',
      );
    }
  }
}

// `CHROMIUM_PATH` laisse pointer un binaire déjà présent — utile là où les navigateurs de
// Playwright sont installés hors de son arborescence habituelle. En CI, la variable est
// absente et le navigateur vient de `npx playwright install chromium`.
const navigateur = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);

for (const { chemin, marqueur } of ROUTES) {
  const page = await navigateur.newPage({ viewport: { width: 420, height: 900 } });
  const exceptions = [];
  page.on('pageerror', (erreur) => exceptions.push(String(erreur)));

  try {
    await page.goto(base + chemin, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    // **Ce qu'on attend d'abord, c'est que React ait pris la main.** Et c'est la seule attente
    // qui prouve quelque chose : l'export d'Expo Router **pré-rend** le corps de chaque page,
    // donc « la page n'est pas vide » et même le marqueur sont vrais dès `domcontentloaded`,
    // avant que le bundle ne s'exécute. Attendre l'un ou l'autre reviendrait à relire le HTML
    // statique — ce que les deux autres gardes font déjà — et à refermer la fenêtre
    // d'observation juste avant l'instant où la panne du 08/09/2026 se produit : une exception au
    // rendu du layout racine arrive quand le bundle monte l'app, pas quand le serveur sert le
    // fichier. React marque son conteneur d'une propriété interne au montage —
    // `__reactContainer$…` aujourd'hui — qu'aucun HTML statique ne peut porter : la chercher sur
    // `#root` (le conteneur de l'export, présent dans les vingt-et-une pages de `dist/`) est donc
    // le seul signal qui distingue « servi » de « monté ». Le préfixe est lâche exprès, le suffixe
    // étant aléatoire et le nom propre à la version de React.
    //
    // **Et son expiration EST un échec** — ce résultat a été avalé par un `.catch(() => {})`
    // jusqu'au 20/09/2026, sous un commentaire qui affirmait « ce sont les contrôles ci-dessous qui
    // disent ce qui a échoué ». C'était une erreur de raisonnement, et elle vidait ce script de sa
    // raison d'être : les contrôles ci-dessous lisent le corps de la page, or l'export **pré-rend**
    // ce corps — le paragraphe ci-dessus le dit lui-même —, donc ils restent verts sur une app qui
    // ne monte jamais. Mesuré en le cassant : le bundle d'entrée retiré de `dist/`, l'app morte dans
    // le navigateur, ce script sortait **0** en annonçant « 12 routes rendues, aucun écran de
    // panne ». C'est exactement la panne du 08/09/2026 qu'il existe pour attraper.
    //
    // `page.on('pageerror')` ne rattrape pas ce cas : il ne se déclenche que si le bundle
    // s'exécute **et** lève. Un bundle qui ne se charge pas du tout — morceau en 404, `src`
    // cassée, CSP — n'émet rien.
    let monte = true;
    await page
      .waitForFunction(
        () => {
          const racine = document.getElementById('root');
          return !!racine && Object.keys(racine).some((cle) => cle.startsWith('__react'));
        },
        null,
        { timeout: ATTENTE_MAX },
      )
      .catch(() => {
        monte = false;
      });
    // Puis le marqueur quand il y en a un, sinon la première trace de contenu — avec un plafond
    // large, un runner de CI étant plus lent qu'un poste. L'expiration n'est pas traitée comme
    // une erreur ici : c'est aux contrôles ci-dessous de dire *lequel* des trois a échoué, avec
    // ce que la page affichait vraiment.
    //
    // Puis le repos, qui n'est pas du luxe : une exception levée dans un effet arrive **après**
    // le premier rendu, et c'est la moitié de ce que ce script cherche.
    await (marqueur
      ? // Blancs normalisés comme plus bas : l'espace d'avant « ? » est insécable au rendu.
        page.waitForFunction((attendu) => document.body.innerText.replace(/\s+/g, ' ').includes(attendu), marqueur, {
          timeout: ATTENTE_MAX,
        })
      : page.waitForFunction(() => document.body.innerText.trim().length > 0, null, {
          timeout: ATTENTE_MAX,
        })
    ).catch(() => {});
    await page.waitForTimeout(REPOS);
    const texte = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim();

    const bloquantes = exceptions.filter((e) => !HYDRATATION.test(e));
    avertissements.push(...exceptions.filter((e) => HYDRATATION.test(e)).map((e) => `${chemin} : ${e.slice(0, 160)}`));

    // L'ordre compte : un écran de panne fait aussi disparaître le marqueur de la route, et
    // signaler « le marqueur est absent » cacherait la cause derrière son symptôme.
    const panne = ECRANS_DE_PANNE.find((ecran) => texte.includes(ecran.texte));

    if (!monte) {
      // **En tête de la cascade**, pour la raison qui ordonne déjà les trois suivants : une app qui
      // ne monte pas rend le corps pré-rendu, donc le texte et le marqueur seraient trouvés et le
      // script se tairait. Dire « le marqueur est là » d'une page morte cacherait la cause
      // derrière l'absence de symptôme.
      echecs.push(
        `${chemin} : React n'a jamais pris la main — le corps affiché est le pré-rendu de l'export,` +
          ` pas l'app. Rien n'est cliquable. Regarder d'abord le chargement du bundle (un morceau` +
          ` en 404, une « src » cassée), puis une exception au rendu du layout racine.` +
          `${bloquantes[0] ? ` Exception relevée — ${bloquantes[0].slice(0, 200)}` : ''}`
      );
    } else if (!texte) {
      echecs.push(`${chemin} : la page est vide.${bloquantes[0] ? ` Cause probable — ${bloquantes[0].slice(0, 220)}` : ''}`);
    } else if (panne) {
      echecs.push(
        `${chemin} : ${panne.quoi} s’affiche (« ${panne.texte} »). Une exception a été levée` +
          ` pendant le rendu, et elle a été rattrapée — donc elle n’apparaît pas ci-dessous.` +
          ` Rendu : « ${texte.slice(0, 200)}… »`
      );
    } else if (marqueur && !texte.includes(marqueur)) {
      echecs.push(`${chemin} : « ${marqueur} » est absent de la page. Rendu : « ${texte.slice(0, 120)}… »`);
    }
    if (bloquantes.length > 0) {
      echecs.push(`${chemin} : exception non rattrapée — ${bloquantes[0].slice(0, 260)}`);
    }
  } catch (erreur) {
    echecs.push(`${chemin} : ${String(erreur).slice(0, 200)}`);
  } finally {
    await page.close();
  }
}

await navigateur.close();
fermer();

for (const avertissement of avertissements) {
  console.warn(`Avertissement (hydratation, non bloquant) — ${avertissement}`);
}

if (echecs.length > 0) {
  console.error('L’export se construit mais ne s’affiche pas :\n');
  for (const echec of echecs) console.error(`  - ${echec}`);
  console.error(
    '\nUne exception pendant le rendu du layout racine emporte tout l’arbre React : le HTML' +
      '\nest servi, le titre est correct, et l’app ne démarre pas. Cause la plus fréquente : une' +
      '\nAPI de module natif appelée sur web — les hooks s’exécutent au rendu, une garde placée' +
      '\ndans un effet arrive trop tard.' +
      '\n\nSi c’est un écran de panne qui s’affiche, l’exception a été rattrapée : elle n’est pas' +
      '\ndans la liste ci-dessus. Elle est dans la console du navigateur — rejouer l’export en' +
      '\nlocal (expo export --platform web) et ouvrir la route en cause la fait apparaître.'
  );
  process.exit(1);
}

console.log(
  `${ROUTES.length} routes rendues, aucun écran de panne, aucune exception bloquante.` +
    ' vercel.json : cleanUrls en place, assets des Functions présents.'
);
