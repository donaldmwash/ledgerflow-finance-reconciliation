export type Transaction = {
  id: string;
  date: string;
  description: string;
  reference: string;
  amount: number;
};

export type MatchStatus = "matched" | "possible" | "bank-only" | "ledger-only";

export type ReconciliationRow = {
  id: string;
  bank?: Transaction;
  ledger?: Transaction;
  status: MatchStatus;
  reason: string;
  manuallyConfirmed?: boolean;
};

export type ReconciliationResult = {
  rows: ReconciliationRow[];
  bankTotal: number;
  ledgerTotal: number;
  matchedCount: number;
  possibleCount: number;
  bankOnlyCount: number;
  ledgerOnlyCount: number;
  netDifference: number;
};
