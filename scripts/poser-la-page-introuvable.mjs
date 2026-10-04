// Pose `dist/404.html`, la page que Vercel sert pour toute adresse qui n'existe pas, à partir de
// `dist/+not-found.html`, la page introuvable de l'app que l'export produit.
//
// **Sans elle, la production répondait par la page brute de Vercel, en anglais** (« The page could
// not be found — NOT_FOUND »), relevé le 04/10/2026 à la revue finale avant la production : l'export
// produit bien `+not-found.html`, mais Vercel ne le connaît pas — sur une sortie statique, il ne
// sert que `404.html`. Le lien d'un ancien partage, une adresse mal recopiée depuis un e-mail ou une
// route renommée tombaient donc hors du produit, dans une autre langue, sans rien pour revenir.
//
// La page copiée s'hydrate sur l'adresse demandée : Expo Router lit `window.location`, ne trouve
// aucune route et rend `+not-found` — le même écran que le HTML statique, donc sans écart.
//
// Lancé par `vercel-build` après l’export, et par la CI au même endroit : la CI vérifie
// ainsi l'export que la production sert, et `verifier-titres-export.mjs` exige la page.
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.argv[2] ?? 'dist';
const SOURCE = join(DIST, '+not-found.html');

if (!existsSync(SOURCE)) {
  console.error(
    `${SOURCE} est introuvable : l'export ne produit plus la page introuvable de l'app` +
      ' (src/app/+not-found.tsx), et Vercel servirait sa page brute, en anglais. L’export a-t-il tourné ?'
  );
  process.exit(1);
}

copyFileSync(SOURCE, join(DIST, '404.html'));
console.log(`${join(DIST, '404.html')} posée depuis ${SOURCE}.`);
