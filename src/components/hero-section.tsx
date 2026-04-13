import { SoftCard } from "./ui";

export function HeroSection({
  showDemoBadge,
  showStats,
  memberCount,
  suggestionCount,
  activeVoters,
  commentCount,
}: {
  showDemoBadge: boolean;
  showStats: boolean;
  memberCount: number;
  suggestionCount: number;
  activeVoters: number;
  commentCount: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-[34px] border border-white/20 bg-[linear-gradient(135deg,#ae7de8,#e28bc6_50%,#88cfa7)] p-6 text-white shadow-[0_28px_90px_rgba(141,106,232,0.22)] sm:p-8">
      <div className="pointer-events-none absolute right-[-80px] top-[-110px] h-[240px] w-[240px] rounded-full bg-white/18 blur-3xl" />
      <div className="pointer-events-none absolute left-[-120px] bottom-[-160px] h-[260px] w-[260px] rounded-full bg-[#ffd3e6]/24 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] right-[28%] h-[220px] w-[220px] rounded-full bg-[#d9ffe5]/18 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-start">
        <div className="space-y-5">
          {showDemoBadge ? (
            <span className="inline-flex rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
              Local demo modu
            </span>
          ) : null}
          <div className="space-y-4">
            <h1 className="max-w-[11ch] text-4xl font-bold leading-[0.92] tracking-[-0.06em] sm:text-5xl lg:text-7xl">
              Voleybol takim adini birlikte secin.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-white/78 sm:text-lg">
              Herkes en fazla 3 isim onerisi girebilir, tum oneriler
              puanlanabilir, yorumlanabilir ve oy dagilimi tek ekranda takip
              edilebilir.
            </p>
          </div>
        </div>

        {showStats ? (
          <div className="grid grid-cols-2 gap-3 self-stretch">
            <StatCard label="Uye" value={memberCount} />
            <StatCard label="Oneri" value={suggestionCount} />
            <StatCard label="Aktif oylayan" value={activeVoters} />
            <StatCard label="Yorum" value={commentCount} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <SoftCard className="border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.12))] text-white shadow-none backdrop-blur-sm ring-white/10">
      <span className="block text-sm font-medium text-white/78">{label}</span>
      <strong className="mt-3 block text-4xl font-bold tracking-[-0.04em]">
        {value}
      </strong>
    </SoftCard>
  );
}
