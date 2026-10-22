L'étape qui ouvre la section « Loisirs » : « À quelle fréquence fais-tu des trajets pour tes loisirs, le week-end comme en semaine ? », cinq rangées dans `StepShell`.

```jsx
<StepShell section="Loisirs" step={5} total={9} entree={{ cle: 'leisure_frequency', sens }}
  manque={manqueDeLEtape('leisure_frequency', answers)} reponsesDonnees={reponsesDonnees} onBack={back} onNext={next}>
  <LeisureFrequencyStep answers={answers} update={update} />
</StepShell>
```

**La question s'écrit une fois** : titre de l'étape et nom du groupe de rangées (`GroupeDeChoix`). Cinq `ChoiceRow` — « Rarement — une fois par mois ou moins », « Deux ou trois fois par mois » (depuis le 02/10/2026, `v1-33` D5), « Une fois par semaine », « Plusieurs fois par semaine », « Presque tous les jours » (depuis le 22/10/2026) —, 10 entre elles ; l'étape espace de 32 son titre, la ligne d'exemples et le groupe.

**Une seule étape pour la semaine comme pour le week-end** (22/10/2026, `v1-35`, étape « Le périmètre du bilan », décidé avec la personne qui pilote) : « le week-end » seul laissait de côté les sorties du mercredi soir, et deux étapes — la semaine, puis le week-end — auraient demandé une distinction limpide entre elles, faute de quoi elles ajoutaient de la confusion. Les libellés suffisent à dire ce que la question couvre. Trois choses à ne pas défaire :

- **l'échelle a cinq réponses, et la cinquième est la dernière** : « Presque tous les jours » vient après « Plusieurs fois par semaine » — l'échelle monte du moins fréquent au plus fréquent. Elle se comporte comme toute sortie déclarée : l'étape du mode et de la distance (`LeisureDetailStep`) s'ouvre ensuite, seule « Rarement » la saute et passe sur la petite base ;
- **la question dit « le week-end comme en semaine », dans cet ordre** : « en semaine comme le week-end » coupait la ligne dans « week- » / « end ? » à 390 de large, et Spline Sans n'a pas de trait d'union insécable pour l'en empêcher ;
- **« week-end » ne nomme plus le poste** : la section s'appelle « Loisirs » (en-tête du questionnaire comme annonce de l'onboarding), et le mot ne reste que dans la question, où il dit un moment de la semaine. La voix de Ramille à l'entrée de la section ne change pas — « Pense à un mois ordinaire, pas au meilleur ni au pire. » : les cinq réponses se lisent toujours sur un mois.

**« Rarement » fait disparaître l'étape suivante, et le dit sous sa rangée.** Choisir cette réponse saute le mode et la distance, mais le calcul compte toujours une petite base : « On comptera une petite base par défaut · 0,25 sortie par semaine, 15 km ». La ligne s'ouvre **sous la réponse qui la provoque**, seulement quand elle est choisie, alignée sur le texte de la rangée (retrait 16) — posée sous le groupe, elle se lirait comme une note sur toutes. En Spline Sans, `small` tertiaire : c'est une phrase adressée à la personne, pas un code. Ses deux valeurs sont celles du calcul, interpolées et jamais réécrites.

**La ligne d'exemples pour tous, et pas de décompte d'étapes** (01/10/2026, `v1-33` D7) : « Sport, sorties, visites à la famille. » sous le titre, avec ou sans trajet domicile-travail. La maquette « Progression adaptative — section sautée » la remplaçait, sans trajet, par un encadré « Sans trajet domicile-travail, ton bilan compte 6 étapes. » : il répétait l'en-tête, changeait de chiffre sous le doigt (« Rarement » retire une étape) et ôtait les exemples au profil qui en a le plus besoin — pour un retraité ou quelqu'un sans emploi, c'est la première question du bilan.
