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
    Array.isArray(candidate.comments)
  );
}

export function loadAppData() {
  const storedValue = window.localStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return getInitialAppData();
  }

  try {
    const parsed = JSON.parse(storedValue) as unknown;
    return isAppData(parsed) ? parsed : getInitialAppData();
  } catch {
    return getInitialAppData();
  }
}

export function saveAppData(appData: AppData) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

export function loadSessionMemberId() {
  return window.localStorage.getItem(SESSION_KEY);
}

export function saveSessionMemberId(memberId: string) {
  window.localStorage.setItem(SESSION_KEY, memberId);
}

export function clearSessionMemberId() {
  window.localStorage.removeItem(SESSION_KEY);
}
