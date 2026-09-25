Se place dans la liste, immédiatement sous le mode sélectionné — jamais après la liste.

```jsx
<PrecisionMode question="Quelle motorisation ?" options={[{value:'thermique',label:'Thermique'},{value:'hybride',label:'Hybride'}]} valeur="thermique" />
```

Rangées, pas des puces : les libellés inégaux (« Hybride rechargeable ») feraient un escalier. Les réponses sont un `radiogroup` nommé par la question : « Électrique » annoncé seul ne dit pas qu'il répond à « Quelle motorisation ? ».
