La troisième étape du questionnaire (B1.4) : le mode principal du trajet domicile-travail, parmi neuf, et la précision que ce mode appelle, ouverte juste sous lui. L’étape rend son contenu ; l’écran du questionnaire la pose dans `StepShell`.

```jsx
<StepShell section="Domicile-travail" step={3} total={9} entree={{ cle: 'commute_mode', sens }}
  manque={manqueDeLEtape('commute_mode', answers)} reponsesDonnees={reponsesDonnees} onBack={retour} onNext={suivant}>
  <CommuteModeStep answers={answers} update={update} />
</StepShell>
```

**Neuf entrées, jamais une de plus.** « Voiture (seul) » et « Voiture (covoiturage) » sont deux entrées du même mode ; la motorisation, le type de deux-roues, de train ou de vélo ne sont jamais des entrées supplémentaires mais des questions de suivi (`PrecisionMode`), qui ne coûtent qu’à ceux qu’elles concernent. Une liste qui gonfle est ce qui fait abandonner un questionnaire. Les motorisations sont quatre réponses au même niveau, sans second « rechargeable ou non ? ».

**Trois familles, sans intertitre** (29/09/2026) : Voiture (seul), Voiture (covoiturage), Deux-roues motorisé · Bus, Train, Métro ou tram · Vélo, Marche, Trottinette ou mobilité douce. 4 entre deux modes d’une famille, 16 entre deux familles ; une sous-vue sans rôle par famille, que les flèches du clavier ne voient pas. L’ordre ne suit plus l’usage — le deux-roues, rare, passe devant le train —, et c’est accepté. Le même ordre vaut pour « Lequel ? » et pour les autres modes des sorties.

**La géométrie** : 16 entre le titre et la liste, 8 entre la liste et le lien du mode manquant. Neuf rangées de 48 font 488 px, et tiennent sous la question à 390 × 844 comme à 360 × 800 ; le bandeau d’un re-bilan (quand cette étape est celle d’entrée, `v1-33` D3), une police agrandie ou les barres d’Android les font passer sous le pied, et le filet du pied le dit.

**La précision s’ouvre sous l’option choisie, dans la liste — jamais après la liste**, dans une `BoiteDePrecision` : 8 sous le mode, retrait 16, 12 de marge intérieure. Après neuf modes, elle tomberait sous le pied collant. Si elle passerait sous le pied en s’ouvrant, l’écran remonte juste assez pour qu’elle finisse 16 au-dessus de lui, sans faire passer le mode choisi au-dessus du bord. Chaque précision est son propre groupe, posé dans celui des modes : « Hybride » répond à « Quelle motorisation ? », jamais au mode.

**Sous « Voiture (covoiturage) », deux précisions dans une seule boîte, dans cet ordre** : la motorisation, puis « Vous êtes combien à partager ce trajet ? » (`PrecisionChiffres`, de 2 à « 6+ »), à 16 l’une de l’autre. Les deux décrivent la même voiture ; la taille est obligatoire, sans quoi le choix du covoiturage ne changerait rien au chiffre.

**Ce qui manque** : au toucher du « Suivant » en attente, « ton mode de transport » mène à la liste — focus sur le mode coché, ou « Voiture (seul) », et le titre ne se recolore pas ; « la motorisation », « le type de train »… et « le nombre de personnes dans la voiture » mènent à la précision, dont l’intitulé passe en `accentText` 600.

**L’étape n’écrit que ce que la personne vient de choisir.** Ce que ce choix rend impossible — la taille d’un covoiturage qu’on a quitté, la motorisation d’une voiture qu’on n’a plus — est effacé par l’écran du questionnaire après chaque `update`, jamais par l’étape. Sous la liste, `MissingModeLink`.
