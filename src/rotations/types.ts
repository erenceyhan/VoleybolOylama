export type RoleKey =
  | "setter"
  | "opposite"
  | "outside1"
  | "outside2"
  | "middle1"
  | "middle2"
  | "libero";

export type CourtPoint = {
  x: number;
  y: number;
};

export type RotationSlotKey = Exclude<RoleKey, "libero">;

export type RotationMode = "game" | "receive";

export type GameVariant = "serve" | "serveReceive";

export type RotationZoneKey = "1" | "2" | "3" | "4" | "5" | "6";

export type ZonePositions = Record<RotationZoneKey, CourtPoint>;

export type StartZoneMap = Record<RotationSlotKey, RotationZoneKey>;

export type BaseStartOrder = Record<RotationZoneKey, RotationSlotKey>;

export type RotationFrame = {
  id: number;
  label: string;
  note: string;
  liberoFor: Exclude<RoleKey, "setter" | "opposite" | "outside1" | "outside2" | "libero">;
  startZoneMap: StartZoneMap;
  startPositions: Record<RotationSlotKey, CourtPoint>;
  gamePositions: Record<RotationSlotKey, CourtPoint>;
  gameReceivePositions: Record<RotationSlotKey, CourtPoint>;
  receivePositions: Record<RotationSlotKey, CourtPoint>;
};

export type PlayerNames = Record<RoleKey, string>;

export type RoleMeta = {
  key: RoleKey;
  label: string;
  shortLabel: string;
  accent: string;
  glow: string;
};

export type RotationFrameOverride = {
  id: number;
  gamePositions: Record<RotationSlotKey, CourtPoint>;
  gameReceivePositions: Record<RotationSlotKey, CourtPoint>;
  receivePositions: Record<RotationSlotKey, CourtPoint>;
};

export type RotationConfigPayload = {
  zonePositions: ZonePositions;
  baseStartOrder: BaseStartOrder;
  frames: RotationFrameOverride[];
  updatedAt?: string;
  updatedBy?: string | null;
};
