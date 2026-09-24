import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { etatApres, jetonDuLien, type EtatDesinscription } from '@/types/desinscription';

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
  const jeton = jetonDuLien(brut);
  // La réponse du serveur pour l'essai en cours, `null` tant qu'elle n'est pas arrivée.
  const [reponse, setReponse] = useState<EtatDesinscription | null>(null);
  // Une clé d'essai plutôt qu'un second chemin d'appel : même idiome que les deux écrans
  // d'onglet. Arriver puis réessayer lance deux appels et rien ne garantit l'ordre des réponses —
  // chaque nouvelle clé démonte l'effet précédent, donc seul le dernier lancé écrit.
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    if (!jeton) return;
    let annule = false;
    couperLesRappels(jeton).then((resultat) => {
      if (!annule) setReponse(etatApres(resultat));
    });
    return () => {
      annule = true;
    };
  }, [jeton, essai]);

  // **Avant l'hydratation, la page dit « un instant », jamais « ce lien n'est plus valable »**
  // (24/09/2026, `v1-29`). L'état se déduisait du jeton dès le premier rendu, or l'export statique
  // ne connaît pas la chaîne de requête : il rendait donc l'état sans jeton, « Ce lien n'est plus
  // valable — il ne sert qu'une fois », et c'est ce que lisait **tout le monde** en ouvrant le lien
  // d'un rappel, le temps que l'app démarre — puis React constatait l'écart et jetait la page
  // (erreur n° 418, relevée sur l'export). L'état de départ est désormais celui qui n'affirme rien
  // de faux à qui arrive par le lien, c'est-à-dire presque tout le monde ; sans jeton, la page le
  // dit une fois hydratée (`EXPO.md` §2.2, `useApresHydratation`).
  const apresHydratation = useApresHydratation();
  const etat: EtatDesinscription = !apresHydratation
    ? 'en-cours'
    : jeton === null
      ? 'lien-invalide'
      : (reponse ?? 'en-cours');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.page}>
            <ThemedText type="small" themeColor="textTertiary">
              {APP_NAME}
            </ThemedText>
            <ThemedText type="title" weight={600} style={styles.titre}>
              Ne plus recevoir de rappels
            </ThemedText>

            {etat === 'en-cours' && (
              <ThemedText themeColor="textSecondary" style={styles.corps}>
                Un instant, on coupe tes rappels.
              </ThemedText>
            )}

            {etat === 'coupes' && (
              <>
                <ThemedText themeColor="textSecondary" style={styles.corps}>
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
                    `/connexion/retrouver`). */}
                <ThemedText themeColor="textSecondary" style={styles.corps}>
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
                <ThemedText themeColor="textSecondary" style={styles.corps}>
                  Ta demande n’a pas abouti. Vérifie ta connexion et réessaie : tes rappels ne sont
                  pas encore coupés.
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
  titre: { fontSize: 32, lineHeight: 38, letterSpacing: -0.64 },
  corps: { fontSize: 16, lineHeight: 24 },
  pied: { marginTop: Spacing.four },
});
