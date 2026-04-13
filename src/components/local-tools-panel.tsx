import type { ChangeEvent } from "react";
import {
  GhostButton,
  Panel,
  SecondaryButton,
  SectionHeader,
} from "./ui";

export function LocalToolsPanel({
  onExport,
  onImport,
  onReset,
}: {
  onExport: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
}) {
  return (
    <Panel className="lg:flex lg:items-start lg:justify-between lg:gap-6">
      <div className="space-y-2">
        <SectionHeader
          title="Bu ilk surum nasil calisiyor?"
          description="Bu demo verileri tarayicinin local storage alaninda tutuyor. Gercek ortak kullanim icin Supabase env ayarlarini girmen yeterli."
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3 lg:mt-0 lg:shrink-0">
        <SecondaryButton type="button" onClick={onExport}>
          JSON disa aktar
        </SecondaryButton>
        <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-[#182127]/10 bg-white/85 px-4 py-3 text-sm font-semibold text-[#182127] transition duration-200 hover:-translate-y-0.5 hover:bg-white">
          JSON ice aktar
          <input
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={onImport}
          />
        </label>
        <GhostButton type="button" onClick={onReset}>
          Demo verisini sifirla
        </GhostButton>
      </div>
    </Panel>
  );
}
