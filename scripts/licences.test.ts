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
 *     doublon.
 * **Ce qu'elle ne voit pas**, et que seul `node scripts/generer-les-licences.mjs --verifier` voit, en relisant les
 * cartes de sources du bundle : une dépendance **transitive** qui entre dans le bundle sans que rien dans
 * `package.json` ni dans `src/` ne l'ait demandé (une montée d'`expo-router` qui tire un paquet de plus) — le
 * verrou ne la signale que si elle n'y était pas déjà. `--verifier` n'est pas dans la CI : il exporte deux
 * plateformes (deux minutes), et la CI d'avant-vente n'a pas d'autre raison de le faire. À brancher, si la
 * personne qui pilote le veut, dans `.github/workflows/ci.yml` et `scripts/rejouer-la-ci.mjs`.
 *
 * **2. Le script contre un arbre fabriqué** — le générateur est joué sur de petits projets, en entier, par
 * `--depuis` : les cartes de sources, les paquets imbriqués, les avis de copyright, les textes rangés une fois
 * par type, la police et son avis lus dans le fichier de police, et tout ce qu'il refuse de deviner.
 *
 * Éprouvé en cassant ce qu'il garde, le 22/10/2026 — voir « Mutations » en bas du fichier.
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
    for (const { nom, version, licence } of [...LICENCES.paquets, ...LICENCES.polices.map((p) => ({ nom: p.paquet, version: '', licence: p.licence }))]) {
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

    exiger(problemes, REGENERER);
  });

  it('porte la police du produit avec son avis et la licence OFL', () => {
    const spline = LICENCES.polices.find((police) => police.nom === 'Spline Sans');

    expect(spline?.copyright).toMatch(/Spline Sans Project Authors/);
    expect(spline?.licence).toBe('OFL-1.1');
    expect(LICENCES.textes.find((texte) => texte.id === spline?.texte)?.paragraphes.join(' ')).toMatch(/SIL OPEN FONT LICENSE/);
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
 * **Ce que rien d'ici n'éprouve** : l'autolinking (`--sans-natif` dans tous les essais), qui ne se joue que sur
 * le dépôt réel — par `node scripts/generer-les-licences.mjs`, qui l'a utilisé pour écrire le fichier engagé,
 * et par `--verifier` ; et l'export lui-même, qui est la commande d'Expo.
 */
