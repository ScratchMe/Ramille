import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TraitDeTemps } from '@/components/plan/trait-de-temps';
import { Radius, Spacing } from '@/constants/theme';
import { estLeResiduelDesSortiesRares, nomDuPoste } from '@/constants/postes';
import { formatKg, formatTonnes } from '@/lib/format';
import { formeInserable } from '@/types/plan';

/**
 * Le cap de la saison (T10). Affiché en kg parce que c'est l'unité des actions à côté : la
 * personne doit pouvoir voir d'un coup d'œil qu'une action l'atteint — ou ne l'atteint pas, ce qui
 * est une information tout aussi utile et jamais présentée comme un échec.
 *
 * **Elle porte la période et sa fin depuis C2.8**, et c'est ce qui lui manquait : le cap était
 * annoncé puis abandonné, `period_end` étant écrit à chaque génération et lu par aucun écran
 * (constat A8-8). Une échéance sans date n'en est pas une.
 *
 * La carte se rend **même sans cap** — `baseline_co2_kg_year` peut valoir zéro, ce qui est le cas
 * d'un profil sans émission sur son poste dominant — parce qu'elle est devenue l'endroit où la
 * période se nomme. La puce « Cadence : Automne 2026 » a donc disparu de l'intro : elle disait la
 * même chose dans un vocabulaire de réglage, et la répéter à deux endroits de l'écran était le plus
 * sûr moyen de les voir un jour se contredire.
 *
 * Le trait de temps **mesure la saison, pas la personne** : `accentMuted` et jamais `accent`, et
 * la légende le dit en mots. Confondre les deux ferait de chaque semaine écoulée un retard.
 *
 * Sortie de l'écran du plan à l'étape 7b de `v1-35` : l'écran dérive les chiffres et les décisions
 * (`capDuCycle`, `cadreDuPlan`, `phraseDesPistesSuffisantes`, `cartesDuPlan`), la carte les rend.
 */
export function CarteDuCap({
  capKg,
  chiffreLeCap,
  cadenceDeSaison,
  reductionPct,
  poste,
  tripLabel,
  baselineKg,
  phraseDuCap,
  periodLabel,
  finDeLaPeriode,
  progression,
  traitDeTemps,
}: {
  /** Le cap en kilos par an (`capDuCycle`), ou `null` sans baseline. */
  capKg: number | null;
  /** Ce que le cadre du plan permet de chiffrer (`cadreDuPlan`). */
  chiffreLeCap: boolean;
  /** La période a-t-elle un nom de saison (`cadenceNommeUneSaison`) ? */
  cadenceDeSaison: boolean;
  reductionPct: number;
  /** Le poste et le libellé figés sur le cycle. */
  poste: string | null;
  tripLabel: string;
  baselineKg: number | null;
  phraseDuCap: string | null;
  periodLabel: string;
  finDeLaPeriode: string | null;
  /** La part du temps écoulée (`progressionDeLaPeriode`), ou `null` pour une période sans durée. */
  progression: number | null;
  /** Le trait se rend-il (`cartesDuPlan`) ? */
  traitDeTemps: boolean;
}) {
  return (
    <ThemedView type="backgroundSelected" style={styles.capCard}>
      {capKg !== null && chiffreLeCap && (
        <>
          <ThemedText type="small" weight={600} themeColor="accentText">
            Ton cap pour cette {cadenceDeSaison ? 'saison' : 'période'}
          </ThemedText>
          <ThemedText type="salient" style={styles.chiffre}>
            − {formatKg(capKg)} kg
          </ThemedText>
          {/* **« par an » d'abord** (24/09/2026, `v1-29`). Le chiffre est annuel — 20 % du poste
              dominant, sur un an — alors que l'étiquette dit « cette saison » : « − 384 kg » y
              passait pour l'effort d'un trimestre, juste au-dessus de pistes à « − 619 kg par an ».
              La saison est le temps qu'on se donne ; la quantité, elle, se compte à l'année. */}
          <ThemedText type="small" themeColor="textSecondary">
            {/* Le résiduel des sorties rares y est « tes loisirs occasionnels » (`nomDuPoste`) : ce cap
                se chiffre dès que le plan porte une action, et depuis C5.1 rien n'oblige cette action
                à porter sur le poste du cycle — qui peut être ce résiduel. */}
            par an, soit − {Math.round(reductionPct)} % sur{' '}
            {nomDuPoste(poste, 'insere', estLeResiduelDesSortiesRares(poste, tripLabel)) ??
              formeInserable(poste)}
            {baselineKg !== null ? ` (${formatTonnes(baselineKg)} aujourd’hui)` : ''}
          </ThemedText>
          {/* Le lien entre le cap et les pistes, dit seulement quand il est vrai et tant que rien
              n'est engagé (`phraseDesPistesSuffisantes`). */}
          {phraseDuCap !== null && (
            <ThemedText type="small" themeColor="textSecondary">
              {phraseDuCap}
            </ThemedText>
          )}
          {/* **La note qui suivait ici a été retirée** (C5.3, écart 7) — « Le cap porte sur tes
              voyages ; cette action porte ailleurs. » Elle énonçait une règle que rien n'applique :
              le cap est une quantité à atteindre, et aucun endroit du produit ne vérifie d'où vient
              la réduction. Elle était rare tant que le poste dominant remplissait les deux
              premières cartes ; le classement de C5.1 l'aurait réveillée sur la plupart des plans,
              les meilleurs leviers venant souvent d'ailleurs. */}
        </>
      )}
      <View style={styles.capPeriode}>
        <ThemedText type="small" themeColor="textSecondary">
          {periodLabel}
        </ThemedText>
        {finDeLaPeriode && (
          <ThemedText type="small" weight={600} themeColor="accentText">
            {finDeLaPeriode}
          </ThemedText>
        )}
      </View>
      {/* **Le trait attend qu'il y ait quelque chose à mesurer** (C5.6). Au tout premier plan il
          annoncerait un temps qui s'écoule sur une action qu'on n'a pas encore choisie —
          c'est-à-dire un compte à rebours, exactement ce que sa légende jure qu'il n'est pas. La
          période et sa fin, elles, restent : elles disent le cadre, pas une avance.

          **Sauf sur un plan à zéro action** (audit P-5, 01/10/2026, HANDOFF `v1-17` planche C) : il
          n'y a rien à choisir, et `estPremierPlan` ne s'y refermait jamais — le trait manquait toute
          la saison. La condition vit dans `cartesDuPlan` (`traitDeTemps`), sur la table de tous les
          états ; l'écran n'y ajoute que la mesure, une période sans durée n'ayant pas de trait. La
          légende disparaît **avec** le trait : seule, elle commenterait quelque chose qui n'est pas
          là. */}
      {progression !== null && traitDeTemps && (
        <>
          <TraitDeTemps progression={progression} />
          <ThemedText themeColor="textTertiary" style={styles.capLegende}>
            {cadenceDeSaison ? 'La saison avance' : 'La période avance'} ; le trait mesure le temps,
            pas toi.
          </ThemedText>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  capCard: { borderRadius: Radius.card, padding: 20, gap: 6 },
  // La période à gauche, sa fin à droite : `baseline` et non `center`, pour que les deux lignes
  // s'alignent sur leur texte et non sur leur boîte. `flexWrap` parce que le texte suit
  // l'agrandissement des polices du système, que rien dans le produit ne plafonne (A10-21) : à
  // 200 %, « Hiver 2026-2027 » et « jusqu'au 28 février » ne tiennent plus sur une ligne, et une
  // rangée sans retour les tronquerait au lieu de les empiler.
  capPeriode: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  // 12/16 : la seule occurrence de cette taille dans l'écran, donc elle reste en dur — la nommer
  // dans `theme.ts` encoderait une équivalence avec les autres légendes qui n'existe pas encore.
  capLegende: { fontSize: 12, lineHeight: 16 },
  // **Chiffres à chasse fixe** (24/09/2026, `v1-29`) : le cap change d'une saison à l'autre, et des
  // chiffres de largeur égale ne font pas bouger la ligne. Spline Sans porte la fonction `tnum`.
  chiffre: { fontVariant: ['tabular-nums'] },
});
