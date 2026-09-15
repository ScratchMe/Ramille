#!/bin/sh
# Ignored Build Step de Vercel (`ignoreCommand` dans `vercel.json`) — cf. VERCEL.md §1.6.
#
# Vercel lit le code de sortie : **0 est la seule valeur qui saute le build** ; 1 ou plus
# construit. Un crash du script, une erreur git, une variable absente : tout vaut ≥ 1, donc
# tout construit — le mode d'échec est sûr par construction. La règle qu'on s'impose par-dessus :
# **ne sortir en 0 que sur une détermination positive**, et en 1 partout ailleurs. Un
# déploiement sauté à tort veut dire qu'un correctif ne part pas en production, ce qui est bien
# pire que le coût qu'on essaie d'économiser.
#
# Pourquoi ce script existe : chaque déploiement de production ajoute le poids des fonctions
# d'`api/` au compteur Functions Storage pendant trente jours, et une fusion qui ne touche que la
# documentation payait exactement le même prix qu'une fusion de code — 13 des 82 fusions des
# trente jours précédant le 15/09/2026 étaient dans ce cas. Un build sauté ne crée aucun
# déploiement, donc aucune fonction, donc rien au compteur.
set -u

dire() { printf 'ignorer-le-build : %s\n' "$1"; }

# 1. Une prévisualisation ne se construit jamais. `git.deploymentEnabled` le dit déjà dans
#    `vercel.json` ; cette garde est la ceinture sous les bretelles, et elle ne saute que sur la
#    valeur exacte — un `VERCEL_ENV` absent tombe dans la comparaison de fichiers, pas ici.
if [ "${VERCEL_ENV:-}" = "preview" ]; then
  dire "prévisualisation, on ne construit pas"
  exit 0
fi

# 2. La base de comparaison est le dernier déploiement RÉUSSI (`VERCEL_GIT_PREVIOUS_SHA`,
#    exposé seulement quand un Ignored Build Step est configuré, et connu pour être parfois
#    vide), sinon le commit précédent. L'écart compte dans un cas précis : une fusion de code qui
#    échoue au build, suivie d'une fusion de documentation — `HEAD^..HEAD` ne verrait que la
#    documentation, sauterait, et le code de la fusion échouée ne partirait jamais.
base="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$base" ]; then
  base="HEAD^"
  dire "VERCEL_GIT_PREVIOUS_SHA absent, repli sur HEAD^"
fi

# Le clone de Vercel est superficiel (--depth=10) : une base plus ancienne n'y est pas, git
# échoue, et on construit. `core.quotePath=false` pour qu'un nom de fichier accentué ne sorte pas
# entre guillemets, ce qui le ferait échapper à la liste blanche (donc construire, à tort).
if ! fichiers=$(git -c core.quotePath=false diff --name-only "$base" HEAD 2>&1); then
  dire "git diff $base..HEAD a échoué ($fichiers), on construit"
  exit 1
fi

if [ -z "$fichiers" ]; then
  dire "aucun fichier changé entre $base et HEAD, on construit"
  exit 1
fi

# 3. La liste blanche : ce que ni `expo export --platform web` ni les fonctions d'`api/` ne
#    lisent. Un fichier hors de cette liste construit, y compris ceux qu'on *croit* inertes
#    (`vercel.json`, `package.json`, `.gitignore`, `eas.json`) — en cas de doute, on construit.
#    `*.md` ne vaut qu'à la RACINE : un `.md` sous `src/` pourrait être importé par l'app.
hors_du_build() {
  case "$1" in
    docs/*|.github/*|supabase/*|.claude/*|.design-sync/*|.vscode/*|scripts/*|LICENSE) return 0 ;;
    */*) return 1 ;;
    *.md) return 0 ;;
    *) return 1 ;;
  esac
}

n=0
while IFS= read -r fichier; do
  [ -z "$fichier" ] && continue
  n=$((n + 1))
  if ! hors_du_build "$fichier"; then
    dire "$fichier entre dans le build, on construit"
    exit 1
  fi
done <<FIN
$fichiers
FIN

dire "$n fichier(s) changé(s) entre $base et HEAD, tous hors du build — sauté"
exit 0
