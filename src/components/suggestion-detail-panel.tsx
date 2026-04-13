import type { FormEvent } from "react";
import type { Comment, Suggestion, SuggestionAsset, Vote } from "../types";
import {
  formatDate,
  getSuggestionComments,
  getSuggestionSummary,
  getSuggestionVotes,
} from "../utils";
import {
  DangerButton,
  EmptyState,
  Field,
  GhostButton,
  Panel,
  PrimaryButton,
  SectionHeader,
  SoftCard,
  TextArea,
  ToneMessage,
} from "./ui";

export function SuggestionDetailPanel({
  suggestion,
  votes,
  comments,
  assets,
  embedded = false,
  assetsLoading = false,
  remoteEnabled,
  canParticipate,
  isPendingApproval,
  isOwnSuggestion,
  currentSelectedVote,
  editingSuggestionId,
  editingSuggestionNote,
  commentDraft,
  suggestionError,
  isSubmitting,
  getMemberLabel,
  canDeleteSuggestion,
  canEditSuggestionNote,
  canManageComment,
  canUploadAssets,
  canDeleteAsset,
  onDeleteSuggestion,
  onDeleteComment,
  onUploadAsset,
  onDeleteAsset,
  onPreviewAsset,
  onStartEdit,
  onCancelEdit,
  onEditNoteChange,
  onSaveNote,
  onVote,
  onClearVote,
  onCommentDraftChange,
  onSubmitComment,
  minVote,
  maxVote,
}: {
  suggestion: Suggestion | null;
  votes: Vote[];
  comments: Comment[];
  assets: SuggestionAsset[];
  embedded?: boolean;
  assetsLoading?: boolean;
  remoteEnabled: boolean;
  canParticipate: boolean;
  isPendingApproval: boolean;
  isOwnSuggestion: boolean;
  currentSelectedVote: number | undefined;
  editingSuggestionId: string | null;
  editingSuggestionNote: string;
  commentDraft: string;
  suggestionError: string;
  isSubmitting: boolean;
  getMemberLabel: (memberId: string) => string;
  canDeleteSuggestion: (suggestion: Suggestion) => boolean;
  canEditSuggestionNote: (suggestion: Suggestion) => boolean;
  canManageComment: (comment: Comment) => boolean;
  canUploadAssets: boolean;
  canDeleteAsset: (asset: SuggestionAsset) => boolean;
  onDeleteSuggestion: (suggestionId: string) => void;
  onDeleteComment: (commentId: string) => void;
  onUploadAsset: (suggestionId: string, file: File) => void;
  onDeleteAsset: (asset: SuggestionAsset) => void;
  onPreviewAsset: (asset: SuggestionAsset) => void;
  onStartEdit: (suggestion: Suggestion) => void;
  onCancelEdit: () => void;
  onEditNoteChange: (value: string) => void;
  onSaveNote: (event: FormEvent<HTMLFormElement>, suggestionId: string) => void;
  onVote: (suggestionId: string, value: number) => void;
  onClearVote: (suggestionId: string) => void;
  onCommentDraftChange: (suggestionId: string, value: string) => void;
  onSubmitComment: (
    event: FormEvent<HTMLFormElement>,
    suggestionId: string,
  ) => void;
  minVote: number;
  maxVote: number;
}) {
  if (!suggestion) {
    return (
      <Panel className="h-full">
        <EmptyState
          title="Detay gormek icin bir isim sec."
          description="Listeye ilk oneriyi ekledikten sonra detaylar burada acilir."
        />
      </Panel>
    );
  }

  const summary = getSuggestionSummary(votes, suggestion.id);
  const suggestionVotes = getSuggestionVotes(votes, suggestion.id).sort(
    (left, right) => right.value - left.value,
  );
  const suggestionComments = getSuggestionComments(comments, suggestion.id);
  const suggestionAssets = assets.filter((asset) => asset.suggestionId === suggestion.id);
  const isEditing = editingSuggestionId === suggestion.id;

  const content = (
    <>
      <SectionHeader
        title={embedded ? "" : suggestion.title}
        description={`@${getMemberLabel(suggestion.memberId)} tarafindan ${formatDate(
          suggestion.createdAt,
        )} tarihinde eklendi.`}
        action={
          canDeleteSuggestion(suggestion) ? (
            <DangerButton
              type="button"
              disabled={isSubmitting}
              onClick={() => onDeleteSuggestion(suggestion.id)}
            >
              Oneriyi sil
            </DangerButton>
          ) : undefined
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Toplam puan" value={String(summary.totalScore)} />
        <SummaryCard label="Ortalama" value={summary.averageScore.toFixed(1)} />
        <SummaryCard label="Oy sayisi" value={String(summary.voteCount)} />
      </div>

      <div className="mt-5 space-y-5">
        {suggestionError ? <ToneMessage tone="error">{suggestionError}</ToneMessage> : null}

        <SoftCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-[#182127]">Oneri notu</h3>
            {canEditSuggestionNote(suggestion) && !isEditing ? (
              <GhostButton
                type="button"
                disabled={isSubmitting}
                onClick={() => onStartEdit(suggestion)}
              >
                Duzenle
              </GhostButton>
            ) : null}
          </div>

          {isEditing ? (
            <form
              className="grid gap-3"
              onSubmit={(event) => onSaveNote(event, suggestion.id)}
            >
              <TextArea
                rows={4}
                maxLength={300}
                value={editingSuggestionNote}
                disabled={isSubmitting}
                placeholder="Bu ismi neden sectigini yaz."
                onChange={(event) => onEditNoteChange(event.target.value)}
              />
              <div className="flex flex-wrap gap-3">
                <PrimaryButton type="submit" disabled={isSubmitting}>
                  Kaydet
                </PrimaryButton>
                <GhostButton
                  type="button"
                  disabled={isSubmitting}
                  onClick={onCancelEdit}
                >
                  Vazgec
                </GhostButton>
              </div>
            </form>
          ) : (
            <p className="text-sm leading-7 text-[#40535d]">
              {suggestion.note || "Bu oneride ek bir not yok."}
            </p>
          )}
        </SoftCard>

        <SoftCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-[#182127]">Amblem / logo</h3>
            <span className="text-sm text-[#5f6d76]">
              {suggestionAssets.length}/3 dosya
            </span>
          </div>

          {canUploadAssets ? (
            <div className="space-y-3">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-[rgba(141,106,232,0.14)] bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(246,241,255,0.92))] px-4 py-3 text-sm font-semibold text-[#182127] transition hover:-translate-y-0.5">
                SVG yukle
                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  className="sr-only"
                  disabled={isSubmitting || suggestionAssets.length >= 3}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      onUploadAsset(suggestion.id, file);
                    }
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <div className="space-y-1 text-sm leading-6 text-[#5f6d76]">
                <p>
                  Yalnizca SVG kabul edilir. Her gonderiye en fazla 3 dosya
                  eklenebilir. Dosya basi sinir 400 KB.
                </p>
                <p>JPG'den SVG'ye ceviri kolay site: https://convertio.co/tr/</p>
                <p>Renkli SVG icin: https://www.recraft.ai/</p>
              </div>
            </div>
          ) : null}

          {assetsLoading ? (
            <ToneMessage tone="muted">SVG dosyalari yukleniyor...</ToneMessage>
          ) : suggestionAssets.length === 0 ? (
            <ToneMessage tone="muted">
              Bu oneri icin henuz amblem ya da logo yuklenmedi.
            </ToneMessage>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {suggestionAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="overflow-hidden rounded-[22px] border border-[rgba(141,106,232,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(246,241,255,0.76))]"
                >
                  <button
                    type="button"
                    className="block w-full bg-[radial-gradient(circle_at_top,rgba(217,106,167,0.08),transparent_55%),radial-gradient(circle_at_bottom,rgba(98,180,131,0.08),transparent_45%)] p-3"
                    onClick={() => onPreviewAsset(asset)}
                  >
                    <div className="flex aspect-square items-center justify-center rounded-[18px] bg-[linear-gradient(160deg,rgba(255,245,250,0.96),rgba(243,250,245,0.92))] p-3">
                      <img
                        src={asset.publicUrl}
                        alt={`${suggestion.title} logosu`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </button>
                  <div className="flex items-center justify-between gap-2 px-3 pb-3">
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#5f6d76] transition hover:text-[#182127]"
                      onClick={() => onPreviewAsset(asset)}
                    >
                      Buyut
                    </button>
                    {canDeleteAsset(asset) ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#b25588] transition hover:opacity-80"
                        disabled={isSubmitting}
                        onClick={() => onDeleteAsset(asset)}
                      >
                        Sil
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

        </SoftCard>

        <SoftCard className="space-y-4">
          <h3 className="text-lg font-bold text-[#182127]">Puan ver</h3>

          {canParticipate ? (
            isOwnSuggestion ? (
              <ToneMessage tone="muted">Kendi onerine puan veremezsin.</ToneMessage>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {Array.from(
                    { length: maxVote - minVote + 1 },
                    (_, index) => index + minVote,
                  ).map((value) => (
                    <button
                      key={value}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => onVote(suggestion.id, value)}
                      className={`inline-flex h-11 min-w-11 items-center justify-center rounded-2xl border px-4 text-sm font-semibold transition duration-200 ${
                        currentSelectedVote === value
                          ? "border-[#8d6ae8] bg-[linear-gradient(135deg,#d96aa7,#8d6ae8)] text-white"
                          : "border-[rgba(141,106,232,0.12)] bg-white text-[#182127] hover:-translate-y-0.5 hover:bg-[rgba(246,241,255,0.82)]"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>

                {currentSelectedVote ? (
                  <GhostButton
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => onClearVote(suggestion.id)}
                  >
                    Oyumu geri al
                  </GhostButton>
                ) : null}
              </>
            )
          ) : (
            <ToneMessage tone="muted">
              {remoteEnabled
                ? isPendingApproval
                  ? "Admin onayi gelene kadar oy kullanamazsin."
                  : "Oy kullanmak icin once giris yap."
                : "Oy kullanmak icin once giris yap."}
            </ToneMessage>
          )}
        </SoftCard>

        <SoftCard className="space-y-4">
          <h3 className="text-lg font-bold text-[#182127]">Kim hangi puani verdi?</h3>

          {suggestionVotes.length === 0 ? (
            <ToneMessage tone="muted">Bu oneride henuz oy yok.</ToneMessage>
          ) : (
            <div className="grid gap-3">
              {suggestionVotes.map((vote) => (
                <article
                  key={`${vote.memberId}-${vote.suggestionId}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[20px] border border-[rgba(141,106,232,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(246,241,255,0.72))] px-4 py-3"
                >
                  <strong className="text-[#182127]">@{getMemberLabel(vote.memberId)}</strong>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-semibold text-[#b25588]">{vote.value} puan</span>
                    <span className="text-[#5f6d76]">{formatDate(vote.updatedAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SoftCard>

        <SoftCard className="space-y-4">
          <h3 className="text-lg font-bold text-[#182127]">Yorumlar</h3>

          {canParticipate ? (
            <form
              className="grid gap-3"
              onSubmit={(event) => onSubmitComment(event, suggestion.id)}
            >
              <Field label="Yorumun">
                <TextArea
                  rows={3}
                  maxLength={200}
                  value={commentDraft}
                  placeholder="Bu isim hakkindaki fikrini yaz."
                  onChange={(event) =>
                    onCommentDraftChange(suggestion.id, event.target.value)
                  }
                />
              </Field>
              <PrimaryButton type="submit" disabled={isSubmitting}>
                Yorumu ekle
              </PrimaryButton>
            </form>
          ) : (
            <ToneMessage tone="muted">
              {remoteEnabled
                ? isPendingApproval
                  ? "Admin onayi gelene kadar yorum yapamazsin."
                  : "Yorum yapmak icin once giris yap."
                : "Yorum yapmak icin once giris yap."}
            </ToneMessage>
          )}

          {suggestionComments.length === 0 ? (
            <ToneMessage tone="muted">Bu oneride henuz yorum yok.</ToneMessage>
          ) : (
            <div className="grid gap-3">
              {suggestionComments.map((comment) => (
                <article
                  key={comment.id}
                  className="rounded-[22px] border border-[rgba(141,106,232,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(242,251,245,0.74))] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-[#182127]">@{getMemberLabel(comment.memberId)}</strong>
                    <span className="text-sm text-[#5f6d76]">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[#40535d]">
                    {comment.message}
                  </p>
                  {canManageComment(comment) ? (
                    <div className="mt-4">
                      <GhostButton
                        type="button"
                        disabled={isSubmitting}
                        className="text-[#b25588]"
                        onClick={() => onDeleteComment(comment.id)}
                      >
                        Yorumu sil
                      </GhostButton>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </SoftCard>
      </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-5">{content}</div>;
  }

  return <Panel className="h-full">{content}</Panel>;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <SoftCard className="space-y-2 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(246,241,255,0.78))]">
      <span className="text-sm font-medium text-[#5f6d76]">{label}</span>
      <strong className="block text-3xl font-bold tracking-[-0.04em] text-[#182127]">
        {value}
      </strong>
    </SoftCard>
  );
}
