-- C5.4 — Le télétravail se demande en jours, et « Parfois » disparaît.
--
-- « Peux-tu travailler depuis chez toi ? oui / parfois / non » posait une **possibilité**, alors
-- que le produit en lisait un **nombre de jours** : `teletravail_admissible` porte deux seuils,
-- un jour se tenant avec « parfois » et deux jours demandant « oui ». Le mot « Parfois » était donc
-- un seuil déguisé en hésitation — répondre « parfois » coûtait l'action à deux jours, et rien ne le
-- disait (constat 13.1 de la recette web du 16/09/2026, canvas v1-18).
--
-- La question devient « Sur tes {n} jours de trajet, combien pourrais-tu travailler depuis chez
-- toi ? », et les valeurs stockées deviennent le nombre :
--
--   non      ->  aucun
--   parfois  ->  un_jour
--   oui      ->  deux_ou_plus
--
-- **La traduction préserve le comportement, et le contrôle en fin de fichier le prouve plutôt que
-- de le promettre** : en face, `teletravail_admissible` passe de `{oui, parfois}` à
-- `{un_jour, deux_ou_plus}` sur le gabarit d'un jour, et de `{oui}` à `{deux_ou_plus}` sur celui de
-- deux. Chaque réponse garde donc exactement les mêmes gabarits, et **aucun plan n'a besoin d'être
-- régénéré**. Le seuil de C3.8 ne bouge pas.
--
-- `src/lib/database.types.ts` **ne bouge pas non plus**, et ce n'est pas un oubli : la colonne reste
-- `text` (le `check` n'entre pas dans le type généré) et la base ne porte aucun `enum`. Le job
-- `db-tests`, qui compare le fichier à la base qu'il vient de construire, signalerait une retouche
-- gratuite.

-- ── 1. Les gabarits d'abord ────────────────────────────────────────────────────────────────────
--
-- Appariés par `action_text`, la clé naturelle du référentiel : `action_templates.id` vaut
-- `gen_random_uuid()`, donc les identifiants diffèrent d'une base à l'autre et une migration de
-- données ne doit jamais s'y fier (leçon des CI rouges de la vague 5).
--
-- Ils passent avant les réponses parce que l'ordre inverse ouvrirait une fenêtre où une réponse
-- traduite ne serait admissible nulle part. Dans une seule transaction, personne ne la verrait —
-- mais l'ordre juste ne coûte rien et se relit.

update public.action_templates
set teletravail_admissible = array['un_jour', 'deux_ou_plus']
where action_text = 'Travailler depuis chez toi un jour par semaine'
  and teletravail_admissible @> array['parfois'];

update public.action_templates
set teletravail_admissible = array['deux_ou_plus']
where action_text = 'Travailler depuis chez toi deux jours par semaine'
  and teletravail_admissible = array['oui'];

-- ── 2. Les réponses déjà en base ───────────────────────────────────────────────────────────────
--
-- `add constraint` n'est pas idempotent, et une migration doit se rejouer telle quelle après une
-- restauration : on retire avant d'ajouter. La traduction, elle, est naturellement rejouable —
-- aucune des trois valeurs d'arrivée n'est une valeur de départ.

alter table public.assessment_answers
  drop constraint if exists assessment_answers_teletravail_check;

update public.assessment_answers
set teletravail = case teletravail
  when 'non' then 'aucun'
  when 'parfois' then 'un_jour'
  when 'oui' then 'deux_ou_plus'
  else teletravail
end
where teletravail in ('non', 'parfois', 'oui');

alter table public.assessment_answers
  add constraint assessment_answers_teletravail_check
  check (teletravail is null or teletravail in ('aucun', 'un_jour', 'deux_ou_plus'));

comment on column public.assessment_answers.teletravail is
  'B4.4 — combien de jours de trajet la personne pourrait faire depuis chez elle : aucun / un_jour / deux_ou_plus. La question ne se pose qu''à partir de deux jours de trajet déclarés : en dessous, l''action « travailler depuis chez toi un jour » supprimerait tout le trajet et la garde du remove_day l''écarte déjà. Le prédicat qui décide vit côté client dans `teletravailSePose` (src/types/bilan.ts), lu par l''écran, par `manqueDeLEtape` et par `normaliserReponses` — les trois, sinon l''étape devient invalidable ou une réponse périmée part à la soumission (v1-17 §7.2).';

-- ── Contrôle : la traduction préserve le comportement ──────────────────────────────────────────
--
-- On ne compare pas des libellés mais **ce que le filtre écarte** : pour chaque gabarit
-- conditionné et chaque réponse, l'admissibilité doit être la même avant et après. La table de
-- vérité d'avant est écrite ici en dur — c'est la seule façon de la comparer une fois la base
-- changée — et elle vient du relevé du 17/09/2026 sur le distant.

do $controle$
declare
  v_ecarts integer;
  v_gabarits integer;
begin
  -- 1. Plus aucune valeur de l'ancien vocabulaire, ni dans les réponses ni dans les gabarits.
  select count(*) into v_ecarts from public.assessment_answers
  where teletravail in ('non', 'parfois', 'oui');
  if v_ecarts > 0 then
    raise exception 'C5.4 : % réponse(s) portent encore l''ancien vocabulaire.', v_ecarts;
  end if;

  select count(*) into v_ecarts
  from public.action_templates t, unnest(t.teletravail_admissible) r
  where r in ('non', 'parfois', 'oui');
  if v_ecarts > 0 then
    raise exception 'C5.4 : % gabarit(s) admettent encore l''ancien vocabulaire.', v_ecarts;
  end if;

  -- 2. Les deux gabarits conditionnés sont toujours là, et toujours conditionnés. Un `update` qui
  --    n'apparierait rien passerait sans bruit — c'est exactement ce que cette ligne attrape.
  select count(*) into v_gabarits from public.action_templates
  where teletravail_admissible is not null;
  if v_gabarits <> 2 then
    raise exception 'C5.4 : % gabarit(s) conditionné(s) au télétravail au lieu de 2.', v_gabarits;
  end if;

  -- 3. **La table de vérité, réponse par réponse et gabarit par gabarit.** C'est le contrôle qui
  --    vaut : il dit que personne ne gagne ni ne perd une action à la traduction.
  select count(*) into v_ecarts
  from (
    values
      ('Travailler depuis chez toi un jour par semaine',  'aucun',        false),
      ('Travailler depuis chez toi un jour par semaine',  'un_jour',      true),
      ('Travailler depuis chez toi un jour par semaine',  'deux_ou_plus', true),
      ('Travailler depuis chez toi deux jours par semaine', 'aucun',        false),
      ('Travailler depuis chez toi deux jours par semaine', 'un_jour',      false),
      ('Travailler depuis chez toi deux jours par semaine', 'deux_ou_plus', true)
  ) as attendu(action_text, reponse, admissible)
  join public.action_templates t on t.action_text = attendu.action_text
  where (attendu.reponse = any(t.teletravail_admissible)) is distinct from attendu.admissible;

  if v_ecarts > 0 then
    raise exception 'C5.4 : % case(s) de la table de vérité ne correspondent pas — la traduction ne préserve pas le comportement.', v_ecarts;
  end if;

  -- 4. Le tableau vide n'est pas un tableau absent : `= any('{}')` est faux pour toute valeur, donc
  --    il écarterait tout le monde là où `null` n'écarte personne. Un `update` maladroit peut le
  --    produire, et rien d'autre ne le verrait.
  select count(*) into v_ecarts from public.action_templates where teletravail_admissible = '{}';
  if v_ecarts > 0 then
    raise exception 'C5.4 : % gabarit(s) portent un tableau vide, qui écarte tout le monde.', v_ecarts;
  end if;
end
$controle$;
