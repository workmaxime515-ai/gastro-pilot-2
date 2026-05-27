# Manager Protocol v1

**Status:** Referenz / Planung  
**Gültig für:** CoffeeFlow Manager (Hauptprodukt)  
**Nicht in Scope:** Login, Stripe, PayPal-Live, Employee, Supplier, AI-Coach

---

## 1. Zweck

Dieses Protokoll definiert, **was „Manager perfekt“ bedeutet** — für Menschen und Agents.  
Ziel: Inhaber:innen verstehen in Sekunden, ob sich der Tag lohnt; jeder Verkauf aktualisiert Inventar und Finanzen **zuverlässig**.

---

## 2. Grundsätze (verbindlich)

| # | Grundsatz |
|---|-----------|
| G1 | **Ein Verkauf = eine Buchung** — ein Vorgang, eine ID, Inventar + Finanzen zusammen |
| G2 | **Clean** — ruhige UI, eine Hauptzahl pro Screen, echte Daten oder leer |
| G3 | **Vertrauen vor Features** — falsche Gewinne sind schlimmer als fehlende Reports |
| G4 | **Pending statt kaputt** — fehlendes Rezept blockiert nicht den Umsatz; COGS/Inventar warten + Alert |
| G5 | **Mobile-first** — Schnellverkauf in 2 Taps |
| G6 | **Später gleiche Pipeline** — manueller Verkauf heute, PayPal morgen (gleiche Logik) |

---

## 3. Clean-Protokoll (UI/UX)

**MUSS**

- Screens heißen klar: **Dashboard**, **Inventory** (DE: Inventar), **Finance** (DE: Finanzen), **Recipes**, **Settings**
- Navigation: **nicht** „Eingabe“
- Dashboard: **genau eine** Hero-Zahl (Gewinn heute) + optional eine Zeile Break-even
- Max. **3** sichtbare Alerts am Dashboard; jeder mit klarer Aktion
- Nach Reset: **0** Demo-Daten, **0** Ghost-Empfehlungen (z. B. „Today’s recommendations“)

**DARF NICHT**

- Fake-Produkte / Auto-Seed nach Reset
- Mehr als eine Hauptaktion gleichzeitig erzwingen (kein Popup-Stapel)
- Desktop-only Formulare für Kernaktionen am Handy
- Eigener Alert-Screen in V1 (Alerts am Dashboard bündeln)

**SOLL**

- Gefühl wie ruhige Banking-App: öffnen → verstehen → fertig
- Weißraum, große Touch-Targets

---

## 4. Buchungs-Protokoll (`processSale`)

Jeder Verkauf — manuell oder später PayPal — **MUSS** dieselbe Kette durchlaufen:

```
Verkauf auslösen
  → SaleEvent anlegen (eine ID)
  → Rezept (BOM) laden
  → wenn BOM vollständig:
       InventoryLedger: Zutaten −
       FinanceLedger: COGS −
     sonst:
       cogsStatus = pending + Alert
  → FinanceLedger: Umsatz +
  → Low-Stock prüfen → Alert wenn nötig
  → Dashboard / Inventory / Finance lesen dieselben Events
```

**MUSS**

- Inventar und Finanzen aus **demselben** Verkauf ableiten — kein separates „Finanzen speichern“
- COGS aus **Rezept-Zutaten** (Menge × Stückkosten), nicht nur grober Produkt-Einkaufspreis
- Idempotenz: gleicher Verkauf zweimal → **keine** Doppelbuchung

**DARF NICHT**

- Umsatz weglassen, nur weil Rezept fehlt
- Gewinn auf 0 oder falsch setzen, wenn nur COGS pending ist (Umsatz trotzdem zeigen)

---

## 5. Einheiten-Protokoll (Inventory)

| Einheit | Verwendung |
|---------|------------|
| `g` | Feste Zutaten (Butter, Mehl, …) |
| `ml` | Flüssigkeiten klein |
| `l` | Flüssigkeiten groß |
| `stk` | Stückgut (Eier, …) |

**MUSS**

- Jede Zutat hat **eine feste** Einheit in der DB
- UI-Toggle g | ml | l | stk = **Filter/Ansicht** nur

**DARF NICHT**

- Zwischen g und ml/l umrechnen oder vermischen (1 l ≠ 1 g)

---

## 6. Screen-Protokoll (V1 minimal)

| Screen | Inhalt (minimal) |
|--------|------------------|
| Dashboard | Gewinn heute, Break-even-Zeile, ≤3 Alerts, Schnellverkauf |
| Inventory | Zutaten, Bestand, Einheiten-Toggle, Historie (Ledger) |
| Recipes | Produkt → Zutaten + Mengen pro Stück |
| Finance | Umsatz · COGS · Gewinn; Tag / Monat / Jahr (ein Screen, Segmented) |
| Settings | Shop, Reset, Sprache |

Setup (optional): Zutaten → Rezepte → Fixkosten. **Kein** PayPal in V1-Abnahme.

---

## 7. Geschäftsregeln (Wenn → Dann)

| # | Wenn | Dann |
|---|------|------|
| R1 | 1× verkauft, Rezept vollständig | Zutaten −, Umsatz +, COGS −, Gewinn aktualisiert |
| R2 | 1× verkauft, Rezept fehlt | Umsatz +; Inventar/COGS **pending**; Alert „Rezept anlegen“ |
| R3 | Zutat < Mindestbestand | Alert „nachbestellen“ |
| R4 | Unbekanntes PayPal-Item (später) | Platzhalter-Produkt; Umsatz +; pending + tracken |
| R5 | Produkt archiviert, weiter verkauft | Alert + Frage: reaktivieren oder zuordnen |
| R6 | Manager Reset | Alle Daten weg; UI leer; keine Suggestions |

---

## 8. Abnahme-Protokoll (Croissant-Test)

**Voraussetzung:** PayPal **nicht** nötig.

| Schritt | Aktion | Erwartung |
|---------|--------|-----------|
| 1 | Zutaten: Butter 5000 g, Mehl 10000 g | Bestände sichtbar |
| 2 | Produkt Croissant + Rezept (z. B. 15 g Butter, 40 g Mehl) | BOM gespeichert |
| 3 | Schnellverkauf: 1× Croissant | SaleEvent erzeugt |
| 4 | Inventory prüfen | Butter −15 g, Mehl −40 g |
| 5 | Finance prüfen | Umsatz, COGS, Gewinn plausibel |
| 6 | Wiederholung gleicher Buchung | Keine Duplikate |

**Test bestanden** ⟺ Schritte 4–6 erfüllt + Dashboard zeigt aktualisierten Tag.

---

## 9. Kunden-Protokoll (Prioritäten)

| Prio | Feature | Regel |
|------|---------|--------|
| **P0** | Gewinn heute + Break-even | Dashboard Hero |
| **P0** | Schnellverkauf 2 Taps | Pflicht für Mobile |
| **P0** | Croissant-Test grün | Kein Release ohne |
| **P1** | Food Cost %, Marge/Produkt | Nur wenn Rezept da |
| **P1** | Alerts mit Aktion | Kein Alert ohne „was tun“ |
| **P1** | Finanzen „Warum?“ | Zahl → Verkäufe |
| **P2** | Top/Flop, Einkaufsliste, 5-Min-Onboarding | Nach P0/P1 |

**DARF NICHT** vor erfülltem P0: Feature-Bloat (AI-Chat, viele Reports).

**Verkaufs-Demo (60 s):** Blank → 3 Zutaten → 1 Produkt → 1 Verkauf → Gewinn + weniger Butter.

---

## 10. Out of Scope (explizit)

- Login / Sign-up / Stripe / Invites
- PayPal CSV / Webhook
- Employee- / Supplier-UI
- Vollständiger AI Coach
- Customer-App mit Demo-Daten

---

## 11. Agent-Anweisung

1. Lies dieses Protokoll **vor** UI- oder API-Änderungen am Manager.
2. Jede Änderung **MUSS** G1 (eine Buchung) und G2 (clean) respektieren.
3. P0 zuerst — kein Feature-Bloat.
4. Abnahme = Croissant-Test (Abschnitt 8).
5. Bei Konflikt: **Protokoll > alte App-Gewohnheiten**.

---

**Version:** 1.0 — 2026-05-27
