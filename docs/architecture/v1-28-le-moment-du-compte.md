# v1-28 — Le moment du compte, et le code qui remplace le lien

> **Increment livré le 20/09/2026.** Deux arbitrages de produit rendus le même soir, implémentés
> ensemble parce qu'ils touchent les mêmes écrans. Le canvas de design et sa spécification vivent
> dans [`docs/design/v1-21-le-moment-du-compte/`](../design/v1-21-le-moment-du-compte/README.md) —
> figés, comme tous les canvas ; ce document dit ce qui a été **fait**, ce que la mesure a corrigé,
> et ce qui reste ouvert.

## 1. D'où ça vient

La revue de sécurité du 20/09/2026 (`v1-27` §12.9) a trouvé, dans le chemin du compte, un défaut
que le passage en PKCE du même jour ne fermait pas : **PKCE protège la session, pas la confirmation
de l'adresse.** Un `GET /auth/v1/verify` confirme l'adresse **avant** toute redirection, donc
n'importe qui recevant l'e-mail de rattachement rattachait son adresse au compte d'un inconnu d'un
seul clic — le navigateur échouait ensuite à échanger le code, mais le mal était fait côté serveur.

Le texte de l'e-mail a été réécrit dans l'après-midi (`docs/exploitation/gabarits-email.md` §3) pour
retirer l'essentiel de l'efficacité de l'attaque. Le correctif structurel, lui, demandait une
décision de produit : un code à taper au lieu d'un lien à cliquer ajoute une friction au seul
endroit où le lien était parfait — le même appareil. La question a été confiée à une session de
design, élargie en chemin à **tout le parcours d'entrée** : le moment où l'on propose un compte
n'avait jamais été justifié ailleurs que par « après la restitution, avant le plan ».

## 2. Le critère, avant le verdict

C'est ce que le brief réclamait en premier, et c'est l'apport le plus durable de la session :

> **Le compte se propose là où il est la réponse à une question que la personne se pose à cet
> instant, et jamais entre deux écrans qu'elle a demandés.**

Trois tests : la **question** (qu'est-ce qu'elle veut, là, que seul le rattachement donne ?), la
**vérité** (la phrase qui propose est-elle vraie mot pour mot ?), le **coût du refus** (un écran de
plus, ou une ligne dans un écran qu'on lisait déjà ?). Ce que le critère n'est pas : ni le plus tôt,
ni le plus tard, ni le taux de conversion — celui-là est ce qu'on mesurera après.

## 3. Arbitrage 1 — l'écran de compte ne s'interpose plus

**Rendu par la personne qui pilote**, avec une raison qui vaut mieux que l'argument du canvas :
*« je préfère que les utilisateurs voient leur bilan et aient la prise de conscience — c'est tout le
but de l'app — plutôt que de risquer qu'ils quittent juste avant parce qu'on demande un compte trop
tôt »*. C'est le test 1, énoncé par la finalité du produit.

Ce que ça donne, écran par écran :

| Écran | Avant | Après |
| --- | --- | --- |
| Restitution, sortie de questionnaire | « Voir ce que je peux faire » ouvrait `/connexion` tant que la proposition n'avait pas été vue | Le plan, toujours. La bannière « Ce bilan n'est accessible que depuis cet appareil. · Le retrouver ailleurs » se rend **dès le premier passage** |
| Restitution, relecture | Rien | Rien (inchangé — le suivi est l'histoire de la personne) |
| `/connexion` | Interstitiel : « Garde ce résultat et suis ta progression », le rappel du chiffre, « Continuer sans compte » | Détour : « Ton bilan, d'un appareil à l'autre », un corps **dérivé de la provenance**, « Plus tard » ou « Retour » |
| Feuille des rappels | Ligne « Par email » grisée, « Rattache un compte pour l'activer », **sans porte** | La même ligne, et une porte dessous : « Rattacher un compte » |

**Trois choses que ça corrige au passage, et qui étaient fausses indépendamment de l'arbitrage** :
le titre de l'interstitiel (« Garde ce résultat ») promettait de protéger quelque chose qui est en
base depuis `v1-04` §1 ; le bloc « Ce qui est déjà enregistré » répétait l'écran qu'on venait de
quitter ; et le bouton de la restitution ne faisait pas ce qu'il disait.

**Ce qui part avec l'interposition** : la lecture d'`assessment_results` par `/connexion`,
l'événement `connexion_dismiss`, la marque locale « proposition vue » — et, avec elle, la course du
chemin Google sur web (`linkIdentity` rend la main avant la redirection, donc tout ce qui devait
survivre au déchargement de la page était écrit avant l'appel ; plus rien n'a besoin de survivre).

**Ce qui ne bouge pas** : rien avant la soumission du questionnaire ; les huit portes de
`/connexion/retrouver` ; la collision dite **avant** et laissée au choix ; la non-divulgation ;
l'annonce de rattachement sur le plan, une fois.

## 4. Arbitrage 2 — les deux e-mails ne portent plus qu'un code

**Rendu le même soir.** Un code à usage unique, tapé dans l'écran qui l'attend, dans les deux
e-mails : rattachement (`email_change`) et reconnexion (`email`). Un composant pour les trois écrans
qui demandent une adresse — rattacher, retrouver, supprimer.

Ce que le code gagne, au-delà de la sécurité : l'échec « lien ouvert ailleurs » disparaît (bilan sur
l'ordinateur, e-mail lu sur le téléphone) ; la page de suppression, navigateur neuf par définition,
devient le cas le plus simple alors qu'elle était le plus dur ; et le chemin de lien profond sort du
parcours du compte — il reste comme filet, et pour le retour OAuth sur natif.

**Ce qu'il coûte, dit franchement** : sur le même appareil, un toucher unique devient huit chiffres
à recopier, une fois par appareil.

### 4.1 Ce que la mesure a imposé au canvas

Sept vérifications étaient listées comme « à éprouver contre l'API » ; les sept sont faites, contre
une stack locale rendue fidèle à la production. Deux ont contredit le document :

- **Huit chiffres, pas six.** `mailer_otp_length = 8` sur le distant ; `supabase/config.toml`
  portait `6` et le canvas a conclu « six » en le lisant. Ce n'est pas un détail d'affichage : avec
  `rate_limit_verify = 30` par tranche de cinq minutes et par adresse IP et une validité d'une
  heure, une adresse IP dispose de trois cent soixante essais — une chance sur deux mille huit cents
  à six chiffres, une sur deux cent soixante-dix-huit mille à huit. Six suffirait contre une adresse
  IP et pas contre un millier, et le chemin de reconnexion (`shouldCreateUser: false`) transforme
  cette différence en prise de compte. **On garde huit**, et c'est la copy qui a changé.
- **« Sans le code tapé dans l'app qui l'a demandé, rien ne se confirme » est faux.** Mesuré : un
  `POST /auth/v1/verify` portant `type: 'email_change'` et le jeton, **sans aucune session**, répond
  `200`, confirme l'adresse et rend une session complète sur le compte du demandeur. Le code n'est
  lié à rien — ni au client, ni à une session, ni à un vérifieur. **Ce n'est pas le jumeau du PKCE,
  c'est un porteur.** §5 dit ce qui reste ouvert.

Les cinq autres, mesurées et conformes : `verifyOtp({ type: 'email_change' })` ouvre la session sur
le même `user_id` avec `is_anonymous` à `false` ; les deux flux **ne se croisent pas** (`403
otp_expired` dans les deux sens) ; un renvoi engendre un nouveau code et invalide le précédent ; une
session anonyme sans adresse ne demande qu'une confirmation malgré `mailer_secure_email_change_enabled`
(il n'y a pas d'ancienne adresse à confirmer) ; et le tableau de bord accepte un gabarit sans
`{{ .ConfirmationURL }}`.

**Et un code faux rend la même erreur qu'un code expiré** (`403 otp_expired`, « Token has expired or
is invalid ») : les distinguer à l'écran serait inventer une information qu'on n'a pas. Un seul
message, qui nomme les deux causes et donne le même geste.

### 4.2 Trois écarts local/production fermés en chemin

La stack locale ne reproduisait pas la production sur trois réglages, tous **dans le sens
dangereux** — ce qui passe en local échouerait en production. Même famille qu'`enable_confirmations`
la veille :

| Réglage | Local avant | Distant | Ce que l'écart cachait |
| --- | --- | --- | --- |
| `otp_length` | 6 | 8 | La longueur du code, donc l'argument de force brute et toute la copy |
| `max_frequency` | 1 s | 60 s | « Renvoyer un code » touché dans la minute est refusé en production |
| `email_sent` | 2 / h | 30 / h | Une batterie de mesures inexécutable, et des échecs que la production n'aurait pas |

Corollaire pour les suites : **aucun contrôle ne peut demander deux codes pour la même adresse à
moins d'une minute** ; ils utilisent une adresse distincte par assertion.

## 5. Ce qui reste ouvert, et pourquoi on ne le ferme pas

**Le code relève le prix du mauvais geste, il ne le supprime pas.** Plus aucun clic ne confirme —
c'est le gros du danger, un réflexe contre une démarche. Mais un tiers qui recopierait les huit
chiffres confirmerait l'adresse sur le compte de l'attaquant **et sa propre app basculerait sur
cette session**, son bilan anonyme resté derrière.

La seule forme qui refermerait la porte serait **un code à nous** — engendré, envoyé et vérifié par
le produit, la vérification exigeant la session qui a demandé le rattachement —, donc des écritures
dans `auth.users` et `auth.identities` depuis nos propres fonctions : un second mécanisme
d'authentification à tenir à côté de GoTrue, pour un gain qui ne porte que sur le tiers qui recopie
un code qu'il n'a pas demandé. **On ne le fait pas** ; la dette et sa condition de réouverture sont
en `v1-27` §12.12, et la parade reste le texte de l'e-mail, qui dit que l'adresse vient d'être
saisie et qu'il n'y a rien à faire.

## 6. La mesure demandée, et ce qu'elle peut dire

La personne qui pilote a demandé, en accordant l'arbitrage 2 : **mesurer l'écart entre la demande et
le rattachement réel** — et l'équivalent pour la suppression.

**Pour le rattachement, l'écart existe déjà et le chantier le préserve** : `connexion_demande` est
émis à la demande du code (`/connexion/email`), `connexion_success` au **constat** de la bascule,
par l'annonce de `/plan` et par lui seul. L'écart entre les deux est le taux de codes jamais tapés.
Les deux émetteurs vont ensemble : retirer celui du plan ferait lire zéro succès par email.

**Pour la suppression, l'écart n'est pas mesurable en l'état, et c'est structurel** :
`usage_events.user_id` dépend de `profiles`, qui dépend d'`auth.users`, tout en cascade — donc une
suppression réussie **efface les deux côtés de son propre entonnoir**. Ce que ça donne, et qui est
utilisable : une demande **restée** en base est une demande qui n'a pas abouti, et le compte des
suppressions faites doit vivre dans une table **hors de la cascade**. C'est le même raisonnement que
pour le churn de la purge, et il est consigné avec lui dans
[`produit.md`](produit.md), au lot d'administration.

## 7. Ce qui reste à arbitrer

Le §10 du canvas posait sept questions. **Trois sont tranchées** (§3, §4 et la première
ci-dessous). Deux se sont révélées sans objet — la bannière ne se rendait déjà jamais en relecture,
et le verbe « rattacher » était déjà celui de trois surfaces. **Deux attendent** (§7.2 et §7.3).

1. **« Cette adresse a déjà un compte » : tranché le 21/09/2026 — la troisième voie, livrée.**

   **Le fait, mesuré et non raisonné.** `/connexion/email` répondait `200` sur une adresse libre et
   `422 email_exists` sur une adresse qui a un compte, et l'écran le **disait**. Sur la stack
   locale, alignée sur la production pour les trois réglages qui comptent, une **seule** session
   anonyme a sondé vingt fois de suite la même adresse prise : vingt refus, **aucun plafond**. Puis
   dix sessions anonymes distinctes, une sonde chacune : dix fois le même refus. C'était donc un
   oracle binaire propre, sans coût, sans trace et sans limite, sur un écran qu'aucun bilan ne garde
   — atteignable depuis « Toi », ou par son adresse sur web. Ce qui n'a **pas** été mesuré, et qu'il
   ne faut pas prétendre : le distant lui-même, dont le sondage demanderait soit d'écrire sur une
   session de production, soit de viser l'adresse d'un vrai compte.

   **Ce qui était en jeu.** La règle de non-divulgation est tenue partout ailleurs — la page de
   suppression, « retrouver mon compte » —, et elle l'est parce qu'appartenir à Ramille dit quelque
   chose d'une personne : qu'elle se soucie de son empreinte transport. La règle était trouée, et
   elle l'était sur le chemin le plus fréquenté des deux.

   **Les deux voies écartées, et pourquoi.**
   - *Le statu quo* disait le fait et **offrait un choix** : l'écran nommait la conséquence (« le
     bilan que tu viens de faire ne peut pas le rejoindre ») et portait deux sorties, « Retrouver
     mon compte » et « Garder ce bilan sans compte ». C'était honnête, et c'est ce que l'oracle
     achetait. Écarté : une règle à géométrie variable, et le jour où quelqu'un s'en sert, c'est une
     liste d'adresses avec « se soucie de son empreinte transport » à côté.
   - *Le canvas* envoyait un code de connexion **sans rien dire** : seul le titulaire de la boîte
     allait plus loin. L'oracle était fermé — mais la phrase et le choix partaient avec lui, et
     quelqu'un qui s'est trompé d'adresse basculait sur un autre compte **sans avertissement et sans
     retour**, le bilan qu'il vient de remplir restant sur la session qu'il quitte, que la purge
     emporte à quatre-vingt-dix jours. Écarté : faire perdre un bilan fraîchement rempli au moment
     exact de la prise de conscience est la pire chose que ce produit puisse faire.

   **Ce qui est livré : la troisième voie, qui n'était pas au canvas.** Sur `email_exists`,
   `/connexion/email` envoie un code de **connexion** et montre le **même** écran de code que la
   branche libre, avec une phrase **conditionnelle** : « S'il existait déjà un compte Ramille à
   cette adresse, ce code t'y ramène — et le bilan de cet appareil ne l'y rejoindra pas. » Elle est
   vraie dans les deux branches — sur une adresse libre l'antécédent est faux, sur une adresse prise
   elle décrit exactement ce qui va se passer —, donc elle se montre aux deux et ne divulgue rien.
   Et elle arrive **avant** que le code soit tapé, ce qui laisse la sortie : ne pas le taper. Il n'y
   a pas non plus de cul-de-sac où l'on attendrait un code qui ne vient pas — c'est ce qui
   condamnait la version naïve du canvas : un code part dans les deux cas.

   **Le piège central, et c'est lui qu'il faut retenir : le contexte suit la branche, la voix suit
   l'écran hôte.** `ContexteDuCode` décide le `type` envoyé à l'API (`email_change` ou `email`) et
   il **doit** suivre la branche, sans quoi le code est refusé (mesuré le 20/09/2026 : les deux flux
   ne se croisent pas, `403 otp_expired` dans les deux sens). La **voix** — ce que l'écran a le droit
   d'affirmer — est une propriété de l'hôte et ne bouge pas d'une branche à l'autre. Les confondre
   rouvrirait par le texte l'oracle qu'on ferme par le mécanisme : si l'écran disait « un code est
   parti à camille@… » sur une adresse libre et « **si** un compte existe… » sur une adresse prise,
   n'importe qui lirait la réponse dans la phrase — le mécanisme serait juste et la fuite intacte.
   D'où `VoixDeLaSaisie` (`parti` | `peut_etre`) dans `src/types/connexion.ts`, distincte de
   `ContexteDuCode`, et `/connexion/email` en voix `parti` **dans ses deux branches**.

   **Ce que ça a coûté, et c'est exactement ce qui avait été annoncé.** Une phrase conditionnelle
   que la grande majorité lira pour rien ; un choix plus faible qu'avant — on décide de taper le
   code **avant** de savoir, au lieu de décider après avoir lu le fait ; et un second prix non
   prévu, le libellé du bouton, qui disait « Rattacher mon adresse » et est faux quand l'adresse est
   déjà prise — rien n'est rattaché, on rejoint un compte. En mettre un par branche aurait rouvert
   l'oracle sur le bouton lui-même, d'où « Valider mon code » pour les deux.

   **Ce qui a disparu.** La phase `deja-un-compte` et son écran. `SOURCES_RETROUVER` ne perd rien :
   la provenance `email` est toujours émise, par le lien délibéré « J'ai déjà un compte » du
   formulaire, qui reste la porte vers un compte existant — elle n'est simplement plus empruntée
   automatiquement. L'écran de **collision** de `/connexion/retrouver`, lui, n'a pas bougé : il se
   rend quand l'appareil porte déjà un bilan anonyme, et là il n'y a rien à taire puisque la
   personne a demandé à retrouver un compte.

   **Ce qui garde la décision.** Deux tests unitaires sur les phrases (l'un sur l'arité, pour que le
   flux ne puisse pas rentrer dans une dérivation ; l'autre sur le conditionnel de la phrase), et
   surtout l'**assertion 6** de `scripts/verifier-code-de-connexion.mjs`, jouée à chaque PR contre
   une vraie stack : elle crée une adresse prise, joue les deux branches et compare leurs deux
   écrans **réellement rendus**, adresse masquée, puis vérifie que la branche « adresse prise » a
   bien ouvert la session du compte **existant**. Deux mutations l'ont éprouvée — faire suivre la
   voix au flux la fait tomber en imprimant les deux écrans côte à côte ; faire rendre `null` à la
   phrase conditionnelle n'en fait tomber que la seconde moitié, la preuve isolée.

   **Ce que ça ne ferme PAS, et qu'il ne faut pas prétendre fermé.** Le renvoi de code depuis la
   branche `rattachement` peut encore rendre un message d'échec si l'adresse a été prise **entre**
   le premier envoi et le renvoi. Ce n'est pas un oracle exploitable — il faut qu'elle ait été libre
   au premier envoi, donc que quelqu'un la prenne dans l'intervalle, et celui-là le sait déjà — et
   le message reste le générique, qui ne nomme pas l'état de l'adresse. Le commentaire qui
   justifiait cette branche par « le produit le dit déjà au premier envoi » est devenu faux le jour
   même et a été corrigé : il ne le dit plus nulle part.

2. **Où vit la phrase des trois mois.** Elle est sous la sortie de `/connexion`, pour toutes les
   provenances depuis ce chantier. Le canvas propose de l'ajouter sur « Toi » en état `local`.
3. **La porte de la feuille referme la feuille sans valider de canal.** C'est ce que
   l'implémentation fait, faute de pouvoir naviguer sous un `Modal` ouvert ; sur natif, la personne
   ne donne pas la permission push ce jour-là et recevra le mot par email (la préférence par
   défaut), corrigeable dans « Toi ».

## 8. Ce que les deux contre-lectures ont corrigé, après la fusion

Le chantier a été fusionné dans la nuit du 20 au 21/09/2026, puis relu deux fois le 21. **Les deux
passes ont trouvé de vrais défauts**, dont trois confirmés par la mesure, et le relevé complet — par
famille, avec la leçon de processus — est en
[`v1-27` §12.14](v1-27-dette-technique.md). Ce qu'il faut savoir en lisant ce document-ci :

- **la porte « Saisir le code » de « Toi » était du code mort le jour de sa livraison.** Le §4
  décrit la boucle comme refermée là ; elle ne l'était pas, parce que `etatDuRattachement` cherchait
  l'adresse en attente dans `session.email` alors que GoTrue ne remplit que `new_email` sur une
  session anonyme. Mesuré, corrigé, et la phrase du pied de l'écran de code — qui promet de
  retrouver la saisie depuis « Toi » — est vraie depuis ;
- **la règle de non-divulgation du §4 n'était écrite que pour le premier envoi.** « Renvoyer un
  code » distinguait une adresse sans compte d'une adresse connue : un oracle sur la page que Google
  Play exige publique. C'est la seule trouvaille de sécurité des deux passes, et elle est fermée par
  une dérivation à elle (`suiteDuRenvoi`) plutôt que par une condition dans l'écran ;
- **un code recopié depuis une messagerie ne pouvait pas être saisi** : le champ tronquait la saisie
  brute avant que les espaces n'aient été retirés. C'est le défaut le plus visible du chantier, et il
  était invisible à qui **tape** — donc invisible à la recette, qui tape ;
- **le §5 reste exact.** Rien des deux passes ne change ce qui est ouvert : le code est un porteur,
  la dette est en `v1-27` §12.12, et sa condition de réouverture est inchangée ;
- **le §7 reste ouvert tel quel.** Les trois arbitrages n'ont pas été tranchés par la relecture, et
  l'implémentation garde le comportement d'aujourd'hui sur les trois.

Et une garde a été ajoutée là où ce chantier reposait sur une vérification faite à la main : les deux
gabarits d'e-mail sont désormais comparés à leur référence à chaque PR, **avec l'assertion qu'aucun
ne porte de lien de confirmation** — l'invariant du §4, qui n'était jusque-là éprouvé que dans le
seul travail de CI exigeant Docker (`TESTING.md` §2.11).
