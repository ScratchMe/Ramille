# Canvas — retrouver son compte

Sources du canvas publié le 06/09/2026, à la demande produit de voir comment faire coexister
les trois entrées de l'app autour de l'authentification.

Artifact : https://claude.ai/code/artifact/721d6286-7cab-4606-8c7e-ce0d93396c24

## Pourquoi ce canvas existe

Un audit du code fait le même jour a établi que **le produit n'a aucun chemin de connexion à
un compte existant**. Tout `src/lib/auth.ts` rattache une identité à la session anonyme
courante (`linkIdentity`, `updateUser`) — pas un `signInWithPassword` ni un `signInWithOAuth`
dans tout `src/`. Le parcours normal n'en a jamais besoin, ce qui explique que ça n'ait pas
été vu.

Conséquence : sur un nouvel appareil, la personne reçoit une session anonyme vide qui n'est
pas son compte. Avec un compte email elle s'en sort par « mot de passe oublié », qui la
reconnecte par effet de bord ; avec un compte Google seul, rien ne la ramène.

Deux affirmations du produit en dépendent, et sont fausses aujourd'hui : l'écran `/connexion`
promet « Avec un compte, il te suit d'un appareil à l'autre », et `v1-04` §1 affirme
qu'« après rattachement, la synchronisation multi-appareil fonctionne normalement ». Livrer
ce canvas les rend vraies sans avoir à retoucher une seule de ces deux phrases.

## Ce que le canvas contient

Quatre écrans au format téléphone (390 × 844) et le composant `Mascot`, repris tel quel de
`v1-08-mascotte` (géométrie SVG reprise trait pour trait de `src/components/mascot.tsx` —
si le composant de l'app change, c'est ce fichier-là qu'il faut suivre).

| Artboard | Rôle |
| --- | --- |
| `Main.dc.html` | l'accueil de l'onboarding, avec la seule modification proposée à un écran existant |
| `Retrouver.dc.html` | l'écran qui manque |
| `LienEnvoye.dc.html` | son état d'attente |
| `Collision.dc.html` | la question à trancher |

Les valeurs viennent de `src/constants/theme.ts` et des écrans réels : Spline Sans, accent
`#1F6F4A`, bouton 54 / rayon 27, champ 56 / rayon 16 / bordure 1,5, cartes 18, puces de 8.
L'illustration d'accueil est reprise chemin pour chemin de
`src/components/illustrations/onboarding-hero-illustration.tsx`. Rien n'est arrondi à une
grille.

## Ce qui est proposé

**La porte d'entrée compte plus que l'écran.** « J'ai déjà un compte » est ajouté sur
l'accueil de l'onboarding, en lien tertiaire sous les puces. C'est la seule modification d'un
écran existant, et c'est elle qui fait le gros du travail : proposée là, elle attrape la
personne **avant** qu'elle refasse un bilan, donc elle supprime la collision au lieu de la
gérer. Le coût est assumé — une mention de compte sur un écran dont la promesse est « pas
besoin de compte » — d'où le traitement discret, jamais un bouton.

**La brique technique existe déjà** : `sendAccountAccessLink` (`signInWithOtp` avec
`shouldCreateUser: false`), livrée le même jour pour la page web de suppression. Un lien à
usage unique, valable pour un compte Google comme pour un compte email — les deux portent une
adresse sur `auth.users`. Deux règles vérifiées contre l'API et à ne pas relâcher : une
adresse sans compte renvoie `422 otp_disabled`, donc la page ne peut pas fabriquer de compte ;
et elle ne répond jamais différemment selon que l'adresse en a un, sinon elle dit qui utilise
Ramille.

**La carte « Tu t'es connecté avec Google ? »** n'est pas décorative : le mécanisme marche
pour un compte Google, mais quelqu'un qui n'a jamais tapé de mot de passe ne pensera pas à
chercher une « adresse email ». Sans cette carte, la moitié des gens concernés se croient
exclus.

## La collision, et ce qui a été écarté

Si la personne a commencé un bilan anonyme sur le nouvel appareil avant de vouloir retrouver
son compte, Supabase ne peut pas fusionner deux utilisateurs.

- **Écarté — bloquer la connexion tant qu'un bilan local existe.** Ça piège la personne dans
  un compte vide.
- **Écarté pour la V1 — transférer les lignes vers le compte permanent**, par un RPC qui
  réassigne `user_id` en tenant la preuve des deux sessions. C'est la vraie réponse à terme,
  mais c'est du travail serveur et un chemin de plus à sécuriser.
- **Retenu — le dire, et laisser choisir.** Ce qui se perd n'est pas « des données » : c'est
  le quart d'heure de réponses. Le questionnaire se refait, et il se préremplit depuis le
  dernier bilan du compte retrouvé.

## L'entrée qu'on ne dessine pas

Le retour sur le même appareil n'a pas d'artboard, et c'est le propos : aucun écran ne
s'interpose, la session persiste, la racine route vers `/plan` si un bilan complété existe.
Ce flux marche déjà — il ne faut rien lui ajouter. Un écran de connexion qui s'intercalerait
là casserait ce qui fonctionne.
