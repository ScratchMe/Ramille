# TraceVerte — Architecture technique V1 (increment 4/4)

> **Mise à jour du 07/09/2026** — le mot de passe a disparu (`v1-10-connexion-et-rappels.md`
> §2.D) : la conversion email se fait par `updateUser({ email })` seul, et la reconnexion sur un
> nouvel appareil par lien à usage unique (`/connexion/retrouver`). Les mentions « email +
> mot de passe » de ce document (§4 : protection contre les mots de passe compromis, §5 : écran
> « mot de passe oublié ») décrivent l'état du 23/08 et ne s'appliquent plus ; le modèle
> anonyme-d'abord du §1 et la purge du §3 (corrigée en `v1-10` §2.B) restent en vigueur.

**Périmètre** : Brique 5 (Authentification), issue du handoff design
`design_handoff_traceverte_v1/`. Décisions produit actées le 23/08/2026 : fusion automatique
Google/email sur email identique, purge des bilans anonymes après délai, palette verte.

Réf. `spec-fonctionnelle-app-carbone-transport-v1.md` (mise à jour) et
`design_handoff_traceverte_v1/README.md` §"Connexion / Authentification".

## 1. Écart assumé avec le state management du handoff

Le handoff (§"State management") suppose qu'un bilan anonyme vit **uniquement en stockage
local** (AsyncStorage/localStorage) jusqu'à la connexion, avec un rattachement applicatif
manuel au moment du login.

**Choix retenu ici : Supabase Auth "Anonymous Sign-ins"** plutôt que du stockage local pur.
Au lieu d'attendre une vraie connexion pour créer un `user_id`, chaque visiteur reçoit
immédiatement une session Supabase anonyme (`auth.users.is_anonymous = true`) dès l'ouverture
de l'app — donc son bilan est stocké **normalement** dans `assessments` etc., protégé par les
mêmes policies RLS que n'importe quel utilisateur, sans jamais assouplir `user_id not null`.

**Pourquoi ce choix plutôt que suivre le handoff au pied de la lettre** :
- Le rattachement à la connexion (Google ou email) devient **natif** : `supabase.auth.linkIdentity()` convertit la session anonyme en session permanente **en gardant le même `user_id`** — tout ce qui existe déjà (bilan, résultats, check-ins, plan) reste attaché sans code de migration applicatif à écrire ni tester.
- La purge d'un bilan "jamais rattaché" (décision produit actée) devient une requête SQL triviale sur `auth.users where is_anonymous = true` plutôt qu'un mécanisme à inventer côté client pour du stockage local.
- Reste fidèle à l'esprit du handoff : aucun blocage, restitution intégralement accessible avant connexion, rien ne change côté UI/flow décrit dans les maquettes — c'est un choix d'implémentation serveur, invisible pour l'utilisateur.

**Limite assumée** : une session anonyme est liée à l'appareil/navigateur (comme le
supposait déjà le handoff pour son stockage local) — pas de récupération multi-appareil
avant rattachement à un vrai compte. Après rattachement, la synchronisation multi-appareil
fonctionne normalement.

## 2. Fusion de comptes (décision produit : fusion automatique)

Supabase Auth supporte la fusion automatique de deux providers sur un même email via le
paramètre projet **"Automatic Linking"** (Authentication → Providers → Advanced Settings sur
le dashboard Supabase — pas exposé par l'API MCP utilisée jusqu'ici, à activer manuellement,
cf. §5).

**Garde-fou appliqué** : la fusion automatique de Supabase ne lie que des identités dont
l'email est **vérifié des deux côtés** (Google vérifie nativement ; pour le provider email,
la confirmation d'email doit être active — cf. §5). Sans ce garde-fou, fusionner sur la base
d'une simple déclaration d'email non vérifiée serait une porte ouverte à la prise de contrôle
de compte — décision produit actée, mais implémentée avec cette limite de sécurité non
négociable.

## 3. Purge des bilans anonymes (décision produit : purge après délai)

**Délai retenu : 90 jours** d'inactivité (pas de connexion, pas de nouvelle activité) pour un
compte `is_anonymous = true` jamais rattaché. Mécanisme identique aux jobs déjà en place
(pur SQL + `pg_cron`, quotidien) :

```sql
delete from auth.users
where is_anonymous = true
  and created_at < now() - interval '90 days';
```

`ON DELETE CASCADE` déjà en place depuis increment 1 (`profiles.id references auth.users(id)
on delete cascade`, puis en cascade sur `assessments`, `assessment_trips`, etc.) : purge
propre, aucune donnée orpheline.

## 4. Google Sign-In — ce qui reste à faire côté Supabase Dashboard

Aucun outil MCP disponible ici ne pilote les réglages Auth de Supabase (providers, linking,
confirmation email) — ce sont des réglages du dashboard, pas des migrations SQL. Liste
exhaustive de ce qu'il faut activer manuellement, une fois, avant que l'auth fonctionne :

| Réglage | Où | Pourquoi |
|---|---|---|
| Provider Google (Client ID + Client Secret) | Authentication → Providers → Google | Nécessite un projet Google Cloud avec écran de consentement OAuth configuré — à créer côté Google Cloud Console, je ne peux pas le faire à ta place |
| Anonymous sign-ins | Authentication → Providers → Anonymous | Active le pattern décrit en §1 |
| Automatic linking | Authentication → Providers → Advanced Settings | Décision produit actée en §2 |
| Confirmation email obligatoire | Authentication → Providers → Email | Garde-fou de sécurité pour la fusion automatique (§2) |
| Redirect URLs | Authentication → URL Configuration | `traceverte://` (mobile, déjà dans `app.json`) + le domaine Vercel (web) |

**Écarté** — protection contre les mots de passe compromis (vérification HaveIBeenPwned,
`Authentication → Policies`). Remontée par l'advisor sécurité Supabase
(`auth_leaked_password_protection`) le 04/09/2026 et pertinente sur le principe, puisque la
connexion email + mot de passe est proposée (§2) : **réservée au plan payant Supabase**,
décision produit du 04/09/2026 de ne pas la prendre pour cette V1. L'advisor continuera donc
à la signaler — c'est attendu, cf. `v1-07` §5.

Pour le Client ID/Secret Google : Google Cloud Console → APIs & Services → Credentials →
Create OAuth client ID (type "Web application" pour Supabase, qui gère la redirection) — je
peux détailler la procédure pas à pas si besoin, mais la création du projet Google Cloud et
la validation de l'écran de consentement sont des actions de compte que je ne peux pas
exécuter à ta place.

## 5. Ce qui reste hors scope de cet increment

Écrans client (5 écrans du handoff : proposition de connexion, email+mot de passe, session
expirée, mot de passe oublié, relance douce bilan anonyme) — le mécanisme serveur (anonyme +
linking + purge) est la partie non triviale, les écrans suivent une fois la config Supabase
Dashboard faite et testable.
