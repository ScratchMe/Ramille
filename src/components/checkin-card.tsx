import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { MessageInline } from '@/components/message-inline';
import { RamilleDit } from '@/components/ramille-dit';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formeInserable } from '@/constants/postes';
import { Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import {
  estDeuxiemeFoisDeSuite,
  genreDeReponse,
  libelleSansObjet,
  phraseDeSecondRenforcement,
  piedDuPointRepondu,
  questionDuPoint,
  repliqueDuPoint,
  type PointRepondu,
  type ReponseDuPoint,
} from '@/types/checkin';

export type EngagementCheckin = {
  id: string;
  loop_type: 'commute' | 'extras';
  period_label: string;
  trip_label: string;
  /** `commute` | `leisure` | `travel`, snapshoté à la génération (C2.6). */
  poste: string | null;
  /** `engagement` | `generique` | `maintien` | `occasion` — le genre de question posée (C2.1). */
  question_kind: string | null;
  /** Le mode snapshoté du poste interrogé. Ne remplit que la question de maintien (C2.5). */
  mode: string | null;
  /** Le début de la période **écoulée** interrogée : c'est lui qui nomme le mois (C2.3). */
  period_start: string;
  /**
   * La question **figée** à la génération, telle que le rappel l'a envoyée (C2.1). La carte
   * l'affiche telle quelle : c'est la seule façon qu'elle ne puisse pas différer d'un caractère de
   * la notification qu'on vient d'ouvrir. Nulle sur les points générés avant C2.1.
   */
  committed_question: string | null;
  /** Le libellé de l'action engagée au moment de la génération (C2.1), figé comme `trip_label`. */
  committed_action_text: string | null;
  /** Les jours d'intention figés. Lus seulement pour recomposer une question d'avant C2.1. */
  committed_intention_days: number[] | null;
  /**
   * `pending` | `answered` — `expired` n'arrive pas jusqu'ici, l'écran ne lit pas les points clos.
   * Depuis C2.4 la carte reste affichée après la réponse, le temps de la période : c'est donc le
   * statut de la ligne, et non le seul état local du composant, qui décide de ce qu'elle montre.
   */
  status: string;
  /** `oui` | `non` | `sans_objet`, nul tant que le point n'est pas répondu (C2.4). */
  response_kind: string | null;
  /** L'horodatage serveur de la réponse, qui date le pied de la carte répondue. */
  responded_at: string | null;
};

// **Les deux refus de `repondre_au_checkin`, et la raison de les distinguer d'une panne de
// transport** (A4-2, A12-6).
// Aucun des deux ne se lève en réessayant, donc aucun des deux ne doit conseiller de vérifier la
// connexion : ce serait renvoyer la personne vers un geste qui ne peut rien changer.
//
//   - `22023` (`invalid_parameter_value`) : le point porte déjà une réponse, ou la génération de
//     la période suivante l'a clos pendant que la carte restait affichée — le cas du retour de
//     notification.
//   - `P0002` (`no_data_found`) : aucun point de cet identifiant sous ce compte. La session est
//     valide (sans elle, c'est le privilège qui refuserait, en `42501`), donc la carte est
//     simplement plus vieille que la session — un lien de connexion ouvert entre-temps a changé
//     d'utilisateur, ou le point a disparu. Le plan se relit au retour sur l'onglet.
//
// Tout le reste — un code absent, un transport qui n'aboutit pas — garde les boutons actifs.
const CODE_POINT_CLOS = '22023';
const CODE_POINT_INTROUVABLE = 'P0002';

const REFUS_DU_RPC: Record<string, string | undefined> = {
  [CODE_POINT_CLOS]:
    'Ce point de suivi n’attend plus de réponse. La question revient à la prochaine période.',
  [CODE_POINT_INTROUVABLE]:
    'Ce point de suivi n’est plus rattaché à ton compte. Il disparaîtra de ton plan à la prochaine relecture.',
};

// Contenu et comportement adaptatif minimal cf. spec-fonctionnelle §7 : une question
// fermée ancrée sur un fait précis (pas d'auto-évaluation globale floue), réponse positive
// = renforcement bref, réponse négative = relance factuelle non culpabilisante — jamais de
// notification insistante ni répétée (une seule question par période, générée côté serveur
// par generate_commute_checkins/generate_extras_checkins, jamais par le client).
//
// `emphasize` matérialise la recommandation "concentre-toi sur ton poste dominant" (décision
// produit du 27/08/2026, les deux boucles restent proposées) sans jamais masquer l'autre.
export function CheckinCard({
  checkin,
  emphasize,
  actionEngagee,
  historique,
}: {
  checkin: EngagementCheckin;
  emphasize: boolean;
  /**
   * Le libellé de l'action **actuellement** engagée, ou `null`. Sert à une seule chose : savoir si
   * la question figée porte sur une action quittée depuis (C2.1). L'écran du plan le connaît déjà,
   * la carte ne le relit donc pas.
   */
  actionEngagee?: string | null;
  /**
   * Les points **déjà répondus** de la même boucle, hors celui-ci, sur les périodes récentes (C2.10).
   * Sert au seul second renforcement : la carte n'a pas à interroger la base pour savoir ce qui s'est
   * passé la période d'avant, l'écran du plan lit déjà la fenêtre.
   */
  historique?: PointRepondu[];
}) {
  const [reponseLocale, setReponseLocale] = useState<ReponseDuPoint | null>(null);
  /** Le point n'accepte plus de réponse : la question reste lisible, les boutons partent. */
  const [refus, setRefus] = useState<string | null>(null);
  /** La réponse n'est pas partie : les boutons restent, il n'y a qu'à recommencer. */
  const [erreur, setErreur] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Comparaison de libellés et non d'identifiants : la carte ne porte pas l'identifiant du gabarit,
  // et le libellé est ce que la personne a lu en choisissant. Deux actions de libellés identiques
  // n'existent pas dans le référentiel.
  const questionSurActionQuittee =
    checkin.committed_action_text !== null &&
    actionEngagee !== undefined &&
    actionEngagee !== checkin.committed_action_text;

  // **La réponse se lit d'abord sur la ligne, puis sur l'état local** (C2.4, point 5 du chantier).
  // Le renforcement vivait dans un `useState` et disparaissait au rechargement de l'écran : la
  // personne répondait, voyait le mot de Ramille, changeait d'onglet, et retrouvait la question
  // comme si rien n'avait eu lieu — ou rien du tout, puisque la requête ne lisait que les points
  // `pending`. La carte répondue reste maintenant le temps de la période (le plan borne la lecture
  // avec `estDeLaPeriodeCourante`), et c'est `response_kind` qui la remplit. L'état local garde le
  // dessus le temps d'un aller-retour réseau, pour que la carte bascule à l'instant du geste.
  const reponse = reponseLocale ?? genreDeReponse(checkin.response_kind);
  const pied = piedDuPointRepondu(checkin);

  // **Le second renforcement ne se déclenche qu'une fois, et jamais sur un compteur** (C2.10). Il se
  // calcule sur les **périodes** et non sur les dernières lignes répondues : deux « oui » séparés par
  // trois mois de silence ne sont pas une série, et les points non répondus sont clos en `expired` et
  // gardés en base, donc « les deux dernières lignes » ne veut plus rien dire depuis 20260904180000.
  const renforcement =
    reponse !== null && estDeuxiemeFoisDeSuite({ ...checkin, reponse }, historique ?? [])
      ? phraseDeSecondRenforcement(checkin)
      : null;

  // La réponse passe par un RPC, jamais par un `update` : `engagement_checkins` porte des
  // libellés snapshotés (`trip_label`, `period_label`) et la clé d'idempotence de la génération
  // (`period_start`), et une policy UPDATE les aurait tous ouverts d'un coup — la RLS filtre des
  // lignes, jamais des colonnes. Même raisonnement que `plan_actions` (v1-13, chantier C1.12).
  // `responded_at` vient désormais de l'horloge du serveur, plus de celle du téléphone.
  //
  // Le RPC refuse aussi un point déjà répondu ou expiré par le cron, là où l'`update` rendait un
  // succès sur zéro ligne : l'erreur remplace une carte qui félicitait pour rien. Un refus ne doit
  // pas pour autant laisser deux boutons morts — c'est la même exigence que le reste du produit
  // (C1.4), et elle se règle ici parce que c'est ici que le refus arrive.
  const answer = async (response: ReponseDuPoint) => {
    if (saving) return;
    setSaving(true);
    setErreur(null);
    const { error } = await supabase.rpc('repondre_au_checkin', {
      p_checkin_id: checkin.id,
      p_reponse: response,
    });
    setSaving(false);

    if (!error) {
      setReponseLocale(response);
      return;
    }

    const refusDuRpc = REFUS_DU_RPC[error.code];
    if (refusDuRpc) {
      setRefus(refusDuRpc);
      return;
    }

    setErreur('Ta réponse n’est pas partie. Vérifie ta connexion et réessaie.');
  };

  return (
    // **L'accent tombe une fois répondu** (v1-14 §4.1) : il sert à désigner la question du poste
    // dominant parmi plusieurs cartes, et une question déjà refermée n'a plus rien à désigner.
    <ThemedView
      type={emphasize && reponse === null ? 'backgroundSelected' : 'backgroundElement'}
      style={styles.card}
    >
      <ThemedText
        type="small"
        themeColor={emphasize && reponse === null ? 'accentText' : 'textTertiary'}
        weight={600}
      >
        {checkin.period_label}
      </ThemedText>
      {reponse === null ? (
        <>
          {/* **La question vient de `src/types/checkin.ts`, et c'est la même qu'au rappel.**
              Elle vivait ici, au présent et avec le libellé snapshoté collé après la préposition :
              « As-tu changé de mode de transport au moins une fois cette semaine pour Trajet
              domicile-travail (Voiture thermique) ? ». Le rappel, lui, disait déjà « La semaine
              dernière, as-tu changé de mode de transport pour ton trajet domicile-travail ? ».
              Deux phrases pour une seule question, sur un produit dont la boucle entière consiste
              à appuyer sur la notification pour y répondre. */}
          <ThemedText weight={600} style={styles.question}>
            {questionDuPoint(checkin)}
          </ThemedText>
          {/* **Une question figée peut nommer une action qu'on ne suit plus** (C2.1) : elle a été
              composée au moment de la génération, et changer d'avis entre-temps ne la réécrit pas —
              c'est précisément ce que `committed_question` garantit. Sans cette ligne, « Mardi ou
              jeudi, as-tu fait ce trajet à vélo ? » s'afficherait à quelqu'un qui suit désormais le
              télétravail, sans rien pour l'expliquer.

              Écart assumé au canvas, qui écrit « Question posée lundi, sur l'action de la semaine
              dernière. » : nommer le jour demanderait de dériver une date de génération et un
              troisième format de date dans la carte, pour un état marginal. La phrase dit le fait,
              et nomme l'action — ce qui est l'information utile. */}
          {questionSurActionQuittee && (
            <ThemedText type="small" themeColor="textTertiary">
              Cette question porte sur l’action que tu suivais alors : {checkin.committed_action_text}.
            </ThemedText>
          )}
          {refus ? (
            // La question reste lisible, mais elle n'attend plus rien : deux boutons qui ne
            // peuvent plus aboutir valent moins qu'une phrase qui dit où en est le point.
            <MessageInline message={refus} />
          ) : (
            <>
              <View style={styles.actions}>
                {/* « Oui » et « Non » hors contexte ne veulent rien dire : le lecteur d'écran
                    annonce la question juste avant, mais rien ne garantit qu'elle soit encore en
                    mémoire au moment du geste. Le hint la rappelle sur chaque bouton. */}
                <Button
                  title="Non"
                  variant="secondary"
                  onPress={() => answer('non')}
                  disabled={saving}
                  flex
                  accessibilityHint={`Répondre non pour ${formeInserable(checkin.poste, checkin.loop_type)}`}
                />
                <Button
                  title="Oui"
                  onPress={() => answer('oui')}
                  disabled={saving}
                  flex
                  accessibilityHint={`Répondre oui pour ${formeInserable(checkin.poste, checkin.loop_type)}`}
                />
              </View>
              {/* **La troisième réponse, et pourquoi elle est discrète** (C2.4, v1-14 §4.1).

                  Une semaine de congés ou un mois sans voyage n'ont pas de réponse honnête entre
                  oui et non : « Non » déclenche la consolation d'échec et s'inscrit en « Non » dans
                  le suivi, ne rien répondre laisse le point expirer — ce qui compte pour une
                  occasion manquée et fait s'espacer les rappels (C2.9). Pour un profil « deux vols
                  par an », dix mois sur douze devenaient ainsi une suite de « Non ».

                  Un lien et non un troisième bouton : c'est une sortie, pas une réponse qu'on
                  propose à égalité avec les deux autres. `TextLink` porte les 44 px de cible sans
                  déplacer le texte, et son libellé accessible **est** le texte affiché. */}
              <TextLink
                label={libelleSansObjet(checkin)}
                onPress={() => answer('sans_objet')}
                disabled={saving}
                type="small"
                themeColor="textTertiary"
                containerStyle={styles.sansObjet}
                hint={`Aucune occasion pour ${formeInserable(checkin.poste, checkin.loop_type)} sur cette période`}
              />
              {/* Les boutons restent actifs : l'échec est une panne, pas un refus. */}
              <MessageInline message={erreur} />
            </>
          )}
        </>
      ) : (
        <>
          {/* **Un point de maintien ne reçoit jamais `checkinNon`** (C2.5) : cette réplique console
              d'un échec, et répondre « non » à « ton trajet s'est-il fait à vélo ? » n'en est pas
              un. Même raison pour `sans_objet`, qui reçoit une attente et non une relance (C2.4).
              Le choix se fait dans `repliqueDuPoint`, avec son test, plutôt qu'en ternaire ici. */}
          <RamilleDit {...repliqueDuPoint(checkin, reponse)} />
          {/* **La phrase du handoff, enfin affichée** (C2.10) : elle est dans la spec §7 comme signal
              d'engagement et en §9 comme indicateur de succès, et n'avait jamais été calculée nulle
              part. Voix produit et non celle de Ramille — elle constate un fait sur deux périodes, et
              Ramille ne compte jamais. Jamais un badge, jamais un compteur, jamais au-delà de deux. */}
          {renforcement && <ThemedText type="body">{renforcement}</ThemedText>}
          {/* Le pied est **du produit, pas d'elle** : il porte deux dates, et Ramille ne dit jamais
              de nombre. D'où le petit tertiaire sous sa phrase. */}
          {pied && (
            <ThemedText type="small" themeColor="textTertiary">
              {pied}
            </ThemedText>
          )}
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, padding: 18, gap: 10 },
  question: { fontSize: 16, lineHeight: 23 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  // Centré sous les deux boutons : le lien doit se lire comme une sortie commune aux deux, pas
  // comme une suite du bouton de gauche.
  sansObjet: { alignItems: 'center' },
});
