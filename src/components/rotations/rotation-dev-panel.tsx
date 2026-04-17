import {
  ROLE_META,
} from "../../rotations/data";
import type {
  BaseStartOrder,
  CourtPoint,
  GameVariant,
  RotationFrame,
  RotationMode,
  RotationSlotKey,
  RotationZoneKey,
  ZonePositions,
} from "../../rotations/types";
import {
  Field,
  GhostButton,
  Panel,
  PrimaryButton,
  SelectInput,
  SectionHeader,
  SecondaryButton,
  TextInput,
  ToneMessage,
  cx,
} from "../ui";

export type RotationDevTarget =
  | { kind: "zone"; key: RotationZoneKey }
  | { kind: "mode"; key: RotationSlotKey };

function formatPoint(point: CourtPoint | null) {
  if (!point) {
    return "-";
  }

  return `x: ${point.x.toFixed(1)} / y: ${point.y.toFixed(1)}`;
}

function NumberField({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <TextInput
      type="number"
      step="0.1"
      min="0"
      max="100"
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="rounded-[16px] px-3 py-2 text-sm"
    />
  );
}

export function RotationDevPanel({
  isAdmin,
  developmentMode,
  onToggleDevelopmentMode,
  lastCourtPoint,
  selectedTarget,
  baseStartOrder,
  zonePositions,
  currentRotation,
  selectedMode,
  selectedGameVariant,
  onSelectTarget,
  onZonePointChange,
  onModePointChange,
  onStartZoneRoleChange,
  onApplyLastPoint,
  onSave,
  onReset,
  isSaving,
  saveNotice,
  saveError,
}: {
  isAdmin: boolean;
  developmentMode: boolean;
  onToggleDevelopmentMode: () => void;
  lastCourtPoint: CourtPoint | null;
  selectedTarget: RotationDevTarget | null;
  baseStartOrder: BaseStartOrder;
  zonePositions: ZonePositions;
  currentRotation: RotationFrame;
  selectedMode: RotationMode;
  selectedGameVariant: GameVariant;
  onSelectTarget: (target: RotationDevTarget) => void;
  onZonePointChange: (key: RotationZoneKey, axis: "x" | "y", value: number) => void;
  onModePointChange: (
    key: RotationSlotKey,
    axis: "x" | "y",
    value: number,
  ) => void;
  onStartZoneRoleChange: (zoneKey: RotationZoneKey, roleKey: RotationSlotKey) => void;
  onApplyLastPoint: () => void;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
  saveNotice: string;
  saveError: string;
}) {
  const activeModePositions =
    selectedMode === "game"
      ? currentRotation.startZoneMap.setter === "1" &&
        selectedGameVariant === "serveReceive"
        ? currentRotation.gameReceivePositions
        : currentRotation.gamePositions
      : currentRotation.receivePositions;
  const zoneToRole = baseStartOrder;

  return (
    <Panel>
      <SectionHeader
        title="Gelistirme modu"
        description="Bu modda koordinatlari kontrollu sekilde duzenleyip kaydedebiliriz. Kaydedilen konumlar herkes icin gecerli olur."
        action={
          isAdmin ? (
            <SecondaryButton type="button" onClick={onToggleDevelopmentMode}>
              {developmentMode ? "Modu kapat" : "Modu ac"}
            </SecondaryButton>
          ) : null
        }
      />

      {!isAdmin ? (
        <ToneMessage tone="muted">
          Bu alan sadece admin duzenlemesi icin acilacak.
        </ToneMessage>
      ) : !developmentMode ? (
        <ToneMessage tone="muted">
          Gelistirme modunu actiginda sahaya tiklayip koordinat toplayabilir, sagdaki
          tablolarla noktalari duzenleyebilirsin.
        </ToneMessage>
      ) : (
        <div className="grid gap-5">
          <ToneMessage tone="muted">
            <strong className="mr-1 text-[#182127]">Dogru model:</strong>
            1-2-3-4-5-6 sahadaki sabit baslangic noktalaridir. Bunlar globaldir.
            Rotasyon degistikce degisen sey, hangi oyuncunun hangi bolgeden basladigi ve
            secili modda hangi hedefe aktigidir.
          </ToneMessage>

          <div className="grid gap-3 xl:grid-cols-2">
            <div className="rounded-[22px] border border-[rgba(141,106,232,0.1)] bg-white/72 p-4">
              <strong className="block text-sm uppercase tracking-[0.16em] text-[#8d6ae8]">
                Sabit baslangic noktalarI
              </strong>
              <p className="mt-2 text-sm leading-6 text-[#5f6d76]">
                Bu alan sadece saha ustundeki 1-2-3-4-5-6 bolgelerinin koordinatini
                belirler. Tum rotasyonlarda ayni kalir.
              </p>

              <div className="mt-3 grid gap-2">
                {(Object.keys(zonePositions) as RotationZoneKey[]).map((zoneKey) => {
                  const point = zonePositions[zoneKey];
                  const isSelected =
                    selectedTarget?.kind === "zone" && selectedTarget.key === zoneKey;

                  return (
                    <div
                      key={zoneKey}
                      className={cx(
                        "grid gap-2 rounded-[22px] border bg-white/72 p-3 transition sm:grid-cols-[84px_1fr_1fr]",
                        isSelected
                          ? "border-[rgba(141,106,232,0.28)] ring-2 ring-[rgba(141,106,232,0.12)]"
                          : "border-[rgba(141,106,232,0.1)]",
                      )}
                    >
                      <button
                        type="button"
                        className="rounded-[16px] border border-[rgba(141,106,232,0.14)] bg-[rgba(246,241,255,0.72)] px-3 py-2 text-sm font-semibold text-[#182127]"
                        onClick={() => onSelectTarget({ kind: "zone", key: zoneKey })}
                      >
                        Bolge {zoneKey}
                      </button>
                      <NumberField
                        value={point.x}
                        onChange={(value) => onZonePointChange(zoneKey, "x", value)}
                      />
                      <NumberField
                        value={point.y}
                        onChange={(value) => onZonePointChange(zoneKey, "y", value)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[22px] border border-[rgba(141,106,232,0.1)] bg-white/72 p-4">
              <strong className="block text-sm uppercase tracking-[0.16em] text-[#d96aa7]">
                Global baslangic sirasi
              </strong>
              <p className="mt-2 text-sm leading-6 text-[#5f6d76]">
                Burada dogrudan bolgeye hangi rolun gelecegini sec. Bu sira tum
                rotasyonlara uygulanir; alttaki rotasyonlar bu dizilimin donmus halleri olur.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(["1", "2", "3", "4", "5", "6"] as RotationZoneKey[]).map((zoneKey) => (
                  <div
                    key={zoneKey}
                    className="rounded-[18px] border border-[rgba(141,106,232,0.08)] bg-[rgba(255,255,255,0.72)] p-3"
                  >
                    <span className="mb-2 block text-sm font-semibold text-[#182127]">
                      Bolge {zoneKey}
                    </span>
                    <SelectInput
                      value={zoneToRole[zoneKey]}
                      className="rounded-[16px] px-3 py-2 text-sm"
                      onChange={(event) =>
                        onStartZoneRoleChange(
                          zoneKey,
                          event.target.value as RotationSlotKey,
                        )
                      }
                    >
                      {ROLE_META.filter((item) => item.key !== "libero").map((role) => (
                        <option key={role.key} value={role.key}>
                          {role.shortLabel} - {role.label}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-[rgba(141,106,232,0.1)] bg-white/72 p-4">
            <strong className="block text-sm uppercase tracking-[0.16em] text-[#d96aa7]">
              Bu rotasyonda otomatik baslangic dagilimi
            </strong>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {(["1", "2", "3", "4", "5", "6"] as RotationZoneKey[]).map((zoneKey) => {
                const currentRole = currentRotation.startZoneMap;
                const matchedRole = (Object.keys(currentRole) as RotationSlotKey[]).find(
                  (key) => currentRole[key] === zoneKey,
                )!;
                const roleMeta = ROLE_META.find((item) => item.key === matchedRole)!;

                return (
                  <div
                    key={`current-${zoneKey}`}
                    className="rounded-[18px] border border-[rgba(141,106,232,0.08)] bg-[rgba(255,255,255,0.72)] px-3 py-2 text-sm text-[#33444d]"
                  >
                    <strong className="mr-2 text-[#182127]">Bolge {zoneKey}</strong>
                    {roleMeta.shortLabel} - {roleMeta.label}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <Field label="Sahadan son tiklanan nokta">
              <div className="rounded-[18px] border border-[rgba(141,106,232,0.12)] bg-white/72 px-4 py-3 text-sm text-[#33444d]">
                {formatPoint(lastCourtPoint)}
              </div>
            </Field>
            <div className="flex flex-wrap gap-2">
              <GhostButton type="button" onClick={onApplyLastPoint}>
                Tiklanan noktayi uygula
              </GhostButton>
              <SecondaryButton type="button" onClick={onReset}>
                Varsayilana don
              </SecondaryButton>
              <PrimaryButton type="button" onClick={onSave} disabled={isSaving}>
                {isSaving ? "Kaydediliyor..." : "Kaydet"}
              </PrimaryButton>
            </div>
          </div>

          {saveError ? <ToneMessage tone="error">{saveError}</ToneMessage> : null}
          {saveNotice ? <ToneMessage tone="success">{saveNotice}</ToneMessage> : null}

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-3">
              <strong className="block text-sm uppercase tracking-[0.16em] text-[#d96aa7]">
                {selectedMode === "game"
                  ? currentRotation.startZoneMap.setter === "1" &&
                    selectedGameVariant === "serveReceive"
                    ? "Servis karsilarken oyun ici noktalari"
                    : "Servis atarken oyun ici noktalari"
                  : "Karsilama noktalari"}
              </strong>
              <div className="grid gap-2">
                {(Object.keys(activeModePositions) as RotationSlotKey[]).map((roleKey) => {
                  const point = activeModePositions[roleKey];
                  const roleMeta = ROLE_META.find((item) => item.key === roleKey)!;
                  const isSelected =
                    selectedTarget?.kind === "mode" && selectedTarget.key === roleKey;

                  return (
                    <div
                      key={roleKey}
                      className={cx(
                        "grid gap-2 rounded-[22px] border bg-white/72 p-3 transition sm:grid-cols-[110px_1fr_1fr]",
                        isSelected
                          ? "border-[rgba(217,106,167,0.28)] ring-2 ring-[rgba(217,106,167,0.12)]"
                          : "border-[rgba(141,106,232,0.1)]",
                      )}
                    >
                      <button
                        type="button"
                        className="rounded-[16px] border border-[rgba(141,106,232,0.14)] bg-[rgba(255,248,252,0.82)] px-3 py-2 text-sm font-semibold text-[#182127]"
                        onClick={() => onSelectTarget({ kind: "mode", key: roleKey })}
                      >
                        {roleMeta.shortLabel}
                      </button>
                      <NumberField
                        value={point.x}
                        onChange={(value) => onModePointChange(roleKey, "x", value)}
                      />
                      <NumberField
                        value={point.y}
                        onChange={(value) => onModePointChange(roleKey, "y", value)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
