import { LegacyRouteRedirect } from "../../../src/components/legacy-route-redirect";

export default function TrainingPlanRoutePage() {
  return (
    <LegacyRouteRedirect
      href="/antrenman-plani"
      message="Antrenman plani modulunun yeni adresine yonlendiriliyorsun."
    />
  );
}
