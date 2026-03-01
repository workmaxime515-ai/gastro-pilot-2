# CAFE COACH — MASTER DOCUMENT

Letzte Aktualisierung: 15. Februar 2026
Status: BEREIT ZUR UMSETZUNG

Dieses Dokument ist die EINZIGE Referenz fuer das gesamte Projekt.
Es enthaelt: Denkprozess, Recherche-Quellen, Vision, Wettbewerber-Analyse,
Feature-Liste, Design-Regeln, technische Architektur, To-Do-Liste und
Umsetzungsplan.

---

## 0. DENKPROZESS UND RECHERCHE-QUELLEN

### Wie dieses Dokument entstanden ist:

1. Der Owner (User) beschrieb die Vision: "Ein taeglicher Decision Coach
   fuer Coffee Shops, kein Dashboard."

2. Erste Version gebaut (v1): Next.js 16 + Prisma 7 + SQLite + Tailwind v4.
   18 Features implementiert, App laeuft, Build erfolgreich.

3. Owner gab Design-Feedback: "Zu boxy, zu viele Emojis, sieht aus wie
   ein SaaS-Template." -> Master Design Brief erstellt mit exakten Regeln.

4. Owner forderte mehr Features: "Excel muss komplett ersetzt werden.
   Die App muss ALLES koennen." -> Wettbewerber-Recherche durchgefuehrt.

5. Owner teilte ChatGPT-Analyse ueber Wettbewerber (WISK, CafeManager.AI,
   TouchBistro, 7shifts, Restoke) -> In Analyse eingearbeitet.

6. Ergebnis: 46 Features geplant, Design-Brief fixiert, Umsetzung in
   7 Phasen organisiert.

### Recherche-Quellen:

- NerdWallet: Best Cafe POS Systems 2026
  https://www.nerdwallet.com/business/software/best/cafe-coffee-shop-pos-systems

- Expert Market: Best POS for Cafes 2026
  https://www.expertmarket.com/best-pos-systems-for-cafes

- Lark Suite: Coffee Shop Management Software 2025
  https://larksuite.com/en_us/blog/coffee-shop-management-software

- Slant Co: Excel Spreadsheets for Startup Coffee Shops
  https://blog.slantco.com/what-excel-spreadsheets-should-a-startup-coffee-shop-create/

- Slant Co: Cafe Inventory with Excel
  https://blog.slantco.com/how-to-calculate-your-cafe-inventory-with-an-excel-spreadsheet/

- BeanCount: Coffee Shop Bookkeeping Guide 2026
  https://beancount.io/blog/2026/01/25/coffee-shop-bookkeeping-complete-financial-guide

- WISK.AI: Coffee Shop Management System
  https://www.wisk.ai/for/coffee-shop-management-system-wisk

- WISK.AI: Pricing
  https://www.wisk.ai/price

- TouchBistro: Inventory Management
  https://www.touchbistro.com/inventory-management/

- TouchBistro: Staff Scheduling
  https://www.touchbistro.com/features/staff-management-scheduling/

- TouchBistro: Reporting
  https://www.touchbistro.com/features/reporting-analytics/

- MarketMan: Pricing
  https://www.marketman.com/pricing-for-restaurant-inventory-management-system

- 7shifts: Scheduling Software
  https://7shifts.com/restaurant-employee-scheduling-software

- 7shifts: Reports
  https://www.7shifts.com/reports/

- Restoke.AI: Platform
  https://www.restoke.ai/

- Forbes Australia: Restoke $5M Funding
  https://forbes.com.au/covers/magazine/restoke-ai-the-5m-solution-to-save-australias-hospitality-industry

- Coffee Shop Keys: 2025 Industry Report
  https://www.coffeeshopkeys.com/post/the-2025-independent-coffee-shop-industry-report

- Joe Coffee Blog: Profit Killers
  https://blog.joe.coffee/coffee-shop-profit-killers

- Joe Coffee Blog: Challenges for Independent Shops
  https://blog.joe.coffee/the-3-biggest-challenges-holding-independent-coffee-shops-back-and-how-to-overcome-them

- Fresh Cup: Modern Coffee Shop Tech Stack
  https://freshcup.com/the-modern-coffee-shop-tech-stack/

- StampMe: Digital Loyalty Card Features
  https://www.stampme.com/blog/cafe-digital-loyalty-card

- FaveCard: Coffee Shop Loyalty Program 2026
  https://www.favecard.co/en/blog/coffee-shop-loyalty-program/

- Vibe Branding: Cafe Promotion Ideas 2025
  https://vibebranding.com/blog/cafe-promotion-ideas/

- Square: Cafe Marketing Ideas
  https://squareup.com/ca/en/the-bottom-line/reaching-customers/marketing-plan-for-a-coffee-shop

- Apicbase: Restaurant Back of House
  https://get.apicbase.com/platform/

- Restaurant365: Inventory Management
  https://www.restaurant365.com/inventory/

### Kern-Erkenntnisse aus der Recherche:

1. WISK kostet $199-699/Monat und kann NUR Inventar.
   Wir bieten Inventar + 45 andere Features.

2. Kein einziger Wettbewerber bietet taegliche Action-Empfehlungen
   mit erklaerbarer KI. Das ist unser USP.

3. Cafe-Besitzer zahlen 37-40% Food Cost (Starbucks: 26%).
   Allein Rezept-Kalkulation + Waste-Vorschlaege koennen das senken.

4. 75% der Cafe-Besitzer nennen Personal als groesste Sorge.
   Demand-basierte Personalplanung ist ein Killer-Feature.

5. HACCP-Dokumentation ist bei KEINEM Wettbewerber vollstaendig digital.
   Das ist eine offene Luecke die wir fuellen.

6. Restoke.AI spart Restaurants $8,000/Woche — aber nur fuer grosse Ketten.
   Wir machen dasselbe fuer kleine Cafes.

---

## 1. VISION

Eine All-in-One App fuer Cafe-Besitzer die Excel, Zettelwirtschaft
und 5 verschiedene Tools ersetzt.

Kein Dashboard. Kein SaaS-Look. Ein ruhiger, hochwertiger Entscheidungsraum
der jeden Morgen sagt: "Das musst du heute tun."

Die App muss sich anfuehlen wie:
"Ein ruhiger, hochwertiger Entscheidungsraum vor Ladenoeffnung."

Wenn der Owner die App oeffnet, soll er denken:
"Okay. Das ist ruhig. Das ist klar. Ich weiss, was ich heute tun muss."

---

## 2. WARUM WIR BESSER SIND ALS EXCEL

Excel kann:
- Tabellen und Berechnungen (gut)
- Formeln und Mathe (praezise)

Excel kann NICHT:
- Gut aussehen
- Empfehlungen geben
- Automatisch analysieren
- HACCP-konform dokumentieren
- Cafe-spezifische Workflows
- Mobil funktionieren
- Mehrere Datenbereiche verknuepfen

WIR muessen:
- Dieselbe Daten-Qualitaet liefern (Zahlen MUESSEN stimmen)
- ABER: Besser aussehen, besser strukturiert, besser bedienbar
- UND: Dinge koennen die Excel nie kann (KI-Empfehlungen, HACCP, alles in einer App)

---

## 3. WETTBEWERBER-ANALYSE

### 3.1 WISK (Inventar + POS-Integration)
- Preis: $199-699/Monat
- Staerken: Automatisches Inventar-Tracking, 80% weniger Zaehlzeit,
  1.5M Zutaten-Datenbank, 60+ POS-Integrationen, Invoice-Scanning
- Schwaerchen: Food Cost Management, Menu Costing, Smart Ordering
- Was sie NICHT koennen: Taegliche Action-Empfehlungen, Entscheidungs-Coaching,
  HACCP, Personalplanung, Marketing

### 3.2 TouchBistro (POS + All-in-One)
- Staerken: 50+ Reports, Staff Scheduling mit Demand-Forecasting,
  Recipe Costing, Floor Plan Management, Tableside Ordering
- Schwaerchen: Nur mit eigenem POS, teuer, komplex
- Was sie NICHT koennen: KI-basierte Handlungsempfehlungen,
  "Was soll ich heute tun?"-Logik, Erklaerbare Entscheidungen

### 3.3 MarketMan (Inventar + Bestellungen)
- Preis: $199-249/Monat
- Staerken: AI-powered Recipe Creation, Real-time COGS,
  Vendor Management, Invoice Scanning, Waste Tracking
- Schwaerchen: Starker Inventar-Fokus
- Was sie NICHT koennen: Taegliches Coaching, HACCP, Personalkosten-Optimierung

### 3.4 7shifts (Personal-Planung)
- Staerken: AI Optimal Labor Tool, 95% Sales Forecast Accuracy,
  Demand-basierte Scheduling, Labor Cost Tracking, Team Communication
- Schwaerchen: NUR Personal, kein Inventar, kein Finanz-Tracking
- Was sie NICHT koennen: Inventar, HACCP, Rezeptkosten, Marketing

### 3.5 Restoke.AI (AI Restaurant Manager)
- Preis: Nicht oeffentlich (Startup, $5.1M Funding)
- Staerken: AI Demand Prediction, Automated Ordering, Recipe Costing,
  Waste Reduction, Multi-Venue, spart $8,000/Woche
- Schwaerchen: Eher fuer grosse Restaurant-Gruppen
- Was sie NICHT koennen: Fokus auf taegliche Owner-Entscheidungen,
  Einfache UI fuer kleine Cafes, HACCP-Dokumentation

### 3.6 Zusammenfassung: Was ALLE nicht koennen

| Feature                           | WISK | TouchBistro | MarketMan | 7shifts | Restoke |
|-----------------------------------|------|-------------|-----------|---------|---------|
| Taegliche Action-Empfehlungen     | Nein | Nein        | Nein      | Nein    | Teilw.  |
| Erklaerbare KI ("Warum?")         | Nein | Nein        | Nein      | Nein    | Nein    |
| HACCP Digital komplett            | Nein | Nein        | Nein      | Nein    | Nein    |
| Alles in einer App                | Nein | Teilw.      | Nein      | Nein    | Teilw.  |
| Fuer kleine Cafes designed        | Nein | Nein        | Nein      | Ja      | Nein    |
| Premium ruhiges Design            | Nein | Nein        | Nein      | Nein    | Nein    |
| Kein POS noetig                   | Nein | Nein        | Nein      | Ja      | Nein    |
| Owner-Feedback Loop (lernend)     | Nein | Nein        | Nein      | Nein    | Nein    |

---

## 4. PAIN POINTS VON CAFE-BESITZERN (Recherche 2025)

1. 75% nennen Personal als groesste Sorge
2. Food Cost liegt bei 37-40% statt optimaler 26% (Starbucks)
3. Daten werden in 5+ verschiedenen Systemen dupliziert
4. POS wird nur als Kasse genutzt, nicht als Wachstums-Tool
5. Keine Demand Forecasting = Ueberproduktion + Waste
6. Manuelle Dateneingabe frisst Arbeitszeit
7. Loyalitaetsprogramme sind oft papierbasiert
8. HACCP-Dokumentation ist Zettelwirtschaft
9. Kein Ueberblick ueber Gewinn/Verlust in Echtzeit
10. Software ist zu komplex oder zu teuer fuer kleine Cafes

---

## 5. UNSER USP (Unique Selling Proposition)

1. ACTION COACHING statt nur Reports
   - Jeden Tag 3-5 konkrete Handlungen, nicht 50 Diagramme
   - KI erklaert WARUM: "Weil letzte 4 Regentage +22% Croissant-Sales"

2. ALLES IN EINER APP
   - Kasse, Inventar, Personal, HACCP, Marketing, Finanzen
   - Kein "noch ein Tool" — EIN Tool das alles kann

3. FUER KLEINE CAFES DESIGNED
   - Einfach genug fuer 1-Person-Betrieb
   - Kein POS noetig (manuelle Eingabe reicht)
   - Preis muss unter den Wettbewerbern liegen

4. PREMIUM DESIGN
   - Ruhig, hochwertig, nicht wie Software
   - "Entscheidungsraum", nicht "Dashboard"

5. LERNENDE KI
   - Owner gibt Feedback -> Engine wird besser
   - Confidence Decay bei falschen Vorhersagen
   - Cold-Start mit Branchendurchschnitten

---

## 6. DESIGN-REGELN (Master Brief — nicht verhandelbar)

### 6.1 Visual Identity
- Minimalistisch, warm, ruhig, hochwertig
- Viel Weissraum, keine harten Linien
- Keine lauten Animationen, KEINE Emoji-UI

### 6.2 Light Mode (Default)
```
--bg-main: #F7F3EE
--card-bg: #FFFFFF
--text-primary: #1F1A17
--text-secondary: #7A6E63
--accent-primary: #C69C72
--accent-profit: #5E7D6A
--accent-waste: #C97A5A
--accent-stress: #5C728A
--accent-warning: #B5523B
```

Regeln:
- Hintergrund: #F7F3EE
- Karten: Weiss, KEINE Border
- Shadow: box-shadow: 0 4px 16px rgba(0,0,0,0.04)
- 4px farbiger Streifen links an Action Cards
- Keine vollflaechigen Farbflaechen

### 6.3 Dark Mode
```
--bg-main: #151210
--card-bg: #221C18
--text-primary: #F2E7D8
--text-secondary: #A89784
--accent-primary: #D6A97E
```
Warm, nicht techy. Kein reines Schwarz.

### 6.4 Typografie
- Headings: Plus Jakarta Sans, weight 600
- Body: Inter, weight 400
- Numbers: JetBrains Mono, weight 500
- Groessen: Greeting 28px, Section 20px, Card 18px, Body 14px, Meta 12px
- Kein uebermaessiges Bold, keine All Caps

### 6.5 Layout
- Mobile First, Single Column
- Desktop: 3-Spalten (Sidebar 240px | Mitte 720px | Rechts 280px)
- Spacing: 8px Base Grid, 16px Padding, 24px Section, 32px gross

### 6.6 Animationen
- Dauer: 200-300ms, Easing: ease-in-out
- Keine Bounce-Effekte, keine uebertriebenen Uebergaenge

### 6.7 Verboten
- Kein Tailwind-Default-UI-Look
- Keine Bootstrap-Optik
- Keine grellen Gradients
- Keine dicken Borders
- Keine bunten Hintergruende
- Keine Chart-Library-Explosion
- Keine SaaS-Admin-Template-Optik
- KEINE EMOJIS in der UI

---

## 7. KOMPLETTE FEATURE-LISTE

### Was wir BEREITS haben (v1):
01. Suggestions Engine (3-5 taegliche Empfehlungen)
02. Strategy Modes (Profit, Waste, Stress, Balanced)
03. Sales Entry (Bulk, Quick, "Wie gestern")
04. Inventory Tracking
05. Waste Logging
06. Staff Management (basic)
07. Break-Even Calculator
08. Day Close Flow
09. Temperature Log
10. Morning Checklist
11. Emergency System (6 Typen + Food Safety Timer)
12. Quick Notes
13. Competitor Notes
14. Tomorrow Planner
15. Confidence System (lernend)
16. Tutorial + Onboarding
17. Dark Mode
18. PWA + Offline

### Was wir NEU bauen (v2):

FINANZEN:
19. Kassenbuch / Kassenabschluss
    - Oeffnungsbestand, Schlussbestand, Differenz
    - Kartenzahlungen, Trinkgeld
    - Tages-Kassenbericht
20. Gewinn- und Verlustrechnung (P&L)
    - Tages/Wochen/Monats-P&L
    - Food-Cost %, Labor-Cost %, Fixkosten-Quote
    - Vergleich mit Vorperiode
21. Ausgaben-Tracker
    - Kategorien (Miete, Strom, Versicherung, Werbung, etc.)
    - Wiederkehrende vs. einmalige Ausgaben
    - Monatliche Uebersicht
22. Umsatzziele
    - Tages/Wochen/Monatsziele setzen
    - Fortschrittsanzeige auf Home
    - Engine passt Vorschlaege an Ziele an

WARENWIRTSCHAFT:
23. Rezept-Kalkulation / Menu Costing
    - Zutaten mit Mengen und Preisen pro Produkt
    - Wareneinsatz pro Stueck automatisch
    - Marge (absolut + prozentual)
    - Verkaufspreis-Empfehlung
    - "Was waere wenn" Simulator
24. Lieferanten-Verwaltung
    - Kontaktdaten, Liefertage, Mindestbestellwert
    - Produkt-Katalog pro Lieferant
    - Preisvergleich
    - Lieferhistorie + Bewertung
25. Bestellungen / Purchase Orders
    - Auto-Bestellvorschlaege (Verbrauch + Bestand)
    - Bestellung erstellen und tracken
    - Status: Bestellt / Geliefert / Problem
    - Lieferung einbuchen -> Inventar aktualisiert
26. Smart Reorder Alerts
    - "Milch reicht noch 1.5 Tage. Bestelle bis 15:00."
    - Basierend auf Verbrauchsrate + Lieferzeit

PERSONAL:
27. Personalkosten-Tracking
    - Stundenlohn pro Mitarbeiter
    - Aus Schichtplan -> automatisch Kosten
    - Personal als % vom Umsatz
    - Optimierungsvorschlag
28. Demand-basierte Personalplanung
    - "Montags reicht 1 Person weniger"
    - Forecast -> optimale Besetzung

KUNDEN:
29. Kunden-Zaehler
    - Grosser +1 Button
    - Kunden pro Stunde/Tag
    - Durchschnittlicher Bon-Wert
30. Treueprogramm / Stempelkarte
    - Konfigurierbar (10 Kaffees = 1 gratis)
    - QR-Code fuer Kunden
    - Statistik: aktive Kunden, Einloesungen
31. Stammkunden-Notizen
    - "Herr Mueller: immer Cappuccino, laktosefrei"
    - Haeufigkeit, Lieblings-Produkte

COMPLIANCE:
32. HACCP Digital (vollstaendig)
    - Wareneingang (Temperatur, Verpackung, MHD)
    - Kuehlkette (mehrmals taeglich)
    - Reinigung und Desinfektion
    - Personalhygiene
    - Abweichungs-Protokoll + Korrekturmassnahmen
    - Monats-Export fuer Gesundheitsamt (PDF)
33. Reinigungsplan
    - Taeglich, woechentlich, monatlich
    - Zuweisungen (wer macht was)
    - Dokumentation mit Zeitstempel
    - Exportierbar

MARKETING:
34. Aktions- und Angebots-Planer
    - Happy Hour, Tages-Spezial, Saisonale Aktionen
    - Im Voraus planen (ganze Woche)
    - Erfolgs-Tracking
35. Social Media Kalender
    - Wochenkalender fuer Posts
    - Post-Ideen basierend auf Tages-Spezial/Wetter
    - "Hat funktioniert" Tracking
36. Saisonale Menu-Planung
    - Quartalsweise Planung
    - Produkte saisonal ein/ausschalten
    - Neue Produkte testen + bewerten

BERICHTE:
37. Wochenbericht (automatisch)
    - Top-Produkte, Waste-Verlierer, Umsatz-Trend
    - Personalkosten, Food-Cost Entwicklung
    - Vorschlaege fuer naechste Woche
38. Monatsbericht
    - P&L Zusammenfassung
    - Vergleich mit Vormonat
    - Ziel-Erreichung
39. CSV/PDF Export
    - Alle Daten exportierbar
    - HACCP-Export fuer Gesundheitsamt
    - Buchhaltungs-Export
40. Produkt-Performance Matrix
    - Stars (hoher Umsatz + hohe Marge)
    - Cash Cows, Question Marks, Dogs
    - Einfache visuelle Darstellung (CSS, keine Chart-Library)

ENGINE-UPGRADES:
41. Wetter-Integration (automatisch)
    - OpenWeatherMap API
    - Heute + 3-Tage Vorschau
    - Korrelation mit Umsatz
42. Demand Forecasting verbessert
    - SKU-Level Vorhersagen
    - Wetter + Events + DOW + Saison
43. Explainable AI staerker
    - "Weil letzte 4 Regentage +22% Croissant-Sales"
    - Historische Belege fuer jede Empfehlung
44. Weekly Coach Summary
    - Sonntags: Zusammenfassung der Woche
    - Was hat funktioniert, Top 3 Learnings
45. Marketing Suggestions
    - "Heute nach 14 Uhr Promo fuer Chai Latte"
    - Basierend auf Lagerbestand + Nachfrage
46. Profit-per-Hour Analyse
    - Welche Stunden sind profitabel
    - Engine empfiehlt Oeffnungszeiten-Anpassung

---

## 8. NEUE DATENBANK-MODELS

### Finanzen:
- CashCount (date, openAmount, closeAmount, cardTotal, tipTotal, difference)
- Expense (date, category, amount, description, isRecurring, frequency)
- RevenueGoal (period, type, targetAmount, actualAmount)

### Warenwirtschaft:
- Recipe (productId, name, targetMarginPercent)
- RecipeIngredient (recipeId, name, quantity, unit, costPerUnit)
- Supplier (name, contactName, phone, email, deliveryDays, minOrder, rating)
- SupplierProduct (supplierId, productId, supplierPrice, supplierSKU)
- PurchaseOrder (supplierId, status, totalAmount, orderedAt, deliveredAt)
- PurchaseOrderItem (orderId, productId, quantity, unitPrice)

### Personal (Erweiterungen):
- StaffMember + hourlyWage, monthlyFixed
- LaborEntry (staffId, date, hoursWorked, totalCost)

### Kunden:
- CustomerCount (date, hour, count)
- LoyaltyProgram (name, stampsRequired, rewardDescription, isActive)
- LoyaltyCustomer (name, phone, currentStamps, totalRedeemed)
- LoyaltyStamp (customerId, date, productId)
- RegularCustomer (name, notes, favoriteProducts, visitFrequency)

### Compliance:
- HACCPTemplate (type, name, description, frequency)
- HACCPCheck (templateId, date, result, corrective, checkedBy)
- CleaningTask (name, frequency, area, assigneeId)
- CleaningLog (taskId, date, completedBy, completedAt)

### Marketing:
- Promotion (name, type, startDate, endDate, discount, products, revenue)
- SocialMediaPost (erweitert: scheduledFor, content, platform, result)
- MenuPlan (quarter, year, notes)
- MenuPlanItem (planId, productId, action, startDate, endDate)

---

## 9. SEITEN-STRUKTUR (Navigation)

### Mobile Bottom Nav:
Home | Eingabe | Finanzen | Mehr

### Desktop Sidebar:
- Home (Taegliche Empfehlungen)
- Eingabe (Verkauefe, Kasse, Kunden)
- Finanzen (P&L, Kassenbuch, Ausgaben, Ziele)
- Inventar (Bestand, Bestellungen, Lieferanten)
- Rezepte (Kalkulation, Menu Costing)
- Personal (Schichtplan, Kosten)
- HACCP (Checks, Reinigung, Temperatur)
- Marketing (Aktionen, Social, Menu-Plan)
- Berichte (Wochen, Monat, Export, Performance)
- Kunden (Zaehler, Treueprogramm, Stammkunden)
- Einstellungen

### Desktop Rechtes Panel:
- Gestern Zusammenfassung
- Morgen Vorbereitung
- Wetter (automatisch)
- Mini Trend-Bars (kein Chart)

---

## 10. TECHNISCHE ARCHITEKTUR

- Framework: Next.js 16 (App Router, TypeScript)
- Styling: Tailwind CSS v4 (CSS-basierte Konfiguration)
- DB: SQLite via Prisma 7 + better-sqlite3 Adapter
- Animation: Framer Motion (nur 200-300ms, ease-in-out)
- PWA: Manueller Service Worker
- Export: jsPDF + csv-stringify (fuer PDF/CSV Berichte)
- Wetter: OpenWeatherMap Free API
- Fonts: Plus Jakarta Sans, Inter, JetBrains Mono
- Icons: Lucide Icons (SVG, keine Emojis)

---

## 11. UMSETZUNGS-REIHENFOLGE

Phase 1: DESIGN
- globals.css komplett neu (exakte Farben aus Brief)
- Layout 3-Spalten Desktop + Mobile Bottom Nav
- SidebarNav + ContextPanel (neu)
- Alle bestehenden Komponenten: Emojis raus, Gradients raus,
  Bounce raus, Typografie anpassen
- Alle 9 bestehenden Seiten: Gleiches Design-System
- StrategySelector als Segmented Control
- SOS Button ruhig (kein Pulsieren)

Phase 2A: FINANZEN
- Kassenbuch Seite + API + DB
- P&L Seite + API + DB
- Ausgaben-Tracker
- Umsatzziele

Phase 2B: WARENWIRTSCHAFT
- Rezept-Kalkulation + DB
- Lieferanten-Verwaltung + DB
- Bestellungen/Purchase Orders + DB
- Smart Reorder Alerts

Phase 2C: COMPLIANCE
- HACCP Digital (komplett) + DB
- Reinigungsplan + DB
- Monats-Export PDF

Phase 2D: DATEN + BERICHTE
- Kunden-Zaehler + DB
- Wochenbericht + Monatsbericht
- CSV/PDF Export
- Produkt-Performance Matrix

Phase 3A: KUNDEN
- Treueprogramm + DB
- Stammkunden-Notizen
- Aktions-Planer

Phase 3B: SMART + MARKETING
- Wetter-API Integration
- Social Media Kalender
- Menu-Planung
- Weekly Coach Summary
- Marketing Suggestions
- Profit-per-Hour
- Demand Forecasting verbessert

---

## 12. ERFOLGSKRITERIEN

Die App ist fertig wenn:
1. Ein Cafe-Besitzer morgens die App oeffnet und in 3 Sekunden weiss
   was zu tun ist
2. Kein Excel mehr noetig ist fuer irgendeine Cafe-Aufgabe
3. HACCP-Pruefung bestanden wird mit der App allein
4. Das Design so hochwertig aussieht dass man es herzeigen will
5. Alle Zahlen praezise sind (wie Excel, aber besser praesentiert)
6. Alles in EINER App funktioniert ohne externe Tools

---

## 13. KOMPLETTE TO-DO-LISTE (Coding Session)

Jeder Punkt ist eine konkrete Aufgabe. Abgehakt wenn fertig.

### PHASE 1: DESIGN OVERHAUL

[ ] T01. globals.css komplett neu schreiben
     - Exakte Farben aus Master Brief (Abschnitt 6.2 + 6.3)
     - Shadows: nur 0 4px 16px rgba(0,0,0,0.04)
     - Keine Emojis, keine Gradients, keine bunten BGs
     - Typografie-Klassen: greeting/section/card/body/meta
     - Animationen: nur 200-300ms ease-in-out
     - Dark Mode warm (#151210)
     - Button-Styles flat (kein Gradient)
     - Input-Styles sauber
     - Karte: weiss, kein Border, nur Shadow
     - 8px Base Grid Spacing

[ ] T02. layout.tsx: 3-Spalten Desktop Layout
     - Mobile: Single Column + Bottom Nav (wie bisher)
     - Desktop (lg:1024px+): grid-cols-[240px_1fr_280px]
     - Mitte: max-width 720px
     - pb-24 fuer Mobile (Bottom Nav Platz)

[ ] T03. SidebarNav.tsx NEU erstellen
     - 240px breit, fixed links
     - App-Name "Cafe Coach" oben
     - Nav-Items: Home, Eingabe, Finanzen, Inventar, Rezepte,
       Personal, HACCP, Marketing, Berichte, Kunden, Einstellungen
     - Aktiv: 4px linker accent Streifen
     - Lucide Icons statt Emojis
     - lg:block, hidden auf Mobile

[ ] T04. ContextPanel.tsx NEU erstellen
     - 280px breit, rechte Spalte
     - Gestern: Umsatz, Bewertung
     - Morgen: Vorbereitung, Events
     - Wetter (wenn API aktiv)
     - Mini Trend-Bars (CSS only)
     - lg:block, hidden auf Mobile

[ ] T05. Navigation.tsx (Mobile Bottom Nav) ueberarbeiten
     - Glassmorphism ENTFERNEN
     - Emojis ENTFERNEN -> Lucide Icons
     - Einfacher weisser Hintergrund + Shadow
     - Active: accent Unterstrich (kein Spring-Animation)
     - Mehr-Drawer: einfache Liste, keine gestaggerte Animation
     - lg:hidden (Desktop: Sidebar statt Bottom Nav)

[ ] T06. page.tsx (Home) komplett neuschreiben
     - Layout: Greeting -> Break-Even -> Strategy Selector -> Cards -> SOS
     - Greeting: "Guten Morgen, [Name]." (Name aus Settings)
     - Datum + Wetter darunter
     - min 24px Abstand nach Greeting
     - KEINE Emojis, KEINE Gradient-Header, KEINE Quick Action Grid
     - KEINE dekorativen Blur-Kreise
     - StreakDisplay, QuickNotes, ContextHelp von Home ENTFERNEN

[ ] T07. StrategySelector.tsx NEU (ersetzt StrategyBadge)
     - Segmented Control: [Max Profit | Low Waste | Low Stress | Balanced]
     - Aktiv: accent Hintergrund + weisser Text
     - Inaktiv: transparent + text-secondary
     - KEINE Emojis, KEINE Icons
     - Klickbar, PUT /api/settings

[ ] T08. SuggestionCard.tsx neuschreiben
     - Weiss, KEIN Gradient-Hintergrund
     - 16px Padding, 16px Radius
     - 4px linker Farbstreifen (profit/waste/stress/warning)
     - KEIN Border (ausser linker Streifen)
     - Shadow: 0 4px 16px rgba(0,0,0,0.04)
     - Titel 18px font-600
     - Timing, Impact, Confidence+Risk darunter
     - Confidence: duenne Bar + Prozentzahl rechts
     - KEINE Emojis nirgendwo
     - Expanded: 200ms ease-in-out height Animation
     - Buttons: [Erledigt] [Ueberspringen] flat, kein Gradient

[ ] T09. BreakEvenBar.tsx neuschreiben
     - 6px duenne Bar
     - 300ms ease-in-out Animation
     - "Noch ~39 Kaffees" darunter
     - KEIN Gradient, KEIN Border, KEINE Glow-Kreise, KEINE Emojis
     - Weisser Hintergrund + Shadow

[ ] T10. SOSButton.tsx neuschreiben
     - 56px rund, Farbe: #B5523B (accent-warning)
     - KEIN Pulsieren, KEIN Gradient, KEIN blinkendes Rot
     - Einfacher solider Button
     - Hover: leicht dunkler

[ ] T11. animations.tsx vereinfachen
     - Alle Animationen: 200-300ms ease-in-out
     - KEIN spring, KEIN bounce
     - PulseRing KOMPLETT ENTFERNEN
     - AnimatedCard: nur fade-in, kein hover-lift
     - ConfidenceBar: 300ms ease-in-out
     - CheckmarkAnimation: 200ms ease-in-out

[ ] T12. TomorrowSection.tsx vereinfachen
     - KEIN Gradient, KEIN Border, KEINE Kreise, KEIN Emoji
     - Weisser Hintergrund + Shadow
     - Einfache Liste

[ ] T13. YesterdaySummary.tsx vereinfachen
     - Emojis raus, flat Design

[ ] T14. StreakDisplay.tsx vereinfachen
     - Emojis raus, nur Text

[ ] T15. QuickNotes.tsx vereinfachen
     - Emoji raus

[ ] T16. ThemeToggle.tsx
     - Emojis durch Lucide Icons (Sun/Moon)

[ ] T17. Alle Unterseiten Design anpassen:
     - einstellungen/page.tsx
     - eingabe/page.tsx
     - emergency/page.tsx
     - abend/page.tsx
     - checkliste/page.tsx
     - temperatur/page.tsx
     - wettbewerber/page.tsx
     - drucken/page.tsx
     - onboarding/page.tsx
     -> Gleiche Regeln: keine Emojis, keine Gradients, korrekte Farben,
        korrekte Shadows, korrekte Typografie

[ ] T18. lucide-react installieren fuer SVG Icons

[ ] T19. Build pruefen, alle Fehler fixen

### PHASE 2A: FINANZEN

[ ] T20. Prisma Schema erweitern: CashCount, Expense, RevenueGoal
[ ] T21. prisma db push + prisma generate
[ ] T22. API: /api/cash-count (GET, POST)
[ ] T23. API: /api/expenses (GET, POST, PUT, DELETE)
[ ] T24. API: /api/revenue-goals (GET, POST, PUT)
[ ] T25. Seite: /kasse (Kassenbuch)
[ ] T26. Seite: /finanzen (P&L Uebersicht)
[ ] T27. Umsatzziele auf Home Page einbauen
[ ] T28. Kassenabschluss in Abend-Flow integrieren

### PHASE 2B: WARENWIRTSCHAFT

[ ] T29. Prisma Schema: Recipe, RecipeIngredient, Supplier,
         SupplierProduct, PurchaseOrder, PurchaseOrderItem
[ ] T30. prisma db push + prisma generate
[ ] T31. API: /api/recipes (CRUD)
[ ] T32. API: /api/suppliers (CRUD)
[ ] T33. API: /api/purchase-orders (CRUD + status updates)
[ ] T34. Seite: /rezepte (Kalkulation + Marge + Simulator)
[ ] T35. Seite: /lieferanten (Verwaltung + Preisvergleich)
[ ] T36. Seite: /bestellungen (Purchase Orders + Auto-Vorschlaege)
[ ] T37. Smart Reorder Alerts in Engine einbauen

### PHASE 2C: COMPLIANCE

[ ] T38. Prisma Schema: HACCPTemplate, HACCPCheck, CleaningTask, CleaningLog
[ ] T39. prisma db push + prisma generate
[ ] T40. API: /api/haccp (Templates + Checks CRUD)
[ ] T41. API: /api/cleaning (Tasks + Logs CRUD)
[ ] T42. Seite: /haccp (ersetzt /temperatur, vollstaendig)
[ ] T43. Seite: /reinigung (Reinigungsplan)
[ ] T44. PDF Export fuer HACCP Monatsberichte
[ ] T45. jsPDF installieren

### PHASE 2D: DATEN + BERICHTE

[ ] T46. Prisma Schema: CustomerCount, StaffMember erweitern (hourlyWage), LaborEntry
[ ] T47. prisma db push + prisma generate
[ ] T48. API: /api/customer-count (GET, POST)
[ ] T49. API: /api/labor (GET, automatische Berechnung)
[ ] T50. API: /api/reports/weekly (GET, generiert Wochenbericht)
[ ] T51. API: /api/reports/monthly (GET, generiert Monatsbericht)
[ ] T52. API: /api/export/csv (GET, beliebige Daten als CSV)
[ ] T53. API: /api/export/pdf (GET, Berichte als PDF)
[ ] T54. Kunden-Zaehler Widget auf Home + /eingabe
[ ] T55. Seite: /berichte (Wochen/Monat/Export/Performance Matrix)
[ ] T56. Personalkosten auf /finanzen einbauen
[ ] T57. csv-stringify installieren

### PHASE 3A: KUNDEN

[ ] T58. Prisma Schema: LoyaltyProgram, LoyaltyCustomer, LoyaltyStamp,
         RegularCustomer
[ ] T59. prisma db push + prisma generate
[ ] T60. API: /api/loyalty (Program + Customers + Stamps CRUD)
[ ] T61. API: /api/regulars (Stammkunden CRUD)
[ ] T62. Seite: /treueprogramm (Config + QR + Statistik)
[ ] T63. Seite: /stammkunden (Notizen + Haeufigkeit)
[ ] T64. API: /api/promotions (CRUD)
[ ] T65. Seite: /aktionen (Planer + Erfolgs-Tracking)

### PHASE 3B: SMART + MARKETING

[ ] T66. Prisma Schema: Promotion erweitern, MenuPlan, MenuPlanItem
[ ] T67. prisma db push + prisma generate
[ ] T68. OpenWeatherMap API Integration in Engine
[ ] T69. Seite: /social (Kalender + Post-Ideen)
[ ] T70. Seite: /menuplanung (Quartalsplanung)
[ ] T71. Engine: Weekly Coach Summary (Sonntags)
[ ] T72. Engine: Marketing Suggestions
[ ] T73. Engine: Profit-per-Hour Analyse
[ ] T74. Engine: Demand Forecasting verbessern (Wetter + Events + DOW)
[ ] T75. Engine: Explainable AI staerker (historische Belege)

### FINAL

[ ] T76. Navigation aktualisieren (alle neuen Seiten einbauen)
[ ] T77. Seed-Script erweitern (Demo-Daten fuer neue Features)
[ ] T78. Finaler Build-Check
[ ] T79. Dev-Server starten und testen

---

## 14. HINWEISE FUER DIE CODING SESSION

- Immer nach jedem Phasen-Abschnitt: npx next build pruefen
- Bei TypeScript-Fehlern: sofort fixen bevor weiter
- Prisma: nach Schema-Aenderung immer db push + generate
- Design: Bei JEDER neuen Seite die Regeln aus Abschnitt 6 einhalten
- Lucide Icons: import { IconName } from "lucide-react"
- Keine Emojis. Niemals. In keiner Komponente.
- Animationen: Immer 200-300ms ease-in-out. Keine Ausnahmen.
- Karten: Weiss, kein Border, Shadow 0 4px 16px rgba(0,0,0,0.04)
- Alle Texte auf Deutsch
