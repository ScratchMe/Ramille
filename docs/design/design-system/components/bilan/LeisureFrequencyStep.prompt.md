L'étape qui ouvre la section « Loisirs du week-end » : « À quelle fréquence fais-tu des trajets loisirs le week-end ? », trois rangées dans `StepShell`.

```jsx
<StepShell section="Loisirs du week-end" step={5} total={9} entree={{ cle: 'leisure_frequency', sens }}
  manque={manqueDeLEtape('leisure_frequency', answers)} reponsesDonnees={reponsesDonnees} onBack={back} onNext={next}>
  <LeisureFrequencyStep answers={answers} update={update} total={9} />
</StepShell>
```

**La question s'écrit une fois** : titre de l'étape et nom du groupe de rangées (`GroupeDeChoix`). Trois `ChoiceRow`, 10 entre elles ; l'étape espace de 32 son titre, la ligne d'exemples et le groupe.

**« Rarement » fait disparaître l'étape suivante, et le dit sous sa rangée.** Choisir cette réponse saute le mode et la distance, mais le calcul compte toujours une petite base : « On comptera une petite base par défaut · 0,25 sortie par semaine, 15 km ». La ligne s'ouvre **sous la réponse qui la provoque**, seulement quand elle est choisie, alignée sur le texte de la rangée (retrait 16) — posée sous le groupe, elle se lirait comme une note sur les trois. En Spline Sans, `small` tertiaire : c'est une phrase adressée à la personne, pas un code. Ses deux valeurs sont celles du calcul, interpolées et jamais réécrites.

**Sans trajet domicile-travail, la ligne d'exemples cède la place au décompte** : l'encadré « Sans trajet domicile-travail, ton bilan compte 6 étapes. » (fond `backgroundElement`, rayon 16) — la variante « Progression adaptative — section sautée » de la maquette, quand la première section a été sautée. Le nombre vient de `total`, c'est-à-dire des étapes réellement visibles, le même que celui de l'en-tête.
