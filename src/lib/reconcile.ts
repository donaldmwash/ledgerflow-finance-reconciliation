import type { ReconciliationResult, ReconciliationRow, Transaction } from "../types";

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
const daysBetween = (a: string, b: string) => {
  const first = Date.parse(a);
  const second = Date.parse(b);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return Number.POSITIVE_INFINITY;
  return Math.abs(first - second) / 86_400_000;
};

export function reconcile(
  bank: Transaction[],
  ledger: Transaction[],
  dateToleranceDays = 3
): ReconciliationResult {
  const usedLedger = new Set<string>();
  const rows: ReconciliationRow[] = [];

  for (const bankItem of bank) {
    const candidates = ledger.filter((item) => !usedLedger.has(item.id));
    const bankRef = normalize(bankItem.reference);
    const exact = candidates.filter((item) =>
      bankRef.length > 0 &&
      normalize(item.reference) === bankRef &&
      round(item.amount) === round(bankItem.amount) &&
      daysBetween(item.date, bankItem.date) <= dateToleranceDays
    );

    if (exact.length === 1) {
      const ledgerItem = exact[0];
      usedLedger.add(ledgerItem.id);
      rows.push({
        id: `match-${bankItem.id}-${ledgerItem.id}`,
        bank: bankItem,
        ledger: ledgerItem,
        status: "matched",
        reason: "Same normalized reference and amount within date tolerance."
      });
      continue;
    }

    const possible = candidates.filter((item) => {
      const sameReference = bankRef.length > 0 && normalize(item.reference) === bankRef;
      const sameAmount = round(item.amount) === round(bankItem.amount);
      const closeDate = daysBetween(item.date, bankItem.date) <= Math.max(dateToleranceDays, 7);
      return closeDate && (sameReference || sameAmount);
    });

    if (possible.length > 0) {
      rows.push({
        id: `possible-${bankItem.id}`,
        bank: bankItem,
        status: "possible",
        reason: exact.length > 1
          ? "More than one exact candidate exists; review the source documents."
          : "Reference or amount is similar; confirm manually before treating as matched."
      });
    } else {
      rows.push({
        id: `bank-only-${bankItem.id}`,
        bank: bankItem,
        status: "bank-only",
        reason: "No corresponding ledger transaction was found."
      });
    }
  }

  for (const item of ledger) {
    if (!usedLedger.has(item.id)) {
      rows.push({
        id: `ledger-only-${item.id}`,
        ledger: item,
        status: "ledger-only",
        reason: "No corresponding bank transaction was found."
      });
    }
  }

  const matchedCount = rows.filter((row) => row.status === "matched").length;
  const possibleCount = rows.filter((row) => row.status === "possible").length;
  const bankOnlyCount = rows.filter((row) => row.status === "bank-only").length;
  const ledgerOnlyCount = rows.filter((row) => row.status === "ledger-only").length;
  const bankTotal = round(bank.reduce((sum, item) => sum + item.amount, 0));
  const ledgerTotal = round(ledger.reduce((sum, item) => sum + item.amount, 0));

  return {
    rows,
    bankTotal,
    ledgerTotal,
    matchedCount,
    possibleCount,
    bankOnlyCount,
    ledgerOnlyCount,
    netDifference: round(bankTotal - ledgerTotal)
  };
}
