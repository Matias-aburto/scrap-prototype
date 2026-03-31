import type { Country, ModuleContext, StoreFlag } from "../components/layout/AppShell";
import { PriceMonitorPage } from "./PriceMonitorPage";

type Props = {
  country?: Country;
  flag?: StoreFlag;
  onContextChange?: (next: ModuleContext) => void;
};

export function BadgeValidationPage({ country, flag, onContextChange }: Props) {
  return (
    <PriceMonitorPage
      country={country}
      flag={flag}
      onContextChange={onContextChange}
      pageTitle="Validación de cucardas"
      detailBackLabel="validación de cucardas"
      enableDetailView={false}
    />
  );
}
