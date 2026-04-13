import type { MouseEvent, PropsWithChildren, ReactNode } from "react";

export function ModalShell({
  title,
  onClose,
  children,
  className = "",
}: PropsWithChildren<{
  title: ReactNode;
  onClose: () => void;
  className?: string;
}>) {
  function stopPropagation(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[linear-gradient(180deg,rgba(141,106,232,0.28),rgba(217,106,167,0.24),rgba(98,180,131,0.16))] p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className={`max-h-[92vh] w-full overflow-hidden rounded-t-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,250,253,0.98),rgba(246,241,255,0.96)_54%,rgba(242,251,245,0.94))] shadow-[0_30px_100px_rgba(141,106,232,0.18)] ring-1 ring-[rgba(141,106,232,0.08)] sm:max-w-5xl sm:rounded-[32px] ${className}`}
        onClick={stopPropagation}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[rgba(141,106,232,0.12)] px-5 py-4 sm:px-6">
          <h2 className="text-xl font-bold tracking-[-0.03em] text-[#182127]">
            {title}
          </h2>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(141,106,232,0.12)] bg-white/80 text-xl text-[#182127] transition hover:-translate-y-0.5 hover:bg-[rgba(246,241,255,0.92)]"
            onClick={onClose}
            aria-label="Kapat"
          >
            ×
          </button>
        </div>
        <div className="max-h-[calc(92vh-76px)] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
