import { User } from "lucide-react";

import { Button } from "../ui/button";

export function TopBar() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <span className="text-[10px] font-semibold uppercase tracking-wide">SC</span>
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Scraping</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Usuario">
          <User className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

