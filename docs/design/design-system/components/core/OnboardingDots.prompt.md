Progression de l’onboarding : des points, pas un pourcentage ni une barre.

```jsx
<OnboardingDots total={4} activeIndex={2} onTint />
```

Les points sont muets un à un ; la rangée est une `progressbar` qui dit l'étape en mots (« Étape 2 sur 4 »).

Le questionnaire utilise ProgressHeader (barre 6 px), pas ces points.
