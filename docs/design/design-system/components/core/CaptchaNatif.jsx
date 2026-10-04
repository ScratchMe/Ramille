import React from 'react';
import { ThemedText } from './ThemedText.jsx';
// Source : src/components/captcha-natif.tsx — la carte qui entoure la case de Cloudflare quand le captcha
// demande de cocher, dans l'app Android (le web dessine la même carte dans le DOM, `src/lib/captcha.ts`).
// Invisible tant que Cloudflare ne demande rien. Le kit la rend dans son état visible ; la case, qui
// appartient à Cloudflare, y est figurée par un cadre.
export function CaptchaNatif({ visible = true }) {
  if (!visible) return null;
  return (
    <div style={{ background: 'var(--color-scrim, rgba(19, 22, 18, 0.42))', padding: 16, display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          maxWidth: 360,
          padding: 24,
          borderRadius: 18,
          border: '1px solid var(--color-border, #DDE0D9)',
          background: 'var(--color-background, #FFFFFF)',
        }}
      >
        <ThemedText type="body" style={{ textAlign: 'center' }}>
          Une dernière vérification : coche la case ci-dessous.
        </ThemedText>
        <div style={{ width: 300, height: 65, border: '1px dashed #DDE0D9', borderRadius: 4 }} aria-hidden="true" />
      </div>
    </div>
  );
}
