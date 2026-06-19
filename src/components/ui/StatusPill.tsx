import { cn } from "@/lib/utils";

export type StatusColor =
  | "green" | "blue" | "red" | "amber" | "orange"
  | "slate" | "gray" | "purple" | "teal" | "rose"
  | "indigo" | "yellow" | "sky" | "muted";

const COLOR_CLASSES: Record<StatusColor, string> = {
  green:  "bg-green-50  text-green-700  border-green-200",
  blue:   "bg-blue-50   text-blue-700   border-blue-200",
  red:    "bg-red-50    text-red-700    border-red-200",
  amber:  "bg-amber-50  text-amber-700  border-amber-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  slate:  "bg-slate-50  text-slate-600  border-slate-200",
  gray:   "bg-gray-50   text-gray-600   border-gray-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  teal:   "bg-teal-50   text-teal-700   border-teal-200",
  rose:   "bg-rose-50   text-rose-700   border-rose-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
  sky:    "bg-sky-50    text-sky-700    border-sky-200",
  muted:  "bg-muted     text-muted-foreground border-border",
};

interface StatusPillProps {
  color: StatusColor;
  label: string;
  className?: string;
}

export function StatusPill({ color, label, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        COLOR_CLASSES[color],
        className
      )}
    >
      {label}
    </span>
  );
}
