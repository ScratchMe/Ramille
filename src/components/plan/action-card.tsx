import { StyleSheet, View } from 'react-native';

import { formatKg } from '@/lib/format';
import { PastilleEngagee } from '@/components/plan/pastille-engagee';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Stroke, TypeScale } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ligneDuGain } from '@/types/plan';

// Carte d'une action du plan — extraite de l'écran (v1-11 lot 1).
//
// **L'action engagée est le fait saillant de cet écran, et rien ne la distinguait.** Une seule
// action peut être engagée par cycle (index unique partiel en base), c'est donc *la* réponse à
// « qu'est-ce que je fais en ce moment ? » — et elle portait exactement la même carte que les
// propositions, l'engagement n'apparaissant qu'en lisant le pavé du bas. Retour de test sur
// appareil du 07/09 : « je distingue mal l'action pour laquelle je me suis engagé ».
//
// Trois marques, cumulées parce qu'aucune ne suffit seule à distance de bras : une bordure
// accent de 2 px, un fond teinté, et une étiquette en tête précédée d'une coche.
//
// L'action non retenue s'estompe **sans disparaître et sans perdre son bouton** : changer
// d'avis ne doit jamais ressembler à un renoncement (même registre que /suivi, qui ne compte
// jamais ce qu'on a laissé passer).
//
// **Et elle s'estompe par son cadre, jamais par son texte** (24/09/2026, `v1-29`). Une opacité de
// 0,72 sur toute la carte faisait tomber le détail à 3,25:1, le gain à 4,21:1, et « C'est noté »
// à 3,39:1 dans le sélecteur ouvert dedans — sous le seuil de 4,5:1, dans l'état ordinaire d'un
// plan en cours puisqu'une action y est engagée. C'est la bordure qui recule désormais ; le texte
// et les contrôles gardent leurs contrastes.
export function ActionCard({
  titre,
  gainKg,
  partPercent,
  detail,
  intention,
  premierPas,
  engagee,
  reconduite,
  estompee,
  children,
}: {
  titre: string;
  gainKg: number | null;
  partPercent: number | null;
  detail: string | null;
  /** Phrase d'intention déjà formatée (`formatIntention`), affichée seulement si engagée. */
  intention: string | null;
  /**
   * Le premier pas (`plan_actions.first_step`, C4.6), affiché **seulement une fois l'action
   * engagée** — et c'est tout son intérêt : la carte portait un titre, un gain et un détail
   * chiffré, et rien n'abaissait le coût de la première fois (constat A13-19). Le principal
   * prédicteur d'un premier essai est la perception de facilité, et c'est le mètre qui manquait
   * entre « Je m'y engage » et la question du lundi.
   *
   * **Avant l'engagement, il n'a rien à faire là** : sur une carte qu'on est en train de comparer
   * à une autre, une consigne pratique se lit comme une charge de plus, pas comme une aide.
   */
  premierPas: string | null;
  engagee: boolean;
  /**
   * L'engagement vient du cycle précédent (`plan_actions.carried_over_from`, C2.2). Une saison qui
   * commence ne remet pas le choix à zéro : elle le reconduit, et le dit.
   */
  reconduite: boolean;
  /**
   * Une autre action porte l'engagement : celle-ci passe au second plan, sans se désactiver — par
   * son cadre seulement.
   */
  estompee: boolean;
  children: React.ReactNode;
}) {
  const theme = useTheme();

  const etiquette = reconduite ? 'TON ENGAGEMENT · RECONDUIT' : 'TON ENGAGEMENT';

  // Le libellé accessible recompose ce que la mise en forme dit à l'œil : un lecteur d'écran
  // ne voit ni la bordure ni le fond. Sans lui, l'engagement serait invisible pour lui.
  //
  // **Il est posé sur le bloc de texte, jamais sur la racine de la carte** (A4-11). `accessible`
  // regroupe tout le sous-arbre : sur la racine, il avalait `children`, c'est-à-dire le bouton
  // « Je m'y engage », les puces de jours et « Changer d'avis » — le seul geste d'engagement du
  // produit devenait annoncé et non actionnable (garanti sur iOS, indéterminé sur TalkBack).
  // Le groupe ne couvre donc que ce qui ne se touche pas, et recompose tout ce qu'il masque :
  // l'étiquette d'engagement, le titre, le gain, l'intention et le détail.
  //
  // **La composition suit l'imbrication du rendu, pas la liste des props.** L'intention et la
  // part d'empreinte ne s'affichent qu'à l'intérieur du bloc de gain : `saving_kg_year` est
  // nullable, et à plat le lecteur d'écran entendait deux informations qui ne sont écrites nulle
  // part — exactement l'inverse de ce que ce libellé est censé faire.
  const annonce = [
    engagee ? `${reconduite ? 'Action engagée, reconduite' : 'Action engagée'} : ${titre}` : titre,
    ...(gainKg !== null
      ? [
          `− ${formatKg(gainKg)} kg de CO₂e par an`,
          intention ? majuscule(intention) : null,
          partPercent !== null ? `${Math.round(partPercent)} % de ton empreinte` : null,
        ]
      : []),
    detail,
  ]
    .filter((morceau): morceau is string => !!morceau)
    .join('. ');

  return (
    <View
      style={[
        styles.carte,
        {
          // Trois cadres : l'action engagée (accent, 2 px, fond teinté), une proposition (filet
          // `border`), et une proposition estompée parce qu'une autre est engagée — son filet passe
          // au plus pâle des gris de la palette, `backgroundElement`. Ni opacité ni couleur de
          // texte ne bougent : ce qui recule, c'est la boîte.
          borderColor: engagee ? theme.accent : estompee ? theme.backgroundElement : theme.border,
          borderWidth: engagee ? Stroke.engaged : Stroke.hairline,
          backgroundColor: engagee ? theme.backgroundTinted : 'transparent',
        },
      ]}
    >
      <View accessible accessibilityLabel={annonce} style={styles.bloc}>
        {engagee && (
          <View style={styles.enTete}>
            <PastilleEngagee />
            {/* **L'étiquette nomme la chose, pas la personne.** « Tu t'y es engagé » accordait au
                masculin celui ou celle à qui elle parle — le seul endroit du produit où il
                restait un participe accordé sur la personne, `/compte/suppression` ayant été
                reprise dans la même vague (« Tu es connecté » → « Ce navigateur est
                connecté »). Le libellé accessible juste au-dessus était déjà juste : il porte
                sur l'action. */}
            {/* **Le suffixe « · RECONDUIT »** (C2.2, `v1-14` §5) : il se lit sur
                `carried_over_from`, et son absence est une information aussi — un engagement pris
                dans cette période-ci n'a rien à reconduire. */}
            <ThemedText themeColor="accentText" weight={700} style={styles.etiquette}>
              {etiquette}
            </ThemedText>
          </View>
        )}

        <ThemedText type="cardTitle">{titre}</ThemedText>

        {gainKg !== null && (
          <View style={styles.gain}>
            <ThemedText weight={600} themeColor="accentText" style={styles.gainValeur}>
              − {formatKg(gainKg)} kg CO₂e
            </ThemedText>
            {/* **« par an » colle au chiffre** (24/09/2026, `v1-29`) : l'intention d'une action
                engagée s'intercalait devant lui — « Le mardi et le jeudi · par an · 15 % ». La ligne
                se compose dans `ligneDuGain`, avec ses tests. */}
            <ThemedText type="small" themeColor="textSecondary">
              {ligneDuGain(intention, partPercent)}
            </ThemedText>
          </View>
        )}

        {detail && (
          <ThemedText type="small" themeColor="textTertiary">
            {detail}
          </ThemedText>
        )}
      </View>

      {/* **Le premier pas, sous l'intention et seulement quand l'action est engagée** (C4.6,
          planche F1). Hors du groupe accessible ci-dessus : ce bloc arrive après le choix, il a son
          propre sur-titre, et l'agréger au reste en ferait une phrase de plus dans une annonce déjà
          longue. Fond `background` dans une carte teintée — un creux, pas un relief. */}
      {/* **Pas de premier pas sur une action reconduite** (corrigé le 14/09/2026) : la carte porte
          alors « TON ENGAGEMENT · RECONDUIT », donc la personne a déjà passé une saison dessus, et
          un « premier pas » y arrive une saison trop tard. C'est une ligne qui décrit un essai. */}
      {engagee && !reconduite && premierPas && (
        <View style={[styles.premierPas, { backgroundColor: theme.background }]}>
          <ThemedText themeColor="textTertiary" weight={600} style={styles.premierPasTitre}>
            PREMIER PAS
          </ThemedText>
          <ThemedText type="small">{premierPas}</ThemedText>
        </View>
      )}

      {children}
    </View>
  );
}

// `formatIntention` rend « le mardi et le jeudi » — minuscule, parce qu'elle est écrite pour
// s'insérer au milieu d'une phrase (« C'est ton choix pour cette période, le mardi et le
// jeudi. »). En tête de ligne il lui faut sa majuscule, et on ne touche pas à la source.
function majuscule(phrase: string): string {
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

const styles = StyleSheet.create({
  carte: { borderRadius: Radius.card, padding: 20, gap: Spacing.two },
  // Le groupe non interactif reprend l'écart que la carte posait entre ses textes : les
  // regrouper pour le lecteur d'écran ne doit rien changer à l'œil.
  bloc: { gap: Spacing.two },
  enTete: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  // L'étiquette en capitales du produit, nommée dans `TypeScale` le 24/09/2026 (`v1-29`) : elle
  // était recopiée ici deux fois et une fois dans `carte-douverture.tsx`.
  etiquette: TypeScale.label,
  gain: { gap: 2 },
  // 20/26, la seule occurrence de cette taille : elle reste en dur. Les chiffres sont **tabulaires**
  // (24/09/2026, `v1-29`) : d'une carte à l'autre, les gains se lisent en colonne.
  gainValeur: { fontSize: 20, lineHeight: 26, fontVariant: ['tabular-nums'] },
  // 12/16 de padding vertical, 16 horizontal, rayon `Radius.field` : un bloc interne de carte, ce
  // que ce rayon nomme déjà.
  premierPas: { borderRadius: Radius.field, paddingVertical: 12, paddingHorizontal: Spacing.three, gap: 2 },
  // Le texte du premier pas est en `small` (14/20), qu'il recopiait jusqu'ici à la main.
  premierPasTitre: TypeScale.label,
});
