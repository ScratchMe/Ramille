import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { MessageInline } from '@/components/message-inline';
import { RamilleDit } from '@/components/ramille-dit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { RAMILLE } from '@/constants/mascotte';
import { Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export type EngagementCheckin = {
  id: string;
  loop_type: 'commute' | 'extras';
  period_label: string;
  trip_label: string;
};

const QUESTION_UNIT: Record<EngagementCheckin['loop_type'], string> = {
  commute: 'cette semaine',
  extras: 'ce mois-ci',
};

// `invalid_parameter_value` : le seul refus de `repondre_au_checkin` que réessayer ne lèvera
// jamais — le point porte déjà une réponse, ou la génération de la période suivante l'a clos
// pendant que la carte restait affichée (le cas du retour de notification). Tout le reste, y
// compris un point introuvable, peut être une session que l'app rétablit d'elle-même : on laisse
// alors les boutons actifs plutôt que de fermer la question sur une panne passagère.
const CODE_POINT_CLOS = '22023';

// Contenu et comportement adaptatif minimal cf. spec-fonctionnelle §7 : une question
// fermée ancrée sur un fait précis (pas d'auto-évaluation globale floue), réponse positive
// = renforcement bref, réponse négative = relance factuelle non culpabilisante — jamais de
// notification insistante ni répétée (une seule question par période, générée côté serveur
// par generate_commute_checkins/generate_extras_checkins, jamais par le client).
//
// `emphasize` matérialise la recommandation "concentre-toi sur ton poste dominant" (décision
// produit du 27/08/2026, les deux boucles restent proposées) sans jamais masquer l'autre.
export function CheckinCard({ checkin, emphasize }: { checkin: EngagementCheckin; emphasize: boolean }) {
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [clos, setClos] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
  const answer = async (response: boolean) => {
    if (saving) return;
    setSaving(true);
    setErreur(null);
    const { error } = await supabase.rpc('repondre_au_checkin', {
      p_checkin_id: checkin.id,
      p_reponse: response,
    });
    setSaving(false);

    if (!error) {
      setAnswered(response);
      return;
    }
    if (error.code === CODE_POINT_CLOS) {
      setClos(true);
      return;
    }
    setErreur('Ta réponse n’est pas partie. Vérifie ta connexion et réessaie.');
  };

  return (
    <ThemedView type={emphasize ? 'backgroundSelected' : 'backgroundElement'} style={styles.card}>
      <ThemedText type="small" themeColor={emphasize ? 'accentText' : 'textTertiary'} weight={600}>
        {checkin.period_label}
      </ThemedText>
      {answered === null ? (
        <>
          <ThemedText weight={600} style={styles.question}>
            As-tu changé de mode de transport au moins une fois {QUESTION_UNIT[checkin.loop_type]} pour{' '}
            {checkin.trip_label} ?
          </ThemedText>
          {clos ? (
            // La question reste lisible, mais elle n'attend plus rien : deux boutons qui ne
            // peuvent plus aboutir valent moins qu'une phrase qui dit où en est le point.
            <MessageInline message="Ce point de suivi n’attend plus de réponse. La question revient à la prochaine période." />
          ) : (
            <>
              <View style={styles.actions}>
                {/* « Oui » et « Non » hors contexte ne veulent rien dire : le lecteur d'écran
                    annonce la question juste avant, mais rien ne garantit qu'elle soit encore en
                    mémoire au moment du geste. Le hint la rappelle sur chaque bouton. */}
                <Button
                  title="Non"
                  variant="secondary"
                  onPress={() => answer(false)}
                  disabled={saving}
                  flex
                  accessibilityHint={`Répondre non pour ${checkin.trip_label}`}
                />
                <Button
                  title="Oui"
                  onPress={() => answer(true)}
                  disabled={saving}
                  flex
                  accessibilityHint={`Répondre oui pour ${checkin.trip_label}`}
                />
              </View>
              {/* Les boutons restent actifs : l'échec est une panne, pas un refus. */}
              <MessageInline message={erreur} />
            </>
          )}
        </>
      ) : (
        <RamilleDit
          mood={answered ? 'happy' : 'encouraging'}
          ligne={answered ? RAMILLE.checkinOui : RAMILLE.checkinNon}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, padding: 18, gap: 10 },
  question: { fontSize: 16, lineHeight: 23 },
  actions: { flexDirection: 'row', gap: Spacing.two },
});
