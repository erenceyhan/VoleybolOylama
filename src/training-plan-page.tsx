"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isSessionTimeoutError } from "./auth";
import {
  createTrainingPlanEvent,
  deleteTrainingPlanEvent,
  fetchTrainingPlanEligibleMembers,
  fetchTrainingPlanEvents,
  fetchTrainingPlanResponses,
  fetchTrainingPlanSettings,
  getRemoteSessionMember,
  lockTrainingPlanEvent,
  saveTrainingPlanSettings,
  upsertTrainingPlanResponse,
} from "./remote";
import { hasSupabaseConfig } from "./supabaseClient";
import type {
  TrainingPlanBestSlot,
  TrainingPlanDaySlotMap,
  TrainingPlanEvent,
  TrainingPlanEventType,
  TrainingPlanMatchSource,
  TrainingPlanResponse,
  TrainingPlanResponseStatus,
  TrainingSchoolLink,
  TrainingPlanSettings,
} from "./training-plan/types";
import { TRAINING_PLAN_DAYS, TRAINING_PLAN_HOURS } from "./training-plan/types";
import {
  countTrainingPlanSelectedSlots,
  formatTrainingPlanSlotMap,
  getUniqueTrainingPlanHours,
  hasTrainingPlanEmptyDay,
  buildTrainingPlanEventTitle,
  compareTrainingPlanDays,
  compareTrainingPlanHours,
  computeTrainingPlanBestSlot,
  countTrainingPlanResponses,
  formatTrainingPlanDate,
  formatTrainingPlanHourRange,
  getTrainingPlanNextDate,
  getTrainingPlanEventTypeLabel,
  getTrainingPlanStatusLabel,
  normalizeTrainingPlanSlotMap,
  normalizeTrainingPlanLink,
  sortTrainingPlanDays,
  sortTrainingPlanHours,
  toggleTrainingPlanSlotDay,
  toggleTrainingPlanSlotHour,
} from "./training-plan/utils";
import type { Member } from "./types";
import {
  DangerButton,
  EmptyState,
  GhostButton,
  InlineMeta,
  Panel,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
  SelectInput,
  SoftCard,
  TextArea,
  TextInput,
  ToneMessage,
  cx,
} from "./components/ui";
import { ModalShell } from "./components/modal-shell";

const DEFAULT_TRAINING_PLAN_SETTINGS: TrainingPlanSettings = {
  voleyboloynaLink: "",
  amatorMatchProgramLink: "",
  schoolLinks: [],
  updatedAt: null,
  updatedBy: null,
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function resolveEventDateTime(
  day: string | null | undefined,
  hour: string | null | undefined,
  referenceDate: string,
) {
  if (!day || !hour) {
    return null;
  }

  const baseDate = getTrainingPlanNextDate(day, new Date(referenceDate));

  if (!baseDate) {
    return null;
  }

  const [rawHour, rawMinute = "00"] = hour.split(":");
  const resolvedDate = new Date(baseDate);
  resolvedDate.setHours(Number(rawHour) || 0, Number(rawMinute) || 0, 0, 0);
  return resolvedDate;
}

function resolveEventCutoffDateTime(event: TrainingPlanEvent) {
  if (event.isLocked) {
    return resolveEventDateTime(event.lockedDay, event.lockedHour, event.createdAt);
  }

  if (event.eventType !== "training") {
    return null;
  }

  const lastDay = sortTrainingPlanDays(Object.keys(event.possibleSlots)).at(-1) ?? null;
  const lastHour = lastDay
    ? sortTrainingPlanHours(event.possibleSlots[lastDay] ?? []).at(-1) ?? null
    : null;

  return resolveEventDateTime(lastDay, lastHour, event.createdAt);
}

function redirectToTimeout(router: ReturnType<typeof useRouter>) {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem("auth_timeout_notice", "1");
  }

  router.replace("/?reason=session-timeout");
}

export function TrainingPlanPage() {
  const router = useRouter();
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [eligibleMembers, setEligibleMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<TrainingPlanEvent[]>([]);
  const [responses, setResponses] = useState<TrainingPlanResponse[]>([]);
  const [trainingPlanSettings, setTrainingPlanSettings] =
    useState<TrainingPlanSettings>(DEFAULT_TRAINING_PLAN_SETTINGS);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [responseActionError, setResponseActionError] = useState<string | null>(null);
  const [responseActionSuccess, setResponseActionSuccess] = useState<string | null>(
    null,
  );
  const [isBooting, setIsBooting] = useState(true);
  const [isResponsesLoading, setIsResponsesLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingResponse, setIsSavingResponse] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isEventDetailOpen, setIsEventDetailOpen] = useState(false);
  const [isSlotBreakdownOpen, setIsSlotBreakdownOpen] = useState(false);
  const [isTrainingSchoolsOpen, setIsTrainingSchoolsOpen] = useState(false);
  const [isPastEventsOpen, setIsPastEventsOpen] = useState(false);
  const [isEditingVoleyboloynaLink, setIsEditingVoleyboloynaLink] =
    useState(false);
  const [isEditingAmatorMatchProgramLink, setIsEditingAmatorMatchProgramLink] =
    useState(false);
  const [isEditingTrainingSchools, setIsEditingTrainingSchools] =
    useState(false);

  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createType, setCreateType] =
    useState<TrainingPlanEventType>("training");
  const [createSlots, setCreateSlots] = useState<TrainingPlanDaySlotMap>({});
  const [createMatchDay, setCreateMatchDay] = useState<string>(
    TRAINING_PLAN_DAYS[0],
  );
  const [createMatchHour, setCreateMatchHour] = useState<string>(
    TRAINING_PLAN_HOURS[3],
  );
  const [createMatchSource, setCreateMatchSource] =
    useState<TrainingPlanMatchSource>("amator");
  const [createMatchLink, setCreateMatchLink] = useState("");
  const [amatorMatchProgramLinkDraft, setAmatorMatchProgramLinkDraft] =
    useState("");
  const [voleyboloynaLinkDraft, setVoleyboloynaLinkDraft] = useState("");
  const [schoolLinksDraft, setSchoolLinksDraft] = useState<TrainingSchoolLink[]>(
    [],
  );

  const [responseStatus, setResponseStatus] =
    useState<TrainingPlanResponseStatus>("yes");
  const [responseSlots, setResponseSlots] = useState<TrainingPlanDaySlotMap>({});
  const [responseNote, setResponseNote] = useState("");

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );
  const requestedEventId =
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("event")?.trim() ?? "";

  const bestSlot = useMemo(() => {
    if (!selectedEvent || selectedEvent.isLocked) {
      return null;
    }

    return computeTrainingPlanBestSlot({
      responses,
      possibleDays: selectedEvent.possibleDays,
      possibleHours: selectedEvent.possibleHours,
      possibleSlots: selectedEvent.possibleSlots,
    });
  }, [responses, selectedEvent]);

  const sortedPossibleDays = useMemo(
    () => sortTrainingPlanDays(Object.keys(selectedEvent?.possibleSlots ?? {})),
    [selectedEvent],
  );

  const groupedResponses = useMemo(() => {
    return {
      yes: responses.filter((response) => response.status === "yes"),
      maybe: responses.filter((response) => response.status === "maybe"),
      no: responses.filter((response) => response.status === "no"),
    };
  }, [responses]);

  const nonVoters = useMemo(() => {
    const respondedMemberIds = new Set(responses.map((response) => response.memberId));

    return eligibleMembers.filter((member) => !respondedMemberIds.has(member.id));
  }, [eligibleMembers, responses]);

  const slotBreakdown = useMemo(() => {
    if (!selectedEvent || selectedEvent.isLocked) {
      return [];
    }

    return sortedPossibleDays
      .flatMap((day) =>
        (selectedEvent.possibleSlots[day] ?? []).map((hour) => {
          const voters = responses.filter((response) => {
            if (response.status === "no") {
              return false;
            }

            return (response.selectedSlots?.[day] ?? []).includes(hour);
          });

          const score = voters.reduce((total, response) => {
            return total + (response.status === "yes" ? 1 : 0.5);
          }, 0);

          return {
            day,
            hour,
            score,
            participantCount: voters.length,
            voters,
          };
        }),
      )
      .filter((slot) => slot.participantCount > 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        if (right.participantCount !== left.participantCount) {
          return right.participantCount - left.participantCount;
        }

        const dayComparison = compareTrainingPlanDays(left.day, right.day);

        if (dayComparison !== 0) {
          return dayComparison;
        }

        return compareTrainingPlanHours(left.hour, right.hour);
      });
  }, [responses, selectedEvent, sortedPossibleDays]);

  const isAdmin = currentMember?.role === "admin";
  const pastEvents = useMemo(() => {
    const now = new Date();

    return events.filter((event) => {
      const cutoffDate = resolveEventCutoffDateTime(event);
      return Boolean(cutoffDate && cutoffDate.getTime() < now.getTime());
    });
  }, [events]);
  const activeEvents = useMemo(() => {
    const pastEventIds = new Set(pastEvents.map((event) => event.id));
    return events.filter((event) => !pastEventIds.has(event.id));
  }, [events, pastEvents]);
  const canCreateEvents = Boolean(
    currentMember && (currentMember.role === "admin" || currentMember.approved),
  );
  const canManageSelectedEvent = Boolean(
    currentMember &&
      selectedEvent &&
      (currentMember.role === "admin" || currentMember.id === selectedEvent.createdBy),
  );
  const selectedEventUsesCustomMatchLink = Boolean(
    selectedEvent?.matchSource === "amator" &&
      normalizeTrainingPlanLink(selectedEvent.matchLink),
  );
  const selectedEventMatchLink = selectedEvent
    ? normalizeTrainingPlanLink(
        selectedEvent.matchSource === "voleyboloyna"
          ? trainingPlanSettings.voleyboloynaLink
          : selectedEvent.matchSource === "amator"
            ? selectedEvent.matchLink || trainingPlanSettings.amatorMatchProgramLink
            : selectedEvent.matchLink,
      )
    : "";
  const selectedEventMatchLinkLabel =
    selectedEvent?.matchSource === "voleyboloyna"
      ? "VoleybolOyna excel"
      : selectedEvent?.matchSource === "amator"
        ? selectedEventUsesCustomMatchLink
          ? "Mac linki"
          : "Amator mac programi"
        : "Mac linki";
  const whatsappShareMessage = useMemo(() => {
    if (!selectedEvent) {
      return "";
    }

    return buildTrainingPlanWhatsappMessage({
      event: selectedEvent,
      nonVoters,
      detailUrl: buildTrainingPlanShareUrl(selectedEvent.id),
    });
  }, [nonVoters, selectedEvent]);

  useEffect(() => {
    let isActive = true;

    async function bootstrap() {
      if (!hasSupabaseConfig) {
        if (isActive) {
          setPageError(
            "Bu modul Supabase baglantisi acik oldugunda calisiyor. Ayarlar gelmeden oylama ekranini acmayalim.",
          );
          setIsBooting(false);
        }
        return;
      }

      try {
        const [member, nextEvents, nextEligibleMembers, nextSettings] =
          await Promise.all([
          getRemoteSessionMember(),
          fetchTrainingPlanEvents(),
          fetchTrainingPlanEligibleMembers(),
          fetchTrainingPlanSettings(),
        ]);

        if (!member) {
          router.replace("/");
          return;
        }

        if (!isActive) {
          return;
        }

        setCurrentMember(member);
        setEvents(nextEvents);
        setEligibleMembers(nextEligibleMembers);
        setTrainingPlanSettings(nextSettings);
        setAmatorMatchProgramLinkDraft(nextSettings.amatorMatchProgramLink);
        setVoleyboloynaLinkDraft(nextSettings.voleyboloynaLink);
        setSchoolLinksDraft(nextSettings.schoolLinks);
        setIsEditingAmatorMatchProgramLink(false);
        setIsEditingTrainingSchools(false);
        setIsEditingVoleyboloynaLink(false);
        setSelectedEventId((currentSelectedId) => {
          if (
            requestedEventId &&
            nextEvents.some((event) => event.id === requestedEventId)
          ) {
            return requestedEventId;
          }

          if (
            currentSelectedId &&
            nextEvents.some((event) => event.id === currentSelectedId)
          ) {
            return currentSelectedId;
          }

          const nextPastEventIds = new Set(
            nextEvents
              .filter((event) => {
                const cutoffDate = resolveEventCutoffDateTime(event);
                return Boolean(
                  cutoffDate && cutoffDate.getTime() < new Date().getTime(),
                );
              })
              .map((event) => event.id),
          );
          const nextActiveEvent =
            nextEvents.find((event) => !nextPastEventIds.has(event.id)) ?? null;

          return nextActiveEvent?.id ?? nextEvents[0]?.id ?? "";
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (isSessionTimeoutError(error)) {
          redirectToTimeout(router);
          return;
        }

        setPageError(
          getErrorMessage(
            error,
            "Antrenman plani verileri okunurken bir hata olustu.",
          ),
        );
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
  }, [requestedEventId, router]);

  useEffect(() => {
    if (!selectedEventId || !hasSupabaseConfig) {
      setResponses([]);
      return;
    }

    let isActive = true;
    setIsResponsesLoading(true);

    async function loadResponses() {
      try {
        const nextResponses = await fetchTrainingPlanResponses(selectedEventId);

        if (!isActive) {
          return;
        }

        setResponses(nextResponses);
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (isSessionTimeoutError(error)) {
          redirectToTimeout(router);
          return;
        }

        setActionError(
          getErrorMessage(error, "Katilim listesi yuklenirken bir hata oldu."),
        );
      } finally {
        if (isActive) {
          setIsResponsesLoading(false);
        }
      }
    }

    void loadResponses();

    return () => {
      isActive = false;
    };
  }, [router, selectedEventId]);

  useEffect(() => {
    if (!events.length) {
      setSelectedEventId("");
      return;
    }

    if (!selectedEventId || !events.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(activeEvents[0]?.id ?? events[0]?.id ?? "");
    }
  }, [activeEvents, events, selectedEventId]);

  useEffect(() => {
    if (!requestedEventId || !events.some((event) => event.id === requestedEventId)) {
      return;
    }

    setSelectedEventId(requestedEventId);
    setIsEventDetailOpen(true);
  }, [events, requestedEventId]);

  useEffect(() => {
    if (!selectedEvent || !currentMember) {
      return;
    }

    const existingResponse = responses.find(
      (response) => response.memberId === currentMember.id,
    );

    if (existingResponse) {
      setResponseStatus(existingResponse.status);
      setResponseSlots(existingResponse.selectedSlots);
      setResponseNote(existingResponse.note);
      setResponseActionError(null);
      setResponseActionSuccess(null);
      return;
    }

    setResponseStatus("yes");
    setResponseSlots({});
    setResponseNote("");
    setResponseActionError(null);
    setResponseActionSuccess(null);
  }, [currentMember, responses, selectedEvent]);

  function clearCreateForm() {
    setCreateTitle("");
    setCreateDescription("");
    setCreateType("training");
    setCreateSlots({});
    setCreateMatchDay(TRAINING_PLAN_DAYS[0]);
    setCreateMatchHour(TRAINING_PLAN_HOURS[3]);
    setCreateMatchSource("amator");
    setCreateMatchLink("");
  }

  async function refreshEvents(nextSelectedId?: string) {
    const nextEvents = await fetchTrainingPlanEvents();
    setEvents(nextEvents);

    if (nextSelectedId !== undefined) {
      setSelectedEventId(nextSelectedId);
      return;
    }

    setSelectedEventId((currentSelectedId) => {
      if (
        currentSelectedId &&
        nextEvents.some((event) => event.id === currentSelectedId)
      ) {
        return currentSelectedId;
      }

      return nextEvents[0]?.id ?? "";
    });
  }

  async function refreshResponses(eventId: string) {
    const nextResponses = await fetchTrainingPlanResponses(eventId);
    setResponses(nextResponses);
  }

  async function handleCreateEvent() {
    setActionError(null);
    setActionSuccess(null);

    if (createType === "training" && Object.keys(createSlots).length === 0) {
      setActionError("Antrenman icin en az bir gun secmeliyiz.");
      return;
    }

    if (
      createType === "training" &&
      countTrainingPlanSelectedSlots(createSlots) === 0
    ) {
      setActionError("Antrenman icin secilen gunlere en az bir saat vermeliyiz.");
      return;
    }

    if (createType === "training" && hasTrainingPlanEmptyDay(createSlots)) {
      setActionError("Sectigimiz her gun icin en az bir saat belirlemeliyiz.");
      return;
    }

    if (
      createType === "match" &&
      createMatchSource === "voleyboloyna" &&
      !normalizeTrainingPlanLink(trainingPlanSettings.voleyboloynaLink)
    ) {
      setActionError(
        "VoleybolOyna maci olusturmadan once exceli bir kez kaydetmeliyiz.",
      );
      return;
    }

    if (
      createType === "match" &&
      createMatchSource === "amator" &&
      !normalizeTrainingPlanLink(trainingPlanSettings.amatorMatchProgramLink)
    ) {
      setActionError(
        "Amator macini olusturmadan once mac programini bir kez kaydetmeliyiz.",
      );
      return;
    }

    setIsCreating(true);

    try {
      const createdEvent = await createTrainingPlanEvent({
        title: createTitle,
        description: createDescription,
        matchLink:
          createType === "match" && createMatchSource === "amator"
            ? createMatchLink
            : "",
        matchSource: createMatchSource,
        eventType: createType,
        possibleDays:
          createType === "training" ? sortTrainingPlanDays(Object.keys(createSlots)) : [],
        possibleHours:
          createType === "training" ? getUniqueTrainingPlanHours(createSlots) : [],
        possibleSlots:
          createType === "training"
            ? normalizeTrainingPlanSlotMap(createSlots)
            : {},
        isLocked: createType === "match",
        lockedDay: createType === "match" ? createMatchDay : null,
        lockedHour: createType === "match" ? createMatchHour : null,
      });

      await refreshEvents(createdEvent.id);
      setIsEventDetailOpen(true);
      clearCreateForm();
      setActionSuccess("Yeni plan olusturuldu. Detay popup olarak acildi.");
    } catch (error) {
      if (isSessionTimeoutError(error)) {
        redirectToTimeout(router);
        return;
      }

      setActionError(
        getErrorMessage(error, "Plan olusturulurken bir hata olustu."),
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSaveTrainingSettings(
    source: TrainingPlanMatchSource | "schools",
  ) {
    setActionError(null);
    setActionSuccess(null);
    setIsSavingSettings(true);

    try {
      const nextSettings = await saveTrainingPlanSettings({
        voleyboloynaLink: voleyboloynaLinkDraft,
        amatorMatchProgramLink: amatorMatchProgramLinkDraft,
        schoolLinks: schoolLinksDraft,
      });

      setTrainingPlanSettings(nextSettings);
      setAmatorMatchProgramLinkDraft(nextSettings.amatorMatchProgramLink);
      setVoleyboloynaLinkDraft(nextSettings.voleyboloynaLink);
      setSchoolLinksDraft(nextSettings.schoolLinks);
      setIsEditingAmatorMatchProgramLink(false);
      setIsEditingTrainingSchools(false);
      setIsEditingVoleyboloynaLink(false);
      setActionSuccess(
        source === "voleyboloyna"
          ? "VoleybolOyna excel guncellendi."
          : source === "amator"
            ? "Amator mac programi guncellendi."
            : "Okul baglantilari guncellendi.",
      );
    } catch (error) {
      if (isSessionTimeoutError(error)) {
        redirectToTimeout(router);
        return;
      }

      setActionError(
        getErrorMessage(
          error,
          source === "voleyboloyna"
            ? "VoleybolOyna excel kaydedilemedi."
            : source === "amator"
              ? "Amator mac programi kaydedilemedi."
              : "Okul baglantilari kaydedilemedi.",
        ),
      );
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function handleSaveResponse() {
    if (!selectedEvent) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    setResponseActionError(null);
    setResponseActionSuccess(null);

    const shouldPickSlots =
      !selectedEvent.isLocked &&
      (responseStatus === "yes" || responseStatus === "maybe");

    if (shouldPickSlots && Object.keys(responseSlots).length === 0) {
      setResponseActionError("Geliyorum ya da Belki seciminde en az bir gun secmelisin.");
      return;
    }

    if (shouldPickSlots && countTrainingPlanSelectedSlots(responseSlots) === 0) {
      setResponseActionError(
        "Sectigin gunler icin en az bir saat secmeden kaydedemeyiz.",
      );
      return;
    }

    if (shouldPickSlots && hasTrainingPlanEmptyDay(responseSlots)) {
      setResponseActionError("Sectigin her gun icin en az bir saat secmelisin.");
      return;
    }

    setIsSavingResponse(true);

    try {
      await upsertTrainingPlanResponse({
        eventId: selectedEvent.id,
        status: responseStatus,
        selectedDays: shouldPickSlots ? sortTrainingPlanDays(Object.keys(responseSlots)) : [],
        selectedHours: shouldPickSlots ? getUniqueTrainingPlanHours(responseSlots) : [],
        selectedSlots: shouldPickSlots ? normalizeTrainingPlanSlotMap(responseSlots) : {},
        note: responseNote,
      });

      await refreshResponses(selectedEvent.id);
      setResponseActionSuccess("Katilim tercihin kaydedildi.");
    } catch (error) {
      if (isSessionTimeoutError(error)) {
        redirectToTimeout(router);
        return;
      }

      setResponseActionError(
        getErrorMessage(error, "Katilim tercihi kaydedilemedi."),
      );
    } finally {
      setIsSavingResponse(false);
    }
  }

  async function handleLockBestSlot() {
    if (!selectedEvent || !bestSlot) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    setIsLocking(true);

    try {
      await lockTrainingPlanEvent(selectedEvent.id, bestSlot.day, bestSlot.hour);
      await refreshEvents(selectedEvent.id);
      await refreshResponses(selectedEvent.id);
      setActionSuccess("En uygun zaman kilitlendi.");
    } catch (error) {
      if (isSessionTimeoutError(error)) {
        redirectToTimeout(router);
        return;
      }

      setActionError(
        getErrorMessage(error, "Etkinlik kilitlenirken bir hata olustu."),
      );
    } finally {
      setIsLocking(false);
    }
  }

  async function handleDeleteEvent() {
    if (!selectedEvent) {
      return;
    }

    if (
      typeof window !== "undefined" &&
      !window.confirm(`"${selectedEvent.title}" etkinligini silmek istiyor musun?`)
    ) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    setIsDeleting(true);

    try {
      await deleteTrainingPlanEvent(selectedEvent.id);
      const remainingEventId = events.find((event) => event.id !== selectedEvent.id)?.id;
        await refreshEvents(remainingEventId ?? "");
        setIsEventDetailOpen(false);
        setIsSlotBreakdownOpen(false);
        setResponses([]);
        setActionSuccess("Etkinlik silindi.");
    } catch (error) {
      if (isSessionTimeoutError(error)) {
        redirectToTimeout(router);
        return;
      }

      setActionError(
        getErrorMessage(error, "Etkinlik silinirken bir hata olustu."),
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const eventDetailContent = selectedEvent ? (
    <>
      <SectionHeader
        title={selectedEvent.title}
        description={
          selectedEvent.description ||
          "Bu etkinlik icin katilim durumunu, uygun gunleri ve sonucu bu panelden yonetebiliriz."
        }
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <WhatsappShareButton
              disabled={!whatsappShareMessage}
              onClick={() => openWhatsAppShare(whatsappShareMessage)}
            />
            <EventTypeBadge
              label={getTrainingPlanEventTypeLabel(selectedEvent.eventType)}
              locked={selectedEvent.isLocked}
            />
          </div>
        }
      />

      {selectedEvent.eventType === "match" &&
      (selectedEvent.matchSource === "voleyboloyna"
        ? Boolean(selectedEventMatchLink)
        : selectedEvent.matchSource === "amator"
          ? Boolean(selectedEventMatchLink)
          : Boolean(selectedEventMatchLink)) ? (
        <SoftCard className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8d6ae8]">
              {selectedEventMatchLinkLabel}
            </span>
            <p className="text-sm text-[#5f6d76]">
              {selectedEvent.matchSource === "voleyboloyna"
                ? "Bu mac icin VoleybolOyna exceli kullaniliyor."
                : selectedEvent.matchSource === "amator"
                  ? selectedEventUsesCustomMatchLink
                    ? "Bu etkinlik icin eklenen opsiyonel mac linki burada gorunur."
                    : "Bu mac icin Amator mac programi kullaniliyor."
                  : "Bu etkinlik icin paylasilan baglantiyi buradan acabiliriz."}
            </p>
          </div>
          <a
            href={selectedEventMatchLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-full border border-[rgba(141,106,232,0.16)] bg-[linear-gradient(135deg,#d96aa7,#8d6ae8)] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(141,106,232,0.24)] transition hover:brightness-105"
          >
            {selectedEvent.matchSource === "voleyboloyna"
              ? "Excele git"
              : selectedEvent.matchSource === "amator" &&
                  !selectedEventUsesCustomMatchLink
                ? "Sayfayi ac"
                : "Linki ac"}
          </a>
        </SoftCard>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="grid gap-4">
          <SoftCard className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <strong className="text-lg text-[#182127]">Katilim secimin</strong>
              <InlineMeta>
                  <span>
                    {selectedEvent.isLocked
                      ? "Sabit tarih"
                      : `${Object.keys(selectedEvent.possibleSlots).length} gun / ${countTrainingPlanSelectedSlots(selectedEvent.possibleSlots)} saat`}
                  </span>
                </InlineMeta>
              </div>

            {selectedEvent.isLocked &&
            selectedEvent.lockedDay &&
            selectedEvent.lockedHour ? (
              <ToneMessage tone="muted">
                Bu kayit sabitlendi. Katilim verirken sadece
                {` ${selectedEvent.lockedDay} `}
                ve
                {` ${formatTrainingPlanHourRange(selectedEvent.lockedHour)} `}
                zamani esas alinacak.
              </ToneMessage>
            ) : null}

            <FieldBlock label="Durum">
              <div className="grid gap-2 sm:grid-cols-3">
                {(["yes", "maybe", "no"] as TrainingPlanResponseStatus[]).map(
                  (status) => (
                    <StatusChoiceButton
                      key={status}
                      label={getTrainingPlanStatusLabel(status)}
                      active={responseStatus === status}
                      tone={status}
                      onClick={() => setResponseStatus(status)}
                    />
                  ),
                )}
              </div>
            </FieldBlock>

            {!selectedEvent.isLocked &&
            (responseStatus === "yes" || responseStatus === "maybe") ? (
              <>
                <FieldBlock label="Uygun gunler">
                  <ChipGrid
                    values={sortedPossibleDays}
                    selectedValues={sortTrainingPlanDays(Object.keys(responseSlots))}
                    onToggle={(value) =>
                      setResponseSlots((current) =>
                        toggleTrainingPlanSlotDay(current, value),
                      )
                    }
                  />
                </FieldBlock>

                {sortTrainingPlanDays(Object.keys(responseSlots)).length > 0 ? (
                  <FieldBlock label="Gunlere gore uygun saatler">
                    <DaySlotSelector
                      availableDays={sortTrainingPlanDays(Object.keys(responseSlots))}
                      hourOptions={[...TRAINING_PLAN_HOURS]}
                      allowedSlots={selectedEvent.possibleSlots}
                      selectedSlots={responseSlots}
                      onToggleHour={(day, hour) =>
                        setResponseSlots((current) =>
                          toggleTrainingPlanSlotHour(current, day, hour),
                        )
                      }
                    />
                  </FieldBlock>
                ) : null}
              </>
            ) : null}

            <FieldBlock label="Not">
              <TextArea
                rows={4}
                value={responseNote}
                onChange={(event) => setResponseNote(event.target.value)}
                placeholder="Gerekirse kisa bir not ekleyebilirsin."
              />
            </FieldBlock>

            {responseActionError ? (
              <ToneMessage tone="error">{responseActionError}</ToneMessage>
            ) : null}
            {responseActionSuccess ? (
              <ToneMessage tone="success">{responseActionSuccess}</ToneMessage>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <PrimaryButton
                type="button"
                disabled={isSavingResponse}
                onClick={() => void handleSaveResponse()}
              >
                {isSavingResponse ? "Kaydediliyor..." : "Katilimi kaydet"}
              </PrimaryButton>

              {canManageSelectedEvent && !selectedEvent.isLocked && bestSlot ? (
                <SecondaryButton
                  type="button"
                  disabled={isLocking || bestSlot.participantCount === 0}
                  onClick={() => void handleLockBestSlot()}
                >
                  {isLocking ? "Kilitleniyor..." : "En uygun zamani kilitle"}
                </SecondaryButton>
              ) : null}

              {canManageSelectedEvent ? (
                <DangerButton
                  type="button"
                  disabled={isDeleting}
                  onClick={() => void handleDeleteEvent()}
                >
                  {isDeleting ? "Siliniyor..." : "Etkinligi sil"}
                </DangerButton>
              ) : null}
            </div>
          </SoftCard>
        </div>

        <div className="grid gap-4">
          <SoftCard className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <strong className="text-lg text-[#182127]">
                {selectedEvent.isLocked ? "Sabit zaman" : "En uygun zaman"}
              </strong>
              {bestSlot && !selectedEvent.isLocked ? (
                <InlineMeta>
                  <span>Skor {bestSlot.score.toFixed(1)}</span>
                  <span>{bestSlot.participantCount} kisi</span>
                </InlineMeta>
              ) : null}
            </div>

            {selectedEvent.isLocked &&
            selectedEvent.lockedDay &&
            selectedEvent.lockedHour ? (
              <ResultCard
                title={`${selectedEvent.lockedDay} / ${formatTrainingPlanHourRange(selectedEvent.lockedHour)}`}
                subtitle={formatTrainingPlanDate(selectedEvent.lockedDay)}
                tone="locked"
              />
            ) : bestSlot && bestSlot.participantCount > 0 ? (
              <button
                type="button"
                onClick={() => setIsSlotBreakdownOpen(true)}
                className="block w-full text-left"
              >
                <ResultCard
                  title={`${bestSlot.day} / ${formatTrainingPlanHourRange(bestSlot.hour)}`}
                  subtitle={`${formatTrainingPlanDate(bestSlot.day)} - ${bestSlot.participantCount} kisi bu aralikta uygun gozukuyor.`}
                  tone="best"
                />
              </button>
            ) : (
              <EmptyState
                title="Henuz net sonuc yok."
                description="Biraz daha katilim girildiginde en uygun gun ve saat burada belirginlesecek."
              />
            )}

            {!selectedEvent.isLocked && bestSlot?.allScores?.length ? (
              <GhostButton
                type="button"
                onClick={() => setIsSlotBreakdownOpen(true)}
              >
                Oylari gor
              </GhostButton>
            ) : null}
          </SoftCard>

          <SoftCard className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <strong className="text-lg text-[#182127]">Katilim listesi</strong>
              {isResponsesLoading ? (
                <span className="text-xs font-medium text-[#6d7a83]">
                  Guncelleniyor...
                </span>
              ) : null}
            </div>

            {responses.length ? (
              <div className="grid gap-4">
                <ParticipantGroup
                  title="Geliyorum"
                  responses={groupedResponses.yes}
                  tone="yes"
                />
                <ParticipantGroup
                  title="Belki"
                  responses={groupedResponses.maybe}
                  tone="maybe"
                />
                <ParticipantGroup
                  title="Gelemiyorum"
                  responses={groupedResponses.no}
                  tone="no"
                />
              </div>
            ) : (
              <EmptyState
                title="Henuz katilim yok."
                description="Ilk cevap geldigi anda katilim listesi burada gorunecek."
              />
            )}
          </SoftCard>

          <SoftCard className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <strong className="text-lg text-[#182127]">Oy vermeyen uyeler</strong>
              <span className="text-xs font-medium text-[#6d7a83]">
                {nonVoters.length} kisi
              </span>
            </div>

            {nonVoters.length ? (
              <div className="flex flex-wrap gap-2">
                {nonVoters.map((member) => (
                  <div
                    key={member.id}
                    className="inline-flex items-center gap-2 rounded-full border border-[rgba(141,106,232,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(246,241,255,0.64))] px-4 py-2"
                  >
                    <strong className="text-sm text-[#182127]">
                      {member.name}
                    </strong>
                    <span className="text-xs text-[#6d7a83]">
                      {member.username ? `@${member.username}` : "Uye"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <ToneMessage tone="success">Tum uyeler oy vermis gorunuyor.</ToneMessage>
            )}
          </SoftCard>
        </div>
      </div>
    </>
  ) : null;

  if (isBooting) {
    return (
      <Panel>
        <ToneMessage tone="muted">
          Antrenman plani modulu hazirlaniyor. Oturum ve etkinlikler okunuyor.
        </ToneMessage>
      </Panel>
    );
  }

  if (pageError) {
    return (
      <Panel>
        <SectionHeader
          title="Antrenman plani"
          description="Bu alan referans projedeki planlama akisina gore ayrildi."
        />
        <ToneMessage tone="error">{pageError}</ToneMessage>
      </Panel>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <MetricCard
          label="Toplam etkinlik"
          mobileLabel="Toplam"
          value={String(activeEvents.length)}
          accent="from-[#d96aa7] to-[#f08bbd]"
        />
        <MetricCard
          label="Acik oylama"
          mobileLabel="Acik"
          value={String(activeEvents.filter((event) => !event.isLocked).length)}
          accent="from-[#8d6ae8] to-[#b48cff]"
        />
        <MetricCard
          label="Kilitli plan"
          mobileLabel="Kilitli"
          value={String(activeEvents.filter((event) => event.isLocked).length)}
          accent="from-[#58b783] to-[#8ad8a8]"
        />
      </div>

      {(actionError || actionSuccess) && (
        <Panel className="space-y-3">
          {actionError ? <ToneMessage tone="error">{actionError}</ToneMessage> : null}
          {actionSuccess ? (
            <ToneMessage tone="success">{actionSuccess}</ToneMessage>
          ) : null}
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="order-2 grid gap-6 xl:order-1">
          <Panel className="space-y-5">
            <SectionHeader
              title="Antrenman plani"
              description="Referans projedeki etkinlik + katilim + en uygun saat akisini bu sekmeye ayirdik."
            />

            {canCreateEvents ? (
                <div className="grid gap-4">
                <FieldBlock label="Etkinlik adi (opsiyonel)">
                  <TextInput
                    value={createTitle}
                    onChange={(event) => setCreateTitle(event.target.value)}
                    placeholder={`Bos birakirsak ${buildTrainingPlanEventTitle(createType)} olarak olusur.`}
                  />
                </FieldBlock>

                <FieldBlock label="Etkinlik tipi">
                  <div className="grid grid-cols-2 gap-2 rounded-[24px] border border-[rgba(141,106,232,0.12)] bg-[linear-gradient(145deg,rgba(255,255,255,0.84),rgba(246,241,255,0.72))] p-1.5">
                    <button
                      type="button"
                      onClick={() => setCreateType("training")}
                      className={cx(
                        "rounded-[18px] px-4 py-3 text-sm font-semibold transition duration-200",
                        createType === "training"
                          ? "bg-[linear-gradient(135deg,#d96aa7,#8d6ae8)] text-white shadow-[0_16px_28px_rgba(141,106,232,0.24)]"
                          : "bg-transparent text-[#5f6d76] hover:bg-white/70 hover:text-[#182127]",
                      )}
                    >
                      Antrenman
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateType("match")}
                      className={cx(
                        "rounded-[18px] px-4 py-3 text-sm font-semibold transition duration-200",
                        createType === "match"
                          ? "bg-[linear-gradient(135deg,#d96aa7,#8d6ae8)] text-white shadow-[0_16px_28px_rgba(141,106,232,0.24)]"
                          : "bg-transparent text-[#5f6d76] hover:bg-white/70 hover:text-[#182127]",
                      )}
                    >
                      Mac
                    </button>
                  </div>
                </FieldBlock>

                {createType === "training" ? (
                  <>
                    <FieldBlock label="Gunler">
                      <ChipGrid
                        values={[...TRAINING_PLAN_DAYS]}
                        selectedValues={sortTrainingPlanDays(Object.keys(createSlots))}
                        onToggle={(value) =>
                          setCreateSlots((current) =>
                            toggleTrainingPlanSlotDay(current, value),
                          )
                        }
                      />
                    </FieldBlock>

                    {sortTrainingPlanDays(Object.keys(createSlots)).length > 0 ? (
                      <FieldBlock label="Gun bazli saatler">
                        <DaySlotSelector
                          availableDays={sortTrainingPlanDays(Object.keys(createSlots))}
                          hourOptions={[...TRAINING_PLAN_HOURS]}
                          selectedSlots={createSlots}
                          onToggleHour={(day, hour) =>
                            setCreateSlots((current) =>
                              toggleTrainingPlanSlotHour(current, day, hour),
                            )
                          }
                        />
                      </FieldBlock>
                    ) : null}

                    <SoftCard className="space-y-4">
                      <div className="space-y-1">
                        <strong className="block text-sm text-[#182127]">
                          Okullar
                        </strong>
                        <p className="text-sm text-[#5f6d76]">
                          Okul, fiyat ve adres bilgilerini popup'ta
                          acabiliriz.
                        </p>
                      </div>
                      <SecondaryButton
                        type="button"
                        onClick={() => setIsTrainingSchoolsOpen(true)}
                      >
                        Okullari gor
                      </SecondaryButton>
                    </SoftCard>
                  </>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                    <FieldBlock label="Mac kaynagi">
                      <div className="grid grid-cols-2 gap-2 rounded-[24px] border border-[rgba(141,106,232,0.12)] bg-[linear-gradient(145deg,rgba(255,255,255,0.84),rgba(246,241,255,0.72))] p-1.5">
                        <button
                          type="button"
                          onClick={() => setCreateMatchSource("amator")}
                          className={cx(
                            "rounded-[18px] px-4 py-3 text-sm font-semibold transition duration-200",
                            createMatchSource === "amator"
                              ? "bg-[linear-gradient(135deg,#d96aa7,#8d6ae8)] text-white shadow-[0_16px_28px_rgba(141,106,232,0.24)]"
                              : "bg-transparent text-[#5f6d76] hover:bg-white/70 hover:text-[#182127]",
                          )}
                        >
                          Amator
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreateMatchSource("voleyboloyna")}
                          className={cx(
                            "rounded-[18px] px-4 py-3 text-sm font-semibold transition duration-200",
                            createMatchSource === "voleyboloyna"
                              ? "bg-[linear-gradient(135deg,#d96aa7,#8d6ae8)] text-white shadow-[0_16px_28px_rgba(141,106,232,0.24)]"
                              : "bg-transparent text-[#5f6d76] hover:bg-white/70 hover:text-[#182127]",
                          )}
                        >
                          VoleybolOyna
                        </button>
                      </div>
                    </FieldBlock>

                    {createMatchSource === "amator" ? (
                      <SoftCard className="space-y-4 md:col-span-2 xl:col-span-1">
                        <div className="space-y-1">
                          <strong className="block text-sm text-[#182127]">
                            Amator mac programi
                          </strong>
                        </div>

                        {isAdmin ? (
                          isEditingAmatorMatchProgramLink ||
                          !trainingPlanSettings.amatorMatchProgramLink ? (
                            <div className="grid gap-3">
                              <TextInput
                                value={amatorMatchProgramLinkDraft}
                                onChange={(event) =>
                                  setAmatorMatchProgramLinkDraft(
                                    event.target.value,
                                  )
                                }
                                placeholder="Ornek: https://..."
                              />
                              <div className="flex flex-wrap gap-3">
                                <SecondaryButton
                                  type="button"
                                  disabled={isSavingSettings}
                                  onClick={() =>
                                    void handleSaveTrainingSettings("amator")
                                  }
                                >
                                  {isSavingSettings ? "Kaydediliyor..." : "Kaydet"}
                                </SecondaryButton>
                                {trainingPlanSettings.amatorMatchProgramLink ? (
                                  <GhostButton
                                    type="button"
                                    onClick={() => {
                                      setAmatorMatchProgramLinkDraft(
                                        trainingPlanSettings.amatorMatchProgramLink,
                                      );
                                      setIsEditingAmatorMatchProgramLink(false);
                                    }}
                                  >
                                    Iptal
                                  </GhostButton>
                                ) : null}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-3">
                              <a
                                href={trainingPlanSettings.amatorMatchProgramLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center rounded-full border border-[rgba(141,106,232,0.16)] bg-[linear-gradient(135deg,#d96aa7,#8d6ae8)] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(141,106,232,0.24)] transition hover:brightness-105"
                              >
                                Sayfayi ac
                              </a>
                              <GhostButton
                                type="button"
                                onClick={() => {
                                  setAmatorMatchProgramLinkDraft(
                                    trainingPlanSettings.amatorMatchProgramLink,
                                  );
                                  setIsEditingAmatorMatchProgramLink(true);
                                }}
                              >
                                Duzenle
                              </GhostButton>
                            </div>
                          )
                        ) : (
                          <>
                            {trainingPlanSettings.amatorMatchProgramLink ? (
                              <a
                                href={trainingPlanSettings.amatorMatchProgramLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center rounded-full border border-[rgba(141,106,232,0.16)] bg-[linear-gradient(135deg,#d96aa7,#8d6ae8)] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(141,106,232,0.24)] transition hover:brightness-105"
                              >
                                Sayfayi ac
                              </a>
                            ) : (
                              <div className="rounded-[18px] border border-[rgba(141,106,232,0.1)] bg-white/74 px-4 py-3 text-sm text-[#5f6d76]">
                                Henuz mac programi eklenmedi.
                              </div>
                            )}
                          </>
                        )}
                      </SoftCard>
                    ) : (
                      <SoftCard className="space-y-4 md:col-span-2 xl:col-span-1">
                        <div className="space-y-1">
                          <strong className="block text-sm text-[#182127]">
                            VoleybolOyna excel
                          </strong>
                        </div>

                        {isAdmin ? (
                          isEditingVoleyboloynaLink ||
                          !trainingPlanSettings.voleyboloynaLink ? (
                            <div className="grid gap-3">
                              <TextInput
                                value={voleyboloynaLinkDraft}
                                onChange={(event) =>
                                  setVoleyboloynaLinkDraft(event.target.value)
                                }
                                placeholder="Ornek: https://voleyboloyna.com/..."
                              />
                              <div className="flex flex-wrap gap-3">
                                <SecondaryButton
                                  type="button"
                                  disabled={isSavingSettings}
                                  onClick={() =>
                                    void handleSaveTrainingSettings(
                                      "voleyboloyna",
                                    )
                                  }
                                >
                                  {isSavingSettings ? "Kaydediliyor..." : "Kaydet"}
                                </SecondaryButton>
                                {trainingPlanSettings.voleyboloynaLink ? (
                                  <GhostButton
                                    type="button"
                                    onClick={() => {
                                      setVoleyboloynaLinkDraft(
                                        trainingPlanSettings.voleyboloynaLink,
                                      );
                                      setIsEditingVoleyboloynaLink(false);
                                    }}
                                  >
                                    Iptal
                                  </GhostButton>
                                ) : null}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-3">
                              <a
                                href={trainingPlanSettings.voleyboloynaLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center rounded-full border border-[rgba(141,106,232,0.16)] bg-[linear-gradient(135deg,#d96aa7,#8d6ae8)] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(141,106,232,0.24)] transition hover:brightness-105"
                              >
                                Excele git
                              </a>
                              <GhostButton
                                type="button"
                                onClick={() => {
                                  setVoleyboloynaLinkDraft(
                                    trainingPlanSettings.voleyboloynaLink,
                                  );
                                  setIsEditingVoleyboloynaLink(true);
                                }}
                              >
                                Duzenle
                              </GhostButton>
                            </div>
                          )
                        ) : (
                          <>
                            {trainingPlanSettings.voleyboloynaLink ? (
                              <a
                                href={trainingPlanSettings.voleyboloynaLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center rounded-full border border-[rgba(141,106,232,0.16)] bg-[linear-gradient(135deg,#d96aa7,#8d6ae8)] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(141,106,232,0.24)] transition hover:brightness-105"
                              >
                                Excele git
                              </a>
                            ) : (
                              <div className="rounded-[18px] border border-[rgba(141,106,232,0.1)] bg-white/74 px-4 py-3 text-sm text-[#5f6d76]">
                                Henuz excel eklenmedi.
                              </div>
                            )}
                          </>
                        )}
                      </SoftCard>
                    )}

                    {createMatchSource === "amator" ? (
                      <FieldBlock label="Mac linki (opsiyonel)">
                        <TextInput
                          value={createMatchLink}
                          onChange={(event) => setCreateMatchLink(event.target.value)}
                          placeholder="Ornek: https://..."
                        />
                      </FieldBlock>
                    ) : null}

                    <FieldBlock label="Mac gunu">
                      <SelectInput
                        value={createMatchDay}
                        onChange={(event) => setCreateMatchDay(event.target.value)}
                      >
                        {TRAINING_PLAN_DAYS.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </SelectInput>
                    </FieldBlock>

                    <FieldBlock label="Mac saati">
                      <SelectInput
                        value={createMatchHour}
                        onChange={(event) => setCreateMatchHour(event.target.value)}
                      >
                        {TRAINING_PLAN_HOURS.map((hour) => (
                          <option key={hour} value={hour}>
                            {hour}
                          </option>
                        ))}
                      </SelectInput>
                    </FieldBlock>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <PrimaryButton
                    type="button"
                    disabled={isCreating}
                    onClick={() => void handleCreateEvent()}
                  >
                    {isCreating ? "Olusturuluyor..." : "Etkinlik olustur"}
                  </PrimaryButton>
                  <GhostButton type="button" onClick={clearCreateForm}>
                    Formu temizle
                  </GhostButton>
                </div>
              </div>
              ) : (
                <ToneMessage tone="muted">
                  Etkinlik olusturma alani sadece onayli uyeler ve admin hesaplari
                  icin acik. Diger uyeler mevcut planlari takip edebilir.
                </ToneMessage>
              )}
          </Panel>

        </div>

        <Panel className="order-1 space-y-5 xl:order-2">
          <SectionHeader
            title="Etkinlikler"
            description="Bu listedeki bir kayda tikladigimizda detay popup olarak acilir."
          />

          {activeEvents.length ? (
            <div className="grid gap-3">
              {activeEvents.map((event) => {
                const isSelected = event.id === selectedEventId;

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      setSelectedEventId(event.id);
                      setIsEventDetailOpen(true);
                    }}
                    className={cx(
                      "rounded-[26px] border p-4 text-left transition duration-200",
                      isSelected
                        ? "border-[rgba(141,106,232,0.18)] bg-[linear-gradient(145deg,rgba(255,241,248,0.96),rgba(246,241,255,0.92),rgba(242,251,245,0.9))] shadow-[0_18px_38px_rgba(141,106,232,0.12)]"
                        : "border-[rgba(141,106,232,0.1)] bg-white/68 hover:-translate-y-0.5 hover:bg-white/84",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <EventTypeBadge
                          label={getTrainingPlanEventTypeLabel(event.eventType)}
                          locked={event.isLocked}
                        />
                        <strong className="block text-base text-[#182127]">
                          {event.title}
                        </strong>
                      </div>
                      <span className="text-xs font-medium text-[#6d7a83]">
                        {formatDateTime(event.createdAt)}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-[#5f6d76]">
                      {event.isLocked && event.lockedDay && event.lockedHour
                        ? `${event.lockedDay} / ${formatTrainingPlanHourRange(event.lockedHour)}`
                        : `${Object.keys(event.possibleSlots).length} gun, ${countTrainingPlanSelectedSlots(event.possibleSlots)} farkli saat secenegiyle oylaniyor.`}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Henuz plan yok."
              description="Admin tarafinda ilk antrenman ya da mac kaydini olusturdugumuzda liste burada dolacak."
            />
          )}
        </Panel>
      </div>

      <Panel className="space-y-5">
        <button
          type="button"
          onClick={() => setIsPastEventsOpen((current) => !current)}
          className="flex w-full items-start justify-between gap-4 text-left"
        >
          <SectionHeader
            title="Gecmis etkinlikler"
            description={
              isPastEventsOpen
                ? "Liste acik. Tekrar tiklayinca geri kapanir."
                : "Tiklayinca asagi acilir. Detaylar yine popup olarak acilir."
            }
          />
          <span className="mt-1 inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-[rgba(141,106,232,0.14)] bg-white/80 px-3 text-sm font-semibold text-[#8d6ae8]">
            {isPastEventsOpen ? "-" : "+"}
          </span>
        </button>

        {isPastEventsOpen ? (
          pastEvents.length ? (
            <div className="grid gap-3">
            {pastEvents.map((event) => {
              const isSelected = event.id === selectedEventId;

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => {
                    setSelectedEventId(event.id);
                    setIsEventDetailOpen(true);
                  }}
                  className={cx(
                    "rounded-[26px] border p-4 text-left transition duration-200",
                    isSelected
                      ? "border-[rgba(141,106,232,0.18)] bg-[linear-gradient(145deg,rgba(255,241,248,0.96),rgba(246,241,255,0.92),rgba(242,251,245,0.9))] shadow-[0_18px_38px_rgba(141,106,232,0.12)]"
                      : "border-[rgba(141,106,232,0.1)] bg-white/68 hover:-translate-y-0.5 hover:bg-white/84",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <EventTypeBadge
                        label={getTrainingPlanEventTypeLabel(event.eventType)}
                        locked={event.isLocked}
                      />
                      <strong className="block text-base text-[#182127]">
                        {event.title}
                      </strong>
                    </div>
                    <span className="text-xs font-medium text-[#6d7a83]">
                      {formatDateTime(event.createdAt)}
                    </span>
                  </div>

                    <p className="mt-3 text-sm leading-6 text-[#5f6d76]">
                      {event.isLocked && event.lockedDay && event.lockedHour
                        ? `${event.lockedDay} / ${formatTrainingPlanHourRange(event.lockedHour)}`
                        : `${Object.keys(event.possibleSlots).length} gun, ${countTrainingPlanSelectedSlots(event.possibleSlots)} farkli saat secenegiyle oylaniyor.`}
                    </p>
                  </button>
                );
            })}
            </div>
          ) : (
            <EmptyState
              title="Henuz gecmis etkinlik yok."
              description="Tarihi gecen etkinlikler burada gorunecek."
            />
          )
        ) : null}
      </Panel>

      {selectedEvent && isEventDetailOpen ? (
        <ModalShell
          title="Etkinlik detayi"
          onClose={() => setIsEventDetailOpen(false)}
          className="sm:max-w-6xl"
        >
          {eventDetailContent}
        </ModalShell>
      ) : null}

      {selectedEvent && isSlotBreakdownOpen ? (
        <ModalShell
          title="Oy dagilimi"
          onClose={() => setIsSlotBreakdownOpen(false)}
          className="sm:max-w-5xl"
        >
          <div className="grid gap-4">
            <SectionHeader
              title={selectedEvent.title}
              description="Her saat araliginda kimlerin uygun dedigini bu popup'ta topladik."
            />

            {slotBreakdown.length ? (
              <div className="grid gap-4">
                {slotBreakdown.map((slot) => (
                  <SoftCard key={`${slot.day}-${slot.hour}`} className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <strong className="block text-lg text-[#182127]">
                          {slot.day} / {slot.hour}
                        </strong>
                        <p className="text-sm text-[#5f6d76]">
                          Saat araligi: {formatTrainingPlanHourRange(slot.hour)}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <strong className="block text-[#182127]">
                          Skor {slot.score.toFixed(1)}
                        </strong>
                        <span className="text-[#5f6d76]">
                          {slot.participantCount} kisi
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {slot.voters.map((response) => (
                        <SlotVoterPill
                          key={`${slot.day}-${slot.hour}-${response.id}`}
                          label={response.memberDisplayName}
                          username={response.memberUsername}
                          status={response.status}
                        />
                      ))}
                    </div>
                  </SoftCard>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Henuz detay yok."
                description="Oy geldikce hangi gun ve saatte kimlerin uygun oldugu burada listelenecek."
              />
            )}
          </div>
        </ModalShell>
      ) : null}

      {isTrainingSchoolsOpen ? (
        <ModalShell
          title="Okullar"
          onClose={() => setIsTrainingSchoolsOpen(false)}
          className="sm:max-w-5xl"
        >
          <div className="grid gap-4">
            <SectionHeader
              title="Okullar"
              description="Okul bilgilerini, fiyatlari ve adresleri bu popup'ta topladik."
              action={
                isAdmin ? (
                  isEditingTrainingSchools ? (
                    <div className="flex flex-wrap gap-2">
                      <SecondaryButton
                        type="button"
                        disabled={isSavingSettings}
                        onClick={() => void handleSaveTrainingSettings("schools")}
                      >
                        {isSavingSettings ? "Kaydediliyor..." : "Kaydet"}
                      </SecondaryButton>
                      <GhostButton
                        type="button"
                        onClick={() => {
                          setSchoolLinksDraft(trainingPlanSettings.schoolLinks);
                          setIsEditingTrainingSchools(false);
                        }}
                      >
                        Iptal
                      </GhostButton>
                    </div>
                  ) : (
                    <GhostButton
                      type="button"
                      onClick={() => {
                        setSchoolLinksDraft(trainingPlanSettings.schoolLinks);
                        setIsEditingTrainingSchools(true);
                      }}
                    >
                      Duzenle
                    </GhostButton>
                  )
                ) : null
              }
            />

            {isEditingTrainingSchools ? (
              <div className="grid gap-4">
                {schoolLinksDraft.length ? (
                  schoolLinksDraft.map((schoolLink, index) => (
                    <TrainingSchoolEditorCard
                      key={schoolLink.id}
                      index={index}
                      link={schoolLink}
                      onChange={(field, value) =>
                        setSchoolLinksDraft((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, [field]: value }
                              : entry,
                          ),
                        )
                      }
                      onRemove={() =>
                        setSchoolLinksDraft((current) =>
                          current.filter((_, entryIndex) => entryIndex !== index),
                        )
                      }
                    />
                  ))
                ) : (
                  <EmptyState
                    title="Henuz okul eklenmedi."
                    description="Ilk okul kaydini bu popup icinden ekleyebiliriz."
                  />
                )}

                <GhostButton
                  type="button"
                  onClick={() =>
                    setSchoolLinksDraft((current) => [
                      ...current,
                      createEmptyTrainingSchoolLink(),
                    ])
                  }
                >
                  Okul ekle
                </GhostButton>
              </div>
            ) : trainingPlanSettings.schoolLinks.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {trainingPlanSettings.schoolLinks.map((schoolLink) => (
                  <TrainingSchoolCard key={schoolLink.id} link={schoolLink} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Henuz okul eklenmedi."
                description="Admin bu popup icinden okul linklerini daha sonra ekleyebilir."
              />
            )}
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  mobileLabel,
  value,
  accent,
}: {
  label: string;
  mobileLabel?: string;
  value: string;
  accent: string;
}) {
  return (
    <SoftCard className="flex items-center justify-between gap-3 px-2.5 py-2 sm:px-5 sm:py-5">
      <span className="min-w-0 text-left text-[9px] font-semibold uppercase tracking-[0.08em] text-[#6d7a83] sm:text-xs sm:tracking-[0.16em]">
        <span className="sm:hidden">{mobileLabel ?? label}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
      <div
        className={cx(
          "inline-flex shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-r px-2.5 py-1 text-lg font-bold text-white shadow-[0_10px_20px_rgba(141,106,232,0.16)] sm:rounded-[20px] sm:px-4 sm:py-2 sm:text-3xl sm:shadow-[0_16px_30px_rgba(141,106,232,0.18)]",
          accent,
        )}
      >
        {value}
      </div>
    </SoftCard>
  );
}

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[#33444d]">{label}</span>
      {children}
    </label>
  );
}

function ChipGrid({
  values,
  selectedValues,
  onToggle,
}: {
  values: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {values.map((value) => {
          const active = selectedValues.includes(value);

          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(value)}
              className={cx(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition duration-200",
                active
                  ? "border-transparent bg-[linear-gradient(135deg,#d96aa7,#8d6ae8)] text-white shadow-[0_16px_28px_rgba(141,106,232,0.24)]"
                  : "border-[rgba(141,106,232,0.12)] bg-white/74 text-[#5f6d76] hover:bg-white",
              )}
            >
              <span>{value}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-[20px] text-sm font-medium text-[#5f6d76]">
        {selectedValues.length > 0 ? (
          <span>
            Secilen: <span className="font-semibold text-[#182127]">{selectedValues.join(", ")}</span>
          </span>
        ) : (
          <span>Henuz secim yapilmadi.</span>
        )}
      </div>
    </div>
  );
}

function DaySlotSelector({
  availableDays,
  hourOptions,
  selectedSlots,
  onToggleHour,
  allowedSlots,
}: {
  availableDays: string[];
  hourOptions: string[];
  selectedSlots: TrainingPlanDaySlotMap;
  onToggleHour: (day: string, hour: string) => void;
  allowedSlots?: TrainingPlanDaySlotMap;
}) {
  return (
    <div className="grid gap-4">
      {availableDays.map((day) => {
        const selectedHours = sortTrainingPlanHours(selectedSlots[day] ?? []);
        const allowedHours = sortTrainingPlanHours(
          allowedSlots?.[day] ?? hourOptions,
        );

        return (
          <div
            key={day}
            className="rounded-[22px] border border-[rgba(141,106,232,0.1)] bg-white/66 p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm text-[#182127]">{day}</strong>
              <span className="text-xs text-[#6d7a83]">
                {selectedHours.length > 0
                  ? selectedHours.join(", ")
                  : "Henuz saat secilmedi."}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {allowedHours.map((hour) => {
                const active = selectedHours.includes(hour);

                return (
                  <button
                    key={`${day}-${hour}`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggleHour(day, hour)}
                    className={cx(
                      "inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition duration-200",
                      active
                        ? "border-transparent bg-[linear-gradient(135deg,#d96aa7,#8d6ae8)] text-white shadow-[0_16px_28px_rgba(141,106,232,0.24)]"
                        : "border-[rgba(141,106,232,0.12)] bg-white/74 text-[#5f6d76] hover:bg-white",
                    )}
                  >
                    {hour}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusChoiceButton({
  label,
  active,
  tone,
  onClick,
}: {
  label: string;
  active: boolean;
  tone: TrainingPlanResponseStatus;
  onClick: () => void;
}) {
  const toneClasses =
    tone === "yes"
      ? active
        ? "border-[rgba(88,183,131,0.22)] bg-[rgba(238,251,242,0.96)] text-[#2f8f5c]"
        : "border-[rgba(88,183,131,0.12)] bg-white/74 text-[#4f6a58]"
      : tone === "maybe"
        ? active
          ? "border-[rgba(141,106,232,0.22)] bg-[rgba(246,241,255,0.96)] text-[#7b58d3]"
          : "border-[rgba(141,106,232,0.12)] bg-white/74 text-[#5f6d76]"
        : active
          ? "border-[rgba(217,106,167,0.22)] bg-[rgba(255,240,247,0.96)] text-[#c45d96]"
          : "border-[rgba(217,106,167,0.12)] bg-white/74 text-[#5f6d76]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-[18px] border px-4 py-3 text-sm font-semibold transition duration-200",
        toneClasses,
      )}
    >
      {label}
    </button>
  );
}

function EventTypeBadge({
  label,
  locked,
}: {
  label: string;
  locked: boolean;
}) {
  return (
    <span
      className={cx(
        "inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        locked
          ? "border-[rgba(88,183,131,0.18)] bg-[rgba(238,251,242,0.92)] text-[#3f8c5f]"
          : "border-[rgba(141,106,232,0.16)] bg-[rgba(246,241,255,0.92)] text-[#8d6ae8]",
      )}
    >
      {locked ? `${label} / sabit` : label}
    </span>
  );
}

function ResultCard({
  title,
  subtitle,
  tone,
}: {
  title: string;
  subtitle: string;
  tone: "best" | "locked";
}) {
  return (
    <div
      className={cx(
        "rounded-[26px] border p-5",
        tone === "best"
          ? "border-[rgba(141,106,232,0.14)] bg-[linear-gradient(145deg,rgba(255,241,248,0.96),rgba(246,241,255,0.92),rgba(242,251,245,0.9))]"
          : "border-[rgba(88,183,131,0.16)] bg-[linear-gradient(145deg,rgba(238,251,242,0.96),rgba(246,255,249,0.94))]",
      )}
    >
      <strong className="block text-xl text-[#182127]">{title}</strong>
      <p className="mt-2 text-sm leading-6 text-[#5f6d76]">{subtitle}</p>
    </div>
  );
}

function ParticipantGroup({
  title,
  responses,
  tone,
}: {
  title: string;
  responses: TrainingPlanResponse[];
  tone: TrainingPlanResponseStatus;
}) {
  const borderTone =
    tone === "yes"
      ? "border-[rgba(88,183,131,0.16)]"
      : tone === "maybe"
        ? "border-[rgba(141,106,232,0.16)]"
        : "border-[rgba(217,106,167,0.16)]";

  if (!responses.length) {
    return null;
  }

  return (
    <div className={cx("rounded-[22px] border bg-white/68 p-4", borderTone)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <strong className="text-sm text-[#182127]">{title}</strong>
        <span className="text-xs font-medium text-[#6d7a83]">
          {responses.length} kisi
        </span>
      </div>
      <div className="grid gap-3">
        {responses.map((response) => (
          <div
            key={response.id}
            className="rounded-[18px] border border-[rgba(141,106,232,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(246,241,255,0.55))] px-4 py-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <strong className="block text-sm text-[#182127]">
                  {response.memberDisplayName}
                </strong>
                <span className="text-xs text-[#6d7a83]">
                  {response.memberUsername
                    ? `@${response.memberUsername}`
                    : "Uye"}
                </span>
              </div>
              <span className="text-xs font-medium text-[#6d7a83]">
                {formatDateTime(response.updatedAt)}
              </span>
            </div>

            {countTrainingPlanSelectedSlots(response.selectedSlots) > 0 && (
              <p className="mt-2 text-xs leading-5 text-[#5f6d76]">
                {formatTrainingPlanSlotMap(response.selectedSlots)}
              </p>
            )}

            {response.note ? (
              <p className="mt-2 text-xs leading-5 text-[#5f6d76]">
                {response.note}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SlotVoterPill({
  label,
  username,
  status,
}: {
  label: string;
  username: string | null;
  status: TrainingPlanResponseStatus;
}) {
  const toneClass =
    status === "yes"
      ? "border-[rgba(88,183,131,0.18)] bg-[rgba(238,251,242,0.96)] text-[#2f8f5c]"
      : "border-[rgba(141,106,232,0.18)] bg-[rgba(246,241,255,0.96)] text-[#7b58d3]";

  return (
    <div
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2",
        toneClass,
      )}
    >
      <strong className="text-sm">{label}</strong>
      <span className="text-xs opacity-80">
        {username ? `@${username}` : getTrainingPlanStatusLabel(status)}
      </span>
      <span className="text-xs font-semibold">{getTrainingPlanStatusLabel(status)}</span>
    </div>
  );
}

function TrainingSchoolCard({ link }: { link: TrainingSchoolLink }) {
  return (
    <SoftCard className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <strong className="block text-lg text-[#182127]">{link.name}</strong>
          {link.price ? (
            <span className="inline-flex rounded-full border border-[rgba(141,106,232,0.12)] bg-[rgba(246,241,255,0.9)] px-3 py-1 text-xs font-semibold text-[#8d6ae8]">
              {link.price}
            </span>
          ) : null}
        </div>
      </div>

      {link.address ? (
        <p className="text-sm leading-6 text-[#5f6d76]">{link.address}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {link.websiteUrl ? (
          <a
            href={link.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-full border border-[rgba(141,106,232,0.16)] bg-[linear-gradient(135deg,#d96aa7,#8d6ae8)] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(141,106,232,0.24)] transition hover:brightness-105"
          >
            Siteye git
          </a>
        ) : null}

        {link.address ? (
          <GhostButton
            type="button"
            onClick={() => openTrainingSchoolAddress(link.address)}
          >
            Haritada ac
          </GhostButton>
        ) : null}
      </div>
    </SoftCard>
  );
}

function TrainingSchoolEditorCard({
  index,
  link,
  onChange,
  onRemove,
}: {
  index: number;
  link: TrainingSchoolLink;
  onChange: (
    field: keyof Omit<TrainingSchoolLink, "id">,
    value: string,
  ) => void;
  onRemove: () => void;
}) {
  return (
    <SoftCard className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <strong className="text-sm text-[#182127]">Okul {index + 1}</strong>
        <GhostButton type="button" onClick={onRemove}>
          Kaldir
        </GhostButton>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FieldBlock label="Okul adi">
          <TextInput
            value={link.name}
            onChange={(event) => onChange("name", event.target.value)}
            placeholder="Ornek: Akademi Arena"
          />
        </FieldBlock>

        <FieldBlock label="Fiyat">
          <TextInput
            value={link.price}
            onChange={(event) => onChange("price", event.target.value)}
            placeholder="Ornek: 250 TL"
          />
        </FieldBlock>
      </div>

      <FieldBlock label="Site linki">
        <TextInput
          value={link.websiteUrl}
          onChange={(event) => onChange("websiteUrl", event.target.value)}
          placeholder="Ornek: https://..."
        />
      </FieldBlock>

      <FieldBlock label="Adres">
        <TextArea
          rows={3}
          value={link.address}
          onChange={(event) => onChange("address", event.target.value)}
          placeholder="Haritada acilacak adresi yazabiliriz."
        />
      </FieldBlock>
    </SoftCard>
  );
}

function WhatsappShareButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition duration-200",
        disabled
          ? "cursor-not-allowed border-[rgba(37,211,102,0.12)] bg-[rgba(37,211,102,0.08)] text-[#77a88b]"
          : "border-[rgba(37,211,102,0.22)] bg-[linear-gradient(135deg,#25D366,#1faa59)] text-white shadow-[0_16px_28px_rgba(37,211,102,0.22)] hover:brightness-105",
      )}
    >
      WhatsApp'a gonder
    </button>
  );
}

function buildTrainingPlanShareUrl(eventId: string) {
  const shareVersion = `${eventId.slice(0, 8)}-${Date.now()}`;
  return `https://erenceyhan.github.io/?share=${encodeURIComponent(shareVersion)}`;
}

function buildTrainingPlanWhatsappMessage(input: {
  event: TrainingPlanEvent;
  nonVoters: Member[];
  detailUrl: string;
}) {
  const { event, nonVoters, detailUrl } = input;
  const buffer = new StringBuffer();

  buffer.writeln(`[${event.title}]`);
  buffer.writeln();
  buffer.writeln("Hatirlatma: Henuz oy vermediniz!");
  buffer.writeln("Musait oldugun gun ve saatleri secmeyi unutma.");

  if (nonVoters.length) {
    buffer.writeln();
    buffer.writeln("Bekledigimiz arkadaslar:");
    buffer.writeln(nonVoters.map((member) => `- ${member.name}`).join("\n"));
  }

  buffer.writeln();
  buffer.writeln("Oy vermek icin:");
  buffer.write(detailUrl);

  return buffer.toString();
}

function openWhatsAppShare(message: string) {
  if (typeof window === "undefined" || !message.trim()) {
    return;
  }

  const whatsappUrl = new URL("https://wa.me/");
  whatsappUrl.searchParams.set("text", message);
  window.open(whatsappUrl.toString(), "_blank", "noopener,noreferrer");
}

function createEmptyTrainingSchoolLink(): TrainingSchoolLink {
  const fallbackId = `school-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : fallbackId,
    name: "",
    price: "",
    websiteUrl: "",
    address: "",
  };
}

function openTrainingSchoolAddress(address: string) {
  if (typeof window === "undefined") {
    return;
  }

  const trimmedAddress = address.trim();

  if (!trimmedAddress) {
    return;
  }

  const encodedAddress = encodeURIComponent(trimmedAddress);
  const userAgent =
    typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);

  if (isIOS) {
    window.location.href = `http://maps.apple.com/?q=${encodedAddress}`;
    return;
  }

  if (isAndroid) {
    window.location.href = `geo:0,0?q=${encodedAddress}`;
    return;
  }

  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
    "_blank",
    "noopener,noreferrer",
  );
}

class StringBuffer {
  private parts: string[] = [];

  writeln(value = "") {
    this.parts.push(`${value}\n`);
  }

  write(value = "") {
    this.parts.push(value);
  }

  toString() {
    return this.parts.join("");
  }
}
