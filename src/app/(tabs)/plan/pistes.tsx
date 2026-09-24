import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BandeHaute } from '@/components/bande-haute';
import { MessageInline } from '@/components/message-inline';
import { CarteDePiste, type PisteDuPlan } from '@/components/plan/carte-de-piste';
import { PastilleEngagee } from '@/components/plan/pastille-engagee';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { POSTE_LABEL } from '@/constants/postes';
import { Spacing, Stroke } from '@/constants/theme';
import { useRafraichirAuRetour } from '@/hooks/use-rafraichir-au-retour';
import { useTheme } from '@/hooks/use-theme';
import { formatKg } from '@/lib/format';
import { ensureSession, supabase } from '@/lib/supabase';
import { filetsDesLignes, pistesParPoste, separationsDesLignes } from '@/types/plan';
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

  /**
   * La phrase d'un remplacement refusé (`RM001`), portée par l'écran et non par la carte.
   *
   * C'est le contrat explicite d'`ActionCommitment` : le même chemin appelle `onChanged()`, donc
   * la liste est relue et la carte remontée — une phrase gardée dans son état local disparaîtrait
   * au rendu suivant. L'écran du plan le fait depuis le 14/09/2026 ; **cet écran-ci, ajouté par
   * C5.2 après ce correctif, jetait le paramètre** et ne rendait rien : la liste se réordonnait
   * sous les yeux de la personne sans qu'un mot dise pourquoi son choix n'avait pas été pris.
   * Relevé le 20/09/2026.
   */
  const [refusDeRemplacement, setRefusDeRemplacement] = useState<string | null>(null);
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
      // Une navigation, donc un lien (24/09/2026, `v1-29`).
      role="link"
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
            {/* **La phrase disait un ordre que l'engagement défait** (contre-lecture du lot 5) :
                l'action engagée passe en tête de son poste quel que soit son gain, comme sur le
                plan — donc « du plus gros gain au plus petit » était faux pour ce groupe-là. On
                nomme l'exception plutôt que de retirer le tri de la phrase : c'est lui qui dit
                pourquoi la liste est dans cet ordre. */}
            {engageeId !== null
              ? 'Ton action en cours d’abord, puis par poste, du plus gros gain au plus petit. Une seule action engagée à la fois : en choisir une ici remplace la tienne.'
              : 'Par poste, du plus gros gain au plus petit. Une seule action engagée à la fois : en choisir une ici la met en tête de ton plan.'}
          </ThemedText>

          {/* **Le refus se dit ici, juste au-dessus de la liste**, et non en tête d'écran : les
              cartes commencent quelques lignes plus bas, donc la phrase reste dans le champ de
              vision de la personne qui vient de toucher « C'est noté ». La ligne se relit à chaque
              refus — `onRefus(null)` est appelé avant le RPC —, donc elle ne survit pas à une
              tentative réussie. */}
          {refusDeRemplacement && <MessageInline message={refusDeRemplacement} />}

          {/* **Un écran atteignable sans porte doit savoir ne rien avoir à montrer**
              (contre-lecture du lot 5). La porte du plan ne s'affiche qu'au-delà de deux pistes,
              mais l'adresse existe sur web et se tape : sans cette phrase, un plan à zéro action —
              tout cycliste et tout profil sédentaire depuis C2.5 — rendait un titre suivi d'une
              promesse de tri au-dessus de rien. On le dit, et on ne le dit qu'après une lecture
              **réussie** : l'échec, lui, a son propre écran juste au-dessus (règle de C1.4). */}
          {groupes.length === 0 && (
            <ThemedText type="body" themeColor="textSecondary">
              Ton plan ne porte aucune piste pour cette période.
            </ThemedText>
          )}

          {groupes.map((groupe) => (
            <View key={groupe.poste ?? 'sans-poste'} style={styles.groupe}>
              {/* **Une étiquette de section, et non un titre de carte** (planche A2, #234). Elle
                  était rendue en `cardTitle` — 17 px, couleur pleine —, c'est-à-dire dans le
                  registre d'un **titre d'action**, à trois pixels du contenu qu'elle annonce. La
                  planche demande l'inverse : une étiquette discrète, qui suffit à découper *parce
                  que* les lignes portent un filet. On avait pris la moitié qui compense et laissé
                  celle qui structure.

                  **Le rôle d'en-tête s'écrit ici**, et c'est un correctif dans le correctif : le
                  commentaire d'origine affirmait que « `ThemedText` le fait par son `type` », ce
                  qui est vrai de `title`, `subtitle` et `screenTitle` — et faux de `cardTitle`
                  comme de `small`. La tête de groupe n'a donc jamais été annoncée comme un
                  en-tête. `ThemedText` laisse la surcharge passer devant son défaut. */}
              <ThemedText
                type="small"
                weight={600}
                themeColor="textTertiary"
                accessibilityRole="header"
                style={styles.teteDeGroupe}
              >
                {groupe.poste !== null
                  ? (POSTE_LABEL[groupe.poste as keyof typeof POSTE_LABEL] ?? 'Tes trajets')
                  : 'Tes trajets'}
              </ThemedText>
              <Lignes
                pistes={groupe.pistes}
                ouvertes={ouvertes}
                engageeId={engageeId}
                onOuvrir={(id) => setOuvertes((set) => new Set(set).add(id))}
                onFermer={(id) =>
                  setOuvertes((set) => {
                    // Réécrit plutôt que muté, comme à l'ouverture : React compare par référence.
                    const suivant = new Set(set);
                    suivant.delete(id);
                    return suivant;
                  })
                }
                onEngage={(poste) => {
                  // **Le drapeau se pose avant `router.back()`**, jamais après ni sous condition :
                  // la feuille des rappels ne s'ouvre qu'une fois par appareil, donc la manquer la
                  // seule fois où elle compte la perd pour de bon (`v1-17` §7.3).
                  passage.deposer({ poste });
                  router.back();
                }}
                onChanged={rafraichir}
                onRefus={(message) => {
                  // Le refus `RM001` veut presque toujours dire que l'état a changé depuis
                  // l'affichage : on relit plutôt que de parler de réseau, et la ligne reste
                  // ouverte pour que le message porte sur une action qu'on voit encore.
                  setRefusDeRemplacement(message);
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
  onFermer,
  onEngage,
  onChanged,
  onRefus,
}: {
  pistes: PisteDuPlan[];
  ouvertes: ReadonlySet<string>;
  engageeId: string | null;
  onOuvrir: (id: string) => void;
  onFermer: (id: string) => void;
  onEngage: (poste: string | null) => void;
  onChanged: () => void;
  onRefus: (message: string | null) => void;
}) {
  const theme = useTheme();

  // **L'écart se pose sur un seul côté, et seulement là où il manque** (13.5, recette web du
  // 16/09/2026). La règle et ses deux pièges — Yoga ne fusionne pas les marges, et un `gap` au
  // conteneur séparerait les lignes fermées — vivent dans `separationsDesLignes`, avec leur test.
  //
  // **L'ensemble est désormais exactement celui des lignes ouvertes** (#234). Il contenait aussi
  // l'action engagée, qui était rendue en carte sans avoir été dépliée ; la planche A2 la veut en
  // **ligne**, donc cette raison-là tombe. Le contrat de la fonction, lui, ne bouge pas : elle parle
  // de cartes rendues, quelle qu'en soit la cause.
  // **`committed_at === null` n'est pas une ceinture de plus** : on peut ouvrir une ligne, s'y
  // engager depuis la carte, et revenir sur cet écran encore monté — la ligne serait alors dans
  // `ouvertes` alors que la planche A2 dit qu'une ligne engagée ne s'ouvre pas. La règle se tient
  // donc à l'état réel de la ligne, pas à l'historique des touchers.
  const enCarte = new Set(
    pistes.filter((p) => ouvertes.has(p.id) && p.committed_at === null).map((p) => p.id)
  );
  const ids = pistes.map((p) => p.id);
  const separations = separationsDesLignes(ids, enCarte);
  const filets = filetsDesLignes(ids, enCarte);

  return (
    <View style={styles.lignesPistes}>
      {pistes.map((action, rang) => {
        const separee = separations[rang];
        const filetee = filets[rang];
        const titre = action.action_templates?.action_text ?? 'Action à préciser.';
        const gain =
          action.saving_kg_year !== null ? `− ${formatKg(action.saving_kg_year)} kg` : null;

        if (enCarte.has(action.id)) {
          return (
            <View key={action.id} style={separee ? styles.pisteSeparee : undefined}>
              <CarteDePiste
                action={action}
                committedActionId={engageeId}
                onEngage={onEngage}
                onChanged={onChanged}
                onRefus={onRefus}
              />
              {/* **La sortie manquait, et ce n'était pas cosmétique** (planche A2, #234). Cet écran
                  existe pour **comparer** deux leviers — c'est la raison écrite pour laquelle
                  plusieurs lignes s'ouvrent à la fois (`v1-16` §5) — et sans « Réduire », trois
                  lignes ouvertes faisaient un mur de cartes dont on ne revenait à la liste qu'en
                  quittant l'écran. Refermer n'est pas un accordéon : les autres restent ouvertes. */}
              <TextLink
                label="Réduire"
                onPress={() => onFermer(action.id)}
                type="small"
                themeColor="textTertiary"
                style={styles.reduire}
              />
            </View>
          );
        }

        // **L'action engagée reste une ligne** (planche A2, #234) : elle était rendue en carte
        // pleine au milieu d'une liste qu'on est venu parcourir, donc elle occupait l'écran au lieu
        // d'y être repérable. La pastille et le mot prennent la place de « Choisir », et la ligne ne
        // s'ouvre pas — il n'y a rien à y choisir.
        if (action.committed_at !== null) {
          return (
            <View
              key={action.id}
              style={[
                styles.lignePiste,
                separee && styles.pisteSeparee,
                filetee && { borderBottomWidth: Stroke.hairline, borderBottomColor: theme.border },
              ]}
              accessible
              accessibilityLabel={`${titre.replace(/\.$/, '')}${gain !== null ? `. ${gain} par an` : ''}. Action engagée.`}
            >
              <ThemedText type="small" themeColor="text" style={styles.lignePisteTitre}>
                {titre}
              </ThemedText>
              <View style={styles.lignePisteFin}>
                {gain !== null && (
                  <ThemedText type="small" themeColor="textTertiary" style={styles.chiffres}>
                    {gain}
                  </ThemedText>
                )}
                <PastilleEngagee />
                <ThemedText type="small" weight={600} themeColor="accentText">
                  Engagée
                </ThemedText>
              </View>
            </View>
          );
        }

        return (
          <Pressable
            key={action.id}
            style={({ pressed }) => [
              styles.lignePiste,
              separee && styles.pisteSeparee,
              // **Le filet, oublié à la livraison de C5.2** : sans lui, onze lignes de 14 px
              // forment un pavé continu. Quelles lignes le portent se décide dans
              // `filetsDesLignes`, avec ses deux exclusions et leurs tests.
              filetee && { borderBottomWidth: Stroke.hairline, borderBottomColor: theme.border },
              // **La ligne répond au doigt** (24/09/2026, `v1-29`) : la teinte `backgroundPressed`,
              // tout de suite et sans animation. Pas de marge négative ici, à la différence des
              // lignes du suivi : elle élargirait aussi le filet, qui s'aligne sur les têtes de
              // groupe.
              pressed && { backgroundColor: theme.backgroundPressed },
            ]}
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
                <ThemedText type="small" themeColor="textTertiary" style={styles.chiffres}>
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
  // **Le rayon qui n'arrondissait rien est parti** (#234) : `borderRadius` sans fond ni bordure,
  // reste d'une version où le groupe était une carte. Le `gap` tombe à zéro parce que la tête porte
  // désormais ses propres marges — 16 dessus, 4 dessous, comme la planche A2 le demande —, et qu'un
  // `gap` par-dessus les rajouterait aux deux.
  groupe: { gap: 0 },
  // La planche demande 16 dessus et 4 dessous. Les 16 sont déjà là — `scroll` porte un `gap` de
  // `three` entre ses enfants, dont chaque groupe — donc les écrire ici les doublerait.
  teteDeGroupe: { paddingBottom: Spacing.one },
  // Aligné à gauche sous la carte, en tertiaire : c'est une sortie, pas une proposition.
  reduire: { alignSelf: 'flex-start', paddingTop: Spacing.one },
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
    // 34 px, sous la cible de 44 que `ControlHeight.target` nommait alors. Du `hitSlop` aurait
    // marché sans déplacer le texte, mais les rangées se touchent (`gap: 0`) et leurs zones se
    // seraient recouvertes — c'est la hauteur qu'il faut, pas une marge invisible. À 16 px, la
    // rangée monte à 52 au moins (16 + 20 + 16) : elle tient aussi la cible de 48 que ce jeton
    // porte depuis le 24/09/2026 (`v1-29`).
    paddingVertical: Spacing.three,
  },
  lignePisteTitre: { flex: 1, minWidth: 0 },
  lignePisteFin: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  // **Chiffres tabulaires** (24/09/2026, `v1-29`) : les gains se lisent en colonne, d'une ligne à
  // l'autre. Spline Sans porte la fonction `tnum`.
  chiffres: { fontVariant: ['tabular-nums'] },
});
