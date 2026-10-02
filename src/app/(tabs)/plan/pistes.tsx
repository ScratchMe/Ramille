import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BandeHaute } from '@/components/bande-haute';
import { MessageInline } from '@/components/message-inline';
import { CarteDePiste, type PisteDuPlan } from '@/components/plan/carte-de-piste';
import { PastilleEngagee } from '@/components/plan/pastille-engagee';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { POSTE_LABEL } from '@/constants/postes';
import { Mouvement, Radius, Spacing, Stroke, TypeScale } from '@/constants/theme';
import { useChargementVisible } from '@/hooks/use-apres-un-delai';
import { useRafraichirAuRetour } from '@/hooks/use-rafraichir-au-retour';
import { useTheme } from '@/hooks/use-theme';
import { donnerLeFocus } from '@/lib/focus';
import { formatKg } from '@/lib/format';
import { revenirOu } from '@/lib/navigation';
import { Apparition, HauteurSuivie, SansApparitionAuMontage } from '@/lib/mouvement';
import { ensureSession, supabase } from '@/lib/supabase';
import { mesurerDansLaFenetre } from '@/lib/defilement';
import { defilementPourMontrer } from '@/types/mouvement';
import {
  annonceDeLaPiste,
  etatDeLaPiste,
  filetsDesLignes,
  introDesPistes,
  libelleDuChoix,
  pistesParPoste,
  separationsDesLignes,
} from '@/types/plan';
import { usePassageDEngagement } from './_layout';

/**
 * « Toutes les pistes » — l'exhaustivité, sortie du plan (C5.2, écarts 2 à 5), puis redessinée par
 * le canvas `v1-30` et son plan d'implémentation `v1-32` (29/09/2026) : **on compare sur la liste,
 * on touche pour choisir.**
 *
 * Le plan montrait deux cartes puis dépliait jusqu'à onze cartes pleines sous un « Replier » sorti
 * de l'écran : l'insistance et l'exhaustivité tenaient sur la même surface, et l'exhaustivité
 * gagnait. Elles se séparent — deux cartes là-bas, **tout** ici, groupé par poste.
 *
 * **Chaque ligne porte ce qu'on compare** : son titre à la taille du contenu, son gain dessous, « par
 * an ». Deux cartes ouvertes à trois lignes d'écart ne tenaient pas ensemble dans l'écran (planche
 * A0b), donc la comparaison se fait sur la liste, d'un coup d'œil, et la carte ne s'ouvre que pour
 * **choisir** — directement sur la question (« Quand ? », « Quels jours ? »), une seule à la fois
 * (décision n° 1 du 28/09/2026, qui remplace `v1-16` §5 sur l'ouverture de plusieurs cartes).
 *
 * **Le classement est celui du plan, pas sa tête** (décision n° 2). Les groupes sortent dans l'ordre
 * où leur poste apparaît au rang, et l'ordre ne bouge pas de la saison : l'action engagée reste à sa
 * place, marquée, là où le plan la met en tête. Le plan répond à « qu'est-ce que je fais en ce
 * moment ? », cet écran à « qu'est-ce qui existe, et combien ça pèse ? » (`pistesParPoste`).
 *
 * **Et il n'y a pas de rang affiché.** Toutes les pistes sont au même niveau, chacune se choisit :
 * c'est la promesse de `v1-16` §5 — toute action affichée est engageable — tenue jusqu'au bout. La
 * hiérarchie vit sur le plan, qui insiste ; cet écran présente.
 */
type Etat =
  // `relance` : ce chargement est un « Réessayer » de la personne, et il se dit tout de suite.
  | { genre: 'chargement'; relance?: true }
  | { genre: 'erreur' }
  | { genre: 'pistes'; pistes: PisteDuPlan[] };

export default function PistesScreen() {
  const [etat, setEtat] = useState<Etat>({ genre: 'chargement' });
  const [cle, setCle] = useState(0);

  /**
   * La phrase d'un remplacement refusé (`RM001`), portée par l'écran et non par la carte.
   *
   * C'est le contrat explicite d'`ActionCommitment` : le même chemin appelle `onChanged()`, donc
   * la liste est relue — une phrase gardée dans l'état local de la carte ne survivrait pas à un
   * remontage. L'écran du plan le fait depuis le 14/09/2026 ; **cet écran-ci, ajouté par C5.2 après
   * ce correctif, jetait le paramètre** et ne rendait rien : la liste changeait sous les yeux de la
   * personne sans qu'un mot dise pourquoi son choix n'avait pas été pris. Relevé le 20/09/2026.
   */
  const [refusDeRemplacement, setRefusDeRemplacement] = useState<string | null>(null);
  const passage = usePassageDEngagement();

  /**
   * La piste ouverte sur le choix, ou aucune.
   *
   * **Une seule à la fois** (décision n° 1 du 28/09/2026, `v1-32`). Plusieurs lignes s'ouvraient
   * ensemble depuis la recette du 14/09/2026 (`v1-16` §5), pour comparer deux leviers — mais deux
   * cartes ouvertes ne tenaient pas dans l'écran, et le gain d'une carte quittait la colonne des
   * autres (planche A0b) : la comparaison se fait désormais sur la liste, et la carte sert à
   * choisir. Toucher une autre pastille referme celle-ci — sa sélection est perdue, c'est voulu —,
   * « Annuler » la rend à sa ligne. Local et non persisté : un geste de lecture, pas une préférence ;
   * quitter l'écran ferme le choix avec lui.
   */
  const [enChoix, setEnChoix] = useState<string | null>(null);

  const rafraichir = useCallback(() => setCle((k) => k + 1), []);
  useRafraichirAuRetour(rafraichir);

  /**
   * **Le focus revient à la rangée quand « Annuler » rend la carte à sa ligne** (`v1-32` §4.4,
   * `FRONT.md` §2.4). La carte disparaît sous le doigt qui touche « Annuler » : sans ceci, le focus
   * tombait sur le document. **Le piège** : la rangée est un **autre élément** que la carte, monté à
   * neuf sous la même clé de `HauteurSuivie` — elle n'existe pas encore dans le gestionnaire
   * d'« Annuler ». L'identifiant à refocaliser est donc gardé le temps d'un rendu, et le focus se
   * pose une fois la rangée montée, par la référence qu'elle a inscrite.
   */
  const rangees = useRef(new Map<string, View>());
  const aRefocaliser = useRef<string | null>(null);
  useEffect(() => {
    const id = aRefocaliser.current;
    if (id === null) return;
    aRefocaliser.current = null;
    donnerLeFocus(rangees.current.get(id));
  }, [enChoix]);
  const inscrireRangee = useCallback((id: string, noeud: View | null) => {
    if (noeud) rangees.current.set(id, noeud);
    else rangees.current.delete(id);
  }, []);

  /**
   * **L'écran défile jusqu'à « C'est noté » quand la carte ouverte le fait sortir de la fenêtre**
   * (HANDOFF du canvas `v1-30`, planche B2 ; `v1-32` §4.4). La carte grandit vers le bas ; sur un
   * trajet domicile-travail à 360, son bouton passe sous la barre d'onglets. On défile **juste
   * assez** pour le montrer, sans faire passer le titre de la carte sous la bande
   * (`defilementPourMontrer`, testé) — le défilement de la plateforme, comme la page suivante de
   * l'onboarding, **instantané sous « réduire les animations »** : `scrollTo` animé ne la consulte
   * pas sur web, où react-native-web le traduit en `behavior: 'smooth'`.
   *
   * **On défile une fois la carte grandie, pas pendant** (`Mouvement.entree` après l'ouverture ;
   * tout de suite sous la préférence, où rien ne grandit). Tant que `HauteurSuivie` n'a que la
   * hauteur de la rangée, le contenu de l'écran est trop court pour qu'on défile jusqu'au bas de la
   * carte : le navigateur borne `scrollTo` au maximum de l'instant, et l'écran s'arrêtait là, « C'est
   * noté » sous la barre d'onglets. Mesuré au navigateur le 29/09/2026 sur la planche B2 : la
   * position restait à 883 px pendant que la hauteur défilable passait de 1 571 à 1 920. Le
   * défilement suit donc la carte au lieu de l'accompagner — ce qu'elle découvre en grandissant
   * reste sous le doigt, puis l'écran monte juste assez.
   *
   * Trois pièges de plus, chacun payé ailleurs avant d'être écrit ici :
   *  - **on mesure la carte, pas son `HauteurSuivie`** : celui-ci anime sa hauteur, donc sa mesure à
   *    l'ouverture vaut encore celle de la rangée. La carte, elle, a sa hauteur pleine dès la
   *    première mise en page ;
   *  - **une carte déjà ouverte au-dessus se replie pendant que la nouvelle s'ouvre** : mesurée à
   *    l'ouverture, la nouvelle serait trop basse de ce que le repli va rendre, et l'écran défilerait
   *    trop — le titre sous la bande. L'attente couvre aussi le repli (`Mouvement.sortie`, plus
   *    court), et la mesure se prend en coordonnées de la fenêtre : l'ancrage du défilement de
   *    Chrome, qui compense ce qui se replie au-dessus (`TESTING.md` §2.14), déplace la position mais
   *    pas ce qu'on voit, et `position` suit ses événements ;
   *  - **le focus posé sur la question ne défile pas à sa place** : `donnerLeFocus` passe
   *    `preventScroll` sur web, ce qui laisse le défilement à qui l'a lancé.
   */
  const animationsReduites = useReducedMotion();
  const defilement = useRef<ScrollView>(null);
  const position = useRef(0);
  const cartes = useRef(new Map<string, View>());
  const aMontrer = useRef<string | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (minuterie.current !== null) clearTimeout(minuterie.current);
    },
    []
  );
  const inscrireCarte = useCallback((id: string, noeud: View | null) => {
    if (noeud) cartes.current.set(id, noeud);
    else cartes.current.delete(id);
  }, []);
  const surDefilement = useCallback((evenement: NativeSyntheticEvent<NativeScrollEvent>) => {
    position.current = evenement.nativeEvent.contentOffset.y;
  }, []);
  const carteMesuree = useCallback(
    (id: string) => {
      if (aMontrer.current !== id) return;
      aMontrer.current = null;
      const montrer = () => {
        minuterie.current = null;
        const carte = cartes.current.get(id);
        // La fenêtre de défilement elle-même — le nœud qui défile, et non l'instance du composant,
        // qui ne se mesure pas (sur web, react-native-web rend le nœud du DOM).
        const ecran = defilement.current?.getNativeScrollRef();
        if (!carte || !ecran) return;
        // La marge et la mesure sont communes avec le plan (`src/lib/defilement.ts`).
        mesurerDansLaFenetre(ecran, carte, (mesure) => {
          const aDefiler = defilementPourMontrer(mesure);
          if (aDefiler > 0) {
            defilement.current?.scrollTo({ y: position.current + aDefiler, animated: !animationsReduites });
          }
        });
      };
      // Sous la préférence, rien ne grandit ni ne se replie : les hauteurs sont posées d'emblée.
      if (animationsReduites) montrer();
      else minuterie.current = setTimeout(montrer, Mouvement.entree);
    },
    [animationsReduites]
  );

  const choisir = useCallback((id: string) => {
    if (minuterie.current !== null) clearTimeout(minuterie.current);
    minuterie.current = null;
    aMontrer.current = id;
    setEnChoix(id);
  }, []);
  const annuler = useCallback((id: string) => {
    if (minuterie.current !== null) clearTimeout(minuterie.current);
    minuterie.current = null;
    aMontrer.current = null;
    aRefocaliser.current = id;
    setEnChoix(null);
  }, []);

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
      // **Jamais un `router.back()` nu** : rechargé, ou ouvert par son adresse, cet écran n'a rien
      // derrière lui dans la pile, et le lien ne faisait alors rien (recette du 28/09/2026).
      onPress={() => revenirOu('/plan')}
      // Une navigation, donc un lien (24/09/2026, `v1-29`).
      role="link"
      type="small"
      weight={600}
      themeColor="accentText"
    />
  );

  // « Chargement… » attend `DELAI_AVANT_CHARGEMENT` avant de se dire (`v1-30` §5.8) : en arrivant sur
  // l'écran, il clignotait une image avant les pistes. L'échec, lui, se dit tout de suite, et le
  // chargement d'un « Réessayer » aussi (`useChargementVisible`).
  const chargementVisible = useChargementVisible(
    etat.genre === 'chargement',
    etat.genre === 'chargement' && etat.relance === true
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
            {(etat.genre !== 'chargement' || chargementVisible) && (
              <ThemedText type="body" themeColor="textSecondary">
                {etat.genre === 'chargement'
                  ? 'Chargement de tes pistes…'
                  : 'Tes pistes n’ont pas pu être chargées.'}
              </ThemedText>
            )}
            {etat.genre === 'erreur' && (
              <TextLink
                label="Réessayer"
                onPress={() => {
                  // Repasser par « chargement » dans ce gestionnaire, et jamais dans `rafraichir` :
                  // sans ce passage, un second échec rend exactement le même écran et le bouton a
                  // l'air mort ; dedans, il ferait clignoter l'écran à chaque retour au premier plan.
                  // `relance` le montre tout de suite, l'échec revenant bien sous le délai de la ligne.
                  setEtat({ genre: 'chargement', relance: true });
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
        <ScrollView
          ref={defilement}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          onScroll={surDefilement}
          scrollEventThrottle={16}
        >
          {retour}

          <ThemedText type="screenTitle">Toutes les pistes</ThemedText>
          <ThemedText type="body" themeColor="textSecondary">
            {/* **La phrase dit l'ordre, et l'ordre ne bouge plus** (décision n° 2) : « du plus gros
                gain au plus petit » est vrai de chaque groupe, engagement ou non. Seul ce que le
                choix fait change — mettre l'action en tête du plan, ou remplacer la tienne
                (`introDesPistes`). */}
            {introDesPistes(engageeId !== null)}
          </ThemedText>

          {/* **Le refus se dit ici, juste au-dessus de la liste**, et non en tête d'écran : les
              lignes commencent quelques lignes plus bas, donc la phrase reste dans le champ de
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
              {/* **Une étiquette de section, et non un titre de carte** (planche A2 du canvas
                  `v1-17`, #234 ; puis canvas `v1-30`). Rendue en `cardTitle` à l'origine, elle
                  concurrençait les titres d'action ; en `small` tertiaire ensuite, elle s'effaçait
                  face à des titres passés en 16 `text` (plainte du 18/09/2026). D'où l'étiquette
                  capitale de `TypeScale.label`, 600, tertiaire : discrète par la taille, nette par
                  la forme — et elle suffit à découper parce que les lignes portent un filet.

                  **Les capitales sont un style, pas le texte** (`textTransform`) : la chaîne reste
                  en casse normale, et le lecteur d'écran lit « Voyages longue distance » au lieu de
                  l'épeler.

                  **Le rôle d'en-tête s'écrit ici** : `ThemedText` ne le déduit que de `title`,
                  `subtitle`, `screenTitle` et `display`. Il le pose au niveau 2, sous le titre de
                  l'écran. */}
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
                enChoix={enChoix}
                engageeId={engageeId}
                onChoisir={choisir}
                onAnnuler={annuler}
                inscrireRangee={inscrireRangee}
                inscrireCarte={inscrireCarte}
                carteMesuree={carteMesuree}
                onEngage={(poste) => {
                  // **Le drapeau se pose avant de partir**, jamais après ni sous condition : la
                  // feuille des rappels ne s'ouvre qu'une fois par appareil, donc la manquer la
                  // seule fois où elle compte la perd pour de bon (`v1-17` §7.3). Le repli vers le
                  // plan garde le drapeau : `replace` reste dans cette pile, dont le layout le porte,
                  // et le plan monté à neuf l'attend jusqu'à sa première lecture
                  // (`useReprendreLEngagement`).
                  passage.deposer({ poste });
                  revenirOu('/plan');
                }}
                onChanged={rafraichir}
                onRefus={(message) => {
                  // Le refus `RM001` veut presque toujours dire que l'état a changé depuis
                  // l'affichage : on relit plutôt que de parler de réseau, et la carte reste
                  // ouverte (`enChoix` ne bouge pas) pour que le message porte sur une action qu'on
                  // voit encore. Relue, elle lit « une autre est engagée », et un nouvel essai part
                  // avec le remplacement.
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
  enChoix,
  engageeId,
  onChoisir,
  onAnnuler,
  inscrireRangee,
  inscrireCarte,
  carteMesuree,
  onEngage,
  onChanged,
  onRefus,
}: {
  pistes: PisteDuPlan[];
  enChoix: string | null;
  engageeId: string | null;
  onChoisir: (id: string) => void;
  onAnnuler: (id: string) => void;
  inscrireRangee: (id: string, noeud: View | null) => void;
  inscrireCarte: (id: string, noeud: View | null) => void;
  carteMesuree: (id: string) => void;
  onEngage: (poste: string | null) => void;
  onChanged: () => void;
  onRefus: (message: string | null) => void;
}) {
  const theme = useTheme();

  // **L'écart se pose sur un seul côté, et seulement là où il manque** (13.5, recette web du
  // 16/09/2026). La règle et ses deux pièges — Yoga ne fusionne pas les marges, et un `gap` au
  // conteneur séparerait les lignes fermées — vivent dans `separationsDesLignes`, avec leur test.
  //
  // **L'ensemble est celui des lignes rendues en carte**, c'est-à-dire, depuis `v1-32`, la seule
  // ligne ouverte sur le choix. Le contrat des deux fonctions ne bouge pas : elles parlent de cartes
  // rendues, quelle qu'en soit la cause.
  // **`committed_at === null` n'est pas une ceinture de plus** : on peut ouvrir une ligne, s'y
  // engager, et retrouver cet écran encore monté — ou une relecture au retour peut rendre engagée
  // l'action qu'on regardait. La ligne serait alors `enChoix` alors qu'une ligne engagée ne s'ouvre
  // pas. La règle se tient donc à l'état réel de la ligne, pas à l'historique des touchers.
  const enCarte = new Set(
    pistes.filter((p) => p.id === enChoix && p.committed_at === null).map((p) => p.id)
  );
  const ids = pistes.map((p) => p.id);
  const separations = separationsDesLignes(ids, enCarte);
  const filets = filetsDesLignes(ids, enCarte);

  // **Une ligne qui s'ouvre en carte n'est plus un saut** (27/09/2026, `v1-30` §5.7). Chaque piste est
  // tenue par un `HauteurSuivie` sous la même clé, qu'elle soit ligne ou carte : quand l'une devient
  // l'autre, il passe d'une hauteur à la suivante, et les pistes de dessous suivent. La carte apparaît
  // en fondu — autre élément sous le même cadre, donc React la monte à neuf ; ce qui est là à
  // l'arrivée sur l'écran n'a pas d'apparition à soi (`SansApparitionAuMontage`). « Annuler » passe
  // par le même chemin, dans l'autre sens.
  return (
    <View style={styles.lignesPistes}>
      <SansApparitionAuMontage>
      {pistes.map((action, rang) => {
        const separee = separations[rang];
        const filetee = filets[rang];
        const titre = action.action_templates?.action_text ?? 'Action à préciser.';
        const gain =
          action.saving_kg_year !== null ? `− ${formatKg(action.saving_kg_year)} kg` : null;
        const etat = etatDeLaPiste(action, engageeId);

        if (enCarte.has(action.id)) {
          return (
            <HauteurSuivie key={action.id}>
            <Apparition style={separee ? styles.pisteSeparee : undefined}>
              {/* La carte elle-même, mesurée pour le défilement : pas son `HauteurSuivie`, qui
                  n'a encore que la hauteur de la rangée quand elle s'ouvre. */}
              <View
                ref={(noeud) => inscrireCarte(action.id, noeud)}
                onLayout={() => carteMesuree(action.id)}
              >
                <CarteDePiste
                  action={action}
                  committedActionId={engageeId}
                  onEngage={onEngage}
                  onChanged={onChanged}
                  onRefus={onRefus}
                  surLeChoix
                  onAnnuler={() => onAnnuler(action.id)}
                />
              </View>
            </Apparition>
            </HauteurSuivie>
          );
        }

        // **La ligne à deux étages** (canvas `v1-30`, « La ligne de piste ») : le titre à la taille
        // du contenu — un cran sous le titre d'une carte —, puis la ligne du gain, que l'œil descend
        // en colonne d'une piste à l'autre. C'était un titre en `small` secondaire, le gain en petit
        // tertiaire à sa droite : la couleur et la taille d'un texte secondaire, sur le contenu même
        // de l'écran (constat 14.7 de la recette du 18/09/2026).
        const titreDeLaLigne = (
          <ThemedText type="default">{titre}</ThemedText>
        );
        // **Le gain et son unité, un seul texte** : « − 1 601 kg » en `body` 600, tabulaire — les
        // gains se lisent en colonne —, puis « par an » en petit tertiaire, imbriqué, comme le cap
        // depuis le 24/09/2026. Pas de part de l'empreinte ici : elle classe comme le gain, un
        // second chiffre qui dit la même chose serait du bruit — elle attend dans la carte.
        const gainDeLaLigne = (
          <View style={styles.gain}>
            {gain !== null && (
              <ThemedText type="body" weight={600} style={styles.chiffres}>
                {gain}{' '}
                <ThemedText type="small" themeColor="textTertiary">
                  par an
                </ThemedText>
              </ThemedText>
            )}
          </View>
        );
        const cadre = [
          styles.lignePiste,
          separee && styles.pisteSeparee,
          // **Le filet** : sans lui, onze lignes forment un pavé continu. Quelles lignes le portent
          // se décide dans `filetsDesLignes`, avec ses deux exclusions et leurs tests.
          filetee && { borderBottomWidth: Stroke.hairline, borderBottomColor: theme.border },
        ];

        // **L'action engagée reste une ligne, à sa place** (planche A2 des canvas `v1-17` puis
        // `v1-30`) : même titre, même gain ; la pastille-coche et « Engagée » prennent la place de
        // la pastille « Choisir », sur la ligne du gain. Elle ne s'ouvre pas — il n'y a rien à y
        // choisir —, donc ce n'est pas une cible : un `View` accessible, dont l'annonce dit qu'elle
        // est engagée.
        if (etat === 'engagee') {
          return (
            <HauteurSuivie key={action.id}>
            <View
              style={cadre}
              accessible
              accessibilityLabel={annonceDeLaPiste({ titre, gainKg: action.saving_kg_year, etat })}
            >
              {titreDeLaLigne}
              <View style={styles.ligneDuGain}>
                {gainDeLaLigne}
                <View style={styles.marque}>
                  <PastilleEngagee />
                  <ThemedText type="small" weight={600} themeColor="accentText">
                    Engagée
                  </ThemedText>
                </View>
              </View>
            </View>
            </HauteurSuivie>
          );
        }

        return (
          <HauteurSuivie key={action.id}>
          <Pressable
            ref={(noeud) => inscrireRangee(action.id, noeud)}
            style={({ pressed }) => [
              ...cadre,
              // **La rangée répond au doigt** (24/09/2026, `v1-29`) : la teinte `backgroundPressed`,
              // tout de suite et sans animation ; la pastille, transparente, la prend avec elle. Pas
              // de marge négative ici, à la différence des lignes du suivi : elle élargirait aussi
              // le filet, qui s'aligne sur les têtes de groupe.
              pressed && { backgroundColor: theme.backgroundPressed },
            ]}
            onPress={() => onChoisir(action.id)}
            accessibilityRole="button"
            // **La rangée entière est la cible**, et son libellé recompose ce qu'elle porte : titre,
            // gain « par an », puis ce que le toucher fait — « Choisir », ou « Choisir à la place »
            // quand une autre est engagée (`annonceDeLaPiste`, testée).
            accessibilityLabel={annonceDeLaPiste({ titre, gainKg: action.saving_kg_year, etat })}
          >
            {titreDeLaLigne}
            <View style={styles.ligneDuGain}>
              {gainDeLaLigne}
              {/* **« Choisir » a une forme : une pastille bordée** (décision de la session de design,
                  canvas `v1-30`). Un mot 14/600 sans forme ne se donnait pas pour un bouton — deux
                  séances de recette l'ont trouvé muet —, et un fond gris seul ne tranche qu'à
                  1,14:1. Le contour est `fieldBorder`, le contour d'un champ au repos, seul gris du
                  système à tenir 3:1 sur le fond ; pas de bouton plein par ligne (brief §6), et
                  aucune icône (ce dépôt n'en a pas). **Décorative** : masquée aux lecteurs d'écran,
                  la rangée l'annonce. Et c'est le seul endroit de la ligne que le choix change
                  (`libelleDuChoix`, décision n° 5). */}
              <View
                style={[styles.pastille, { borderColor: theme.fieldBorder }]}
                aria-hidden
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <ThemedText type="small" weight={600} themeColor="accentText">
                  {libelleDuChoix(etat)}
                </ThemedText>
              </View>
            </View>
          </Pressable>
          </HauteurSuivie>
        );
      })}
      </SansApparitionAuMontage>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  etatSimple: { flex: 1, padding: Spacing.four, justifyContent: 'center', gap: Spacing.three },
  // Le `gap` du groupe est nul parce que la tête porte ses propres marges, et qu'un `gap` par-dessus
  // les rajouterait.
  groupe: { gap: 0 },
  // **24 au-dessus, 4 dessous** (canvas `v1-30`). Le `gap` de `three` que `scroll` pose entre ses
  // enfants en donne déjà 16 — chaque groupe en est un —, donc la tête n'ajoute que les 8 qui
  // manquent : les écrire en entier les doublerait.
  teteDeGroupe: {
    ...TypeScale.label,
    textTransform: 'uppercase',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  lignesPistes: { gap: 0 },
  // La même valeur que les cartes du plan : une ligne ouverte devient une carte, elle doit donc
  // respirer au rythme des cartes et non à un rythme à elle.
  pisteSeparee: { marginTop: Spacing.two + 2 },
  // **La hauteur tient la cible par elle-même** : 16 + 24 + 4 + 32 + 16 = 92 px pour un titre sur
  // une ligne, 116 sur deux — la cible de 48 largement, par la hauteur et non par `hitSlop`, parce
  // que les rangées se touchent (`gap: 0`) et que leurs zones se recouvriraient (`v1-16` §5).
  lignePiste: {
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
  // La ligne du gain : le chiffre à gauche, la pastille à droite, centrés sur la hauteur de la
  // pastille — 84 px de fin de ligne pour la ligne engagée à 360, 143 pour « Choisir à la place ».
  ligneDuGain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 32,
  },
  // Le gain ne se coupe pas : c'est ce qu'on compare.
  gain: { flexShrink: 0 },
  // **Chiffres tabulaires** (24/09/2026, `v1-29`) : les gains se lisent en colonne, d'une ligne à
  // l'autre. Spline Sans porte la fonction `tnum`.
  chiffres: { fontVariant: ['tabular-nums'] },
  // **32 est la seule valeur en dur de l'écran** : aucune `ControlHeight` ne la nomme (48, 54 et 56
  // sont des cibles et des contrôles pleins), et la pastille n'est pas une cible — la rangée l'est.
  // Un minimum et non une hauteur, comme le bouton : le libellé suit l'agrandissement des polices
  // du système. Son rayon est la moitié de sa hauteur, comme le bouton (27 = 54 / 2).
  pastille: {
    minHeight: 32,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.field,
    borderWidth: Stroke.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marque: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
