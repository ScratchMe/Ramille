-- Corrige l'étiquette de provenance des quatre facteurs de cylindrée.
--
-- La migration 20260905200000 les a insérés avec
-- `source = 'ADEME Base Empreinte (via API Impact CO2)'`, en oubliant le « — ACV complète »
-- que porte tout le reste du référentiel depuis 20260905100000.
--
-- **Les valeurs sont bonnes** : elles ont bien été relevées sur
-- `/api/v1/thematiques/ecv/transport`, champ `ecv`. C'est l'étiquette qui était fausse — et
-- elle n'est pas décorative : c'est le **seul endroit** où l'on enregistre quel endpoint a été
-- interrogé. La valeur seule ne permet pas de distinguer un facteur ACV d'un facteur d'usage,
-- puisque les deux endpoints renvoient des nombres également plausibles ; c'est précisément ce
-- qui avait rendu le défaut de v1-07 §1.5 invisible pendant des semaines.
--
-- Attrapée par la garde `is_empty(... where source not like '%ACV complète%')` du test 07, qui
-- existe exactement pour ça. Elle n'avait pas été rejouée après l'ajout des modes : rappel que
-- **toucher aux facteurs invalide des assertions qui ne les nomment pas** (cf. CLAUDE.md), et
-- que la vérification sur le projet distant ne suffit pas — celui-ci était déjà migré.
--
-- La synchronisation trimestrielle écrit déjà la bonne étiquette : sans ce correctif, les
-- quatre lignes de seed auraient porté une provenance fausse jusqu'à la première mise à jour
-- ADEME, puis se seraient corrigées toutes seules — donc sans que personne ne remarque rien.

update public.emission_factors
set source = 'ADEME Base Empreinte — ACV complète (via API Impact CO2)'
where transport_mode_id in (
  'deux_roues_scooter_thermique',
  'deux_roues_scooter_electrique',
  'deux_roues_moto_petite',
  'deux_roues_moto_grosse'
)
and source not like '%ACV complète%';
