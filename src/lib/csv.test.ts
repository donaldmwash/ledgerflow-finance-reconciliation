import { describe, expect, it } from "vitest";
import { parseTransactions } from "./csv";

function csvFile(contents: string): File {
  return new File([contents], "transactions.csv", { type: "text/csv" });
}

describe("parseTransactions", () => {
  it("imports valid rows and normalizes amounts", async () => {
    const rows = await parseTransactions(csvFile(
      "date,description,reference,amount\n2026-10-01,Office supplies,INV-1,\"-1,850.50\""
    ));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      date: "2026-10-01",
      description: "Office supplies",
      reference: "INV-1",
      amount: -1850.5
    });
  });

  it("allows the reference column to be omitted", async () => {
    const rows = await parseTransactions(csvFile(
      "date,description,amount\n2026-10-01,Cash sale,250"
    ));

    expect(rows[0].reference).toBe("");
  });

  it("rejects a blank amount instead of treating it as zero", async () => {
    await expect(parseTransactions(csvFile(
      "date,description,reference,amount\n2026-10-01,Cash sale,REF-1, "
    ))).rejects.toThrow("Invalid date, description or amount on CSV row 2");
  });

  it("rejects malformed and impossible dates", async () => {
    for (const date of ["not-a-date", "2026-02-30", "01/10/2026"]) {
      await expect(parseTransactions(csvFile(
        `date,description,reference,amount\n${date},Cash sale,REF-1,100`
      ))).rejects.toThrow("Invalid date, description or amount on CSV row 2");
    }
  });

  it("reports missing required columns", async () => {
    await expect(parseTransactions(csvFile(
      "date,description,reference\n2026-10-01,Cash sale,REF-1"
    ))).rejects.toThrow("Missing required columns: amount");
  });
});
