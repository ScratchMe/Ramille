Le gabarit des deux pages légales — « Politique de confidentialité » et « Conditions d’utilisation ».

```jsx
<LegalPage
  title="Politique de confidentialité"
  updatedAt="25 septembre 2026"
  intro="Ramille collecte le strict nécessaire pour estimer l’empreinte carbone de tes déplacements et t’accompagner dans la durée. Cette page dit précisément quoi, pourquoi, pendant combien de temps, et ce que tu peux exiger."
  sections={[{ heading: 'Ce que nous ne collectons pas', blocks: [{ kind: 'bullets', items: ['Aucune revente, location ou cession de tes données à qui que ce soit.'] }] }]}
/>
```

**Trois formes de bloc, pas une de plus** : le paragraphe, les puces (un tiret cadratin tertiaire, jamais un point), les définitions (le terme en petit gras, l'explication dessous). Une mesure de lecture de 480 au plus, centrée : ce sont les textes les plus longs du produit.

**Les titres de section sont de vrais en-têtes**, en 18/26 : sans eux, ces pages ne se parcourent qu'en lisant tout. **Ce sont les seules surfaces publiques** — leurs adresses sont données à Google Play et à l'écran de consentement Google, et elles se lisent sans session —, d'où le seul pied de page du produit, avec un vrai lien vers l'éditeur.

**Deux sorties, de la même forme** (`SortieDuDetour`, `v1-33` T-10) : en haut, au-dessus de la date — la seule était la dernière ligne de la page, à 10 559 px du haut —, et à la fin, pour qui a tout lu.

Le texte des pages vit dans le dépôt, daté : une maquette ne le réécrit pas.
