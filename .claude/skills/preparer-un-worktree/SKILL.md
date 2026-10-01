---
name: preparer-un-worktree
description: Prépare une vague de chantiers confiés à des sous-agents en copies de travail (isolation « worktree ») — commit de départ, node_modules, expo-env.d.ts, cache de Metro, stack réservée — et donne le modèle de consigne de chaque sous-agent.
argument-hint: "[chantiers à confier]"
disable-model-invocation: true
---

# Préparer une vague de sous-agents en copies de travail

`CLAUDE.md` raconte ce qu'a coûté la première vague de ce genre (« Avant de lancer une vague »). Une
partie est désormais réglée d'office : la copie part du HEAD local et y trouve `node_modules`, et
`scripts/preparer-un-worktree.mjs` vérifie le commit de départ et crée `expo-env.d.ts`. Voici ce qui
reste à faire à la main, dans l'ordre, puis la consigne à donner à chaque sous-agent.

## Avant de lancer les sous-agents

1. **Commite, et note le SHA.** Depuis le 27/09/2026, une copie de travail part du HEAD local
   (`worktree.baseRef: "head"` dans `.claude/settings.json`), donc d'un commit : ce qui n'est pas
   commité n'y sera pas. Chaque consigne donne ce SHA, et le sous-agent vérifie que sa copie le
   contient.
2. **Refais le relevé de fichiers** (`CLAUDE.md`, « Avant de lancer une vague »). Pour chaque
   chantier, liste les fichiers qu'il touche, et repère ceux que plusieurs chantiers revendiquent.
3. **Nomme les modules partagés qu'un chantier a le droit de créer.** Le relevé ne voit pas les
   fichiers qui n'existent pas encore. Le 24/09/2026, deux chantiers ont écrit `src/lib/focus.ts`
   en même temps.
4. **Un seul travail à la fois sur la stack Supabase.** `scripts/rejouer-la-ci.mjs` la réserve pour
   ses étapes `base` et `parcours`, et c'est par lui que les sous-agents y touchent. Un sous-agent
   qui lance `supabase start`, `stop` ou `db reset` à la main casse le travail des autres.

## La consigne de chaque sous-agent

Remplis les chevrons. Le chemin du script est celui de la **copie principale** : il marche même si
la copie du sous-agent est partie d'un `main` qui ne l'a pas encore.

```markdown
Tu travailles sur Ramille, une app Expo (React Native et web) de sensibilisation à l'empreinte
carbone des transports. Tout est en français : code, commentaires, messages, commits. `CLAUDE.md`
est chargé pour toi ; lis aussi <les fichiers d'outil et de sujet du chantier> et <le document de chantier>.
Aujourd'hui : <date>.

## Ton cadre

- Tu es dans une copie de travail isolée (git worktree), qui doit contenir le commit <SHA> de la
  branche <branche>. **Avant tout**, à la racine de ta copie :
  `node <copie principale>/scripts/preparer-un-worktree.mjs <SHA>`
  Il vérifie le commit de départ et avance la copie si elle est partie d'un commit plus ancien. Il
  lie aussi `node_modules` et crée `expo-env.d.ts`. S'il refuse, arrête-toi et dis pourquoi dans
  ton rapport.
- Commite dans la branche de ta copie. Ne pousse rien, n'ouvre aucune PR. Chaque message de commit
  est en français et se termine exactement par :
  <les deux lignes d'attribution de la session>
- Tu peux créer : <les modules partagés autorisés>. Aucun autre fichier partagé : si tu en as
  besoin, dis-le dans ton rapport.
- Tu ne touches pas à : <les fichiers réservés à l'intégration — CLAUDE.md, produit.md, le document
  de chantier>.
- Contrôles : `npx tsc --noEmit`, `npm run lint`, `npm test` (jamais `npx jest`). Un export et ses
  contrôles : `node scripts/rejouer-la-ci.mjs export`, qui donne à l'export son propre cache de
  Metro — à la main, `--clear` ne protège pas d'une autre copie qui exporte en même temps. Pour la
  stack : `node scripts/rejouer-la-ci.mjs base parcours`, qui la réserve. Jamais `supabase start`,
  `stop` ni `db reset` à la main.
- Toute garde neuve s'éprouve en la cassant, et la mutation se consigne, datée, dans l'en-tête du
  test ou du script (`TESTING.md` §1.1).

## Ce qu'il y a à faire

<le chantier. Pour des constats de relecture : « vérifie chacun dans le code avant de le corriger ;
si un constat est faux, dis-le avec la preuve et ne change rien ».>

## Ton rapport final

- les fichiers changés ;
- les contrôles lancés, et leur résultat ;
- chaque mutation jouée, et ce qui est tombé ;
- ce que tu n'as pas pu vérifier ;
- tout constat neuf fait en chemin ;
- le SHA de ton dernier commit, et le nom de ta branche.
```

## Au retour des sous-agents

- **Chaque rapport revient avec des corrections hors de sa liste.** C'est du travail
  d'intégration, pas du bruit : il y en a eu une vingtaine le 24/09/2026, dont une erreur
  d'hydratation.
- **Intègre, puis fais contre-lire la vague** sur son diff entier par le sous-agent
  `contre-lecture`, avant d'ouvrir la PR.
- **Rejoue la CI sur l'arbre intégré** : `node scripts/rejouer-la-ci.mjs`.
