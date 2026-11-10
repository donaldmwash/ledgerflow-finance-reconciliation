import type { Transaction } from "../types";

const STORAGE_KEY = "ledgerflow.workspace.v1";
const DEFAULT_TOLERANCE = 3;
const ALLOWED_TOLERANCES = [0, 1, 3, 7];

export type WorkspaceSnapshot = {
  bank: Transaction[];
  ledger: Transaction[];
  tolerance: number;
  manual: Record<string, boolean>;
};

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;

function isTransaction(value: unknown): value is Transaction {
  if (!value || typeof value !== "object") return false;
  const transaction = value as Record<string, unknown>;
  return typeof transaction.id === "string" &&
    typeof transaction.date === "string" &&
    typeof transaction.description === "string" &&
    typeof transaction.reference === "string" &&
    typeof transaction.amount === "number" &&
    Number.isFinite(transaction.amount);
}

function isTransactionList(value: unknown): value is Transaction[] {
  return Array.isArray(value) && value.every(isTransaction);
}

function isManualReview(value: unknown): value is Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((item) => typeof item === "boolean");
}

export function readWorkspace(
  storage: StorageReader | null,
  fallbackBank: Transaction[],
  fallbackLedger: Transaction[]
): WorkspaceSnapshot {
  const fallback: WorkspaceSnapshot = {
    bank: fallbackBank,
    ledger: fallbackLedger,
    tolerance: DEFAULT_TOLERANCE,
    manual: {}
  };

  if (!storage) return fallback;

  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (!saved) return fallback;

    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object") return fallback;

    const workspace = parsed as Record<string, unknown>;
    if (
      workspace.version !== 1 ||
      !isTransactionList(workspace.bank) ||
      !isTransactionList(workspace.ledger) ||
      typeof workspace.tolerance !== "number" ||
      !ALLOWED_TOLERANCES.includes(workspace.tolerance) ||
      !isManualReview(workspace.manual)
    ) {
      return fallback;
    }

    return {
      bank: workspace.bank,
      ledger: workspace.ledger,
      tolerance: workspace.tolerance,
      manual: workspace.manual
    };
  } catch {
    return fallback;
  }
}

export function writeWorkspace(
  storage: StorageWriter | null,
  workspace: WorkspaceSnapshot
): boolean {
  if (!storage) return false;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      ...workspace
    }));
    return true;
  } catch {
    return false;
  }
}

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadWorkspace(
  fallbackBank: Transaction[],
  fallbackLedger: Transaction[]
): WorkspaceSnapshot {
  return readWorkspace(browserStorage(), fallbackBank, fallbackLedger);
}

export function saveWorkspace(workspace: WorkspaceSnapshot): boolean {
  return writeWorkspace(browserStorage(), workspace);
}
