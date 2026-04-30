import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-1.5 py-3 h-full">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-3xl font-semibold text-foreground tabular-nums">
          {value}
        </span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        {children && <div className="mt-auto pt-2 pb-2">{children}</div>}
      </CardContent>
    </Card>
  );
}
