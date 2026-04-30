"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OUTCOME_COLORS,
  OUTCOME_LABELS,
  SENTIMENT_COLORS,
  SENTIMENT_LABELS,
} from "@/lib/colors";
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
      // Time column gets an id tie-breaker so brand-new rows with identical
      // timestamps land on top of the desc list.
      if (sortKey === "created_at") {
        const diff =
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        const cmp = diff !== 0 ? diff : b.id - a.id;
        return sortDir === "desc" ? cmp : -cmp;
      }
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
    <Card className="p-0 gap-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search carrier, MC, load…"
          className="flex-1 min-w-[200px]"
        />
        <Select value={outcome} onValueChange={(v) => setOutcome(v ?? "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All outcomes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outcomes</SelectItem>
            {Object.entries(OUTCOME_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {sorted.length} of {calls.length} calls
        </span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((c) => (
                <TableHead
                  key={c.key}
                  className={`select-none cursor-pointer ${
                    c.align === "right" ? "text-right" : ""
                  }`}
                  onClick={() => toggleSort(c.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {sortKey === c.key && (
                      <span className="text-foreground">
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {fmtDateTime(c.created_at)}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-foreground">
                    {c.carrier_name ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.mc_number ? `MC-${c.mc_number}` : "no MC"}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.load_id ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.initial_rate != null ? fmtUsd(c.initial_rate) : "—"}
                  <span className="text-muted-foreground"> → </span>
                  {c.final_rate != null ? fmtUsd(c.final_rate) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.negotiation_rounds}
                </TableCell>
                <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                  {fmtDuration(c.duration_seconds)}
                </TableCell>
                <TableCell>
                  <Pill color={OUTCOME_COLORS[c.outcome] ?? "var(--muted-foreground)"}>
                    {OUTCOME_LABELS[c.outcome] ?? c.outcome}
                  </Pill>
                </TableCell>
                <TableCell>
                  <Pill
                    color={SENTIMENT_COLORS[c.sentiment] ?? "var(--muted-foreground)"}
                  >
                    {SENTIMENT_LABELS[c.sentiment] ?? c.sentiment}
                  </Pill>
                </TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={COLUMNS.length}
                  className="text-center text-sm text-muted-foreground py-8"
                >
                  No calls match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function Pill({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        background: `color-mix(in oklab, ${color} 12%, transparent)`,
        color,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}
