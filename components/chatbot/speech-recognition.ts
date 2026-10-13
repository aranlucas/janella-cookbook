"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

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

// Hook for using voice input anywhere
export function useVoiceInput() {
  const isSupported = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognitionClass = getSpeechRecognition();

    if (!SpeechRecognitionClass) {
      return () => {};
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: Readonly<SpeechRecognitionEvent>) => {
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.onstart = () => setIsListening(true);
    recognition.addEventListener("error", () => setIsListening(false));

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Failed to start:", error);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
    clearTranscript,
  };
}
