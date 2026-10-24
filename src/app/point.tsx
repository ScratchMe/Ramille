import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CheckinCard, type EngagementCheckin } from '@/components/checkin-card';
import { LigneDAttente } from '@/components/ligne-d-attente';
import { TextLink } from '@/components/text-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CONTACT_EMAIL } from '@/constants/editeur';
import { APP_NAME } from '@/constants/produit';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useApresHydratation } from '@/hooks/use-apres-hydratation';
import { donnerLeFocus, FOCALISABLE_PAR_PROGRAMME, type TitreFocalisable } from '@/lib/focus';
import { gardeDuJetonPourLOnglet } from '@/lib/jeton-de-l-onglet';
import { lireLePointDuLien, repondreParLeLien } from '@/lib/reponse-par-le-lien';
import { STATUT_DU_POINT } from '@/types/checkin';
import { jetonDuLien } from '@/types/desinscription';
import {
  etatDeLaPageDuPoint,
  jetonDuPoint,
  phraseDeLaLectureDuPoint,
  reponseDuLien,
  type LectureDuPoint,
  type PointDuLien,
} from '@/types/reponse-par-le-lien';

// Répondre au point depuis l'e-mail — étape 6b de `docs/architecture/v1-35-l-audit-en-chantiers.md`
// (24/10/2026). L'e-mail du point porte trois liens, « Oui », « Non » et la troisième réponse, vers
// `/point?reponse=…&jeton=…` ; cette page les reçoit.
//
// **Pourquoi une page sans compte.** Le rappel ne menait qu'au plan, et le plan demande la session du
// compte : sur un autre appareil, un autre navigateur, ou un téléphone sans l'app, répondre voulait dire
// retrouver son compte par un code reçu… par e-mail. Le jeton du message autorise à lire la question de
// ce point et à y répondre (`le_point_du_lien`, `repondre_par_le_lien`), et rien d'autre.
//
// **La page demande le geste, elle ne le fait pas** (la leçon de `/rappels/stop`, 04/10/2026) :
// l'analyseur de liens d'une messagerie ouvre les trois liens pour les inspecter. La lecture part à
// l'ouverture — elle n'a pas d'effet —, la réponse au toucher d'« Envoyer ma réponse », sur la carte du
// point elle-même (`reponseProposee`, `repondre`) : la même question, les mêmes réponses, la même
// réplique de Ramille et la même ligne des kilos que sur le plan.
//
// **Une surface sans compte** (`laSessionSOuvreSur`, `src/types/session.ts`) : l'ouvrir ne crée pas de
// session, et ce n'est pas un chemin que l'app revendique sur Android (le `pathPrefix` est `/plan`) —
// le lien s'ouvre dans le navigateur, là où il marche sans rien d'autre. Le lien « Ou ouvre ton plan »
// de l'e-mail reste celui qui ouvre l'app.
//
// **Le chemin n'a pas d'enfants**, donc l'export le produit en fichier plat (`point.html`), servi par
// `cleanUrls` (`VERCEL.md` §1.5). Son titre est dans `PAGE_TITLES`, sans description : la page est en
// `noindex`, comme `/rappels/stop`.

/** Le jeton de cette page, gardé pour l'onglet sous sa propre clé (`src/lib/jeton-de-l-onglet.ts`). */
const JETON_DE_LA_PAGE = gardeDuJetonPourLOnglet('ramille.jeton-de-reponse');

/**
 * La carte du point, composée sur ce que le lien a lu. **`id` porte le jeton** : la page n'a pas
 * l'identifiant du point — la lecture ne le rend pas — et n'en a pas besoin, puisqu'elle répond par le
 * jeton (`repondre`). La question est celle du message ; l'action suivie aujourd'hui n'est pas connue
 * ici, donc la carte ne dit pas « l'action que tu suivais alors ».
 */
function carteDuPoint(jeton: string, point: PointDuLien): EngagementCheckin {
  return {
    id: jeton,
    loop_type: point.loop_type,
    period_label: point.period_label,
    trip_label: point.trip_label,
    poste: point.poste,
    question_kind: point.question_kind,
    mode: point.mode,
    period_start: point.period_start,
    committed_question: point.question,
    committed_action_text: null,
    committed_saving_kg_once: point.committed_saving_kg_once,
    // Ouvert, le serveur rend toujours l'état ; la carte ne se compose que pour un point ouvert.
    status: point.status ?? STATUT_DU_POINT.enAttente,
    response_kind: point.response_kind,
    responded_at: point.responded_at,
  };
}

export default function RepondreAuPoint() {
  const { jeton: brut, reponse } = useLocalSearchParams<{
    jeton?: string | string[];
    reponse?: string | string[];
  }>();
  const duLien = jetonDuLien(brut);
  const reponseProposee = reponseDuLien(reponse);

  // **Le jeton est lu une fois, puis retiré de l'adresse s'il a pu être gardé pour l'onglet** — le
  // mécanisme de `/rappels/stop`, et pour les mêmes raisons (`src/lib/jeton-de-l-onglet.ts`,
  // `src/lib/jeton-de-desinscription.ts`) : le `Referer` des requêtes qui suivent, l'historique de
  // l'onglet, et un rechargement qui ne doit pas dire « plus valable ». Capté au premier passage de
  // l'effet, que retirer le paramètre relance — avec le fait que l'adresse en portait un : un lien abîmé ne
  // retombe pas sur le jeton d'un autre e-mail (`jetonDuPoint`).
  const [retenu, setRetenu] = useState<{ jeton: string | null } | null>(null);
  const jetonCapte = useRef<{ parametre: string | string[] | undefined; duLien: string | null } | undefined>(
    undefined
  );
  useEffect(() => {
    if (retenu) return;
    let annule = false;
    if (jetonCapte.current === undefined) jetonCapte.current = { parametre: brut, duLien };
    const duPremierLien = jetonCapte.current.duLien;
    const garde = duPremierLien ? JETON_DE_LA_PAGE.garder(duPremierLien) : false;
    const jetonRetenu = jetonDuPoint(jetonCapte.current.parametre, duPremierLien, JETON_DE_LA_PAGE.relire());
    void Promise.resolve().then(() => {
      if (annule) return;
      setRetenu({ jeton: jetonRetenu });
      if (garde) router.setParams({ jeton: undefined });
    });
    return () => {
      annule = true;
    };
  }, [brut, duLien, retenu]);
  const jeton = retenu?.jeton ?? null;

  // La lecture du point : sans effet, elle part dès que le jeton est retenu. Une clé d'essai pour
  // « Réessayer », l'idiome des écrans d'onglet : seul le dernier appel lancé écrit.
  const [lecture, setLecture] = useState<LectureDuPoint | null>(null);
  const [essai, setEssai] = useState(0);
  // « Réessayer » a été touché : la ligne d'attente se dit tout de suite, et le focus suit ce qui arrive.
  const [relance, setRelance] = useState(false);
  useEffect(() => {
    if (!jeton) return;
    let annule = false;
    lireLePointDuLien(jeton).then((resultat) => {
      if (annule) return;
      // Un jeton que le serveur ne connaît pas ne servira plus : l'onglet l'oublie. Une panne le garde,
      // « Réessayer » et un rechargement en ont besoin.
      if (resultat.ok && resultat.point === null) JETON_DE_LA_PAGE.oublier();
      setLecture(resultat);
    });
    return () => {
      annule = true;
    };
  }, [jeton, essai]);

  // Avant l'hydratation et tant que le jeton n'est pas cherché, la page charge : c'est ce que dit le HTML
  // statique à tout le monde, et c'est vrai pour qui arrive par le lien (`etatDeLaPageDuPoint`).
  const pret = useApresHydratation() && retenu !== null;
  const etat = etatDeLaPageDuPoint({ pret, jeton, lecture });

  // **Le focus suit « Réessayer »**, qui sort de l'arbre sous le doigt : il va à la première phrase de ce
  // qui arrive — au titre quand c'est la carte, qui porte ses propres cibles. Jamais à l'ouverture : un
  // état qui change là est l'hydratation ou la lecture, que personne n'a demandées.
  const premierePhrase = useRef<unknown>(null);
  const titre = useRef<unknown>(null);
  useEffect(() => {
    if (!relance || etat === 'chargement') return;
    donnerLeFocus(etat === 'ouvert' ? titre.current : premierePhrase.current);
  }, [etat, relance]);
  const focalisable = { ref: premierePhrase, ...FOCALISABLE_PAR_PROGRAMME } as TitreFocalisable;

  const point = lecture?.ok ? lecture.point : null;
  const ouvrirLePlan = (
    // Le chemin du lien « Ou ouvre ton plan » de l'e-mail : sans bilan sur cet appareil, le plan propose
    // de retrouver son compte (C2.11). Quitter la page ouvre la session, comme depuis `/rappels/stop`.
    <TextLink
      label="Ouvrir mon plan"
      apparence="discret"
      onPress={() => router.push({ pathname: '/plan', params: { rappel: '1' } })}
    />
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.page}>
            <ThemedText type="small" themeColor="textTertiary">
              {APP_NAME}
            </ThemedText>
            <ThemedText
              type="display"
              {...({ ref: titre, ...FOCALISABLE_PAR_PROGRAMME } as TitreFocalisable)}
            >
              Ton point
            </ThemedText>

            {etat === 'chargement' && (
              // Une page qu'on ouvre à froid par son adresse : le HTML statique porte la ligne pendant que
              // le JavaScript arrive, la règle de la restitution (`LigneDAttente`, `immediate`).
              <LigneDAttente immediate demandee={relance}>
                Chargement de ta question…
              </LigneDAttente>
            )}

            {etat === 'ouvert' && jeton && point && (
              <>
                <CheckinCard
                  checkin={carteDuPoint(jeton, point)}
                  emphasize={false}
                  boucleTourne={point.boucle_tourne}
                  reponseProposee={reponseProposee}
                  repondre={(r) => repondreParLeLien(jeton, r)}
                />
                {ouvrirLePlan}
              </>
            )}

            {etat === 'clos' && point && (
              <>
                {/* La question reste lisible, et rien d'autre : passé la période, la lecture ne rend ni la
                    réponse ni ses kilos (`le_point_du_lien`). La phrase est celle du refus de la carte, sans le
                    rendez-vous — la lecture ne dit plus si la boucle tourne. Plus de boutons : deux boutons
                    qui ne peuvent plus aboutir valent moins qu'une phrase qui dit où en est le point. */}
                <ThemedView type="backgroundElement" style={styles.carte}>
                  <ThemedText type="small" themeColor="textTertiary" weight={600}>
                    {point.period_label}
                  </ThemedText>
                  <ThemedText weight={600} style={styles.question}>
                    {point.question}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" {...focalisable}>
                    Ce point de suivi n’attend plus de réponse.
                  </ThemedText>
                </ThemedView>
                {ouvrirLePlan}
              </>
            )}

            {etat === 'lien-invalide' && (
              <>
                {/* Un jeton inconnu — le message a plus de six mois, le lien a été abîmé en chemin, le compte
                    a été supprimé — et un lien sans jeton aboutissent ici. Rien n'y promet une réponse
                    possible : le point peut être clos depuis longtemps. Le plan reste à un toucher. */}
                <ThemedText themeColor="textSecondary" style={styles.corps} {...focalisable}>
                  Ce lien n’est plus valable.
                </ThemedText>
                {ouvrirLePlan}
              </>
            )}

            {etat === 'panne' && lecture && !lecture.ok && (
              <>
                <ThemedText themeColor="textSecondary" style={styles.corps} {...focalisable}>
                  {phraseDeLaLectureDuPoint(lecture.genre)}
                </ThemedText>
                {/* Le passage par le chargement se fait ici, dans le gestionnaire du bouton
                    (`FRONT.md` §1.2) : sans lui, un second échec rendrait le même écran, et le bouton
                    aurait l'air mort. */}
                <Button
                  title="Réessayer"
                  onPress={() => {
                    setLecture(null);
                    setRelance(true);
                    setEssai((n) => n + 1);
                  }}
                />
              </>
            )}

            <ThemedText type="small" themeColor="textTertiary" style={styles.pied}>
              Une question, ou un blocage ? Écris à {CONTACT_EMAIL}.
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { padding: Spacing.four, paddingBottom: Spacing.six },
  page: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  corps: { fontSize: 16, lineHeight: 24 },
  // Les mesures de la carte du point (`checkin-card.tsx`), pour que le point clos se lise comme elle.
  carte: { borderRadius: Radius.card, padding: 18, gap: 10 },
  question: { fontSize: 16, lineHeight: 23 },
  pied: { marginTop: Spacing.four },
});
