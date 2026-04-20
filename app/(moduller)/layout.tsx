import type { ReactNode } from "react";
import { PanelShell } from "../../src/components/panel-shell";

export default function ModulesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <PanelShell>{children}</PanelShell>;
}
