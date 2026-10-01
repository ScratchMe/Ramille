---
name: rejouer-la-ci
description: Rejoue en local les travaux de la CI de Ramille — vérifications, Jest, export web et ses contrôles, pgTAP, parcours réel — avant de pousser, ou avant d'annoncer que quelque chose est vérifié.
argument-hint: "[verifications] [jest] [export] [base] [parcours]"
disable-model-invocation: true
---

# Rejouer la CI en local

La commande est `node scripts/rejouer-la-ci.mjs $ARGUMENTS`. Sans argument, elle joue toutes les
étapes, une par travail de `.github/workflows/ci.yml` et dans son ordre. L'en-tête de
`scripts/rejouer-la-ci.mjs` dit ce qui diffère de la CI, et pourquoi. Ce qui suit dit comment s'en
servir.

1. **Docker d'abord, si `base` ou `parcours` sont joués.** `docker info` doit répondre. Dans
   l'environnement d'agent, le démon ne démarre pas seul : lance `sudo dockerd > /tmp/dockerd.log
   2>&1` en arrière-plan (`TESTING-GARDES.md` §2.6). Le premier démarrage de la stack tire les images, ce
   qui prend quelques minutes.
2. **Lance le rejeu en arrière-plan** : un passage complet dure plus que le délai d'une commande.
   Redirige la sortie vers un fichier, sans tube, car un tube masquerait le code de sortie
   (`CLAUDE.md`).

   ```bash
   node scripts/rejouer-la-ci.mjs > <scratch>/rejeu.txt 2>&1; echo "sortie $?" >> <scratch>/rejeu.txt
   ```

3. **Lis le bilan, pas seulement le code de sortie.**
   - Chaque pas est marqué `✓` (réussi), `✗` (échoué, suivi de la fin de son journal) ou `–` (non
     joué, avec la condition qui manquait).
   - La sortie vaut 0 seulement si tout a été joué et a réussi : un pas non joué n'a rien vérifié.
   - Les journaux complets sont dans le dossier imprimé en tête et en fin de rejeu.
4. **Dis ce qui a été vérifié, et sur quel état.**
   - La première ligne nomme le commit, et prévient quand l'arbre porte des modifications non
     commises ou des fichiers non suivis : la CI ne les verra pas.
   - N'annonce jamais « vérifié » pour une étape non jouée. Nomme-la, et dis pourquoi
     (`TESTING.md`).

## Ce qu'il faut savoir avant de le lancer

- **Le rejeu redémarre la stack à neuf** (`supabase stop --no-backup`, puis `supabase start`)
  avant pgTAP et le parcours, comme la CI. La base est alors celle des migrations de l'arbre, et
  GoTrue relit les gabarits d'e-mail et `supabase/config.toml` — il ne les lit qu'au démarrage. Les
  données de la stack locale sont effacées : n'y garde rien.
- **Il réserve la stack** le temps des étapes `base` et `parcours`. Un second rejeu, lancé depuis
  n'importe quelle copie de travail du dépôt, est refusé et le premier est nommé. Le verrou ne voit
  pas ce qui touche la stack hors du script : ne le lance pas pendant qu'un autre travail s'en sert
  à la main.
- **Chaque export a son propre cache de Metro**, dans le dossier des journaux : deux copies de
  travail peuvent exporter en même temps sans se prendre leur bundle (`EXPO.md` §1.1).
- **Les variables du shell qui désignent une cible sont écartées** — `DATABASE_URL`,
  `EXPO_PUBLIC_*`, la boîte aux lettres de la stack, la clé de service —, puisque la CI n'en a
  aucune ; chaque pas remet celles que la CI lui donne.
- **Après l'étape `parcours`, `dist/` porte l'export branché sur la stack**, pas l'export factice.
- **Ce que le rejeu ne remplace pas** :
  - `npm ci`, car les dépendances sont celles de l'arbre ;
  - le workflow de sauvegarde (`.github/workflows/sauvegarde.yml`) ;
  - ce qui ne vit qu'au déploiement, comme le traçage des assets par Vercel (`VERCEL.md` §1.6).
