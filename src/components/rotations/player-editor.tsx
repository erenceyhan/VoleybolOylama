import { ROLE_META } from "../../rotations/data";
import type { PlayerNames, RoleKey } from "../../rotations/types";
import { Field, Panel, SectionHeader, TextInput, ToneMessage } from "../ui";

export function PlayerEditor({
  playerNames,
  hasLibero,
  onNameChange,
  onToggleLibero,
}: {
  playerNames: PlayerNames;
  hasLibero: boolean;
  onNameChange: (role: RoleKey, value: string) => void;
  onToggleLibero: (nextValue: boolean) => void;
}) {
  return (
    <Panel className="h-full">
      <SectionHeader
        title="Oyuncu adlari"
        description="Isimler burada degistikce taktik tahtasindaki oyuncu daireleri de aninda guncellenir."
      />

      <div className="mb-5 flex items-center justify-between rounded-[24px] border border-[rgba(141,106,232,0.12)] bg-white/70 px-4 py-3">
        <div>
          <strong className="block text-sm text-[#182127]">Libero kullan</strong>
          <p className="mt-1 text-xs leading-5 text-[#5f6d76]">
            Acildiginda arka hatta olan middle yerine otomatik gorunur.
          </p>
        </div>
        <button
          type="button"
          aria-pressed={hasLibero}
          className={`relative inline-flex h-7 w-14 items-center rounded-full transition ${
            hasLibero
              ? "bg-[linear-gradient(135deg,#2bb8a5,#8d6ae8)]"
              : "bg-[rgba(24,33,39,0.12)]"
          }`}
          onClick={() => onToggleLibero(!hasLibero)}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
              hasLibero ? "translate-x-8" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {ROLE_META.filter((role) => role.key !== "libero" || hasLibero).map((role) => (
          <Field key={role.key} label={role.label}>
            <TextInput
              value={playerNames[role.key]}
              placeholder={`${role.label} ismi`}
              onChange={(event) => onNameChange(role.key, event.target.value)}
            />
          </Field>
        ))}
      </div>

      <ToneMessage tone="muted">
        Ilk surumde 6 rotasyon sabit, degisen kisim oyuncu isimleri ve libero kullanimi.
      </ToneMessage>
    </Panel>
  );
}
