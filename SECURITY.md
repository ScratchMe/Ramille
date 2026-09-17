# Signaler une faille

Ramille manipule des données personnelles : un bilan carbone, une adresse email quand un compte
est rattaché, et l'historique des réponses au point de suivi. Un signalement de faille est donc
utile, et il est bienvenu.

## Comment

**Ne pas ouvrir d'issue publique.** Deux chemins privés :

1. **Private vulnerability reporting** de GitHub, onglet *Security* de ce dépôt — c'est le chemin
   à préférer, il garde l'échange et son historique au même endroit ;
2. à défaut, par email : **contact@ramille.fr**.

Ce qui aide, dans l'ordre : ce que la faille permet d'obtenir, comment la reproduire, et l'URL ou
la requête exacte. Une preuve de concept minimale vaut mieux qu'une description.

## Ce qu'on peut promettre

Le produit est tenu par **une seule personne**, sans astreinte : accusé de réception sous quelques
jours, et un correctif d'autant plus vite que la faille expose des données. Aucune récompense
financière — il n'y a pas de programme de prime.

## Périmètre

**Dans le périmètre** : le contenu de ce dépôt, l'app web (`www.ramille.fr`), les fonctions
`api/`, les policies et fonctions de la base.

**Hors périmètre** : le fait que l'URL du projet Supabase et la clé anonyme soient visibles dans le
bundle web — c'est le modèle de Supabase, ces deux valeurs sont publiques par construction et la
protection vient des policies RLS, pas de leur secret. En revanche, **une policy ou un privilège
qui laisse lire ou écrire la ligne d'autrui est exactement ce qu'on veut savoir**.

Merci de ne pas tester sur des comptes qui ne sont pas les vôtres : la suppression de compte est
irréversible et la base ne porte aucune donnée de test en production.
