import type { Member, MemberActivityLog, Suggestion } from "../types";
import { formatDate } from "../utils";
import { EmptyState, SoftCard, ToneMessage } from "./ui";

const ACTION_LABELS: Record<string, string> = {
  login_success: "Giris yapti",
  register_success: "Kayit oldu",
  logout: "Cikis yapti",
  session_timeout: "Oturum zaman asimina ugradi",
  suggestion_open: "Oneri popup acildi",
  suggestion_create: "Oneri ekledi",
  suggestion_delete: "Oneri sildi",
  suggestion_note_update: "Oneri notunu guncelledi",
  vote_upsert: "Oy verdi",
  vote_delete: "Oyunu geri aldi",
  comment_create: "Yorum yapti",
  comment_delete: "Yorum sildi",
  asset_upload: "SVG yukledi",
  asset_delete: "SVG sildi",
  asset_view: "SVG onizleme acti",
  member_approval_update: "Uyelik durumunu guncelledi",
  member_reject: "Uyeyi reddetti",
};

function getActionLabel(log: MemberActivityLog) {
  return ACTION_LABELS[log.actionType] ?? "Islem yapti";
}

function getLogTitle(
  log: MemberActivityLog,
  suggestionsById: Record<string, Suggestion>,
) {
  const details = log.details ?? {};
  const preferredTitleKeys = [
    "suggestionTitle",
    "suggestion_title",
    "title",
    "commentText",
    "comment_text",
    "assetName",
    "asset_name",
    "memberUsername",
    "member_username",
  ] as const;

  for (const key of preferredTitleKeys) {
    const value = details[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  if (
    log.targetType === "suggestion" &&
    log.targetId &&
    suggestionsById[log.targetId]
  ) {
    return suggestionsById[log.targetId].title;
  }

  return getActionLabel(log);
}

export function MemberActivityPanel({
  member,
  suggestions,
  logs,
  isLoading,
  error,
}: {
  member: Member;
  suggestions: Suggestion[];
  logs: MemberActivityLog[];
  isLoading: boolean;
  error: string;
}) {
  const suggestionsById = Object.fromEntries(
    suggestions.map((suggestion) => [suggestion.id, suggestion]),
  );

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-2xl font-bold tracking-[-0.04em] text-[#182127]">
          @{member.username ?? member.name}
        </h3>
        <p className="mt-2 text-sm text-[#5f6d76]">
          Son islem gecmisi bu popup icinde listelenir. Sadece admin gorebilir.
        </p>
      </div>

      {error ? <ToneMessage tone="error">{error}</ToneMessage> : null}

      {isLoading ? (
        <ToneMessage tone="muted">Uyeye ait loglar yukleniyor...</ToneMessage>
      ) : logs.length === 0 ? (
        <EmptyState
          title="Bu uye icin log bulunamadi."
          description="Ilk anlamli islemden sonra burada giris ve aksiyon kayitlari gorunur."
        />
      ) : (
        <div className="grid gap-3">
          {logs.map((log) => {
            return (
              <SoftCard key={log.id} className="bg-white/80">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <strong className="block text-[#182127]">
                    {getLogTitle(log, suggestionsById)}
                  </strong>
                  <span className="text-sm text-[#5f6d76]">
                    {formatDate(log.createdAt)}
                  </span>
                </div>
              </SoftCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
