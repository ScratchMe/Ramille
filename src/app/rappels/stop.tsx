import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CONTACT_EMAIL } from '@/constants/editeur';
import { APP_NAME } from '@/constants/produit';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useApresHydratation } from '@/hooks/use-apres-hydratation';
import { couperLesRappels } from '@/lib/desinscription';
import { donnerLeFocus, FOCALISABLE_PAR_PROGRAMME, type TitreFocalisable } from '@/lib/focus';
import { garderLeJeton, oublierLeJeton, relireLeJetonGarde } from '@/lib/jeton-de-desinscription';
import {
  etatApres,
  etatDeLaPage,
  jetonDuLien,
  phraseDeLaPanne,
  type EtatDesinscription,
} from '@/types/desinscription';
import type { GenreDEchec } from '@/types/lecture-en-echec';

// Sortie des rappels par le lien d'un email — C2.9 (#127), arbitrage D8, constats C-4 et A9-21.
//
// **Pourquoi une page et pas un réglage de plus.** Un compte rattaché qui a désinstallé l'app
// recevait 52 emails par an, indéfiniment : la purge ne touche que les sessions anonymes, et la
// seule sortie offerte demandait de rouvrir l'application — celle qui venait d'être supprimée.
// Sur un appareil neuf, cette consigne était pire qu'inutile : elle réglait la préférence de la
// session anonyme vide que l'ouverture venait de créer, donc sans aucun effet sur les rappels que
// la personne voulait arrêter.
//
// **Aucune session n'est demandée, et c'est le jeton qui autorise.** Il vit sur la ligne de la
// boîte d'envoi, il ne sert qu'une fois, et il ne peut rien d'autre que couper les rappels du
// compte qui a reçu ce message-là. La dérivation est dans `src/types/desinscription.ts`.
//
// **Et la page demande le geste au lieu de le faire** (04/10/2026, décision de la personne qui
// pilote) : elle coupait les rappels dès son ouverture, et l'analyseur de liens d'une messagerie
// professionnelle, qui ouvre les liens pour les inspecter, les coupait sans que personne ait
// cliqué. Le RPC ne part plus qu'au toucher de « Couper mes rappels » (`etatDeLaPage`).
//
// **Pas de mascotte ici, et c'est un choix.** Ramille accompagne ; cette page est le moment où
// quelqu'un s'en va. Un visage à cet endroit se lirait comme une tentative de retenir, et le
// produit ne fait pas ça. Les trois phrases sont de la voix produit : un fait, puis ce qui ne
// change pas, puis comment revenir si on veut.
//
// **Le chemin n'a volontairement pas d'enfants**, donc l'export le produit en fichier plat
// (`rappels/stop.html`) et non en répertoire : sans `cleanUrls` dans `vercel.json`, `/rappels/stop`
// répondrait 404 en production sans que rien ne le signale — exactement ce qui était arrivé à
// `/bilan/resultat`. Son titre est dans `PAGE_TITLES` et `scripts/verifier-titres-export.mjs` le
// vérifie dans `dist/`, `scripts/verifier-rendu-export.mjs` ouvre la route dans un navigateur.
//
// Conséquence connue et assumée : comme toute page du produit, l'ouvrir crée une session anonyme
// (`ensureSession` dans le layout racine). Elle ne sert à rien ici — le RPC agit sur le
// propriétaire du jeton, jamais sur l'appelant — et `purge_stale_anonymous_accounts()` la reprend
// après quatre-vingt-dix jours d'inactivité.
export default function StopRappels() {
  const { jeton: brut } = useLocalSearchParams<{ jeton?: string | string[] }>();
  const duLien = jetonDuLien(brut);
  // **Le jeton est lu une fois, puis retiré de l'adresse** (06/10/2026, seconde passe de sécurité) :
  // il restait dans l'historique, dans le `Referer` de nos propres requêtes et à portée de tout
  // script de la page (`src/lib/jeton-de-desinscription.ts`). Celui du lien passe d'abord ; sans
  // lien, celui que l'onglet a gardé, pour qu'un rechargement ne dise pas « plus valable » à qui
  // n'a rien coupé. `null` tant que ce n'est pas fait, et la page attend alors comme avant
  // l'hydratation : rien n'affirme l'absence d'un jeton qu'on n'a pas encore cherché.
  const [retenu, setRetenu] = useState<{ jeton: string | null } | null>(null);
  useEffect(() => {
    if (retenu) return;
    let annule = false;
    if (duLien) garderLeJeton(duLien);
    const jetonRetenu = duLien ?? jetonDuLien(relireLeJetonGarde() ?? undefined);
    // Écrit après une promesse, hors du corps de l'effet : même motif que la racine (`index.tsx`),
    // que le React Compiler exige (`react-hooks/set-state-in-effect`).
    void Promise.resolve().then(() => {
      if (annule) return;
      setRetenu({ jeton: jetonRetenu });
      // **Retenu d'abord, retiré de l'adresse ensuite**, dans le même lot de rendus : retirer le
      // paramètre change `duLien` et relance cet effet, qui annulait l'écriture encore en vol — la
      // page ne tenait plus alors qu'au `sessionStorage`, et un stockage bloqué lui faisait dire
      // « plus valable » dès l'ouverture (mesuré le 06/10/2026). Et par les paramètres de la route,
      // pas par `history.replaceState` : la navigation réécrit l'adresse depuis son propre état, et
      // y remettait le jeton juste après.
      if (duLien) router.setParams({ jeton: undefined });
    });
    return () => {
      annule = true;
    };
  }, [duLien, retenu]);
  const jeton = retenu?.jeton ?? null;
  // Le geste de la personne : rien ne part avant (`etatDeLaPage`).
  const [demandee, setDemandee] = useState(false);
  // La réponse du serveur pour l'essai en cours, `null` tant qu'elle n'est pas arrivée.
  const [reponse, setReponse] = useState<EtatDesinscription | null>(null);
  // Une clé d'essai plutôt qu'un second chemin d'appel : même idiome que les deux écrans
  // d'onglet. Arriver puis réessayer lance deux appels et rien ne garantit l'ordre des réponses —
  // chaque nouvelle clé démonte l'effet précédent, donc seul le dernier lancé écrit.
  const [essai, setEssai] = useState(0);
  // Le genre de la dernière panne : la phrase ne parle de connexion que hors ligne (02/10/2026).
  const [genreDeLaPanne, setGenreDeLaPanne] = useState<GenreDEchec>('serveur');

  useEffect(() => {
    if (!jeton || !demandee) return;
    let annule = false;
    couperLesRappels(jeton).then((resultat) => {
      if (annule) return;
      if (!resultat.ok) setGenreDeLaPanne(resultat.genre);
      const suite = etatApres(resultat);
      // Le serveur a répondu sur ce jeton — coupé, ou refusé : il ne servira plus. Une panne le
      // garde, pour « Réessayer » comme pour un rechargement.
      if (suite !== 'panne') oublierLeJeton();
      setReponse(suite);
    });
    return () => {
      annule = true;
    };
  }, [jeton, demandee, essai]);

  // **Avant l'hydratation, la page demande le geste, jamais « ce lien n'est plus valable »**
  // (24/09/2026, `v1-29` ; « un instant » jusqu'au 04/10/2026). L'état se déduisait du jeton dès le
  // premier rendu, or l'export statique ne connaît pas la chaîne de requête : il rendait donc l'état
  // sans jeton, « Ce lien n'est plus valable — il ne sert qu'une fois », et c'est ce que lisait
  // **tout le monde** en ouvrant le lien d'un rappel, le temps que l'app démarre — puis React
  // constatait l'écart et jetait la page (erreur n° 418, relevée sur l'export). L'état de départ est
  // celui qui n'affirme rien de faux à qui arrive par le lien, c'est-à-dire presque tout le monde ;
  // sans jeton, la page le dit une fois hydratée (`EXPO.md` §2.2, `useApresHydratation`).
  const apresHydratation = useApresHydratation();
  const pret = apresHydratation && retenu !== null;
  const etat = etatDeLaPage({ apresHydratation: pret, jeton, demandee, reponse });

  // **Le focus suit le geste** (04/10/2026, seconde passe de la revue finale, `FRONT.md` §2.4) :
  // « Couper mes rappels » sort de l'arbre au toucher, « Réessayer » aussi, et le focus retombait
  // sur le document — rien n'annonçait « Un instant », ni « C'est fait », ni la panne. Il va à la
  // première phrase de ce qui arrive, et seulement après le geste : avant, un état qui change est
  // l'hydratation, que personne n'a demandée. Une seule référence suffit, un bloc à la fois.
  const premierePhrase = useRef<unknown>(null);
  useEffect(() => {
    if (demandee) donnerLeFocus(premierePhrase.current);
  }, [etat, demandee]);
  const focalisable = { ref: premierePhrase, ...FOCALISABLE_PAR_PROGRAMME } as TitreFocalisable;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.page}>
            <ThemedText type="small" themeColor="textTertiary">
              {APP_NAME}
            </ThemedText>
            <ThemedText type="display">Ne plus recevoir de rappels</ThemedText>

            {etat === 'a-confirmer' && (
              <>
                {/* Ce que le geste fera, puis ce qu'il ne touche pas — avant, et non après : un
                    lien de désinscription qui ne le précise pas laisse craindre d'effacer son
                    compte. Un seul bouton, le geste lui-même. */}
                <ThemedText themeColor="textSecondary" style={styles.corps}>
                  Tu ne recevras plus de rappels, ni par email ni par notification. Ton compte, tes
                  bilans et ton plan ne changent pas.
                </ThemedText>
                {/* Inerte jusqu'à l'hydratation, et il le montre : le HTML statique rendait un
                    bouton d'apparence active, sans gestionnaire — sur un réseau lent, les touchers
                    se perdaient sans un mot. Même rendu des deux côtés, donc pas d'écart (418). */}
                <Button
                  title="Couper mes rappels"
                  disabled={!pret}
                  onPress={() => setDemandee(true)}
                />
              </>
            )}

            {etat === 'en-cours' && (
              <ThemedText themeColor="textSecondary" style={styles.corps} {...focalisable}>
                Un instant, on coupe tes rappels.
              </ThemedText>
            )}

            {etat === 'coupes' && (
              <>
                <ThemedText themeColor="textSecondary" style={styles.corps} {...focalisable}>
                  C’est fait : tu ne recevras plus de rappels, ni par email ni par notification.
                </ThemedText>
                {/* Ce que la personne n'a pas demandé reste intact, et il faut le dire : un lien
                    de désinscription qui ne le précise pas laisse craindre d'avoir effacé son
                    compte. */}
                <ThemedText themeColor="textSecondary" style={styles.corps}>
                  Ton compte, tes bilans et ton plan ne changent pas. Tu peux rouvrir les rappels
                  quand tu veux depuis « Toi » dans l’application.
                </ThemedText>
              </>
            )}

            {etat === 'lien-invalide' && (
              <>
                {/* Un jeton inconnu, déjà utilisé ou purgé aboutissent ici, et un lien tronqué
                    aussi : la page ne laisse pas deviner si un jeton a existé (même registre que
                    `/connexion/retrouver`). Après le geste, si le serveur refuse le jeton. */}
                <ThemedText themeColor="textSecondary" style={styles.corps} {...focalisable}>
                  Ce lien n’est plus valable — il ne sert qu’une fois.
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.corps}>
                  Si tes rappels arrivent encore, le lien du prochain message fonctionnera. Tu peux
                  aussi les couper depuis « Toi » dans l’application.
                </ThemedText>
              </>
            )}

            {etat === 'panne' && (
              <>
                {/* « N'a pas abouti » et non « n'est pas partie » : la demande a bien quitté le
                    navigateur, et le geste à faire est le même dans les deux cas. */}
                <ThemedText themeColor="textSecondary" style={styles.corps} {...focalisable}>
                  {phraseDeLaPanne(genreDeLaPanne)}
                </ThemedText>
                {/* Le passage par « en cours » se fait **ici**, dans le gestionnaire du bouton :
                    sans lui, un second échec rendrait exactement le même écran et le bouton
                    aurait l'air mort. */}
                {jeton && (
                  <Button
                    title="Réessayer"
                    onPress={() => {
                      setReponse(null);
                      setEssai((n) => n + 1);
                    }}
                  />
                )}
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
  pied: { marginTop: Spacing.four },
});
