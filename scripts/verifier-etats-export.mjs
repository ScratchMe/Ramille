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
// donc sans réseau — une marque locale, un paramètre d'URL. Ce sont aussi les seuls qu'un
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
// Lancé en CI après `expo export`, à côté des quatre autres gardes, cf. .github/workflows/ci.yml.
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
async function ouvrir(chemin, marques = {}) {
  const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
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
    } else if (!barre && vue.colonne && vue.colonne[0] < vue.fenetre - 1) {
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
      .waitForFunction((t) => document.body.innerText.includes(t), attendu, { timeout: ATTENTE })
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

await navigateur.close();
fermer();

if (echecs.length > 0) {
  console.error('L’export s’affiche mais pas dans l’état attendu :\n');
  for (const echec of echecs) console.error(`  - ${echec}`);
  console.error(
    '\nCes états se décident **sur l’appareil** — une marque locale, un paramètre d’URL — donc' +
      '\nsans réseau et sans rien qui lève. Aucune autre garde du dépôt ne les voit : les tests' +
      '\nJest ne montent pas d’écran, et `verifier-rendu-export.mjs` vérifie que la page s’affiche,' +
      '\npas ce qu’elle affiche. Rejouer en local : expo export --platform web, puis ce script.'
  );
  process.exit(1);
}

console.log(
  `${ETATS_DE_BARRE.length} états de barre d’onglets et ${ETAPES.length} ouvertures du` +
    ' questionnaire conformes.'
);
