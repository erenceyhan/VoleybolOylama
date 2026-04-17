import type { ReactNode } from "react";
import { PanelShell } from "../../src/components/panel-shell";

export default function PanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <PanelShell>{children}</PanelShell>;
}
