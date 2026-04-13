import { SESSION_KEY, STORAGE_KEY } from "./seed";
import type { AppData } from "./types";
import { getInitialAppData } from "./utils";

export function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    Array.isArray(candidate.members) &&
    Array.isArray(candidate.suggestions) &&
    Array.isArray(candidate.votes) &&
    Array.isArray(candidate.comments) &&
    (!("assets" in candidate) || Array.isArray(candidate.assets))
  );
}

function normalizeAppData(appData: AppData | (AppData & { assets?: AppData["assets"] })) {
  return {
    ...appData,
    assets: appData.assets ?? [],
  } as AppData;
}

export function loadAppData() {
  if (typeof window === "undefined") {
    return getInitialAppData();
  }

  const storedValue = window.localStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return getInitialAppData();
  }

  try {
    const parsed = JSON.parse(storedValue) as unknown;
    return isAppData(parsed) ? normalizeAppData(parsed) : getInitialAppData();
  } catch {
    return getInitialAppData();
  }
}

export function saveAppData(appData: AppData) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeAppData(appData)));
}

export function loadSessionMemberId() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(SESSION_KEY);
}

export function saveSessionMemberId(memberId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SESSION_KEY, memberId);
}

export function clearSessionMemberId() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
}
