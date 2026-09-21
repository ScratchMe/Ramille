-- Le référentiel d'événements, après le retrait de l'interstitiel de compte (20/09/2026).
--
-- Rien ne change au schéma : cette migration ne touche que des **descriptions**, et c'est
-- précisément ce qui les rend nécessaires. `check_usage_event_props` ne compte que des clés et des
-- longueurs, donc la base ne valide aucune valeur de `props` : la description du référentiel est le
-- seul endroit où les valeurs attendues d'une propriété peuvent vivre, et une valeur qui dérive s'y
-- lit ou ne se lit nulle part (CLAUDE.md, la leçon de `connexion_view` le 11/09/2026 — cinq
-- provenances déclarées dont deux mortes, et une sixième réécrite en silence).
--
-- Deux faits à consigner :
--
--   1. **`connexion_view.props.source` gagne `rappels` et garde `resultat_transition`.** La
--      quatrième porte est la feuille des rappels, seul écran du produit qui POSE la question à
--      laquelle le compte répond, et dont la ligne « Par email » était grisée sans porte.
--      `resultat_transition` était l'interstitiel imposé : plus rien ne l'émet depuis aujourd'hui,
--      et elle reste déclarée parce que les lignes déjà en base la portent — la retirer rendrait
--      illisible l'historique d'avant le retrait, c'est-à-dire la seule mesure à laquelle comparer
--      l'après.
--
--   2. **`connexion_dismiss` est mis à la retraite sans être supprimé, et c'est une nuance de la
--      règle du dépôt.** CLAUDE.md dit qu'un événement déclaré que rien n'émet doit être retiré,
--      « il ne se lit pas “pas encore instrumenté”, il se lit zéro ». La règle suppose un événement
--      **sans histoire** : ici cinq lignes existent (relevé sur le distant le 20/09/2026), et
--      `usage_events.name` référence cette table — les supprimer serait détruire une mesure réelle
--      pour respecter une règle qui vise l'inverse. La ligne reste donc, et sa description dit
--      depuis quand plus rien ne l'émet : un zéro daté est lisible, un zéro muet ne l'est pas.
--
-- Rejouable : deux `update` idempotents.

update public.usage_event_types
set description = 'Affichage de /connexion. props.source : « resultat_cta » (la bannière de la restitution), « compte » (« Toi »), « rappels » (la porte sous la ligne « Par email » de la feuille des rappels, ouverte le 20/09/2026). « resultat_transition » n''est plus émise depuis le 20/09/2026 — c''était l''interstitiel imposé entre la restitution et le plan, retiré ce jour-là ; elle reste déclarée pour que les lignes antérieures se lisent.'
where name = 'connexion_view';

update public.usage_event_types
set description = 'RETIRÉ le 20/09/2026 : plus aucun code ne l''émet. C''était « Continuer sans compte » sur l''interstitiel de compte, qui ne s''interpose plus — on ne refuse plus rien, on reporte. Les lignes antérieures sont conservées : elles mesurent le refus de l''interstitiel, et c''est la seule base de comparaison avec l''après.'
where name = 'connexion_dismiss';

-- Contrôle : les deux lignes existent et portent bien la nouvelle description. Un référentiel muet
-- se lirait « migration passée » alors que rien n'aurait bougé.
do $$
declare
  v_vue text;
  v_dismiss text;
begin
  select description into v_vue from public.usage_event_types where name = 'connexion_view';
  select description into v_dismiss from public.usage_event_types where name = 'connexion_dismiss';
  if v_vue is null or position('rappels' in v_vue) = 0 then
    raise exception 'connexion_view ne déclare pas la provenance « rappels » : %', coalesce(v_vue, '(absente)');
  end if;
  if v_dismiss is null or position('RETIRÉ' in v_dismiss) = 0 then
    raise exception 'connexion_dismiss n''est pas marqué retiré : %', coalesce(v_dismiss, '(absente)');
  end if;
end $$;
