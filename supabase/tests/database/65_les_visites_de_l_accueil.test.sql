-- Tests pgTAP : la page d'accueil du web se compte sans session, et sans rien qui désigne personne
-- (`docs/architecture/v1-36-la-page-d-accueil.md` §5, migration `20261031120000_les_visites_de_l_accueil.sql`).
--
-- **Ce que ce fichier garde.** Trois promesses de la page de confidentialité, et une condition de la mesure :
--
--   1. **`anon` compte, sans session** : la page d'accueil n'en ouvre pas, et c'est par `anon` qu'elle appelle.
--      **Et `authenticated` aussi** : qui revient avec une session restaurée sans bilan voit la page avec elle.
--      Le compteur du jour monte d'autant qu'on a compté, quel que soit ce qu'il portait avant.
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

select plan(10);

-- **Relatif à ce qu'il y avait avant** : la table garde ses compteurs d'un jour à l'autre — sur la production
-- dès la première visite, en local après un parcours réel —, donc l'assertion porte sur la hausse, jamais sur
-- un total (`TESTING-PGTAP.md` §2.3).
create temporary table avant as
  select evenement, nombre from public.visites_de_l_accueil
  where jour = (now() at time zone 'Europe/Paris')::date;
grant select on avant to anon, authenticated;

-- ── 1. anon compte, et une session aussi ──────────────────────────────────────────────────

set local role anon;
select lives_ok($$ select public.compter_sur_l_accueil('vue') $$, 'anon compte une vue, sans session');
select lives_ok($$ select public.compter_sur_l_accueil('vue') $$, 'anon compte une seconde vue');
select lives_ok($$ select public.compter_sur_l_accueil('clic_haut') $$, 'anon compte un toucher du bouton du haut');
reset role;

-- Qui revient avec une session mais sans bilan voit la page avec elle : la racine restaure sans ouvrir.
set local role authenticated;
select lives_ok($$ select public.compter_sur_l_accueil('lu_ete') $$, 'une session compte aussi');
reset role;

select results_eq(
  $$ select e.evenement, v.nombre - coalesce(a.nombre, 0)
     from (values ('clic_haut'::text), ('lu_ete'), ('vue')) e(evenement)
     join public.visites_de_l_accueil v
       on v.evenement = e.evenement and v.jour = (now() at time zone 'Europe/Paris')::date
     left join avant a on a.evenement = e.evenement
     order by e.evenement $$,
  $$ values ('clic_haut'::text, 1), ('lu_ete', 1), ('vue', 2) $$,
  'une ligne par événement et par jour, et un nombre qui monte d''autant qu''on a compté'
);

select ok(
  has_function_privilege('anon', 'public.compter_sur_l_accueil(text)', 'execute')
    and has_function_privilege('authenticated', 'public.compter_sur_l_accueil(text)', 'execute'),
  'anon et authenticated exécutent le compteur'
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
--   | `grant execute … to anon` retiré | les trois `lives_ok` d'anon, « un nombre qui monte » et « anon et authenticated exécutent » |
--   | `grant execute … to authenticated` retiré | « une session compte aussi », « un nombre qui monte » et « anon et authenticated exécutent » |
--   | `on conflict … do update` remplacé par `do nothing` | « un nombre qui monte » |
--   | le `check` des événements retiré | « un événement que le check ne connaît pas » |
--   | `grant select … to authenticated` ajouté | « ni anon ni authenticated » |
--   | une colonne `session uuid` ajoutée | « trois colonnes » |
--   | `now()::date` au lieu du jour de Paris | « au jour de Paris » |
