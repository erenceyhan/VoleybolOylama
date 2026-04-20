import type {
  TrainingPlanBestSlot,
  TrainingPlanEventType,
  TrainingPlanMatchSource,
  TrainingPlanResponse,
  TrainingPlanResponseStatus,
  TrainingPlanSlotScore,
} from "./types";
import { TRAINING_PLAN_DAYS, TRAINING_PLAN_HOURS } from "./types";

const DAY_TO_WEEKDAY: Record<string, number> = {
  Pazartesi: 1,
  Sali: 2,
  Carsamba: 3,
  Persembe: 4,
  Cuma: 5,
  Cumartesi: 6,
  Pazar: 7,
};

function getTrainingPlanDayIndex(day: string) {
  const index = TRAINING_PLAN_DAYS.indexOf(
    day as (typeof TRAINING_PLAN_DAYS)[number],
  );

  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function getTrainingPlanHourIndex(hour: string) {
  const index = TRAINING_PLAN_HOURS.indexOf(
    hour as (typeof TRAINING_PLAN_HOURS)[number],
  );

  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function compareTrainingPlanDays(left: string, right: string) {
  return getTrainingPlanDayIndex(left) - getTrainingPlanDayIndex(right);
}

export function compareTrainingPlanHours(left: string, right: string) {
  return getTrainingPlanHourIndex(left) - getTrainingPlanHourIndex(right);
}

export function sortTrainingPlanDays(days: string[]) {
  return [...days].sort(compareTrainingPlanDays);
}

export function sortTrainingPlanHours(hours: string[]) {
  return [...hours].sort(compareTrainingPlanHours);
}

export function getTrainingPlanEventTypeLabel(eventType: TrainingPlanEventType) {
  return eventType === "match" ? "Mac" : "Antrenman";
}

export function getTrainingPlanMatchSourceLabel(
  matchSource: TrainingPlanMatchSource,
) {
  return matchSource === "voleyboloyna" ? "VoleybolOyna" : "Amator";
}

export function buildTrainingPlanEventTitle(
  eventType: TrainingPlanEventType,
) {
  return eventType === "match" ? "Mac gunu" : "Antrenman gunu";
}

export function normalizeTrainingPlanLink(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
}

export function getTrainingPlanStatusLabel(
  status: TrainingPlanResponseStatus,
) {
  if (status === "yes") {
    return "Geliyorum";
  }

  if (status === "maybe") {
    return "Belki";
  }

  return "Gelemiyorum";
}

export function getTrainingPlanStatusWeight(
  status: TrainingPlanResponseStatus,
) {
  if (status === "yes") {
    return 1;
  }

  if (status === "maybe") {
    return 0.5;
  }

  return 0;
}

export function countTrainingPlanResponses(
  responses: TrainingPlanResponse[],
  status: TrainingPlanResponseStatus,
) {
  return responses.filter((response) => response.status === status).length;
}

export function computeTrainingPlanBestSlot(input: {
  responses: TrainingPlanResponse[];
  possibleDays: string[];
  possibleHours: string[];
}): TrainingPlanBestSlot | null {
  const { responses } = input;
  const possibleDays = sortTrainingPlanDays(input.possibleDays);
  const possibleHours = sortTrainingPlanHours(input.possibleHours);

  if (possibleDays.length === 0 || possibleHours.length === 0) {
    return null;
  }

  const allScores: TrainingPlanSlotScore[] = [];
  let bestScore: TrainingPlanSlotScore | null = null;

  for (const day of possibleDays) {
    for (const hour of possibleHours) {
      let score = 0;
      let participantCount = 0;

      for (const response of responses) {
        const daySelected = response.selectedDays.includes(day);
        const hourSelected = response.selectedHours.includes(hour);

        if (!daySelected || !hourSelected) {
          continue;
        }

        const weight = getTrainingPlanStatusWeight(response.status);
        score += weight;

        if (weight > 0) {
          participantCount += 1;
        }
      }

      const slotScore = {
        day,
        hour,
        score,
        participantCount,
      } satisfies TrainingPlanSlotScore;

      allScores.push(slotScore);

      if (
        !bestScore ||
        slotScore.score > bestScore.score ||
        (slotScore.score === bestScore.score &&
          slotScore.participantCount > bestScore.participantCount) ||
        (slotScore.score === bestScore.score &&
          slotScore.participantCount === bestScore.participantCount &&
          (compareTrainingPlanDays(slotScore.day, bestScore.day) < 0 ||
            (slotScore.day === bestScore.day &&
              compareTrainingPlanHours(slotScore.hour, bestScore.hour) < 0)))
      ) {
        bestScore = slotScore;
      }
    }
  }

  if (!bestScore) {
    return null;
  }

  return {
    day: bestScore.day,
    hour: bestScore.hour,
    score: bestScore.score,
    participantCount: bestScore.participantCount,
    allScores: [...allScores].sort((left, right) => {
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
    }),
  };
}

export function formatTrainingPlanHourRange(hour: string) {
  const [rawHour, rawMinute = "00"] = hour.split(":");
  const parsedHour = Number(rawHour);

  if (!Number.isFinite(parsedHour)) {
    return hour;
  }

  const startHour =
    parsedHour === 0 || parsedHour >= 24 ? 22 : Math.max(parsedHour, 0);
  const endHour =
    parsedHour === 0 || parsedHour + 2 >= 24 ? 0 : parsedHour + 2;

  return `${String(startHour).padStart(2, "0")}:${rawMinute} - ${String(endHour).padStart(2, "0")}:${rawMinute}`;
}

export function getTrainingPlanNextDate(day: string, reference = new Date()) {
  const targetWeekday = DAY_TO_WEEKDAY[day];

  if (!targetWeekday) {
    return null;
  }

  const today = new Date(reference);
  today.setHours(0, 0, 0, 0);

  let diff = targetWeekday - today.getDay();

  if (today.getDay() === 0) {
    diff = targetWeekday - 7;
  }

  if (diff < 0) {
    diff += 7;
  }

  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + diff);
  return nextDate;
}

export function formatTrainingPlanDate(day: string) {
  const nextDate = getTrainingPlanNextDate(day);

  if (!nextDate) {
    return day;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(nextDate);
}
