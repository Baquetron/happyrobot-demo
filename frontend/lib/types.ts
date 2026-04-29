export type Outcome = "booked" | "rejected" | "no_load" | "failed_verification";
export type Sentiment = "positive" | "neutral" | "negative";

export interface CallRow {
  id: number;
  created_at: string;
  carrier_name: string | null;
  mc_number: string | null;
  load_id: string | null;
  initial_rate: number | null;
  final_rate: number | null;
  negotiation_rounds: number;
  outcome: Outcome | string;
  sentiment: Sentiment | string;
  duration_seconds: number | null;
  notes: string | null;
}

export interface OutcomeCount { outcome: string; count: number }
export interface SentimentCount { sentiment: string; count: number }

export interface MetricsResponse {
  total_calls: number;
  booked_calls: number;
  conversion_rate: number;
  avg_negotiation_rounds: number;
  avg_final_rate: number | null;
  avg_loadboard_rate: number | null;
  avg_rate_delta: number | null;
  avg_call_duration: number | null;
  outcomes: OutcomeCount[];
  sentiments: SentimentCount[];
  recent_calls: CallRow[];
}
