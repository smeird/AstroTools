import type { CalculatorIcon } from "@/lib/calculator-registry";

export function AstroIcon({
  kind,
  size = 20,
}: {
  kind: CalculatorIcon;
  size?: number;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg
      aria-hidden="true"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...common}
    >
      {kind === "optics" && (
        <>
          <circle cx="12" cy="12" r="7" />
          <path d="M3 12h18M12 5c2.4 2 3.6 4.3 3.6 7S14.4 17 12 19M12 5C9.6 7 8.4 9.3 8.4 12S9.6 17 12 19" />
        </>
      )}
      {kind === "sensor" && (
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 8h8v8H8zM1.5 8h2.5M1.5 12h2.5M1.5 16h2.5M20 8h2.5M20 12h2.5M20 16h2.5" />
        </>
      )}
      {kind === "exposure" && (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3 6.3 17.7" />
        </>
      )}
      {kind === "mount" && (
        <>
          <path d="M7 20h10M12 14v6M7 14h10L14 8h-4zM12 8V4M9 4h6" />
        </>
      )}
      {kind === "sky" && (
        <>
          <path d="M5 17a8 8 0 0 1 14 0M3 20h18M12 4v3M5.5 7.5l2 2M18.5 7.5l-2 2" />
          <circle cx="12" cy="13" r="2" />
        </>
      )}
      {kind === "session" && (
        <>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16M8 14h3M13 14h3M8 17h3" />
        </>
      )}
      {kind === "formula" && (
        <>
          <path d="M17 5H9l-3 7 3 7h8M9 12h8" />
        </>
      )}
      {kind === "focus" && (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </>
      )}
    </svg>
  );
}
