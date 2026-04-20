import { LegacyRouteRedirect } from "../../../src/components/legacy-route-redirect";

export default function RotationsPage() {
  return (
    <LegacyRouteRedirect
      href="/rotasyonlar"
      message="Rotasyonlar modulunun yeni adresine yonlendiriliyorsun."
    />
  );
}
