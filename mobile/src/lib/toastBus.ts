export type ToastKind = 'success' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  kind: ToastKind;
}

type Listener = (toast: ToastMessage) => void;

const listeners = new Set<Listener>();
let counter = 0;

export function showToast(message: string, kind: ToastKind = 'success'): void {
  counter += 1;
  const toast: ToastMessage = { id: `toast_${Date.now()}_${counter}`, message, kind };
  for (const listener of listeners) listener(toast);
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
