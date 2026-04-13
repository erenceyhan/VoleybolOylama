import type { Member } from "../types";
import { GhostButton, Panel, SectionHeader, ToneMessage } from "./ui";

export function SessionPanel({
  currentMember,
  remoteEnabled,
  isAdmin,
  isPendingApproval,
  isBooting,
  isSubmitting,
  localUsageText,
  onLogout,
}: {
  currentMember: Member | null;
  remoteEnabled: boolean;
  isAdmin: boolean;
  isPendingApproval: boolean;
  isBooting: boolean;
  isSubmitting: boolean;
  localUsageText?: string;
  onLogout: () => void;
}) {
  return (
    <Panel>
      <SectionHeader
        title="Oturum"
        description="Giris yaptiktan sonra tum oylama ve yorumlama akisi bu ekrandan yonetilir."
        action={
          currentMember ? (
            <GhostButton disabled={isSubmitting} onClick={onLogout}>
              Cikis yap
            </GhostButton>
          ) : undefined
        }
      />

      {isBooting ? (
        <ToneMessage tone="muted">Oturum bilgileri yukleniyor...</ToneMessage>
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
      ) : (
        <ToneMessage tone="muted">Oturum bulunamadi. Giris sayfasina yonlendiriliyorsun...</ToneMessage>
      )}
    </Panel>
  );
}
