L'étape qui ouvre la section « Loisirs du week-end » : « À quelle fréquence fais-tu des trajets loisirs le week-end ? », trois rangées dans `StepShell`.

```jsx
<StepShell section="Loisirs du week-end" step={5} total={9} entree={{ cle: 'leisure_frequency', sens }}
  manque={manqueDeLEtape('leisure_frequency', answers)} reponsesDonnees={reponsesDonnees} onBack={back} onNext={next}>
  <LeisureFrequencyStep answers={answers} update={update} />
</StepShell>
```

**La question s'écrit une fois** : titre de l'étape et nom du groupe de rangées (`GroupeDeChoix`). Trois `ChoiceRow`, 10 entre elles ; l'étape espace de 32 son titre, la ligne d'exemples et le groupe.

**« Rarement » fait disparaître l'étape suivante, et le dit sous sa rangée.** Choisir cette réponse saute le mode et la distance, mais le calcul compte toujours une petite base : « On comptera une petite base par défaut · 0,25 sortie par semaine, 15 km ». La ligne s'ouvre **sous la réponse qui la provoque**, seulement quand elle est choisie, alignée sur le texte de la rangée (retrait 16) — posée sous le groupe, elle se lirait comme une note sur les trois. En Spline Sans, `small` tertiaire : c'est une phrase adressée à la personne, pas un code. Ses deux valeurs sont celles du calcul, interpolées et jamais réécrites.

**La ligne d'exemples pour tous, et pas de décompte d'étapes** (01/10/2026, `v1-33` D7) : « Sport, sorties, visites à la famille. » sous le titre, avec ou sans trajet domicile-travail. La maquette « Progression adaptative — section sautée » la remplaçait, sans trajet, par un encadré « Sans trajet domicile-travail, ton bilan compte 6 étapes. » : il répétait l'en-tête, changeait de chiffre sous le doigt (« Rarement » retire une étape) et ôtait les exemples au profil qui en a le plus besoin — pour un retraité ou quelqu'un sans emploi, c'est la première question du bilan.
