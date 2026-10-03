import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { MessageInline } from '@/components/message-inline';
import { RamilleDit } from '@/components/ramille-dit';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formeInserable, type LoopType } from '@/constants/postes';
import { Radius, Spacing } from '@/constants/theme';
import { donnerLeFocus, FOCALISABLE_PAR_PROGRAMME, type TitreFocalisable } from '@/lib/focus';
import { Apparition, HauteurSuivie, SansApparitionAuMontage } from '@/lib/mouvement';
import { supabase } from '@/lib/supabase';
import { messageDEcriture } from '@/types/ecriture-en-echec';
import { genreDeLEchec } from '@/types/lecture-en-echec';
import {
  estDeuxiemeFoisDeSuite,
  genreDeReponse,
  libelleSansObjet,
  phraseDeLaReponseEnPlace,
  phraseDeSecondRenforcement,
  piedDuPointRepondu,
  questionDuPoint,
  repliqueDuPoint,
  type PointRepondu,
  type ReponseDuPoint,
} from '@/types/checkin';

export type EngagementCheckin = {
  id: string;
  loop_type: LoopType;
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
//   - `22023` (`invalid_parameter_value`) : la génération de la période suivante a clos le point
//     pendant que la carte restait affichée — le cas du retour de notification —, ou, depuis que la
//     réponse se corrige (`v1-33` §6), le point est répondu et sa période passée.
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
// `emphasize` désigne le point à regarder d'abord, sans jamais masquer l'autre : la question de
// l'action engagée quand deux points sont ouverts (`v1-33` §6, tranché le 01/10/2026), le poste
// dominant sinon — la recommandation du 27/08/2026, les deux boucles restant proposées. La carte ne
// le décide pas : l'écran le lit dans `accentDesPoints` (`src/types/checkin.ts`).
export function CheckinCard({
  checkin,
  emphasize,
  actionEngagee,
  historique,
  boucleTourne,
}: {
  checkin: EngagementCheckin;
  emphasize: boolean;
  /**
   * La boucle de ce point tourne-t-elle encore (`laBoucleDuPointTourne`, `src/types/rappels.ts`) ?
   * Une fois la carte répondue, elle décide si le pied et la réplique ont le droit de donner
   * rendez-vous (décision du 30/09/2026, `v1-27` §12.23). **Obligatoire** : un défaut ferait promettre
   * en silence à l'écran qui oublierait de la passer.
   */
  boucleTourne: boolean;
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
  /**
   * La réponse donnée ici, son instant, et ce que la ligne portait au moment du geste
   * (`responded_at`). Elle vaut **tant que la ligne n'a pas été relue** — tant qu'elle porte encore ce
   * qu'elle portait au geste — et la ligne l'emporte ensuite (voir `reponse` et `pied`, plus bas).
   */
  const [geste, setGeste] = useState<{
    reponse: ReponseDuPoint;
    instant: string;
    ligneAvant: string | null;
  } | null>(null);
  /** Le point n'accepte plus de réponse : la question reste lisible, les boutons partent. */
  const [refus, setRefus] = useState<string | null>(null);
  /** La réponse n'est pas partie : les boutons restent, il n'y a qu'à recommencer. */
  const [erreur, setErreur] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /**
   * **La réponse se corrige jusqu'au point suivant** (`v1-33` §6, décidé le 02/10/2026 avec la personne
   * qui pilote). « Non » et « Oui » sont à 8 px l'un de l'autre, et un toucher erroné était définitif.
   * « Modifier ma réponse » rouvre les trois réponses sur la carte répondue — tant qu'elle est affichée,
   * c'est-à-dire tant que le point est celui de la période interrogée, la borne même que le RPC vérifie.
   */
  const [correction, setCorrection] = useState(false);
  /** Les réponses données ici : chacune rend le focus à la réplique, même une correction identique. */
  const [reponsesDonnees, setReponsesDonnees] = useState(0);

  /**
   * **La réplique prend le focus quand elle remplace les boutons** (24/09/2026, `v1-29`). La carte
   * retirait « Oui », « Non » et le lien au moment même où l'un d'eux venait d'être touché, sans
   * rien annoncer : au clavier, le focus retombait en haut de la page ; au lecteur d'écran, le mot
   * de Ramille — la seule trace que la réponse est partie — n'était jamais lu.
   *
   * **Seulement sur une réponse donnée ici**, jamais au montage : une carte déjà répondue qu'on
   * retrouve en revenant sur le plan n'a volé le focus à personne, et le prendre au chargement
   * ferait sauter l'écran de quiconque ouvre le plan.
   */
  const replique = useRef<View>(null);
  useEffect(() => {
    if (reponsesDonnees > 0) donnerLeFocus(replique.current);
  }, [reponsesDonnees]);

  /**
   * **Le focus suit la correction, dans les deux sens** (la règle d'`ActionCommitment`) : à la question
   * quand « Modifier ma réponse » rouvre les réponses — le lien disparaît sous le doigt —, et au lien
   * revenu quand « Annuler » les referme. Seulement après un geste, jamais au montage.
   */
  const laQuestion = useRef<unknown>(null);
  const leLienModifier = useRef<View>(null);
  const gesteDeCorrection = useRef<'ouvrir' | 'annuler' | null>(null);
  useEffect(() => {
    const vient = gesteDeCorrection.current;
    gesteDeCorrection.current = null;
    if (vient === 'ouvrir' && correction) donnerLeFocus(laQuestion.current);
    if (vient === 'annuler' && !correction) donnerLeFocus(leLienModifier.current);
  }, [correction]);

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
  //
  // **Et pas plus longtemps, depuis que la réponse se corrige** (`v1-33` §6, contre-lecture du
  // 02/10/2026) : une ligne répondue ne changeait plus, donc l'état local la valait pour toujours. Une
  // correction faite ailleurs — l'autre appareil, l'autre onglet — se relit maintenant sur une carte
  // restée montée : la ligne l'emporte dès qu'elle ne porte plus ce qu'elle portait au geste.
  const gesteEnCours = geste !== null && checkin.responded_at === geste.ligneAvant ? geste : null;
  const reponse = gesteEnCours?.reponse ?? genreDeReponse(checkin.response_kind);
  // **Le pied daté arrive avec la réponse** (audit P-10, 01/10/2026). Il se composait sur la ligne
  // seule, donc juste après le geste — `responded_at` encore nul — la carte n'avait pas de « Répondu
  // jeudi. Prochain point : lundi 5 octobre. » : le rendez-vous n'apparaissait qu'au passage suivant
  // sur le plan, la fin du geste ne disant pas quand on se retrouve. Tant que la ligne n'est pas
  // relue, il prend l'instant du geste — pas une date inventée, celle de la réponse ; l'horodatage du
  // serveur le remplace dès la relecture. Les deux ne peuvent différer que d'un jour, autour de
  // minuit.
  // **Et le temps d'une correction** (`v1-33` §6) : la ligne porte encore l'heure de la première
  // réponse, et le pied dirait « Répondu lundi » d'une réponse donnée mercredi. L'instant du geste vaut
  // donc tant que la ligne porte ce qu'elle portait au geste ; relue, elle l'emporte.
  const pied = piedDuPointRepondu(
    gesteEnCours !== null ? { ...checkin, responded_at: gesteEnCours.instant } : checkin,
    boucleTourne
  );

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
  // Le RPC refuse aussi un point expiré par le cron, ou répondu dont la période est passée, là où
  // l'`update` rendait un succès sur zéro ligne : l'erreur remplace une carte qui félicitait pour rien. Un refus ne doit
  // pas pour autant laisser deux boutons morts — c'est la même exigence que le reste du produit
  // (C1.4), et elle se règle ici parce que c'est ici que le refus arrive.
  const answer = async (response: ReponseDuPoint) => {
    if (saving) return;
    setSaving(true);
    setErreur(null);
    const { error, status } = await supabase.rpc('repondre_au_checkin', {
      p_checkin_id: checkin.id,
      p_reponse: response,
    });
    setSaving(false);

    if (!error) {
      setGeste({ reponse: response, instant: new Date().toISOString(), ligneAvant: checkin.responded_at });
      setCorrection(false);
      setReponsesDonnees((n) => n + 1);
      return;
    }

    const refusDuRpc = REFUS_DU_RPC[error.code];
    if (refusDuRpc) {
      setRefus(refusDuRpc);
      return;
    }

    // La connexion n'est nommée que hors ligne (`src/types/ecriture-en-echec.ts`, 02/10/2026).
    setErreur(messageDEcriture('Ta réponse n’est pas partie.', genreDeLEchec(status)));
  };

  return (
    // **L'accent tombe une fois répondu** (v1-14 §4.1) : il sert à désigner la question à regarder
    // d'abord parmi plusieurs cartes, et une question déjà refermée n'a plus rien à désigner.
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
      {/* **La réplique apparaît au lieu de remplacer la question d'un coup** (27/09/2026, `v1-30`
          §5.7) : la carte passe de la hauteur de la question à celle de la réplique
          (`HauteurSuivie`), donc le plan de dessous suit au lieu de sauter — sur web ; posé sur Android
          depuis le 03/10/2026 (`hauteurSAnime`) —, et la réplique apparaît en fondu. Un point déjà répondu à l'arrivée sur le plan n'a pas d'apparition à soi
          (`SansApparitionAuMontage`). Le focus part au geste, sans attendre le fondu — ce
          qu'`entering` de reanimated empêchait sur web en masquant la réplique (`src/lib/mouvement.tsx`). */}
      <HauteurSuivie styleDuContenu={styles.corps}>
      <SansApparitionAuMontage>
      {reponse === null || correction ? (
        <>
          {/* **La question vient de `src/types/checkin.ts`, et c'est la même qu'au rappel.**
              Elle vivait ici, au présent et avec le libellé snapshoté collé après la préposition :
              « As-tu changé de mode de transport au moins une fois cette semaine pour Trajet
              domicile-travail (Voiture thermique) ? ». Le rappel, lui, disait déjà « La semaine
              dernière, as-tu changé de mode de transport pour ton trajet domicile-travail ? ».
              Deux phrases pour une seule question, sur un produit dont la boucle entière consiste
              à appuyer sur la notification pour y répondre. */}
          <ThemedText
            weight={600}
            style={styles.question}
            {...({ ref: laQuestion, ...FOCALISABLE_PAR_PROGRAMME } as TitreFocalisable)}
          >
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
          {/* La réponse en place, quand « Modifier ma réponse » rouvre les trois : les boutons n'ont pas
              d'état « choisi », et c'est voulu — la phrase la désigne, dans leurs mots. */}
          {correction && reponse !== null && (
            <ThemedText type="small" themeColor="textTertiary">
              {phraseDeLaReponseEnPlace(checkin, reponse)}
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
                    mémoire au moment du geste. Le hint la rappelle sur chaque bouton.

                    **Les deux au même poids** (24/09/2026, `v1-29`) : « Oui » était un bouton vert
                    plein, « Non » un bouton gris — la carte désignait la bonne réponse avant qu'on
                    la donne. Aucune des deux n'est un échec, comme dans le suivi, où « Changement
                    fait » et « Pas cette fois » sont au même niveau typographique. */}
                <Button
                  title="Non"
                  variant="secondary"
                  onPanel
                  onPress={() => answer('non')}
                  disabled={saving}
                  flex
                  accessibilityHint={`Répondre non pour ${formeInserable(checkin.poste, checkin.loop_type)}`}
                />
                <Button
                  title="Oui"
                  variant="secondary"
                  onPanel
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
                  propose à égalité avec les deux autres. `TextLink` porte la cible tactile
                  (`ControlHeight.target`) sans déplacer le texte, et son libellé accessible **est**
                  le texte affiché.

                  **Souligné au repos** (audit P-7, 01/10/2026), comme les autres liens tertiaires
                  du plan — « Annuler », « Changer d'avis », « Modifier ma réponse » : sans soulignement, il se
                  lisait comme une légende sous « Non » et « Oui », et la réponse honnête d'une
                  semaine de congés passait pour du texte. Il reste discret — tertiaire, petit,
                  centré —, bien en deçà d'un bouton. */}
              <TextLink
                label={libelleSansObjet(checkin)}
                apparence="souligne"
                onPress={() => answer('sans_objet')}
                disabled={saving}
                containerStyle={styles.sansObjet}
                hint={`Aucune occasion pour ${formeInserable(checkin.poste, checkin.loop_type)} sur cette période`}
              />
              {/* Les boutons restent actifs : l'échec est une panne, pas un refus. */}
              <MessageInline message={erreur} />
            </>
          )}
          {/* « Annuler » referme sans rien changer, même après un refus : la réponse en place tient. Le refus
              et l'erreur restent dans l'état, invisibles sur la carte répondue — « Modifier ma réponse »
              les efface en rouvrant. */}
          {correction && (
            <TextLink
              label="Annuler"
              apparence="souligne"
              onPress={() => {
                gesteDeCorrection.current = 'annuler';
                setCorrection(false);
              }}
              disabled={saving}
              containerStyle={styles.sansObjet}
            />
          )}
        </>
      ) : (
        <Apparition style={styles.repondu}>
          {/* **Un point de maintien ne reçoit jamais `checkinNon`** (C2.5) : cette réplique console
              d'un échec, et répondre « non » à « ton trajet s'est-il fait à vélo ? » n'en est pas
              un. Même raison pour `sans_objet`, qui reçoit une attente et non une relance (C2.4).
              Le choix se fait dans `repliqueDuPoint`, avec son test, plutôt qu'en ternaire ici.

              **Le conteneur reçoit le focus après une réponse donnée ici** (cf. `replique`,
              `donnerLeFocus`) : `FOCALISABLE_PAR_PROGRAMME` le rend focalisable sur web sans l'ajouter
              à l'ordre de tabulation, et `accessible` en fait un seul nœud sur natif — le visage est
              masqué, la phrase est lue, et le focus natif trouve un nœud à viser. */}
          <View ref={replique} accessible {...FOCALISABLE_PAR_PROGRAMME}>
            <RamilleDit {...repliqueDuPoint(checkin, reponse, boucleTourne)} />
          </View>
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
          {/* **Modifier ma réponse** (`v1-33` §6, 02/10/2026) : souligné, tertiaire, comme « Changer
              d'avis » — un lien et non un bouton, la réponse reste donnée. Il rouvre les trois réponses ;
              la carte n'est affichée que le temps de la période interrogée, la borne de la correction. */}
          <TextLink
            ref={leLienModifier}
            label="Modifier ma réponse"
            apparence="souligne"
            hint="Rouvre les trois réponses de ce point"
            onPress={() => {
              gesteDeCorrection.current = 'ouvrir';
              setRefus(null);
              setErreur(null);
              setCorrection(true);
            }}
          />
        </Apparition>
      )}
      </SansApparitionAuMontage>
      </HauteurSuivie>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.card, padding: 18, gap: 10 },
  // Le même écart que la carte : la question, ses boutons, la réplique et son pied en étaient des
  // enfants directs, avant que `HauteurSuivie` ne les enveloppe.
  corps: { gap: 10 },
  repondu: { gap: 10 },
  question: { fontSize: 16, lineHeight: 23 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  // Centré sous les deux boutons : le lien doit se lire comme une sortie commune aux deux, pas
  // comme une suite du bouton de gauche.
  sansObjet: { alignItems: 'center' },
});
