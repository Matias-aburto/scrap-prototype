import {
  BadgeCheck,
  LayoutDashboard,
  ScrollText,
  Shield,
  Users,
} from "lucide-react";

import { Button } from "../ui/button";
import type { AppModule } from "./AppShell";

export function Sidebar({
  currentModule,
  onModuleChange,
}: {
  currentModule: AppModule;
  onModuleChange: (module: AppModule) => void;
}) {
  const items: Array<{ key: AppModule; label: string; icon: typeof LayoutDashboard }> = [
    { key: "price-monitor", label: "Monitor de precios", icon: LayoutDashboard },
    { key: "badge-validation", label: "Validación de cucardas", icon: BadgeCheck },
    { key: "user-maintainer", label: "Mantenedor de usuarios", icon: Users },
    { key: "role-maintainer", label: "Mantenedor de roles", icon: Shield },
    { key: "event-log", label: "Log de eventos", icon: ScrollText },
  ];

  return (
    <aside
      className="fixed left-0 top-14 z-40 h-[calc(100svh-56px)] w-[72px] overflow-hidden border-r bg-background transition-[width] duration-200 group hover:w-[240px]"
    >
      <nav className="flex h-full flex-col gap-1 px-2 py-3">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentModule === item.key;
          return (
            <Button
              key={item.key}
              variant="ghost"
              className={`h-10 w-10 self-center justify-center gap-0 px-0 group-hover:w-full group-hover:self-auto group-hover:justify-start group-hover:gap-2 group-hover:px-3 ${
                isActive
                  ? "bg-[#EFF6FF] text-primary hover:bg-[#EFF6FF] hover:text-primary"
                  : "text-muted-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onModuleChange(item.key)}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                <Icon className="h-4 w-4" />
              </span>
              <span className="sr-only">{item.label}</span>
              <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-[max-width,opacity] duration-200 group-hover:max-w-[180px] group-hover:opacity-100">
                {item.label}
              </span>
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
