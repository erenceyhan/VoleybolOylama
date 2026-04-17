"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthErrorMessage, isSessionTimeoutError } from "./auth";
import { HeroSection } from "./components/hero-section";
import { LocalToolsPanel } from "./components/local-tools-panel";
import { ModalShell } from "./components/modal-shell";
import { SuggestionComposer } from "./components/suggestion-composer";
import { SuggestionDetailPanel } from "./components/suggestion-detail-panel";
import { SuggestionListPanel } from "./components/suggestion-list-panel";
import { EmptyState, Panel } from "./components/ui";
import {
  addRemoteComment,
  addRemoteSuggestion,
  deleteRemoteComment,
  deleteRemoteSuggestion,
  deleteRemoteSuggestionAsset,
  deleteRemoteVote,
  fetchRemoteAppData,
  fetchSuggestionAssetsForSuggestion,
  getRemoteSessionMember,
  recordRemoteActivity,
  updateRemoteSuggestionNote,
  uploadRemoteSuggestionAsset,
  upsertRemoteVote,
} from "./remote";
import {
  initialAppData,
  MAX_SUGGESTIONS_PER_MEMBER,
  MAX_VOTE,
  MIN_VOTE,
} from "./seed";
import {
  clearSessionMemberId,
  isAppData,
  loadAppData,
  loadSessionMemberId,
  saveAppData,
  saveSessionMemberId,
} from "./storage";
import { hasSupabaseConfig } from "./supabaseClient";
import type { AppData, Comment, Suggestion, SuggestionAsset } from "./types";
import {
  clampVote,
  createId,
  getInitialAppData,
  getSuggestionSummary,
} from "./utils";

type SuggestionDraft = {
  title: string;
  note: string;
};

const emptyAppData: AppData = {
  members: [],
  suggestions: [],
  votes: [],
  comments: [],
  assets: [],
};

const emptySuggestionDraft: SuggestionDraft = {
  title: "",
  note: "",
};

const ALLOWED_ASSET_TYPES = new Set([
  "image/svg+xml",
  "image/png",
  "image/jpeg",
]);

function isAllowedAssetFile(file: File) {
  const fileType = (file.type || "").toLowerCase();
  const fileName = file.name.toLowerCase();

  if (ALLOWED_ASSET_TYPES.has(fileType)) {
    return true;
  }

  return (
    fileName.endsWith(".svg") ||
    fileName.endsWith(".png") ||
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg")
  );
}

function App() {
  const router = useRouter();
  const remoteEnabled = hasSupabaseConfig;
  const [appData, setAppData] = useState<AppData>(() =>
    remoteEnabled ? emptyAppData : loadAppData(),
  );
  const [sessionMemberId, setSessionMemberId] = useState<string | null>(() =>
    remoteEnabled ? null : loadSessionMemberId(),
  );
  const [suggestionDraft, setSuggestionDraft] =
    useState<SuggestionDraft>(emptySuggestionDraft);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null);
  const [editingSuggestionNote, setEditingSuggestionNote] = useState("");
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(
    () => (remoteEnabled ? null : initialAppData.suggestions[0]?.id ?? null),
  );
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [modalAssets, setModalAssets] = useState<SuggestionAsset[]>([]);
  const [isLoadingModalAssets, setIsLoadingModalAssets] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<SuggestionAsset | null>(null);
  const [suggestionError, setSuggestionError] = useState("");
  const [isBootingRemote, setIsBootingRemote] = useState(remoteEnabled);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (remoteEnabled) {
      return;
    }

    saveAppData(appData);
  }, [appData, remoteEnabled]);

  useEffect(() => {
    if (remoteEnabled) {
      return;
    }

    if (sessionMemberId) {
      saveSessionMemberId(sessionMemberId);
      return;
    }

    clearSessionMemberId();
  }, [remoteEnabled, sessionMemberId]);

  useEffect(() => {
    if (!remoteEnabled) {
      if (!loadSessionMemberId()) {
        router.replace("/");
      }

      return;
    }

    void hydrateRemoteState();
  }, [remoteEnabled, router]);

  const membersById = Object.fromEntries(
    appData.members.map((member) => [member.id, member]),
  );

  const currentMember =
    sessionMemberId && membersById[sessionMemberId]
      ? membersById[sessionMemberId]
      : null;

  const orderedSuggestions = [...appData.suggestions].sort((left, right) => {
    const leftSummary = getSuggestionSummary(appData.votes, left.id);
    const rightSummary = getSuggestionSummary(appData.votes, right.id);

    if (rightSummary.totalScore !== leftSummary.totalScore) {
      return rightSummary.totalScore - leftSummary.totalScore;
    }

    if (rightSummary.averageScore !== leftSummary.averageScore) {
      return rightSummary.averageScore - leftSummary.averageScore;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });

  const selectedSuggestion =
    orderedSuggestions.find((suggestion) => suggestion.id === selectedSuggestionId) ??
    orderedSuggestions[0] ??
    null;

  const activeVoters = new Set(appData.votes.map((vote) => vote.memberId)).size;
  const approvedMemberCount = appData.members.filter(
    (member) => member.approved !== false,
  ).length;
  const isAdmin = currentMember?.role === "admin";
  const canParticipate = Boolean(
    currentMember && (!remoteEnabled || currentMember.approved || isAdmin),
  );
  const isPendingApproval = Boolean(
    remoteEnabled && currentMember && !currentMember.approved && !isAdmin,
  );
  const pendingOnlyMode = remoteEnabled && isPendingApproval;
  const isOwnSelectedSuggestion = Boolean(
    currentMember &&
      selectedSuggestion &&
      currentMember.id === selectedSuggestion.memberId,
  );
  const currentSelectedVote = selectedSuggestion
    ? getCurrentMemberVote(selectedSuggestion.id)
    : undefined;

  useEffect(() => {
    if (!remoteEnabled || !sessionMemberId || !isPendingApproval) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void hydrateRemoteState();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPendingApproval, remoteEnabled, sessionMemberId]);

  useEffect(() => {
    if (!remoteEnabled || isBootingRemote) {
      return;
    }

    if (!currentMember && !isPendingApproval) {
      router.replace("/");
    }
  }, [currentMember, isBootingRemote, isPendingApproval, remoteEnabled, router]);

  useEffect(() => {
    if (!selectedSuggestionId && appData.suggestions[0]) {
      setSelectedSuggestionId(appData.suggestions[0].id);
      return;
    }

    if (
      selectedSuggestionId &&
      !appData.suggestions.some((suggestion) => suggestion.id === selectedSuggestionId)
    ) {
      setSelectedSuggestionId(appData.suggestions[0]?.id ?? null);
    }
  }, [appData.suggestions, selectedSuggestionId]);

  useEffect(() => {
    if (!selectedSuggestion || !isSuggestionModalOpen) {
      setModalAssets([]);
      setIsLoadingModalAssets(false);
      return;
    }

    if (!remoteEnabled) {
      setModalAssets(
        appData.assets.filter((asset) => asset.suggestionId === selectedSuggestion.id),
      );
      setIsLoadingModalAssets(false);
      return;
    }

    let isActive = true;
    setIsLoadingModalAssets(true);

    void fetchSuggestionAssetsForSuggestion(
      selectedSuggestion.id,
      selectedSuggestion.memberId,
    )
      .then((result) => {
        if (!isActive) {
          return;
        }

        setModalAssets(result.assets);
      })
      .catch(async (error) => {
        if (!isActive) {
          return;
        }

        if (await handleSessionTimeout(error)) {
          return;
        }

        setSuggestionError(getAuthErrorMessage(error));
        setModalAssets([]);
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingModalAssets(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [appData.assets, isSuggestionModalOpen, remoteEnabled, selectedSuggestion]);

  async function handleSessionTimeout(error: unknown) {
    if (!remoteEnabled || !isSessionTimeoutError(error)) {
      return false;
    }

    setSessionMemberId(null);
    setAppData(emptyAppData);
    setSelectedSuggestionId(null);
    setModalAssets([]);
    setIsLoadingModalAssets(false);
    setIsSuggestionModalOpen(false);
    setPreviewAsset(null);
    setSuggestionError("");
    clearSessionMemberId();
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("auth_timeout_notice", "1");
    }
    router.replace("/?reason=session-timeout");
    return true;
  }

  async function hydrateRemoteState() {
    setIsBootingRemote(true);

    try {
      const sessionMember = await getRemoteSessionMember();

      if (!sessionMember) {
        setSessionMemberId(null);
        setAppData(emptyAppData);
        setSelectedSuggestionId(null);
        return;
      }

      setSessionMemberId(sessionMember.id);

      if (!sessionMember.approved && sessionMember.role !== "admin") {
        setAppData({
          ...emptyAppData,
          members: [sessionMember],
        });
        setSelectedSuggestionId(null);
        return;
      }

      const nextData = await fetchRemoteAppData();
      setAppData(nextData);
      setSelectedSuggestionId((current) => current ?? nextData.suggestions[0]?.id ?? null);
    } catch (error) {
      if (await handleSessionTimeout(error)) {
        return;
      }

      setSuggestionError(getAuthErrorMessage(error));
    } finally {
      setIsBootingRemote(false);
    }
  }

  function validateSuggestionTitle(title: string) {
    if (title.trim().length < 2) {
      setSuggestionError("Isim onerisi en az 2 karakter olmali.");
      return false;
    }

    return true;
  }

  async function handleAddSuggestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentMember) {
      setSuggestionError("Once giris yapman gerekiyor.");
      return;
    }

    if (!canParticipate) {
      setSuggestionError("Admin onayi gelene kadar islem yapamazsin.");
      return;
    }

    const title = suggestionDraft.title.trim();
    const note = suggestionDraft.note.trim();

    if (!validateSuggestionTitle(title)) {
      return;
    }

    const suggestionCount = appData.suggestions.filter(
      (suggestion) => suggestion.memberId === currentMember.id,
    ).length;

    if (suggestionCount >= MAX_SUGGESTIONS_PER_MEMBER) {
      setSuggestionError("Her kisi en fazla 3 oneride bulunabilir.");
      return;
    }

    if (remoteEnabled) {
      setIsSubmitting(true);

      try {
        await addRemoteSuggestion(title, note);
        await hydrateRemoteState();
        setSuggestionDraft(emptySuggestionDraft);
        setSuggestionError("");
      } catch (error) {
        if (await handleSessionTimeout(error)) {
          return;
        }

        setSuggestionError(getAuthErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    const nextSuggestion: Suggestion = {
      id: createId("suggestion"),
      title,
      note,
      memberId: currentMember.id,
      createdAt: new Date().toISOString(),
    };

    setAppData((current) => ({
      ...current,
      suggestions: [nextSuggestion, ...current.suggestions],
    }));
    setSuggestionDraft(emptySuggestionDraft);
    setSuggestionError("");
    setSelectedSuggestionId(nextSuggestion.id);
  }

  async function handleVote(suggestionId: string, value: number) {
    if (!currentMember || !canParticipate) {
      return;
    }

    const targetSuggestion = appData.suggestions.find(
      (suggestion) => suggestion.id === suggestionId,
    );

    if (targetSuggestion && targetSuggestion.memberId === currentMember.id) {
      setSuggestionError("Kendi onerine puan veremezsin.");
      return;
    }

    const safeValue = clampVote(value);

    if (remoteEnabled) {
      setIsSubmitting(true);

      try {
        await upsertRemoteVote(suggestionId, safeValue);
        await hydrateRemoteState();
      } catch (error) {
        if (await handleSessionTimeout(error)) {
          return;
        }

        setSuggestionError(getAuthErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    setAppData((current) => {
      const existingVoteIndex = current.votes.findIndex(
        (vote) =>
          vote.memberId === currentMember.id && vote.suggestionId === suggestionId,
      );

      if (existingVoteIndex === -1) {
        return {
          ...current,
          votes: [
            ...current.votes,
            {
              memberId: currentMember.id,
              suggestionId,
              value: safeValue,
              updatedAt: new Date().toISOString(),
            },
          ],
        };
      }

      const nextVotes = [...current.votes];
      nextVotes[existingVoteIndex] = {
        ...nextVotes[existingVoteIndex],
        value: safeValue,
        updatedAt: new Date().toISOString(),
      };

      return {
        ...current,
        votes: nextVotes,
      };
    });
  }

  async function handleClearVote(suggestionId: string) {
    if (!currentMember) {
      return;
    }

    if (remoteEnabled) {
      setIsSubmitting(true);

      try {
        await deleteRemoteVote(suggestionId);
        await hydrateRemoteState();
      } catch (error) {
        if (await handleSessionTimeout(error)) {
          return;
        }

        setSuggestionError(getAuthErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    setAppData((current) => ({
      ...current,
      votes: current.votes.filter(
        (vote) =>
          !(vote.memberId === currentMember.id && vote.suggestionId === suggestionId),
      ),
    }));
  }

  async function handleCommentSubmit(
    event: FormEvent<HTMLFormElement>,
    suggestionId: string,
  ) {
    event.preventDefault();

    if (!currentMember || !canParticipate) {
      return;
    }

    const message = (commentDrafts[suggestionId] ?? "").trim();

    if (!message) {
      return;
    }

    if (remoteEnabled) {
      setIsSubmitting(true);

      try {
        await addRemoteComment(suggestionId, message);
        await hydrateRemoteState();
        setCommentDrafts((current) => ({ ...current, [suggestionId]: "" }));
      } catch (error) {
        if (await handleSessionTimeout(error)) {
          return;
        }

        setSuggestionError(getAuthErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    const nextComment: Comment = {
      id: createId("comment"),
      suggestionId,
      memberId: currentMember.id,
      message,
      createdAt: new Date().toISOString(),
    };

    setAppData((current) => ({
      ...current,
      comments: [nextComment, ...current.comments],
    }));
    setCommentDrafts((current) => ({ ...current, [suggestionId]: "" }));
  }

  function handleCommentDraftChange(suggestionId: string, value: string) {
    setCommentDrafts((current) => ({ ...current, [suggestionId]: value }));
  }

  async function handleDeleteSuggestion(suggestionId: string) {
    const shouldDelete = window.confirm("Bu oneriyi silmek istiyor musun?");

    if (!shouldDelete) {
      return;
    }

    if (remoteEnabled) {
      setIsSubmitting(true);

      try {
        await deleteRemoteSuggestion(suggestionId);
        await hydrateRemoteState();
        if (editingSuggestionId === suggestionId) {
          setEditingSuggestionId(null);
          setEditingSuggestionNote("");
        }
      } catch (error) {
        if (await handleSessionTimeout(error)) {
          return;
        }

        setSuggestionError(getAuthErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    setAppData((current) => ({
      ...current,
      suggestions: current.suggestions.filter((suggestion) => suggestion.id !== suggestionId),
      votes: current.votes.filter((vote) => vote.suggestionId !== suggestionId),
      comments: current.comments.filter((comment) => comment.suggestionId !== suggestionId),
    }));

    if (editingSuggestionId === suggestionId) {
      setEditingSuggestionId(null);
      setEditingSuggestionNote("");
    }
  }

  function startSuggestionNoteEdit(suggestion: Suggestion) {
    if (!canEditSuggestionNote(suggestion)) {
      return;
    }

    setEditingSuggestionId(suggestion.id);
    setEditingSuggestionNote(suggestion.note);
    setSuggestionError("");
  }

  function cancelSuggestionNoteEdit() {
    setEditingSuggestionId(null);
    setEditingSuggestionNote("");
  }

  async function handleSuggestionNoteSave(
    event: FormEvent<HTMLFormElement>,
    suggestionId: string,
  ) {
    event.preventDefault();

    const targetSuggestion = appData.suggestions.find(
      (suggestion) => suggestion.id === suggestionId,
    );

    if (!targetSuggestion || !canEditSuggestionNote(targetSuggestion)) {
      return;
    }

    const nextNote = editingSuggestionNote.trim();

    if (remoteEnabled) {
      setIsSubmitting(true);

      try {
        await updateRemoteSuggestionNote(suggestionId, nextNote);
        await hydrateRemoteState();
        cancelSuggestionNoteEdit();
      } catch (error) {
        if (await handleSessionTimeout(error)) {
          return;
        }

        setSuggestionError(getAuthErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    setAppData((current) => ({
      ...current,
      suggestions: current.suggestions.map((suggestion) =>
        suggestion.id === suggestionId ? { ...suggestion, note: nextNote } : suggestion,
      ),
    }));
    cancelSuggestionNoteEdit();
  }

  async function handleDeleteComment(commentId: string) {
    const shouldDelete = window.confirm("Bu yorumu silmek istiyor musun?");

    if (!shouldDelete) {
      return;
    }

    if (remoteEnabled) {
      setIsSubmitting(true);

      try {
        await deleteRemoteComment(commentId);
        await hydrateRemoteState();
      } catch (error) {
        if (await handleSessionTimeout(error)) {
          return;
        }

        setSuggestionError(getAuthErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    setAppData((current) => ({
      ...current,
      comments: current.comments.filter((comment) => comment.id !== commentId),
    }));
  }

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as unknown;

        if (!isAppData(parsed)) {
          throw new Error("Beklenen veri yapisi bulunamadi.");
        }

        setAppData(parsed);
      } catch {
        window.alert("JSON dosyasi okunamadi.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(appData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "takim-ismi-oylari.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    const shouldReset = window.confirm(
      "Tum oy, yorum ve onerileri bastan yuklemek istiyor musun?",
    );

    if (!shouldReset) {
      return;
    }

    const resetData = getInitialAppData();
    setAppData(resetData);
    setSelectedSuggestionId(resetData.suggestions[0]?.id ?? null);
  }

  function getCurrentMemberVote(suggestionId: string) {
    if (!currentMember) {
      return undefined;
    }

    return appData.votes.find(
      (vote) =>
        vote.memberId === currentMember.id && vote.suggestionId === suggestionId,
    )?.value;
  }

  function canDeleteSuggestion(suggestion: Suggestion) {
    if (!currentMember) {
      return false;
    }

    return currentMember.id === suggestion.memberId || isAdmin;
  }

  function canEditSuggestionNote(suggestion: Suggestion) {
    if (!currentMember) {
      return false;
    }

    return currentMember.id === suggestion.memberId;
  }

  function canManageComment(comment: Comment) {
    if (!currentMember) {
      return false;
    }

    return currentMember.id === comment.memberId || isAdmin;
  }

  function getMemberLabel(memberId: string) {
    const member = membersById[memberId];

    if (!member) {
      return "Bilinmeyen uye";
    }

    return member.username ?? member.name;
  }

  async function handleAssetUpload(suggestionId: string, file: File) {
    if (!remoteEnabled) {
      setSuggestionError("Gorsel yukleme sadece Supabase modunda aktif.");
      return;
    }

    if (!isAllowedAssetFile(file)) {
      setSuggestionError("Yalnizca SVG, PNG veya JPG/JPEG dosyasi yukleyebilirsin.");
      return;
    }

    if (file.size > 400 * 1024) {
      setSuggestionError("Gorsel dosyasi 400 KB sinirini asamaz.");
      return;
    }

    setIsSubmitting(true);
    setSuggestionError("");

    try {
      await uploadRemoteSuggestionAsset(suggestionId, file);
      await hydrateRemoteState();
      if (selectedSuggestion && selectedSuggestion.id === suggestionId) {
        const result = await fetchSuggestionAssetsForSuggestion(
          selectedSuggestion.id,
          selectedSuggestion.memberId,
        );
        setModalAssets(result.assets);
      }
    } catch (error) {
      if (await handleSessionTimeout(error)) {
        return;
      }

      setSuggestionError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAssetDelete(asset: SuggestionAsset) {
    const shouldDelete = window.confirm("Bu gorsel dosyasini silmek istiyor musun?");

    if (!shouldDelete) {
      return;
    }

    setIsSubmitting(true);
    setSuggestionError("");

    try {
      await deleteRemoteSuggestionAsset(asset);
      if (previewAsset?.id === asset.id) {
        setPreviewAsset(null);
      }
      await hydrateRemoteState();
      if (selectedSuggestion) {
        const result = await fetchSuggestionAssetsForSuggestion(
          selectedSuggestion.id,
          selectedSuggestion.memberId,
        );
        setModalAssets(result.assets);
      }
    } catch (error) {
      if (await handleSessionTimeout(error)) {
        return;
      }

      setSuggestionError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function canDeleteAsset(asset: SuggestionAsset) {
    if (!currentMember) {
      return false;
    }

    return currentMember.id === asset.memberId || isAdmin;
  }

  async function handleSuggestionSelect(suggestionId: string) {
    if (!remoteEnabled) {
      setSelectedSuggestionId(suggestionId);
      setIsSuggestionModalOpen(true);
      return;
    }

    try {
      const targetSuggestion = appData.suggestions.find(
        (suggestion) => suggestion.id === suggestionId,
      );
      await recordRemoteActivity("suggestion_open", "suggestion", suggestionId, {
        suggestionTitle: targetSuggestion?.title ?? "",
      });
      setSelectedSuggestionId(suggestionId);
      setIsSuggestionModalOpen(true);
    } catch (error) {
      if (await handleSessionTimeout(error)) {
        return;
      }

      setSuggestionError(getAuthErrorMessage(error));
    }
  }

  function handleAssetPreview(asset: SuggestionAsset) {
    setPreviewAsset(asset);
  }

  const canUploadAssets = Boolean(
    remoteEnabled &&
      currentMember &&
      selectedSuggestion &&
      currentMember.id === selectedSuggestion.memberId &&
      canParticipate,
  );

  if (remoteEnabled && isBootingRemote && !currentMember) {
    return (
      <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <main className="mx-auto grid max-w-7xl gap-6">
          <HeroSection
            showDemoBadge={false}
            showStats={false}
            memberCount={0}
            suggestionCount={0}
            activeVoters={0}
            commentCount={0}
          />
          <Panel>
            <EmptyState
              title="Oturum yukleniyor."
              description="Gecerli oturumun kontrol ediliyor. Birazdan panele gecilecek."
            />
          </Panel>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <main className="mx-auto grid max-w-7xl gap-6">
        <HeroSection
          showDemoBadge={!remoteEnabled}
          showStats={!pendingOnlyMode}
          memberCount={approvedMemberCount}
          suggestionCount={appData.suggestions.length}
          activeVoters={activeVoters}
          commentCount={appData.comments.length}
        />

        {!remoteEnabled ? (
          <LocalToolsPanel
            onExport={handleExport}
            onImport={handleImport}
            onReset={handleReset}
          />
        ) : null}

        {pendingOnlyMode ? (
          <Panel>
            <EmptyState
              title="Onay bekleniyor."
              description="Admin onayi gelince oneriler, yorumlar ve puanlama ekrani otomatik olarak acilacak."
            />
          </Panel>
        ) : (
          <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)] xl:items-start">
            <div className="grid gap-6">
              <SuggestionComposer
                remoteEnabled={remoteEnabled}
                canParticipate={canParticipate}
                isSubmitting={isSubmitting}
                draft={suggestionDraft}
                error={suggestionError}
                maxSuggestionsPerMember={MAX_SUGGESTIONS_PER_MEMBER}
                onChange={(field, value) =>
                  setSuggestionDraft((current) => ({ ...current, [field]: value }))
                }
                onSubmit={(event) => void handleAddSuggestion(event)}
              />
            </div>

            <SuggestionListPanel
              suggestions={orderedSuggestions}
              votes={appData.votes}
              remoteEnabled={remoteEnabled}
              currentMemberId={currentMember?.id ?? null}
              isPendingApproval={isPendingApproval}
              selectedSuggestionId={
                isSuggestionModalOpen ? selectedSuggestion?.id ?? null : null
              }
              getMemberLabel={getMemberLabel}
              getCurrentMemberVote={getCurrentMemberVote}
              onSelect={(suggestionId) => {
                void handleSuggestionSelect(suggestionId);
              }}
            />
          </section>
        )}
      </main>

      {isSuggestionModalOpen && selectedSuggestion ? (
        <ModalShell
          title={selectedSuggestion.title}
          onClose={() => {
            setIsSuggestionModalOpen(false);
            setModalAssets([]);
            setIsLoadingModalAssets(false);
            setPreviewAsset(null);
          }}
          className="sm:max-w-6xl"
        >
          <SuggestionDetailPanel
            suggestion={selectedSuggestion}
            votes={appData.votes}
            comments={appData.comments}
            assets={modalAssets}
            embedded
            remoteEnabled={remoteEnabled}
            canParticipate={canParticipate}
            isPendingApproval={isPendingApproval}
            isOwnSuggestion={isOwnSelectedSuggestion}
            currentSelectedVote={currentSelectedVote}
            editingSuggestionId={editingSuggestionId}
            editingSuggestionNote={editingSuggestionNote}
            commentDraft={selectedSuggestion ? commentDrafts[selectedSuggestion.id] ?? "" : ""}
            suggestionError={suggestionError}
            isSubmitting={isSubmitting}
            getMemberLabel={getMemberLabel}
            canDeleteSuggestion={canDeleteSuggestion}
            canEditSuggestionNote={canEditSuggestionNote}
            canManageComment={canManageComment}
            canUploadAssets={canUploadAssets}
            canDeleteAsset={canDeleteAsset}
            onDeleteSuggestion={(suggestionId) => void handleDeleteSuggestion(suggestionId)}
            onDeleteComment={(commentId) => void handleDeleteComment(commentId)}
            onUploadAsset={(suggestionId, file) => void handleAssetUpload(suggestionId, file)}
            onDeleteAsset={(asset) => void handleAssetDelete(asset)}
            onPreviewAsset={(asset) => {
              handleAssetPreview(asset);
            }}
            onStartEdit={startSuggestionNoteEdit}
            onCancelEdit={cancelSuggestionNoteEdit}
            onEditNoteChange={setEditingSuggestionNote}
            onSaveNote={(event, suggestionId) =>
              void handleSuggestionNoteSave(event, suggestionId)
            }
            onVote={(suggestionId, value) => void handleVote(suggestionId, value)}
            onClearVote={(suggestionId) => void handleClearVote(suggestionId)}
            onCommentDraftChange={handleCommentDraftChange}
            onSubmitComment={(event, suggestionId) =>
              void handleCommentSubmit(event, suggestionId)
            }
            minVote={MIN_VOTE}
            maxVote={MAX_VOTE}
            assetsLoading={isLoadingModalAssets}
          />
        </ModalShell>
      ) : null}

      {previewAsset ? (
        <ModalShell
          title="Gorsel onizleme"
          onClose={() => setPreviewAsset(null)}
          className="sm:max-w-4xl"
        >
          <div className="flex min-h-[40vh] items-center justify-center rounded-[28px] border border-[rgba(141,106,232,0.12)] bg-[radial-gradient(circle_at_top,rgba(217,106,167,0.12),transparent_48%),radial-gradient(circle_at_bottom,rgba(98,180,131,0.1),transparent_42%),linear-gradient(180deg,rgba(255,248,252,0.98),rgba(246,241,255,0.95))] p-6">
            <img
              src={previewAsset.publicUrl}
              alt="Gorsel onizleme"
              className="max-h-[68vh] max-w-full object-contain"
            />
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}

export default App;
