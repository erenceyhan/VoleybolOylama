"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthErrorMessage, isSessionTimeoutError } from "./auth";
import { PendingMembersPanel } from "./components/account-panel";
import { MemberActivityPanel } from "./components/member-activity-panel";
import { MembersPanel } from "./components/members-panel";
import { ModalShell } from "./components/modal-shell";
import { EmptyState, Panel, SectionHeader, SoftCard } from "./components/ui";
import {
  fetchMemberActivityLogs,
  fetchPendingMembers,
  fetchRemoteAppData,
  getRemoteSessionMember,
  rejectRemoteMember,
  updateMemberApproval,
} from "./remote";
import { clearSessionMemberId, loadAppData, loadSessionMemberId } from "./storage";
import { hasSupabaseConfig } from "./supabaseClient";
import type { AppData, Member, MemberActivityLog } from "./types";

const emptyAppData: AppData = {
  members: [],
  suggestions: [],
  votes: [],
  comments: [],
  assets: [],
};

export function MembersPage() {
  const router = useRouter();
  const remoteEnabled = hasSupabaseConfig;
  const [appData, setAppData] = useState<AppData>(() =>
    remoteEnabled ? emptyAppData : loadAppData(),
  );
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [selectedMemberForLogs, setSelectedMemberForLogs] = useState<Member | null>(
    null,
  );
  const [memberLogs, setMemberLogs] = useState<MemberActivityLog[]>([]);
  const [isLoadingMemberLogs, setIsLoadingMemberLogs] = useState(false);
  const [memberLogsError, setMemberLogsError] = useState("");
  const [adminError, setAdminError] = useState("");
  const [statusNotice, setStatusNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBooting, setIsBooting] = useState(true);

  const isAdmin = currentMember?.role === "admin";
  const isPendingApproval = Boolean(
    remoteEnabled && currentMember && !currentMember.approved && !isAdmin,
  );
  const approvedMemberCount = appData.members.filter(
    (member) => member.approved !== false,
  ).length;

  useEffect(() => {
    void hydrateMembersPage();
  }, [remoteEnabled]);

  async function handleSessionTimeout(error: unknown) {
    if (!remoteEnabled || !isSessionTimeoutError(error)) {
      return false;
    }

    setCurrentMember(null);
    setAppData(emptyAppData);
    setPendingMembers([]);
    setSelectedMemberForLogs(null);
    setMemberLogs([]);
    setIsLoadingMemberLogs(false);
    setMemberLogsError("");
    setAdminError("");
    setStatusNotice("");
    clearSessionMemberId();
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("auth_timeout_notice", "1");
    }
    router.replace("/?reason=session-timeout");
    return true;
  }

  async function hydrateMembersPage() {
    setIsBooting(true);

    try {
      if (!remoteEnabled) {
        const localSessionMemberId = loadSessionMemberId();
        const localData = loadAppData();

        if (!localSessionMemberId) {
          router.replace("/");
          return;
        }

        const localMember =
          localData.members.find((member) => member.id === localSessionMemberId) ?? null;

        if (!localMember) {
          router.replace("/");
          return;
        }

        setCurrentMember(localMember);
        setAppData(localData);
        setPendingMembers([]);
        return;
      }

      const sessionMember = await getRemoteSessionMember();

      if (!sessionMember) {
        router.replace("/");
        return;
      }

      setCurrentMember(sessionMember);

      if (!sessionMember.approved && sessionMember.role !== "admin") {
        setAppData(emptyAppData);
        setPendingMembers([]);
        return;
      }

      const nextData = await fetchRemoteAppData();
      setAppData(nextData);

      if (sessionMember.role === "admin") {
        setPendingMembers(await fetchPendingMembers());
      } else {
        setPendingMembers([]);
      }
    } catch (error) {
      if (await handleSessionTimeout(error)) {
        return;
      }

      setAdminError(getAuthErrorMessage(error));
    } finally {
      setIsBooting(false);
    }
  }

  async function handleApproval(memberId: string, approved: boolean) {
    setAdminError("");
    setStatusNotice("");
    setIsSubmitting(true);

    try {
      await updateMemberApproval(memberId, approved);
      await hydrateMembersPage();
      setStatusNotice(approved ? "Uye onaylandi." : "Uye tekrar beklemeye alindi.");
    } catch (error) {
      if (await handleSessionTimeout(error)) {
        return;
      }

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
    setStatusNotice("");
    setIsSubmitting(true);

    try {
      await rejectRemoteMember(memberId);
      await hydrateMembersPage();
      setStatusNotice("Uyelik reddedildi.");
    } catch (error) {
      if (await handleSessionTimeout(error)) {
        return;
      }

      setAdminError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMemberSelect(member: Member) {
    if (!remoteEnabled || !isAdmin) {
      return;
    }

    setSelectedMemberForLogs(member);
    setMemberLogs([]);
    setMemberLogsError("");
    setIsLoadingMemberLogs(true);

    try {
      const logs = await fetchMemberActivityLogs(member.id);
      setMemberLogs(logs);
    } catch (error) {
      if (await handleSessionTimeout(error)) {
        return;
      }

      setMemberLogsError(getAuthErrorMessage(error));
    } finally {
      setIsLoadingMemberLogs(false);
    }
  }

  if (isBooting) {
    return (
      <Panel>
        <EmptyState
          title="Uyeler yukleniyor."
          description="Uye listesi ve yonetim aksiyonlari hazirlaniyor."
        />
      </Panel>
    );
  }

  return (
    <div className="grid gap-6">
      <Panel>
        <SectionHeader
          title="Uyeler"
          description="Uye takibi, admin onaylari ve log popup akisini burada topladik. Ana oylama ekrani artik daha sade kalacak."
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <SoftCard className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8d6ae8]">
              Toplam uye
            </span>
            <strong className="block text-3xl text-[#182127]">
              {appData.members.length}
            </strong>
          </SoftCard>
          <SoftCard className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d96aa7]">
              Onayli
            </span>
            <strong className="block text-3xl text-[#182127]">
              {approvedMemberCount}
            </strong>
          </SoftCard>
          <SoftCard className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#549b70]">
              Bekleyen
            </span>
            <strong className="block text-3xl text-[#182127]">
              {remoteEnabled && isAdmin
                ? pendingMembers.length
                : appData.members.filter((member) => member.approved === false).length}
            </strong>
          </SoftCard>
        </div>
      </Panel>

      {isPendingApproval ? (
        <Panel>
          <EmptyState
            title="Onay bekleniyor."
            description="Admin onayi gelince uye listesi ve yonetim detaylari burada acilacak."
          />
        </Panel>
      ) : (
        <>
          {isAdmin && remoteEnabled ? (
            <PendingMembersPanel
              members={pendingMembers}
              adminError={adminError}
              authNotice={statusNotice}
              isSubmitting={isSubmitting}
              onApprove={(memberId) => void handleApproval(memberId, true)}
              onReject={(memberId) => void handleRejectMember(memberId)}
            />
          ) : null}

          <MembersPanel
            members={appData.members}
            suggestions={appData.suggestions}
            remoteEnabled={remoteEnabled}
            isAdmin={remoteEnabled && Boolean(isAdmin)}
            onSelectMember={(member) => {
              void handleMemberSelect(member);
            }}
          />
        </>
      )}

      {selectedMemberForLogs ? (
        <ModalShell
          title={`@${selectedMemberForLogs.username ?? selectedMemberForLogs.name}`}
          onClose={() => {
            setSelectedMemberForLogs(null);
            setMemberLogs([]);
            setIsLoadingMemberLogs(false);
            setMemberLogsError("");
          }}
          className="sm:max-w-4xl"
        >
          <MemberActivityPanel
            member={selectedMemberForLogs}
            suggestions={appData.suggestions}
            logs={memberLogs}
            isLoading={isLoadingMemberLogs}
            error={memberLogsError}
          />
        </ModalShell>
      ) : null}
    </div>
  );
}
