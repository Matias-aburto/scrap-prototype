import * as React from "react";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export type Country = "Chile" | "Argentina";
export type StoreFlag = "Jumbo" | "Santa Isabel" | "Disco" | "Vea";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [country, setCountry] = React.useState<Country>("Chile");
  const [flag, setFlag] = React.useState<StoreFlag>("Jumbo");

  React.useEffect(() => {
    const allowed: StoreFlag[] =
      country === "Chile" ? ["Jumbo", "Santa Isabel"] : ["Jumbo", "Disco", "Vea"];
    if (!allowed.includes(flag)) setFlag(allowed[0]);
  }, [country, flag]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar country={country} flag={flag} onCountryChange={setCountry} onFlagChange={setFlag} />
      <Sidebar />
      <main className="pl-[72px]">
        <div className="p-6">
          {React.isValidElement(children)
            ? React.cloneElement(children, { country, flag } as any)
            : children}
        </div>
      </main>
    </div>
  );
}

