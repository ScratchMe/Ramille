-- Tests pgTAP : la page d'accueil du web se compte sans session, et sans rien qui désigne personne
-- (`docs/architecture/v1-36-la-page-d-accueil.md` §5, migration `20261031120000_les_visites_de_l_accueil.sql`).
--
-- **Ce que ce fichier garde.** Trois promesses de la page de confidentialité, et une condition de la mesure :
--
--   1. **`anon` compte, sans session** : la page d'accueil n'en ouvre pas, et c'est par `anon` qu'elle appelle.
--      Le compteur du jour monte d'un, puis de deux ; un autre événement a sa ligne.
--   2. **Un événement inconnu est refusé** par le `check`, seule liste en base — la fonction ne la recopie pas.
--   3. **Le client ne lit rien** : ni `anon` ni `authenticated` n'ont un privilège sur la table, et la fonction
--      n'écrit que par elle-même (`security definer`). La table n'a que trois colonnes, et aucune ne désigne
--      quelqu'un : une colonne ajoutée fait tomber l'assertion qui les nomme.
--   4. **Le jour est celui de Paris** : un compte posé à 23 h 30 UTC, déjà le lendemain à Paris en hiver, n'est
--      pas testable sans figer l'horloge ; l'assertion relit l'expression de la fonction.
--
-- **Éprouvé en le cassant, le 31/10/2026** — voir le relevé des mutations au pied.
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

-- ── 1. anon compte ─────────────────────────────────────────────────────────────────────────

set local role anon;
select lives_ok($$ select public.compter_sur_l_accueil('vue') $$, 'anon compte une vue, sans session');
select lives_ok($$ select public.compter_sur_l_accueil('vue') $$, 'anon compte une seconde vue');
select lives_ok($$ select public.compter_sur_l_accueil('clic_haut') $$, 'anon compte un toucher du bouton du haut');
reset role;

select results_eq(
  $$ select evenement, nombre from public.visites_de_l_accueil
     where jour = (now() at time zone 'Europe/Paris')::date order by evenement $$,
  $$ values ('clic_haut'::text, 1), ('vue', 2) $$,
  'une ligne par événement et par jour, et un nombre qui monte'
);

-- ── 2. Un événement inconnu ────────────────────────────────────────────────────────────────

set local role anon;
select throws_ok(
  $$ select public.compter_sur_l_accueil('lu_partout') $$,
  '23514',
  null,
  'un événement que le check ne connaît pas est refusé'
);
reset role;

-- ── 3. Le client ne lit rien, et la table ne garde rien qui désigne quelqu'un ──────────────

select ok(
  not has_table_privilege('anon', 'public.visites_de_l_accueil', 'select, insert, update, delete')
    and not has_table_privilege('authenticated', 'public.visites_de_l_accueil', 'select, insert, update, delete'),
  'ni anon ni authenticated n''ont de privilège sur la table'
);

-- Un tableau et non `results_eq` : les noms du catalogue ont la collation « C », que `results_eq` refuse de
-- comparer à un texte ordinaire.
select is(
  (select array_agg(column_name::text order by column_name::text) from information_schema.columns
     where table_schema = 'public' and table_name = 'visites_de_l_accueil'),
  array['evenement', 'jour', 'nombre'],
  'trois colonnes, et aucune ne désigne personne : ni identifiant, ni adresse, ni appareil, ni heure'
);

-- ── 4. Le jour de Paris ────────────────────────────────────────────────────────────────────

select ok(
  pg_get_functiondef('public.compter_sur_l_accueil(text)'::regprocedure) like '%now() at time zone ''Europe/Paris''%',
  'le compteur range la visite au jour de Paris'
);

select * from finish();
rollback;

-- Relevé des mutations, le 31/10/2026, chacune posée sur la stack locale puis ce fichier rejoué, la
-- migration réécrite ensuite :
--
--   | Ce qu'on casse | Ce qui tombe |
--   |---|---|
--   | `grant execute … to anon` retiré | les trois `lives_ok` de 1, et « un nombre qui monte » (aucune ligne) |
--   | `on conflict … do update` remplacé par `do nothing` | « un nombre qui monte » (1 au lieu de 2) |
--   | le `check` des événements retiré | « un événement que le check ne connaît pas » |
--   | `grant select … to authenticated` ajouté | « ni anon ni authenticated » |
--   | une colonne `session uuid` ajoutée | « trois colonnes » |
--   | `now()::date` au lieu du jour de Paris | « au jour de Paris » |
