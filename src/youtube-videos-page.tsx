"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getAuthErrorMessage, isSessionTimeoutError } from "./auth";
import {
  addYoutubeVideoEntry,
  deleteYoutubeVideoEntry,
  fetchYoutubeVideoEntries,
  getRemoteSessionMember,
} from "./remote";
import { clearSessionMemberId } from "./storage";
import { hasSupabaseConfig } from "./supabaseClient";
import type { Member, YoutubeVideoEntry } from "./types";
import {
  DangerButton,
  EmptyState,
  Panel,
  PrimaryButton,
  SectionHeader,
  SoftCard,
  TextInput,
  ToneMessage,
  cx,
} from "./components/ui";

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  }).format(date);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildCalendarDays(monthDate: Date) {
  const monthStart = getMonthStart(monthDate);
  const calendarStart = new Date(monthStart);
  const weekday = (monthStart.getDay() + 6) % 7;
  calendarStart.setDate(monthStart.getDate() - weekday);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + index);
    return day;
  });
}

function normalizeYoutubeUrl(value: string) {
  return value.trim();
}

function extractYoutubeVideoId(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") {
        return url.searchParams.get("v");
      }

      const pathParts = url.pathname.split("/").filter(Boolean);

      if (pathParts[0] === "shorts" || pathParts[0] === "embed") {
        return pathParts[1] ?? null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function getYoutubeThumbnailUrl(value: string) {
  const videoId = extractYoutubeVideoId(value);

  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
}

function getYoutubeCardTitle(value: string) {
  const videoId = extractYoutubeVideoId(value);
  return videoId ? `YouTube videosu • ${videoId}` : "YouTube videosu";
}

function getYoutubeHostLabel(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "youtube";
  }
}

export function YoutubeVideosPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const remoteEnabled = hasSupabaseConfig;
  const selectedDate = searchParams.get("date");
  const [entries, setEntries] = useState<YoutubeVideoEntry[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [visibleMonth, setVisibleMonth] = useState(() => {
    if (selectedDate) {
      return getMonthStart(new Date(`${selectedDate}T00:00:00`));
    }

    return getMonthStart(new Date());
  });

  const isAdmin = currentMember?.role === "admin";
  const canManageEntries = Boolean(
    currentMember && (currentMember.role === "admin" || currentMember.approved),
  );

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    setVisibleMonth(getMonthStart(new Date(`${selectedDate}T00:00:00`)));
  }, [selectedDate]);

  useEffect(() => {
    void hydrateVideoPage();
  }, [remoteEnabled]);

  async function handleSessionTimeout(errorValue: unknown) {
    if (!remoteEnabled || !isSessionTimeoutError(errorValue)) {
      return false;
    }

    clearSessionMemberId();
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("auth_timeout_notice", "1");
    }
    router.replace("/?reason=session-timeout");
    return true;
  }

  async function hydrateVideoPage() {
    setIsBooting(true);

    try {
      if (!remoteEnabled) {
        setCurrentMember(null);
        setEntries([]);
        return;
      }

      const sessionMember = await getRemoteSessionMember();

      if (!sessionMember) {
        router.replace("/");
        return;
      }

      setCurrentMember(sessionMember);
      setEntries(await fetchYoutubeVideoEntries());
    } catch (errorValue) {
      if (await handleSessionTimeout(errorValue)) {
        return;
      }

      setError(getAuthErrorMessage(errorValue));
    } finally {
      setIsBooting(false);
    }
  }

  function openDateDetail(dateKey: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("date", dateKey);
    router.push(`${pathname}?${nextParams.toString()}`);
  }

  function closeDateDetail() {
    router.replace("/panel/youtube-videolari");
  }

  async function handleAddEntry() {
    if (!selectedDate || !canManageEntries) {
      return;
    }

    const normalizedUrl = normalizeYoutubeUrl(videoUrlInput);

    if (!normalizedUrl) {
      setError("Lutfen gecerli bir YouTube linki gir.");
      setNotice("");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setNotice("");

    try {
      const nextEntry = await addYoutubeVideoEntry(selectedDate, normalizedUrl);
      setEntries((current) =>
        [nextEntry, ...current].sort((left, right) =>
          right.videoDate.localeCompare(left.videoDate) ||
          right.createdAt.localeCompare(left.createdAt),
        ),
      );
      setVideoUrlInput("");
      setNotice("Video linki tarihe eklendi.");
    } catch (errorValue) {
      if (await handleSessionTimeout(errorValue)) {
        return;
      }

      setError(getAuthErrorMessage(errorValue));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteEntry(entryId: string) {
    if (!isAdmin) {
      return;
    }

    const shouldDelete = window.confirm("Bu video linkini silmek istiyor musun?");

    if (!shouldDelete) {
      return;
    }

    setIsSubmitting(true);
    setError("");
    setNotice("");

    try {
      await deleteYoutubeVideoEntry(entryId);
      setEntries((current) => current.filter((entry) => entry.id !== entryId));
      setNotice("Video linki silindi.");
    } catch (errorValue) {
      if (await handleSessionTimeout(errorValue)) {
        return;
      }

      setError(getAuthErrorMessage(errorValue));
    } finally {
      setIsSubmitting(false);
    }
  }

  const entriesByDate = useMemo(() => {
    return entries.reduce<Record<string, YoutubeVideoEntry[]>>((acc, entry) => {
      acc[entry.videoDate] ??= [];
      acc[entry.videoDate].push(entry);
      return acc;
    }, {});
  }, [entries]);

  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const selectedEntries = selectedDate ? entriesByDate[selectedDate] ?? [] : [];

  if (isBooting) {
    return (
      <Panel>
        <ToneMessage tone="muted">
          Video takvimi ve kayit listesi hazirlaniyor.
        </ToneMessage>
      </Panel>
    );
  }

  return (
    <div className="grid gap-6">
      {!selectedDate ? (
        <Panel>
          <SectionHeader
            title="Mac kayitlari"
            description="Buyuk takvimden bir tarih secip o gunun video kayitlarina girebilirsin. Bir tarihin icine girince o gune ait linkleri gorecek, gerekiyorsa yeni link ekleyebileceksin."
            action={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-[18px] border border-[rgba(141,106,232,0.12)] bg-white/70 px-3 py-2 text-sm font-semibold text-[#182127]"
                  onClick={() => setVisibleMonth((current) => shiftMonth(current, -1))}
                >
                  Gecen ay
                </button>
                <button
                  type="button"
                  className="rounded-[18px] border border-[rgba(141,106,232,0.12)] bg-white/70 px-3 py-2 text-sm font-semibold text-[#182127]"
                  onClick={() => setVisibleMonth((current) => shiftMonth(current, 1))}
                >
                  Sonraki ay
                </button>
              </div>
            }
          />

          <div className="mb-4 flex items-center justify-between">
            <strong className="text-[1.4rem] font-bold tracking-[-0.03em] text-[#182127]">
              {formatMonthLabel(visibleMonth)}
            </strong>
            <span className="text-sm text-[#5f6d76]">
              Tarihe tikla, gunun video sayfasina gir.
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8d6ae8] sm:gap-2 sm:text-xs sm:tracking-[0.14em]">
            {["Pzt", "Sal", "Car", "Per", "Cum", "Cmt", "Paz"].map((day) => (
              <span
                key={day}
                className="rounded-xl bg-white/45 px-1 py-2 sm:rounded-2xl sm:px-2"
              >
                {day}
              </span>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((day) => {
              const dateKey = toDateKey(day);
              const dayEntries = entriesByDate[dateKey] ?? [];
              const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
              const isToday = dateKey === toDateKey(new Date());
              const hasEntries = dayEntries.length > 0;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => openDateDetail(dateKey)}
                  className={cx(
                    "relative aspect-square min-h-0 rounded-[18px] border p-1.5 text-left transition hover:-translate-y-0.5 sm:min-h-[96px] sm:rounded-[24px] sm:p-3",
                    isCurrentMonth
                      ? "border-[rgba(141,106,232,0.12)] bg-white/74"
                      : "border-[rgba(141,106,232,0.08)] bg-white/40 text-[#8f9aa0]",
                    hasEntries &&
                      !isToday &&
                      "border-[rgba(217,147,23,0.58)] bg-[linear-gradient(145deg,rgba(255,233,163,0.98),rgba(255,217,102,0.97),rgba(255,196,61,0.95))] shadow-[0_16px_30px_rgba(217,147,23,0.22)]",
                    isToday &&
                      !hasEntries &&
                      "border-[rgba(217,106,167,0.24)] bg-[linear-gradient(145deg,rgba(255,242,248,0.96),rgba(246,241,255,0.92))]",
                    isToday &&
                      hasEntries &&
                      "border-[rgba(194,65,12,0.55)] bg-[linear-gradient(145deg,rgba(255,214,102,0.99),rgba(251,191,36,0.98),rgba(249,115,22,0.95))] shadow-[0_18px_34px_rgba(194,65,12,0.22)] ring-2 ring-[rgba(251,191,36,0.2)]",
                  )}
                >
                  <strong
                    className={cx(
                      "absolute inset-0 flex items-center justify-center text-sm font-semibold text-[#182127] sm:text-lg",
                      !isCurrentMonth && "text-[#8f9aa0]",
                      hasEntries && isCurrentMonth && "text-[#4a2a00]",
                    )}
                  >
                    {day.getDate()}
                  </strong>

                </button>
              );
            })}
          </div>
        </Panel>
      ) : (
        <div className="grid gap-6">
          <Panel>
            <SectionHeader
              title={formatDateLabel(selectedDate)}
              description="Bu tarihe ait video linkleri burada toplanir. Link ekleme, izleme ve duzenleme islemleri bu sayfadan yonetilir."
              action={
                <PrimaryButton
                  type="button"
                  onClick={() => closeDateDetail()}
                >
                  Takvime don
                </PrimaryButton>
              }
            />

            {canManageEntries ? (
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <TextInput
                  value={videoUrlInput}
                  onChange={(event) => setVideoUrlInput(event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <PrimaryButton
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleAddEntry()}
                >
                  Link ekle
                </PrimaryButton>
              </div>
            ) : (
              <ToneMessage tone="muted">
                Bu alanda link eklemek icin gerekli yetki bulunmuyor.
              </ToneMessage>
            )}

            {notice ? <div className="mt-4"><ToneMessage tone="success">{notice}</ToneMessage></div> : null}
            {error ? <div className="mt-4"><ToneMessage tone="error">{error}</ToneMessage></div> : null}
          </Panel>

          {selectedEntries.length > 0 ? (
            <Panel>
              <SectionHeader
                title="Bu tarihteki videolar"
                description="Eklenen tum linkler burada listelenir."
              />
              <div className="grid gap-3">
                {selectedEntries.map((entry, index) => (
                  <SoftCard key={entry.id} className="space-y-3">
                    <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group overflow-hidden rounded-[24px] border border-[rgba(141,106,232,0.12)] bg-[linear-gradient(145deg,rgba(255,244,250,0.9),rgba(247,242,255,0.88),rgba(243,251,246,0.86))] transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(141,106,232,0.14)]"
                        aria-label={`${getYoutubeCardTitle(entry.url)} videosunu ac`}
                      >
                        {getYoutubeThumbnailUrl(entry.url) ? (
                          <img
                            src={getYoutubeThumbnailUrl(entry.url) ?? ""}
                            alt={getYoutubeCardTitle(entry.url)}
                            className="aspect-video h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex aspect-video items-center justify-center bg-[linear-gradient(145deg,#f8d6e8,#e7dbff,#d9f3df)]">
                            <span className="text-4xl text-[#8d6ae8]">▶</span>
                          </div>
                        )}
                      </a>

                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                          <span className="inline-flex rounded-full bg-[rgba(141,106,232,0.1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8d6ae8]">
                            Video {index + 1}
                          </span>
                          <strong className="block text-base text-[#182127] sm:text-lg">
                            {getYoutubeCardTitle(entry.url)}
                          </strong>
                          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#8d6ae8]">
                            {getYoutubeHostLabel(entry.url)}
                          </p>
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block break-all text-sm text-[#5f6d76] underline decoration-[rgba(141,106,232,0.25)] underline-offset-4"
                          >
                            {entry.url}
                          </a>
                          <p className="text-xs text-[#5f6d76]">
                            {new Intl.DateTimeFormat("tr-TR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            }).format(new Date(entry.createdAt))}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#d96aa7,#8d6ae8)] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(141,106,232,0.24)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_36px_rgba(217,106,167,0.28)]"
                          >
                            Videoyu ac
                          </a>

                          {isAdmin ? (
                            <DangerButton
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => void handleDeleteEntry(entry.id)}
                            >
                              Sil
                            </DangerButton>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </SoftCard>
                ))}
              </div>
            </Panel>
          ) : (
            <Panel>
              <EmptyState
                title="Bu tarihte henuz video yok."
                description="Ilk YouTube linkini ekledigin anda bu tarih icin liste burada gorunmeye baslayacak."
              />
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
