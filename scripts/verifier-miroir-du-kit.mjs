// Le kit de design porte-t-il encore tous les composants du dépôt ?
//
// **Le kit est un miroir tenu depuis le 24/09/2026** (décision n° 11, `v1-29` §5) : il était une
// photographie datée, il devient la référence d'où partent les sessions de design — et un kit faux
// y fabrique des maquettes fausses. Un miroir tenu n'a de valeur que si quelque chose le tient. Ce
// contrôle tient l'**inventaire** : un composant ajouté à `src/components/` sans fiche dans
// `docs/design/design-system/components/` fait rougir la CI, au lieu d'attendre le prochain relevé à
// la main — celui du 24/09/2026 en avait trouvé 36 sur 63, accumulés en silence depuis le 10/09.
//
// **La définition est celle de `v1-29` §5, et elle se vérifie** : un fichier de `src/components/`
// (hors tests) est représenté si l'une de ses fonctions exportées porte le nom d'une fiche du kit
// (`<Nom>.jsx`). Le nombre de fichiers ne s'écrit pas ici — il se périmerait au composant suivant.
//
// **Ce qu'il voit, et ce qu'il ne voit pas.** Il voit qu'un composant existe des deux côtés. Il ne
// dit rien de la **justesse** de la fiche : un `.jsx` peut porter le bon nom et dessiner autre chose,
// et ses props peuvent avoir dérivé de celles du dépôt. Ça, c'est la relecture de chaque PR qui touche
// un composant (la règle de `v1-29` §5 : ce qui change un composant met sa fiche à jour dans la même
// PR), et pour les aperçus de la synchronisation, la comparaison de `.design-sync/NOTES.md`.
//
// Trois refus, et le troisième n'est pas du zèle :
//   1. un composant du dépôt sans fiche, ni exception raisonnée ;
//   2. une exception qui ne couvre plus rien — le fichier a été porté, déplacé ou supprimé. Une
//      exception morte ne disparaît pas d'elle-même : elle attend qu'un vrai écart porte le même nom
//      pour le couvrir à son tour (la leçon de `verifier-renvois-des-documents.mjs`) ;
//   3. une fiche du kit que `components/loader.js` ne charge pas : sans bundle compilé, c'est ce
//      chargeur qui expose le kit aux cartes, et une fiche qu'il ignore y est invisible.
//
// **Éprouvé en le cassant, le 26/09/2026** (TESTING.md §1.1), une mutation à la fois, l'état d'avant
// réécrit ensuite, et le témoin sans mutation sort vert :
//
//   | Ce qu'on casse | Ce qui tombe |
//   |---|---|
//   | un composant neuf dans `src/components/`, sans fiche | refus 1, sur ce fichier seulement |
//   | une entrée retirée de `A_PORTER` | refus 1, sur ce fichier seulement |
//   | une exception sur un fichier déjà porté (`feuille-du-bas.tsx`) | refus 2, « est porté » |
//   | une exception sur un fichier qui n'existe pas | refus 2, « n'existe plus » |
//   | `forms/LigneDeCanal` retiré de l'ORDER du chargeur | refus 3, sur cette fiche seulement |
//   | une fiche du kit sans composant du même nom dans `src/` | le refus inverse **et** le refus 3 — une fiche neuve oubliée des deux côtés |
//   | une entrée d'`AJOUTS_DU_KIT` que le kit ne porte pas | « que le kit ne porte plus » |

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const RACINE = path.join(import.meta.dirname, '..');
const KIT = 'docs/design/design-system/components';

/**
 * Les composants du dépôt qui n'ont rien à dessiner — jamais « pas encore fait », qui est l'objet de
 * `A_PORTER` ci-dessous. Chaque entrée dit pourquoi.
 */
const SANS_INTERFACE = new Map([
  ['src/components/titre-de-page.tsx', 'pose les métadonnées du document (titre, description, Open Graph) — rien ne se rend dans la page'],
  ['src/components/retour-de-notification.tsx', 'écoute l’ouverture d’une notification et navigue — rend `null`'],
]);

/**
 * Le chantier en cours (`v1-29` §5, lots du 26/09/2026) : ce qui reste à porter, lot par lot. Cette
 * liste ne doit que raccourcir ; une entrée qu'un lot porte en sort dans la même PR, sans quoi le
 * refus n° 2 la signale.
 */
const A_PORTER = new Map([
  ['src/components/plan/carte-de-piste.tsx', 'lot 3 — plan et suivi'],
  ['src/components/plan/carte-douverture.tsx', 'lot 3 — plan et suivi'],
  ['src/components/plan/pastille-engagee.tsx', 'lot 3 — plan et suivi'],
  ['src/components/plan/trait-de-temps.tsx', 'lot 3 — plan et suivi'],
  ['src/components/suivi/barre-contour.tsx', 'lot 3 — plan et suivi'],
  ['src/components/suivi/bloc-methode.tsx', 'lot 3 — plan et suivi'],
  ['src/components/suivi/ecart-par-poste.tsx', 'lot 3 — plan et suivi'],
  ['src/components/bilan/feuille-nouveau-bilan.tsx', 'lot 3 — plan et suivi'],
  ['src/components/bilan/champs-de-contexte.tsx', 'lot 4 — le questionnaire'],
  ['src/components/bilan/missing-mode-link.tsx', 'lot 4 — le questionnaire'],
  ['src/components/bilan/precision-chiffres.tsx', 'lot 4 — le questionnaire'],
  ['src/components/bilan/steps/commute-days-distance.tsx', 'lot 4 — le questionnaire'],
  ['src/components/bilan/steps/commute-extra.tsx', 'lot 4 — le questionnaire'],
  ['src/components/bilan/steps/commute-has-trip.tsx', 'lot 4 — le questionnaire'],
  ['src/components/bilan/steps/commute-mode.tsx', 'lot 4 — le questionnaire'],
  ['src/components/bilan/steps/context.tsx', 'lot 4 — le questionnaire'],
  ['src/components/bilan/steps/flights.tsx', 'lot 4 — le questionnaire'],
  ['src/components/bilan/steps/leisure-detail.tsx', 'lot 4 — le questionnaire'],
  ['src/components/bilan/steps/leisure-frequency.tsx', 'lot 4 — le questionnaire'],
  ['src/components/bilan/steps/long-trips.tsx', 'lot 4 — le questionnaire'],
  ['src/components/onboarding/etape-accroche.tsx', 'lot 5 — onboarding, code, pages légales, erreurs'],
  ['src/components/onboarding/etape-contexte.tsx', 'lot 5 — onboarding, code, pages légales, erreurs'],
  ['src/components/onboarding/etape-reassurance.tsx', 'lot 5 — onboarding, code, pages légales, erreurs'],
  ['src/components/onboarding/etape-transition.tsx', 'lot 5 — onboarding, code, pages légales, erreurs'],
  ['src/components/illustrations/empty-state-illustration.tsx', 'lot 5 — onboarding, code, pages légales, erreurs'],
  ['src/components/illustrations/onboarding-hero-illustration.tsx', 'lot 5 — onboarding, code, pages légales, erreurs'],
  ['src/components/illustrations/reassurance-illustration.tsx', 'lot 5 — onboarding, code, pages légales, erreurs'],
  ['src/components/auth/champ-de-code.tsx', 'lot 5 — onboarding, code, pages légales, erreurs'],
  ['src/components/auth/saisie-du-code.tsx', 'lot 5 — onboarding, code, pages légales, erreurs'],
  ['src/components/legal/legal-page.tsx', 'lot 5 — onboarding, code, pages légales, erreurs'],
  ['src/components/configuration-manquante.tsx', 'lot 5 — onboarding, code, pages légales, erreurs'],
  ['src/components/erreur-inattendue.tsx', 'lot 5 — onboarding, code, pages légales, erreurs'],
  ['src/components/session-refusee.tsx', 'lot 5 — onboarding, code, pages légales, erreurs'],
]);

/**
 * Les fiches du kit qui n'ont pas de composant du même nom dans le dépôt, et pourquoi. Même règle :
 * une raison, jamais « ça faisait du bruit ».
 */
const AJOUTS_DU_KIT = new Map([
  ['BarreOnglets', 'le dépôt compose la barre dans `src/app/(tabs)/_layout.tsx` via expo-router, sans composant à son nom'],
]);

function fichiers(dossier, filtre) {
  const tous = [];
  const parcourir = (d) => {
    for (const entree of fs.readdirSync(path.join(RACINE, d), { withFileTypes: true })) {
      const chemin = path.posix.join(d, entree.name);
      if (entree.isDirectory()) parcourir(chemin);
      else if (filtre(entree.name)) tous.push(chemin);
    }
  };
  parcourir(dossier);
  return tous.sort();
}

const exportees = (chemin) =>
  [...fs.readFileSync(path.join(RACINE, chemin), 'utf8').matchAll(/^export (?:default )?function (\w+)/gm)].map((m) => m[1]);

const fiches = fichiers(KIT, (n) => n.endsWith('.jsx'));
const nomsDuKit = new Set(fiches.map((f) => path.basename(f, '.jsx')));
const composants = fichiers('src/components', (n) => n.endsWith('.tsx') && !n.endsWith('.test.tsx'));
const exportsDuDepot = new Set(fichiers('src', (n) => n.endsWith('.tsx') && !n.endsWith('.test.tsx')).flatMap(exportees));

const ecarts = [];
let representes = 0;

for (const fichier of composants) {
  const represente = exportees(fichier).some((nom) => nomsDuKit.has(nom));
  if (represente) {
    representes += 1;
    if (SANS_INTERFACE.has(fichier)) ecarts.push(`${fichier} a une fiche dans le kit : retirer son entrée de SANS_INTERFACE.`);
    if (A_PORTER.has(fichier)) ecarts.push(`${fichier} est porté : retirer son entrée de A_PORTER (${A_PORTER.get(fichier)}).`);
    continue;
  }
  if (SANS_INTERFACE.has(fichier) || A_PORTER.has(fichier)) continue;
  ecarts.push(
    `${fichier} (${exportees(fichier).join(', ') || 'aucune fonction exportée'}) n’a pas de fiche dans ${KIT}/ : ` +
      'la créer (.jsx, .d.ts, .prompt.md), ou dire pourquoi dans SANS_INTERFACE.'
  );
}

for (const [fichier] of [...SANS_INTERFACE, ...A_PORTER]) {
  if (!composants.includes(fichier)) ecarts.push(`${fichier} n’existe plus : retirer son exception.`);
}

for (const nom of nomsDuKit) {
  if (exportsDuDepot.has(nom) || AJOUTS_DU_KIT.has(nom)) continue;
  ecarts.push(`La fiche ${nom}.jsx n’a pas de composant du même nom dans src/ : l’aligner sur le dépôt, ou dire pourquoi dans AJOUTS_DU_KIT.`);
}
for (const [nom] of AJOUTS_DU_KIT) {
  if (!nomsDuKit.has(nom)) ecarts.push(`AJOUTS_DU_KIT nomme ${nom}, que le kit ne porte plus : retirer l’entrée.`);
}

const chargeur = fs.readFileSync(path.join(RACINE, KIT, 'loader.js'), 'utf8');
for (const fiche of fiches) {
  const cle = path.posix.relative(KIT, fiche).replace(/\.jsx$/, '');
  if (!chargeur.includes(`'${cle}'`)) ecarts.push(`${fiche} n’est pas dans l’ORDER de components/loader.js : sans bundle compilé, les cartes ne la voient pas.`);
}

if (ecarts.length > 0) {
  console.error('Le kit de design ne suit plus le dépôt :\n');
  for (const ecart of ecarts) console.error(`  - ${ecart}`);
  console.error('\nLe kit est un miroir tenu (`v1-29` §5) : ce qui ajoute un composant au dépôt lui ajoute sa fiche.');
  process.exit(1);
}

console.log(
  `${representes} composants du dépôt ont leur fiche dans le kit ; ${SANS_INTERFACE.size} sans interface, ` +
    `${A_PORTER.size} encore à porter (chantier de \`v1-29\` §5) ; ${fiches.length} fiches, toutes chargées.`
);
for (const [fichier, lot] of A_PORTER) console.log(`  à porter · ${fichier} — ${lot}`);
