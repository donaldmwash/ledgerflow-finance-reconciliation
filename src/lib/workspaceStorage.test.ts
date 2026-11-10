import { describe, expect, it } from "vitest";
import type { Transaction } from "../types";
import { readWorkspace, writeWorkspace } from "./workspaceStorage";

const bank: Transaction[] = [{
  id: "bank-1",
  date: "2026-10-01",
  description: "Customer payment",
  reference: "RCPT-1",
  amount: 12500
}];
const ledger: Transaction[] = [{
  id: "ledger-1",
  date: "2026-10-01",
  description: "Payment received",
  reference: "RCPT-1",
  amount: 12500
}];

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value)
  };
}

describe("workspace storage", () => {
  it("saves and restores transactions, tolerance, and manual review decisions", () => {
    const storage = createStorage();
    const snapshot = {
      bank,
      ledger,
      tolerance: 7,
      manual: { "possible-bank-1": true }
    };

    expect(writeWorkspace(storage, snapshot)).toBe(true);
    expect(readWorkspace(storage, [], [])).toEqual(snapshot);
  });

  it("uses sample data when no saved workspace exists", () => {
    const fallbackStorage = createStorage();
    expect(readWorkspace(fallbackStorage, bank, ledger)).toEqual({
      bank,
      ledger,
      tolerance: 3,
      manual: {}
    });
  });

  it("falls back safely when saved data is malformed", () => {
    const storage = createStorage({
      "ledgerflow.workspace.v1": "{not valid json"
    });

    expect(readWorkspace(storage, bank, ledger)).toEqual({
      bank,
      ledger,
      tolerance: 3,
      manual: {}
    });
  });

  it("rejects unsupported or invalid saved workspace values", () => {
    const storage = createStorage({
      "ledgerflow.workspace.v1": JSON.stringify({
        version: 1,
        bank: [{ ...bank[0], amount: "not-a-number" }],
        ledger,
        tolerance: 3,
        manual: {}
      })
    });

    expect(readWorkspace(storage, bank, ledger).bank).toEqual(bank);
  });

  it("handles unavailable browser storage without crashing", () => {
    const blockedStorage = {
      getItem: () => { throw new Error("Storage access denied"); },
      setItem: () => { throw new Error("Storage quota exceeded"); }
    };

    expect(readWorkspace(blockedStorage, bank, ledger).bank).toEqual(bank);
    expect(writeWorkspace(blockedStorage, {
      bank,
      ledger,
      tolerance: 3,
      manual: {}
    })).toBe(false);
  });
});
