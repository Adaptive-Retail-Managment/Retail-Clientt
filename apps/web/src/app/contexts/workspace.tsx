import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * Active workspace context: which business and branch the user is operating
 * in. Values come from the session's memberships once auth exists; for now
 * they are null and feature code must handle the empty state.
 */

export interface WorkspaceState {
  activeBusinessId: string | null;
  activeBranchId: string | null;
}

interface WorkspaceContextValue {
  workspace: WorkspaceState;
  setActiveBusiness: (businessId: string | null) => void;
  setActiveBranch: (branchId: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<WorkspaceState>({
    activeBusinessId: null,
    activeBranchId: null,
  });

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspace,
      setActiveBusiness: (businessId) =>
        setWorkspace((w) => ({
          activeBusinessId: businessId,
          // A branch belongs to a business; switching business clears it.
          activeBranchId: businessId === w.activeBusinessId ? w.activeBranchId : null,
        })),
      setActiveBranch: (branchId) =>
        setWorkspace((w) => ({ ...w, activeBranchId: branchId })),
    }),
    [workspace],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}
