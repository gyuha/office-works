import { useSyncExternalStore } from 'react';

export type SampleThemePreset = 'default' | 'blue' | 'green' | 'orange' | 'red';

const STORAGE_KEY = 'sample-theme-preset';
const DEFAULT_PRESET: SampleThemePreset = 'default';
const presets = ['default', 'blue', 'green', 'orange', 'red'] as const;
const listeners = new Set<() => void>();
let currentPreset = readStoredPreset();

function isSampleThemePreset(value: string | null): value is SampleThemePreset {
  return presets.some((preset) => preset === value);
}

function readStoredPreset(): SampleThemePreset {
  if (typeof window === 'undefined') return DEFAULT_PRESET;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isSampleThemePreset(stored) ? stored : DEFAULT_PRESET;
}

function applyPreset(preset: SampleThemePreset) {
  if (typeof document === 'undefined') return;
  if (preset === DEFAULT_PRESET) {
    delete document.documentElement.dataset.sampleTheme;
    return;
  }
  document.documentElement.dataset.sampleTheme = preset;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return currentPreset;
}

function getServerSnapshot() {
  return DEFAULT_PRESET;
}

export function setSampleThemePreset(preset: SampleThemePreset) {
  currentPreset = preset;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, preset);
  }
  applyPreset(preset);
  for (const listener of listeners) {
    listener();
  }
}

export function useSampleThemePreset() {
  const preset = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { preset, setPreset: setSampleThemePreset };
}

applyPreset(currentPreset);
