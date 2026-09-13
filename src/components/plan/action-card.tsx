import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
  /** Une autre action porte l'engagement : celle-ci passe au second plan, sans se désactiver. */
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
          `− ${Math.round(gainKg)} kg de CO₂e par an`,
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
          borderColor: engagee ? theme.accent : theme.border,
          borderWidth: engagee ? 2 : 1,
          backgroundColor: engagee ? theme.backgroundTinted : 'transparent',
          opacity: estompee ? 0.72 : 1,
        },
      ]}
    >
      <View accessible accessibilityLabel={annonce} style={styles.bloc}>
        {engagee && (
          <View style={styles.enTete}>
            <View style={[styles.pastille, { backgroundColor: theme.accent }]}>
              <Svg width={12} height={12} viewBox="0 0 24 24">
                <Path
                  d="M5 13l4 4L19 7"
                  stroke="#FFFFFF"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
            </View>
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
              − {Math.round(gainKg)} kg CO₂e
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {intention ? `${majuscule(intention)} · par an` : 'par an'}
              {partPercent !== null ? ` · ${Math.round(partPercent)} % de ton empreinte` : ''}
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
      {engagee && premierPas && (
        <View style={[styles.premierPas, { backgroundColor: theme.background }]}>
          <ThemedText themeColor="textTertiary" weight={600} style={styles.premierPasTitre}>
            PREMIER PAS
          </ThemedText>
          <ThemedText style={styles.premierPasTexte}>{premierPas}</ThemedText>
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
  pastille: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  etiquette: { fontSize: 13, lineHeight: 18, letterSpacing: 0.3 },
  gain: { gap: 2 },
  gainValeur: { fontSize: 20, lineHeight: 26 },
  // 12/16 de padding vertical, 16 horizontal, rayon `Radius.field` : un bloc interne de carte, ce
  // que ce rayon nomme déjà.
  premierPas: { borderRadius: Radius.field, paddingVertical: 12, paddingHorizontal: Spacing.three, gap: 2 },
  // 13/18 et 14/20 : les deux seules occurrences de ces tailles ici, elles restent en dur.
  premierPasTitre: { fontSize: 13, lineHeight: 18, letterSpacing: 0.3 },
  premierPasTexte: { fontSize: 14, lineHeight: 20 },
});
