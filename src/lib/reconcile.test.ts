import { describe, expect, it } from "vitest";
import { reconcile } from "./reconcile";
import type { Transaction } from "../types";

const tx = (id: string, date: string, reference: string, amount: number): Transaction => ({
  id, date, reference, amount, description: reference
});

describe("reconcile", () => {
  it("matches same reference and amount within tolerance", () => {
    const result = reconcile(
      [tx("b1", "2026-10-01", "RCPT-1", 1200)],
      [tx("l1", "2026-10-02", "rcpt 1", 1200)]
    );
    expect(result.matchedCount).toBe(1);
    expect(result.rows[0].status).toBe("matched");
    expect(result.netDifference).toBe(0);
  });

  it("keeps unmatched transactions visible on both sides", () => {
    const result = reconcile(
      [tx("b1", "2026-10-01", "BANK-1", 500)],
      [tx("l1", "2026-10-01", "LEDGER-9", 450)]
    );
    expect(result.bankOnlyCount).toBe(1);
    expect(result.ledgerOnlyCount).toBe(1);
    expect(result.netDifference).toBe(50);
  });

  it("flags same-amount candidates for review rather than auto-matching", () => {
    const result = reconcile(
      [tx("b1", "2026-10-01", "BANK-1", 500)],
      [tx("l1", "2026-10-02", "OTHER-REF", 500)]
    );
    expect(result.possibleCount).toBe(1);
    expect(result.rows[0].status).toBe("possible");
  });

  it("does not match transactions outside the date tolerance", () => {
    const result = reconcile(
      [tx("b1", "2026-10-01", "REF-1", 500)],
      [tx("l1", "2026-10-10", "REF-1", 500)]
    );
    expect(result.bankOnlyCount).toBe(1);
    expect(result.ledgerOnlyCount).toBe(1);
  });

  it("does not auto-match when more than one exact candidate exists", () => {
    const result = reconcile(
      [tx("b1", "2026-10-01", "REF-1", 500)],
      [
        tx("l1", "2026-10-01", "REF-1", 500),
        tx("l2", "2026-10-01", "REF-1", 500)
      ]
    );
    expect(result.matchedCount).toBe(0);
    expect(result.possibleCount).toBe(1);
    expect(result.ledgerOnlyCount).toBe(2);
    expect(result.rows[0].reason).toContain("More than one exact candidate");
  });

  it("compares amounts rounded to two decimal places", () => {
    const result = reconcile(
      [tx("b1", "2026-10-01", "REF-1", 100.004)],
      [tx("l1", "2026-10-01", "REF-1", 100)]
    );
    expect(result.matchedCount).toBe(1);
    expect(result.netDifference).toBe(0);
  });

  it("does not use an empty reference as an exact match key", () => {
    const result = reconcile(
      [tx("b1", "2026-10-01", "", 500)],
      [tx("l1", "2026-10-01", "", 500)]
    );
    expect(result.matchedCount).toBe(0);
    expect(result.possibleCount).toBe(1);
  });

  it("matches on the exact date-tolerance boundary", () => {
    const result = reconcile(
      [tx("b1", "2026-10-01", "REF-1", 500)],
      [tx("l1", "2026-10-04", "REF-1", 500)]
    );
    expect(result.matchedCount).toBe(1);
  });

  it("calculates totals from all transactions, including unmatched items", () => {
    const result = reconcile(
      [tx("b1", "2026-10-01", "BANK-1", 500), tx("b2", "2026-10-02", "BANK-2", -50)],
      [tx("l1", "2026-10-01", "LEDGER-1", 400)]
    );
    expect(result.bankTotal).toBe(450);
    expect(result.ledgerTotal).toBe(400);
    expect(result.netDifference).toBe(50);
  });
});
