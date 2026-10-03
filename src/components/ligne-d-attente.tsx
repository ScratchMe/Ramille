import { ThemedText } from '@/components/themed-text';
import { useChargementVisible } from '@/hooks/use-apres-un-delai';

/**
 * La ligne « Chargement de ton … » d'un écran — une forme, un délai (`v1-33` T-9, 03/10/2026).
 *
 * **Le défaut.** L'audit en comptait huit formes : le corps par défaut ou `body`, le gris secondaire ou
 * tertiaire, `small` sur « Toi », et quatre qui n'attendaient pas les 300 ms de `v1-30` §5.8. La règle
 * du délai existait (`useChargementVisible`), mais chaque écran l'appelait lui-même, à côté d'un
 * `ThemedText` écrit à la main : un écran neuf pouvait l'oublier sans que rien ne le voie.
 *
 * **La règle tient ici, une fois** : `body`, `textSecondary` ; muette pendant
 * `DELAI_AVANT_CHARGEMENT`, sauf quand la personne a demandé ce chargement (« Réessayer ») — là, elle
 * est la seule preuve que le geste a été pris. Elle ne se rend que pendant un chargement : l'écran la
 * pose dans sa branche de chargement, et un chargement qui recommence la remonte, donc repart de zéro.
 *
 * **`immediate`, pour une page qu'on ouvre à froid par son adresse** : le HTML statique la porte
 * pendant que le JavaScript arrive, et une ligne différée n'y serait pas. Seule la restitution s'en
 * sert, décidée en `v1-30` §5.8 et lue par la section D de `verifier-etats-export.mjs`.
 */
export function LigneDAttente({
  children,
  demandee = false,
  immediate = false,
}: {
  /** « Chargement de ton plan… » — ce qui se charge, nommé. */
  children: string;
  /** Ce chargement est un « Réessayer » de la personne : la ligne se dit tout de suite. */
  demandee?: boolean;
  /** Une page ouverte à froid, dont le HTML statique doit porter la ligne. */
  immediate?: boolean;
}) {
  const visible = useChargementVisible(true, demandee || immediate);
  if (!visible) return null;
  return (
    <ThemedText type="body" themeColor="textSecondary">
      {children}
    </ThemedText>
  );
}
