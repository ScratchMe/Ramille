/// <reference types="node" />
/**
 * La liste des licences (`src/constants/licences.ts`, générée par `scripts/generer-les-licences.mjs`) suit-elle
 * encore ce que Ramille embarque ?
 *
 * Deux choses sont gardées ici, et elles ne se confondent pas :
 *
 * **1. Le fichier généré contre le dépôt** — ce qui rougit la CI quand une dépendance entre dans l'application
 * sans y figurer. La liste dit ce que les bundles contiennent, et c'est un export qui le sait ; cette suite ne
 * peut pas en lancer un (deux minutes, et Metro). Elle garde donc ce qui se lit sans lui :
 *   - **chaque dépendance de `package.json`** est dans le fichier, embarquée ou écartée après examen — une
 *     dépendance neuve sans régénération rougit ;
 *   - **chaque bibliothèque que `src/` importe** (hors tests) est embarquée, jamais écartée, jamais absente —
 *     le relevé lit les imports avec le lecteur de TypeScript, qui ne se laisse pas tromper par un commentaire ;
 *   - **chaque paquet listé** existe dans `package-lock.json`, à la même version et sous la même licence — une
 *     montée de version sans régénération rougit, et c'est le seul chemin par lequel un paquet imbriqué (une
 *     dépendance d'une dépendance) change sans qu'on y touche ;
 *   - la cohérence du fichier : chaque texte est employé, chaque paquet renvoie à un texte qui existe, aucun
 *     doublon ;
 *   - **chaque texte affiché garde toutes les lignes du fichier de licence de ses paquets et de ses polices**,
 *     les avis, les titres et le préambule de l'OFL exceptés — relues dans `node_modules/`, que
 *     `package-lock.json` situe. C'est la garde qui aurait vu l'Apache perdre sa clause 4(c) ; et elle n'emprunte
 *     pas les motifs du script, qui y passerait avec ses propres erreurs ;
 *   - l'Apache reproduit ses repères « (a) » à « (d) », et une copie rangée dans un autre paquet
 *     (`react-helmet-async`, dans `expo-router`) est listée à part avec sa licence, son avis et son hôte.
 * **Ce qu'elle ne voit pas**, et que seul `node scripts/generer-les-licences.mjs --verifier` voit, en relisant les
 * cartes de sources du bundle : une dépendance **transitive** qui entre dans le bundle sans que rien dans
 * `package.json` ni dans `src/` ne l'ait demandé (une montée d'`expo-router` qui tire un paquet de plus) — le
 * verrou ne la signale que si elle n'y était pas déjà. `--verifier` n'est pas dans la CI : il exporte deux
 * plateformes (deux minutes), et la CI d'avant-vente n'a pas d'autre raison de le faire. À brancher, si la
 * personne qui pilote le veut, dans `.github/workflows/ci.yml` et `scripts/rejouer-la-ci.mjs`.
 *
 * **2. Le script contre un arbre fabriqué** — le générateur est joué sur de petits projets, en entier, par
 * `--depuis` : les cartes de sources, les paquets imbriqués, les copies logées dans un paquet, les avis de
 * copyright (de la licence, des sources, de l'auteur), les textes rangés une fois par type, la police et son avis
 * lus dans le fichier de police, et tout ce qu'il refuse de deviner.
 *
 * Éprouvé en cassant ce qu'il garde, le 22/10/2026, en deux passages — voir « Mutations » en bas du fichier.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { builtinModules } from 'node:module';
import os from 'node:os';
import path from 'node:path';

import * as ts from 'typescript';

import { LICENCES } from '../src/constants/licences';

const racine = path.resolve(__dirname, '..');
const script = path.join(racine, 'scripts', 'generer-les-licences.mjs');
const lire = (relatif: string) => fs.readFileSync(path.join(racine, relatif), 'utf8');

function exiger(problemes: string[], consigne: string): void {
  if (problemes.length > 0) throw new Error(`${problemes.join('\n')}\n\n${consigne}`);
}
const REGENERER = 'Relancer `node scripts/generer-les-licences.mjs`, et relire le diff de src/constants/licences.ts.';

// ─── 1. Le fichier généré contre le dépôt ─────────────────────────────────────────────────────

/** Le paquet qu'un spécificateur d'import désigne, ou `null` pour un chemin relatif, l'alias `@/` ou un module de Node. */
function paquetDuSpecifieur(specifieur: string): string | null {
  if (specifieur.startsWith('.') || specifieur.startsWith('/') || specifieur.startsWith('@/') || specifieur.startsWith('node:')) return null;
  const morceaux = specifieur.split('/');
  if (builtinModules.includes(morceaux[0])) return null;
  return specifieur.startsWith('@') ? `${morceaux[0]}/${morceaux[1]}` : morceaux[0];
}

/** Les paquets qu'un texte source importe : `import`, `export … from`, `import()` et `require()`, commentaires ignorés. */
function paquetsImportes(source: string): string[] {
  const { importedFiles } = ts.preProcessFile(source, true, true);
  return [...new Set(importedFiles.map((f) => paquetDuSpecifieur(f.fileName)).filter((p): p is string => p !== null))];
}

/** Chaque paquet que le code de l'application importe, avec les fichiers qui l'importent. Ni les tests, ni `src/tests/`. */
function importsDeSrc(): Map<string, string[]> {
  const parPaquet = new Map<string, string[]>();
  const visiter = (dossier: string) => {
    for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
      const chemin = path.join(dossier, entree.name);
      const relatif = path.relative(racine, chemin).split(path.sep).join('/');
      if (entree.isDirectory()) {
        if (relatif !== 'src/tests') visiter(chemin);
      } else if (/\.tsx?$/.test(entree.name) && !/\.test\.tsx?$/.test(entree.name) && !entree.name.endsWith('.d.ts')) {
        for (const paquet of paquetsImportes(fs.readFileSync(chemin, 'utf8'))) {
          parPaquet.set(paquet, [...(parPaquet.get(paquet) ?? []), relatif]);
        }
      }
    }
  };
  visiter(path.join(racine, 'src'));
  return parPaquet;
}

describe('le relevé des imports', () => {
  it('lit tous les genres d’import, et pas les commentaires', () => {
    const source = [
      "import a from 'alpha';",
      "import { b,",
      "  c } from '@scope/beta/sous-chemin';",
      "export * from 'gamma';",
      "import 'delta/effet';",
      "const e = require('epsilon');",
      "const z = await import('zeta');",
      "// import q from 'commentaire';",
      "/* import r from 'bloc'; */",
      "import x from './relatif';",
      "import y from '@/alias';",
      "import fs from 'node:fs';",
      "import path from 'path';",
    ].join('\n');

    expect(paquetsImportes(source).sort()).toEqual(['@scope/beta', 'alpha', 'delta', 'epsilon', 'gamma', 'zeta']);
  });

  it('ne se laisse pas lire à vide : le code de l’application importe bien ses bibliothèques', () => {
    // Une garde dont le succès est une absence doit prouver qu'elle a regardé (`TESTING.md` §1.1).
    const importes = importsDeSrc();

    expect(importes.size).toBeGreaterThan(15);
    for (const attendu of ['react', 'react-native', 'expo-router', '@supabase/supabase-js', '@expo-google-fonts/spline-sans']) {
      expect(importes.has(attendu)).toBe(true);
    }
  });
});

describe('le fichier généré des licences', () => {
  const dependances = Object.keys(JSON.parse(lire('package.json')).dependencies as Record<string, string>);
  const embarques = new Set(LICENCES.paquets.map((paquet) => paquet.nom));
  const ecartes = new Set(LICENCES.ecartes);

  it('connaît chaque dépendance de package.json : embarquée, ou écartée après examen', () => {
    const inconnues = dependances.filter((nom) => !embarques.has(nom) && !ecartes.has(nom));

    exiger(
      inconnues.map((nom) => `« ${nom} » est dans les dépendances de package.json, et le fichier des licences ne la connaît pas.`),
      `Une dépendance qui entre dans l’application doit y figurer avec sa licence. ${REGENERER}`
    );
  });

  it('n’écarte que des dépendances qui existent encore, et aucune qu’il embarque', () => {
    const disparues = LICENCES.ecartes.filter((nom) => !dependances.includes(nom));
    const doubles = LICENCES.ecartes.filter((nom) => embarques.has(nom));

    exiger(
      [
        ...disparues.map((nom) => `« ${nom} » est écartée, mais n’est plus une dépendance de package.json.`),
        ...doubles.map((nom) => `« ${nom} » est à la fois écartée et embarquée.`),
      ],
      REGENERER
    );
  });

  it('liste chaque bibliothèque que le code de l’application importe', () => {
    const problemes: string[] = [];
    for (const [paquet, fichiers] of importsDeSrc()) {
      if (embarques.has(paquet)) continue;
      const exemple = fichiers.slice(0, 2).join(', ');
      problemes.push(
        ecartes.has(paquet)
          ? `« ${paquet} » est écartée du fichier des licences, et ${exemple} l’importe.`
          : `« ${paquet} » est importée par ${exemple}, et le fichier des licences ne la connaît pas.`
      );
    }

    exiger(problemes, `Ce que l’application importe entre dans son bundle. ${REGENERER}`);
  });

  it('ne cite que des paquets que package-lock.json connaît, à la même version et sous la même licence', () => {
    const verrou = JSON.parse(lire('package-lock.json')) as { packages: Record<string, { version?: string; license?: string }> };
    const connus = new Map<string, Set<string | undefined>>();
    for (const [chemin, entree] of Object.entries(verrou.packages)) {
      const i = chemin.lastIndexOf('node_modules/');
      if (i === -1) continue;
      const cle = `${chemin.slice(i + 'node_modules/'.length)}@${entree.version}`;
      connus.set(cle, new Set([...(connus.get(cle) ?? []), entree.license]));
    }

    const problemes: string[] = [];
    // Une copie (`dans`) n'est pas installée à part : le verrou ne la connaît pas, il connaît son hôte, listé lui aussi.
    const installes = LICENCES.paquets.filter((paquet) => paquet.dans === undefined);
    for (const { nom, version, licence } of [...installes, ...LICENCES.polices.map((p) => ({ nom: p.paquet, version: '', licence: p.licence }))]) {
      if (version === '') continue;
      const licences = connus.get(`${nom}@${version}`);
      if (!licences) {
        problemes.push(`« ${nom} ${version} » n’est pas dans package-lock.json (une autre version l’a remplacée ?).`);
      } else if (![...licences].some((l) => l === undefined || l.split(/\s+(?:AND|OR)\s+/).includes(licence))) {
        problemes.push(`« ${nom} ${version} » est listée sous ${licence}, et package-lock.json dit ${[...licences].join(' / ')}.`);
      }
    }

    exiger(problemes, `Une montée de version change ce qu’on distribue. ${REGENERER}`);
  });

  it('est cohérent : chaque texte est employé, chaque renvoi existe, aucun doublon', () => {
    const textes = new Set(LICENCES.textes.map((texte) => texte.id));
    const problemes: string[] = [];

    if (textes.size !== LICENCES.textes.length) problemes.push('Deux textes portent le même identifiant.');
    const cles = LICENCES.paquets.map((p) => `${p.nom}@${p.version}`);
    if (new Set(cles).size !== cles.length) problemes.push('Un paquet est listé deux fois, à la même version.');
    for (const p of LICENCES.paquets) if (!textes.has(p.texte)) problemes.push(`« ${p.nom} » renvoie au texte « ${p.texte} », qui n’existe pas.`);
    for (const p of LICENCES.polices) if (!textes.has(p.texte)) problemes.push(`La police « ${p.nom} » renvoie au texte « ${p.texte} », qui n’existe pas.`);
    const employes = new Set([...LICENCES.paquets.map((p) => p.texte), ...LICENCES.polices.map((p) => p.texte)]);
    for (const id of textes) if (!employes.has(id)) problemes.push(`Le texte « ${id} » n’est employé par rien.`);
    for (const texte of LICENCES.textes) if (texte.paragraphes.length === 0 || texte.paragraphes.some((p) => p.trim() === '')) problemes.push(`Le texte « ${texte.id} » est vide.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(LICENCES.genereLe)) problemes.push('« genereLe » n’est pas une date AAAA-MM-JJ.');
    for (const p of LICENCES.paquets) {
      const repris = p.avisRepris;
      if (repris === undefined) continue;
      if (repris.length === 0 || repris.some((avis) => avis.trim() === '')) problemes.push(`« ${p.nom} » porte une liste d’avis repris vide.`);
      if (new Set(repris).size !== repris.length) problemes.push(`« ${p.nom} » porte deux fois le même avis repris.`);
      if (p.copyright === null) problemes.push(`« ${p.nom} » porte des avis repris sans avis principal.`);
      if (repris.some((avis) => p.copyright?.includes(avis))) problemes.push(`« ${p.nom} » reprend un avis qu’il affiche déjà comme le sien.`);
    }

    exiger(problemes, REGENERER);
  });

  it('porte la police du produit avec son avis et la licence OFL', () => {
    const spline = LICENCES.polices.find((police) => police.nom === 'Spline Sans');

    expect(spline?.copyright).toMatch(/Spline Sans Project Authors/);
    expect(spline?.licence).toBe('OFL-1.1');
    expect(LICENCES.textes.find((texte) => texte.id === spline?.texte)?.paragraphes.join(' ')).toMatch(/SIL OPEN FONT LICENSE/);
  });

  it('reproduit l’Apache 2.0 avec les quatre repères de sa clause 4, « (c) » compris', () => {
    // Relevé le 22/10/2026 : « (c) You must retain… » avait disparu, prise pour un avis de copyright.
    const apacheAffiche = LICENCES.textes.find((texte) => texte.id === 'Apache-2.0');

    expect(apacheAffiche).toBeDefined();
    const reperes = ['(a) You must give', '(b) You must cause', '(c) You must retain, in the Source form of any Derivative Works', '(d) If the Work includes'];
    expect(reperes.filter((debut) => (apacheAffiche?.paragraphes ?? []).some((paragraphe) => paragraphe.startsWith(debut)))).toEqual(reperes);
    expect(apacheAffiche?.paragraphes.join('\n')).toContain('(c) You must retain, in the Source form of any Derivative Works');
  });

  it('garde, dans l’appendice de l’Apache, l’emplacement de l’avis sous sa forme canonique — après la phrase qui parle de ses champs, avant le modèle d’avis', () => {
    // Relevé le 22/10/2026 : l'emplacement était retiré du texte affiché, et « with the fields enclosed by brackets "[]"
    // replaced… » enchaînait sur le modèle sans aucun champ entre crochets. Il ne sort que de la comparaison.
    const paragraphes = LICENCES.textes.find((texte) => texte.id === 'Apache-2.0')?.paragraphes ?? [];
    const i = paragraphes.indexOf('Copyright [yyyy] [name of copyright owner]');

    expect(i).toBeGreaterThan(-1);
    expect(paragraphes.filter((p) => p.startsWith('Copyright '))).toEqual(['Copyright [yyyy] [name of copyright owner]']);
    expect(paragraphes[i - 1]).toMatch(/with the fields enclosed by brackets "\[\]" replaced/);
    expect(paragraphes[i + 1]).toMatch(/^Licensed under the Apache License, Version 2\.0/);
  });

  it('porte, sous le paquet qui les a repris, les avis d’autres auteurs que des fichiers embarqués contiennent', () => {
    // Relevé le 22/10/2026 : le script ne gardait qu'un avis par paquet. Ces fichiers sont des copies d'un seul fichier,
    // sans dossier ni package.json : la détection des copies ne les voit pas.
    const repris = (nom: string) => LICENCES.paquets.find((paquet) => paquet.nom === nom)?.avisRepris;

    expect(repris('@react-native/js-polyfills')).toEqual(['Copyright Joyent, Inc. and other Node contributors.']);
    expect(repris('@expo/metro-runtime')).toEqual(['Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.']);
    expect(repris('@react-native-async-storage/async-storage')).toEqual(['Copyright (c) Nicolas Gallagher.']);
    expect(repris('expo')).toEqual([
      'Copyright (c) Facebook, Inc. and its affiliates.',
      'Copyright © Meta Platforms, Inc. and affiliates.',
      'Copyright 2024 Mattias Buelens, Diwank Singh Tomer and other contributors.',
    ]);
    // Le titulaire du paquet n'est pas repris : « 650 Industries » est l'avis d'`expo`, écrit de plusieurs façons dans ses fichiers.
    expect(repris('expo')?.some((avis) => /650 Industries/.test(avis))).toBe(false);
  });

  it('liste react-helmet-async à part, avec l’avis du New York Times, dans expo-router — et expo-router sans lui', () => {
    // `expo-router/vendor/react-helmet-async` entre dans le bundle web par `expo-router/head`.
    const copie = LICENCES.paquets.find((paquet) => paquet.nom === 'react-helmet-async');
    const hote = LICENCES.paquets.find((paquet) => paquet.nom === 'expo-router');

    expect(copie).toMatchObject({ licence: 'Apache-2.0', texte: 'Apache-2.0', dans: 'expo-router', sur: 'web' });
    expect(copie?.copyright).toBe('Copyright 2018 The New York Times Company');
    expect(hote).toMatchObject({ licence: 'MIT' });
    expect(hote?.copyright ?? '').not.toMatch(/New York Times/);
    expect(hote?.dans).toBeUndefined();
  });

  it('ne cite en « dans » qu’un paquet qu’il liste lui-même', () => {
    const problemes = LICENCES.paquets.filter((paquet) => paquet.dans !== undefined && !embarques.has(paquet.dans)).map((paquet) => `« ${paquet.nom} » est dans « ${paquet.dans} », qui n’est pas listé.`);

    exiger(problemes, REGENERER);
  });

  it('garde chaque ligne du fichier de licence de ses paquets et de ses polices — les avis, les titres et le préambule de l’OFL exceptés', () => {
    // Ce que ni le typecheck ni la cohérence du fichier ne voient : un texte affiché amputé. On relit les fichiers de
    // licence installés (`package-lock.json` dit où chaque paquet vit) et on cherche, ligne à ligne, celles que
    // le texte affiché ne contient plus. Une ligne retirée doit ressembler à ce qu'on retire, sans que cette
    // garde reprenne les motifs du script : sinon une erreur du script y passerait aussi.
    const verrou = JSON.parse(lire('package-lock.json')) as { packages: Record<string, { version?: string }> };
    const NOM_DE_LICENCE = /^(licen[cs]e|copying|unlicense)(\.(md|txt|markdown))?$/i;
    const normaliser = (texte: string) => texte.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const affiches = new Map(LICENCES.textes.map((texte) => [texte.id, ` ${normaliser(texte.paragraphes.join(' '))} `]));
    const ressembleAUnRetrait = (ligne: string) => {
      const nue = ligne.trim().replace(/^[#*=_\s-]+|[#*=_\s-]+$/g, '');
      const titre = nue.length <= 40 && /licen[cs]e/i.test(nue) && !/[.:;,]$/.test(nue);
      return /^(copyright\b|\(c\)\s*\d|©|all rights reserved)/i.test(nue) || titre || /\[(yyyy|name of copyright owner)\]/i.test(nue);
    };
    const dossierDuVerrou = (nom: string, version: string) => {
      const cle = Object.keys(verrou.packages).find((chemin) => chemin.endsWith(`node_modules/${nom}`) && verrou.packages[chemin].version === version);
      return cle === undefined ? null : path.join(racine, cle);
    };
    /** La copie d'un paquet rangée sous son hôte : `<hôte>/…/<nom>/`, à trois niveaux au plus. */
    const dossierDeLaCopie = (hote: string, nom: string): string | null => {
      const chercher = (dossier: string, profondeur: number): string | null => {
        for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
          if (!entree.isDirectory() || entree.name === 'node_modules') continue;
          const chemin = path.join(dossier, entree.name);
          if (entree.name === nom && fs.readdirSync(chemin).some((f) => NOM_DE_LICENCE.test(f))) return chemin;
          const dedans = profondeur > 1 ? chercher(chemin, profondeur - 1) : null;
          if (dedans !== null) return dedans;
        }
        return null;
      };
      return chercher(path.join(racine, 'node_modules', hote), 3);
    };

    const compares: string[] = [];
    const absentes: string[] = [];
    const comparer = (etiquette: string, fichier: string, texteId: string) => {
      let lignes = fs.readFileSync(fichier, 'utf8').replace(/\r\n?/g, '\n').split('\n');
      if (texteId.startsWith('OFL')) lignes = lignes.slice(Math.max(0, lignes.findIndex((l) => /^\s*SIL OPEN FONT LICENSE\b/i.test(l))));
      compares.push(etiquette);
      lignes.forEach((ligne, i) => {
        const normalisee = normaliser(ligne);
        if (normalisee === '' || (affiches.get(texteId) ?? '').includes(` ${normalisee} `) || ressembleAUnRetrait(ligne)) return;
        absentes.push(`${etiquette} : ${path.basename(fichier)} ligne ${i + 1} (« ${ligne.trim().slice(0, 70)} ») n’est pas dans le texte « ${texteId} » affiché.`);
      });
    };

    for (const paquet of LICENCES.paquets) {
      const dossier = paquet.dans === undefined ? dossierDuVerrou(paquet.nom, paquet.version) : dossierDeLaCopie(paquet.dans, paquet.nom);
      if (dossier === null) throw new Error(`« ${paquet.nom} ${paquet.version} » est listé, et on ne retrouve pas son dossier installé. ${REGENERER}`);
      const fichier = fs.readdirSync(dossier).find((nom) => NOM_DE_LICENCE.test(nom));
      if (fichier !== undefined) comparer(`${paquet.nom} ${paquet.version}`, path.join(dossier, fichier), paquet.texte);
    }
    for (const police of LICENCES.polices) {
      const version = LICENCES.paquets.find((paquet) => paquet.nom === police.paquet)?.version ?? '';
      const dossier = dossierDuVerrou(police.paquet, version);
      const fichier = dossier === null ? undefined : fs.readdirSync(dossier).find((nom) => /^licen[cs]e_font/i.test(nom));
      if (dossier === null || fichier === undefined) throw new Error(`La police « ${police.nom} » n’a pas de LICENSE_FONT installé.`);
      comparer(`police ${police.nom}`, path.join(dossier, fichier), police.texte);
    }

    // Une garde dont le succès est une absence doit prouver qu'elle a regardé (`TESTING.md` §1.1).
    expect(compares.length).toBeGreaterThan(LICENCES.paquets.length / 2);
    expect(compares).toEqual(expect.arrayContaining(['police Material Symbols', 'police Spline Sans', 'react-helmet-async 2.0.4']));
    exiger(absentes, `Un texte de licence ne doit rien perdre de son corps. ${REGENERER}`);
  });
});

// ─── 2. Le script contre un arbre fabriqué ────────────────────────────────────────────────────

const MIT_CORPS = [
  'Permission is hereby granted, free of charge, to any person obtaining a copy',
  'of this software and associated documentation files (the "Software"), to deal',
  'in the Software without restriction, including without limitation the rights',
  'to use, copy, modify, merge, publish, distribute, sublicense, and/or sell',
  'copies of the Software, and to permit persons to whom the Software is',
  'furnished to do so, subject to the following conditions:',
  '',
  'The above copyright notice and this permission notice shall be included in all',
  'copies or substantial portions of the Software.',
  '',
  'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
  'IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,',
  'FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE',
  'AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER',
  'LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,',
  'OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE',
  'SOFTWARE.',
];

/** La même licence, la césure ailleurs : une ligne y commence par « COPYRIGHT HOLDERS BE LIABLE ». */
const MIT_CORPS_COUPE_AUTREMENT = [
  ...MIT_CORPS.slice(0, 10),
  'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
  'IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS',
  'FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR',
  'COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER',
  'IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN',
  'CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.',
];

/** Une MIT réellement différente : une phrase en moins. */
const MIT_CORPS_AUTRE = MIT_CORPS.filter((ligne) => !ligne.startsWith('copies or substantial portions')).map((ligne) =>
  ligne.startsWith('The above copyright notice') ? 'The above copyright notice and this permission notice shall be included.' : ligne
);

const mit = (avis: string | null, corps = MIT_CORPS, titre: string | null = 'MIT License') =>
  [...(titre ? [titre, ''] : []), ...(avis ? [avis, ''] : []), ...corps, ''].join('\n');

const OFL = [
  'Copyright 2021 The Fonte Authors (https://example.org/fonte)',
  '',
  'This Font Software is licensed under the SIL Open Font License, Version 1.1.',
  'This license is copied below, and is also available with a FAQ at:',
  'https://scripts.sil.org/OFL',
  '',
  '',
  '-----------------------------------------------------------',
  'SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007',
  '-----------------------------------------------------------',
  '',
  'PREAMBLE',
  'The goals of the Open Font License (OFL) are to stimulate worldwide',
  'development of collaborative font projects.',
  '',
  'PERMISSION & CONDITIONS',
  'Permission is hereby granted, free of charge, to any person obtaining',
  'a copy of the Font Software, to use, study, copy, merge, embed, modify,',
  'redistribute, and sell modified and unmodified copies of the Font',
  'Software, subject to the following conditions:',
  '',
].join('\n');

/**
 * L'Apache 2.0 réduit à ce qui compte ici : son titre, la clause 4 — dont les repères « (a) », « (b) », « (c) » et
 * « (d) » commencent chacun une ligne — et l'emplacement de l'avis dans l'appendice : vide, rempli, entre
 * accolades, ou `null` quand le projet l'a effacé.
 */
const apache = (emplacement: string | null = 'Copyright [yyyy] [name of copyright owner]') =>
  [
    '                                 Apache License',
    '                           Version 2.0, January 2004',
    '                        http://www.apache.org/licenses/',
    '',
    '   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION',
    '',
    '   4. Redistribution. You may reproduce and distribute copies of the',
    '      Work or Derivative Works thereof in any medium, with or without',
    '      modifications, and in Source or Object form, provided that You',
    '      meet the following conditions:',
    '',
    '      (a) You must give any other recipients of the Work or',
    '          Derivative Works a copy of this License; and',
    '',
    '      (b) You must cause any modified files to carry prominent notices',
    '          stating that You changed the files; and',
    '',
    '      (c) You must retain, in the Source form of any Derivative Works',
    '          that You distribute, all copyright, patent, trademark, and',
    '          attribution notices from the Source form of the Work,',
    '          excluding those notices that do not pertain to any part of',
    '          the Derivative Works; and',
    '',
    '      (d) If the Work includes a "NOTICE" text file as part of its',
    '          distribution, then any Derivative Works must include a copy.',
    '',
    '   END OF TERMS AND CONDITIONS',
    '',
    '   APPENDIX: How to apply the Apache License to your work.',
    '',
    '      To apply the Apache License to your work, attach the following',
    '      boilerplate notice, with the fields enclosed by brackets "[]"',
    '      replaced with your own identifying information. (Don\'t include',
    '      the brackets!)',
    '',
    ...(emplacement === null ? [] : [`   ${emplacement}`, '']),
    '   Licensed under the Apache License, Version 2.0 (the "License");',
    '   you may not use this file except in compliance with the License.',
    '',
  ].join('\n');

/** Une police TrueType minimale : une table `name` avec l'avis (0), la famille (1) et la famille typographique (16). */
function police(avis: string, famille: string): Buffer {
  const noms = [
    { id: 0, texte: avis },
    { id: 1, texte: `${famille} Regular` },
    { id: 16, texte: famille },
  ];
  const chaines = noms.map((n) => Buffer.from(n.texte, 'utf16le').swap16());
  const debutDesChaines = 6 + noms.length * 12;
  const table = Buffer.alloc(debutDesChaines + chaines.reduce((somme, c) => somme + c.length, 0));
  table.writeUInt16BE(noms.length, 2);
  table.writeUInt16BE(debutDesChaines, 4);
  let decalage = 0;
  noms.forEach((n, i) => {
    const r = 6 + i * 12;
    table.writeUInt16BE(3, r); // Windows
    table.writeUInt16BE(1, r + 2); // Unicode BMP
    table.writeUInt16BE(0x409, r + 4); // anglais des États-Unis
    table.writeUInt16BE(n.id, r + 6);
    table.writeUInt16BE(chaines[i].length, r + 8);
    table.writeUInt16BE(decalage, r + 10);
    chaines[i].copy(table, debutDesChaines + decalage);
    decalage += chaines[i].length;
  });
  const entete = Buffer.alloc(28);
  entete.writeUInt32BE(0x00010000, 0);
  entete.writeUInt16BE(1, 4);
  entete.write('name', 12, 'latin1');
  entete.writeUInt32BE(28, 20);
  entete.writeUInt32BE(table.length, 24);
  return Buffer.concat([entete, table]);
}

type Fabrique = {
  dependencies?: string[];
  /** Les paquets, par leur chemin sous `node_modules/` : « alpha », « @s/beta », « alpha/node_modules/gamma ». */
  paquets: Record<string, { package: Record<string, unknown>; fichiers?: Record<string, string | Buffer> }>;
  web: string[];
  android?: string[];
};

const dossiersTemporaires: string[] = [];
afterAll(() => {
  for (const dossier of dossiersTemporaires) fs.rmSync(dossier, { recursive: true, force: true });
});

function fabriquer(f: Fabrique) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'ramille-test-licences-'));
  dossiersTemporaires.push(dossier);
  fs.writeFileSync(path.join(dossier, 'package.json'), JSON.stringify({ name: 'faux', dependencies: Object.fromEntries((f.dependencies ?? []).map((nom) => [nom, '1.0.0'])) }));
  for (const [chemin, paquet] of Object.entries(f.paquets)) {
    const cible = path.join(dossier, 'node_modules', chemin);
    fs.mkdirSync(cible, { recursive: true });
    fs.writeFileSync(path.join(cible, 'package.json'), JSON.stringify(paquet.package));
    for (const [nom, contenu] of Object.entries(paquet.fichiers ?? {})) {
      fs.mkdirSync(path.dirname(path.join(cible, nom)), { recursive: true });
      fs.writeFileSync(path.join(cible, nom), contenu);
    }
  }
  const exportDir = path.join(dossier, 'export');
  const ecrireCarte = (plateforme: string, sources: string[]) => {
    const d = path.join(exportDir, '_expo', 'static', 'js', plateforme);
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'entry-0.js.map'), JSON.stringify({ version: 3, sources: ['__prelude__', '\0polyfill:x', '/src/app/index.tsx', ...sources] }));
  };
  ecrireCarte('web', f.web);
  if (f.android) ecrireCarte('android', f.android);
  return { dossier, exportDir, sortie: path.join(dossier, 'licences.ts') };
}

type Fabrication = ReturnType<typeof fabriquer>;

function lancer(p: Fabrication, extra: string[] = [], base: string[] = ['--sans-natif']) {
  const r = spawnSync(process.execPath, [script, '--racine', p.dossier, '--depuis', p.exportDir, '--sortie', p.sortie, '--date', '2026-10-22', ...base, ...extra], { encoding: 'utf8' });
  return { code: r.status, sortie: r.stdout, erreur: r.stderr };
}

type Donnees = { genereLe: string; paquets: Record<string, unknown>[]; polices: Record<string, unknown>[]; textes: { id: string; nom: string; paragraphes: string[] }[]; ecartes: string[] };
function donneesEcrites(p: Fabrication): Donnees {
  const texte = fs.readFileSync(p.sortie, 'utf8');
  const marqueur = 'export const LICENCES: DonneesDesLicences = ';
  return JSON.parse(texte.slice(texte.indexOf(marqueur) + marqueur.length, texte.lastIndexOf('};') + 1));
}

// `null` : aucune licence déclarée (`undefined` ferait prendre la valeur par défaut).
const pj = (nom: string, version: string, licence: string | null = 'MIT') => ({ name: nom, version, ...(licence === null ? {} : { license: licence }) });
const sources = (...paquets: string[]) => paquets.map((p) => `/node_modules/${p}/index.js`);

describe('scripts/generer-les-licences.mjs, sur un arbre fabriqué', () => {
  it('liste les paquets des deux bundles, avec leur avis, et dit où chacun est', () => {
    const p = fabriquer({
      dependencies: ['alpha', 'beta', 'fantome'],
      paquets: {
        alpha: { package: pj('alpha', '1.0.0'), fichiers: { LICENSE: mit('Copyright (c) 2020 Alpha') } },
        beta: { package: pj('beta', '2.1.0'), fichiers: { LICENSE: mit('Copyright (c) Beta, et ses contributeurs') } },
        fantome: { package: pj('fantome', '9.9.9') },
      },
      web: sources('alpha'),
      android: sources('alpha', 'beta'),
    });

    const r = lancer(p);

    expect(r.erreur).toBe('');
    expect(r.code).toBe(0);
    expect(donneesEcrites(p).paquets).toEqual([
      { nom: 'alpha', version: '1.0.0', licence: 'MIT', texte: 'MIT', copyright: 'Copyright (c) 2020 Alpha', sur: 'les deux' },
      { nom: 'beta', version: '2.1.0', licence: 'MIT', texte: 'MIT', copyright: 'Copyright (c) Beta, et ses contributeurs', sur: 'android' },
    ]);
  });

  it('écarte une dépendance directe qu’aucun bundle ne contient, et le dit', () => {
    const p = fabriquer({
      dependencies: ['alpha', 'fantome'],
      paquets: { alpha: { package: pj('alpha', '1.0.0'), fichiers: { LICENSE: mit('Copyright (c) 2020 Alpha') } }, fantome: { package: pj('fantome', '9.9.9') } },
      web: sources('alpha'),
      android: sources('alpha'),
    });

    expect(lancer(p).code).toBe(0);
    expect(donneesEcrites(p).ecartes).toEqual(['fantome']);
  });

  it('range une licence une seule fois, quels que soient le titre, la césure et l’avis de chaque paquet', () => {
    const p = fabriquer({
      paquets: {
        alpha: { package: pj('alpha', '1.0.0'), fichiers: { LICENSE: mit('Copyright (c) 2020 Alpha') } },
        beta: { package: pj('beta', '1.0.0'), fichiers: { LICENSE: mit('Copyright (c) 2021 Beta', MIT_CORPS, 'The MIT License (MIT)') } },
        gamma: { package: pj('gamma', '1.0.0'), fichiers: { license: mit('Copyright (c) 2022 Gamma', MIT_CORPS_COUPE_AUTREMENT, null) } },
        delta: { package: pj('delta', '1.0.0'), fichiers: { 'LICENSE.md': mit('Copyright (c) 2023 Delta', MIT_CORPS, '# MIT License') } },
      },
      web: sources('alpha', 'beta', 'gamma', 'delta'),
      android: [],
    });

    expect(lancer(p).code).toBe(0);
    const donnees = donneesEcrites(p);
    expect(donnees.textes.map((t) => t.id)).toEqual(['MIT']);
    expect(donnees.paquets.map((x) => x.texte)).toEqual(['MIT', 'MIT', 'MIT', 'MIT']);
    // Ni le titre ni les avis ne sont dans le texte reproduit.
    const texte = donnees.textes[0].paragraphes.join('\n');
    expect(texte).not.toMatch(/Copyright \(c\)|MIT License/);
    expect(texte).toMatch(/^Permission is hereby granted/);
  });

  it('ne prend pas pour un avis la phrase « COPYRIGHT HOLDERS BE LIABLE » qu’une césure met en début de ligne', () => {
    const p = fabriquer({
      paquets: { alpha: { package: pj('alpha', '1.0.0'), fichiers: { LICENSE: mit('Copyright 2017 Andrey Sitnik', MIT_CORPS_COUPE_AUTREMENT, 'The MIT License (MIT)') } } },
      web: sources('alpha'),
      android: [],
    });

    expect(lancer(p).code).toBe(0);
    expect(donneesEcrites(p).paquets[0].copyright).toBe('Copyright 2017 Andrey Sitnik');
  });

  it('ne prend pas pour un avis une phrase de la licence qu’une césure fait commencer par « Copyright notice »', () => {
    // Une ISC dont la césure met « Copyright notice and this permission notice… » en tête de ligne, avec une
    // majuscule : ce n'est pas un avis, et ce paquet n'en donne aucun.
    const isc = [
      'Permission to use, copy, modify, and/or distribute this software for any',
      'purpose with or without fee is hereby granted, provided that the above',
      'Copyright notice and this permission notice appear in all copies.',
      '',
      'THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES',
      'WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF',
      'MERCHANTABILITY AND FITNESS.',
      '',
    ].join('\n');
    const p = fabriquer({
      paquets: { alpha: { package: pj('alpha', '1.0.0', 'ISC'), fichiers: { LICENSE: isc } } },
      web: sources('alpha'),
      android: [],
    });

    expect(lancer(p).code).toBe(0);
    const donnees = donneesEcrites(p);
    expect(donnees.paquets[0].copyright).toBeNull();
    expect(donnees.textes[0].paragraphes[0]).toMatch(/Copyright notice and this permission notice appear in all copies\.$/);
  });

  it('garde à part un texte réellement différent pour la même licence, et le dit', () => {
    const p = fabriquer({
      paquets: {
        alpha: { package: pj('alpha', '1.0.0'), fichiers: { LICENSE: mit('Copyright (c) A') } },
        beta: { package: pj('beta', '1.0.0'), fichiers: { LICENSE: mit('Copyright (c) B') } },
        gamma: { package: pj('gamma', '1.0.0'), fichiers: { LICENSE: mit('Copyright (c) G', MIT_CORPS_AUTRE) } },
      },
      web: sources('alpha', 'beta', 'gamma'),
      android: [],
    });

    expect(lancer(p).code).toBe(0);
    const donnees = donneesEcrites(p);
    expect(donnees.textes.map((t) => [t.id, t.nom])).toEqual([
      ['MIT', 'Licence MIT'],
      ['MIT-2', 'Licence MIT (autre rédaction)'],
    ]);
    expect(donnees.paquets.map((x) => [x.nom, x.texte])).toEqual([
      ['alpha', 'MIT'],
      ['beta', 'MIT'],
      ['gamma', 'MIT-2'],
    ]);
  });

  it('liste un paquet sans fichier de licence avec le texte standard, et sans avis', () => {
    const p = fabriquer({
      paquets: {
        alpha: { package: pj('alpha', '1.0.0'), fichiers: { LICENSE: mit('Copyright (c) A') } },
        sansfichier: { package: pj('sansfichier', '3.0.0') },
      },
      web: sources('alpha', 'sansfichier'),
      android: [],
    });

    expect(lancer(p).code).toBe(0);
    expect(donneesEcrites(p).paquets[1]).toEqual({ nom: 'sansfichier', version: '3.0.0', licence: 'MIT', texte: 'MIT', copyright: null, sur: 'web' });
  });

  it('distingue un paquet imbriqué de son homonyme, chacun à sa version', () => {
    const p = fabriquer({
      paquets: {
        gamma: { package: pj('gamma', '1.0.0'), fichiers: { LICENSE: mit('Copyright (c) G1') } },
        'alpha/node_modules/gamma': { package: pj('gamma', '2.0.0'), fichiers: { LICENSE: mit('Copyright (c) G2') } },
        alpha: { package: pj('alpha', '1.0.0'), fichiers: { LICENSE: mit('Copyright (c) A') } },
        '@portee/delta': { package: pj('@portee/delta', '0.1.0'), fichiers: { LICENSE: mit('Copyright (c) D') } },
      },
      web: [...sources('gamma', 'alpha', '@portee/delta'), '/node_modules/alpha/node_modules/gamma/index.js'],
      android: [],
    });

    expect(lancer(p).code).toBe(0);
    expect(donneesEcrites(p).paquets.map((x) => `${x.nom}@${x.version}`)).toEqual(['@portee/delta@0.1.0', 'alpha@1.0.0', 'gamma@1.0.0', 'gamma@2.0.0']);
  });

  it('retombe sur le node_modules du projet quand le chemin d’une carte remonte ailleurs (un dépôt à node_modules partagé)', () => {
    const p = fabriquer({
      paquets: { alpha: { package: pj('alpha', '1.0.0'), fichiers: { LICENSE: mit('Copyright (c) A') } } },
      web: ['/../../../node_modules/alpha/index.js', '/node_modules/alpha/autre.js'],
      android: [],
    });

    expect(lancer(p).code).toBe(0);
    expect(donneesEcrites(p).paquets.map((x) => x.nom)).toEqual(['alpha']);
  });

  it('lit la police et son avis dans le fichier de police, et sa licence dans LICENSE_FONT', () => {
    const p = fabriquer({
      paquets: {
        fonte: {
          package: pj('fonte', '0.4.0', 'MIT AND OFL-1.1'),
          fichiers: { LICENSE: mit('Copyright (c) 2020 Expo'), LICENSE_FONT: OFL, '400/Fonte_400.ttf': police('Copyright 2021 The Fonte Authors (https://example.org/fonte)', 'Fonte') },
        },
      },
      web: ['/node_modules/fonte/index.js', '/node_modules/fonte/400/Fonte_400.ttf'],
      android: ['/node_modules/fonte/index.js'],
    });

    const r = lancer(p);

    expect(r.erreur).toBe('');
    expect(r.code).toBe(0);
    const donnees = donneesEcrites(p);
    // Le paquet est sous MIT ; la police sous OFL — la phrase d'ouverture de la MIT que l'OFL contient aussi n'y change rien.
    expect(donnees.paquets).toEqual([{ nom: 'fonte', version: '0.4.0', licence: 'MIT', texte: 'MIT', copyright: 'Copyright (c) 2020 Expo', sur: 'les deux' }]);
    expect(donnees.polices).toEqual([
      { nom: 'Fonte', copyright: 'Copyright 2021 The Fonte Authors (https://example.org/fonte)', licence: 'OFL-1.1', texte: 'OFL-1.1', paquet: 'fonte', sur: 'web' },
    ]);
    // Le texte de l'OFL commence à son intitulé, et ses intitulés en capitales restent seuls sur leur ligne.
    expect(donnees.textes.find((t) => t.id === 'OFL-1.1')?.paragraphes.slice(0, 4)).toEqual([
      'SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007',
      'PREAMBLE',
      'The goals of the Open Font License (OFL) are to stimulate worldwide development of collaborative font projects.',
      'PERMISSION & CONDITIONS',
    ]);
  });

  describe('l’Apache 2.0 et le repère « (c) » de sa clause 4', () => {
    it('garde la ligne « (c) You must retain… » : ce n’est pas un avis de copyright', () => {
      // Relevé le 22/10/2026 : `(c) ` seul était pris pour un avis, et la clause 4(c) perdait sa première ligne.
      const p = fabriquer({ paquets: { alpha: { package: pj('alpha', '1.0.0', 'Apache-2.0'), fichiers: { LICENSE: apache() } } }, web: sources('alpha'), android: [] });

      expect(lancer(p).code).toBe(0);
      const donnees = donneesEcrites(p);
      const reperes = ['(a) You must give', '(b) You must cause', '(c) You must retain, in the Source form of any Derivative Works', '(d) If the Work includes'];
      expect(reperes.filter((debut) => donnees.textes[0].paragraphes.some((paragraphe) => paragraphe.startsWith(debut)))).toEqual(reperes);
      expect(donnees.paquets[0].copyright).toBeNull();
    });

    it('reconnaît « (c) 2020 … » et « © 2021 … » comme des avis : « (c) » suivi d’une année, ou « © »', () => {
      const p = fabriquer({
        paquets: {
          alpha: { package: pj('alpha', '1.0.0'), fichiers: { LICENSE: mit('(c) 2020 Alpha') } },
          beta: { package: pj('beta', '1.0.0'), fichiers: { LICENSE: mit('© 2021 Beta') } },
        },
        web: sources('alpha', 'beta'),
        android: [],
      });

      expect(lancer(p).code).toBe(0);
      const donnees = donneesEcrites(p);
      expect(donnees.paquets.map((x) => x.copyright)).toEqual(['(c) 2020 Alpha', '© 2021 Beta']);
      expect(donnees.textes[0].paragraphes.join('\n')).not.toMatch(/2020 Alpha|2021 Beta/);
    });

    /** Ce que l'appendice affiché dit autour de l'emplacement de l'avis : la phrase qui parle de ses champs, lui, puis le modèle d'avis. */
    const autourDeLEmplacement = (paragraphes: string[]) => {
      const i = paragraphes.indexOf('Copyright [yyyy] [name of copyright owner]');
      return { i, avant: paragraphes[i - 1] ?? '', apres: paragraphes[i + 1] ?? '', fois: paragraphes.filter((p) => p === 'Copyright [yyyy] [name of copyright owner]').length };
    };

    it('range une seule fois l’Apache, que l’emplacement de l’avis soit resté vide, ait été rempli, écrit entre accolades ou effacé', () => {
      // `aaa` passe le premier et n'a plus d'emplacement : le texte affiché ne doit pas dépendre de l'ordre des paquets.
      const p = fabriquer({
        paquets: {
          aaa: { package: pj('aaa', '1.0.0', 'Apache-2.0'), fichiers: { LICENSE: apache(null) } },
          accolades: { package: pj('accolades', '1.0.0', 'Apache-2.0'), fichiers: { LICENSE: apache('Copyright {yyyy} {name of copyright owner}') } },
          rempli: { package: pj('rempli', '1.0.0', 'Apache-2.0'), fichiers: { LICENSE: apache('Copyright 2018 Les auteurs de Rempli') } },
          vide: { package: pj('vide', '1.0.0', 'Apache-2.0'), fichiers: { LICENSE: apache() } },
        },
        web: sources('aaa', 'accolades', 'rempli', 'vide'),
        android: [],
      });

      expect(lancer(p).code).toBe(0);
      const donnees = donneesEcrites(p);
      expect(donnees.textes.map((t) => t.id)).toEqual(['Apache-2.0']);
      expect(donnees.paquets.map((x) => [x.nom, x.copyright])).toEqual([
        ['aaa', null],
        ['accolades', null],
        ['rempli', 'Copyright 2018 Les auteurs de Rempli'],
        ['vide', null],
      ]);
      // L'emplacement n'est l'avis de personne, et l'avis d'un projet n'est pas dans le texte de la licence ;
      // mais le texte affiché garde l'emplacement, sous sa forme canonique, et une seule fois.
      const { i, avant, apres, fois } = autourDeLEmplacement(donnees.textes[0].paragraphes);
      expect(i).toBeGreaterThan(-1);
      expect(fois).toBe(1);
      expect(donnees.textes[0].paragraphes.join('\n')).not.toMatch(/\{yyyy\}|Les auteurs de Rempli/);
      expect(avant).toMatch(/^To apply the Apache License to your work, attach the following boilerplate notice, with the fields enclosed by brackets "\[\]"/);
      expect(apres).toMatch(/^Licensed under the Apache License, Version 2\.0/);
    });

    it('affiche l’emplacement de l’avis sous sa forme canonique même quand le seul Apache l’a rempli, ou écrit entre accolades', () => {
      // `react-helmet-async` : « Copyright 2018 The New York Times Company » à la place de l'emplacement. Sans lui, la phrase
      // « with the fields enclosed by brackets "[]" replaced… » enchaînait sur le modèle sans aucun champ à remplacer.
      for (const emplacement of ['Copyright 2018 Les auteurs de Rempli', 'Copyright {yyyy} {name of copyright owner}']) {
        const p = fabriquer({ paquets: { seul: { package: pj('seul', '1.0.0', 'Apache-2.0'), fichiers: { LICENSE: apache(emplacement) } } }, web: sources('seul'), android: [] });

        expect(lancer(p).code).toBe(0);
        const { fois, avant, apres } = autourDeLEmplacement(donneesEcrites(p).textes[0].paragraphes);
        expect(fois).toBe(1);
        expect(avant).toMatch(/with the fields enclosed by brackets "\[\]"/);
        expect(apres).toMatch(/^Licensed under the Apache License/);
      }
    });

    it('n’ajoute pas d’emplacement à un texte qui n’en a pas, tant qu’aucun autre Apache n’en porte', () => {
      const p = fabriquer({ paquets: { aaa: { package: pj('aaa', '1.0.0', 'Apache-2.0'), fichiers: { LICENSE: apache(null) } } }, web: sources('aaa'), android: [] });

      expect(lancer(p).code).toBe(0);
      expect(autourDeLEmplacement(donneesEcrites(p).textes[0].paragraphes).fois).toBe(0);
    });
  });

  describe('une copie qu’un paquet range dans ses sources', () => {
    const copie = (identite: Record<string, string>) => ({
      'vendor/copie/LICENSE': apache('Copyright 2018 Les auteurs de Copie'),
      'vendor/copie/lib/index.js': '',
      ...identite,
    });
    const IDENTITE_ORIGINALE = { 'vendor/copie/package_original.json': JSON.stringify(pj('copie', '2.0.4', 'Apache-2.0')) };
    const hote = (identite: Record<string, string>, fichiers: Record<string, string> = {}) => ({
      package: pj('hote', '5.0.0'),
      fichiers: { LICENSE: mit('Copyright (c) 2020 Hote'), 'index.js': '', ...copie(identite), ...fichiers },
    });
    const COPIE_ATTENDUE = { nom: 'copie', version: '2.0.4', licence: 'Apache-2.0', texte: 'Apache-2.0', copyright: 'Copyright 2018 Les auteurs de Copie', sur: 'web', dans: 'hote' };
    const HOTE_ATTENDU = { nom: 'hote', version: '5.0.0', licence: 'MIT', texte: 'MIT', copyright: 'Copyright (c) 2020 Hote', sur: 'web' };

    it('la liste à part, avec sa licence et son avis, dans son hôte — et pas sous la licence de l’hôte', () => {
      // `expo-router/vendor/react-helmet-async` : Apache 2.0, New York Times Company, dans un paquet MIT.
      const p = fabriquer({
        paquets: { hote: hote(IDENTITE_ORIGINALE) },
        web: ['/node_modules/hote/index.js', '/node_modules/hote/vendor/copie/lib/index.js'],
        android: [],
      });

      expect(lancer(p).code).toBe(0);
      const donnees = donneesEcrites(p);
      expect(donnees.paquets).toEqual([COPIE_ATTENDUE, HOTE_ATTENDU]);
      expect(donnees.textes.map((t) => t.id).sort()).toEqual(['Apache-2.0', 'MIT']);
    });

    it('lit son identité dans un package.json de son dossier, comme dans package_original.json', () => {
      const p = fabriquer({
        paquets: { hote: hote({ 'vendor/copie/package.json': JSON.stringify(pj('copie', '2.0.4', 'Apache-2.0')) }) },
        web: ['/node_modules/hote/index.js', '/node_modules/hote/vendor/copie/lib/index.js'],
        android: [],
      });

      expect(lancer(p).code).toBe(0);
      expect(donneesEcrites(p).paquets).toEqual([COPIE_ATTENDUE, HOTE_ATTENDU]);
    });

    it('garde l’hôte dans la liste même quand seul un fichier de la copie entre dans le bundle', () => {
      const p = fabriquer({ paquets: { hote: hote(IDENTITE_ORIGINALE) }, web: ['/node_modules/hote/vendor/copie/lib/index.js'], android: [] });

      expect(lancer(p).code).toBe(0);
      expect(donneesEcrites(p).paquets.map((x) => x.nom)).toEqual(['copie', 'hote']);
    });

    it('laisse à l’hôte un sous-dossier qui n’a qu’un package.json de façade, sans nom ni version', () => {
      // `{ "type": "module" }` : c'est ce que portent `@babel/runtime/helpers/esm` ou `reanimated/lib/module`.
      const p = fabriquer({
        paquets: { hote: { package: pj('hote', '5.0.0'), fichiers: { LICENSE: mit('Copyright (c) 2020 Hote'), 'lib/module/package.json': '{ "type": "module" }', 'lib/module/index.js': '' } } },
        web: ['/node_modules/hote/lib/module/index.js'],
        android: [],
      });

      expect(lancer(p).code).toBe(0);
      expect(donneesEcrites(p).paquets).toEqual([HOTE_ATTENDU]);
    });

    it('donne un fichier au sous-dossier le plus proche, quand une copie en contient une autre', () => {
      const p = fabriquer({
        paquets: {
          hote: {
            package: pj('hote', '5.0.0'),
            fichiers: {
              LICENSE: mit('Copyright (c) 2020 Hote'),
              'vendor/a/LICENSE': mit('Copyright (c) 2021 Auteur A'),
              'vendor/a/package.json': JSON.stringify(pj('a', '1.0.0')),
              'vendor/a/deep/b/LICENSE': mit('Copyright (c) 2022 Auteur B'),
              'vendor/a/deep/b/package.json': JSON.stringify(pj('b', '2.0.0')),
              'vendor/a/deep/b/x.js': '',
            },
          },
        },
        web: ['/node_modules/hote/vendor/a/deep/b/x.js'],
        android: [],
      });

      expect(lancer(p).code).toBe(0);
      expect(donneesEcrites(p).paquets.map((x) => [x.nom, x.version, x.copyright, x.dans])).toEqual([
        ['b', '2.0.0', 'Copyright (c) 2022 Auteur B', 'hote'],
        ['hote', '5.0.0', 'Copyright (c) 2020 Hote', undefined],
      ]);
    });

    it('ne regarde que le chemin des fichiers que la carte nomme', () => {
      // Une copie sans identité n'embête personne tant qu'aucun de ses fichiers n'entre dans un bundle.
      const p = fabriquer({ paquets: { hote: hote({}) }, web: ['/node_modules/hote/index.js'], android: [] });

      expect(lancer(p).code).toBe(0);
      expect(donneesEcrites(p).paquets).toEqual([HOTE_ATTENDU]);
    });
  });

  // Les essais sur `meta`, un paquet que la carte nomme par certains de ses fichiers : celui de l'avis qu'il porte
  // quand sa licence n'en donne pas, et celui des avis des fichiers qu'il a repris. `alpha` apporte le texte MIT standard.
  const alpha = { package: pj('alpha', '1.0.0'), fichiers: { LICENSE: mit('Copyright (c) 2020 Alpha') } };
  type Paquet = { package: Record<string, unknown>; fichiers?: Record<string, string | Buffer> };
  /** Le script joué sur `meta` et ses fichiers, avec en plus les paquets `autres`. */
  const jouer = (paquet: Paquet, fichiersDeLaCarte: string[], autres: Record<string, Paquet> = {}) => {
    const sourcesAutres = Object.keys(autres).map((nom) => `/node_modules/${nom}/index.js`);
    const p = fabriquer({
      paquets: { alpha, meta: paquet, ...autres },
      web: ['/node_modules/alpha/index.js', ...sourcesAutres, ...fichiersDeLaCarte.map((f) => `/node_modules/meta/${f}`)],
      android: [],
    });
    return { p, r: lancer(p) };
  };
  /** L'entrée que le script écrit pour `meta`. */
  const entreeDe = (paquet: Paquet, fichiersDeLaCarte: string[], autres: Record<string, Paquet> = {}) => {
    const { p, r } = jouer(paquet, fichiersDeLaCarte, autres);
    expect(r.erreur).toBe('');
    expect(r.code).toBe(0);
    return donneesEcrites(p).paquets.find((x) => x.nom === 'meta');
  };
  /** L'avis que le script donne à `meta`. */
  const avisDe = (paquet: Paquet, fichiersDeLaCarte: string[]) => entreeDe(paquet, fichiersDeLaCarte)?.copyright;

  describe('l’avis d’un paquet dont le fichier de licence n’en porte pas', () => {
    const EN_TETE_META = '/**\n * Copyright (c) Meta Platforms, Inc. and affiliates.\n *\n * This source code is licensed under the MIT license found in the\n * LICENSE file in the root directory of this source tree.\n */\n';

    it('prend le premier avis qu’un fichier du paquet porte en commentaire de tête, parmi ceux que le bundle contient', () => {
      // `Copyright (c) Meta Platforms, Inc. and affiliates.` en tête des fichiers de `@react-native/*`.
      expect(avisDe({ package: pj('meta', '1.0.0'), fichiers: { 'src/a.js': EN_TETE_META } }, ['src/a.js'])).toBe('Copyright (c) Meta Platforms, Inc. and affiliates.');
    });

    it('lit aussi « // Copyright © … » sous « "use strict"; », et « /** Copyright … */ » sur une ligne', () => {
      expect(avisDe({ package: pj('meta', '1.0.0'), fichiers: { 'a.js': '"use strict";\n// Copyright © 2024 650 Industries.\n\'use client\';\n' } }, ['a.js'])).toBe(
        'Copyright © 2024 650 Industries.'
      );
      expect(avisDe({ package: pj('meta', '1.0.0'), fichiers: { 'a.js': '/** Copyright 2015-present 650 Industries */\n' } }, ['a.js'])).toBe('Copyright 2015-present 650 Industries');
    });

    it('choisit dans l’ordre alphabétique des chemins, et non dans l’ordre où la carte les a rangés', () => {
      const paquet = { package: pj('meta', '1.0.0'), fichiers: { 'src/a.js': '// Copyright (c) 2019 Premier\n', 'src/b.js': '// Copyright (c) 2020 Second\n' } };

      expect(avisDe(paquet, ['src/b.js', 'src/a.js'])).toBe('Copyright (c) 2019 Premier');
    });

    it('ignore un fichier que les bundles ne contiennent pas', () => {
      const paquet = { package: pj('meta', '1.0.0'), fichiers: { 'src/a.js': 'export {};\n', 'hors-bundle.js': '// Copyright (c) 2019 Ailleurs\n', 'src/hors-bundle.js': '// Copyright (c) 2018 Ailleurs\n' } };

      expect(avisDe(paquet, ['src/a.js'])).toBeNull();
    });

    it('ne prend ni une ligne qui n’est pas un commentaire, ni un avis qui n’est pas en tête de fichier', () => {
      const loin = `${'export {};\n'.repeat(60)}// Copyright (c) 2019 Trop loin\n`;
      const paquet = {
        package: pj('meta', '1.0.0'),
        fichiers: {
          'a.js': 'const mention = "Copyright (c) 2020 Dans une chaîne";\n',
          'b.js': loin,
          'c.js': '// Copyright notice : voir LICENSE\n// copyright (c) en minuscules\n',
          // Deux lignes seulement, mais la seconde commence après les quatre premiers kio : le script ne lit pas plus que l'en-tête.
          'd.js': `// ${'x'.repeat(5000)}\n// Copyright (c) 2019 Après quatre kio\n`,
        },
      };

      expect(avisDe(paquet, ['a.js', 'b.js', 'c.js', 'd.js'])).toBeNull();
    });

    it('cherche aussi dans les sources quand le fichier de licence existe mais ne porte aucun avis', () => {
      const bare = ['Permission to use, copy, modify, and/or distribute this software for any', 'purpose with or without fee is hereby granted, provided that the above', 'copyright notice and this permission notice appear in all copies.', ''].join('\n');
      const paquet = { package: pj('meta', '1.0.0', 'ISC'), fichiers: { LICENSE: bare, 'a.js': '// Copyright (c) 2019 Dans les sources\n' } };

      expect(avisDe(paquet, ['a.js'])).toBe('Copyright (c) 2019 Dans les sources');
    });

    it('préfère l’avis du fichier de licence à celui des sources', () => {
      const paquet = { package: pj('meta', '1.0.0'), fichiers: { LICENSE: mit('Copyright (c) 2020 Dans la licence'), 'a.js': '// Copyright (c) 2019 Dans les sources\n' } };

      expect(avisDe(paquet, ['a.js'])).toBe('Copyright (c) 2020 Dans la licence');
    });

    it('à défaut, donne l’auteur du package.json, présenté comme tel et sans son adresse', () => {
      const auteur = (author: unknown) => avisDe({ package: { ...pj('meta', '1.0.0'), author }, fichiers: { 'a.js': 'export {};\n' } }, ['a.js']);

      expect(auteur('Scott Taylor <scott@example.org> (https://example.org)')).toBe('Auteur indiqué par le paquet : Scott Taylor');
      expect(auteur({ name: 'Ada Lovelace', email: 'ada@example.org' })).toBe('Auteur indiqué par le paquet : Ada Lovelace');
      expect(auteur('<scott@example.org>')).toBeNull();
      expect(auteur(undefined)).toBeNull();
    });

    it('préfère l’avis des sources à l’auteur du package.json', () => {
      const paquet = { package: { ...pj('meta', '1.0.0'), author: 'Quelqu’un' }, fichiers: { 'a.js': '// Copyright (c) 2019 Dans les sources\n' } };

      expect(avisDe(paquet, ['a.js'])).toBe('Copyright (c) 2019 Dans les sources');
    });

    it('lit le deuxième fichier quand le premier, dans l’ordre des chemins, ne porte aucun avis', () => {
      // Une lecture du seul premier fichier passait toute la suite (mutation jouée le 22/10/2026).
      const paquet = { package: pj('meta', '1.0.0'), fichiers: { 'a.js': 'export {};\n', 'b.js': '// Copyright (c) 2019 Dans le second\n' } };

      expect(avisDe(paquet, ['b.js', 'a.js'])).toBe('Copyright (c) 2019 Dans le second');
    });

    it('ne prend pas pour un avis une ligne qui commence par « Copyright » sans être un commentaire — dans une chaîne multiligne', () => {
      // Le marqueur de commentaire rendu facultatif passait toute la suite (mutation jouée le 22/10/2026) : les essais
      // d'avant n'avaient que des lignes qui commencent par autre chose que « Copyright ».
      const chaine = 'const modele = `\nCopyright (c) 2020 Dans une chaîne multiligne\n  Copyright (c) 2021 Indentée\n`;\n';

      expect(avisDe({ package: pj('meta', '1.0.0'), fichiers: { 'a.js': chaine } }, ['a.js'])).toBeNull();
      expect(entreeDe({ package: pj('meta', '1.0.0'), fichiers: { LICENSE: mit('Copyright (c) 2020 Meta'), 'a.js': chaine } }, ['a.js'])?.avisRepris).toBeUndefined();
    });
  });

  describe('les avis des fichiers repris d’autres projets', () => {
    const META = 'Copyright (c) Meta Platforms, Inc. and affiliates.';
    const meta = (fichiers: Record<string, string>, licence = mit(META)) => ({ package: pj('meta', '1.0.0'), fichiers: { LICENSE: licence, ...fichiers } });
    const reprisDe = (fichiers: Record<string, string>, autres: Record<string, { package: Record<string, unknown>; fichiers?: Record<string, string> }> = {}) =>
      entreeDe(meta(fichiers), Object.keys(fichiers), autres)?.avisRepris;
    /** Les 21 premières lignes de `console.js` de `@react-native/js-polyfills`, puis l'avis de Joyent à la ligne 22 et la MIT qu'il recopie. */
    const CONSOLE = [
      '/**',
      ' * Copyright (c) Meta Platforms, Inc. and affiliates.',
      ' *',
      ' * This source code is licensed under the MIT license found in the',
      ' * LICENSE file in the root directory of this source tree.',
      ' *',
      ' * @format',
      ' * @noflow',
      ' * @nolint',
      ' * @polyfill',
      ' */',
      '',
      "'use client';",
      '',
      '/* eslint-disable no-shadow, eqeqeq, no-unused-vars, no-control-regex  */',
      '',
      '/**',
      ' * This pipes all of our console logging functions to native logging so that',
      ' * JavaScript errors in required modules show up in Xcode via NSLog.',
      ' */',
      'const inspect = (function () {',
      '  // Copyright Joyent, Inc. and other Node contributors.',
      '  //',
      ...MIT_CORPS.map((ligne) => `  // ${ligne}`.trimEnd()),
      '  //',
      '  // https://github.com/joyent/node/blob/master/lib/util.js',
      '',
      '  function inspect(obj, opts) {',
      '  }',
      '',
    ].join('\n');

    it('relève, sous l’avis du paquet, celui d’un autre auteur que porte un de ses fichiers — l’avis de Joyent, ligne 22 de console.js', () => {
      // `@react-native/js-polyfills` : la limite de lecture d'en-tête (40 lignes, 4 kio) suffit à cette ligne 22, à 573 octets du début.
      const lignes = CONSOLE.split('\n');
      expect(lignes[21]).toBe('  // Copyright Joyent, Inc. and other Node contributors.');
      expect(Buffer.byteLength(lignes.slice(0, 22).join('\n'))).toBeLessThan(600);

      const entree = entreeDe(meta({ 'console.js': CONSOLE }), ['console.js']);

      // L'avis de Meta, en tête du même fichier, est celui du paquet : il n'est pas repris.
      expect(entree).toMatchObject({ copyright: META, avisRepris: ['Copyright Joyent, Inc. and other Node contributors.'] });
    });

    it('relève les avis des paquets qui n’ont aucun fichier de licence, et le premier tient lieu d’avis principal', () => {
      const paquet = { package: pj('meta', '1.0.0'), fichiers: { 'a.js': '// Copyright (c) 2019 Premier\n', 'b.js': '// Copyright (c) 2020 Second\n', 'c.js': '// Copyright (c) 2021 Premier\n' } };

      expect(entreeDe(paquet, ['a.js', 'b.js', 'c.js'])).toMatchObject({ copyright: 'Copyright (c) 2019 Premier', avisRepris: ['Copyright (c) 2020 Second'] });
    });

    it('relève les avis de chaque fichier, même quand le premier n’en porte aucun', () => {
      expect(reprisDe({ 'a.js': 'export {};\n', 'b.js': '// Copyright (c) 2019 Autre Auteur\n' })).toEqual(['Copyright (c) 2019 Autre Auteur']);
    });

    it('relève tous les avis d’un même en-tête, dans l’ordre', () => {
      const entete = '/**\n * Copyright (c) Nicolas Gallagher.\n * Copyright (c) Facebook, Inc. and its affiliates.\n *\n * This source code is licensed under the MIT license found in the\n * LICENSE file in the root directory of this source tree.\n */\n';

      expect(reprisDe({ 'AsyncStorage.js': entete })).toEqual(['Copyright (c) Nicolas Gallagher.', 'Copyright (c) Facebook, Inc. and its affiliates.']);
    });

    it('ne reprend pas un avis du même titulaire que le paquet : ni l’année, ni la forme sociale, ni « (aka …) » n’y changent rien', () => {
      const licence = mit('Copyright (c) 2015-present 650 Industries, Inc. (aka Expo)');
      const fichiers = {
        'a.js': '// Copyright © 2024 650 Industries.\n',
        'b.js': '// Copyright 2015-present 650 Industries. All rights reserved.\n',
        'c.js': '/**\n * Copyright (c) 2013 650 Industries, Inc. and its affiliates.\n */\n',
      };

      const entree = entreeDe(meta(fichiers, licence), ['a.js', 'b.js', 'c.js']);

      expect(entree?.copyright).toBe('Copyright (c) 2015-present 650 Industries, Inc. (aka Expo)');
      expect(entree?.avisRepris).toBeUndefined();
    });

    it('garde deux titulaires que rien ne dit être le même, fût-ce Facebook devenu Meta', () => {
      // Le script ne connaît pas l'histoire des sociétés : un avis au nom de Facebook sous un avis au nom de Meta est repris.
      expect(reprisDe({ 'a.js': '// Copyright (c) Facebook, Inc. and its affiliates.\n' })).toEqual(['Copyright (c) Facebook, Inc. and its affiliates.']);
    });

    it('dédoublonne les avis repris par titulaire, et garde le premier dans l’ordre des chemins', () => {
      const fichiers = {
        'a.js': '// Copyright 2018 The Deno authors.\n',
        'b.js': '// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.\n',
        'c.js': '// Copyright (c) 2021 Autre\n',
        'd.js': '// Copyright (c) 2022, Autre, Inc.\n',
      };

      expect(reprisDe(fichiers)).toEqual(['Copyright 2018 The Deno authors.', 'Copyright (c) 2021 Autre']);
    });

    it('cite l’avis tel que le fichier l’écrit, « All rights reserved. MIT license. » compris', () => {
      expect(reprisDe({ 'Location.native.ts': '// Copyright © 2023 650 Industries.\n// Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.\n' })).toEqual([
        'Copyright © 2023 650 Industries.',
        'Copyright 2018-2023 the Deno authors. All rights reserved. MIT license.',
      ]);
    });

    it('ne reprend que des commentaires', () => {
      const chaine = 'const modele = `\nCopyright (c) 2020 Dans une chaîne multiligne\n`;\nconst a = "Copyright (c) 2021 Dans une chaîne";\n';

      expect(reprisDe({ 'a.js': chaine })).toBeUndefined();
    });

    it('accepte un avis qui cite la MIT par son nom ou en recopie le texte, et un avis qui ne cite aucune licence', () => {
      const fichiers = {
        'a.js': '// Copyright (c) 2019 Nommée\n// Released under the MIT license.\n',
        'b.js': '/* Copyright (c) 2020 Sans mention */\n',
        'c.js': `// Copyright (c) 2021 Recopiée\n//\n${MIT_CORPS.map((ligne) => `// ${ligne}`.trimEnd()).join('\n')}\n`,
      };

      expect(reprisDe(fichiers)).toEqual(['Copyright (c) 2019 Nommée', 'Copyright (c) 2020 Sans mention', 'Copyright (c) 2021 Recopiée']);
    });

    it('accepte une licence autre que la MIT quand la page la reproduit déjà', () => {
      const fichiers = { 'a.js': '/**\n * Copyright (c) 2019 Autre Auteur\n * Licensed under the Apache License, Version 2.0\n */\n' };
      const apacheEnPlus = { package: pj('apachee', '1.0.0', 'Apache-2.0'), fichiers: { LICENSE: apache(), 'index.js': '' } };

      expect(reprisDe(fichiers, { apachee: apacheEnPlus })).toEqual(['Copyright (c) 2019 Autre Auteur']);
    });

    it('accepte la MIT même quand le paquet est sous une autre licence et que la page n’a pas de texte MIT', () => {
      // Seule la MIT passe sans que la page la reproduise : c'est l'exception de la consigne (« autre que MIT »).
      const isc = ['Permission to use, copy, modify, and/or distribute this software for any', 'purpose with or without fee is hereby granted, provided that the above', 'copyright notice and this permission notice appear in all copies.', ''];
      const paquet = { package: pj('meta', '1.0.0', 'ISC'), fichiers: { LICENSE: ['Copyright (c) 2020 Meta', '', ...isc].join('\n'), 'a.js': '// Copyright (c) 2019 Autre\n// MIT license\n' } };
      const p = fabriquer({ paquets: { meta: paquet }, web: ['/node_modules/meta/a.js'], android: [] });

      expect(lancer(p).code).toBe(0);
      const donnees = donneesEcrites(p);
      expect(donnees.textes.map((t) => t.id)).toEqual(['ISC']);
      expect(donnees.paquets[0].avisRepris).toEqual(['Copyright (c) 2019 Autre']);
    });

    it('ne regarde pas la licence d’un avis qu’il ne reprend pas', () => {
      // Même titulaire que le paquet : l'avis n'est pas repris, la licence dont il parle n'est donc pas examinée.
      const entree = entreeDe(meta({ 'a.js': '// Copyright (c) 2021 Meta Platforms, Inc.\n// Released under the GPL.\n' }), ['a.js']);

      expect(entree?.avisRepris).toBeUndefined();
    });
  });

  describe('refuse de deviner', () => {
    const refus = (f: Fabrique, extra: string[] = []) => {
      const p = fabriquer(f);
      const r = lancer(p, extra);
      return { ...r, ecrit: fs.existsSync(p.sortie) };
    };

    it('une licence déclarée dont le texte n’est pas celui-là', () => {
      const r = refus({
        paquets: { alpha: { package: pj('alpha', '1.0.0', 'Apache-2.0'), fichiers: { LICENSE: mit('Copyright (c) A') } } },
        web: sources('alpha'),
        android: [],
      });

      expect(r.code).toBe(1);
      expect(r.erreur).toMatch(/alpha@1\.0\.0.*ne ressemble pas à la licence Apache-2\.0/);
      expect(r.ecrit).toBe(false);
    });

    it('un paquet qui ne déclare aucune licence', () => {
      const r = refus({ paquets: { alpha: { package: pj('alpha', '1.0.0', null), fichiers: { LICENSE: mit('Copyright (c) A') } } }, web: sources('alpha'), android: [] });

      expect(r.code).toBe(1);
      expect(r.erreur).toMatch(/alpha@1\.0\.0 : le package\.json ne déclare aucune licence/);
    });

    it('une licence qu’il ne connaît pas', () => {
      const r = refus({ paquets: { alpha: { package: pj('alpha', '1.0.0', 'WTFPL'), fichiers: { LICENSE: 'Do what you want.\n' } } }, web: sources('alpha'), android: [] });

      expect(r.code).toBe(1);
      expect(r.erreur).toMatch(/« WTFPL » n’est pas prise en charge/);
    });

    it('une expression de licences, qu’il ne tranche pas', () => {
      const r = refus({ paquets: { alpha: { package: pj('alpha', '1.0.0', '(MIT OR Apache-2.0)'), fichiers: { LICENSE: mit('Copyright (c) A') } } }, web: sources('alpha'), android: [] });

      expect(r.code).toBe(1);
      expect(r.erreur).toMatch(/« MIT OR Apache-2\.0 » est une expression/);
    });

    it('un fichier NOTICE, que la licence demande de reproduire et que l’écran ne sait pas montrer', () => {
      const r = refus({
        paquets: { alpha: { package: pj('alpha', '1.0.0'), fichiers: { LICENSE: mit('Copyright (c) A'), NOTICE: 'Ce produit contient du code de X.\n' } } },
        web: sources('alpha'),
        android: [],
      });

      expect(r.code).toBe(1);
      expect(r.erreur).toMatch(/alpha@1\.0\.0 : un fichier NOTICE/);
    });

    it('un fichier de licence sous un nom qu’il ne sait pas lire', () => {
      const r = refus({ paquets: { alpha: { package: pj('alpha', '1.0.0'), fichiers: { 'LICENSE-MIT': mit('Copyright (c) A') } } }, web: sources('alpha'), android: [] });

      expect(r.code).toBe(1);
      expect(r.erreur).toMatch(/« LICENSE-MIT » ressemble à une licence/);
    });

    it('une licence déclarée dont aucun paquet n’apporte le texte', () => {
      const r = refus({ paquets: { alpha: { package: pj('alpha', '1.0.0', 'ISC') } }, web: sources('alpha'), android: [] });

      expect(r.code).toBe(1);
      expect(r.erreur).toMatch(/la licence ISC est déclarée, mais ni lui ni aucun autre paquet n’en apporte le texte/);
    });

    it('un sous-dossier qui porte une licence sans dire de quel paquet il s’agit', () => {
      // Lui prêter la licence de l'hôte, ou une identité, serait attribuer à quelqu'un du code qu'il n'a pas écrit.
      const r = refus({
        paquets: {
          hote: {
            package: pj('hote', '5.0.0'),
            fichiers: { LICENSE: mit('Copyright (c) 2020 Hote'), 'vendor/copie/LICENSE': apache('Copyright 2018 Les auteurs de Copie'), 'vendor/copie/package.json': '{ "type": "module" }', 'vendor/copie/lib/index.js': '' },
          },
        },
        web: ['/node_modules/hote/vendor/copie/lib/index.js'],
        android: [],
      });

      expect(r.code).toBe(1);
      expect(r.erreur).toMatch(/hote@5\.0\.0, vendor\/copie : le dossier porte un fichier de licence \(LICENSE\).*aucun package\.json/);
      expect(r.ecrit).toBe(false);
    });

    it('un sous-dossier dont le fichier de licence a un nom qu’il ne sait pas lire', () => {
      const r = refus({
        paquets: { hote: { package: pj('hote', '5.0.0'), fichiers: { LICENSE: mit('Copyright (c) 2020 Hote'), 'vendor/copie/LICENSE-MIT': mit('Copyright (c) 2021 Copie'), 'vendor/copie/lib/index.js': '' } } },
        web: ['/node_modules/hote/vendor/copie/lib/index.js'],
        android: [],
      });

      expect(r.code).toBe(1);
      expect(r.erreur).toMatch(/hote@5\.0\.0, vendor\/copie : « LICENSE-MIT » ressemble à une licence/);
    });

    describe('un avis repris qui renvoie à une licence', () => {
      const alphaMit = { package: pj('alpha', '1.0.0'), fichiers: { LICENSE: mit('Copyright (c) 2020 Alpha'), 'index.js': '' } };
      const avecFichier = (contenu: string): Fabrique => ({
        paquets: { alpha: alphaMit, meta: { package: pj('meta', '1.0.0'), fichiers: { LICENSE: mit('Copyright (c) 2020 Meta'), 'a.js': contenu } } },
        web: ['/node_modules/alpha/index.js', '/node_modules/meta/a.js'],
        android: [],
      });

      it('que la page ne reproduit pas', () => {
        const r = refus(avecFichier('/**\n * Copyright (c) 2019 Autre Auteur\n * Licensed under the Apache License, Version 2.0\n */\n'));

        expect(r.code).toBe(1);
        expect(r.erreur).toMatch(/meta@1\.0\.0 : le fichier « a\.js » porte l’avis « Copyright \(c\) 2019 Autre Auteur » et renvoie à la licence Apache-2\.0, que la page ne reproduit pas/);
        expect(r.ecrit).toBe(false);
      });

      it('dont le bloc recopie le texte sans la nommer', () => {
        const bsd3 = [
          'Copyright (c) 2019 Autre Auteur',
          '',
          'Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:',
          'Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software.',
        ];
        const r = refus(avecFichier(`/*\n${bsd3.map((ligne) => ` * ${ligne}`.trimEnd()).join('\n')}\n */\n`));

        expect(r.code).toBe(1);
        expect(r.erreur).toMatch(/meta@1\.0\.0 : le fichier « a\.js » .* renvoie à la licence BSD-3-Clause, que la page ne reproduit pas/);
      });

      it('que le script ne sait pas lire', () => {
        const r = refus(avecFichier('// Copyright (c) 2019 Autre Auteur\n// Released under the GPL v3.\n'));

        expect(r.code).toBe(1);
        expect(r.erreur).toMatch(/meta@1\.0\.0 : le fichier « a\.js » .* renvoie à « GPL », une licence que le script ne sait pas lire/);
        expect(r.ecrit).toBe(false);
      });

      it('nommée « BSD » sans dire laquelle : il ne choisit pas entre deux et trois clauses', () => {
        const r = refus(avecFichier('// Copyright (c) 2019 Autre Auteur\n// BSD licensed.\n'));

        expect(r.code).toBe(1);
        expect(r.erreur).toMatch(/renvoie à « BSD », une licence que le script ne sait pas lire/);
      });
    });

    it('une police sans fichier LICENSE_FONT', () => {
      const r = refus({
        paquets: { fonte: { package: pj('fonte', '0.4.0', 'MIT AND OFL-1.1'), fichiers: { LICENSE: mit('Copyright (c) E'), '400/F.ttf': police('Copyright 2021 X', 'Fonte') } } },
        web: ['/node_modules/fonte/400/F.ttf'],
        android: [],
      });

      expect(r.code).toBe(1);
      expect(r.erreur).toMatch(/fonte@0\.4\.0 : la police « 400\/F\.ttf » est embarquée, mais le paquet n’a pas de fichier LICENSE_FONT/);
    });

    it('un export fait sans cartes de sources pour une plateforme', () => {
      const r = refus({ paquets: { alpha: { package: pj('alpha', '1.0.0'), fichiers: { LICENSE: mit('Copyright (c) A') } } }, web: sources('alpha') });

      expect(r.code).toBe(1);
      expect(r.erreur).toMatch(/Aucune carte de sources pour « android »/);
    });

    it('un paquet qu’une carte nomme et qui n’est pas là', () => {
      const r = refus({ paquets: {}, web: sources('disparu'), android: [] });

      expect(r.code).toBe(1);
      expect(r.erreur).toMatch(/« disparu » .* est nommé par une carte de sources, mais son dossier est introuvable/);
    });

    it('un essai sans l’autolinking qui écrirait le fichier engagé', () => {
      const p = fabriquer({ paquets: {}, web: [], android: [] });
      const r = spawnSync(process.execPath, [script, '--racine', p.dossier, '--depuis', p.exportDir, '--sans-natif'], { encoding: 'utf8' });

      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/--sans-natif exige --sortie/);
      expect(fs.existsSync(path.join(p.dossier, 'src', 'constants', 'licences.ts'))).toBe(false);
    });
  });

  describe('--verifier', () => {
    const fabriquerEtEcrire = () => {
      const p = fabriquer({
        dependencies: ['alpha'],
        paquets: { alpha: { package: pj('alpha', '1.0.0'), fichiers: { LICENSE: mit('Copyright (c) 2020 Alpha') } } },
        web: sources('alpha'),
        android: sources('alpha'),
      });
      expect(lancer(p).code).toBe(0);
      return p;
    };

    it('passe quand le fichier dit exactement ce que le bundle contient — la date exceptée', () => {
      const p = fabriquerEtEcrire();
      fs.writeFileSync(p.sortie, fs.readFileSync(p.sortie, 'utf8').replace('"genereLe": "2026-10-22"', '"genereLe": "2025-01-01"'));

      const r = lancer(p, ['--verifier']);

      expect(r.code).toBe(0);
      expect(r.sortie).toMatch(/dit exactement ce que le bundle contient/);
    });

    it('rougit, en nommant le paquet, quand une version a changé', () => {
      const p = fabriquerEtEcrire();
      fs.writeFileSync(p.sortie, fs.readFileSync(p.sortie, 'utf8').replace('"version":"1.0.0"', '"version":"0.9.0"'));

      const r = lancer(p, ['--verifier']);

      expect(r.code).toBe(1);
      expect(r.erreur).toMatch(/manque dans le fichier : alpha@1\.0\.0/);
      expect(r.erreur).toMatch(/en trop dans le fichier : alpha@0\.9\.0/);
    });

    it('rougit quand un paquet de plus entre dans le bundle', () => {
      const p = fabriquerEtEcrire();
      fs.mkdirSync(path.join(p.dossier, 'node_modules', 'beta'), { recursive: true });
      fs.writeFileSync(path.join(p.dossier, 'node_modules', 'beta', 'package.json'), JSON.stringify(pj('beta', '1.0.0')));
      fs.writeFileSync(path.join(p.dossier, 'node_modules', 'beta', 'LICENSE'), mit('Copyright (c) B'));
      const carte = path.join(p.exportDir, '_expo', 'static', 'js', 'android', 'entry-0.js.map');
      fs.writeFileSync(carte, JSON.stringify({ sources: [...sources('alpha'), ...sources('beta')] }));

      const r = lancer(p, ['--verifier']);

      expect(r.code).toBe(1);
      expect(r.erreur).toMatch(/manque dans le fichier : beta@1\.0\.0/);
    });

    it('n’écrit rien', () => {
      const p = fabriquerEtEcrire();
      const avant = fs.readFileSync(p.sortie, 'utf8');
      lancer(p, ['--verifier']);

      expect(fs.readFileSync(p.sortie, 'utf8')).toBe(avant);
    });
  });
});

/**
 * ## Mutations
 *
 * Éprouvé en cassant ce qu'il garde, le 22/10/2026 : chaque mutation est un remplacement exact, défait en
 * **réécrivant l'état d'avant** depuis une copie (jamais par un second remplacement), et la suite entière est
 * rejouée à chaque fois (33 tests). Les noms sont ceux des tests.
 *
 * **Le script** (seize mutations de `scripts/generer-les-licences.mjs`) :
 * - le dernier `node_modules/` d'un chemin lu comme le premier → 1 tombe, « distingue un paquet imbriqué… » ;
 * - le titre d'une licence jamais retiré → 1 tombe, « range une licence une seule fois… » ;
 * - l'exclusion « Copyright notice » du motif d'avis retirée → 1 tombe, « …fait commencer par “Copyright
 *   notice” ». **Le cas « COPYRIGHT HOLDERS BE LIABLE » est tenu par deux couches** : la casse du motif, et
 *   cette exclusion. Retirer l'exclusion seule laisse son test vert, la casse suffisant ; retirer les deux
 *   (le motif insensible à la casse, sans l'exclusion) fait tomber 3 tests, dont le sien ;
 * - le contrôle d'un fichier NOTICE retiré → 1 tombe ; la reconnaissance du texte (« ne ressemble pas à la
 *   licence déclarée ») retirée → 1 tombe ;
 * - la licence d'une police cherchée parmi toutes (l'OFL contient la phrase d'ouverture de la MIT, qui la
 *   ferait lire MIT) → 1 tombe, « lit la police et son avis… » ;
 * - les dépendances écartées jamais relevées → 1 tombe ; `--sans-natif` permis sans `--sortie` → 1 tombe ;
 * - les intitulés en capitales de l'OFL collés à la phrase suivante → 1 tombe, celui de la police ;
 * - `--verifier` qui ne relève plus aucun écart → 2 tombent (version changée, paquet de plus) ; qui compare
 *   aussi la date → 1 tombe, « …la date exceptée » ;
 * - le repli sur le `node_modules` du projet retiré → 1 tombe ;
 * - les textes regroupés par licence seule, sans leur corps → 4 tombent, dont « garde à part un texte
 *   réellement différent… » ; les avis jamais relevés → 3 tombent ; l'avis de la police pris ailleurs que
 *   dans son fichier → 1 tombe.
 *
 * **Le fichier généré contre le dépôt** (dix mutations) :
 * - `expo-notifications` retirée du fichier → 2 tombent, « connaît chaque dépendance… » et « liste chaque
 *   bibliothèque que le code de l'application importe » ;
 * - une dépendance neuve dans `package.json` (`left-pad`) → 1 tombe, la première ;
 * - un `import 'playwright'` dans le code de l'application → 1 tombe, « liste chaque bibliothèque… » ;
 * - `react` listée à une autre version que le verrou → 1 tombe, « ne cite que des paquets que
 *   package-lock.json connaît… » ; une licence changée contre le verrou → 1 tombe, la même ;
 * - `satori` retirée des dépendances écartées → 1 tombe, « connaît chaque dépendance… » ;
 * - `@supabase/supabase-js` déplacée parmi les écartées, alors que le code l'importe → 1 tombe, « liste chaque
 *   bibliothèque… » (le message dit « écartée du fichier des licences, et … l'importe ») ;
 * - un texte que rien n'emploie → 1 tombe, « est cohérent… » ;
 * - le relevé des imports qui ne lit plus rien (`paquetDuSpecifieur` rend toujours `null`) → 2 tombent, la
 *   lecture des genres d'import et « ne se laisse pas lire à vide » — **c'est ce second test qui garde les
 *   autres** : sans lui, la garde passerait sur une application qui n'importerait rien ;
 * - le relevé remplacé par une expression régulière nue, qui lit aussi les commentaires → 1 tombe, « lit tous
 *   les genres d'import, et pas les commentaires ».
 *
 * ## Mutations, deuxième passage (22/10/2026, contre-lecture de l'écran `/licences`)
 *
 * Même méthode, et la suite jouée avec celle de `src/types/licences.test.ts` : **80 tests (57 + 23)**. Une mutation
 * du script qui doit changer le fichier engagé est jouée **avec le fichier régénéré** par le script muté : les
 * gardes du fichier généré lisent l'artefact, et muter la source sans lui ne les atteint pas. Les noms sont ceux
 * des tests ; chaque mutation en a fait tomber au moins un.
 *
 * **Les défauts relevés** :
 * - `(c) ` seul repris comme avis (le motif d'avant) → 7 tombent : les trois gardes du fichier régénéré (« reproduit
 *   l'Apache 2.0 avec les quatre repères… », « liste react-helmet-async à part… », « garde chaque ligne du fichier
 *   de licence… ») et quatre essais sur l'arbre fabriqué. **Le motif que la contre-lecture proposait,
 *   `\(c\)\s*(\d|[A-Z])`, tombe de la même façon (7)** : « You » commence par une majuscule, donc la clause 4(c)
 *   reste prise pour un avis ; seule l'année la distingue, et aucun fichier de licence installé ne porte un « (c) »
 *   d'avis sans le mot « Copyright » ou une année ;
 * - le fichier engagé d'avant ce passage (celui du commit `dfb90b4`) → 3 tombent, les trois gardes du fichier
 *   régénéré ;
 * - l'emplacement vide de l'appendice Apache conservé dans le texte → 2 tombent (« range une seule fois l'Apache… »
 *   et « liste react-helmet-async… », dont le texte devient une « autre rédaction ») ; pris pour l'avis du paquet
 *   (`estUnAvis` qui ne regarde plus les emplacements) → 2 tombent.
 *
 * **Les copies** :
 * - `copieDansLePaquet` qui rend toujours `null` → 8 tombent (le fichier régénéré perd `react-helmet-async`, et six
 *   essais fabriqués) ; le sous-dossier le plus éloigné au lieu du plus proche → 1 ; une licence sans identité
 *   acceptée → 1 ; une façade `{ "type": "module" }` prise pour un paquet → 2 ; l'hôte qui n'est plus listé quand
 *   seul un fichier de la copie entre dans le bundle → 2 ; `dans` jamais écrit → 3 ; un nom de licence illisible
 *   dans un sous-dossier sans le refus → 1 ;
 * - le fichier engagé dont `dans` pointe un paquet absent → 3 (« ne cite en “dans” qu'un paquet qu'il liste
 *   lui-même », la copie, et la lecture de ses fichiers).
 *
 * **L'avis lu hors de la licence** : un avis pris hors d'un commentaire → 1 ; l'en-tête sans limite de lignes → 1,
 * sans limite d'octets → 1 ; les fichiers pris dans l'ordre de la carte et non l'ordre alphabétique → 1 ; les
 * fichiers du paquet que le bundle ne contient pas lus aussi → 1 ; l'auteur jamais donné → 1, donné avec son
 * adresse → 1 ; les sources ignorées quand le fichier de licence existe → 1 ; préférées à l'avis de la licence → 1 ;
 * l'auteur préféré aux sources → 1.
 *
 * **Le texte de chaque licence** (le fichier engagé amputé d'une phrase, un type après l'autre) : MIT, ISC, 0BSD,
 * BSD à deux et à trois clauses, OFL (un intitulé) → 1 tombe à chaque fois, « garde chaque ligne du fichier de
 * licence… » ; l'Apache privé de son repère « (d) » → 2.
 *
 * **La mise en page** (`src/types/licences.test.ts`) : l'ancienne phrase de repli (« Ce paquet ne donne pas de ligne
 * de copyright ») → 1 ; l'ancienne introduction → 2 ; une introduction sans renvoi à la dernière section → 1 ; la
 * nuance mise hors de la phrase qui dit ce que la page liste → 1 ; `termeDuPaquet` qui oublie la copie → 1.
 *
 * **Ce que rien d'ici n'éprouve** : l'autolinking (`--sans-natif` dans tous les essais), qui ne se joue que sur
 * le dépôt réel — par `node scripts/generer-les-licences.mjs`, qui l'a utilisé pour écrire le fichier engagé,
 * et par `--verifier` ; l'export lui-même, qui est la commande d'Expo ; et que `package_original.json` soit le
 * nom que toute copie d'Expo donne à son identité — la convention est lue sur un seul cas (`expo-router`), le
 * script refuse une copie dont il ne trouve pas l'identité plutôt que de la deviner.
 */
