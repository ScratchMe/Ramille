/**
 * La mise en page de l'écran `/licences` : ce que le fichier généré devient comme sections de page légale.
 *
 * Ce que ces tests gardent, et que ni le typecheck ni la garde du fichier généré (`scripts/licences.test.ts`)
 * ne voient : **une licence est reproduite une seule fois**, quel que soit le nombre de bibliothèques qui la
 * portent — c'est ce qui tient le bundle web à quelques dizaines d'octets par bibliothèque au lieu de mille ;
 * chaque section porte la liste de ses bibliothèques avant son texte ; la plateforme se dit quand ce n'est
 * pas « les deux » ; un paquet sans avis de copyright le dit au lieu de s'afficher sans rien ; et la page ne
 * passe jamais pour complète — sa dernière section dit ce qu'elle ne liste pas. `LegalPage` prend le titre
 * d'une section et le terme d'une définition pour clés React : un doublon, sur les vraies données, ferait
 * perdre une ligne sans une erreur.
 *
 * Éprouvé en cassant ce qu'il garde, le 22/10/2026 (six mutations, chacune défaite en réécrivant l'état
 * d'avant ; 17 tests) :
 * - le texte de la licence recopié sous chaque bibliothèque → 2 tombent : « reproduit chaque licence une
 *   seule fois » et « ne reproduit pas la licence MIT à chaque bibliothèque », sur les vraies données ;
 * - la marque de plateforme retirée du terme (`marqueDeLaPlateforme` rend toujours une chaîne vide) → 2
 *   tombent : le terme d'une bibliothèque Android, et celui d'une police ;
 * - la phrase de ce qui n'est pas listé retirée → 2 tombent : l'ordre des sections et « dit ce qu’elle ne
 *   liste pas » ;
 * - les licences de police placées avant les bibliothèques → 1 tombe, « range les licences de police après
 *   celles des bibliothèques » ;
 * - le repli « pas de ligne de copyright » rendu vide → 1 tombe, « dit qu’un paquet ne donne pas de ligne
 *   de copyright » ;
 * - la date lue par `toLocaleDateString` → 1 tombe, « écrit la date en mots sans passer par l’ICU »
 *   (un `Date` local en UTC−x donne la veille ; ce test n'en attrape que la forme, voir son commentaire).
 */
import { LICENCES } from '@/constants/licences';
import {
  dateEnMots,
  introDesLicences,
  LIMITE_DE_LA_LISTE,
  SANS_COPYRIGHT,
  sectionsDesLicences,
  termeDuPaquet,
  type BlocDeLicences,
  type DonneesDesLicences,
} from '@/types/licences';

// Un petit jeu, écrit pour que chaque branche existe : deux bibliothèques sous MIT dont une sans avis et
// Android seule, une sous ISC et web seule, une police sous OFL — dont le texte est listé **avant** celui de
// l'ISC, pour voir l'ordre se refaire.
const PETIT: DonneesDesLicences = {
  genereLe: '2026-10-22',
  paquets: [
    { nom: 'alpha', version: '1.0.0', licence: 'MIT', texte: 'MIT', copyright: 'Copyright (c) 2020 Alpha', sur: 'les deux' },
    { nom: 'beta', version: '2.1.0', licence: 'MIT', texte: 'MIT', copyright: null, sur: 'android' },
    { nom: 'gamma', version: '0.3.0', licence: 'ISC', texte: 'ISC', copyright: 'Copyright (c) Gamma', sur: 'web' },
  ],
  polices: [{ nom: 'Fonte', copyright: 'Copyright 2021 Les auteurs de Fonte', licence: 'OFL-1.1', texte: 'OFL-1.1', paquet: 'fonte-pkg', sur: 'android' }],
  textes: [
    { id: 'MIT', nom: 'Licence MIT', paragraphes: ['Texte MIT, un.', 'Texte MIT, deux.'] },
    { id: 'OFL-1.1', nom: 'SIL Open Font License 1.1', paragraphes: ['Texte OFL.'] },
    { id: 'ISC', nom: 'Licence ISC', paragraphes: ['Texte ISC.'] },
  ],
  ecartes: [],
};

const textesDe = (blocs: BlocDeLicences[]) => blocs.flatMap((bloc) => (bloc.kind === 'paragraph' ? [bloc.text] : []));
const tousLesTextes = (donnees: DonneesDesLicences) => sectionsDesLicences(donnees).flatMap((section) => textesDe(section.blocks));
const compter = (liste: string[], texte: string) => liste.filter((t) => t === texte).length;

describe('sectionsDesLicences', () => {
  it('range les sections : la police, une section par licence, puis ce que la page ne liste pas', () => {
    expect(sectionsDesLicences(PETIT).map((section) => section.heading)).toEqual([
      'Police',
      'Licence MIT',
      'Licence ISC',
      'SIL Open Font License 1.1',
      'Ce que cette page ne liste pas',
    ]);
  });

  it('range les licences de police après celles des bibliothèques', () => {
    // Dans `PETIT.textes`, l'OFL précède l'ISC : sans ce rangement, une licence de police couperait la liste.
    const titres = sectionsDesLicences(PETIT).map((section) => section.heading);
    expect(titres.indexOf('SIL Open Font License 1.1')).toBeGreaterThan(titres.indexOf('Licence ISC'));
  });

  it('nomme chaque bibliothèque avec sa version, et sa plateforme quand elle n’est pas partout', () => {
    const mit = sectionsDesLicences(PETIT).find((section) => section.heading === 'Licence MIT');
    const definitions = mit?.blocks[0];
    expect(definitions).toEqual({
      kind: 'definitions',
      items: [
        { term: 'alpha 1.0.0', text: 'Copyright (c) 2020 Alpha' },
        { term: 'beta 2.1.0 (Android)', text: SANS_COPYRIGHT },
      ],
    });
    expect(termeDuPaquet({ nom: 'gamma', version: '0.3.0', sur: 'web' })).toBe('gamma 0.3.0 (web)');
  });

  it('dit qu’un paquet ne donne pas de ligne de copyright, au lieu de n’afficher rien', () => {
    expect(SANS_COPYRIGHT.length).toBeGreaterThan(0);
    const mit = sectionsDesLicences(PETIT).find((section) => section.heading === 'Licence MIT');
    const items = mit?.blocks[0].kind === 'definitions' ? mit.blocks[0].items : [];
    expect(items.map((item) => item.text)).toContain(SANS_COPYRIGHT);
  });

  it('reproduit chaque licence une seule fois, quel que soit le nombre de bibliothèques qui la portent', () => {
    const textes = tousLesTextes(PETIT);
    expect(compter(textes, 'Texte MIT, un.')).toBe(1);
    expect(compter(textes, 'Texte MIT, deux.')).toBe(1);
    expect(compter(textes, 'Texte ISC.')).toBe(1);
  });

  it('met la liste avant le texte, et dit que le texte vaut pour toute la liste', () => {
    const mit = sectionsDesLicences(PETIT).find((section) => section.heading === 'Licence MIT');
    expect(mit?.blocks.map((bloc) => bloc.kind)).toEqual(['definitions', 'paragraph', 'paragraph', 'paragraph']);
    expect(textesDe(mit?.blocks ?? [])[0]).toMatch(/chaque bibliothèque ci-dessus/);
  });

  it('nomme la police avec sa licence et son avis, et renvoie à son texte', () => {
    const police = sectionsDesLicences(PETIT)[0];
    expect(police.blocks).toEqual([
      {
        kind: 'definitions',
        items: [
          {
            term: 'Fonte (Android)',
            text: 'Licence : SIL Open Font License 1.1, dont le texte figure plus bas. Copyright 2021 Les auteurs de Fonte',
          },
        ],
      },
    ]);
    const ofl = sectionsDesLicences(PETIT).find((section) => section.heading === 'SIL Open Font License 1.1');
    expect(textesDe(ofl?.blocks ?? [])).toEqual(['Le texte de cette licence s’applique à la police ci-dessus :', 'Texte OFL.']);
  });

  it('accorde « police » et « polices » avec leur nombre', () => {
    const deux: DonneesDesLicences = {
      ...PETIT,
      polices: [...PETIT.polices, { nom: 'Autre', copyright: null, licence: 'OFL-1.1', texte: 'OFL-1.1', paquet: 'autre-pkg', sur: 'les deux' }],
    };
    const sections = sectionsDesLicences(deux);
    expect(sections[0].heading).toBe('Polices');
    const ofl = sections.find((section) => section.heading === 'SIL Open Font License 1.1');
    expect(textesDe(ofl?.blocks ?? [])[0]).toBe('Le texte de cette licence s’applique aux polices ci-dessus :');
    expect(sectionsDesLicences(PETIT)[0].heading).toBe('Police');
  });

  it('n’ouvre pas de section de police quand il n’y en a pas', () => {
    const sans: DonneesDesLicences = { ...PETIT, polices: [], textes: PETIT.textes.filter((texte) => texte.id !== 'OFL-1.1') };
    expect(sectionsDesLicences(sans).map((section) => section.heading)).toEqual(['Licence MIT', 'Licence ISC', 'Ce que cette page ne liste pas']);
  });

  it('ne fait pas de section d’un texte que personne n’emploie', () => {
    const orphelin: DonneesDesLicences = { ...PETIT, textes: [...PETIT.textes, { id: 'X', nom: 'Licence orpheline', paragraphes: ['Jamais montré.'] }] };
    expect(sectionsDesLicences(orphelin).map((section) => section.heading)).not.toContain('Licence orpheline');
    expect(tousLesTextes(orphelin)).not.toContain('Jamais montré.');
  });

  it('dit ce qu’elle ne liste pas, en dernier', () => {
    const sections = sectionsDesLicences(PETIT);
    const derniere = sections[sections.length - 1];
    expect(derniere.heading).toBe('Ce que cette page ne liste pas');
    expect(derniere.blocks).toEqual([{ kind: 'paragraph', text: LIMITE_DE_LA_LISTE }]);
    expect(LIMITE_DE_LA_LISTE).toMatch(/AndroidX/);
    expect(LIMITE_DE_LA_LISTE).toMatch(/n’est pas établie/);
  });
});

describe('sectionsDesLicences — sur les vraies données', () => {
  const sections = sectionsDesLicences(LICENCES);

  it('n’a ni deux sections ni deux lignes de même clé : `LegalPage` les prend pour clés React', () => {
    const titres = sections.map((section) => section.heading);
    expect(titres.length).toBe(new Set(titres).size);
    const termes = sections.flatMap((section) => section.blocks.flatMap((bloc) => (bloc.kind === 'definitions' ? bloc.items.map((item) => item.term) : [])));
    expect(termes.length).toBe(new Set(termes).size);
  });

  it('ne reproduit pas la licence MIT à chaque bibliothèque', () => {
    const textes = sections.flatMap((section) => textesDe(section.blocks));
    // « of this software » : l'OFL ouvre sa permission de la même façon, pour « the Font Software ».
    expect(textes.filter((t) => t.startsWith('Permission is hereby granted, free of charge, to any person obtaining a copy of this software')).length).toBe(1);
    expect(textes.filter((t) => t.startsWith('THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY')).length).toBe(1);
  });

  it('liste la police du produit avec son avis et sa licence, dont le texte est dans la page', () => {
    const police = sections.find((section) => section.heading === 'Polices' || section.heading === 'Police');
    const items = police?.blocks[0].kind === 'definitions' ? police.blocks[0].items : [];
    const spline = items.find((item) => item.term.startsWith('Spline Sans'));
    expect(spline?.text).toMatch(/Copyright .* The Spline Sans Project Authors/);
    expect(spline?.text).toMatch(/SIL Open Font License 1\.1/);
    const ofl = sections.find((section) => section.heading === 'SIL Open Font License 1.1');
    expect(textesDe(ofl?.blocks ?? []).some((t) => t.startsWith('SIL OPEN FONT LICENSE Version 1.1'))).toBe(true);
  });

  it('commence par ses bibliothèques sous MIT, la licence la plus employée', () => {
    expect(sections.map((section) => section.heading)[1]).toBe('Licence MIT');
  });
});

describe('introDesLicences', () => {
  it('rappelle la licence du code de Ramille avant de dire ce que la page liste', () => {
    const intro = introDesLicences('Ramille');
    expect(intro.indexOf('AGPL-3.0-or-later')).toBeGreaterThan(-1);
    expect(intro.indexOf('Ramille')).toBeLessThan(intro.indexOf('Cette page liste'));
    expect(intro).toMatch(/embarque d’autres auteurs/);
  });
});

describe('dateEnMots', () => {
  it('écrit la date en mots sans passer par l’ICU, en lisant ses caractères', () => {
    // Hermes peut être construit sans ICU complet (`EXPO.md` §1.8) : `toLocaleDateString('fr-FR')` rendrait un
    // mois en anglais sur l'appareil, et cette suite, qui tourne sous Node, ne le verrait pas. Ce test n'en
    // garde donc que la forme : la valeur attendue est écrite, et rien ici n'appelle `Date`.
    expect(dateEnMots('2026-10-22')).toBe('22 octobre 2026');
    expect(dateEnMots('2026-12-31')).toBe('31 décembre 2026');
    expect(dateEnMots('2027-02-07')).toBe('7 février 2027');
  });

  it('écrit « 1er » le premier du mois, la seule irrégularité', () => {
    expect(dateEnMots('2026-11-01')).toBe('1er novembre 2026');
  });

  it('rend la chaîne telle quelle plutôt qu’une date inventée', () => {
    expect(dateEnMots('hier')).toBe('hier');
    expect(dateEnMots('2026-13-01')).toBe('2026-13-01');
    expect(dateEnMots('2026-00-10')).toBe('2026-00-10');
  });
});
