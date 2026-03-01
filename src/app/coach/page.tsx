"use client";

import { useState, useRef, useEffect } from "react";
import { useT } from "@/i18n";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { Send, MessageCircle, TrendingUp, Trash2, Users, DollarSign, Star, Target, Lightbulb, Mic, MicOff } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "coach";
  content: string;
  timestamp: Date;
}

const TOPIC_WHEEL = [
  { key: "food-cost", label: "Food-Cost", icon: DollarSign, question: "Wie ist mein Food-Cost und welche Margen habe ich?", color: "var(--color-accent-primary)" },
  { key: "revenue", label: "Umsatz", icon: TrendingUp, question: "Wie lief mein Umsatz diese Woche?", color: "var(--color-accent-profit)" },
  { key: "waste", label: "Waste", icon: Trash2, question: "Zeig mir meinen Waste der letzten 7 Tage", color: "var(--color-accent-waste)" },
  { key: "products", label: "Top Produkte", icon: Star, question: "Was sind meine bestverkauften Produkte?", color: "var(--color-accent-primary)" },
  { key: "staff", label: "Personal", icon: Users, question: "Wie sind meine Personalkosten?", color: "var(--color-accent-stress)" },
  { key: "breakeven", label: "Break-Even", icon: Target, question: "Wie stehe ich beim Break-Even?", color: "var(--color-accent-warning)" },
  { key: "tips", label: "Tipps", icon: Lightbulb, question: "Gib mir Tipps fuer heute", color: "var(--color-accent-profit)" },
] as const;

export default function CoachPage() {
  const { t } = useT();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "coach",
      content: "coach.welcome",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isListening, transcript, supported: micSupported, toggle: toggleMic } = useVoiceInput("de-DE");

  useEffect(() => {
    if (historyLoaded) return;
    (async () => {
      try {
        const res = await fetch("/api/coach");
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          const loaded: Message[] = data.messages.map((m: { id?: string; role: string; content: string; createdAt?: string }, i: number) => ({
            id: `hist-${i}`,
            role: m.role as "user" | "coach",
            content: m.content,
            timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
          }));
          setMessages([
            { id: "welcome", role: "coach", content: "coach.welcome", timestamp: new Date(0) },
            ...loaded,
          ]);
        }
      } catch { /* ignore */ }
      setHistoryLoaded(true);
    })();
  }, [historyLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isListening && transcript) {
      sendMessage(transcript);
    }
  }, [isListening, transcript]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text.trim() }),
      });
      const data = await res.json();
      const coachMsg: Message = {
        id: `coach-${Date.now()}`,
        role: "coach",
        content: data.content ?? data.error ?? t("common.error"),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, coachMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "coach",
          content: t("common.unknownError"),
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col pb-8" style={{ minHeight: "calc(100vh - 120px)" }}>
      <header className="mb-4">
        <h1 className="text-greeting">{t("coach.title")}</h1>
        <p className="text-meta mt-1">Frag mich zu deinen Daten</p>
      </header>

      {/* Messages */}
      <div className="flex-1 space-y-3 mb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "rounded-br-md"
                  : "rounded-bl-md"
              }`}
              style={{
                backgroundColor: msg.role === "user"
                  ? "var(--color-accent-primary)"
                  : "var(--color-card-bg)",
                color: msg.role === "user" ? "white" : "var(--color-text-primary)",
                boxShadow: msg.role === "coach" ? "var(--shadow-card)" : "none",
              }}
            >
              {msg.role === "coach" && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <MessageCircle size={12} style={{ color: "var(--color-accent-primary)" }} />
                  <span className="text-xs font-medium" style={{ color: "var(--color-accent-primary)" }}>Coach</span>
                </div>
              )}
              <p className="whitespace-pre-line leading-relaxed">{msg.content === "coach.welcome" ? t("coach.welcome") : msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="card rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--color-accent-primary)" }} />
                <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--color-accent-primary)", animationDelay: "150ms" }} />
                <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--color-accent-primary)", animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Topic Wheel */}
      {messages.length <= 2 && (
        <div className="mb-4">
          <p className="text-meta font-medium mb-3">Waehle ein Thema oder tippe eine Frage:</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {TOPIC_WHEEL.map((topic) => {
              const Icon = topic.icon;
              return (
                <button
                  key={topic.key}
                  type="button"
                  onClick={() => sendMessage(topic.question)}
                  className="flex flex-col items-center gap-1.5 rounded-2xl p-3 transition-all hover:scale-105"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${topic.color} 10%, transparent)`,
                    border: `1.5px solid color-mix(in srgb, ${topic.color} 20%, transparent)`,
                  }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: `color-mix(in srgb, ${topic.color} 15%, transparent)` }}
                  >
                    <Icon size={18} style={{ color: topic.color }} />
                  </div>
                  <span className="text-[11px] font-medium text-center leading-tight">{topic.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 sticky bottom-20 lg:bottom-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("coach.placeholder")}
          className="input-field flex-1"
          disabled={isLoading}
        />
        {micSupported && (
          <button
            type="button"
            onClick={toggleMic}
            className={`flex items-center justify-center transition-all ${isListening ? "text-[var(--color-accent-waste)]" : ""}`}
            style={{
              width: 48,
              height: 48,
              padding: 0,
              borderRadius: "var(--radius-button)",
              backgroundColor: isListening ? "rgba(255, 122, 99, 0.1)" : "var(--color-track-bg)",
            }}
            aria-label={isListening ? "Mikrofon stoppen" : "Spracheingabe"}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="btn-primary flex items-center justify-center"
          style={{ width: 48, height: 48, padding: 0, borderRadius: "var(--radius-button)" }}
          aria-label="Nachricht senden"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
