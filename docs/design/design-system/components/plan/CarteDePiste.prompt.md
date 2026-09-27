Une piste du plan : la carte d'action chiffrée et son engagement, rendus d'une ligne `plan_actions`. C'est ce que le plan et « Toutes les pistes » posent pour chaque action — jamais une `ActionCard` et un `ActionCommitment` assemblés à la main.

```jsx
<CarteDePiste
  action={{ id: 'a1', saving_kg_year: 184, saving_share_percent: 7, detail_text: 'Sur tes 4 trajets par semaine.', first_step: 'Repère un itinéraire cyclable avant ton premier jour.', committed_at: '2026-09-15T08:00:00Z', intention_days: [2, 4], intention_timing: null, carried_over_from: null, action_templates: { action_text: 'Faire un trajet sur cinq à vélo', poste: 'commute' } }}
  committedActionId="a1"
/>
```

**Une seule action engagée par cycle**, et c'est elle qui estompe les autres (`committedActionId`) : celles-ci reculent par leur cadre et proposent « Choisir celle-ci à la place ». Aucune n'est fermée.

**Le poste décide de l'intention** : des jours de la semaine pour le domicile-travail, une échéance fermée pour les sorties et les voyages — jamais une saisie libre. Le libellé de l'intention vient de la ligne (« le mardi et le jeudi », « à mon prochain projet de voyage »), comme le premier pas et l'étiquette « · RECONDUIT ».

Les libellés d'action sont ceux du référentiel (`action_templates.action_text`) : ne pas en inventer — « Faire un trajet sur cinq à vélo », « Travailler depuis chez toi un jour par semaine », « Remplacer un aller-retour en avion par le train ».
