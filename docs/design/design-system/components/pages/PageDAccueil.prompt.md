La page d'accueil du web (31/10/2026, `docs/architecture/v1-36-la-page-d-accueil.md`) : à l'adresse du site, pour qui n'a ni bilan ni questionnaire en cours — qui en a un va directement à son plan. Elle n'existe pas dans l'app Android, dont l'onboarding reste le premier écran.

```jsx
<PageDAccueil sections={[{ titre: 'Ton bilan', texte: 'Un questionnaire court sur tes habitudes, sans géolocalisation. …' }]} />
```

**Un récit, puis ce que fait Ramille.** Elle part de ce qu'on a vécu — l'été 2026, le plus chaud jamais mesuré en France, dans les mots de Météo-France —, montre la part du transport dans notre empreinte, puis ce qui est à notre portée : « Tu ne peux pas arrêter une canicule. Tu peux changer un trajet. » La promesse a été choisie avec la personne qui pilote le 31/10/2026 : des faits datés et sourcés, puis l'action à sa mesure — ni « sauver la planète », ni vocabulaire de catastrophe. Ce que fait Ramille vient ensuite, et c'est la fiche Play, mot pour mot (`src/constants/accueil.test.ts` la compare).

**Dans l'ordre** : le nom de Ramille, **sans son visage** — la bande de l'été est un chiffre lourd, et Ramille ne se tient jamais à côté ; « Été 2026, d'après Météo-France » ; le titre ; la bande de l'été (`BandeDeLEte`) et sa légende ; le chapeau ; le premier bouton, « Ton bilan prend 5 minutes environ. Pas de compte à créer pour commencer. » et « J'ai déjà un compte » ; les 53 jours, trois faits et leur source ; l'échelle des étés (`EchelleDesEtes`) ; la part du transport (`PartDuTransport`) et sa source ; la bande teintée où Ramille parle, **la seule sans chiffre** — son bouton n'y dit pas la durée —, et un bouton ; comment ça marche, les trois temps reliés par un trait ; les garanties et les limites ; le film, sa ligne et sa version texte repliée ; la dernière bande teintée et son bouton ; le pied — l'éditeur, le contact, les trois pages publiques, en vrais liens.

**Une barre d'appel en bas de l'écran**, entre le premier bouton et le dernier : un bouton toujours à portée, sans revenir en haut. Elle entre en fondu, à la durée de la barre d'onglets, et s'efface d'un coup.

**La lire n'ouvre pas de session** : ni compte anonyme ni captcha. Chaque bouton ouvre la session au geste, puis l'onboarding à sa **deuxième** page. **Elle se compte, sans rien qui désigne personne** : la page affichée, les sections parues, le bouton touché et son emplacement, le film lancé — un nombre par jour (`visites_de_l_accueil`).

**Le mouvement dit la donnée, et rien d'autre** : les trois figures et le trait des trois temps se dessinent quand ils paraissent, une fois, et tout est posé sous « réduire les animations ». Le texte ne bouge pas.
