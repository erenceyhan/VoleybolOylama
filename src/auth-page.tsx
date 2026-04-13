"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ADMIN_USERNAME,
  getAuthErrorMessage,
  getPasswordRuleText,
  isValidPassword,
  isValidUsername,
} from "./auth";
import { AccountPanel } from "./components/account-panel";
import { getRemoteSessionMember, signInWithUsernamePassword, signUpPendingMember } from "./remote";
import { initialAppData } from "./seed";
import { loadSessionMemberId, saveSessionMemberId } from "./storage";
import { hasSupabaseConfig } from "./supabaseClient";

type AuthView = "login" | "register";

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

export default function AuthPage() {
  const router = useRouter();
  const remoteEnabled = hasSupabaseConfig;
  const [localLoginDraft, setLocalLoginDraft] =
    useState<LocalLoginDraft>(emptyLocalLoginDraft);
  const [remoteLoginDraft, setRemoteLoginDraft] =
    useState<RemoteLoginDraft>(emptyRemoteLoginDraft);
  const [registerDraft, setRegisterDraft] =
    useState<RegisterDraft>(emptyRegisterDraft);
  const [authView, setAuthView] = useState<AuthView>("login");
  const [loginError, setLoginError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [isBootingRemote, setIsBootingRemote] = useState(remoteEnabled);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionTimeoutMessage, setSessionTimeoutMessage] = useState("");

  useEffect(() => {
    if (!remoteEnabled) {
      setIsBootingRemote(false);

      if (loadSessionMemberId()) {
        router.replace("/panel");
      }

      return;
    }

    let isMounted = true;

    async function bootstrap() {
      try {
        const sessionMember = await getRemoteSessionMember();

        if (sessionMember && isMounted) {
          router.replace("/panel");
          return;
        }
      } catch {
        // Keep auth screen visible on bootstrap issues.
      } finally {
        if (isMounted) {
          setIsBootingRemote(false);
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [remoteEnabled, router]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const reason = new URLSearchParams(window.location.search).get("reason");
    const hasStoredTimeoutNotice =
      window.sessionStorage.getItem("auth_timeout_notice") === "1";
    if (hasStoredTimeoutNotice) {
      window.sessionStorage.removeItem("auth_timeout_notice");
    }
    setSessionTimeoutMessage(
      reason === "session-timeout" || hasStoredTimeoutNotice
        ? "Hesap zaman asimina ugradi. Lutfen tekrar giris yap."
        : "",
    );
  }, []);

  useEffect(() => {
    if (sessionTimeoutMessage) {
      setAuthView("login");
    }
  }, [sessionTimeoutMessage]);

  function validateRemotePassword(password: string) {
    if (!isValidPassword(password)) {
      throw new Error(getPasswordRuleText());
    }
  }

  function handleLocalLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const targetMember = initialAppData.members.find(
      (member) => member.id === localLoginDraft.memberId,
    );

    if (!targetMember || targetMember.accessCode !== localLoginDraft.accessCode.trim()) {
      setLoginError("Isim ya da giris kodu hatali.");
      return;
    }

    saveSessionMemberId(targetMember.id);
    setLoginError("");
    setAuthNotice("");
    setLocalLoginDraft((current) => ({ ...current, accessCode: "" }));
    router.push("/panel");
  }

  async function handleRemoteLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setLoginError("");
    setAuthNotice("");
    setSessionTimeoutMessage("");

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
      setRemoteLoginDraft(emptyRemoteLoginDraft);
      router.push("/panel");
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
    setSessionTimeoutMessage("");

    try {
      if (!isValidUsername(registerDraft.username)) {
        throw new Error(
          "Kullanici adi 3-24 karakter olmali ve sadece kucuk harf, rakam, nokta, tire veya alt cizgi icermeli.",
        );
      }

      validateRemotePassword(registerDraft.password);

      await signUpPendingMember(registerDraft);
      setRegisterDraft(emptyRegisterDraft);
      setAuthNotice(
        registerDraft.username.trim().toLowerCase() === ADMIN_USERNAME
          ? "Admin hesabi acildi. Yonlendiriliyorsun..."
          : "Kayit tamamlandi. Onay durumunu panelde gorebilirsin.",
      );
      router.push("/panel");
    } catch (error) {
      setLoginError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <main className="w-full max-w-[440px]">
        <div className="mx-auto w-full">
          <div className="mb-5 text-center">
            <span className="inline-flex rounded-full border border-[rgba(141,106,232,0.12)] bg-[linear-gradient(135deg,rgba(255,238,247,0.92),rgba(246,241,255,0.92))] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d6ae8]">
              Takim adi secimi
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-[-0.05em] text-[#182127]">
              Hesabina gir ve oylamaya katil.
            </h1>
            <p className="mt-3 text-sm leading-7 text-[#5f6d76]">
              Ilk ekran sade kalsin diye burada sadece giris ve kayit akislarini
              biraktik. Basarili oturumdan sonra ana panel acilir.
            </p>
          </div>
          <AccountPanel
            remoteEnabled={remoteEnabled}
            currentMember={null}
            isAdmin={false}
            isPendingApproval={false}
            isBootingRemote={isBootingRemote}
            isSubmitting={isSubmitting}
            authView={authView}
            loginError={loginError}
            authNotice={authNotice}
            localMembers={initialAppData.members}
            localLoginDraft={localLoginDraft}
            remoteLoginDraft={remoteLoginDraft}
            registerDraft={registerDraft}
            passwordRuleText={getPasswordRuleText()}
            timeoutMessage={sessionTimeoutMessage}
            onAuthViewChange={setAuthView}
            onLocalLoginSubmit={handleLocalLoginSubmit}
            onRemoteLoginSubmit={handleRemoteLoginSubmit}
            onRegisterSubmit={handleRegisterSubmit}
            onLocalLoginChange={(field, value) =>
              setLocalLoginDraft((current) => ({ ...current, [field]: value }))
            }
            onRemoteLoginChange={(field, value) =>
              setRemoteLoginDraft((current) => ({ ...current, [field]: value }))
            }
            onRegisterChange={(field, value) =>
              setRegisterDraft((current) => ({ ...current, [field]: value }))
            }
            onLogout={() => undefined}
          />
        </div>
      </main>
    </div>
  );
}
