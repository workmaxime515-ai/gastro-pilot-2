# 01 — Manager (Hauptoutline, sehr grob)

> **Kurz-Outline.** Verbindliche Regeln: **[empty/MANAGER-PROTOCOL.md](../../empty/MANAGER-PROTOCOL.md)**  
> Fokus: Betrieb führen — Verkauf, Zutaten, Gewinn. Login/PayPal: nur `04` Referenz.

---

## Manager = **clean**

Alles für den Inhaber soll **ruhig, klar, professionell** wirken — keine Demo-Bude, kein Feature-Wirrwarr.

| Clean bedeutet | Nicht |
|----------------|--------|
| Wenige Screens, klare Namen (Inventory, Finance, Dashboard) | „Eingabe“, 12 Tabs, Fachjargon |
| Viel Weißraum, eine Hauptzahl pro Screen | 20 KPIs auf einmal |
| Echte Daten oder leer — nie Fake-Coffee / Ghost-Tipps | Demo-Seed nach Reset |
| Eine Aktion pro Moment (z. B. Schnellverkauf) | Drei Popups + Tutorial-Zwang |
| Alerts nur wenn Handlung nötig | Rote Banner überall |
| Mobile: große Buttons, 2 Taps | Desktop-Formulare auf dem Handy |

**Gefühl:** Wie eine gute Banking-App — du öffnest, du verstehst, du bist fertig.

---

## Wer

Inhaber:in. Richtet Shop ein. Sieht alles Wichtige auf einen Blick.

---

## Kern-Idee (eine Sache merken)

**Ein Verkauf = eine Buchung.**

Wenn z. B. **1× Croissant** verkauft wird (erst **manuell** testen, später PayPal):

1. Verkauf wird gespeichert  
2. Rezept wird gelesen → Zutaten runter (Butter, Mehl, …)  
3. Finanzen bekommen Umsatz, Wareneinsatz, Gewinn — **aus demselben Vorgang**

Zwei Screens, **eine** Wahrheit:

- **Inventory (Inventar)** — physische Zutaten (g / ml / l / Stück)  
- **Finance (Finanzen)** — Geld (Umsatz, Kosten, Gewinn)

Nicht getrennt pflegen.

---

## Screens (grob, clean)

| Bereich | Was (minimal) |
|---------|----------------|
| **Dashboard** | **Eine** Hero-Zahl: Gewinn heute (+ Break-even Zeile). Darunter max. 3 Alerts. Schnellverkauf. |
| **Inventory** | Liste Zutaten + Bestand; Toggle g \| ml \| l \| stk; keine überladene Tabelle |
| **Recipes** | Produkt → Zutaten; einfache Liste, kein Excel-Grid |
| **Finance** | Umsatz · COGS · Gewinn — Tag/Monat/Jahr als Segmented Control, nicht 4 Seiten |
| **Settings** | Shop, Reset, Sprache — Rest versteckt bis gebraucht |

Alerts **im Dashboard** bündeln — kein eigener „Alert-Friedhof“-Screen in V1.

Setup (Wizard, optional grob): Zutaten → Rezepte → Fixkosten. PayPal-Verbindung **später**.

---

## Regeln (wenn → dann)

| Wenn | Dann |
|------|------|
| 1× verkauft + Rezept ok | Zutaten −, Finanzen + Umsatz/COGS/Gewinn |
| Rezept fehlt | Umsatz trotzdem; Zutaten/COGS **pending** + Hinweis an Manager |
| Neues Item aus PayPal (später) | Label/Platzhalter anlegen, im Hintergrund tracken, nicht alles blockieren |
| Item gelöscht, verkauft sich weiter | Hinweis: „Wird noch verkauft — reaktivieren oder zuordnen?“ |
| Zutat unter Minimum | Alert |
| Reset | Alles leer, keine Ghost-Empfehlungen |

---

## Test (muss später im Code funktionieren)

**Croissant-Test (ohne PayPal):**

1. Butter + Mehl anlegen  
2. Croissant + Rezept (z. B. 15 g Butter, 40 g Mehl)  
3. „1 verkauft“  
4. → Bestände sinken **und** Finanzen zeigen Gewinn

---

## Bewusst nicht in dieser Outline

- Login, Sign-up, Stripe, Invite-Codes  
- PayPal Live / CSV-Import (Architektur: gleiche Verkaufs-Pipeline, Implementierung später)  
- Employee / Supplier UI  
- AI Coach voll  

→ Nur Referenz: `04-auth-billing-security.md`, `02`, `03`

---

## „Perfekt“ für Manager (Ziel)

- Blank start nach Reset  
- Ein Verkauf → Inventar + Finanzen stimmen zusammen  
- Einheiten klar (g/ml/l/stk)  
- Alerts statt kaputter Zahlen  
- Auf Chromebook/Phone nutzbar (PWA)

---

## Verbesserungen — damit es Kunden gewinnt (grob)

**Was Inhaber:innen wirklich kaufen:** „Sage mir in 10 Sekunden, ob sich der Tag lohnt — und tu nichts doppelt.“

| Priorität | Verbesserung | Warum Kunden das wollen |
|-----------|--------------|------------------------|
| **P0** | Dashboard: **Gewinn heute** groß + **Break-even** („Noch €X bis die Kosten drin sind“) | Sofortiger Nutzen, kein Excel |
| **P0** | **Schnellverkauf** in 2 Taps (Handy) | Realität: verkaufen zwischen Gästen |
| **P0** | Zahlen **vertrauenswürdig** (Croissant-Test, keine Doppelbuchung, pending statt falsch) | Ein Bug = Vertrauen weg |
| **P1** | **Food Cost %** + Marge pro Produkt (wenn Rezept da) | Branchen-Sprache, Entscheidungen Menü/Preis |
| **P1** | Alert mit **Aktion**: „Butter nachbestellen“ / „Rezept für X fehlt“ | Nicht nur Warnung — nächster Schritt |
| **P1** | Finanzen: **Tippen auf Zahl → zeigt Verkäufe** („Warum?“) | Transparenz schlägt Black Box |
| **P2** | **Top & Flop** heute / Woche (Umsatz, Marge) | Was pushen, was streichen |
| **P2** | Einfache **Einkaufsliste** aus Low-Stock | Inventar → praktischer Alltag |
| **P2** | Erster Besuch: **5-Min-Setup** → Croissant-Demo sofort | Time-to-Wow vor PayPal |

**Nicht verwässern:** Kein Feature-Bloat (AI-Chat, 20 Reports) bevor P0 sitzt.

**Demo für Neukunden:** Blank Shop → 3 Zutaten → 1 Produkt → 1 Verkauf → Bildschirm zeigt Gewinn + weniger Butter. Das ist die Verkaufsstory.
