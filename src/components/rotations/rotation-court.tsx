import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { ROLE_META } from "../../rotations/data";
import type {
  CourtPoint,
  GameVariant,
  RoleKey,
  RotationFrame,
  RotationSlotKey,
  ZonePositions,
} from "../../rotations/types";
import { cx } from "../ui";

type VisiblePlayer = {
  slotRole: Exclude<RoleKey, "libero">;
  displayRole: RoleKey;
  name: string;
};

const SOURCE_NET_Y = 23;
const SOURCE_BASELINE_Y = 96;
const NET_Y = 2;
const BASELINE_Y = 95;
const THREE_METER_Y = NET_Y + (BASELINE_Y - NET_Y) / 3;
const COURT_SIDE_INSET = 8;

function toStyle(point: CourtPoint) {
  return {
    left: `${point.x}%`,
    top: `${point.y}%`,
  };
}

function remapCourtPoint(point: CourtPoint): CourtPoint {
  const relativeY = (point.y - SOURCE_NET_Y) / (SOURCE_BASELINE_Y - SOURCE_NET_Y);

  return {
    x: point.x,
    y: NET_Y + relativeY * (BASELINE_Y - NET_Y),
  };
}

function inverseRemapCourtPoint(point: CourtPoint): CourtPoint {
  const relativeY = (point.y - NET_Y) / (BASELINE_Y - NET_Y);

  return {
    x: point.x,
    y: SOURCE_NET_Y + relativeY * (SOURCE_BASELINE_Y - SOURCE_NET_Y),
  };
}

function clampCourtPoint(point: CourtPoint): CourtPoint {
  const clamp = (value: number) => Math.max(0, Math.min(100, value));
  const round = (value: number) => Math.round(value * 10) / 10;

  return {
    x: round(clamp(point.x)),
    y: round(clamp(point.y)),
  };
}

export function RotationCourt({
  rotation,
  mode,
  gameVariant = "serve",
  motionStage,
  visiblePlayers,
  zonePositions,
  className,
  developmentMode = false,
  onCourtClick,
  onModePointDrag,
  onModePointFocus,
}: {
  rotation: RotationFrame;
  mode: "game" | "receive";
  gameVariant?: GameVariant;
  motionStage: "start" | "target";
  visiblePlayers: VisiblePlayer[];
  zonePositions: ZonePositions;
  className?: string;
  developmentMode?: boolean;
  onCourtClick?: (point: CourtPoint) => void;
  onModePointDrag?: (roleKey: RotationSlotKey, point: CourtPoint) => void;
  onModePointFocus?: (roleKey: RotationSlotKey) => void;
}) {
  const courtRef = useRef<HTMLDivElement | null>(null);
  const [draggingRoleKey, setDraggingRoleKey] = useState<RotationSlotKey | null>(null);
  const courtZones = [
    { label: "4", point: zonePositions["4"] },
    { label: "3", point: zonePositions["3"] },
    { label: "2", point: zonePositions["2"] },
    { label: "5", point: zonePositions["5"] },
    { label: "6", point: zonePositions["6"] },
    { label: "1", point: zonePositions["1"] },
  ];

  function getTargetPoint(slotRole: RotationSlotKey) {
    if (mode === "receive") {
      return rotation.receivePositions[slotRole];
    }

    if (rotation.startZoneMap.setter === "1" && gameVariant === "serveReceive") {
      return rotation.gameReceivePositions[slotRole];
    }

    return rotation.gamePositions[slotRole];
  }

  function handleCourtClick(event: MouseEvent<HTMLDivElement>) {
    if (!onCourtClick) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const displayPoint = clampCourtPoint({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });

    onCourtClick(clampCourtPoint(inverseRemapCourtPoint(displayPoint)));
  }

  function extractRawPointFromPointerEvent(
    event: PointerEvent<HTMLButtonElement>,
  ): CourtPoint | null {
    const rect = courtRef.current?.getBoundingClientRect();

    if (!rect) {
      return null;
    }

    const displayPoint = clampCourtPoint({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });

    return clampCourtPoint(inverseRemapCourtPoint(displayPoint));
  }

  function handleModeHandlePointerDown(
    roleKey: RotationSlotKey,
    event: PointerEvent<HTMLButtonElement>,
  ) {
    if (!developmentMode || !onModePointDrag) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingRoleKey(roleKey);
    onModePointFocus?.(roleKey);

    const nextPoint = extractRawPointFromPointerEvent(event);

    if (nextPoint) {
      onModePointDrag(roleKey, nextPoint);
    }
  }

  function handleModeHandlePointerMove(
    roleKey: RotationSlotKey,
    event: PointerEvent<HTMLButtonElement>,
  ) {
    if (!developmentMode || !onModePointDrag || draggingRoleKey !== roleKey) {
      return;
    }

    event.preventDefault();
    const nextPoint = extractRawPointFromPointerEvent(event);

    if (nextPoint) {
      onModePointDrag(roleKey, nextPoint);
    }
  }

  function handleModeHandlePointerUp(
    roleKey: RotationSlotKey,
    event: PointerEvent<HTMLButtonElement>,
  ) {
    if (draggingRoleKey !== roleKey) {
      return;
    }

    event.preventDefault();
    setDraggingRoleKey(null);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      ref={courtRef}
      className={cx(
        "relative mx-auto aspect-[5/5] w-full max-w-5xl overflow-hidden rounded-[24px] border border-white/65 bg-[radial-gradient(circle_at_top,rgba(217,106,167,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(87,199,133,0.14),transparent_28%),linear-gradient(180deg,#11222b_0%,#12303b_52%,#0f2730_100%)] shadow-[0_30px_70px_rgba(12,28,36,0.28)] sm:aspect-[5/4] sm:rounded-[30px]",
        className,
      )}
      onClick={handleCourtClick}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_32%,rgba(255,255,255,0.015)_78%,transparent)]" />
      <div
        className="absolute border border-[rgba(255,255,255,0.18)]"
        style={{
          left: `${COURT_SIDE_INSET}%`,
          right: `${COURT_SIDE_INSET}%`,
          top: `${NET_Y}%`,
          bottom: `${100 - BASELINE_Y}%`,
        }}
      />
      <div
        className="absolute inset-x-0 h-[2px] bg-[rgba(255,255,255,0.34)]"
        style={{ top: `${NET_Y}%` }}
      />
      <div
        className="absolute h-[2px] bg-[rgba(255,255,255,0.18)]"
        style={{
          left: `${COURT_SIDE_INSET}%`,
          right: `${COURT_SIDE_INSET}%`,
          top: `${THREE_METER_Y}%`,
        }}
      />

      <div
        className="absolute inset-x-[2.5%] flex -translate-y-1/2 items-center justify-between"
        style={{ top: `${NET_Y}%` }}
      >
        {Array.from({ length: 9 }).map((_, index) => (
          <span
            key={index}
            className="h-3 w-[2px] rounded-full bg-[rgba(255,255,255,0.45)]"
          />
        ))}
      </div>

      {courtZones.map((zone) => (
        <div
          key={zone.label}
          className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(8,23,29,0.42)] text-xs font-semibold text-[rgba(255,255,255,0.5)] sm:h-10 sm:w-10 sm:text-sm"
          style={{
            left: `${zone.point.x}%`,
            top: `${remapCourtPoint(zone.point).y}%`,
          }}
        >
          {zone.label}
        </div>
      ))}

      <div className="absolute bottom-3 left-3 rounded-full bg-[rgba(8,23,29,0.62)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(255,255,255,0.78)] sm:bottom-4 sm:left-4 sm:px-3 sm:text-xs">
        Bizim saha
      </div>

      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        {visiblePlayers.map((player) => {
          const start = remapCourtPoint(rotation.startPositions[player.slotRole]);
          const end = remapCourtPoint(getTargetPoint(player.slotRole));

          return (
            <line
              key={`${player.slotRole}-path`}
              x1={`${start.x}%`}
              y1={`${start.y}%`}
              x2={`${end.x}%`}
              y2={`${end.y}%`}
              stroke="rgba(255,255,255,0.24)"
              strokeDasharray="6 8"
              strokeWidth="2"
              opacity={motionStage === "target" ? 0.95 : 0.4}
            />
          );
        })}
      </svg>

      {developmentMode
        ? visiblePlayers.map((player) => {
            const roleMeta = ROLE_META.find((item) => item.key === player.displayRole)!;
            const targetPoint = remapCourtPoint(getTargetPoint(player.slotRole));

            return (
              <button
                key={`${rotation.id}-${mode}-${player.slotRole}-drag-handle`}
                type="button"
                className={cx(
                  "absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/65 bg-[rgba(11,29,36,0.92)] text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_28px_rgba(8,23,29,0.32)] transition hover:scale-105 sm:h-11 sm:w-11 sm:text-[11px]",
                  draggingRoleKey === player.slotRole
                    ? "cursor-grabbing ring-4 ring-[rgba(217,106,167,0.22)]"
                    : "cursor-grab",
                )}
                style={{
                  ...toStyle(targetPoint),
                  touchAction: "none",
                  boxShadow: `0 14px 30px ${roleMeta.glow}`,
                }}
                aria-label={`${roleMeta.label} hedefini surukle`}
                onPointerDown={(event) =>
                  handleModeHandlePointerDown(player.slotRole, event)
                }
                onPointerMove={(event) =>
                  handleModeHandlePointerMove(player.slotRole, event)
                }
                onPointerUp={(event) =>
                  handleModeHandlePointerUp(player.slotRole, event)
                }
                onPointerCancel={(event) =>
                  handleModeHandlePointerUp(player.slotRole, event)
                }
              >
                {roleMeta.shortLabel}
              </button>
            );
          })
        : null}

      {visiblePlayers.map((player) => {
        const roleMeta = ROLE_META.find((item) => item.key === player.displayRole)!;
        const activePoint = remapCourtPoint(
          motionStage === "start"
            ? rotation.startPositions[player.slotRole]
            : getTargetPoint(player.slotRole),
        );

        return (
          <div
            key={`${rotation.id}-${player.slotRole}-${player.displayRole}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-[950ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={toStyle(activePoint)}
          >
            <div className="mb-2 flex justify-center">
              <span className="rounded-full bg-[rgba(9,26,33,0.7)] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[rgba(255,255,255,0.82)] shadow-[0_10px_20px_rgba(9,26,33,0.18)] sm:px-2.5 sm:text-[11px] sm:tracking-[0.14em]">
                {player.name}
              </span>
            </div>

            <div
              className={cx(
                "flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-gradient-to-br text-center shadow-[0_18px_35px_rgba(10,24,30,0.32)] sm:h-20 sm:w-20",
                roleMeta.accent,
              )}
              style={{ boxShadow: `0 18px 40px ${roleMeta.glow}` }}
            >
              <span className="px-1 text-[9px] font-black uppercase tracking-[0.08em] text-white sm:px-2 sm:text-xs sm:tracking-[0.12em]">
                {roleMeta.shortLabel}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
