// Les listes de valeurs écrites en TypeScript disent-elles encore ce que le `check` du schéma
// accepte ? (dette `v1-27` §11 ligne 8, §12.5)
//
// **Le code recopie à la main une contrainte de la base en bien des endroits.** Une puce du
// questionnaire, un `.eq('status', …)`, une union de littéraux : rien, depuis TypeScript, ne peut
// lire ce que la colonne accepte. Leur compte ne s'écrit nulle part — il est imprimé par les
// passages **verts**, et il grossit d'une ligne du tableau `MIROIRS` à la fois. Un passage rouge,
// lui, imprime les écarts et rien d'autre : c'est ce qu'on lit alors, et le compte n'y aiderait pas.
//
// **`MIROIRS` est une liste déclarée, pas un inventaire prouvé complet, et c'est sa limite.** Rien
// ne balaie le dépôt à la recherche d'un miroir que personne n'a déclaré — la parade est une
// habitude : qui écrit une constante recopiant un `check` ajoute sa ligne ici. Deux formes y
// échappent même quand on y pense, et il vaut mieux les connaître que de croire la liste close :
//   - **une union recopiée en ligne** plutôt qu'importée depuis son `export type` : la lecture ne
//     connaît qu'une forme, `export type X = 'a' | 'b';`. `loop_type` l'a été jusqu'au 20/09/2026 —
//     `LoopType` existait, et six endroits réécrivaient `'commute' | 'extras'` à la main plutôt que
//     de l'importer, donc déclarer le miroir n'en gardait aucun. Les six importent désormais, et
//     c'est la seule forme de correction qui vaille ici : **rapprocher la recopie du type nommé**,
//     puisque le contrôle ne peut pas aller la chercher ;
//   - **une borne que la base confie à une fonction, sur une colonne qui est un tableau.**
//     `IntentionDay` (1…7) fait face à `check (public.check_intention_days(intention_days))` :
//     aucun littéral à énumérer pour `valeurs` ni `type`, et `domaine` substitue une valeur
//     **scalaire** là où la colonne est un `smallint[]`, donc la substitution ne typerait même
//     pas. Le jour où cette borne bouge en base, seule la relecture le verra.
//
// La convention du dépôt était d'épingler chaque miroir par un test
// Jest portant les valeurs **recopiées une seconde fois** — ce qui garde le code contre lui-même,
// jamais contre la base. Un `check` élargi par une migration laisse le test vert et la liste
// courte ; un `check` resserré laisse le test vert et la puce refusée à la soumission, en anglais,
// neuf étapes trop tard. C'est arrivé une fois, en silence : `tc_access` disait `aucun` avant de
// dire `inexistant`.
//
// **Ce contrôle lit la base, pas les migrations.** L'idée première était de relire le dernier
// `check (col in (…))` de `supabase/migrations/` ; c'est faux dès qu'une migration fait
// `drop constraint` puis `add constraint` (il y en a), dès qu'une colonne homonyme vit sur deux
// tables (`zone_type` a vécu sur `profiles` avec un autre vocabulaire), et ça redemande à un
// analyseur de texte ce que `pg_constraint` sait. La base interrogée est celle que
// `supabase/migrations/` vient de construire — la même que celle des tests pgTAP.
//
// **Et il importe les constantes au lieu de les lire.** Un analyseur d'`as const` par expression
// régulière est exactement là où la fragilité vit : la valeur comparée est ici celle que l'app
// utilise, obtenue par `import` (Node retire les types, `scripts/resolveur-alias.mjs` résout
// `@/`). Seule exception, et elle est structurelle : une **union de littéraux** est un type, donc
// effacée à l'exécution — celle-là se lit dans le source, par une expression régulière qui ne
// couvre qu'une forme, `export type X = 'a' | 'b';`. C'est la famille que rien d'autre ne peut
// voir : un test Jest ne peut pas énumérer un type.
//
// Trois genres, parce que trois contraintes différentes :
//   - `valeurs` — la colonne énumère, la constante aussi : **égalité d'ensembles**, dans les deux
//     sens. Une valeur en base que le produit ne propose pas est un écart autant que l'inverse :
//     c'est ainsi qu'on voit qu'une migration a ouvert une réponse que personne n'affiche.
//   - `type`    — même égalité, sur une union de littéraux lue dans le source.
//   - `domaine` — la colonne borne un nombre (`between 2 and 6`), donc rien à énumérer : chaque
//     valeur proposée est **évaluée par Postgres** contre l'expression réelle de la contrainte. Et
//     quand la liste est un intervalle d'entiers (`bornes: true`), les deux valeurs qui l'encadrent
//     doivent être **refusées** — sans quoi un plafond déplacé en base ne se verrait pas, alors que
//     la puce « 6+ » promet qu'il n'y a rien au-dessus. **Ce genre-là ne convient qu'à une colonne
//     dont toutes les contraintes ne parlent que d'elle** : l'expression évaluée est leur
//     conjonction, donc en déclarer un sur une colonne portant une contrainte de cohérence entre
//     deux colonnes (`engagement_checkins.status`, par exemple) ferait échouer la requête sur une
//     colonne inconnue. L'échec est bruyant — sortie 2 —, **mais il porte le masque d'une panne de
//     connexion** : toutes les expressions partent dans un `select` unique, donc `interroger`
//     attrape l'erreur de `psql` et affiche « Impossible d'interroger la base » puis « la stack
//     locale se démarre par `supabase start` ». Devant ce message après avoir ajouté un miroir,
//     c'est la ligne ajoutée qu'il faut relire, pas Docker.
//
// **Éprouvé en le cassant, le 20/09/2026** (TESTING.md §1.1) — douze mutations, et ce que chacune
// fait tomber :
//   - `STATUT_DE_BILAN.complete` → `'complete'`             → 2 écarts (la proposée refusée, et
//     `completed` que la base accepte sans que personne ne l'écrive plus) ;
//   - une valeur retirée de `CHOIX_DE_TC` (`inexistant`)    → 1 écart (la base l'accepte, la puce a
//     disparu) — et le type `TcAccess`, lui, reste juste : les deux miroirs sont bien distincts ;
//   - une valeur ajoutée à `ReponseDuPoint` (`'peut_etre'`) → 1 écart (proposée, refusée en base) ;
//   - `DistanceBracket` : `'30_50'` → `'30_60'`             → 2 écarts (la fantôme et l'absente) ;
//   - `OCCUPATIONS_LONG_TRAJET` gagne `6`                   → 1 écart (valeur refusée par la base) ;
//   - `PLAFOND_COVOITURAGE` 6 → 5                           → 1 écart, et c'est celui qui justifie
//     `bornes` : les cinq valeurs restantes sont toutes acceptées, seule la borne haute ment ;
//   - le `check` de `assessments.status` supprimé en base    → 1 écart (« aucune contrainte ») ;
//   - une **seconde** contrainte posée sur `car_long_trips_occupancy` (`<= 4`) → 1 écart (« le
//     produit propose 5, que la base refuse »). Celle-là est venue d'une contre-lecture du diff
//     plutôt que d'une idée de départ : le code lisait `definitions[0]`, donc une colonne portant
//     deux contraintes aurait été jugée sur une seule, et le contrôle aurait affirmé le contraire
//     de ce que la base fait. Les trois colonnes bornées n'en portent qu'une aujourd'hui — c'est
//     précisément ce qui rendait le raccourci invisible.
// Puis quatre, le soir même, avec les quatre miroirs que la contre-lecture de la contre-lecture a
// trouvés non déclarés — `CLAUDE.md` promettait alors que **toute** recopie d'un `check` figurait
// ici, ce qui était faux le jour où la phrase a été écrite :
//   - `CanalPrefere` : `'none'` → `'aucun'`             → 2 écarts (la fantôme et l'absente) ;
//   - `IntentionTiming` gagne `'un_jour_ferie'`         → 1 écart (proposée, refusée en base) ;
//   - `LoopType` : `'extras'` → `'loisirs'`             → 2 écarts ;
//   - `POSTES` gagne `'domicile'`                       → 1 écart.
// Et deux passages qui doivent rester **verts** : la seconde contrainte de `response_kind` (celle
// de cohérence, qui nomme les mêmes valeurs sans les énumérer) n'est pas lue comme une
// énumération ; et `teletravail`, dont le `check` autorise `NULL` avant d'énumérer, compare les
// trois valeurs et pas un quatrième état.
//
// Usage : node scripts/verifier-miroirs-de-check.mjs [url-postgres]
// Sans argument, la stack locale, dont le port est lu dans `supabase/config.toml` et jamais écrit
// ici. En CI, c'est le travail `db-tests`, qui ne démarre que Postgres.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { register } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const RACINE = path.join(import.meta.dirname, '..');

/**
 * La stack locale, dont le port se lit dans `supabase/config.toml` et ne s'écrit pas ici.
 *
 * `supabase status -o env` le donnerait aussi, mais seulement une fois **tous** les services
 * démarrés : le travail pgTAP ne lance que Postgres (`supabase db start`). Le fichier de
 * configuration, lui, dit le port dans les deux cas.
 */
function urlLocale() {
  const config = fs.readFileSync(path.join(RACINE, 'supabase', 'config.toml'), 'utf8');
  const bloc = config.match(/^\[db\]$([\s\S]*?)(?=^\[)/m);
  const port = bloc?.[1].match(/^port\s*=\s*(\d+)/m)?.[1];
  if (!port) throw new Error('Port de la base introuvable dans supabase/config.toml');
  return `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;
}

register(pathToFileURL(path.join(import.meta.dirname, 'resolveur-alias.mjs')).href);

/**
 * Ce que chaque miroir promet. Une ligne ici est la seule chose à écrire quand un miroir s'ajoute :
 * le reste se lit dans la base et dans le module.
 */
const MIROIRS = [
  // --- Les statuts, écrits en clair dans les requêtes (C3.12 §12.2, 20/09/2026) ---
  {
    genre: 'valeurs',
    constante: 'STATUT_DE_BILAN',
    module: 'src/types/bilan.ts',
    colonne: 'assessments.status',
  },
  {
    genre: 'valeurs',
    constante: 'STATUT_DU_POINT',
    module: 'src/types/checkin.ts',
    colonne: 'engagement_checkins.status',
  },

  // --- Les quatre réponses de contexte, rendues par deux surfaces (C6.4) ---
  {
    genre: 'valeurs',
    constante: 'CHOIX_DE_ZONE',
    module: 'src/types/contexte.ts',
    colonne: 'assessment_answers.zone_type',
  },
  {
    genre: 'valeurs',
    constante: 'CHOIX_DE_TC',
    module: 'src/types/contexte.ts',
    colonne: 'assessment_answers.tc_access',
  },
  {
    genre: 'valeurs',
    constante: 'CHOIX_DE_VEHICULES',
    module: 'src/types/contexte.ts',
    colonne: 'assessment_answers.household_vehicles',
  },
  {
    genre: 'valeurs',
    constante: 'REPONSES_TELETRAVAIL',
    module: 'src/types/bilan.ts',
    colonne: 'assessment_answers.teletravail',
  },
  // Le poste dominant : la base le borne aussi, et `POSTES` est la liste que l'app lit partout.
  {
    genre: 'valeurs',
    constante: 'POSTES',
    module: 'src/constants/postes.ts',
    colonne: 'assessment_results.dominant_poste',
  },

  // --- Les unions de littéraux : la famille que rien d'autre ne peut voir ---
  { genre: 'type', constante: 'ZoneType', module: 'src/types/bilan.ts', colonne: 'assessment_answers.zone_type' },
  { genre: 'type', constante: 'TcAccess', module: 'src/types/bilan.ts', colonne: 'assessment_answers.tc_access' },
  {
    genre: 'type',
    constante: 'HouseholdVehicles',
    module: 'src/types/bilan.ts',
    colonne: 'assessment_answers.household_vehicles',
  },
  { genre: 'type', constante: 'Teletravail', module: 'src/types/bilan.ts', colonne: 'assessment_answers.teletravail' },
  {
    genre: 'type',
    constante: 'DistanceBracket',
    module: 'src/types/bilan.ts',
    colonne: 'assessment_answers.commute_distance_bracket',
  },
  {
    genre: 'type',
    constante: 'LeisureDistanceBracket',
    module: 'src/types/bilan.ts',
    colonne: 'assessment_answers.leisure_distance_bracket',
  },
  {
    genre: 'type',
    constante: 'GenreDeQuestion',
    module: 'src/types/checkin.ts',
    colonne: 'engagement_checkins.question_kind',
  },
  // Ces deux-là, comme `POSTES` au-dessus et `LoopType` en dessous, manquaient à la liste —
  // relevé en contre-lisant la contre-lecture du 20/09/2026 :
  // `CLAUDE.md` affirmait que **toute** constante recopiant un `check` était déclarée ici, ce qui
  // était faux le jour où la phrase a été écrite. La préférence de rappel est le cas où la dérive
  // coûterait le plus cher à voir : un canal ajouté en base et pas ici part par le repli e-mail
  // sans que rien ne le dise, et c'est `reminder_channel_for()` qui décide de ce qui est envoyé.
  {
    genre: 'type',
    constante: 'CanalPrefere',
    module: 'src/types/rappels.ts',
    colonne: 'profiles.reminder_channel',
  },
  {
    genre: 'type',
    constante: 'IntentionTiming',
    module: 'src/types/plan.ts',
    colonne: 'plan_actions.intention_timing',
  },
  // Déclarer ce miroir n'a pris son sens qu'avec le geste qui l'accompagne : `LoopType` était
  // nommé dans `src/constants/postes.ts`, mais six endroits réécrivaient `'commute' | 'extras'` à
  // la main (`src/types/checkin.ts` quatre fois, `src/types/suivi.ts`, `checkin-card.tsx`) — donc
  // garder le type nommé seul n'aurait gardé personne. Les six l'importent désormais, et toute
  // nouvelle recopie en ligne ressortirait de la même façon : invisible à ce contrôle.
  {
    genre: 'type',
    constante: 'LoopType',
    module: 'src/constants/postes.ts',
    colonne: 'engagement_checkins.loop_type',
  },
  {
    genre: 'type',
    constante: 'ReponseDuPoint',
    module: 'src/types/checkin.ts',
    colonne: 'engagement_checkins.response_kind',
  },

  // --- Les révélations imbriquées : une constante, et autant de colonnes qu'elle sert ---
  //
  // **Les deux premières familles manquaient à cette liste**, relevé en y ajoutant celles de C4.4
  // le 21/09/2026 : la motorisation et le type de deux-roues étaient épinglés par des tests Jest
  // portant les mêmes valeurs recopiées une seconde fois, c'est-à-dire par le code contre
  // lui-même. C'est la troisième fois que ce fichier accueille des miroirs qu'on croyait
  // couverts, et la leçon ne change pas : **une garde déclarative ne s'annonce jamais
  // exhaustive**.
  //
  // Une même constante est déclarée **une fois par colonne qu'elle sert**, et ce n'est pas de la
  // redondance : trois colonnes portent le `check` de la motorisation, et rien n'oblige une
  // migration à les faire bouger ensemble. Une seule déclaration jugerait les trois sur une.
  { genre: 'type', constante: 'CarEngine', module: 'src/types/bilan.ts', colonne: 'assessment_answers.commute_car_engine' },
  {
    genre: 'type',
    constante: 'TwoWheelerType',
    module: 'src/types/bilan.ts',
    colonne: 'assessment_answers.commute_two_wheeler_type',
  },
  { genre: 'type', constante: 'TrainType', module: 'src/types/bilan.ts', colonne: 'assessment_answers.commute_train_type' },
  { genre: 'type', constante: 'VeloType', module: 'src/types/bilan.ts', colonne: 'assessment_answers.commute_velo_type' },
  {
    genre: 'valeurs',
    constante: 'CAR_ENGINE_OPTIONS',
    module: 'src/constants/transport-modes.ts',
    colonne: 'assessment_answers.commute_car_engine',
  },
  {
    genre: 'valeurs',
    constante: 'CAR_ENGINE_OPTIONS',
    module: 'src/constants/transport-modes.ts',
    colonne: 'assessment_answers.leisure_car_engine',
  },
  {
    genre: 'valeurs',
    constante: 'CAR_ENGINE_OPTIONS',
    module: 'src/constants/transport-modes.ts',
    colonne: 'assessment_answers.car_long_trips_engine',
  },
  {
    genre: 'valeurs',
    constante: 'TWO_WHEELER_TYPE_OPTIONS',
    module: 'src/constants/transport-modes.ts',
    colonne: 'assessment_answers.commute_two_wheeler_type',
  },
  {
    genre: 'valeurs',
    constante: 'TWO_WHEELER_TYPE_OPTIONS',
    module: 'src/constants/transport-modes.ts',
    colonne: 'assessment_answers.leisure_two_wheeler_type',
  },
  {
    genre: 'valeurs',
    constante: 'TRAIN_TYPE_OPTIONS',
    module: 'src/constants/transport-modes.ts',
    colonne: 'assessment_answers.commute_train_type',
  },
  {
    genre: 'valeurs',
    constante: 'TRAIN_TYPE_OPTIONS',
    module: 'src/constants/transport-modes.ts',
    colonne: 'assessment_answers.leisure_train_type',
  },
  {
    genre: 'valeurs',
    constante: 'VELO_TYPE_OPTIONS',
    module: 'src/constants/transport-modes.ts',
    colonne: 'assessment_answers.commute_velo_type',
  },
  {
    genre: 'valeurs',
    constante: 'VELO_TYPE_OPTIONS',
    module: 'src/constants/transport-modes.ts',
    colonne: 'assessment_answers.leisure_velo_type',
  },

  // --- Les bornes numériques : rien à énumérer, tout à évaluer (C3.5) ---
  {
    genre: 'domaine',
    constante: 'TAILLES_DE_COVOITURAGE',
    module: 'src/types/bilan.ts',
    colonne: 'assessment_answers.commute_carpool_size',
    bornes: true,
  },
  {
    genre: 'domaine',
    constante: 'OCCUPATIONS_LONG_TRAJET',
    module: 'src/types/bilan.ts',
    colonne: 'assessment_answers.car_long_trips_occupancy',
    bornes: true,
  },
  {
    // Pas de `bornes` : les trois parts ne sont pas un intervalle d'entiers, et `0` comme `1` sont
    // refusés sans que ça dise quoi que ce soit des puces proposées.
    genre: 'domaine',
    constante: 'PARTS_DU_SECOND_MODE',
    module: 'src/types/bilan.ts',
    colonne: 'assessment_answers.commute_second_mode_share',
  },
];

const url = process.argv[2] ?? process.env.DATABASE_URL ?? urlLocale();

/** Une requête, une ligne par résultat, séparateur `|`. */
function interroger(sql) {
  try {
    return execFileSync('psql', [url, '-At', '-F', '|', '-c', sql], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
      .split('\n')
      .filter((ligne) => ligne.length > 0);
  } catch (erreur) {
    const detail = erreur.stderr?.toString().trim() || erreur.message;
    console.error(`Impossible d'interroger la base (${url}) :\n${detail}`);
    console.error(
      "\nLa stack locale se démarre par `supabase start` ; l'URL peut aussi être passée en argument.",
    );
    process.exit(2);
  }
}

/**
 * Les contraintes `check` du schéma `public`, par `table.colonne`.
 *
 * Une colonne peut en porter plusieurs — `engagement_checkins.response_kind` en a deux, dont une
 * de cohérence qui nomme les mêmes valeurs sans les énumérer — donc on garde la liste entière et
 * c'est la lecture qui choisit.
 */
function contraintesParColonne() {
  const lignes = interroger(`
    select c.conrelid::regclass::text || '.' || a.attname, pg_get_constraintdef(c.oid)
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'c' and c.connamespace = 'public'::regnamespace
    order by 1
  `);
  const par = new Map();
  for (const ligne of lignes) {
    const separateur = ligne.indexOf('|');
    const cle = ligne.slice(0, separateur);
    if (!par.has(cle)) par.set(cle, []);
    par.get(cle).push(ligne.slice(separateur + 1));
  }
  return par;
}

/**
 * Les valeurs qu'une contrainte énumère pour cette colonne, ou `null` si aucune ne le fait.
 *
 * On ne cherche que la forme `colonne = ANY (ARRAY['a'::text, …])`, celle que Postgres rend pour un
 * `in (…)`. La contrainte de cohérence de `response_kind`, qui compare la colonne à des littéraux
 * un par un, n'est donc pas lue comme une énumération — ce qui est voulu : elle ne dit pas le
 * domaine, elle dit un accord entre deux colonnes.
 */
function valeursEnumerees(definitions, colonne) {
  const motif = new RegExp(`\\b${colonne}\\b\\s*=\\s*ANY\\s*\\(ARRAY\\[([^\\]]*)\\]`);
  const enumerantes = definitions
    .map((definition) => definition.match(motif))
    .filter((trouve) => trouve !== null);
  if (enumerantes.length === 0) return null;
  if (enumerantes.length > 1) return { ambigu: enumerantes.length };
  return [...enumerantes[0][1].matchAll(/'((?:[^']|'')*)'/g)].map((trouve) =>
    trouve[1].replaceAll("''", "'"),
  );
}

/**
 * L'expression à évaluer pour une colonne : **toutes** ses contraintes, jointes par « et ».
 *
 * Prendre la première suffirait aujourd'hui — les trois colonnes bornées n'en portent qu'une —, et
 * c'est exactement le genre de raccourci qui devient faux en silence : une seconde contrainte
 * ajoutée sur la même colonne serait ignorée, et le contrôle affirmerait « toutes les valeurs
 * proposées sont acceptées » pendant que la base en refuse une. La base, elle, les applique toutes.
 */
function expressionDe(definitions) {
  return definitions.map((d) => `(${d.replace(/^CHECK\s*/, '')})`).join(' and ');
}

/** Les valeurs d'une constante importée, quelle que soit la forme qu'elle a prise. */
function valeursDe(exporte, constante) {
  if (Array.isArray(exporte)) {
    return exporte.map((element) =>
      element !== null && typeof element === 'object' && 'value' in element ? element.value : element,
    );
  }
  if (exporte !== null && typeof exporte === 'object') return Object.values(exporte);
  throw new Error(`\`${constante}\` n'est ni un tableau ni un objet : ${typeof exporte}`);
}

/**
 * Les littéraux d'une union de types, lus dans le source.
 *
 * Une seule forme reconnue, `export type X = 'a' | 'b';` — sur une ou plusieurs lignes. Le jour où
 * un miroir s'écrit autrement, la garde le dit (« union introuvable ») plutôt que de rendre une
 * liste vide qui se lirait « tout va bien ».
 */
function litterauxDuType(source, nom) {
  const trouve = source.match(new RegExp(`export type ${nom}\\s*=\\s*([^;]+);`));
  if (!trouve) return null;
  const litteraux = [...trouve[1].matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1]);
  return litteraux.length > 0 ? litteraux : null;
}

function ecartsDEnsemble(proposees, acceptees) {
  const ecarts = [];
  for (const valeur of proposees) {
    if (!acceptees.includes(valeur)) {
      ecarts.push(`le produit propose « ${valeur} », que la base refuse`);
    }
  }
  for (const valeur of acceptees) {
    if (!proposees.includes(valeur)) {
      ecarts.push(`la base accepte « ${valeur} », que le produit ne propose pas`);
    }
  }
  return ecarts;
}

// --- Lecture ---------------------------------------------------------------------------------

const contraintes = contraintesParColonne();
if (contraintes.size === 0) {
  console.error('Aucune contrainte `check` lue dans le schéma `public` — base vide ou mal ciblée ?');
  process.exit(1);
}

const modules = new Map();
for (const miroir of MIROIRS) {
  if (!modules.has(miroir.module)) {
    modules.set(miroir.module, {
      exportes: await import(pathToFileURL(path.join(RACINE, miroir.module)).href),
      source: fs.readFileSync(path.join(RACINE, miroir.module), 'utf8'),
    });
  }
}

/** Les évaluations à demander à Postgres, remplies par la passe `domaine`. */
const aEvaluer = [];
const ecartsParMiroir = [];

for (const miroir of MIROIRS) {
  const { genre, constante, colonne } = miroir;
  const nomDeColonne = colonne.split('.').pop();
  const definitions = contraintes.get(colonne);
  const ecarts = [];

  if (!definitions) {
    ecartsParMiroir.push({ miroir, ecarts: ['aucune contrainte `check` sur cette colonne'] });
    continue;
  }

  if (genre === 'valeurs' || genre === 'type') {
    const acceptees = valeursEnumerees(definitions, nomDeColonne);
    if (acceptees === null) {
      ecartsParMiroir.push({
        miroir,
        ecarts: ['aucune contrainte n\'énumère les valeurs de cette colonne'],
      });
      continue;
    }
    if (acceptees.ambigu) {
      ecartsParMiroir.push({
        miroir,
        ecarts: [`${acceptees.ambigu} contraintes énumèrent cette colonne — laquelle fait foi ?`],
      });
      continue;
    }

    let proposees;
    if (genre === 'valeurs') {
      const exporte = modules.get(miroir.module).exportes[constante];
      if (exporte === undefined) {
        ecartsParMiroir.push({ miroir, ecarts: [`\`${constante}\` n'est pas exportée`] });
        continue;
      }
      proposees = valeursDe(exporte, constante);
    } else {
      proposees = litterauxDuType(modules.get(miroir.module).source, constante);
      if (proposees === null) {
        ecartsParMiroir.push({
          miroir,
          ecarts: [`union de littéraux introuvable pour \`${constante}\``],
        });
        continue;
      }
    }
    ecarts.push(...ecartsDEnsemble(proposees, acceptees));
    if (ecarts.length > 0) ecartsParMiroir.push({ miroir, ecarts });
    continue;
  }

  // genre === 'domaine'
  const exporte = modules.get(miroir.module).exportes[constante];
  if (exporte === undefined) {
    ecartsParMiroir.push({ miroir, ecarts: [`\`${constante}\` n'est pas exportée`] });
    continue;
  }
  const proposees = valeursDe(exporte, constante).map(Number);
  if (proposees.some((valeur) => !Number.isFinite(valeur))) {
    ecartsParMiroir.push({ miroir, ecarts: [`\`${constante}\` ne porte pas que des nombres`] });
    continue;
  }

  // La contrainte de la colonne, l'identifiant remplacé par la valeur à éprouver. `\b` suffit :
  // `_` est un caractère de mot, donc `commute_carpool_size` ne se trouve pas dans un autre nom.
  const expression = expressionDe(definitions);
  const remplacer = (valeur) =>
    expression.replace(new RegExp(`\\b${nomDeColonne}\\b`, 'g'), `(${valeur})`);

  for (const valeur of proposees) {
    aEvaluer.push({ miroir, valeur, attendu: true, sql: remplacer(valeur) });
  }
  if (miroir.bornes) {
    const min = Math.min(...proposees);
    const max = Math.max(...proposees);
    aEvaluer.push({ miroir, valeur: min - 1, attendu: false, sql: remplacer(min - 1) });
    aEvaluer.push({ miroir, valeur: max + 1, attendu: false, sql: remplacer(max + 1) });
  }
}

// Une seule requête pour toutes les évaluations : une colonne par valeur à éprouver.
if (aEvaluer.length > 0) {
  const select = aEvaluer.map((essai, index) => `(${essai.sql}) as e${index}`).join(', ');
  const [ligne] = interroger(`select ${select}`);
  const rendus = ligne.split('|');
  const parMiroir = new Map();
  aEvaluer.forEach((essai, index) => {
    const accepte = rendus[index] === 't';
    if (accepte === essai.attendu) return;
    if (!parMiroir.has(essai.miroir)) parMiroir.set(essai.miroir, []);
    parMiroir
      .get(essai.miroir)
      .push(
        essai.attendu
          ? `le produit propose ${essai.valeur}, que la base refuse`
          : `la base accepte ${essai.valeur}, hors de la liste que le produit propose (borne déplacée ?)`,
      );
  });
  for (const [miroir, ecarts] of parMiroir) ecartsParMiroir.push({ miroir, ecarts });
}

// --- Compte rendu ----------------------------------------------------------------------------

if (ecartsParMiroir.length > 0) {
  console.error('Des miroirs ne disent plus ce que la base accepte :\n');
  for (const { miroir, ecarts } of ecartsParMiroir) {
    console.error(`  ${miroir.constante} (${miroir.module}) ⇄ ${miroir.colonne}`);
    for (const ecart of ecarts) console.error(`    - ${ecart}`);
    console.error('');
  }
  console.error(
    'Le miroir se corrige, jamais la base : la contrainte est la vérité, la constante la recopie.\n' +
      'Si c\'est bien la base qui a changé, c\'est la migration qui dit quoi écrire ici.',
  );
  process.exit(1);
}

console.log(
  `${MIROIRS.length} miroirs de \`check\` comparés à la base, aucun écart ` +
    `(${MIROIRS.filter((m) => m.genre === 'valeurs').length} listes de valeurs, ` +
    `${MIROIRS.filter((m) => m.genre === 'type').length} unions de littéraux, ` +
    `${MIROIRS.filter((m) => m.genre === 'domaine').length} bornes numériques).`,
);
