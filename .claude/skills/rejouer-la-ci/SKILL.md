---
name: rejouer-la-ci
description: Rejoue en local les cinq travaux de la CI de Ramille — vérifications, Jest, export web et ses contrôles, pgTAP, parcours réel — avant de pousser, ou avant d'annoncer que quelque chose est vérifié.
argument-hint: "[verifications] [jest] [export] [base] [parcours]"
disable-model-invocation: true
---

# Rejouer la CI en local

La commande est `node scripts/rejouer-la-ci.mjs $ARGUMENTS`. Sans argument, elle joue les cinq
étapes, dans l'ordre de `.github/workflows/ci.yml`. L'en-tête de `scripts/rejouer-la-ci.mjs` dit ce
qui diffère de la CI, et pourquoi. Ce qui suit dit comment s'en servir.

1. **Docker d'abord, si `base` ou `parcours` sont joués.** `docker info` doit répondre. Dans
   l'environnement d'agent, le démon ne démarre pas seul : lance `sudo dockerd > /tmp/dockerd.log
   2>&1` en arrière-plan (`TESTING.md` §2.6). Le premier démarrage de la stack tire les images, ce
   qui prend environ trois minutes.
2. **Lance le rejeu en arrière-plan.** Le premier passage complet a pris sept minutes, stack déjà
   démarrée (27/09/2026) : c'est plus que le délai d'une commande. Redirige la sortie vers un
   fichier, sans tube, car un tube masquerait le code de sortie (`CLAUDE.md`).

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
     commises : la CI ne les verra pas.
   - N'annonce jamais « vérifié » pour une étape non jouée. Nomme-la, et dis pourquoi
     (`TESTING.md`).

## Ce qu'il faut savoir avant de le lancer

- **Le rejeu reconstruit la base** (`supabase db reset`) avant pgTAP et le parcours. La base
  vérifiée doit être celle des migrations de l'arbre, comme en CI.
- **Il réserve la stack** le temps des étapes `base` et `parcours`. Un second rejeu, lancé depuis
  n'importe quelle copie de travail du dépôt, est refusé et le premier est nommé. Le verrou ne voit
  pas ce qui touche la stack hors du script : ne le lance pas pendant qu'un autre travail s'en sert
  à la main.
- **Après l'étape `parcours`, `dist/` porte l'export branché sur la stack**, pas l'export factice.
- **Ce que le rejeu ne remplace pas** :
  - `npm ci`, car les dépendances sont celles de l'arbre ;
  - le workflow de sauvegarde (`.github/workflows/sauvegarde.yml`) ;
  - ce qui ne vit qu'au déploiement, comme le traçage des assets par Vercel (`VERCEL.md` §1.6).
