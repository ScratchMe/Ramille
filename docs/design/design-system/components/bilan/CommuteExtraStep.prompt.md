La quatrième étape du questionnaire (B1.6 / B1.7) : un second mode en complément du premier — « Par exemple vélo puis train. » —, et si oui lequel, avec la part du trajet qu’il couvre. L’étape rend son contenu ; l’écran du questionnaire la pose dans `StepShell`.

```jsx
<StepShell section="Domicile-travail" step={4} total={9} onBack={retour} onNext={suivant} nextDisabled={!!manque} manque={manque}>
  <CommuteExtraStep answers={answers} update={update} />
</StepShell>
```

**« Oui / Non » en deux puces équiréparties, en contour, au rayon 16 — et rien n’est coché d’avance.** Un « Non » par défaut ferait traverser la question sans décider, et pencherait du mauvais côté : il sous-estime un trajet intermodal, sur le poste qui décide du plan. Tant que la personne n’a pas répondu, l’étape reste incomplète. « Non » efface le second mode.

**« Lequel ? » s’ouvre dans un encart sous le « Oui »** — fond `backgroundElement`, rayon 16, padding 16 : la liste des modes **sans le mode principal**, en `ModeListItem` sur le fond de la page (`nestedBackground`). La liste est un groupe nommé « Lequel ? », suite directe de la question du dessus. Comme à l’étape précédente, la précision s’ouvre sous le mode choisi, à 8 px, jamais après la liste.

**Sous le mode choisi, la part du trajet est toujours demandée, jamais supposée** : « Un quart environ », « La moitié environ », « Les trois quarts environ », en rangées (`PrecisionMode`), après la précision propre au mode s’il y en a une. Supposer la moitié sous-estime un vélo + train et surestime un parc-relais ; et les libellés disent « environ », parce que personne ne connaît la fraction exacte de son trajet faite à vélo.

**Un seul champ de motorisation, de type de deux-roues, de train et de vélo pour les deux jambes** : la liste du second mode exclut le mode principal, donc au plus une jambe porte la voiture, le train ou le vélo. Ce qu’un changement rend orphelin est effacé par l’écran du questionnaire, jamais par l’étape. Sous l’encart, `MissingModeLink`.
