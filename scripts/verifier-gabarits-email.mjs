#!/usr/bin/env node
/**
 * Les gabarits d'e-mail vivent à DEUX endroits dans le dépôt, et rien ne les comparait.
 *
 * `supabase/templates/` porte la copie que GoTrue inline au démarrage de la stack locale — elle ne
 * part plus que hook d'envoi éteint, depuis le 05/10/2026 (assertions 5 à 7) —, et `docs/exploitation/gabarits-email.md` porte la référence relisable, celle qu'on
 * ouvre pour savoir ce que la production envoie. Deux copies d'un même texte divergent par une faute
 * de frappe que personne ne relit : c'est le raisonnement de `mois_francais` et de sa jumelle
 * `MOIS_FRANCAIS`, et celui du tableau `MIROIRS` de `verifier-miroirs-de-check.mjs`.
 *
 * **Le document affirmait que cette égalité était relue à chaque passage de
 * `verifier-code-de-connexion.mjs`, et c'était faux** : cette garde-là rend un vrai e-mail contre la
 * stack locale et vérifie qu'il porte un code et aucun lien — elle ne compare jamais le document aux
 * fichiers. Relevé au second passage de contre-lecture, le 21/09/2026 ; la phrase promettait un
 * contrôle inexistant, ce qui est pire qu'un commentaire périmé — un prochain passage aurait cru la
 * dérive attrapée.
 *
 * CE QU'ELLE COUVRE, ET CE QUI LUI ÉCHAPPE. `GABARITS` est une liste **déclarée**, donc un gabarit
 * que personne n'y déclare lui reste invisible : c'est la même limite que `MIROIRS`, et on ne
 * prétend pas à l'exhaustivité (`TESTING-GARDES.md` §2.7). Les deux gabarits couverts sont les deux seuls
 * que le produit emprunte. *Confirm signup* et *Reset Password* sont traduits dans le document et
 * ne vivent **que** dans le tableau de bord : aucun fichier du dépôt ne les porte, donc rien ici ne
 * peut les voir. Et le tableau de bord lui-même reste hors de portée de toute garde du dépôt —
 * c'est le rôle de `docs/exploitation/`, pas celui de la CI.
 *
 * TROIS FAMILLES D'ASSERTION, et la troisième est la seule qui touche à la sécurité :
 *   1. le document et le fichier disent exactement la même chose ;
 *   2. `supabase/config.toml` déclare bien chaque fichier — sans la déclaration, GoTrue retombe en
 *      silence sur son gabarit anglais par défaut, et la garde de bout en bout resterait verte pour
 *      la mauvaise raison (le piège du gabarit non relu à chaud, `gabarits-email.md` §4) ;
 *   3. chaque gabarit porte `{{ .Token }}` et **aucune** forme de lien de confirmation. C'est
 *      l'invariant du correctif du 20/09/2026 : un clic ne doit plus rien confirmer. Il est déjà
 *      éprouvé de bout en bout, mais dans le seul job qui demande Docker — ici il tombe en une
 *      seconde, sans stack.
 *
 * ET UNE QUATRIÈME DEPUIS LE 01/10/2026, pour le seul rattachement : « Si ce n'est pas toi, ne fais
 * rien » vient **avant** le code. C'est le jugement 05.2 de la recette (`v1-13` §19), rendu en écart
 * par la personne qui pilote : lu en deux secondes par quelqu'un qui n'a rien demandé, le message
 * montrait le code en gros, et la phrase qui dit qu'il n'y a rien à faire n'arrivait qu'après. Un
 * ordre ne se voit pas dans une égalité de textes : remettre la phrase en bas, des deux côtés à la
 * fois, passerait l'assertion 1.
 *
 * MUTATIONS JOUÉES LE 21/09/2026 (`TESTING.md` §1.1) :
 *   - une espace ajoutée dans un `<p>` du document → l'assertion 1 tombe, en nommant la ligne ;
 *   - `content_path` retiré de `supabase/config.toml` → l'assertion 2 tombe ;
 *   - `{{ .Token }}` remplacé par `{{ .ConfirmationURL }}` dans le fichier → l'assertion 3 tombe,
 *     et l'assertion 1 avec elle (le document, lui, n'a pas bougé).
 *
 * MUTATION JOUÉE LE 01/10/2026 : la phrase remise après le code, dans le document **et** le fichier
 * → l'assertion 4 tombe, seule — l'assertion 1, elle, reste verte, et c'est ce qui la justifie.
 *
 * ET DEUX DEPUIS LE 05/10/2026, quand le hook d'envoi a pris les e-mails à Supabase (plafonds d'e-mail,
 * `20261005103733_les_plafonds_d_e_mail.sql`) : le corps et le sujet vivent aussi dans la migration,
 * entre des balises `$gabarit_<nom>$` et `$sujet_<nom>$`, et c'est cette copie-là qui part en
 * production quand le hook est allumé. 5. le corps de la dernière migration qui porte la balise est
 * le fichier, à l'octet près des fins de ligne ; 6. son sujet est celui du titre du document. Les
 * fichiers restent la référence parce que le hook éteint rend l'envoi à GoTrue, qui les lit.
 *
 * 7. le fichier ne porte que les variables que le hook remplace (`variables`) : une autre partirait
 * brute, puisque le hook ne fait que deux remplacements.
 *
 * MUTATIONS JOUÉES LE 05/10/2026 : une espace ajoutée dans le corps de la migration → l'assertion 5
 * tombe, seule ; une lettre changée dans le sujet de la migration → l'assertion 6 tombe, seule ; la
 * balise renommée → l'assertion 5 tombe en disant qu'aucune migration ne la porte ; `{{ .Email }}`
 * ajouté au fichier et à la migration → l'assertion 7 tombe (la 1 aussi, le document n'ayant pas
 * bougé).
 *
 * Ne lit que le système de fichiers : ni npm ci, ni export, ni Docker.
 */

import { readdirSync, readFileSync } from 'node:fs';

const DOCUMENT = 'docs/exploitation/gabarits-email.md';
const CONFIG = 'supabase/config.toml';
const MIGRATIONS = 'supabase/migrations';

/**
 * Les gabarits que le produit emprunte, et le titre sous lequel le document les porte.
 *
 * `titre` est le début de la ligne `###` ; le bloc ```html retenu est **le premier** qui suit, ce
 * qui est ce que le document fait aujourd'hui — un second bloc sous le même titre serait ignoré, et
 * c'est assumé : le document en porte un par gabarit.
 */
const GABARITS = [
  {
    fichier: 'supabase/templates/lien-de-connexion.html',
    titre: '### Magic Link',
    // Le flux de reconnexion (`signInWithOtp`), écran `/connexion/retrouver` et la page publique
    // de suppression.
    cle: 'magic_link',
    // Le bloc `$gabarit_lien_de_connexion$` de la migration qui porte le hook d'envoi.
    bloc: 'lien_de_connexion',
    // Les seules variables que le hook d'envoi remplace (`rendre_l_e_mail_d_auth`) : toute autre
    // partirait brute, accolades comprises.
    variables: ['{{ .Token }}'],
  },
  {
    fichier: 'supabase/templates/rattachement-adresse.html',
    titre: '### Change Email Address',
    // Le rattachement d'une adresse à une session anonyme (`updateUser({ email })`), et le gabarit
    // dont le lien ÉTAIT la faille du 19/09/2026.
    cle: 'email_change',
    bloc: 'rattachement_adresse',
    variables: ['{{ .Token }}', '{{ .NewEmail }}'],
    // Ce que lit d'abord quelqu'un qui n'a rien demandé (jugement 05.2, 01/10/2026).
    avantLeCode: "Si ce n'est pas toi, ne fais rien",
  },
];

/** Toute forme de lien de confirmation — c'est ce qui ne doit plus jamais figurer. */
const FORMES_DE_LIEN = ['{{ .ConfirmationURL }}', '{{.ConfirmationURL}}', '{{ .TokenHash }}'];

let echecs = 0;
function verifier(condition, message) {
  if (condition) return;
  echecs += 1;
  console.error(`  ✗ ${message}`);
}

/** Le premier bloc ```html qui suit un titre, tel quel. */
function blocApresLeTitre(markdown, titre) {
  const debutTitre = markdown.indexOf(titre);
  if (debutTitre === -1) return null;
  const ouverture = markdown.indexOf('```html', debutTitre);
  if (ouverture === -1) return null;
  const debut = markdown.indexOf('\n', ouverture) + 1;
  const fin = markdown.indexOf('```', debut);
  if (fin === -1) return null;
  return markdown.slice(debut, fin);
}

/** Sans espaces de fin de ligne ni ligne vide terminale : un fichier finit par un saut, un bloc non. */
function normaliser(texte) {
  return texte
    .split('\n')
    .map((ligne) => ligne.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}

/**
 * Le texte entre deux balises `$nom$` de la dernière migration qui les porte : c'est elle qui a
 * installé la version en vigueur de la fonction (une migration livrée ne se retouche pas, une
 * nouvelle version vient dans une migration plus récente).
 */
function blocDeMigration(nom) {
  const balise = `$${nom}$`;
  const fichiers = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .filter((f) => readFileSync(`${MIGRATIONS}/${f}`, 'utf8').includes(balise));
  if (fichiers.length === 0) return null;
  const sql = readFileSync(`${MIGRATIONS}/${fichiers.at(-1)}`, 'utf8');
  const debut = sql.indexOf(balise) + balise.length;
  const fin = sql.indexOf(balise, debut);
  return fin === -1 ? null : { texte: sql.slice(debut, fin), fichier: fichiers.at(-1) };
}

/** Le sujet écrit dans le titre du document, entre « » : `### Magic Link — « … »`. */
function sujetDuTitre(markdown, titre) {
  const debut = markdown.indexOf(titre);
  if (debut === -1) return null;
  const ligne = markdown.slice(debut, markdown.indexOf('\n', debut));
  const sujet = ligne.match(/«\s*(.+?)\s*»/);
  return sujet ? sujet[1] : null;
}

const markdown = readFileSync(DOCUMENT, 'utf8');
const config = readFileSync(CONFIG, 'utf8');

console.log(`Gabarits d'e-mail — ${GABARITS.length} déclaré(s), comparés à ${DOCUMENT}\n`);

for (const gabarit of GABARITS) {
  console.log(`  ${gabarit.cle} → ${gabarit.fichier}`);

  const fichier = normaliser(readFileSync(gabarit.fichier, 'utf8'));
  const bloc = blocApresLeTitre(markdown, gabarit.titre);

  verifier(
    bloc !== null,
    `aucun bloc \`\`\`html sous « ${gabarit.titre} » dans ${DOCUMENT} — le document ne porte plus la référence de ${gabarit.cle}`
  );

  if (bloc !== null) {
    const attendu = normaliser(bloc);
    if (attendu !== fichier) {
      const lignesDoc = attendu.split('\n');
      const lignesFichier = fichier.split('\n');
      const n = Math.max(lignesDoc.length, lignesFichier.length);
      let premiere = -1;
      for (let i = 0; i < n; i += 1) {
        if (lignesDoc[i] !== lignesFichier[i]) {
          premiere = i;
          break;
        }
      }
      verifier(
        false,
        `${gabarit.fichier} et « ${gabarit.titre} » divergent à la ligne ${premiere + 1} :\n` +
          `      document : ${JSON.stringify(lignesDoc[premiere] ?? '(fin)')}\n` +
          `      fichier  : ${JSON.stringify(lignesFichier[premiere] ?? '(fin)')}`
      );
    }
  }

  verifier(
    config.includes(gabarit.fichier.replace('supabase/', './supabase/')),
    `${CONFIG} ne déclare pas ${gabarit.fichier} — sans son \`content_path\`, GoTrue retombe en silence sur son gabarit anglais par défaut`
  );

  verifier(
    fichier.includes('{{ .Token }}'),
    `${gabarit.fichier} ne porte pas \`{{ .Token }}\` — l'e-mail partirait sans code, et rien dans le corps ne le dirait`
  );

  if (gabarit.avantLeCode) {
    const phrase = fichier.indexOf(gabarit.avantLeCode);
    verifier(
      phrase !== -1 && phrase < fichier.indexOf('{{ .Token }}'),
      `${gabarit.fichier} : « ${gabarit.avantLeCode} » doit venir avant le code — lu en deux secondes par quelqu'un qui n'a rien demandé, le message montre d'abord le code (jugement 05.2, \`v1-13\` §19)`
    );
  }

  // 7. Aucune variable que le hook ne remplace pas : GoTrue en connaît d'autres (`{{ .Email }}`,
  // `{{.Token}}` sans espaces), que le hook laisserait partir telles quelles.
  for (const variable of fichier.match(/\{\{[^}]*\}\}/g) ?? []) {
    verifier(
      gabarit.variables.includes(variable),
      `${gabarit.fichier} porte \`${variable}\`, que le hook d'envoi ne remplace pas — elle partirait brute (seules ${gabarit.variables.join(', ')})`
    );
  }

  // 5 et 6. Le hook d'envoi (depuis le 05/10/2026) porte sa propre copie du corps et du sujet.
  const corps = blocDeMigration(`gabarit_${gabarit.bloc}`);
  verifier(
    corps !== null,
    `aucune migration ne porte \`$gabarit_${gabarit.bloc}$\` — le hook d'envoi n'a plus de corps pour ${gabarit.cle}`
  );
  if (corps !== null) {
    verifier(
      normaliser(corps.texte) === fichier,
      `le bloc \`$gabarit_${gabarit.bloc}$\` de ${corps.fichier} diffère de ${gabarit.fichier} — le hook enverrait un autre texte que celui de la référence`
    );
  }
  const sujetMigration = blocDeMigration(`sujet_${gabarit.bloc}`);
  const sujetDocument = sujetDuTitre(markdown, gabarit.titre);
  verifier(
    sujetMigration !== null && sujetDocument !== null && sujetMigration.texte === sujetDocument,
    `le sujet de ${gabarit.cle} diffère entre ${sujetMigration?.fichier ?? 'les migrations'} (${JSON.stringify(sujetMigration?.texte ?? null)}) et le titre de ${DOCUMENT} (${JSON.stringify(sujetDocument)})`
  );

  for (const forme of FORMES_DE_LIEN) {
    verifier(
      !fichier.includes(forme),
      `${gabarit.fichier} porte \`${forme}\` — le correctif du 20/09/2026 est qu'aucun clic ne confirme plus rien (un clic sur le lien de rattachement confirmait l'adresse d'un tiers sur le compte d'un inconnu)`
    );
  }
}

console.log('');
if (echecs > 0) {
  console.error(`${echecs} écart(s) entre les gabarits et leur référence.`);
  process.exit(1);
}
console.log(`${GABARITS.length} gabarit(s) conformes à leur référence, déclarés dans ${CONFIG}, recopiés à l'identique par le hook d'envoi, sans lien de confirmation.`);
