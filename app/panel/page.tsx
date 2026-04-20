import { LegacyRouteRedirect } from "../../src/components/legacy-route-redirect";

export default function PanelPage() {
  return (
    <LegacyRouteRedirect
      href="/voleybol-isim-oyla"
      message="Eski panel adresinden yeni modul adresine yonlendiriliyorsun."
    />
  );
}
