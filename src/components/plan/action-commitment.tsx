import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/bilan/chip';
import { GroupeDeChoix } from '@/components/bilan/groupe-de-choix';
import { MessageInline } from '@/components/message-inline';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { donnerLeFocus, FOCALISABLE_PAR_PROGRAMME, type TitreFocalisable } from '@/lib/focus';
import { clearPlanActionCommitment, commitPlanAction } from '@/lib/plan-engagement';
import {
  INTENTION_DAYS,
  intentionTimingsForPoste,
  intentionKindForPoste,
  isIntentionComplete,
  type IntentionDay,
  type IntentionTiming,
} from '@/types/plan';

// Étape 6b — choisir une action et y attacher une intention d'implémentation (v1-07 §3.3).
//
// Le levier n'est pas la case cochée, c'est le **quand** : « je le fais le mardi et le jeudi »
// tient bien mieux que « je vais essayer ». D'où une intention obligatoire pour s'engager, et
// une phrase relue en toutes lettres une fois l'engagement pris — pas une liste d'initiales.
//
// Deux choses que ce composant ne fait pas, et ne doit pas faire :
//   - il n'y a **aucune notion d'échec**. Pas de « tenu / pas tenu », pas de série, pas de
//     score. On peut changer d'action ou retirer son engagement sans que rien ne le compte
//     contre soi — même registre que l'écran /suivi.
//   - il ne passe pas par `Alert.alert` : sur web, l'alerte retombe sur `window.alert()`, qui
//     n'invoque pas fiablement `onPress` (cf. CLAUDE.md). L'erreur est un état du composant, et
//     elle se dit par `MessageInline`, la seule façon du produit de dire qu'une action n'a pas
//     abouti — elle était un `ThemedText` nu jusqu'au 24/09/2026, donc annoncée à personne
//     (audit d'accessibilité, 4.1.3).
export function ActionCommitment({
  actionId,
  poste,
  committed,
  intentionDays,
  intentionTiming,
  otherActionCommitted,
  onChanged,
  onEngage,
  onRefus,
  surLeChoix = false,
  onAnnuler,
  onOuvert,
  lectures,
}: {
  actionId: string;
  poste: string | null;
  committed: boolean;
  intentionDays: number[] | null;
  intentionTiming: string | null;
  /** Une autre action du cycle porte déjà l'engagement : on propose de basculer, pas d'ajouter. */
  otherActionCommitted: boolean;
  onChanged: () => void;
  /**
   * Appelé **seulement** quand un engagement vient d'être pris — y compris quand on en change par
   * « Choisir celle-ci à la place », qui en prend un, mais jamais quand on le libère. C'est ce qui
   * déclenche la feuille des rappels (v1-12 §6.1), et elle n'a de sens qu'à cet instant précis : la
   * personne vient de dire quand elle va agir. Le **poste** part avec, parce que la feuille qui
   * s'ouvre derrière promet un contact *sur cette action* : c'est lui qui dit quelle boucle
   * l'interrogera (relevé en recette le 14/09/2026, cf. `boucleDeLAction`), et depuis C4.2 si la
   * question du mot de la veille peut se poser (`ouvertureDeLaFeuille`).
   */
  onEngage?: (poste: string | null) => void;
  /**
   * Appelé quand le serveur **refuse** le remplacement (`RM001`), avec la phrase à afficher.
   *
   * Le message ne peut pas vivre dans cet état local : le même chemin appelle `onChanged()`, donc le
   * plan est relu et ce composant remonté — la phrase disparaissait au rendu suivant, et personne ne
   * lisait jamais pourquoi son choix n'avait pas été pris (relevé le 14/09/2026). C'est l'écran qui
   * la porte, au-dessus du plan, là où la ligne de relecture se dit déjà.
   */
  onRefus?: (message: string | null) => void;
  /**
   * S'ouvrir **directement sur la question** (« Quand ? », « Quels jours ? »), sans passer par « Je
   * m'y engage » (décision n° 1 du 28/09/2026, `v1-32` §4.2) : sur l'écran des pistes, « Choisir »
   * vient de le dire, et le redemander faisait quatre gestes là où trois suffisent. Le contenu du
   * sélecteur ne change pas — rien de coché, « C'est noté » inactif tant que rien n'est choisi,
   * **aucune valeur par défaut**. Le plan ne le passe pas.
   */
  surLeChoix?: boolean;
  /**
   * « Annuler » rend la main à l'appelant au lieu de revenir au bouton « Je m'y engage » — sur la
   * liste, il n'y en a pas : la carte redevient sa ligne. Sans lui, le comportement du plan.
   */
  onAnnuler?: () => void;
  /**
   * Le sélecteur vient de s'ouvrir sous le doigt (« Je m'y engage », « Choisir celle-ci à la
   * place ») : l'écran du plan y fait défiler juste assez pour que « C'est noté » finisse au-dessus
   * de la barre d'onglets (audit P-2, 01/10/2026). Jamais au montage — la liste, qui s'ouvre sur le
   * choix, défile elle-même.
   */
  onOuvert?: () => void;
  /**
   * Le nombre de lectures de l'écran **terminées** (audit P-1, 01/10/2026). Un engagement pris ici
   * garde le sélecteur tel quel, « C'est noté » inactif, jusqu'à la lecture qui suit : la carte s'y
   * relit engagée, ou, si elle échoue, le sélecteur redevient actif. Sans lui — la liste, qui part
   * vers le plan —, le sélecteur reste inactif jusqu'au départ.
   */
  lectures?: number;
}) {
  const kind = intentionKindForPoste(poste);

  const [picking, setPicking] = useState(surLeChoix);
  const [days, setDays] = useState<IntentionDay[]>([]);
  const [timing, setTiming] = useState<IntentionTiming | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * La lecture qu'un engagement réussi attend pour se refermer (audit P-1, 01/10/2026) : le nombre
   * de lectures terminées au moment du succès, ou `null`.
   *
   * **Le sélecteur ne se referme plus au succès, et c'est ce qui défaisait le geste sous les yeux.**
   * Refermé avant la relecture, il rendait « Je m'y engage » le temps que l'écran relise le plan, puis
   * seulement la carte engagée : la personne voyait son engagement annulé, et pouvait le reprendre.
   * Il reste donc tel quel, « C'est noté » inactif (`busy`), jusqu'à la lecture qui suit : la carte
   * s'y relit engagée et passe à « Changer d'avis » dans le même rendu — ou la lecture échoue, et le
   * sélecteur redevient actif, sa sélection gardée, sous la ligne de relecture de l'écran.
   *
   * Ajusté **au rendu**, jamais dans un effet : un effet partirait après l'image où la carte est
   * déjà relue (la règle de la demande de `StepShell`).
   */
  const [lectureAttendue, setLectureAttendue] = useState<number | null>(null);
  if (lectureAttendue !== null && committed) {
    setLectureAttendue(null);
    setBusy(false);
    setPicking(false);
    setDays([]);
    setTiming(null);
  } else if (lectureAttendue !== null && lectures !== undefined && lectures > lectureAttendue) {
    setLectureAttendue(null);
    setBusy(false);
  }

  // La question écrite une fois pour ses deux usages : le texte au-dessus des puces et le nom de
  // leur groupe (`GroupeDeChoix`).
  const question = kind === 'days' ? 'Quels jours ?' : 'Quand ?';

  /**
   * **Le focus suit le geste, dans les deux sens** (29/09/2026, `v1-32` §4.2, `FRONT.md` §2.4).
   * « Je m'y engage » et « Annuler » disparaissent sous le doigt qui les touche : le focus tombait
   * sur le document, la tabulation repartait du haut du plan, et le lecteur d'écran n'annonçait ni
   * la question qui venait d'arriver, ni le bouton revenu. Il va donc :
   *  - **à la question** quand le sélecteur s'ouvre — le texte « Quand ? » rendu focalisable par
   *    programme, le nom même du groupe de puces qui suit ; la tabulation reprend à la première
   *    puce, le lecteur d'écran lit la question puis les choix ;
   *  - **au bouton qui réapparaît** quand « Annuler » le referme, sur le plan. Sur la liste, la
   *    carte disparaît avec lui (`onAnnuler`) : c'est l'écran qui rend le focus à la rangée.
   *
   * **Seulement après un geste**, jamais au montage — sauf sur la liste, où le montage **est** le
   * geste : la carte n'existe que parce que « Choisir » vient d'être touché (la règle de
   * `TitreDArrivee`). `geste` retient lequel ; l'effet le lit et l'efface, pour qu'un effet rejoué
   * sans que rien n'ait bougé ne reparte pas.
   *
   * **Au geste, même sur la liste, où la carte entre en grandissant** (`FRONT.md` §2.12 : le focus
   * part au geste, jamais à la fin d'une animation). Au montage, « Quand ? » est encore sous la
   * découpe d'un `HauteurSuivie` et dans une `Apparition` partie de l'opacité nulle (`pistes.tsx`) ;
   * le navigateur l'accepte, et qu'Android l'accepte aussi se juge au doigt (`v1-13` §11.24). Une
   * version du 29/09/2026 faisait attendre le focus `Mouvement.entree` sur la liste, pour ce seul
   * risque : elle retardait l'annonce que la règle protège, et elle est retirée le jour même.
   */
  const laQuestion = useRef<unknown>(null);
  const leBouton = useRef<View>(null);
  const geste = useRef<'ouvrir' | 'annuler' | null>(surLeChoix ? 'ouvrir' : null);
  useEffect(() => {
    const vient = geste.current;
    geste.current = null;
    if (vient === 'ouvrir' && picking) donnerLeFocus(laQuestion.current);
    if (vient === 'annuler' && !picking) donnerLeFocus(leBouton.current);
  }, [picking]);

  const toggleDay = (day: IntentionDay) =>
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));

  const submit = async () => {
    setBusy(true);
    setError(null);
    // Le refus précédent appartenait à la tentative précédente : il s'efface ici et nulle part
    // ailleurs. La relecture qui suit un refus est déclenchée par le même `onChanged` que le succès,
    // donc l'effacer là ferait disparaître le message avant qu'il ne soit lu.
    onRefus?.(null);
    const result = await commitPlanAction(
      actionId,
      kind === 'days' ? { days } : { timing: timing as IntentionTiming },
      // **Remplacer se dit, il ne se déduit pas** (C4.6). Quand une autre action est engagée, le
      // bouton du plan dit « Choisir celle-ci à la place » et la pastille de la liste « Choisir à la
      // place » — tous deux lus, comme ce drapeau, sur `etatDeLaPiste` (`CarteDePiste`) : c'est
      // exactement ce qu'on transmet, et le RPC refuse un remplacement qu'on ne lui a pas demandé
      // plutôt que d'effacer en silence les jours et l'intention que la personne avait choisis.
      otherActionCommitted
    );
    if (!result.ok) {
      setBusy(false);
      // L'écran ne savait pas qu'une autre action était engagée : on relit plutôt que de laisser un
      // plan qui ne dit pas la vérité, et le message explique ce que la relecture va montrer — mais
      // il se dit **à l'écran**, parce que la relecture remonte cette carte et emporterait un état
      // local avec elle.
      if (result.rechargerLePlan) {
        onRefus?.(result.message);
        onChanged();
        return;
      }
      setError(result.message);
      return;
    }
    // **Le sélecteur reste tel quel, « C'est noté » inactif, sur le plan comme sur la liste.** Sur la
    // liste, jusqu'à ce que l'écran parte vers le plan (`onEngage`) : refermé ici, il montrait « Je
    // m'y engage » ou « Choisir celle-ci à la place » pendant le retour de la pile, sur natif — un
    // bouton que la liste n'a plus —, et un `busy` rendu faux laissait « C'est noté » se retoucher une
    // seconde fois ; la relecture qui suit rend de toute façon la ligne engagée, qui n'est plus une
    // carte. Sur le plan, jusqu'à la lecture qui suit (`lectureAttendue`, audit P-1).
    if (lectures !== undefined) setLectureAttendue(lectures);
    onChanged();
    onEngage?.(poste);
  };

  const release = async () => {
    setBusy(true);
    setError(null);
    onRefus?.(null);
    const result = await clearPlanActionCommitment(actionId);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onChanged();
  };

  // L'engagement se lit désormais sur la carte elle-même — bordure, fond, étiquette et
  // intention (cf. `action-card.tsx`, v1-11 lot 1). Ce composant ne garde donc que ce qu'il
  // est seul à pouvoir faire ici : rendre la main.
  if (committed) {
    return (
      <View style={styles.footer}>
        <TextLink
          label="Changer d’avis"
          hint="Libère cette action ; tu pourras en choisir une autre"
          onPress={release}
          disabled={busy}
          type="small"
          themeColor="textTertiary"
          style={styles.link}
        />
        <MessageInline message={error} />
      </View>
    );
  }

  if (!picking) {
    return (
      <View style={styles.footer}>
        <Button
          ref={leBouton}
          title={otherActionCommitted ? 'Choisir celle-ci à la place' : 'Je m’y engage'}
          variant="secondary"
          onPress={() => {
            geste.current = 'ouvrir';
            setPicking(true);
            onOuvert?.();
          }}
        />
      </View>
    );
  }

  return (
    <ThemedView type="backgroundElement" style={styles.picker}>
      <ThemedText
        type="small"
        themeColor="textTertiary"
        {...({ ref: laQuestion, ...FOCALISABLE_PAR_PROGRAMME } as TitreFocalisable)}
      >
        {question}
      </ThemedText>

      {kind === 'days' ? (
        // Les jours se **cumulent** : des `checkbox` dans un groupe nommé, jamais des `radio` — qui
        // annonceraient qu'en cocher un décoche les autres. Et ils vont sur **quatre colonnes au
        // plus** — trois quand une cible de 48 n'y tiendrait plus (`GroupeDeChoix`) : sur
        // une ligne, entre les marges de la carte et celles du sélecteur, chacun ne mesurait que 27 à
        // 31 px de large à 360-390 dp, sous la cible de 48 (décision n° 7, `GroupeDeChoix`).
        <GroupeDeChoix question={question} cumulable colonnes={4}>
          {INTENTION_DAYS.map((day) => (
            <Chip
              // Deux jours portent l'initiale « M » : l'accessibilité passe par le libellé
              // long, pas par la puce.
              key={day.value}
              label={day.short}
              accessibilityLabel={day.long}
              role="checkbox"
              selected={days.includes(day.value)}
              onPress={() => toggleDay(day.value)}
              radius={Radius.chip}
              // Le sélecteur est un encart teinté : sans le fond de la page, la puce n'a pas de bord.
              nestedBackground
            />
          ))}
        </GroupeDeChoix>
      ) : (
        <GroupeDeChoix question={question} style={styles.timingColumn}>
          {/* C3.8 §4 : les échéances dépendent du poste — un voyage ne se décide pas au calendrier
              du mois. La liste se dérive ici plutôt que dans le rendu d'un ternaire, pour que
              `src/types/plan.ts` reste le seul endroit qui sache lesquelles vont avec quoi. */}
          {intentionTimingsForPoste(poste).map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              role="radio"
              selected={timing === option.value}
              onPress={() => setTiming(option.value)}
              // Le rayon des champs, nommé (T-20, 01/10/2026) : il était écrit `16` en dur, hors de
              // tout jeton, comme dans trois autres appelants de `Chip`.
              radius={Radius.field}
              selectedStyle="outline"
              nestedBackground
            />
          ))}
        </GroupeDeChoix>
      )}

      <MessageInline message={error} />

      <View style={styles.pickerActions}>
        <TextLink
          label="Annuler"
          onPress={() => {
            if (onAnnuler) {
              onAnnuler();
              return;
            }
            geste.current = 'annuler';
            setPicking(false);
          }}
          disabled={busy}
          type="small"
          themeColor="textTertiary"
          style={styles.link}
        />
        <Button
          title="C’est noté"
          onPress={submit}
          disabled={busy || !isIntentionComplete(kind, days, timing)}
          flex
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  footer: { marginTop: Spacing.three },
  picker: { marginTop: Spacing.three, borderRadius: Radius.field, padding: Spacing.four, gap: Spacing.three },
  timingColumn: { gap: Spacing.two },
  pickerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  link: { textDecorationLine: 'underline' },
});
