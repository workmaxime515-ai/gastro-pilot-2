import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { safeDivide } from "@/lib/math";
import { logger } from "@/lib/logger";

interface ChatMessage {
  role: "user" | "coach";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Frage erforderlich" }, { status: 400 });
    }

    // Store user message
    await prisma.coachMessage.create({
      data: { role: "user", content: question },
    }).catch((e) => logger.warn("Failed to store user message", { source: "api", error: String(e) }));

    const q = question.toLowerCase();

    // Try OpenAI first, fall back to rule-based
    let answer: string;
    if (process.env.OPENAI_API_KEY) {
      answer = await generateOpenAIAnswer(question);
    } else {
      answer = await generateRuleBasedAnswer(q);
    }

    // Store coach response
    await prisma.coachMessage.create({
      data: { role: "coach", content: answer },
    }).catch((e) => logger.warn("Failed to store coach message", { source: "api", error: String(e) }));

    const msg: ChatMessage = { role: "coach", content: answer };
    return NextResponse.json(msg);
  } catch (error) {
    logger.error("Coach POST error", { source: "api", error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Coach konnte nicht antworten" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const messages = await prisma.coachMessage.findMany({
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}

// ─── OpenAI Integration ──────────────────────────────────────

async function generateOpenAIAnswer(question: string): Promise<string> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return generateRuleBasedAnswer(question.toLowerCase());

    // Gather shop context for system prompt
    const context = await gatherShopContext();

    // Get conversation history
    const history = await prisma.coachMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    history.reverse();

    const messages = [
      {
        role: "system" as const,
        content: `Du bist ein erfahrener Cafe-Berater (AI Coffee Shop Coach). Du antwortest auf Deutsch, klar und direkt.
Du hast Zugriff auf folgende aktuelle Shop-Daten:
${context}

Regeln:
- Kurze, konkrete Antworten (max 300 Wörter)
- Immer mit Zahlen/Daten argumentieren wenn vorhanden
- Praktische Handlungsempfehlungen geben
- Freundlich aber direkt
- Nie Spekulationen ohne Datenbasis als Fakten darstellen`,
      },
      ...history.map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      })),
      { role: "user" as const, content: question },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.warn("OpenAI API error, falling back to rule-based", {
        source: "api",
        status: response.status,
        body: errorBody,
      });
      return generateRuleBasedAnswer(question.toLowerCase());
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? generateRuleBasedAnswer(question.toLowerCase());
  } catch (e) {
    logger.warn("OpenAI request failed, using fallback", {
      source: "api",
      error: e instanceof Error ? e.message : String(e),
    });
    return generateRuleBasedAnswer(question.toLowerCase());
  }
}

async function gatherShopContext(): Promise<string> {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [settings, recentCloses, products, wasteLogs, staff] = await Promise.all([
      prisma.shopSettings.findFirst(),
      prisma.dayClose.findMany({ where: { date: { gte: weekAgo } }, orderBy: { date: "desc" }, take: 7 }),
      prisma.product.findMany({ where: { isActive: true } }),
      prisma.wasteLog.findMany({ where: { date: { gte: weekAgo } } }),
      prisma.staffMember.findMany({ where: { isActive: true } }),
    ]);

    const avgRevenue = recentCloses.length > 0
      ? safeDivide(recentCloses.reduce((s, c) => s + c.totalRevenue, 0), recentCloses.length)
      : 0;
    const totalWaste = wasteLogs.reduce((s, w) => s + w.quantity, 0);

    return [
      `Shop: ${settings?.shopName ?? "Coffee Shop"}`,
      `Fixkosten/Tag: ${settings?.fixedCostsDaily ?? "?"} EUR`,
      `Aktive Produkte: ${products.length}`,
      `Aktive Mitarbeiter: ${staff.length}`,
      `Ø Umsatz (7 Tage): ${avgRevenue.toFixed(0)} EUR/Tag`,
      `Waste (7 Tage): ${totalWaste} Stück`,
      `Letzte 7 Tagesabschlüsse: ${recentCloses.map((c) => `${new Date(c.date).toLocaleDateString("de-DE")}: ${c.totalRevenue.toFixed(0)} EUR`).join(", ")}`,
    ].join("\n");
  } catch {
    return "Kontext konnte nicht geladen werden.";
  }
}

// ─── Rule-Based Fallback with Fuzzy Matching ─────────────────

interface TopicDef {
  keywords: string[];
  handler: (q: string, dateRange: { today: Date; tomorrow: Date; weekAgo: Date }) => Promise<string>;
}

function tokenMatch(q: string, keywords: string[]): number {
  const tokens = q.split(/[\s,.!?]+/).filter(Boolean);
  let score = 0;
  for (const kw of keywords) {
    if (q.includes(kw)) { score += 2; continue; }
    for (const tok of tokens) {
      if (tok.includes(kw) || kw.includes(tok)) { score += 1; break; }
    }
  }
  return score;
}

const TOPICS: TopicDef[] = [
  {
    keywords: ["food cost", "food-cost", "wareneinsatz", "marge", "margin", "kosten pro", "rohstoff"],
    handler: async () => {
      const recipes = await prisma.recipe.findMany({ include: { ingredients: true } });
      if (recipes.length === 0) return "Noch keine Rezepte hinterlegt. Erfasse erst Rezepte mit Zutaten, dann kann ich den Food-Cost analysieren.";
      const analysis = recipes.map(r => {
        const cost = r.ingredients.reduce((s, i) => s + i.quantity * i.costPerUnit, 0);
        const margin = r.sellPrice > 0 ? ((r.sellPrice - cost) / r.sellPrice) * 100 : 0;
        return { name: r.name, cost, sell: r.sellPrice, margin };
      }).sort((a, b) => a.margin - b.margin);
      const worst = analysis[0];
      const best = analysis[analysis.length - 1];
      const avgMargin = safeDivide(analysis.reduce((s, a) => s + a.margin, 0), analysis.length);
      return `Dein durchschnittlicher Food-Cost liegt bei ${(100 - avgMargin).toFixed(1)}% (Marge: ${avgMargin.toFixed(1)}%).\n\n` +
        `Beste Marge: ${best?.name} mit ${best?.margin.toFixed(1)}%.\n` +
        `Schlechteste Marge: ${worst?.name} mit ${worst?.margin.toFixed(1)}% — hier solltest du Zutaten oder Preis ueberpruefen.\n\n` +
        `Tipp: Ziel-Food-Cost fuer Cafes liegt bei 25-35%. Alles darueber frisst deinen Gewinn.`;
    },
  },
  {
    keywords: ["waste", "verschwendung", "muell", "müll", "abfall", "weggeworfen", "wegwerfen", "entsorgt"],
    handler: async (_q, { weekAgo, tomorrow }) => {
      const wasteLogs = await prisma.wasteLog.findMany({
        where: { date: { gte: weekAgo, lt: tomorrow } },
        include: { product: true },
      });
      if (wasteLogs.length === 0) return "In den letzten 7 Tagen wurde kein Waste erfasst. Das ist entweder sehr gut oder du vergisst es einzutragen.";
      const byProduct = new Map<string, number>();
      for (const w of wasteLogs) byProduct.set(w.product.name, (byProduct.get(w.product.name) ?? 0) + w.quantity);
      const sorted = [...byProduct.entries()].sort((a, b) => b[1] - a[1]);
      const total = sorted.reduce((s, [, v]) => s + v, 0);
      let msg = `Letzte 7 Tage: ${total} Einheiten Waste.\n\nTop Waste-Treiber:\n`;
      sorted.slice(0, 3).forEach(([name, qty]) => { msg += `- ${name}: ${qty} Stueck\n`; });
      msg += `\nTipp: Reduziere Produktion von ${sorted[0]?.[0]} oder biete es frueher als Angebot an.`;
      return msg;
    },
  },
  {
    keywords: ["umsatz", "revenue", "einnahmen", "geld", "verdient", "verkauf", "verkauft", "gewinn"],
    handler: async (_q, { weekAgo, tomorrow }) => {
      const closes = await prisma.dayClose.findMany({
        where: { date: { gte: weekAgo, lt: tomorrow } },
        orderBy: { date: "asc" },
      });
      if (closes.length === 0) return "Noch keine Tagesabschluesse erfasst. Schliesse erst den Tag ab unter 'Abend', dann kann ich den Umsatz analysieren.";
      const total = closes.reduce((s, c) => s + c.totalRevenue, 0);
      const avg = safeDivide(total, closes.length);
      const best = closes.reduce((a, b) => a.totalRevenue > b.totalRevenue ? a : b);
      const worst = closes.reduce((a, b) => a.totalRevenue < b.totalRevenue ? a : b);
      return `Umsatz letzte ${closes.length} Tage: ${total.toFixed(0)} EUR (Schnitt: ${avg.toFixed(0)} EUR/Tag).\n\n` +
        `Bester Tag: ${new Date(best.date).toLocaleDateString("de-DE")} mit ${best.totalRevenue.toFixed(0)} EUR.\n` +
        `Schwaechster Tag: ${new Date(worst.date).toLocaleDateString("de-DE")} mit ${worst.totalRevenue.toFixed(0)} EUR.\n\n` +
        `Tipp: Analysiere, was am besten Tag anders war und versuche das zu wiederholen.`;
    },
  },
  {
    keywords: ["personal", "mitarbeiter", "schicht", "labor", "angestellt", "lohn", "gehalt", "stunden"],
    handler: async (_q, { weekAgo, tomorrow }) => {
      const staff = await prisma.staffMember.findMany({ where: { isActive: true } });
      const labor = await prisma.laborEntry.findMany({ where: { date: { gte: weekAgo, lt: tomorrow } } });
      const totalCost = labor.reduce((s, l) => s + l.totalCost, 0);
      const totalHours = labor.reduce((s, l) => s + l.hoursWorked, 0);
      if (staff.length === 0) return "Noch keine Mitarbeiter erfasst. Gehe zu 'Personal' und lege dein Team an.";
      return `Aktive Mitarbeiter: ${staff.length}.\n` +
        `Personalkosten letzte Woche: ${totalCost.toFixed(0)} EUR (${totalHours.toFixed(0)} Stunden).\n\n` +
        `Tipp: Personalkosten sollten unter 30% des Umsatzes liegen. Pruefe die Schichtplanung fuer Schwachlast-Zeiten.`;
    },
  },
  {
    keywords: ["beste", "top", "produkt", "beliebt", "bestseller", "renner", "laeufer", "meistverkauft"],
    handler: async (_q, { weekAgo, tomorrow }) => {
      const sales = await prisma.dailySales.findMany({
        where: { date: { gte: weekAgo, lt: tomorrow } },
        include: { product: true },
      });
      if (sales.length === 0) return "Noch keine Verkaufsdaten erfasst. Trage Verkaeufe unter 'Eingabe' ein.";
      const byProduct = new Map<string, { qty: number; rev: number }>();
      for (const s of sales) {
        const curr = byProduct.get(s.product.name) ?? { qty: 0, rev: 0 };
        byProduct.set(s.product.name, { qty: curr.qty + s.quantity, rev: curr.rev + s.revenue });
      }
      const sorted = [...byProduct.entries()].sort((a, b) => b[1].rev - a[1].rev);
      let msg = "Top Produkte (letzte 7 Tage):\n\n";
      sorted.slice(0, 5).forEach(([name, data], i) => {
        msg += `${i + 1}. ${name}: ${data.qty} Stueck, ${data.rev.toFixed(0)} EUR\n`;
      });
      if (sorted.length > 5) msg += `\n...und ${sorted.length - 5} weitere Produkte.`;
      return msg;
    },
  },
  {
    keywords: ["tipp", "empfehlung", "vorschlag", "was soll", "hilfe", "help", "ratschlag", "idee"],
    handler: async () => {
      const tips = [
        ["Pruefe deine Bestaende vor der Rush Hour", "Nutze den Strategiemodus auf der Startseite", "Erfasse Waste konsequent — das ist der groesste Gewinn-Hebel"],
        ["Analysiere deine Top-3-Produkte und ueberlege Upselling-Moeglichkeiten", "Teste eine Happy-Hour am Nachmittag", "Vergleiche Lieferantenpreise monatlich"],
        ["Schulde dein Team auf Upselling-Techniken", "Beobachte das Wetter fuer morgen und passe die Produktion an", "Pruefe ob deine Preise die Inflation widerspiegeln"],
      ];
      const set = tips[Math.floor(Math.random() * tips.length)];
      return "Hier sind meine Tipps fuer dich:\n\n" + set.map((t, i) => `${i + 1}. ${t}`).join("\n") +
        "\n\nFrag mich gerne zu einem konkreten Thema fuer detailliertere Empfehlungen!";
    },
  },
  {
    keywords: ["break-even", "breakeven", "fixkosten", "gewinnschwelle"],
    handler: async () => {
      const settings = await prisma.shopSettings.findFirst();
      const fixedCosts = settings?.fixedCostsDaily ?? 400;
      const closes = await prisma.dayClose.findMany({ orderBy: { date: "desc" }, take: 7 });
      const avgRevenue = closes.length > 0 ? safeDivide(closes.reduce((s, c) => s + c.totalRevenue, 0), closes.length) : 0;
      let msg = `Deine taeglichen Fixkosten: ${fixedCosts} EUR.\n`;
      if (avgRevenue > 0) {
        const ratio = (fixedCosts / avgRevenue * 100).toFixed(0);
        msg += `Dein Ø-Umsatz: ${avgRevenue.toFixed(0)} EUR/Tag.\n`;
        msg += `Fixkosten-Anteil: ${ratio}%.\n\n`;
        msg += avgRevenue > fixedCosts
          ? `Du erreichst den Break-Even im Schnitt. Aber versuche ihn frueher am Tag zu schaffen!`
          : `Achtung: Dein Durchschnittsumsatz deckt die Fixkosten nicht! Erhoehe Umsatz oder senke Fixkosten.`;
      } else {
        msg += `\nErfasse Tagesabschluesse, damit ich den Break-Even berechnen kann.`;
      }
      return msg;
    },
  },
  {
    keywords: ["rezept", "zutat", "portion", "zubereitung", "ingredient"],
    handler: async () => {
      const recipes = await prisma.recipe.findMany({ include: { ingredients: true } });
      if (recipes.length === 0) return "Noch keine Rezepte angelegt. Gehe zu 'Rezepte' und erstelle dein erstes Rezept mit Zutaten und Kosten.";
      const totalRecipes = recipes.length;
      const withIngredients = recipes.filter(r => r.ingredients.length > 0).length;
      const avgIngredients = safeDivide(recipes.reduce((s, r) => s + r.ingredients.length, 0), totalRecipes);
      return `Du hast ${totalRecipes} Rezepte angelegt, davon ${withIngredients} mit Zutaten (Ø ${avgIngredients.toFixed(1)} Zutaten pro Rezept).\n\n` +
        `Tipp: Je mehr Rezepte du mit Kosten hinterlegst, desto genauer wird deine Food-Cost-Analyse.`;
    },
  },
  {
    keywords: ["inventur", "bestand", "lager", "nachbestell", "vorrat", "inventory"],
    handler: async () => {
      const inventory = await prisma.inventory.findMany({ include: { product: true } });
      if (inventory.length === 0) return "Noch kein Inventar erfasst. Gehe zu 'Eingabe' > Inventur und erfasse deine Bestaende.";
      const lowStock = inventory.filter(i => i.reorderPoint !== null && i.quantity <= (i.reorderPoint ?? 0));
      let msg = `Inventar: ${inventory.length} Positionen erfasst.\n`;
      if (lowStock.length > 0) {
        msg += `\n⚠ ${lowStock.length} Positionen unter Mindestbestand:\n`;
        lowStock.slice(0, 5).forEach(i => {
          msg += `- ${i.product.name}: ${i.quantity} (Min: ${i.reorderPoint})\n`;
        });
        msg += `\nBestelle diese Artikel zeitnah nach!`;
      } else {
        msg += `Alle Bestaende sind im gruenen Bereich.`;
      }
      return msg;
    },
  },
  {
    keywords: ["lieferant", "bestellung", "einkauf", "supplier", "bestellen", "lieferung"],
    handler: async () => {
      const suppliers = await prisma.supplier.findMany();
      const orders = await prisma.purchaseOrder.findMany({ orderBy: { orderDate: "desc" }, take: 5 });
      if (suppliers.length === 0) return "Noch keine Lieferanten angelegt. Gehe zu 'Lieferanten' und erfasse deine Lieferkontakte.";
      let msg = `Du hast ${suppliers.length} Lieferanten angelegt.\n\n`;
      if (orders.length > 0) {
        msg += `Letzte Bestellungen:\n`;
        for (const o of orders) {
          msg += `- ${new Date(o.orderDate).toLocaleDateString("de-DE")}: ${o.totalAmount.toFixed(0)} EUR (${o.status})\n`;
        }
      }
      msg += `\nTipp: Vergleiche regelmaessig Preise zwischen Lieferanten und verhandle bei grossen Mengen.`;
      return msg;
    },
  },
  {
    keywords: ["haccp", "hygiene", "kontrolle", "temperatur", "checkliste", "audit"],
    handler: async () => {
      const checks = await prisma.hACCPCheck.findMany({ orderBy: { date: "desc" }, take: 7 });
      if (checks.length === 0) return "Noch keine HACCP-Checks erfasst. Gehe zu 'HACCP' und starte deine taeglichen Hygienekontrollen.";
      const lastCheck = checks[0];
      const daysSince = Math.floor((Date.now() - new Date(lastCheck.date).getTime()) / 86400000);
      return `Letzte ${checks.length} HACCP-Checks vorhanden.\n` +
        `Letzter Check: vor ${daysSince} Tag(en).\n\n` +
        (daysSince > 1 ? `⚠ Achtung: HACCP-Checks sollten taeglich durchgefuehrt werden!` : `Gut gemacht — bleib dran mit den taeglichen Checks!`);
    },
  },
  {
    keywords: ["trend", "vergleich", "letzte woche", "letzter monat", "entwicklung", "verlauf"],
    handler: async (_q, { weekAgo, tomorrow }) => {
      const closes = await prisma.dayClose.findMany({
        where: { date: { gte: weekAgo, lt: tomorrow } },
        orderBy: { date: "asc" },
      });
      if (closes.length < 2) return "Zu wenige Daten fuer einen Trend. Erfasse mindestens 3 Tagesabschluesse.";
      const firstHalf = closes.slice(0, Math.floor(closes.length / 2));
      const secondHalf = closes.slice(Math.floor(closes.length / 2));
      const avgFirst = safeDivide(firstHalf.reduce((s, c) => s + c.totalRevenue, 0), firstHalf.length);
      const avgSecond = safeDivide(secondHalf.reduce((s, c) => s + c.totalRevenue, 0), secondHalf.length);
      const change = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst * 100) : 0;
      const direction = change > 2 ? "steigend ↑" : change < -2 ? "fallend ↓" : "stabil →";
      return `Umsatz-Trend: ${direction} (${change > 0 ? "+" : ""}${change.toFixed(1)}%).\n\n` +
        `Erste Haelfte: Ø ${avgFirst.toFixed(0)} EUR/Tag\n` +
        `Zweite Haelfte: Ø ${avgSecond.toFixed(0)} EUR/Tag\n\n` +
        `Tipp: Gehe zu 'Analytics' fuer detaillierte Grafiken und Prognosen.`;
    },
  },
  {
    keywords: ["aktion", "angebot", "rabatt", "promotion", "marketing", "werbung"],
    handler: async () => {
      return "Hier sind Marketing-Ideen fuer dein Cafe:\n\n" +
        "1. Happy Hour: 20% Rabatt auf Getraenke zwischen 14-16 Uhr\n" +
        "2. Stempelkarte: Jeder 10. Kaffee gratis\n" +
        "3. Saisonales Spezial: Limitiertes Getraenk des Monats\n" +
        "4. Social Media: Poste taeglich dein Tagesangebot\n" +
        "5. Firmen-Abos: Monatliche Kaffee-Flatrate fuer Bueros\n\n" +
        "Tipp: Teste eine Aktion pro Woche und messe den Umsatz-Unterschied!";
    },
  },
  {
    keywords: ["hallo", "hi", "hey", "guten tag", "guten morgen", "servus", "moin", "wie geht"],
    handler: async () => {
      const context = await gatherShopContext();
      return `Hallo! Schoeen, dass du fragst. Hier ein kurzer Ueberblick:\n\n${context}\n\n` +
        `Was moechtest du genauer wissen? Ich kann dir bei Food-Cost, Umsatz, Waste, Personal, Rezepten, Inventur und vielem mehr helfen!`;
    },
  },
  {
    keywords: ["danke", "super", "perfekt", "cool", "gut", "prima"],
    handler: async () => {
      const responses = [
        "Gerne! Frag mich jederzeit, wenn du etwas wissen willst.",
        "Freut mich! Ich bin hier, wenn du weitere Fragen hast.",
        "Kein Problem! Soll ich mir noch etwas anderes anschauen?",
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    },
  },
];

async function generateRuleBasedAnswer(q: string): Promise<string> {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const dateRange = { today, tomorrow, weekAgo };

  let bestTopic: TopicDef | null = null;
  let bestScore = 0;

  for (const topic of TOPICS) {
    const score = tokenMatch(q, topic.keywords);
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  if (bestTopic && bestScore >= 1) {
    return bestTopic.handler(q, dateRange);
  }

  const context = await gatherShopContext();
  const lines = context.split("\n");

  const [closes, wasteLogs] = await Promise.all([
    prisma.dayClose.findMany({ where: { date: { gte: weekAgo } }, orderBy: { date: "desc" }, take: 7 }),
    prisma.wasteLog.findMany({ where: { date: { gte: weekAgo } } }),
  ]);

  const insights: string[] = [];
  if (closes.length > 0) {
    const avg = safeDivide(closes.reduce((s, c) => s + c.totalRevenue, 0), closes.length);
    insights.push(`Dein Ø-Umsatz liegt bei ${avg.toFixed(0)} EUR/Tag.`);
  }
  if (wasteLogs.length > 0) {
    const total = wasteLogs.reduce((s, w) => s + w.quantity, 0);
    insights.push(`Du hast ${total} Einheiten Waste in der letzten Woche.`);
  }

  return `${insights.length > 0 ? insights.join(" ") + "\n\n" : ""}Hier ist dein Shop-Ueberblick:\n\n${lines.join("\n")}\n\n` +
    "Frag mich zum Beispiel:\n" +
    "• \"Wie ist mein Food-Cost?\"\n" +
    "• \"Zeig mir den Waste\"\n" +
    "• \"Wie laeuft der Umsatz?\"\n" +
    "• \"Was sind meine Top-Produkte?\"\n" +
    "• \"Personalkosten\"\n" +
    "• \"Break-Even\"\n" +
    "• \"Rezepte und Zutaten\"\n" +
    "• \"Inventur/Bestaende\"\n" +
    "• \"HACCP Status\"\n" +
    "• \"Marketing-Ideen\"\n" +
    "• \"Gib mir Tipps\"";
}
