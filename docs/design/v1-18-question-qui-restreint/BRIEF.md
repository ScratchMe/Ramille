# Brief pour Claude Design — une réponse qui restreint, et qui ne le dit pas

Écrit le 16/09/2026, au lendemain de la recette web
(`docs/architecture/v1-13-audit-et-chantiers.md` §13, constat 13.1, issue
[#197](https://github.com/ScratchMe/TraceVerte/issues/197)).

**Ce brief a un jumeau** : [`v1-17`](../v1-17-densite-du-plan/BRIEF.md) demande comment se
présente ce que le plan **montre**. Celui-ci demande comment se dit ce que le plan **ne montrera
pas**, et pourquoi. Les deux se répondent — mais ils dessinent deux écrans différents, le plan
d'un côté, le questionnaire de l'autre, donc ils sont séparés.

Le remède évident — une phrase d'aide sous la question — a été écarté **comme réponse entière**,
pas comme option : il traite le symptôme le plus visible d'un défaut qui en a quatre.

## 1. Ce qu'on demande

Trois questions, de la plus large à la plus étroite.

1. **Quand une réponse restreint ce que le produit pourra proposer, où et quand le dit-on ?**
   Avant de répondre, au moment de répondre, ou plus tard sur le plan — les trois sont possibles
   et n'ont pas le même coût.
2. **Comment se pose une question dont la réponse est un seuil ?** Aujourd'hui elle porte sur la
   **possibilité** (« Peux-tu travailler depuis chez toi ? ») et le produit la lit comme une
   **fréquence**. C'est cet écart-là qui est la cause ; la phrase manquante n'est qu'un
   symptôme.
3. **« Parfois » doit-il exister ?** Deux réponses puis une précision, trois puces, ou une échelle
   de fréquence : la forme n'est pas acquise.

## 2. Le fait, mesuré

Dernière étape du questionnaire, « Quel est ton contexte de mobilité ? ». Quatre questions, quatre
rangées de puces nues. La dernière est « Peux-tu travailler depuis chez toi ? » — **Oui / Parfois /
Non**.

| Réponse | « Travailler depuis chez toi **un** jour par semaine » | « … **deux** jours par semaine » |
|---|---|---|
| **Oui** | proposée | proposée |
| **Parfois** | proposée | **écartée** |
| **Non** | écartée | écartée |

Relevé en base le 16/09/2026 : `teletravail_admissible` vaut `{oui, parfois}` sur le gabarit d'un
jour et `{oui}` sur celui de deux.

**Sur le profil de la recette, l'action à deux jours valait 461 kg/an et celle à un jour 230** —
c'est-à-dire que « Parfois » coûte la moitié du plus gros levier du poste domicile-travail. Rien à
l'écran ne le dit, et rien sur le plan ensuite n'explique l'absence : aucun écran ne parle d'une
action écartée.

**Et la question est obligatoire** dès qu'il y a un trajet régulier (`manqueDeLEtape`). Ce n'est
donc pas quelqu'un qui aurait sauté une question : c'est quelqu'un qu'on oblige à choisir entre
trois mots, dont l'un lui retire la moitié de son plan sans un mot.

## 3. Ce que l'écran promet, et pourquoi c'est à moitié faux

L'étape s'ouvre sur :

> « Ça nous sert à te proposer des actions réalistes. Ces réponses n'entrent pas dans le calcul de
> ton bilan. »

La seconde phrase est vraie et utile. La première décrit un **bénéfice** — on va t'aider — là où
le mécanisme est aussi une **restriction** : ces quatre réponses décident de ce que le plan a le
droit de proposer. Quelqu'un qui lit « pour te proposer des actions réalistes » n'a aucune raison
de peser sa réponse ; il a au contraire une raison de répondre modestement, ce qui est exactement
le geste qui coûte.

## 4. Ce n'est pas une question, c'est une étape entière

Relevé en base : **7 des 16 gabarits d'action portent au moins une condition de contexte.** Près
de la moitié du référentiel dépend de cette étape, et aucune des quatre questions ne le dit.

| Gabarit | Poste | Ce qui le conditionne |
|---|---|---|
| Travailler depuis chez toi **un** jour par semaine | domicile-travail | télétravail ∈ {oui, parfois} |
| Travailler depuis chez toi **deux** jours par semaine | domicile-travail | télétravail = oui |
| Passer deux trajets sur cinq en métro ou en tram | domicile-travail | zone = urbain dense **et** transports en commun |
| Passer deux trajets sur cinq en train ou en RER | domicile-travail | transports en commun |
| Prendre les transports en commun pour deux sorties sur cinq | sorties | zone = urbain dense **et** transports en commun |
| Faire ce trajet à deux au moins un jour sur deux | domicile-travail | un véhicule |
| Partager un de tes longs trajets en voiture | voyages | un véhicule |

Le télétravail est le cas le plus net — un seuil à l'intérieur d'une seule question — mais si la
réponse est « on le dit », elle doit valoir pour les sept, sinon on aura expliqué une restriction
et tu en auras six autres muettes.

## 5. Ce qui ne se discute pas

- **Le seuil lui-même ne bouge pas.** Un jour se tient avec « parfois », deux jours demandent
  « oui ». C'est l'arbitrage de C3.8, et il a sa raison : proposer deux jours à qui n'en a pas la
  latitude, c'est reproposer l'implausible que ce chantier-là venait de retirer.
- **Une condition qu'on ne peut pas évaluer n'est pas remplie** : sans réponse, on ne propose
  pas. L'asymétrie avec C3.1 (ne pas savoir **montre** la moyenne française) est voulue — là-bas
  ne pas savoir cachait un repère, ici cela proposerait une action impossible.
- **Ces réponses n'entrent pas dans le calcul du bilan**, et la phrase qui le dit doit rester :
  c'est la seule chose qui empêche de lire cette étape comme un jugement.
- **La profondeur coûte plus cher en abandon qu'une puce de plus.** C'est la règle du
  questionnaire, écrite pour la motorisation : quatre réponses au même niveau plutôt que deux
  niveaux. Une étape de plus est le remède le plus cher qui existe ici.
- **Ramille ne dit jamais un nombre**, et le questionnaire n'est pas un endroit où elle parle par
  défaut — elle n'ouvre que les quatre sections (C3.9).

## 6. Le mandat — ce que le canvas peut changer

- **Le libellé de la question** et celui des trois réponses.
- **La forme** : trois puces, deux puces plus une précision qui s'ouvre, une échelle.
- **L'endroit où la restriction se dit** : sous la question, dans l'intro de l'étape, au moment du
  choix, ou sur le plan.
- **L'intro de l'étape**, qui promet aujourd'hui une aide sans annoncer une contrainte.
- **Le plan**, si la réponse est qu'une action écartée doit se dire là plutôt qu'en amont — auquel
  cas ce brief et `v1-17` se rejoignent, et il faut le signaler.

## 7. Ce qu'on ne veut pas voir

- **Une phrase d'aide sous chacune des quatre questions.** L'étape deviendrait un mur de texte, et
  c'est la dernière avant la soumission.
- **Un pourcentage, un gain en kilos, ou « cette réponse vaut 231 kg »** à côté d'une puce. Le
  produit ne marchande pas avec la personne, et un chiffre ici transforme une description de sa vie
  en optimisation de score.
- **Une formulation qui pousse à répondre « oui ».** Le but est qu'on réponde **juste**, pas qu'on
  réponde haut : quelqu'un qui n'a pas la latitude doit pouvoir dire non sans se sentir en défaut.
- **Une question de plus dans l'étape.** Si la réponse en demande une, elle doit en remplacer une.

## 8. Les écrans à dessiner

1. **L'étape « contexte » telle qu'elle devrait être** — les quatre questions, dans la forme
   retenue.
2. **La question du télétravail seule, dans ses trois états** (rien de choisi, la réponse qui
   restreint choisie, la réponse haute choisie), si la forme retenue réagit au choix.
3. **Le cas des six autres conditions** : une planche qui montre comment la même règle s'applique
   à la zone, aux transports en commun et au véhicule — ou qui montre pourquoi elle ne s'y applique
   pas.
4. **Le plan**, seulement si la réponse y met quelque chose.

## 9. Questions ouvertes pour la session

- Dire « cette réponse restreint » aide-t-il, ou apprend-il surtout à optimiser ?
- Une échelle de fréquence (« jamais / de temps en temps / toutes les semaines ») lève-t-elle
  l'ambiguïté **sans** avoir à l'expliquer — et alors le libellé suffit-il ?
- Le bon moment est-il peut-être **après** : sur le plan, une ligne qui dit qu'une action n'est pas
  proposée et pourquoi, avec le chemin pour corriger la réponse. Ça déplace le coût de l'étape la
  plus fragile vers un écran qu'on relit.
- La question doit-elle porter sur ce qu'on **peut** ou sur ce qu'on **fait déjà** ? Les deux ne
  donnent pas le même plan, et le produit n'a jamais tranché.

## 10. Pour voir l'état actuel

- L'étape : `src/components/bilan/steps/context.tsx`
- Les trois réponses et la complétude de l'étape : `src/types/bilan.ts`
  (`REPONSES_TELETRAVAIL`, `manqueDeLEtape`)
- Le filtre : `supabase/migrations/20260914131144_plan_plausible.sql`
- Le raisonnement de C3.8 : `CLAUDE.md`, « Le plan ne propose plus l'impossible »
