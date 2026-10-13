"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Mic, MicOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import type {
  SpeechRecognition,
  SpeechRecognitionErrorEvent,
  SpeechRecognitionEvent,
} from "@/components/chatbot/speech-recognition";
import {
  getServerSnapshot,
  getSnapshot,
  getSpeechRecognition,
  subscribe,
} from "@/components/chatbot/speech-recognition";

interface VoiceInputProps {
  readonly onTranscript: (text: string) => void;
  readonly onInterimTranscript?: (text: string) => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

export function VoiceInput({
  onTranscript,
  onInterimTranscript,
  disabled,
  className,
}: Readonly<VoiceInputProps>) {
  const [isListening, setIsListening] = useState(false);
  const isSupported = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
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
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript && onInterimTranscript) {
        onInterimTranscript(interimTranscript);
      }

      if (finalTranscript) {
        onTranscript(finalTranscript);

        // Provide haptic feedback on successful transcription
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    };

    recognition.addEventListener("error", (event: Readonly<SpeechRecognitionErrorEvent>) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);

      switch (event.error) {
        case "not-allowed":
          toast.error("Microphone access denied", {
            description: "Please enable microphone access in your browser settings",
          });
          break;
        case "no-speech":
          toast.info("No speech detected", {
            description: "Try speaking again",
          });
          break;
        case "network":
          toast.error("Network error", {
            description: "Check your internet connection",
          });
          break;
        default:
          toast.error("Voice input error", {
            description: "Please try again",
          });
      }
    });

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onstart = () => {
      setIsListening(true);

      // Haptic feedback when starting
      if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [onTranscript, onInterimTranscript]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        // Recognition might already be running
        console.error("Failed to start recognition:", error);
      }
    }
  }, [isListening]);

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      type="button"
      variant={isListening ? "default" : "ghost"}
      size="icon-sm"
      onClick={toggleListening}
      disabled={disabled}
      className={cn(
        "relative transition-all",
        isListening
          ? "animate-pulse bg-red-500 text-white hover:bg-red-600"
          : "text-stone-500 hover:bg-stone-100 hover:text-stone-700",
        className,
      )}
      aria-label={isListening ? "Stop voice input" : "Start voice input"}
    >
      {isListening ? (
        <>
          <MicOff className="size-4" />
          <span className="absolute -inset-e-1 -inset-bs-1 size-2 animate-ping rounded-full bg-red-300" />
        </>
      ) : (
        <Mic className="size-4" />
      )}
    </Button>
  );
}
