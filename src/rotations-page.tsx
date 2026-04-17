"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthErrorMessage, isSessionTimeoutError } from "./auth";
import { PlayerEditor } from "./components/rotations/player-editor";
import {
  RotationDevPanel,
  type RotationDevTarget,
} from "./components/rotations/rotation-dev-panel";
import { RotationCourt } from "./components/rotations/rotation-court";
import {
  applyRotationConfig,
  BASE_ZONES,
  buildRotationOverrides,
  DEFAULT_BASE_START_ORDER,
  DEFAULT_PLAYER_NAMES,
  DEFAULT_ROTATION_FRAMES,
  mergeBaseStartOrder,
  mergeZonePositions,
  ROLE_META,
} from "./rotations/data";
import type {
  BaseStartOrder,
  CourtPoint,
  GameVariant,
  PlayerNames,
  RoleKey,
  RotationFrame,
  RotationMode,
  RotationSlotKey,
  RotationZoneKey,
  ZonePositions,
} from "./rotations/types";
import {
  fetchRemoteRotationConfig,
  getRemoteSessionMember,
  saveRemoteRotationConfig,
} from "./remote";
import { clearSessionMemberId } from "./storage";
import { hasSupabaseConfig } from "./supabaseClient";
import type { Member } from "./types";
import {
  Panel,
  ToneMessage,
  cx,
} from "./components/ui";

const START_HOLD_MS = 1000;
const TARGET_HOLD_MS = 1400;
const MOBILE_MEDIA_QUERY = "(max-width: 1023px)";
const ROTATION_COURT_LOCK_KEY = "rotationCourtLock";

function sanitizeCoordinate(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const clamped = Math.max(0, Math.min(100, value));
  return Math.round(clamped * 10) / 10;
}

function updatePointAxis(
  point: CourtPoint,
  axis: "x" | "y",
  value: number,
): CourtPoint {
  return {
    ...point,
    [axis]: sanitizeCoordinate(value),
  };
}

function formatTargetLabel(target: RotationDevTarget | null) {
  if (!target) {
    return "Hedef secilmedi";
  }

  if (target.kind === "zone") {
    return `Bolge ${target.key}`;
  }

  return target.key;
}

export function RotationsPageView() {
  const router = useRouter();
  const remoteEnabled = hasSupabaseConfig;
  const [playerNames, setPlayerNames] = useState<PlayerNames>(DEFAULT_PLAYER_NAMES);
  const [hasLibero, setHasLibero] = useState(true);
  const [selectedMode, setSelectedMode] = useState<RotationMode>("game");
  const [selectedGameVariant, setSelectedGameVariant] =
    useState<GameVariant>("serve");
  const [motionStage, setMotionStage] = useState<"start" | "target">("start");
  const [activeRotationIndex, setActiveRotationIndex] = useState(0);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [developmentMode, setDevelopmentMode] = useState(false);
  const [lastCourtPoint, setLastCourtPoint] = useState<CourtPoint | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<RotationDevTarget | null>(
    null,
  );
  const [saveError, setSaveError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [mobileCourtOpen, setMobileCourtOpen] = useState(false);
  const [baseStartOrder, setBaseStartOrder] = useState<BaseStartOrder>(() =>
    mergeBaseStartOrder(DEFAULT_BASE_START_ORDER),
  );
  const [zonePositions, setZonePositions] = useState<ZonePositions>(() =>
    mergeZonePositions(BASE_ZONES),
  );
  const [rotationFrames, setRotationFrames] = useState<RotationFrame[]>(
    DEFAULT_ROTATION_FRAMES,
  );

  const currentRotation = rotationFrames[activeRotationIndex];
  const isAdmin = currentMember?.role === "admin";
  const supportsDualGameMode = currentRotation.startZoneMap.setter === "1";

  function isMobileViewport() {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  }

  function getActiveTargetPositions(frame: RotationFrame) {
    if (selectedMode === "receive") {
      return frame.receivePositions;
    }

    if (supportsDualGameMode && selectedGameVariant === "serveReceive") {
      return frame.gameReceivePositions;
    }

    return frame.gamePositions;
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setMotionStage((current) => (current === "start" ? "target" : "start"));
    }, motionStage === "start" ? START_HOLD_MS : TARGET_HOLD_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    motionStage,
    selectedMode,
    selectedGameVariant,
    activeRotationIndex,
  ]);

  useEffect(() => {
    void hydrateRotationPage();
  }, [remoteEnabled]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const body = document.body;

    if (!isMobileViewport()) {
      body.dataset[ROTATION_COURT_LOCK_KEY] = "0";

      if (body.dataset.panelShellLock !== "1") {
        body.style.overflow = "";
      }

      return;
    }

    body.dataset[ROTATION_COURT_LOCK_KEY] = mobileCourtOpen ? "1" : "0";

    if (mobileCourtOpen) {
      body.style.overflow = "hidden";
    } else if (body.dataset.panelShellLock !== "1") {
      body.style.overflow = "";
    }

    return () => {
      body.dataset[ROTATION_COURT_LOCK_KEY] = "0";

      if (body.dataset.panelShellLock !== "1") {
        body.style.overflow = "";
      }
    };
  }, [mobileCourtOpen]);

  async function handleSessionTimeout(error: unknown) {
    if (!remoteEnabled || !isSessionTimeoutError(error)) {
      return false;
    }

    clearSessionMemberId();
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("auth_timeout_notice", "1");
    }
    router.replace("/?reason=session-timeout");
    return true;
  }

  async function hydrateRotationPage() {
    setIsBooting(true);

    try {
      if (!remoteEnabled) {
        setCurrentMember(null);
        setBaseStartOrder(mergeBaseStartOrder(DEFAULT_BASE_START_ORDER));
        setZonePositions(mergeZonePositions(BASE_ZONES));
        setRotationFrames(DEFAULT_ROTATION_FRAMES);
        return;
      }

      const sessionMember = await getRemoteSessionMember();

      if (!sessionMember) {
        router.replace("/");
        return;
      }

      setCurrentMember(sessionMember);

      const remoteConfig = await fetchRemoteRotationConfig();
      const nextBaseStartOrder = mergeBaseStartOrder(remoteConfig?.baseStartOrder);
      const nextZonePositions = mergeZonePositions(remoteConfig?.zonePositions);
      const nextFrames = applyRotationConfig(
        nextZonePositions,
        nextBaseStartOrder,
        remoteConfig,
      );

      setBaseStartOrder(nextBaseStartOrder);
      setZonePositions(nextZonePositions);
      setRotationFrames(nextFrames);
    } catch (error) {
      if (await handleSessionTimeout(error)) {
        return;
      }

      setSaveError(getAuthErrorMessage(error));
    } finally {
      setIsBooting(false);
    }
  }

  function updatePlayerName(role: RoleKey, value: string) {
    setPlayerNames((current) => ({
      ...current,
      [role]: value,
    }));
  }

  function applyRotationSelection(
    rotationIndex: number,
    mode: RotationMode,
    gameVariant?: GameVariant,
  ) {
    setActiveRotationIndex(rotationIndex);
    setSelectedMode(mode);

    if (gameVariant) {
      setSelectedGameVariant(gameVariant);
    }

    setMotionStage("start");

    if (isMobileViewport()) {
      setMobileCourtOpen(true);
    }
  }

  function updateZonePoint(
    zoneKey: RotationZoneKey,
    axis: "x" | "y",
    value: number,
  ) {
    setSaveError("");
    setSaveNotice("");
      setZonePositions((currentZones) => {
        const nextZones = {
          ...currentZones,
          [zoneKey]: updatePointAxis(currentZones[zoneKey], axis, value),
        };

        setRotationFrames((currentFrames) =>
          applyRotationConfig(nextZones, baseStartOrder, {
            zonePositions: nextZones,
            baseStartOrder,
            frames: buildRotationOverrides(currentFrames),
          }),
        );

      return nextZones;
    });
  }

  function updateModePoint(
    roleKey: RotationSlotKey,
    axis: "x" | "y",
    value: number,
  ) {
    updateModePointCoordinates(roleKey, {
      ...getActiveTargetPositions(currentRotation)[roleKey],
      [axis]: sanitizeCoordinate(value),
    });
  }

  function updateModePointCoordinates(
    roleKey: RotationSlotKey,
    point: CourtPoint,
  ) {
    setSaveError("");
    setSaveNotice("");
    setRotationFrames((currentFrames) =>
      currentFrames.map((frame, index) => {
        if (index !== activeRotationIndex) {
          return frame;
        }

        return {
          ...frame,
          gamePositions:
            selectedMode === "game" && (!supportsDualGameMode || selectedGameVariant === "serve")
              ? {
                  ...frame.gamePositions,
                  [roleKey]: {
                    x: sanitizeCoordinate(point.x),
                    y: sanitizeCoordinate(point.y),
                  },
                }
              : frame.gamePositions,
          gameReceivePositions:
            selectedMode === "game" && supportsDualGameMode && selectedGameVariant === "serveReceive"
              ? {
                  ...frame.gameReceivePositions,
                  [roleKey]: {
                    x: sanitizeCoordinate(point.x),
                    y: sanitizeCoordinate(point.y),
                  },
                }
              : frame.gameReceivePositions,
          receivePositions:
            selectedMode === "receive"
              ? {
                  ...frame.receivePositions,
                  [roleKey]: {
                    x: sanitizeCoordinate(point.x),
                    y: sanitizeCoordinate(point.y),
                  },
                }
              : frame.receivePositions,
        };
      }),
    );
  }

  function updateStartZoneRole(zoneKey: RotationZoneKey, roleKey: RotationSlotKey) {
    setSaveError("");
    setSaveNotice("");
    setBaseStartOrder((currentOrder) => {
      const nextOrder = { ...currentOrder };
      const previousRoleAtZone = nextOrder[zoneKey];
      const previousZoneForRole = (Object.keys(nextOrder) as RotationZoneKey[]).find(
        (key) => nextOrder[key] === roleKey,
      );

      if (!previousZoneForRole) {
        return currentOrder;
      }

      nextOrder[zoneKey] = roleKey;
      nextOrder[previousZoneForRole] = previousRoleAtZone;

      setRotationFrames((currentFrames) =>
        applyRotationConfig(zonePositions, nextOrder, {
          zonePositions,
          baseStartOrder: nextOrder,
          frames: buildRotationOverrides(currentFrames),
        }),
      );

      return nextOrder;
    });
  }

  function applyPointToSelectedTarget(point: CourtPoint) {
    if (!selectedTarget) {
      return;
    }

    if (selectedTarget.kind === "zone") {
      setSaveError("");
      setSaveNotice("");
      setZonePositions((currentZones) => {
        const nextZones = {
          ...currentZones,
          [selectedTarget.key]: {
            x: sanitizeCoordinate(point.x),
            y: sanitizeCoordinate(point.y),
          },
        };

        setRotationFrames((currentFrames) =>
          applyRotationConfig(nextZones, baseStartOrder, {
            zonePositions: nextZones,
            baseStartOrder,
            frames: buildRotationOverrides(currentFrames),
          }),
        );

        return nextZones;
      });
      return;
    }

    setSaveError("");
    setSaveNotice("");
    setRotationFrames((currentFrames) =>
      currentFrames.map((frame, index) => {
        if (index !== activeRotationIndex) {
          return frame;
        }

        return {
          ...frame,
          gamePositions:
            selectedMode === "game" && (!supportsDualGameMode || selectedGameVariant === "serve")
              ? {
                  ...frame.gamePositions,
                  [selectedTarget.key]: {
                    x: sanitizeCoordinate(point.x),
                    y: sanitizeCoordinate(point.y),
                  },
                }
              : frame.gamePositions,
          gameReceivePositions:
            selectedMode === "game" && supportsDualGameMode && selectedGameVariant === "serveReceive"
              ? {
                  ...frame.gameReceivePositions,
                  [selectedTarget.key]: {
                    x: sanitizeCoordinate(point.x),
                    y: sanitizeCoordinate(point.y),
                  },
                }
              : frame.gameReceivePositions,
          receivePositions:
            selectedMode === "receive"
              ? {
                  ...frame.receivePositions,
                  [selectedTarget.key]: {
                    x: sanitizeCoordinate(point.x),
                    y: sanitizeCoordinate(point.y),
                  },
                }
              : frame.receivePositions,
        };
      }),
    );
  }

  function handleCourtClick(point: CourtPoint) {
    setLastCourtPoint(point);

    if (developmentMode) {
      applyPointToSelectedTarget(point);
    }
  }

  function handleApplyLastPoint() {
    if (!lastCourtPoint || !selectedTarget) {
      return;
    }

    applyPointToSelectedTarget(lastCourtPoint);
  }

  function handleResetSelectedTarget() {
    if (!selectedTarget) {
      return;
    }

    setSaveError("");
    setSaveNotice("");

    if (selectedTarget.kind === "zone") {
      updateZonePoint(selectedTarget.key, "x", BASE_ZONES[selectedTarget.key].x);
      updateZonePoint(selectedTarget.key, "y", BASE_ZONES[selectedTarget.key].y);
      return;
    }

    const defaultFrame = DEFAULT_ROTATION_FRAMES[activeRotationIndex];
    const sourcePoint =
      selectedMode === "game"
        ? supportsDualGameMode && selectedGameVariant === "serveReceive"
          ? defaultFrame.gameReceivePositions[selectedTarget.key]
          : defaultFrame.gamePositions[selectedTarget.key]
        : defaultFrame.receivePositions[selectedTarget.key];

    updateModePoint(selectedTarget.key, "x", sourcePoint.x);
    updateModePoint(selectedTarget.key, "y", sourcePoint.y);
  }

  async function handleSaveRotationConfig() {
    if (!remoteEnabled || !isAdmin) {
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSaveNotice("");

    try {
      await saveRemoteRotationConfig({
        zonePositions,
        baseStartOrder,
        frames: buildRotationOverrides(rotationFrames),
      });
      setSaveNotice("Rotasyon duzeni kaydedildi. Bu hali herkes gorecek.");
    } catch (error) {
      if (await handleSessionTimeout(error)) {
        return;
      }

      setSaveError(getAuthErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const visiblePlayers = useMemo(() => {
    return (Object.keys(currentRotation.startPositions) as RotationSlotKey[]).map(
      (slotRole) => {
        const displayRole: RoleKey =
          hasLibero && currentRotation.liberoFor === slotRole ? "libero" : slotRole;

        return {
          slotRole,
          displayRole,
          name: playerNames[displayRole],
        };
      },
    );
  }, [currentRotation, hasLibero, playerNames]);

  if (isBooting) {
    return (
      <Panel>
        <ToneMessage tone="muted">
          Rotasyon duzeni ve gelistirme verileri hazirlaniyor.
        </ToneMessage>
      </Panel>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_380px]">
        <div className="order-1 grid gap-6">
          <div className="hidden lg:block">
            <RotationCourt
              rotation={currentRotation}
              mode={selectedMode}
              gameVariant={selectedGameVariant}
              motionStage={motionStage}
              visiblePlayers={visiblePlayers}
              zonePositions={zonePositions}
              developmentMode={developmentMode}
              onCourtClick={developmentMode ? handleCourtClick : undefined}
              onModePointDrag={
                developmentMode
                  ? (roleKey, point) => updateModePointCoordinates(roleKey, point)
                  : undefined
              }
              onModePointFocus={
                developmentMode
                  ? (roleKey) => setSelectedTarget({ kind: "mode", key: roleKey })
                  : undefined
              }
            />
          </div>

          {isAdmin ? (
            <RotationDevPanel
              isAdmin={Boolean(isAdmin)}
              developmentMode={developmentMode}
              onToggleDevelopmentMode={() =>
                setDevelopmentMode((current) => !current)
              }
              lastCourtPoint={lastCourtPoint}
              selectedTarget={selectedTarget}
              baseStartOrder={baseStartOrder}
              zonePositions={zonePositions}
              currentRotation={currentRotation}
              selectedMode={selectedMode}
              selectedGameVariant={selectedGameVariant}
              onSelectTarget={setSelectedTarget}
            onZonePointChange={updateZonePoint}
            onModePointChange={updateModePoint}
            onStartZoneRoleChange={updateStartZoneRole}
            onApplyLastPoint={handleApplyLastPoint}
            onSave={() => void handleSaveRotationConfig()}
              onReset={handleResetSelectedTarget}
              isSaving={isSaving}
              saveNotice={saveNotice}
              saveError={saveError}
            />
          ) : null}
        </div>

        <div className="order-2 grid gap-6 xl:col-start-2 xl:row-span-2">
          <Panel>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {rotationFrames.map((rotation, index) => {
                const isActive = index === activeRotationIndex;
                const isGameActive = isActive && selectedMode === "game";
                const isReceiveActive = isActive && selectedMode === "receive";
                const supportsVariants = rotation.startZoneMap.setter === "1";
                const isServeActive =
                  isActive && selectedMode === "game" && selectedGameVariant === "serve";
                const isServeReceiveActive =
                  isActive &&
                  selectedMode === "game" &&
                  selectedGameVariant === "serveReceive";

                return (
                  <div
                    key={rotation.id}
                    className={`rounded-[24px] border px-4 py-4 text-left transition ${
                      isActive
                        ? "border-[rgba(141,106,232,0.22)] bg-[linear-gradient(135deg,rgba(255,238,247,0.98),rgba(246,241,255,0.96),rgba(242,251,245,0.92))] shadow-[0_18px_38px_rgba(141,106,232,0.14)]"
                        : "border-[rgba(141,106,232,0.1)] bg-white/70"
                    }`}
                  >
                    <strong className="block text-sm text-[#182127]">
                      {rotation.label}
                    </strong>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                      className={`rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                        isGameActive
                          ? "bg-[linear-gradient(135deg,#d96aa7,#8d6ae8)] text-white shadow-[0_14px_24px_rgba(141,106,232,0.18)]"
                          : "border border-[rgba(141,106,232,0.12)] bg-white/85 text-[#33444d] hover:-translate-y-0.5"
                      }`}
                      onClick={() => {
                        applyRotationSelection(index, "game");
                      }}
                    >
                      Oyun ici
                      </button>
                      <button
                        type="button"
                      className={`rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                        isReceiveActive
                          ? "bg-[linear-gradient(135deg,#57c785,#8d6ae8)] text-white shadow-[0_14px_24px_rgba(87,199,133,0.2)]"
                          : "border border-[rgba(141,106,232,0.12)] bg-white/85 text-[#33444d] hover:-translate-y-0.5"
                      }`}
                      onClick={() => {
                        applyRotationSelection(index, "receive");
                      }}
                    >
                      Karsilama
                      </button>
                    </div>
                    {supportsVariants ? (
                      <div className="mt-2 grid gap-2">
                        <button
                          type="button"
                          className={cx(
                            "rounded-2xl px-3 py-2 text-xs font-semibold transition",
                            isServeActive
                              ? "bg-[linear-gradient(135deg,#d96aa7,#8d6ae8)] text-white shadow-[0_14px_24px_rgba(141,106,232,0.18)]"
                              : "border border-[rgba(141,106,232,0.12)] bg-white/85 text-[#33444d] hover:-translate-y-0.5",
                          )}
                          onClick={() => {
                            applyRotationSelection(index, "game", "serve");
                          }}
                        >
                          Servis attiktan sonra
                        </button>
                        <button
                          type="button"
                          className={cx(
                            "rounded-2xl px-3 py-2 text-xs font-semibold transition",
                            isServeReceiveActive
                              ? "bg-[linear-gradient(135deg,#57c785,#8d6ae8)] text-white shadow-[0_14px_24px_rgba(87,199,133,0.2)]"
                              : "border border-[rgba(141,106,232,0.12)] bg-white/85 text-[#33444d] hover:-translate-y-0.5",
                          )}
                          onClick={() => {
                            applyRotationSelection(index, "game", "serveReceive");
                          }}
                        >
                          Servis karsiladiktan sonra
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Panel>

          <PlayerEditor
            playerNames={playerNames}
            hasLibero={hasLibero}
            onNameChange={updatePlayerName}
            onToggleLibero={(nextValue) => setHasLibero(nextValue)}
          />
        </div>
      </div>

      <div
        className={cx(
          "fixed inset-0 z-40 lg:hidden",
          mobileCourtOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          className={cx(
            "absolute inset-0 bg-[#0b1720] transition-opacity duration-300",
            mobileCourtOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          className={cx(
            "absolute inset-0 flex flex-col px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] transition-transform duration-300",
            mobileCourtOpen ? "translate-y-0" : "translate-y-full",
          )}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d6ae8]">
                Taktik gorunumu
              </span>
              <strong className="block text-lg text-white">
                {currentRotation.label}
              </strong>
            </div>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/15 bg-white/10 text-2xl text-white"
              onClick={() => setMobileCourtOpen(false)}
              aria-label="Taktik gorunumunu kapat"
            >
              ×
            </button>
          </div>

          <div className="flex min-h-0 flex-1 items-start justify-center">
            <RotationCourt
              rotation={currentRotation}
              mode={selectedMode}
              gameVariant={selectedGameVariant}
              motionStage={motionStage}
              visiblePlayers={visiblePlayers}
              zonePositions={zonePositions}
              className="aspect-[5/5] max-w-none rounded-[28px] sm:aspect-[5/5]"
              developmentMode={developmentMode}
              onCourtClick={developmentMode ? handleCourtClick : undefined}
              onModePointDrag={
                developmentMode
                  ? (roleKey, point) => updateModePointCoordinates(roleKey, point)
                  : undefined
              }
              onModePointFocus={
                developmentMode
                  ? (roleKey) => setSelectedTarget({ kind: "mode", key: roleKey })
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
