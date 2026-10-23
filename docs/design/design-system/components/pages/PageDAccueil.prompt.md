La page d'accueil du web (23/10/2026, étape 5 de `v1-35`) : à l'adresse du site, pour qui n'a ni bilan ni questionnaire en cours — qui en a un va directement à son plan. Elle n'existe pas dans l'app Android, dont l'onboarding reste le premier écran.

```jsx
<PageDAccueil sections={[{ titre: 'Ton bilan', texte: 'Un questionnaire court sur tes habitudes, sans géolocalisation. …' }]} />
```

**L'équivalent de la fiche Play, avec le film** : ses textes sont ceux de la fiche, mot pour mot (`docs/exploitation/fiche-google-play.md` §2.1, comparés par `src/constants/accueil.test.ts`). Une maquette ne les réécrit pas ; une phrase qui change, change d'abord dans la fiche, où chaque phrase dit ce qui la rend vraie.

**Dans l'ordre** : Ramille et son nom ; l'accroche de l'onboarding en titre ; « Découvrir mon impact », « Pas de compte à créer pour commencer. » et « J'ai déjà un compte », comme sur la première page de l'onboarding ; le film (`FilmDePresentation`), sa ligne « Sur Android, Ramille te fait signe par notification ; sur le web, par email. » et sa version texte repliée ; les sections de la fiche, chacune sous un vrai en-tête ; un second « Découvrir mon impact » ; le pied — l'éditeur, le contact, les trois pages publiques. **Aucun chiffre** sur la page, et Ramille ne parle pas.

**La lire n'ouvre pas de session** : ni compte anonyme ni captcha. La session s'ouvre au geste — « Découvrir mon impact », « J'ai déjà un compte » —, avant d'entrer dans l'app ; un refus du captcha y garde son écran (« La vérification n'a pas abouti »). « Découvrir mon impact » mène à la **deuxième** page de l'onboarding : la première redirait ce que cette page vient de dire (décidé le 23/10/2026).

**Le pied porte de vrais liens** (une ancre et son adresse) vers la confidentialité, les conditions et les licences : un moteur et l'écran de consentement de Google les suivent.
