import type { Suggestion, Vote } from "../types";
import { getSuggestionSummary } from "../utils";
import { EmptyState, Panel, SectionHeader, SoftCard } from "./ui";

export function SuggestionListPanel({
  suggestions,
  votes,
  remoteEnabled,
  currentMemberId,
  isPendingApproval,
  selectedSuggestionId,
  getMemberLabel,
  getCurrentMemberVote,
  onSelect,
}: {
  suggestions: Suggestion[];
  votes: Vote[];
  remoteEnabled: boolean;
  currentMemberId: string | null;
  isPendingApproval: boolean;
  selectedSuggestionId: string | null;
  getMemberLabel: (memberId: string) => string;
  getCurrentMemberVote: (suggestionId: string) => number | undefined;
  onSelect: (suggestionId: string) => void;
}) {
  return (
    <Panel className="h-full">
      <SectionHeader
        title="Oneri listesi"
        description="Toplam puan once gelir, esitlikte ortalama ve son eklenen belirler."
      />

      {suggestions.length === 0 ? (
        <EmptyState
          title="Henuz isim onerisi yok."
          description={
            remoteEnabled
              ? currentMemberId
                ? isPendingApproval
                  ? "Admin onayindan sonra oneriler burada gorunur."
                  : "Ilk oneriyi ekleyerek listeyi baslatabilirsin."
                : "Kayit olmadan bilgileri goremezsiniz."
              : "Ilk oneriyi ekleyerek listeyi baslatabilirsin."
          }
        />
      ) : (
        <div className="grid gap-3">
          {suggestions.map((suggestion, index) => {
            const summary = getSuggestionSummary(votes, suggestion.id);
            const isSelected = suggestion.id === selectedSuggestionId;
            const userVote = getCurrentMemberVote(suggestion.id);

            return (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => onSelect(suggestion.id)}
                className="text-left"
              >
                <SoftCard
                  className={`space-y-4 transition duration-200 ${
                    isSelected
                      ? "border-[rgba(141,106,232,0.24)] bg-[linear-gradient(160deg,rgba(255,242,249,0.95),rgba(246,241,255,0.92)_56%,rgba(240,250,244,0.88))] shadow-[0_18px_44px_rgba(141,106,232,0.16)]"
                      : "hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(24,33,39,0.08)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <span className="inline-flex rounded-full bg-[rgba(217,106,167,0.12)] px-2.5 py-1 text-xs font-semibold text-[#b25588]">
                        #{index + 1}
                      </span>
                      <h3 className="text-xl font-bold text-[#182127]">
                        {suggestion.title}
                      </h3>
                    </div>
                    <div className="rounded-[22px] border border-[rgba(141,106,232,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(246,241,255,0.82))] px-4 py-3 text-center shadow-[0_10px_24px_rgba(141,106,232,0.08)]">
                      <strong className="block text-2xl font-bold text-[#182127]">
                        {summary.totalScore}
                      </strong>
                      <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#5f6d76]">
                        puan
                      </span>
                    </div>
                  </div>

                  <p className="line-clamp-3 text-sm leading-7 text-[#40535d]">
                    {suggestion.note || "Ek not girilmedi."}
                  </p>

                  <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#5f6d76]">
                    <span className="rounded-full border border-[rgba(141,106,232,0.1)] bg-[rgba(246,241,255,0.88)] px-3 py-1.5">
                      @{getMemberLabel(suggestion.memberId)}
                    </span>
                    <span className="rounded-full border border-[rgba(98,180,131,0.12)] bg-[rgba(242,251,245,0.96)] px-3 py-1.5">
                      {summary.voteCount} oy
                    </span>
                    <span className="rounded-full border border-[rgba(141,106,232,0.1)] bg-[rgba(246,241,255,0.88)] px-3 py-1.5">
                      Ort. {summary.averageScore.toFixed(1)}
                    </span>
                    {userVote ? (
                      <span className="rounded-full border border-[rgba(217,106,167,0.16)] bg-[rgba(255,239,247,0.9)] px-3 py-1.5 text-[#b25588]">
                        Senin oyun: {userVote}
                      </span>
                    ) : null}
                  </div>
                </SoftCard>
              </button>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
