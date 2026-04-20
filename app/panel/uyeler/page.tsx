import { LegacyRouteRedirect } from "../../../src/components/legacy-route-redirect";

export default function MembersRoutePage() {
  return (
    <LegacyRouteRedirect
      href="/uyeler"
      message="Uyeler modulunun yeni adresine yonlendiriliyorsun."
    />
  );
}
