import * as React from "react";
import { AppShell } from "./components/layout/AppShell";
import { PriceMonitorPage } from "./pages/PriceMonitorPage";
import { BadgeValidationPage } from "./pages/BadgeValidationPage";
import { UserMaintainerPage } from "./pages/UserMaintainerPage";
import { EventLogPage } from "./pages/EventLogPage";
import { RoleMaintainerPage } from "./pages/RoleMaintainerPage";

export default function App() {
  const [currentModule, setCurrentModule] = React.useState<
    "price-monitor" | "badge-validation" | "user-maintainer" | "role-maintainer" | "event-log"
  >("price-monitor");

  return (
    <AppShell currentModule={currentModule} onModuleChange={setCurrentModule}>
      {currentModule === "price-monitor" ? (
        <PriceMonitorPage enableDetailView={false} />
      ) : currentModule === "badge-validation" ? (
        <BadgeValidationPage />
      ) : currentModule === "event-log" ? (
        <EventLogPage />
      ) : currentModule === "role-maintainer" ? (
        <RoleMaintainerPage />
      ) : (
        <UserMaintainerPage />
      )}
    </AppShell>
  );
}
