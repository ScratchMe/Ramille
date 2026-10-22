// Génère `src/constants/licences.ts`, la liste que l'écran `/licences` affiche : ce que Ramille
// embarque d'autres auteurs, chaque licence reproduite une seule fois.
//
//   node scripts/generer-les-licences.mjs                       exporte, puis écrit le fichier
//   node scripts/generer-les-licences.mjs --verifier            exporte, compare, n'écrit rien (sort 1 si écart)
//   node scripts/generer-les-licences.mjs --depuis <export>     relit un export déjà fait (--source-maps)
//
// **Le fichier ne se retouche jamais à la main.** `scripts/licences.test.ts` fait rougir la CI quand il
// ne suit plus `package.json`, `package-lock.json` et les imports de `src/` ; ce script est ce qui le
// remet d'aplomb, et `--verifier` est la seule garde qui relit le bundle lui-même.
//
// ## Ce que « embarqué » veut dire ici
//
// `npm ls --omit=dev` rend plus de huit cents paquets, dont tout l'outillage d'Expo — le CLI, Metro,
// Babel — qui n'entre ni dans le bundle ni dans l'APK, et qui n'a aucune licence à reproduire dans ce
// qu'on distribue. La liste vient donc de ce que les artefacts contiennent, pas de ce qui est installé :
//
//   1. **Le bundle web et le bundle Android**, par leurs cartes de sources. `expo export --platform web
//      --platform android --source-maps` écrit, pour chaque bundle, la liste des fichiers que Metro y a
//      mis ; un chemin sous `node_modules/` désigne le paquet (le dernier `node_modules/` du chemin :
//      un paquet imbriqué compte pour lui-même, avec sa propre version). **Sous ce dossier, un
//      sous-dossier qui porte sa propre licence ou son propre `package.json` (nom et version) est un autre
//      paquet** : `expo-router/vendor/react-helmet-async/` est une copie de `react-helmet-async` (Apache 2.0,
//      New York Times Company), listée à part, « dans expo-router » — sans quoi elle passait pour du code
//      d'`expo-router` (MIT). Le sous-dossier le plus proche du fichier l'emporte. Le graphe n'est pas le même
//      des deux côtés — `react-native-web` d'un côté, `react-native` de l'autre, `react-native-webview`
//      et la police Material Symbols seulement sur Android —, d'où les deux exports. Hermès compile le
//      bundle Android en bytecode, mais sa carte garde les chemins. L'export est celui du build : mêmes
//      plugins, même configuration, `--clear` et un cache de Metro à soi (EXPO.md §1.1).
//   2. **Le code natif que l'autolinking compile dans l'APK**, par `expo-modules-autolinking resolve`
//      et `react-native-config`, les deux commandes qu'appelle Gradle. Un module natif présent est
//      compilé qu'un écran l'importe ou non (react-native-gesture-handler, expo-keep-awake : aucun
//      import dans le bundle, du code dans l'APK).
//   3. **Les polices**, retrouvées parmi les fichiers de ces bundles (`.ttf`, `.otf`, `.woff`). Une
//      police a sa propre licence, rangée à côté du paquet qui la porte (`LICENSE_FONT`), et son avis de
//      copyright est lu dans le fichier de police lui-même — celui qu'on distribue.
//
// Pour chaque paquet retenu : la licence déclarée par son `package.json`, le texte de son fichier de
// licence et son avis de copyright, cherché dans cet ordre et arrêté au premier qui répond :
//
//   1. les lignes de copyright de son fichier de licence ;
//   2. à défaut, le premier avis que porte, en commentaire de tête, un des fichiers du paquet **qui entrent
//      dans les bundles** (`Copyright (c) Meta Platforms, Inc. and affiliates.` en tête des fichiers de
//      `@react-native/*`) — les fichiers du paquet que les bundles ne contiennent pas ne comptent pas ;
//   3. à défaut, le champ `author` de son `package.json`, présenté comme tel (« Auteur indiqué par le
//      paquet : … ») : ce n'est pas un avis, et l'écran ne le fait pas passer pour un ;
//   4. à défaut, rien, et l'écran dit qu'aucun avis n'a été trouvé.
//
// **Et, que le paquet ait une licence ou non, les avis des fichiers repris d'autres projets.** Un paquet
// range parfois dans ses sources du code qu'un autre auteur a écrit, sans dossier ni `package.json` à lui — donc
// sans que la détection des copies (plus bas) le voie : le polyfill de console de `@react-native/js-polyfills`
// (« Copyright Joyent, Inc. and other Node contributors. », sous MIT), `web-streams-polyfill` dans `expo`,
// le code de Deno dans `@expo/metro-runtime`, celui de Nicolas Gallagher dans `@react-native-async-storage`.
// Pour **chaque** fichier du paquet que les bundles contiennent, le script lit tous les avis que l'en-tête
// porte **en commentaire** (mêmes limites de lecture que plus haut) et garde, dans l'ordre des chemins, ceux
// dont le **titulaire** diffère de l'avis déjà affiché et de ceux déjà gardés. Le titulaire est ce qui reste
// d'un avis sans « Copyright », ni année, ni forme sociale (« Inc. », « (aka Expo) », « and affiliates ») :
// « Copyright © 2024 650 Industries. » et « Copyright (c) 2015-present 650 Industries, Inc. (aka Expo) » sont
// le même titulaire. Le script ne sait pas que Facebook est devenu Meta : ce sont deux titulaires, et il
// garde les deux. L'écran les montre sous l'avis principal, en disant qu'ils viennent de fichiers repris.
// **Si un de ces avis renvoie à une licence — par son nom, ou parce que son bloc de commentaire en recopie le
// texte — que la page ne reproduit pas déjà, ou que le script ne sait pas lire, il s'arrête** (la MIT, le
// texte que ces fichiers citent, passe sans autre examen).
//
// Les textes sont rangés **une fois par type** : on retire les lignes de copyright et le titre, on compare ce
// qui reste sans la casse ni la ponctuation, et deux textes identiques n'en font qu'un. Un texte qui diffère
// vraiment pour une même licence reste à part (« autre rédaction »), plutôt que d'être écrasé par le plus
// fréquent. **L'emplacement de l'avis dans l'appendice de l'Apache** (« Copyright [yyyy] [name of copyright
// owner] ») est rempli par un projet (« Copyright 2018 The New York Times Company ») et laissé vide par un
// autre : il ne compte pas dans la comparaison, mais **le texte affiché le garde, sous cette forme
// canonique**, que le fichier l'ait rempli ou non — sans lui, « with the fields enclosed by brackets "[]"
// replaced… » n'a plus de champ à désigner. **« (c) » n'est un avis que suivi d'une année** : c'est aussi le
// repère de la clause 4(c) de l'Apache, dont la première ligne disparaissait du texte affiché.
//
// ## Ce que le script refuse de deviner
//
// Il s'arrête, en nommant le paquet, quand : aucune licence n'est déclarée ; la licence est une
// expression (`OR`, `AND`) qu'il ne sait pas trancher — sauf le cas d'une police, où `MIT AND OFL-1.1`
// se lit « le paquet en MIT, la police en OFL » ; le texte du fichier ne ressemble pas à la licence
// déclarée ; un fichier de licence existe sous un nom qu'il ne sait pas lire ; un fichier NOTICE existe
// (la licence Apache exige de le reproduire, et l'écran ne sait pas le montrer) ; un sous-dossier d'un paquet
// porte une licence sans dire de quel paquet il s'agit (ni `package.json`, ni `package_original.json` avec un
// nom et une version) ; un avis repris d'un fichier renvoie à une licence (autre que la MIT) que la page ne
// reproduit pas, ou que le script ne sait pas lire ; ou aucun paquet n'apporte le texte d'une licence que
// d'autres déclarent. Un message vaut mieux qu'une liste qui a l'air complète.
//
// ## Ce qu'il ne couvre pas — et que l'écran dit
//
//   * **Les dépendances Gradle des modules natifs** : AndroidX, Kotlin, Firebase, Material Components,
//     ShortcutBadger… Maven les tire à la compilation, elles ne sont pas dans `node_modules`, et la
//     plupart sont sous licence Apache 2.0. Les lister demande un build Android (le SDK,
//     `./gradlew :app:dependencies`, ou un greffon de licences), que ni l'environnement d'agent ni la
//     CI ne jouent aujourd'hui. L'écran le dit en une phrase (`src/types/licences.ts`).
//   * **Le code natif de React Native et d'Hermès**, qui vient d'artefacts Maven : il est couvert par
//     l'entrée `react-native` (MIT, Meta), pas par la liste de ce que ces artefacts tirent eux-mêmes.
//   * **Ce qui n'est pas dans `node_modules`** : les images, la mascotte et l'identité de Ramille
//     (réservées, `NOTICE`), et le logo de Google du bouton de connexion.
//   * **Les paquets sans fichier de licence, et ceux dont la licence ne porte aucun avis** : ils sont listés
//     avec la licence que leur `package.json` déclare (et, faute de fichier, le texte standard), et l'avis est
//     cherché ailleurs (sources, puis `author` : voir plus haut). Un paquet où rien n'est trouvé reste sans
//     ligne de copyright, et l'écran dit qu'aucun avis n'y a été trouvé — pas que le paquet n'en donne pas :
//     les fichiers que les bundles ne contiennent pas, un en-tête au-delà des quarante premières lignes (ou des
//     quatre premiers kio), un avis qui n'est pas en commentaire ne sont pas lus. Les quarante lignes et les
//     quatre kio suffisent au cas qui a servi à les éprouver : l'avis de Joyent, dans `console.js` de
//     `@react-native/js-polyfills`, est à la ligne 22, 573 octets du début.
//   * **iOS** : la V1 est Google Play seul.
//   * **Les dépendances directes qui n'entrent nulle part** (`satori` et `@resvg/resvg-wasm`, que `api/`
//     utilise sur le serveur de Vercel) : elles sont recensées dans `ecartes`, pour que la garde sache
//     qu'on les a regardées.
//
// ## Essais
//
// `--racine`, `--sortie`, `--date` et `--sans-natif` existent pour que `scripts/licences.test.ts` joue le
// script sur un petit arbre fabriqué ; `--sans-natif` exige `--sortie`, pour qu'un fichier engagé ne soit
// jamais écrit sans l'autolinking.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const RACINE_DU_DEPOT = path.resolve(import.meta.dirname, '..');
const SORTIE_PAR_DEFAUT = 'src/constants/licences.ts';
const MARQUEUR = 'export const LICENCES: DonneesDesLicences = ';

// ─── Les licences que le script sait lire ────────────────────────────────────────────────────

/**
 * Chaque licence reconnue : son nom à l'écran, et ce que son texte doit contenir (en minuscules, sans
 * ponctuation, un seul espace) pour qu'on le reconnaisse — `requis` doit y être, `interdits` non.
 * Ajouter une licence, c'est ajouter une ligne ici, pas assouplir le contrôle.
 */
const LICENCES_CONNUES = {
  MIT: { nom: 'Licence MIT', requis: ['permission is hereby granted free of charge to any person obtaining a copy'] },
  ISC: {
    nom: 'Licence ISC',
    requis: ['permission to use copy modify and or distribute this software for any purpose with or without fee is hereby granted provided that the above copyright notice'],
  },
  'BSD-2-Clause': {
    nom: 'Licence BSD à deux clauses',
    requis: ['redistribution and use in source and binary forms with or without modification are permitted provided that the following conditions are met'],
    interdits: ['neither the name'],
  },
  'BSD-3-Clause': {
    nom: 'Licence BSD à trois clauses',
    requis: ['redistribution and use in source and binary forms with or without modification are permitted provided that the following conditions are met', 'neither the name'],
  },
  '0BSD': {
    nom: 'Licence BSD à zéro clause (0BSD)',
    requis: ['permission to use copy modify and or distribute this software for any purpose with or without fee is hereby granted'],
    interdits: ['provided that the above copyright notice'],
  },
  'Apache-2.0': { nom: 'Apache License 2.0', requis: ['apache license version 2 0 january 2004'] },
  'OFL-1.1': { nom: 'SIL Open Font License 1.1', requis: ['sil open font license version 1 1'] },
};

/** Les licences qu'une police peut porter ici. L'OFL contient la phrase d'ouverture de la MIT : on ne laisse donc pas la police les parcourir toutes. */
const LICENCES_DE_POLICE = ['OFL-1.1', 'Apache-2.0'];

/** Les licences dont le texte commence par un titre qui n'en fait pas partie (« MIT License »). */
const AVEC_TITRE_A_RETIRER = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD']);

// ─── Lecture d'un texte de licence ────────────────────────────────────────────────────────────

// Un avis de copyright commence par « Copyright » (majuscule), par « © », ou par « (c) » **suivi d'une
// année**. Les phrases du texte de la licence qui contiennent le mot (« the above copyright notice »,
// « COPYRIGHT HOLDERS BE LIABLE ») sont en minuscules, ou en capitales, ou ne commencent pas ainsi ; et
// celles qu'une césure de ligne ferait commencer par « Copyright notice… » sont écartées par le second motif.
//
// « (c) » seul n'est pas un avis : c'est le repère de la clause 4(c) de l'Apache 2.0 (« (c) You must retain,
// in the Source form of any Derivative Works… »), de la 2.2(c) de la MPL. Le prendre pour un avis retirait
// du texte affiché la première ligne de la clause (relevé le 22/10/2026, contre-lecture de l'écran
// `/licences`). Une majuscule après « (c) » ne suffit pas non plus — « You » en a une —, d'où l'année.
const AVIS = /^\s*(?:Copyright\b|COPYRIGHT\s*(?:\(C\)|©|\d)|\([cC]\)\s*\d|©)/;
const PAS_UN_AVIS = /^\s*Copyright\s+(?:holders?|notice|owners?|licen[cs]e|statement|laws?)\b/i;
const MODELE = /\[yyyy\]|\{yyyy\}|<year>|\[year\]|\[name of copyright owner\]|\{name of copyright owner\}|<copyright holders?>|<owner>/i;

const estUnAvis = (ligne) => AVIS.test(ligne) && !PAS_UN_AVIS.test(ligne) && !MODELE.test(ligne);
// L'emplacement d'un avis que personne n'a rempli — « Copyright [yyyy] [name of copyright owner] », dans
// l'appendice de l'Apache. Ce n'est l'avis de personne (il ne va pas dans la ligne de copyright du paquet), et
// il ne compte pas pour comparer deux textes : un projet qui remplit l'emplacement (« Copyright 2018 The New
// York Times Company ») et un autre qui le laisse vide auraient sinon deux textes « différents ». Le texte
// affiché, lui, le garde (`lignesDuTexte`) : l'appendice qui dit « the fields enclosed by brackets "[]" »
// en a besoin.
const estUnEmplacement = (ligne) => AVIS.test(ligne) && !PAS_UN_AVIS.test(ligne) && MODELE.test(ligne);
const estRetiree = (ligne) => estUnAvis(ligne) || estUnEmplacement(ligne);
const espaces = (texte) => texte.replace(/\s+/g, ' ').trim();
const toutesLesLignes = (texte) => texte.replace(/\r\n?/g, '\n').split('\n');
const DROITS_RESERVES = /^all rights reserved\.?$/i;

/** Les avis d'un texte, avec « All rights reserved. » quand il suit l'avis sur sa propre ligne. */
function avisDuTexte(texte) {
  const lignes = toutesLesLignes(texte);
  const avis = [];
  lignes.forEach((ligne, i) => {
    if (!estUnAvis(ligne)) return;
    const suite = espaces(lignes[i + 1] ?? '');
    avis.push(DROITS_RESERVES.test(suite) ? `${espaces(ligne)} ${suite}` : espaces(ligne));
  });
  return [...new Set(avis)];
}

/**
 * Les lignes sans leurs avis (ni leur emplacement vide), sauf la ligne d'indice `gardee`. « All rights reserved. »
 * seul, qui suivait un avis, part avec lui.
 */
function sansLesAvis(lignes, gardee) {
  return lignes.filter((ligne, i) => i === gardee || (!estRetiree(ligne) && !(DROITS_RESERVES.test(espaces(ligne)) && i > 0 && estRetiree(lignes[i - 1]))));
}

/** L'emplacement de l'avis dans l'appendice de l'Apache, sous la forme que le texte de la licence lui donne. */
const EMPLACEMENT_CANONIQUE = 'Copyright [yyyy] [name of copyright owner]';
const AMORCE_DU_MODELE_APACHE = /^\s*Licensed under the Apache License,? Version 2\.0/i;

/**
 * L'indice de la ligne qui tient la place de l'avis dans le modèle de l'appendice de l'Apache — la dernière
 * ligne non vide avant « Licensed under the Apache License, Version 2.0 » — quand c'est un avis ou un
 * emplacement vide ; sinon -1. Un projet y met son avis (« Copyright 2018 The New York Times Company »), un
 * autre y laisse « Copyright [yyyy] [name of copyright owner] », ou « {yyyy} », un troisième l'efface.
 */
function indiceDeLEmplacement(lignes) {
  const amorce = lignes.findIndex((ligne) => AMORCE_DU_MODELE_APACHE.test(ligne));
  if (amorce === -1) return -1;
  for (let i = amorce - 1; i >= 0; i--) {
    if (lignes[i].trim() !== '') return estRetiree(lignes[i]) ? i : -1;
  }
  return -1;
}

const porteLEmplacement = (lignes) => lignes.some((ligne) => ligne.trim() === EMPLACEMENT_CANONIQUE);

/** Un titre est une première ligne courte qui nomme la licence — « MIT License », « # The MIT License (MIT) ». */
function estUnTitre(ligne) {
  const nue = ligne.replace(/^[\s#*=_-]+|[\s#*=_-]+$/g, '');
  return nue.length > 0 && nue.length <= 40 && /licen[cs]e/i.test(nue) && !/[.:;,]$/.test(nue);
}

/**
 * Les lignes d'une licence, en deux formes. `affichees` : ce qu'on reproduit — sans avis, sans titre pour les
 * permissives, pour l'OFL à partir de son intitulé, et l'Apache avec l'emplacement de son avis **sous sa forme
 * canonique**, qu'il ait été rempli, laissé vide ou écrit « {yyyy} ». `comparees` : ce qui sert à dire que
 * deux textes sont le même — les mêmes lignes **sans cet emplacement**, que les projets remplissent chacun
 * à leur façon.
 */
function lignesDuTexte(id, texte) {
  const brutes = toutesLesLignes(texte);
  const emplacement = id === 'Apache-2.0' ? indiceDeLEmplacement(brutes) : -1;
  if (emplacement !== -1) brutes[emplacement] = EMPLACEMENT_CANONIQUE;
  let lignes = sansLesAvis(brutes, emplacement);
  if (id === 'OFL-1.1') {
    const debut = lignes.findIndex((l) => /^\s*SIL OPEN FONT LICENSE\b/i.test(l));
    if (debut !== -1) lignes = lignes.slice(debut);
  }
  if (AVEC_TITRE_A_RETIRER.has(id)) {
    const premiere = lignes.findIndex((l) => l.trim() !== '');
    if (premiere !== -1 && estUnTitre(lignes[premiere])) lignes = lignes.slice(premiere + 1);
  }
  return { affichees: lignes, comparees: lignes.filter((ligne) => ligne.trim() !== EMPLACEMENT_CANONIQUE) };
}

/** Ce qui sert à comparer deux textes : sans la casse, la ponctuation ni les espaces. */
const corpsNormalise = (lignes) => lignes.join(' ').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Un intitulé de section, en capitales, seul sur sa ligne (« PREAMBLE », « PERMISSION & CONDITIONS »). */
const estUnIntitule = (ligne) => ligne.length <= 40 && /^[A-Z0-9 &,.'()/-]+$/.test(ligne) && /[A-Z]{3}/.test(ligne);

/**
 * Les paragraphes affichés : les lignes d'un même bloc se rejoignent, un blanc ou un filet de tirets
 * sépare, et un intitulé en capitales qui ouvre un bloc reste seul sur sa ligne — la police d'un texte
 * de licence en porte cinq que la césure collerait sinon à la phrase suivante.
 */
function paragraphes(lignes) {
  const blocs = [];
  let courant = [];
  const clore = () => {
    if (courant.length > 0) blocs.push(courant.join(' '));
    courant = [];
  };
  lignes.forEach((ligne, i) => {
    const nue = ligne.trim();
    if (nue === '' || /^[-=*_~]{5,}$/.test(nue)) clore();
    else {
      courant.push(nue);
      if (courant.length === 1 && estUnIntitule(nue) && (lignes[i + 1] ?? '').trim() !== '') clore();
    }
  });
  clore();
  return blocs;
}

/** Vérifie que le texte est bien celui de la licence déclarée, et rend sa forme de comparaison. */
function reconnaitre(id, lignes, etiquette) {
  const spec = LICENCES_CONNUES[id];
  if (!spec) throw new Error(`${etiquette} : la licence « ${id} » n’est pas prise en charge (LICENCES_CONNUES).`);
  const corps = corpsNormalise(lignes);
  const manque = spec.requis.find((phrase) => !corps.includes(phrase));
  const enTrop = (spec.interdits ?? []).find((phrase) => corps.includes(phrase));
  if (manque || enTrop) {
    throw new Error(
      `${etiquette} : le texte fourni ne ressemble pas à la licence ${id} qu’il déclare (${manque ? `il manque « ${manque.slice(0, 50)}… »` : `il contient « ${enTrop} »`}).`
    );
  }
  return corps;
}

// ─── Lecture d'un paquet ──────────────────────────────────────────────────────────────────────

const NOM_DE_LICENCE = /^(licen[cs]e|copying|unlicense)(\.(md|txt|markdown))?$/i;

const fichiersDe = (dossier) => fs.readdirSync(dossier, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name).sort();

/** Le fichier de licence d'un dossier de paquet, ou `null` ; un nom qui y ressemble sans être lisible fait échouer. */
function fichierDeLicence(dossier, etiquette) {
  const fichiers = fichiersDe(dossier);
  const lisible = fichiers.find((nom) => NOM_DE_LICENCE.test(nom));
  if (lisible) return lisible;
  const douteux = fichiers.filter((nom) => /^licen[cs]e/i.test(nom) && !/^licen[cs]e_font/i.test(nom));
  if (douteux.length > 0) {
    throw new Error(`${etiquette} : « ${douteux.join(', ')} » ressemble à une licence mais le script ne sait pas le lire (NOM_DE_LICENCE).`);
  }
  return null;
}

const fichierDePolice = (dossier) => fichiersDe(dossier).find((nom) => /^licen[cs]e_font/i.test(nom)) ?? null;

/** La licence déclarée, en une chaîne ; `null` si le `package.json` n'en dit rien. */
function licenceDeclaree(pj) {
  const brute = typeof pj.license === 'string' ? pj.license : pj.license?.type;
  if (typeof brute === 'string' && brute.trim() !== '') return brute.trim().replace(/^\((.*)\)$/, '$1');
  if (Array.isArray(pj.licenses) && pj.licenses.length > 0) return pj.licenses.map((l) => l?.type).filter(Boolean).join(' OR ') || null;
  return null;
}

function lirePaquet(dossier) {
  const pj = JSON.parse(fs.readFileSync(path.join(dossier, 'package.json'), 'utf8'));
  if (typeof pj.name !== 'string' || typeof pj.version !== 'string') throw new Error(`${dossier}/package.json n’a ni nom ni version.`);
  return { dossier, nom: pj.name, version: pj.version, pj };
}

// ─── Les copies : un paquet qui en porte un autre dans ses sources ───────────────────────────
//
// Le paquet qu'une carte désigne par le dernier `node_modules/` de son chemin est celui qui **contient** le
// fichier, pas toujours celui qui l'a écrit : `expo-router` range une copie de `react-helmet-async`
// (Apache 2.0, « Copyright 2018 The New York Times Company ») sous `vendor/react-helmet-async/`, avec sa
// propre licence, et la rattacher à `expo-router` (MIT) donnait l'avis de l'un à du code de l'autre.

/** Les noms sous lesquels un dossier dit qui il est : son `package.json`, ou la copie d'amont qu'Expo garde en `package_original.json`. */
const FICHIERS_D_IDENTITE = ['package.json', 'package_original.json'];

/** Nom et version d'un dossier, ou `null` — un `package.json` sans les deux (`{ "type": "module" }`) ne désigne personne. */
function identiteDuDossier(dossier) {
  for (const nom of FICHIERS_D_IDENTITE) {
    const chemin = path.join(dossier, nom);
    if (!fs.existsSync(chemin)) continue;
    const pj = JSON.parse(fs.readFileSync(chemin, 'utf8'));
    if (typeof pj.name === 'string' && typeof pj.version === 'string') return { dossier, nom: pj.name, version: pj.version, pj };
  }
  return null;
}

/**
 * Si `fichier` (relatif au dossier de l'hôte) vit sous un sous-dossier qui porte son propre fichier de licence
 * ou son propre `package.json` (nom et version), rend ce sous-dossier comme un paquet à part, avec le chemin
 * du fichier relatif à lui ; sinon `null`. Le sous-dossier le plus proche du fichier l'emporte, comme le
 * dernier `node_modules/` d'un chemin. **Un sous-dossier qui porte une licence sans dire de quel paquet il
 * s'agit fait échouer le script** : lui donner la licence de l'hôte, ou une identité inventée, serait
 * attribuer à quelqu'un du code qu'il n'a pas écrit.
 */
function copieDansLePaquet(hote, fichier) {
  const segments = fichier.split('/');
  let courant = hote.dossier;
  let trouvee = null;
  for (let i = 0; i < segments.length - 1; i++) {
    courant = path.join(courant, segments[i]);
    if (!fs.existsSync(courant)) break;
    const etiquette = `${hote.nom}@${hote.version}, ${segments.slice(0, i + 1).join('/')}`;
    const licence = fichierDeLicence(courant, etiquette);
    const identite = identiteDuDossier(courant);
    if (licence !== null && identite === null) {
      throw new Error(
        `${etiquette} : le dossier porte un fichier de licence (${licence}) et des fichiers qu'un bundle contient, mais aucun package.json (ni package_original.json) qui dise de quel paquet il s’agit — le script ne lui prête ni la licence de ${hote.nom}, ni une identité (FICHIERS_D_IDENTITE).`
      );
    }
    if (identite === null || (identite.nom === hote.nom && identite.version === hote.version)) continue;
    trouvee = { paquet: { ...identite, dans: hote.nom }, fichier: segments.slice(i + 1).join('/') };
  }
  return trouvee;
}

// ─── L'avis d'un paquet qui n'en donne pas dans sa licence, et ceux des fichiers qu'il a repris ─────

const MARQUE_DE_COMMENTAIRE = /^\s*(?:\/\*+!?|\*+(?!\/)|\/\/+!?|#+)\s*(.*?)\s*(?:\*+\/)?\s*$/;
/** Un avis se pose en tête de fichier : au-delà, une ligne « Copyright » est plus souvent celle d'un code collé que celle du paquet. */
const OCTETS_D_ENTETE = 4096;
const LIGNES_D_ENTETE = 40;
const AUTEUR_DU_PAQUET = 'Auteur indiqué par le paquet : ';

/**
 * Les licences qu'un commentaire peut citer **par leur nom**, avec l'identifiant de `LICENCES_CONNUES`. Une
 * mention est retirée du texte une fois reconnue, pour que « BSD » seul, plus bas, reste une licence qu'on ne sait
 * pas lire (BSD à deux ou à trois clauses ?) et non le reste d'un « BSD-3-Clause ».
 */
const NOMS_DE_LICENCE = [
  { id: 'MIT', motif: /\bMIT\b/g },
  { id: 'ISC', motif: /\bISC\b/g },
  { id: 'BSD-2-Clause', motif: /\bBSD[- ]2[- ]Clause\b/g },
  { id: 'BSD-3-Clause', motif: /\bBSD[- ]3[- ]Clause\b/g },
  { id: '0BSD', motif: /\b0BSD\b/g },
  { id: 'Apache-2.0', motif: /\bApache(?: License)?,?(?: Version)?[ -]2(?:\.0)?\b/gi },
  { id: 'OFL-1.1', motif: /\bSIL Open Font License\b|\bOFL(?:-1\.1)?\b/g },
];
/** Ce qu'un commentaire peut citer sans que le script sache de quelle licence il s'agit : on s'arrête plutôt que de deviner. */
const LICENCE_QUE_LE_SCRIPT_NE_LIT_PAS =
  /\b(?:A|L)?GPL\b|\bMPL\b|\bMozilla Public\b|\bEPL\b|\bEclipse Public\b|\bCC0\b|\bCC-BY\b|\bCreative Commons\b|\bUnlicense\b|\bWTFPL\b|\bZlib\b|\bBoost Software\b|\bpublic domain\b|\bBSD\b|\bApache\b/gi;

/**
 * Les licences qu'un bloc de commentaire cite : celles que le script connaît (`connues`, des identifiants de
 * `LICENCES_CONNUES`), par leur nom ou parce que le bloc en recopie le texte — le polyfill de console de React
 * Native recopie la MIT de Joyent sans la nommer —, et celles qu'il voit sans savoir les lire (`inconnues`).
 */
function licencesCitees(lignes) {
  const connues = new Set();
  let reste = espaces(lignes.join(' '));
  for (const { id, motif } of NOMS_DE_LICENCE) {
    if (reste.search(motif) === -1) continue;
    connues.add(id);
    reste = reste.replace(motif, ' ');
  }
  const corps = corpsNormalise(lignes);
  for (const [id, spec] of Object.entries(LICENCES_CONNUES)) {
    if (spec.requis.every((phrase) => corps.includes(phrase)) && !(spec.interdits ?? []).some((phrase) => corps.includes(phrase))) connues.add(id);
  }
  return { connues, inconnues: [...new Set([...reste.matchAll(LICENCE_QUE_LE_SCRIPT_NE_LIT_PAS)].map((m) => m[0]))] };
}

/**
 * Les avis que l'en-tête d'un fichier source porte **en commentaire** (une ligne ` * Copyright …` dans un
 * commentaire de bloc, ou `// Copyright …`), dans l'ordre, chacun avec les licences que cite son bloc de
 * commentaire (les lignes de commentaire qui se suivent : la licence d'un avis est dite à côté de lui, pas à
 * l'autre bout du fichier).
 */
function avisDeLEnteteDuFichier(chemin) {
  if (!fs.existsSync(chemin) || !fs.statSync(chemin).isFile()) return [];
  const tampon = Buffer.alloc(OCTETS_D_ENTETE);
  const descripteur = fs.openSync(chemin, 'r');
  let lus;
  try {
    lus = fs.readSync(descripteur, tampon, 0, OCTETS_D_ENTETE, 0);
  } finally {
    fs.closeSync(descripteur);
  }
  const avis = [];
  let bloc = [];
  const clore = () => {
    if (bloc.some(estUnAvis)) {
      const { connues, inconnues } = licencesCitees(bloc);
      for (const ligne of bloc.filter(estUnAvis)) avis.push({ avis: espaces(ligne), licences: connues, inconnues });
    }
    bloc = [];
  };
  for (const ligne of toutesLesLignes(tampon.toString('utf8', 0, lus)).slice(0, LIGNES_D_ENTETE)) {
    const commentaire = MARQUE_DE_COMMENTAIRE.exec(ligne);
    if (commentaire) bloc.push(commentaire[1]);
    else clore();
  }
  clore();
  return avis;
}

/** L'auteur que déclare le `package.json`, sans son adresse ni son lien : « Scott Taylor <…> (https://…) » → « Scott Taylor ». */
function auteurDuPaquet(pj) {
  const brut = typeof pj.author === 'string' ? pj.author : pj.author?.name;
  if (typeof brut !== 'string') return null;
  const nom = espaces(brut.replace(/<[^>]*>|\([^)]*\)/g, ''));
  return nom === '' ? null : nom;
}

/**
 * Tous les avis que portent, en commentaire de tête, les fichiers du paquet **qui entrent dans les bundles** —
 * chaque fichier, que le paquet ait une licence ou non —, dans l'ordre alphabétique de leur chemin (pour que le
 * résultat ne dépende pas de l'ordre où Metro les a rangés), puis dans l'ordre où ils s'écrivent.
 */
function avisDesFichiers(paquet) {
  const avis = [];
  for (const fichier of [...paquet.fichiers].sort()) {
    for (const trouve of avisDeLEnteteDuFichier(fichier)) avis.push({ ...trouve, fichier });
  }
  return avis;
}

/**
 * Ce qui tient lieu d'avis quand le fichier de licence n'en porte pas : le premier avis de copyright que
 * portent les fichiers du paquet **qui entrent dans les bundles** (`avisDesFichiersDuPaquet`, dans l'ordre
 * alphabétique de leur chemin), à défaut l'auteur du `package.json`, présenté comme tel. Rien d'autre : un
 * paquet sans avis ni auteur n'en a pas, et l'écran le dit.
 */
function avisHorsLicence(avisDesFichiersDuPaquet, pj) {
  if (avisDesFichiersDuPaquet.length > 0) return [avisDesFichiersDuPaquet[0].avis];
  const auteur = auteurDuPaquet(pj);
  return auteur === null ? [] : [`${AUTEUR_DU_PAQUET}${auteur}`];
}

/** Ce qui ne nomme personne dans un avis : la forme sociale, « the », « authors », « contributors ». */
const MOTS_SANS_TITULAIRE = new Set(['the', 'and', 'inc', 'llc', 'ltd', 'corp', 'corporation', 'company', 'co', 'gmbh', 'author', 'authors', 'contributors']);

/**
 * Le titulaire d'un avis, ramené à ce qui le nomme : sans « Copyright », « (c) » ni « © », sans année ni
 * « 2015-present », sans « All rights reserved. » ni « MIT license. », sans parenthèse (« (aka Expo) »), sans
 * « and affiliates » ni « and other Node contributors », sans forme sociale, en minuscules et sans ponctuation.
 * « Copyright © 2024 650 Industries. » et « Copyright (c) 2015-present 650 Industries, Inc. (aka Expo) » ont le
 * même. Un avis qui n'en laisse rien (« Copyright 2020 ») garde son texte entier pour clé.
 */
function titulaireDe(avis) {
  const mots = avis
    .toLowerCase()
    .replace(/copyright|©|\(c\)/g, ' ')
    .replace(/all rights reserved/g, ' ')
    .replace(/\b(?:mit|isc|bsd|apache)(?:-[\w.]+)? licen[cs]e\b/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(?:19|20)\d{2}\s*[-–]\s*(?:(?:19|20)\d{2}|present)\b|\b(?:19|20)\d{2}\b|\bpresent\b/g, ' ')
    .replace(/\band (?:its |other )?(?:\p{L}+ )?(?:affiliates|contributors)\b/gu, ' ')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((mot) => mot !== '' && !MOTS_SANS_TITULAIRE.has(mot));
  return mots.length > 0 ? mots.join(' ') : espaces(avis).toLowerCase();
}

/**
 * Les avis des fichiers du paquet dont le titulaire diffère de l'avis déjà affiché (`principal`) et de ceux déjà
 * gardés — le code qu'un autre auteur a écrit et que le paquet a repris dans ses sources. Le premier de chaque
 * titulaire reste, dans l'ordre des fichiers.
 */
function avisRepris(avisDesFichiersDuPaquet, principal) {
  const vus = new Set(principal.map(titulaireDe));
  const repris = [];
  for (const trouve of avisDesFichiersDuPaquet) {
    const titulaire = titulaireDe(trouve.avis);
    if (vus.has(titulaire)) continue;
    vus.add(titulaire);
    repris.push(trouve);
  }
  return repris;
}

/**
 * Un avis repris qui renvoie à une licence que la page ne reproduit pas, ou que le script ne sait pas lire, fait
 * échouer le script : lui prêter la licence du paquet serait deviner. La MIT passe sans autre examen.
 */
function verifierLesLicencesDesAvisRepris(analyses, textes) {
  const reproduites = new Set(textes.map((texte) => texte.licence));
  for (const { paquet, repris } of analyses) {
    for (const trouve of repris) {
      const ou = `${paquet.nom}@${paquet.version} : le fichier « ${path.relative(paquet.dossier, trouve.fichier)} » porte l’avis « ${trouve.avis} »`;
      const absentes = [...trouve.licences].filter((id) => id !== 'MIT' && !reproduites.has(id));
      if (absentes.length > 0) {
        throw new Error(`${ou} et renvoie à la licence ${absentes.join(', ')}, que la page ne reproduit pas — le script ne devine pas laquelle s’applique (voir l’en-tête du script).`);
      }
      if (trouve.inconnues.length > 0) {
        throw new Error(`${ou} et renvoie à « ${trouve.inconnues.join(', ')} », une licence que le script ne sait pas lire — il ne devine pas laquelle s’applique (voir l’en-tête du script).`);
      }
    }
  }
}

// ─── Polices : le nom et l'avis de copyright, lus dans le fichier ─────────────────────────────

/** Les entrées de la table `name` d'une police TrueType ou OpenType, en Unicode ou en Mac Roman. */
function nomsDeLaPolice(tampon) {
  if (tampon.length < 12) return [];
  const tables = tampon.readUInt16BE(4);
  let debut = null;
  for (let i = 0; i < tables; i++) {
    const entree = 12 + i * 16;
    if (entree + 16 > tampon.length) return [];
    if (tampon.toString('latin1', entree, entree + 4) === 'name') debut = tampon.readUInt32BE(entree + 8);
  }
  if (debut === null || debut + 6 > tampon.length) return [];
  const nombre = tampon.readUInt16BE(debut + 2);
  const base = debut + tampon.readUInt16BE(debut + 4);
  const noms = [];
  for (let i = 0; i < nombre; i++) {
    const r = debut + 6 + i * 12;
    if (r + 12 > tampon.length) break;
    const plateforme = tampon.readUInt16BE(r);
    const langue = tampon.readUInt16BE(r + 4);
    const longueur = tampon.readUInt16BE(r + 8);
    const decalage = tampon.readUInt16BE(r + 10);
    if (base + decalage + longueur > tampon.length) continue;
    const brut = Buffer.from(tampon.subarray(base + decalage, base + decalage + longueur));
    const unicode = plateforme === 3 || plateforme === 0;
    if (unicode && brut.length % 2 !== 0) continue;
    noms.push({
      identifiant: tampon.readUInt16BE(r + 6),
      anglais: unicode ? langue === 0x409 : plateforme === 1 && langue === 0,
      texte: unicode ? brut.swap16().toString('utf16le') : brut.toString('latin1'),
    });
  }
  return noms;
}

function nomDansLaPolice(noms, identifiants) {
  for (const identifiant of identifiants) {
    const trouve = noms.find((n) => n.identifiant === identifiant && n.anglais) ?? noms.find((n) => n.identifiant === identifiant);
    if (trouve && espaces(trouve.texte) !== '') return espaces(trouve.texte);
  }
  return null;
}

/** La licence d'une police, lue dans son fichier `LICENSE_FONT`. */
function licenceDeLaPolice(police, etiquette) {
  const corps = corpsNormalise(toutesLesLignes(fs.readFileSync(path.join(police.dossier, police.licenceFichier), 'utf8')));
  const id = LICENCES_DE_POLICE.find((candidate) => LICENCES_CONNUES[candidate].requis.every((phrase) => corps.includes(phrase)));
  if (!id) throw new Error(`${etiquette} : ${police.licenceFichier} n’est pas une licence de police que le script reconnaît (LICENCES_DE_POLICE).`);
  return id;
}

// ─── Les cartes de sources ────────────────────────────────────────────────────────────────────

const FICHIER_DE_POLICE = /\.(ttf|otf|woff2?)$/i;

/** Le paquet qu'un chemin de source désigne : le dernier `node_modules/` du chemin, un nom de portée compris. */
function paquetDeLaSource(source) {
  const chemin = source.replaceAll('\\', '/');
  const marque = '/node_modules/';
  const i = chemin.lastIndexOf(marque);
  if (i === -1) return null;
  const reste = chemin.slice(i + marque.length).split('/');
  const portee = reste[0].startsWith('@');
  const nom = portee ? `${reste[0]}/${reste[1]}` : reste[0];
  return { nom, dossier: chemin.slice(0, i + marque.length) + nom, fichier: reste.slice(portee ? 2 : 1).join('/') };
}

/** Le dossier réel d'un paquet : le chemin de la carte, relu depuis la racine du projet. */
function dossierDuPaquet(racine, designation) {
  const candidats = [path.join(racine, designation.dossier), path.join(racine, 'node_modules', designation.nom)];
  for (const candidat of candidats) {
    if (fs.existsSync(path.join(candidat, 'package.json'))) return fs.realpathSync(candidat);
  }
  throw new Error(`« ${designation.nom} » (${designation.dossier}) est nommé par une carte de sources, mais son dossier est introuvable depuis ${racine}.`);
}

function cartesDeSources(exportDir) {
  const cartes = [];
  for (const plateforme of ['web', 'android']) {
    const dossier = path.join(exportDir, '_expo', 'static', 'js', plateforme);
    const fichiers = fs.existsSync(dossier) ? fs.readdirSync(dossier).filter((nom) => nom.endsWith('.map')) : [];
    if (fichiers.length === 0) {
      throw new Error(`Aucune carte de sources pour « ${plateforme} » dans ${dossier} : l’export doit être fait avec --source-maps, pour les deux plateformes.`);
    }
    for (const nom of fichiers) {
      const carte = JSON.parse(fs.readFileSync(path.join(dossier, nom), 'utf8'));
      if (!Array.isArray(carte.sources)) throw new Error(`${path.join(dossier, nom)} n’est pas une carte de sources (pas de « sources »).`);
      cartes.push({ plateforme, sources: carte.sources });
    }
  }
  return cartes;
}

// ─── L'export et l'autolinking ────────────────────────────────────────────────────────────────

function lancer(commande, args, options) {
  const r = spawnSync(commande, args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...options });
  if (r.error) throw new Error(`${commande} ${args.join(' ')} n’a pas pu démarrer : ${r.error.message}`);
  return r;
}

/** Un export web + android avec cartes de sources, dans un dossier à soi, avec son propre cache de Metro. */
function exporter(racine) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'ramille-licences-'));
  const nettoyer = () => fs.rmSync(dossier, { recursive: true, force: true });
  const sortie = path.join(dossier, 'export');
  fs.mkdirSync(path.join(dossier, 'metro'));
  console.log(`Export web + android, avec cartes de sources (${sortie}) — deux minutes environ.`);
  const r = lancer('npx', ['expo', 'export', '--platform', 'web', '--platform', 'android', '--source-maps', '--clear', '--output-dir', sortie], {
    cwd: racine,
    env: {
      ...process.env,
      TMPDIR: path.join(dossier, 'metro'),
      EXPO_NO_DOTENV: '1',
      CI: '1',
      EXPO_NO_TELEMETRY: '1',
      EXPO_PUBLIC_SUPABASE_URL: 'https://exemple.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'cle-factice-pour-le-build',
    },
  });
  if (r.status !== 0) {
    nettoyer();
    throw new Error(`L’export a échoué (code ${r.status}).\n${(r.stdout + r.stderr).split('\n').slice(-30).join('\n')}`);
  }
  return { sortie, nettoyer };
}

function jsonDeLaCommande(racine, args) {
  const r = lancer('npx', args, { cwd: racine });
  if (r.status !== 0) throw new Error(`npx ${args.join(' ')} a échoué (code ${r.status}).\n${r.stderr.split('\n').slice(-15).join('\n')}`);
  try {
    return JSON.parse(r.stdout);
  } catch {
    throw new Error(`npx ${args.join(' ')} n’a pas rendu du JSON :\n${r.stdout.slice(0, 300)}`);
  }
}

/** Les dossiers des paquets que l'autolinking compile dans l'APK. */
function dossiersNatifs(racine) {
  const dossiers = [];
  const expo = jsonDeLaCommande(racine, ['expo-modules-autolinking', 'resolve', '--platform', 'android', '--json']);
  for (const module of expo.modules ?? []) {
    for (const projet of module.projects ?? []) {
      // Le projet Android est `<paquet>/android` : on remonte au premier `package.json` qui porte le nom du module.
      let dossier = path.dirname(projet.sourceDir);
      while (dossier !== path.dirname(dossier)) {
        const pj = path.join(dossier, 'package.json');
        if (fs.existsSync(pj) && JSON.parse(fs.readFileSync(pj, 'utf8')).name === module.packageName) break;
        dossier = path.dirname(dossier);
      }
      if (!fs.existsSync(path.join(dossier, 'package.json'))) throw new Error(`Le module natif « ${module.packageName} » n’a pas de package.json au-dessus de ${projet.sourceDir}.`);
      dossiers.push(fs.realpathSync(dossier));
    }
  }
  const rn = jsonDeLaCommande(racine, ['expo-modules-autolinking', 'react-native-config', '--platform', 'android', '--json']);
  for (const dependance of Object.values(rn.dependencies ?? {})) dossiers.push(fs.realpathSync(dependance.root));
  return [...new Set(dossiers)];
}

// ─── L'assemblage ─────────────────────────────────────────────────────────────────────────────

const comparer = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Les paquets embarqués, avec où et par quels fichiers : « nom@version » → { …paquet, sur:Set, fichiers:Set }.
 * Un fichier qui vit dans la copie d'un autre paquet (voir `copieDansLePaquet`) est compté pour cette copie ;
 * son hôte reste listé, puisque c'est lui qui l'a mise dans le bundle. Les polices sont tirées à part.
 */
function releverLesPaquets({ racine, cartes, natifs }) {
  const paquets = new Map();
  const polices = new Map();
  const enregistrer = (paquet, plateforme, fichier = null) => {
    const cle = `${paquet.nom}@${paquet.version}`;
    const connu = paquets.get(cle) ?? { ...paquet, sur: new Set(), fichiers: new Set() };
    connu.sur.add(plateforme);
    if (fichier !== null) connu.fichiers.add(fichier);
    paquets.set(cle, connu);
  };

  for (const { plateforme, sources } of cartes) {
    for (const source of sources) {
      const designation = paquetDeLaSource(source);
      if (!designation) continue;
      const hote = lirePaquet(dossierDuPaquet(racine, designation));
      const copie = copieDansLePaquet(hote, designation.fichier);
      const paquet = copie?.paquet ?? hote;
      const fichier = copie?.fichier ?? designation.fichier;
      if (copie) enregistrer(hote, plateforme);
      enregistrer(paquet, plateforme, path.join(paquet.dossier, fichier));
      if (!FICHIER_DE_POLICE.test(fichier)) continue;

      const etiquette = `${paquet.nom}@${paquet.version}`;
      const licenceFichier = fichierDePolice(paquet.dossier);
      if (!licenceFichier) throw new Error(`${etiquette} : la police « ${fichier} » est embarquée, mais le paquet n’a pas de fichier LICENSE_FONT.`);
      let famille = path.basename(fichier).replace(/\.[^.]+$/, '');
      let copyright = null;
      if (/\.(ttf|otf)$/i.test(fichier)) {
        const noms = nomsDeLaPolice(fs.readFileSync(path.join(paquet.dossier, fichier)));
        famille = nomDansLaPolice(noms, [16, 1]) ?? famille;
        copyright = nomDansLaPolice(noms, [0]);
      }
      const cle = `${etiquette}\0${famille}`;
      const connue = polices.get(cle) ?? { nom: famille, copyright, paquet: paquet.nom, version: paquet.version, dossier: paquet.dossier, licenceFichier, sur: new Set() };
      connue.sur.add(plateforme);
      polices.set(cle, connue);
    }
  }
  for (const dossier of natifs) enregistrer(lirePaquet(dossier), 'android');
  return { paquets, polices };
}

function analyserLesPaquets(paquets, polices) {
  const analyses = [];
  for (const p of [...paquets.values()].sort((a, b) => comparer(a.nom, b.nom) || comparer(a.version, b.version))) {
    const etiquette = `${p.nom}@${p.version}`;
    const declaree = licenceDeclaree(p.pj);
    if (declaree === null) throw new Error(`${etiquette} : le package.json ne déclare aucune licence.`);
    if (fichiersDe(p.dossier).some((nom) => /^notice(\.|$)/i.test(nom))) {
      throw new Error(`${etiquette} : un fichier NOTICE accompagne le paquet, et la licence demande de le reproduire — l’écran ne sait pas le montrer (voir l’en-tête du script).`);
    }
    // Une police ajoute sa propre licence à celle du paquet : « MIT AND OFL-1.1 » est le paquet en MIT, la police en OFL.
    let id = declaree;
    const siennes = [...polices.values()].filter((f) => f.dossier === p.dossier);
    if (siennes.length > 0) {
      const restantes = declaree.split(/\s+AND\s+/);
      for (const policeId of new Set(siennes.map((f) => licenceDeLaPolice(f, etiquette)))) {
        const i = restantes.indexOf(policeId);
        if (i === -1) throw new Error(`${etiquette} : la police est sous ${policeId}, que la licence déclarée « ${declaree} » ne nomme pas.`);
        restantes.splice(i, 1);
      }
      if (restantes.length !== 1) throw new Error(`${etiquette} : une fois la police retirée, la licence déclarée « ${declaree} » n’est plus une licence simple.`);
      id = restantes[0];
    }
    if (/\s(?:AND|OR|WITH)\s/.test(id)) throw new Error(`${etiquette} : la licence « ${id} » est une expression que le script ne tranche pas.`);

    const fichier = fichierDeLicence(p.dossier, etiquette);
    const texte = fichier ? fs.readFileSync(path.join(p.dossier, fichier), 'utf8') : null;
    const lignes = texte === null ? null : lignesDuTexte(id, texte);
    const avisDeLicence = texte === null ? [] : avisDuTexte(texte);
    // Les avis des fichiers sont relevés pour tous les paquets : l'avis principal, à défaut de licence qui en porte
    // un, et les avis des fichiers repris d'autres projets, que le paquet ait une licence ou non.
    const dansLesFichiers = avisDesFichiers(p);
    const principal = avisDeLicence.length > 0 ? avisDeLicence : avisHorsLicence(dansLesFichiers, p.pj);
    analyses.push({
      paquet: p,
      id,
      avis: principal,
      repris: avisRepris(dansLesFichiers, principal),
      lignes: lignes === null ? null : lignes.affichees,
      corps: lignes === null ? null : reconnaitre(id, lignes.comparees, `${etiquette} (${fichier})`),
    });
  }
  return analyses;
}

/** Les textes de licence : un par (licence, corps normalisé), le plus fréquent en premier de sa licence. */
function rangerLesTextes(analyses, polices) {
  const groupes = new Map(); // id → Map(corps → { lignes, membres })
  const ajouter = (id, corps, lignes) => {
    const parId = groupes.get(id) ?? new Map();
    const groupe = parId.get(corps) ?? { lignes, membres: 0 };
    // Le texte affiché est celui d'un membre qui porte l'emplacement de l'avis de l'Apache, s'il y en a un : l'ordre
    // des paquets ne décide pas de ce qu'on lit (l'emplacement ne compte pas dans la comparaison).
    if (!porteLEmplacement(groupe.lignes) && porteLEmplacement(lignes)) groupe.lignes = lignes;
    groupe.membres += 1;
    parId.set(corps, groupe);
    groupes.set(id, parId);
  };
  for (const a of analyses) if (a.corps !== null) ajouter(a.id, a.corps, a.lignes);
  const policesLues = [...polices.values()].map((police) => {
    const id = licenceDeLaPolice(police, `${police.paquet}@${police.version}`);
    const lignes = lignesDuTexte(id, fs.readFileSync(path.join(police.dossier, police.licenceFichier), 'utf8'));
    const corps = reconnaitre(id, lignes.comparees, `${police.paquet}@${police.version} (${police.licenceFichier})`);
    ajouter(id, corps, lignes.affichees);
    return { police, id, corps };
  });

  const textes = [];
  const identifiants = new Map(); // `${id}\0${corps}` → identifiant du texte
  for (const [id, parCorps] of groupes) {
    const rangs = [...parCorps.entries()].sort((a, b) => b[1].membres - a[1].membres || comparer(a[0], b[0]));
    rangs.forEach(([corps, groupe], rang) => {
      const identifiant = rang === 0 ? id : `${id}-${rang + 1}`;
      identifiants.set(`${id}\0${corps}`, identifiant);
      textes.push({
        id: identifiant,
        nom: rang === 0 ? LICENCES_CONNUES[id].nom : `${LICENCES_CONNUES[id].nom} (autre rédaction)`,
        paragraphes: paragraphes(groupe.lignes),
        licence: id,
      });
    });
  }
  return { textes, identifiants, policesLues };
}

function assembler({ racine, cartes, natifs, date }) {
  const { paquets, polices } = releverLesPaquets({ racine, cartes, natifs });
  const analyses = analyserLesPaquets(paquets, polices);
  const { textes, identifiants, policesLues } = rangerLesTextes(analyses, polices);
  verifierLesLicencesDesAvisRepris(analyses, textes);

  // Un paquet sans fichier de licence prend le texte principal de la licence qu'il déclare.
  const textePrincipal = (id, etiquette) => {
    const texte = textes.find((t) => t.licence === id);
    if (!texte) throw new Error(`${etiquette} : la licence ${id} est déclarée, mais ni lui ni aucun autre paquet n’en apporte le texte.`);
    return texte.id;
  };
  const sur = (ensemble) => (ensemble.has('web') && ensemble.has('android') ? 'les deux' : ensemble.has('web') ? 'web' : 'android');

  const paquetsSortis = analyses.map((a) => ({
    nom: a.paquet.nom,
    version: a.paquet.version,
    licence: a.id,
    texte: a.corps === null ? textePrincipal(a.id, `${a.paquet.nom}@${a.paquet.version}`) : identifiants.get(`${a.id}\0${a.corps}`),
    copyright: a.avis.length > 0 ? a.avis.join(' ') : null,
    ...(a.repris.length > 0 ? { avisRepris: a.repris.map((r) => r.avis) } : {}),
    sur: sur(a.paquet.sur),
    ...(a.paquet.dans ? { dans: a.paquet.dans } : {}),
  }));
  const policesSorties = policesLues
    .map(({ police, id, corps }) => ({
      nom: police.nom,
      copyright: police.copyright,
      licence: id,
      texte: identifiants.get(`${id}\0${corps}`),
      paquet: police.paquet,
      sur: sur(police.sur),
    }))
    .sort((a, b) => comparer(a.nom, b.nom));

  // Les sections de l'écran suivent l'ordre des textes : les plus employés d'abord.
  const emploi = (texte) => paquetsSortis.filter((p) => p.texte === texte.id).length + policesSorties.filter((f) => f.texte === texte.id).length;
  const textesOrdonnes = [...textes].sort((a, b) => emploi(b) - emploi(a) || comparer(a.id, b.id));

  const dependances = Object.keys(JSON.parse(fs.readFileSync(path.join(racine, 'package.json'), 'utf8')).dependencies ?? {});
  const embarques = new Set(paquetsSortis.map((p) => p.nom));
  return {
    genereLe: date,
    paquets: paquetsSortis,
    polices: policesSorties,
    textes: textesOrdonnes.map(({ id, nom, paragraphes: p }) => ({ id, nom, paragraphes: p })),
    ecartes: dependances.filter((nom) => !embarques.has(nom)).sort(comparer),
  };
}

// ─── Le fichier ───────────────────────────────────────────────────────────────────────────────

const ENTETE = `// FICHIER GÉNÉRÉ — ne pas modifier à la main.
//
//   node scripts/generer-les-licences.mjs
//
// Ce que Ramille embarque d'autres auteurs : les bibliothèques et les polices qui sont dans le bundle
// web, dans le bundle Android ou dans le code natif de l'APK, avec leur licence, leur avis de copyright
// quand on en a trouvé un (dans leur licence, sinon dans leurs sources, sinon l'auteur que déclare le
// paquet) et ceux des fichiers qu'ils ont repris d'autres projets (\`avisRepris\`), et le texte de chaque
// licence **une seule fois**. L'écran \`/licences\`
// (\`src/app/licences.tsx\`) le montre ; la méthode, et ce qu'elle ne couvre pas, sont en tête du script.
//
// \`scripts/licences.test.ts\` fait rougir la CI quand une dépendance de \`package.json\`, un import de
// \`src/\` ou une version de \`package-lock.json\` n'y est plus. \`--verifier\` relit le bundle lui-même.
//
// Les textes de licences sont ceux des auteurs, à la lettre : leurs apostrophes droites ne sont pas la
// typographie du produit, d'où la règle désactivée pour ce fichier seul.
/* eslint-disable no-restricted-syntax */
import type { DonneesDesLicences } from '@/types/licences';

`;

function rendre(donnees) {
  const tableau = (cle, elements, virguleFinale = true) => [
    ` ${JSON.stringify(cle)}: [`,
    ...elements.map((e, i) => `  ${e}${i < elements.length - 1 ? ',' : ''}`),
    ` ]${virguleFinale ? ',' : ''}`,
  ];
  const texte = (t) =>
    `{ "id": ${JSON.stringify(t.id)}, "nom": ${JSON.stringify(t.nom)}, "paragraphes": [\n${t.paragraphes.map((p) => `    ${JSON.stringify(p)}`).join(',\n')}\n  ] }`;
  const lignes = [
    '{',
    ` "genereLe": ${JSON.stringify(donnees.genereLe)},`,
    ...tableau('paquets', donnees.paquets.map((p) => JSON.stringify(p))),
    ...tableau('polices', donnees.polices.map((p) => JSON.stringify(p))),
    ...tableau('textes', donnees.textes.map(texte)),
    ` "ecartes": ${JSON.stringify(donnees.ecartes)}`,
    '}',
  ];
  return `${ENTETE}${MARQUEUR}${lignes.join('\n')};\n`;
}

function lire(texte) {
  const debut = texte.indexOf(MARQUEUR);
  const fin = texte.lastIndexOf('};');
  if (debut === -1 || fin === -1) throw new Error('Le fichier n’a pas la forme que ce script écrit (MARQUEUR introuvable).');
  return JSON.parse(texte.slice(debut + MARQUEUR.length, fin + 1));
}

function ecarts(attendu, present) {
  const lignes = [];
  const parNom = (liste) => new Map(liste.map((p) => [`${p.nom}@${p.version}`, p]));
  const a = parNom(attendu.paquets);
  const b = parNom(present.paquets);
  for (const cle of a.keys()) if (!b.has(cle)) lignes.push(`  manque dans le fichier : ${cle}`);
  for (const cle of b.keys()) if (!a.has(cle)) lignes.push(`  en trop dans le fichier : ${cle}`);
  for (const [cle, p] of a) if (b.has(cle) && JSON.stringify(p) !== JSON.stringify(b.get(cle))) lignes.push(`  différent : ${cle}`);
  for (const cle of ['polices', 'textes', 'ecartes']) if (JSON.stringify(attendu[cle]) !== JSON.stringify(present[cle])) lignes.push(`  « ${cle} » diffère`);
  return lignes;
}

// ─── Le programme ─────────────────────────────────────────────────────────────────────────────

function aujourdhui() {
  const d = new Date();
  const deux = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
}

function lireLesArguments(argv) {
  const options = { verifier: false, sansNatif: false, depuis: null, racine: RACINE_DU_DEPOT, sortie: null, date: aujourdhui() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const valeur = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${a} demande une valeur.`);
      return v;
    };
    if (a === '--verifier') options.verifier = true;
    else if (a === '--sans-natif') options.sansNatif = true;
    else if (a === '--depuis') options.depuis = path.resolve(valeur());
    else if (a === '--racine') options.racine = path.resolve(valeur());
    else if (a === '--sortie') options.sortie = path.resolve(valeur());
    else if (a === '--date') options.date = valeur();
    else throw new Error(`Option inconnue : ${a}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) throw new Error('--date s’écrit AAAA-MM-JJ.');
  if (options.sansNatif && !options.sortie && !options.verifier) throw new Error('--sans-natif exige --sortie : un fichier engagé ne s’écrit jamais sans l’autolinking.');
  options.sortie ??= path.join(options.racine, SORTIE_PAR_DEFAUT);
  return options;
}

function principal() {
  let exporte = null;
  try {
    const options = lireLesArguments(process.argv.slice(2));
    const { racine } = options;
    const dossierExport = options.depuis ?? (exporte = exporter(racine)).sortie;
    const cartes = cartesDeSources(dossierExport);
    const natifs = options.sansNatif ? [] : dossiersNatifs(racine);
    const donnees = assembler({ racine, cartes, natifs, date: options.date });

    const emploi = new Map();
    for (const p of [...donnees.paquets, ...donnees.polices]) emploi.set(p.texte, (emploi.get(p.texte) ?? 0) + 1);
    console.log(`${donnees.paquets.length} paquets, ${donnees.polices.length} police(s), ${donnees.textes.length} texte(s) de licence.`);
    for (const t of donnees.textes) console.log(`  ${t.id} : ${emploi.get(t.id) ?? 0} — ${t.nom}`);
    const compte = (sur) => donnees.paquets.filter((p) => p.sur === sur).length;
    console.log(`  web seul : ${compte('web')} ; Android seul : ${compte('android')} ; les deux : ${compte('les deux')}`);
    const copies = donnees.paquets.filter((p) => p.dans);
    console.log(`  copies logées dans un autre paquet : ${copies.map((p) => `${p.nom} (dans ${p.dans})`).join(', ') || 'aucune'}`);
    const auteursSeuls = donnees.paquets.filter((p) => p.copyright?.startsWith(AUTEUR_DU_PAQUET));
    console.log(`  auteur du package.json, faute d’avis : ${auteursSeuls.map((p) => p.nom).join(', ') || 'aucun'}`);
    const repris = donnees.paquets.filter((p) => p.avisRepris);
    console.log(`  avis de fichiers repris d’autres projets : ${repris.map((p) => `${p.nom} (${p.avisRepris.length})`).join(', ') || 'aucun'}`);
    console.log(`  sans ligne de copyright : ${donnees.paquets.filter((p) => p.copyright === null).map((p) => p.nom).join(', ') || 'aucun'}`);
    console.log(`  dépendances directes écartées : ${donnees.ecartes.join(', ') || 'aucune'}`);
    for (const police of donnees.polices.filter((f) => f.copyright === null)) console.log(`  ! la police ${police.nom} ne donne pas d’avis de copyright`);

    if (options.verifier) {
      if (!fs.existsSync(options.sortie)) throw new Error(`${options.sortie} n’existe pas : rien à vérifier.`);
      const lignes = ecarts(donnees, lire(fs.readFileSync(options.sortie, 'utf8')));
      if (lignes.length > 0) {
        console.error(`\nLe fichier engagé ne dit plus ce que le bundle contient :\n${lignes.join('\n')}\n\nRelancer sans --verifier, et relire le diff.`);
        process.exitCode = 1;
      } else {
        console.log('\nLe fichier engagé dit exactement ce que le bundle contient (la date exceptée).');
      }
      return;
    }
    fs.mkdirSync(path.dirname(options.sortie), { recursive: true });
    fs.writeFileSync(options.sortie, rendre(donnees));
    console.log(`\nÉcrit : ${options.sortie}`);
  } catch (erreur) {
    console.error(`\n${erreur instanceof Error ? erreur.message : erreur}`);
    process.exitCode = 1;
  } finally {
    exporte?.nettoyer();
  }
}

principal();
