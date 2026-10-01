La quatrième étape du questionnaire (B1.6 / B1.7) : un second mode en complément du premier, et si oui lequel, avec la part du trajet qu’il couvre. Sous la question, en tertiaire, **le mode principal rappelé, puis l’exemple** : « En plus de : Voiture. Par exemple vélo puis train. » (01/10/2026, `v1-33` D6) — la question dépend d’une réponse donnée à l’écran d’avant, et « Lequel ? » retire ce mode de sa liste : on ne le laisse pas en mémoire. Le libellé est celui de la table des modes, sans accord à écrire. L’étape rend son contenu ; l’écran du questionnaire la pose dans `StepShell`.

```jsx
<StepShell section="Domicile-travail" step={4} total={9} entree={{ cle: 'commute_extra', sens }}
  manque={manqueDeLEtape('commute_extra', answers)} reponsesDonnees={reponsesDonnees} onBack={retour} onNext={suivant}>
  <CommuteExtraStep answers={answers} update={update} />
</StepShell>
```

**« Oui / Non » en deux puces équiréparties, en contour, au rayon 16 — et rien n’est coché d’avance.** Un « Non » par défaut ferait traverser la question sans décider, et pencherait du mauvais côté : il sous-estime un trajet intermodal, sur le poste qui décide du plan. Tant que la personne n’a pas répondu, l’étape reste incomplète : au toucher du « Suivant » en attente, « Il manque encore une réponse sur le second mode. » mène au « Oui / Non », sans recolorer le titre. « Non » efface le second mode.

**« Lequel ? » s’ouvre dans un encart sous le « Oui »** — fond `backgroundElement`, rayon 16, padding 16, gap 8 : la liste des modes **sans le mode principal**, en `ModeListItem` sur le fond de la page (`nestedBackground`), **dans l’ordre des trois familles** de la liste principale (4 dans une famille, 16 entre deux). La liste est un groupe nommé « Lequel ? », suite directe de la question du dessus ; son intitulé (`IntituleDuChamp`, `textTertiary`) passe en `accentText` 600 quand « le second mode » manque. L’encart s’ouvre en dépliant sa hauteur, et s’il passerait sous le pied, l’écran remonte juste assez, sans faire passer le « Oui / Non » au-dessus du bord. Comme à l’étape précédente, la précision s’ouvre sous le mode choisi, dans une `BoiteDePrecision`, jamais après la liste.

**Sous le mode choisi, la part du trajet est toujours demandée, jamais supposée** : « Un quart environ », « La moitié environ », « Les trois quarts environ », en rangées (`PrecisionMode`), après la précision propre au mode s’il y en a une — **dans la même boîte**, à 16 d’elle. Supposer la moitié sous-estime un vélo + train et surestime un parc-relais ; et les libellés disent « environ », parce que personne ne connaît la fraction exacte de son trajet faite à vélo.

**Un seul champ de motorisation, de type de deux-roues, de train et de vélo pour les deux jambes** : la liste du second mode exclut le mode principal, donc au plus une jambe porte la voiture, le train ou le vélo. Ce qu’un changement rend orphelin est effacé par l’écran du questionnaire, jamais par l’étape. Sous l’encart, `MissingModeLink`.
