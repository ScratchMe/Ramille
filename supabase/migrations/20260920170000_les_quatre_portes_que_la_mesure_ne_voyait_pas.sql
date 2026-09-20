-- Quatre portes de `/connexion/retrouver` que la mesure comptait comme une cinquième
--
-- `retrouver_view` porte `props.source`, et `sourceMesuree` (`src/app/connexion/retrouver.tsx`)
-- retombe sur `onboarding` pour toute valeur absente ou inconnue. Quatre navigations vers cet
-- écran ne passaient **aucune** source : les deux états vides du plan, celui du suivi, et l'écran
-- de session refusée du layout racine. Les quatre étaient donc enregistrées comme venant de
-- l'accueil de l'onboarding — et sur leurs **deux** dimensions, `collision` valant faux dans les
-- deux cas, donc rigoureusement indiscernables.
--
-- **C'est le défaut que `src/types/analytics.ts` décrit déjà, pour `lien`**, dans le commentaire
-- juste au-dessus de la liste : « elle était émise sans l'être … gonflant la porte à laquelle on
-- voulait la comparer ». Il vivait à quatre autres endroits pendant que ce commentaire
-- l'expliquait. Relevé le 20/09/2026, en relisant le dépôt entier.
--
-- **Celle qui coûtait le plus cher est `rappel`** : quelqu'un qui ouvre le rappel e-mail sur un
-- appareil où il n'est pas connecté, voit « Ce rappel concerne un compte » et touche « J'ai déjà
-- un compte ». C'est très exactement le chiffre que C2.11 existe pour produire — « combien de
-- personnes changent d'appareil avant de refaire un bilan » — et il était rendu indiscernable
-- d'une découverte.
--
-- **`session_refusee` n'est pas une porte comme les autres**, et c'est pourquoi elle a son nom :
-- c'est un **état de panne** (un jeton refusé, C2.11), pas une arrivée volontaire. La compter
-- avec les autres mêlerait un incident à une intention ; lui donner son nom permet de la
-- soustraire. Ne pas la déclarer du tout, c'était la mélanger sans le savoir.
--
-- ## Ce que cette migration fait, et ce qu'elle ne peut pas faire
--
-- Elle réécrit la **description** du référentiel, qui est le seul endroit où la base peut porter
-- les valeurs attendues : `check_usage_event_props` ne compte que des clés et des longueurs, donc
-- rien n'arrête une valeur de `props` qui dérive. **Aucun contrôle mécanique ne compare cette
-- description à `SOURCES_RETROUVER`** — c'est de la prose, et le comparateur de miroirs
-- (`scripts/verifier-miroirs-de-check.mjs`) ne sait lire qu'une contrainte `check`. La parade
-- reste l'habitude : qui ajoute une porte ajoute sa valeur ici **et** dans la liste TypeScript.
-- C'est écrit plutôt que supposé, parce que c'est précisément ce genre de non-dit qui a laissé
-- quatre portes muettes pendant une semaine.

update public.usage_event_types
   set description =
     'Affichage de /connexion/retrouver. props.source, huit portes : « onboarding » (« J''ai déjà '
     || 'un compte » sur l''accueil), « email » (renvoi après un email_exists), « google » '
     || '(collision d''identité), « lien » (le layout racine y amène après un lien de connexion '
     || 'expiré ou refusé), « rappel » (le rappel e-mail ouvert sur un appareil sans session — le '
     || 'chiffre de C2.11), « plan_vide » et « suivi_vide » (les états sans bilan des deux '
     || 'onglets), « session_refusee » (un jeton refusé : un état de panne, à soustraire des '
     || 'arrivées volontaires). props.collision : l''appareil portait déjà un bilan anonyme — '
     || 'c''est ce chiffre qui décide si la collision Google mérite un écran dédié. Les valeurs '
     || 'sont tenues à la main ici et dans SOURCES_RETROUVER (src/types/analytics.ts) : rien ne '
     || 'les compare.'
 where name = 'retrouver_view';

-- Contrôle de la migration : le référentiel nomme bien les quatre portes ajoutées. Il ne dit
-- rien de la liste TypeScript — voir ci-dessus, c'est la limite assumée.
do $$
declare
  v_description text;
  v_porte text;
begin
  select description into v_description from public.usage_event_types where name = 'retrouver_view';

  if v_description is null then
    raise exception 'L''événement `retrouver_view` n''est pas au référentiel : la mise à jour n''a rien touché.';
  end if;

  foreach v_porte in array array['rappel', 'plan_vide', 'suivi_vide', 'session_refusee'] loop
    if position(v_porte in v_description) = 0 then
      raise exception 'La description de `retrouver_view` ne nomme pas la porte « % ».', v_porte;
    end if;
  end loop;
end $$;
