"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/i18n";

const STORAGE_KEY = "tutorialCompleted";

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  spotlightPosition: "top" | "center" | "bottom";
}

const STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Willkommen",
    content:
      "Willkommen bei CoffeeFlow! Dein täglicher Berater für bessere Entscheidungen.",
    spotlightPosition: "center",
  },
  {
    id: "suggestions",
    title: "Empfehlungskarten",
    content:
      "Hier siehst du deine täglichen Empfehlungen. Maximal 5, priorisiert nach deiner Strategie.",
    spotlightPosition: "center",
  },
  {
    id: "breakeven",
    title: "Break-Even",
    content:
      "Die Break-Even-Leiste zeigt dir, wann du heute deine Fixkosten gedeckt hast.",
    spotlightPosition: "center",
  },
  {
    id: "strategy",
    title: "Strategiemodus",
    content:
      "Wähle deinen Strategiemodus: Profit, Waste, Stress oder Balanced.",
    spotlightPosition: "top",
  },
  {
    id: "data-entry",
    title: "Dateneingabe",
    content:
      "Hier gibst du deine Verkäufe, Inventar und Waste ein. Mit 'Wie gestern' geht's extra schnell.",
    spotlightPosition: "center",
  },
  {
    id: "evening",
    title: "Abend-Flow",
    content:
      "Jeden Abend: Tag bewerten, Waste erfassen, Vorschläge bewerten.",
    spotlightPosition: "center",
  },
  {
    id: "sos",
    title: "SOS",
    content:
      "Bei Notfällen: SOS-Button drücken. Sofort passende Empfehlungen.",
    spotlightPosition: "bottom",
  },
  {
    id: "done",
    title: "Fertig!",
    content:
      "Alles klar! Der Coach lernt mit jedem Tag dazu. Viel Erfolg!",
    spotlightPosition: "center",
  },
];

function getSpotlightPosition(
  position: "top" | "center" | "bottom"
): React.CSSProperties {
  const width = "min(400px, calc(100vw - 32px))";
  const height = "140px";

  if (position === "top") {
    return {
      top: "100px",
      left: "50%",
      transform: "translateX(-50%)",
      width,
      height,
    };
  }
  if (position === "bottom") {
    return {
      top: "auto",
      bottom: "140px",
      left: "50%",
      transform: "translateX(-50%)",
      width,
      height,
    };
  }
  return {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width,
    height: "200px",
  };
}

function getCardPosition(position: "top" | "center" | "bottom"): React.CSSProperties {
  if (position === "top") {
    return { top: "260px", left: "50%", transform: "translateX(-50%)" };
  }
  if (position === "bottom") {
    return { bottom: "280px", left: "50%", transform: "translateX(-50%)" };
  }
  return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
}

export function Tutorial() {
  const { t } = useT();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const checkTutorialStatus = useCallback(() => {
    if (typeof window === "undefined") return true;
    const completed = localStorage.getItem(STORAGE_KEY) === "true";
    return completed;
  }, []);

  useEffect(() => {
    const completed = checkTutorialStatus();
    if (!completed) {
      setIsVisible(true);
    }
  }, [checkTutorialStatus]);

  const completeTutorial = useCallback(async (skipped = false) => {
    if (typeof window === "undefined") return;

    setIsLoading(true);
    try {
      localStorage.setItem(STORAGE_KEY, "true");

      const res = await fetch("/api/tutorial/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed: true,
          skipped,
          stepsCompleted: STEPS.map((s) => s.id),
        }),
      });

      if (!res.ok) {
        console.warn("Tutorial completion API failed, localStorage updated");
      }
    } catch (e) {
      console.warn("Tutorial error:", e);
    } finally {
      setIsLoading(false);
      setIsVisible(false);
    }
  }, []);

  const goNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      completeTutorial(false);
    }
  }, [currentStep, completeTutorial]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const skip = useCallback(() => {
    completeTutorial(true);
  }, [completeTutorial]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;
      if (e.key === "Escape") skip();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, goNext, goBack, skip]);

  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isVisible]);

  const step = STEPS[currentStep]!;
  const isLastStep = currentStep === STEPS.length - 1;
  const spotlightPos = step.spotlightPosition;

  const stepTitle =
    currentStep === 0 ? t("tutorial.welcome") : currentStep === 1 ? t("tutorial.suggestions") : step.title;
  const stepContent =
    currentStep === 0 ? t("tutorial.welcomeText") : currentStep === 1 ? t("tutorial.suggestionsText") : step.content;

  if (!isVisible) return null;

  const spotlightStyle = getSpotlightPosition(spotlightPos);
  const cardStyle = getCardPosition(spotlightPos);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      aria-describedby="tutorial-content"
    >
      {/* Spotlight cutout: transparent div with box-shadow creates the dark overlay + hole */}
      <div
        className="pointer-events-none absolute rounded-2xl"
        style={{
          ...spotlightStyle,
          position: "absolute",
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.75)",
          background: "transparent",
        }}
        aria-hidden="true"
      />

      {/* Card with content */}
      <div
        className="absolute z-10 mx-4 w-full max-w-md rounded-card bg-card p-6 shadow-xl dark:bg-dark-card"
        style={cardStyle}
      >
        <div className="space-y-4">
          <h2
            id="tutorial-title"
            className="font-heading text-xl font-semibold text-text-primary dark:text-dark-text"
          >
            {stepTitle}
          </h2>
          <p
            id="tutorial-content"
            className="text-text-secondary dark:text-dark-text-secondary"
          >
            {stepContent}
          </p>
        </div>

        {/* Progress dots */}
        <div
          className="mt-6 flex justify-center gap-2"
          role="tablist"
          aria-label="Tutorial-Fortschritt"
        >
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === currentStep}
              aria-label={`Schritt ${i + 1} von ${STEPS.length}`}
              className={`h-2 w-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                i === currentStep
                  ? "w-6 bg-accent"
                  : "bg-text-secondary/40 dark:bg-dark-text-secondary/40"
              }`}
              onClick={() => setCurrentStep(i)}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={skip}
            className="text-sm text-text-secondary underline hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 rounded dark:text-dark-text-secondary dark:hover:text-dark-text"
            aria-label={t("tutorial.skip")}
          >
            {t("tutorial.skip")}
          </button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="btn-secondary"
                aria-label={t("common.back")}
              >
                {t("common.back")}
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              disabled={isLoading}
              className="btn-primary"
              aria-label={isLastStep ? t("tutorial.finish") : t("tutorial.next")}
            >
              {isLoading ? "Speichert…" : isLastStep ? t("tutorial.finish") : t("tutorial.next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
