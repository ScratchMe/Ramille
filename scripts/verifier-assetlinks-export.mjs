// Refuse un export web où le fichier de vérification des liens Android manquerait, ou ne
// désignerait pas la bonne app.
//
// **Ce que ce fichier permet, et comment il échoue.** Le rappel par email ne porte qu'une URL,
// `https://www.ramille.fr/plan`. Android la route vers l'app quand elle est installée — mais
// seulement si le domaine l'y autorise nommément, par ce fichier servi sur
// `/.well-known/assetlinks.json`. S'il disparaît de l'export, si son paquet ne correspond plus
// à `android.package`, ou si l'empreinte de signature n'est plus la bonne, **la vérification
// échoue en silence** : le lien s'ouvre dans le navigateur, exactement comme avant, et rien
// dans l'app, le build ou la CI ne le signale. Même famille de panne muette que `cleanUrls` et
// l'inlining des `EXPO_PUBLIC_*`.
//
// L'empreinte dépend de la **clé qui signe l'APK**. Google Play resignant l'app avec la
// sienne, celle de production différera de celle du keystore EAS : le tableau en accepte
// plusieurs, et il faudra y ajouter la seconde au moment de la publication, sans jamais
// retirer la première.
//
// Lancé en CI après `expo export`, cf. .github/workflows/ci.yml.
import { readFileSync } from 'node:fs';

const DIST = process.argv[2] ?? 'dist';
const CHEMIN = `${DIST}/.well-known/assetlinks.json`;

const echecs = [];

function paquetDeclare() {
  const app = JSON.parse(readFileSync('app.json', 'utf8'));
  return app?.expo?.android?.package;
}

let liens;
try {
  liens = JSON.parse(readFileSync(CHEMIN, 'utf8'));
} catch (erreur) {
  console.error(
    `${CHEMIN} est absent ou illisible (${String(erreur).slice(0, 120)}).\n\n` +
      'Il vit dans `public/.well-known/`, qu’Expo recopie tel quel dans l’export. Sans lui,\n' +
      'les liens du rappel s’ouvrent dans le navigateur au lieu de l’app, sans erreur nulle part.'
  );
  process.exit(1);
}

const attendu = paquetDeclare();

if (!Array.isArray(liens) || liens.length === 0) {
  echecs.push('le fichier doit être un tableau non vide de déclarations.');
}

for (const [index, declaration] of (Array.isArray(liens) ? liens : []).entries()) {
  const cible = declaration?.target ?? {};

  if (!declaration?.relation?.includes('delegate_permission/common.handle_all_urls')) {
    echecs.push(`déclaration ${index} : la relation \`handle_all_urls\` manque.`);
  }
  if (cible.namespace !== 'android_app') {
    echecs.push(`déclaration ${index} : \`namespace\` vaut « ${cible.namespace} », attendu « android_app ».`);
  }
  if (cible.package_name !== attendu) {
    echecs.push(
      `déclaration ${index} : le paquet « ${cible.package_name} » ne correspond pas à ` +
        `\`android.package\` d’app.json (« ${attendu} »). La vérification échouerait en silence.`
    );
  }

  const empreintes = cible.sha256_cert_fingerprints ?? [];
  if (empreintes.length === 0) {
    echecs.push(`déclaration ${index} : aucune empreinte de signature.`);
  }
  for (const empreinte of empreintes) {
    if (!/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(empreinte)) {
      echecs.push(
        `déclaration ${index} : « ${String(empreinte).slice(0, 24)}… » n’est pas une empreinte ` +
          'SHA-256 (32 octets en hexadécimal majuscule, séparés par des deux-points).'
      );
    }
  }
}

if (echecs.length > 0) {
  console.error(`${CHEMIN} n’autoriserait pas l’app à ouvrir ses liens :\n`);
  for (const echec of echecs) console.error(`  - ${echec}`);
  process.exit(1);
}

const total = liens.flatMap((d) => d.target.sha256_cert_fingerprints).length;
console.log(
  `assetlinks.json exporté pour ${attendu}, ${total} empreinte${total > 1 ? 's' : ''} de signature.`
);
