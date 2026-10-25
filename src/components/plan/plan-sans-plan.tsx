import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyStateIllustration } from '@/components/illustrations/empty-state-illustration';
import { LigneDAttente } from '@/components/ligne-d-attente';
import { Mascot } from '@/components/mascot';
import { MessageInline } from '@/components/message-inline';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { phraseDeLaLectureEnEchec, type GenreDEchec } from '@/types/lecture-en-echec';

/**
 * L'écran du plan quand il n'y a pas de plan à montrer : la lecture qui tourne, l'absence de bilan, la
 * lecture qui n'a rien rendu, et le plan pas encore généré. Sortis de l'écran à l'étape 7b de `v1-35`
 * (25/10/2026), tels quels : l'écran lit, décide de l'état, et rend celui-ci tant qu'il n'est pas `ok`.
 */
export type EtatSansPlan =
  // `relance` : ce chargement est un « Réessayer » de la personne, et il se dit tout de suite.
  | { status: 'loading'; relance?: true }
  // Aucun bilan complété — écran "État vide" de la maquette.
  | { status: 'no_assessment' }
  // **Rien n'a pu être lu, et c'est autre chose que « rien à afficher »** (A4-1). L'erreur des
  // requêtes était purement ignorée : hors ligne, `assessment === null` menait à
  // `no_assessment`, donc à « Ton bilan n'est pas encore fait » et à un bouton pour le refaire,
  // à quelqu'un qui en a un. Un état vide est une affirmation sur les données de la personne.
  //
  // **Cet état ne s'atteint que depuis `loading`** : les trois autres viennent d'une lecture
  // qui a réussi, et l'écran d'erreur plein écran ne vaut que quand rien n'a jamais pu être lu.
  // La relecture en échec se dit à côté (`relectureEnEchec`), sans rien effacer.
  //
  // **Le nom date d'avant D19** (`v1-33`, 01/10/2026) : l'état vaut pour toute lecture qui n'a rien
  // rendu, réseau coupé ou serveur en échec, et `genre` dit lequel — calculé une fois, dans la lecture,
  // pour que l'écran ne parle de connexion qu'à qui n'en a pas (`phraseDeLaLectureEnEchec`).
  | { status: 'erreur_reseau'; genre: GenreDEchec }
  // Bilan complété mais plan_cycles pas encore généré — ne devrait plus arriver en
  // pratique (compute_assessment_results le génère désormais immédiatement, cf.
  // migration 20260824190000), gardé comme filet pour les bilans complétés avant elle
  // et pas encore repris par le cron quotidien.
  | { status: 'pending'; assessmentId: string };

export function PlanSansPlan({
  etat,
  banniere,
  vientDUnRappel,
  relectureDemandee,
  onRelire,
  onReessayer,
}: {
  etat: EtatSansPlan;
  /** La ligne de relecture, centrée — ou rien. Elle vaut au-dessus des écrans issus d'une lecture réussie. */
  banniere: ReactNode;
  /** Le lien du rappel porte `?rappel=1` (C2.11) ; il ne sert qu'à l'état sans bilan. */
  vientDUnRappel: boolean;
  /** Une relance demandée par « Réessayer » tourne encore (audit P-8). */
  relectureDemandee: boolean;
  onRelire: () => void;
  onReessayer: () => void;
}) {
  if (etat.status === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          {/* Muette 300 ms, sauf après « Réessayer » : là, c'est la seule réponse au geste (`v1-30` §5.8). */}
          <LigneDAttente demandee={etat.relance === true}>Chargement de ton plan…</LigneDAttente>
        </View>
      </ThemedView>
    );
  }

  if (etat.status === 'no_assessment') {
    // **Venir d'un rappel et n'avoir aucun bilan ici ne veut pas dire « pas de bilan »** (C2.11,
    // constat C-2). L'email ne porte que `/plan` : ouvert sur un ordinateur ou un téléphone neuf, il
    // tombe sur la session anonyme vide que l'app vient de créer, et cet écran répondait « Ton bilan
    // n'est pas encore fait » — avec pour seul bouton « Faire mon bilan » — à quelqu'un qui a un
    // bilan, un plan et des points, juste pas sur cet appareil. La consigne de désinscription du
    // même email (« depuis Toi ») réglait alors la préférence d'une session qui n'est personne.
    //
    // Le paramètre ne change pas le **chemin** : `assetlinks.json` ne revendique que `/plan`, et son
    // périmètre est volontairement étroit (les pages légales et la suppression de compte doivent
    // rester atteignables sans l'app). Une autre route aurait donc fait ouvrir le lien dans le
    // navigateur sur Android.
    if (vientDUnRappel) {
      return (
        <ThemedView style={styles.container}>
          <View style={styles.emptySafeArea}>
            {banniere}
            {/* Aucun chiffre sur cet écran : la mascotte peut l'occuper sans rien commenter
                (règle de `src/constants/mascotte.ts`). Elle ne parle pas pour autant — les deux
                phrases sont de la voix produit. */}
            <View style={styles.rappelMascotte}>
              <Mascot mood="calm" size={72} tilt={-6} />
            </View>
            <ThemedText type="screenTitle">Ce rappel concerne un compte</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
              Retrouve-le ici. Ton bilan, ton plan et tes points sont rattachés à ce compte, pas à
              cet appareil.
            </ThemedText>
            <Button
              title="J’ai déjà un compte"
              // `rappel` est **la** provenance que C2.11 existe pour produire : quelqu'un qui
              // ouvre le rappel e-mail sur un appareil où il n'est pas connecté. Sans elle, ce
              // chiffre était indiscernable d'une découverte depuis l'onboarding.
              onPress={() =>
                router.push({ pathname: '/connexion/retrouver', params: { source: 'rappel' } })
              }
              style={styles.emptyButton}
            />
            <TextLink
              label="Commencer un bilan sur cet appareil"
              apparence="action"
              onPress={() => router.push('/bilan')}
              role="link"
            />
          </View>
        </ThemedView>
      );
    }

    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptySafeArea}>
          {banniere}
          <EmptyStateIllustration style={styles.emptyIllustration} />
          <ThemedText type="screenTitle">
            Ton bilan n’est pas encore fait
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
            Sans bilan, on ne peut pas savoir quel déplacement compte le plus pour toi. Environ 5
            minutes.
          </ThemedText>
          <Button title="Faire mon bilan" onPress={() => router.push('/bilan')} style={styles.emptyButton} />
          {/* **Le chemin vers un compte existant manquait ici**, et c'est le seul écran qu'un
              appareil neuf montre : sans ce lien, quelqu'un qui a un compte n'avait que
              « Faire mon bilan », c'est-à-dire l'invitation à refaire ce qu'il a déjà fait. Même
              lien que l'accueil de l'onboarding, et même libellé. */}
          <TextLink
            label="J’ai déjà un compte"
            apparence="action"
            onPress={() =>
              router.push({ pathname: '/connexion/retrouver', params: { source: 'plan_vide' } })
            }
            role="link"
          />
        </View>
      </ThemedView>
    );
  }

  // L'écran ne sait rien : il le dit, et il ne propose surtout ni de faire un bilan ni
  // d'attendre — les deux replis d'avant affirmaient quelque chose sur les données de la
  // personne. « Réessayer » relance exactement la lecture que le retour sur l'onglet relance.
  //
  // **Il ne parle de connexion qu'hors ligne** (D19, 01/10/2026) : sur une réponse 500, « Vérifie ta
  // connexion » envoyait la personne vérifier ce qui marchait (capture `e-19` de l'audit).
  if (etat.status === 'erreur_reseau') {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          <MessageInline
            message={phraseDeLaLectureEnEchec('plan', etat.genre)}
            style={styles.erreurTexte}
          />
          <Button title="Réessayer" onPress={onReessayer} />
        </View>
      </ThemedView>
    );
  }

  // **Cet état était un cul-de-sac, et c'est là qu'atterrissait le bilan fantôme** (A2-2, A3-5) :
  // une phrase, aucun bouton, et rien qui en sorte — ni le retour matériel (on est sur l'onglet
  // racine, il quitte l'app), ni le temps (le cron nocturne ne peut pas générer un plan sans
  // réponses). La personne voyait un plan « en préparation » pour toujours.
  //
  // Deux sorties, et les deux sont vraies maintenant. « Réessayer » a un sens depuis que le plan
  // peut manquer pour une raison passagère : la garde de C1.1 rend le bilan même quand la
  // génération du plan échoue, donc relire peut trouver le cycle que le cron a rattrapé depuis.
  // « Revoir mon bilan » est la sortie qui marche dans tous les cas — le résultat, lui, est bien
  // là, et c'est ce que la personne est venue chercher.
  if (etat.status === 'pending') {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          {banniere}
          <ThemedText themeColor="textSecondary" style={styles.attenteTexte}>
            Ton plan est en cours de préparation, reviens dans un instant.
          </ThemedText>
          {/* Le bouton prend l'apparence du désactivé le temps de la relecture qu'il a demandée
              (audit P-8) — sans quoi un second « en préparation » rendait exactement le même
              écran, et le bouton avait l'air mort. */}
          <View aria-busy={relectureDemandee} style={styles.attenteBouton}>
            <Button title="Réessayer" onPress={onRelire} disabled={relectureDemandee} />
          </View>
          <TextLink
            label="Revoir mon bilan"
            apparence="action"
            onPress={() => router.push({ pathname: '/suivi/bilan', params: { id: etat.assessmentId } })}
            role="link"
          />
        </View>
      </ThemedView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  // La phrase au-dessus des deux sorties : centrée comme le conteneur, mais elle a besoin de
  // son propre espace sous elle, sinon le bouton la touche.
  attenteTexte: { textAlign: 'center', paddingHorizontal: Spacing.four, marginBottom: Spacing.four },
  attenteBouton: { marginBottom: Spacing.three },
  // Le corps d'un état plein écran, comme les états vides voisins : `MessageInline` rend du
  // « small » par défaut, ce qui se lit comme une note sous un bouton — pas comme la seule
  // phrase de l'écran.
  //
  // 16/24, c'est la taille du `default` de `ThemedText`, pas `TypeScale.body` (15/22) : deux
  // valeurs nues, recopiées à l'identique sur l'onglet voisin (`suivi/index.tsx`). L'endroit
  // où les factoriser est un `type` sur `MessageInline`, qui n'appartient pas à ce chantier —
  // le prochain passage visuel saura quoi faire de ces deux lignes.
  erreurTexte: {
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.four,
    fontSize: 16,
    lineHeight: 24,
  },
  emptySafeArea: { flex: 1, padding: Spacing.four, justifyContent: 'center', gap: Spacing.three },
  // La mascotte prend la place de l'illustration d'état vide : centrée comme elle l'était.
  rappelMascotte: { alignItems: 'center' },
  emptyIllustration: { height: 140 },
  emptyBody: { fontSize: 16, lineHeight: 24 },
  emptyButton: { marginTop: 12 },
});
