Progression de l’onboarding : des points, pas un pourcentage ni une barre.

```jsx
<OnboardingDots total={4} activeIndex={2} />
```

Les points sont muets un à un ; la rangée est une `progressbar` qui dit l'étape en mots (« Étape 2 sur 4 »).

**Les inactifs en `fieldBorder`, l'actif en pilule de 20 × 8 en `accent`** (décision du 27/09/2026) : ce sont la seule progression visible, donc ils tiennent 3:1 sur leur fond (3,45:1 sur blanc, 3,21:1 sur la page teintée) — et l'actif se lit par sa forme, parce que sa teinte ne le sépare plus assez des inactifs. Un seul neutre sur les deux fonds : il n'y a plus de variante « sur teinte ».

Le questionnaire utilise ProgressHeader (barre 6 px), pas ces points.
