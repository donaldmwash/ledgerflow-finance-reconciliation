import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { parseTransactions, sampleBankCsv, sampleLedgerCsv, toCsv } from "./lib/csv";
import { reconcile } from "./lib/reconcile";
import { loadWorkspace, saveWorkspace } from "./lib/workspaceStorage";
import type { ReconciliationRow, Transaction } from "./types";

const money = (value: number) => new Intl.NumberFormat("en-KE", {
  style: "currency", currency: "KES", maximumFractionDigits: 2
}).format(value);

const initialBank: Transaction[] = [
  { id: "b1", date: "2026-10-01", description: "Customer payment", reference: "RCPT-1001", amount: 12500 },
  { id: "b2", date: "2026-10-02", description: "Office supplies", reference: "INV-220", amount: -1850 },
  { id: "b3", date: "2026-10-03", description: "Client transfer", reference: "RCPT-1002", amount: 7800 },
  { id: "b4", date: "2026-10-04", description: "Bank service fee", reference: "BANK-FEE", amount: -250 },
  { id: "b5", date: "2026-10-05", description: "Deposit", reference: "DEP-901", amount: 4000 }
];
const initialLedger: Transaction[] = [
  { id: "l1", date: "2026-10-01", description: "Payment received", reference: "RCPT-1001", amount: 12500 },
  { id: "l2", date: "2026-10-02", description: "Stationery purchase", reference: "INV-220", amount: -1850 },
  { id: "l3", date: "2026-10-03", description: "Client transfer", reference: "RCPT-1002", amount: 7800 },
  { id: "l4", date: "2026-10-05", description: "Deposit recorded", reference: "DEP-901", amount: 4000 },
  { id: "l5", date: "2026-10-06", description: "Internet subscription", reference: "EXP-441", amount: -1200 }
];

export default function App() {
  const [savedWorkspace] = useState(() => loadWorkspace(initialBank, initialLedger));
  const [bank, setBank] = useState(savedWorkspace.bank);
  const [ledger, setLedger] = useState(savedWorkspace.ledger);
  const [tolerance, setTolerance] = useState(savedWorkspace.tolerance);
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [manual, setManual] = useState<Record<string, boolean>>(savedWorkspace.manual);

  useEffect(() => {
    saveWorkspace({ bank, ledger, tolerance, manual });
  }, [bank, ledger, tolerance, manual]);

  const result = useMemo(() => reconcile(bank, ledger, tolerance), [bank, ledger, tolerance]);
  const visibleRows = result.rows.filter((row) => filter === "all" || row.status === filter);
  const confirmedCount = result.matchedCount + Object.values(manual).filter(Boolean).length;

  async function handleUpload(event: ChangeEvent<HTMLInputElement>, side: "bank" | "ledger") {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const transactions = await parseTransactions(file);
      if (side === "bank") setBank(transactions);
      else setLedger(transactions);
      setManual({});
      setNotice(`Imported ${transactions.length} transactions from ${file.name}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not import file.");
    } finally {
      event.target.value = "";
    }
  }

  function loadSample() {
    const parseText = (csv: string, prefix: string): Transaction[] => csv.trim().split("\n").slice(1).map((line, index) => {
      const [date, description, reference, amount] = line.split(",");
      return { id: `${prefix}-${index + 1}`, date, description, reference, amount: Number(amount) };
    });
    setBank(parseText(sampleBankCsv, "sample-bank"));
    setLedger(parseText(sampleLedgerCsv, "sample-ledger"));
    setManual({});
    setNotice("Sample data loaded.");
  }

  function clearWorkspace() {
    const confirmed = window.confirm(
      "Clear both imported files and all manual review decisions? This cannot be undone."
    );
    if (!confirmed) return;

    setBank([]);
    setLedger([]);
    setManual({});
    setFilter("all");
    setNotice("Workspace cleared. Import new bank and ledger CSV files to begin.");
  }

  function exportReport() {
    const rows = result.rows.map((row) => ({
      status: row.status,
      bank_date: row.bank?.date ?? "",
      bank_description: row.bank?.description ?? "",
      bank_reference: row.bank?.reference ?? "",
      bank_amount: row.bank?.amount ?? "",
      ledger_date: row.ledger?.date ?? "",
      ledger_description: row.ledger?.description ?? "",
      ledger_reference: row.ledger?.reference ?? "",
      ledger_amount: row.ledger?.amount ?? "",
      reason: row.reason
    }));
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ledgerflow-reconciliation.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function confirm(row: ReconciliationRow) {
    setManual((current) => ({ ...current, [row.id]: !current[row.id] }));
  }

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="LedgerFlow home"><span className="brand-mark">L</span> ledgerflow</a>
        <div className="top-meta"><span className="status-dot" /> Reconciliation workspace <span className="avatar">DM</span></div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">FINANCE OPERATIONS / CONTROL CENTRE</p>
          <h1>Reconciliation, <em>made clear.</em></h1>
          <p className="hero-copy">Compare bank activity against your ledger, investigate exceptions, and leave a clear audit trail of every decision.</p>
        </div>
        <button className="button button-primary" onClick={exportReport}>↓ Export report</button>
      </section>

      <section className="upload-grid" aria-label="Import source files">
        <UploadCard title="Bank statement" subtitle={`${bank.length} transactions loaded`} onChange={(e) => handleUpload(e, "bank")} />
        <UploadCard title="Cashbook / general ledger" subtitle={`${ledger.length} transactions loaded`} onChange={(e) => handleUpload(e, "ledger")} />
      </section>

      <div className="toolbar">
        <div className="tolerance-control">
          <label htmlFor="tolerance">Date tolerance</label>
          <select id="tolerance" value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))}>
            <option value={0}>Same day</option><option value={1}>1 day</option><option value={3}>3 days</option><option value={7}>7 days</option>
          </select>
        </div>
        <span className="save-indicator" role="status">✓ Saved in this browser</span>
        <button className="button button-quiet" onClick={loadSample}>↻ Load sample data</button>
        <button className="button button-quiet" onClick={clearWorkspace}>Clear workspace</button>
      </div>

      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notice">×</button></div>}

      <section className="metrics" aria-label="Reconciliation summary">
        <Metric label="Bank statement total" value={money(result.bankTotal)} detail="Imported bank activity" />
        <Metric label="Ledger total" value={money(result.ledgerTotal)} detail="Imported book activity" />
        <Metric label="Net difference" value={money(result.netDifference)} detail={result.netDifference === 0 ? "Totals currently agree" : "Investigate outstanding items"} accent={result.netDifference === 0 ? "good" : "warning"} />
        <Metric label="Confirmed matches" value={String(confirmedCount)} detail={`${result.rows.length} reconciliation rows`} />
      </section>

      <section className="workspace">
        <div className="section-heading">
          <div><p className="eyebrow">TRANSACTION REVIEW</p><h2>Reconciliation items</h2></div>
          <div className="legend"><span><i className="dot matched" /> Matched {result.matchedCount}</span><span><i className="dot possible" /> Review {result.possibleCount}</span><span><i className="dot unmatched" /> Unmatched {result.bankOnlyCount + result.ledgerOnlyCount}</span></div>
        </div>
        <div className="filters" role="group" aria-label="Filter reconciliation items">
          {["all", "matched", "possible", "bank-only", "ledger-only"].map((item) => (
            <button key={item} className={filter === item ? "filter active" : "filter"} onClick={() => setFilter(item)}>
              {item === "all" ? "All items" : item.replace("-", " ")}
            </button>
          ))}
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Bank transaction</th><th>Ledger transaction</th><th>Difference</th><th>Status / action</th></tr></thead>
            <tbody>
              {visibleRows.map((row) => {
                const difference = (row.bank?.amount ?? 0) - (row.ledger?.amount ?? 0);
                return <tr key={row.id}>
                  <td><TransactionCell transaction={row.bank} /></td>
                  <td><TransactionCell transaction={row.ledger} /></td>
                  <td className={difference === 0 ? "amount" : "amount negative"}>{row.bank && row.ledger ? money(difference) : "—"}</td>
                  <td><span className={`pill ${row.status}`}>{row.status.replace("-", " ")}</span>
                    <p className="reason">{row.reason}</p>
                    {row.status === "possible" && <button className="text-action" onClick={() => confirm(row)}>{manual[row.id] ? "✓ Manually confirmed" : "Confirm after review"}</button>}
                  </td>
                </tr>;
              })}
              {visibleRows.length === 0 && <tr><td colSpan={4} className="empty">No items in this filter.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="footnote">Manual confirmation is a review marker only; it does not alter source data or accounting balances.</p>
      </section>
      <footer><span>LEDGERFLOW · FINANCIAL CONTROL WORKSPACE</span><span>Built for transparent, evidence-led reconciliation.</span></footer>
    </main>
  );
}

function UploadCard({ title, subtitle, onChange }: { title: string; subtitle: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <label className="upload-card"><span className="upload-icon">↥</span><span className="upload-text"><strong>{title}</strong><small>{subtitle}</small></span><span className="upload-link">Import CSV</span><input type="file" accept=".csv,text/csv" onChange={onChange} /></label>;
}
function Metric({ label, value, detail, accent = "" }: { label: string; value: string; detail: string; accent?: string }) {
  return <article className="metric"><p>{label}</p><strong className={accent}>{value}</strong><small>{detail}</small></article>;
}
function TransactionCell({ transaction }: { transaction?: Transaction }) {
  if (!transaction) return <span className="muted">No matching transaction</span>;
  return <div className="transaction"><strong>{transaction.description}</strong><span>{transaction.date} · {transaction.reference || "No reference"}</span><b className={transaction.amount < 0 ? "negative" : ""}>{money(transaction.amount)}</b></div>;
}
