"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
  resultIndex: number;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export function useVoiceInput(lang = "de-DE") {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }, []);

  const start = useCallback(() => {
    if (!supported) return;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const result = e.results[e.resultIndex];
      if (result?.[0]) {
        setTranscript(result[0].transcript);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setTranscript("");
    setIsListening(true);
    recognition.start();
  }, [supported, lang]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  return { isListening, transcript, supported, start, stop, toggle };
}

/**
 * Parse voice transcript to extract product name and quantity.
 * Handles patterns like "3 Espresso", "Cappuccino 5", "fünf Croissant"
 */
export function parseVoiceEntry(
  text: string,
  productNames: string[]
): { productName: string | null; quantity: number | null } {
  const lower = text.toLowerCase().trim();
  if (!lower) return { productName: null, quantity: null };

  const WORD_NUMBERS: Record<string, number> = {
    eins: 1, ein: 1, eine: 1, zwei: 2, drei: 3, vier: 4, fünf: 5,
    sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10,
    elf: 11, zwölf: 12, fünfzehn: 15, zwanzig: 20,
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };

  let quantity: number | null = null;
  let remaining = lower;

  const numMatch = remaining.match(/(\d+)/);
  if (numMatch) {
    quantity = parseInt(numMatch[1], 10);
    remaining = remaining.replace(numMatch[0], "").trim();
  } else {
    for (const [word, num] of Object.entries(WORD_NUMBERS)) {
      if (remaining.includes(word)) {
        quantity = num;
        remaining = remaining.replace(word, "").trim();
        break;
      }
    }
  }

  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const name of productNames) {
    const nameLower = name.toLowerCase();
    if (remaining.includes(nameLower)) {
      if (nameLower.length > bestScore) {
        bestMatch = name;
        bestScore = nameLower.length;
      }
    }
    if (nameLower.includes(remaining) && remaining.length > 2) {
      if (remaining.length > bestScore) {
        bestMatch = name;
        bestScore = remaining.length;
      }
    }
  }

  return { productName: bestMatch, quantity: quantity ?? (bestMatch ? 1 : null) };
}
