import { LayoutDashboard } from "lucide-react";

import { Button } from "../ui/button";

export function Sidebar() {
  return (
    <aside
      className="fixed left-0 top-14 z-40 h-[calc(100svh-56px)] w-[72px] overflow-hidden border-r bg-background transition-[width] duration-200 group hover:w-[240px]"
    >
      <nav className="flex h-full flex-col gap-1 px-2 py-3">
        <Button
          variant="ghost"
          className="h-10 w-full justify-center gap-0"
          aria-current="page"
        >
          <LayoutDashboard className="h-4 w-4 text-primary" />
          <span className="sr-only">Monitor de precios</span>
          <span className="ml-0 group-hover:ml-2 whitespace-nowrap text-sm font-medium overflow-hidden max-w-0 opacity-0 transition-[max-width,opacity,margin-left] duration-200 group-hover:max-w-[180px] group-hover:opacity-100">
            Monitor de precios
          </span>
        </Button>
      </nav>
    </aside>
  );
}

