# LedgerFlow — Finance Reconciliation Platform

LedgerFlow is a browser-based reconciliation workspace for comparing bank statement transactions with a cashbook or general-ledger export. It helps finance teams identify exact matches, investigate exceptions and produce a clear CSV reconciliation report.

This portfolio project combines practical accounting workflows with a typed React application. It is a demonstration tool: it does not connect to a bank or post entries to a live accounting system.

## What it does

- Import bank statement and ledger CSV files, or load the included sample data.
- Normalize transaction references and match entries by reference, amount and configurable date tolerance.
- Separate exact matches, possible matches, bank-only items and ledger-only items.
- Review possible matches and record a manual review decision.
- Compare bank and ledger totals and show the net difference.
- Export the reconciliation results to CSV.
- Use the workspace on desktop and mobile screens.

## Technology

React 18 · TypeScript · Vite · PapaParse · Vitest · React Testing Library

## Getting started

**Requirements:** Node.js 20 or later and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Quality checks

```bash
npm run test
npm run build
```

## CSV format

The first row must contain these headers:

```csv
date,description,reference,amount
2026-10-01,Customer payment,RCPT-1001,12500
2026-10-02,Office supplies,INV-220,-1850
```

Dates should use an unambiguous format such as `YYYY-MM-DD`. Amounts must be numeric. Use positive values for receipts/deposits and negative values for payments/withdrawals. The importer does not silently alter transaction amounts.

## How matching works

1. References are normalized to uppercase alphanumeric characters.
2. A unique transaction with the same normalized reference and amount is matched when its date is within the selected tolerance.
3. Similar references or amounts are flagged for review rather than being silently approved.
4. Remaining bank and ledger transactions stay visible as unmatched items.

Manual confirmation is a review marker only; it does not change source data or accounting balances. Investigate exceptions against source documents before approving a real reconciliation.

## Project structure

```text
src/
  lib/
    csv.ts
    reconcile.ts
    reconcile.test.ts
  App.tsx
  main.tsx
  styles.css
  types.ts
```

## Roadmap

- [ ] Persist reconciliation sessions and review decisions.
- [ ] Add multi-currency support and exchange-rate controls.
- [ ] Add an audit history for manual decisions.
- [ ] Generate downloadable PDF reports.

## Author

**Donald Mwashegha** · [GitHub](https://github.com/donaldmwash)
