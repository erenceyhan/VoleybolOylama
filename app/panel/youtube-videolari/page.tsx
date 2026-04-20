import { LegacyRouteRedirect } from "../../../src/components/legacy-route-redirect";

export default function YoutubeVideosRoutePage() {
  return (
    <LegacyRouteRedirect
      href="/youtube-videolari"
      message="YouTube videolari modulunun yeni adresine yonlendiriliyorsun."
    />
  );
}
