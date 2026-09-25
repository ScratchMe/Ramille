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
//   | `/suivi/bilan` lit son état sans attendre l'hydratation | l'hydratation de `?id=` **et** le HTML statique « pas pu » (D) |
//
// La dernière dit ce que l'avant-dernière ne dit pas : un focus demandé sur un titre que le
// navigateur ne sait pas focaliser **échoue sans bruit**, et c'est `FOCALISABLE_PAR_PROGRAMME`
// (`src/lib/focus.ts`) qui le rend possible. Et l'hydratation de `/connexion` a ses deux moitiés :
// sans la seconde, une correction qui ignorerait le paramètre passerait pour juste.
//
// ── Sections D, E et F, éprouvées en cassant le 25/09/2026 ─────────────────────────────────────
//
// Six mutations, un export chacune, sur un arbre dont le témoin sort vert. Chacune fait tomber ce
// qu'elle devait faire tomber, et rien d'autre :
//
//   | Ce qu'on casse | Ce qui tombe |
//   |---|---|
//   | le pager n'ouvre plus de vol (`enVol` toujours nul) | le retour du focus sur la page qu'on quitte **et** l'inertie, trois bascules par page (E, moitié animée) |
//   | `StepShell` ne déplace plus le focus | le focus d'étape, tombé sur le document (F) |
//   | `StepShell` vise le titre sur web, sans `tabIndex` | le focus d'étape, tombé sur le document (F) |
//   | `/suivi/bilan` lit son état sans attendre l'hydratation | l'hydratation de `?id=` **et** le HTML statique « pas pu » (D) |
//   | `/suivi/bilan` ne quitte jamais le chargement | « Chargement » encore affiché (D) |
//   | `/suivi/bilan` lit son identifiant sous un autre nom | aucune lecture portant l'identifiant (D) |
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
// pose le focus sur la question de l'étape qui arrive (relevé sur deux étapes différentes) et F
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
// Lancé en CI après `expo export`, à côté des quatre autres gardes, cf. .github/workflows/ci.yml.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { chromium } from 'playwright';

import { servirExport } from './servir-export.mjs';

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
async function ouvrir(chemin, marques = {}, { reduire = false, exceptions = null, requetes = null, journal = false } = {}) {
  const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
  // « Réduire les animations », émulé **avant** le chargement : `useReducedMotion` la lit une fois,
  // au chargement du module (section E).
  if (reduire) await page.emulateMedia({ reducedMotion: 'reduce' });
  // Les exceptions sont écoutées dès avant la navigation : une erreur d'hydratation part pendant
  // que le bundle monte l'app, avant que l'attente ci-dessous ne rende la main (section D).
  if (exceptions) page.on('pageerror', (erreur) => exceptions.push(String(erreur)));
  // Les requêtes aussi, corps compris — un RPC porte son paramètre dans le corps : la lecture d'un
  // écran part dès son premier effet (section D).
  if (requetes) page.on('request', (requete) => requetes.push({ url: requete.url(), corps: requete.postData() ?? '' }));
  // Et le journal du focus, pour la même raison : il doit être posé avant le premier script de
  // la page pour ne rien manquer de ce qui bascule pendant une transition (section E).
  if (journal) await page.addInitScript(journaliserLeFocus);
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
    // Un jeton de forme valide mais inconnu : la page appelle le serveur, et ce qu'elle affiche
    // ensuite dépend de la base (refus en local, panne avec la configuration factice de la CI).
    // Aucune des deux issues n'est donc épinglée ; ce que le HTML dit **avant** l'app est vérifié
    // ci-dessous, dans le fichier.
    //
    // **Le titre seul ne prouvait rien, pour la raison de `/suivi/bilan`** (25/09/2026) : il est
    // dans le HTML statique, que l'export sert à tout le monde. Ce qui distingue la page montée, c'est
    // qu'elle quitte « Un instant » — vers l'une ou l'autre issue — et qu'elle a appelé le serveur
    // avec **ce** jeton.
    chemin: `/rappels/stop?jeton=${JETON_DE_FORME_VALIDE}`,
    attendu: 'Ne plus recevoir de rappels',
    interdit: 'Un instant',
    lecture: ({ url, corps }) =>
      url.includes('/rest/v1/rpc/desinscrire_des_rappels') && corps.includes(JETON_DE_FORME_VALIDE),
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
    // Sans jeton, rien n'est appelé : l'état ne dépend que de l'URL. Le HTML statique dit « un
    // instant » à tout le monde, donc c'est ici que se vérifie que la page en sort une fois montée
    // — sans quoi un lien tronqué resterait sur « Un instant, on coupe tes rappels. » pour toujours.
    chemin: '/rappels/stop',
    attendu: 'plus valable',
    interdit: 'Un instant',
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

// Ce que lit la personne qui ouvre le lien d'un rappel **avant** que l'app ne démarre : le HTML
// statique. Il disait « Ce lien n'est plus valable » à tout le monde, faute de connaître le jeton.
{
  const html = readFileSync(join(DIST, 'rappels', 'stop.html'), 'utf8');
  if (html.includes('plus valable')) {
    echecs.push(
      '/rappels/stop : le HTML statique annonce « Ce lien n’est plus valable » — c’est ce que lit' +
        ' quiconque ouvre le lien d’un rappel, le temps que l’app démarre. L’état de départ doit' +
        ' être celui qui n’affirme rien (FRONT.md §1.3).'
    );
  } else if (!html.includes('Un instant')) {
    echecs.push('/rappels/stop : le HTML statique ne porte plus « Un instant, on coupe tes rappels. ».');
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

// ── F. Le questionnaire : le focus suit l'étape ────────────────────────────────────────────────
//
// « Suivant » laisse le bouton en place et change la question au-dessus de lui : sans rien de plus,
// le focus reste sur le bouton qu'on vient d'actionner, et rien de la question qui arrive n'est
// annoncé (C1.9). `StepShell` le déplace, et **la cible n'est pas la même selon la plateforme**
// depuis le 25/09/2026 : le conteneur de l'étape sur web, son titre sur natif, où le conteneur est
// aplati et ne reçoit rien (le commentaire de `src/components/bilan/step-shell.tsx` dit pourquoi).
// Rien ne vérifiait la moitié web, alors qu'elle était la seule observable : cette section la tient.
//
// L'assertion porte sur ce que la personne obtient, pas sur l'élément choisi : le focus est sur la
// question qui arrive, ou sur un conteneur dont elle est le premier titre — la forme d'aujourd'hui.
// Une cible qui ne sait pas recevoir le focus (un titre sans `tabIndex` sur web) échoue sans bruit
// et laisse le focus sur « Suivant » : c'est ce que la seconde condition attrape.
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

await navigateur.close();
fermer();

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
    ' de l’onboarding conformes ; le focus du questionnaire suit l’étape.'
);
