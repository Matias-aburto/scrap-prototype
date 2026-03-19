import * as React from "react";

import { cn } from "../../lib/utils";

type BadgeVariant = "default" | "secondary" | "outline" | "success";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        "transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variant === "default" && "bg-primary text-primary-foreground border-transparent",
        variant === "secondary" && "bg-secondary text-secondary-foreground border-transparent",
        variant === "outline" && "text-foreground",
        variant === "success" &&
          "bg-emerald-600 text-white border-transparent dark:bg-emerald-500",
        className,
      )}
      {...props}
    />
  );
}

