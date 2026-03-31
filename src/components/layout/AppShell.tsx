import * as React from "react";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export type Country = "Chile" | "Argentina";
export type StoreFlag = "Jumbo" | "Santa Isabel" | "Disco" | "Vea";
export type AppModule = "price-monitor" | "badge-validation";
export type ModuleContext = { country: Country; flag: StoreFlag };

export function AppShell({
  children,
  currentModule,
  onModuleChange,
}: {
  children: React.ReactNode;
  currentModule: AppModule;
  onModuleChange: (module: AppModule) => void;
}) {
  const [moduleContexts, setModuleContexts] = React.useState<Record<AppModule, ModuleContext>>({
    "price-monitor": { country: "Chile", flag: "Jumbo" },
    "badge-validation": { country: "Chile", flag: "Santa Isabel" },
  });
  const activeContext = moduleContexts[currentModule];

  const setCurrentModuleContext = React.useCallback(
    (next: ModuleContext) => {
      setModuleContexts((prev) => ({ ...prev, [currentModule]: next }));
    },
    [currentModule],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <Sidebar currentModule={currentModule} onModuleChange={onModuleChange} />
      <main className="pl-[72px]">
        <div className="p-6">
          {React.isValidElement(children)
            ? React.cloneElement(children, {
                country: activeContext.country,
                flag: activeContext.flag,
                onContextChange: setCurrentModuleContext,
              } as any)
            : children}
        </div>
      </main>
    </div>
  );
}

