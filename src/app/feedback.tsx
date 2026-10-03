import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cadreDuChamp } from '@/components/cadre-du-champ';
import { Button } from '@/components/button';
import { Chip } from '@/components/bilan/chip';
import { GroupeDeChoix } from '@/components/bilan/groupe-de-choix';
import { Mascot } from '@/components/mascot';
import { MessageInline } from '@/components/message-inline';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TitreDArrivee } from '@/components/titre-d-arrivee';
import { FontFamily, Radius, Spacing, Stroke } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { donnerLeFocus } from '@/lib/focus';
import { revenirOu } from '@/lib/navigation';
import {
  FEEDBACK_KINDS,
  FEEDBACK_MAX_LENGTH,
  sendFeedback,
  type FeedbackKind,
} from '@/lib/feedback';

// Écran de retour utilisateur (issue #29).
//
// Ce qui a fait entrer cette brique dans la V1 : le référentiel de modes de transport est
// forcément incomplet, et rien ne permettait de l'apprendre. Quelqu'un dont le mode principal
// manque n'avait que deux options, mentir ou partir — toutes deux silencieuses.
//
// L'écran ne promet pas de réponse, parce qu'il n'existe aucun canal pour en donner une. Il
// promet que le retour arrive quelque part, et c'est tout ce qu'il dit.
//
// L'état de succès est un état de composant, jamais une `Alert` : sur web `Alert.alert`
// retombe sur `window.alert()`, qui n'invoque pas fiablement `onPress` (cf. CLAUDE.md).

/**
 * L'intitulé du champ, **écrit une fois** : il est à la fois le texte visible au-dessus de la
 * zone de saisie et son nom accessible (A6-13). Les deux recopiés côte à côte finissent
 * toujours par ne plus correspondre — c'est la dérive que `TextField` et `TextLink`
 * documentent déjà.
 */
const LIBELLE_MESSAGE = 'Ton message';

export default function Feedback() {
  const theme = useTheme();
  const { kind: kindParam, context } = useLocalSearchParams<{ kind?: string; context?: string }>();

  const initialKind = FEEDBACK_KINDS.some((k) => k.value === kindParam)
    ? (kindParam as FeedbackKind)
    : 'idee';

  const [kind, setKind] = useState<FeedbackKind>(initialKind);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  // Le focus passe la bordure à l'accent, comme les trois autres champs (`cadreDuChamp`, 01/10/2026).
  const [focusDuChamp, setFocusDuChamp] = useState(false);
  // Le champ lui-même, pour lui donner le focus quand « Envoyer » demande ce qui manque.
  const champ = useRef<TextInput>(null);

  const trimmed = message.trim();
  // **Trois caractères au moins, et la base le dit aussi** : `feedback_message_check` borne
  // `length(btrim(message))` entre 3 et 2000, donc rien ne part dessous, ni côté client ni côté serveur.
  const manque = trimmed.length < 3;
  // **Le minimum se dit dès qu'il manque quelque chose** (24/09/2026, audit d'accessibilité 3.3.2) :
  // « Envoyer » restait grisé sur un texte d'un ou deux caractères sans que rien ne dise pourquoi.
  // Pas avant la première frappe — un champ vide n'a encore rien de trop court — et en texte calme,
  // sans `role="alert"` : ce n'est pas un échec, c'est ce qui manque, et l'annoncer à chaque frappe
  // rendrait le lecteur d'écran inutilisable (la règle du `manque` de `StepShell`).
  const tropCourt = trimmed.length > 0 && manque;

  // **« Envoyer » sous trois caractères demande, et il le dit même à vide** (01/10/2026, `v1-33` D18,
  // audit T-19). Il restait désactivé, sans un mot, tant que le champ était vide : la phrase ci-dessus
  // ne venait qu'avec la première frappe, donc un champ vide face à un bouton gris ne disait rien. C'est
  // le motif du « Suivant » du questionnaire (`FRONT.md` §2.4, `v1-31`) : le bouton prend l'apparence du
  // désactivé (`enAttente`) et **agit** — son toucher écrit la phrase, y compris à vide, et donne le
  // focus au champ. **Rien ne part pour autant** : `onSend` refuse lui-même, c'est lui qui tient la
  // porte, plus un `disabled`.
  //
  // La demande tient jusqu'à ce que le message soit assez long, puis retombe : un champ qu'on vide
  // ensuite ne redit rien avant le prochain toucher, comme le questionnaire. Elle retombe au rendu —
  // jamais dans un effet, qui laisserait une image de trop.
  const [demande, setDemande] = useState(false);
  const demandeActive = demande && manque;
  if (demande && !manque) setDemande(false);

  const onSend = async () => {
    if (manque) {
      setDemande(true);
      // Au geste, et jamais autrement : le focus va au champ, que le clavier s'ouvre sur natif — la
      // demande du « Suivant » le fait de même pour un champ de saisie.
      donnerLeFocus(champ.current);
      if (Platform.OS !== 'web') champ.current?.focus();
      return;
    }
    setSending(true);
    setError(null);
    const result = await sendFeedback(kind, message, context);
    setSending(false);
    if (result.ok) {
      setSent(true);
      return;
    }
    setError(result.message);
  };

  if (sent) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.sentSafeArea}>
          <Mascot mood="happy" size={56} />
          {/* **Le focus vient ici** (24/09/2026, audit d'accessibilité 4.1.3) : cet écran remplace
              le formulaire sous le doigt, et « Envoyer » disparaît avec lui. Sans ce déplacement,
              un lecteur d'écran ne disait rien de l'envoi réussi. */}
          <TitreDArrivee>
            <ThemedText type="screenTitle" style={styles.sentTitle}>
              C’est envoyé, merci.
            </ThemedText>
          </TitreDArrivee>
          <ThemedText type="body" themeColor="textSecondary">
            Ton retour est lu à la main. Il n’y aura pas de réponse automatique — on préfère te
            le dire plutôt que de te laisser l’attendre.
          </ThemedText>
          <Button title="Revenir" onPress={() => revenirOu('/')} style={styles.sentButton} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* `handled` (01/10/2026, audit T-3) : clavier ouvert, le premier toucher sur « Envoyer » ne
            servait qu'à le fermer — le défaut de React Native —, et l'envoi avait l'air ignoré. La
            touche d'action du clavier, elle, reste un retour à la ligne : le champ est multiligne,
            et lui faire envoyer le message interdirait d'écrire un second paragraphe. */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.intro}>
            <ThemedText type="screenTitle">
              Un retour à nous faire ?
            </ThemedText>
            <ThemedText type="body" themeColor="textSecondary">
              Un mode de transport qui manque, un chiffre qui te semble faux, une idée. Tout est
              utile — c’est le seul moyen qu’on a de le savoir.
            </ThemedText>
          </View>

          {/* Une catégorie et une seule : `radiogroup` + `radio`, comme `ChoixDeRappel`. En
              `button`, le rôle n'annonçait pas « non sélectionné » — sur cinq puces, c'est
              l'information qui manque le plus.

              **Aucune question n'est affichée au-dessus des puces, et c'est l'une des deux
              exceptions de `GroupeDeChoix`** : le groupe prend le nom de ce qu'il choisit. Il
              passe par ce composant depuis le 25/09/2026 — il posait son rôle lui-même —, pour
              que ce qu'on ajoutera aux groupes l'atteigne aussi. Afficher « Catégorie » serait
              une phrase de plus à l'écran, donc une décision de produit, pas une correction. */}
          <GroupeDeChoix question="Catégorie" style={styles.kinds}>
            {FEEDBACK_KINDS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                role="radio"
                selected={kind === option.value}
                onPress={() => setKind(option.value)}
                // Le rayon des champs, lu dans son jeton et plus écrit en dur (01/10/2026, audit
                // T-20) : la valeur ne change pas, elle ne peut plus dériver de lui.
                radius={Radius.field}
                selectedStyle="outline"
              />
            ))}
          </GroupeDeChoix>

          <View style={styles.fieldBlock}>
            <ThemedText type="small" themeColor="textTertiary">
              {LIBELLE_MESSAGE}
            </ThemedText>
            <TextInput
              ref={champ}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={FEEDBACK_MAX_LENGTH}
              placeholder="Dis-nous en quelques mots…"
              placeholderTextColor={theme.textTertiary}
              // L'intitulé est un frère dans l'arbre, pas un `label for` : sans ces deux lignes,
              // le seul champ de texte libre du produit s'annonce sans nom, et le compteur de
              // caractères affiché dessous n'est rattaché à rien.
              accessibilityLabel={LIBELLE_MESSAGE}
              accessibilityHint={`${FEEDBACK_MAX_LENGTH} caractères au maximum.`}
              // Le contour au repos est `fieldBorder` (24/09/2026, `v1-29`) : `border` n'y tenait que
              // 1,33:1, on ne voyait pas le seul champ de texte libre du produit. L'accent une fois
              // qu'il y a un texte ou au focus, comme `TextField` (`cadreDuChamp`) — l'élément est ici
              // le cadre lui-même, et l'anneau du navigateur le suivait déjà.
              onFocus={() => setFocusDuChamp(true)}
              onBlur={() => setFocusDuChamp(false)}
              style={[
                styles.input,
                { backgroundColor: theme.backgroundElement, color: theme.text },
                cadreDuChamp(theme, { rempli: message.length > 0, focus: focusDuChamp }),
              ]}
            />
            {/* En Spline Sans et non plus en chasse fixe (24/09/2026, décision n° 10, qui la réserve aux
                sources et aux codes techniques) ; les chiffres, qui changent à chaque frappe, gardent
                une chasse fixe par `tabular-nums` — le compteur ne tremble pas. */}
            <ThemedText type="small" themeColor="textTertiary" style={styles.compteur}>
              {trimmed.length} / {FEEDBACK_MAX_LENGTH}
            </ThemedText>
            {/* **À l'encre de ce qui manque au toucher d'« Envoyer », comme le questionnaire, `/contexte`
                et « C'est noté »** (02/10/2026, fin de `v1-33` D18) : la phrase restait en tertiaire, et
                un bouton qui demande se disait encore de deux façons (audit T-19). **Pendant la frappe,
                elle reste calme** (le 3.3.2 du 24/09/2026, plus haut) : rien n'a encore été demandé, et
                un accent en gras dès le premier caractère se lirait comme un reproche. Un texte et non
                un lien : il n'y a qu'un champ, et le toucher d'« Envoyer » y porte déjà le focus. */}
            {(tropCourt || demandeActive) && (
              <ThemedText
                type="small"
                weight={demandeActive ? 600 : undefined}
                themeColor={demandeActive ? 'accentText' : 'textTertiary'}
              >
                Trois caractères au moins pour pouvoir l’envoyer.
              </ThemedText>
            )}
          </View>

          {/* L'échec passe par `MessageInline` comme partout ailleurs : une carte maison dit la
              même chose à l'œil, mais sans région vivante elle n'est annoncée à personne. */}
          <MessageInline message={error} />

          {/* **Jamais `disabled` sous trois caractères** (`v1-33` D18) : le bouton garde l'apparence du
              désactivé (`enAttente`) et mène au champ. `disabled` ne reste que pendant l'envoi, où il n'agit
              vraiment pas — et sans `aria-disabled` : un bouton qui agit n'est pas indisponible
              (`FRONT.md` §2.4). */}
          <Button
            title={sending ? 'Envoi…' : 'Envoyer'}
            onPress={onSend}
            enAttente={manque}
            disabled={sending}
          />

          {/* Ce qui part avec le message, dit avant l'envoi et non dans une politique que
              personne n'ouvre. Le contexte est le nom de l'écran d'origine, rien de plus. Une
              phrase adressée à la personne, donc en Spline Sans depuis le 24/09/2026 (décision
              n° 10) : la chasse fixe est réservée aux sources et aux codes techniques. */}
          <ThemedText type="small" themeColor="textTertiary">
            On enregistre ton message, la catégorie choisie{context ? ' et l’écran d’où tu viens' : ''}, avec
            l’identifiant de ton compte pour rapprocher ton retour de ce que tu vois. Rien d’autre,
            et aucune réponse : il n’existe pas de canal pour t’en adresser une.
          </ThemedText>

          {/* Souligné (`v1-33` T-5) : la phrase grise juste au-dessus le touche, au même corps. */}
          <TextLink
            label="Annuler"
            apparence="souligne"
            onPress={() => revenirOu('/')}
            style={styles.cancel}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: Spacing.four, gap: Spacing.three },
  intro: { gap: Spacing.two },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  fieldBlock: { gap: Spacing.two },
  input: {
    minHeight: 140,
    borderRadius: Radius.field,
    borderWidth: Stroke.field,
    padding: 16,
    fontSize: 16,
    lineHeight: 22,
    // En Spline Sans, comme `TextField` (24/09/2026) : sans elle, le texte libre s'écrivait dans la
    // police du système.
    fontFamily: FontFamily.regular,
    textAlignVertical: 'top',
  },
  compteur: { fontVariant: ['tabular-nums'] },
  cancel: { textAlign: 'center' },
  sentSafeArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  sentTitle: { textAlign: 'center' },
  sentButton: { marginTop: Spacing.two, alignSelf: 'stretch' },
});
