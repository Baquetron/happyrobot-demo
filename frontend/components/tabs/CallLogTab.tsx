"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { OUTCOME_COLORS, OUTCOME_LABELS, SENTIMENT_COLORS, SENTIMENT_LABELS } from "@/lib/colors";
import { fmtDateTime, fmtDuration, fmtUsd } from "@/lib/format";
import { CallRow } from "@/lib/types";

type SortKey =
  | "created_at"
  | "carrier_name"
  | "load_id"
  | "initial_rate"
  | "final_rate"
  | "negotiation_rounds"
  | "outcome"
  | "sentiment"
  | "duration_seconds";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "created_at", label: "Time" },
  { key: "carrier_name", label: "Carrier" },
  { key: "load_id", label: "Load" },
  { key: "initial_rate", label: "Initial → Final", align: "right" },
  { key: "negotiation_rounds", label: "Rounds", align: "right" },
  { key: "duration_seconds", label: "Duration", align: "right" },
  { key: "outcome", label: "Outcome" },
  { key: "sentiment", label: "Sentiment" },
];

export function CallLogTab({ calls }: { calls: CallRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [outcome, setOutcome] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return calls.filter((c) => {
      if (outcome !== "all" && c.outcome !== outcome) return false;
      if (!q) return true;
      return (
        (c.carrier_name ?? "").toLowerCase().includes(q) ||
        (c.mc_number ?? "").toLowerCase().includes(q) ||
        (c.load_id ?? "").toLowerCase().includes(q)
      );
    });
  }, [calls, outcome, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "created_at" ? "desc" : "asc");
    }
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search carrier, MC, load…"
          className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
        />
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
        >
          <option value="all">All outcomes</option>
          {Object.entries(OUTCOME_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <span className="text-xs text-ink-subtle">
          {sorted.length} of {calls.length} calls
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-subtle text-xs uppercase tracking-wider text-ink-subtle">
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-3 font-medium select-none cursor-pointer ${
                    c.align === "right" ? "text-right" : "text-left"
                  }`}
                  onClick={() => toggleSort(c.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sortKey === c.key && (
                      <span className="text-ink-muted">
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((c) => (
              <tr key={c.id} className="hover:bg-surface-subtle">
                <td className="px-4 py-3 text-ink-muted whitespace-nowrap">
                  {fmtDateTime(c.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{c.carrier_name ?? "—"}</div>
                  <div className="text-xs text-ink-subtle">
                    {c.mc_number ? `MC-${c.mc_number}` : "no MC"}
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-muted">{c.load_id ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {c.initial_rate != null ? fmtUsd(c.initial_rate) : "—"}
                  <span className="text-ink-subtle"> → </span>
                  {c.final_rate != null ? fmtUsd(c.final_rate) : "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {c.negotiation_rounds}
                </td>
                <td className="px-4 py-3 text-right text-ink-muted whitespace-nowrap">
                  {fmtDuration(c.duration_seconds)}
                </td>
                <td className="px-4 py-3">
                  <Pill color={OUTCOME_COLORS[c.outcome] ?? "#94A3B8"}>
                    {OUTCOME_LABELS[c.outcome] ?? c.outcome}
                  </Pill>
                </td>
                <td className="px-4 py-3">
                  <Pill color={SENTIMENT_COLORS[c.sentiment] ?? "#94A3B8"}>
                    {SENTIMENT_LABELS[c.sentiment] ?? c.sentiment}
                  </Pill>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-4 py-8 text-center text-sm text-ink-subtle"
                >
                  No calls match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        background: `${color}14`,
        color,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}
