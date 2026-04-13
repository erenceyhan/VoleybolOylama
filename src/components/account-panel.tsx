import type { FormEvent } from "react";
import type { Member } from "../types";
import {
  DangerButton,
  Field,
  GhostButton,
  Panel,
  PrimaryButton,
  SectionHeader,
  SelectInput,
  TextInput,
  ToneMessage,
} from "./ui";

type AuthView = "login" | "register";

export function AccountPanel({
  remoteEnabled,
  currentMember,
  isAdmin,
  isPendingApproval,
  isBootingRemote,
  isSubmitting,
  authView,
  loginError,
  authNotice,
  localMembers,
  localLoginDraft,
  remoteLoginDraft,
  registerDraft,
  passwordRuleText,
  timeoutMessage,
  localUsageText,
  onAuthViewChange,
  onLocalLoginSubmit,
  onRemoteLoginSubmit,
  onRegisterSubmit,
  onLocalLoginChange,
  onRemoteLoginChange,
  onRegisterChange,
  onLogout,
}: {
  remoteEnabled: boolean;
  currentMember: Member | null;
  isAdmin: boolean;
  isPendingApproval: boolean;
  isBootingRemote: boolean;
  isSubmitting: boolean;
  authView: AuthView;
  loginError: string;
  authNotice: string;
  localMembers: Member[];
  localLoginDraft: { memberId: string; accessCode: string };
  remoteLoginDraft: { username: string; password: string };
  registerDraft: { username: string; password: string };
  passwordRuleText: string;
  timeoutMessage?: string;
  localUsageText?: string;
  onAuthViewChange: (view: AuthView) => void;
  onLocalLoginSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRemoteLoginSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRegisterSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onLocalLoginChange: (field: "memberId" | "accessCode", value: string) => void;
  onRemoteLoginChange: (field: "username" | "password", value: string) => void;
  onRegisterChange: (field: "username" | "password", value: string) => void;
  onLogout: () => void;
}) {
  return (
    <Panel>
      <SectionHeader
        title={remoteEnabled ? "Hesap" : "Giris"}
        description={
          !remoteEnabled
            ? "Su anki yerel surumde uye bilgileri tarayici icinde tutuluyor."
            : undefined
        }
        action={
          currentMember ? (
            <GhostButton disabled={isSubmitting} onClick={onLogout}>
              Cikis yap
            </GhostButton>
          ) : undefined
        }
      />

      {isBootingRemote ? (
        <ToneMessage tone="muted">Supabase oturumu kontrol ediliyor...</ToneMessage>
      ) : currentMember ? (
        <div className="space-y-4">
          <div className="rounded-[24px] border border-[rgba(141,106,232,0.12)] bg-[linear-gradient(160deg,rgba(255,248,252,0.9),rgba(242,251,245,0.82))] p-5">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[#8d6ae8]">
              Aktif kisi
            </span>
            <strong className="mt-3 block text-2xl font-bold text-[#182127]">
              {currentMember.username ?? currentMember.name}
            </strong>
            <p className="mt-2 text-sm text-[#5f6d76]">
              @{currentMember.username ?? "yerel"} / {currentMember.role}
            </p>
            <p className="mt-1 text-sm text-[#5f6d76]">
              {remoteEnabled
                ? currentMember.approved || isAdmin
                  ? "Durum: onayli"
                  : "Durum: onay bekliyor"
                : localUsageText ?? "Yerel oturum aktif"}
            </p>
          </div>

          {isPendingApproval ? (
            <ToneMessage tone="error">
              Kaydin alindi. Admin onay verene kadar oy, yorum ve isim onerisi
              gonderemezsin.
            </ToneMessage>
          ) : null}
        </div>
      ) : remoteEnabled ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 rounded-full border border-[rgba(141,106,232,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(246,241,255,0.62))] p-1">
            <button
              type="button"
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                authView === "login"
                  ? "bg-[linear-gradient(135deg,#d96aa7,#8d6ae8)] text-white shadow-[0_10px_24px_rgba(141,106,232,0.22)]"
                  : "text-[#33444d]"
              }`}
              onClick={() => onAuthViewChange("login")}
            >
              Giris
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                authView === "register"
                  ? "bg-[linear-gradient(135deg,#d96aa7,#8d6ae8)] text-white shadow-[0_10px_24px_rgba(141,106,232,0.22)]"
                  : "text-[#33444d]"
              }`}
              onClick={() => onAuthViewChange("register")}
            >
              Kayit
            </button>
          </div>

          {authView === "login" ? (
            <form className="grid gap-4" onSubmit={onRemoteLoginSubmit}>
              <Field label="Kullanici adi">
                <TextInput
                  value={remoteLoginDraft.username}
                  placeholder="ornek: mert"
                  onChange={(event) =>
                    onRemoteLoginChange("username", event.target.value)
                  }
                />
              </Field>
              <Field label="Sifre">
                <TextInput
                  type="password"
                  value={remoteLoginDraft.password}
                  onChange={(event) =>
                    onRemoteLoginChange("password", event.target.value)
                  }
                />
              </Field>
              {timeoutMessage ? (
                <ToneMessage tone="error">{timeoutMessage}</ToneMessage>
              ) : null}
              {loginError ? <ToneMessage tone="error">{loginError}</ToneMessage> : null}
              {authNotice ? (
                <ToneMessage tone="success">{authNotice}</ToneMessage>
              ) : null}
              <PrimaryButton type="submit" disabled={isSubmitting}>
                Giris yap
              </PrimaryButton>
            </form>
          ) : (
            <form className="grid gap-4" onSubmit={onRegisterSubmit}>
              <Field label="Kullanici adi">
                <TextInput
                  value={registerDraft.username}
                  placeholder="kullanici adin"
                  onChange={(event) =>
                    onRegisterChange("username", event.target.value)
                  }
                />
              </Field>
              <Field label="Sifre">
                <TextInput
                  type="password"
                  value={registerDraft.password}
                  onChange={(event) =>
                    onRegisterChange("password", event.target.value)
                  }
                />
              </Field>
              <ToneMessage tone="muted">{passwordRuleText}</ToneMessage>
              {loginError ? <ToneMessage tone="error">{loginError}</ToneMessage> : null}
              {authNotice ? (
                <ToneMessage tone="success">{authNotice}</ToneMessage>
              ) : null}
              <PrimaryButton type="submit" disabled={isSubmitting}>
                Kaydi tamamla
              </PrimaryButton>
            </form>
          )}
        </div>
      ) : (
        <form className="grid gap-4" onSubmit={onLocalLoginSubmit}>
          <Field label="Kisi">
            <SelectInput
              value={localLoginDraft.memberId}
              onChange={(event) =>
                onLocalLoginChange("memberId", event.target.value)
              }
            >
              {localMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Giris kodu">
            <TextInput
              type="password"
              inputMode="numeric"
              value={localLoginDraft.accessCode}
              placeholder="Ornek: 2001"
              onChange={(event) =>
                onLocalLoginChange("accessCode", event.target.value)
              }
            />
          </Field>
          {loginError ? <ToneMessage tone="error">{loginError}</ToneMessage> : null}
          <PrimaryButton type="submit">Giris yap</PrimaryButton>
        </form>
      )}
    </Panel>
  );
}

export function PendingMembersPanel({
  members,
  adminError,
  authNotice,
  isSubmitting,
  onApprove,
  onReject,
}: {
  members: Member[];
  adminError: string;
  authNotice: string;
  isSubmitting: boolean;
  onApprove: (memberId: string) => void;
  onReject: (memberId: string) => void;
}) {
  return (
    <Panel>
      <SectionHeader
        title="Onay bekleyen uyeler"
        description="Yeni kayit olanlar burada gorunur. Onay verdiginde uygulamayi kullanmaya baslarlar."
      />

      <div className="space-y-3">
        {adminError ? <ToneMessage tone="error">{adminError}</ToneMessage> : null}
        {authNotice ? <ToneMessage tone="success">{authNotice}</ToneMessage> : null}

        {members.length === 0 ? (
          <ToneMessage tone="muted">Su an onay bekleyen uye yok.</ToneMessage>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[rgba(141,106,232,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(246,241,255,0.72))] p-4"
            >
              <div>
                <strong className="block text-[#182127]">
                  @{member.username ?? member.name}
                </strong>
                <span className="text-sm text-[#5f6d76]">{member.role}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <PrimaryButton
                  disabled={isSubmitting}
                  onClick={() => onApprove(member.id)}
                >
                  Onayla
                </PrimaryButton>
                <DangerButton
                  disabled={isSubmitting}
                  onClick={() => onReject(member.id)}
                >
                  Reddet
                </DangerButton>
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
