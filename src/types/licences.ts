// Logique pure de l'écran `/licences` : ce que le fichier généré dit, rangé en sections de page légale.
//
// Séparé de l'écran comme `src/types/bilan.ts` et `src/types/suivi.ts` : la page se relit et se teste sans
// `react-native`, et ses règles (une licence = un texte, une section par texte, aucune fausse
// complétude) sont des dérivations affichées à la personne, donc testées (`TESTING.md` §2.1).
//
// **Les données ne s'écrivent pas ici.** `src/constants/licences.ts` est généré par
// `scripts/generer-les-licences.mjs` à partir de ce que les bundles web et Android et le code natif
// contiennent vraiment ; la méthode et ce qu'elle ne couvre pas sont en tête de ce script. Ce module ne
// fait que mettre ces données en page — il ne trie rien, l'ordre est celui du fichier.
//
// **Ce que la page promet, et ce qu'elle ne promet pas.** Elle liste ce que l'application embarque et dont
// la licence demande qu'on reproduise un avis : les bibliothèques JavaScript des deux bundles, le code
// natif que l'autolinking compile, les polices. Elle ne liste **pas** les composants Android que Gradle
// tire à la compilation (AndroidX, Kotlin, Firebase…) : ils ne sont pas dans le dépôt, et la page le dit
// (`LIMITE_DE_LA_LISTE`) plutôt que de passer pour complète.

import { MOIS_FRANCAIS, jourDuMois } from '@/types/checkin';

/** Où l'on trouve la bibliothèque : dans les deux bundles, ou d'un seul côté. */
export type SurQuoi = 'web' | 'android' | 'les deux';

export type PaquetLicencie = {
  nom: string;
  version: string;
  /** L'identifiant SPDX que déclare le `package.json`, tel quel (`MIT`, `ISC`…). */
  licence: string;
  /** L'identifiant du texte reproduit plus bas : celui de la licence, ou une « autre rédaction ». */
  texte: string;
  /** La ligne d'avis du paquet, à la lettre, ou `null` quand il n'en donne pas. */
  copyright: string | null;
  sur: SurQuoi;
};

export type PoliceLicenciee = {
  nom: string;
  copyright: string | null;
  licence: string;
  texte: string;
  /** Le paquet npm qui porte la police. */
  paquet: string;
  sur: SurQuoi;
};

export type TexteDeLicence = {
  id: string;
  /** Le nom de la licence, qui titre sa section (« Licence MIT »). */
  nom: string;
  paragraphes: string[];
};

export type DonneesDesLicences = {
  /** AAAA-MM-JJ : le jour où le fichier a été généré. */
  genereLe: string;
  paquets: PaquetLicencie[];
  polices: PoliceLicenciee[];
  textes: TexteDeLicence[];
  /** Les dépendances directes de `package.json` que le script a regardées et qui n'entrent nulle part. */
  ecartes: string[];
};

// Les mêmes formes que `LegalBlock` et `LegalSection` (`src/components/legal/legal-page.tsx`), sans
// l'importer : ce module est pur, et la page légale tire `react-native`.
export type BlocDeLicences = { kind: 'paragraph'; text: string } | { kind: 'definitions'; items: { term: string; text: string }[] };
export type SectionDeLicences = { heading: string; blocks: BlocDeLicences[] };

/**
 * Ce que la liste ne couvre pas, en une phrase. Les exemples sont ceux que les modules natifs du dépôt
 * déclarent (`androidx.core`, `kotlin-stdlib`, `firebase-messaging`, `com.google.android.material`,
 * lus dans leurs `build.gradle` le 22/10/2026) ; **« n’est pas établie » et non « sera établie »** :
 * la page ne promet pas un travail qui n'est pas décidé.
 */
export const LIMITE_DE_LA_LISTE =
  'Les composants Android que les bibliothèques natives récupèrent à la compilation (AndroidX, Kotlin, Firebase, Material Components…) ne figurent pas dans cette liste : ils ne sont pas dans le dépôt, et leur liste n’est pas établie.';

/** Ce qui tient lieu de ligne de copyright pour un paquet qui n'en donne pas. */
export const SANS_COPYRIGHT = 'Ce paquet ne donne pas de ligne de copyright.';

/** Les deux phrases d'ouverture : le code de Ramille d'abord, puis ce que la page liste et d'où elle le tire. */
export function introDesLicences(nomDuProduit: string): string {
  return (
    `Le code de ${nomDuProduit} est publié sous licence AGPL-3.0-or-later, comme le disent les conditions d’utilisation. ` +
    'Cette page liste ce que l’application embarque d’autres auteurs : des polices et des bibliothèques libres, ' +
    'relevées dans ce que l’application contient vraiment, chacune avec sa licence.'
  );
}

/** « 22 octobre 2026 », lu dans les caractères de la date : jamais un `Date` (`EXPO.md` §1.8), ni l'ICU de Hermes. */
export function dateEnMots(iso: string): string {
  const lue = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const mois = lue ? MOIS_FRANCAIS[Number(lue[2]) - 1] : undefined;
  if (!lue || mois === undefined) return iso;
  return `${jourDuMois(Number(lue[3]))} ${mois} ${lue[1]}`;
}

function marqueDeLaPlateforme(sur: SurQuoi): string {
  if (sur === 'android') return ' (Android)';
  if (sur === 'web') return ' (web)';
  return '';
}

/** La ligne qui nomme une bibliothèque : son nom et sa version, et sa plateforme quand ce n'est pas les deux. */
export function termeDuPaquet(paquet: Pick<PaquetLicencie, 'nom' | 'version' | 'sur'>): string {
  return `${paquet.nom} ${paquet.version}${marqueDeLaPlateforme(paquet.sur)}`;
}

/**
 * Les sections de la page : les polices d'abord, puis **une section par texte de licence** — ses
 * bibliothèques, puis le texte une seule fois —, puis les textes que seules des polices emploient, puis
 * la phrase de ce que la liste ne couvre pas.
 *
 * Un texte qu'aucune bibliothèque ne porte (celui d'une police) a sa section sans liste : la police est
 * nommée dans la première section, et le texte vient là, après les bibliothèques — deux licences de
 * police au milieu des bibliothèques couperaient la liste. Un texte que personne n'emploie n'a pas de
 * section ; `scripts/licences.test.ts` refuse qu'il y en ait un dans le fichier généré.
 */
export function sectionsDesLicences(donnees: DonneesDesLicences): SectionDeLicences[] {
  const nomDuTexte = new Map(donnees.textes.map((texte) => [texte.id, texte.nom]));
  const sections: SectionDeLicences[] = [];

  if (donnees.polices.length > 0) {
    sections.push({
      heading: donnees.polices.length > 1 ? 'Polices' : 'Police',
      blocks: [
        {
          kind: 'definitions',
          items: donnees.polices.map((police) => ({
            term: `${police.nom}${marqueDeLaPlateforme(police.sur)}`,
            text: `Licence : ${nomDuTexte.get(police.texte) ?? police.texte}, dont le texte figure plus bas. ${police.copyright ?? SANS_COPYRIGHT}`,
          })),
        },
      ],
    });
  }

  const avecBibliotheques = donnees.textes.filter((texte) => donnees.paquets.some((paquet) => paquet.texte === texte.id));
  const deLaPoliceSeule = donnees.textes.filter(
    (texte) => !avecBibliotheques.includes(texte) && donnees.polices.some((police) => police.texte === texte.id)
  );

  for (const texte of avecBibliotheques) {
    sections.push({
      heading: texte.nom,
      blocks: [
        {
          kind: 'definitions',
          items: donnees.paquets.filter((paquet) => paquet.texte === texte.id).map((paquet) => ({ term: termeDuPaquet(paquet), text: paquet.copyright ?? SANS_COPYRIGHT })),
        },
        { kind: 'paragraph', text: 'Le texte de cette licence s’applique à chaque bibliothèque ci-dessus :' },
        ...texte.paragraphes.map((paragraphe): BlocDeLicences => ({ kind: 'paragraph', text: paragraphe })),
      ],
    });
  }
  for (const texte of deLaPoliceSeule) {
    const plusieurs = donnees.polices.filter((police) => police.texte === texte.id).length > 1;
    sections.push({
      heading: texte.nom,
      blocks: [
        { kind: 'paragraph', text: plusieurs ? 'Le texte de cette licence s’applique aux polices ci-dessus :' : 'Le texte de cette licence s’applique à la police ci-dessus :' },
        ...texte.paragraphes.map((paragraphe): BlocDeLicences => ({ kind: 'paragraph', text: paragraphe })),
      ],
    });
  }

  sections.push({ heading: 'Ce que cette page ne liste pas', blocks: [{ kind: 'paragraph', text: LIMITE_DE_LA_LISTE }] });
  return sections;
}
