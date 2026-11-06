"use client";

// Type declarations for Web Speech API
export interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export interface SpeechRecognition extends EventTarget {
  addEventListener(
    type: "error",
    listener: (event: SpeechRecognitionErrorEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: Readonly<SpeechRecognitionEvent>) => void) | null;
  onerror: ((event: Readonly<SpeechRecognitionErrorEvent>) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Use useSyncExternalStore for browser API detection (SSR-safe)
export function subscribe() {
  // No-op: browser support doesn't change
  return () => {};
}

export function getSnapshot(): boolean {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function getServerSnapshot(): boolean {
  return false; // Assume not supported during SSR
}

export function getSpeechRecognition(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}
