import { CallRow } from "./types";

export interface Aggregates {
  total_calls: number;
  booked_calls: number;
  conversion_rate: number;
  avg_negotiation_rounds: number;
  avg_final_rate: number | null;
  avg_loadboard_rate: number | null;
  avg_rate_delta: number | null;
  avg_call_duration: number | null;
  total_revenue: number;
  unique_carriers: number;
  outcomes: { outcome: string; count: number }[];
  sentiments: { sentiment: string; count: number }[];
}

const OUTCOME_KEYS = ["booked", "rejected", "no_load", "failed_verification"];
const SENTIMENT_KEYS = ["positive", "neutral", "negative"];

export function aggregate(calls: CallRow[]): Aggregates {
  const total = calls.length;
  const booked = calls.filter((c) => c.outcome === "booked");
  const bookedCount = booked.length;

  const avg = (xs: number[]) =>
    xs.length ? xs.reduce((s, n) => s + n, 0) / xs.length : null;

  const finalRates = booked
    .map((c) => c.final_rate)
    .filter((n): n is number => n != null);
  const initialRates = booked
    .map((c) => c.initial_rate)
    .filter((n): n is number => n != null);
  const deltas = booked
    .filter((c) => c.final_rate != null && c.initial_rate != null)
    .map((c) => (c.final_rate as number) - (c.initial_rate as number));
  const durations = calls
    .map((c) => c.duration_seconds)
    .filter((n): n is number => n != null);
  const rounds = calls.map((c) => c.negotiation_rounds ?? 0);

  const outcomeCounts = new Map<string, number>();
  for (const c of calls) {
    outcomeCounts.set(c.outcome, (outcomeCounts.get(c.outcome) ?? 0) + 1);
  }
  const sentimentCounts = new Map<string, number>();
  for (const c of calls) {
    sentimentCounts.set(c.sentiment, (sentimentCounts.get(c.sentiment) ?? 0) + 1);
  }

  const carriers = new Set<string>();
  for (const c of calls) {
    if (c.mc_number) carriers.add(c.mc_number);
  }

  return {
    total_calls: total,
    booked_calls: bookedCount,
    conversion_rate: total ? bookedCount / total : 0,
    avg_negotiation_rounds: avg(rounds) ?? 0,
    avg_final_rate: avg(finalRates),
    avg_loadboard_rate: avg(initialRates),
    avg_rate_delta: avg(deltas),
    avg_call_duration: avg(durations),
    total_revenue: finalRates.reduce((s, n) => s + n, 0),
    unique_carriers: carriers.size,
    outcomes: OUTCOME_KEYS.map((o) => ({
      outcome: o,
      count: outcomeCounts.get(o) ?? 0,
    })),
    sentiments: SENTIMENT_KEYS.map((s) => ({
      sentiment: s,
      count: sentimentCounts.get(s) ?? 0,
    })),
  };
}

export function filterByRange(calls: CallRow[], days: number | null): CallRow[] {
  if (days == null) return calls;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return calls.filter((c) => new Date(c.created_at).getTime() >= cutoff);
}

export interface DayBucket {
  iso: string;
  label: string;
  total: number;
  booked: number;
}

export function callsByDay(calls: CallRow[]): DayBucket[] {
  const buckets = new Map<string, { total: number; booked: number }>();
  for (const c of calls) {
    const d = new Date(c.created_at);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const cur = buckets.get(iso) ?? { total: 0, booked: 0 };
    cur.total++;
    if (c.outcome === "booked") cur.booked++;
    buckets.set(iso, cur);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso, v]) => {
      const [, m, dd] = iso.split("-");
      return { iso, label: `${Number(m)}/${Number(dd)}`, ...v };
    });
}

export function roundsDistribution(calls: CallRow[]): { label: string; value: number }[] {
  const buckets = new Map<number, number>();
  for (const c of calls) {
    const r = c.negotiation_rounds ?? 0;
    if (r <= 0) continue;
    buckets.set(r, (buckets.get(r) ?? 0) + 1);
  }
  const max = Math.max(3, ...Array.from(buckets.keys()));
  return Array.from({ length: max }, (_, i) => i + 1).map((r) => ({
    label: `Round ${r}`,
    value: buckets.get(r) ?? 0,
  }));
}

export function winLossByRound(
  calls: CallRow[]
): { label: string; booked: number; rejected: number }[] {
  const buckets = new Map<number, { booked: number; rejected: number }>();
  for (const c of calls) {
    const r = c.negotiation_rounds ?? 0;
    if (r <= 0) continue;
    if (c.outcome !== "booked" && c.outcome !== "rejected") continue;
    const b = buckets.get(r) ?? { booked: 0, rejected: 0 };
    if (c.outcome === "booked") b.booked++;
    else b.rejected++;
    buckets.set(r, b);
  }
  const max = Math.max(3, ...Array.from(buckets.keys()));
  return Array.from({ length: max }, (_, i) => i + 1).map((r) => ({
    label: `Round ${r}`,
    ...(buckets.get(r) ?? { booked: 0, rejected: 0 }),
  }));
}

export function bookingsByRound(
  calls: CallRow[]
): { round: string; value: number }[] {
  const buckets = { "1": 0, "2": 0, "3+": 0 };
  for (const c of calls) {
    if (c.outcome !== "booked") continue;
    if (c.negotiation_rounds <= 1) buckets["1"]++;
    else if (c.negotiation_rounds === 2) buckets["2"]++;
    else buckets["3+"]++;
  }
  return [
    { round: "1", value: buckets["1"] },
    { round: "2", value: buckets["2"] },
    { round: "3+", value: buckets["3+"] },
  ];
}

export function callDurationBuckets(
  calls: CallRow[]
): { label: string; value: number }[] {
  let under = 0;
  let mid = 0;
  let over = 0;
  for (const c of calls) {
    const s = c.duration_seconds;
    if (s == null) continue;
    if (s < 120) under++;
    else if (s <= 180) mid++;
    else over++;
  }
  return [
    { label: "< 2m", value: under },
    { label: "2–3m", value: mid },
    { label: "> 3m", value: over },
  ];
}

export function failedVerificationRate(
  outcomes: { outcome: string; count: number }[]
): number {
  const total = outcomes.reduce((s, o) => s + o.count, 0);
  if (total === 0) return 0;
  const failed = outcomes.find((o) => o.outcome === "failed_verification")?.count ?? 0;
  return failed / total;
}

export function firstRoundAcceptanceRate(calls: CallRow[]): number {
  const booked = calls.filter((c) => c.outcome === "booked");
  if (booked.length === 0) return 0;
  return booked.filter((c) => c.negotiation_rounds === 1).length / booked.length;
}

export function rateEfficiency(
  avgFinal: number | null,
  avgLoadboard: number | null
): number | null {
  if (!avgFinal || !avgLoadboard) return null;
  return avgFinal / avgLoadboard;
}

export function avgDurationByOutcome(
  calls: CallRow[]
): { label: string; value: number; color: string }[] {
  const buckets = new Map<string, number[]>();
  for (const c of calls) {
    if (c.duration_seconds == null) continue;
    const arr = buckets.get(c.outcome) ?? [];
    arr.push(c.duration_seconds);
    buckets.set(c.outcome, arr);
  }
  const COLORS: Record<string, string> = {
    booked: "#2563EB",
    rejected: "#F59E0B",
    no_load: "#94A3B8",
    failed_verification: "#DC2626",
  };
  const LABELS: Record<string, string> = {
    booked: "Booked",
    rejected: "Rejected",
    no_load: "No load",
    failed_verification: "Failed verif.",
  };
  return Array.from(buckets.entries()).map(([outcome, xs]) => ({
    label: LABELS[outcome] ?? outcome,
    value: Math.round(xs.reduce((s, n) => s + n, 0) / xs.length),
    color: COLORS[outcome] ?? "#94A3B8",
  }));
}

export function topOriginLanes(
  loadIdToOrigin: Record<string, string>,
  calls: CallRow[],
  limit = 6
): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const c of calls) {
    if (!c.load_id) continue;
    const origin = loadIdToOrigin[c.load_id];
    if (!origin) continue;
    counts.set(origin, (counts.get(origin) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

export function topCarriers(
  calls: CallRow[],
  limit = 8
): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const c of calls) {
    if (c.outcome !== "booked") continue;
    const name = c.carrier_name ?? (c.mc_number ? `MC-${c.mc_number}` : "Unknown");
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

export function sentimentByOutcome(calls: CallRow[]): {
  label: string;
  positive: number;
  neutral: number;
  negative: number;
}[] {
  const LABELS: Record<string, string> = {
    booked: "Booked",
    rejected: "Rejected",
    no_load: "No load",
    failed_verification: "Failed verif.",
  };
  const buckets = new Map<string, { positive: number; neutral: number; negative: number }>();
  for (const c of calls) {
    const b = buckets.get(c.outcome) ?? { positive: 0, neutral: 0, negative: 0 };
    if (c.sentiment === "positive") b.positive++;
    else if (c.sentiment === "negative") b.negative++;
    else b.neutral++;
    buckets.set(c.outcome, b);
  }
  return Array.from(buckets.entries()).map(([outcome, v]) => ({
    label: LABELS[outcome] ?? outcome,
    ...v,
  }));
}

export function recentCalls(calls: CallRow[], limit = 5): CallRow[] {
  return [...calls]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}
