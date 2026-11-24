import { useSyncExternalStore } from 'react';

let sessionExpired = false;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function markSessionExpired(): void {
  if (sessionExpired) return;
  sessionExpired = true;
  notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return sessionExpired;
}

export function useSessionExpired(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
