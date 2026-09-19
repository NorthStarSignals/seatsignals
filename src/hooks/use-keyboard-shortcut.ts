'use client';

import { useEffect, useCallback } from 'react';

type Modifier = 'ctrl' | 'meta' | 'alt' | 'shift';

interface ShortcutOptions {
  key: string;
  modifiers?: Modifier[];
  handler: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcut({ key, modifiers = [], handler, enabled = true }: ShortcutOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const modifierMatch =
        (!modifiers.includes('ctrl') || event.ctrlKey) &&
        (!modifiers.includes('meta') || event.metaKey) &&
        (!modifiers.includes('alt') || event.altKey) &&
        (!modifiers.includes('shift') || event.shiftKey);

      // Check that no extra modifiers are pressed
      const hasCtrl = modifiers.includes('ctrl') || modifiers.includes('meta');
      const extraModifiers =
        (!hasCtrl && (event.ctrlKey || event.metaKey)) ||
        (!modifiers.includes('alt') && event.altKey) ||
        (!modifiers.includes('shift') && event.shiftKey);

      if (modifierMatch && !extraModifiers && event.key.toLowerCase() === key.toLowerCase()) {
        event.preventDefault();
        handler();
      }
    },
    [key, modifiers, handler, enabled]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
