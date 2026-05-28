# Build Manager — Ausführungs-Checkliste

**Status:** Bereit zum Bauen. Protokoll: `MANAGER-PROTOCOL.md`  
**Blocker:** Cursor muss im **Agent-Modus** sein (nicht Plan-Modus).

## Start-Befehl für neuen Agent-Chat

```
execute plan — baue Manager laut empty/MANAGER-PROTOCOL.md:
1) Prisma models + db push
2) src/lib/manager/processSale.ts
3) POST /api/sales/record, GET /api/ingredients, GET /api/manager/today
4) QuickSale auf Dashboard, nav Inventar, Einheiten-Toggle
5) Croissant-Test manuell verifizieren
```

## Phase A — Prisma (`schema.prisma`)

- `Product`: relation `saleEvents`, optional `recipe`
- `Recipe`: optional `productId` @unique
- Neu: `Ingredient`, `SaleEvent`, `InventoryLedger`, `FinanceLedger`, `ManagerAlert`

```bash
cd gastro-coach
npm run db:push
npm run db:generate
```

## Phase B — `src/lib/manager/processSale.ts`

- Input: `{ productId, qty, source?, idempotencyKey? }`
- Idempotent via `SaleEvent.externalId`
- Find recipe: `productId` then `name` match
- BOM complete → deduct `Ingredient.stockQty`, write ledgers, `cogsStatus=complete`
- BOM missing → revenue only, `cogsStatus=pending`, `ManagerAlert`
- Also write `DailySales` for backward compat with existing KPIs

## Phase C — APIs

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/sales/record` | POST | `processSale()` |
| `/api/ingredients` | GET, POST | Zutatenliste |
| `/api/ingredients/[id]` | PATCH | Bestand anpassen |
| `/api/manager/today` | GET | revenue, cogs, profit, breakEvenRemaining |
| `/api/manager/alerts` | GET | unread ManagerAlert |

## Phase D — UI

1. **i18n:** `nav.eingabe` → DE „Inventar“, EN „Inventory“
2. **`QuickSale.tsx`:** Produkt + Menge → POST record → toast + refresh
3. **`page.tsx`:** Hero „Gewinn heute“ von `/api/manager/today`
4. **`eingabe/page.tsx`:** Tab Inventar — Zutaten mit Toggle g|ml|l|stk

## Phase E — Abnahme (Croissant-Test)

1. POST ingredients: Butter 5000g, Mehl 10000g
2. Product Croissant + Recipe linked + BOM 15g/40g
3. POST sales/record qty=1
4. GET ingredients → 4985 / 9960
5. GET manager/today → profit > 0

## Nicht in diesem Build

- Login, Stripe, PayPal CSV
- Neon migration
