# CoffeeFlow -- Architecture & Handoff Document

---

## PRIORITAETEN-REIHENFOLGE (FUER DIE NAECHSTE AI)

Arbeite diese Liste von oben nach unten ab. Jeder Punkt hat einen eigenen Abschnitt weiter unten mit exakten Dateipfaden, Zeilennummern und Fix-Code.

**Prioritaet 1 -- KRITISCH: Dark Mode Kontrast-Bugs fixen**
- Schritt 1: Neue CSS-Variablen in `globals.css` anlegen (siehe Abschnitt "Neue CSS-Variablen")
- Schritt 2: Alle inline `boxShadow` mit `rgba(0,0,0,...)` ersetzen (12 Stellen)
- Schritt 3: Alle `hover:bg-[rgba(0,0,0,...)]` mit dark-Gegenstueck versehen (4 Stellen)
- Schritt 4: Alle `rgba(110,115,136,...)` in inline styles durch CSS-Variablen ersetzen ODER `dark:` Varianten hinzufuegen (30+ Stellen)
- Schritt 5: Globale CSS Bugs fixen: Tooltip, Scrollbar, High-Contrast (3 Stellen in globals.css)
- Schritt 6: Chart/Graph Track-Hintergruende fixen (3 Stellen)
- Schritt 7: Komponenten-Bugs fixen (11 Komponenten)

**Prioritaet 2 -- WICHTIG: AI Coach verbessern**
- Ohne OpenAI Key: Regelbasiertes System erweitern (mehr Keywords, besserer Fallback)
- Mit OpenAI Key: `.env` Datei anlegen mit `OPENAI_API_KEY=sk-...`

**Prioritaet 3 -- NICE-TO-HAVE: UX/Hover Polish**
- Bessere Hover-Effekte fuer Cards, Buttons, Inputs
- Mehr Orange/Rot Akzente

**Prioritaet 4 -- ERLEDIGT: Waste-DELETE Route**
- `src/app/api/waste/[id]/route.ts` wurde angelegt mit DELETE Handler
- `src/app/abend/page.tsx` Zeile 607 ruft `DELETE /api/waste/${entry.id}` auf -- funktioniert jetzt

**Prioritaet 5 -- OPTIONAL: Voice Input**
- Voice Input auf Coach-Seite erweitern
- Web Speech API nur in Chrome/Edge (localhost oder HTTPS)

**Nach jeder Aenderung**: Test-Checkliste am Ende dieses Dokuments abarbeiten.

---

## Overview

CoffeeFlow is a Next.js 16 (App Router, TypeScript) gastronomy management app for cafe/coffee shop owners.
It helps with daily operations: sales tracking, waste management, inventory, staff scheduling, financial reporting, and AI-powered recommendations.

**Stack**: Next.js 16 + React + Prisma 7 (SQLite) + Tailwind CSS v4 + Framer Motion

## Project Structure

```
gastro-coach/
├── prisma/
│   └── schema.prisma          # Database schema (SQLite)
├── public/
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service worker
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout (ThemeProvider + I18nProvider)
│   │   ├── globals.css         # ALL design tokens + component styles
│   │   ├── page.tsx            # Home / Dashboard
│   │   ├── eingabe/            # Data entry (sales, inventory, waste)
│   │   ├── abend/              # End-of-day closing flow
│   │   ├── finanzen/           # Financial overview + expenses
│   │   ├── analytics/          # Trends, forecasts, KPI benchmarks
│   │   ├── berichte/           # Reports (weekly, monthly, waste, labor)
│   │   ├── coach/              # AI Coach chatbot
│   │   ├── kasse/              # Cash register / counting
│   │   ├── haccp/              # HACCP compliance checklists
│   │   ├── rezepte/            # Recipe management
│   │   ├── lieferanten/        # Supplier management
│   │   ├── bestellungen/       # Purchase orders
│   │   ├── personal/           # Staff management + labor tracking
│   │   ├── einstellungen/      # Settings (shop info, products, contacts)
│   │   ├── wartung/            # Maintenance/equipment tracking
│   │   ├── onboarding/         # First-run setup wizard
│   │   ├── checkliste/         # Daily checklists
│   │   ├── aktionen/           # Promotions
│   │   ├── temperatur/         # Temperature logging
│   │   ├── emergency/          # Emergency contacts
│   │   ├── reinigung/          # Cleaning schedules
│   │   ├── drucken/            # Print / export
│   │   ├── menuplanung/        # Menu planning
│   │   ├── schichtplan/        # Shift planning
│   │   ├── social/             # Social media management
│   │   ├── erfolge/            # Achievements / gamification
│   │   ├── treueprogramm/      # Loyalty program
│   │   ├── wettbewerber/       # Competitor analysis
│   │   ├── debug/              # Debug page
│   │   ├── stammkunden/        # (REMOVED from nav, code still exists)
│   │   └── api/                # API routes (all server-side)
│   ├── components/             # Shared React components
│   │   ├── Navigation.tsx      # Mobile bottom nav + slide-out menu
│   │   ├── SidebarNav.tsx      # Desktop sidebar navigation
│   │   ├── ThemeProvider.tsx    # Dark/light/system theme (class-based)
│   │   ├── ThemeToggle.tsx     # Theme cycle button
│   │   ├── SuggestionCard.tsx  # AI recommendation card
│   │   ├── BreakEvenBar.tsx    # Break-even progress bar
│   │   ├── ContextPanel.tsx    # Desktop context/info panel
│   │   ├── SOSButton.tsx       # Emergency SOS overlay
│   │   ├── QuickNotes.tsx      # Quick notes widget
│   │   ├── TomorrowSection.tsx # Tomorrow suggestions
│   │   ├── StrategySelector.tsx # Strategy mode selector
│   │   ├── Tutorial.tsx        # Onboarding tutorial overlay
│   │   ├── animations.tsx      # Framer Motion components
│   │   └── ...
│   ├── hooks/
│   │   └── useVoiceInput.ts    # Web Speech API hook + parser
│   ├── i18n/
│   │   ├── context.tsx         # I18n React Context + useT() hook
│   │   ├── index.ts            # Re-exports
│   │   └── translations/       # 10 language JSON files
│   │       ├── de.json         # German (source)
│   │       ├── en.json         # English
│   │       ├── tr.json         # Turkish
│   │       ├── ar.json         # Arabic (RTL)
│   │       ├── fr.json         # French
│   │       ├── it.json         # Italian
│   │       ├── es.json         # Spanish
│   │       ├── pl.json         # Polish
│   │       ├── zh.json         # Chinese
│   │       └── ja.json         # Japanese
│   └── lib/
│       ├── db.ts               # Prisma client singleton
│       ├── logger.ts           # Structured logger
│       ├── math.ts             # Safe math utilities
│       ├── validation.ts       # Zod schemas
│       └── engine/             # Suggestion engine (rule-based AI)
```

---

## STRIKTE DESIGN-REGELN

Diese Regeln muessen bei JEDER Code-Aenderung eingehalten werden. Sie sind nicht optional.

### Regel 1: Keine hardcoded dunklen Farben in inline Styles

**VERBOTEN:**
```tsx
style={{ color: "black" }}
style={{ color: "#000" }}
style={{ color: "#1A1C2E" }}
style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
```

**ERLAUBT:**
```tsx
style={{ color: "var(--color-text-primary)" }}
style={{ boxShadow: "var(--shadow-card)" }}
```

### Regel 2: Jedes rgba() in inline Styles braucht Dark-Mode-Awareness

**VERBOTEN:**
```tsx
style={{ backgroundColor: "rgba(110, 115, 136, 0.08)" }}
style={{ borderColor: "rgba(110, 115, 136, 0.1)" }}
```

**ERLAUBT (Option A -- CSS Variable):**
```tsx
style={{ backgroundColor: "var(--color-track-bg)" }}
style={{ borderColor: "var(--color-border-subtle)" }}
```

**ERLAUBT (Option B -- Tailwind mit dark: Variante):**
```tsx
className="bg-[rgba(110,115,136,0.08)] dark:bg-[rgba(255,255,255,0.08)]"
className="border-[rgba(110,115,136,0.1)] dark:border-[rgba(255,255,255,0.1)]"
```

### Regel 3: Hover-Effekte brauchen IMMER ein dark: Gegenstueck

**VERBOTEN:**
```tsx
className="hover:bg-[rgba(0,0,0,0.04)]"
```

**ERLAUBT:**
```tsx
className="hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.08)]"
```

### Regel 4: Farb-Akzente

- Bevorzuge Orange (`var(--color-accent-primary)`) und Rot (`var(--color-accent-waste)`) als Akzentfarben
- Dark Mode Akzente muessen HELLER sein als Light Mode (bereits so eingestellt)
- Animationen und Lade-Effekte duerfen NIEMALS schwarz sein im Dark Mode

### Regel 5: Text-Farben

- Haupttext: `var(--color-text-primary)` oder Tailwind-Klasse mit color-Variable
- Sekundaertext: `var(--color-text-secondary)`
- Auf farbigem Hintergrund (orange/rot/gruen Button): `white` ist OK
- Auf Card/Page Background: IMMER `var(--color-text-primary)` oder `var(--color-text-secondary)`

---

## Neue CSS-Variablen (muessen in globals.css angelegt werden)

Diese Variablen existieren NOCH NICHT. Sie muessen im `@theme` Block (Light) und im `.dark` Block (Dark) angelegt werden.

In `src/app/globals.css`:

```css
/* Im @theme Block (ca. Zeile 20-50) hinzufuegen: */
--color-track-bg: rgba(110, 115, 136, 0.08);
--color-hover-overlay: rgba(0, 0, 0, 0.04);
--color-border-subtle: rgba(110, 115, 136, 0.1);
--shadow-subtle: 0 2px 8px rgba(0, 0, 0, 0.06);

/* Im .dark Block (ca. Zeile 60-90) hinzufuegen: */
--color-track-bg: rgba(255, 255, 255, 0.08);
--color-hover-overlay: rgba(255, 255, 255, 0.06);
--color-border-subtle: rgba(255, 255, 255, 0.1);
--shadow-subtle: 0 2px 8px rgba(255, 255, 255, 0.04);
```

Danach koennen alle inline `rgba(110,115,136,...)` und `rgba(0,0,0,...)` durch diese Variablen ersetzt werden.

---

## BUG-LISTE: Dark Mode Kontrast

### Kategorie A: Inline boxShadow mit rgba(0,0,0,...) -- UNSICHTBAR IM DARK MODE

Diese Schatten verschwinden komplett auf dunklem Hintergrund. Ersetze sie mit `var(--shadow-card)` oder `var(--shadow-subtle)`.

| Datei | Zeile(n) | Aktueller Wert | Fix |
|-------|----------|----------------|-----|
| `src/app/analytics/page.tsx` | 112 | `boxShadow: "0 4px 16px rgba(0,0,0,0.04)"` | `boxShadow: "var(--shadow-card)"` |
| `src/app/analytics/page.tsx` | 263 | `boxShadow: "0 2px 8px rgba(0,0,0,0.06)"` | `boxShadow: "var(--shadow-subtle)"` |
| `src/app/analytics/page.tsx` | 283 | `boxShadow: "0 4px 16px rgba(0,0,0,0.04)"` | `boxShadow: "var(--shadow-card)"` |
| `src/app/analytics/page.tsx` | 308 | `boxShadow: "0 4px 16px rgba(0,0,0,0.04)"` | `boxShadow: "var(--shadow-card)"` |
| `src/app/analytics/page.tsx` | 333 | `boxShadow: "0 4px 16px rgba(0,0,0,0.04)"` | `boxShadow: "var(--shadow-card)"` |
| `src/app/analytics/page.tsx` | 369 | `boxShadow: "0 4px 16px rgba(0,0,0,0.04)"` | `boxShadow: "var(--shadow-card)"` |
| `src/app/analytics/page.tsx` | 390 | `boxShadow: "0 4px 16px rgba(0,0,0,0.04)"` | `boxShadow: "var(--shadow-card)"` |
| `src/app/analytics/page.tsx` | 411 | `boxShadow: "0 4px 16px rgba(0,0,0,0.04)"` | `boxShadow: "var(--shadow-card)"` |
| `src/app/wartung/page.tsx` | 178 | `boxShadow: "0 4px 16px rgba(0,0,0,0.04)"` | `boxShadow: "var(--shadow-card)"` |
| `src/app/wartung/page.tsx` | 229 | `boxShadow: "0 4px 16px rgba(0,0,0,0.04)"` | `boxShadow: "var(--shadow-card)"` |
| `src/components/Navigation.tsx` | 160 | `boxShadow: "0 -4px 24px rgba(15,17,23,0.12)"` | `boxShadow: "var(--shadow-card)"` |
| `src/components/SOSButton.tsx` | 74 | `boxShadow: "0 -4px 24px rgba(0,0,0,0.08)"` | `boxShadow: "var(--shadow-card)"` |

### Kategorie B: Hover-Effekte mit rgba(0,0,0,...) -- UNSICHTBAR IM DARK MODE

Diese hover-Hintergruende sind im Dark Mode nicht sichtbar. Fuege ein `dark:hover:` Gegenstueck hinzu.

| Datei | Zeile | Aktuell | Fix |
|-------|-------|---------|-----|
| `src/app/menuplanung/page.tsx` | 203 | `hover:bg-[rgba(0,0,0,0.04)]` | Aendern zu: `hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.08)]` |
| `src/app/reinigung/page.tsx` | 76 | `hover:bg-[rgba(0,0,0,0.04)]` | Aendern zu: `hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.08)]` |
| `src/app/haccp/page.tsx` | 68 | `hover:bg-[rgba(0,0,0,0.04)]` | Aendern zu: `hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.08)]` |
| `src/app/haccp/page.tsx` | 98 | `hover:bg-[rgba(0,0,0,0.04)]` | Aendern zu: `hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.08)]` |

### Kategorie C: Track/Border/Background mit rgba(110,115,136,...) -- SCHWACH IM DARK MODE

Diese Farben sind im Light Mode korrekt, aber im Dark Mode kaum sichtbar. Ersetze sie mit `var(--color-track-bg)` oder `var(--color-border-subtle)`, ODER fuege ein `dark:` Tailwind-Gegenstueck hinzu.

**Seiten:**

| Datei | Zeile(n) | Verwendung | Fix |
|-------|----------|------------|-----|
| `src/app/page.tsx` | 321 | `backgroundColor: "rgba(139, 143, 163, 0.15)"` (Trend-Track) | `backgroundColor: "var(--color-track-bg)"` |
| `src/app/eingabe/page.tsx` | 585 | `backgroundColor` mit `rgba(110, 115, 136, 0.06)` (Slider-Track) | `var(--color-track-bg)` |
| `src/app/abend/page.tsx` | 597 | `backgroundColor: "rgba(240, 100, 73, 0.06)"` (Waste-Eintrag) | OK in Light, fuege `dark:` hinzu mit opacity 0.15 |
| `src/app/abend/page.tsx` | 724 | `borderColor: "rgba(110, 115, 136, 0.1)"` | `var(--color-border-subtle)` |
| `src/app/berichte/page.tsx` | 233 | `rgba(110, 115, 136, ...)` (Bar-Track) | `var(--color-track-bg)` |
| `src/app/berichte/page.tsx` | 268 | `rgba(110, 115, 136, ...)` (Border) | `var(--color-border-subtle)` |
| `src/app/berichte/page.tsx` | 325 | `rgba(110, 115, 136, ...)` | `var(--color-track-bg)` |
| `src/app/berichte/page.tsx` | 359 | `rgba(110, 115, 136, 0.08)` (Donut-Track) | `var(--color-track-bg)` |
| `src/app/berichte/page.tsx` | 385 | `rgba(110, 115, 136, ...)` | `var(--color-track-bg)` |
| `src/app/berichte/page.tsx` | 408 | `rgba(110, 115, 136, ...)` | `var(--color-track-bg)` |
| `src/app/berichte/page.tsx` | 486 | `rgba(110, 115, 136, ...)` (Pill-BG) | `var(--color-track-bg)` |
| `src/app/finanzen/page.tsx` | 245 | `borderColor: "rgba(110, 115, 136, 0.08)"` | `var(--color-border-subtle)` |
| `src/app/finanzen/page.tsx` | 264 | `rgba(110, 115, 136, ...)` | `var(--color-track-bg)` |
| `src/app/finanzen/page.tsx` | 350 | `borderColor: "rgba(110, 115, 136, 0.08)"` | `var(--color-border-subtle)` |
| `src/app/finanzen/page.tsx` | 404 | `rgba(110, 115, 136, ...)` | `var(--color-track-bg)` |
| `src/app/personal/page.tsx` | 218 | `rgba(110, 115, 136, ...)` | `var(--color-track-bg)` |
| `src/app/personal/page.tsx` | 249 | `borderColor: "rgba(110, 115, 136, 0.08)"` | `var(--color-border-subtle)` |
| `src/app/personal/page.tsx` | 337 | `hover:bg-[rgba(110, 115, 136, 0.03)]` | Hinzufuegen: `dark:hover:bg-[rgba(255,255,255,0.06)]` |
| `src/app/personal/page.tsx` | 352 | `rgba(110, 115, 136, ...)` | `var(--color-track-bg)` |
| `src/app/rezepte/page.tsx` | 268 | `backgroundColor` mit orange rgba | OK, aber Dark Opacity erhoehen |
| `src/app/rezepte/page.tsx` | 346 | `rgba(92, 114, 138, 0.06)` | `var(--color-track-bg)` |
| `src/app/rezepte/page.tsx` | 434 | `borderColor: "rgba(110, 115, 136, 0.08)"` | `var(--color-border-subtle)` |
| `src/app/rezepte/page.tsx` | 447 | `rgba(110, 115, 136, ...)` | `var(--color-track-bg)` |
| `src/app/reinigung/page.tsx` | 91 | `backgroundColor: "rgba(110, 115, 136, 0.08)"` (Progress-Track) | `var(--color-track-bg)` |
| `src/app/reinigung/page.tsx` | 107 | `border rgba(110, 115, 136, 0.2)` | `var(--color-border-subtle)` |
| `src/app/menuplanung/page.tsx` | 225 | `border: "1px solid rgba(110, 115, 136, 0.12)"` | `var(--color-border-subtle)` |
| `src/app/menuplanung/page.tsx` | 295 | `backgroundColor: "rgba(110, 115, 136, 0.06)"` | `var(--color-track-bg)` |
| `src/app/treueprogramm/page.tsx` | 180 | `hover:bg-[rgba(110, 115, 136, 0.05)]` | Hinzufuegen: `dark:hover:bg-[rgba(255,255,255,0.06)]` |
| `src/app/treueprogramm/page.tsx` | 280 | `rgba(110, 115, 136, 0.08)` (Track) | `var(--color-track-bg)` |
| `src/app/treueprogramm/page.tsx` | 374 | `backgroundColor: "rgba(110, 115, 136, 0.12)"` | `var(--color-track-bg)` |
| `src/app/social/page.tsx` | 211 | `backgroundColor: "rgba(110, 115, 136, 0.05)"` | `var(--color-track-bg)` |
| `src/app/social/page.tsx` | 225, 270, 300, 309, 321, 376 | Diverse `hover:bg-[rgba(110, 115, 136, ...)]` und inline bg | Jeweils `dark:` Gegenstueck oder CSS Variable |
| `src/app/schichtplan/page.tsx` | 253 | `backgroundColor: "rgba(110, 115, 136, 0.04)"` | `var(--color-track-bg)` |
| `src/app/erfolge/page.tsx` | 146 | `rgba(110, 115, 136, 0.08)` (Conic-Track) | `var(--color-track-bg)` |
| `src/app/erfolge/page.tsx` | 180 | `backgroundColor: "rgba(110, 115, 136, 0.06)"` | `var(--color-track-bg)` |
| `src/app/debug/page.tsx` | 109, 136, 140, 171 | Diverse `rgba(110, 115, 136, ...)` | `var(--color-track-bg)` |
| `src/app/lieferanten/page.tsx` | 71, 72 | `hover:bg-[rgba(110, 115, 136, 0.08)]` | Hinzufuegen: `dark:hover:bg-[rgba(255,255,255,0.08)]` |
| `src/app/stammkunden/page.tsx` | 90 | `backgroundColor: "rgba(110, 115, 136, 0.06)"` | Nicht noetig, Seite wird entfernt |

### Kategorie D: Globale CSS Bugs in globals.css

| Bug | Zeile | Problem | Fix |
|-----|-------|---------|-----|
| Tooltip unsichtbar | 493-494 | `color: white` + `background: var(--color-text-primary)`. Im Dark Mode ist text-primary hell (#F0F0F5), also: heller Hintergrund + weisser Text = UNSICHTBAR | Aendere `color: white` zu `color: var(--color-bg-main)` |
| Scrollbar zu dunkel | 507-508 | `scrollbar-color: rgba(110, 115, 136, 0.15)`. Im Dark Mode kaum sichtbar | Fuege in `.dark` Block hinzu: `scrollbar-color: rgba(200, 200, 220, 0.3) transparent` |
| High-Contrast Border | 513 | `html.high-contrast .card { border: 2px solid rgba(26, 28, 46, 0.3) }`. Auf dunklem Hintergrund unsichtbar | Aendere zu: `border-color: var(--color-text-secondary)` |

### Kategorie E: Komponenten mit rgba ohne Dark-Variante

| Komponente | Datei | Zeile(n) | Problem | Fix |
|------------|-------|----------|---------|-----|
| Navigation | `src/components/Navigation.tsx` | 165 | `backgroundColor: "rgba(110, 115, 136, 0.2)"` (Indicator) | `var(--color-track-bg)` |
| Navigation | `src/components/Navigation.tsx` | 176 | `hover:bg-[rgba(110,115,136,0.08)]` | + `dark:hover:bg-[rgba(255,255,255,0.08)]` |
| Navigation | `src/components/Navigation.tsx` | 194-195, 202-203 | `bg-[rgba(224,138,74,0.1)]` / `rgba(110,115,136,0.06)` | Orange ist OK, grau braucht dark: |
| SidebarNav | `src/components/SidebarNav.tsx` | 44 | `border-[rgba(110,115,136,0.08)]` | + `dark:border-[rgba(255,255,255,0.08)]` |
| SidebarNav | `src/components/SidebarNav.tsx` | 65-66 | `hover:bg-[rgba(110,115,136,0.05)]` | + `dark:hover:bg-[rgba(255,255,255,0.06)]` |
| SuggestionCard | `src/components/SuggestionCard.tsx` | 163 | `borderColor: "rgba(139, 143, 163, 0.12)"` | `var(--color-border-subtle)` |
| BreakEvenBar | `src/components/BreakEvenBar.tsx` | 42 | `backgroundColor: "rgba(110, 115, 136, 0.08)"` | `var(--color-track-bg)` |
| ContextPanel | `src/components/ContextPanel.tsx` | 100 | `border-[rgba(110,115,136,0.08)]` | + `dark:border-[rgba(255,255,255,0.08)]` |
| ContextPanel | `src/components/ContextPanel.tsx` | 195 | `backgroundColor: "rgba(110, 115, 136, 0.15)"` | `var(--color-track-bg)` |
| SOSButton | `src/components/SOSButton.tsx` | 85, 102 | `hover:bg-[rgba(110,115,136,...)]` | + `dark:hover:bg-[rgba(255,255,255,...)]` |
| QuickNotes | `src/components/QuickNotes.tsx` | 85 | `hover:bg-[rgba(110,115,136,0.08)]` | + `dark:hover:bg-[rgba(255,255,255,0.08)]` |
| ThemeToggle | `src/components/ThemeToggle.tsx` | 19 | `hover:bg-[rgba(110,115,136,0.08)]` | + `dark:hover:bg-[rgba(255,255,255,0.08)]` |
| animations | `src/components/animations.tsx` | 133 | `backgroundColor: "rgba(110, 115, 136, 0.1)"` | `var(--color-track-bg)` |
| StrategySelector | `src/components/StrategySelector.tsx` | 58 | `hover:bg-[rgba(110,115,136,0.05)]` | + `dark:hover:bg-[rgba(255,255,255,0.06)]` |

### Kategorie F: Chart/Graph Dark Mode Fixes

| Datei | Zeile(n) | Problem | Fix |
|-------|----------|---------|-----|
| `src/app/berichte/page.tsx` | 359, 362 | Donut/Conic Chart Track `rgba(110, 115, 136, 0.08)` -- Track unsichtbar im Dark Mode. Center-BG nutzt `var(--color-card-bg)` -- das ist OK | Track-Farbe ersetzen mit `var(--color-track-bg)` |
| `src/app/erfolge/page.tsx` | 146 | Conic Progress Track `rgba(110, 115, 136, 0.08)` -- unsichtbar | `var(--color-track-bg)` |
| `src/app/analytics/page.tsx` | Diverse | BarChart selbst ist OK (nutzt CSS vars). Nur die umgebenden Card-Shadows sind das Problem (siehe Kategorie A) | Schatten fixen wie in Kategorie A |

---

## AI COACH -- AKTUELLER ZUSTAND UND VERBESSERUNGEN

### Aktueller Zustand

**Backend:** `src/app/api/coach/route.ts`
**Frontend:** `src/app/coach/page.tsx`

Der Coach hat zwei Modi:

1. **MIT OpenAI Key** (`OPENAI_API_KEY` in `.env`): Sendet Fragen an GPT-4o-mini mit Shop-Kontext als System-Prompt. Funktioniert wie ein echter Chatbot. Gespraeche werden gespeichert.

2. **OHNE OpenAI Key** (aktueller Zustand): Regelbasiertes Keyword-Matching. Erkennt nur 7 Themen:
   - `food cost / wareneinsatz / marge`
   - `waste / verschwendung / müll / abfall`
   - `umsatz / revenue / einnahmen / geld`
   - `personal / mitarbeiter / schicht / labor`
   - `beste / top / produkt / beliebt`
   - `tipp / empfehlung / vorschlag / was soll`
   - `break-even / breakeven / fixkosten`

   Bei allem anderen kommt ein generischer Shop-Summary + "Frag mich konkreter".

### Problem

Der regelbasierte Modus fuehlt sich nicht wie ein Chatbot an. Wenn man z.B. fragt "Wie geht es meinem Cafe?" oder "Was mache ich falsch?" kommt nur die generische Zusammenfassung. Der User erwartet ChatGPT-aehnliches Verhalten.

### Loesung (zu implementieren)

#### Quick Fix: OpenAI Key setzen

Erstelle `.env` im Projektroot (`gastro-coach/.env`):
```
OPENAI_API_KEY=sk-proj-DEIN_KEY_HIER
```
Das loest das Problem sofort. Kostet ca. $0.01-0.05 pro Nachricht.

Der System-Prompt in `src/app/api/coach/route.ts` Zeile 78-87 definiert die Persoenlichkeit:
- Erfahrener Cafe-Berater
- Antwortet auf Deutsch
- Kurz und konkret (max 300 Woerter)
- Nutzt echte Shop-Daten

#### Langfristige Verbesserung des regelbasierten Modus

Falls kein OpenAI Key moeglich ist, muessen diese Aenderungen in `src/app/api/coach/route.ts` ab Zeile 168 (`generateRuleBasedAnswer`) gemacht werden:

1. **Mehr Keyword-Gruppen hinzufuegen** (aktuell 7, Ziel: 15+):
   - `wetter / regen / sonne / temperatur` --> Wetter-Empfehlungen
   - `inventur / bestand / lager / nachbestellen` --> Inventar-Tipps
   - `rezept / zutat / portion` --> Rezept-Hilfe
   - `oeffnungszeit / feierabend / schluss` --> Betriebszeiten-Tipps
   - `aktion / angebot / rabatt / promotion` --> Marketing-Ideen
   - `lieferant / bestellung / einkauf` --> Lieferanten-Info
   - `haccp / hygiene / kontrolle` --> HACCP-Hilfe
   - `trend / vergleich / letzte woche / letzter monat` --> Trend-Analyse

2. **Fuzzy Matching implementieren**: Statt `q.includes("waste")` ein Token-basiertes System:
   ```typescript
   const tokens = q.split(/\s+/);
   const matchScore = (keywords: string[]) =>
     tokens.filter(t => keywords.some(k => t.includes(k) || k.includes(t))).length;
   ```
   Dann die Kategorie mit dem hoechsten Score waehlen.

3. **Konversations-Kontext nutzen**: Die letzten 3-5 Nachrichten aus `CoachMessage` laden und darauf Bezug nehmen. Z.B. wenn die letzte Frage "Wie ist mein Umsatz?" war und jetzt "Warum?" kommt, die Umsatz-Analyse vertiefen.

4. **Natuerlichere Antworten**: Fuer jede Kategorie 3-5 Antwort-Varianten schreiben und zufaellig waehlen. Nicht immer den gleichen Text.

5. **Besserer Fallback**: Statt "Frag mich konkreter" sollte der Coach die wichtigste Metrik identifizieren und darauf eingehen. Z.B. wenn Waste hoch ist, automatisch darueber sprechen.

### Frontend-Verbesserungen (src/app/coach/page.tsx)

- **Chat-History laden**: Beim Mounten `GET /api/coach` aufrufen und bisherige Nachrichten anzeigen (aktuell startet jeder Seitenbesuch frisch)
- **Nachrichten formatieren**: Coach-Antworten mit Markdown/Aufzaelungszeichen formatieren statt Plaintext
- **Topic Wheel**: Funktioniert bereits, zeigt 7 Kategorien. Koennte auf die neuen Kategorien erweitert werden

---

## UX-VERBESSERUNGEN

### Hover-Effekte

Aktuell sind die Hover-Effekte minimal. In `src/app/globals.css` gibt es bereits einige:
- `.card:hover` hat `transform: translateY(-1px)` und erhoehten Schatten
- `.btn-primary:hover` hat `filter: brightness(1.05)`

**Zu implementieren:**

1. **Cards**: Sanfter Scale + Shadow-Transition
```css
.card-interactive {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.card-interactive:hover {
  transform: translateY(-2px) scale(1.005);
  box-shadow: var(--shadow-card-hover);
}
```

2. **Buttons**: Glow-Effekt im Dark Mode
```css
.dark .btn-primary:hover {
  box-shadow: 0 0 20px rgba(240, 160, 96, 0.3);
}
.dark .btn-danger:hover {
  box-shadow: 0 0 20px rgba(255, 122, 99, 0.3);
}
```

3. **Inputs**: Focus-Ring mit Accent-Farbe
```css
.input-field:focus {
  border-color: var(--color-accent-primary);
  box-shadow: 0 0 0 3px rgba(224, 138, 74, 0.15);
}
```

4. **Nav-Items**: Sanfter Background-Fade
```css
.nav-item {
  transition: background-color 0.15s ease;
}
```

### Farb-Akzente erweitern

Der User wuenscht MEHR Orange und Rot in der UI. Stellen wo das umgesetzt werden kann:
- Aktive Tab-Indikatoren: Orange statt Grau
- Fortschrittsbalken: Orange-Gradient statt einfarbig
- Badge/Counter: Rot statt Grau
- Erfolge/Achievements: Goldene Orange-Toene
- Wichtige Zahlen (Umsatz, Profit): Orange hervorheben

---

## Design System

### Critical Rule: Dark Mode Contrast

**ABSOLUTE RULE**: In dark mode, text/animations must NEVER be black. In light mode, they must NEVER be white (except on colored backgrounds).

The design system solves this architecturally:

**`globals.css`** defines CSS custom properties in `@theme` for light mode, then overrides them in `.dark`:

```css
/* Light (default) */
@theme {
  --color-text-primary: #1A1C2E;
  --color-card-bg: #FFFFFF;
  --color-bg-main: #F5F3F0;
}

/* Dark (override) */
.dark {
  --color-text-primary: #F0F0F5;
  --color-card-bg: #1A1D28;
  --color-bg-main: #0F1117;
}
```

This means ANY use of `var(--color-text-primary)` automatically gets the correct color.

**Accent colors** (orange #F0A060, red #FF7A63, green #3DD67A) are brighter in dark mode for visibility.

### Color Palette

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-text-primary` | #1A1C2E | #F0F0F5 | Main text |
| `--color-text-secondary` | #6E7388 | #8B8FA3 | Secondary/meta text |
| `--color-accent-primary` | #E08A4A | #F0A060 | Orange accent, CTA |
| `--color-accent-profit` | #34B364 | #3DD67A | Green, profit |
| `--color-accent-waste` | #F06449 | #FF7A63 | Red, waste/danger |
| `--color-accent-stress` | #3B82F6 | #60A5FA | Blue, staff/info |
| `--color-card-bg` | #FFFFFF | #1A1D28 | Card background |
| `--color-bg-main` | #F5F3F0 | #0F1117 | Page background |

### Component Classes (globals.css)

- `.card` — rounded-20px, shadow, auto-dark
- `.card-interactive` — clickable card with hover lift
- `.btn-primary` — orange CTA, white text
- `.btn-secondary` — outlined, adapts to dark
- `.btn-ghost` — transparent, text-only
- `.btn-danger` — red CTA
- `.input-field` — full-width input, auto-dark
- `.text-greeting` — 28px heading
- `.text-section` — 20px section heading
- `.text-card-title` — 18px card heading
- `.text-meta` — 12px secondary text
- `.text-number` — monospace font for numbers
- `.skeleton` — loading shimmer (orange tint in dark)

## i18n System

Custom React Context (`src/i18n/context.tsx`):
- `useT()` hook returns `{ t, locale, setLocale, isRTL }`
- `t("key.subkey")` looks up nested JSON translation
- Falls back to German (de) if key not found
- 10 languages: de, en, tr, ar, fr, it, es, pl, zh, ja
- Arabic gets `dir="rtl"` on `<html>`
- Locale stored in localStorage

**IMPORTANT**: Every component that uses `t()` MUST call `const { t } = useT()` at the top. This has been a recurring bug source.

## Database (Prisma + SQLite)

Schema in `prisma/schema.prisma`. Key models:
- `ShopSettings` — single row, shop config
- `Product` — products with cost/sell prices
- `DailySales` — daily sales per product
- `WasteLog` — waste tracking
- `Inventory` + `InventoryMovement` — stock management
- `DayClose` — end-of-day summaries
- `StaffMember` + `LaborEntry` — staff and hours
- `Expense` — monthly expenses
- `Recipe` + `RecipeIngredient` — recipe costing
- `Supplier` + `PurchaseOrder` — procurement
- `HACCPCheck` + `ChecklistEntry` — compliance
- `CoachMessage` — AI coach conversation history
- `RevenueGoal` — target tracking
- `RegularCustomer` — (kept in DB, page removed from nav)

Run `npx prisma db push` after schema changes. No migrations needed for SQLite.

## Theme System

`ThemeProvider.tsx`:
- Class-based: adds/removes `dark` on `<html>`
- Three modes: light / dark / system
- Persisted in localStorage key `"theme"`
- `useTheme()` hook for components

## Voice Input

`src/hooks/useVoiceInput.ts`:
- Uses Web Speech API (`webkitSpeechRecognition`)
- `useVoiceInput(lang)` returns `{ isListening, transcript, supported, toggle }`
- `parseVoiceEntry(text, productNames)` extracts product + quantity
- Supports German and English number words
- Gracefully hidden if browser doesn't support Speech API

**Aktuell nur auf der Eingabe-Seite (`src/app/eingabe/page.tsx`) integriert.**

Moegliche Erweiterungen:
- Coach-Seite: Spracheingabe fuer Fragen (Mikrofon-Button neben dem Text-Input)
- Abend-Seite: Waste per Sprache eingeben ("3 Croissants weggeworfen")
- Browser-Kompatibilitaet: Chrome/Edge = voll unterstuetzt, Firefox = nicht unterstuetzt, Safari = teilweise

## API Routes

All under `src/app/api/`:
- `/api/suggestions` — AI-generated daily recommendations
- `/api/dashboard/kpis` — homepage KPIs
- `/api/coach` — AI coach (GET history, POST question)
- `/api/products` — CRUD products
- `/api/sales` — daily sales
- `/api/waste` — waste logging
- `/api/inventory` — stock levels
- `/api/inventory/alerts` — low stock warnings
- `/api/settings` — shop settings
- `/api/staff` — staff management
- `/api/labor` — labor hours/costs
- `/api/expenses` — expense tracking
- `/api/revenue-goals` — targets
- `/api/recipes` — recipe management
- `/api/suppliers` — suppliers
- `/api/purchase-orders` — procurement
- `/api/haccp` — HACCP checks
- `/api/cash-count` — cash register counts
- `/api/day-close` — end-of-day closing
- `/api/backup` — data backup/restore
- `/api/export/*` — PDF, CSV, HACCP PDF export
- `/api/analytics/*` — trends, forecasts, comparisons
- `/api/weather` — OpenWeatherMap integration

---

## STAMMKUNDEN (Regular Customers)

**Status:** Seite entfernt aus Navigation, Code existiert noch.

- `src/app/stammkunden/page.tsx` -- Seite existiert noch, ist aber ueber Navigation nicht erreichbar
- `src/components/Navigation.tsx` -- Eintrag entfernt
- `src/components/SidebarNav.tsx` -- Eintrag entfernt
- `prisma/schema.prisma` -- `RegularCustomer` Model existiert noch
- `src/app/api/customers/` -- API Route existiert vermutlich noch

**Empfehlung:** Die gesamte Stammkunden-Seite, API Route und das Prisma Model koennen geloescht werden. Das Prisma Model zu entfernen erfordert ein `npx prisma db push` danach. Falls das Feature spaeter wieder gewuenscht wird, kann es neu gebaut werden.

---

## Running Locally

```bash
# 1. Dependencies installieren
npm install

# 2. Datenbank erstellen/aktualisieren
npx prisma db push
npx prisma generate

# 3. Entwicklungsserver starten
npm run dev
```

Open http://localhost:3000

### Optionale Umgebungsvariablen (.env)

Erstelle `gastro-coach/.env` (wird von .gitignore ignoriert):

```env
# AI Coach -- ohne diesen Key nur regelbasiert
OPENAI_API_KEY=sk-proj-...

# Wetter-Widget auf der Startseite
OPENWEATHER_API_KEY=...

# Push Notifications (muessen generiert werden)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

### Bekannte Probleme beim Starten

- Falls `prisma generate` fehlschlaegt: `npm install @prisma/client` ausfuehren
- Falls Port 3000 belegt: `npm run dev -- -p 3001`
- Falls SQLite Lock-Error: Alle anderen Prozesse die auf die DB zugreifen beenden
- Falls `better-sqlite3` Build-Fehler auf Windows: `npm install --build-from-source better-sqlite3`

---

## Known Issues / TODO for Next Developer

1. **Security**: No authentication. Add auth before production deployment.
2. **Database**: SQLite is fine for single-user. Migrate to PostgreSQL for multi-user.
3. **OpenAI**: Set `OPENAI_API_KEY` in `.env` for real AI coach answers.
4. **Weather**: Set `OPENWEATHER_API_KEY` in `.env` for weather widget.
5. **Push Notifications**: VAPID keys need to be generated and set.
6. **Stammkunden page**: Removed from navigation, code can be fully deleted (see Stammkunden section above).
7. **DATEV Export**: Planned but not yet implemented.
8. **Menu Engineering**: Planned BCG matrix page not yet built.
9. **POS CSV Import**: Planned but not yet built.

---

## TEST-CHECKLISTE (nach jeder Aenderung)

Fuehre diese Tests nach JEDER Code-Aenderung durch:

### 1. Server laeuft?
```bash
npm run dev
# Warte bis "Ready" erscheint
curl http://localhost:3000  # oder im Browser oeffnen
```

### 2. Alle Seiten erreichbar? (Status 200)
Teste jede Seite einzeln im Browser oder mit curl:
- `/` (Dashboard)
- `/eingabe` (Dateneingabe)
- `/abend` (Tagesabschluss)
- `/finanzen` (Finanzen)
- `/analytics` (Trends)
- `/berichte` (Berichte)
- `/coach` (AI Coach)
- `/kasse` (Kasse)
- `/haccp` (HACCP)
- `/rezepte` (Rezepte)
- `/lieferanten` (Lieferanten)
- `/bestellungen` (Bestellungen)
- `/personal` (Personal)
- `/einstellungen` (Einstellungen)
- `/wartung` (Wartung)
- `/reinigung` (Reinigung)
- `/menuplanung` (Menuplanung)
- `/schichtplan` (Schichtplan)
- `/social` (Social Media)
- `/erfolge` (Erfolge)
- `/treueprogramm` (Treueprogramm)
- `/wettbewerber` (Wettbewerber)
- `/checkliste` (Checklisten)
- `/temperatur` (Temperatur)

### 3. Dark Mode testen
- Theme auf "Dark" setzen (Toggle oben rechts)
- JEDE Seite durchklicken
- Auf KEINER Seite darf schwarzer Text auf schwarzem Hintergrund sein
- Alle Charts/Graphen muessen sichtbare Tracks haben
- Alle Hover-Effekte muessen sichtbar sein

### 4. Light Mode testen
- Theme auf "Light" setzen
- Auf KEINER Seite darf weisser Text auf weissem Hintergrund sein

### 5. Mobile testen
- Browser-DevTools auf Mobile-Groesse (375px Breite)
- Navigation unten muss funktionieren
- Kein horizontales Scrollen

### 6. RTL testen (optional)
- Sprache auf Arabisch (ar) setzen
- Layout muss sich spiegeln
- Text muss rechtslaeufig sein

### 7. AI Coach testen
- Frage eingeben (z.B. "Wie ist mein Umsatz?")
- Antwort muss kommen (nicht nur "Frag mich konkreter")
- Topic Wheel Buttons muessen funktionieren

### 8. Linter pruefen
```bash
npx next lint
```
Keine Fehler erlaubt.

---
---

# REMODELING ROADMAP

Dieses Kapitel beschreibt die komplette Transformation von CoffeeFlow von einem halbfertigen Prototyp zu einem marktfaehigen Produkt. Arbeite die Phasen der Reihe nach ab. Security/Auth kommt SPAETER und ist hier NICHT enthalten.

---

## PHASE 1: AI Coach mit Google Gemini (KOSTENLOS)

### Problem
Der Coach ist regelbasiert und "dumm". Ohne LLM wiederholt er immer die gleichen Antworten. OpenAI kostet Geld.

### Loesung: Google Gemini API (kostenloser Tier)
- 15 Requests pro Minute
- 1.000.000 Tokens pro Tag
- Modell: `gemini-2.0-flash` (schnell und kostenlos)
- Key erstellen: https://aistudio.google.com/apikey

### Umbau in `src/app/api/coach/route.ts`

Die Funktion `generateOpenAIAnswer` ersetzen mit `generateGeminiAnswer`. Der Rest (Kontext-Gathering, History, regelbasierter Fallback) bleibt gleich.

```typescript
async function generateGeminiAnswer(question: string): Promise<string> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return generateRuleBasedAnswer(question.toLowerCase());

    const context = await gatherShopContext();
    const history = await prisma.coachMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    history.reverse();

    const contents = [
      ...history.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: question }] },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `Du bist ein erfahrener Cafe-Berater (AI Coffee Shop Coach). Du antwortest auf Deutsch, klar und direkt.
Du hast Zugriff auf folgende aktuelle Shop-Daten:
${context}

Regeln:
- Kurze, konkrete Antworten (max 300 Woerter)
- Immer mit Zahlen/Daten argumentieren wenn vorhanden
- Praktische Handlungsempfehlungen geben
- Freundlich aber direkt
- Nie Spekulationen ohne Datenbasis als Fakten darstellen`
            }]
          },
          contents,
          generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
        }),
      }
    );

    if (!response.ok) return generateRuleBasedAnswer(question.toLowerCase());
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? generateRuleBasedAnswer(question.toLowerCase());
  } catch {
    return generateRuleBasedAnswer(question.toLowerCase());
  }
}
```

### Aenderungen:
1. `src/app/api/coach/route.ts`: `generateOpenAIAnswer` -> `generateGeminiAnswer`
2. Zeile 27: `if (process.env.OPENAI_API_KEY)` -> `if (process.env.GEMINI_API_KEY)`
3. `.env`: `GEMINI_API_KEY=AIza...` statt `OPENAI_API_KEY`

### Alternative: Coach komplett entfernen
Falls kein Key gewuenscht:
- Loesche `src/app/coach/` (ganzes Verzeichnis)
- Entferne Coach aus `src/components/Navigation.tsx` (MEHR_ITEMS Array, Zeile mit `/coach`)
- Entferne Coach aus `src/components/SidebarNav.tsx` (NAV_ITEMS Array, Zeile mit `/coach`)
- `src/app/api/coach/route.ts` kann bleiben (History-Daten)

---

## PHASE 2: App auf 5 Kern-Seiten reduzieren

### Problem
29 Seiten, 14 Nav-Eintraege. Ein Cafe-Besitzer ist ueberfordert.

### Neue Struktur

**Kern-Navigation (5 Items -- Mobile Bottom Bar + Sidebar Top):**

| Route | Name | Warum |
|-------|------|-------|
| `/` | Dashboard | Tages-Ueberblick |
| `/eingabe` | Eingabe | Verkaeufe + Waste erfassen |
| `/abend` | Abend | Tag abschliessen |
| `/finanzen` | Finanzen | Geld-Ueberblick |
| `/einstellungen` | Einstellungen | Alles konfigurieren |

**Unter "Mehr" (5-6 Items):**

| Route | Name | Warum |
|-------|------|-------|
| `/analytics` | Trends | Detaillierte Analyse |
| `/berichte` | Berichte | Wochen-/Monatsberichte |
| `/rezepte` | Rezepte | Rezepte + Menuplanung |
| `/personal` | Personal | Team + Schichtplan |
| `/haccp` | HACCP | Hygiene + Checklisten + Temperatur + Reinigung |
| `/coach` | Coach | AI-Berater (falls beibehalten) |

**Seiten die GELOESCHT werden (Verzeichnisse entfernen):**

```
src/app/social/          -- Nicht Kern-Funktion
src/app/erfolge/         -- Gamification ist nice-to-have
src/app/treueprogramm/   -- Nicht Kern-Funktion
src/app/wettbewerber/    -- Nicht Kern-Funktion
src/app/aktionen/        -- Nicht Kern-Funktion
src/app/drucken/         -- In Berichte/Einstellungen integrieren
src/app/debug/           -- Nur fuer Entwickler
```

**Seiten die INTEGRIERT werden (Code verschieben, dann loeschen):**

| Alte Seite | Integrieren in | Was uebernehmen |
|------------|---------------|-----------------|
| `/kasse` | `/abend` Schritt 2 | Kassenabschluss-Formular ist bereits in Abend Schritt 4 |
| `/menuplanung` | `/rezepte` | Als Tab "Menuplanung" in der Rezepte-Seite |
| `/schichtplan` | `/personal` | Als Tab "Schichtplan" in der Personal-Seite |
| `/reinigung` | `/haccp` | Als Tab "Reinigung" in der HACCP-Seite |
| `/checkliste` | `/haccp` | Als Tab "Checklisten" in der HACCP-Seite |
| `/temperatur` | `/haccp` | Als Tab "Temperatur" in der HACCP-Seite |
| `/lieferanten` | `/einstellungen` | Als Section "Lieferanten" in Einstellungen |
| `/bestellungen` | `/einstellungen` | Als Section "Bestellungen" in Einstellungen |
| `/wartung` | `/einstellungen` | Als Section "Wartung" in Einstellungen |

### Nav-Aenderungen

**`src/components/Navigation.tsx`:**
- `NAV_ITEMS`: Nur Home, Eingabe, Finanzen, Abend (4 Items + Mehr-Button)
- `MEHR_ITEMS`: Analytics, Berichte, Rezepte, Personal, HACCP, Coach, Einstellungen

**`src/components/SidebarNav.tsx`:**
- `NAV_ITEMS`: Home, Eingabe, Finanzen, Abend, Analytics, Berichte, Rezepte, Personal, HACCP, Coach, Einstellungen

---

## PHASE 3: Dashboard vereinfachen

### Problem
13 sichtbare Widgets/Bloecke. Zu viel Information auf einmal.

### Neues Dashboard (`src/app/page.tsx`)

Nur diese 5 Bloecke, in dieser Reihenfolge:

1. **Header** -- Begruessung + Wetter + Datum (bleibt)
2. **3 KPI-Karten** -- Umsatz heute, Kunden heute, Waste heute (bleibt)
3. **Break-Even Bar** -- Fortschritt zum Tagesziel (bleibt)
4. **Quick Actions** -- 3 grosse Buttons: "Verkauf eintragen", "Tag abschliessen", "Berichte ansehen"
5. **Coach-Tipp des Tages** -- EIN Satz vom AI Coach (z.B. "Dein Espresso-Waste ist hoch. Bestelle weniger.")

### Entfernen aus Dashboard:
- `StrategySelector` Komponente
- Revenue Goal Card
- 7-Day Trend Chart
- Inventory Alerts
- Suggestion Cards Liste (die ganze `SuggestionCard` Sektion)
- `TomorrowSection` Komponente
- `Tutorial` Komponente
- Recommendation Count Card

Die entfernten Komponenten werden NICHT geloescht, nur vom Dashboard entfernt. Sie bleiben in `/analytics` und `/berichte`.

---

## PHASE 4: Abend-Seite Redesign

### Problem
6 Schritte, 10+ Formularfelder. Zu lang, zu technisch, nicht kundenfreundlich.

### Neuer Flow: 3 Schritte

**Schritt 1: "Wie war dein Tag?"**
- Tages-Zusammenfassung (Umsatz, Kunden -- automatisch aus Daten)
- Sterne-Bewertung (1-5)
- KEIN Formular, nur Anzeige + 1 Klick

**Schritt 2: "Abrechnung"**
- Waste-Erfassung (Produkt-Dropdown, Menge, Grund) -- kompakt
- Kassen-Zahlen (Bargeld, Karte, Trinkgeld) -- 3 Felder
- Alles auf EINER Seite, kein Extra-Schritt

**Schritt 3: "Tag abschliessen"**
- Zusammenfassung aller Eingaben
- Optionale Notiz
- GROSSER "Tag abschliessen" Button
- Erfolgs-Animation (Konfetti oder Checkmark)

### Entfernen:
- **Restbestand-Schritt** -- Kann jederzeit unter Eingabe > Inventar gemacht werden
- **Vorschlaege-Schritt** -- Gehoert auf Dashboard oder Analytics, nicht in den Abend-Flow

### Design-Anforderungen:
- Fortschrittsanzeige oben: 3 Kreise mit Verbindungslinie, aktiver Kreis in Orange
- Touch-Targets: Mindestens 56px Hoehe fuer alle Buttons und Inputs
- Slide-Transition zwischen Schritten (Framer Motion `AnimatePresence` mit x-Offset)
- Erfolgs-Animation bei "Tag abschliessen": `CheckmarkAnimation` aus `src/components/animations.tsx`

---

## PHASE 5: Design-Verbesserungen

### Problem
Die App sieht funktional aus, aber nicht premium. Kein "Wow"-Effekt.

### 5.1 Mehr Whitespace
- Cards: `padding: 16px` -> `padding: 20px` (in `.card` Klasse, `globals.css`)
- Abstand zwischen Sections: `space-y-4` -> `space-y-6` auf allen Seiten
- Dashboard Header: Mehr Luft zwischen Begruessung und KPIs

### 5.2 Bessere Typografie-Hierarchie
- `.text-greeting`: 28px -> 32px, letter-spacing -0.03em
- `.text-section`: 20px -> 22px
- Zahlen (Umsatz, KPIs): 28px statt 24px, `font-weight: 700`
- Mehr Kontrast zwischen Primary und Secondary Text

### 5.3 Micro-Interactions
- **Speichern**: Sanfter Checkmark-Ripple (nicht nur Text-Aenderung)
- **Abend abschliessen**: Konfetti oder expandierender Kreis
- **Tab-Wechsel**: Slide-Animation statt Fade
- **Button-Press**: Scale 0.97 + Haptic (navigator.vibrate(10))
- **Pull-to-Refresh**: Auf Dashboard-Seite implementieren
- **Card-Tap**: Ripple-Effekt wie Material Design

### 5.4 Konsistentes Component-System
- ALLE Seiten muessen `.card` Klasse nutzen (keine eigenen `bg-[var(--color-card-bg)] rounded-2xl` inline)
- ALLE Buttons muessen `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger` nutzen
- ALLE Inputs muessen `.input-field` nutzen
- KEINE inline `style={{}}` fuer Farben -- nur CSS-Variablen oder Tailwind-Klassen

### 5.5 Mobile-First
- Bottom-Nav: Buttons muessen mit dem Daumen erreichbar sein (aktuell OK)
- Formulare: Labels ueber den Inputs, nicht daneben
- Groessere Touch-Targets: Mindestens 48px fuer alle klickbaren Elemente
- Kein horizontales Scrollen auf 320px Breite
- Sticky Header auf langen Seiten (Eingabe, Einstellungen)

### 5.6 Farbschema aufwerten
- Mehr Orange/Rot Akzente (User-Wunsch)
- KPI-Karten: Farbiger linker Rand (gruen fuer Umsatz, rot fuer Waste, blau fuer Kunden)
- Active Tab: Orange Unterstrich statt grauer Hintergrund
- Erfolgs-Meldungen: Gruener Hintergrund statt nur gruener Text

---

## PHASE 6: POS-CSV-Import

### Problem
Kein Cafe-Besitzer tippt jeden Verkauf manuell ein. Ohne POS-Import hat die App keine Daten.

### Loesung: SumUp CSV Import

**SumUp Export-Format (Beispiel):**
```csv
Datum,Uhrzeit,Betrag,Zahlungsart,Produkt,Menge,Trinkgeld
2025-01-15,08:32,3.50,Karte,Espresso,1,0.00
2025-01-15,08:35,4.20,Bar,Cappuccino,1,0.50
```

### Neue API-Route: `src/app/api/import/csv/route.ts`

```typescript
// POST: Empfaengt CSV-Datei, parsed Zeilen, erstellt DailySales-Eintraege
// 1. CSV parsen (Zeile fuer Zeile)
// 2. Produkt-Name aus CSV -> Produkt-ID aus DB matchen
//    - Exakter Match zuerst
//    - Fuzzy Match (Levenshtein) als Fallback
//    - Unbekannte Produkte: Liste zurueckgeben, User muss mappen
// 3. DailySales-Eintraege erstellen (gruppiert nach Tag + Produkt)
// 4. Optional: Kunden-Anzahl aus Transaktions-Count ableiten
```

### Upload-UI auf der Eingabe-Seite (`src/app/eingabe/page.tsx`)

Neuer Tab "Import" neben "Verkaeufe", "Inventar", "Waste":
- Drag-and-Drop Zone fuer CSV-Datei
- Vorschau der erkannten Daten (Tabelle)
- Mapping-UI fuer unbekannte Produkte (Dropdown: "Welches Produkt ist 'Espresso Doppelt'?")
- "Importieren" Button
- Erfolgs-Meldung mit Zusammenfassung ("42 Verkaeufe importiert, 3 neue Produkte angelegt")

### Unterstuetzte POS-Systeme (spaeter erweiterbar):
- SumUp (CSV Export)
- Lightspeed (CSV Export)
- iZettle/Zettle (CSV Export)
- Generisches CSV (User definiert Spalten-Mapping)

---

## PHASE 7: Demo-Daten und Onboarding

### Problem
Leere App = User versteht den Wert nicht. Leeres Dashboard, leere Charts, leere Coach-Antworten.

### 7.1 Demo-Modus

Neuer Button in Einstellungen oder beim ersten Start: "Demo-Daten laden"

Erzeugt realistische Daten fuer 30 Tage:
- 8-12 Produkte (Espresso, Cappuccino, Latte, Americano, Filterkaffee, Croissant, Muffin, Sandwich, OJ, Wasser, Tee, Brownie)
- 30 Tage DailySales (realistisch: Mo-Fr mehr, Sa weniger, So geschlossen)
- 30 Tage DayClose (Umsatz 400-800 EUR/Tag)
- Waste-Eintraege (2-5 pro Tag, hoeher bei Gebaeck)
- 3-5 Mitarbeiter mit Stunden
- 5 Rezepte mit Zutaten
- Shop-Settings (Name, Fixkosten, Oeffnungszeiten)

API-Route: `POST /api/demo-data` -- generiert alles und schreibt in DB.

### 7.2 Produkt-Seeding

Beim ersten Start (wenn `Product` Tabelle leer ist):
- Automatisch 8 Standard-Cafe-Produkte anlegen
- Mit realistischen Preisen (Espresso 2.50, Cappuccino 3.50, etc.)
- User kann sie danach anpassen/loeschen

Implementierung: In `src/app/api/products/route.ts` GET Handler -- wenn 0 Produkte, automatisch seeden.

### 7.3 Feedback-Loop

Nach jeder Coach-Empfehlung: "War das hilfreich?" Button (Daumen hoch/runter).
- Speichern in neuer DB-Tabelle `CoachFeedback` (messageId, helpful: boolean)
- Coach nutzt Feedback um Antworten zu verbessern (im System-Prompt: "Der User fand folgende Tipps hilfreich/nicht hilfreich: ...")

---

## PHASE 8: UX-Verbesserungen

### 8.1 Tages-Flow statt Seiten-Sammlung

Die App soll sich um 3 Tages-Momente drehen:

**Morgens (Dashboard):**
- "Guten Morgen! Heute erwartest du ca. 65 Kunden (basierend auf letztem Mittwoch)."
- Wetter-basierte Empfehlung
- Checkliste: "Maschine aufgewaermt? Bestaende geprueft?"

**Mittags (Quick-Check):**
- Aktueller Umsatz vs. Break-Even
- "Du bist 12% ueber dem Schnitt -- laeuft gut!"
- Quick-Entry fuer Verkaeufe (falls kein POS-Import)

**Abends (Abschluss):**
- 3-Schritt Abend-Flow (siehe Phase 4)
- "Heute war ein guter Tag: 580 EUR, 8% weniger Waste als letzte Woche."

### 8.2 Error-Handling

Aktuell: API-Fehler werden geschluckt, User sieht nichts.

Implementiere eine globale Toast-Komponente (`src/components/Toast.tsx`):
- Erfolg: Gruener Toast, 3 Sekunden sichtbar
- Fehler: Roter Toast, bleibt bis geschlossen
- Warning: Oranger Toast, 5 Sekunden
- Retry-Button bei Netzwerk-Fehlern

Jeder `fetch()` Aufruf in der App sollte bei Fehler einen Toast triggern.

### 8.3 Undo-Funktion

Fuer kritische Aktionen:
- Waste loeschen: "Eintrag geloescht. RUECKGAENGIG" Toast (5 Sekunden, danach endgueltig)
- Tagesabschluss: "Tag abgeschlossen. RUECKGAENGIG" Toast (10 Sekunden)
- Produkt loeschen: Soft-Delete (isActive = false statt wirklich loeschen)

### 8.4 Tastatur-Shortcuts (Desktop)

Globaler Event-Listener in `src/app/layout.tsx`:
- `E` -> `/eingabe`
- `A` -> `/abend`
- `D` -> `/` (Dashboard)
- `F` -> `/finanzen`
- `Escape` -> Modals schliessen
- `Ctrl+S` -> Aktives Formular speichern

### 8.5 Gesten (Mobile)

- Swipe links/rechts zwischen Tabs (Eingabe: Verkaeufe/Inventar/Waste)
- Pull-to-refresh auf Dashboard
- Long-press auf Produkt -> Quick-Edit Modal

---

## PHASE 9: Killer-Features (schwer zu kopieren)

### 9.1 Automatische Insights (Push statt Pull)

Statt darauf zu warten dass der User den Coach fragt, PROAKTIV Insights generieren.

Neue API-Route: `POST /api/insights/generate` (wird taeglich per Cron oder beim Dashboard-Load aufgerufen)

Analysiert automatisch:
- Waste-Anomalien ("Espresso-Waste ist 40% hoeher als normal")
- Umsatz-Trends ("Freitags verdienst du 30% mehr -- nutze das fuer Aktionen")
- Personal-Effizienz ("Sarah hat den hoechsten Umsatz pro Stunde")
- Break-Even-Timing ("Du erreichst den Break-Even im Schnitt um 11:30")

Anzeige: 1-2 Satz-Karte auf dem Dashboard (Phase 3, Block 5 "Coach-Tipp des Tages").

### 9.2 Wetter-basierte Vorhersagen

Die Wetter-API ist bereits angebunden (`/api/weather`). Aber sie wird nur als Widget angezeigt.

Stattdessen nutzen fuer:
- "Morgen regnet es -- erwarte 20% weniger Kunden. Bestelle weniger Gebaeck."
- "Naechste Woche wird heiss -- erhoehe Kaltgetraenke-Bestand."
- Historischer Vergleich: "An Regentagen machst du durchschnittlich 380 EUR (vs. 520 EUR bei Sonne)"

Implementierung: In der Insights-Engine (`src/lib/engine/`) Wetter-Daten mit historischen Umsaetzen korrelieren.

### 9.3 Lern-Algorithmus

Nach 30+ Tagen Daten kann die App Muster erkennen:

- **Wochentags-Muster**: "Montag: Ø 45 Espresso, Freitag: Ø 72"
- **Saison-Muster**: "Im Winter 25% mehr Heissgetraenke, im Sommer 40% mehr Kaltgetraenke"
- **Personal-Muster**: "Wenn Sarah arbeitet, ist der Umsatz 15% hoeher (besseres Upselling?)"
- **Waste-Muster**: "Croissants werden zu 60% am Nachmittag weggeworfen -- produziere morgens weniger"

Implementierung: Einfache statistische Analyse in `src/lib/engine/patterns.ts`:
- Gruppiere DailySales nach Wochentag -> Mittelwert
- Gruppiere WasteLog nach Produkt+Tageszeit -> Spitzen erkennen
- Korreliere Personalplanung mit Umsatz

Kein Machine Learning noetig -- einfache Durchschnitte und Vergleiche reichen fuer 90% der Insights.

---

## PHASE 10: Strategische Hinweise

### Was CoffeeFlow einzigartig macht (Unique Selling Point)

**"Der einzige AI-Berater der DEINE echten Cafe-Zahlen kennt."**

Kein Konkurrent hat einen personalisierten AI-Coach der auf echte Shop-Daten zugreift (Umsatz, Waste, Personal, Rezepte, Wetter) und daraus konkrete Empfehlungen macht. DAS ist der Kern. Alles andere (Eingabe, Berichte, HACCP) machen andere auch.

### Was die Konkurrenz hat

| Feature | Apicbase | Lightspeed | Gastrofix | CoffeeFlow |
|---------|----------|------------|-----------|------------|
| POS-Integration | Ja | Ja (eigen) | Ja (eigen) | NEIN (CSV geplant) |
| Multi-Standort | Ja | Ja | Ja | NEIN |
| Cloud/Sync | Ja | Ja | Ja | NEIN (lokal) |
| AI-Coach | NEIN | NEIN | NEIN | JA (USP!) |
| Food-Cost-Analyse | Ja | Basic | Basic | JA (detailliert) |
| Preis | 200+ EUR/Monat | 100+ EUR/Monat | 150+ EUR/Monat | GRATIS |

### Mikrofon / Spracheingabe

Web Speech API funktioniert NUR in:
- Chrome (Desktop + Android): VOLL UNTERSTUETZT
- Edge (Desktop): VOLL UNTERSTUETZT
- Safari (iOS/Mac): TEILWEISE (kein continuous mode)
- Firefox: NICHT UNTERSTUETZT

Muss auf `localhost` oder `HTTPS` laufen. Kein Code-Fix moeglich -- Browser-Limitation.

Wenn Mikrofon nicht funktioniert:
1. Pruefe ob Chrome/Edge genutzt wird
2. Pruefe Mikrofon-Berechtigung (Browser-Adressleiste, Schloss-Symbol)
3. Pruefe ob URL `localhost:3000` ist (nicht `127.0.0.1` oder IP)

---

## PHASE 11: Progressive Web App (PWA)

### Problem
Kein Cafe-Besitzer oeffnet einen Laptop um seine Tagesabrechnung zu machen. Die App muss sich wie eine native App anfuehlen -- mit Icon auf dem Homescreen, Splash Screen, und Vollbild-Modus.

### Implementierung

**1. `public/manifest.json` erstellen:**
```json
{
  "name": "CoffeeFlow",
  "short_name": "CoffeeFlow",
  "description": "AI-gesteuerter Cafe-Coach",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0F1117",
  "theme_color": "#F0A060",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**2. `src/app/layout.tsx` -- Meta-Tags hinzufuegen:**
```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#F0A060" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

**3. Service Worker (`public/sw.js`):**
- Cache-First fuer statische Assets (JS, CSS, Bilder)
- Network-First fuer API-Calls
- Offline-Fallback-Seite: "Du bist offline. Letzte Daten werden angezeigt."

**4. `src/components/ServiceWorkerRegister.tsx`** existiert bereits -- pruefen ob es `sw.js` registriert.

**5. Icons generieren:**
- 192x192 und 512x512 PNG
- Maskable-Version (mit Padding fuer runde Icons auf Android)
- Favicon.ico aktualisieren

### Ergebnis
User kann auf "Zum Startbildschirm hinzufuegen" tippen (Chrome/Safari) und hat CoffeeFlow als App-Icon.

---

## PHASE 12: Backup / Restore

### Problem
Alles liegt in einer lokalen SQLite-Datei. Geraet kaputt = Daten weg. Kein Cloud-Backup geplant.

### Loesung: JSON-Export und -Import

**Export (bereits teilweise vorhanden: `src/app/api/backup/route.ts` GET):**
- Alle Tabellen als JSON exportieren
- Als `.coffeeflow-backup.json` herunterladen
- Dateiname: `coffeeflow-backup-2025-01-15.json`

**Import (`src/app/api/backup/route.ts` POST -- pruefen ob vorhanden):**
1. JSON-Datei hochladen
2. Validierung: Ist es ein gueltiges CoffeeFlow-Backup?
3. Warnung: "Alle bestehenden Daten werden ueberschrieben!"
4. Bestaetigungs-Dialog (2x klicken: "Wirklich ueberschreiben?" -> "Ja, alle Daten ersetzen")
5. Alle Tabellen leeren (deleteMany)
6. Daten aus JSON einfuegen (createMany)
7. Erfolgs-Meldung

**UI in Einstellungen (`src/app/einstellungen/page.tsx`):**
- Section "Datensicherung"
- Button "Backup herunterladen" (download JSON)
- Button "Backup wiederherstellen" (upload JSON)
- Letztes Backup-Datum anzeigen (in localStorage speichern)
- Erinnerung: "Letztes Backup vor 14 Tagen -- jetzt sichern?"

---

## PHASE 13: Tablet-Layout

### Problem
Cafe-Besitzer nutzen oft iPads oder guenstige Android-Tablets. Die App ist entweder Phone (< 768px) oder Desktop (> 1024px). Dazwischen sieht es suboptimal aus.

### Breakpoints

```css
/* Phone: < 768px (aktuelle Mobile-Ansicht, bleibt) */
/* Tablet: 768px - 1023px (NEU) */
/* Desktop: >= 1024px (aktuelle Desktop-Ansicht, bleibt) */
```

### Aenderungen fuer Tablet (768px - 1023px)

**Dashboard (`src/app/page.tsx`):**
- KPI-Karten: 3 nebeneinander (statt untereinander auf Phone)
- Quick Actions: 3 nebeneinander
- 2-Spalten-Layout: Links KPIs + Actions, rechts Coach-Tipp

**Eingabe (`src/app/eingabe/page.tsx`):**
- Produkt-Grid: 3 Spalten statt 2
- Tabs bleiben horizontal

**Abend (`src/app/abend/page.tsx`):**
- Formularfelder: 2 pro Zeile statt 1
- Zusammenfassung: 2-Spalten-Grid

**Navigation:**
- Bottom-Bar bleibt (auch auf Tablet -- Daumen-Erreichbarkeit)
- Sidebar wird NICHT angezeigt (erst ab 1024px)
- Aber: "Mehr"-Menue wird als 2-Spalten-Grid dargestellt

**Allgemein:**
- `.card` max-width: 100% (kein Beschneiden)
- Padding: 20px statt 16px
- Font-Size bleibt gleich (Phone-Groesse ist auf Tablet gut lesbar)

### Implementierung
Tailwind `md:` Prefix fuer 768px Breakpoint nutzen. Kein neuer Breakpoint noetig.

---

## PHASE 14: Drucken

### Problem
Tages-Zusammenfassung drucken fuer den Ordner / Steuerberater. Die alte Druck-Seite (`/drucken`) wird geloescht.

### Neue Loesung: Druck-Button in Berichte und Abend

**Option A: Browser-Print (einfach):**
- Button "Drucken" auf der Berichte-Seite
- `window.print()` aufrufen
- CSS `@media print` Regeln in `globals.css`:
  - Navigation ausblenden
  - Sidebar ausblenden
  - Hintergrund weiss
  - Nur der Bericht-Inhalt wird gedruckt
  - Seitenraender fuer A4

**Option B: PDF-Export (besser):**
- Die bestehende API `/api/export/pdf` nutzen (existiert bereits in `src/app/api/export/pdf/route.ts`)
- Button "Als PDF herunterladen" auf Berichte-Seite
- PDF wird generiert und heruntergeladen

**Abend-Abschluss:**
- Nach "Tag abschliessen": Button "Tages-Zusammenfassung drucken"
- Zeigt Umsatz, Kunden, Waste, Kassendifferenz
- Nutzt entweder `window.print()` oder PDF-Export

### CSS Print-Regeln (`globals.css`)
```css
@media print {
  nav, .sidebar-nav, .context-panel, .bottom-nav { display: none !important; }
  body { background: white !important; color: black !important; }
  .card { box-shadow: none !important; border: 1px solid #ddd !important; }
  .no-print { display: none !important; }
}
```

---

## PHASE 15: i18n-Audit

### Problem
10 Sprachen angelegt (DE, EN, TR, AR, FR, IT, ES, PL, ZH, JA), aber viele Keys sind wahrscheinlich unvollstaendig oder haben nur den deutschen/englischen Fallback.

### Audit-Prozess

**1. Script schreiben: `scripts/i18n-audit.ts`**
```typescript
// 1. Lade alle Keys aus de.json (Referenz-Sprache)
// 2. Fuer jede andere Sprache: Pruefe ob ALLE Keys vorhanden sind
// 3. Output: Liste fehlender Keys pro Sprache
// 4. Bonus: Pruefe ob Werte identisch mit DE sind (= nicht uebersetzt)
```

**2. Fehlende Keys ergaenzen:**
- Prioritaet 1: EN (wichtigste Zweitsprache)
- Prioritaet 2: TR, AR (groesste Gastro-Communities in DE)
- Prioritaet 3: FR, IT, ES, PL, ZH, JA

**3. Dynamische Keys finden:**
Suche nach `t(variable)` statt `t("fester.key")` -- diese koennen nicht statisch geprueft werden.

**4. RTL-Test:**
AR (Arabisch) muss in RTL-Layout funktionieren. Pruefe:
- Text-Ausrichtung
- Icons/Pfeile gespiegelt
- Sidebar auf der rechten Seite

---

## PHASE 16: Performance-Optimierung

### Problem
10+ Seiten mit Framer Motion, Charts, und API-Calls. Auf einem guenstigen Tablet kann das langsam werden.

### Massnahmen

**1. Lazy Loading (Next.js `dynamic`):**
```typescript
import dynamic from "next/dynamic";
const CoachPage = dynamic(() => import("./coach/page"), { ssr: false });
const AnalyticsPage = dynamic(() => import("./analytics/page"), { ssr: false });
```
Seiten die nicht sofort gebraucht werden: Coach, Analytics, Berichte, Rezepte, Personal, HACCP.

**2. Code Splitting:**
- Framer Motion nur auf Seiten laden die es brauchen (nicht global)
- Chart-Bibliothek (SVG-Sparklines) lazy laden
- Lucide Icons: Nur genutzte Icons importieren (nicht `import * from "lucide-react"`)

**3. API-Call-Optimierung:**
- Dashboard: ALLE KPIs in EINEM API-Call (`/api/dashboard/kpis` existiert bereits)
- Keine parallelen Fetches die dasselbe abfragen
- `SWR` oder `React Query` fuer Caching (optional, spaeter)

**4. Bundle-Analyse:**
```bash
npx @next/bundle-analyzer
```
Ziel: First Load JS < 150kb (gzipped).

**5. Bilder/Assets:**
- SVG statt PNG wo moeglich
- next/image fuer automatische Optimierung
- Keine Bilder > 100kb

**6. Messen:**
- Lighthouse Score > 90 (Performance)
- First Contentful Paint < 1.5s
- Time to Interactive < 3s

---

### Was SPAETER kommt (NICHT in dieser Roadmap)

Diese Features sind wichtig, aber erst nach dem Produkt-Kern:
- Authentication (Login/Passwort) -- fuer echten Betrieb
- PostgreSQL-Migration -- fuer Multi-User
- Push-Notifications -- fuer Erinnerungen
- Multi-Filiale -- fuer Ketten
- DATEV-Export -- fuer deutschen Steuerberater
- Offline-Mode (Service Worker) -- fuer schlechtes WLAN
- Unit-Tests + E2E-Tests -- fuer Stabilitaet
- Landing Page / Marketing-Website -- fuer Kundengewinnung
- Bezahlmodell (Stripe) -- fuer Monetarisierung
