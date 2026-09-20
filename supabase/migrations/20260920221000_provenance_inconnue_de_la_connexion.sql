-- Le repli de `sourceConnexion` a sa propre valeur : `inconnue` (20/09/2026).
--
-- Migration séparée de `20260920220000` à dessein, et non ajoutée dedans : celle-là est déjà
-- appliquée sur le distant, et **une migration se rejoue telle quelle** (`SUPABASE.md` §2.3) — la
-- réécrire ferait diverger le fichier du dépôt de ce que la base a exécuté, ce qui est exactement
-- le genre d'écart qu'aucune garde ne voit.
--
-- LE DÉFAUT QU'ELLE FERME. `sourceConnexion` repliait toute provenance absente ou inconnue sur
-- `resultat_transition`, avec pour raison « mieux compté sur le chemin historique que perdu ». Le
-- retrait de l'interstitiel a rendu cette phrase fausse dans le pire sens : plus aucun écran
-- n'émet cette provenance, donc chaque arrivée sans source — une URL collée, un favori, un retour
-- arrière — se serait ajoutée aux lignes de l'interstitiel, c'est-à-dire **au seul chiffre qu'on
-- garde pour mesurer ce que le retrait a changé**. Le repli aurait pollué sa propre référence.
--
-- `inconnue` est un fait et non une supposition. Elle n'a aucun émetteur d'écran, et c'est normal :
-- c'est le garde qui l'écrit.
--
-- Rejouable : un `update` idempotent.

update public.usage_event_types
set description = 'Affichage de /connexion. props.source : « resultat_cta » (la bannière de la restitution), « compte » (« Toi »), « rappels » (la porte sous la ligne « Par email » de la feuille des rappels, ouverte le 20/09/2026), « inconnue » (arrivée sans provenance : URL collée, favori, retour arrière — écrite par le garde, par aucun écran). « resultat_transition » n''est plus émise depuis le 20/09/2026 — c''était l''interstitiel imposé entre la restitution et le plan, retiré ce jour-là ; elle reste déclarée pour que les lignes antérieures se lisent, et le repli du garde ne la vise plus, sans quoi il gonflerait la mesure à laquelle on la compare.'
where name = 'connexion_view';

do $$
declare v_vue text;
begin
  select description into v_vue from public.usage_event_types where name = 'connexion_view';
  if v_vue is null or position('inconnue' in v_vue) = 0 then
    raise exception 'connexion_view ne déclare pas le repli « inconnue » : %', coalesce(v_vue, '(absente)');
  end if;
end $$;
