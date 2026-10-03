L’intitulé d’un champ du questionnaire, et ce qui le rattache à « Il manque encore … » de `StepShell`. Toute question secondaire d’une étape — une précision, « Lequel ? », le sous-titre des vols ou de la distance, une question du contexte — pose son intitulé par ce composant et enregistre son bloc par `useAncreDuChamp`.

```jsx
function PartDeVolsCourts({ question, children }) {
  const { bloc, marque } = useAncreDuChamp('flights_short_per_year');
  return (
    <div ref={bloc} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <IntituleDuChamp type="subtitle" weight={600} style={{ fontSize: 22, lineHeight: '28px' }} marque={marque}>
        {question}
      </IntituleDuChamp>
      {children}
    </div>
  );
}
```

**La marque ne se pose qu’au toucher du « Suivant » en attente, et jamais d’office.** Rien ne change à l’arrivée sur l’étape, rien ne change sous le doigt pendant qu’on répond. Une fois « Suivant » touché, l’intitulé du champ qui manque passe en `accentText` 600, et il le reste jusqu’à ce que l’étape soit complète ou qu’on la quitte. Depuis sa couleur de tous les jours : `textSecondary` 500 pour une précision, `textTertiary` pour « Lequel ? », `text` pour un sous-titre d’étape — et pour les questions du contexte, en `default` 600, depuis le 03/10/2026.

**Jamais le titre de l’étape** : quand ce qui manque est la question que pose le titre (« ton mode de transport », « une réponse »), rien ne se recolore — la question est déjà en titre. C’est `StepShell` qui le décide (`seMarque`), pas l’étape.

**`useAncreDuChamp(champ)` dit où mener.** `bloc` va au conteneur de l’intitulé et de son groupe — ce que l’écran amène en vue, le minimum, 16 au-dessus du pied. Le focus va à l’option cochée du groupe, ou à sa première ; pour un champ de saisie (`{ saisie: true }` : la distance du trajet en kilomètres, la distance d’une sortie), au champ lui-même, qui ouvre le clavier. Un champ qui peut manquer doit toujours avoir son ancre : sans elle, la ligne s’affiche quand même, et le focus retombe sur le haut de l’étape.

**`useMarqueDuChamp(champ)`** ne fait que lire la marque : le titre de l’étape s’en sert dans le dépôt, et elle y vaut toujours faux.

Hors de `StepShell`, dans le kit, tout est inerte. Dans le dépôt, l’écran `/contexte` fournit lui-même les ancres depuis le 01/10/2026 (audit P-13) : son « Enregistrer » en attente marque l’intitulé qui manque, comme le « Suivant » du questionnaire.
