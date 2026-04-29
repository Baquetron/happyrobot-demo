import { CallRow } from "./types";

export function callsByDay(calls: CallRow[]): { label: string; value: number; iso: string }[] {
  const buckets = new Map<string, number>();
  for (const c of calls) {
    const d = new Date(c.created_at);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    buckets.set(iso, (buckets.get(iso) ?? 0) + 1);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso, value]) => {
      const [, m, dd] = iso.split("-");
      return { iso, value, label: `${Number(m)}/${Number(dd)}` };
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

export function winLossByRound(calls: CallRow[]): { label: string; booked: number; rejected: number }[] {
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

export function firstRoundAcceptanceRate(calls: CallRow[]): number {
  const booked = calls.filter((c) => c.outcome === "booked");
  if (booked.length === 0) return 0;
  const firstRound = booked.filter((c) => c.negotiation_rounds === 1).length;
  return firstRound / booked.length;
}

export function rateEfficiency(
  avgFinal: number | null,
  avgLoadboard: number | null
): number | null {
  if (!avgFinal || !avgLoadboard) return null;
  return avgFinal / avgLoadboard;
}

export function failedVerificationRate(
  outcomes: { outcome: string; count: number }[]
): number {
  const total = outcomes.reduce((s, o) => s + o.count, 0);
  if (!total) return 0;
  const failed = outcomes.find((o) => o.outcome === "failed_verification")?.count ?? 0;
  return failed / total;
}
