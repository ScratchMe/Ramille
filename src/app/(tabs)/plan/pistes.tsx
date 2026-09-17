import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BandeHaute } from '@/components/bande-haute';
import { CarteDePiste, type PisteDuPlan } from '@/components/plan/carte-de-piste';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { POSTE_LABEL } from '@/constants/postes';
import { Radius, Spacing } from '@/constants/theme';
import { useRafraichirAuRetour } from '@/hooks/use-rafraichir-au-retour';
import { ensureSession, supabase } from '@/lib/supabase';
import { pistesParPoste, separationsDesLignes } from '@/types/plan';
import { usePassageDEngagement } from './_layout';

/**
 * « Toutes les pistes » — l'exhaustivité, sortie du plan (C5.2, écarts 2 à 5).
 *
 * Le plan montrait deux cartes puis dépliait jusqu'à onze cartes pleines sous un « Replier » sorti
 * de l'écran : l'insistance et l'exhaustivité tenaient sur la même surface, et l'exhaustivité
 * gagnait. Elles se séparent — deux cartes là-bas, **tout** ici, groupé par poste.
 *
 * **Ce qui ne change pas, et c'est délibéré** : le classement. Les groupes sortent dans l'ordre où
 * leur poste apparaît, donc la tête de cet écran est la première carte du plan. Deux surfaces qui
 * se contrediraient sur ce qui compte le plus seraient pires qu'une seule trop dense.
 *
 * **Et il n'y a pas de rang ici.** Toutes les pistes sont au même niveau, chacune ouvrable : c'est
 * la promesse de `v1-16` §5 — toute action affichée est engageable — tenue jusqu'au bout. La
 * hiérarchie vit sur le plan, qui insiste ; cet écran présente.
 */
type Etat =
  | { genre: 'chargement' }
  | { genre: 'erreur' }
  | { genre: 'pistes'; pistes: PisteDuPlan[] };

export default function PistesScreen() {
  const [etat, setEtat] = useState<Etat>({ genre: 'chargement' });
  const [cle, setCle] = useState(0);
  const passage = usePassageDEngagement();

  /**
   * Les lignes ouvertes en carte.
   *
   * **Plusieurs à la fois, et c'est le point** (recette du 14/09/2026, `v1-16` §5). Un accordéon qui
   * referme la précédente reprendrait d'une main ce que cet écran donne : comparer deux leviers est
   * exactement ce qu'il rend possible. Local et non persisté — un geste de lecture, pas une
   * préférence — et un `Set` réécrit plutôt que muté, React comparant par référence.
   */
  const [ouvertes, setOuvertes] = useState<ReadonlySet<string>>(new Set());

  const rafraichir = useCallback(() => setCle((k) => k + 1), []);
  useRafraichirAuRetour(rafraichir);

  useEffect(() => {
    let annule = false;

    void (async () => {
      try {
        await ensureSession();
        const { data, error } = await supabase
          .from('plan_cycles')
          .select(
            // Même chaîne littérale d'un seul tenant que l'écran du plan, et pour la même raison :
            // supabase-js infère le type du résultat en analysant ce littéral au niveau des types.
            // **`plan_actions!plan_actions_plan_cycle_id_fkey` est obligatoire** — `carried_over_from`
            // est une seconde clé étrangère vers `plan_cycles`, donc sans le nom PostgREST refuse la
            // requête et l'écran ne charge plus du tout (C2.2).
            'id, plan_actions!plan_actions_plan_cycle_id_fkey(id, saving_kg_year, saving_share_percent, detail_text, first_step, rank, committed_at, intention_days, intention_timing, carried_over_from, action_templates(action_text, poste))'
          )
          .order('period_start', { ascending: false })
          .limit(1);

        if (annule) return;
        if (error) {
          setEtat({ genre: 'erreur' });
          return;
        }
        setEtat({ genre: 'pistes', pistes: data?.[0]?.plan_actions ?? [] });
      } catch {
        if (!annule) setEtat({ genre: 'erreur' });
      }
    })();

    return () => {
      annule = true;
    };
  }, [cle]);

  const engageeId =
    etat.genre === 'pistes'
      ? (etat.pistes.find((a) => a.committed_at !== null)?.id ?? null)
      : null;

  const retour = (
    <TextLink
      label="Retour au plan"
      onPress={() => router.back()}
      type="small"
      weight={600}
      themeColor="accentText"
    />
  );

  if (etat.genre !== 'pistes') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <BandeHaute />
          <View style={styles.etatSimple}>
            {/* L'écran ne dit jamais « tu n'as rien » sur un échec de lecture : il dit qu'il n'a pas
                pu lire, et propose de réessayer (règle de C1.4). Les pistes existent, c'est la
                lecture qui a manqué. */}
            <ThemedText type="body" themeColor="textSecondary">
              {etat.genre === 'chargement'
                ? 'Chargement de tes pistes…'
                : 'Tes pistes n’ont pas pu être chargées.'}
            </ThemedText>
            {etat.genre === 'erreur' && (
              <TextLink
                label="Réessayer"
                onPress={() => {
                  // Repasser par « chargement » dans ce gestionnaire, et jamais dans `rafraichir` :
                  // sans ce passage, un second échec rend exactement le même écran et le bouton a
                  // l'air mort ; dedans, il ferait clignoter l'écran à chaque retour au premier plan.
                  setEtat({ genre: 'chargement' });
                  rafraichir();
                }}
                type="small"
                weight={600}
                themeColor="accentText"
              />
            )}
            {retour}
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const groupes = pistesParPoste(etat.pistes, (a) => a.action_templates?.poste ?? null);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <BandeHaute />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {retour}

          <ThemedText type="screenTitle">Toutes les pistes</ThemedText>
          <ThemedText type="body" themeColor="textSecondary">
            {engageeId !== null
              ? 'Par poste, du plus gros gain au plus petit. Une seule action engagée à la fois : en choisir une ici remplace la tienne.'
              : 'Par poste, du plus gros gain au plus petit. Une seule action engagée à la fois : en choisir une ici la met en tête de ton plan.'}
          </ThemedText>

          {groupes.map((groupe) => (
            <View key={groupe.poste ?? 'sans-poste'} style={styles.groupe}>
              {/* Les têtes de groupe s'annoncent en en-tête : `ThemedText` le fait par son `type`,
                  jamais par un attribut recopié à côté du texte visible (règle de CLAUDE.md). */}
              <ThemedText type="cardTitle">
                {groupe.poste !== null
                  ? (POSTE_LABEL[groupe.poste as keyof typeof POSTE_LABEL] ?? 'Tes trajets')
                  : 'Tes trajets'}
              </ThemedText>
              <Lignes
                pistes={groupe.pistes}
                ouvertes={ouvertes}
                engageeId={engageeId}
                onOuvrir={(id) => setOuvertes((set) => new Set(set).add(id))}
                onEngage={(poste) => {
                  // **Le drapeau se pose avant `router.back()`**, jamais après ni sous condition :
                  // la feuille des rappels ne s'ouvre qu'une fois par appareil, donc la manquer la
                  // seule fois où elle compte la perd pour de bon (`v1-17` §7.3).
                  passage.deposer({ poste });
                  router.back();
                }}
                onChanged={rafraichir}
                onRefus={() => {
                  // Le refus `RM001` veut presque toujours dire que l'état a changé depuis
                  // l'affichage : on relit plutôt que de parler de réseau, et la ligne reste
                  // ouverte pour que le message porte sur une action qu'on voit encore.
                  rafraichir();
                }}
              />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Lignes({
  pistes,
  ouvertes,
  engageeId,
  onOuvrir,
  onEngage,
  onChanged,
  onRefus,
}: {
  pistes: PisteDuPlan[];
  ouvertes: ReadonlySet<string>;
  engageeId: string | null;
  onOuvrir: (id: string) => void;
  onEngage: (poste: string | null) => void;
  onChanged: () => void;
  onRefus: (message: string | null) => void;
}) {
  // **L'écart se pose sur un seul côté, et seulement là où il manque** (13.5, recette web du
  // 16/09/2026). La règle et ses deux pièges — Yoga ne fusionne pas les marges, et un `gap` au
  // conteneur séparerait les lignes fermées — vivent dans `separationsDesLignes`, avec leur test.
  const separations = separationsDesLignes(
    pistes.map((p) => p.id),
    ouvertes
  );

  return (
    <View style={styles.lignesPistes}>
      {pistes.map((action, rang) => {
        const separee = separations[rang];
        const estEngagee = action.committed_at !== null;

        if (ouvertes.has(action.id) || estEngagee) {
          return (
            <View key={action.id} style={separee ? styles.pisteSeparee : undefined}>
              <CarteDePiste
                action={action}
                committedActionId={engageeId}
                onEngage={onEngage}
                onChanged={onChanged}
                onRefus={onRefus}
              />
            </View>
          );
        }

        const titre = action.action_templates?.action_text ?? 'Action à préciser.';
        const gain =
          action.saving_kg_year !== null ? `− ${Math.round(action.saving_kg_year)} kg` : null;

        return (
          <Pressable
            key={action.id}
            style={[styles.lignePiste, separee && styles.pisteSeparee]}
            onPress={() => onOuvrir(action.id)}
            accessibilityRole="button"
            // Une cible qui porte plusieurs textes : on les recompose plutôt que de laisser
            // annoncer trois fragments sans lien. Le gain se dit « par an », que l'œil déduit de la
            // colonne ; le point final du libellé part avant la composition, sinon le repli
            // « Action à préciser. » enchaîne deux points ; et l'annonce finit par « Choisir », qui
            // dit ce que le toucher fait.
            accessibilityLabel={[
              titre.replace(/\.$/, ''),
              gain !== null ? `${gain} par an` : null,
              'Choisir',
            ]
              .filter((part) => part !== null)
              .join('. ')
              .concat('.')}
          >
            <ThemedText type="small" themeColor="textSecondary" style={styles.lignePisteTitre}>
              {titre}
            </ThemedText>
            {/* Le gain et l'affordance groupés à droite : sous le `space-between` de la rangée,
                trois enfants feraient flotter le chiffre au milieu. */}
            <View style={styles.lignePisteFin}>
              {gain !== null && (
                <ThemedText type="small" themeColor="textTertiary">
                  {gain}
                </ThemedText>
              )}
              {/* **L'affordance est un mot, parce que ce dépôt n'a pas d'icônes** — et c'est celui
                  que le produit emploie déjà pour ce geste. Une ligne qui ne porte qu'un nombre ne
                  donne aucune raison d'être touchée. */}
              <ThemedText type="small" weight={600} themeColor="accentText">
                Choisir
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  etatSimple: { flex: 1, padding: Spacing.four, justifyContent: 'center', gap: Spacing.three },
  groupe: { gap: Spacing.two, borderRadius: Radius.card },
  lignesPistes: { gap: 0 },
  // La même valeur que les cartes du plan : une ligne dépliée devient une carte, elle doit donc
  // respirer au rythme des cartes et non à un rythme à elle.
  pisteSeparee: { marginTop: Spacing.two + 2 },
  lignePiste: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Spacing.two,
    // `three` et non `two` depuis que la ligne se touche (`v1-16` §5) : à 8 px la rangée mesurait
    // 34 px, sous la cible de 44 que `ControlHeight.target` nomme et que `TextLink` tient déjà. Du
    // `hitSlop` aurait marché sans déplacer le texte, mais les rangées se touchent (`gap: 0`) et
    // leurs zones se seraient recouvertes — c'est la hauteur qu'il faut, pas une marge invisible.
    paddingVertical: Spacing.three,
  },
  lignePisteTitre: { flex: 1, minWidth: 0 },
  lignePisteFin: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
});
