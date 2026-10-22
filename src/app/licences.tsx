import { LegalPage } from '@/components/legal/legal-page';
import { LICENCES } from '@/constants/licences';
import { APP_NAME } from '@/constants/produit';
import { dateEnMots, introDesLicences, sectionsDesLicences } from '@/types/licences';

// Les licences de ce que l'application embarque d'autres auteurs — l'avis de copyright et le texte que
// ces licences demandent de reproduire dans ce qu'on distribue (l'APK de Google Play, le bundle web).
//
// **Une page légale comme `/conditions`, qu'on atteint depuis elles** (`LegalPage`), mais pas une surface
// que Google Play ou Google OAuth demandent : sans description dans `PAGE_DESCRIPTIONS`, elle porte
// `noindex` — une liste de cent bibliothèques n'a rien à faire dans un moteur de recherche, et ouvrir
// l'indexation d'une sixième page se décide (`src/constants/page-titles.ts`). Elle n'ouvre ni session
// anonyme ni captcha : `/licences` est dans `SURFACES_SANS_COMPTE` (`src/types/session.ts`), elle ne lit
// rien.
//
// **Tout le contenu vient du fichier généré** (`src/constants/licences.ts`, `scripts/generer-les-licences.mjs`)
// et se met en page dans `src/types/licences.ts`, testé : rien de ce qui est affiché ne s'écrit ici, ni ne
// se retouche à la main. La date est celle de la génération, pas celle de la dernière retouche du code de
// la page — c'est la date de ce que la liste dit.
//
// Les sections se calculent une fois, à l'import : le fichier est une constante, et la page ne dépend
// d'aucune entrée — le HTML exporté et le premier rendu du client sont donc les mêmes.
const SECTIONS = sectionsDesLicences(LICENCES);

export default function Licences() {
  return <LegalPage title="Licences" updatedAt={dateEnMots(LICENCES.genereLe)} intro={introDesLicences(APP_NAME)} sections={SECTIONS} />;
}
