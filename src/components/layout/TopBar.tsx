import { ChevronDown, User } from "lucide-react";

import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export function TopBar({
  country,
  flag,
  onCountryChange,
  onFlagChange,
}: {
  country: "Chile" | "Argentina";
  flag: "Jumbo" | "Santa Isabel" | "Disco" | "Vea";
  onCountryChange: (value: "Chile" | "Argentina") => void;
  onFlagChange: (value: "Jumbo" | "Santa Isabel" | "Disco" | "Vea") => void;
}) {
  const availableFlags =
    country === "Chile"
      ? (["Jumbo", "Santa Isabel"] as const)
      : (["Jumbo", "Disco", "Vea"] as const);

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 px-3"
              aria-label="Seleccionar país"
            >
              <span className="mr-1 text-xs text-muted-foreground">País</span>
              <span className="text-sm font-medium">{country}</span>
              <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onCountryChange("Chile");
              }}
            >
              Chile
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onCountryChange("Argentina");
              }}
            >
              Argentina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 px-3"
              aria-label="Seleccionar bandera"
            >
              <span className="mr-1 text-xs text-muted-foreground">Bandera</span>
              <span className="text-sm font-medium">{flag}</span>
              <ChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableFlags.map((value) => (
              <DropdownMenuItem
                key={value}
                onSelect={(e) => {
                  e.preventDefault();
                  onFlagChange(value);
                }}
              >
                {value}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" aria-label="Usuario">
          <User className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

