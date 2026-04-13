import type { FormEvent } from "react";
import {
  Field,
  Panel,
  PrimaryButton,
  SectionHeader,
  TextArea,
  TextInput,
  ToneMessage,
} from "./ui";

export function SuggestionComposer({
  remoteEnabled,
  canParticipate,
  isSubmitting,
  draft,
  error,
  maxSuggestionsPerMember,
  onChange,
  onSubmit,
}: {
  remoteEnabled: boolean;
  canParticipate: boolean;
  isSubmitting: boolean;
  draft: { title: string; note: string };
  error: string;
  maxSuggestionsPerMember: number;
  onChange: (field: "title" | "note", value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Panel>
      <SectionHeader
        title="Yeni isim onerisi"
        description={
          remoteEnabled
            ? `Kisi basi en fazla ${maxSuggestionsPerMember} oneri yapilabilir.`
            : `Kisi basi en fazla ${maxSuggestionsPerMember} oneri yapilabilir.`
        }
      />

      <form className="grid gap-4" onSubmit={onSubmit}>
        <Field label="Takim ismi">
          <TextInput
            maxLength={40}
            value={draft.title}
            placeholder="Ornek: Blok Cizgisi"
            disabled={remoteEnabled && !canParticipate}
            onChange={(event) => onChange("title", event.target.value)}
          />
        </Field>

        <Field label="Kisa not">
          <TextArea
            rows={4}
            maxLength={300}
            value={draft.note}
            placeholder="Bu ismi neden sevdigini biraz daha detayli yazabilirsin."
            disabled={remoteEnabled && !canParticipate}
            onChange={(event) => onChange("note", event.target.value)}
          />
        </Field>

        {error ? <ToneMessage tone="error">{error}</ToneMessage> : null}

        <PrimaryButton
          type="submit"
          disabled={isSubmitting || (remoteEnabled && !canParticipate)}
        >
          Oneriyi ekle
        </PrimaryButton>
      </form>
    </Panel>
  );
}
