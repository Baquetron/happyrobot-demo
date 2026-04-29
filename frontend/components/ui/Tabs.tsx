"use client";

export type Tab = { id: string; label: string };

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="border-b border-border">
      <nav className="flex gap-6" role="tablist">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(t.id)}
              className={`relative py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "text-ink"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
              {isActive && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-accent rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
