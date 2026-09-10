import React from 'react';
import { ThemedText } from './ThemedText.jsx';
// Source : src/components/message-inline.tsx — l'échec se dit dans la page, jamais dans une boîte système.
export function MessageInline({ message, style }) {
  if (!message) return null;
  return <ThemedText type="small" themeColor="textSecondary" role="alert" style={{ lineHeight: '20px', ...style }}>{message}</ThemedText>;
}
