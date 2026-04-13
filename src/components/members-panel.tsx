import type { Member, Suggestion } from "../types";
import { getMemberSuggestionCount } from "../utils";
import { EmptyState, Panel, SectionHeader, SoftCard } from "./ui";

export function MembersPanel({
  members,
  suggestions,
  remoteEnabled,
  isAdmin = false,
  onSelectMember,
}: {
  members: Member[];
  suggestions: Suggestion[];
  remoteEnabled: boolean;
  isAdmin?: boolean;
  onSelectMember?: (member: Member) => void;
}) {
  return (
    <Panel>
      <SectionHeader
        title="Uyeler"
        description={
          remoteEnabled
            ? "Onayli ve bekleyen uyeleri tek listede gorebilirsin."
            : "Yerel surumde kadroyu tarayici icinde sakliyoruz."
        }
      />

      {members.length === 0 ? (
        <EmptyState
          title={remoteEnabled ? "Uyeleri gormek icin giris yap." : "Henuz uye yok."}
          description={
            remoteEnabled
              ? "Oturum acildiginda uye listesi burada dolacak."
              : "Demo uyeleri burada listelenecek."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {members.map((member) => (
            <button
              key={member.id}
              type="button"
              className="text-left"
              disabled={!isAdmin || !onSelectMember}
              onClick={() => onSelectMember?.(member)}
            >
              <SoftCard
                className={`space-y-2 transition ${
                  isAdmin && onSelectMember
                    ? "cursor-pointer hover:-translate-y-0.5 hover:border-[#8d6ae8]/30"
                    : ""
                }`}
              >
                <strong className="block text-[#182127]">
                  @{member.username ?? member.name}
                </strong>
                <p className="text-sm text-[#5f6d76]">
                  {remoteEnabled
                    ? member.approved
                      ? "onayli uye"
                      : "onay bekliyor"
                    : `${getMemberSuggestionCount(suggestions, member.id)} onerisi var`}
                </p>
                {isAdmin && onSelectMember ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8d6ae8]">
                    Loglarini gor
                  </p>
                ) : null}
              </SoftCard>
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}
