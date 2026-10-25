Les trois encarts de fait du plan — `EncartDuRattachement`, `EncartDeLOrphelin`, `EncartDuCycleRevolu` —, en tête de l'écran, sous la ligne de relecture.

```jsx
<EncartDuRattachement adresse="camille@exemple.fr" />
<EncartDeLOrphelin phrase="Ton plan a changé avec ton nouveau bilan. « Prendre le bus le mardi » n’y est plus ; elle reste dans ton suivi." onCompris={() => {}} />
<EncartDuCycleRevolu bascule="L’automne a commencé pendant que tu étais là." onRelire={() => {}} />
```

**Un fait, pas une félicitation ni une injonction** : le même gabarit discret pour les trois, ni mascotte, ni exclamation. Le rattachement était teinté en accent et se lisait comme un succès ; l'accent est réservé au dominant et à l'actionnable.

**L'orphelin se dit une fois** : un engagement que le recalcul a archivé, sans que la personne l'ait choisi (nouveau bilan, contexte corrigé). « Compris » écrit une marque locale qui porte l'identifiant de la ligne, pour qu'un second recalcul puisse le dire à son tour.

**Une période terminée se dit, elle ne se masque pas** : l'action engagée, les jours choisis et le cap restent à l'écran, parce qu'ils ont eu lieu. La phrase nomme la saison du jour ; la seconde explique pourquoi « Voir la saison » peut ne rien trouver de plus entre minuit et le passage du cron. Un lien, jamais une bascule automatique.
