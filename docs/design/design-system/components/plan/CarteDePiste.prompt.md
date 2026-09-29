Une piste du plan : la carte d'action chiffrée et son engagement, rendus d'une ligne `plan_actions`. C'est ce que le plan et « Toutes les pistes » posent pour chaque action — jamais une `ActionCard` et un `ActionCommitment` assemblés à la main.

```jsx
<CarteDePiste
  action={{ id: 'a1', saving_kg_year: 184, saving_share_percent: 7, detail_text: 'Sur tes 4 trajets par semaine.', first_step: 'Repère un itinéraire cyclable avant ton premier jour.', committed_at: '2026-09-15T08:00:00Z', intention_days: [2, 4], intention_timing: null, carried_over_from: null, action_templates: { action_text: 'Faire un trajet sur cinq à vélo', poste: 'commute' } }}
  committedActionId="a1"
/>
```

**Une seule action engagée par cycle**, et c'est elle qui estompe les autres sur le plan (`committedActionId`) : celles-ci reculent par leur cadre et proposent « Choisir celle-ci à la place ». Aucune n'est fermée.

**Sur « Toutes les pistes », la carte s'ouvre sur le choix** (`surLeChoix`, `v1-32`, 29/09/2026) : la ligne touchée — sa pastille disait « Choisir », ou « Choisir à la place » quand une autre est engagée — devient cette carte, **directement sur la question** (« Quand ? », « Quels jours ? »), rien de coché, « C'est noté » inactif tant que rien n'est choisi. Pas de « Je m'y engage » : « Choisir » l'a déjà dit. **Jamais estompée alors**, même quand une autre est engagée : l'estompage est un fait du plan, et sur la liste il ferait reculer la carte au moment où on la regarde. « Annuler » (`onAnnuler`) la rend à sa ligne ; une seule carte ouverte à la fois.

```jsx
<CarteDePiste
  action={{ id: 'a4', saving_kg_year: 101, saving_share_percent: 4, detail_text: 'Sur tes déplacements de loisir.', first_step: null, committed_at: null, intention_days: null, intention_timing: null, carried_over_from: null, action_templates: { action_text: 'Faire une sortie sur trois à vélo à assistance électrique', poste: 'leisure' } }}
  committedActionId="a5"
  surLeChoix
/>
```

**Le poste décide de l'intention** : des jours de la semaine pour le domicile-travail, une échéance fermée pour les sorties et les voyages — jamais une saisie libre. Le libellé de l'intention vient de la ligne (« le mardi et le jeudi », « à mon prochain projet de voyage »), comme le premier pas et l'étiquette « · RECONDUIT ».

Les libellés d'action sont ceux du référentiel (`action_templates.action_text`) : ne pas en inventer — « Faire un trajet sur cinq à vélo », « Travailler depuis chez toi un jour par semaine », « Remplacer un aller-retour en avion par le train ».
