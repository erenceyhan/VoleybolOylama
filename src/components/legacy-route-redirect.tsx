"use client";

import { useEffect } from "react";
import { Panel, ToneMessage } from "./ui";

export function LegacyRouteRedirect({
  href,
  message,
}: {
  href: string;
  message?: string;
}) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.location.replace(href);
  }, [href]);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <main className="mx-auto max-w-3xl">
        <Panel>
          <ToneMessage tone="muted">
            {message ?? "Yeni modul adresine yonlendiriliyorsun."}
          </ToneMessage>
          <a
            href={href}
            className="mt-4 inline-flex text-sm font-semibold text-[#8d6ae8] underline underline-offset-4"
          >
            Otomatik gecis olmazsa yeni sayfayi ac
          </a>
        </Panel>
      </main>
    </div>
  );
}
