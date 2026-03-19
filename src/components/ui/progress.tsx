import { cn } from "../../lib/utils";

export function Progress({
  value = 0,
  tone = "progress",
  className,
}: {
  value?: number;
  tone?: "progress" | "complete" | "stuck";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const resolvedTone = tone === "progress" && clamped >= 100 ? "complete" : tone;
  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
        className,
      )}
      aria-label="Progreso"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full transition-all",
          resolvedTone === "complete"
            ? "bg-[#16A34A]"
            : resolvedTone === "stuck"
              ? "bg-[#DC2626]"
              : "bg-[#2563EB]",
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

