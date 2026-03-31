import * as React from "react";
import { AppShell } from "./components/layout/AppShell";
import { PriceMonitorPage } from "./pages/PriceMonitorPage";
import { BadgeValidationPage } from "./pages/BadgeValidationPage";

export default function App() {
  const [currentModule, setCurrentModule] = React.useState<"price-monitor" | "badge-validation">(
    "price-monitor",
  );

  return (
    <AppShell currentModule={currentModule} onModuleChange={setCurrentModule}>
      {currentModule === "price-monitor" ? <PriceMonitorPage /> : <BadgeValidationPage />}
    </AppShell>
  );
}
