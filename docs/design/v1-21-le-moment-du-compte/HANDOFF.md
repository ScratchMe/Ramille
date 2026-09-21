# Handoff : Ramille — v1-21, le moment du compte et le code

## Overview
Ce dossier répond au brief `BRIEF.md` écrit le 20/09/2026 (`v1-27` §12.9 et §12.10) : le moment où
le compte se propose est-il le bon, comment reconnecter quelqu'un maintenant qu'un lien ne voyage
plus, et que faire d'une adresse posée par quelqu'un d'autre. Le `README.md` dit ce qui a été retenu
et pourquoi ; ce document dit **comment le construire**.

Cible : `ScratchMe/TraceVerte`, branche `main`, React Native / Expo Router. Ce canvas demande
**aucune route nouvelle**, **aucune migration de schéma** — la seule ligne de référentiel
concernée (`connexion_dismiss` dans `usage_event_types`) attend la rétention, voir § Mesure —, **deux composants** (`ChampDeCode`, `SaisieDuCode`),
**des dérivations** dans `src/types/connexion.ts` et `src/types/rappels.ts`, **trois fonctions**
dans `src/lib/auth.ts`, et **deux gabarits d'e-mail** réécrits hors dépôt. Il en retire un écran
(l'interstitiel), une marque locale, un événement et une provenance.

## À propos des fichiers de design
Il n'y a pas de `Canvas.dc.html` : les planches sont décrites ici, avec les jetons nommés et les
tailles relevées dans le dépôt. **Rien n'est une valeur inventée** : chaque couleur est un jeton de
`Colors` (dans les deux thèmes), chaque taille un type de `ThemedText` ou une valeur déjà écrite dans
l'écran qu'on touche. Les deux valeurs en dur nouvelles sont celles du champ de code (24/30,
interlettrage 6) et du code dans l'e-mail (28 px) — `README.md`, § Écarts. Un canvas HTML peut être
tiré de ce document après arbitrage.

## Fidélité
**Haute fidélité.** Copy, tailles, rayons, hauteurs et conditions sont définitifs. L'adresse des
planches est `camille@exemple.fr` — le placeholder du produit — et le code **`482913` est une valeur
de démonstration**, comme tout code qui apparaît ci-dessous. Planches de 390 px ; les écrans qui
défilent sont décrits en entier.

## Ce que le canvas tranche
1. **L'interstitiel se retire.** « Voir ce que je peux faire » va au plan, toujours. La bannière de
   la restitution se rend dès le premier passage, avec une phrase vraie, et jamais en relecture.
2. **Le compte se propose là où il répond à une question** : la feuille des rappels (porte sous la
   ligne « Par email »), la carte d'attente du plan (existant), « Toi » (existant).
3. **Le code à six chiffres remplace le lien dans les deux e-mails**, rattachement comme
   reconnexion, et un seul composant le saisit sur les trois écrans qui demandent une adresse.
4. **Une adresse déjà prise se vérifie d'abord et se dit ensuite** : sur `email_exists`, l'écran
   d'adresse demande un code de connexion et montre le même écran de code ; le constat vient après.
5. **Les mots** : rattacher / retrouver ; « Garde ce résultat », « on t'envoie un lien »,
   « Continuer sans compte » s'en vont.

## Ce qui change (résumé)
Ce qui n'est pas listé est inchangé — en particulier Google, le plan (hors un commentaire), le suivi,
la collision de « retrouver », les états vides, `SessionRefusee`, `_layout.tsx`.

1. **`src/app/(tabs)/suivi/bilan.tsx`** — plus de routage vers `/connexion` ; bannière dès le premier
   passage (planche R1) ; le bouton n'attend plus la lecture de la session.
2. **`src/app/connexion/index.tsx`** — plus d'interstitiel : un détour, trois provenances, corps
   dérivé, plus de bloc « Ce qui est déjà enregistré », plus de « Continuer sans compte » (C1).
3. **`src/app/connexion/email.tsx`** — saisie → code → constat ; bascule sur `email_exists`
   (C2, C3, C4) ; reprise depuis « Toi » (C5).
4. **`src/app/connexion/retrouver.tsx`** — la phase `envoye` devient la saisie du code (V2) ; copy.
5. **`src/app/compte/suppression.tsx`** — la phase `lien-envoye` devient la saisie du code (S1).
6. **`src/app/compte/index.tsx`** — état `local` : la phrase des trois mois ; état `a_confirmer` :
   la porte « Saisir le code » (T1).
7. **`src/components/plan/feuille-rappels.tsx`** — la porte « Rattacher un compte » sous la ligne
   « Par email » quand elle est grisée (F1).
8. **`src/components/auth/champ-de-code.tsx`**, **`src/components/auth/saisie-du-code.tsx`** — neufs.
9. **`src/types/connexion.ts`** — `etatDeLaBanniere` remplace `etatDeLaProposition` ;
   `typeDeVerification`, `suiteDeLaDemandeDeCode`, `issueDeLaVerification`,
   `messageDeLaVerification`, `introDeLaConnexion` ; tests.
10. **`src/types/rappels.ts`** — `LigneDeReglage.lienVersLeCompte` ; test.
11. **`src/types/analytics.ts`** — `SOURCES_CONNEXION = ['resultat_cta', 'compte', 'rappels']` ;
    `connexion_dismiss` retiré.
12. **`src/lib/auth.ts`** — `demanderLeRattachement`, `demanderLaConnexion`, `verifierLeCode`.
13. **`src/lib/connexion-prefs.ts`** — `hasSeenConnexionProposal` / `markConnexionProposalSeen`
    retirées ; la clé `traceverte.connexion_proposal_seen.v1` devient orpheline (balayée par préfixe).
14. **`src/lib/compte.ts`** — `effacerLesMarquesLocales` exportée, appelée après un code de
    connexion accepté.
15. **`src/constants/page-titles.ts`** — `/connexion` → « Rattacher un compte — Ramille »,
    `/connexion/email` → « Rattacher mon adresse — Ramille ».
16. **`scripts/verifier-lien-de-connexion.mjs`** → un script du code (§ Ce qui se vérifie).
17. **Hors dépôt** — deux gabarits Supabase (*Magic Link*, *Change Email Address*) sans
    `{{ .ConfirmationURL }}` ; `docs/exploitation/gabarits-email.md` à mettre à jour.

## Planche par planche

Communs : flux plein écran sans bande pour `/connexion/*` (`SafeAreaView`, `padding: 24`, comme
aujourd'hui) ; titres `screenTitle` (26/32) sauf `/connexion` (30/36 en dur, existant) ; corps
`body` `textSecondary` ; **bouton** 54, rayon 27, pleine largeur ; **désactivé** = `backgroundElement`
+ `textTertiary`, jamais une opacité ; **lien** `TextLink`, cible 44 ; **message** `MessageInline`
(région vivante) ; **champ** `TextField` 56, rayon 16. Les cartes teintées des écrans de connexion :
`backgroundSelected`, rayon 18 (`Radius.card`), padding 20, gap 8.

### R1 — La restitution · sortie de questionnaire, session anonyme
`/suivi/bilan?id=…&nouveau=1`, `etatDeLaBanniere` → `anonyme`.
- **En tête du contenu qui défile**, avant « Ton bilan transport » — l'emplacement et le style de la
  bannière existante (`styles.banner` : `Pressable`, `backgroundElement`, rayon 16 (`Radius.field`),
  padding 14 / 16, `flexDirection: row`, `space-between`, gap 16) :
  - texte `small` `textSecondary`, `flex: 1` : **« Ce bilan n'est accessible que depuis cet
    appareil. »** ;
  - action `small` 600 `accentText` : **« Le retrouver ailleurs »** ;
  - `accessibilityRole="link"`, `accessibilityLabel` : **« Ce bilan n'est accessible que depuis cet
    appareil. Le retrouver ailleurs, en rattachant un compte. »** ;
  - toucher → `router.push({ pathname: '/connexion', params: { source: 'resultat_cta' } })` — sans
    `id` : `/connexion` ne lit plus le résultat.
- **Le reste de l'écran est inchangé**, y compris le pied : **« Voir ce que je peux faire »** →
  `router.push('/plan')`, sans condition, jamais désactivé pour une raison de compte.
- **Ne se rend pas** : `inconnu` (session pas encore lue — on ne propose pas un compte à quelqu'un
  dont on ne sait pas s'il en a un), `autre` (compte rattaché, adresse à confirmer, ou relecture).
  L'état `a_confirmer` compte comme `autre` : la personne a déjà fait le geste, « Toi » porte la
  suite.

### R2 — La restitution · relecture, ou compte rattaché
Rien. Ni bannière, ni ligne. La relecture est l'histoire de la personne.

### P1 — Le plan · l'arrivée depuis la restitution
Inchangé : la barre d'onglets masquée jusqu'à la fermeture de « Ton premier plan » (C5.7), la carte
d'attente avec sa porte quand le canal effectif est `aucun`, l'annonce « Ton compte est rattaché à … »
une fois. Un commentaire à corriger : le plan n'est plus « le seul endroit qui peut constater un
rattachement par email » — l'écran de code le peut aussi ; il reste **le seul émetteur** de
`connexion_success` pour l'email (§ Mesure).

### F1 — La feuille des rappels · sans adresse utilisable
Après le premier « C'est noté », `lignesDeReglage` avec `emailPossible: false`.
- La ligne **« Par email »** garde son titre, son détail **« Rattache un compte pour l'activer. »**,
  son état non choisissable (opacité 0,6, celle de l'écran aujourd'hui) et son rôle `radio`
  `disabled`.
- **Sous elle, et seulement sous elle** : `TextLink` **« Rattacher un compte »**, `small` 600
  `accentText`, `containerStyle: styles.reglages` (`alignSelf: flex-start`, `paddingHorizontal: 24`)
  — la forme exacte de « Ouvrir les réglages du téléphone » sous la ligne notification. Rendu
  **dans** la boucle, juste après la ligne, pour la raison déjà écrite dans le composant : détaché,
  il se lirait comme appartenant à « Sans rappel ».
- Toucher : `marquerFeuilleDeRappelVue()`, `onFerme(prefs.prefere, prefs.jetonActif)` (la feuille se
  referme, la préférence ne change pas), puis
  `router.push({ pathname: '/connexion', params: { source: 'rappels' } })`. Le `Modal` doit être
  fermé avant la navigation — sur natif une route poussée sous un `Modal` ouvert reste dessous.
- Ce que ça donne au retour : la préférence en base vaut `email` par défaut
  (`20260907230000_rappels_canal.sql`), donc dès que l'adresse est rattachée le canal effectif est
  `email` sans rien réécrire — la carte d'attente dit « Par email, à camille@exemple.fr. » et le
  plan annonce le rattachement. Sur natif, la personne n'a pas donné la permission push ce jour-là ;
  c'est le point 6 des décisions à trancher.
- **Sur « Toi »**, `ChoixDeRappel` reçoit le même drapeau et **ne rend pas** ce lien : le bouton
  « Rattacher un compte » de la section compte est cent pixels plus haut, et deux portes identiques
  sur un écran calme n'en valent pas une.

### C1 — `/connexion` · le détour
Trois provenances, un écran. `SafeAreaView`, contenu centré (`justifyContent: center`, gap 24), comme
aujourd'hui.
- `Mascot` `calm` 44, sans inclinaison (existant).
- Titre (30/36, letterSpacing −0,6, 600, existant) : **« Ton bilan, d'un appareil à l'autre »**.
- Corps (16/24, `textSecondary`), **dérivé de la provenance** (`introDeLaConnexion`) :
  - `resultat_cta`, `compte` : **« Il est enregistré ici, sur cet appareil. Avec un compte rattaché,
    tu le retrouves sur un autre téléphone ou un ordinateur — tes points et ton plan aussi —, et le
    mot de chaque point peut t'arriver par email. »**
  - `rappels` : **« Le rappel par email a besoin d'une adresse. Avec un compte rattaché, il
    t'arrive — et ton bilan te suit d'un appareil à l'autre, tes points et ton plan aussi. »**
- `GoogleButton` **« Continuer avec Google »** (inchangé ; la marque « proposition vue » posée avant
  l'appel sur web disparaît avec l'interstitiel — plus rien n'a besoin de survivre au déchargement
  de la page). `MessageInline` dessous : « Tu peux réessayer quand tu
  veux. » sur annulation ; l'échec Google inchangé ; `identity_already_exists` →
  `/connexion/retrouver?source=google` (inchangé).
- `TextLink` `linkPrimary` **« Utiliser un email à la place »** →
  `router.push({ pathname: '/connexion/email', params: { source } })` — `source` propagée, sans `id`.
- **Sortie**, `small` `textTertiary`, centrée : depuis `compte`, **« Retour »** (`canGoBack() ?
  back() : replace('/compte')`, existant) ; depuis `resultat_cta` et `rappels`, **« Plus tard »**
  (`canGoBack() ? back() : replace('/plan')`). Rien n'est marqué, rien n'est compté : on n'a rien
  refusé, on a reporté.
- **Sous la sortie**, pour toutes les provenances, `small` `textTertiary` centré, la phrase de C3.9
  gardée mot pour mot : **« Sur cet appareil seulement : si tu changes de téléphone ou si tu ne
  reviens pas pendant trois mois, ton bilan ne te suivra pas. »**
- Liens légaux **« Confidentialité · Conditions d'utilisation »** (inchangés).
- **Ce qui part** : le bloc teinté « Ce qui est déjà enregistré », sa lecture d'`assessment_results`,
  « Continuer sans compte », `connexion_dismiss`, la marque « proposition vue ».
- `useTrackView('connexion_view', { source: sourceConnexion(source) })` inchangé, liste réduite.

### C2 — `/connexion/email` · la saisie de l'adresse
`safeArea` `space-between`, comme aujourd'hui.
- Titre `screenTitle` : **« Rattacher mon adresse »**.
- Corps : **« Une adresse, puis un code reçu par email — pas de mot de passe. Ton bilan reste le
  tien. »**
- `TextField` label **« Email »**, `keyboardType="email-address"`, placeholder `camille@exemple.fr`.
- `MessageInline` (limite d'envoi, transport, échec — § Copy).
- `TextLink` `linkPrimary` **« J'ai déjà un compte »** →
  `/connexion/retrouver?source=email` (inchangé ; la collision y est dite **avant**).
- Pied : `Button` **« Recevoir un code »** (« Envoi… » en cours ; désactivé tant que
  `adresseSemblePlausible` est faux) ; `TextLink` `small` `textTertiary` **« Revenir aux autres
  options »** (`revenirOuRacine`, existant).
- Toucher « Recevoir un code » : `memoriserAdresseDuLien(email)` **avant** l'appel (l'adresse est
  celle tapée ici, jamais déduite d'une réponse), puis `demanderLeRattachement(email)`, puis
  `suiteDeLaDemandeDeCode('rattachement', error)` :
  - `code` → `track('connexion_demande')`, phase **C3** en contexte `rattachement` ;
  - `bascule` (`email_exists`) → `demanderLaConnexion(email)` puis `track('retrouver_send')`, phase
    **C3** en contexte `connexion`, **sans un mot de plus** — l'écran est le même ;
  - `message` → `MessageInline`, on reste ici.

### C3 — La saisie du code · `SaisieDuCode`
Un composant, trois hôtes (`/connexion/email`, `/connexion/retrouver`, `/compte/suppression`). Props :
`contexte: 'rattachement' | 'connexion'`, `adresse`, `libelleBouton`, `onOuverte(session)`,
`onAutreAdresse`, et l'envoi de renvoi. Il tient son propre état (`code`, `occupe`, `message`).
- Titre `screenTitle` : **« Regarde tes emails »**.
- Corps, **par contexte** :
  - `rattachement` : **« Un code à six chiffres vient de partir à camille@exemple.fr. Tape-le ici —
    il vaut une heure. »**
  - `connexion` : **« Si un compte Ramille existe avec cette adresse, un code à six chiffres vient
    d'y partir. Tape-le ici — il vaut une heure. »** (`APP_NAME`.)
- En contexte `connexion` seulement, la carte teintée existante, adaptée : titre `small` 600 **« Le
  code ne crée jamais de compte »**, corps `small` `textSecondary` **« S'il n'y en a pas à cette
  adresse, rien ne part et rien n'est créé. On ne dit pas non plus si l'adresse en a un — ce serait
  dire qui utilise Ramille. »**
- **`ChampDeCode`** : label `small` `textTertiary` **« Code reçu par email »** ; boîte de
  `TextField` (56, rayon 16, `backgroundElement`, bordure 1,5 `accent` dès qu'un chiffre est là) ;
  `TextInput` centré, 24/30, `letterSpacing: 6`, `color: text`, `keyboardType="number-pad"`,
  `inputMode="numeric"`, `maxLength={6}`, `autoComplete="one-time-code"`, `textContentType="oneTimeCode"`
  (sans rien en attendre : aucune plateforme de la V1 ne remplit un code reçu par e-mail) ; seuls les
  chiffres sont gardés à la frappe (une espace collée avec le code est retirée, pas refusée) ;
  `accessibilityLabel="Code reçu par email, six chiffres"`, `accessibilityHint` = le helper ;
  helper `small` `textSecondary` **« Six chiffres, sans espace. »** — c'est lui qui dit ce qui manque,
  le bouton ne se renomme pas.
- `MessageInline` (§ Copy).
- `Button` **`libelleBouton`** — **« Rattacher mon adresse »** (email), **« Retrouver mon compte »**
  (retrouver), **« Ouvrir ma session »** (suppression) ; « Vérification… » en cours ; **désactivé
  sous six chiffres**. **Au sixième chiffre, la vérification part d'elle-même** ; le bouton reste
  pour qui colle, corrige, ou lit avec un lecteur d'écran.
- `TextLink` `small` `textTertiary` **« Renvoyer un code »** → le même envoi que l'hôte a fait
  (rattachement : `demanderLeRattachement` ; connexion : `demanderLaConnexion`), le champ vidé, puis
  `MessageInline` : `rattachement` **« Un nouveau code vient de partir. »** ; `connexion` **« Si un
  compte existe avec cette adresse, un nouveau code vient d'y partir. »** ; limite d'envoi et
  transport comme en C2.
- `TextLink` `small` `textTertiary` **« Utiliser une autre adresse »** → `onAutreAdresse` (retour à
  la saisie, adresse conservée dans le champ).
- **Pied, contexte `rattachement` seulement**, `small` `textTertiary` centré : **« Si tu quittes cet
  écran, tu retrouves la saisie du code depuis « Toi ». »** (C5 le rend vrai.)
- **Vérification** : `verifierLeCode({ email, code, contexte })` → `issueDeLaVerification(error)` :
  - `ouverte` → `onOuverte(session)` ;
  - `refuse` → **« Ce code ne marche pas : il a expiré, ou ce n'est pas le plus récent. Demande-en un
    nouveau. »**, le champ garde ses chiffres (la personne compare avec l'e-mail) ;
  - `trop_dessais` → **« Trop d'essais coup sur coup. Réessaie dans quelques minutes. »** ;
  - `transport` → **« Ta demande n'a pas abouti. Vérifie ta connexion et réessaie. »** ;
  - `echec` → **« La vérification n'a pas abouti. Réessaie dans un instant. »**
- **Après `ouverte`, par hôte** :
  - `/connexion/email`, contexte `rattachement` : `lireEtatDuRattachement()` ; si `rattache`,
    `router.replace('/plan')` — le plan annonce et compte ; sinon (lecture en échec) on navigue
    quand même, la session est ouverte, le plan reprendra l'annonce au passage suivant. **Aucun
    `connexion_success` ici** (§ Mesure).
  - `/connexion/email`, contexte `connexion` (la bascule de C2) : `effacerLesMarquesLocales()` puis
    phase **C4**.
  - `/connexion/retrouver` : `effacerLesMarquesLocales()` puis `router.replace('/')` — la racine
    route vers le plan si le compte porte un bilan, l'onboarding sinon.
  - `/compte/suppression` : `lireEtatDuCompte()` → phase `pret` en `rattache`, sur la même page.

### C4 — `/connexion/email` · l'adresse avait déjà un compte
Phase `retrouve`, atteinte seulement après un code de connexion accepté depuis la bascule de C2.
Contenu centré.
- Titre `screenTitle` : **« Tu as retrouvé ton compte »**.
- Corps : **« Cette adresse en avait déjà un, et c'est lui qui est ouvert maintenant, avec ses bilans
  et son plan. Le bilan fait sur cet appareil est resté à part : il ne le rejoindra pas. »**
- Corps 2 : **« Si tu veux le refaire depuis ton compte, ça va vite : tes réponses précédentes sont
  pré-remplies. »** (Celles du compte retrouvé — le préremplissage lit le dernier bilan complété de la
  session courante, `src/lib/bilan-history.ts`.)
- `Button` **« Voir mon plan »** → `router.replace('/')`.
- Sans mascotte : un fait sur les données de la personne.

### C5 — `/connexion/email` · reprise depuis « Toi »
`/connexion/email?reprise=1`, ouvert par T1 quand l'état est `a_confirmer`.
- Au montage, `lireAdresseDuLien()` : une adresse → l'écran s'ouvre **directement en C3**, contexte
  `rattachement`, sans renvoyer de code (celui reçu vaut encore, ou « Renvoyer » est là) ; aucune →
  C2, champ vide, sans message (rien n'a échoué).
- L'adresse ne passe **jamais** par l'URL (règle du 20/09/2026, `v1-27` §12.9) ; « Toi » la connaît
  par `getUser()`, mais c'est la mémoire locale qui la relit — sur l'appareil qui a tapé l'adresse,
  elle est toujours là.
- Le paramètre `motif` existant (lien expiré, lien ouvert ailleurs) reste lu : un lien parti avant le
  changement peut encore revenir ; il ouvre C2 avec son message, comme aujourd'hui.

### T1 — « Toi » · `local` et `a_confirmer`
- `local` : corps `body` `textSecondary` **« Ton bilan reste sur cet appareil, tant que tu y reviens
  dans les trois mois. Un compte rattaché le fait te suivre ailleurs, et le garde. »** ; `Button`
  **« Rattacher un compte »** → `/connexion?source=compte` (inchangé). La phrase des trois mois est
  vraie au sens de `purge_stale_anonymous_accounts` (90 jours sans signe de vie : ouverture, bilan,
  réponse, retour) — à ne pas réécrire ailleurs sans relire la fonction.
- `a_confirmer` : corps **« Adresse à confirmer : camille@exemple.fr. Un code est parti par email ;
  une fois tapé, ton bilan te suivra d'un appareil à l'autre. »** ; dessous, `TextLink` `small` 600
  `accentText` **« Saisir le code »** → `/connexion/email?reprise=1`. Un fait et une porte, pas une
  relance : ni « pense à », ni bouton de renvoi ici (il est sur l'écran de code).
- `rattache`, `indisponible`, les rappels, « Mes données » : inchangés.

### V1 — `/connexion/retrouver` · la saisie
- Titre **« Retrouver mon compte »** (inchangé).
- Corps : **« Indique l'adresse de ton compte : un code à taper ici te reconnecte, avec tes bilans et
  ton plan. »**
- `TextField` **« Adresse email du compte »** (inchangé), `MessageInline`, `Button` **« Recevoir un
  code »** (« Envoi… »).
- Carte teintée : **« Ton compte est un compte Google ? »** / **« C'est la même adresse — celle de ton
  compte Google. Pas besoin de mot de passe : le code suffit. »**
- Pied inchangé : **« Tu n'as jamais créé de compte ? Reviens en arrière : tout est accessible
  sans. »** + **« Retour »**.
- Toucher : `track('retrouver_send')`, `memoriserAdresseDuLien(email)`, `demanderLaConnexion(email)`,
  puis `suiteDeLaDemandeDeCode('connexion', error)` — transport et limite d'envoi se disent ; **tout
  le reste mène à V2**, `otp_disabled` compris.

### V2 — `/connexion/retrouver` · le code
La phase `envoye` d'aujourd'hui, remplacée par `SaisieDuCode` en contexte `connexion`, bouton
**« Retrouver mon compte »**. Après `ouverte` : balayage des marques locales, `router.replace('/')`.
Le pied « Le lien expire au bout d'un moment… » disparaît : « il vaut une heure » est dans le corps,
et « Renvoyer un code » sous le champ.

### V3 — `/connexion/retrouver` · la collision
Inchangée mot pour mot : **« Cet appareil porte déjà un bilan »**, ses deux paragraphes, **« Retrouver
mon compte »** / **« Garder ce bilan sur cet appareil »**, la note. C'est le choix **avant**, et il
reste le chemin de qui sait avoir un compte.

### S1 — `/compte/suppression` · navigateur neuf
- `inconnu` : corps **« Ce navigateur n'est rattaché à aucun compte. Indique l'adresse de ton compte,
  puis le code reçu par email : la session s'ouvre ici, et la suppression se fait en un geste. »** ;
  champ, `Button` **« Recevoir un code »** ; la ligne « Si tu as encore l'application… » inchangée.
- Puis `SaisieDuCode` en contexte `connexion`, bouton **« Ouvrir ma session »**, sur la même page.
  Après `ouverte` : `lireEtatDuCompte()` → `rattache` → le bloc de suppression, comme aujourd'hui
  quand le lien revenait. La phase `lien-envoye` et sa copy disparaissent.

### E1 — L'e-mail de reconnexion (*Magic Link*)
Objet **« Ton code pour retrouver ton compte »**. Corps :

```html
<p>Bonjour,</p>
<p>Voici ton code pour retrouver ton compte Ramille :</p>
<p style="font-size:28px;letter-spacing:6px;font-weight:600">{{ .Token }}</p>
<p>Tape-le dans Ramille, sur l'écran qui l'attend. Il vaut une heure, une seule fois.</p>
<p>Si tu n'as rien demandé, tu peux ignorer ce message : sans ce code, personne n'entre.</p>
<p>— Ramille</p>
```

### E2 — L'e-mail de rattachement (*Change Email Address*)
Objet inchangé, **« Cette adresse vient d'être saisie dans Ramille »** — et le §3 de
`gabarits-email.md` vaut toujours : le destinataire n'a peut-être rien demandé. Corps :

```html
<p>Bonjour,</p>
<p>L'adresse {{ .NewEmail }} vient d'être saisie dans Ramille, pour qu'un bilan transport puisse être retrouvé depuis un autre appareil. Si c'est toi, voici le code à taper dans Ramille, sur l'écran qui l'attend :</p>
<p style="font-size:28px;letter-spacing:6px;font-weight:600">{{ .Token }}</p>
<p>Il vaut une heure, une seule fois.</p>
<p>Si ce n'est pas toi, ne fais rien : sans ce code, cette adresse n'est rattachée à rien — et personne ne peut le taper à ta place.</p>
<p>— Ramille</p>
```

**Aucun `{{ .ConfirmationURL }}` dans aucun des deux**, et ce n'est pas une simplification : dans E2
le lien était la faille §4.3. *Confirm signup* et *Reset Password* restent tels quels (aucun chemin
ne les emprunte).

### G — Google
Inchangé : web par redirection plein écran (`linkIdentity`, retour sur `/plan`,
`detectSessionInUrl`), natif par `openAuthSessionAsync` et `createSessionFromUrl`. Les Redirect URLs
ne servent plus qu'à lui ; `redirect-urls.md` le note, sans retirer d'entrée dans ce chantier.

### Le parcours, moment par moment

| Le moment | Ce que la personne voit | Ce qui est nouveau | Ce qui l'explique |
| --- | --- | --- | --- |
| Sortie du questionnaire (R1) | La restitution, une ligne en tête : « Ce bilan n'est accessible que depuis cet appareil. · Le retrouver ailleurs » | La ligne dès le premier passage | Elle-même |
| « Voir ce que je peux faire » (P1) | Le plan, directement | Plus d'interstitiel | — |
| « Le retrouver ailleurs » (C1) | `/connexion` : Google, ou un email ; « Plus tard » | Le corps, la sortie | Le corps |
| Premier « C'est noté » (F1) | La feuille : notification / email (grisé, « Rattacher un compte » dessous) / sans rappel | La porte | Le détail de la ligne |
| « Rattacher un compte » depuis la feuille (C1, `rappels`) | `/connexion`, corps « Le rappel par email a besoin d'une adresse. » | La provenance | Le corps |
| « Utiliser un email à la place » (C2) | « Rattacher mon adresse », un champ, « Recevoir un code » | Le titre, le bouton | Le corps |
| « Recevoir un code » (C3) | « Regarde tes emails », le champ de code | Le code | Le corps, le helper |
| Le code accepté | Le plan, « Ton compte est rattaché à camille@exemple.fr. » ; la carte d'attente « Par email, à … » | Rien | Inchangé |
| L'adresse avait un compte (C2 → C3 → C4) | Le même écran de code, puis « Tu as retrouvé ton compte » | Le constat après | C4 |
| L'onglet parti, sur web (T1 → C5) | « Toi » : « Adresse à confirmer … · Saisir le code » | La porte | T1 |
| Un appareil neuf (V1, V2) | « Retrouver mon compte », l'adresse, le code, le plan | Le code à la place du lien | V2 |
| Un e-mail lu ailleurs que là où il a été demandé | Rien de particulier : on tape le code là où l'écran attend | — | — |
| Un navigateur neuf pour supprimer (S1) | L'adresse, le code, la suppression, sur la même page | Le code | S1 |

## Copy définitive

| Où | Texte |
| --- | --- |
| R1, bannière, texte | Ce bilan n'est accessible que depuis cet appareil. |
| R1, bannière, action | Le retrouver ailleurs |
| R1, bannière, libellé annoncé | Ce bilan n'est accessible que depuis cet appareil. Le retrouver ailleurs, en rattachant un compte. |
| C1, titre | Ton bilan, d'un appareil à l'autre |
| C1, corps (`resultat_cta`, `compte`) | Il est enregistré ici, sur cet appareil. Avec un compte rattaché, tu le retrouves sur un autre téléphone ou un ordinateur — tes points et ton plan aussi —, et le mot de chaque point peut t'arriver par email. |
| C1, corps (`rappels`) | Le rappel par email a besoin d'une adresse. Avec un compte rattaché, il t'arrive — et ton bilan te suit d'un appareil à l'autre, tes points et ton plan aussi. |
| C1, Google | Continuer avec Google |
| C1, lien email | Utiliser un email à la place |
| C1, sortie (`compte`) | Retour |
| C1, sortie (autres) | Plus tard |
| C1, sous la sortie | Sur cet appareil seulement : si tu changes de téléphone ou si tu ne reviens pas pendant trois mois, ton bilan ne te suivra pas. |
| C2, titre | Rattacher mon adresse |
| C2, corps | Une adresse, puis un code reçu par email — pas de mot de passe. Ton bilan reste le tien. |
| C2, champ | Email |
| C2, lien | J'ai déjà un compte |
| C2, bouton | Recevoir un code · Envoi… |
| C2, retour | Revenir aux autres options |
| C2, envoi refusé (échec) | L'envoi n'a pas abouti. Vérifie l'adresse et réessaie. |
| C2/V1/S1, limite d'envoi | Trop de demandes coup sur coup. Réessaie dans quelques minutes. |
| C2/V1/S1, transport | Ta demande n'a pas abouti. Vérifie ta connexion et réessaie. |
| C3, titre | Regarde tes emails |
| C3, corps (`rattachement`) | Un code à six chiffres vient de partir à {adresse}. Tape-le ici — il vaut une heure. |
| C3, corps (`connexion`) | Si un compte {APP_NAME} existe avec cette adresse, un code à six chiffres vient d'y partir. Tape-le ici — il vaut une heure. |
| C3, carte (`connexion`), titre | Le code ne crée jamais de compte |
| C3, carte (`connexion`), corps | S'il n'y en a pas à cette adresse, rien ne part et rien n'est créé. On ne dit pas non plus si l'adresse en a un — ce serait dire qui utilise {APP_NAME}. |
| C3, champ, label | Code reçu par email |
| C3, champ, libellé annoncé | Code reçu par email, six chiffres |
| C3, champ, helper | Six chiffres, sans espace. |
| C3, bouton (email) | Rattacher mon adresse · Vérification… |
| C3, bouton (retrouver) | Retrouver mon compte · Vérification… |
| C3, bouton (suppression) | Ouvrir ma session · Vérification… |
| C3, renvoyer | Renvoyer un code |
| C3, renvoyé (`rattachement`) | Un nouveau code vient de partir. |
| C3, renvoyé (`connexion`) | Si un compte existe avec cette adresse, un nouveau code vient d'y partir. |
| C3, autre adresse | Utiliser une autre adresse |
| C3, pied (`rattachement`) | Si tu quittes cet écran, tu retrouves la saisie du code depuis « Toi ». |
| C3, code refusé | Ce code ne marche pas : il a expiré, ou ce n'est pas le plus récent. Demande-en un nouveau. |
| C3, trop d'essais | Trop d'essais coup sur coup. Réessaie dans quelques minutes. |
| C3, échec | La vérification n'a pas abouti. Réessaie dans un instant. |
| C4, titre | Tu as retrouvé ton compte |
| C4, corps | Cette adresse en avait déjà un, et c'est lui qui est ouvert maintenant, avec ses bilans et son plan. Le bilan fait sur cet appareil est resté à part : il ne le rejoindra pas. |
| C4, corps 2 | Si tu veux le refaire depuis ton compte, ça va vite : tes réponses précédentes sont pré-remplies. |
| C4, bouton | Voir mon plan |
| T1, `local` | Ton bilan reste sur cet appareil, tant que tu y reviens dans les trois mois. Un compte rattaché le fait te suivre ailleurs, et le garde. |
| T1, `a_confirmer` | Adresse à confirmer : {email}. Un code est parti par email ; une fois tapé, ton bilan te suivra d'un appareil à l'autre. |
| T1, `a_confirmer`, lien | Saisir le code |
| V1, corps | Indique l'adresse de ton compte : un code à taper ici te reconnecte, avec tes bilans et ton plan. |
| V1, bouton | Recevoir un code · Envoi… |
| V1, carte Google | Ton compte est un compte Google ? / C'est la même adresse — celle de ton compte Google. Pas besoin de mot de passe : le code suffit. |
| S1, `inconnu` | Ce navigateur n'est rattaché à aucun compte. Indique l'adresse de ton compte, puis le code reçu par email : la session s'ouvre ici, et la suppression se fait en un geste. |
| E1, objet | Ton code pour retrouver ton compte |
| E2, objet | Cette adresse vient d'être saisie dans Ramille |
| Web, titre d'onglet `/connexion` | Rattacher un compte — Ramille |
| Web, titre d'onglet `/connexion/email` | Rattacher mon adresse — Ramille |

Tout est en voix produit. Aucune ligne de Ramille n'est ajoutée ni modifiée. Aucun point
d'exclamation, aucun nombre autre que « six chiffres » et « trois mois », qui sont des faits du
mécanisme et de la purge, pas des chiffres de la personne.

## Les dérivations

### `src/types/connexion.ts` (module pur, `connexion.test.ts`)
- `EtatBanniere = 'inconnu' | 'anonyme' | 'autre'` et
  `etatDeLaBanniere({ estAnonyme: boolean | null; mode: ModeResultat })` : `mode === 'relecture'` →
  `autre` ; `estAnonyme === null` → `inconnu` ; `true` → `anonyme` ; `false` → `autre`.
  **Remplace** `EtatProposition` / `etatDeLaProposition` et le paramètre `dejaProposee`. Tests : la
  relecture ne montre jamais ; `inconnu` ne montre jamais ; et la mutation « `null` → `anonyme` »
  tombe.
- `ContexteDuCode = 'rattachement' | 'connexion'` ;
  `typeDeVerification(contexte): 'email_change' | 'email'`. Un test lit le type `EmailOtpType`
  d'`auth-js` pour épingler que les deux valeurs en font partie — c'est un miroir d'une liste tenue
  ailleurs, et il se déclare comme tel.
- `suiteDeLaDemandeDeCode(contexte, error): { suite: 'code' } | { suite: 'bascule' } |
  { suite: 'message'; message: string }` :
  - `error` nul → `code` ;
  - `rattachement` et `adresseDejaRattachee(error)` → `bascule` ;
  - `estLimiteDEnvoi(error)` → message limite ; `estPanneDeTransport(error)` → message transport ;
  - `rattachement`, toute autre erreur → message « L'envoi n'a pas abouti. Vérifie l'adresse et
    réessaie. » ;
  - `connexion`, toute autre erreur → **`code`** — la non-divulgation, en une ligne testée : un
    `422 otp_disabled` mène à l'écran de code comme un envoi accepté, et un `email_exists` en
    contexte `connexion` n'existe pas (on ne rattache rien là).
- `IssueVerification = 'ouverte' | 'refuse' | 'trop_dessais' | 'transport' | 'echec'` ;
  `issueDeLaVerification(error)` — au **code** et jamais au message : `null` → `ouverte` ;
  `otp_expired` → `refuse` (à vérifier contre l'API, § À éprouver, point 1) ; `over_request_rate_limit`
  ou statut 429 → `trop_dessais` ; `estPanneDeTransport` → `transport` ; sinon `echec`.
  `messageDeLaVerification(issue)` rend les quatre phrases de la copy.
- `introDeLaConnexion(source: SourceConnexion): string` — les deux corps de C1.
- `messageDuRetourDeLien` et `MOTIFS_RETOUR_LIEN` restent : un lien parti avant le changement peut
  encore revenir, et `_layout.tsx` les lit.

### `src/types/rappels.ts` (`rappels.test.ts`)
- `LigneDeReglage.lienVersLeCompte: boolean` — vrai exactement pour la ligne `email` quand
  `emailPossible` est faux, c'est-à-dire là où son détail dit « Rattache un compte pour l'activer. ».
  Le test épingle l'invariant sur le sens (« la porte se rend là où la ligne la réclame »), pas sur
  la phrase — la règle de `carteAttente`.

### `src/types/analytics.ts` (`analytics.test.ts`)
- `SOURCES_CONNEXION = ['resultat_cta', 'compte', 'rappels'] as const` ; `sourceConnexion` retombe
  sur `'compte'` — une arrivée sans provenance est un rechargement ou un favori, c'est-à-dire une
  visite délibérée, plus proche de « Toi » que d'une bannière (choix technique, à écrire dans le
  commentaire).
- `USAGE_EVENT_NAMES` sans `connexion_dismiss`.

### `src/lib/auth.ts`
- `demanderLeRattachement(email)` = `updateUser({ email })` **sans** `emailRedirectTo` (rien ne
  revient par une URL).
- `demanderLaConnexion(email)` = `signInWithOtp({ email, options: { shouldCreateUser: false } })`,
  sans `emailRedirectTo`.
- `verifierLeCode({ email, code, contexte })` = `verifyOtp({ email, token: code, type:
  typeDeVerification(contexte) })` → `{ session, error }`.
- `linkEmail` et `sendAccountAccessLink` disparaissent ou deviennent ces deux enveloppes ; leurs
  commentaires sur `redirectTo` deviennent faux et se retirent.

### `src/lib/connexion-prefs.ts`, `src/lib/compte.ts`
- `hasSeenConnexionProposal` / `markConnexionProposalSeen` retirées avec leurs appelants (restitution,
  `/connexion`, `/connexion/email`). La clé reste en stockage chez qui l'a ; le balayage par préfixe
  s'en occupe.
- `memoriserAdresseDuLien` / `lireAdresseDuLien` gardées (renommables en `…DuCode`).
- `effacerLesMarquesLocales` exportée. **Réserve** : elle emporte le brouillon de bilan. Sur le chemin
  de la collision (V3 → V2) il n'y en a pas — le bilan est soumis ; depuis l'accueil de l'onboarding
  il peut y en avoir un, et le retrouver est alors le choix de la personne. Écrire ce cas dans le
  commentaire.

### Composants
- `src/components/auth/champ-de-code.tsx` — `ChampDeCode({ value, onChangeText, label, helperText,
  disabled })`, voir C3.
- `src/components/auth/saisie-du-code.tsx` — `SaisieDuCode`, voir C3. Pas de `Modal`, pas de route :
  une phase rendue par son hôte.

### Routes, titres, exports
- Aucune route nouvelle ; `page-titles.ts` change deux libellés. `assetlinks.json`, `robots.txt`,
  `sitemap.xml` ne bougent pas ; `verifier-titres-export.mjs` voit les deux titres.

## Les conditions d'affichage
- **R1** : `mode === 'nouveau'` **et** `etatDeLaBanniere(...) === 'anonyme'`. La lecture de session
  reste celle d'aujourd'hui (`getSession()`, `is_anonymous`), lancée à `state.status === 'ok'`.
- **F1, la porte** : `ligne.canal === 'email' && ligne.lienVersLeCompte`, dans la feuille seulement.
- **C1, le corps** : `introDeLaConnexion(sourceConnexion(source))`.
- **C3, la carte « Le code ne crée jamais de compte »** : `contexte === 'connexion'`.
- **C3, le pied « depuis Toi »** : `contexte === 'rattachement'`.
- **C3, le bouton** : actif si `code.length === 6 && !occupe`.
- **C4** : uniquement après `ouverte` en contexte `connexion` **sur `/connexion/email`**.
- **C5** : `reprise === '1'` et une adresse en local → C3 ; sinon C2.
- **T1, « Saisir le code »** : `etat.kind === 'a_confirmer'`.

## Interactions et états
- **Restitution** : plus de bouton désactivé pour une raison de compte ; `inconnu` n'est plus un
  repli sûr à choisir, il ne montre simplement rien.
- **Feuille** : la porte referme la feuille (marque vue) sans valider ; la préférence ne bouge pas.
- **Code** : envoi au sixième chiffre ; chiffres gardés sur refus ; champ vidé sur renvoi ;
  « Utiliser une autre adresse » ramène à la saisie avec l'adresse dans le champ.
- **Après un code de connexion accepté** (V2, C4, S1) : `effacerLesMarquesLocales()` **avant** de
  naviguer, pour que le plan du compte retrouvé ne lise pas les marques de la session qu'on quitte
  (`rattachement_annonce`, `premier_parcours`, `saison_vue`…). Le jeton d'appareil suit déjà par
  `onAuthStateChange` (`_layout.tsx`).
- **Après un code de rattachement accepté** (C3 sur `/connexion/email`) : pas de balayage — c'est le
  même utilisateur ; `router.replace('/plan')`.
- **Hors ligne** : C2/V1/S1 disent « Ta demande n'a pas abouti. Vérifie ta connexion et
  réessaie. » ; C3 dit la même chose à la vérification ; rien ne se fige, rien n'affirme.
- **L'app tuée pendant l'aller-retour vers la messagerie** : rattachement → « Toi » `a_confirmer`
  → C5 ; reconnexion → V1 avec l'adresse préremplie (`lireAdresseDuLien`), un code neuf.
- **Un lien d'avant le changement** qui arrive encore : `_layout.tsx` inchangé, C2 ou V1 avec le
  `motif`, comme aujourd'hui.
- **Retour matériel / geste** : la plateforme, sans interception ; `revenirOuRacine` reste sur les
  sorties nommées.

## Accessibilité
- Le champ de code est **un** champ, nommé (`accessibilityLabel`), son helper en `accessibilityHint` ;
  les refus passent par `MessageInline` (`role="alert"`, `polite`).
- Le bouton principal reste présent même si la vérification part au sixième chiffre : un lecteur
  d'écran a une cible explicite.
- La bannière recompose ses deux textes en un libellé (existant). La porte de la feuille est un
  `TextLink` dans le `radiogroup`, hors des `radio`, comme le lien des réglages.
- Les titres s'annoncent en en-tête par leur type. Tout suit l'agrandissement des polices ; le champ
  de code garde `minHeight` et non `height`.

## Mesure
- `connexion_view { source }` : trois provenances. `resultat_transition` **disparaît** (plus émise —
  déclarée, elle se lirait zéro) ; `rappels` **apparaît**. La base ne valide pas les valeurs de
  `props` : la description du référentiel se met à jour.
- `connexion_demande` : à la demande d'un code de **rattachement** (C2, suite `code`) — jamais sur la
  bascule.
- `retrouver_send` : V1 (comme aujourd'hui — la page de suppression continue de ne rien émettre,
  sans quoi l'écart ci-dessous se brouillerait) et **la bascule de C2**. Cette dernière n'a pas de
  `retrouver_view` : l'écart `retrouver_send − retrouver_view` est le nombre de collisions par
  adresse, sans événement neuf. À écrire dans le commentaire des deux.
- `connexion_success` : **inchangé** — le plan pour `email` (et Google sur web), `/connexion` pour
  Google natif, sous la marque d'annonce. L'écran de code **n'émet pas** ; l'émettre là doublerait
  la branche email. Le commentaire du plan se corrige (« le seul endroit qui peut constater » → « le
  seul émetteur »).
- `connexion_dismiss` : retiré du type et de `USAGE_EVENT_NAMES`. La ligne de `usage_event_types`
  ne peut pas être supprimée tant que des lignes d'`usage_events` la référencent (clé étrangère) ;
  la retirer par migration quand la rétention de douze mois les aura purgées, et le noter dans le
  test pgTAP `12` d'ici là.
- Une reconnexion réussie n'a pas d'événement : `auth` la porte.

## Ce qui se retire
L'interstitiel et sa marque ; le bloc « Ce qui est déjà enregistré » et sa lecture ; « Continuer
sans compte » ; `connexion_dismiss` ; `resultat_transition` ; `etatDeLaProposition` ; les phases
`envoye` (retrouver) et `lien-envoye` (suppression) ; `emailRedirectTo` sur les deux envois ; les
commentaires qui décrivent le lien comme chemin de la reconnexion (`auth.ts`, `retrouver.tsx`,
`email.tsx`, `_layout.tsx` en partie).

## Hors dépôt — à faire avant de fusionner l'écran
- Les deux gabarits E1 et E2 dans le tableau de bord Supabase (Authentication → Emails), et
  `docs/exploitation/gabarits-email.md` §2 mis à jour avec leur texte et la raison (le lien de E2
  était §4.3).
- `docs/exploitation/redirect-urls.md` : une note que seul Google emprunte encore la liste ; aucune
  entrée retirée ici.
- `v1-13` §11 : la ligne de recette W.9 (le contenu de l'e-mail) se rejoue avec le code, et une
  ligne de plus — taper le code reçu sur un autre appareil que celui qui l'a demandé.

## Ce qui se vérifie en CI
`scripts/verifier-lien-de-connexion.mjs` devient le script du code, avec le même prérequis
(`[local_smtp]`, Mailpit, export servi sur le port 3000) et trois assertions dont deux sont des
présences et une une absence :
1. un code demandé par l'écran, lu dans Mailpit et tapé **dans le même navigateur** ouvre la session ;
2. le même code tapé **dans un second contexte de navigateur** (Playwright `newContext`) ouvre la
   session aussi — c'est la promesse du brief §4.2, et elle se prouve ici plutôt que de se croire ;
3. une URL portant des jetons valides ne fait toujours pas basculer de compte (inchangée), avec la
   leçon de `TESTING.md` §2.9 : laisser à l'attaque le temps et les conditions de réussir.
Et une quatrième, **négative**, pour §4.3 : l'e-mail de rattachement reçu dans Mailpit **ne contient
aucun lien** (`/auth/v1/verify` absent du corps).

## À éprouver contre l'API — ce que la lecture ne pouvait pas dire
Sept points, chacun à mesurer avant d'écrire la dérivation qui en dépend, comme
`over_email_send_rate_limit` l'a été le 05/09/2026 :
1. **Le code d'erreur exact d'un code faux et d'un code expiré** (`otp_expired` attendu pour les
   deux), et qu'une adresse **sans compte** en contexte `connexion` rende **le même** — sinon
   `issueDeLaVerification` les unifie côté client, et le test le dit.
2. **`verifyOtp({ type: 'email_change' })` ouvre la session sur le même `user_id`**, `is_anonymous`
   passé à `false`, y compris depuis un autre appareil que celui qui a demandé (le brief §4.2 l'a
   mesuré pour le lien magique ; le rattachement est un autre type).
3. **Un code de rattachement tapé sur l'écran de connexion est refusé, et l'inverse** — les deux
   flux ne se croisent pas, ce qui est ce qui rend C2 → C3 sûr.
4. **`updateUser` rejoué avec la même adresse** renvoie un nouveau code et invalide l'ancien
   (`max_frequency`), pour que « Renvoyer » fasse ce qu'il dit.
5. **Le plafond `token_verifications` du distant** (30 par 5 minutes et par IP en local) : c'est lui
   qui rend six chiffres suffisants ; le relever et l'écrire dans `docs/exploitation/README.md`.
6. **La confirmation d'un changement d'adresse sur une session anonyme sans adresse** ne demande
   qu'un code (« Secure email change » du distant) — `gabarits-email.md` §4 l'a joué avec le lien en
   local, pas avec le code.
7. **Le tableau de bord accepte un gabarit sans `{{ .ConfirmationURL }}`** (aucune validation
   connue, à constater en enregistrant).

## Règles non négociables (brief §5)
Rattacher, jamais recréer : `updateUser` sur la session courante, `linkIdentity` pour Google, et la
bascule de C2 ne rattache rien — elle **retrouve**. Pas de mot de passe, nulle part. La
non-divulgation tient sur « retrouver » et **se referme** sur « rattacher » (une adresse inconnue et
une adresse prise mènent au même écran). Google et email, c'est tout. Rien n'est obligatoire : aucun
écran ne s'interpose, chaque porte a un « Plus tard », un « Retour » ou un autre choix. Tout est en
français ; Ramille ne dit rien de plus qu'avant. La page de suppression garde son chemin sans l'app,
et le code le rend plus court.

## Fichiers
- `README.md` — le critère, le verdict, la carte du moment, lien ou code, l'adresse d'un tiers et
  l'adresse prise, les mots, ce qui a été écarté, les écarts assumés, ce qui reste à trancher.
- `HANDOFF.md` — ce document.
- `BRIEF.md` — le brief du 20/09/2026.
