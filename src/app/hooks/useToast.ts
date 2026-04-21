'use client';

import { useCallback, useEffect, useState } from 'react';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export type ToastItem = {
  id: string;
  kind: ToastKind;
  message: string;
  durationMs: number;
};

type Listener = (toasts: ToastItem[]) => void;

const listeners = new Set<Listener>();
let toasts: ToastItem[] = [];

function emit() {
  for (const l of listeners) l(toasts);
}

function push(kind: ToastKind, message: string, durationMs: number) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  toasts = [...toasts, { id, kind, message, durationMs }];
  emit();
  if (durationMs > 0) {
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      emit();
    }, durationMs);
  }
  return id;
}

function dismiss(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (msg: string, durationMs = 2500) => push('success', msg, durationMs),
  error: (msg: string, durationMs = 4000) => push('error', msg, durationMs),
  info: (msg: string, durationMs = 2500) => push('info', msg, durationMs),
  warning: (msg: string, durationMs = 3500) => push('warning', msg, durationMs),
  dismiss,
};

export function useToasts(): ToastItem[] {
  const [state, setState] = useState<ToastItem[]>(toasts);

  const listener = useCallback((next: ToastItem[]) => setState(next), []);

  useEffect(() => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [listener]);

  return state;
}
