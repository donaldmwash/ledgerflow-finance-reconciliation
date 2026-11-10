import Papa from "papaparse";
import type { Transaction } from "../types";

type CsvRow = Record<string, string>;
const required = ["date", "description", "reference", "amount"];

export function parseTransactions(file: File): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: ({ data, errors, meta }) => {
        if (errors.length) {
          reject(new Error(errors[0].message));
          return;
        }
        const fields = (meta.fields ?? []).map((field) => field.toLowerCase());
        const missing = required.filter((field) => !fields.includes(field));
        if (missing.length) {
          reject(new Error(`Missing required columns: ${missing.join(", ")}`));
          return;
        }
        try {
          const transactions = data.map((row, index) => {
            const amount = Number(String(row.amount).replace(/,/g, "").trim());
            const date = String(row.date ?? "").trim();
            const description = String(row.description ?? "").trim();
            if (!date || !description || !Number.isFinite(amount)) {
              throw new Error(`Invalid date, description or amount on CSV row ${index + 2}`);
            }
            return {
              id: `row-${index + 1}`,
              date,
              description,
              reference: String(row.reference ?? "").trim(),
              amount: Math.round(amount * 100) / 100
            };
          });
          resolve(transactions);
        } catch (error) {
          reject(error instanceof Error ? error : new Error("Could not read CSV file"));
        }
      },
      error: (error) => reject(error)
    });
  });
}

export function toCsv(rows: Array<Record<string, string | number>>): string {
  return Papa.unparse(rows);
}

export const sampleBankCsv = `date,description,reference,amount
2026-10-01,Customer payment,RCPT-1001,12500
2026-10-02,Office supplies,INV-220, -1850
2026-10-03,Client transfer,RCPT-1002,7800
2026-10-04,Bank service fee,BANK-FEE,-250
2026-10-05,Deposit,DEP-901,4000
`;

export const sampleLedgerCsv = `date,description,reference,amount
2026-10-01,Payment received,RCPT-1001,12500
2026-10-02,Stationery purchase,INV-220,-1850
2026-10-03,Client transfer,RCPT-1002,7800
2026-10-05,Deposit recorded,DEP-901,4000
2026-10-06,Internet subscription,EXP-441,-1200
`;
