import React from 'react';
import { ProgressHeader } from './ProgressHeader.jsx';
import { Button } from '../core/Button.jsx';
import { MessageInline } from '../core/MessageInline.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/bilan/step-shell.tsx — en-tête, contenu défilant (padding 24, gap 32), pied collant Retour/Suivant.
export function StepShell({ section, step, total, children, onBack, onNext, nextLabel = 'Suivant', nextDisabled, notice, message, manque, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: 'var(--color-background)', ...style }}>
      <div style={{ padding: '8px 24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ProgressHeader section={section} step={step} total={total} />
        {notice && <div style={{ background: 'var(--color-background-selected)', borderRadius: 12, padding: '10px 16px' }}><ThemedText type="small" themeColor="accentText">{notice}</ThemedText></div>}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 32 }}>{children}</div>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <MessageInline message={message || null} />
        {manque && <ThemedText type="small" themeColor="textTertiary">Il manque encore {manque}.</ThemedText>}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {onBack && <Button title="Retour" variant="secondary" onPress={onBack} style={{ width: 'auto' }} />}
          <Button title={nextLabel} onPress={onNext} disabled={nextDisabled} flex />
        </div>
      </div>
    </div>
  );
}
