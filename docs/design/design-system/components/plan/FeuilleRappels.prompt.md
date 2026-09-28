S’ouvre une fois par appareil, juste après l’engagement. Ramille peut parler ici : aucun chiffre sur la feuille.

```jsx
<FeuilleRappels boucle="hebdo" canal="push" permission="demandable" />
```

Son cadre est `FeuilleDuBas`, voile compris : elle se pose seule en bas d'un écran de maquette. **Elle s'appelle « Les rappels », et ne l'affiche pas** : ce nom nomme le dialogue (sans nom, un lecteur d'écran entrait dans « dialogue » sans savoir lequel), mais son canvas ne dessine pas d'en-tête, et aucune décision n'en a demandé un. Il s'est affiché une journée, le 24/09/2026, puis a été retiré (`enTete={false}`, `v1-29` §3.2) ; **l'absence est décidée depuis le 25/09/2026** (`v1-29` §6.3) — ne pas le remettre par symétrie avec la feuille du nouveau bilan. Le cadre (poignée, titre facultatif, marges, voile) est `FeuilleDuBas`, partagé avec la feuille du nouveau bilan — qui, elle, affiche son titre.

Les lignes du canal sont celles de « Toi » (`ChoixDeRappel`) : la même `LigneDeCanal`, dans un `GroupeDeChoix`. Une ligne hors d'atteinte dit pourquoi et ne paraît jamais choisie ; la porte qui la débloque (« Rattacher un compte », « Ouvrir les réglages du téléphone ») se rend juste sous elle. Le groupe est nommé par la question de Ramille.

Le bouton n’annonce un dialogue système que s’il va vraiment s’en ouvrir un : « Autoriser les notifications » seulement quand la permission est encore demandable.

**Une seconde étape depuis C4.2 : le mot de la veille** (`etape="veille"`). Une fois la notification choisie **et reçue sur ce téléphone**, sur une action de trajet dont la fenêtre de dix semaines est ouverte, Ramille demande « Et la veille de tes jours de trajet, je te fais signe aussi ? » ; la ligne du produit dessous porte la date (« Par notification, jusqu’au 15 novembre. »), parce que Ramille ne dit jamais un nombre. Deux boutons, et **chacun enregistre une réponse** : « Oui, la veille aussi », puis « Non merci » en secondaire — un refus, qui ne sera jamais reproposé. Refermer sans répondre ne répond rien : la question reste dans « Toi ».

```jsx
<FeuilleRappels etape="veille" detailVeille="Par notification, jusqu’au 15 novembre." />
```

**La même étape s'ouvre seule, une fois**, au premier engagement de trajet de qui a vu la feuille sans cette question (son premier engagement portait sur un vol ou une sortie) : la feuille ne repasse pas par le canal. Le focus va à la question (`TitreDArrivee`), le contenu ayant changé sous le doigt.
