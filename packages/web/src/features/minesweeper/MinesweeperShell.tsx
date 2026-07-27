import type {ReactNode} from "react";
import {AppHeader} from "../../components/common/SystemShell";

export function MinesweeperHeader({
  workspaceId,
  status,
  actions,
}: {
  workspaceId?: string;
  status: string;
  actions?: ReactNode;
}) {
  return <AppHeader currentSystem="minesweeper" workspaceId={workspaceId} status={status} actions={actions} />;
}
