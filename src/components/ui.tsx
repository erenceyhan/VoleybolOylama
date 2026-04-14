import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  PropsWithChildren,
  ReactNode,
  TextareaHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
} from "react";

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Panel({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={cx(
        "rounded-[32px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,246,251,0.95),rgba(246,241,255,0.9)_52%,rgba(242,251,245,0.88))] p-6 shadow-[0_24px_80px_rgba(141,106,232,0.12)] ring-1 ring-[rgba(141,106,232,0.08)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        {title ? (
          <h2 className="text-[1.24rem] font-bold tracking-[-0.03em] text-[#182127]">
            {title}
          </h2>
        ) : null}
        {description ? (
          <div className="max-w-[52ch] text-sm leading-6 text-[#5f6d76]">
            {description}
          </div>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function buttonClasses(variant: "primary" | "secondary" | "ghost" | "danger") {
  const base =
    "inline-flex items-center justify-center rounded-[18px] px-4 py-3 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60";

  if (variant === "primary") {
    return `${base} bg-[linear-gradient(135deg,#d96aa7,#8d6ae8)] text-white shadow-[0_16px_30px_rgba(141,106,232,0.24)] hover:-translate-y-0.5 hover:shadow-[0_20px_36px_rgba(217,106,167,0.28)]`;
  }

  if (variant === "secondary") {
    return `${base} border border-[rgba(141,106,232,0.14)] bg-[rgba(255,255,255,0.82)] text-[#182127] hover:-translate-y-0.5 hover:bg-[rgba(246,241,255,0.96)]`;
  }

  if (variant === "danger") {
    return `${base} border border-[rgba(217,106,167,0.18)] bg-[rgba(255,239,247,0.92)] text-[#b24d84] hover:-translate-y-0.5 hover:bg-[rgba(252,228,241,0.96)]`;
  }

  return `${base} border border-[rgba(141,106,232,0.12)] bg-white/40 text-[#182127] hover:bg-[rgba(141,106,232,0.07)]`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
};

export function PrimaryButton({ className, ...props }: ButtonProps) {
  return <button className={cx(buttonClasses("primary"), className)} {...props} />;
}

export function SecondaryButton({ className, ...props }: ButtonProps) {
  return (
    <button className={cx(buttonClasses("secondary"), className)} {...props} />
  );
}

export function GhostButton({ className, ...props }: ButtonProps) {
  return <button className={cx(buttonClasses("ghost"), className)} {...props} />;
}

export function DangerButton({ className, ...props }: ButtonProps) {
  return <button className={cx(buttonClasses("danger"), className)} {...props} />;
}

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "w-full rounded-[22px] border border-[rgba(141,106,232,0.12)] bg-white/84 px-4 py-3.5 text-[#182127] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] outline-none transition focus:-translate-y-0.5 focus:border-[#8d6ae8] focus:bg-white focus:shadow-[0_0_0_4px_rgba(141,106,232,0.08)]",
        className,
      )}
      {...props}
    />
  );
}

export function SelectInput({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        "w-full rounded-[22px] border border-[rgba(141,106,232,0.12)] bg-white/84 px-4 py-3.5 text-[#182127] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] outline-none transition focus:-translate-y-0.5 focus:border-[#8d6ae8] focus:bg-white focus:shadow-[0_0_0_4px_rgba(141,106,232,0.08)]",
        className,
      )}
      {...props}
    />
  );
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(
        "w-full rounded-[22px] border border-[rgba(141,106,232,0.12)] bg-white/84 px-4 py-3.5 text-[#182127] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] outline-none transition focus:-translate-y-0.5 focus:border-[#8d6ae8] focus:bg-white focus:shadow-[0_0_0_4px_rgba(141,106,232,0.08)]",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
}: PropsWithChildren<{ label: string }>) {
  return (
    <label className="grid gap-2 font-medium text-[#33444d]">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function ToneMessage({
  tone,
  children,
}: PropsWithChildren<{ tone: "error" | "success" | "muted" }>) {
  if (tone === "error") {
    return (
      <p className="rounded-2xl border border-[rgba(217,106,167,0.2)] bg-[rgba(255,240,247,0.96)] px-4 py-3 text-sm text-[#a84a7f]">
        {children}
      </p>
    );
  }

  if (tone === "success") {
    return (
      <p className="rounded-2xl border border-[rgba(98,180,131,0.18)] bg-[rgba(238,251,242,0.96)] px-4 py-3 text-sm text-[#3f8c5f]">
        {children}
      </p>
    );
  }

  return <p className="text-sm leading-6 text-[#5f6d76]">{children}</p>;
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[rgba(141,106,232,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.56),rgba(246,241,255,0.5))] px-5 py-8 text-center">
      <strong className="block text-base text-[#182127]">{title}</strong>
      <p className="mt-2 text-sm leading-6 text-[#5f6d76]">{description}</p>
    </div>
  );
}

export function CardList({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return <div className={cx("grid gap-3", className)}>{children}</div>;
}

export function SoftCard({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <article
      className={cx(
        "rounded-[26px] border border-white/70 bg-[linear-gradient(160deg,rgba(255,250,253,0.92),rgba(246,241,255,0.84)_54%,rgba(242,251,245,0.8))] p-4 shadow-[0_18px_38px_rgba(141,106,232,0.08)] ring-1 ring-[rgba(141,106,232,0.07)]",
        className,
      )}
    >
      {children}
    </article>
  );
}

export function InlineMeta({
  className,
  children,
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-center gap-2 text-xs font-medium text-[#5f6d76]",
        className,
      )}
    >
      {children}
    </div>
  );
}
