// Refuse un export web qui s'affiche parfaitement mais dans le mauvais **état**.
//
// **Le trou que ce script bouche.** `verifier-rendu-export.mjs` ouvre vraiment les pages et
// attrape la page blanche, l'écran de panne et l'exception non rattrapée — c'est-à-dire « l'app
// démarre ». Il ne dit rien de ce qu'elle **montre** : une barre d'onglets qui disparaît pour tout
// le monde, une carte d'ouverture qui ne s'ouvre pas, une porte qui mène à la mauvaise étape
// passeraient toutes les trois sans un mot, sur les ~15 000 lignes d'écrans que ce dépôt ne teste
// pas par décision (`TESTING.md` §1.6 : la logique pure sort de l'écran pour être éprouvée, les
// écrans eux-mêmes ne le sont pas).
//
// La contre-lecture du lot 5, le 17/09/2026, a donné la mesure du manque : sur huit défauts, trois
// étaient des défauts d'**état** d'écran, et aucun n'était visible autrement qu'en relisant. Pire,
// la mesure qui avait tranché C5.7 — la barre d'onglets dans ses cinq états — avait été prise par
// un script jeté après usage. Ce fichier existe pour qu'elle se rejoue.
//
// ── Ce qu'il peut éprouver, et la frontière est nette ──────────────────────────────────────────
//
// L'export de CI est construit avec une **configuration Supabase factice** : toute route dont le
// contenu dépend d'une lecture montre son écran d'échec, ce qui est le comportement correct. Donc
// tout état qui vit derrière une requête — la carte du premier plan, la carte d'attente, l'encart
// de contexte, le classement des pistes — est **hors de portée d'ici**, et le rester : y épingler
// quoi que ce soit reviendrait à épingler une copie d'erreur.
//
// Ce qui reste, et qui est exactement ce qui a cassé : les états qui se décident **sur l'appareil**,
// donc sans réseau — une marque locale, un paramètre d'URL, et depuis le 24/09/2026 une préférence
// du système (« réduire les animations ») et la mesure de ce qui est rendu (hauteur d'une cible,
// contraste d'un indicateur, place du focus après un geste). Ce sont aussi les seuls qu'un
// utilisateur peut atteindre sans que rien ne se soit encore chargé, donc les plus silencieux.
//
// ── Éprouvé en cassant ce qu'il garde, le 17/09/2026 ───────────────────────────────────────────
//
// Cinq mutations, trois exports. Chacune fait tomber ce qu'elle devait faire tomber, et rien
// d'autre :
//
//   | Ce qu'on casse | Ce qui tombe |
//   |---|---|
//   | la barre est toujours rendue (`display: 'flex'`) | « marque questionnaire » |
//   | `?etape=` revalidé contre `BILAN_STEP_ORDER` | « une étape invisible est ignorée » |
//   | `?etape=` n'est plus lu du tout | « la porte ouvre l'étape Contexte » |
//   | la barre ne se montre que sur `barre` et `fait` | « aucune marque » **et** « valeur inconnue » |
//   | le stockage rend une valeur inconnue telle quelle | **rien** — et c'est le relevé intéressant |
//
// **La cinquième mutation ne tombe pas, et il faut savoir pourquoi avant de la croire inutile** :
// une valeur inconnue est arrêtée par **deux** défenses indépendantes, la liste blanche de
// `lireLePremierParcours` (que Jest éprouve, dans `src/lib/premier-parcours.test.ts`) et la
// dérivation, qui ne masque que sur `'questionnaire'` **exactement**. Casser la première laisse la
// seconde tenir. Ce que ce script-ci éprouve est donc la **dérivation** telle qu'elle est rendue,
// et c'est la quatrième mutation qui le montre.
//
// ── Sections C, D et E, éprouvées en cassant le 24/09/2026 ─────────────────────────────────────
//
// Dix mutations, un export chacune, plus un témoin sans mutation qui sort vert — et une onzième le
// même soir, quand `/suivi/bilan` a rejoint la section D à l'intégration. Chacune fait
// tomber ce qu'elle devait faire tomber, et rien d'autre :
//
//   | Ce qu'on casse | Ce qui tombe |
//   |---|---|
//   | marges de la barre remises à 8 et 12 | « Plan » **et** « Suivi » à 39 px (C) |
//   | pastille remise en `backgroundSelected` | l'actif sans forme pleine, 1,18:1 (C) |
//   | pastille pleine sur les deux couches | l'inactif porte une forme pleine, 6,12:1 (C) |
//   | `/connexion` lit la provenance au premier rendu | l'hydratation de `?source=compte` (D) |
//   | `/connexion` n'affiche jamais la provenance | « Retour » absent (D) |
//   | `/rappels/stop` déduit l'état du jeton au premier rendu | l'hydratation de `?jeton=` **et** le HTML statique « plus valable » (D) |
//   | `/rappels/stop` sans jeton reste « en cours » | « plus valable » absent une fois montée (D) |
//   | l'onboarding ne déplace plus le focus | le focus, avec **et** sans « réduire » (E) |
//   | le pager anime toujours | les positions intermédiaires sous « réduire » (E) |
//   | le titre n'a plus de `tabIndex` sur web | le focus, avec **et** sans « réduire » (E) |
//   | « Retour » de l'onboarding branché sur la page suivante | la page d'arrivée (E) |
//   | points inactifs remis en `border` | le contraste des points, pages 1 **et** 3 (E) |
//   | point actif remis à 8 px | la forme de l'actif, pages 1 **et** 3 (E) |
//   | `/suivi/bilan` lit son état sans attendre l'hydratation | l'hydratation de `?id=` **et** le HTML statique « pas pu » (D) |
//
// La dernière dit ce que l'avant-dernière ne dit pas : un focus demandé sur un titre que le
// navigateur ne sait pas focaliser **échoue sans bruit**, et c'est `FOCALISABLE_PAR_PROGRAMME`
// (`src/lib/focus.ts`) qui le rend possible. Et l'hydratation de `/connexion` a ses deux moitiés :
// sans la seconde, une correction qui ignorerait le paramètre passerait pour juste.
//
// ── Sections D, E et G, éprouvées en cassant le 25/09/2026 ─────────────────────────────────────
//
// Huit mutations, un export chacune, sur un arbre dont le témoin sort vert. Chacune fait tomber ce
// qu'elle devait faire tomber, et rien d'autre :
//
//   | Ce qu'on casse | Ce qui tombe |
//   |---|---|
//   | le pager n'ouvre plus de vol (`enVol` toujours nul) | le retour du focus sur la page qu'on quitte **et** l'inertie, trois bascules par page (E, moitié animée) |
//   | `StepShell` ne déplace plus le focus | le focus d'étape, tombé sur le document (G) |
//   | `StepShell` vise le titre sur web, sans `tabIndex` | le focus d'étape, tombé sur le document (G) |
//   | `/suivi/bilan` lit son état sans attendre l'hydratation | l'hydratation de `?id=` **et** le HTML statique « pas pu » (D) |
//   | `/suivi/bilan` ne quitte jamais le chargement | « Chargement » encore affiché (D) |
//   | `/suivi/bilan` lit son identifiant sous un autre nom | aucune lecture portant l'identifiant (D) |
//   | `/rappels/stop` reste sur « Un instant » après la réponse | « Un instant » encore affiché (D) |
//   | `/rappels/stop` lit son jeton sous un autre nom | aucun appel portant le jeton (D) |
//
// La première a été jouée contre l'**ancienne** section E aussi, par construction : son assertion
// au repos est restée verte, le focus finissant bien sur la page 1 après son aller-retour. La
// quatrième est celle du 24/09 rejouée : les deux gardes nouvelles de `/suivi/bilan` y restent
// vertes — l'écran sort du chargement, vers l'erreur, et lit bien le bilan —, ce qui est juste :
// elles gardent autre chose, et ce sont les deux suivantes qui le montrent. Sous la deuxième, le
// focus ne reste même pas sur « Suivant » : le bouton de l'étape qui arrive est désactivé tant
// qu'on n'a pas répondu, et un bouton désactivé perd le focus.
//
// Et une expérience, qui n'est pas une mutation : viser le titre sur web **avec** `tabIndex={-1}`
// pose le focus sur la question de l'étape qui arrive (relevé sur deux étapes différentes) et G
// reste verte. La référence que `TitreDEtape` relie à `StepShell` atteint donc le titre de la
// nouvelle étape à l'instant de l'effet — ce que la voie native suppose, et que rien d'autre ici
// ne peut montrer.
//
// **Chaque export muté a été fait avec son propre cache Metro (`TMPDIR`) et `--clear`**, et ce
// n'est pas un détail : la première série de mesures, faite sans `--clear` pendant que d'autres
// worktrees exportaient, a produit des bundles qui n'étaient pas ceux de l'arbre — l'ancien texte
// d'une page, un module absent — et donc un tableau faux de bout en bout. Metro range son cache
// dans le répertoire temporaire du système, partagé par tous ceux qui exportent. Qui rejoue ces
// mutations vérifie d'abord qu'un marqueur du code courant est bien dans le bundle.
//
// **Et le 04/10/2026, la désinscription par le geste** (« Couper mes rappels », décision de la
// personne qui pilote) : trois mutations, un export chacune (`--clear`, aucun autre export en même
// temps), sur un arbre dont le témoin sort vert — et chacune a fait tomber ce qu'elle visait, preuve
// que le bundle la portait.
//
//   | Ce qu'on casse | Ce qui tombe |
//   |---|---|
//   | `/rappels/stop` appelle le serveur dès l'ouverture, comme avant | « a appelé le serveur sans geste » (D, le bloc du geste) |
//   | « Couper mes rappels » ne fait rien | « aucun appel ne porte le jeton » **et** « n'a pas quitté le geste » (D, le bloc du geste) |
//   | le HTML statique dit « Un instant » avant l'hydratation | « le HTML statique ne demande plus le geste » (D) |
//
// Les deux lignes du 25/09 sur `/rappels/stop` (« Un instant » après la réponse, le jeton lu sous un
// autre nom) décrivent l'ancienne page ; ce qu'elles gardaient l'est désormais par le bloc du geste,
// qui exige l'appel portant le jeton et la sortie de « Un instant ».
//
// ── Section F, éprouvée en cassant le 25/09/2026 ───────────────────────────────────────────────
//
// Un témoin d'abord : l'export d'**avant** le correctif fait tomber les trois choix, et deux fois
// chacun — Espace ne coche pas, et la page défile (de 230 à 325 px). Puis quatre mutations, un export
// chacune (cache Metro isolé, `--clear`, un marqueur de la mutation retrouvé dans le bundle avant de
// conclure), chacune ne faisant tomber que ce qu'elle devait :
//
//   | Ce qu'on casse | Ce qui tombe |
//   |---|---|
//   | `ChoiceRow` sans `activableALaBarreDEspace` | la rangée, sur l'état **et** le défilement — seulement |
//   | `Chip` sans elle | la puce, sur l'état et le défilement — seulement |
//   | `ModeListItem` sans elle | l'item de mode, sur l'état et le défilement — seulement |
//   | `preventDefault()` retiré de l'utilitaire | les trois, sur le **seul** défilement : ils cochent |
//
// La dernière est celle qui justifie la seconde mesure : l'état est juste, et la page saute d'un écran
// sous le choix qu'on vient de cocher.
//
// ── Sections H et I, éprouvées en cassant le 25/09/2026 ────────────────────────────────────────
//
// Leurs mutations sont écrites en tête de chaque section, à côté de ce qu'elles gardent.
//
// Lancé en CI après `expo export`, à côté des quatre autres gardes, cf. .github/workflows/ci.yml.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { chromium } from 'playwright';

import { mesurerUnChoix } from './mesurer-un-choix.mjs';
import {
  disparaitApresEtreApparue,
  echantillons,
  enChemin,
  entre,
  mesurer,
  ouiNon,
  plusLoin,
  releverParImage,
  releverPendant,
} from './relever-par-image.mjs';
import { decrireInfractions, releverLaCsp, servirExport } from './servir-export.mjs';

const DIST = process.argv[2] ?? 'dist';

const ATTENTE = 15_000;

/**
 * Le repos avant de mesurer, et il a une raison chiffrée.
 *
 * Les marques locales sont lues dans un **effet**, donc l'écran rend d'abord son état de départ —
 * celui qui n'affirme rien (`EXPO.md` §2.2 : sur web, l'état initial est celui du rendu statique,
 * qui ne connaît aucun stockage). Mesurer au montage lirait donc systématiquement ce transitoire
 * et non l'état, et ce script a **échoué ainsi à son premier essai** : il voyait la barre visible
 * sous une marque qui la masque.
 *
 * **Mesuré le 17/09/2026 sur cet export** : React monte à ~340 ms, la barre se masque à ~350 —
 * soit dix à dix-sept millisecondes de transitoire, une image au plus. Une seconde et demie est
 * donc cent fois la marge nécessaire sur un poste, et de quoi absorber un runner de CI lent. Ce
 * qu'on éprouve ici est l'état **posé** ; le transitoire, lui, est une conséquence assumée du
 * choix de C5.7 (démarrer à « barre visible » plutôt que de la faire disparaître chez tout le
 * monde à chaque chargement de page).
 */
const REPOS = 1_500;

const echecs = [];
// Les infractions à la CSP de `vercel.json`, que le serveur applique comme la production
// (`servir-export.mjs`) : relevées sur chaque page ouverte, lues à la fin — une page fermée garde
// sa liste.
const relevesCsp = [];

const { base, fermer } = await servirExport(DIST);
const navigateur = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);

/**
 * Ouvre une route avec un stockage local préparé.
 *
 * **`addInitScript` et pas une écriture après chargement** : les marques sont lues au montage du
 * layout ou dans le premier effet de l'écran, donc les poser après coup ne testerait que le
 * rechargement. AsyncStorage sur web est `window.localStorage`, clé pour clé, sans préfixe.
 */
async function ouvrir(
  chemin,
  marques = {},
  { reduire = false, exceptions = null, requetes = null, journal = false, releve = null, hauteur = 844, largeur = 390 } = {}
) {
  // 390 de large par défaut ; 360 pour les cas que les planches mettent à 360 × 800 (section K).
  const page = await navigateur.newPage({ viewport: { width: largeur, height: hauteur } });
  // « Réduire les animations », émulé **avant** le chargement : `useReducedMotion` la lit une fois,
  // au chargement du module (section E).
  if (reduire) await page.emulateMedia({ reducedMotion: 'reduce' });
  relevesCsp.push({ chemin, infractions: await releverLaCsp(page) });
  // Les exceptions sont écoutées dès avant la navigation : une erreur d'hydratation part pendant
  // que le bundle monte l'app, avant que l'attente ci-dessous ne rende la main (section D).
  if (exceptions) page.on('pageerror', (erreur) => exceptions.push(String(erreur)));
  // Les requêtes aussi, corps compris — un RPC porte son paramètre dans le corps : la lecture d'un
  // écran part dès son premier effet (section D).
  if (requetes) {
    page.on('request', (requete) =>
      requetes.push({ url: requete.url(), methode: requete.method(), corps: requete.postData() ?? '' })
    );
  }
  // Et le journal du focus, pour la même raison : il doit être posé avant le premier script de
  // la page pour ne rien manquer de ce qui bascule pendant une transition (section E).
  if (journal) await page.addInitScript(journaliserLeFocus);
  // Le relevé image par image, pour la même raison : `releve` vaut `true` pour l'installer, ou le
  // relevé à lancer avant que React ne monte (section J).
  if (releve) await page.addInitScript(releverParImage, releve === true ? null : releve);
  await page.addInitScript((entrees) => {
    for (const [cle, valeur] of Object.entries(entrees)) window.localStorage.setItem(cle, valeur);
  }, marques);
  await page.goto(base + chemin, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  // On attend que React ait pris la main — l'export **pré-rend** le corps, donc lire trop tôt
  // revient à relire le HTML statique, où aucune marque locale n'a encore été consultée.
  await page
    .waitForFunction(
      () => {
        const racine = document.getElementById('root');
        return !!racine && Object.keys(racine).some((cle) => cle.startsWith('__react'));
      },
      null,
      { timeout: ATTENTE }
    )
    .catch(() => {});
  await page.waitForTimeout(REPOS);
  return page;
}

// ── A. La barre d'onglets attend la fin du premier parcours (C5.7) ─────────────────────────────
//
// Le produit proposait deux lieux avant qu'il y ait quoi que ce soit à suivre. La barre est donc
// masquée entre la soumission du premier questionnaire et la fermeture de la carte « Ton premier
// plan », et elle revient ensuite. **Le cas à ne pas rater est l'absence de marque** : appareil
// neuf d'un compte existant, session retrouvée par lien, installation d'avant le chantier — la
// marque autorise une absence de barre, elle ne la présume jamais. Une régression dans ce sens
// retirerait à quelqu'un la moitié du produit, en silence et sans aucune erreur.
const PARCOURS = 'traceverte.premier_parcours.v1';

const ETATS_DE_BARRE = [
  { marque: null, barre: true, quoi: 'aucune marque — le cas de tout le monde aujourd’hui' },
  { marque: 'questionnaire', barre: false, quoi: 'le premier parcours est en cours' },
  { marque: 'barre', barre: true, quoi: 'la barre vient d’arriver' },
  { marque: 'fait', barre: true, quoi: 'le premier parcours est fini' },
  // Une valeur qu'une version future écrirait et qu'une version ancienne ne saurait pas lire. Deux
  // défenses la couvrent — la liste blanche du stockage et la dérivation — et c'est la **seconde**
  // que cette ligne éprouve : casser la première seule ne fait rien tomber ici (voir l'en-tête).
  { marque: 'valeur_inconnue', barre: true, quoi: 'une valeur inconnue ne masque rien' },
];

for (const { marque, barre, quoi } of ETATS_DE_BARRE) {
  const page = await ouvrir('/plan', marque === null ? {} : { [PARCOURS]: marque });
  try {
    // La barre se reconnaît à son **rôle**, pas à ses libellés : `tablist` est ce que
    // react-native-web rend pour le navigateur d'onglets, et il survit à une reformulation.
    // Masquée par `display: none`, elle reste dans le DOM avec une hauteur nulle — c'est donc la
    // hauteur qui dit ce qu'on voit, jamais la présence du nœud.
    const vue = await page.evaluate(() => {
      const tablist = document.querySelector('[role="tablist"]');
      const hauteur = tablist ? Math.round(tablist.getBoundingClientRect().height) : 0;
      const onglets = document.querySelectorAll('[role="tab"]').length;

      // **La bande réservée, mesurée et non raisonnée** (`EXPO.md` §1.7). Le navigateur d'onglets
      // passe aussi sa hauteur aux écrans par contexte, donc « un enfant `display: none` ne prend
      // pas de place » ne suffit pas à conclure : on lit les enfants du conteneur en colonne.
      let colonne = null;
      if (tablist) {
        let n = tablist;
        while (n?.parentElement && getComputedStyle(n.parentElement).flexDirection !== 'column') {
          n = n.parentElement;
        }
        let c = n?.parentElement ?? null;
        while (c && Math.round(c.getBoundingClientRect().height) < window.innerHeight - 1) {
          c = c.parentElement;
        }
        colonne = c ? [...c.children].map((e) => Math.round(e.getBoundingClientRect().height)) : null;
      }
      return { hauteur, onglets, colonne, fenetre: window.innerHeight };
    });

    const visible = vue.hauteur > 0;
    if (visible !== barre) {
      echecs.push(
        `La barre d’onglets est ${visible ? 'visible' : 'absente'} alors qu’elle devrait être` +
          ` ${barre ? 'visible' : 'absente'} — marque « ${marque ?? '(aucune)'} », ${quoi}.`
      );
    } else if (barre && vue.onglets !== 2) {
      echecs.push(
        `La barre porte ${vue.onglets} onglet(s) au lieu de deux — marque « ${marque ?? '(aucune)'} ».` +
          ' Deux onglets et pas trois : ajouter une route dans `(tabs)/` lui en donne un.'
      );
    } else if (!barre && vue.colonne === null) {
      // **Une assertion qu'on ne peut pas jouer est un échec, pas un succès** (contre-lecture de
      // ce script, 17/09/2026). Le premier jet passait silencieusement quand le conteneur en
      // colonne n'était pas trouvé : la mesure de la bande réservée ne se serait jamais exécutée,
      // et rien ne l'aurait dit — c'est-à-dire un garde-fou vert qui ne garde rien.
      echecs.push(
        'La barre est masquée mais le conteneur en colonne du navigateur d’onglets est' +
          ' introuvable : la bande réservée n’a pas pu être mesurée. Le garde-fou ne peut pas' +
          ' conclure, et il ne fera pas semblant (EXPO.md §1.7).'
      );
    } else if (!barre && vue.colonne[0] < vue.fenetre - 1) {
      echecs.push(
        `La barre est bien masquée mais réserve encore sa hauteur : l’écran mesure` +
          ` ${vue.colonne[0]} px sur ${vue.fenetre}. Une bande vide en bas de tous les écrans du` +
          ' premier parcours (EXPO.md §1.7).'
      );
    }
  } catch (erreur) {
    echecs.push(`Barre d’onglets, marque « ${marque ?? '(aucune)'} » : ${String(erreur).slice(0, 180)}`);
  } finally {
    await page.close();
  }
}

// ── B. La porte de l'encart de contexte ouvre la bonne étape (C5.5) ────────────────────────────
//
// `?etape=` est un paramètre **public** : il existe dans la barre d'adresse sur web et il se tape.
// La contre-lecture du lot 5 a trouvé qu'il n'était validé que contre la liste complète des étapes,
// donc qu'il pouvait ouvrir une étape que le parcours de la personne saute — numérotée « Étape 1
// sur 6 » par le repli de l'en-tête. Trois cas, et le troisième est celui qui a manqué.
const BROUILLON = 'traceverte.bilan_draft.v1';

const SANS_TRAJET = JSON.stringify({
  step: 'context',
  answers: { commute_has_regular_trip: false },
  savedAt: new Date().toISOString(),
});

const TITRE_CONTEXTE = 'Quel est ton contexte de mobilité ?';
const TITRE_PREMIERE = 'As-tu un trajet régulier pour le travail ou les études ?';
const TITRE_MODE = 'Quel est ton mode de transport principal pour ce trajet ?';

const ETAPES = [
  {
    chemin: '/bilan?etape=context',
    marques: {},
    attendu: TITRE_CONTEXTE,
    interdit: null,
    quoi: 'la porte de l’encart ouvre l’étape « Contexte »',
  },
  {
    chemin: '/bilan?etape=pas_une_etape',
    marques: {},
    attendu: TITRE_PREMIERE,
    interdit: null,
    quoi: 'une étape inconnue est ignorée, le questionnaire s’ouvre normalement',
  },
  {
    // Le cas de la contre-lecture : une étape réelle, mais que ce profil-là ne traverse pas.
    chemin: '/bilan?etape=commute_mode',
    marques: { [BROUILLON]: SANS_TRAJET },
    attendu: TITRE_CONTEXTE,
    interdit: TITRE_MODE,
    quoi: 'une étape invisible pour ces réponses est ignorée',
  },
];

for (const { chemin, marques, attendu, interdit, quoi } of ETAPES) {
  const page = await ouvrir(chemin, marques);
  try {
    await page
      // Blancs normalisés comme plus bas : `ThemedText` rend insécable l'espace d'avant « ? »
      // (`src/types/typographie.ts`), et `innerText` la garde telle quelle.
      .waitForFunction((t) => document.body.innerText.replace(/\s+/g, ' ').includes(t), attendu, {
        timeout: ATTENTE,
      })
      .catch(() => {});
    const texte = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim();

    if (!texte.includes(attendu)) {
      echecs.push(`${chemin} : « ${attendu} » est absent — ${quoi}. Rendu : « ${texte.slice(0, 160)}… »`);
    } else if (interdit && texte.includes(interdit)) {
      echecs.push(`${chemin} : « ${interdit} » s’affiche alors que ${quoi}.`);
    }
  } catch (erreur) {
    echecs.push(`${chemin} : ${String(erreur).slice(0, 180)}`);
  } finally {
    await page.close();
  }
}

// ── C. La barre d'onglets : une cible de 48, et un actif qui se voit autrement qu'à sa teinte ─
//
// Deux décisions du 24/09/2026 (`v1-29`), et aucune ne se lit dans le code : la hauteur d'un
// onglet est ce que la barre laisse une fois ôtés son filet et ses marges, et la couleur qu'on
// perçoit est celle d'une couche parmi deux que react-navigation superpose. Toutes deux se
// **mesurent** donc sur l'export.
//
// - **Chaque onglet mesure au moins `ControlHeight.target` de haut** — lu dans
//   `src/constants/theme.ts` plutôt que recopié. Il en mesurait 39 : 60 moins un filet de 1 et des
//   marges de 8 et 12 (l'audit disait 40, en oubliant le filet).
// - **L'onglet actif porte une forme pleine qui tranche à 3:1 au moins sur la barre, et
//   l'inactif n'en porte aucune** (WCAG 1.4.1 et 1.4.11). La seconde moitié n'est pas une
//   précaution : une pastille sur les deux onglets remettrait toute la différence dans la teinte,
//   c'est-à-dire exactement le défaut corrigé. La pastille d'avant, `backgroundSelected`, ne
//   tranchait qu'à 1,18:1.
const CIBLE_TACTILE = (() => {
  const source = readFileSync('src/constants/theme.ts', 'utf8');
  const valeur = Number(source.match(/ControlHeight\s*=\s*\{[^}]*?\btarget:\s*(\d+)/)?.[1]);
  if (!Number.isFinite(valeur) || valeur <= 0) {
    console.error(
      '`ControlHeight.target` est introuvable dans src/constants/theme.ts — ce script le lit par' +
        '\nmotif pour ne pas recopier la cible tactile du produit. Si la déclaration a changé de' +
        '\nforme, adapter le motif.'
    );
    process.exit(1);
  }
  return valeur;
})();
const CONTRASTE_MINIMAL = 3;

{
  const page = await ouvrir('/plan');
  try {
    const vue = await page.evaluate(() => {
      // Couleur CSS → [r, g, b, a].
      const lire = (css) => {
        const m = css.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const [r, g, b, a = '1'] = m[1].split(',').map((x) => x.trim());
        return [Number(r), Number(g), Number(b), Number(a)];
      };
      const luminance = ([r, g, b]) => {
        const canal = (c) => {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
      };
      const contraste = (a, b) => {
        const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
        return (l1 + 0.05) / (l2 + 0.05);
      };
      const tablist = document.querySelector('[role="tablist"]');
      const fondDeLaBarre = tablist ? lire(getComputedStyle(tablist.parentElement).backgroundColor) : null;

      return [...document.querySelectorAll('[role="tab"]')].map((onglet) => {
        // Les formes pleines **réellement visibles** de l'onglet : react-navigation superpose une
        // couche active et une couche inactive et règle leur opacité, donc une forme présente dans
        // le DOM peut très bien être invisible. On compose l'opacité jusqu'à l'onglet.
        let meilleur = 0;
        for (const noeud of onglet.querySelectorAll('div')) {
          const fond = lire(getComputedStyle(noeud).backgroundColor);
          if (!fond || fond[3] === 0 || !fondDeLaBarre) continue;
          let opacite = fond[3];
          for (let n = noeud; n && n !== onglet; n = n.parentElement) {
            opacite *= Number(getComputedStyle(n).opacity);
          }
          if (opacite < 0.99) continue;
          meilleur = Math.max(meilleur, contraste(fond, fondDeLaBarre));
        }
        return {
          nom: onglet.innerText.trim(),
          actif: onglet.getAttribute('aria-selected') === 'true',
          hauteur: onglet.getBoundingClientRect().height,
          contraste: Math.round(meilleur * 100) / 100,
        };
      });
    });

    if (vue.length !== 2) {
      echecs.push(`Barre d’onglets : ${vue.length} onglet(s) mesuré(s) sur /plan, deux attendus.`);
    }
    for (const onglet of vue) {
      if (onglet.hauteur + 0.5 < CIBLE_TACTILE) {
        echecs.push(
          `L’onglet « ${onglet.nom} » mesure ${onglet.hauteur} px de haut, sous la cible de` +
            ` ${CIBLE_TACTILE} (ControlHeight.target) : la barre lui laisse sa hauteur moins son` +
            ' filet et ses deux marges.'
        );
      }
      if (onglet.actif && onglet.contraste < CONTRASTE_MINIMAL) {
        echecs.push(
          `L’onglet actif « ${onglet.nom} » n’a aucune forme pleine à ${CONTRASTE_MINIMAL}:1 sur` +
            ` la barre (la meilleure tranche à ${onglet.contraste}:1) : l’état actif ne se lit plus` +
            ' qu’à la teinte (WCAG 1.4.1, 1.4.11).'
        );
      }
      if (!onglet.actif && onglet.contraste >= CONTRASTE_MINIMAL) {
        echecs.push(
          `L’onglet inactif « ${onglet.nom} » porte une forme pleine à ${onglet.contraste}:1 :` +
            ' si l’inactif a la même pastille que l’actif, seule la teinte les distingue.'
        );
      }
    }
    if (!vue.some((onglet) => onglet.actif)) {
      echecs.push('Barre d’onglets : aucun onglet n’est annoncé actif (`aria-selected`) sur /plan.');
    }
  } catch (erreur) {
    echecs.push(`Barre d’onglets, cible et indicateur : ${String(erreur).slice(0, 180)}`);
  } finally {
    await page.close();
  }
}

// ── D. Un paramètre d'URL ne défait pas l'hydratation ─────────────────────────────────────────
//
// L'export rend chaque page **sans chaîne de requête** : un texte qui dépend de `?source=`, de
// `?jeton=` ou de `?id=` différait donc entre le HTML servi et le premier rendu du navigateur, et React jetait
// la page (erreur n° 418). `verifier-rendu-export.mjs` classe ces erreurs en avertissements, par
// conception ; ici elles sont **bloquantes pour les routes qu'on a corrigées**, parce qu'un retour
// de l'écart ne se verrait nulle part ailleurs — la page s'affiche juste, une fois refaite.
//
// Chaque route porte aussi sa moitié positive : sans elle, une correction qui ignorerait le
// paramètre passerait pour une correction qui l'attend.
const HYDRATATION = /Minified React error #(418|421|422|423|425)\b|hydrat/i;
const JETON_DE_FORME_VALIDE = '6f1f3a9e-2b7c-4d1e-9a3b-1c2d3e4f5a6b';

const PARAMETRES = [
  {
    // Ouvert depuis « Toi », l'écran rend « Retour » ; le HTML statique, sans provenance, « Plus
    // tard ». Les deux sont justes — à condition que le second ne serve qu'au rendu d'hydratation.
    chemin: '/connexion?source=compte',
    attendu: 'Retour',
    interdit: 'Plus tard',
  },
  {
    // Un jeton de forme valide mais inconnu : depuis le 04/10/2026, la page **demande** le geste
    // (« Couper mes rappels ») au lieu de couper dès l'ouverture — un analyseur de liens qui exécutait
    // la page coupait les rappels sans que personne ait cliqué. Montée, elle rend donc ce que dit le
    // HTML statique, et c'est juste ; ce qui la distingue, le geste qui fait partir l'appel et l'absence
    // d'appel avant lui, se vérifie dans le bloc qui suit cette boucle.
    chemin: `/rappels/stop?jeton=${JETON_DE_FORME_VALIDE}`,
    attendu: 'Couper mes rappels',
    interdit: 'Un instant',
  },
  {
    // Ouvert depuis le suivi, le bilan porte `?id=` ; le HTML statique, sans identifiant, rendait
    // l'écran d'erreur et le navigateur le chargement (relevé le 24/09/2026). Un identifiant
    // inconnu finit sur l'écran d'erreur une fois la lecture faite, en local comme avec la
    // configuration factice de la CI — une copie d'erreur, qu'on n'épingle pas (voir l'en-tête).
    //
    // **`bilan` seul ne prouvait rien, et c'est le HTML statique qui le montrait** (25/09/2026) : le
    // mot est aussi dans « Chargement de ton bilan… », que l'export sert à tout le monde. L'assertion
    // passait donc avant comme après la correction, et passerait sur un écran figé pour toujours au
    // chargement. Ce qui distingue l'écran monté du HTML, c'est qu'il **en sort** : « Chargement »
    // est interdit une fois la lecture faite — sans dire vers quelle issue, pour la raison ci-dessus.
    // Et la moitié positive est la lecture elle-même : l'écran doit avoir demandé **ce** bilan, celui
    // que désigne l'adresse. Sans elle, un écran qui perdrait `?id=` passerait : il afficherait
    // l'erreur sans rien lire, et l'erreur ne dit pas « Chargement ».
    chemin: `/suivi/bilan?id=${JETON_DE_FORME_VALIDE}`,
    attendu: 'bilan',
    interdit: 'Chargement',
    lecture: ({ url }) =>
      url.includes('/rest/v1/assessment_results?') && url.includes(`assessment_id=eq.${JETON_DE_FORME_VALIDE}`),
    // **La lecture qui échoue est relancée, et l'écran l'attend** : `@supabase/postgrest-js`
    // relance trois fois un GET que le réseau refuse, après 1, 2 puis 4 s. Mesuré sur l'export le
    // 25/09/2026, configuration factice : « Chargement de ton bilan… » pendant 8,5 s, puis l'écran
    // d'erreur. L'attente s'arrête dès que la condition tient ; la marge ne coûte qu'en cas d'échec.
    attente: 30_000,
  },
  {
    // Sans jeton, rien n'est appelé : l'état ne dépend que de l'URL. Le HTML statique demande le geste
    // à tout le monde, donc c'est ici que se vérifie que la page en sort une fois montée — sans quoi
    // un lien tronqué offrirait un bouton qui ne peut rien couper.
    chemin: '/rappels/stop',
    attendu: 'plus valable',
    interdit: 'Couper mes rappels',
  },
];

for (const { chemin, attendu, interdit, lecture = null, attente = ATTENTE } of PARAMETRES) {
  const exceptions = [];
  const requetes = [];
  const page = await ouvrir(chemin, {}, { exceptions, requetes });
  try {
    // On attend l'état que l'écran monté doit atteindre — le texte attendu présent, l'interdit
    // parti —, puis on juge sur ce qu'on lit : une attente échouée ne lève pas, elle laisse
    // l'assertion dire ce qui manque.
    await page
      .waitForFunction(
        ([a, i]) => {
          const t = document.body.innerText.replace(/\s+/g, ' ');
          return t.includes(a) && (i === null || !t.includes(i));
        },
        [attendu, interdit],
        { timeout: attente }
      )
      .catch(() => {});
    const texte = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim();
    const hydratation = exceptions.filter((e) => HYDRATATION.test(e));
    if (hydratation.length > 0) {
      echecs.push(
        `${chemin} : l’hydratation échoue (${hydratation[0].slice(0, 90)}…). Le premier rendu du` +
          ' navigateur lit la chaîne de requête que le HTML statique ne connaît pas : il doit' +
          ' rendre la même chose que lui, puis changer (`useApresHydratation`, EXPO.md §2.2).'
      );
    }
    if (!texte.includes(attendu)) {
      echecs.push(`${chemin} : « ${attendu} » est absent une fois l’app montée. Rendu : « ${texte.slice(0, 160)}… »`);
    } else if (interdit && texte.includes(interdit)) {
      echecs.push(
        `${chemin} : « ${interdit} » s’affiche encore une fois l’app montée : l’écran en est resté à ce` +
          ' que dit le HTML statique, sans tirer son état du paramètre.'
      );
    }
    if (lecture && !requetes.some(lecture)) {
      echecs.push(
        `${chemin} : l’écran n’a jamais demandé ce que l’adresse désigne — aucune lecture portant le` +
          ' paramètre. Il s’affiche sans le lire, ou le lit sous un autre nom.'
      );
    }
  } catch (erreur) {
    echecs.push(`${chemin} : ${String(erreur).slice(0, 180)}`);
  } finally {
    await page.close();
  }
}

// **Le geste coupe les rappels, et rien d'autre ne les coupe** (04/10/2026, décision de la personne
// qui pilote). La page partait au serveur dès son ouverture : l'analyseur de liens d'une messagerie
// professionnelle, qui exécute parfois les pages qu'il inspecte, coupait les rappels à la place de la
// personne et consommait le jeton. Deux moitiés, et chacune garde ce que l'autre ne voit pas : aucun
// appel une fois la page montée et laissée au repos — la moitié qu'aucun texte ne montre, puisque la
// page montée dit ce que dit le HTML —, puis l'appel portant **ce** jeton au toucher de « Couper mes
// rappels », et la page qui quitte le bouton pour l'une ou l'autre issue (refus en local, panne avec
// la configuration factice de la CI : aucune n'est épinglée).
{
  const chemin = `/rappels/stop?jeton=${JETON_DE_FORME_VALIDE}`;
  const requetes = [];
  const page = await ouvrir(chemin, {}, { requetes });
  const appelDuJeton = ({ url, corps }) =>
    url.includes('/rest/v1/rpc/desinscrire_des_rappels') && corps.includes(JETON_DE_FORME_VALIDE);
  try {
    // `ouvrir` a attendu que React prenne la main, puis le repos : un appel parti à l'hydratation
    // serait déjà là. Une seconde de plus pour un effet qui attendrait un rendu.
    await page.waitForTimeout(1_000);
    if (requetes.some(appelDuJeton)) {
      echecs.push(
        `${chemin} : la page a appelé le serveur sans geste. Un analyseur de liens qui l’ouvre` +
          ' couperait les rappels à la place de la personne (`etatDeLaPage`).'
      );
    } else {
      await page.getByRole('button', { name: 'Couper mes rappels' }).click({ timeout: ATTENTE });
      await page
        .waitForFunction(
          () => {
            const t = document.body.innerText;
            return !t.includes('Couper mes rappels') && !t.includes('Un instant');
          },
          null,
          { timeout: ATTENTE }
        )
        .catch(() => {});
      if (!requetes.some(appelDuJeton)) {
        echecs.push(`${chemin} : « Couper mes rappels » touché, et aucun appel ne porte le jeton.`);
      }
      const texte = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
      if (texte.includes('Couper mes rappels') || texte.includes('Un instant')) {
        echecs.push(`${chemin} : la page n’a pas quitté le geste après le toucher. Rendu : « ${texte.slice(0, 160)}… »`);
      }
    }
  } catch (erreur) {
    echecs.push(`${chemin} : ${String(erreur).slice(0, 180)}`);
  } finally {
    await page.close();
  }
}

// Ce que lit la personne qui ouvre le lien d'un rappel **avant** que l'app ne démarre : le HTML
// statique. Il disait « Ce lien n'est plus valable » à tout le monde, faute de connaître le jeton ;
// depuis le 04/10/2026, il demande le geste — ce que la page montée demande aussi.
{
  const html = readFileSync(join(DIST, 'rappels', 'stop.html'), 'utf8');
  if (html.includes('plus valable')) {
    echecs.push(
      '/rappels/stop : le HTML statique annonce « Ce lien n’est plus valable » — c’est ce que lit' +
        ' quiconque ouvre le lien d’un rappel, le temps que l’app démarre. L’état de départ doit' +
        ' être celui qui n’affirme rien (FRONT.md §1.3).'
    );
  } else if (!html.includes('Couper mes rappels')) {
    echecs.push('/rappels/stop : le HTML statique ne demande plus le geste (« Couper mes rappels »).');
  }
}

// Même chose pour le bilan ouvert par un lien : le HTML statique annonçait un échec à tout le monde.
{
  const html = readFileSync(join(DIST, 'suivi', 'bilan.html'), 'utf8');
  if (html.includes('pas pu')) {
    echecs.push(
      '/suivi/bilan : le HTML statique annonce que le bilan « n’a pas pu être affiché » — c’est ce' +
        ' que lit quiconque ouvre un bilan par un lien, le temps que l’app démarre (FRONT.md §1.3).'
    );
  } else if (!html.includes('Chargement de ton bilan')) {
    echecs.push('/suivi/bilan : le HTML statique ne porte plus « Chargement de ton bilan… ».');
  }
}

// ── E. L'onboarding : le focus suit la page, et le défilement suit « réduire les animations » ─
//
// « Continuer » rend inerte la page qui porte le bouton : sans rien de plus, le focus retombe sur
// le document (`<body>`, relevé sur l'export le 24/09/2026). Il doit aller au **titre** de la
// page qui arrive, et hors de toute page inerte. Le geste est joué **au clavier**, comme le ferait
// quelqu'un qui n'utilise pas la souris.
//
// Et sous « réduire les animations », la page change d'un coup : le défilement animé du pager ne
// consultait pas la préférence (`behavior: 'smooth'` du navigateur). La preuve est l'absence de
// **toute** position intermédiaire pendant le passage — avant le correctif, il en passait cinq.
//
// **Le focus se lit aussi PENDANT le passage, et pas seulement au repos** (25/09/2026). La première
// version de cette section ne regardait qu'où le focus finissait : elle restait verte pendant qu'il
// faisait l'aller-retour — titre de la page 1, titre de la page 0, titre de la page 1 —, parce que
// le premier événement du défilement animé, à 2 px de la page qu'on quitte, la faisait redésigner
// par l'arrondi de l'index. Au lecteur d'écran, le titre qu'on vient de quitter était annoncé une
// seconde fois, et la page qui arrive redevenait inerte le temps d'un demi-défilement. D'où le
// journal (`journaliserLeFocus`) : aucun `focusin` ne doit entrer dans la page qu'on quitte, et
// chacune des deux pages ne bascule d'inertie **qu'une fois**. Sous « réduire les animations », il
// n'y a qu'une position, donc rien à voir basculer : la moitié animée est celle qui garde.

/**
 * Posé avant le premier script de la page (`addInitScript`) : chaque `focusin`, et chaque bascule
 * de l'attribut `inert`, avec l'indice de la page du pager qui les porte — par **appartenance**
 * (`contains`), pas par position à l'écran, qui change à chaque image du défilement. L'attribut est
 * posé sur un descendant de l'enveloppe de chaque page, d'où la même recherche pour les deux.
 */
function journaliserLeFocus() {
  const pages = () => {
    const pager = [...document.querySelectorAll('div')].find((d) =>
      ['auto', 'scroll'].includes(getComputedStyle(d).overflowX)
    );
    return pager?.firstElementChild ? [...pager.firstElementChild.children] : [];
  };
  const pageDe = (noeud) => pages().findIndex((p) => p.contains(noeud));
  window.__focus = [];
  window.__inertie = [];
  document.addEventListener(
    'focusin',
    (e) =>
      window.__focus.push({
        page: pageDe(e.target),
        texte: (e.target.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
      }),
    true
  );
  document.addEventListener('DOMContentLoaded', () =>
    new MutationObserver((mutations) => {
      for (const m of mutations) if (m.attributeName === 'inert') window.__inertie.push(pageDe(m.target));
    }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['inert'] })
  );
}

for (const reduire of [false, true]) {
  const page = await ouvrir('/onboarding', {}, { reduire, journal: true });
  try {
    await page.getByRole('button', { name: 'Découvrir mon impact' }).focus();
    // Le `focus()` ci-dessus entre dans la page 0 : c'est le geste, pas la transition. Le journal
    // repart donc de zéro à l'instant de la touche.
    await page.evaluate(() => {
      window.__focus.length = 0;
      window.__inertie.length = 0;
    });
    await page.keyboard.press('Enter');
    const positions = [];
    for (let i = 0; i < 8; i++) {
      positions.push(
        await page.evaluate(() => {
          const pager = [...document.querySelectorAll('div')].find((d) =>
            ['auto', 'scroll'].includes(getComputedStyle(d).overflowX)
          );
          return pager ? { gauche: Math.round(pager.scrollLeft), page: Math.round(pager.clientWidth) } : null;
        })
      );
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(REPOS);
    const focus = await page.evaluate(() => {
      const actif = document.activeElement;
      let inerte = false;
      for (let n = actif; n; n = n.parentElement) if (n.hasAttribute?.('inert')) inerte = true;
      return {
        corps: actif === document.body || actif === null,
        titre: actif?.tagName === 'H1' || actif?.getAttribute?.('role') === 'heading',
        texte: (actif?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
        inerte,
      };
    });

    if (focus.corps || !focus.titre || focus.inerte) {
      echecs.push(
        `/onboarding : après « Découvrir mon impact » au clavier, le focus est sur` +
          ` ${focus.corps ? 'le document' : `« ${focus.texte} »`}${focus.inerte ? ', dans une page inerte' : ''}` +
          ' — il doit être sur le titre de la page qui arrive (`donnerLeFocus`, src/lib/focus.ts).'
      );
    }

    // Le passage lui-même, tel que le journal l'a vu.
    const { passages, inertie } = await page.evaluate(() => ({
      passages: window.__focus,
      inertie: window.__inertie,
    }));
    const quand = reduire ? ' sous « réduire les animations »' : '';
    const retours = passages.filter((p) => p.page === 0);
    if (!passages.some((p) => p.page === 1)) {
      // **Une assertion qu'on ne peut pas jouer est un échec** (même règle que la section A) : sans
      // aucun `focusin` situé dans la page qui arrive, le journal ne sait pas situer les pages, et
      // « aucun retour sur la page 0 » ne prouverait rien.
      echecs.push(
        `/onboarding${quand} : le journal n’a vu aucun focus entrer dans la page qui arrive` +
          ` (relevé : ${JSON.stringify(passages).slice(0, 160)}) — les pages du pager sont` +
          ' introuvables, ou le focus ne les suit plus. Le garde-fou ne peut pas conclure.'
      );
    } else if (retours.length > 0) {
      echecs.push(
        `/onboarding${quand} : pendant le passage à la page 1, le focus est revenu dans la page qu’on` +
          ` quitte (« ${retours[0].texte} ») avant de repartir — un lecteur d’écran réannonce le titre` +
          ' qu’on vient de quitter. Un défilement programmé ne doit pas faire redésigner la page par' +
          ' ses positions intermédiaires (`enVol`, src/app/onboarding/index.tsx).'
      );
    }
    const bascules = [0, 1].map((i) => inertie.filter((p) => p === i).length);
    if (bascules[0] !== 1 || bascules[1] !== 1) {
      echecs.push(
        `/onboarding${quand} : pendant le passage, la page qu’on quitte a basculé d’inertie` +
          ` ${bascules[0]} fois et celle qui arrive ${bascules[1]} fois, là où chacune doit basculer` +
          ' une seule fois — la page qui arrive redevenait inerte le temps d’un demi-défilement.'
      );
    }
    if (reduire) {
      if (positions.some((p) => p === null)) {
        echecs.push('/onboarding : le défileur du pager est introuvable, le défilement n’a pas pu être mesuré.');
      } else {
        const intermediaires = positions.filter((p) => p.gauche !== 0 && p.gauche !== p.page);
        if (intermediaires.length > 0) {
          echecs.push(
            '/onboarding : sous « réduire les animations », la page glisse encore (positions' +
              ` relevées : ${intermediaires.map((p) => p.gauche).join(', ')} px) — le défilement` +
              ' du pager doit sauter d’une page à l’autre.'
          );
        }
      }
    }
  } catch (erreur) {
    echecs.push(`/onboarding (réduire les animations : ${reduire ? 'oui' : 'non'}) : ${String(erreur).slice(0, 180)}`);
  } finally {
    await page.close();
  }
}

// « Retour », sur les pages 2 à 4 depuis le 27/09/2026 (`v1-29` §6.3), passe par le même `allerA`
// que « Continuer » : il doit ramener la page d'avant **et** y poser le focus sur le titre, hors de
// toute page inerte. Joué au clavier depuis la page 2, une seule fois — la moitié « réduire les
// animations » ne dit rien de plus ici, le passage étant celui qu'éprouve la boucle ci-dessus.
//
// Deux mutations le 27/09/2026. « Retour » branché sur `allerA(2)` : cette assertion tombe, seule.
// « Retour » réduit à un `scrollTo` nu, sans `allerA` : **rien ne tombe, et c'est juste** — le focus
// suit l'index quel que soit ce qui le déplace (l'effet sur `index`, src/app/onboarding/index.tsx),
// balayage compris. La moitié « focus » garde donc cet effet, pas le bouton.
{
  const page = await ouvrir('/onboarding');
  try {
    await page.getByRole('button', { name: 'Découvrir mon impact' }).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(REPOS);
    await page.getByRole('button', { name: 'Retour', exact: true }).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(REPOS);
    const apres = await page.evaluate(() => {
      const pager = [...document.querySelectorAll('div')].find((d) =>
        ['auto', 'scroll'].includes(getComputedStyle(d).overflowX)
      );
      const actif = document.activeElement;
      let inerte = false;
      for (let n = actif; n; n = n.parentElement) if (n.hasAttribute?.('inert')) inerte = true;
      return {
        indice: pager ? Math.round(pager.scrollLeft / pager.clientWidth) : null,
        titre: actif?.tagName === 'H1' || actif?.getAttribute?.('role') === 'heading',
        texte: (actif?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
        inerte,
      };
    });
    if (apres.indice !== 0) {
      echecs.push(
        `/onboarding : « Retour » depuis la page 2 mène à la page ${apres.indice === null ? '(pager introuvable)' : apres.indice + 1}` +
          ' — il doit ramener la page 1 (`onPrecedent`, src/app/onboarding/index.tsx).'
      );
    } else if (!apres.titre || apres.inerte) {
      echecs.push(
        `/onboarding : après « Retour » au clavier, le focus est sur « ${apres.texte} »` +
          `${apres.inerte ? ', dans une page inerte' : ''} — il doit être sur le titre de la page 1.`
      );
    }
  } catch (erreur) {
    echecs.push(`/onboarding (« Retour ») : ${String(erreur).slice(0, 180)}`);
  } finally {
    await page.close();
  }
}

// **Les points de pagination se voient, et l'actif se lit par sa forme** (27/09/2026, `v1-29` §6.3).
// Les inactifs ne ressortaient qu'à 1,33:1 sur blanc et 1,37:1 sur la page teintée ; WCAG 1.4.11
// demande 3:1, et ce sont la seule progression visible de l'onboarding. Foncés, ils ne se
// distinguaient plus de l'actif que par la teinte, d'où l'actif allongé. Le fond se lit sur le
// premier ancêtre opaque — c'est ce qui rend la page 3, teintée, différente des autres. Mesuré sur
// les pages 1 et 3 : un fond de chaque sorte.
//
// Deux mutations le 27/09/2026 : inactifs remis en `border` — les deux pages tombent sur le
// contraste ; actif remis à 8 px — les deux pages tombent sur la forme.
{
  const page = await ouvrir('/onboarding');
  try {
    for (const [numero, avant] of [[1, []], [3, ['Découvrir mon impact', 'Continuer']]]) {
      for (const nom of avant) {
        await page.getByRole('button', { name: nom, exact: true }).click();
        await page.waitForTimeout(REPOS);
      }
      const points = await page.evaluate(() => {
        const lire = (css) => {
          const m = css.match(/rgba?\(([^)]+)\)/);
          if (!m) return null;
          const [r, g, b, a = '1'] = m[1].split(',').map((x) => x.trim());
          return [Number(r), Number(g), Number(b), Number(a)];
        };
        const luminance = ([r, g, b]) => {
          const canal = (c) => {
            const v = c / 255;
            return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          };
          return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
        };
        const contraste = (a, b) => {
          const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
          return (l1 + 0.05) / (l2 + 0.05);
        };
        const barre = [...document.querySelectorAll('[role="progressbar"]')].find((e) => !e.closest('[inert]'));
        if (!barre) return null;
        let fond = null;
        for (let n = barre.parentElement; n && !fond; n = n.parentElement) {
          const c = lire(getComputedStyle(n).backgroundColor);
          if (c && c[3] === 1) fond = c;
        }
        if (!fond) return null;
        return [...barre.children].map((p) => ({
          largeur: Math.round(p.getBoundingClientRect().width),
          contraste: Math.round(contraste(lire(getComputedStyle(p).backgroundColor), fond) * 100) / 100,
        }));
      });
      if (points === null || points.length !== 4) {
        echecs.push(`/onboarding, page ${numero} : les points de progression sont introuvables — la garde ne peut pas conclure.`);
        continue;
      }
      const actif = points[numero - 1];
      const inactifs = points.filter((_, i) => i !== numero - 1);
      const pale = inactifs.find((p) => p.contraste < 3);
      if (pale) {
        echecs.push(
          `/onboarding, page ${numero} : un point inactif ne ressort qu’à ${pale.contraste}:1 sur son fond — 3:1 au moins` +
            ' (WCAG 1.4.11, `fieldBorder`, src/components/onboarding-dots.tsx).'
        );
      }
      if (!inactifs.every((p) => actif.largeur > p.largeur)) {
        echecs.push(
          `/onboarding, page ${numero} : le point actif mesure ${actif.largeur} px comme les autres — il doit se lire` +
            ' par sa forme, pas seulement par sa teinte (WCAG 1.4.1).'
        );
      }
    }
  } catch (erreur) {
    echecs.push(`/onboarding (les points) : ${String(erreur).slice(0, 180)}`);
  } finally {
    await page.close();
  }
}

// ── F. La barre d'espace coche une case d'option (25/09/2026) ──────────────────────────────────
//
// react-native-web n'active par Espace qu'un `<button>` ou un `role="button"` (`PressResponder`,
// `isValidKeyPress`) : depuis que les puces et les rangées sont des `radio` (24/09/2026, `v1-29`),
// Espace n'y cochait plus rien et faisait défiler la page — seule Entrée marchait, là où WAI-ARIA
// attend Espace. `activableALaBarreDEspace` (`src/lib/barre-d-espace.ts`) le rend, et les trois
// composants de choix que le questionnaire rend **sans réseau** sont éprouvés ici : une rangée, une
// puce, un item de mode, chacun depuis un brouillon posé dans le stockage. La ligne de canal et les
// cases à cocher des jours demandent une session : c'est le parcours réel qui les joue.
//
// Deux mesures par choix, et la seconde n'est pas du zèle : la case passe à `aria-checked="true"`,
// **et rien n'a défilé** — une correction qui oublierait `preventDefault()` cocherait bien, sous une
// page qui saute d'un écran. Et une mesure qu'on ne peut pas prendre est un échec, pas un succès : si
// rien ne pouvait défiler sous le choix, l'absence de défilement ne prouverait rien, et le script le
// dit plutôt que de conclure. D'où une fenêtre basse, que l'étape dépasse.
const brouillonDe = (step, answers) => JSON.stringify({ step, answers, savedAt: new Date().toISOString() });
const JOURS_ET_TRANCHE = brouillonDe('commute_days_distance', {
  commute_has_regular_trip: true,
  commute_distance_bracket: '5_15',
});

const CASES_A_L_ESPACE = [
  { quoi: 'une rangée (`ChoiceRow`)', marques: { [BROUILLON]: JOURS_ET_TRANCHE }, nom: 'Moins de 5 km' },
  { quoi: 'une puce (`Chip`)', marques: { [BROUILLON]: JOURS_ET_TRANCHE }, nom: '3' },
  {
    quoi: 'un item de mode (`ModeListItem`)',
    marques: {
      [BROUILLON]: brouillonDe('commute_mode', {
        commute_has_regular_trip: true,
        commute_days_per_week: 5,
        commute_distance_km: 30,
      }),
    },
    nom: 'Bus',
  },
];

for (const { quoi, marques, nom } of CASES_A_L_ESPACE) {
  const page = await ouvrir('/bilan', marques, { hauteur: 560 });
  try {
    const choix = page.getByRole('radio', { name: nom, exact: true });
    await choix.waitFor({ state: 'visible', timeout: ATTENTE });
    await choix.focus();
    // La mesure est partagée avec le parcours réel (`mesurer-un-choix.mjs`), qui joue le même geste
    // sur les cases à cocher de l'engagement.
    const avant = await choix.evaluate(mesurerUnChoix);
    if (avant.etat !== 'false' || !avant.focus || !avant.peutDefiler) {
      echecs.push(
        `/bilan, ${quoi} « ${nom} » : la mesure ne peut pas se prendre — ` +
          (avant.etat !== 'false'
            ? `le choix est déjà annoncé « ${avant.etat} » avant l’appui.`
            : !avant.focus
              ? 'il ne prend pas le focus.'
              : 'rien ne peut défiler sous lui, donc l’absence de défilement ne prouverait rien.')
      );
      continue;
    }
    await page.keyboard.press('Space');
    // Le défilement du navigateur est animé : on laisse passer l'animation avant de relire.
    await page.waitForTimeout(600);
    const apres = await choix.evaluate(mesurerUnChoix);
    if (apres.etat !== 'true') {
      echecs.push(
        `/bilan, ${quoi} « ${nom} » : Espace ne coche pas le choix (aria-checked="${apres.etat}"). ` +
          'react-native-web ne gère Espace que sur un bouton : le composant doit décomposer' +
          ' `activableALaBarreDEspace` (src/lib/barre-d-espace.ts).'
      );
    }
    if (apres.positions !== avant.positions) {
      echecs.push(
        `/bilan, ${quoi} « ${nom} » : Espace fait défiler la page (${avant.positions} →` +
          ` ${apres.positions} px) — l’appui doit être retenu par preventDefault().`
      );
    }
  } catch (erreur) {
    echecs.push(`/bilan, ${quoi} « ${nom} » : ${String(erreur).slice(0, 180)}`);
  } finally {
    await page.close();
  }
}

// ── G. Le questionnaire : le focus suit l'étape ────────────────────────────────────────────────
//
// « Suivant » laisse le bouton en place et change la question au-dessus de lui : sans rien de plus,
// le focus reste sur le bouton qu'on vient d'actionner — ou tombait sur le document tant que le
// « Suivant » de l'étape qui arrive était désactivé ; il est « en attente » depuis `v1-31`, et agit —,
// et rien de la question qui arrive n'est annoncé (C1.9). `StepShell` le déplace, et **la cible n'est pas la
// même selon la plateforme** depuis le 25/09/2026 : le conteneur de l'étape sur web, son titre sur
// natif, où le conteneur est aplati et ne reçoit rien (le commentaire de
// `src/components/bilan/step-shell.tsx` dit pourquoi).
// Rien ne vérifiait la moitié web, alors qu'elle était la seule observable : cette section la tient.
//
// L'assertion porte sur ce que la personne obtient, pas sur l'élément choisi : le focus est sur la
// question qui arrive, ou sur un conteneur dont elle est le premier titre — la forme d'aujourd'hui.
// Une cible qui ne sait pas recevoir le focus (un titre sans `tabIndex` sur web) échoue sans bruit
// et laisse le focus là où il était : sur « Suivant », qu'on vient d'actionner — le document tant
// que le « Suivant » de l'étape qui arrive était désactivé, avant `v1-31`. Les deux conditions
// ensemble couvrent les deux.
const QUESTION_SUIVANTE = 'Ce trajet, tu le fais combien de jours par semaine ?';
{
  const page = await ouvrir('/bilan');
  try {
    await page.getByRole('radio', { name: 'Oui', exact: true }).click();
    const suivant = page.getByRole('button', { name: 'Suivant', exact: true });
    await suivant.focus();
    await page.keyboard.press('Enter');
    await page
      .waitForFunction((t) => document.body.innerText.replace(/\s+/g, ' ').includes(t), QUESTION_SUIVANTE, {
        timeout: ATTENTE,
      })
      .catch(() => {});
    await page.waitForTimeout(REPOS);
    const focus = await page.evaluate(() => {
      const actif = document.activeElement;
      const normaliser = (t) => (t ?? '').replace(/\s+/g, ' ').trim();
      const estUnTitre = (n) => n?.tagName === 'H1' || n?.getAttribute?.('role') === 'heading';
      const titre = estUnTitre(actif) ? actif : actif?.querySelector?.('h1, [role="heading"]');
      return {
        corps: actif === document.body || actif === null,
        texte: normaliser(actif?.innerText).slice(0, 80),
        titre: titre ? normaliser(titre.innerText) : null,
      };
    });
    if (focus.corps || focus.titre !== QUESTION_SUIVANTE) {
      echecs.push(
        `/bilan : après « Suivant » au clavier, le focus est sur` +
          ` ${focus.corps ? 'le document' : `« ${focus.texte} »`} — il doit être sur la question qui` +
          ` arrive (« ${QUESTION_SUIVANTE} ») ou sur le conteneur qu’elle ouvre (\`StepShell\`).`
      );
    }
  } catch (erreur) {
    echecs.push(`/bilan, focus d’étape : ${String(erreur).slice(0, 180)}`);
  } finally {
    await page.close();
  }
}

// ── H. « Voir les autres modes » : le focus va au premier mode révélé ────────────────────────────
//
// Le lien disparaît sous le geste qui l'active : au clavier, le focus partait avec lui et retombait
// sur le document — la tabulation repartait du haut de la page, et rien des cinq modes qui venaient
// d'arriver n'était annoncé (`v1-29` §6.4, mesuré le 24/09/2026 et corrigé le 25). Le focus va
// désormais au premier mode révélé (`leisure-detail.tsx`). L'étape s'ouvre depuis un brouillon,
// sans réseau, comme en section F.
//
// Deux moitiés, et la seconde n'est pas du zèle : le focus arrive sur le premier mode révélé
// **après** le geste, et il n'y est **pas** quand la liste s'ouvre déjà dépliée — un brouillon dont
// le mode est dans la seconde liste —, où il n'y a aucun geste à suivre. Sans elle, une correction
// qui donnerait le focus à chaque montage passerait, en volant le focus de qui arrive sur l'étape.
//
// **Le premier révélé se lit dans la source, jamais en dur** (29/09/2026, `v1-31` §4.1). Il était
// écrit « Bus », et les modes se sont rangés par famille : c'est désormais « Deux-roues motorisé ».
// Resté en dur, la première moitié tombait — et surtout **la seconde devenait muette** : elle cherche
// « Bus » dans le journal du focus, et un focus volé au montage passerait par le deux-roues sans
// qu'elle le voie (la mutation H2). Le nom se lit donc dans le tableau littéral
// `LEISURE_MODE_CHOICES_MORE` de `src/constants/transport-modes.ts`, par une expression régulière —
// comme `verifier-parcours-reel.mjs` lit `theme.ts` —, et une source qui ne le porte plus fait échouer
// la section en le disant, plutôt que de retomber sur un nom écrit ici.
//
// Mutations du 25/09/2026, chacune sur un export reconstruit (`--clear`) :
//   H1 — l'appel à `donnerLeFocus` retiré (le défaut d'origine) : la première moitié tombe, « le
//        focus est sur le document », et elle seule. Le marqueur de la mutation n'était pas dans le
//        bundle — le minifieur retire une expression sans effet —, c'est l'échec qui prouve que
//        l'export était bien le muté.
//   H2 — la garde du geste retirée (`vientDeDeplier`), donc le focus donné à chaque montage : la
//        seconde moitié **restait verte** sous sa première forme, qui lisait `activeElement` à la
//        fin — `StepShell` reprend le focus pour le titre de l'étape juste après, et le vol passait
//        inaperçu. Elle lit désormais le journal du focus (`journaliserLeFocus`), et tombe, seule.
//
// Rejouées le 29/09/2026 sur le commit de `v1-31` §4.1 (le premier révélé devenu « Deux-roues motorisé »),
// chacune avec son export (`--clear`, cache Metro privé) ; le témoin sort vert, toutes sections :
//   H2 — la garde du geste retirée : la seconde moitié tombe, « le focus est sur « Deux-roues
//        motorisé » sans qu'aucun geste ne l'y ait envoyé », et elle seule ;
//   H3 — « Bus » remis en dur ici, à la place de la lecture de la source : la première moitié tombe
//        (le focus est sur « Deux-roues motorisé »), et elle seule ;
//   H4 — les deux ensemble : **seule la première moitié tombe**, le vol de focus de H2 passant sous
//        une seconde moitié qui cherche « Bus » dans le journal. C'est la garde muette que la lecture
//        de la source évite.
const PREMIER_REVELE = (() => {
  const source = readFileSync('src/constants/transport-modes.ts', 'utf8');
  const tableau = source.match(/export const LEISURE_MODE_CHOICES_MORE[^=]*=\s*\[([\s\S]*?)\];/)?.[1];
  return tableau?.match(/\blabel:\s*'([^']+)'/)?.[1] ?? null;
})();
const ETAPE_DES_SORTIES = (mode) =>
  brouillonDe('leisure_detail', {
    commute_has_regular_trip: false,
    leisure_frequency: 'weekly',
    leisure_mode: mode,
  });
if (PREMIER_REVELE === null) {
  echecs.push(
    '/bilan, « Voir les autres modes » : le premier mode de `LEISURE_MODE_CHOICES_MORE` est introuvable dans' +
      ' src/constants/transport-modes.ts — le tableau doit rester littéral (section H), ou ce motif s’adapter.'
  );
} else {
  {
    const page = await ouvrir('/bilan', { [BROUILLON]: ETAPE_DES_SORTIES(null) });
    try {
      const lien = page.getByRole('button', { name: 'Voir les autres modes', exact: true });
      await lien.waitFor({ state: 'visible', timeout: ATTENTE });
      await lien.focus();
      await page.keyboard.press('Enter');
      await page
        .getByRole('radio', { name: PREMIER_REVELE, exact: true })
        .waitFor({ state: 'visible', timeout: ATTENTE })
        .catch(() => {});
      await page.waitForTimeout(REPOS);
      const focus = await page.evaluate(() => {
        const actif = document.activeElement;
        return {
          corps: actif === document.body || actif === null,
          role: actif?.getAttribute?.('role') ?? null,
          texte: (actif?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
        };
      });
      if (focus.corps || focus.role !== 'radio' || focus.texte !== PREMIER_REVELE) {
        echecs.push(
          `/bilan, étape des sorties : après « Voir les autres modes » au clavier, le focus est sur` +
            ` ${focus.corps ? 'le document' : `« ${focus.texte} » (rôle ${focus.role})`} — il doit être` +
            ` sur le premier mode révélé, « ${PREMIER_REVELE} » (\`donnerLeFocus\`, leisure-detail.tsx).`
        );
      }
    } catch (erreur) {
      echecs.push(`/bilan, « Voir les autres modes » : ${String(erreur).slice(0, 180)}`);
    } finally {
      await page.close();
    }
  }
  {
    const page = await ouvrir('/bilan', { [BROUILLON]: ETAPE_DES_SORTIES('marche') }, { journal: true });
    try {
      const premier = page.getByRole('radio', { name: PREMIER_REVELE, exact: true });
      await premier.waitFor({ state: 'visible', timeout: ATTENTE });
      await page.waitForTimeout(REPOS);
      // Le **journal**, et non le focus final : jusqu'au 29/09/2026, `StepShell` donnait le focus à
      // l'étape qu'un brouillon rouvrait, dans son propre effet, **après** celui de la liste — un
      // parent après ses enfants. Un vol de focus au montage passait donc par le premier révélé puis
      // en repartait, et lire `activeElement` à la fin ne le voyait pas (mutation H2 du 25/09/2026,
      // restée verte sous cette première forme). `StepShell` ne suit plus qu'une entrée qui a un sens
      // (`v1-31` §9, écart 13), mais le journal reste la bonne lecture : il voit un passage.
      const vole = await page.evaluate(
        (nom) => window.__focus.some((entree) => entree.texte === nom),
        PREMIER_REVELE
      );
      if (vole) {
        echecs.push(
          `/bilan, étape des sorties ouverte déjà dépliée : le focus est sur « ${PREMIER_REVELE} » sans` +
            ' qu’aucun geste ne l’y ait envoyé — il ne doit suivre que « Voir les autres modes », jamais le montage.'
        );
      }
    } catch (erreur) {
      echecs.push(`/bilan, liste des sorties déjà dépliée : ${String(erreur).slice(0, 180)}`);
    } finally {
      await page.close();
    }
  }
}

// ── I. Un groupe de cases d'option au clavier : un arrêt, et les flèches ────────────────────────
//
// Les options sont des `div` à `role="radio"`, pas des `<input type="radio">` : react-native-web
// leur donnait à chacune `tabindex="0"` et ne faisait rien des flèches — dix modes, dix tabulations,
// aucune flèche (`v1-29` §6.4). `GroupeDeChoix` branche désormais le motif de WAI-ARIA sur web
// (`src/lib/groupe-au-clavier.ts`) : un seul arrêt de tabulation par groupe, l'option cochée ou la
// première, et les flèches qui passent d'une option à l'autre en la cochant. Les décisions pures
// (boucle, options désactivées, modificateurs) sont gardées par Jest ; ici, ce que seul un navigateur
// montre, sur deux étapes qui couvrent les deux rendus du groupe :
//
//  - **l'étape du mode, avec la motorisation ouverte sous « Voiture (seul) »** — la précision
//    imbriquée, qui est le piège : ses options sont aussi des descendants du groupe du mode. Chaque
//    groupe doit avoir son propre arrêt, la flèche de la motorisation ne doit pas décocher le mode,
//    et celle du mode doit sauter la motorisation ;
//  - **les jours de trajet**, rendus en grille (`colonnes`) — l'autre branche du composant, où les
//    options sont enveloppées chacune dans une cellule.
//
// Le défilement que la flèche ferait sinon se lit sur l'événement (`defaultPrevented`, relevé par un
// écouteur posé sur la fenêtre, qui passe après celui du groupe) plutôt qu'à la position de la page :
// le focus donné à l'option voisine peut légitimement la faire défiler pour la montrer.
//
// Mutations du 25/09/2026, un export chacune (`--clear`, marqueur de la mutation retrouvé dans le
// bundle), plus un témoin sans mutation qui sort vert :
//
//   | Ce qu'on casse | Ce qui tombe |
//   |---|---|
//   | `GroupeDeChoix` n'appelle plus le branchement (l'état d'avant) | tout : chaque option est un arrêt, dans les trois groupes ; aucune flèche ne déplace ni n'est retenue |
//   | le filtre du groupe le plus proche retiré | la page ne répond plus, et l'attente de « Thermique » expire |
//   | la flèche déplace le focus sans cocher | les trois flèches, sur `aria-checked` seulement, et l'arrêt du mode resté sur « Voiture (seul) » |
//   | `preventDefault()` retiré | les quatre flèches, sur `defaultPrevented` seulement |
//   | l'arrêt de tabulation jamais rangé | les trois relevés d'arrêts, et eux seuls |
//   | la grille sans référence (`colonnes`) | les jours, et eux seuls — la motorisation et le mode passent |
//
// La deuxième ne dit pas pourquoi, et la cause n'a pas été mesurée plus avant : la plus probable est
// que les deux groupes revendiquent alors la motorisation et se renvoient son arrêt de tabulation,
// chaque écriture réveillant l'observateur de l'autre. Le filtre n'est donc pas une finesse.
//
// Une septième mutation n'a rien fait tomber, et c'est elle qui a simplifié le code : retirer le
// contrôle du rôle et du groupe de la cible. La liste des options faisait déjà ce travail — une
// option d'un autre groupe n'y a pas d'indice —, et les deux gardes n'en font plus qu'une,
// `effetDeLaFleche` (`src/types/groupe-au-clavier.ts`), éprouvée par Jest. Les trois mutations du
// milieu ont été rejouées sur cette forme finale, avec le même résultat.
const QUESTION_DU_MODE = 'Quel est ton mode de transport principal pour ce trajet ?';
const ETAPE_DU_MODE_EN_VOITURE = brouillonDe('commute_mode', {
  commute_has_regular_trip: true,
  commute_days_per_week: 5,
  commute_distance_km: 30,
  commute_mode: 'voiture',
  commute_is_carpool: false,
  commute_car_engine: 'thermique',
});

/** Pour chaque groupe nommé, ses options qui sont un arrêt de tabulation — évaluée dans la page. */
function arretsDesGroupes() {
  const nom = (n) => n.getAttribute('aria-label') ?? (n.innerText ?? '').trim();
  return Object.fromEntries(
    [...document.querySelectorAll('[role="radiogroup"]')].map((groupe) => [
      groupe.getAttribute('aria-label'),
      [...groupe.querySelectorAll('[role="radio"]')]
        .filter((o) => o.closest('[role="radiogroup"]') === groupe && o.getAttribute('tabindex') === '0')
        .map(nom),
    ])
  );
}

/** L'option qui a le focus, son état, et si la dernière flèche a été retenue — évaluée dans la page. */
function lireApresLaFleche() {
  const actif = document.activeElement;
  return {
    role: actif?.getAttribute?.('role') ?? null,
    nom: actif?.getAttribute?.('aria-label') ?? null,
    coche: actif?.getAttribute?.('aria-checked') ?? null,
    retenue: window.__flecheRetenue ?? null,
  };
}

async function fleche(page, touche) {
  await page.evaluate(() => {
    window.__flecheRetenue = null;
    if (!window.__ecouteDesFleches) {
      window.__ecouteDesFleches = true;
      window.addEventListener('keydown', (e) => {
        if (e.key.startsWith('Arrow')) window.__flecheRetenue = e.defaultPrevented;
      });
    }
  });
  await page.keyboard.press(touche);
  await page.waitForTimeout(400);
  return page.evaluate(lireApresLaFleche);
}

function verifierLaFleche(ou, touche, lu, attendu) {
  if (lu.role !== 'radio' || lu.nom !== attendu || lu.coche !== 'true') {
    echecs.push(
      `${ou} : ${touche} doit porter le focus sur « ${attendu} » et la cocher — le focus est sur` +
        ` « ${lu.nom ?? '(rien)'} » (rôle ${lu.role}, aria-checked="${lu.coche}")` +
        ' (`brancherLeClavierDuGroupe`, src/lib/groupe-au-clavier.ts).'
    );
  }
  if (lu.retenue !== true) {
    echecs.push(`${ou} : ${touche} n’est pas retenue (defaultPrevented = ${lu.retenue}) — la page défilerait sous le choix.`);
  }
}

function verifierLesArrets(ou, arrets, attendus) {
  for (const [groupe, attendu] of Object.entries(attendus)) {
    const lus = arrets[groupe];
    if (!lus || lus.length !== 1 || lus[0] !== attendu) {
      echecs.push(
        `${ou}, groupe « ${groupe} » : un seul arrêt de tabulation attendu, « ${attendu} » — relevé` +
          ` ${lus ? `[${lus.map((n) => `« ${n} »`).join(', ')}]` : 'aucun groupe de ce nom'}.`
      );
    }
  }
}

{
  const ou = '/bilan, étape du mode avec la motorisation ouverte';
  const page = await ouvrir('/bilan', { [BROUILLON]: ETAPE_DU_MODE_EN_VOITURE });
  try {
    const thermique = page.getByRole('radio', { name: 'Thermique', exact: true });
    await thermique.waitFor({ state: 'visible', timeout: ATTENTE });
    await page.waitForTimeout(REPOS);
    verifierLesArrets(ou, await page.evaluate(arretsDesGroupes), {
      [QUESTION_DU_MODE]: 'Voiture (seul)',
      'Quelle motorisation ?': 'Thermique',
    });

    await thermique.focus();
    verifierLaFleche(`${ou}, dans la motorisation`, 'ArrowDown', await fleche(page, 'ArrowDown'), 'Hybride');
    const modeToujoursCoche = await page
      .getByRole('radio', { name: 'Voiture (seul)', exact: true })
      .evaluate((n) => n.getAttribute('aria-checked'));
    if (modeToujoursCoche !== 'true') {
      echecs.push(`${ou} : la flèche de la motorisation a décoché « Voiture (seul) » — elle doit rester dans son groupe.`);
    }
    verifierLaFleche(`${ou}, dans la motorisation`, 'ArrowUp', await fleche(page, 'ArrowUp'), 'Thermique');

    await page.getByRole('radio', { name: 'Voiture (seul)', exact: true }).focus();
    verifierLaFleche(`${ou}, dans le mode`, 'ArrowDown', await fleche(page, 'ArrowDown'), 'Voiture (covoiturage)');
    verifierLesArrets(`${ou}, après la flèche`, await page.evaluate(arretsDesGroupes), {
      [QUESTION_DU_MODE]: 'Voiture (covoiturage)',
    });
  } catch (erreur) {
    echecs.push(`${ou} : ${String(erreur).slice(0, 180)}`);
  } finally {
    await page.close();
  }
}
{
  const ou = '/bilan, jours de trajet en grille';
  const page = await ouvrir('/bilan', { [BROUILLON]: JOURS_ET_TRANCHE });
  try {
    const trois = page.getByRole('radio', { name: '3', exact: true });
    await trois.waitFor({ state: 'visible', timeout: ATTENTE });
    await page.waitForTimeout(REPOS);
    // Aucun jour n'est coché dans ce brouillon : l'arrêt est le premier.
    verifierLesArrets(ou, await page.evaluate(arretsDesGroupes), {
      'Ce trajet, tu le fais combien de jours par semaine ?': '1',
    });
    await trois.focus();
    verifierLaFleche(ou, 'ArrowRight', await fleche(page, 'ArrowRight'), '4');
  } catch (erreur) {
    echecs.push(`${ou} : ${String(erreur).slice(0, 180)}`);
  } finally {
    await page.close();
  }
}

// ── J. Le mouvement, relevé image par image, avec et sans « réduire les animations » (v1-30) ────
//
// Une animation ne se juge pas au repos : une étape qui entre et une étape posée d'emblée finissent
// au même endroit, donc tout ce qu'on voudrait savoir se lit **pendant** — à chaque image, par
// `requestAnimationFrame` (`scripts/relever-par-image.mjs`, partagé avec le parcours réel). Et la préférence n'est pas un réglage de plus : sous
// elle, tout doit être posé dès la première image, et deux des trois mécanismes employés ici ne la
// lisent pas d'eux-mêmes (`v1-30` §4.2). Chaque garde a donc deux moitiés, et la seconde n'est pas
// la première à l'envers : l'une prouve que ça bouge, l'autre que rien ne bouge quand on l'a demandé.
//
// Quatre moments, tous atteignables sans réseau :
//
//  - **la barre d'onglets au démarrage** ne glisse pas — une barre qui arriverait à chaque ouverture
//    de l'app serait le pire effet du chantier, et elle n'a le droit de glisser qu'en arrivant, au
//    « Compris » du premier plan (`barreArrive`) : ce moment-là demande des données, et c'est le
//    parcours réel qui le garde ;
//  - **l'étape du questionnaire** entre du côté du parcours — de la droite en avançant, de la gauche
//    en reculant —, et le rail de progression avance au lieu de sauter ;
//  - **une précision qui s'ouvre** (« Quelle motorisation ? ») fait descendre ce qui est dessous
//    au lieu de le pousser d'un coup, et ne s'ouvre pas sous les yeux quand l'étape arrive déjà
//    ouverte, depuis un brouillon ;
//  - **les onglets** passent l'un à l'autre en fondu. Relevé au **retour** sur un onglet déjà
//    visité : le premier passage monte l'écran, et un runner lent pourrait avaler le fondu dans ce
//    montage.
//
// **Éprouvée en la cassant le 27/09/2026** : douze mutations, un export chacune (cache Metro isolé,
// `--clear`), sur un arbre dont le témoin sort vert deux fois de suite. Chacune fait tomber ce
// qu'elle devait faire tomber, et rien d'autre dans tout le script :
//
//   | Ce qu'on casse | Ce qui tombe |
//   |---|---|
//   | J1 — `barreArrive` ignore l'état d'avant | la barre au démarrage, sous les **trois** marques (opacité 0, 60 px sous sa place) |
//   | J2 — `styleDEntree` ne rend jamais d'animation (réécrite le 28/09) | l'étape, moitié animée : ni en fondu, ni à droite, ni à gauche |
//   | J3 — les deux sens intervertis | l'étape, moitié animée, sur le **sens** seul : en fondu oui, droite et gauche non |
//   | J4 — `styleDEntree` ignore la préférence | l'étape sous la préférence : translucide et décalée |
//   | J5 — la durée du rail sans `dureeSelonLaPreference` | le rail sous la préférence, et lui seul |
//   | J6 — le rail sans transition | le rail animé : de 37,6 à 75,2 px d'un coup |
//   | J7 — `Depliage` ne s'anime jamais | la précision, moitié animée : ni le dessous en chemin, ni le fondu |
//   | J8 — `SansApparitionAuMontage` démarre à faux (réécrite le 28/09) | la précision rouverte depuis un brouillon, qui s'ouvre sous les yeux |
//   | J9 — `Depliage` ignore la préférence, deux fois | la précision sous la préférence : en chemin et en fondu |
//   | J10 — `animationDesOnglets` rend toujours « fade » | les onglets sous la préférence : dix images de fondu |
//   | J11 — `animationDesOnglets` rend toujours « none » | les onglets animés : aucune image de fondu |
//   | J12 — `Depliage` ignore la préférence, une seule fois (`useJoue`, qui s'appelait `useJoueAuMontage` avant `v1-31` §2.7) | la précision sous la préférence : présente, mais sans aucune place |
//   | J13 — `entering` remis sur l'étape, l'ancien défaut (28/09) | l'étape animée sur le sens seul (en fondu oui, droite et gauche non), l'étape sous la préférence (« Suivant » ne se clique plus), et la précision rouverte, qui entre en fondu avec son étape |
//   | J14 — `entering` remis sur `Depliage` (28/09) | le focus de « Voir les autres modes » (section H) et la précision rouverte ; la moitié animée de la précision reste verte : masquée avant d'apparaître, elle entre en fondu |
//   | J15 — la marque « fait » lue comme « questionnaire » (28/09) | la barre absente sous « fait » (section des états de barre), et J1 sous « fait » : « n'a pas pu être relevée » |
//   | J16 — l'étape disparaît 110 ms une fois là (28/09) | l'étape, dans ses deux moitiés, et la précision rouverte : « a disparu une fois là » |
//   | J17 — la barre disparaît 110 ms une fois là (28/09) | la barre au démarrage, sous les trois marques : « disparaît après être apparue » |
//
// **J9 casse deux défenses supposées ; J12 n'en casse qu'une, et c'est elle qui a appris quelque
// chose.** On attendait de `withTiming` (`ReduceMotion.System`) qu'il pose la hauteur en une image,
// donc une garde incapable de rien voir. Mesuré : la précision **ne s'ouvre pas du tout**, elle reste
// à hauteur nulle — une question invisible, pire qu'un mouvement de trop. La seconde défense n'en est
// pas une ici, et la garde nomme ce cas à part (« présente, mais sans aucune place »). J2, J3 et J7
// ont été rejouées après le passage à `enChemin`, avec les mêmes chutes ; les huit autres portent
// sur des assertions que ce passage n'a pas touchées, ou a resserrées.
//
// **Le 28/09/2026, après la seconde contre-lecture**, sur b4f25c1 et un témoin vert : J2 et J8
// réécrites — l'ancienne J2 (`StepShell` sans entrée) ne compile plus depuis qu'`entree` est
// obligatoire, et l'ancienne J8 (sans fournisseur) ne tombe plus où elle doit — sans fournisseur
// rien ne s'anime, donc c'est la moitié animée de la précision qui tombe, la chute de J7 —, puis J13
// à J17 pour les contrôles de présence et de disparition. **J13 et
// J14 ont appris quelque chose** : `entering` masque sa cible **avant** de la montrer, donc ce n'est
// pas le contrôle de disparition qui le voit, mais le sens, le fondu et le focus. Ce contrôle-là
// voit un **clignotement**, et il a fallu en fabriquer un (J16, J17) pour le prouver.
// J3 dit ce que J2 ne dit pas : l'assertion lit le **côté**, pas seulement qu'il se passe quelque
// chose.

// La barre ne glisse pas au démarrage, quelle que soit la marque qui la laisse visible.
for (const marque of [null, 'barre', 'fait']) {
  const ou = `/plan au démarrage, marque « ${marque ?? '(aucune)'} »`;
  const page = await ouvrir('/plan', marque === null ? {} : { [PARCOURS]: marque }, {
    releve: { mesures: { barre: ['barre'] }, duree: 4_000 },
  });
  try {
    const finale = await mesurer(page, 'barre');
    const images = (await echantillons(page)).map((e) => e.barre);
    const vues = images.filter(Boolean);
    const enChemin = vues.find((v) => v.opacite < 0.99 || Math.abs(v.haut - (finale?.haut ?? v.haut)) > 0.5);
    if (finale === null || vues.length === 0) {
      echecs.push(`${ou} : la barre d’onglets n’a pas pu être relevée — la garde ne peut pas conclure.`);
    } else if (disparaitApresEtreApparue(images)) {
      // « Rien ne bouge » ne vaut que sur les images où la barre était là.
      echecs.push(`${ou} : la barre d’onglets disparaît après être apparue, à l’ouverture de l’app.`);
    } else if (enChemin) {
      echecs.push(
        `${ou} : la barre d’onglets bouge à l’ouverture de l’app (opacité ${enChemin.opacite.toFixed(2)},` +
          ` ${Math.round(enChemin.haut - finale.haut)} px sous sa place) — elle ne doit glisser qu’en` +
          ' arrivant, au « Compris » du premier plan (`barreArrive`, src/types/mouvement.ts).'
      );
    }
  } catch (erreur) {
    echecs.push(`${ou} : ${String(erreur).slice(0, 180)}`);
  } finally {
    await page.close();
  }
}

// L'étape entre du côté du parcours, le rail avance ; sous la préférence, tout est posé.
for (const reduire of [false, true]) {
  const ou = `/bilan, changement d’étape${reduire ? ' sous « réduire les animations »' : ''}`;
  const page = await ouvrir('/bilan', {}, { reduire, releve: true });
  try {
    await page.getByRole('radio', { name: 'Oui', exact: true }).click();
    const railAvant = await mesurer(page, 'rail');
    const enAvant = await releverPendant(
      page,
      { titre: ['titre', QUESTION_SUIVANTE], rail: ['rail'] },
      () => page.getByRole('button', { name: 'Suivant', exact: true }).click()
    );
    const titreFinal = await mesurer(page, 'titre', QUESTION_SUIVANTE);
    const railApres = await mesurer(page, 'rail');
    await page.waitForTimeout(REPOS);
    const enArriere = await releverPendant(page, { titre: ['titre', TITRE_PREMIERE] }, () =>
      page.getByRole('button', { name: 'Retour', exact: true }).click()
    );
    const titreRevenu = await mesurer(page, 'titre', TITRE_PREMIERE);

    if (!titreFinal || !titreRevenu || !railAvant || !railApres || railApres.largeur <= railAvant.largeur + 1) {
      echecs.push(
        `${ou} : la mesure ne peut pas se prendre — titre d’arrivée ${titreFinal ? 'trouvé' : 'introuvable'},` +
          ` titre du retour ${titreRevenu ? 'trouvé' : 'introuvable'}, rail` +
          ` ${railAvant && railApres ? `de ${railAvant.largeur} à ${railApres.largeur} px` : 'introuvable'}` +
          ' (`progress-header.tsx` : la piste suit la ligne « Étape N sur M »).'
      );
    } else if (
      !enAvant.some((e) => e.titre) ||
      !enArriere.some((e) => e.titre) ||
      disparaitApresEtreApparue(enAvant.map((e) => e.titre)) ||
      disparaitApresEtreApparue(enArriere.map((e) => e.titre))
    ) {
      // Une étape jamais relevée pendant son entrée, ou masquée une fois là, ne laisse rien à
      // juger ; et une moitié « rien ne bouge » qui ne regarderait que les images où le titre est là
      // conclurait sur ce qu'elle ne voit pas. (`entering`, lui, masque **avant** de montrer : ce
      // sont le sens et le fondu qui le voient, J13.)
      echecs.push(
        `${ou} : le titre de l’étape n’a pas été relevé pendant son entrée, ou a disparu une fois là —` +
          ' une étape masquée ne reçoit pas le focus (`v1-30` §3.2).'
      );
    } else {
      const titres = enAvant.map((e) => e.titre).filter(Boolean);
      const retours = enArriere.map((e) => e.titre).filter(Boolean);
      // Animée, chaque moitié demande un **mouvement** (`enChemin`) : une image décalée puis une posée
      // serait un saut. Le côté se lit sur le départ observé, le plus loin de la place d'arrivée.
      const entreEnFondu =
        enChemin(titres.map((v) => v.opacite), 1, 0.02) && enChemin(retours.map((v) => v.opacite), 1, 0.02);
      const depuisLaDroite =
        plusLoin(titres.map((v) => v.gauche), titreFinal.gauche) > titreFinal.gauche + 0.5 &&
        enChemin(titres.map((v) => v.gauche), titreFinal.gauche);
      const depuisLaGauche =
        plusLoin(retours.map((v) => v.gauche), titreRevenu.gauche) < titreRevenu.gauche - 0.5 &&
        enChemin(retours.map((v) => v.gauche), titreRevenu.gauche);
      // Sous la préférence, la moindre image hors de sa place est de trop — une seule suffit à tomber.
      const translucide = titres.some((v) => v.opacite < 0.99) || retours.some((v) => v.opacite < 0.99);
      const decales = [...titres, ...retours].some(
        (v) => Math.abs(v.gauche - (titres.includes(v) ? titreFinal : titreRevenu).gauche) > 0.5
      );
      const railEnChemin = enAvant.some((e) => e.rail && entre(e.rail.largeur, railAvant.largeur, railApres.largeur));
      if (!reduire) {
        if (!entreEnFondu || !depuisLaDroite || !depuisLaGauche) {
          echecs.push(
            `${ou} : l’étape doit entrer en fondu, de la droite en avançant et de la gauche en reculant —` +
              ` relevé : en fondu ${ouiNon(entreEnFondu)}, depuis la droite ${ouiNon(depuisLaDroite)},` +
              ` depuis la gauche ${ouiNon(depuisLaGauche)} (\`styleDEntree\`, src/lib/mouvement.tsx ;` +
              ' `sensDuPassage`, src/app/bilan/index.tsx).'
          );
        }
        if (!railEnChemin) {
          echecs.push(
            `${ou} : le rail de progression saute de ${railAvant.largeur} à ${railApres.largeur} px sans` +
              ' largeur intermédiaire — il doit avancer (`progress-header.tsx`).'
          );
        }
      } else {
        if (translucide || decales) {
          echecs.push(
            `${ou} : l’étape bouge encore (translucide ${ouiNon(translucide)}, décalée ${ouiNon(decales)})` +
              ' — sous la préférence, elle est posée dès la première image.'
          );
        }
        if (railEnChemin) {
          echecs.push(
            `${ou} : le rail passe par une largeur intermédiaire — une CSS transition de reanimated ne lit` +
              ' pas la préférence, sa durée doit passer par `dureeSelonLaPreference`.'
          );
        }
      }
    }
  } catch (erreur) {
    echecs.push(`${ou} : ${String(erreur).slice(0, 180)}`);
  } finally {
    await page.close();
  }
}

// Une précision qui s'ouvre fait descendre ce qui est dessous ; pas au montage, pas sous la
// préférence.
const ETAPE_DU_MODE = brouillonDe('commute_mode', {
  commute_has_regular_trip: true,
  commute_days_per_week: 5,
  commute_distance_km: 30,
});
for (const reduire of [false, true]) {
  const ou = `/bilan, la motorisation qui s’ouvre sous « Voiture (seul) »${reduire ? ' sous « réduire les animations »' : ''}`;
  const page = await ouvrir('/bilan', { [BROUILLON]: ETAPE_DU_MODE }, { reduire, releve: true });
  try {
    const voiture = page.getByRole('radio', { name: 'Voiture (seul)', exact: true });
    await voiture.waitFor({ state: 'visible', timeout: ATTENTE });
    const avant = await mesurer(page, 'option', 'Voiture (covoiturage)');
    const releve = await releverPendant(
      page,
      { dessous: ['option', 'Voiture (covoiturage)'], precision: ['option', 'Thermique'] },
      () => voiture.click()
    );
    const apres = await mesurer(page, 'option', 'Voiture (covoiturage)');
    const ouverte = await mesurer(page, 'option', 'Thermique');
    if (avant && apres && ouverte && apres.haut <= avant.haut + 1) {
      // La précision est là mais ne prend aucune place : elle ne s'est pas ouverte. C'est ce que
      // rend `Depliage` quand on le laisse jouer sous la préférence (mutation J12) — et c'est pire
      // qu'un mouvement de trop : la question est invisible.
      echecs.push(
        `${ou} : « Thermique » est là mais ne prend aucune place — « Voiture (covoiturage) » reste à` +
          ` ${Math.round(avant.haut)} px. La précision ne s’est pas ouverte (\`Depliage\`, src/lib/mouvement.tsx).`
      );
    } else if (!avant || !apres || !ouverte) {
      echecs.push(
        `${ou} : la mesure ne peut pas se prendre — « Voiture (covoiturage) »` +
          ` ${avant && apres ? 'trouvée' : 'introuvable'}, « Thermique » ${ouverte ? 'ouverte' : 'introuvable'}.`
      );
    } else {
      if (!releve.some((e) => e.precision) || disparaitApresEtreApparue(releve.map((e) => e.precision))) {
        echecs.push(`${ou} : « Thermique » n’a pas été relevée pendant l’ouverture, ou a disparu une fois là.`);
      }
      const descend = releve.some((e) => e.dessous && entre(e.dessous.haut, avant.haut, apres.haut));
      const opacites = releve.filter((e) => e.precision).map((e) => e.precision.opacite);
      // Animée, un fondu (`enChemin`) ; sous la préférence, la moindre image translucide est de trop.
      const apparait = reduire ? opacites.some((o) => o < 0.99) : enChemin(opacites, 1, 0.02);
      if (!reduire && (!descend || !apparait)) {
        echecs.push(
          `${ou} : la précision doit s’ouvrir, et ce qui est dessous descendre avec elle — relevé :` +
            ` « Voiture (covoiturage) » en chemin ${ouiNon(descend)}, « Thermique » en fondu` +
            ` ${ouiNon(apparait)} (\`Depliage\`, src/lib/mouvement.tsx).`
        );
      }
      if (reduire && (descend || apparait)) {
        echecs.push(
          `${ou} : la précision s’ouvre encore sous les yeux (en chemin ${ouiNon(descend)}, en fondu` +
            ` ${ouiNon(apparait)}) — sous la préférence, elle est posée dès la première image.`
        );
      }
    }
  } catch (erreur) {
    echecs.push(`${ou} : ${String(erreur).slice(0, 180)}`);
  } finally {
    await page.close();
  }
}
{
  const ou = '/bilan, étape du mode ouverte depuis un brouillon, motorisation déjà ouverte';
  const page = await ouvrir('/bilan', { [BROUILLON]: ETAPE_DU_MODE_EN_VOITURE }, {
    releve: { mesures: { precision: ['option', 'Thermique'] }, duree: 4_000 },
  });
  try {
    const images = (await echantillons(page)).map((e) => e.precision);
    const vues = images.filter(Boolean);
    if (vues.length === 0) {
      echecs.push(`${ou} : « Thermique » n’a pas pu être relevée — la garde ne peut pas conclure.`);
    } else if (disparaitApresEtreApparue(images)) {
      echecs.push(`${ou} : « Thermique » disparaît après être apparue — masquée, elle ne reçoit pas le focus.`);
    } else if (vues.some((v) => v.opacite < 0.99)) {
      echecs.push(
        `${ou} : la précision s’ouvre sous les yeux alors qu’elle était déjà là à l’arrivée — seul ce qui` +
          ' monte après son écran s’anime (`SansApparitionAuMontage`, src/components/bilan/step-shell.tsx).'
      );
    }
  } catch (erreur) {
    echecs.push(`${ou} : ${String(erreur).slice(0, 180)}`);
  } finally {
    await page.close();
  }
}

// Les onglets passent l'un à l'autre en fondu ; sous la préférence, d'un coup.
for (const reduire of [false, true]) {
  const ou = `/plan ↔ /suivi${reduire ? ' sous « réduire les animations »' : ''}`;
  const page = await ouvrir('/plan', {}, { reduire, releve: true });
  try {
    await page.getByRole('tab', { name: /^Suivi/ }).click();
    await page.waitForTimeout(REPOS);
    const releve = await releverPendant(page, { scenes: ['scenes'] }, () =>
      page.getByRole('tab', { name: /^Plan/ }).click()
    );
    const actif = await page.evaluate(() =>
      (document.querySelector('[role="tab"][aria-selected="true"]')?.innerText ?? '').replace(/\s+/g, ' ').trim()
    );
    const enFondu = releve.filter((e) => e.scenes.enFondu > 0).length;
    if (!actif.startsWith('Plan')) {
      echecs.push(`${ou} : le retour sur « Plan » n’a pas eu lieu (onglet actif « ${actif} ») — la garde ne peut pas conclure.`);
    } else if (!reduire && enFondu === 0) {
      echecs.push(
        `${ou} : aucune image de fondu entre les deux onglets — ils doivent passer l’un à l’autre en` +
          ' fondu (`animationDesOnglets`, src/app/(tabs)/_layout.tsx).'
      );
    } else if (reduire && enFondu > 0) {
      echecs.push(
        `${ou} : ${enFondu} image(s) de fondu entre les deux onglets — la barre embarquée ne lit pas la` +
          ' préférence, `animationDesOnglets` doit rendre « none ».'
      );
    }
  } catch (erreur) {
    echecs.push(`${ou} : ${String(erreur).slice(0, 180)}`);
  } finally {
    await page.close();
  }
}

// ── K. L'écran du mode : ce qui manque se dit au toucher, et mène à la question (v1-31) ─────────
//
// Le « Suivant » d'une étape incomplète n'est plus désactivé : il est « en attente », il agit, et il
// **demande** (29/09/2026, `docs/architecture/v1-31-l-ecran-du-mode.md`). Rien ne s'écrit à l'arrivée ;
// au toucher, le focus va à ce qui manque, l'écran y défile s'il le faut, l'intitulé passe en vert et
// « Il manque encore … » apparaît au-dessus des boutons, lien vers la même question — jusqu'à ce que
// l'étape soit complète. Une précision qui s'ouvrirait sous le pied fait remonter l'écran, et un filet
// en haut du pied dit qu'il y a une suite. Tout se voit sans réseau, depuis un brouillon, comme en F, H
// et J.
//
// **Chaque moitié positive porte sur ce que le HTML statique ne dit pas** (`TESTING-GARDES.md` §2.12) : une
// ligne, une couleur, un focus, une position de défilement n'existent qu'une fois l'app montée et le
// geste joué. Les couleurs se lisent dans `theme.ts`, jamais recopiées. Les défilements se lisent au
// pixel près sur la règle du handoff — 16 au-dessus du pied, 24 sous l'en-tête —, et image par image
// (`relever-par-image.mjs`, mesure `defilement`) : en chemin quand on anime, posés d'emblée sous la
// préférence. Un cas n'est à 360 × 800 que quand la planche l'y met ; celui du défilement à la main est
// à 390 × 600, la seule hauteur où la question des personnes peut sortir de la zone par le haut.
//
// **Éprouvée en la cassant le 29/09/2026** (`v1-31` §6.4) : une mutation à la fois, un export chacune
// (cache Metro isolé, `--clear`, bundle différent de celui du commit à chaque fois), sur des fichiers
// égaux au commit, et le script entier rejoué. Ce qui tombe, dans tout le script :
//
//   | Ce qu'on casse | Ce qui tombe |
//   |---|---|
//   | la demande vraie au montage (« d'office ») | A3 (la ligne et la marque à l'arrivée), « Train » après la complétude, et les deux « Retour » — une ligne à chaque arrivée |
//   | la demande qui ne retombe pas à la complétude | « Train » choisi après la complétude — seulement. Le « 2 » choisi que nommait le plan ne peut pas la montrer : la ligne se dit de ce qui manque **maintenant** (`v1-31` §2.9), et il ne manque plus rien |
//   | la demande qui ne retombe pas en changeant d'étape (`demande === entree.cle` retiré) | « Retour » vers des jours et une distance vides — seulement. « A4, Retour, Suivant » reste vert : il revient sur une étape complète, où la demande retombe par la complétude (`TESTING-GARDES.md` §2.14, règle 8) |
//   | le focus qui ne part pas (`donnerLeFocus(cible)` retiré) | A4, A6, D2 avec et sans la préférence, la ligne touchée à 390 × 600, l'Entrée maintenu — le focus reste sur « Suivant » ou sur la ligne |
//   | `seMarque` vraie pour la question principale | A6 : le titre recoloré — seulement. Et deux tests de `bilan.test.ts` |
//   | la demande partie à l'appui (`onPressIn` sur le « Suivant » en attente) | **pas l'Entrée maintenu** : la demande part déjà à l'appui (`v1-31` §9, écart 14), et c'est la capture de la répétition qui le tient. Tombent les clics — A4, A6, D2 avec et sans la préférence, la ligne touchée, « Retour » vers une étape vide : sous cette mutation, un clic de Playwright ne fait pas partir la demande (non élucidé) |
//   | le défilement vers ce qui manque retiré | la ligne touchée à 390 × 600 (la question reste à −180), D2 avec et sans la préférence — seulement |
//   | `animated: true` sous la préférence | D2 et B6 sous la préférence — seulement |
//   | le défilement à l'ouverture retiré | B6 avec et sans la préférence — seulement |
//   | l'ouverture suivie sans le compte des réponses (le `return` de `suivreLOuverture`) | **rien ici** : le brouillon rouvert au vélo est retenu par une seconde défense, `Depliage`, qui n'annonce pas ce qui monte avec son écran. Le compte est seul contre un préremplissage arrivé après le montage, que ce script ne peut pas jouer sans réseau : c'est le parcours réel qui le garde (« un re-bilan ouvert sur l'étape du mode ») |
//   | les deux défenses retirées (le compte **et** `apres` dans `Depliage`) | le brouillon rouvert au vélo, défilé de 56 px au montage — seulement. Sa condition se lit **avant** défilement : lue après, la première passe l'a fait tomber en « mesure sans objet », pour la mauvaise raison |
//   | le filet toujours posé | l'étape courte — seulement |
//   | le filet jamais posé | D1 avec et sans la préférence — seulement |
//   | `disabled` remis sur le « Suivant » en attente | A3 (l'attribut), puis chaque cas qui touche le « Suivant » en attente, dont l'Entrée maintenu (ni ligne, ni focus) |
//   | la garde de la dernière étape réduite à l'étape courante (`issueDuSuivant`) | `?etape=context` : l'écran n'est pas revenu à la première étape — seulement. La moitié « une écriture est partie » ne peut pas tomber ici : sans réseau, `ensureSession()` échoue avant tout `POST` ; elle garde un export branché sur une stack |
//   | la capture de la répétition d'Entrée retirée (`barre-d-espace.ts`) | l'Entrée maintenu, sur ses deux constats — seulement |
//   | le focus volé par un brouillon relu (`entree.sens === null` retiré de l'effet) | A3 : à l'arrivée du brouillon, le focus est sur l'étape — seulement (`v1-31` §9, écart 13) |
//
// **B6 bis, éprouvé le 01/10/2026** de la même façon (un export chacune, cache Metro isolé, `--clear`,
// le script entier rejoué) :
//
//   | Ce qu'on casse | Ce qui tombe |
//   |---|---|
//   | la réserve de l'ouverture retirée — l'état d'avant, où le défilement part sur le contenu d'avant le dépli | B6 bis, les deux « Oui » sans la préférence : le dépli finit sous le pied (20 et 34 px), défilement 0, aucune position en chemin — seulement. Sous la préférence rien ne grandit, et ces cas passaient déjà |
//   | la réserve qui ne tombe jamais | B6 bis sans la préférence, après « Non » : 44 et 130 px sous la zone — seulement. Ouvert, le dépli dépasse déjà la réserve : c'est en se refermant qu'elle se voit |
//   | la réserve comptée sur la hauteur du contenu, que `flexGrow` étire à la zone, et non sur sa hauteur naturelle | B6 bis sans la préférence : 456 et 368 px de trop une fois le dépli ouvert — seulement. C'était la première version de la correction |
//
// La première version de B6 bis cherchait le titre sans normaliser les blancs : les insécables que pose
// `ThemedText` (« 300 km », « ? ») le rendaient introuvable, et la mesure de la réserve était **sautée
// sans bruit** — c'est le rejeu de la troisième mutation qui l'a montré. Une mesure introuvable échoue
// désormais.
//
// La garde de l'étape courante retirée de `handleNext` n'a pas de cas ici : `StepShell` n'appelle
// déjà pas `onNext` sur une étape incomplète, donc c'est par construction une seconde garde. Elle est
// portée par `issueDuSuivant`, testée dans `bilan.test.ts` (deux mutations consignées), et son
// aiguillage dans `handleNext` est exhaustif : un cas retiré ne compile pas. « Bus » en
// dur dans H : section H, mutation H2 rejouée le même jour.
const LARGEUR_ETROITE = { largeur: 360, hauteur: 800 };
const COULEUR = (() => {
  const source = readFileSync('src/constants/theme.ts', 'utf8');
  const clair = source.match(/light:\s*\{([^}]*)\}/)?.[1] ?? '';
  const lire = (nom) => {
    const hex = clair.match(new RegExp(`\\b${nom}:\\s*'#([0-9A-Fa-f]{6})'`))?.[1];
    if (!hex) return null;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return `rgb(${r}, ${g}, ${b})`;
  };
  return { text: lire('text'), textSecondary: lire('textSecondary'), accentText: lire('accentText'), border: lire('border') };
})();
const QUESTION_DES_PERSONNES = 'Vous êtes combien à partager ce trajet ?';
const QUESTION_DES_TRANCHES = 'Quelle distance aller, en général ?';
const LIGNE_DES_PERSONNES = 'Il manque encore le nombre de personnes dans la voiture.';
const TRAJET_DECLARE = { commute_has_regular_trip: true, commute_days_per_week: 5, commute_distance_km: 30 };
const COVOITURAGE_HYBRIDE = brouillonDe('commute_mode', {
  ...TRAJET_DECLARE,
  commute_mode: 'voiture',
  commute_is_carpool: true,
  commute_car_engine: 'hybride',
});
const SORTIES_EN_VOITURE = brouillonDe('leisure_detail', {
  commute_has_regular_trip: false,
  leisure_frequency: 'weekly',
  leisure_mode: 'voiture',
  leisure_is_carpool: false,
  leisure_car_engine: 'thermique',
});

/**
 * L'état de l'écran du questionnaire, lu dans la page : la ligne, les couleurs d'un intitulé et du
 * titre, le focus, le « Suivant », le filet, la zone qui défile, et un groupe nommé. Évaluée dans la
 * page, donc autonome.
 */
function lireLEtape(groupe) {
  const n = (t) => (t ?? '').replace(/\s+/g, ' ').trim();
  const boutons = [...document.querySelectorAll('[role="button"]')];
  const suivant = boutons.find((b) => /^(Suivant|Voir mon bilan)$/.test(n(b.innerText)));
  const ligne = boutons.find((b) => /^Il manque encore /.test(n(b.innerText)));
  const pied = suivant?.parentElement?.parentElement ?? null;
  const filet = pied
    ? [...pied.children].find((c) => {
        const r = c.getBoundingClientRect();
        return getComputedStyle(c).position === 'absolute' && r.height > 0 && r.height <= 1.01;
      })
    : null;
  const titre = [...document.querySelectorAll('h1')].find((h) => h.getClientRects().length > 0);
  const zone = titre?.closest('div') && (() => {
    for (let e = titre.parentElement; e; e = e.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(e).overflowY)) return e;
    }
    return null;
  })();
  const g = groupe ? [...document.querySelectorAll('[role="radiogroup"]')].find((x) => x.getAttribute('aria-label') === groupe) : null;
  const bloc = g?.parentElement ?? null;
  const intitule = bloc ? [...bloc.children].find((c) => c !== g && n(c.innerText) === groupe) : null;
  const actif = document.activeElement;
  const cadre = zone?.getBoundingClientRect();
  return {
    etape: n([...document.querySelectorAll('div')].find((d) => d.children.length === 0 && /^Étape \d+ sur \d+$/.test(n(d.innerText)))?.innerText),
    titre: titre ? n(titre.innerText) : null,
    couleurDuTitre: titre ? getComputedStyle(titre).color : null,
    ligne: ligne ? n(ligne.innerText) : null,
    ligneAlerte: ligne ? ligne.closest('[role="alert"]') !== null || ligne.getAttribute('role') === 'alert' : null,
    suivant: suivant ? { disabled: suivant.hasAttribute('disabled'), ariaDisabled: suivant.getAttribute('aria-disabled') } : null,
    focus: actif === document.body || !actif ? 'le document' : actif.getAttribute('aria-label') ?? n(actif.innerText).slice(0, 60),
    filet: filet ? getComputedStyle(filet).backgroundColor : null,
    zone: cadre ? { decalage: zone.scrollTop, haut: cadre.top, bas: cadre.bottom } : null,
    groupe: g
      ? {
          haut: bloc.getBoundingClientRect().top,
          bas: g.getBoundingClientRect().bottom,
          couleur: intitule ? getComputedStyle(intitule).color : null,
          coches: [...g.querySelectorAll('[role="radio"]')].filter((o) => o.closest('[role="radiogroup"]') === g && o.getAttribute('aria-checked') === 'true').length,
          parent: g.parentElement?.closest('[role="radiogroup"]')?.getAttribute('aria-label') ?? null,
          boite: bloc.parentElement,
        }
      : null,
  };
}
const lireK = (page, groupe) => page.evaluate(lireLEtape, groupe).then((e) => (e.groupe ? { ...e, groupe: { ...e.groupe, boite: undefined } } : e));
const suivantK = (page) => page.getByRole('button', { name: 'Suivant', exact: true });
const auPixel = (a, b) => Math.abs(a - b) <= 1;
const kEchec = (ou, quoi) => echecs.push(`${ou} : ${quoi}`);

if (Object.values(COULEUR).some((c) => c === null)) {
  echecs.push('Section K : une couleur de `Colors.light` est introuvable dans src/constants/theme.ts — adapter le motif.');
} else {
  // A3 puis A4 : rien à l'arrivée ; au toucher, la ligne, la marque et le focus ; la complétude les retire.
  {
    const ou = '/bilan, étape du mode, covoiturage « Hybride », personnes vides (A3 → A4)';
    const page = await ouvrir('/bilan', { [BROUILLON]: COVOITURAGE_HYBRIDE });
    try {
      await page.getByRole('radio', { name: '2 personnes', exact: true }).waitFor({ state: 'visible', timeout: ATTENTE });
      const a3 = await lireK(page, QUESTION_DES_PERSONNES);
      if (a3.ligne !== null) kEchec(ou, `une ligne s'écrit à l'arrivée (« ${a3.ligne} ») — ce qui manque ne se dit qu'au toucher.`);
      // Le brouillon rouvre l'étape **après** le montage : ce n'est pas une entrée, et le focus reste
      // où il était (`v1-31` §9, écart 13 — il sautait sur l'étape, volé au document).
      if (a3.focus !== 'le document') kEchec(ou, `à l'arrivée d'un brouillon, le focus est sur « ${a3.focus} » — personne n'a agi.`);
      if (a3.groupe?.couleur !== COULEUR.textSecondary) {
        kEchec(ou, `à l'arrivée, l'intitulé des personnes est en ${a3.groupe?.couleur} — attendu textSecondary (${COULEUR.textSecondary}).`);
      }
      if (!a3.suivant || a3.suivant.disabled || a3.suivant.ariaDisabled !== null) {
        kEchec(ou, `le « Suivant » en attente porte disabled=${a3.suivant?.disabled} aria-disabled=${a3.suivant?.ariaDisabled} — un bouton qui agit n'est pas indisponible.`);
      }
      const boite = await page.evaluate(() => {
        const g = (nom) => [...document.querySelectorAll('[role="radiogroup"]')].find((x) => x.getAttribute('aria-label') === nom);
        const moteur = g('Quelle motorisation ?');
        const personnes = g('Vous êtes combien à partager ce trajet ?');
        return {
          deux: !!moteur && !!personnes,
          memeBoite: !!moteur && moteur.parentElement?.parentElement === personnes?.parentElement?.parentElement,
          parents: [moteur, personnes].map((x) => x?.parentElement?.closest('[role="radiogroup"]')?.getAttribute('aria-label') ?? null),
        };
      });
      if (!boite.deux || !boite.memeBoite || boite.parents.some((p) => p !== QUESTION_DU_MODE)) {
        kEchec(ou, `la boîte du covoiturage doit porter deux radiogroup nommés, dans le groupe des modes — relevé ${JSON.stringify(boite)}.`);
      }

      await suivantK(page).click();
      await page.waitForTimeout(REPOS);
      const a4 = await lireK(page, QUESTION_DES_PERSONNES);
      if (a4.etape !== a3.etape) kEchec(ou, `« Suivant » a avancé sur une étape incomplète (${a3.etape} → ${a4.etape}).`);
      if (a4.ligne !== LIGNE_DES_PERSONNES) kEchec(ou, `au toucher, la ligne dit « ${a4.ligne} » — attendu « ${LIGNE_DES_PERSONNES} ».`);
      if (a4.ligneAlerte) kEchec(ou, 'la ligne est une alerte — ce n’est pas un échec.');
      if (a4.groupe?.couleur !== COULEUR.accentText) {
        kEchec(ou, `au toucher, l'intitulé des personnes est en ${a4.groupe?.couleur} — attendu accentText (${COULEUR.accentText}).`);
      }
      if (a4.focus !== '2 personnes') kEchec(ou, `au toucher, le focus est sur « ${a4.focus} » — attendu « 2 personnes ».`);

      // « 2 » : la demande retombe, l'intitulé reprend sa couleur, et « Suivant » avance.
      await page.getByRole('radio', { name: '2 personnes', exact: true }).click();
      await page.waitForTimeout(REPOS);
      const complet = await lireK(page, QUESTION_DES_PERSONNES);
      if (complet.ligne !== null) kEchec(ou, `« 2 » choisi, la ligne reste (« ${complet.ligne} ») — la demande retombe à la complétude.`);
      if (complet.groupe?.couleur !== COULEUR.textSecondary) {
        kEchec(ou, `« 2 » choisi, l'intitulé reste en ${complet.groupe?.couleur} — il reprend textSecondary.`);
      }
      // Un nouveau manque — « Train », dont le type n'est pas dit — ne se dit qu'au prochain toucher : la
      // demande est retombée à la complétude, elle ne s'est pas seulement tue le temps d'une image.
      await page.getByRole('radio', { name: 'Train', exact: true }).click();
      await page.waitForTimeout(REPOS);
      const autre = await lireK(page);
      if (autre.ligne !== null) kEchec(ou, `« Train » choisi après la complétude, la ligne revient d'elle-même (« ${autre.ligne} »).`);
      // Changer de mode efface les précisions de la voiture (`normaliserReponses`) : on les redonne.
      await page.getByRole('radio', { name: 'Voiture (covoiturage)', exact: true }).click();
      await page.getByRole('radio', { name: 'Hybride', exact: true }).click();
      await page.getByRole('radio', { name: '2 personnes', exact: true }).click();
      await page.waitForTimeout(REPOS);
      await suivantK(page).click();
      await page.waitForTimeout(REPOS);
      const apres = await lireK(page);
      if (apres.etape === complet.etape) kEchec(ou, `l'étape complète n'avance pas (${apres.etape}).`);
    } catch (erreur) {
      kEchec(ou, String(erreur).slice(0, 180));
    } finally {
      await page.close();
    }
  }

  // Entrée **maintenu** sur le « Suivant » en attente : la demande part dès l'appui — c'est un
  // `<button>` natif (`v1-31` §9, écart 14) —, et la répétition de la touche, qui arrive sur l'option
  // où le focus vient de se poser, est arrêtée en capture (`activableALaBarreDEspace`) : elle ne la
  // coche pas (§2.10).
  {
    const ou = '/bilan, étape du mode, « Suivant » activé par un Entrée maintenu';
    const page = await ouvrir('/bilan', { [BROUILLON]: COVOITURAGE_HYBRIDE });
    try {
      await suivantK(page).waitFor({ state: 'visible', timeout: ATTENTE });
      await suivantK(page).focus();
      await page.keyboard.down('Enter');
      await page.keyboard.down('Enter');
      await page.keyboard.up('Enter');
      await page.waitForTimeout(REPOS);
      const lu = await lireK(page, QUESTION_DES_PERSONNES);
      if (lu.ligne !== LIGNE_DES_PERSONNES || lu.focus !== '2 personnes') {
        kEchec(ou, `la demande n'a pas eu lieu comme au toucher — ligne « ${lu.ligne} », focus « ${lu.focus} ».`);
      }
      if (lu.groupe?.coches !== 0) {
        kEchec(ou, `${lu.groupe?.coches} option(s) des personnes cochée(s) — la demande ne coche rien ; la répétition est tombée sur l'option.`);
      }
    } catch (erreur) {
      kEchec(ou, String(erreur).slice(0, 180));
    } finally {
      await page.close();
    }
  }

  // Le geste suivant : la ligne est déjà là, la zone ne change pas de hauteur, et le défilement part
  // aussitôt (`v1-31` §2.6) — ici vers le haut, jusqu'à 24 sous l'en-tête.
  {
    const ou = '/bilan, étape du mode à 390 × 600, la question sortie par le haut, la ligne touchée';
    const page = await ouvrir('/bilan', { [BROUILLON]: COVOITURAGE_HYBRIDE }, { hauteur: 600 });
    try {
      await suivantK(page).click();
      await page.waitForTimeout(REPOS);
      await page.evaluate(() => {
        const titre = [...document.querySelectorAll('h1')].find((h) => h.getClientRects().length > 0);
        for (let e = titre.parentElement; e; e = e.parentElement) {
          if (/(auto|scroll)/.test(getComputedStyle(e).overflowY)) {
            e.scrollTop = e.scrollHeight;
            return;
          }
        }
      });
      await page.waitForTimeout(REPOS);
      const sortie = await lireK(page, QUESTION_DES_PERSONNES);
      if (!sortie.groupe || !sortie.zone || sortie.groupe.bas > sortie.zone.haut) {
        kEchec(ou, `la mesure ne peut pas se prendre — la question des personnes n'est pas sortie par le haut (${JSON.stringify(sortie.groupe && { bas: sortie.groupe.bas, zone: sortie.zone })}).`);
      } else {
        await page.getByRole('button', { name: LIGNE_DES_PERSONNES, exact: true }).click();
        await page.waitForTimeout(REPOS);
        const revenue = await lireK(page, QUESTION_DES_PERSONNES);
        if (!auPixel(revenue.groupe.haut, revenue.zone.haut + 24)) {
          kEchec(ou, `la question revient à ${Math.round(revenue.groupe.haut - revenue.zone.haut)} px sous l'en-tête — attendu 24.`);
        }
        if (revenue.focus !== '2 personnes') kEchec(ou, `le focus est sur « ${revenue.focus} » — attendu « 2 personnes ».`);
      }
    } catch (erreur) {
      kEchec(ou, String(erreur).slice(0, 180));
    } finally {
      await page.close();
    }
  }

  // A4, « Retour », « Suivant » : on revient sur l'étape du mode, toujours incomplète — aucune ligne.
  {
    const ou = '/bilan, étape du mode, A4 puis « Retour » puis « Suivant »';
    const page = await ouvrir('/bilan', { [BROUILLON]: COVOITURAGE_HYBRIDE });
    try {
      await suivantK(page).click();
      await page.waitForTimeout(REPOS);
      await page.getByRole('button', { name: 'Retour', exact: true }).click();
      await page.waitForTimeout(REPOS);
      await suivantK(page).click();
      await page.waitForTimeout(REPOS);
      const lu = await lireK(page, QUESTION_DES_PERSONNES);
      if (!lu.groupe) kEchec(ou, `l'étape du mode n'est pas revenue (${lu.etape}) — la garde ne peut pas conclure.`);
      else if (lu.ligne !== null) kEchec(ou, `une ligne est là à l'arrivée (« ${lu.ligne} ») — la demande retombe en changeant d'étape.`);
    } catch (erreur) {
      kEchec(ou, String(erreur).slice(0, 180));
    } finally {
      await page.close();
    }
  }

  // La même règle, là où l'étape d'avant est **incomplète** : un brouillon rouvert sur l'étape du mode
  // sans jours ni distance, « Suivant » touché, puis « Retour ». Au retour sur une étape complète, la
  // demande retombe déjà à la complétude — le cas d'au-dessus ne peut donc pas dire si elle retombe
  // aussi en changeant d'étape ; celui-ci le peut. (`?etape=context` ne le pouvait pas : sur un
  // questionnaire vierge, l'étape d'avant, les longs trajets, est complète.)
  {
    const ou = '/bilan, étape du mode sans jours ni distance, la demande puis « Retour »';
    const page = await ouvrir('/bilan', { [BROUILLON]: brouillonDe('commute_mode', { commute_has_regular_trip: true }) });
    try {
      await suivantK(page).click();
      await page.waitForTimeout(REPOS);
      const demande = await lireK(page);
      await page.getByRole('button', { name: 'Retour', exact: true }).click();
      await page.waitForTimeout(REPOS);
      const avant = await lireK(page);
      if (demande.ligne === null) kEchec(ou, 'la demande n’a pas eu lieu sur l’étape du mode — la garde ne peut pas conclure.');
      else if (avant.etape === demande.etape) kEchec(ou, `« Retour » n'a pas changé d'étape (${avant.etape}) — la garde ne peut pas conclure.`);
      else if (avant.ligne !== null) {
        kEchec(ou, `une ligne est là à l'arrivée sur l'étape d'avant (« ${avant.ligne} ») — la demande retombe en changeant d'étape.`);
      }
    } catch (erreur) {
      kEchec(ou, String(erreur).slice(0, 180));
    } finally {
      await page.close();
    }
  }

  // A6 : rien de choisi — la ligne, le focus sur « Voiture (seul) », et le titre qui ne se recolore pas.
  {
    const ou = '/bilan, étape du mode, rien de choisi, « Suivant » touché (A6)';
    const page = await ouvrir('/bilan', { [BROUILLON]: brouillonDe('commute_mode', TRAJET_DECLARE) });
    try {
      await suivantK(page).click();
      await page.waitForTimeout(REPOS);
      const lu = await lireK(page);
      if (lu.ligne !== 'Il manque encore ton mode de transport.') kEchec(ou, `la ligne dit « ${lu.ligne} ».`);
      if (lu.focus !== 'Voiture (seul)') kEchec(ou, `le focus est sur « ${lu.focus} » — attendu « Voiture (seul) ».`);
      if (lu.couleurDuTitre !== COULEUR.text) {
        kEchec(ou, `le titre de l'étape est en ${lu.couleurDuTitre} — la question principale ne se marque jamais (\`seMarque\`).`);
      }
    } catch (erreur) {
      kEchec(ou, String(erreur).slice(0, 180));
    } finally {
      await page.close();
    }
  }

  // D1, D2 : le filet à l'arrivée ; au toucher, la zone descend jusqu'à ce que les tranches finissent 16
  // au-dessus du pied, en chemin — et sous la préférence, d'un coup.
  for (const reduire of [false, true]) {
    const ou = `/bilan, étape des sorties, la distance sous le pied (D1, D2)${reduire ? ' sous « réduire les animations »' : ''}`;
    const page = await ouvrir('/bilan', { [BROUILLON]: SORTIES_EN_VOITURE }, { reduire, releve: true });
    try {
      await suivantK(page).waitFor({ state: 'visible', timeout: ATTENTE });
      const d1 = await lireK(page, QUESTION_DES_TRANCHES);
      if (d1.filet !== COULEUR.border) kEchec(ou, `à l'arrivée, pas de filet en haut du pied (${d1.filet}) — la question est dessous.`);
      if (!d1.groupe || d1.groupe.bas <= d1.zone.bas) {
        kEchec(ou, 'la mesure ne peut pas se prendre — les tranches ne sont pas sous le pied à l’arrivée.');
      } else {
        const releve = await releverPendant(
          page,
          { zone: ['defilement', { titre: QUESTION_DES_TRANCHES, bouton: 'Moins de 5 km' }] },
          () => suivantK(page).click(),
          1_200
        );
        const d2 = await lireK(page, QUESTION_DES_TRANCHES);
        if (!auPixel(d2.groupe.bas, d2.zone.bas - 16)) {
          kEchec(ou, `au toucher, les tranches finissent à ${Math.round(d2.zone.bas - d2.groupe.bas)} px au-dessus du pied — attendu 16.`);
        }
        if (d2.focus !== 'Moins de 5 km') kEchec(ou, `au toucher, le focus est sur « ${d2.focus} » — attendu « Moins de 5 km ».`);
        const positions = releve.map((e) => e.zone?.position).filter((p) => p != null);
        const bouge = enChemin(positions, d2.zone.decalage);
        if (!reduire && !bouge) kEchec(ou, `le défilement saute (${positions.join(', ')}) — la plateforme l'anime.`);
        if (reduire && bouge) kEchec(ou, 'le défilement passe par des positions intermédiaires — sous la préférence, il se pose.');
      }
    } catch (erreur) {
      kEchec(ou, String(erreur).slice(0, 180));
    } finally {
      await page.close();
    }
  }

  // L'étape courte : pas de filet — la moitié négative.
  {
    const ou = '/bilan, étape courte (« As-tu un trajet régulier… »)';
    const page = await ouvrir('/bilan');
    try {
      await page.getByRole('radio', { name: 'Oui', exact: true }).waitFor({ state: 'visible', timeout: ATTENTE });
      const lu = await lireK(page);
      if (lu.filet !== null) kEchec(ou, 'un filet en haut du pied — rien n’est dessous.');
      if (lu.zone === null) kEchec(ou, 'la zone qui défile est introuvable — la garde ne peut pas conclure.');
    } catch (erreur) {
      kEchec(ou, String(erreur).slice(0, 180));
    } finally {
      await page.close();
    }
  }

  // B6 : à 360 × 800, « Vélo » touché — la zone remonte jusqu'à ce que la boîte finisse 16 au-dessus du
  // pied, le focus reste sur « Vélo » ; sous la préférence, posé dès la première image.
  for (const reduire of [false, true]) {
    const ou = `/bilan, étape du mode à 360 × 800, « Vélo » touché (B6)${reduire ? ' sous « réduire les animations »' : ''}`;
    const page = await ouvrir('/bilan', { [BROUILLON]: brouillonDe('commute_mode', TRAJET_DECLARE) }, {
      ...LARGEUR_ETROITE,
      reduire,
      releve: true,
    });
    try {
      const velo = page.getByRole('radio', { name: 'Vélo', exact: true });
      await velo.waitFor({ state: 'visible', timeout: ATTENTE });
      const releve = await releverPendant(
        page,
        { zone: ['defilement', { titre: QUESTION_DU_MODE, bouton: 'Suivant' }] },
        () => velo.click(),
        1_200
      );
      const lu = await lireK(page, 'Quel type de vélo ?');
      const boite = await page.evaluate(() => {
        const g = [...document.querySelectorAll('[role="radiogroup"]')].find((x) => x.getAttribute('aria-label') === 'Quel type de vélo ?');
        return g ? g.parentElement.parentElement.getBoundingClientRect().bottom : null;
      });
      if (boite === null || !lu.zone) kEchec(ou, 'la boîte du vélo est introuvable — la garde ne peut pas conclure.');
      else if (!auPixel(boite, lu.zone.bas - 16)) {
        kEchec(ou, `la boîte finit à ${Math.round(lu.zone.bas - boite)} px au-dessus du pied — attendu 16 (défilement ${Math.round(lu.zone.decalage)}).`);
      }
      if (lu.focus !== 'Vélo') kEchec(ou, `le focus est sur « ${lu.focus} » — il reste sur « Vélo ».`);
      const positions = releve.map((e) => e.zone?.position).filter((p) => p != null);
      const bouge = enChemin(positions, lu.zone?.decalage ?? 0);
      if (!reduire && !bouge) kEchec(ou, `le défilement saute (${positions.join(', ')}) — la plateforme l'anime.`);
      if (reduire && bouge) kEchec(ou, 'le défilement passe par des positions intermédiaires — sous la préférence, il se pose.');
    } catch (erreur) {
      kEchec(ou, String(erreur).slice(0, 180));
    } finally {
      await page.close();
    }
  }

  // **B6 bis — une ouverture sur une étape qui tenait dans la zone** (01/10/2026). Le défilement de la
  // plateforme est borné à la longueur du contenu au moment où il part, et un dépli part de zéro : sur le
  // « Oui » du second mode (B1.6) et sur celui des longs trajets (`v1-33` D1), il n'y avait encore rien à
  // défiler — `scrollTo` visait 36 px et la zone restait à 0. B6 y échappait : la liste des modes dépasse
  // déjà de la zone à 360. `StepShell` réserve désormais la hauteur finale le temps de l'ouverture. Ici,
  // à 390 × 844 : la zone remonte jusqu'à ce que le dépli finisse 16 au-dessus du pied, en chemin, le
  // focus reste sur « Oui » ; sous la préférence, posé dès la première image ; et la réserve tombe — le
  // contenu revient à sa hauteur, sans blanc sous le dernier élément.
  const OUVERTURES_SUR_UNE_ETAPE_COURTE = [
    {
      nom: '« Oui » du second mode (B1.6)',
      brouillon: brouillonDe('commute_extra', { ...TRAJET_DECLARE, commute_mode: 'voiture', commute_car_engine: 'thermique' }),
      titre: 'Utilises-tu un second mode en complément ?',
      // Le dernier élément du dépli : le lien du mode manquant, sous la boîte « Lequel ? ».
      dernier: () => {
        const n = [...document.querySelectorAll('[role="link"], a, [role="button"]')].find((e) =>
          /^Ton mode n.est pas dans la liste/.test((e.getAttribute('aria-label') ?? e.innerText ?? '').trim())
        );
        return n ? n.getBoundingClientRect().bottom : null;
      },
    },
    {
      nom: '« Oui » des longs trajets',
      brouillon: brouillonDe('long_trips', {
        ...TRAJET_DECLARE,
        commute_mode: 'voiture',
        commute_car_engine: 'thermique',
        commute_second_mode_used: false,
        leisure_frequency: 'rarely',
        flights_total_per_year: 0,
        flights_short_per_year: 0,
      }),
      titre: 'Hors avion, fais-tu des trajets de plus de 300 km sur une année type ?',
      // Le dernier élément du dépli : la série de la voiture, sans précision tant qu'elle est vide.
      dernier: () => {
        const g = [...document.querySelectorAll('[role="radiogroup"]')].find(
          (x) => x.getAttribute('aria-label') === 'Trajets longue distance en voiture'
        );
        return g ? g.getBoundingClientRect().bottom : null;
      },
    },
  ];
  for (const cas of OUVERTURES_SUR_UNE_ETAPE_COURTE) {
    for (const reduire of [false, true]) {
      const ou = `/bilan, ${cas.nom} touché à 390 × 844 (B6 bis)${reduire ? ' sous « réduire les animations »' : ''}`;
      const page = await ouvrir('/bilan', { [BROUILLON]: cas.brouillon }, { reduire, releve: true });
      try {
        const oui = page.getByRole('radio', { name: 'Oui', exact: true });
        await oui.waitFor({ state: 'visible', timeout: ATTENTE });
        await page.waitForTimeout(REPOS);
        const avant = await lireK(page);
        if (!avant.zone || avant.zone.decalage !== 0) kEchec(ou, 'la zone a défilé avant le geste — la garde ne peut pas conclure.');
        const releve = await releverPendant(
          page,
          { zone: ['defilement', { titre: cas.titre, bouton: 'Suivant' }] },
          () => oui.click(),
          1_200
        );
        await page.waitForTimeout(REPOS);
        const lu = await lireK(page);
        const bas = await page.evaluate(cas.dernier);
        // Le titre se cherche blancs normalisés : `ThemedText` pose des insécables (« 300 km », « ? »).
        const contenu = await page.evaluate((titre) => {
          const n = (t) => (t ?? '').replace(/\s+/g, ' ').trim();
          const h = [...document.querySelectorAll('h1')].find((e) => e.getClientRects().length > 0 && n(e.innerText) === titre);
          let z = h?.parentElement;
          while (z && !/(auto|scroll)/.test(getComputedStyle(z).overflowY)) z = z.parentElement;
          // Le contenu, et ce qu'il porterait sans réserve : sa première vue, plus les deux marges de 24.
          return z ? { hauteur: z.scrollHeight, naturelle: z.firstElementChild.firstElementChild.getBoundingClientRect().height + 48 } : null;
        }, cas.titre);
        if (bas === null || !lu.zone) kEchec(ou, 'le dépli est introuvable — la garde ne peut pas conclure.');
        else if (!auPixel(bas, lu.zone.bas - 16)) {
          kEchec(ou, `le dépli finit à ${Math.round(lu.zone.bas - bas)} px au-dessus du pied — attendu 16 (défilement ${Math.round(lu.zone.decalage)}) : le défilement à l'ouverture est borné au contenu d'avant le dépli.`);
        }
        if (lu.focus !== 'Oui') kEchec(ou, `le focus est sur « ${lu.focus} » — il reste sur « Oui ».`);
        if (!contenu) kEchec(ou, 'la zone est introuvable une fois le dépli ouvert — la garde ne peut pas conclure.');
        else if (contenu.hauteur > Math.max(contenu.naturelle, lu.zone ? lu.zone.bas - lu.zone.haut : 0) + 1) {
          kEchec(ou, `le contenu garde ${Math.round(contenu.hauteur - contenu.naturelle)} px de trop une fois le dépli ouvert : la réserve n'est pas tombée.`);
        }
        const positions = releve.map((e) => e.zone?.position).filter((p) => p != null);
        const bouge = enChemin(positions, lu.zone?.decalage ?? 0);
        if (!reduire && !bouge) kEchec(ou, `le défilement saute (${positions.join(', ')}) — la plateforme l'anime.`);
        if (reduire && bouge) kEchec(ou, 'le défilement passe par des positions intermédiaires — sous la préférence, il se pose.');
        // « Non » referme le dépli : l'étape tient de nouveau dans la zone. Une réserve qui ne tomberait
        // pas ne se voit qu'ici — une fois le dépli ouvert, sa hauteur naturelle la dépasse déjà.
        await page.getByRole('radio', { name: 'Non', exact: true }).click();
        await page.waitForTimeout(REPOS);
        const apresNon = await page.evaluate((titre) => {
          const n = (t) => (t ?? '').replace(/\s+/g, ' ').trim();
          const h = [...document.querySelectorAll('h1')].find((e) => e.getClientRects().length > 0 && n(e.innerText) === titre);
          let z = h?.parentElement;
          while (z && !/(auto|scroll)/.test(getComputedStyle(z).overflowY)) z = z.parentElement;
          return z ? { contenu: z.scrollHeight, zone: z.clientHeight } : null;
        }, cas.titre);
        if (!apresNon) kEchec(ou, 'la zone est introuvable après « Non ».');
        else if (apresNon.contenu > apresNon.zone + 1) {
          kEchec(ou, `après « Non », le contenu garde ${apresNon.contenu - apresNon.zone} px sous la zone : la réserve de l'ouverture n'est pas tombée.`);
        }
      } catch (erreur) {
        kEchec(ou, String(erreur).slice(0, 180));
      } finally {
        await page.close();
      }
    }
  }

  // La même étape, rouverte depuis un brouillon où « Vélo » est déjà choisi : rien ne défile au montage.
  // À 360, la boîte passe sous le pied (738 contre 698) : c'est là que la moitié peut tomber.
  {
    const ou = '/bilan, étape du mode à 360 × 800, rouverte avec « Vélo » déjà choisi';
    const page = await ouvrir('/bilan', { [BROUILLON]: brouillonDe('commute_mode', { ...TRAJET_DECLARE, commute_mode: 'velo' }) }, LARGEUR_ETROITE);
    try {
      await page.getByRole('radio', { name: 'Mécanique', exact: true }).waitFor({ state: 'visible', timeout: ATTENTE });
      await page.waitForTimeout(REPOS);
      const lu = await lireK(page, 'Quel type de vélo ?');
      if (!lu.zone || !lu.groupe) kEchec(ou, 'la mesure ne peut pas se prendre.');
      // La position **avant** défilement : un défilement au montage, que ce cas existe pour voir, remonte
      // la boîte au-dessus du pied, et lire la position d'après le ferait passer pour une mesure sans
      // objet (mutation des deux défenses, 29/09/2026).
      else if (lu.groupe.bas + lu.zone.decalage <= lu.zone.bas) {
        kEchec(ou, 'la mesure ne prouve rien — la boîte du vélo n’est pas sous le pied à l’arrivée.');
      }
      else if (lu.zone.decalage !== 0) kEchec(ou, `l'écran a défilé de ${Math.round(lu.zone.decalage)} px au montage — une ouverture ne se suit qu'après un geste.`);
    } catch (erreur) {
      kEchec(ou, String(erreur).slice(0, 180));
    } finally {
      await page.close();
    }
  }

  // `/bilan?etape=context` sur un questionnaire vierge, les trois réponses données, « Voir mon bilan » :
  // rien n'est soumis, l'écran revient à la première étape incomplète (`issueDuSuivant`, v1-31 §2.4).
  {
    const ou = '/bilan?etape=context sur un questionnaire vierge, « Voir mon bilan »';
    const requetes = [];
    const page = await ouvrir('/bilan?etape=context', {}, { requetes });
    try {
      await page.getByRole('radio', { name: 'Urbain dense', exact: true }).click();
      // Ce qui passe près de chez soi se coche depuis `v1-34` : une case, plus une réponse unique.
      await page.getByRole('checkbox', { name: 'Métro ou tram', exact: true }).click();
      await page
        .getByRole('radiogroup', { name: 'Combien de véhicules motorisés dans ton foyer ?' })
        .getByRole('radio', { name: '0', exact: true })
        .click();
      await page.getByRole('button', { name: 'Voir mon bilan', exact: true }).click();
      await page.waitForTimeout(REPOS);
      const lu = await lireK(page);
      // Une **écriture** : l'écran lit au montage le dernier bilan complété (un `GET`), et cette lecture
      // n'est pas une soumission.
      const ecritures = requetes.filter(
        (r) => r.methode !== 'GET' && /\/rest\/v1\/(assessments|assessment_answers|rpc\/compute)/.test(r.url)
      );
      if (ecritures.length > 0) {
        kEchec(ou, `une soumission est partie (${ecritures.map((r) => `${r.methode} ${r.url}`).join(', ')}).`);
      }
      if (lu.titre !== TITRE_PREMIERE) kEchec(ou, `l'écran est sur « ${lu.titre} » — il revient à la première étape incomplète.`);
    } catch (erreur) {
      kEchec(ou, String(erreur).slice(0, 180));
    } finally {
      await page.close();
    }
  }
}

// ── L. Les écrans de compte : le focus suit le geste, et seulement lui (01/10/2026, audit T-4) ───
//
// Un écran de compte change de phase sans changer de route — l'adresse puis le code, la confirmation
// d'une suppression —, et le bouton touché disparaît avec la phase qui le portait : le focus
// retombait sur le document (mesuré, `BODY`), et rien n'annonçait ce qui arrivait. La phase qui
// arrive **sous le doigt** prend donc le focus (`FRONT.md` §2.4) ; celle qui s'ouvre sans geste ne le
// vole à personne. Les deux moitiés se gardent ici, parce qu'elles se jouent sans réseau : la reprise
// depuis « Toi » (le code ouvert d'emblée, depuis deux marques locales), « Utiliser une autre
// adresse », la première phase de `/connexion/retrouver`, et la confirmation de « Supprimer mon
// compte » sur « Toi ». Ce qui demande un envoi réel se garde au parcours réel
// (`verifier-parcours-reel.mjs`) : « Regarde tes emails » après l'adresse de `/connexion/email`, à
// l'étape « le compte rattaché par code, et rien derrière », et « C'est fait. » de « Toi », à l'étape
// « suppression du compte ». **Rien ne garde les autres** — les phases de `/compte/suppression`, le
// code de `/connexion/retrouver` et le retour à sa collision : chacune demande un envoi, et
// `verifier-code-de-connexion.mjs`, qui traverse le code de `/connexion/retrouver`, ne lit pas le focus.
//
// **Éprouvée en la cassant le 01/10/2026**, une mutation à la fois, un export chacune (cache Metro
// privé, `--clear`), le script entier rejoué. Ce qui tombe, dans tout le script :
//
//   | Ce qu'on casse | Ce qui tombe |
//   |---|---|
//   | la reprise ouverte « sous le doigt » (`apresUnGeste: true`) | L1, la reprise — seulement |
//   | « Rattacher mon adresse » sans `TitreDArrivee` | L2, « Utiliser une autre adresse » — seulement |
//   | la première phase de `/connexion/retrouver` posée « sous le doigt » | L3 — seulement |
//   | le focus de la confirmation retiré (`donnerLeFocus` de `MonCompte`) | L4 — seulement |
const ADRESSE_DU_CODE = 'traceverte.derniere_adresse_lien.v1';
const FLUX_DU_CODE = 'traceverte.dernier_flux_de_code.v1';

/** Où est le focus : le document, ou le texte normalisé de l'élément qui l'a. */
function lireLeFocus() {
  const actif = document.activeElement;
  return {
    corps: actif === null || actif === document.body,
    texte: (actif?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
  };
}

async function attendreLeTexte(page, texte) {
  await page.waitForFunction((t) => document.body.innerText.replace(/\s+/g, ' ').includes(t), texte, {
    timeout: ATTENTE,
  });
}

{
  const ou = '/connexion/email?reprise=1';
  const page = await ouvrir(ou, { [ADRESSE_DU_CODE]: 'camille@exemple.fr', [FLUX_DU_CODE]: 'rattachement' });
  try {
    await attendreLeTexte(page, 'Regarde tes emails');
    // Le repos avant la lecture, comme L2 à L4 : L1 est une assertion **négative**, et le vol qu'elle
    // guette viendrait de l'effet de `TitreDArrivee`, qui part après le rendu — lu trop tôt, il passerait
    // (contre-lecture de la PR #314).
    await page.waitForTimeout(REPOS);
    const surLaReprise = await page.evaluate(lireLeFocus);
    if (!surLaReprise.corps) {
      echecs.push(
        `${ou} (L1) : la saisie du code s'ouvre sans geste — la reprise depuis « Toi » — et prend pourtant` +
          ` le focus (« ${surLaReprise.texte} ») : un écran ouvert sans geste ne le vole à personne` +
          ' (`SaisieDuCode`, `apresUnGeste`).'
      );
    }
    await page.getByRole('button', { name: 'Utiliser une autre adresse', exact: true }).focus();
    await page.keyboard.press('Enter');
    await attendreLeTexte(page, 'Rattacher mon adresse');
    await page.waitForTimeout(REPOS);
    const apresLeGeste = await page.evaluate(lireLeFocus);
    if (apresLeGeste.corps || !apresLeGeste.texte.startsWith('Rattacher mon adresse')) {
      echecs.push(
        `${ou} (L2) : après « Utiliser une autre adresse » au clavier, le focus est sur` +
          ` ${apresLeGeste.corps ? 'le document' : `« ${apresLeGeste.texte} »`} — il doit être sur le titre` +
          ' qui arrive, « Rattacher mon adresse » (`TitreDArrivee`).'
      );
    }
  } catch (erreur) {
    echecs.push(`${ou}, focus des phases : ${String(erreur).slice(0, 180)}`);
  } finally {
    await page.close();
  }
}

{
  // Sans réseau, la lecture de l'état du compte n'aboutit pas : l'écran pose sa phase d'adresse, sans
  // que personne ait rien touché.
  const ou = '/connexion/retrouver';
  const page = await ouvrir(ou);
  try {
    await attendreLeTexte(page, 'Retrouver mon compte');
    await page.waitForTimeout(REPOS);
    const focus = await page.evaluate(lireLeFocus);
    if (!focus.corps) {
      echecs.push(
        `${ou} (L3) : la première phase arrive sans geste et prend pourtant le focus (« ${focus.texte} »)` +
          ' — seule une phase arrivée sous le doigt le prend.'
      );
    }
  } catch (erreur) {
    echecs.push(`${ou}, focus de la première phase : ${String(erreur).slice(0, 180)}`);
  } finally {
    await page.close();
  }
}

{
  const ou = '/compte, « Supprimer mon compte »';
  const page = await ouvrir('/compte');
  try {
    await page.getByRole('button', { name: 'Supprimer mon compte', exact: true }).focus();
    await page.keyboard.press('Enter');
    await attendreLeTexte(page, 'Cette action est irréversible.');
    await page.waitForTimeout(REPOS);
    const focus = await page.evaluate(lireLeFocus);
    if (focus.corps || !focus.texte.startsWith('Tes bilans, ton plan')) {
      echecs.push(
        `${ou} (L4) : le lien disparaît sous le doigt, et le focus est sur` +
          ` ${focus.corps ? 'le document' : `« ${focus.texte} »`} — il doit être sur la confirmation qui` +
          ' le remplace (`MonCompte`).'
      );
    }
  } catch (erreur) {
    echecs.push(`${ou}, focus de la confirmation : ${String(erreur).slice(0, 180)}`);
  } finally {
    await page.close();
  }
}

await navigateur.close();
fermer();

for (const { chemin, infractions } of relevesCsp) {
  for (const infraction of decrireInfractions(infractions)) {
    echecs.push(`${chemin} : la CSP de vercel.json, appliquée en production, ${infraction}.`);
  }
}

if (echecs.length > 0) {
  console.error('L’export s’affiche mais pas dans l’état attendu :\n');
  for (const echec of echecs) console.error(`  - ${echec}`);
  console.error(
    '\nCes états se décident **sur l’appareil** — une marque locale, un paramètre d’URL, une' +
      '\npréférence du système, un geste — donc sans réseau et sans rien qui lève. Aucune autre' +
      '\ngarde du dépôt ne les voit : les tests Jest ne montent pas d’écran, et' +
      '\n`verifier-rendu-export.mjs` vérifie que la page s’affiche, pas ce qu’elle affiche.' +
      '\nRejouer en local : expo export --platform web --clear, puis ce script (sans --clear, un' +
      '\ncache Metro partagé peut servir un autre arbre — voir l’en-tête).'
  );
  process.exit(1);
}

console.log(
  `${ETATS_DE_BARRE.length} états de barre d’onglets et ${ETAPES.length} ouvertures du` +
    ` questionnaire conformes ; onglets à ${CIBLE_TACTILE} px et actif lisible sans sa teinte ;` +
    ` ${PARAMETRES.length} routes à paramètre hydratées sans écart ; focus et animations réduites` +
    ` de l’onboarding conformes ; ${CASES_A_L_ESPACE.length} choix cochés à la barre d’espace sans` +
    ' que la page défile ; le focus du questionnaire suit l’étape, et « Voir les autres modes » le' +
    ' pose sur le premier mode révélé ; un arrêt de tabulation par groupe d’options, et les flèches' +
    ' y cochent sans en sortir ; la barre posée au démarrage, l’étape, son rail, une précision et les' +
    ' onglets en mouvement — et posés sous « réduire les animations » ; au « Suivant » en attente, ce' +
    ' qui manque se dit, y mène et y fait défiler, une ouverture remonte l’écran, et le filet dit la suite ;' +
    ' sur les écrans de compte, le focus suit le geste qui change la phase, et seulement lui.'
);
