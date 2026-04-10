import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import {
  ADMIN_USERNAME,
  getAuthErrorMessage,
  getPasswordRuleText,
  isValidPassword,
  isValidUsername,
} from "./auth";
import {
  addRemoteComment,
  addRemoteSuggestion,
  deleteRemoteComment,
  deleteRemoteSuggestion,
  deleteRemoteVote,
  fetchPendingMembers,
  fetchRemoteAppData,
  getRemoteSessionMember,
  rejectRemoteMember,
  signInWithUsernamePassword,
  signOutRemote,
  signUpPendingMember,
  updateMemberApproval,
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
import type { AppData, Comment, Member, Suggestion, Vote } from "./types";
import {
  clampVote,
  createId,
  formatDate,
  getInitialAppData,
  getMemberSuggestionCount,
  getSuggestionComments,
  getSuggestionSummary,
  getSuggestionVotes,
} from "./utils";

type SuggestionDraft = {
  title: string;
  note: string;
};

type LocalLoginDraft = {
  memberId: string;
  accessCode: string;
};

type RemoteLoginDraft = {
  username: string;
  password: string;
};

type RegisterDraft = {
  username: string;
  password: string;
};

type AuthView = "login" | "register";

const emptyAppData: AppData = {
  members: [],
  suggestions: [],
  votes: [],
  comments: [],
};

const emptySuggestionDraft: SuggestionDraft = {
  title: "",
  note: "",
};

const emptyLocalLoginDraft: LocalLoginDraft = {
  memberId: initialAppData.members[0]?.id ?? "",
  accessCode: "",
};

const emptyRemoteLoginDraft: RemoteLoginDraft = {
  username: "",
  password: "",
};

const emptyRegisterDraft: RegisterDraft = {
  username: "",
  password: "",
};

function App() {
  const remoteEnabled = hasSupabaseConfig;
  const [appData, setAppData] = useState<AppData>(() =>
    remoteEnabled ? emptyAppData : loadAppData(),
  );
  const [sessionMemberId, setSessionMemberId] = useState<string | null>(() =>
    remoteEnabled ? null : loadSessionMemberId(),
  );
  const [localLoginDraft, setLocalLoginDraft] =
    useState<LocalLoginDraft>(emptyLocalLoginDraft);
  const [remoteLoginDraft, setRemoteLoginDraft] =
    useState<RemoteLoginDraft>(emptyRemoteLoginDraft);
  const [registerDraft, setRegisterDraft] =
    useState<RegisterDraft>(emptyRegisterDraft);
  const [suggestionDraft, setSuggestionDraft] =
    useState<SuggestionDraft>(emptySuggestionDraft);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(
    () => (remoteEnabled ? null : initialAppData.suggestions[0]?.id ?? null),
  );
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [authView, setAuthView] = useState<AuthView>("login");
  const [loginError, setLoginError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [suggestionError, setSuggestionError] = useState("");
  const [adminError, setAdminError] = useState("");
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
      return;
    }

    void hydrateRemoteState();
  }, [remoteEnabled]);

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
  const isAdmin = currentMember?.role === "admin";
  const canParticipate = Boolean(
    currentMember && (!remoteEnabled || currentMember.approved || isAdmin),
  );
  const isPendingApproval = Boolean(
    remoteEnabled && currentMember && !currentMember.approved && !isAdmin,
  );
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

  async function hydrateRemoteState() {
    setIsBootingRemote(true);
    setLoginError("");

    try {
      const sessionMember = await getRemoteSessionMember();

      if (!sessionMember) {
        setSessionMemberId(null);
        setAppData(emptyAppData);
        setPendingMembers([]);
        setSelectedSuggestionId(null);
        return;
      }

      const nextData = await fetchRemoteAppData();
      setAppData(nextData);
      setSessionMemberId(sessionMember.id);
      setSelectedSuggestionId((current) => current ?? nextData.suggestions[0]?.id ?? null);

      if (sessionMember.role === "admin") {
        setPendingMembers(await fetchPendingMembers());
      } else {
        setPendingMembers([]);
      }
    } catch (error) {
      setLoginError(getAuthErrorMessage(error));
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

  function validateRemotePassword(password: string) {
    if (!isValidPassword(password)) {
      throw new Error(getPasswordRuleText());
    }
  }

  function handleLocalLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const targetMember = appData.members.find(
      (member) => member.id === localLoginDraft.memberId,
    );

    if (!targetMember || targetMember.accessCode !== localLoginDraft.accessCode.trim()) {
      setLoginError("Isim ya da giris kodu hatali.");
      return;
    }

    setSessionMemberId(targetMember.id);
    setLoginError("");
    setAuthNotice("");
    setLocalLoginDraft((current) => ({ ...current, accessCode: "" }));
  }

  async function handleRemoteLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setLoginError("");
    setAuthNotice("");

    try {
      if (!isValidUsername(remoteLoginDraft.username)) {
        throw new Error(
          "Kullanici adi 3-24 karakter olmali ve sadece kucuk harf, rakam, nokta, tire veya alt cizgi icermeli.",
        );
      }

      validateRemotePassword(remoteLoginDraft.password);

      await signInWithUsernamePassword(
        remoteLoginDraft.username,
        remoteLoginDraft.password,
      );
      await hydrateRemoteState();
      setRemoteLoginDraft(emptyRemoteLoginDraft);
      setAuthNotice("Giris yapildi.");
    } catch (error) {
      setLoginError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setLoginError("");
    setAuthNotice("");

    try {
      if (!isValidUsername(registerDraft.username)) {
        throw new Error(
          "Kullanici adi 3-24 karakter olmali ve sadece kucuk harf, rakam, nokta, tire veya alt cizgi icermeli.",
        );
      }

      validateRemotePassword(registerDraft.password);

      await signUpPendingMember(registerDraft);
      await hydrateRemoteState();
      setRegisterDraft(emptyRegisterDraft);
      setAuthView("login");
      setAuthNotice(
        registerDraft.username.trim().toLowerCase() === ADMIN_USERNAME
          ? "Admin hesabi acildi."
          : "Kayit tamamlandi. Admin onayi bekleniyor.",
      );
    } catch (error) {
      setLoginError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    if (remoteEnabled) {
      setIsSubmitting(true);

      try {
        await signOutRemote();
        setSessionMemberId(null);
        setAppData(emptyAppData);
        setPendingMembers([]);
        setSelectedSuggestionId(null);
        setAuthNotice("Cikis yapildi.");
      } catch (error) {
        setLoginError(getAuthErrorMessage(error));
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    setSessionMemberId(null);
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

    const suggestionCount = getMemberSuggestionCount(
      appData.suggestions,
      currentMember.id,
    );

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
          !(
            vote.memberId === currentMember.id &&
            vote.suggestionId === suggestionId
          ),
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
      } catch (error) {
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

  async function handleApproval(memberId: string, approved: boolean) {
    setAdminError("");
    setAuthNotice("");
    setIsSubmitting(true);

    try {
      await updateMemberApproval(memberId, approved);
      await hydrateRemoteState();
      setAuthNotice(approved ? "Uye onaylandi." : "Uye tekrar beklemeye alindi.");
    } catch (error) {
      setAdminError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRejectMember(memberId: string) {
    const shouldReject = window.confirm(
      "Bu uyeligi reddedip tum kaydini silmek istiyor musun?",
    );

    if (!shouldReject) {
      return;
    }

    setAdminError("");
    setAuthNotice("");
    setIsSubmitting(true);

    try {
      await rejectRemoteMember(memberId);
      await hydrateRemoteState();
      setAuthNotice("Uyelik reddedildi.");
    } catch (error) {
      setAdminError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
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

  function canManageSuggestion(suggestion: Suggestion) {
    if (!currentMember) {
      return false;
    }

    return currentMember.id === suggestion.memberId || isAdmin;
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

  return (
    <div className="app-shell">
      <main className="page">
        <section className="hero">
          <div className="hero-copy">
            {!remoteEnabled ? <span className="eyebrow">Local demo modu</span> : null}
            <h1>Voleybol takim adini birlikte secin.</h1>
            <p>
              Herkes en fazla 3 isim onerisi girebilir, tum oneriler 1 ile 5
              arasinda puanlanabilir, yorum yapilabilir ve kim hangi puani vermis
              tek ekranda gorulebilir.
            </p>
          </div>
          <div className="hero-stats">
            <article className="stat-card">
              <span>Uye</span>
              <strong>{appData.members.filter((member) => member.approved !== false).length}</strong>
            </article>
            <article className="stat-card">
              <span>Oneri</span>
              <strong>{appData.suggestions.length}</strong>
            </article>
            <article className="stat-card">
              <span>Aktif oylayan</span>
              <strong>{activeVoters}</strong>
            </article>
            <article className="stat-card">
              <span>Yorum</span>
              <strong>{appData.comments.length}</strong>
            </article>
          </div>
        </section>

        {!remoteEnabled ? (
          <section className="notice-panel">
            <div>
              <h2>Bu ilk surum nasil calisiyor?</h2>
              <p>
                Bu prototip verileri tarayici icindeki local storage alaninda
                tutuyor. Gercek ortak kullanim icin .env dosyasina Supabase URL ve
                key eklemen yeterli.
              </p>
            </div>
            <div className="notice-actions">
              <button type="button" className="secondary-button" onClick={handleExport}>
                JSON disa aktar
              </button>
              <label className="secondary-button file-button">
                JSON ice aktar
                <input type="file" accept="application/json" onChange={handleImport} />
              </label>
              <button type="button" className="ghost-button" onClick={handleReset}>
                Demo verisini sifirla
              </button>
            </div>
          </section>
        ) : null}

        <section className="layout-grid">
          <div className="column-stack">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>{remoteEnabled ? "Hesap" : "Giris"}</h2>
                  {!remoteEnabled ? (
                    <p>Su anki yerel surumde uye bilgileri kod icinde tutuluyor.</p>
                  ) : null}
                </div>
                {currentMember ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => void handleLogout()}
                    disabled={isSubmitting}
                  >
                    Cikis yap
                  </button>
                ) : null}
              </div>

              {isBootingRemote ? (
                <p className="muted-text">Supabase oturumu kontrol ediliyor...</p>
              ) : currentMember ? (
                <>
                  <div className="current-member">
                    <span>Aktif kisi</span>
                    <strong>{currentMember.username ?? currentMember.name}</strong>
                    <small>
                      @{currentMember.username ?? "yerel"} - {currentMember.role}
                    </small>
                    <small>
                      {remoteEnabled
                        ? currentMember.approved || isAdmin
                          ? "Durum: onayli"
                          : "Durum: onay bekliyor"
                        : `${getMemberSuggestionCount(appData.suggestions, currentMember.id)}/${MAX_SUGGESTIONS_PER_MEMBER} onerini kullandin.`}
                    </small>
                  </div>
                  {isPendingApproval ? (
                    <div className="warning-card">
                      <strong>Onay bekleniyor</strong>
                      <p>
                        Kaydin alindi. Admin onay verene kadar oy, yorum ve isim onerisi
                        gonderemezsin.
                      </p>
                    </div>
                  ) : null}
                </>
              ) : remoteEnabled ? (
                <>
                  <div className="auth-switch">
                    <button
                      type="button"
                      className={authView === "login" ? "auth-tab is-active" : "auth-tab"}
                      onClick={() => setAuthView("login")}
                    >
                      Giris
                    </button>
                    <button
                      type="button"
                      className={authView === "register" ? "auth-tab is-active" : "auth-tab"}
                      onClick={() => setAuthView("register")}
                    >
                      Kayit
                    </button>
                  </div>

                  {authView === "login" ? (
                    <form className="stack-form" onSubmit={handleRemoteLoginSubmit}>
                      <label>
                        Kullanici adi
                        <input
                          type="text"
                          value={remoteLoginDraft.username}
                          placeholder="ornek: mert"
                          onChange={(event) =>
                            setRemoteLoginDraft((current) => ({
                              ...current,
                              username: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        Sifre
                        <input
                          type="password"
                          value={remoteLoginDraft.password}
                          onChange={(event) =>
                            setRemoteLoginDraft((current) => ({
                              ...current,
                              password: event.target.value,
                            }))
                          }
                        />
                      </label>
                      {loginError ? <p className="error-text">{loginError}</p> : null}
                      {authNotice ? <p className="success-text">{authNotice}</p> : null}
                      <button
                        type="submit"
                        className="primary-button"
                        disabled={isSubmitting}
                      >
                        Giris yap
                      </button>
                    </form>
                  ) : (
                    <form className="stack-form" onSubmit={handleRegisterSubmit}>
                      <label>
                        Kullanici adi
                        <input
                          type="text"
                          value={registerDraft.username}
                          placeholder="kullanici adin"
                          onChange={(event) =>
                            setRegisterDraft((current) => ({
                              ...current,
                              username: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        Sifre
                        <input
                          type="password"
                          value={registerDraft.password}
                          onChange={(event) =>
                            setRegisterDraft((current) => ({
                              ...current,
                              password: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <p className="muted-text">
                        {getPasswordRuleText()}
                      </p>
                      {loginError ? <p className="error-text">{loginError}</p> : null}
                      {authNotice ? <p className="success-text">{authNotice}</p> : null}
                      <button
                        type="submit"
                        className="primary-button"
                        disabled={isSubmitting}
                      >
                        Kaydi tamamla
                      </button>
                    </form>
                  )}
                </>
              ) : (
                <form className="stack-form" onSubmit={handleLocalLoginSubmit}>
                  <label>
                    Kisi
                    <select
                      value={localLoginDraft.memberId}
                      onChange={(event) =>
                        setLocalLoginDraft((current) => ({
                          ...current,
                          memberId: event.target.value,
                        }))
                      }
                    >
                      {appData.members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Giris kodu
                    <input
                      type="password"
                      inputMode="numeric"
                      value={localLoginDraft.accessCode}
                      placeholder="Ornek: 2001"
                      onChange={(event) =>
                        setLocalLoginDraft((current) => ({
                          ...current,
                          accessCode: event.target.value,
                        }))
                      }
                    />
                  </label>
                  {loginError ? <p className="error-text">{loginError}</p> : null}
                  <button type="submit" className="primary-button">
                    Giris yap
                  </button>
                </form>
              )}
            </section>

            {isAdmin && remoteEnabled ? (
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Onay bekleyen uyeler</h2>
                    <p>
                      Yeni kayit olanlar burada gorunur. Onay verdiginde uygulamayi
                      kullanmaya baslarlar.
                    </p>
                  </div>
                </div>

                {adminError ? <p className="error-text">{adminError}</p> : null}
                {authNotice ? <p className="success-text">{authNotice}</p> : null}

                <div className="invite-list">
                      {pendingMembers.length === 0 ? (
                        <p className="muted-text">Su an onay bekleyen uye yok.</p>
                      ) : (
                        pendingMembers.map((member) => (
                          <article key={member.id} className="invite-card">
                            <div className="invite-head">
                              <strong>@{member.username ?? member.name}</strong>
                              <span>{member.role}</span>
                            </div>
                            <div className="inline-actions">
                              <button
                                type="button"
                                className="primary-button"
                                onClick={() => void handleApproval(member.id, true)}
                                disabled={isSubmitting}
                              >
                                Onayla
                              </button>
                              <button
                                type="button"
                                className="ghost-button danger-button"
                                onClick={() => void handleRejectMember(member.id)}
                                disabled={isSubmitting}
                              >
                                Reddet
                              </button>
                            </div>
                          </article>
                        ))
                      )}
                </div>
              </section>
            ) : null}

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Yeni isim onerisi</h2>
                  <p>
                    Kisi basi en fazla {MAX_SUGGESTIONS_PER_MEMBER} oneriyi sinirli
                    tutuyoruz ki liste dagilmasin.
                  </p>
                </div>
              </div>
              <form className="stack-form" onSubmit={(event) => void handleAddSuggestion(event)}>
                <label>
                  Takim ismi
                  <input
                    type="text"
                    maxLength={40}
                    value={suggestionDraft.title}
                    placeholder="Ornek: Blok Cizgisi"
                    onChange={(event) =>
                      setSuggestionDraft((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    disabled={!canParticipate && remoteEnabled}
                  />
                </label>
                <label>
                  Kisa not
                  <textarea
                    rows={3}
                    maxLength={120}
                    value={suggestionDraft.note}
                    placeholder="Bu ismi neden sevdigini kisaca yazabilirsin."
                    onChange={(event) =>
                      setSuggestionDraft((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    disabled={!canParticipate && remoteEnabled}
                  />
                </label>
                {suggestionError ? <p className="error-text">{suggestionError}</p> : null}
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isSubmitting || (remoteEnabled && !canParticipate)}
                >
                  Oneriyi ekle
                </button>
              </form>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Uyeler</h2>
                  <p>
                    {remoteEnabled
                      ? "Admin tum uyeleri gorur. Onayli uyeler kendi aralarinda listeyi gorur."
                      : "16 kisilik kadroyu su an kod icinden yonetiyoruz."}
                  </p>
                </div>
              </div>
              <div className="member-list">
                {appData.members.length === 0 ? (
                  <p className="muted-text">
                    {remoteEnabled
                      ? "Uyeleri gormek icin once giris yap."
                      : "Henuz uye yok."}
                  </p>
                ) : (
                  appData.members.map((member) => (
                    <article key={member.id} className="member-chip">
                      <strong>@{member.username ?? member.name}</strong>
                      {remoteEnabled ? (
                        <span>{member.approved ? "onayli" : "onay bekliyor"}</span>
                      ) : (
                        <span>
                          {getMemberSuggestionCount(appData.suggestions, member.id)} onerisi
                        </span>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          <section className="panel list-panel">
            <div className="panel-heading">
              <div>
                <h2>Oneri listesi</h2>
                <p>Toplam puan once gelir, esitlikte ortalama ve son eklenen belirler.</p>
              </div>
            </div>

            {orderedSuggestions.length === 0 ? (
              <div className="empty-state">
                <strong>Henuz isim onerisi yok.</strong>
                <p>
                  {remoteEnabled
                    ? currentMember
                      ? isPendingApproval
                        ? "Admin onayindan sonra oneriler burada gorunur."
                        : "Ilk oneriyi ekleyerek listeyi baslatabilirsin."
                      : "Ilk oneriyi eklemek icin once giris yap."
                    : "Ilk oneriyi ekleyerek listeyi baslatabilirsin."}
                </p>
              </div>
            ) : (
              <div className="suggestion-list">
                {orderedSuggestions.map((suggestion, index) => {
                  const summary = getSuggestionSummary(appData.votes, suggestion.id);
                  const isSelected = suggestion.id === selectedSuggestion?.id;
                  const userVote = getCurrentMemberVote(suggestion.id);

                  return (
                    <button
                      key={suggestion.id}
                      type="button"
                      className={`suggestion-card ${isSelected ? "is-selected" : ""}`}
                      onClick={() => setSelectedSuggestionId(suggestion.id)}
                    >
                      <div className="suggestion-head">
                        <div>
                          <span className="suggestion-rank">#{index + 1}</span>
                          <h3>{suggestion.title}</h3>
                        </div>
                        <div className="score-badge">
                          <strong>{summary.totalScore}</strong>
                          <span>toplam puan</span>
                        </div>
                      </div>
                      <p>{suggestion.note || "Ek not girilmedi."}</p>
                      <div className="suggestion-meta">
                        <span>@{getMemberLabel(suggestion.memberId)}</span>
                        <span>{summary.voteCount} oy</span>
                        <span>Ort. {summary.averageScore.toFixed(1)}</span>
                        {userVote ? <span>Senin oyun: {userVote}</span> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="panel detail-panel">
            {selectedSuggestion ? (
              <>
                <div className="panel-heading">
                  <div>
                    <h2>{selectedSuggestion.title}</h2>
                    <p>
                      @{getMemberLabel(selectedSuggestion.memberId)} tarafindan{" "}
                      {formatDate(selectedSuggestion.createdAt)} tarihinde eklendi.
                    </p>
                  </div>
                  {canManageSuggestion(selectedSuggestion) ? (
                    <button
                      type="button"
                      className="ghost-button danger-button"
                      onClick={() => void handleDeleteSuggestion(selectedSuggestion.id)}
                      disabled={isSubmitting}
                    >
                      Oneriyi sil
                    </button>
                  ) : null}
                </div>

                <div className="detail-summary">
                  <article>
                    <span>Toplam puan</span>
                    <strong>
                      {getSuggestionSummary(appData.votes, selectedSuggestion.id).totalScore}
                    </strong>
                  </article>
                  <article>
                    <span>Ortalama</span>
                    <strong>
                      {getSuggestionSummary(appData.votes, selectedSuggestion.id).averageScore.toFixed(1)}
                    </strong>
                  </article>
                  <article>
                    <span>Oy sayisi</span>
                    <strong>
                      {getSuggestionSummary(appData.votes, selectedSuggestion.id).voteCount}
                    </strong>
                  </article>
                </div>

                <div className="detail-block">
                  <h3>Oneri notu</h3>
                  <p>{selectedSuggestion.note || "Bu oneride ek bir not yok."}</p>
                </div>

                <div className="detail-block">
                  <h3>Puan ver</h3>
                  {canParticipate ? (
                    isOwnSelectedSuggestion ? (
                      <p className="muted-text">Kendi onerine puan veremezsin.</p>
                    ) : (
                    <>
                      <div className="vote-grid">
                        {Array.from(
                          { length: MAX_VOTE - MIN_VOTE + 1 },
                          (_, index) => index + MIN_VOTE,
                        ).map((value) => (
                          <button
                            key={value}
                            type="button"
                            className={`vote-button ${
                              currentSelectedVote === value ? "is-active" : ""
                            }`}
                            onClick={() => void handleVote(selectedSuggestion.id, value)}
                            disabled={isSubmitting}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                      {currentSelectedVote ? (
                        <button
                          type="button"
                          className="ghost-button inline-top"
                          onClick={() => void handleClearVote(selectedSuggestion.id)}
                          disabled={isSubmitting}
                        >
                          Oyumu geri al
                        </button>
                      ) : null}
                    </>
                    )
                  ) : (
                    <p className="muted-text">
                      {isPendingApproval
                        ? "Admin onayi gelene kadar oy kullanamazsin."
                        : "Oy kullanmak icin once giris yap."}
                    </p>
                  )}
                </div>

                <div className="detail-block">
                  <h3>Kim hangi puani verdi?</h3>
                  <div className="vote-list">
                    {getSuggestionVotes(appData.votes, selectedSuggestion.id).length === 0 ? (
                      <p className="muted-text">Bu oneride henuz oy yok.</p>
                    ) : (
                      getSuggestionVotes(appData.votes, selectedSuggestion.id)
                        .sort((left, right) => right.value - left.value)
                        .map((vote) => (
                          <article key={`${vote.memberId}-${vote.suggestionId}`} className="vote-row">
                            <strong>@{getMemberLabel(vote.memberId)}</strong>
                            <span>{vote.value} puan</span>
                            <small>{formatDate(vote.updatedAt)}</small>
                          </article>
                        ))
                    )}
                  </div>
                </div>

                <div className="detail-block">
                  <h3>Yorumlar</h3>
                  {canParticipate ? (
                    <form
                      className="comment-form"
                      onSubmit={(event) =>
                        void handleCommentSubmit(event, selectedSuggestion.id)
                      }
                    >
                      <textarea
                        rows={3}
                        maxLength={200}
                        value={commentDrafts[selectedSuggestion.id] ?? ""}
                        placeholder="Bu isim hakkindaki fikrini yaz."
                        onChange={(event) =>
                          handleCommentDraftChange(
                            selectedSuggestion.id,
                            event.target.value,
                          )
                        }
                      />
                      <button
                        type="submit"
                        className="primary-button"
                        disabled={isSubmitting}
                      >
                        Yorumu ekle
                      </button>
                    </form>
                  ) : (
                    <p className="muted-text">
                      {isPendingApproval
                        ? "Admin onayi gelene kadar yorum yapamazsin."
                        : "Yorum yapmak icin once giris yap."}
                    </p>
                  )}

                  <div className="comment-list">
                    {getSuggestionComments(appData.comments, selectedSuggestion.id).length === 0 ? (
                      <p className="muted-text">Bu oneride henuz yorum yok.</p>
                    ) : (
                      getSuggestionComments(appData.comments, selectedSuggestion.id).map(
                        (comment) => (
                          <article key={comment.id} className="comment-card">
                            <div className="comment-meta">
                              <strong>@{getMemberLabel(comment.memberId)}</strong>
                              <span>{formatDate(comment.createdAt)}</span>
                            </div>
                            <p>{comment.message}</p>
                            {canManageComment(comment) ? (
                              <button
                                type="button"
                                className="ghost-button inline-top danger-button"
                                onClick={() => void handleDeleteComment(comment.id)}
                                disabled={isSubmitting}
                              >
                                Yorumu sil
                              </button>
                            ) : null}
                          </article>
                        ),
                      )
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <strong>Detay gormek icin bir isim sec.</strong>
                <p>Listeye ilk oneriyi ekledikten sonra detaylar burada acilir.</p>
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

export default App;
