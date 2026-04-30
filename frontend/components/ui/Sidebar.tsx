"use client";

import { Tab } from "./Tabs";

const ICONS: Record<string, JSX.Element> = {
  overview: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  negotiations: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-6" />
    </svg>
  ),
  carriers: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21.5 18c0-2.5-1.7-4.5-4.5-4.5" />
    </svg>
  ),
  calls: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 14h5" />
      <path d="M8 17h8" />
    </svg>
  ),
};

export function Sidebar({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border bg-white">
      <div className="px-5 pt-5 pb-6 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-white font-semibold text-sm shadow-sm">
          HR
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-ink">Carrier Sales</div>
          <div className="text-xs text-ink-subtle">HappyRobot demo</div>
        </div>
      </div>

      <nav className="px-3 flex-1">
        <ul className="space-y-1">
          {tabs.map((t) => {
            const isActive = t.id === active;
            return (
              <li key={t.id}>
                <button
                  onClick={() => onChange(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent-soft text-accent"
                      : "text-ink-muted hover:bg-surface-subtle hover:text-ink"
                  }`}
                >
                  <span className={isActive ? "text-accent" : "text-ink-subtle"}>
                    {ICONS[t.id]}
                  </span>
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-5 py-4 border-t border-border text-xs text-ink-subtle">
        v1.0 · Live demo
      </div>
    </aside>
  );
}
