import type {
  BaseStartOrder,
  CourtPoint,
  PlayerNames,
  RoleMeta,
  RotationConfigPayload,
  RotationFrame,
  RotationFrameOverride,
  RotationSlotKey,
  RotationZoneKey,
  StartZoneMap,
  ZonePositions,
} from "./types";

export const BASE_ZONES: ZonePositions = {
  "1": { x: 80, y: 74 },
  "2": { x: 80, y: 58 },
  "3": { x: 50, y: 58 },
  "4": { x: 20, y: 58 },
  "5": { x: 20, y: 74 },
  "6": { x: 50, y: 74 },
};

export const DEFAULT_BASE_START_ORDER: BaseStartOrder = {
  "1": "setter",
  "2": "opposite",
  "3": "middle1",
  "4": "outside1",
  "5": "outside2",
  "6": "middle2",
};

function clonePoint(point: CourtPoint): CourtPoint {
  return {
    x: point.x,
    y: point.y,
  };
}

function clonePositions(
  positions: Record<RotationSlotKey, CourtPoint>,
): Record<RotationSlotKey, CourtPoint> {
  return {
    setter: clonePoint(positions.setter),
    opposite: clonePoint(positions.opposite),
    middle1: clonePoint(positions.middle1),
    outside1: clonePoint(positions.outside1),
    outside2: clonePoint(positions.outside2),
    middle2: clonePoint(positions.middle2),
  };
}

export function buildStartPositionsFromZoneMap(
  zoneMap: StartZoneMap,
  zonePositions: ZonePositions,
) {
  return {
    setter: clonePoint(zonePositions[zoneMap.setter]),
    opposite: clonePoint(zonePositions[zoneMap.opposite]),
    middle1: clonePoint(zonePositions[zoneMap.middle1]),
    outside1: clonePoint(zonePositions[zoneMap.outside1]),
    outside2: clonePoint(zonePositions[zoneMap.outside2]),
    middle2: clonePoint(zonePositions[zoneMap.middle2]),
  };
}

const ROTATION_BLUEPRINTS: Array<
  Omit<RotationFrame, "startZoneMap" | "startPositions"> & {
    gamePositions: Record<RotationSlotKey, CourtPoint>;
    gameReceivePositions: Record<RotationSlotKey, CourtPoint>;
    receivePositions: Record<RotationSlotKey, CourtPoint>;
  }
> = [
  {
    id: 1,
    label: "Rotasyon 1",
    note: "Setter arka sagdan hedef bolgesine akar, libero MB2 yerine derin hatta yerlesir.",
    liberoFor: "middle2",
    gamePositions: {
      setter: { x: 72, y: 67 },
      opposite: { x: 83, y: 61 },
      middle1: { x: 50, y: 61 },
      outside1: { x: 18, y: 61 },
      outside2: { x: 27, y: 80 },
      middle2: { x: 58, y: 82 },
    },
    gameReceivePositions: {
      setter: { x: 72, y: 67 },
      opposite: { x: 83, y: 61 },
      middle1: { x: 50, y: 61 },
      outside1: { x: 18, y: 61 },
      outside2: { x: 27, y: 80 },
      middle2: { x: 58, y: 82 },
    },
    receivePositions: {
      setter: { x: 71, y: 68 },
      opposite: { x: 83, y: 61 },
      middle1: { x: 51, y: 60 },
      outside1: { x: 18, y: 62 },
      outside2: { x: 31, y: 79 },
      middle2: { x: 69, y: 84 },
    },
  },
  {
    id: 2,
    label: "Rotasyon 2",
    note: "Setter orta arkadan cikar, sol karsilama hatti genisler.",
    liberoFor: "middle2",
    gamePositions: {
      setter: { x: 72, y: 67 },
      opposite: { x: 82, y: 81 },
      middle1: { x: 66, y: 60 },
      outside1: { x: 51, y: 61 },
      outside2: { x: 20, y: 61 },
      middle2: { x: 40, y: 82 },
    },
    gameReceivePositions: {
      setter: { x: 72, y: 67 },
      opposite: { x: 82, y: 81 },
      middle1: { x: 66, y: 60 },
      outside1: { x: 51, y: 61 },
      outside2: { x: 20, y: 61 },
      middle2: { x: 40, y: 82 },
    },
    receivePositions: {
      setter: { x: 72, y: 67 },
      opposite: { x: 84, y: 74 },
      middle1: { x: 66, y: 59 },
      outside1: { x: 49, y: 61 },
      outside2: { x: 18, y: 63 },
      middle2: { x: 33, y: 84 },
    },
  },
  {
    id: 3,
    label: "Rotasyon 3",
    note: "Setter arka soldan cikarken karsilama ucgeni daha dengeli bir gorunum alir.",
    liberoFor: "middle1",
    gamePositions: {
      setter: { x: 72, y: 67 },
      opposite: { x: 49, y: 82 },
      middle1: { x: 81, y: 82 },
      outside1: { x: 82, y: 61 },
      outside2: { x: 18, y: 61 },
      middle2: { x: 36, y: 60 },
    },
    gameReceivePositions: {
      setter: { x: 72, y: 67 },
      opposite: { x: 49, y: 82 },
      middle1: { x: 81, y: 82 },
      outside1: { x: 82, y: 61 },
      outside2: { x: 18, y: 61 },
      middle2: { x: 36, y: 60 },
    },
    receivePositions: {
      setter: { x: 71, y: 67 },
      opposite: { x: 52, y: 82 },
      middle1: { x: 80, y: 84 },
      outside1: { x: 84, y: 61 },
      outside2: { x: 18, y: 61 },
      middle2: { x: 50, y: 60 },
    },
  },
  {
    id: 4,
    label: "Rotasyon 4",
    note: "Setter on hatta baslar ama yine de sag on sete acilan akisa gecilir.",
    liberoFor: "middle1",
    gamePositions: {
      setter: { x: 73, y: 66 },
      opposite: { x: 20, y: 80 },
      middle1: { x: 82, y: 82 },
      outside1: { x: 63, y: 80 },
      outside2: { x: 19, y: 61 },
      middle2: { x: 50, y: 60 },
    },
    gameReceivePositions: {
      setter: { x: 73, y: 66 },
      opposite: { x: 20, y: 80 },
      middle1: { x: 82, y: 82 },
      outside1: { x: 63, y: 80 },
      outside2: { x: 19, y: 61 },
      middle2: { x: 50, y: 60 },
    },
    receivePositions: {
      setter: { x: 73, y: 66 },
      opposite: { x: 26, y: 81 },
      middle1: { x: 80, y: 83 },
      outside1: { x: 60, y: 79 },
      outside2: { x: 17, y: 62 },
      middle2: { x: 50, y: 59 },
    },
  },
  {
    id: 5,
    label: "Rotasyon 5",
    note: "Setter on orta baslangicindan oyun kurucu hedef cebine kayar.",
    liberoFor: "middle1",
    gamePositions: {
      setter: { x: 73, y: 66 },
      opposite: { x: 18, y: 61 },
      middle1: { x: 37, y: 82 },
      outside1: { x: 81, y: 82 },
      outside2: { x: 50, y: 60 },
      middle2: { x: 66, y: 60 },
    },
    gameReceivePositions: {
      setter: { x: 73, y: 66 },
      opposite: { x: 18, y: 61 },
      middle1: { x: 37, y: 82 },
      outside1: { x: 81, y: 82 },
      outside2: { x: 50, y: 60 },
      middle2: { x: 66, y: 60 },
    },
    receivePositions: {
      setter: { x: 73, y: 66 },
      opposite: { x: 18, y: 61 },
      middle1: { x: 34, y: 84 },
      outside1: { x: 82, y: 82 },
      outside2: { x: 49, y: 60 },
      middle2: { x: 66, y: 59 },
    },
  },
  {
    id: 6,
    label: "Rotasyon 6",
    note: "Setter sag ondan akar, karsilama uclusu arka hatta oturur ve dongu basa doner.",
    liberoFor: "middle2",
    gamePositions: {
      setter: { x: 72, y: 66 },
      opposite: { x: 50, y: 60 },
      middle1: { x: 18, y: 61 },
      outside1: { x: 28, y: 80 },
      outside2: { x: 49, y: 82 },
      middle2: { x: 80, y: 82 },
    },
    gameReceivePositions: {
      setter: { x: 72, y: 66 },
      opposite: { x: 50, y: 60 },
      middle1: { x: 18, y: 61 },
      outside1: { x: 28, y: 80 },
      outside2: { x: 49, y: 82 },
      middle2: { x: 80, y: 82 },
    },
    receivePositions: {
      setter: { x: 73, y: 66 },
      opposite: { x: 50, y: 59 },
      middle1: { x: 18, y: 61 },
      outside1: { x: 28, y: 80 },
      outside2: { x: 50, y: 83 },
      middle2: { x: 79, y: 83 },
    },
  },
];

export const DEFAULT_PLAYER_NAMES: PlayerNames = {
  setter: "pasör",
  opposite: "pç",
  outside1: "smaçör 1",
  outside2: "smaçör 2",
  middle1: "orta 1",
  middle2: "orta 2",
  libero: "libero",
};

export const ROLE_META: RoleMeta[] = [
  {
    key: "setter",
    label: "Pasör",
    shortLabel: "P",
    accent: "from-[#db2777] via-[#ec4899] to-[#fb7185]",
    glow: "rgba(219,39,119,0.30)",
  },
  {
    key: "opposite",
    label: "Pasör çaprazı",
    shortLabel: "PÇ",
    accent: "from-[#4338ca] via-[#3b82f6] to-[#60a5fa]",
    glow: "rgba(59,130,246,0.28)",
  },
  {
    key: "outside1",
    label: "Smaçör 1",
    shortLabel: "S1",
    accent: "from-[#15803d] via-[#22c55e] to-[#4ade80]",
    glow: "rgba(34,197,94,0.28)",
  },
  {
    key: "outside2",
    label: "Smaçör 2",
    shortLabel: "S2",
    accent: "from-[#ea580c] via-[#f97316] to-[#fb923c]",
    glow: "rgba(249,115,22,0.28)",
  },
  {
    key: "middle1",
    label: "Orta 1",
    shortLabel: "O1",
    accent: "from-[#dc2626] via-[#ef4444] to-[#f87171]",
    glow: "rgba(239,68,68,0.28)",
  },
  {
    key: "middle2",
    label: "Orta 2",
    shortLabel: "O2",
    accent: "from-[#65a30d] via-[#84cc16] to-[#a3e635]",
    glow: "rgba(132,204,22,0.28)",
  },
  {
    key: "libero",
    label: "Libero",
    shortLabel: "L",
    accent: "from-[#0f766e] via-[#14b8a6] to-[#22d3ee]",
    glow: "rgba(20,184,166,0.28)",
  },
];

export function mergeZonePositions(
  input?: Partial<ZonePositions> | null,
): ZonePositions {
  return {
    "1": clonePoint(input?.["1"] ?? BASE_ZONES["1"]),
    "2": clonePoint(input?.["2"] ?? BASE_ZONES["2"]),
    "3": clonePoint(input?.["3"] ?? BASE_ZONES["3"]),
    "4": clonePoint(input?.["4"] ?? BASE_ZONES["4"]),
    "5": clonePoint(input?.["5"] ?? BASE_ZONES["5"]),
    "6": clonePoint(input?.["6"] ?? BASE_ZONES["6"]),
  };
}

export function mergeBaseStartOrder(
  input?: Partial<BaseStartOrder> | null,
): BaseStartOrder {
  return {
    "1": input?.["1"] ?? DEFAULT_BASE_START_ORDER["1"],
    "2": input?.["2"] ?? DEFAULT_BASE_START_ORDER["2"],
    "3": input?.["3"] ?? DEFAULT_BASE_START_ORDER["3"],
    "4": input?.["4"] ?? DEFAULT_BASE_START_ORDER["4"],
    "5": input?.["5"] ?? DEFAULT_BASE_START_ORDER["5"],
    "6": input?.["6"] ?? DEFAULT_BASE_START_ORDER["6"],
  };
}

function rotateBaseStartOrder(
  baseStartOrder: BaseStartOrder,
  offset: number,
): BaseStartOrder {
  const zoneKeys: RotationZoneKey[] = ["1", "2", "3", "4", "5", "6"];

  return zoneKeys.reduce<BaseStartOrder>((acc, zoneKey, index) => {
    acc[zoneKey] = baseStartOrder[zoneKeys[(index + offset) % zoneKeys.length]];
    return acc;
  }, mergeBaseStartOrder());
}

function buildStartZoneMapFromBaseOrder(
  baseStartOrder: BaseStartOrder,
  offset: number,
): StartZoneMap {
  const rotatedOrder = rotateBaseStartOrder(baseStartOrder, offset);

  return (Object.entries(rotatedOrder) as Array<[RotationZoneKey, RotationSlotKey]>).reduce<StartZoneMap>(
    (acc, [zoneKey, roleKey]) => {
      acc[roleKey] = zoneKey;
      return acc;
    },
    {
      setter: "1",
      opposite: "2",
      middle1: "3",
      outside1: "4",
      outside2: "5",
      middle2: "6",
    } satisfies StartZoneMap,
  );
}

export function buildRotationFrames(
  zonePositions: ZonePositions,
  baseStartOrder: BaseStartOrder,
): RotationFrame[] {
  return ROTATION_BLUEPRINTS.map((frame, index) => {
    const startZoneMap = buildStartZoneMapFromBaseOrder(baseStartOrder, index);

    return {
      ...frame,
      startZoneMap,
      startPositions: buildStartPositionsFromZoneMap(startZoneMap, zonePositions),
      gamePositions: clonePositions(frame.gamePositions),
      gameReceivePositions: clonePositions(frame.gameReceivePositions),
      receivePositions: clonePositions(frame.receivePositions),
    };
  });
}

export const DEFAULT_ROTATION_FRAMES = buildRotationFrames(
  BASE_ZONES,
  DEFAULT_BASE_START_ORDER,
);

export function buildRotationOverrides(
  frames: RotationFrame[],
): RotationFrameOverride[] {
  return frames.map((frame) => ({
    id: frame.id,
    gamePositions: clonePositions(frame.gamePositions),
    gameReceivePositions: clonePositions(frame.gameReceivePositions),
    receivePositions: clonePositions(frame.receivePositions),
  }));
}

export function applyRotationConfig(
  zonePositions: ZonePositions,
  baseStartOrder: BaseStartOrder,
  config: RotationConfigPayload | null,
): RotationFrame[] {
  const frames = buildRotationFrames(zonePositions, baseStartOrder);

  if (!config) {
    return frames;
  }

  return frames.map((frame) => {
    const override = config.frames.find((item) => item.id === frame.id);

    if (!override) {
      return frame;
    }

    return {
      ...frame,
      gamePositions: clonePositions(override.gamePositions),
      gameReceivePositions: clonePositions(
        override.gameReceivePositions ?? override.gamePositions,
      ),
      receivePositions: clonePositions(override.receivePositions),
    };
  });
}
