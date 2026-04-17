"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect, useMemo, useRef, useState } from "react";
import { isSessionTimeoutError } from "../auth";
import { getRemoteSessionMember, signOutRemote } from "../remote";
import { clearSessionMemberId, loadSessionMemberId } from "../storage";
import { hasSupabaseConfig } from "../supabaseClient";
import type { Member } from "../types";
import { GhostButton, Panel, PrimaryButton, ToneMessage, cx } from "./ui";

const NAV_ITEMS = [
  {
    href: "/panel",
    title: "Voleybol Isim Oyla",
    description: "Mevcut isim oylama ve yorum akisi",
  },
  {
    href: "/panel/rotasyonlar",
    title: "Rotasyonlar",
    description: "Dizilimler ve ileride gelecek mac akislari",
  },
  {
    href: "/panel/uyeler",
    title: "Uyeler",
    description: "Uye takibi ve yonetim ekranlari",
  },
];

const MOBILE_MEDIA_QUERY = "(max-width: 1023px)";
const PANEL_SHELL_LOCK_KEY = "panelShellLock";

export function PanelShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const remoteEnabled = hasSupabaseConfig;
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(true);
  const hasHandledInitialMobilePath = useRef(false);

  function isMobileViewport() {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  }

  useEffect(() => {
    let isActive = true;

    async function bootstrap() {
      if (!remoteEnabled) {
        const localMemberId = loadSessionMemberId();

        if (!localMemberId) {
          router.replace("/");
          return;
        }

        if (isActive) {
          setIsBooting(false);
        }
        return;
      }

      try {
        const sessionMember = await getRemoteSessionMember();

        if (!sessionMember) {
          router.replace("/");
          return;
        }

        if (isActive) {
          setCurrentMember(sessionMember);
        }
      } catch (error) {
        if (typeof window !== "undefined" && isSessionTimeoutError(error)) {
          window.sessionStorage.setItem("auth_timeout_notice", "1");
          router.replace("/?reason=session-timeout");
          return;
        }

        router.replace("/");
        return;
      } finally {
        if (isActive) {
          setIsBooting(false);
        }
      }
    }

    void bootstrap();

    return () => {
      isActive = false;
    };
  }, [remoteEnabled, router]);

  useEffect(() => {
    if (!isMobileViewport()) {
      return;
    }

    if (!hasHandledInitialMobilePath.current) {
      hasHandledInitialMobilePath.current = true;
      return;
    }

    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const body = document.body;

    if (!isMobileViewport()) {
      body.dataset[PANEL_SHELL_LOCK_KEY] = "0";

      if (body.dataset.rotationCourtLock !== "1") {
        body.style.overflow = "";
      }

      return;
    }

    body.dataset[PANEL_SHELL_LOCK_KEY] = mobileMenuOpen ? "1" : "0";

    if (mobileMenuOpen) {
      body.style.overflow = "hidden";
    } else if (body.dataset.rotationCourtLock !== "1") {
      body.style.overflow = "";
    }

    return () => {
      body.dataset[PANEL_SHELL_LOCK_KEY] = "0";

      if (body.dataset.rotationCourtLock !== "1") {
        body.style.overflow = "";
      }
    };
  }, [mobileMenuOpen]);

  const currentNavTitle = useMemo(() => {
    return (
      NAV_ITEMS.find((item) =>
        item.href === "/panel"
          ? pathname === "/panel"
          : pathname?.startsWith(item.href),
      )?.title ?? "Panel"
    );
  }, [pathname]);

  async function handleLogout() {
    setIsSigningOut(true);

    try {
      if (remoteEnabled) {
        await signOutRemote();
      }
    } catch {
      // Oturum zaten dusmusse ana sayfaya donmek yeterli.
    } finally {
      clearSessionMemberId();
      router.replace("/");
      setIsSigningOut(false);
    }
  }

  const menuContent = (mobile = false) => (
    <>
      <div className="space-y-3">
        <span className="inline-flex rounded-full border border-[rgba(141,106,232,0.12)] bg-[linear-gradient(135deg,rgba(255,238,247,0.92),rgba(246,241,255,0.92))] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d6ae8]">
          Menu
        </span>
        <div>
          <h2 className="text-2xl font-bold tracking-[-0.04em] text-[#182127]">
            {currentNavTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#5f6d76]">
            Proje buyudukce yeni moduller bu menuden ayrilacak.
          </p>
        </div>
      </div>

      <nav className="grid gap-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/panel"
              ? pathname === "/panel"
              : pathname?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (mobile) {
                  setMobileMenuOpen(false);
                }
              }}
              className={cx(
                "rounded-[24px] border px-4 py-4 text-left transition duration-200",
                isActive
                  ? "border-[rgba(141,106,232,0.18)] bg-[linear-gradient(135deg,rgba(255,241,248,0.98),rgba(246,241,255,0.96),rgba(242,251,245,0.92))] shadow-[0_18px_38px_rgba(141,106,232,0.12)]"
                  : "border-[rgba(141,106,232,0.1)] bg-white/62 hover:-translate-y-0.5 hover:bg-white/82",
              )}
            >
              <strong className="block text-sm text-[#182127]">
                {item.title}
              </strong>
              <span className="mt-1 block text-xs leading-5 text-[#5f6d76]">
                {item.description}
              </span>
            </Link>
          );
        })}
      </nav>

      {remoteEnabled && currentMember ? (
        <div className="rounded-[24px] border border-[rgba(141,106,232,0.12)] bg-[linear-gradient(160deg,rgba(255,248,252,0.9),rgba(242,251,245,0.82))] p-4">
          <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8d6ae8]">
            Aktif hesap
          </span>
          <strong className="mt-3 block text-lg text-[#182127]">
            @{currentMember.username ?? currentMember.name}
          </strong>
          <p className="mt-2 text-sm text-[#5f6d76]">
            {currentMember.role} /{" "}
            {currentMember.approved || currentMember.role === "admin"
              ? "onayli"
              : "onay bekliyor"}
          </p>
        </div>
      ) : null}

      <div className={cx("pt-2", !mobile && "mt-auto")}>
        {pathname === "/panel" ? (
          <PrimaryButton
            type="button"
            className="w-full"
            disabled={isSigningOut}
            onClick={() => void handleLogout()}
          >
            Cikis yap
          </PrimaryButton>
        ) : (
          <GhostButton
            type="button"
            className="w-full"
            disabled={isSigningOut}
            onClick={() => void handleLogout()}
          >
            Cikis yap
          </GhostButton>
        )}
      </div>
    </>
  );

  if (isBooting) {
    return (
      <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <main className="mx-auto max-w-7xl">
          <Panel>
            <ToneMessage tone="muted">
              Gecerli oturumun kontrol ediliyor. Birazdan ilgili bolume gecilecek.
            </ToneMessage>
          </Panel>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto mb-4 max-w-[1600px] lg:hidden">
        <div className="flex items-center justify-between rounded-[24px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,246,251,0.95),rgba(246,241,255,0.9)_52%,rgba(242,251,245,0.88))] px-4 py-3 shadow-[0_24px_80px_rgba(141,106,232,0.12)] ring-1 ring-[rgba(141,106,232,0.08)] backdrop-blur-xl">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[rgba(141,106,232,0.12)] bg-white/80"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menuyu ac"
          >
            <span className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-5 rounded-full bg-[#182127]" />
              <span className="block h-0.5 w-5 rounded-full bg-[#182127]" />
              <span className="block h-0.5 w-5 rounded-full bg-[#182127]" />
            </span>
          </button>
          <div className="text-right">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d6ae8]">
              Menu
            </span>
            <strong className="block text-sm text-[#182127]">
              {currentNavTitle}
            </strong>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1600px] gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside className="hidden lg:sticky lg:top-6 lg:block">
          <Panel className="flex h-full flex-col gap-5">
            {menuContent(false)}
          </Panel>
        </aside>

        <section className="min-w-0">{children}</section>
      </div>

      <div
        className={cx(
          "fixed inset-0 z-50 lg:hidden",
          mobileMenuOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <button
          type="button"
          aria-label="Menuyu kapat"
          className={cx(
            "absolute inset-0 bg-[#182127]/35 transition-opacity duration-300",
            mobileMenuOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileMenuOpen(false)}
        />
        <div
          className={cx(
            "absolute inset-y-0 left-0 w-[min(88vw,360px)] p-4 transition-transform duration-300",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Panel className="flex h-full flex-col gap-5 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="inline-flex rounded-full border border-[rgba(141,106,232,0.12)] bg-[linear-gradient(135deg,rgba(255,238,247,0.92),rgba(246,241,255,0.92))] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d6ae8]">
                Menu
              </span>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-[rgba(141,106,232,0.12)] bg-white/80 text-lg font-semibold text-[#182127]"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Menuyu kapat"
              >
                ×
              </button>
            </div>
            {menuContent(true)}
          </Panel>
        </div>
      </div>
    </div>
  );
}
