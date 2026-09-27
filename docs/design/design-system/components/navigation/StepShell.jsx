import React from 'react';
import { ProgressHeader } from './ProgressHeader.jsx';
import { Button } from '../core/Button.jsx';
import { MessageInline } from '../core/MessageInline.jsx';
import { ThemedText } from '../core/ThemedText.jsx';
// Source : src/components/bilan/step-shell.tsx — en-tête, contenu défilant (padding 24, gap 32), pied collant Retour/Suivant.
//
// Quand l'étape change, le contenu revient en haut et prend le focus (sur web, le conteneur, en `tabIndex={-1}`) :
// « Suivant » ne disparaît pas, donc sans ce geste le focus resterait sur lui et le lecteur d'écran n'annoncerait
// rien de la question qui vient d'arriver. Jamais au premier rendu — l'écran s'ouvre sans geste.
export function StepShell({ section, step, total, children, onBack, onNext, nextLabel = 'Suivant', nextDisabled, notice, motDeRamille, message, detail, manque, style }) {
  const contenu = React.useRef(null);
  const defilement = React.useRef(null);
  const premierRendu = React.useRef(true);
  React.useEffect(() => {
    if (premierRendu.current) {
      premierRendu.current = false;
      return;
    }
    if (defilement.current) defilement.current.scrollTop = 0;
    if (contenu.current) contenu.current.focus({ preventScroll: true });
  }, [step]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: 'var(--color-background)', ...style }}>
      <div style={{ padding: '8px 24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ProgressHeader section={section} step={step} total={total} />
        {notice && <div style={{ background: 'var(--color-background-selected)', borderRadius: 12, padding: '10px 16px' }}><ThemedText type="small" themeColor="accentText">{notice}</ThemedText></div>}
        {/* Le mot de Ramille à l'entrée d'une section, SANS `RamilleDit` : son visage est déjà dans l'en-tête, juste
            au-dessus — un second ferait deux Ramille sur le même écran. La phrase vient de `RAMILLE.entreeDeSection`. */}
        {motDeRamille && <ThemedText type="small" themeColor="textTertiary" style={{ lineHeight: '20px' }}>{motDeRamille}</ThemedText>}
      </div>
      <div ref={defilement} style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column' }}>
        <div ref={contenu} tabIndex={-1} style={{ display: 'flex', flexDirection: 'column', gap: 32, flexGrow: 1 }}>{children}</div>
      </div>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <MessageInline message={message || null} />
        {/* La cause technique, à recopier : brute, en chasse fixe — ni la voix de Ramille ni un ton rassurant. */}
        {detail && <ThemedText type="code" themeColor="textTertiary" style={{ lineHeight: '18px' }}>{detail}</ThemedText>}
        {manque && <ThemedText type="small" themeColor="textTertiary">Il manque encore {manque}.</ThemedText>}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {onBack && <Button title="Retour" variant="secondary" onPress={onBack} style={{ width: 'auto' }} />}
          <Button title={nextLabel} onPress={onNext} disabled={nextDisabled} flex />
        </div>
      </div>
    </div>
  );
}
