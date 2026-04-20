export const TRAINING_PLAN_DAYS = [
  "Pazartesi",
  "Sali",
  "Carsamba",
  "Persembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
] as const;

export const TRAINING_PLAN_HOURS = [
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
] as const;

export type TrainingPlanEventType = "training" | "match";
export type TrainingPlanResponseStatus = "yes" | "maybe" | "no";
export type TrainingPlanMatchSource = "amator" | "voleyboloyna";

export type TrainingSchoolLink = {
  id: string;
  name: string;
  price: string;
  websiteUrl: string;
  address: string;
};

export type TrainingPlanEvent = {
  id: string;
  title: string;
  description: string;
  matchLink: string;
  matchSource: TrainingPlanMatchSource | null;
  eventType: TrainingPlanEventType;
  createdBy: string;
  possibleDays: string[];
  possibleHours: string[];
  isLocked: boolean;
  lockedDay: string | null;
  lockedHour: string | null;
  createdAt: string;
};

export type TrainingPlanResponse = {
  id: string;
  eventId: string;
  memberId: string;
  memberDisplayName: string;
  memberUsername: string | null;
  status: TrainingPlanResponseStatus;
  selectedDays: string[];
  selectedHours: string[];
  note: string;
  updatedAt: string;
};

export type TrainingPlanEventInput = {
  title: string;
  description: string;
  matchLink: string;
  matchSource: TrainingPlanMatchSource;
  eventType: TrainingPlanEventType;
  possibleDays: string[];
  possibleHours: string[];
  isLocked: boolean;
  lockedDay: string | null;
  lockedHour: string | null;
};

export type TrainingPlanSettings = {
  voleyboloynaLink: string;
  amatorMatchProgramLink: string;
  schoolLinks: TrainingSchoolLink[];
  updatedAt: string | null;
  updatedBy: string | null;
};

export type TrainingPlanResponseInput = {
  eventId: string;
  status: TrainingPlanResponseStatus;
  selectedDays: string[];
  selectedHours: string[];
  note: string;
};

export type TrainingPlanSlotScore = {
  day: string;
  hour: string;
  score: number;
  participantCount: number;
};

export type TrainingPlanBestSlot = {
  day: string;
  hour: string;
  score: number;
  participantCount: number;
  allScores: TrainingPlanSlotScore[];
};
