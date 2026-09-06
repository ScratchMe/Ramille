import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { RamilleDit } from '@/components/ramille-dit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { RAMILLE } from '@/constants/mascotte';
import { Spacing } from '@/constants/theme';
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
  const [saving, setSaving] = useState(false);

  const answer = async (response: boolean) => {
    if (saving) return;
    setSaving(true);
    const { error } = await supabase
      .from('engagement_checkins')
      .update({ status: 'answered', response, responded_at: new Date().toISOString() })
      .eq('id', checkin.id);
    setSaving(false);
    if (!error) setAnswered(response);
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
  card: { borderRadius: 18, padding: 18, gap: 10 },
  question: { fontSize: 16, lineHeight: 23 },
  actions: { flexDirection: 'row', gap: Spacing.two },
});
