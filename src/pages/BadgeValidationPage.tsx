import { PriceMonitorPage } from "./PriceMonitorPage";

type Props = {
  country?: "Chile" | "Argentina";
  flag?: "Jumbo" | "Santa Isabel" | "Disco" | "Vea";
};

export function BadgeValidationPage({ country, flag }: Props) {
  return (
    <PriceMonitorPage
      country={country}
      flag={flag}
      pageTitle="Validación de cucardas"
      detailBackLabel="validación de cucardas"
      enableDetailView={false}
    />
  );
}
