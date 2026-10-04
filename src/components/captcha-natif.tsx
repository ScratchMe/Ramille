// Le captcha Turnstile dans l'app Android : une vue web posée à la demande, par-dessus tout l'écran.
//
// **Monté une fois, à la racine** (`src/app/_layout.tsx`), et branché sur `src/lib/captcha.ts`, qui
// garde les plafonds et la file : ce composant ne décide rien, il pose la vue web qu'on lui demande,
// relaie ses trois issues, et la retire. La page qu'elle charge, et la lecture de ce qu'elle renvoie,
// vivent dans `src/types/captcha-natif.ts`, testées.
//
// **Invisible tant que Cloudflare ne demande rien**, comme sur le web : la vue web tourne dans une
// carte transparente, sous un voile qui laisse passer les touchers. Si Cloudflare demande de cocher,
// la carte prend les couleurs du produit, la phrase s'affiche au-dessus de la case et se dit au
// lecteur d'écran, le clavier se ferme, la pile des écrans se cache au lecteur d'écran (le layout,
// par `signalerLaCaseDuCaptcha`), et le voile retient l'attention. La vue web garde sa place dans l'arbre d'un état
// à l'autre : la déplacer la rechargerait, et relancerait un défi.
//
// Sur web, `captcha-natif.web.tsx` ne rend rien : le web pose son widget lui-même, dans le DOM.
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Keyboard, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ORIGINE_CANONIQUE } from '@/constants/produit';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { brancherLeCaptchaNatif, PHRASE_DE_LA_CASE, signalerLaCaseDuCaptcha, type DemandeNative } from '@/lib/captcha';
import { lireMessageDuCaptcha, pageDuCaptcha } from '@/types/captcha-natif';

type DemandeEnCours = { numero: number; demande: DemandeNative };

let numeroSuivant = 0;

export function CaptchaNatif() {
  const theme = useTheme();
  const [enCours, setEnCours] = useState<DemandeEnCours | null>(null);
  const [aCocher, setACocher] = useState(false);

  useEffect(
    () =>
      brancherLeCaptchaNatif((demande) => {
        numeroSuivant += 1;
        const numero = numeroSuivant;
        setACocher(false);
        setEnCours({ numero, demande });
        return () => {
          setEnCours((courante) => (courante?.numero === numero ? null : courante));
          setACocher(false);
          signalerLaCaseDuCaptcha(false);
        };
      }),
    []
  );

  if (!enCours) return null;
  const { numero, demande } = enCours;

  const surMessage = (evenement: WebViewMessageEvent) => {
    const message = lireMessageDuCaptcha(evenement.nativeEvent.data);
    if (!message) return;
    if (message.type === 'jeton') {
      demande.jeton(message.jeton);
    } else if (message.type === 'erreur') {
      demande.erreur();
    } else {
      // Le clavier d'un écran de code reste ouvert au toucher (`keyboardShouldPersistTaps`) : en bord à
      // bord, la carte centrée pouvait poser la case dessous.
      Keyboard.dismiss();
      setACocher(true);
      signalerLaCaseDuCaptcha(true);
      AccessibilityInfo.announceForAccessibility(PHRASE_DE_LA_CASE);
      demande.interaction();
    }
  };

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.voile, aCocher && { backgroundColor: theme.scrim }]}
      pointerEvents={aCocher ? 'auto' : 'none'}
      accessibilityViewIsModal={aCocher}
      importantForAccessibility={aCocher ? 'yes' : 'no-hide-descendants'}
    >
      {/* `collapsable={false}` : sans fond ni bordure, la carte serait aplatie par le moteur de rendu, et
          la case montrée la recréerait — la vue web, déplacée, se rechargerait. */}
      <View
        collapsable={false}
        style={[
          styles.carte,
          aCocher && [styles.carteVisible, { backgroundColor: theme.background, borderColor: theme.border }],
        ]}
      >
        {aCocher ? (
          <ThemedText type="body" style={styles.phrase}>
            {PHRASE_DE_LA_CASE}
          </ThemedText>
        ) : null}
        <WebView
          key={numero}
          source={{ html: pageDuCaptcha(demande.cle, demande.usage), baseUrl: ORIGINE_CANONIQUE }}
          originWhitelist={['*']}
          javaScriptEnabled
          onMessage={surMessage}
          onError={() => demande.erreur()}
          style={styles.vueWeb}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  voile: { alignItems: 'center', justifyContent: 'center', padding: Spacing.three, zIndex: 1000 },
  // Transparente et sans bord tant que Cloudflare ne demande rien : la vue web y tourne, invisible.
  carte: { alignItems: 'center', gap: Spacing.three, maxWidth: 360 },
  carteVisible: { padding: Spacing.four, borderRadius: Radius.card, borderWidth: 1 },
  phrase: { textAlign: 'center' },
  // La taille du widget « normal » de Turnstile (300 × 65), et un fond transparent.
  vueWeb: { width: 300, height: 70, backgroundColor: 'transparent' },
});
