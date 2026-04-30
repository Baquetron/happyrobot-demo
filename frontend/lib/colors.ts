// Brand-aligned chart palette. Uses CSS variables defined in app/globals.css
// so light/dark themes apply automatically.

export const ACCENT = "var(--chart-1)";

export const OUTCOME_COLORS: Record<string, string> = {
  booked: "var(--chart-1)",            // amber — primary brand accent
  rejected: "var(--chart-3)",          // dark stone
  no_load: "var(--chart-4)",           // light stone
  failed_verification: "var(--destructive)",
};

export const SENTIMENT_COLORS: Record<string, string> = {
  positive: "var(--chart-1)",          // amber
  neutral: "var(--chart-4)",           // light stone
  negative: "var(--destructive)",
};

export const OUTCOME_LABELS: Record<string, string> = {
  booked: "Booked",
  rejected: "Rejected",
  no_load: "No load",
  failed_verification: "Failed verification",
};

export const SENTIMENT_LABELS: Record<string, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};
