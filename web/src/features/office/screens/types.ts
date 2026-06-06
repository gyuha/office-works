import type { ComponentType } from 'react';

export type ScreenDef = { title?: string; sub?: string; Component: ComponentType };
export type ScreenModule = Record<string, ScreenDef>;
